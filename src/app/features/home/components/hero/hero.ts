import { Component, DestroyRef, ElementRef, afterNextRender, inject, signal, viewChild } from '@angular/core';
import { Icon } from '../../../../shared/components/icon/icon';
import { HeroAsk } from '../hero-ask/hero-ask';
import { SkillsTicker } from '../skills-ticker/skills-ticker';
import { HERO } from '../../../../core/data/hero.data';
import { SceneService } from '../../../../core/services/scene.service';
import { HAS_SCENE, startSceneAnimation } from '../../../../shared/utils/scene-animation';
import { GITHUB_URL, LINKEDIN_URL, PROFILE } from '../../../../core/data/profile.data';

@Component({
  selector: 'app-hero',
  imports: [SkillsTicker, Icon, HeroAsk],
  templateUrl: './hero.html',
  styleUrl: './hero.css',
  host: { '[style.--hero-dim]': 'dim()' }
})
export class Hero {
  protected readonly profile = PROFILE;
  /** Hay ilustración animada; si no, se ve el fondo degradado */
  protected readonly hasScene = HAS_SCENE;
  protected readonly heroDescription = HERO.description;
  protected readonly githubUrl = GITHUB_URL;
  protected readonly linkedinUrl = LINKEDIN_URL;

  private readonly scene = viewChild.required<ElementRef<HTMLCanvasElement>>('scene');
  private readonly glow = viewChild.required<ElementRef<HTMLCanvasElement>>('glow');
  protected readonly copied = signal(false);
  protected readonly paused = inject(SceneService).paused;
  // Cuánto se oscurece el dibujo fijo: 0 arriba del todo, hasta MAX_DIM al pasar el inicio.
  protected readonly dim = signal(0);

  constructor() {
    const destroyRef = inject(DestroyRef);

    afterNextRender(() => {
      const MAX_DIM = 0.6;
      // El navegador ya agrupa los eventos de scroll por fotograma; el valor se redondea para que
      // solo se actualice cuando cambia de verdad.
      const updateDim = () => {
        const progress = Math.min(window.scrollY / window.innerHeight, 1);
        this.dim.set(Math.round(progress * MAX_DIM * 100) / 100);
      };
      window.addEventListener('scroll', updateDim, { passive: true });
      destroyRef.onDestroy(() => window.removeEventListener('scroll', updateDim));
      updateDim();
    });

    afterNextRender(() => {
      const stop = startSceneAnimation(this.scene().nativeElement, this.glow().nativeElement, () => this.paused());
      destroyRef.onDestroy(stop);
    });
  }

  togglePause() {
    this.paused.update(paused => !paused);
  }

  copyEmail() {
    navigator.clipboard.writeText(PROFILE.email);
    this.copied.set(true);
    setTimeout(() => this.copied.set(false), 2000);
  }
}
