import { Component, computed, input } from '@angular/core';
import { FitIcon } from '../../../../shared/directives/fit-icon.directive';
import { OUTLINE_ICONS, SKILL_LOGOS, WORDMARK_ICONS } from '../../../../core/data/skills.data';

// Franja tipo cinta de noticias con los logos de las tecnologías desplazándose en bucle.
// La lista se pinta dos veces seguidas para que, al desplazarla la mitad, el bucle no tenga corte.
// Con moving = false (inicio sin ilustración animada) se queda quieta: así no hace falta botón de pausa.
@Component({
  selector: 'app-skills-ticker',
  imports: [FitIcon],
  templateUrl: './skills-ticker.html',
  styleUrl: './skills-ticker.css',
  host: { '[class.static]': '!moving()' }
})
export class SkillsTicker {
  readonly moving = input(true);
  protected readonly logos = SKILL_LOGOS;
  protected readonly outlineIcons = OUTLINE_ICONS;
  protected readonly wordmarkIcons = WORDMARK_ICONS;
  protected readonly copies = computed(() => (this.moving() ? [0, 1] : [0]));
}
