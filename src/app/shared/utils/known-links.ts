import { GITHUB_URL, LINKEDIN_URL, PROFILE } from '../../core/data/profile.data';

// Convierte en enlaces SOLO tus direcciones conocidas (LinkedIn, GitHub y correo, de profile.data.ts) dentro
// de un texto, p. ej. una respuesta de la IA. Cualquier otra dirección se queda como texto: así la IA no
// puede colar enlaces a otros sitios.

export interface TextPart {
  text: string;
  href?: string;
  /** Nombre accesible del enlace */
  label?: string;
  /** Se abre en una pestaña nueva */
  external?: boolean;
}

const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const KNOWN_LINKS = [
  {
    pattern: new RegExp(`(?:https?:\\/\\/)?(?:www\\.)?linkedin\\.com\\/in\\/${escape(PROFILE.linkedin)}\\/?`, 'i'),
    href: LINKEDIN_URL,
    label: `Perfil de LinkedIn de ${PROFILE.firstName} (se abre en una pestaña nueva)`,
    external: true
  },
  {
    pattern: new RegExp(`(?:https?:\\/\\/)?(?:www\\.)?github\\.com\\/${escape(PROFILE.github)}\\/?`, 'i'),
    href: GITHUB_URL,
    label: `GitHub de ${PROFILE.firstName} (se abre en una pestaña nueva)`,
    external: true
  },
  {
    pattern: new RegExp(escape(PROFILE.email), 'i'),
    href: `mailto:${PROFILE.email}`,
    label: `Escribir a ${PROFILE.firstName} a ${PROFILE.email}`,
    external: false
  }
];

const ANY_KNOWN = new RegExp(KNOWN_LINKS.map(link => link.pattern.source).join('|'), 'gi');

export function linkifyKnown(text: string): TextPart[] {
  const parts: TextPart[] = [];
  let last = 0;
  for (const match of text.matchAll(ANY_KNOWN)) {
    const link = KNOWN_LINKS.find(known => known.pattern.test(match[0]))!;
    if (match.index > last) {
      parts.push({ text: text.slice(last, match.index) });
    }
    parts.push({ text: match[0], href: link.href, label: link.label, external: link.external });
    last = match.index + match[0].length;
  }
  if (last < text.length) {
    parts.push({ text: text.slice(last) });
  }
  return parts;
}
