// ─────────────────────────────────────────────────────────────────────────────────────────────────────────
// TUS DATOS: cambia este archivo para personalizar la web.
// Todo lo que aparece con tu nombre, tu correo o tus redes sale de aquí.
// (La información que usa la IA del chat está en api/perfil.md y api/appsettings.json → "Perfil".)
// ─────────────────────────────────────────────────────────────────────────────────────────────────────────

export const PROFILE = {
  /** Nombre completo: título de la pestaña, "Sobre mí", pie, aviso legal y privacidad */
  fullName: 'Alex Ejemplo',
  /** Cómo te llaman: "Hola, soy …" y los textos del chat */
  firstName: 'Alex',
  /** Lo que eres, en minúscula: aparece bajo el saludo ("desarrolladora full-stack", "diseñador UX"…) */
  role: 'desarrollador full-stack',
  /** Ciudad y país, para el aviso legal */
  location: 'Tu ciudad (País)',
  email: 'tu-correo@ejemplo.com',
  /** Tu usuario de GitHub y de LinkedIn (solo el usuario, sin la dirección completa) */
  github: 'tu-usuario',
  linkedin: 'tu-usuario',
  /** "Sobre mí": un párrafo por elemento. El primero va después de "Hola, me llamo {fullName}" */
  about: [
    'y soy desarrollador web full-stack: disfruto trabajando en los dos lados de una aplicación. En el ' +
      'front-end construyo interfaces con Angular y TypeScript, siempre pensando en la accesibilidad, y en el ' +
      'back-end diseño APIs con .NET y bases de datos relacionales.',
    'Me apasiona aprender y participar en proyectos desde la idea hasta su puesta en marcha.'
  ],
  /** Fecha que se muestra en "Última actualización" de privacidad y aviso legal */
  legalUpdated: '1 de enero de 2026'
};

export const GITHUB_URL = `https://github.com/${PROFILE.github}`;
export const LINKEDIN_URL = `https://www.linkedin.com/in/${PROFILE.linkedin}/`;
