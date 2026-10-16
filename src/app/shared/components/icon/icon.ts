import { Component, computed, input } from '@angular/core';
import { BOOTSTRAP_ICONS, type BootstrapIconName, type IconPath } from '../../icons/bootstrap-icons';

// Pinta un icono de Bootstrap Icons por su nombre: <app-icon name="github" />.
// Es decorativo (aria-hidden): el texto accesible lo pone el botón o enlace que lo contiene.
// El tamaño se controla con CSS sobre el svg o sobre <app-icon>.
@Component({
  selector: 'app-icon',
  template: `
    <svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true" focusable="false">
      @for (path of paths(); track $index) {
        <path [attr.d]="path.d" [attr.fill-rule]="path.evenodd ? 'evenodd' : null" />
      }
    </svg>
  `,
  styles: `
    :host {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      line-height: 0;
    }

    svg {
      width: 100%;
      height: 100%;
    }
  `
})
export class Icon {
  readonly name = input.required<BootstrapIconName>();
  protected readonly paths = computed<IconPath[]>(() => BOOTSTRAP_ICONS[this.name()]);
}
