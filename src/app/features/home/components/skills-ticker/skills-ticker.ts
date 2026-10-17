import { Component, computed, inject, input } from '@angular/core';
import { SceneService } from '../../../../core/services/scene.service';
import { LOGO_TITLES, SKILL_LOGOS } from '../../../../core/data/skills.data';

// Franja de logos de GlassMarshmallow (gm-ticker) con las tecnologías desplazándose en bucle.
// La lista se pinta dos veces seguidas para que, al desplazarla la mitad, el bucle no tenga corte.
// Se para con su botón de pausa (que para también el dibujo del fondo), al pasar el ratón y si se pide menos
// movimiento.
@Component({
  selector: 'app-skills-ticker',
  templateUrl: './skills-ticker.html'
})
export class SkillsTicker {
  readonly moving = input(true);
  /** Pausada con su botón (el mismo estado que el dibujo del fondo) */
  protected readonly paused = inject(SceneService).paused;
  protected readonly logos = SKILL_LOGOS;
  protected readonly titles = LOGO_TITLES;
  protected readonly copies = computed(() => (this.moving() ? [0, 1] : [0]));
}
