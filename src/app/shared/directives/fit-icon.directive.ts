import { Directive, ElementRef, afterNextRender, inject } from '@angular/core';

// Cada logo trae márgenes distintos dentro de su cuadro (los que son una palabra, como .NET o PHP,
// quedan muy pequeños). Ajusta el viewBox del <svg> a su contenido real para que todos llenen el hueco.
@Directive({ selector: 'svg[appFitIcon]' })
export class FitIcon {
  constructor() {
    const svg = inject<ElementRef<SVGSVGElement>>(ElementRef).nativeElement;

    const fit = () => {
      const box = svg.getBBox();
      if (box.width === 0 || box.height === 0) {
        return false;
      }
      svg.setAttribute('viewBox', `${box.x} ${box.y} ${box.width} ${box.height}`);
      return true;
    };

    afterNextRender(() => {
      // Dentro de un acordeón cerrado el logo no se dibuja y mide 0: se ajusta al abrirlo.
      const details = svg.closest('details');
      if (!fit() && details) {
        const onToggle = () => fit() && details.removeEventListener('toggle', onToggle);
        details.addEventListener('toggle', onToggle);
      }
    });
  }
}
