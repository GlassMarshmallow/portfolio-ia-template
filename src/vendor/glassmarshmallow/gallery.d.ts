export interface GalleryOptions {
  /** Textos del visor; los que falten salen en el idioma de la página (español o inglés) */
  texts?: Partial<Record<string, string>>;
}
export declare function initGallery(root: HTMLElement, options?: GalleryOptions): () => void;
export declare function initGalleries(scope?: ParentNode, options?: GalleryOptions): Array<() => void>;
export declare function initZooms(scope?: ParentNode, options?: GalleryOptions): Array<() => void>;
