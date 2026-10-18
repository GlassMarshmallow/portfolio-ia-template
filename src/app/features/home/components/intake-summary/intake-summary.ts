import { Component, ElementRef, computed, inject, input, model, output, signal } from '@angular/core';
import type { SummaryItem } from '../../../../core/models/intake.models';
import { PROFILE } from '../../../../core/data/profile.data';

/** Cambio de un dato del resumen hecho con «Editar» */
export interface SummaryEdit {
  key: string;
  value: string;
}

// Datos que no se pueden dejar vacíos y los que se escriben en una sola línea
const REQUIRED = ['necesita', 'nombre', 'correo'];
const SINGLE_LINE = ['nombre', 'correo', 'telefono', 'empresa', 'valoracion'];
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Bloques del resumen, en este orden. Lo que no está en «contacto» ni en «para terminar» es del proyecto
const CONTACT = ['nombre', 'correo', 'telefono', 'empresa'];
const CLOSING = ['extra', 'valoracion', 'preguntas'];

// Resumen de la solicitud que ha recogido el formulario: el visitante lo revisa, cambia lo que quiera con
// «Editar» (sin pasar por la IA), acepta la privacidad y lo envía.
@Component({
  selector: 'app-intake-summary',
  templateUrl: './intake-summary.html',
  styleUrl: './intake-summary.css'
})
export class IntakeSummary {
  protected readonly profile = PROFILE;
  readonly summary = input.required<SummaryItem[]>();
  readonly sendStatus = input<'idle' | 'sending' | 'sent' | 'error'>('idle');
  readonly sendError = input('');
  readonly privacy = model(false);
  readonly send = output();
  readonly edit = output<SummaryEdit>();

  /** Los datos en bloques con su subtítulo (los que no tienen datos no se enseñan) */
  protected readonly groups = computed(() => {
    const fields = this.summary();
    return [
      { title: 'Tu proyecto', fields: fields.filter(f => !CONTACT.includes(f.key ?? '') && !CLOSING.includes(f.key ?? '')) },
      { title: 'Tus datos de contacto', fields: fields.filter(f => CONTACT.includes(f.key ?? '')) },
      { title: 'Para terminar', fields: fields.filter(f => CLOSING.includes(f.key ?? '')) }
    ].filter(group => group.fields.length > 0);
  });

  protected readonly editing = signal<string | null>(null);
  protected readonly draft = signal('');
  protected readonly editError = signal('');

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  protected canEdit(field: SummaryItem) {
    return !!field.key && field.key !== 'preguntas' && this.sendStatus() !== 'sending';
  }

  protected singleLine(key: string) {
    return SINGLE_LINE.includes(key);
  }

  protected startEdit(field: SummaryItem) {
    this.editing.set(field.key!);
    this.draft.set(field.value);
    this.editError.set('');
    setTimeout(() => this.host.nativeElement.querySelector<HTMLElement>('.summary-input')?.focus());
  }

  protected save(key: string) {
    const value = this.draft().trim();
    if (REQUIRED.includes(key) && value.length === 0) {
      this.editError.set('Este dato no puede quedar vacío.');
      return;
    }
    if (key === 'correo' && !EMAIL.test(value)) {
      this.editError.set('Ese correo no parece completo. Por ejemplo: nombre@ejemplo.com');
      return;
    }
    this.edit.emit({ key, value });
    this.close(key);
  }

  protected cancel(key: string) {
    this.close(key);
  }

  // Al terminar de editar, el foco vuelve a su botón «Editar»
  private close(key: string) {
    this.editing.set(null);
    this.editError.set('');
    setTimeout(() => this.host.nativeElement.querySelector<HTMLElement>(`[data-edit="${key}"]`)?.focus());
  }
}
