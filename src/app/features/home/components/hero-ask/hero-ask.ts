import { Component, DestroyRef, ElementRef, afterNextRender, computed, inject, signal } from '@angular/core';
import type { ChatMessage, IntakeData, SummaryItem } from '../../../../core/models/intake.models';
import { ASK_FALLBACK, AskError, AskService } from '../../../../core/services/ask.service';
import { ContactError } from '../../../../core/services/contact.service';
import {
  INTAKE_GREETING, INTAKE_MESSAGE_MAX, IntakeError, IntakeService, editIntakeData, emptyIntakeData
} from '../../../../core/services/intake.service';
import { AiNotice } from '../../../../shared/components/ai-notice/ai-notice';
import { keepAboveKeyboard } from '../../../../shared/utils/keep-above-keyboard';
import { linkifyKnown } from '../../../../shared/utils/known-links';
import { IntakeSummary, SummaryEdit } from '../intake-summary/intake-summary';
import { HERO } from '../../../../core/data/hero.data';
import { PROFILE } from '../../../../core/data/profile.data';

// Dos formas de hablar con la IA, en bocadillos de cómic junto a la cabeza de la chica del dibujo:
// - Preguntas rápidas sobre la persona del portfolio (API /api/ask).
// - "Quiero un proyecto": formulario inteligente; la IA va preguntando, rellena la solicitud y, al final,
//   el visitante la revisa y la envía. La conversación se guarda en el navegador para poder retomarla.

// Proporción de la ilustración, posición de la cabeza y de la cara: en src/app/core/data/hero.data.ts
const IMAGE_RATIO = HERO.imageRatio;
const HEAD = HERO.head;
const FACE = HERO.face;
const TAIL = 16;
const BUBBLE_WIDTH = 320;
const MARGIN = 16;
// Tras terminar de escribirse, el bocadillo de una pregunta rápida se desvanece a los 20 segundos
const HIDE_AFTER_MS = 20000;
const QUESTION_MAX = 300;

type Status = 'idle' | 'thinking' | 'answer' | 'error';
type Mode = 'ask' | 'intake';
/** Estado del envío de la solicitud recogida por el formulario inteligente */
type SendStatus = 'idle' | 'sending' | 'sent' | 'error';

interface Placement {
  left: number;
  /** Se ancla por arriba o, delante de la cara, por abajo (para que crezca hacia arriba) */
  top: number | null;
  bottom: number | null;
  width: number;
  /** Alto máximo para no tapar el título "Hola, soy …" */
  maxHeight: number;
  side: 'right' | 'left' | 'top';
  /** Delante de la cara: altura de la cola desde abajo, para que apunte a la cara */
  tailBottom: number;
}

@Component({
  selector: 'app-hero-ask',
  imports: [IntakeSummary, AiNotice],
  host: { '(document:keydown.escape)': 'close()' },
  templateUrl: './hero-ask.html',
  styleUrl: './hero-ask.css'
})
export class HeroAsk {
  protected readonly profile = PROFILE;
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly askService = inject(AskService);
  private readonly intakeService = inject(IntakeService);

  readonly suggestions = ['¿Cuál es tu experiencia?', '¿Qué tecnologías usas?', '¿Qué proyectos haces?', '¿Cómo te contacto?'];

  protected readonly mode = signal<Mode>('ask');
  protected readonly status = signal<Status>('idle');
  protected readonly question = signal('');
  protected readonly asked = signal('');
  protected readonly shown = signal('');
  /** El texto del bocadillo, con LinkedIn, GitHub y el correo como enlaces */
  protected readonly shownParts = computed(() => linkifyKnown(this.shown()));
  protected readonly fullAnswer = signal('');
  protected readonly visible = signal(false);
  protected readonly placement = signal<Placement>({ left: 0, top: 0, bottom: null, width: BUBBLE_WIDTH, maxHeight: 400, side: 'right', tailBottom: 0 });
  /** La respuesta ya ha llegado entera (se anuncia a lectores de pantalla y el bocadillo puede terminar) */
  protected readonly done = signal(false);

  // Formulario inteligente
  protected readonly messages = signal<ChatMessage[]>([]);
  protected readonly intakeData = signal<IntakeData>(emptyIntakeData());
  protected readonly complete = signal(false);
  protected readonly resumed = signal(false);
  protected readonly privacy = signal(false);
  protected readonly sendStatus = signal<SendStatus>('idle');
  protected readonly sendError = signal('');
  /** Resumen de la solicitud, con sus etiquetas y en orden (lo prepara el servidor) */
  protected readonly details = signal<SummaryItem[]>([]);
  protected readonly summary = computed(() => this.details().filter(field => field.value.trim().length > 0));
  /** Hay una conversación guardada a medias (el botón dice "Seguir con mi proyecto") */
  protected readonly hasSaved = signal(false);

