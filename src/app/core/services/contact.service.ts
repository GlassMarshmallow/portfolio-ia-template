import { Injectable } from '@angular/core';
import type { ContactRequest } from '../models/contact.models';
import { PROFILE } from '../data/profile.data';

/** Error con un mensaje listo para enseñar al visitante */
export class ContactError extends Error {}

const CONTACT_FALLBACK = `No he podido recibir tu solicitud. Inténtalo de nuevo en un rato o escríbeme a ${PROFILE.email}.`;

// Envío de las solicitudes de proyecto a la API (/api/contact), que te las hace llegar por Telegram.
@Injectable({ providedIn: 'root' })
export class ContactService {
  /** Envía la solicitud; si no se ha podido, lanza un ContactError con el motivo. */
  async send(request: ContactRequest): Promise<void> {
    let response: Response;
    try {
      response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request)
      });
    } catch {
      throw new ContactError(CONTACT_FALLBACK);
    }
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new ContactError(data.error ?? CONTACT_FALLBACK);
    }
  }
}
