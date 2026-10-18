
// Móvil: cuando se abre el teclado con el campo del chat enfocado, se ajusta solo el desplazamiento de la página
// (nada cambia de tamaño ni de sitio) para que el formulario quede pegado encima del teclado. Al cerrarse el
// teclado, la página vuelve a donde estaba. Mientras está abierto, la página no se mueve: los cambios pequeños del
// teclado (la barra de sugerencias al escribir) se ignoran; solo se recoloca si cambia mucho (p. ej. emojis).
// - Chrome, Brave, Edge… en Android (API VirtualKeyboard, solo en https): mientras el campo está enfocado, el
//   teclado se superpone a la página sin que el navegador la desplace a su manera, y avisa de su altura.
// - iPhone y el resto: se mide la parte que el teclado deja visible (visualViewport).
// Devuelve una función para quitarlo. En desarrollo (ng serve) enseña una etiqueta con lo que detecta.

interface VirtualKeyboard extends EventTarget {
  overlaysContent: boolean;
  readonly boundingRect: DOMRect;
}

const MARGIN = 8;
// Si el teclado se cierra al pulsar un botón (enviar, preguntas rápidas…), la página espera a que el botón reciba el
// toque antes de volver a su sitio; como mucho, esto
const CLICK_WAIT = 600;
const KEYBOARD_MIN = 150;
const KEYBOARD_CHANGE = 60;

