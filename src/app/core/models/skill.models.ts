// Tecnologías de Habilidades y de la franja del inicio (datos en core/data/skills.data.ts)
export interface Skill {
  name: string;
  /** Logos: nombres de iconos de GlassMarshmallow (sin «gmi-»), normalmente de la categoría Brand */
  icons: string[];
}

export interface SkillGroup {
  id: string;
  title: string;
  /** Icono de la categoría (nombre de un icono de GlassMarshmallow, sin «gmi-») */
  icon: string;
  items: Skill[];
}
