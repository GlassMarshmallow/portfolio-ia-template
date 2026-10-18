using System.Text;
using System.Text.RegularExpressions;

// Guion del formulario «Quiero un proyecto»: una batería de preguntas ya escritas, por grupos.
// - base: las primeras, en este orden.
// - Un grupo por tipo de proyecto (web informativa, portfolio, tienda, reservas…) y «comun». Con la primera
//   respuesta («¿Qué te gustaría crear?»), la IA razona una sola vez qué tipos de proyecto son y si sobran
//   «¿a qué se dedica?» y «¿cómo lo gestiona?» (ver /api/intake). Después se hacen las que quedan, en orden
//   y sin IA.
// - final: datos de contacto, «¿algo más?» y la valoración; siempre, en este orden y sin IA.
// La IA solo devuelve claves; los textos los pone el servidor, así responde en pocos segundos.
// Las preguntas ya respondidas o saltadas se apuntan en IntakeData.Respondidas y la siguiente en
// IntakeData.Pendiente: así, al retomar la conversación otro día, el servidor sabe por cuál va.

/// <summary>
/// Una pregunta de la batería. Optional: se puede contestar «no». FollowUp: lo que se pregunta si la respuesta
/// es solo «sí» (por ejemplo, «¿Cuáles?»).
/// </summary>
record IntakeStep(string Key, string Group, string Label, string Question, bool Optional = false, string? FollowUp = null);

