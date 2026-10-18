import { Routes } from '@angular/router';
import { PublicLayout } from './layouts/public-layout/public-layout';
import { PROFILE } from './core/data/profile.data';

// Páginas de la web. El título (`title`) y la descripción (`data.description`) son los que se ven en Google y
// al compartir el enlace (los pone SeoService al cambiar de página).
export const routes: Routes = [
  {
    path: '',
    component: PublicLayout,
    children: [
      {
        path: '',
        loadComponent: () => import('./features/home/pages/home/home').then(m => m.Home),
        title: `${PROFILE.fullName} | Portfolio`
      },
      {
        path: 'privacidad',
        loadComponent: () => import('./features/legal/pages/privacy/privacy').then(m => m.Privacy),
        title: `Política de privacidad | ${PROFILE.fullName}`,
        data: { description: 'Qué datos recojo en mi portfolio, para qué los uso, cuánto tiempo los guardo y cuáles son tus derechos.' }
      },
      {
        path: 'informacion-ia',
        loadComponent: () => import('./features/legal/pages/ai-info/ai-info').then(m => m.AiInfo),
        title: `Información sobre la IA | ${PROFILE.fullName}`,
        data: { description: 'Cómo funciona el chat con IA de mi portfolio, qué pasa con lo que escribes y cuáles son tus derechos.' }
      },
      {
        path: 'aviso-legal',
        loadComponent: () => import('./features/legal/pages/legal-notice/legal-notice').then(m => m.LegalNotice),
        title: `Aviso legal | ${PROFILE.fullName}`,
        data: { description: 'Quién es el titular de este portfolio, para qué sirve la web y qué debes saber sobre sus contenidos y su chat con IA.' }
      },
      {
        path: '**',
        loadComponent: () => import('./shared/pages/not-found/not-found').then(m => m.NotFound),
        title: `Página no encontrada | ${PROFILE.fullName}`,
        data: { noindex: true }
      }
    ]
  }
];
