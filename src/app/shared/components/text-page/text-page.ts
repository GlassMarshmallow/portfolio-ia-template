import { Component, inject, input } from '@angular/core';
import { Location } from '@angular/common';
import { Router } from '@angular/router';
import { CloseButton } from '../close-button/close-button';
import { SceneService } from '../../../core/services/scene.service';
import { HAS_SCENE } from '../../utils/scene-animation';

// Página de texto (privacidad, aviso legal…): título y contenido en una tarjeta con el estilo de la web,
// con una ✕ para cerrarla (también con Escape). Detrás se ve el fondo de la web; si hay dibujo animado, con su
// botón de pausa.
@Component({
  selector: 'app-text-page',
  imports: [CloseButton],
  host: { '(document:keydown.escape)': 'close()' },
  template: `
    <section class="text-page gm-container">
      <article class="gm-prose gm-prose--card">
        <header class="text-header">
          <h1>{{ title() }}</h1>
          <app-close-button label="Cerrar y volver" (closed)="close()" />
        </header>
        @if (updated()) {
          <p class="gm-prose__updated">Última actualización: {{ updated() }}</p>
        }
        <ng-content />
      </article>
    </section>
    <!-- Pausa / reanuda el dibujo animado de fondo (WCAG 2.2.2); el estado es el mismo que en el inicio -->
    @if (hasScene) {
      <button type="button" class="gm-btn gm-btn--secondary gm-btn--sm pause-btn" (click)="paused.set(!paused())" [attr.aria-pressed]="paused()">
        {{ paused() ? 'Reanudar animación' : 'Pausar animación' }}
      </button>
    }
  `,
  styleUrl: './text-page.css'
})
export class TextPage {
  readonly title = input.required<string>();
  readonly updated = input('');
  protected readonly paused = inject(SceneService).paused;
  /** Sin ilustración animada no se mueve nada: no hace falta el botón de pausa */
  protected readonly hasScene = HAS_SCENE;

  private readonly router = inject(Router);
  private readonly location = inject(Location);

  // Vuelve a donde estaba la persona; si entró directamente con el enlace, al inicio
  close() {
    if (document.querySelector('dialog[open]')) {
      return; // Escape cierra antes la ventana que esté abierta encima
    }
    if (this.router.lastSuccessfulNavigation()?.previousNavigation) {
      this.location.back();
    } else {
      this.router.navigateByUrl('/');
    }
  }
}
