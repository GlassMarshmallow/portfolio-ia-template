// Tecnologías de Habilidades y de la franja del inicio (datos en core/data/skills.data.ts)
import type { SimpleIcon } from 'simple-icons';
import type { BootstrapIconName } from '../../shared/icons/bootstrap-icons';

export interface Skill {
  name: string;
  icons: SimpleIcon[];
}

export interface SkillGroup {
  id: string;
  title: string;
  /** Icono de la categoría (nombre de Bootstrap Icons) */
  icon: BootstrapIconName;
  items: Skill[];
}
