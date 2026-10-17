using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Runtime.CompilerServices;
using System.Text.Json;

/// <summary>Un mensaje de la conversación que se envía a la IA ("system", "user" o "assistant").</summary>
record AiMessage(string Role, string Content);

/// <summary>
/// Conexión con la IA, elegida en appsettings.json → "IA:Proveedor" (o la variable IA__Proveedor):
/// - "" (vacío, por defecto): sin IA. El chat y el formulario inteligente avisan de que no está conectada.
/// - "ollama": un modelo de Ollama, en tu ordenador o tu servidor ("Ollama:BaseUrl" y "Ollama:Model").
/// - "openai": cualquier servicio compatible con la API de OpenAI (OpenAI, OpenRouter, Groq, Mistral,
///   LM Studio…), con "OpenAI:BaseUrl", "OpenAI:Model" y "OpenAI:ApiKey" (la clave, nunca en git).
/// </summary>
class AiClient(IHttpClientFactory clients, IConfiguration config)
{
    public const string HttpClientName = "ia";

    // Mismo tamaño de contexto en todas las llamadas, para que Ollama no tenga que recargar el modelo
    const int OllamaContextTokens = 8192;

    public string Provider { get; } = (config["IA:Proveedor"] ?? "").Trim().ToLowerInvariant();
    public bool Configured => Provider is "ollama" or "openai";

    /// <summary>Base de la dirección de la IA según el proveedor (se usa al crear el cliente HTTP).</summary>
    public static Uri? BaseAddress(IConfiguration config) =>
        (config["IA:Proveedor"] ?? "").Trim().ToLowerInvariant() switch
        {
            "ollama" => new Uri(WithSlash(config["Ollama:BaseUrl"] ?? "http://localhost:11434/")),
            "openai" => new Uri(WithSlash(config["OpenAI:BaseUrl"] ?? "https://api.openai.com/v1/")),
            _ => null
        };

    string Model => Provider == "ollama" ? config["Ollama:Model"] ?? "" : config["OpenAI:Model"] ?? "";

    /// <summary>Respuesta en texto, por trozos según el modelo la genera.</summary>
    public async IAsyncEnumerable<string> StreamAsync(IReadOnlyList<AiMessage> messages, double temperature, int maxTokens,
        [EnumeratorCancellation] CancellationToken ct)
    {
        using var request = Provider == "ollama"
            ? Post("api/chat", new
            {
                model = Model,
                messages = Wire(messages),
                stream = true,
                think = false,
                options = new { temperature, num_ctx = OllamaContextTokens, num_predict = maxTokens }
            })
            : Post("chat/completions", new
            {
                model = Model,
                messages = Wire(messages),
                stream = true,
                temperature,
                max_tokens = maxTokens
            });

        using var response = await clients.CreateClient(HttpClientName)
            .SendAsync(request, HttpCompletionOption.ResponseHeadersRead, ct);
        response.EnsureSuccessStatusCode();

        using var reader = new StreamReader(await response.Content.ReadAsStreamAsync(ct));
        while (await reader.ReadLineAsync(ct) is { } line)
        {
            if (line.Length == 0)
                continue;

            string? piece;
            if (Provider == "ollama")
            {
                // Ollama: una línea JSON por trozo
                using var chunk = JsonDocument.Parse(line);
                piece = chunk.RootElement.TryGetProperty("message", out var message)
                    ? message.GetProperty("content").GetString()
                    : null;
            }
            else
            {
                // OpenAI: eventos "data: {…}" y, al final, "data: [DONE]"
                if (!line.StartsWith("data:"))
                    continue;
                var data = line[5..].Trim();
                if (data == "[DONE]")
                    break;
                using var chunk = JsonDocument.Parse(data);
                var choices = chunk.RootElement.GetProperty("choices");
                piece = choices.GetArrayLength() > 0
                    && choices[0].TryGetProperty("delta", out var delta)
                    && delta.TryGetProperty("content", out var content)
                    && content.ValueKind == JsonValueKind.String
                        ? content.GetString()
                        : null;
            }

            if (!string.IsNullOrEmpty(piece))
                yield return piece;
        }
    }

    /// <summary>Respuesta completa en JSON con la forma de <paramref name="schema"/> (formulario inteligente).</summary>
    public async Task<string> CompleteJsonAsync(IReadOnlyList<AiMessage> messages, object schema, double temperature, int maxTokens,
        CancellationToken ct)
    {
        var client = clients.CreateClient(HttpClientName);

        if (Provider == "ollama")
        {
            using var request = Post("api/chat", new
            {
                model = Model,
                messages = Wire(messages),
                stream = false,
                think = false,
                format = schema,
                options = new { temperature, num_ctx = OllamaContextTokens, num_predict = maxTokens }
            });
            using var response = await client.SendAsync(request, ct);
            response.EnsureSuccessStatusCode();
            using var body = await JsonDocument.ParseAsync(await response.Content.ReadAsStreamAsync(ct), cancellationToken: ct);
            return body.RootElement.GetProperty("message").GetProperty("content").GetString() ?? "";
        }

        // OpenAI: primero con el esquema exacto; si el servicio no lo admite, se pide JSON sin más
        // (las instrucciones ya describen la forma de la respuesta)
        object[] formats =
        [
            new { type = "json_schema", json_schema = new { name = "respuesta", schema } },
            new { type = "json_object" }
        ];
        HttpResponseMessage? last = null;
        foreach (var format in formats)
        {
            last?.Dispose();
            using var request = Post("chat/completions", new
            {
                model = Model,
                messages = Wire(messages),
                temperature,
                max_tokens = maxTokens,
                response_format = format
            });
            last = await client.SendAsync(request, ct);
            if ((int)last.StatusCode != 400)
                break;
        }
        using (last)
        {
            last!.EnsureSuccessStatusCode();
            using var body = await JsonDocument.ParseAsync(await last.Content.ReadAsStreamAsync(ct), cancellationToken: ct);
            return body.RootElement.GetProperty("choices")[0].GetProperty("message").GetProperty("content").GetString() ?? "";
        }
    }

    HttpRequestMessage Post(string path, object payload)
    {
        var request = new HttpRequestMessage(HttpMethod.Post, path) { Content = JsonContent.Create(payload) };
        var key = config["OpenAI:ApiKey"];
        if (Provider == "openai" && !string.IsNullOrWhiteSpace(key))
            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", key.Trim());
        return request;
    }

    static object[] Wire(IEnumerable<AiMessage> messages) =>
        messages.Select(m => (object)new { role = m.Role, content = m.Content }).ToArray();

    static string WithSlash(string url) => url.EndsWith('/') ? url : url + "/";
}