static partial class IntakePlan
{
    public static readonly IntakeStep[] Steps =
    [
        // Para todos, en este orden. La primera la hace el saludo de la web (INTAKE_GREETING)
        new("necesita", "base", "Qué quiere crear", "¿Qué te gustaría crear?"),
        new("negocio", "base", "Negocio", "¿A qué se dedica tu negocio o proyecto?"),
        new("publico", "base", "Clientes", "¿Quiénes son tus clientes o a quién va dirigido?"),
        new("gestionActual", "base", "Cómo lo gestiona ahora",
            "Explícame cómo gestionas ahora tu negocio en el día a día, con ejemplos: cómo te llegan los clientes, cómo apuntas los pedidos o las citas, si usas papel, Excel o WhatsApp… Cuanto más me cuentes, mejor."),
        new("objetivos", "base", "Objetivo",
            "¿Qué te gustaría conseguir? Por ejemplo, más clientes, ahorrar tiempo o vender por internet."),

        // Web informativa
        new("secciones", "web_informativa", "Secciones", "¿Qué secciones o páginas te gustaría que tuviera?"),
        new("blog", "web_informativa", "Blog o noticias", "¿Te gustaría publicar noticias o tener un blog?"),
        new("idiomas", "web_informativa", "Idiomas", "¿En qué idiomas tendría que estar?"),
        new("contacto", "web_informativa", "Contacto desde la web",
            "¿Quieres que tus clientes puedan escribirte desde la web, por ejemplo con un formulario o WhatsApp?"),

        // Portfolio o web personal
        new("obras", "portfolio", "Trabajos que quiere mostrar", "¿Qué trabajos te gustaría mostrar y cuántos, más o menos?"),
        new("trayectoria", "portfolio", "Trayectoria o servicios", "¿Quieres contar tu trayectoria o los servicios que ofreces?"),
        new("contactoPortfolio", "portfolio", "Cómo quiere que le contacten",
            "¿Cómo quieres que te contacten: por correo, con un formulario, por redes sociales…?"),
        new("venta", "portfolio", "Venta", "¿Te gustaría vender algo, como láminas, prints o encargos?"),

        // Tienda online
        new("catalogo", "tienda_online", "Productos", "¿Qué vendes y cuántos productos tienes, más o menos?"),
        new("pagos", "tienda_online", "Cobros", "¿Cómo te gustaría cobrar: tarjeta, Bizum, transferencia…?"),
        new("envios", "tienda_online", "Envíos", "¿Haces envíos o recogida en tienda? ¿A qué zonas?"),
        new("stock", "tienda_online", "Stock", "¿Cómo controlas ahora el stock?"),

        // Reservas o citas
        new("servicios", "reservas", "Servicios reservables",
            "¿Qué servicios se podrán reservar y cuánto dura cada uno, más o menos?"),
        new("profesionales", "reservas", "Profesionales", "¿Cuántas personas atendéis? ¿Cada una tiene su propia agenda?"),
        new("horarios", "reservas", "Horarios", "¿Qué días y horarios ofreces?"),
        new("pagoReserva", "reservas", "Pago al reservar",
            "¿Quieres cobrar o pedir una señal al reservar, o se paga en el momento?"),
        new("recordatorios", "reservas", "Recordatorios",
            "¿Te gustaría que tus clientes recibieran recordatorios automáticos de la cita?"),

        // Panel de gestión
        new("usuarios", "panel_gestion", "Usuarios del panel", "¿Quién lo va a usar? ¿Habría personas con distintos permisos?"),
        new("datosPanel", "panel_gestion", "Información que gestiona", "¿Qué información te gustaría gestionar desde el panel?"),
        new("informes", "panel_gestion", "Informes", "¿Necesitas informes o estadísticas? ¿De qué?"),

        // Automatizar tareas
        new("tarea", "automatizacion", "Tarea a automatizar", "¿Qué tarea te gustaría automatizar y cada cuánto la haces?"),
        new("herramientasAuto", "automatizacion", "Herramientas implicadas", "¿Qué programas o herramientas usas para esa tarea?"),

        // Mejorar una web que ya existe
        new("webActual", "mejora_web", "Web actual", "¿Cuál es la dirección de tu web actual?"),
        new("problemas", "mejora_web", "Qué falla", "¿Qué no te gusta o qué falla de lo que tienes ahora?"),
        new("conservar", "mejora_web", "Qué conservar", "¿Hay algo que quieras conservar?"),

        // Comunes al final del proyecto
        new("presencia", "comun", "Web o redes actuales", "¿Tienes ya una web o redes sociales? ¿Cuáles?",
            FollowUp: "¿Cuáles? Si quieres, pon el enlace o tu nombre de usuario."),
        new("contenidos", "comun", "Logo, textos y fotos", "¿Tienes ya logo, textos y fotos, o necesitarías ayuda con ellos?",
            FollowUp: "¿Qué tienes ya y con qué necesitarías ayuda?"),
        new("integraciones", "comun", "Conexiones",
            "¿Necesitas conectarlo con algo que ya uses, como redes sociales, facturación o algún programa de gestión?",
            FollowUp: "¿Con qué te gustaría conectarlo?"),
        new("referencias", "comun", "Referencias", "¿Hay alguna web o aplicación que te guste como referencia?",
            FollowUp: "¿Cuál o cuáles? Si quieres, pon el enlace."),

        // Siempre al final, en este orden y sin IA
        new("nombre", "final", "Nombre", "¿Cómo te llamas?"),
        new("correo", "final", "Correo", $"¿A qué correo puede escribirte {Owner.FirstName} para responderte?"),
        new("telefono", "final", "Teléfono",
            "¿Quieres dejar un teléfono? Es opcional: si prefieres no darlo, escribe «no».", Optional: true),
        new("empresa", "final", "Empresa",
            "¿Y el nombre de tu empresa? También es opcional: si no tienes o prefieres no darlo, escribe «no».", Optional: true),
        new("extra", "final", "Más información",
            $"Antes de terminar, ¿quieres añadir algo más? Cuéntale a {Owner.FirstName} lo que quieras: ideas, dudas o cualquier cosa que no te haya preguntado. Si no, escribe «no».", Optional: true),
        new("valoracion", "final", "Valoración del formulario",
            $"¡Gracias por usar esta web! Tu opinión ayuda a {Owner.FirstName} a mejorarla: del 1 al 10, ¿qué nota le pondrías a este formulario?"),
    ];

    /// <summary>Tipos de proyecto que puede elegir la IA, con lo que significa cada uno.</summary>
    public static readonly (string Key, string Description)[] ProjectTypes =
    [
        ("web_informativa", "web para darse a conocer un negocio: quién es, qué ofrece y cómo contactar"),
        ("portfolio", "portfolio o web personal para mostrar su trabajo (artistas, ilustradores, fotógrafos, profesionales)"),
        ("tienda_online", "vender productos por internet"),
        ("reservas", "que sus clientes reserven citas o servicios"),
        ("panel_gestion", "aplicación interna para gestionar datos del negocio (clientes, pedidos, inventario…)"),
        ("automatizacion", "automatizar una tarea repetitiva"),
        ("mejora_web", "mejorar o rehacer una web que ya tiene"),
    ];

