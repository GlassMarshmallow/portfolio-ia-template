using System.Net;
using System.Net.Http.Headers;
using System.Text;

/// <summary>
/// Te envía las solicitudes por Telegram, con un bot. Necesita Telegram:BotToken y Telegram:ChatId
/// (en el servidor, en el .env; nunca en git).
/// </summary>
class TelegramNotifier(IHttpClientFactory clients, IConfiguration config)
{
    private string? Token => config["Telegram:BotToken"];
    private string? ChatId => config["Telegram:ChatId"];

    public bool Configured => !string.IsNullOrWhiteSpace(Token) && !string.IsNullOrWhiteSpace(ChatId);

    public async Task SendAsync(ContactRequest r, CancellationToken ct)
    {
        var client = clients.CreateClient("telegram");

        // Todo lo que ha escrito el visitante se escapa: Telegram interpreta el mensaje como HTML
        static string E(string? text) => WebUtility.HtmlEncode(text?.Trim() ?? "");
        static string L(List<string>? items) => items is { Count: > 0 } ? E(string.Join(", ", items)) : "—";
        var origin = r.Origen == "asistente" ? "formulario inteligente (IA)" : "formulario de contacto";

        var text = new StringBuilder()
            .AppendLine($"📩 <b>Nueva solicitud</b> desde el {origin}")
            .AppendLine()
            .AppendLine($"<b>Nombre:</b> {E(r.Nombre)}")
            .AppendLine($"<b>Correo:</b> {E(r.Correo)}")
            .AppendLine($"<b>Teléfono:</b> {(string.IsNullOrWhiteSpace(r.Telefono) ? "—" : E(r.Telefono))}")
            .AppendLine($"<b>Empresa:</b> {(string.IsNullOrWhiteSpace(r.Empresa) ? "—" : E(r.Empresa))}")
            .AppendLine()
            .AppendLine($"<b>Negocio:</b> {E(r.Negocio)}")
            .AppendLine($"<b>Necesita:</b> {L(r.Necesita)}");
        if (r.Objetivos is { Count: > 0 })
            text.AppendLine($"<b>Objetivos:</b> {L(r.Objetivos)}");
        if (r.GestionActual is { Count: > 0 })
            text.AppendLine($"<b>Gestión actual:</b> {L(r.GestionActual)}");

        // Lo que ha ido preguntando el formulario inteligente, tema a tema
        if (r.Detalles is { Count: > 0 } details)
        {
            text.AppendLine().AppendLine("<b>Detalles del proyecto</b>");
            foreach (var item in details.Where(i => !string.IsNullOrWhiteSpace(i.Value)))
                text.AppendLine($"• <b>{E(item.Label)}:</b> {E(item.Value)}");
        }

        if (!string.IsNullOrWhiteSpace(r.Comentarios))
            text.AppendLine().AppendLine($"<b>Resumen:</b>\n{E(r.Comentarios)}");

        var message = text.ToString();

        // Telegram admite mensajes de hasta 4096 caracteres
        if (message.Length > 4000)
            message = message[..4000] + "…";

        var response = await client.PostAsJsonAsync($"bot{Token}/sendMessage", new
        {
            chat_id = ChatId,
            text = message,
            parse_mode = "HTML",
            disable_web_page_preview = true
        }, ct);
        response.EnsureSuccessStatusCode();

        // La conversación completa con la IA, como archivo de texto adjunto
        if (r.Conversacion is { Count: > 0 } chat)
        {
            var transcript = string.Join("\n\n", chat.Select(m =>
                $"{(m.Role == "user" ? "Visitante" : "IA")}: {m.Content?.Trim()}"));
            using var form = new MultipartFormDataContent
            {
                { new StringContent(ChatId!), "chat_id" },
                { new StringContent("Conversación completa con el formulario inteligente"), "caption" }
            };
            var file = new ByteArrayContent(Encoding.UTF8.GetBytes(transcript));
            file.Headers.ContentType = new MediaTypeHeaderValue("text/plain") { CharSet = "utf-8" };
            form.Add(file, "document", $"conversacion-{DateTime.Now:yyyyMMdd-HHmm}.txt");
            (await client.PostAsync($"bot{Token}/sendDocument", form, ct)).EnsureSuccessStatusCode();
        }
    }
}