  protected readonly maxLength = computed(() => (this.mode() === 'intake' ? INTAKE_MESSAGE_MAX : QUESTION_MAX));
  protected readonly minLength = computed(() => (this.mode() === 'intake' ? 1 : 3));

  private typingTimer: ReturnType<typeof setInterval> | undefined;
  private hideTimer: ReturnType<typeof setTimeout> | undefined;
  private request: AbortController | undefined;
  private readonly reducedMotion = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;

  constructor() {
    const destroyRef = inject(DestroyRef);
    afterNextRender(() => {
      this.hasSaved.set((this.intakeService.load()?.messages.length ?? 0) > 1);
      const place = () => this.placeNearHead();
      place();
      window.addEventListener('resize', place);

      // Móvil: al abrirse el teclado, el campo del chat queda pegado encima de él
      const input = this.host.nativeElement.querySelector<HTMLInputElement>('#ask-input');
      const stopKeyboard = input ? keepAboveKeyboard(input, input.closest('form') ?? input) : undefined;

      destroyRef.onDestroy(() => {
        stopKeyboard?.();
        window.removeEventListener('resize', place);
        clearInterval(this.typingTimer);
        clearTimeout(this.hideTimer);
        this.request?.abort();
      });
    });
  }

  protected onInput(event: Event) {
    this.question.set((event.target as HTMLInputElement).value);
  }

  protected submit() {
    // Si se envió con el teclado desde el botón, el foco vuelve al campo (el botón se desactiva mientras piensa)
    this.host.nativeElement.querySelector<HTMLInputElement>('#ask-input')?.focus();
    if (this.mode() === 'intake') {
      this.reply();
    } else {
      this.ask();
    }
  }

  // ===== Preguntas rápidas =====

  async ask(text = this.question()) {
    const question = text.trim();
    if (question.length < 3 || this.status() === 'thinking') {
      return;
    }

    this.mode.set('ask');
    this.prepareBubble(question);

    // Si aún llegaba otra respuesta, se cancela para que no se mezclen
    const request = this.newRequest();
    try {
      let text = '';
      for await (const piece of this.askService.ask(question, request.signal)) {
        text += piece;
        if (this.status() === 'thinking') {
          this.startReveal('answer');
        }
        this.fullAnswer.set(text);
      }
      if (text.trim().length === 0) {
        this.showAnswer(ASK_FALLBACK, 'error');
        return;
      }
      this.done.set(true);
    } catch (error) {
      if (request.signal.aborted) {
        return;
      }
      if (error instanceof AskError) {
        this.showAnswer(error.message, 'error');
      } else if (this.fullAnswer()) {
        // Se cortó a medias: se deja lo que ya había llegado
        this.done.set(true);
      } else {
        this.showAnswer(ASK_FALLBACK, 'error');
      }
    }
  }

  // ===== Formulario inteligente =====

  /** Empieza la conversación o retoma la que estaba guardada */
  startIntake() {
    const saved = this.intakeService.load();
    this.mode.set('intake');
    this.sendStatus.set('idle');
    this.privacy.set(false);

    if (saved && saved.messages.length > 1) {
      this.messages.set(saved.messages);
      this.intakeData.set(saved.data);
      this.details.set(saved.details);
      this.complete.set(saved.complete);
      this.resumed.set(true);
      const lastUser = [...saved.messages].reverse().find(m => m.role === 'user');
      const lastAssistant = [...saved.messages].reverse().find(m => m.role === 'assistant');
      this.prepareBubble(lastUser?.content ?? '');
      this.showAnswer(lastAssistant?.content ?? INTAKE_GREETING, 'answer');
    } else {
      this.messages.set([{ role: 'assistant', content: INTAKE_GREETING }]);
      this.intakeData.set(emptyIntakeData());
      this.details.set([]);
      this.complete.set(false);
      this.resumed.set(false);
      this.prepareBubble('');
      this.showAnswer(INTAKE_GREETING, 'answer');
      this.persist();
    }
    this.focusInput();
  }

