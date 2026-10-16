import { Component, DestroyRef, ElementRef, afterNextRender, inject, signal, viewChild } from '@angular/core';
import { Icon } from '../../../../shared/components/icon/icon';
import { HeroAsk } from '../hero-ask/hero-ask';
import { SkillsTicker } from '../skills-ticker/skills-ticker';
import { HERO, type HeroRegion } from '../../../../core/data/hero.data';
import { GITHUB_URL, LINKEDIN_URL, PROFILE } from '../../../../core/data/profile.data';

// La animación se configura en src/app/core/data/hero.data.ts (fotogramas, capa en bucle, zona fija,
// iluminación). Sin fotogramas, el inicio muestra un fondo degradado.
type Region = HeroRegion;
const FRAME_SEQUENCE = HERO.frames;
const FRAME_DURATION_MS = HERO.frameDurationMs;
const LOOP_LAYER = HERO.loopLayer;
const FIXED_PATCH = HERO.fixedPatch;

const frameUrl = (frame: string) => `assets/hero-frames/${frame}.jpg`;

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
  protected readonly hasScene = HERO.frames.length > 0;
  protected readonly heroDescription = HERO.description;
  protected readonly githubUrl = GITHUB_URL;
  protected readonly linkedinUrl = LINKEDIN_URL;

  private readonly scene = viewChild.required<ElementRef<HTMLCanvasElement>>('scene');
  private readonly glow = viewChild.required<ElementRef<HTMLCanvasElement>>('glow');
  protected readonly copied = signal(false);
  protected readonly paused = signal(false);
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
      let frameRequest = 0;
      destroyRef.onDestroy(() => cancelAnimationFrame(frameRequest));

      // Precarga; los fotogramas que no existan se saltan.
      if (FRAME_SEQUENCE.length === 0) {
        return;
      }
      const names = [...new Set([...FRAME_SEQUENCE, ...(LOOP_LAYER?.frames ?? []), ...(FIXED_PATCH ? [FIXED_PATCH.source] : [])])];
      Promise.all(names.map(loadImage)).then(images => {
        const frames = new Map<string, HTMLImageElement>();
        names.forEach((name, i) => images[i] && frames.set(name, images[i]));

        const sequence = FRAME_SEQUENCE.filter(frame => frames.has(frame));
        const steamNames = (LOOP_LAYER?.frames ?? []).filter(frame => frames.has(frame));
        const chairSource = FIXED_PATCH ? frames.get(FIXED_PATCH.source) : undefined;
        const chairPatch = chairSource && FIXED_PATCH ? cutPatch(chairSource, FIXED_PATCH.region) : null;
        if (sequence.length === 0) {
          return;
        }

        const canvas = this.scene().nativeElement;
        const first = frames.get(sequence[0])!;
        canvas.width = first.naturalWidth;
        canvas.height = first.naturalHeight;
        const ctx = canvas.getContext('2d')!;

        // Copia de la escena que se difumina por CSS para el brillo de tubo (CRT).
        const glowCanvas = this.glow().nativeElement;
        glowCanvas.width = canvas.width;
        glowCanvas.height = canvas.height;
        const glowCtx = glowCanvas.getContext('2d')!;

        const lightMap = HERO.lighting ? createLightMap(canvas.width, canvas.height, HERO.lighting) : null;

        // Cada pose se prepara una sola vez (dibujo + silla fija + iluminación), así cada imagen
        // de la animación solo copia la pose y pinta el humo encima.
        const poses = new Map<string, HTMLCanvasElement>();
        for (const name of new Set(sequence)) {
          const pose = document.createElement('canvas');
          pose.width = canvas.width;
          pose.height = canvas.height;
          const poseCtx = pose.getContext('2d')!;
          poseCtx.drawImage(frames.get(name)!, 0, 0);
          if (chairPatch && FIXED_PATCH) {
            drawPatch(poseCtx, chairPatch, FIXED_PATCH.region, 1);
          }
          if (lightMap) {
            applyLighting(poseCtx, lightMap);
          }
          poses.set(name, pose);
        }

        // Formas del humo ya iluminadas: se recortan de cada fotograma iluminado completo
        const steam = steamNames.map(name => {
          const lit = document.createElement('canvas');
          lit.width = canvas.width;
          lit.height = canvas.height;
          const litCtx = lit.getContext('2d')!;
          litCtx.drawImage(frames.get(name)!, 0, 0);
          if (lightMap) {
            applyLighting(litCtx, lightMap);
          }
          return cutPatch(lit, LOOP_LAYER!.region);
        });

        const draw = (step: number, steamPosition: number) => {
          ctx.globalAlpha = 1;
          ctx.drawImage(poses.get(sequence[step])!, 0, 0);
          if (steam.length > 0) {
            const from = Math.floor(steamPosition);
            drawPatch(ctx, steam[from], LOOP_LAYER!.region, 1);
            drawPatch(ctx, steam[Math.min(from + 1, steam.length - 1)], LOOP_LAYER!.region, steamPosition - from);
          }
          glowCtx.drawImage(canvas, 0, 0);
        };

        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
          draw(0, 0);
          return;
        }

        // Chica: ida y vuelta por la secuencia; al llegar al final la recorre hacia atrás.
        let step = 0;
        let direction = 1;
        let nextChange = performance.now() + FRAME_DURATION_MS;

        let drawnOnce = false;

        const tick = (now: number) => {
          // En pausa se mantiene el fotograma actual (pero siempre se pinta al menos el primero).
          if (this.paused() && drawnOnce) {
            nextChange = now + FRAME_DURATION_MS;
            frameRequest = requestAnimationFrame(tick);
            return;
          }

          // Un fotograma cada vez: aunque el navegador vaya con retraso, nunca se salta ninguno.
          if (now >= nextChange) {
            if (step + direction < 0 || step + direction >= sequence.length) {
              direction = -direction;
            }
            step = sequence.length > 1 ? step + direction : 0;
            nextChange = now + FRAME_DURATION_MS;
          }

          // Humo: también de ida y vuelta, con posición continua para fundir una forma con otra.
          const span = Math.max(steam.length - 1, 1);
          const cycle = (now / (LOOP_LAYER?.durationMs ?? 450)) % (span * 2);
          const steamPosition = steam.length > 1 ? Math.min(cycle <= span ? cycle : span * 2 - cycle, span - 1e-6) : 0;

          draw(step, steamPosition);
          drawnOnce = true;
          frameRequest = requestAnimationFrame(tick);
        };
        frameRequest = requestAnimationFrame(tick);
      });
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

