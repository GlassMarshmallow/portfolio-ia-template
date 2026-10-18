// ─────────────────────────────────────────────────────────────────────────────────────────────────────────
// ANIMACIÓN DEL INICIO: tu propia ilustración, fotograma a fotograma (opcional).
// Sin fotogramas, el inicio muestra un fondo degradado. Guía completa en el README → "Animación del inicio".
// ─────────────────────────────────────────────────────────────────────────────────────────────────────────

/** Zona de la imagen, en fracción del ancho/alto (0 a 1); `feather` es cuánto se difumina cada borde. */
export interface HeroRegion {
  x: number;
  y: number;
  w: number;
  h: number;
  feather: { left: number; right: number; top: number; bottom: number };
}

/** Luz que tiñe el dibujo: posición y radio en fracción de la imagen, color RGB y fuerza (0 a 1). */
export interface HeroLight {
  x: number;
  y: number;
  radius: number;
  color: [number, number, number];
  strength: number;
}

export interface HeroConfig {
  /**
   * Nombres de los fotogramas (sin ".jpg"), en el orden en que se ven. Van en public/assets/hero-frames/.
   * La secuencia se recorre de ida y vuelta. Puedes repetir nombres para que una pose dure más.
   */
  frames: string[];
  frameDurationMs: number;
  /**
   * Capa opcional que se mueve siempre, aunque la animación principal se quede quieta (p. ej. el humo de
   * una taza): recorta esa zona de varios fotogramas y funde una forma con la siguiente.
   */
  loopLayer: { frames: string[]; region: HeroRegion; durationMs: number } | null;
  /** Zonas que se pintan siempre igual, sacadas de un fotograma (p. ej. algo que tiembla entre poses). */
  fixedPatches: { source: string; region: HeroRegion }[];
  /** Iluminación opcional: el dibujo se pasa a gris y se tiñe con un color ambiente y unas luces. */
  lighting: { ambient: string; lights: HeroLight[] } | null;
  /** Descripción de la ilustración para lectores de pantalla */
  description: string;
  /** Proporción ancho/alto de tus fotogramas (para colocar los bocadillos del chat) */
  imageRatio: number;
  /** Dónde está la cabeza del personaje, en fracción de la imagen (si el bocadillo no cabe delante, sale detrás) */
  head: { x: number; y: number };
  /**
   * Dónde está la cara (el personaje mira a la izquierda): en ordenador, el bocadillo sale delante de ella,
   * a su izquierda, con la cola apuntándole. Pon el borde izquierdo de la cara (o del pelo) a la altura de los ojos.
   */
  face: { x: number; y: number };
}

export const HERO: HeroConfig = {
  frames: [],
  frameDurationMs: 180,
  loopLayer: null,
  fixedPatches: [],
  lighting: null,
  description: 'Ilustración animada',
  imageRatio: 16 / 9,
  head: { x: 0.5, y: 0.3 },
  face: { x: 0.45, y: 0.35 }
};