  /** Envía la respuesta del visitante y espera la siguiente pregunta de la IA */
  async reply(text = this.question()) {
    const answer = text.trim();
    if (answer.length === 0 || answer.length > INTAKE_MESSAGE_MAX || this.status() === 'thinking') {
      return;
    }

    this.resumed.set(false);
    this.sendStatus.set('idle');
    const history = [...this.messages(), { role: 'user' as const, content: answer }];
    this.messages.set(history);
    this.persist();
    this.prepareBubble(answer);

    const request = this.newRequest();
    try {
      const result = await this.intakeService.next(history, this.intakeData(), request.signal);
      this.messages.set([...history, { role: 'assistant', content: result.reply }]);
      this.intakeData.set({ ...emptyIntakeData(), ...result.data });
      this.details.set(result.summary ?? []);
      this.complete.set(result.complete);
      this.persist();
      this.showAnswer(result.reply, 'answer');
    } catch (error) {
      if (request.signal.aborted) {
        return;
      }
      // No ha llegado respuesta: se quita el mensaje del historial y se devuelve al campo para reenviarlo
      this.messages.set(history.slice(0, -1));
      this.persist();
      this.question.set(answer);
      this.showAnswer(error instanceof IntakeError ? error.message : 'Ahora mismo no puedo seguir. Inténtalo de nuevo en un momento.', 'error');
    }
  }

  /** Envía la solicitud recogida */
  async sendIntake() {
    if (!this.privacy() || this.sendStatus() === 'sending') {
      return;
    }
    this.sendStatus.set('sending');
    try {
      await this.intakeService.send({
        messages: this.messages(), data: this.intakeData(), details: this.details(), complete: true, updatedAt: Date.now()
      });
      this.sendStatus.set('sent');
      this.intakeService.clear();
      this.hasSaved.set(false);
      this.complete.set(false);
      this.prepareBubble('');
      this.showAnswer(`¡Enviado! A ${PROFILE.firstName} le llega ahora mismo y te responderá lo antes posible. Gracias por contarle tu proyecto.`, 'answer');
      this.mode.set('ask');
    } catch (error) {
      this.sendError.set(error instanceof ContactError ? error.message : 'No se ha podido enviar. Inténtalo de nuevo.');
      this.sendStatus.set('error');
    }
  }

  /** Cambia un dato del resumen con «Editar», sin pasar por la IA */
  editField(change: SummaryEdit) {
    this.intakeData.update(data => editIntakeData(data, change.key, change.value));
    this.details.update(items => items.map(item => (item.key === change.key ? { ...item, value: change.value } : item)));
    this.persist();
  }

  /** Sale del formulario inteligente; la conversación queda guardada para retomarla */
  leaveIntake() {
    this.close();
  }

  /** Borra la conversación guardada y empieza de cero */
  restartIntake() {
    if (this.messages().length > 1 && !confirm('¿Seguro que quieres empezar de nuevo? Se borrará lo que me has contado.')) {
      return;
    }
    this.intakeService.clear();
    this.startIntake();
  }

  close() {
    this.request?.abort();
    clearInterval(this.typingTimer);
    clearTimeout(this.hideTimer);
    if (this.mode() === 'intake') {
      // Si se cierra mientras la IA pensaba, su último mensaje se descarta (no tiene respuesta)
      if (this.status() === 'thinking' && this.messages().at(-1)?.role === 'user') {
        this.messages.update(messages => messages.slice(0, -1));
        this.persist();
      }
      this.hasSaved.set(this.messages().length > 1);
      this.mode.set('ask');
    }
    this.visible.set(false);
    this.status.set('idle');
  }

  // ===== Bocadillos =====

  private prepareBubble(asked: string) {
    clearInterval(this.typingTimer);
    clearTimeout(this.hideTimer);
    this.placeNearHead();
    this.asked.set(asked);
    this.question.set('');
    this.shown.set('');
    this.fullAnswer.set('');
    this.done.set(false);
    this.status.set('thinking');
    this.visible.set(true);
  }

  private newRequest() {
    this.request?.abort();
    return (this.request = new AbortController());
  }

  private persist() {
    if (this.mode() === 'intake') {
      this.intakeService.save({
        messages: this.messages(), data: this.intakeData(), details: this.details(), complete: this.complete()
      });
    }
  }

  private focusInput() {
    setTimeout(() => this.host.nativeElement.querySelector<HTMLInputElement>('#ask-input')?.focus());
  }

  // Muestra un texto completo de una vez en el bocadillo
  private showAnswer(text: string, status: Status) {
    this.fullAnswer.set(text);
    this.done.set(true);
    this.startReveal(status);
  }

