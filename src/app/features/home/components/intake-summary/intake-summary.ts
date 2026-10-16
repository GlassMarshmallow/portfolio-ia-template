import { Component, input, model, output } from '@angular/core';
import { PROFILE } from '../../../../core/data/profile.data';

export interface SummaryField {
  label: string;
  value: string;
}

// Resumen de la solicitud que ha recogido el formulario inteligente: el visitante lo revisa, acepta la
// privacidad y lo envía, o pide corregir algo (se corrige hablando con la IA).
@Component({
  selector: 'app-intake-summary',
  templateUrl: './intake-summary.html',
  styleUrl: './intake-summary.css'
})
export class IntakeSummary {
  protected readonly profile = PROFILE;

  readonly summary = input.required<SummaryField[]>();
  readonly sendStatus = input<'idle' | 'sending' | 'sent' | 'error'>('idle');
  readonly sendError = input('');
  readonly privacy = model(false);
  readonly send = output();
  readonly correct = output();
}
