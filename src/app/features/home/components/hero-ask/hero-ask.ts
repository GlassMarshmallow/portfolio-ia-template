import { Component, DestroyRef, ElementRef, afterNextRender, computed, inject, signal } from '@angular/core';
import type { ChatMessage, IntakeData, SummaryItem } from '../../../../core/models/intake.models';
import { ASK_FALLBACK, AskError, AskService } from '../../../../core/services/ask.service';
import { ContactError } from '../../../../core/services/contact.service';
import {
  INTAKE_GREETING, INTAKE_MESSAGE_MAX, IntakeError, IntakeService, emptyIntakeData
} from '../../../../core/services/intake.service';
import { AiNotice } from '../../../../shared/components/ai-notice/ai-notice';
import { Icon } from '../../../../shared/components/icon/icon';
import { linkifyKnown } from '../../../../shared/utils/known-links';
import { IntakeSummary } from '../intake-summary/intake-summary';
import { HERO } from '../../../../core/data/hero.data';
import { PROFILE } from '../../../../core/data/profile.data';

// Dos formas de hablar con la IA, en bocadillos de cómic junto a la cabeza de la chica del dibujo:
// - Preguntas rápidas sobre la persona del portfolio (API /api/ask).
// - "Quiero un proyecto": formulario inteligente; la IA va preguntando, rellena la solicitud y, al final,
//   el visitante la revisa y la envía. La conversación se guarda en el navegador para poder retomarla.

// Proporción de la ilustración y posición de la cabeza: en src/app/core/data/hero.data.ts
const IMAGE_RATIO = HERO.imageRatio;
const HEAD = HERO.head;
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
  top: number;
  width: number;
  /** Alto máximo para no tapar el título "Hola, soy …" */
  maxHeight: number;
  side: 'right' | 'left' | 'top';
  /** Posición horizontal de la cola cuando el bocadillo va bajo la cabeza (móvil) */
  tailX: number;
}

// Campos del resumen final, en el orden en que se enseñan
const SUMMARY_FIELDS: { key: 'nombre' | 'correo' | 'telefono' | 'empresa' | 'negocio' | 'necesita'; label: string }[] = [
  { key: 'nombre', label: 'Nombre' },
  { key: 'correo', label: 'Correo' },
  { key: 'telefono', label: 'Teléfono' },
  { key: 'empresa', label: 'Empresa' },
  { key: 'negocio', label: 'Negocio' },
  { key: 'necesita', label: 'Necesitas' }
];

@Component({
  selector: 'app-hero-ask',
  imports: [Icon, IntakeSummary, AiNotice],
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
  protected readonly placement = signal<Placement>({ left: 0, top: 0, width: BUBBLE_WIDTH, maxHeight: 400, side: 'right', tailX: 0 });
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
  /** Detalles del proyecto ya etiquetados por el servidor (productos, horarios, marca…) */
  protected readonly details = signal<SummaryItem[]>([]);
  // Resumen: los datos básicos, los detalles del guion y el resumen que redacta la IA
  protected readonly summary = computed(() => [
    ...SUMMARY_FIELDS.map(field => ({ label: field.label, value: this.intakeData()[field.key].trim() })),
    ...this.details(),
    { label: 'Resumen', value: this.intakeData().comentarios.trim() }
  ].filter(field => field.value.length > 0));
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
      destroyRef.onDestroy(() => {
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

  /** Para corregir algo del resumen: el visitante lo dice en el chat y la IA actualiza los datos */
  correct() {
    const message = 'Claro, dime qué quieres cambiar o añadir.';
    this.complete.set(false);
    this.messages.update(messages => [...messages, { role: 'assistant', content: message }]);
    this.persist();
    this.prepareBubble('');
    this.showAnswer(message, 'answer');
    this.focusInput();
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

  // Escribe la respuesta letra a letra según va llegando (o de golpe si la persona prefiere menos
  // movimiento). Termina cuando ha llegado entera y ya se ha escrito todo.
  private startReveal(status: Status) {
    this.status.set(status);
    clearInterval(this.typingTimer);
    let index = 0;
    this.typingTimer = setInterval(() => {
      const text = this.fullAnswer();
      index = this.reducedMotion ? text.length : Math.min(index + 2, text.length);
      this.shown.set(text.slice(0, index));
      // Si el bocadillo es más bajo que el texto, lo va siguiendo hacia abajo
      const box = this.host.nativeElement.querySelector('.bubble-scroll');
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
    }, 22);
  }

  private scheduleHide() {
    this.hideTimer = setTimeout(() => this.visible.set(false), HIDE_AFTER_MS);
  }

  // Calcula dónde queda la cabeza de la chica en pantalla (el dibujo cubre la ventana con object-fit: cover)
  // y coloca el bocadillo a su derecha si cabe, o a su izquierda (en móvil).
  private placeNearHead() {
    const content = this.host.nativeElement.closest('.content');
    if (!content) {
      return;
    }
    // Ancho visible sin la barra de desplazamiento, para no pegar el bocadillo al borde
    const vw = document.documentElement.clientWidth;
    const vh = window.innerHeight;
    const imageWidth = Math.max(vw, vh * IMAGE_RATIO);
    const imageHeight = imageWidth / IMAGE_RATIO;
    const headX = (vw - imageWidth) / 2 + HEAD.x * imageWidth;
    const headY = (vh - imageHeight) / 2 + HEAD.y * imageHeight;

    const navBottom = document.querySelector('header')?.getBoundingClientRect().bottom ?? 75;
    let top = Math.max(navBottom + MARGIN, headY - 40);
    const spaceRight = vw - headX - 40 - MARGIN;

    let left: number;
    let width: number;
    let side: Placement['side'];
    let tailX = 0;
    if (vw >= 768 && spaceRight >= 260) {
      // Escritorio: a la derecha de la cabeza
      side = 'right';
      width = Math.min(BUBBLE_WIDTH, spaceRight);
      left = headX + 40;
    } else if (vw >= 768 && headX - 30 - MARGIN >= 260) {
      // A la izquierda de la cabeza
      side = 'left';
      width = Math.min(BUBBLE_WIDTH, headX - 30 - MARGIN);
      left = headX - 30 - width;
    } else {
      // Móvil y tableta: a todo el ancho, debajo del menú, con la cola hacia arriba apuntando a la cabeza
      side = 'top';
      left = MARGIN;
      width = vw - MARGIN * 2;
      tailX = Math.min(Math.max(headX - left, 28), width - 28);
    }

    // Que no baje más allá del título: si no cabe, el bocadillo se acorta y su texto se desplaza dentro
    const titleTop = content.querySelector('h1')?.getBoundingClientRect().top ?? vh;
    const maxHeight = Math.max(140, titleTop - 12 - top);

    // Coordenadas relativas al bloque de contenido (que es el contenedor posicionado)
    const box = content.getBoundingClientRect();
    this.placement.set({ left: left - box.left, top: top - box.top, width, maxHeight, side, tailX });
  }
}