  // Escribe la respuesta palabra a palabra, a un ritmo constante (o de golpe si la persona prefiere menos
  // movimiento). Mientras llega de la IA, va un poco por detrás de lo recibido para no quedarse parada esperando
  // y nunca enseña una palabra a medias; cuando ya ha llegado entera, termina más deprisa. Cada palabra nueva
  // aparece con un fundido (.bubble-word en el CSS). Termina cuando ha llegado entera y ya se ha escrito todo.
  private startReveal(status: Status) {
    this.status.set(status);
    clearInterval(this.typingTimer);
    let index = 0;
    let lastStep = 0;
    this.typingTimer = setInterval(() => {
      const text = this.fullAnswer();
      if (this.reducedMotion) {
        index = text.length;
      } else {
        const pending = text.slice(index);
        const lead = pending.match(/^\s*/)![0].length;
        const words = pending.slice(lead).match(/\S+\s*/g) ?? [];
        // Mientras llega, la última palabra puede estar a medias: se espera a la siguiente
        const ready = this.done() ? words.length : Math.max(0, words.length - 1);
        const since = performance.now() - lastStep;
        // Terminada: varias palabras por paso si quedan muchas. Llegando: se guarda un colchón de 2 palabras para
        // que las pausas breves de la IA no se noten (más deprisa si se acumulan; si no llega nada, una cada medio
        // segundo). Ritmos probados con respuestas simuladas a la velocidad del mini PC.
        let step = 0;
        if (this.done()) {
          step = Math.ceil(ready / 25);
        } else if (ready >= 4 && since >= 90) {
          step = ready > 6 ? 2 : 1;
        } else if ((ready >= 2 && since >= 220) || (ready >= 1 && since >= 500)) {
          step = 1;
        }
        if (step > 0) {
          index += lead + words.slice(0, step).join('').length;
          lastStep = performance.now();
        }
      }
      this.shown.set(text.slice(0, index));
      // Si el bocadillo es más bajo que el texto, lo va siguiendo hacia abajo
      const box = this.host.nativeElement.querySelector('.gm-bubble__scroll');
      if (box) {
        box.scrollTop = box.scrollHeight;
      }
      if (this.done() && index >= text.length) {
        clearInterval(this.typingTimer);
        // En el formulario inteligente el bocadillo se queda: es la conversación
        if (this.mode() === 'ask') {
          this.scheduleHide();
        }
      }
    }, 50);
  }

  /** El texto en palabras (con su espacio detrás), para que cada palabra nueva aparezca con un fundido */
  protected words(text: string) {
    return text.match(/\s+|\S+\s*/g) ?? [];
  }

  private scheduleHide() {
    this.hideTimer = setTimeout(() => this.visible.set(false), HIDE_AFTER_MS);
  }

