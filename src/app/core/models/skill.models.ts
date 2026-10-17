// Tecnologías de Habilidades y de la franja del inicio (datos en core/data/skills.data.ts)
import type { SimpleIcon } from 'simple-icons';

export interface Skill {
  name: string;
  icons: SimpleIcon[];
}

export interface SkillGroup {
  id: string;
  title: string;
  /** Icono de la categoría (nombre de un icono de GlassMarshmallow, sin «gmi-») */
  icon: string;
  items: Skill[];
}
