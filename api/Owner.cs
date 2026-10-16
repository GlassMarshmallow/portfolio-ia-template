/// <summary>
/// Datos de la persona dueña del portfolio (appsettings.json → "Perfil"). Se usan en las instrucciones de la
/// IA y en los mensajes al visitante. La información que la IA cuenta sobre ti está en el archivo de perfil
/// (por defecto, perfil.md).
/// </summary>
static class Owner
{
    public static string FullName { get; private set; } = "Alex Ejemplo";
    public static string FirstName { get; private set; } = "Alex";
    public static string Email { get; private set; } = "tu-correo@ejemplo.com";
    /// <summary>Sin https:// ni www (así lo escribe la IA): linkedin.com/in/tu-usuario</summary>
    public static string LinkedIn { get; private set; } = "linkedin.com/in/tu-usuario";
    public static string GitHub { get; private set; } = "github.com/tu-usuario";
    public static string ProfileFile { get; private set; } = "perfil.md";

    public static void Load(IConfiguration config)
    {
        var section = config.GetSection("Perfil");
        FullName = section["NombreCompleto"] ?? FullName;
        FirstName = section["Nombre"] ?? FirstName;
        Email = section["Correo"] ?? Email;
        LinkedIn = section["LinkedIn"] is { Length: > 0 } user ? $"linkedin.com/in/{user}" : LinkedIn;
        GitHub = section["GitHub"] is { Length: > 0 } gh ? $"github.com/{gh}" : GitHub;
        ProfileFile = section["Archivo"] ?? ProfileFile;
    }

    /// <summary>Sustituye {persona} por el nombre (los textos fijos del guion se escriben así).</summary>
    public static string Fill(string text) => text.Replace("{persona}", FirstName);
}
