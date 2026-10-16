// Los textos usan {persona}, que se sustituye por el nombre (Owner.Fill).
// Guion del formulario inteligente ("Quiero un proyecto"), como una toma de requisitos de consultora:
// primero lo común, después lo propio de cada tipo de proyecto y al final los datos de contacto.
// El servidor decide qué tema toca (los modelos pequeños se olvidan y repiten); la IA solo formula la
// pregunta con naturalidad, detecta el tipo de proyecto y marca lo que no aplica.

/// <summary>Un tema del guion. Key es el nombre del dato; Types, los tipos de proyecto que lo necesitan (null = todos).</summary>
record IntakeTopic(string Key, string Label, string Hint, string Question, string[]? Types = null);

static class IntakePlan
{
    // Tipos de proyecto que la IA puede detectar (uno o varios)
    public static readonly string[] ProjectTypes =
        ["web_informativa", "tienda_online", "reservas", "panel_gestion", "automatizacion", "mejora_web", "otro"];

    // Temas con su propio campo en IntakeData (lo básico que también tenía el formulario de contacto)
    public static readonly IntakeTopic[] CoreTopics =
    [
        new("negocio", "Negocio", "a qué se dedica su negocio o proyecto",
            "¿A qué se dedica tu negocio o proyecto?"),
        new("necesita", "Necesita", "qué necesita que haga {persona} (una web, una tienda online, un sistema de reservas…)",
            "¿Qué te gustaría que {persona} hiciera por ti? Por ejemplo, una web, una tienda online o un sistema de reservas."),
    ];

    // Temas que se guardan en "detalles", en el orden en que se preguntan
    public static readonly IntakeTopic[] DetailTopics =
    [
        new("publico", "Clientes", "quiénes son sus clientes o a quién va dirigido",
            "¿Quiénes son tus clientes o a quién va dirigido?"),
        new("gestionActual", "Ahora lo gestiona con", "cómo lo gestiona ahora mismo",
            "¿Y cómo lo gestionas ahora mismo?"),
        new("objetivos", "Objetivo", "qué quiere conseguir con el proyecto",
            "¿Qué te gustaría conseguir con ello?"),

        // Tienda online
        new("catalogo", "Productos", "qué vende y cuántos productos tiene aproximadamente",
            "¿Qué vendes y cuántos productos tienes, más o menos?", ["tienda_online"]),
        new("pagos", "Cobros", "cómo quiere cobrar (tarjeta, Bizum, transferencia…)",
            "¿Cómo te gustaría cobrar: tarjeta, Bizum, transferencia…?", ["tienda_online"]),
        new("envios", "Envíos", "si hace envíos o recogida en tienda, y a qué zonas",
            "¿Haces envíos o recogida en tienda? ¿A qué zonas?", ["tienda_online"]),
        new("stock", "Stock", "cómo controla ahora el stock o inventario",
            "¿Cómo controlas ahora el stock?", ["tienda_online"]),

        // Reservas o citas
        new("servicios", "Servicios reservables", "qué servicios o citas se podrán reservar y cuánto duran",
            "¿Qué servicios se podrán reservar y cuánto dura cada uno, más o menos?", ["reservas"]),
        new("profesionales", "Profesionales", "cuántas personas atienden y si cada una tiene su propia agenda",
            "¿Cuántas personas atendéis? ¿Cada una tiene su propia agenda?", ["reservas"]),
        new("horarios", "Horarios", "qué días y horarios ofrece",
            "¿Qué días y horarios ofreces?", ["reservas"]),
        new("pagoReserva", "Pago al reservar", "si quiere cobrar o pedir una señal al reservar",
            "¿Quieres cobrar o pedir una señal al reservar, o se paga en el momento?", ["reservas"]),
        new("recordatorios", "Recordatorios", "si quiere avisos o recordatorios automáticos para sus clientes",
            "¿Te gustaría que tus clientes recibieran recordatorios automáticos de la cita?", ["reservas"]),

        // Web informativa
        new("secciones", "Secciones", "qué secciones o páginas necesita",
            "¿Qué secciones o páginas te gustaría que tuviera?", ["web_informativa"]),
        new("blog", "Blog o noticias", "si quiere publicar noticias o un blog",
            "¿Te gustaría publicar noticias o tener un blog?", ["web_informativa"]),
        new("idiomas", "Idiomas", "en qué idiomas debe estar",
            "¿En qué idiomas tendría que estar?", ["web_informativa", "tienda_online"]),

        // Panel de gestión
        new("usuarios", "Usuarios del panel", "quién lo va a usar y si habrá distintos permisos",
            "¿Quién lo va a usar? ¿Habría personas con distintos permisos?", ["panel_gestion"]),
        new("datosPanel", "Información que gestiona", "qué información o datos se gestionarán",
            "¿Qué información te gustaría gestionar desde el panel?", ["panel_gestion"]),
        new("informes", "Informes", "qué informes o estadísticas necesita",
            "¿Necesitas informes o estadísticas? ¿De qué?", ["panel_gestion"]),

        // Automatizar tareas
        new("tarea", "Tarea a automatizar", "qué tarea quiere automatizar y cada cuánto la hace",
            "¿Qué tarea te gustaría automatizar y cada cuánto la haces?", ["automatizacion"]),
        new("herramientasAuto", "Herramientas implicadas", "qué programas o herramientas intervienen en esa tarea",
            "¿Qué programas o herramientas usas para esa tarea?", ["automatizacion"]),

        // Mejorar una web existente
        new("webActual", "Web actual", "la dirección de su web actual",
            "¿Cuál es la dirección de tu web actual?", ["mejora_web"]),
        new("problemas", "Qué falla", "qué no le gusta o qué falla de lo que tiene",
            "¿Qué no te gusta o qué falla de lo que tienes ahora?", ["mejora_web"]),
        new("conservar", "Qué conservar", "qué quiere conservar de lo que ya tiene",
            "¿Hay algo que quieras conservar?", ["mejora_web"]),

        // Común a todos, al final del proyecto
        new("marca", "Marca", "si tiene logo e imagen de marca",
            "¿Tienes ya logo e imagen de marca?"),
        new("contenidos", "Textos y fotos", "si ya tiene los textos y las fotos o necesita ayuda con ellos",
            "¿Tienes ya los textos y las fotos, o necesitarías ayuda con ellos?"),
        new("integraciones", "Conexiones", "si necesita conectarlo con algo que ya usa (redes sociales, facturación, ERP…)",
            "¿Necesitas conectarlo con algo que ya uses, como redes sociales, facturación o algún programa de gestión?"),
        new("referencias", "Referencias", "alguna web o aplicación que le guste como referencia",
            "¿Hay alguna web o aplicación que te guste como referencia?"),
        new("extra", "Más información", "si hay algo más que quiera contar",
            "¿Hay algo más que quieras contarle a {persona} sobre el proyecto?"),
    ];

