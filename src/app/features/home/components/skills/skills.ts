import { Component } from '@angular/core';
import { SKILL_GROUPS, groupLogos } from '../../../../core/data/skills.data';

const PREVIEW_LOGOS = 5;

@Component({
  selector: 'app-skills',
  templateUrl: './skills.html'
})
export class Skills {
  readonly groups = SKILL_GROUPS.map(group => {
    const logos = groupLogos(group);
    return {
      ...group,
      preview: logos.slice(0, PREVIEW_LOGOS),
      morePreview: Math.max(logos.length - PREVIEW_LOGOS, 0)
    };
  });
}
