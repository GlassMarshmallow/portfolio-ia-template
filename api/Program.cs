using System.Net.Http.Json;
using System.Text.Json;
using System.Threading.RateLimiting;

// API del portfolio:
// - /api/ask: preguntas rápidas sobre la persona del portfolio, respondidas por IA (Ollama) por trozos.
// - /api/intake: formulario inteligente; la IA pregunta y va rellenando la solicitud.
// - /api/contact: recibe las solicitudes del formulario inteligente, las guarda y te las envía por Telegram.
// Ollama nunca se expone a internet: solo esta API habla con él. Es pública (detrás de nginx y el túnel de
// Cloudflare), así que todo lo que llega tiene tamaño y uso limitados.

var builder = WebApplication.CreateBuilder(args);
Owner.Load(builder.Configuration);

// Ninguna petición puede pesar más de 64 KB
builder.WebHost.ConfigureKestrel(k => k.Limits.MaxRequestBodySize = Limits.RequestBodyBytes);

builder.Services.AddHttpClient("ollama", c =>
{
    c.BaseAddress = new Uri(builder.Configuration["Ollama:BaseUrl"]!);
    c.Timeout = TimeSpan.FromSeconds(180);
});
builder.Services.AddHttpClient("telegram", c =>
{
    c.BaseAddress = new Uri("https://api.telegram.org/");
    c.Timeout = TimeSpan.FromSeconds(20);
});
builder.Services.AddSingleton<TelegramNotifier>();
builder.Services.AddSingleton<RequestStore>();
builder.Services.AddHostedService<RequestCleanup>();

// Límites por visitante (por IP):
// - preguntas: 10 seguidas y después 1 por minuto
// - asistente (formulario inteligente): 30 mensajes seguidos y después 3 por minuto
// - solicitudes: 3 seguidas y después 1 cada 20 minutos
builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
    options.AddPolicy("preguntas", context => Bucket(ClientKey(context), 10, 1, TimeSpan.FromMinutes(1)));
    options.AddPolicy("asistente", context => Bucket(ClientKey(context), 30, 3, TimeSpan.FromMinutes(1)));
    options.AddPolicy("solicitudes", context => Bucket(ClientKey(context), 3, 1, TimeSpan.FromMinutes(20)));
    options.OnRejected = async (context, ct) =>
    {
        var message = context.HttpContext.Request.Path.StartsWithSegments("/api/contact")
            ? "Has enviado varias solicitudes seguidas. Espera un rato antes de enviar otra."
            : "Has escrito muchos mensajes seguidos. Espera un momento y vuelve a intentarlo.";
        context.HttpContext.Response.ContentType = "application/json";
        await context.HttpContext.Response.WriteAsJsonAsync(new { error = message }, ct);
    };
});

var app = builder.Build();
app.UseRateLimiter();

var profile = await File.ReadAllTextAsync(Path.Combine(AppContext.BaseDirectory, Owner.ProfileFile));
var askInstructions = Prompts.Ask(profile);
var intakeInstructions = Prompts.Intake(profile);

// Como mucho 2 respuestas generándose a la vez, para no saturar el equipo que ejecuta la IA.
var ollamaSlots = new SemaphoreSlim(2);

// Tope global de llamadas a la IA al día, entre todos los visitantes (por si alguien abusa desde muchas IP)
var dailyAiLimit = new FixedWindowRateLimiter(new FixedWindowRateLimiterOptions
{
    PermitLimit = app.Configuration.GetValue("IA:LimiteDiario", 600),
    Window = TimeSpan.FromDays(1),
    QueueLimit = 0
});

// Reserva un hueco para usar la IA, o devuelve el error para el visitante si no lo hay
async Task<IResult?> EnterAi(CancellationToken ct)
{
    using var permit = dailyAiLimit.AttemptAcquire();
    if (!permit.IsAcquired)
        return Results.Json(new { error = $"Hoy ya he respondido muchas preguntas. Puedes escribirme a {Owner.Email}." }, statusCode: 429);
    if (!await ollamaSlots.WaitAsync(TimeSpan.FromSeconds(30), ct))
        return Results.Json(new { error = "Ahora mismo hay muchas preguntas a la vez. Inténtalo en unos segundos." }, statusCode: 503);
    return null;
}

app.MapGet("/api/health", () => Results.Ok(new { status = "ok" }));

