/*!
 * GlassMarshmallow · Galería (opcional)
 * Hace que las fotos de <div class="gm-gallery" data-gm-gallery> se abran en un visor (.gm-lightbox) en
 * lugar de ir a la imagen. Sin dependencias.
 *
 * - Cada .gm-gallery__item es un enlace a la foto grande (href). El texto sale de data-caption o, si no
 *   hay, del alt de la miniatura.
 * - En el visor: flechas, contador («2 de 9»), el texto y el botón de cerrar. ← → pasan de foto, Inicio y
 *   Fin van a la primera y la última, y Escape cierra. Al cerrar, el foco vuelve a la foto de la galería.
 * - Una sola foto que se amplía (por ejemplo, la foto de perfil): un enlace a la foto grande con data-gm-zoom.
 *   El visor sale sin flechas ni contador. initZooms() pone en marcha todas.
 * - Textos en español si <html lang="es">; en inglés si no. Se cambian con initGallery(root, { texts }).
 */

/** El texto, listo para ir dentro del HTML: sin que < > & " ' se lean como código */
const esc = (text) => String(text).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);


const TEXTS = {
  es: { close: 'Cerrar', previous: 'Foto anterior', next: 'Foto siguiente', of: 'de', viewer: 'Visor de fotos' },
  en: { close: 'Close', previous: 'Previous photo', next: 'Next photo', of: 'of', viewer: 'Photo viewer' },
};

/** Pone en marcha una galería. Devuelve una función para quitarla. */
export function initGallery(root, options = {}) {
  if (root.gmGallery) return root.gmGallery;
  const items = root.hasAttribute('data-gm-zoom') ? [root] : [...root.querySelectorAll('.gm-gallery__item')];
  if (!items.length) return () => {};
  const lang = (document.documentElement.lang || 'en').slice(0, 2);
  const t = { ...(TEXTS[lang] ?? TEXTS.en), ...options.texts };
  let index = 0;

  const dialog = document.createElement('dialog');
  dialog.className = items.length === 1 ? 'gm-lightbox gm-lightbox--single' : 'gm-lightbox';
  dialog.setAttribute('aria-label', root.getAttribute('aria-label') || t.viewer);
  dialog.innerHTML = `
    <div class="gm-lightbox__head">
      <span class="gm-lightbox__count" aria-live="polite"></span>
      <button type="button" class="gm-lightbox__button" data-action="close" aria-label="${esc(t.close)}"><i class="gmi gmi-x-lg" aria-hidden="true"></i></button>
    </div>
    <div class="gm-lightbox__stage">
      <img alt="">
      <button type="button" class="gm-lightbox__button gm-lightbox__prev" data-action="prev" aria-label="${esc(t.previous)}"><i class="gmi gmi-chevron-left" aria-hidden="true"></i></button>
      <button type="button" class="gm-lightbox__button gm-lightbox__next" data-action="next" aria-label="${esc(t.next)}"><i class="gmi gmi-chevron-right" aria-hidden="true"></i></button>
    </div>
    <p class="gm-lightbox__caption"></p>`;
  document.body.append(dialog);
  const image = dialog.querySelector('img');
  const count = dialog.querySelector('.gm-lightbox__count');
  const caption = dialog.querySelector('.gm-lightbox__caption');

  function show(to) {
    index = (to + items.length) % items.length;
    const item = items[index];
    const thumb = item.querySelector('img');
    image.src = item.getAttribute('href') || thumb?.src || '';
    image.alt = thumb?.alt ?? '';
    caption.textContent = item.dataset.caption ?? thumb?.alt ?? '';
    count.textContent = `${index + 1} ${esc(t.of)} ${items.length}`;
  }

  const onOpen = (event) => {
    const item = items.find((candidate) => candidate.contains(event.target));
    if (!item || event.metaKey || event.ctrlKey || event.shiftKey) return;
    event.preventDefault();
    show(items.indexOf(item));
    dialog.showModal();
  };
  const onDialogClick = (event) => {
    const action = event.target.closest('[data-action]')?.dataset.action;
    if (action === 'close' || event.target === dialog) dialog.close();
    else if (action === 'prev') show(index - 1);
    else if (action === 'next') show(index + 1);
  };
  const onKeydown = (event) => {
    if (event.key === 'ArrowLeft') show(index - 1);
    else if (event.key === 'ArrowRight') show(index + 1);
    else if (event.key === 'Home') show(0);
    else if (event.key === 'End') show(items.length - 1);
    else return;
    event.preventDefault();
  };
  const onClose = () => items[index]?.focus();

  root.addEventListener('click', onOpen);
  dialog.addEventListener('click', onDialogClick);
  dialog.addEventListener('keydown', onKeydown);
  dialog.addEventListener('close', onClose);

  root.gmGallery = () => {
    root.removeEventListener('click', onOpen);
    dialog.remove();
    delete root.gmGallery;
  };
  return root.gmGallery;
}

/** Pone en marcha todas las galerías con data-gm-gallery que haya dentro de «scope». */
export function initGalleries(scope = document, options) {
  return [...scope.querySelectorAll('[data-gm-gallery]')].map((root) => initGallery(root, options));
}

/** Pone en marcha todas las fotos que se amplían (enlaces con data-gm-zoom) que haya dentro de «scope». */
export function initZooms(scope = document, options) {
  return [...scope.querySelectorAll('[data-gm-zoom]')].map((link) => initGallery(link, options));
}
