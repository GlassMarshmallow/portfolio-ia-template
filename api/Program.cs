using System.Text.Json;
using System.Threading.RateLimiting;

// API del portfolio:
// - /api/ask: preguntas rápidas sobre la persona del portfolio, respondidas por IA por trozos (las de los
//   botones, al instante con las respuestas de respuestas-rapidas.json).
// - /api/intake: formulario «Quiero un proyecto»; el servidor hace las preguntas y la IA decide el tipo de
//   proyecto y responde a lo que pregunte el visitante.
// - /api/contact: recibe las solicitudes del formulario, las guarda y te las envía por Telegram.
// La IA se elige en appsettings.json → "IA:Proveedor" (Ollama, un servicio compatible con OpenAI o
// ninguna; ver Services/AiClient.cs). Solo esta API habla con ella: la clave o el Ollama nunca llegan al
// navegador. Es pública (detrás de nginx y el túnel de Cloudflare), así que todo lo que llega tiene tamaño
// y uso limitados.

var builder = WebApplication.CreateBuilder(args);
// Tus claves en local (IA, Telegram) van en appsettings.Local.json, que está en .gitignore
builder.Configuration.AddJsonFile("appsettings.Local.json", optional: true, reloadOnChange: false);
Owner.Load(builder.Configuration);

// Ninguna petición puede pesar más de 64 KB
builder.WebHost.ConfigureKestrel(k => k.Limits.MaxRequestBodySize = Limits.RequestBodyBytes);

builder.Services.AddHttpClient(AiClient.HttpClientName, c =>
{
    if (AiClient.BaseAddress(builder.Configuration) is { } address)
        c.BaseAddress = address;
    c.Timeout = TimeSpan.FromSeconds(180);
});
builder.Services.AddSingleton<AiClient>();
builder.Services.AddHttpClient("telegram", c =>
{
    // Configurable solo para pruebas (un Telegram falso en local); por defecto, el de verdad
    c.BaseAddress = new Uri(builder.Configuration["Telegram:BaseUrl"] ?? "https://api.telegram.org/");
    c.Timeout = TimeSpan.FromSeconds(20);
});
builder.Services.AddSingleton<TelegramNotifier>();
builder.Services.AddSingleton<RequestStore>();
builder.Services.AddHostedService<RequestCleanup>();

// Límites por visitante (por IP):
// - preguntas: 10 seguidas y después 1 por minuto
// - asistente (formulario): 60 mensajes seguidos y después 6 por minuto (casi ningún turno usa la IA, que
//   tiene su propio tope diario)
// - solicitudes: 3 seguidas y después 1 cada 20 minutos
builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
    options.AddPolicy("preguntas", context => Bucket(ClientKey(context), 10, 1, TimeSpan.FromMinutes(1)));
    options.AddPolicy("asistente", context => Bucket(ClientKey(context), 60, 6, TimeSpan.FromMinutes(1)));
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
// Respuestas ya escritas para las preguntas rápidas de los botones: salen al instante, sin IA
var quickAnswers = JsonSerializer.Deserialize<Dictionary<string, string>>(
        await File.ReadAllTextAsync(Path.Combine(AppContext.BaseDirectory, "respuestas-rapidas.json")))!
    .Where(kv => !kv.Key.StartsWith('_'))
    .ToDictionary(kv => QuestionKey(kv.Key), kv => Owner.Fill(kv.Value));
var askInstructions = Prompts.Ask(profile);
var intakeTypesInstructions = Prompts.IntakeTypes(IntakePlan.Battery());
var intakeQuestionInstructions = Prompts.IntakeQuestion(profile);

var ai = app.Services.GetRequiredService<AiClient>();
if (!ai.Configured)
    app.Logger.LogWarning("IA sin conectar: el chat y las preguntas del formulario avisarán de que no está disponible. Ver README → Conectar la IA.");