app.MapPost("/api/ask", async (AskRequest request, HttpContext http, IHttpClientFactory clients, IConfiguration config,
    ILogger<Program> logger, CancellationToken ct) =>
{
    var question = request.Question?.Trim() ?? "";
    if (question.Length is < Limits.QuestionMin or > Limits.QuestionMax)
        return Results.BadRequest(new { error = $"Escribe una pregunta de entre {Limits.QuestionMin} y {Limits.QuestionMax} caracteres." });

    if (await EnterAi(ct) is { } busy)
        return busy;

    var started = false;
    try
    {
        // La respuesta se va enviando a la web según el modelo la genera (texto plano por trozos),
        // así quien pregunta empieza a leer enseguida aunque el modelo sea lento.
        using var ollamaRequest = new HttpRequestMessage(HttpMethod.Post, "api/chat")
        {
            Content = JsonContent.Create(new
            {
                model = config["Ollama:Model"],
                messages = new object[]
                {
                    new { role = "system", content = askInstructions },
                    new { role = "user", content = question }
                },
                stream = true,
                think = false,
                options = new { temperature = 0.4, num_ctx = ContextTokens, num_predict = 220 }
            })
        };
        using var response = await clients.CreateClient("ollama")
            .SendAsync(ollamaRequest, HttpCompletionOption.ResponseHeadersRead, ct);
        response.EnsureSuccessStatusCode();

        using var reader = new StreamReader(await response.Content.ReadAsStreamAsync(ct));
        var insideThink = false;
        while (await reader.ReadLineAsync(ct) is { } line)
        {
            if (line.Length == 0)
                continue;
            using var chunk = JsonDocument.Parse(line);
            var piece = chunk.RootElement.TryGetProperty("message", out var message)
                ? message.GetProperty("content").GetString() ?? ""
                : "";

            // Por si el modelo devuelve su razonamiento entre <think>…</think>: no se envía
            if (piece.Contains("<think>")) insideThink = true;
            if (insideThink)
            {
                if (piece.Contains("</think>")) insideThink = false;
                continue;
            }
            if (!started)
            {
                piece = piece.TrimStart();
                if (piece.Length == 0)
                    continue;
                http.Response.ContentType = "text/plain; charset=utf-8";
                http.Response.Headers.CacheControl = "no-cache";
                // Que nginx no acumule la respuesta antes de enviarla
                http.Response.Headers["X-Accel-Buffering"] = "no";
                started = true;
            }
            await http.Response.WriteAsync(piece, ct);
            await http.Response.Body.FlushAsync(ct);
        }

        if (!started)
            throw new HttpRequestException("Respuesta vacía del modelo");
        return Results.Empty;
    }
    catch (Exception ex) when (ex is HttpRequestException or JsonException or TaskCanceledException or KeyNotFoundException or InvalidOperationException)
    {
        logger.LogWarning(ex, "No se pudo consultar a Ollama");
        // Si ya se había empezado a enviar la respuesta, se corta ahí
        if (started)
            return Results.Empty;
        return Results.Json(new { error = $"Ahora mismo no puedo responder. Puedes escribirme a {Owner.Email}." }, statusCode: 503);
    }
    finally
    {
        ollamaSlots.Release();
    }
}).RequireRateLimiting("preguntas");

