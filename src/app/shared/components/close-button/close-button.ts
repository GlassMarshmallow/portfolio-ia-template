import { Component, input, output } from '@angular/core';

// Botón ✕ para cerrar (ventanas y páginas): el botón redondo de GlassMarshmallow, el mismo en toda la web.
@Component({
  selector: 'app-close-button',
  template: `
    <button type="button" class="gm-icon-btn" [attr.aria-label]="label()" (click)="closed.emit()">
      <i class="gmi gmi-x-lg" aria-hidden="true"></i>
    </button>
  `,
  styles: `
    :host {
      display: flex;
      flex: none;
    }
  `
})
export class CloseButton {
  readonly label = input('Cerrar');
  readonly closed = output();
}
