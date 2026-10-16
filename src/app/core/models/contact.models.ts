import type { ChatMessage, SummaryItem } from './intake.models';

// Solicitud de proyecto, tal como se envía a la API (claves en español porque las lees tú, en Telegram)
export interface ContactRequest {
  nombre: string;
  empresa: string;
  correo: string;
  telefono: string;
  negocio: string;
  necesita: string[];
  objetivos: string[];
  gestionActual: string[];
  comentarios: string;
  /** De dónde viene (por ahora, solo del formulario inteligente "Quiero un proyecto") */
  origen: 'asistente';
  conversacion?: ChatMessage[];
  /** Detalles del proyecto recogidos por el formulario inteligente, con su etiqueta */
  detalles?: SummaryItem[];
  /** Campo trampa para bots: las personas no lo ven y siempre va vacío */
  web?: string;
}