// Formulario inteligente: recibe la conversación (la guarda el navegador) y los datos recogidos, y la IA
// responde con su siguiente pregunta y los datos actualizados. El servidor no guarda nada hasta el envío.
app.MapPost("/api/intake", async (IntakeRequest request, IHttpClientFactory clients, IConfiguration config,
    ILogger<Program> logger, CancellationToken ct) =>
{
    if (Validation.Intake(request) is { } invalid)
        return Results.BadRequest(new { error = invalid });

    if (await EnterAi(ct) is { } busy)
        return busy;

    try
    {
        var current = request.Data ?? new IntakeData();
        var messages = new List<object>
        {
            new { role = "system", content = intakeInstructions },
            new { role = "system", content = $"DATOS RECOGIDOS HASTA AHORA: {JsonSerializer.Serialize(current)}" }
        };
        messages.AddRange(request.Messages!.Select(m => new { role = m.Role, content = m.Content!.Trim() }));
        // El servidor decide qué tema toca (los modelos pequeños se olvidan y repiten preguntas). Va al final,
        // justo después del último mensaje, que es donde más caso le hace el modelo.
        var next = IntakePlan.Missing(current).FirstOrDefault();
        messages.Add(new
        {
            role = "system",
            content = next is null
                ? "SIGUIENTE PASO: actualiza los datos con lo que acaba de decir el visitante."
                : $"SIGUIENTE PASO: actualiza los datos con lo que acaba de decir el visitante (detecta los tipos de proyecto y marca en noAplica lo que no tenga sentido para él). " +
                  $"Después pregúntale por {Owner.Fill(next.Hint)}" + (next.Types is null ? "" : $" (clave \"{next.Key}\" de detalles)") + ". " +
                  "Si su última respuesta abre una oportunidad clara que aún no habéis hablado (por ejemplo, vende productos pero no por internet), puedes preguntarle antes por eso, una sola vez. " +
                  "No repitas ninguna pregunta que ya le hayas hecho."
        });

        var response = await clients.CreateClient("ollama").PostAsJsonAsync("api/chat", new
        {
            model = config["Ollama:Model"],
            messages,
            stream = false,
            think = false,
            format = IntakeSchema,
            options = new { temperature = 0.3, num_ctx = ContextTokens, num_predict = 800 }
        }, ct);
        response.EnsureSuccessStatusCode();

        using var body = await JsonDocument.ParseAsync(await response.Content.ReadAsStreamAsync(ct), cancellationToken: ct);
        var content = body.RootElement.GetProperty("message").GetProperty("content").GetString() ?? "";
        using var result = JsonDocument.Parse(content);
        var root = result.RootElement;

        var reply = Clip(root.GetProperty("respuesta").GetString(), Limits.IntakeAssistantMessageMax);
        if (reply.Length == 0)
            throw new JsonException("Respuesta vacía del modelo");

        // Los datos que devuelve la IA se recortan; lo que no traiga se conserva de antes
        var d = root.TryGetProperty("datos", out var datos) && datos.ValueKind == JsonValueKind.Object ? datos : default;
        string Field(JsonElement source, string name, string? previous, int max) =>
            source.ValueKind == JsonValueKind.Object && source.TryGetProperty(name, out var v) && v.ValueKind == JsonValueKind.String
                && v.GetString()!.Trim().Length > 0
                ? Clip(v.GetString(), max)
                : previous?.Trim() ?? "";
        List<string> Codes(string name, IEnumerable<string> allowed, IEnumerable<string>? previous) =>
            (d.ValueKind == JsonValueKind.Object && d.TryGetProperty(name, out var v) && v.ValueKind == JsonValueKind.Array
                ? v.EnumerateArray().Where(x => x.ValueKind == JsonValueKind.String).Select(x => x.GetString()!)
                : [])
            .Concat(previous ?? [])
            .Where(allowed.Contains).Distinct().ToList();

        var detailsJson = d.ValueKind == JsonValueKind.Object && d.TryGetProperty("detalles", out var det) ? det : default;
        var details = IntakePlan.DetailKeys
            .Select(key => (key, value: Field(detailsJson, key, current.Detalles?.GetValueOrDefault(key), Limits.FieldMedium)))
            .Where(x => x.value.Length > 0)
            .ToDictionary(x => x.key, x => x.value);

        var data = new IntakeData(
            Nombre: Field(d, "nombre", current.Nombre, 100),
            Empresa: Field(d, "empresa", current.Empresa, Limits.FieldShort),
            Correo: Field(d, "correo", current.Correo, Limits.FieldShort),
            Telefono: Field(d, "telefono", current.Telefono, 30),
            Negocio: Field(d, "negocio", current.Negocio, Limits.FieldMedium),
            Necesita: Field(d, "necesita", current.Necesita, Limits.FieldMedium),
            Comentarios: Field(d, "comentarios", current.Comentarios, Limits.CommentsMax),
            Tipos: Codes("tipos", IntakePlan.ProjectTypes, current.Tipos),
            Detalles: details,
            NoAplica: Codes("noAplica", IntakePlan.DetailKeys, current.NoAplica));

        // El final lo decide el servidor, no la IA: cuando no falta ningún tema, pregunta una vez por el
        // teléfono y la empresa (opcionales) y después da la solicitud por completa.
        var complete = false;
        var missing = IntakePlan.Missing(data);
        var history = request.Messages!;
        if (missing.Count == 0)
        {
            if (!history.Any(m => m.Role == "assistant" && m.Content == Owner.Fill(IntakePlan.OptionalQuestion)))
            {
                reply = Owner.Fill(IntakePlan.OptionalQuestion);
            }
            else
            {
                complete = true;
                reply = Owner.Fill(IntakePlan.DoneMessage);
            }
        }
        else if (history.Any(m => m.Role == "assistant" && string.Equals(m.Content?.Trim(), reply, StringComparison.OrdinalIgnoreCase)))
        {
            // La IA ha repetido una pregunta: se cambia por la del primer tema que falta
            reply = Owner.Fill(missing[0].Question);
        }

        var summary = IntakePlan.Summary(data);
        return Results.Ok(new { reply, data, complete, summary });
    }
    catch (Exception ex) when (ex is HttpRequestException or JsonException or TaskCanceledException or KeyNotFoundException or InvalidOperationException)
    {
        logger.LogWarning(ex, "Fallo del formulario inteligente");
        return Results.Json(new { error = $"Ahora mismo no puedo seguir. Tu conversación está guardada: inténtalo de nuevo en un momento o escríbeme a {Owner.Email}." }, statusCode: 503);
    }
    finally
    {
        ollamaSlots.Release();
    }
}).RequireRateLimiting("asistente");

