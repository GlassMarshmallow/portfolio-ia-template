import { PROFILE } from './profile.data';

// Datos de la web para buscadores y redes sociales.
// Cambia el dominio por el tuyo aquí y también en src/index.html, public/robots.txt y public/sitemap.xml
// (busca «tu-dominio.com» y sustitúyelo en los cuatro sitios).
export const SITE_URL = 'https://tu-dominio.com';

export const SITE_NAME = PROFILE.fullName;

/** Descripción de la página de inicio en Google y al compartir el enlace (unos 150 caracteres) */
export const DEFAULT_DESCRIPTION =
  `Soy ${PROFILE.fullName}, ${PROFILE.role}. Pregunta a mi asistente con IA por mi trabajo o cuéntame tu proyecto.`;
