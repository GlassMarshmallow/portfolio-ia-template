import { Injectable } from '@angular/core';
import { PROFILE } from '../data/profile.data';

/** Error con un mensaje listo para enseñar al visitante */
export class AskError extends Error {}

export const ASK_FALLBACK = `Ahora mismo no puedo responder. Puedes escribirme a ${PROFILE.email}.`;

// Preguntas sobre ti a la API (/api/ask), que responde con IA.
@Injectable({ providedIn: 'root' })
export class AskService {
  /**
   * Envía la pregunta y devuelve la respuesta por trozos según la IA la genera.
   * Si la API responde con un error, lanza un AskError con su mensaje.
   */
  async *ask(question: string, signal: AbortSignal): AsyncGenerator<string> {
    const response = await fetch('/api/ask', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question }),
      signal
    });

    // Los errores llegan como JSON; la respuesta buena llega como texto, por trozos
    if (!response.ok || !response.body || response.headers.get('Content-Type')?.includes('json')) {
      const data = await response.json().catch(() => ({}));
      throw new AskError(data.error ?? ASK_FALLBACK);
    }

    const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();
    for (let chunk = await reader.read(); !chunk.done; chunk = await reader.read()) {
      yield chunk.value;
    }
  }
}