// Solicitudes de proyecto: se validan, se guardan y se envían por Telegram.
app.MapPost("/api/contact", async (ContactRequest request, RequestStore store, TelegramNotifier telegram,
    ILogger<Program> logger, CancellationToken ct) =>
{
    // Bot: se le responde como si todo hubiera ido bien, pero no se guarda ni se envía nada
    if (!string.IsNullOrEmpty(request.Web))
        return Results.Ok(new { ok = true });

    if (Validation.Contact(request) is { } invalid)
        return Results.BadRequest(new { error = invalid });

    var saved = false;
    try
    {
        await store.SaveAsync(request, ct);
        saved = true;
    }
    catch (Exception ex) when (ex is IOException or UnauthorizedAccessException)
    {
        logger.LogError(ex, "No se pudo guardar una solicitud");
    }

    var sent = false;
    if (telegram.Configured)
    {
        try
        {
            await telegram.SendAsync(request, ct);
            sent = true;
        }
        catch (Exception ex) when (ex is HttpRequestException or TaskCanceledException)
        {
            // Sin datos personales en el registro
            logger.LogError("No se pudo enviar una solicitud por Telegram: {Error}", ex.GetType().Name);
        }
    }
    else
    {
        logger.LogWarning("Telegram sin configurar: la solicitud solo se ha guardado en el servidor");
    }

    return saved || sent
        ? Results.Ok(new { ok = true })
        : Results.Json(new { error = $"No he podido recibir tu solicitud. Inténtalo de nuevo en un rato o escríbeme a {Owner.Email}." }, statusCode: 503);
}).RequireRateLimiting("solicitudes");

app.Run();

static RateLimitPartition<string> Bucket(string key, int limit, int refill, TimeSpan period) =>
    RateLimitPartition.GetTokenBucketLimiter(key, _ => new TokenBucketRateLimiterOptions
    {
        TokenLimit = limit,
        TokensPerPeriod = refill,
        ReplenishmentPeriod = period,
        QueueLimit = 0
    });

static string Clip(string? text, int max)
{
    var value = text?.Trim() ?? "";
    return value.Length > max ? value[..max] : value;
}

// Identifica al visitante: detrás del túnel de Cloudflare la IP real llega en CF-Connecting-IP.
static string ClientKey(HttpContext context) =>
    context.Request.Headers["CF-Connecting-IP"].FirstOrDefault()
    ?? context.Request.Headers["X-Forwarded-For"].FirstOrDefault()?.Split(',')[0].Trim()
    ?? context.Connection.RemoteIpAddress?.ToString()
    ?? "desconocido";

partial class Program
{

    // Mismo tamaño de contexto en todas las llamadas, para que Ollama no tenga que recargar el modelo
    const int ContextTokens = 8192;

    // Forma obligatoria de la respuesta del formulario inteligente (Ollama la respeta con "format")
    static readonly object IntakeSchema = new
    {
        type = "object",
        properties = new
        {
            respuesta = new { type = "string" },
            datos = new
            {
                type = "object",
                properties = new Dictionary<string, object>
                {
                    ["nombre"] = new { type = "string" },
                    ["empresa"] = new { type = "string" },
                    ["correo"] = new { type = "string" },
                    ["telefono"] = new { type = "string" },
                    ["negocio"] = new { type = "string" },
                    ["necesita"] = new { type = "string" },
                    ["comentarios"] = new { type = "string" },
                    ["tipos"] = new { type = "array", items = new { type = "string", @enum = IntakePlan.ProjectTypes } },
                    ["detalles"] = new
                    {
                        type = "object",
                        properties = IntakePlan.DetailKeys.ToDictionary(key => key, _ => (object)new { type = "string" })
                    },
                    ["noAplica"] = new { type = "array", items = new { type = "string", @enum = IntakePlan.DetailKeys.ToArray() } }
                },
                required = new[] { "nombre", "empresa", "correo", "telefono", "negocio", "necesita", "comentarios", "tipos", "detalles", "noAplica" }
            },
            completo = new { type = "boolean" }
        },
        required = new[] { "respuesta", "datos", "completo" }
    };
}
