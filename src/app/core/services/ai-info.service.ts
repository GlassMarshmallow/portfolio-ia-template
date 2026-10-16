import { Injectable, signal } from '@angular/core';

// Abre y cierra la ventana "Información sobre la IA" (está una sola vez, en el layout público).
@Injectable({ providedIn: 'root' })
export class AiInfoService {
  readonly isOpen = signal(false);

  open() {
    this.isOpen.set(true);
  }

  close() {
    this.isOpen.set(false);
  }
}