    /// <summary>Como mucho, estas preguntas del proyecto (sin contar las de base ni las del final).</summary>
    public const int ProjectQuestionsMax = 14;

    public static string DoneMessage =>
        $"¡Perfecto, ya lo tengo todo! Revisa el resumen de aquí abajo; puedes cambiar cualquier dato con «Editar». Si está bien, envíaselo a {Owner.FirstName}.";

    public const string InvalidEmail =
        "Ese correo no parece completo. ¿Me lo escribes de nuevo? Por ejemplo: nombre@ejemplo.com";

    public const string InvalidPhone =
        "Ese teléfono no parece correcto. Escríbelo con números, por ejemplo 600 123 456, o escribe «no» si prefieres no darlo.";

    /// <summary>Respuesta a una pregunta del visitante si la IA no está disponible.</summary>
    public static string QuestionFallback =>
        $"¡Buena pregunta! {Owner.FirstName} leerá tu formulario y te responderá a eso personalmente cuando se ponga en contacto contigo.";

    /// <summary>Lo que se añade tras responder a una pregunta del visitante, antes de repetir la pendiente.</summary>
    public const string Continue = "Mientras, sigamos:";

    public const string QuestionsKey = "preguntas";
    static string QuestionsLabel => $"Preguntas para {Owner.FirstName}";
    const int QuestionsMax = 10;

    // Datos con su propio campo en IntakeData; los demás van en Detalles
    static readonly HashSet<string> FieldKeys = ["necesita", "negocio", "nombre", "correo", "telefono", "empresa"];

    public static IEnumerable<string> DetailKeys => Steps.Select(s => s.Key).Where(k => !FieldKeys.Contains(k));

    public static IntakeStep? Step(string? key) => Steps.FirstOrDefault(s => s.Key == key);

    static bool IsProject(IntakeStep s) => s.Group is not ("base" or "final");

    public static bool IsAnswered(IntakeData d, string key) =>
        (d.Respondidas?.Contains(key) ?? false) || Get(d, key).Length > 0;

    /// <summary>La siguiente pregunta de base que falte, o null.</summary>
    public static IntakeStep? NextBase(IntakeData d) =>
        Steps.FirstOrDefault(s => s.Group == "base" && !IsAnswered(d, s.Key));

    /// <summary>
    /// La siguiente pregunta del proyecto: las de sus tipos y las comunes, en el orden de la batería.
    /// Null si ya no queda ninguna o se ha llegado al máximo.
    /// </summary>
    public static IntakeStep? NextProject(IntakeData d)
    {
        var types = d.Tipos ?? [];
        if (Steps.Count(s => IsProject(s) && IsAnswered(d, s.Key)) >= ProjectQuestionsMax)
            return null;
        return Steps.FirstOrDefault(s => (s.Group == "comun" || types.Contains(s.Group)) && !IsAnswered(d, s.Key));
    }

    /// <summary>La siguiente pregunta del final que falte, o null si ya está todo.</summary>
    public static IntakeStep? NextFinal(IntakeData d) =>
        Steps.FirstOrDefault(s => s.Group == "final" && !IsAnswered(d, s.Key));

    /// <summary>Tipos de proyecto y sus preguntas, para las instrucciones de la IA.</summary>
    public static string Battery()
    {
        var text = new StringBuilder();
        foreach (var (key, description) in ProjectTypes)
        {
            text.AppendLine($"[{key}] {description}");
            foreach (var step in Steps.Where(s => s.Group == key))
                text.AppendLine($"- {step.Key}: {step.Question}");
        }
        text.AppendLine("[comun] para todos los proyectos");
        foreach (var step in Steps.Where(s => s.Group == "comun"))
            text.AppendLine($"- {step.Key}: {step.Question}");
        return text.ToString();
    }

