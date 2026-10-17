import { Injectable, signal } from '@angular/core';

// Estado del dibujo animado de fondo (está una sola vez, en el marco de la página):
// - paused: botón "Pausar animación" del inicio y de las páginas de texto (si se pausa en el inicio, sigue en
//   pausa al abrir Privacidad o Aviso legal)
// - dim: cuánto se oscurece el dibujo al bajar por el inicio (0 arriba del todo; en las demás páginas, 0)
@Injectable({ providedIn: 'root' })
export class SceneService {
  readonly paused = signal(false);
  readonly dim = signal(0);
}
