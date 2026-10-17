import { Component, DestroyRef, ElementRef, afterNextRender, inject, viewChild } from '@angular/core';
import { SceneService } from '../../../core/services/scene.service';
import { HAS_SCENE, startSceneAnimation } from '../../utils/scene-animation';

// El mismo dibujo animado del inicio (o, sin ilustración, su fondo degradado), fijo detrás de las páginas
// de texto (privacidad, aviso legal), con el efecto de televisor antiguo y sin nada que lo oscurezca: el
// texto ya va en su tarjeta de cristal.
@Component({
  selector: 'app-scene-backdrop',
  templateUrl: './scene-backdrop.html',
  styleUrl: './scene-backdrop.css',
  host: { '[class.is-paused]': 'paused()', '[class.no-scene]': '!hasScene' }
})
export class SceneBackdrop {
  protected readonly paused = inject(SceneService).paused;
  /** Sin ilustración (HERO.frames vacío): el mismo fondo degradado que el inicio */
  protected readonly hasScene = HAS_SCENE;
  private readonly scene = viewChild.required<ElementRef<HTMLCanvasElement>>('scene');
  private readonly glow = viewChild.required<ElementRef<HTMLCanvasElement>>('glow');

  constructor() {
    const destroyRef = inject(DestroyRef);
    afterNextRender(() => {
      const stop = startSceneAnimation(this.scene().nativeElement, this.glow().nativeElement, () => this.paused());
      destroyRef.onDestroy(stop);
    });
  }
}
