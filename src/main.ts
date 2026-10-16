import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';

// Al recargar, la página empieza siempre arriba: se quita la sección (#contact, #skills…) que dejó el
// menú en la dirección. Si se abre un enlace con sección (por ejemplo, uno compartido), sí se va a ella.
const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
if (navigation?.type === 'reload' && location.hash) {
  history.replaceState(history.state, '', location.pathname + location.search);
}
if (navigation?.type === 'reload') {
  history.scrollRestoration = 'manual';
  window.scrollTo(0, 0);
}

bootstrapApplication(App, appConfig)
  .catch((err) => console.error(err));
