import { Component, inject, input } from '@angular/core';
import { Location } from '@angular/common';
import { Router } from '@angular/router';
import { CloseButton } from '../close-button/close-button';

// Página de texto (privacidad, aviso legal…): título y contenido en una tarjeta con el estilo de la web,
// con una ✕ para cerrarla (también con Escape).
@Component({
  selector: 'app-text-page',
  imports: [CloseButton],
  host: { '(document:keydown.escape)': 'close()' },
  template: `
    <section class="text-page container">
      <article class="text-card">
        <header class="text-header">
          <h1>{{ title() }}</h1>
          <app-close-button label="Cerrar y volver" (closed)="close()" />
        </header>
        @if (updated()) {
          <p class="text-updated">Última actualización: {{ updated() }}</p>
        }
        <ng-content />
      </article>
    </section>
  `,
  styleUrl: './text-page.css'
})
export class TextPage {
  readonly title = input.required<string>();
  readonly updated = input('');

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
