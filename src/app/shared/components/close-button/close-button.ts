import { Component, input, output } from '@angular/core';
import { Icon } from '../icon/icon';

// Botón ✕ para cerrar (ventanas y páginas): el mismo en toda la web.
@Component({
  selector: 'app-close-button',
  imports: [Icon],
  template: `
    <button type="button" class="close-button" [attr.aria-label]="label()" (click)="closed.emit()">
      <app-icon name="x-lg" />
    </button>
  `,
  styles: `
    :host {
      display: flex;
      flex: none;
    }

    /* El fondo sale del color del texto que lo rodea (oscuro en modo claro, claro en modo oscuro), así se
       adapta solo al tema; el foco usa el color de acento de cada modo (--accent-text, en styles.css). */
    .close-button {
      display: flex;
      width: 2.25rem;
      height: 2.25rem;
      padding: 0.55rem;
      border: none;
      border-radius: 50%;
      background: color-mix(in srgb, currentColor 10%, transparent);
      color: inherit;
      cursor: pointer;
    }

    .close-button:hover {
      background: color-mix(in srgb, currentColor 18%, transparent);
    }

    .close-button:focus-visible {
      outline: 2px solid var(--accent-text);
      outline-offset: 2px;
    }
  `
})
export class CloseButton {
  readonly label = input('Cerrar');
  readonly closed = output();
}
