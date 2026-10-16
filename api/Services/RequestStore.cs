using System.Text.Json;

/// <summary>
/// Guarda cada solicitud en un archivo JSON, para no perder ninguna aunque falle Telegram.
/// En Docker la carpeta es un volumen (/data/solicitudes). Las de más de Solicitudes:DiasConservacion días
/// (365 por defecto, como dice la política de privacidad) se borran solas.
/// </summary>
class RequestStore(IConfiguration config, IHostEnvironment env)
{
    public int RetentionDays { get; } = config.GetValue("Solicitudes:DiasConservacion", 365);

    private static readonly JsonSerializerOptions Json = new() { WriteIndented = true };
    private readonly string folder = Path.Combine(env.ContentRootPath, config["Solicitudes:Carpeta"] ?? "solicitudes");

    public async Task SaveAsync(ContactRequest request, CancellationToken ct)
    {
        Directory.CreateDirectory(folder);
        var name = $"{DateTime.UtcNow:yyyyMMdd-HHmmss}-{Guid.NewGuid():N}.json";
        var record = new { recibida = DateTime.UtcNow, solicitud = request with { Web = null } };
        await File.WriteAllTextAsync(Path.Combine(folder, name), JsonSerializer.Serialize(record, Json), ct);
    }

    /// <summary>Borra las solicitudes guardadas hace más de RetentionDays días. Devuelve cuántas.</summary>
    public int DeleteExpired()
    {
        if (!Directory.Exists(folder))
            return 0;
        var limit = DateTime.UtcNow.AddDays(-RetentionDays);
        var deleted = 0;
        foreach (var file in Directory.EnumerateFiles(folder, "*.json"))
        {
            if (File.GetCreationTimeUtc(file) < limit && File.GetLastWriteTimeUtc(file) < limit)
            {
                File.Delete(file);
                deleted++;
            }
        }
        return deleted;
    }
}

/// <summary>Una vez al arrancar y después cada día, borra las solicitudes caducadas.</summary>
class RequestCleanup(RequestStore store, ILogger<RequestCleanup> logger) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        using var timer = new PeriodicTimer(TimeSpan.FromDays(1));
        do
        {
            try
            {
                var deleted = store.DeleteExpired();
                if (deleted > 0)
                    logger.LogInformation("Borradas {Count} solicitudes de más de {Days} días", deleted, store.RetentionDays);
            }
            catch (Exception ex) when (ex is IOException or UnauthorizedAccessException)
            {
                logger.LogError(ex, "No se pudieron borrar las solicitudes caducadas");
            }
        }
        while (await timer.WaitForNextTickAsync(stoppingToken));
    }
}