    static readonly IntakeTopic Name = new("nombre", "Nombre", "su nombre", "¿Cómo te llamas?");
    static readonly IntakeTopic Email = new("correo", "Correo", "su correo electrónico",
        "¿A qué correo puede escribirte {persona} para responderte?");

    // Pregunta final por los datos opcionales (se hace una sola vez, y siempre igual)
    public const string OptionalQuestion =
        "¡Gracias! Ya casi está. Si quieres, deja también un teléfono y el nombre de tu empresa; las dos cosas son opcionales, así que si prefieres no darlas, escribe «no».";

    public const string DoneMessage =
        "¡Perfecto, ya lo tengo todo! Revisa el resumen de aquí abajo y, si está bien, envíaselo a {persona}.";

    public static IEnumerable<string> DetailKeys => DetailTopics.Select(t => t.Key);

    /// <summary>Temas que faltan, en orden: los del proyecto (según su tipo) y después nombre y correo.</summary>
    public static List<IntakeTopic> Missing(IntakeData d)
    {
        var types = d.Tipos ?? [];
        var details = d.Detalles ?? [];
        var skip = new HashSet<string>(d.NoAplica ?? []);
        var missing = new List<IntakeTopic>();

        if (string.IsNullOrWhiteSpace(d.Negocio)) missing.Add(CoreTopics[0]);
        if (string.IsNullOrWhiteSpace(d.Necesita)) missing.Add(CoreTopics[1]);

        // Hasta saber qué necesita no se sabe qué temas propios del tipo de proyecto tocan
        if (!string.IsNullOrWhiteSpace(d.Necesita))
        {
            missing.AddRange(DetailTopics.Where(t =>
                (t.Types is null || t.Types.Any(types.Contains))
                && !skip.Contains(t.Key)
                && string.IsNullOrWhiteSpace(details.GetValueOrDefault(t.Key))));
        }

        if (string.IsNullOrWhiteSpace(d.Nombre)) missing.Add(Name);
        if (!Validation.IsEmail(d.Correo)) missing.Add(Email);
        return missing;
    }

    /// <summary>Detalles respondidos, con su etiqueta, para el resumen y para Telegram.</summary>
    public static List<SummaryItem> Summary(IntakeData d) =>
        DetailTopics
            .Select(t => new SummaryItem(t.Label, d.Detalles?.GetValueOrDefault(t.Key)?.Trim() ?? ""))
            .Where(item => !string.IsNullOrEmpty(item.Value))
            .ToList();
}