function loadImage(frame: string): Promise<HTMLImageElement | null> {
  const image = new Image();
  image.src = frameUrl(frame);
  return image.decode().then(() => image, () => null);
}

// Recorta una zona de la imagen con los bordes difuminados para que se funda con la imagen de debajo.
function cutPatch(image: HTMLImageElement | HTMLCanvasElement, region: Region): HTMLCanvasElement {
  const { x, y, w, h, feather } = region;
  const imageWidth = image instanceof HTMLImageElement ? image.naturalWidth : image.width;
  const imageHeight = image instanceof HTMLImageElement ? image.naturalHeight : image.height;
  const width = Math.round(w * imageWidth);
  const height = Math.round(h * imageHeight);
  const patch = document.createElement('canvas');
  patch.width = width;
  patch.height = height;
  const ctx = patch.getContext('2d')!;
  ctx.drawImage(image, x * imageWidth, y * imageHeight, width, height, 0, 0, width, height);

  ctx.globalCompositeOperation = 'destination-in';
  const edges: [number, number, number, number][] = [
    [width, 0, feather.left, feather.right],
    [0, height, feather.top, feather.bottom]
  ];
  for (const [toX, toY, start, end] of edges) {
    const gradient = ctx.createLinearGradient(0, 0, toX, toY);
    gradient.addColorStop(0, start > 0 ? 'rgba(0,0,0,0)' : 'rgba(0,0,0,1)');
    gradient.addColorStop(start, 'rgba(0,0,0,1)');
    gradient.addColorStop(1 - end, 'rgba(0,0,0,1)');
    gradient.addColorStop(1, end > 0 ? 'rgba(0,0,0,0)' : 'rgba(0,0,0,1)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
  }
  return patch;
}

function drawPatch(ctx: CanvasRenderingContext2D, patch: HTMLCanvasElement, region: Region, alpha: number) {
  ctx.globalAlpha = alpha;
  ctx.drawImage(patch, Math.round(region.x * ctx.canvas.width), Math.round(region.y * ctx.canvas.height));
  ctx.globalAlpha = 1;
}

// Pinta una vez el mapa de luz: fondo en penumbra y cada fuente de luz sumada encima.
function createLightMap(width: number, height: number, lighting: NonNullable<typeof HERO.lighting>): HTMLCanvasElement {
  const map = document.createElement('canvas');
  map.width = width;
  map.height = height;
  const ctx = map.getContext('2d')!;
  ctx.fillStyle = lighting.ambient;
  ctx.fillRect(0, 0, width, height);

  // Cada luz cubre la penumbra con su color (fundiéndose hacia los bordes) para que no se lave a blanco.
  for (const { x, y, radius, color: [r, g, b], strength } of lighting.lights) {
    const cx = x * width;
    const cy = y * height;
    const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius * width);
    gradient.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${strength})`);
    gradient.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
  }
  return map;
}

// Pasa la escena a gris y la tiñe con el mapa de luz.
function applyLighting(ctx: CanvasRenderingContext2D, lightMap: HTMLCanvasElement) {
  const { width, height } = ctx.canvas;
  ctx.save();
  ctx.globalCompositeOperation = 'saturation';
  ctx.fillStyle = '#808080';
  ctx.fillRect(0, 0, width, height);
  ctx.globalCompositeOperation = 'multiply';
  ctx.drawImage(lightMap, 0, 0);
  ctx.restore();
}
