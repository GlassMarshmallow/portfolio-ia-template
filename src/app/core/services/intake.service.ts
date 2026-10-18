import { Injectable, inject } from '@angular/core';
import type { ChatMessage, IntakeData, IntakeReply, IntakeState } from '../models/intake.models';
import { ContactService } from './contact.service';
import { PROFILE } from '../data/profile.data';

/** Error con un mensaje listo para enseñar al visitante */
export class IntakeError extends Error {}

export const INTAKE_GREETING =
  `¡Qué bien! Soy el asistente con IA de ${PROFILE.firstName}: te haré unas preguntas sobre tu proyecto y, al final, revisarás el resumen antes de enviárselo. Si te surge alguna duda, pregúntame. ¿Qué te gustaría crear?`;
export const INTAKE_MESSAGE_MAX = 500;

const STORAGE_KEY = 'portfolio-formulario-inteligente';
// Una conversación sin tocar durante una semana se descarta
const EXPIRES_MS = 7 * 24 * 60 * 60 * 1000;
const FALLBACK = 'Ahora mismo no puedo seguir. Tu conversación está guardada: inténtalo de nuevo en un momento.';

export const emptyIntakeData = (): IntakeData => ({
  nombre: '', empresa: '', correo: '', telefono: '', negocio: '',
  necesita: '', comentarios: '', detalles: {}, respondidas: [], preguntas: [], pendiente: null, tipos: null
});

const list = (value: string) => (value.trim() ? [value.trim()] : []);

// Datos del resumen que se envían en su propio campo (no en «detalles»)
const FIELD_KEYS = ['necesita', 'negocio', 'nombre', 'correo', 'telefono', 'empresa'];

/** Cambia un dato del resumen (botón «Editar»): en su campo propio o en los detalles */
export function editIntakeData(data: IntakeData, key: string, value: string): IntakeData {
  const field = key as 'necesita' | 'negocio' | 'nombre' | 'correo' | 'telefono' | 'empresa';
  return FIELD_KEYS.includes(key) ? { ...data, [field]: value } : { ...data, detalles: { ...data.detalles, [key]: value } };
}

// Formulario «Quiero un proyecto» (API /api/intake): el servidor elige cada pregunta (con ayuda de la IA) y va
// rellenando la solicitud. La conversación se guarda en este navegador para retomarla donde se quedó.
@Injectable({ providedIn: 'root' })
export class IntakeService {
  private readonly contactService = inject(ContactService);

  /** Conversación guardada, si la hay y no ha caducado */
  load(): IntakeState | null {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null') as IntakeState | null;
      if (!saved || !Array.isArray(saved.messages) || Date.now() - saved.updatedAt > EXPIRES_MS) {
        return null;
      }
      return { ...saved, data: { ...emptyIntakeData(), ...saved.data }, details: saved.details ?? [] };
    } catch {
      return null;
    }
  }

  save(state: Omit<IntakeState, 'updatedAt'>) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...state, updatedAt: Date.now() }));
    } catch {
      // Sin almacenamiento (modo privado, etc.): la conversación sigue, pero no se podrá retomar
    }
  }

  clear() {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Nada que borrar
    }
  }

  /** Envía la respuesta y devuelve la siguiente pregunta con los datos actualizados. */
  async next(messages: ChatMessage[], data: IntakeData, signal: AbortSignal): Promise<IntakeReply> {
    const response = await fetch('/api/intake', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages, data }),
      signal
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok || typeof body.reply !== 'string') {
      throw new IntakeError(body.error ?? FALLBACK);
    }
    return body as IntakeReply;
  }

  /** Envía la solicitud recogida, con la conversación completa. */
  send(state: IntakeState): Promise<void> {
    const d = state.data;
    return this.contactService.send({
      nombre: d.nombre,
      empresa: d.empresa,
      correo: d.correo,
      telefono: d.telefono,
      negocio: d.negocio,
      necesita: list(d.necesita),
      objetivos: [],
      gestionActual: [],
      comentarios: d.comentarios,
      detalles: state.details.filter(item => !item.key || !FIELD_KEYS.includes(item.key)),
      origen: 'asistente',
      conversacion: state.messages,
      web: ''
    });
  }
}
