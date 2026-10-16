import { Component } from '@angular/core';
import type { SimpleIcon } from 'simple-icons';
import { FitIcon } from '../../../../shared/directives/fit-icon.directive';
import { Icon } from '../../../../shared/components/icon/icon';
import { DATABASE, OUTLINE_ICONS, SKILL_GROUPS } from '../../../../core/data/skills.data';
import type { SkillGroup } from '../../../../core/models/skill.models';

const PREVIEW_LOGOS = 5;

// Logos de un grupo sin repetir (sin el icono genérico de base de datos), para la vista previa cerrada
const groupLogos = (group: SkillGroup): SimpleIcon[] => [
  ...new Map(
    group.items
      .flatMap(item => item.icons)
      .filter(icon => icon.slug !== DATABASE.slug)
      .map(icon => [icon.slug, icon] as const)
  ).values()
];

@Component({
  selector: 'app-skills',
  imports: [FitIcon, Icon],
  templateUrl: './skills.html',
  styleUrl: './skills.css'
})
export class Skills {
  protected readonly outlineIcons = OUTLINE_ICONS;

  readonly groups = SKILL_GROUPS.map(group => {
    const logos = groupLogos(group);
    return {
      ...group,
      preview: logos.slice(0, PREVIEW_LOGOS),
      morePreview: Math.max(logos.length - PREVIEW_LOGOS, 0)
    };
  });
}
