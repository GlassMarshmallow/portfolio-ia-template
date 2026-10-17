import { Component, DestroyRef, ElementRef, afterNextRender, inject, viewChild } from '@angular/core';
import { SceneService } from '../../../core/services/scene.service';
import { HAS_SCENE, startSceneAnimation } from '../../utils/scene-animation';

// Fondo de todas las páginas: el de GlassMarshmallow (gm-backdrop) y, si hay ilustración, el dibujo animado
// con su brillo de tubo. Va una sola vez, en el marco de la página.
@Component({
  selector: 'app-scene-backdrop',
  templateUrl: './scene-backdrop.html',
  styleUrl: './scene-backdrop.css',
  host: { '[class.is-paused]': 'paused()' }
})
export class SceneBackdrop {
  private readonly sceneState = inject(SceneService);
  protected readonly paused = this.sceneState.paused;
  protected readonly dim = this.sceneState.dim;
  protected readonly hasScene = HAS_SCENE;
  private readonly scene = viewChild<ElementRef<HTMLCanvasElement>>('scene');
  private readonly glow = viewChild<ElementRef<HTMLCanvasElement>>('glow');

  constructor() {
    const destroyRef = inject(DestroyRef);
    afterNextRender(() => {
      const scene = this.scene()?.nativeElement;
      const glow = this.glow()?.nativeElement;
      if (scene && glow) {
        const stop = startSceneAnimation(scene, glow, () => this.paused());
        destroyRef.onDestroy(stop);
      }
    });
  }
}
