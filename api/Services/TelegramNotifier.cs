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
        var now = SpainNow();

        // Si se pasa del máximo de Telegram (4096 caracteres), se vuelve a montar con las respuestas recortadas
        var message = BuildMessage(r, now, int.MaxValue);
        if (message.Length > 4000)
            message = BuildMessage(r, now, 150);

        // "./" delante: el token lleva ":" ("123:ABC…") y, sin ella, "bot123" se tomaría como el esquema de la dirección
        var response = await client.PostAsJsonAsync($"./bot{Token}/sendMessage", new
        {
            chat_id = ChatId,
            text = message,
            parse_mode = "HTML",
            disable_web_page_preview = true
        }, ct);
        response.EnsureSuccessStatusCode();

        // La conversación completa con el asistente, como archivo de texto adjunto
        if (r.Conversacion is { Count: > 0 } chat)
        {
            var name = string.IsNullOrWhiteSpace(r.Nombre) ? "Visitante" : r.Nombre.Trim();
            var transcript = $"Conversación de {name} con el asistente de la web\n{now:dd/MM/yyyy HH:mm}\n\n" +
                string.Join("\n\n", chat.Select(m => $"{(m.Role == "user" ? name : "Asistente")}: {m.Content?.Trim()}"));
            using var form = new MultipartFormDataContent
            {
                { new StringContent(ChatId!), "chat_id" },
                { new StringContent($"💬 Conversación completa con {name}"), "caption" }
            };
            var file = new ByteArrayContent(Encoding.UTF8.GetBytes(transcript));
            file.Headers.ContentType = new MediaTypeHeaderValue("text/plain") { CharSet = "utf-8" };
            form.Add(file, "document", $"conversacion-{now:yyyyMMdd-HHmm}.txt");
            (await client.PostAsync($"./bot{Token}/sendDocument", form, ct)).EnsureSuccessStatusCode();
        }
    }

    // Grupos de respuestas del formulario, en el orden en que se enseñan (ver IntakePlan)
    static readonly (string Title, Func<string, bool> Includes)[] Sections =
    [
        ("🧭 <b>SOBRE EL NEGOCIO</b>", group => group == "base"),
        ("🛠 <b>LO QUE NECESITA</b>", group => group is not ("base" or "comun" or "final")),
        ("🎨 <b>LO QUE YA TIENE</b>", group => group == "comun"),
    ];

    /// <summary>El mensaje, en HTML de Telegram. maxValue recorta cada respuesta (si el mensaje es muy largo).</summary>
    static string BuildMessage(ContactRequest r, DateTime now, int maxValue)
    {
        // Todo lo que ha escrito el visitante se escapa: Telegram interpreta el mensaje como HTML
        string E(string? text)
        {
            var value = text?.Trim() ?? "";
            // Solo lo que Telegram pide escapar: las tildes y la ñ van tal cual
            return (value.Length > maxValue ? value[..maxValue] + "…" : value)
                .Replace("&", "&amp;").Replace("<", "&lt;").Replace(">", "&gt;");
        }
        var details = (r.Detalles ?? []).Where(i => !string.IsNullOrWhiteSpace(i.Value)).ToList();
        string? Value(string key) => details.FirstOrDefault(i => i.Key == key)?.Value;
        var line = "━━━━━━━━━━━━━━";

        var text = new StringBuilder()
            .AppendLine("📩 <b>Nueva solicitud de proyecto</b>")
            .AppendLine($"<i>{now:dd/MM/yyyy} a las {now:HH:mm} · desde el formulario de la web</i>")
            .AppendLine(line)
            .AppendLine()
            .AppendLine("👤 <b>CONTACTO</b>")
            .AppendLine($"<b>{E(r.Nombre)}</b>{(string.IsNullOrWhiteSpace(r.Empresa) ? "" : $" · {E(r.Empresa)}")}")
            .AppendLine($"✉️ {E(r.Correo)}");
        if (!string.IsNullOrWhiteSpace(r.Telefono))
            text.AppendLine($"📞 {E(r.Telefono)}");

        var wants = r.Necesita is { Count: > 0 } n ? string.Join(", ", n) : "";
        text.AppendLine().AppendLine("💡 <b>EL PROYECTO</b>")
            .AppendLine($"<blockquote>{E(wants)}</blockquote>");
        // «A qué se dedica», si no es lo mismo que ya dijo al contar qué quiere crear
        if (!string.IsNullOrWhiteSpace(r.Negocio) && r.Negocio.Trim() != wants.Trim())
            text.AppendLine($"<b>Se dedica a:</b> {E(r.Negocio)}");

        // Las respuestas del formulario, agrupadas
        foreach (var (title, includes) in Sections)
        {
            var items = details.Where(i => IntakePlan.Step(i.Key) is { } step && includes(step.Group)
                && step.Key is not ("necesita" or "negocio")).ToList();
            if (items.Count == 0)
                continue;
            text.AppendLine().AppendLine(title);
            foreach (var item in items)
                text.AppendLine($"• <b>{E(item.Label)}:</b> {E(item.Value)}");
        }
        // Datos de versiones anteriores del formulario (sin clave)
        var other = details.Where(i => i.Key is null || (IntakePlan.Step(i.Key) is null && i.Key != IntakePlan.QuestionsKey)).ToList();
        if (other.Count > 0)
        {
            text.AppendLine().AppendLine("📋 <b>OTROS DETALLES</b>");
            foreach (var item in other)
                text.AppendLine($"• <b>{E(item.Label)}:</b> {E(item.Value)}");
        }
        if (r.Objetivos is { Count: > 0 })
            text.AppendLine($"• <b>Objetivos:</b> {E(string.Join(", ", r.Objetivos))}");
        if (r.GestionActual is { Count: > 0 })
            text.AppendLine($"• <b>Gestión actual:</b> {E(string.Join(", ", r.GestionActual))}");

        if (Value("extra") is { } extra)
            text.AppendLine().AppendLine("📝 <b>QUIERE AÑADIR</b>").AppendLine($"<blockquote>{E(extra)}</blockquote>");
        if (Value(IntakePlan.QuestionsKey) is { } questions)
        {
            text.AppendLine().AppendLine("❓ <b>PREGUNTAS PARA TI</b>");
            foreach (var question in questions.Split(" · ", StringSplitOptions.RemoveEmptyEntries))
                text.AppendLine($"• {E(question)}");
        }
        if (!string.IsNullOrWhiteSpace(r.Comentarios))
            text.AppendLine().AppendLine("🗒 <b>COMENTARIOS</b>").AppendLine($"<blockquote>{E(r.Comentarios)}</blockquote>");

        text.AppendLine().AppendLine(line);
        if (Value("valoracion") is { } score)
            text.AppendLine($"⭐ <b>Valoración del formulario:</b> {E(score)}");
        if (r.Conversacion is { Count: > 0 })
            text.AppendLine("📎 <i>La conversación completa va en el archivo de abajo.</i>");
        return text.ToString();
    }

    // Fecha y hora de España (el servidor va en UTC)
    static DateTime SpainNow()
    {
        try
        {
            return TimeZoneInfo.ConvertTimeBySystemTimeZoneId(DateTime.UtcNow, "Europe/Madrid");
        }
        catch (TimeZoneNotFoundException)
        {
            return DateTime.UtcNow;
        }
    }
}