    /// <summary>Lo que ha contado hasta ahora, por clave, para que la IA elija la siguiente pregunta.</summary>
    public static string Answers(IntakeData d)
    {
        var text = new StringBuilder();
        foreach (var step in Steps.Where(s => s.Group != "final" && IsAnswered(d, s.Key)))
        {
            var value = Get(d, step.Key);
            text.AppendLine($"- {step.Key}: {(value.Length > 0 ? value : "(no lo ha dicho)")}");
        }
        return text.ToString();
    }

    /// <summary>Si el mensaje es una pregunta del visitante (y no una respuesta).</summary>
    public static bool IsQuestion(string text) => text.Contains('?') || text.Contains('¿') || PriceQuestion().IsMatch(text);

    /// <summary>
    /// Guarda la respuesta a una pregunta. Devuelve el mensaje para pedirla otra vez si no vale
    /// (solo el correo y el teléfono se comprueban).
    /// </summary>
    public static (IntakeData Data, string? Retry) Apply(IntakeData d, IntakeStep step, string answer, bool followUpAsked = false)
    {
        var text = answer.Trim();
        if (step.Optional && Declined().IsMatch(text))
            return (MarkAnswered(Set(d, step.Key, ""), step.Key), null);
        // Si solo dice «sí», se le pregunta cuál (una sola vez: si vuelve a decir «sí», se guarda tal cual)
        if (step.FollowUp is not null && !followUpAsked && JustYes().IsMatch(text))
            return (d, step.FollowUp);

        string value;
        switch (step.Key)
        {
            case "correo":
                // El correo puede venir dentro de una frase ("es ana@ejemplo.com")
                var email = Email().Match(text).Value.TrimEnd('.');
                if (!Validation.IsEmail(email))
                    return (d, InvalidEmail);
                value = email;
                break;
            case "telefono":
                var phone = Phone().Match(text).Value.Trim();
                if (phone.Count(char.IsDigit) < 6)
                    return (d, InvalidPhone);
                value = phone;
                break;
            case "nombre":
                value = NamePrefix().Replace(text, "").Trim(' ', '.', '!', ',');
                if (value.Length == 0) value = text;
                break;
            case "valoracion":
                // La nota se guarda siempre como «8/10»; si no da un número, se guarda lo que haya dicho
                var score = Score().Match(text);
                value = score.Success ? $"{score.Value}/10" : $"Sin nota: {text}";
                break;
            default:
                value = text;
                break;
        }
        return (MarkAnswered(Set(d, step.Key, value), step.Key), null);
    }

    /// <summary>Da por contestada una pregunta que sobra (ya lo ha contado o no aplica; lo decide la IA).</summary>
    public static IntakeData Skip(IntakeData d, string key) => MarkAnswered(d, key);

    /// <summary>Apunta una pregunta del visitante para que la persona del portfolio la vea en el resumen.</summary>
    public static IntakeData AddQuestion(IntakeData d, string question)
    {
        var list = d.Preguntas ?? [];
        return list.Count >= QuestionsMax ? d : d with { Preguntas = [.. list, Clip(question, Limits.FieldMedium)] };
    }

    /// <summary>
    /// Quita lo que no venga de la batería (por ejemplo, datos de una versión anterior del formulario) y
    /// recorta los textos, para no fiarse de lo que devuelve el navegador.
    /// </summary>
    public static IntakeData Clean(IntakeData d)
    {
        var keys = DetailKeys.ToHashSet();
        return new IntakeData(
            Nombre: Clip(d.Nombre, 100), Empresa: Clip(d.Empresa, Limits.FieldShort), Correo: Clip(d.Correo, Limits.FieldShort),
            Telefono: Clip(d.Telefono, 30), Negocio: Clip(d.Negocio, Limits.FieldMedium), Necesita: Clip(d.Necesita, Limits.FieldMedium),
            Comentarios: Clip(d.Comentarios, Limits.CommentsMax),
            Detalles: (d.Detalles ?? []).Where(kv => keys.Contains(kv.Key) && !string.IsNullOrWhiteSpace(kv.Value))
                .ToDictionary(kv => kv.Key, kv => Clip(kv.Value, Limits.FieldMedium)),
            Respondidas: (d.Respondidas ?? []).Where(k => Step(k) is not null).Distinct().ToList(),
            Preguntas: (d.Preguntas ?? []).Where(q => !string.IsNullOrWhiteSpace(q)).Take(QuestionsMax)
                .Select(q => Clip(q, Limits.FieldMedium)).ToList(),
            Pendiente: Step(d.Pendiente)?.Key,
            Tipos: d.Tipos?.Where(t => ProjectTypes.Any(p => p.Key == t)).Distinct().Take(3).ToList());
    }