// Como mucho 2 respuestas generándose a la vez, para no saturar el equipo que ejecuta la IA.
var aiSlots = new SemaphoreSlim(2);

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
    if (!ai.Configured)
        return Results.Json(new { error = $"La IA de este portfolio todavía no está conectada. Puedes escribirme a {Owner.Email}." }, statusCode: 503);
    using var permit = dailyAiLimit.AttemptAcquire();
    if (!permit.IsAcquired)
        return Results.Json(new { error = $"Hoy ya he respondido muchas preguntas. Puedes escribirme a {Owner.Email}." }, statusCode: 429);
    if (!await aiSlots.WaitAsync(TimeSpan.FromSeconds(30), ct))
        return Results.Json(new { error = "Ahora mismo hay muchas preguntas a la vez. Inténtalo en unos segundos." }, statusCode: 503);
    return null;
}

app.MapGet("/api/health", () => Results.Ok(new { status = "ok", ia = ai.Configured ? ai.Provider : "sin conectar" }));

app.MapPost("/api/ask", async (AskRequest request, HttpContext http, ILogger<Program> logger, CancellationToken ct) =>
{
    var question = request.Question?.Trim() ?? "";
    if (question.Length is < Limits.QuestionMin or > Limits.QuestionMax)
        return Results.BadRequest(new { error = $"Escribe una pregunta de entre {Limits.QuestionMin} y {Limits.QuestionMax} caracteres." });

    if (quickAnswers.TryGetValue(QuestionKey(question), out var quickAnswer))
        return Results.Text(quickAnswer, "text/plain; charset=utf-8");

    if (await EnterAi(ct) is { } busy)
        return busy;

    var started = false;
    try
    {
        // La respuesta se va enviando a la web según el modelo la genera (texto plano por trozos),
        // así quien pregunta empieza a leer enseguida aunque el modelo sea lento.
        AiMessage[] messages = [new("system", askInstructions), new("user", question)];
        var insideThink = false;
        await foreach (var chunk in ai.StreamAsync(messages, temperature: 0.4, maxTokens: 220, ct))
        {
            var piece = chunk;

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
        logger.LogWarning(ex, "No se pudo consultar a la IA ({Proveedor})", ai.Provider);
        // Si ya se había empezado a enviar la respuesta, se corta ahí
        if (started)
            return Results.Empty;
        return Results.Json(new { error = $"Ahora mismo no puedo responder. Puedes escribirme a {Owner.Email}." }, statusCode: 503);
    }
    finally
    {
        aiSlots.Release();
    }
}).RequireRateLimiting("preguntas");

// Formulario «Quiero un proyecto» (ver IntakePlan). En cada turno el servidor guarda la respuesta en la
// pregunta pendiente y elige la siguiente (ver ChooseNextQuestion): la IA solo razona una vez, al terminar
// las preguntas de base, qué tipo de proyecto es; el resto va en orden y al instante.
// Si el visitante pregunta algo, la IA le contesta en una o dos frases y se repite la pregunta pendiente.
// Sin IA conectada el formulario funciona igual: hace todas las preguntas de una web informativa y responde
// a las del visitante con un texto fijo.
// La conversación la guarda el navegador; el servidor no guarda nada hasta el envío.
app.MapPost("/api/intake", async (IntakeRequest request, ILogger<Program> logger, CancellationToken ct) =>
{
    if (Validation.Intake(request) is { } invalid)
        return Results.BadRequest(new { error = invalid });
    var history = request.Messages!;
    var firstTurn = history.Count(m => m.Role == "assistant") == 1;

    var data = IntakePlan.Clean(request.Data ?? new IntakeData());
    // La pregunta a la que responde (en el primer turno, la del saludo)
    var asked = IntakePlan.Step(data.Pendiente) ?? (firstTurn ? IntakePlan.Step("necesita") : null);
    var answer = history[^1].Content!.Trim();
    string reply;

    if (asked is null)
    {
        // Sin pregunta pendiente (por ejemplo, una conversación guardada con una versión anterior del
        // formulario): se sigue por la primera que falte
        IntakeStep? next;
        (data, next) = await ChooseNextQuestion(data, logger, ct);
        reply = next?.Question ?? IntakePlan.DoneMessage;
        data = data with { Pendiente = next?.Key };
    }
    else if (IntakePlan.IsQuestion(answer))
    {
        // Pregunta del visitante: la responde la IA, se apunta en el resumen y se repite la pregunta pendiente
        data = IntakePlan.AddQuestion(data, answer);
        var aiAnswer = await AnswerIntakeQuestion(answer, logger, ct) ?? IntakePlan.QuestionFallback;
        reply = $"{aiAnswer} {IntakePlan.Continue} {asked.Question}";
        data = data with { Pendiente = asked.Key };
    }
    else
    {
        // Si ya se le preguntó «¿Cuáles?» (o similar) y responde, se guarda lo que diga
        var followUpAsked = history.Count >= 2 && history[^2].Role == "assistant" && history[^2].Content == asked.FollowUp;
        (data, var retry) = IntakePlan.Apply(data, asked, answer, followUpAsked);
        if (retry is not null)
        {
            reply = retry;
            data = data with { Pendiente = asked.Key };
        }
        else
        {
            IntakeStep? next;
            (data, next) = await ChooseNextQuestion(data, logger, ct);
            reply = next?.Question ?? IntakePlan.DoneMessage;
            data = data with { Pendiente = next?.Key };
        }
    }

    var complete = data.Pendiente is null;
    return Results.Ok(new { reply, data, complete, summary = IntakePlan.Summary(data) });
}).RequireRateLimiting("asistente");

// Siguiente pregunta. Con la primera respuesta («¿Qué te gustaría crear?»), la IA decide una sola vez los
// tipos de proyecto y si ya ha dicho a qué se dedica o si tiene un negocio en marcha (para saltarse esas dos
// preguntas). Después van, en orden y sin IA, las de base que queden, las de esos tipos, las comunes y las
// del final. Si la IA falla o no está conectada: web informativa y todas las de base.
async Task<(IntakeData Data, IntakeStep? Next)> ChooseNextQuestion(IntakeData data, ILogger logger, CancellationToken ct)
{
    if (data.Tipos is null && IntakePlan.IsAnswered(data, "necesita"))
    {
        var plan = await AskAiForProjectTypes(data, logger, ct);
        data = data with { Tipos = plan?.Types is { Count: > 0 } types ? types : ["web_informativa"] };
        // Las preguntas de base que sobran las decide el servidor con las respuestas de sí o no de la IA
        if (plan?.SaidWhatTheyDo == true)
            data = IntakePlan.Skip(data, "negocio");
        if (plan?.HasRunningBusiness == false)
            data = IntakePlan.Skip(data, "gestionActual");
    }

    return (data, IntakePlan.NextBase(data) ?? IntakePlan.NextProject(data) ?? IntakePlan.NextFinal(data));
}

async Task<(List<string> Types, bool SaidWhatTheyDo, bool HasRunningBusiness)?> AskAiForProjectTypes(IntakeData data,
    ILogger logger, CancellationToken ct)
{
    var types = IntakePlan.ProjectTypes.Select(t => t.Key).ToArray();
    // Lo que cambia va al final: las instrucciones (con los tipos) se leen una sola vez
    var turn = $"LO QUE HA CONTADO:\n{IntakePlan.Answers(data)}";

    if (await EnterAi(ct) is not null)
        return null;
    try
    {
        using var timeout = CancellationTokenSource.CreateLinkedTokenSource(ct);
        timeout.CancelAfter(TimeSpan.FromSeconds(40));
        var schema = new
        {
            type = "object",
            properties = new
            {
                tipos = new { type = "array", items = new { type = "string", @enum = types }, minItems = 1, maxItems = 2 },
                yaDijoAQueSeDedica = new { type = "boolean" },
                tieneNegocioEnMarcha = new { type = "boolean" }
            },
            required = new[] { "tipos", "yaDijoAQueSeDedica", "tieneNegocioEnMarcha" }
        };
        var content = await ai.CompleteJsonAsync([new("system", intakeTypesInstructions), new("user", turn)],
            schema, temperature: 0.1, maxTokens: 80, timeout.Token);
        using var result = JsonDocument.Parse(content);
        var root = result.RootElement;
        var chosen = root.GetProperty("tipos").EnumerateArray()
            .Where(t => t.ValueKind == JsonValueKind.String).Select(t => t.GetString()!)
            .Where(types.Contains).Distinct().Take(2).ToList();
        bool Flag(string name, bool fallback) =>
            root.TryGetProperty(name, out var v) && v.ValueKind is JsonValueKind.True or JsonValueKind.False ? v.GetBoolean() : fallback;
        // Si no lo deja claro, se pregunta todo (es lo más seguro)
        return (chosen, Flag("yaDijoAQueSeDedica", false), Flag("tieneNegocioEnMarcha", true));
    }
    catch (Exception ex) when (!ct.IsCancellationRequested
        && ex is HttpRequestException or JsonException or TaskCanceledException or KeyNotFoundException or InvalidOperationException)
    {
        logger.LogWarning(ex, "La IA no ha podido decidir el tipo de proyecto del formulario");
        return null;
    }
    finally
    {
        aiSlots.Release();
    }
}

// Respuesta corta de la IA a una pregunta hecha en el formulario. Si la IA no está disponible o tarda
// demasiado, devuelve null y se usa una respuesta fija.
async Task<string?> AnswerIntakeQuestion(string question, ILogger logger, CancellationToken ct)
{
    if (await EnterAi(ct) is not null)
        return null;
    try
    {
        using var timeout = CancellationTokenSource.CreateLinkedTokenSource(ct);
        timeout.CancelAfter(TimeSpan.FromSeconds(30));
        var text = Clip(await ai.CompleteTextAsync([new("system", intakeQuestionInstructions), new("user", question)],
            temperature: 0.4, maxTokens: 160, timeout.Token), 400);
        return text.Length > 0 ? text : null;
    }
    catch (Exception ex) when (!ct.IsCancellationRequested
        && ex is HttpRequestException or JsonException or TaskCanceledException or KeyNotFoundException or InvalidOperationException)
    {
        logger.LogWarning(ex, "La IA no ha podido responder a una pregunta del formulario");
        return null;
    }
    finally
    {
        aiSlots.Release();
    }
}

// Solicitudes de proyecto: se validan, se guardan y se envían por Telegram.
app.MapPost("/api/contact", async (ContactRequest request, RequestStore store, TelegramNotifier telegram,
    ILogger<Program> logger, CancellationToken ct) =>
{
    // Bot: se le responde como si todo hubiera ido bien, pero no se guarda ni se envía nada
    if (!string.IsNullOrEmpty(request.Web))
        return Results.Ok(new { ok = true });

    // Si el formulario se saltó «¿A qué se dedica?» (ya lo dijo al contar qué quiere crear), se usa eso
    if (string.IsNullOrWhiteSpace(request.Negocio) && request.Necesita?.FirstOrDefault(n => !string.IsNullOrWhiteSpace(n)) is { } said)
        request = request with { Negocio = Clip(said, Limits.FieldMedium) };

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
        catch (Exception ex) when (!ct.IsCancellationRequested)
        {
            // Cualquier fallo de Telegram solo se registra: la solicitud ya está guardada. Sin datos personales.
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

// La misma pregunta escrita con o sin «¿?», mayúsculas o espacios de más
static string QuestionKey(string question) =>
    string.Join(' ', question.ToLowerInvariant().Trim('¿', '?', '¡', '!', '.', ' ').Split(' ', StringSplitOptions.RemoveEmptyEntries));

// Identifica al visitante: detrás del túnel de Cloudflare la IP real llega en CF-Connecting-IP.
static string ClientKey(HttpContext context) =>
    context.Request.Headers["CF-Connecting-IP"].FirstOrDefault()
    ?? context.Request.Headers["X-Forwarded-For"].FirstOrDefault()?.Split(',')[0].Trim()
    ?? context.Connection.RemoteIpAddress?.ToString()
    ?? "desconocido";