export function keepAboveKeyboard(input: HTMLInputElement, target: HTMLElement): () => void {
  const keyboard = (navigator as Navigator & { virtualKeyboard?: VirtualKeyboard }).virtualKeyboard;
  const viewport = window.visualViewport;
  const mobile = () => matchMedia('(max-width: 767px)').matches;

  // Sin la API: altura visible sin teclado (se actualiza mientras el teclado no está abierto)
  let fullHeight = viewport?.height ?? window.innerHeight;
  let open = false;
  let keyboardHeight = 0;
  let placedHeight = 0;
  let scrollBefore = 0;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let restoreTimer: ReturnType<typeof setTimeout> | undefined;

  // Lo que el teclado deja visible: dónde empieza en la página y cuánto mide
  const visibleArea = () => keyboard?.overlaysContent
    ? { top: window.scrollY, height: window.innerHeight - keyboardHeight }
    : { top: viewport?.pageTop ?? window.scrollY, height: viewport?.height ?? window.innerHeight };

  const place = () => {
    if (!open || document.activeElement !== input) {
      return;
    }
    const { height } = visibleArea();
    placedHeight = height;
    // Dónde acaba el formulario en la página y dónde tiene que empezar lo visible para que quede encima del teclado
    const bottom = target.getBoundingClientRect().bottom + window.scrollY;
    const top = Math.max(0, bottom - (height - MARGIN));
    // 'instant': la web tiene scroll-behavior: smooth (para el menú) y, con 'auto', sería una animación
    window.scrollTo({ top, behavior: 'instant' });
    // Sin la API, el navegador puede tener desplazada por su cuenta la zona visible: se corrige la diferencia
    requestAnimationFrame(() => {
      const diff = top - visibleArea().top;
      if (Math.abs(diff) > 2) {
        window.scrollBy({ top: diff, behavior: 'instant' });
      }
    });
  };
  // Espera a que dejen de llegar cambios (150 ms) para colocar la página
  const placeSoon = () => {
    clearTimeout(timer);
    timer = setTimeout(place, 150);
  };

  // La página vuelve a donde estaba, con una animación suave (de golpe si se ha pedido menos movimiento)
  const restore = () => {
    clearTimeout(restoreTimer);
    restoreTimer = undefined;
    document.removeEventListener('click', restoreAfterClick);
    if (!open) {
      const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
      window.scrollTo({ top: scrollBefore, behavior: reduceMotion ? 'instant' : 'smooth' });
    }
  };
  // Justo después de que el botón pulsado haga lo suyo
  const restoreAfterClick = () => setTimeout(restore);

  // Teclado cerrado. waitForClick: se ha cerrado al pulsar un botón y hay que esperar a que reciba el toque
  const close = (waitForClick: boolean) => {
    if (!open) {
      return;
    }
    open = false;
    clearTimeout(timer);
    if (waitForClick) {
      document.addEventListener('click', restoreAfterClick, { once: true });
      restoreTimer = setTimeout(restore, CLICK_WAIT);
    } else {
      restore();
    }
  };

  // Se llama cada vez que cambia lo visible: decide si el teclado se ha abierto, ha cambiado o se ha cerrado
  const update = (keyboardShown: boolean) => {
    if (!keyboardShown) {
      close(false);
      return;
    }
    if (document.activeElement !== input || !mobile()) {
      return;
    }
    if (!open) {
      open = true;
      clearTimeout(restoreTimer);
      restoreTimer = undefined;
      document.removeEventListener('click', restoreAfterClick);
      placeSoon();
    } else if (Math.abs(visibleArea().height - placedHeight) > KEYBOARD_CHANGE) {
      placeSoon();
    }
  };

  // La API se activa al tocar el campo (antes de que salga el teclado) y se quita al salir de él: así los demás
  // campos de la web (por ejemplo, editar el resumen) siguen con el comportamiento normal del navegador
  const takeKeyboard = () => {
    if (keyboard && mobile()) {
      keyboard.overlaysContent = true;
    }
  };
  const onFocus = () => {
    takeKeyboard();
    // Si vuelve a tocar el campo mientras la página esperaba para volver, se queda donde estaba antes
    if (!open && restoreTimer === undefined) {
      scrollBefore = window.scrollY;
    }
  };
  // Lo último que ha tocado el dedo (en algunos móviles, al tocar un botón el foco no pasa a él)
  let lastTouch: { target: EventTarget | null; at: number } = { target: null, at: 0 };
  const onPointerDown = (event: PointerEvent) => (lastTouch = { target: event.target, at: Date.now() });
  const isControl = (target: EventTarget | null) =>
    target instanceof Element && !!target.closest('button, a, [role="button"]');

  const onBlur = (event: FocusEvent) => {
    // Si acaba de pulsar un botón o enlace, se espera a su toque; si no (ha tocado fuera o cerrado el teclado), la
    // página vuelve al momento
    const pressed = isControl(event.relatedTarget) || (Date.now() - lastTouch.at < 500 && isControl(lastTouch.target));
    close(pressed);
    // El modo de la API se quita después de que la página vuelva, para que el teclado al cerrarse no la mueva
    setTimeout(() => {
      if (keyboard && document.activeElement !== input) {
        keyboard.overlaysContent = false;
        keyboardHeight = 0;
      }
    }, CLICK_WAIT + 50);
  };
  const onGeometry = () => {
    keyboardHeight = keyboard?.boundingRect.height ?? 0;
    update(keyboardHeight > KEYBOARD_MIN);
  };
  const onViewportResize = () => {
    if (keyboard?.overlaysContent) {
      return;
    }
    const height = viewport?.height ?? window.innerHeight;
    const keyboardShown = height < fullHeight - KEYBOARD_MIN;
    if (!keyboardShown) {
      fullHeight = height;
    }
    update(keyboardShown);
  };

  input.addEventListener('pointerdown', takeKeyboard);
  document.addEventListener('pointerdown', onPointerDown, true);
  input.addEventListener('focus', onFocus);
  input.addEventListener('blur', onBlur);
  keyboard?.addEventListener('geometrychange', onGeometry);
  viewport?.addEventListener('resize', onViewportResize);

  return () => {
    input.removeEventListener('pointerdown', takeKeyboard);
    document.removeEventListener('pointerdown', onPointerDown, true);
    input.removeEventListener('focus', onFocus);
    input.removeEventListener('blur', onBlur);
    keyboard?.removeEventListener('geometrychange', onGeometry);
    viewport?.removeEventListener('resize', onViewportResize);
    clearTimeout(timer);
    clearTimeout(restoreTimer);
    document.removeEventListener('click', restoreAfterClick);
    if (keyboard) {
      keyboard.overlaysContent = false;
    }
  };
}