  // Calcula dónde queda la cabeza de la chica en pantalla (el dibujo cubre la ventana con object-fit: cover)
  // y coloca el bocadillo delante de su cara (a la izquierda) si cabe, si no detrás; en móvil, a todo el ancho.
  private placeNearHead() {
    const content = this.host.nativeElement.closest('.content');
    if (!content) {
      return;
    }
    // Ancho visible sin la barra de desplazamiento, para no pegar el bocadillo al borde
    const vw = document.documentElement.clientWidth;
    const vh = window.innerHeight;
    // El dibujo se recorta para cubrir su lienzo (que ocupa toda la ventana, barra incluida)
    const scene = document.querySelector('.scene-bg')?.getBoundingClientRect();
    const sceneWidth = scene?.width || vw;
    const sceneHeight = scene?.height || vh;
    const imageWidth = Math.max(sceneWidth, sceneHeight * IMAGE_RATIO);
    const imageHeight = imageWidth / IMAGE_RATIO;
    const headX = (sceneWidth - imageWidth) / 2 + HEAD.x * imageWidth;
    const headY = (sceneHeight - imageHeight) / 2 + HEAD.y * imageHeight;

    // Debajo del menú
    const navBottom = document.querySelector('header')?.getBoundingClientRect().bottom ?? 75;
    let top = Math.max(navBottom + MARGIN, headY - 40);
    const spaceRight = vw - headX - 40 - MARGIN;

    // Todo se mide como si la página estuviera arriba del todo (sumando el desplazamiento): en el móvil, al
    // desplazarse, la barra del navegador aparece y desaparece y lanza "resize"; medido sobre la ventana,
    // el bocadillo se recolocaba y bajaba con la página.
    const scrollY = window.scrollY;
    const titleTop = (content.querySelector('h1')?.getBoundingClientRect().top ?? vh) + scrollY;
    // Hasta dónde puede bajar un bocadillo que ocupe de `from` a `to` en horizontal: hasta el título o, si
    // pasa por encima de la foto (que va sobre el título), hasta la foto
    const photo = content.querySelector('.hero-photo')?.getBoundingClientRect();
    const limitFor = (from: number, to: number) =>
      photo && from < photo.right && to > photo.left ? photo.top + scrollY : titleTop;
    // Coordenadas relativas al bloque de contenido (que es el contenedor posicionado)
    const box = content.getBoundingClientRect();
    const boxTop = box.top + scrollY;
    const faceX = (sceneWidth - imageWidth) / 2 + FACE.x * imageWidth;
    const faceY = (sceneHeight - imageHeight) / 2 + FACE.y * imageHeight;

    // Escritorio con foto: el bocadillo sale a su lado, con la cola hacia ella (la foto es quien "habla")
    if (vw >= 768 && photo) {
      const photoMiddle = (photo.top + photo.bottom) / 2 + scrollY;
      const spaceLeft = photo.left - TAIL - 6 - MARGIN;
      const spaceAfter = vw - photo.right - TAIL - 6 - MARGIN;
      if (spaceLeft >= 220 || spaceAfter >= 220) {
        const onLeft = spaceLeft >= spaceAfter;
        const width = Math.min(BUBBLE_WIDTH, onLeft ? spaceLeft : spaceAfter);
        const left = onLeft ? photo.left - TAIL - 6 - width : photo.right + TAIL + 6;
        // Se apoya un poco por debajo de la mitad de la foto (sin bajar al título) y crece hacia arriba
        const bottom = Math.min(photoMiddle + 40, titleTop - 12);
        const maxHeight = Math.max(96, bottom - (navBottom + MARGIN));
        const tailBottom = Math.max(12, Math.min(bottom - photoMiddle - 9, maxHeight - 30));
        this.placement.set({
          left: left - box.left, top: null, bottom: boxTop + box.height - bottom,
          width, maxHeight, side: onLeft ? 'left' : 'right', tailBottom
        });
        return;
      }
    }

    if (vw >= 768 && faceX - TAIL - MARGIN >= 260) {
      // Escritorio: delante de su cara (mira a la izquierda, hacia el portátil), con la cola hacia ella.
      // Se ancla por abajo, a la altura de la cara (o encima del título), y crece hacia arriba.
      const width = Math.min(BUBBLE_WIDTH, faceX - TAIL - MARGIN);
      const left = faceX - TAIL - width;
      const bottom = Math.min(faceY + 40, limitFor(left, left + width) - 12);
      // nunca por debajo del menú (en ventanas bajas queda más bajito y el texto se desplaza dentro)
      const maxHeight = Math.max(96, bottom - (navBottom + MARGIN));
      const tailBottom = Math.max(12, Math.min(bottom - faceY - 9, maxHeight - 30));
      this.placement.set({
        left: left - box.left, top: null, bottom: boxTop + box.height - bottom,
        width, maxHeight, side: 'left', tailBottom
      });
      return;
    }

    let left: number;
    let width: number;
    let side: Placement['side'];
    let maxHeight: number;
    if (vw >= 768 && spaceRight >= 260) {
      // Si delante no cabe: detrás de la cabeza, sin bajar más allá del título
      side = 'right';
      width = Math.min(BUBBLE_WIDTH, spaceRight);
      left = headX + 40;
      maxHeight = Math.max(140, limitFor(left, left + width) - 12 - top);
    } else {
      // Móvil y tableta: a todo el ancho, en el hueco entre el saludo (arriba) y el chat (abajo); si no
      // cabe, el texto se desplaza dentro
      side = 'top';
      left = MARGIN;
      width = vw - MARGIN * 2;
      const above = content.querySelector('.hero-subtitle') ?? content.querySelector('h1') ?? content;
      top = above.getBoundingClientRect().bottom + scrollY + 8;
      const belowTop = (content.querySelector('.gm-chat-input')?.getBoundingClientRect().top ?? vh) + scrollY;
      maxHeight = Math.max(140, belowTop - 8 - top);
    }

    this.placement.set({ left: left - box.left, top: top - boxTop, bottom: null, width, maxHeight, side, tailBottom: 0 });
  }
}
