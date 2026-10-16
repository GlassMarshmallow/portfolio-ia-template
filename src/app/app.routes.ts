import { Routes } from '@angular/router';
import { PublicLayout } from './layouts/public-layout/public-layout';
import { PROFILE } from './core/data/profile.data';

export const routes: Routes = [
  {
    path: '',
    component: PublicLayout,
    children: [
      {
        path: '',
        loadComponent: () => import('./features/home/pages/home/home').then(m => m.Home),
        title: `Portfolio ${PROFILE.fullName}`
      },
      {
        path: 'privacidad',
        loadComponent: () => import('./features/legal/pages/privacy/privacy').then(m => m.Privacy),
        title: `Política de privacidad | ${PROFILE.fullName}`
      },
      {
        path: 'aviso-legal',
        loadComponent: () => import('./features/legal/pages/legal-notice/legal-notice').then(m => m.LegalNotice),
        title: `Aviso legal | ${PROFILE.fullName}`
      }
    ]
  },
  { path: '**', redirectTo: '' }
];
