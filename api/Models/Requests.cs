using System.Net.Mail;

// Lo que llega del navegador. Todo es opcional en el tipo y se valida a mano con mensajes en español.

record AskRequest(string? Question);

record ChatMessage(string? Role, string? Content);

/// <summary>Datos de la solicitud que va rellenando el formulario (ver IntakePlan).</summary>
record IntakeData(
    string? Nombre = "", string? Empresa = "", string? Correo = "", string? Telefono = "",
    string? Negocio = "", string? Necesita = "", string? Comentarios = "",
    /// Respuestas a las preguntas del guion que no tienen campo propio, por clave (publico, objetivos…)
    Dictionary<string, string>? Detalles = null,
    /// Preguntas del guion ya respondidas (también las opcionales contestadas con «no»)
    List<string>? Respondidas = null,
    /// Preguntas que ha hecho el visitante, para que la persona del portfolio las responda
    List<string>? Preguntas = null,
    /// Siguiente pregunta del guion (lo pone el servidor; el navegador lo devuelve tal cual)
    string? Pendiente = null,
    /// Tipos de proyecto que ha decidido la IA (null: aún no lo ha decidido)
    List<string>? Tipos = null);

/// <summary>Un dato del resumen, con su etiqueta legible y la clave del guion (para editarlo).</summary>
record SummaryItem(string? Label, string? Value, string? Key = null);

record IntakeRequest(List<ChatMessage>? Messages, IntakeData? Data);

/// <summary>Solicitud de proyecto recogida por el formulario inteligente.</summary>
record ContactRequest(
    string? Nombre, string? Empresa, string? Correo, string? Telefono, string? Negocio,
    List<string>? Necesita, List<string>? Objetivos, List<string>? GestionActual, string? Comentarios,
    string? Origen, List<ChatMessage>? Conversacion,
    /// Detalles del proyecto recogidos por el formulario inteligente, con su etiqueta
    List<SummaryItem>? Detalles,
    /// Campo trampa: invisible para las personas. Si llega relleno, lo ha escrito un bot.
    string? Web);

static class Limits
{
    public const int QuestionMin = 3, QuestionMax = 300;
    public const int IntakeUserMessageMax = 500, IntakeAssistantMessageMax = 800;
    public const int IntakeMessagesMax = 40, IntakeTotalChars = 20_000;
    public const int FieldShort = 150, FieldMedium = 400, CommentsMax = 3000, ListItemsMax = 10;
    public const int RequestBodyBytes = 64 * 1024;
}

static class Validation
{
    public static bool IsEmail(string? value) =>
        !string.IsNullOrWhiteSpace(value) && value.Length <= Limits.FieldShort
        && MailAddress.TryCreate(value.Trim(), out var address)
        && address.Address == value.Trim() && address.Host.Contains('.');

    /// <summary>Devuelve el mensaje de error para el visitante, o null si la solicitud es válida.</summary>
    public static string? Contact(ContactRequest r)
    {
        if (string.IsNullOrWhiteSpace(r.Nombre) || r.Nombre.Trim().Length is < 2 or > 100)
            return "Escribe tu nombre.";
        if (!IsEmail(r.Correo))
            return "Escribe un correo electrónico válido.";
        if (string.IsNullOrWhiteSpace(r.Negocio) || r.Negocio.Length > Limits.FieldMedium)
            return "Cuéntame a qué se dedica tu negocio o proyecto.";
        if (r.Necesita is not { Count: > 0 })
            return "Dime qué necesitas.";
        if ((r.Empresa?.Length ?? 0) > Limits.FieldShort || (r.Telefono?.Length ?? 0) > 30
            || (r.Comentarios?.Length ?? 0) > Limits.CommentsMax)
            return "Algún campo es demasiado largo.";
        foreach (var list in new[] { r.Necesita, r.Objetivos, r.GestionActual })
            if (list is { } items && (items.Count > Limits.ListItemsMax || items.Any(i => i is null || i.Length > Limits.FieldMedium)))
                return "Algún campo es demasiado largo.";
        if (r.Detalles is { } details && (details.Count > 40
            || details.Any(i => (i.Label?.Length ?? 0) > 60 || (i.Value?.Length ?? 0) > Limits.FieldMedium)))
            return "Algún campo es demasiado largo.";
        if (r.Conversacion is { } chat && (chat.Count > Limits.IntakeMessagesMax * 2 + 2
            || chat.Sum(m => m.Content?.Length ?? 0) > Limits.IntakeTotalChars * 2))
            return "La conversación es demasiado larga.";
        return null;
    }

    /// <summary>Mensajes del formulario inteligente: solo visitante y asistente, con tamaño limitado.</summary>
    public static string? Intake(IntakeRequest r)
    {
        var messages = r.Messages ?? [];
        if (messages.Count is 0 or > Limits.IntakeMessagesMax * 2)
            return $"La conversación es demasiado larga. Puedes empezar de nuevo o escribirme a {Owner.Email}.";
        if (messages[^1].Role != "user")
            return "Falta tu mensaje.";
        foreach (var m in messages)
        {
            var max = m.Role switch
            {
                "user" => Limits.IntakeUserMessageMax,
                "assistant" => Limits.IntakeAssistantMessageMax,
                _ => -1
            };
            if (max < 0 || string.IsNullOrWhiteSpace(m.Content))
                return "La conversación no es válida. Puedes empezar de nuevo.";
            if (m.Content.Length > max)
                return $"Cada mensaje puede tener como máximo {Limits.IntakeUserMessageMax} caracteres.";
        }
        if (messages.Sum(m => m.Content!.Length) > Limits.IntakeTotalChars)
            return $"La conversación es demasiado larga. Puedes empezar de nuevo o escribirme a {Owner.Email}.";

        // Los datos que devuelve el navegador también se comprueban: tamaños y cantidades. Las claves que no son
        // del guion (de versiones anteriores del formulario) no se rechazan: IntakePlan.Clean las quita.
        if (r.Data is { } d)
        {
            var texts = new[] { d.Nombre, d.Empresa, d.Correo, d.Telefono, d.Negocio, d.Necesita };
            if (texts.Any(t => (t?.Length ?? 0) > Limits.FieldMedium)
                || (d.Comentarios?.Length ?? 0) > Limits.CommentsMax
                || (d.Detalles?.Count ?? 0) > 50 || (d.Respondidas?.Count ?? 0) > 50 || (d.Preguntas?.Count ?? 0) > 20
                || (d.Detalles ?? []).Any(kv => kv.Key.Length > 40 || (kv.Value?.Length ?? 0) > Limits.FieldMedium)
                || (d.Preguntas ?? []).Any(q => (q?.Length ?? 0) > Limits.FieldMedium))
                return "La conversación no es válida. Puedes empezar de nuevo.";
        }
        return null;
    }
}
