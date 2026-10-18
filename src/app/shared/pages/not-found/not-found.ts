import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TextPage } from '../../components/text-page/text-page';

// Página para direcciones que no existen (los buscadores no la indexan: ver app.routes.ts)
@Component({
  selector: 'app-not-found',
  imports: [TextPage, RouterLink],
  template: `
    <app-text-page title="Esta página no existe">
      <p>Puede que el enlace esté mal escrito o que la página ya no esté.</p>
      <p><a routerLink="/">Volver al inicio</a></p>
    </app-text-page>
  `
})
export class NotFound {}