    /// <summary>Datos respondidos, en el orden de la batería y con su etiqueta, para el resumen y para Telegram.</summary>
    public static List<SummaryItem> Summary(IntakeData d)
    {
        var items = Steps
            .Select(s => new SummaryItem(s.Label, Get(d, s.Key), s.Key))
            .Where(item => item.Value!.Length > 0)
            .ToList();
        if (d.Preguntas is { Count: > 0 } questions)
            // Recortado al tamaño de un dato del envío; la conversación completa también se envía
            items.Add(new SummaryItem(QuestionsLabel, Clip(string.Join(" · ", questions), Limits.FieldMedium), QuestionsKey));
        return items;
    }

    static string Get(IntakeData d, string key) => (key switch
    {
        "necesita" => d.Necesita,
        "negocio" => d.Negocio,
        "nombre" => d.Nombre,
        "correo" => d.Correo,
        "telefono" => d.Telefono,
        "empresa" => d.Empresa,
        _ => d.Detalles?.GetValueOrDefault(key)
    })?.Trim() ?? "";

    static IntakeData Set(IntakeData d, string key, string value) => key switch
    {
        "necesita" => d with { Necesita = Clip(value, Limits.FieldMedium) },
        "negocio" => d with { Negocio = Clip(value, Limits.FieldMedium) },
        "nombre" => d with { Nombre = Clip(value, 100) },
        "correo" => d with { Correo = Clip(value, Limits.FieldShort) },
        "telefono" => d with { Telefono = Clip(value, 30) },
        "empresa" => d with { Empresa = Clip(value, Limits.FieldShort) },
        _ => d with { Detalles = new Dictionary<string, string>(d.Detalles ?? []) { [key] = Clip(value, Limits.FieldMedium) } }
    };

    static IntakeData MarkAnswered(IntakeData d, string key) =>
        d with { Respondidas = [.. (d.Respondidas ?? []).Append(key).Distinct()] };

    static string Clip(string? text, int max)
    {
        var value = text?.Trim() ?? "";
        return value.Length > max ? value[..max] : value;
    }

    // «no», «no, gracias», «nada», «no tengo empresa», «prefiero no darlo»…
    [GeneratedRegex(@"^\s*(no|nop|nope|nada|nada más|ninguno|ninguna|paso|eso es todo|no,? gracias|no tengo(\s+\w+)?|prefiero no(\s+\w+)?)\s*[.!]*\s*$", RegexOptions.IgnoreCase)]
    private static partial Regex Declined();

    [GeneratedRegex(@"^\s*(s[ií]|sip|claro|vale|ok|yes|por supuesto)\s*[.!,]*\s*$", RegexOptions.IgnoreCase)]
    private static partial Regex JustYes();

    [GeneratedRegex(@"[^\s@<>()""',;:]+@[^\s@<>()""',;:]+")]
    private static partial Regex Email();

    [GeneratedRegex(@"\+?\d[\d\s().-]{4,}\d")]
    private static partial Regex Phone();

    [GeneratedRegex(@"^\s*(hola,?\s*)?(me llamo|soy|mi nombre es)\s+", RegexOptions.IgnoreCase)]
    private static partial Regex NamePrefix();

    [GeneratedRegex(@"\b(10|[1-9])\b")]
    private static partial Regex Score();

    // «cuánto cuesta…», «cuánto me costaría…» aunque no lleve interrogación
    [GeneratedRegex(@"^\s*cu[aá]nto\s+(me\s+)?(cuesta|vale|cobras?|costar[ií]a|saldr[ií]a)\b", RegexOptions.IgnoreCase)]
    private static partial Regex PriceQuestion();
}
