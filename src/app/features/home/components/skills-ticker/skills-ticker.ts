import { Component, computed, input } from '@angular/core';
import { LOGO_TITLES, SKILL_LOGOS } from '../../../../core/data/skills.data';

// Franja de logos de GlassMarshmallow (gm-ticker) con las tecnologías desplazándose en bucle.
// La lista se pinta dos veces seguidas para que, al desplazarla la mitad, el bucle no tenga corte.
// Se para con el botón «Pausar animación» del inicio, al pasar el ratón y si se pide menos movimiento.
@Component({
  selector: 'app-skills-ticker',
  templateUrl: './skills-ticker.html'
})
export class SkillsTicker {
  readonly moving = input(true);
  /** Pausada con el botón «Pausar animación» del inicio */
  readonly paused = input(false);
  protected readonly logos = SKILL_LOGOS;
  protected readonly titles = LOGO_TITLES;
  protected readonly copies = computed(() => (this.moving() ? [0, 1] : [0]));
}
