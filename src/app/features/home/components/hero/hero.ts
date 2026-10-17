import { Component, DestroyRef, afterNextRender, inject, signal } from '@angular/core';
import { HeroAsk } from '../hero-ask/hero-ask';
import { SkillsTicker } from '../skills-ticker/skills-ticker';
import { HERO } from '../../../../core/data/hero.data';
import { SceneService } from '../../../../core/services/scene.service';
import { HAS_SCENE } from '../../../../shared/utils/scene-animation';
import { GITHUB_URL, LINKEDIN_URL, PROFILE } from '../../../../core/data/profile.data';

@Component({
  selector: 'app-hero',
  imports: [SkillsTicker, HeroAsk],
  templateUrl: './hero.html',
  styleUrl: './hero.css'
})
export class Hero {
  protected readonly profile = PROFILE;
  /** Hay ilustración animada; si no, se ve el fondo de luces */
  protected readonly hasScene = HAS_SCENE;
  protected readonly heroDescription = HERO.description;
  protected readonly githubUrl = GITHUB_URL;
  protected readonly linkedinUrl = LINKEDIN_URL;

  protected readonly copied = signal(false);
  private readonly scene = inject(SceneService);
  protected readonly paused = this.scene.paused;

  constructor() {
    const destroyRef = inject(DestroyRef);

    // Cuánto se oscurece el dibujo del fondo: 0 arriba del todo, hasta MAX_DIM al pasar el inicio.
    afterNextRender(() => {
      const MAX_DIM = 0.6;
      // El navegador ya agrupa los eventos de scroll por fotograma; el valor se redondea para que
      // solo se actualice cuando cambia de verdad.
      const updateDim = () => {
        const progress = Math.min(window.scrollY / window.innerHeight, 1);
        this.scene.dim.set(Math.round(progress * MAX_DIM * 100) / 100);
      };
      window.addEventListener('scroll', updateDim, { passive: true });
      destroyRef.onDestroy(() => {
        window.removeEventListener('scroll', updateDim);
        this.scene.dim.set(0);
      });
      updateDim();
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
