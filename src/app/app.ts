import { Component, DestroyRef, inject } from '@angular/core';
import { NavigationCancel, NavigationEnd, NavigationError, NavigationStart, Router, RouterOutlet, Scroll } from '@angular/router';
import { SeoService } from './core/services/seo.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  template: '<router-outlet />'
})
export class App {
  constructor() {
    // Al cambiar de página (p. ej. a Privacidad), la nueva aparece directamente arriba, sin recorrer la
    // página con el desplazamiento suave (que sí se mantiene para los enlaces del menú dentro del inicio).
    const root = document.documentElement;
    const restore = () => setTimeout(() => root.style.removeProperty('scroll-behavior'));
    const router = inject(Router);
    const seo = inject(SeoService);
    const events = router.events.subscribe(event => {
      if (event instanceof NavigationEnd) {
        // Descripción, dirección canónica y redes sociales de la página nueva
        seo.update(router.routerState.snapshot.root, event.urlAfterRedirects);
      }
      if (event instanceof NavigationStart) {
        root.style.scrollBehavior = 'auto';
      } else if (event instanceof Scroll || event instanceof NavigationCancel || event instanceof NavigationError) {
        restore();
      }
    });
    inject(DestroyRef).onDestroy(() => events.unsubscribe());
  }
}
