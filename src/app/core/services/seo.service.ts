import { DOCUMENT } from '@angular/common';
import { Injectable, inject } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { ActivatedRouteSnapshot } from '@angular/router';
import { DEFAULT_DESCRIPTION, SITE_URL } from '../data/site.data';

// Etiquetas para buscadores y redes sociales de cada página: descripción, dirección canónica y si se
// puede indexar. Se leen de `data` de la ruta (description, noindex); el título, del `title` de la ruta.
@Injectable({ providedIn: 'root' })
export class SeoService {
  private readonly meta = inject(Meta);
  private readonly title = inject(Title);
  private readonly document = inject(DOCUMENT);

  update(route: ActivatedRouteSnapshot, path: string) {
    while (route.firstChild) {
      route = route.firstChild;
    }
    const description = (route.data['description'] as string | undefined) ?? DEFAULT_DESCRIPTION;
    const noindex = route.data['noindex'] === true;
    const url = SITE_URL + (path === '/' ? '/' : path.split(/[?#]/)[0]);
    const title = route.title ?? this.title.getTitle();

    this.meta.updateTag({ name: 'description', content: description });
    this.meta.updateTag({ name: 'robots', content: noindex ? 'noindex, follow' : 'index, follow' });
    this.meta.updateTag({ property: 'og:title', content: title });
    this.meta.updateTag({ property: 'og:description', content: description });
    this.meta.updateTag({ property: 'og:url', content: url });
    this.meta.updateTag({ name: 'twitter:title', content: title });
    this.meta.updateTag({ name: 'twitter:description', content: description });

    let canonical = this.document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (noindex) {
      canonical?.remove();
      return;
    }
    if (!canonical) {
      canonical = this.document.createElement('link');
      canonical.rel = 'canonical';
      this.document.head.appendChild(canonical);
    }
    canonical.href = url;
  }
}
