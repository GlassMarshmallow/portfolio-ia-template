import { Injectable, signal } from '@angular/core';

// Estado del dibujo animado de fondo, compartido entre el inicio (botón "Pausar animación") y las
// páginas de texto: si se pausa en el inicio, sigue en pausa al abrir Privacidad o Aviso legal.
@Injectable({ providedIn: 'root' })
export class SceneService {
  readonly paused = signal(false);
}
