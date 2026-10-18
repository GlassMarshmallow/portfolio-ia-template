// Formulario inteligente: conversación con la IA y datos de la solicitud que va rellenando

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface IntakeData {
  nombre: string;
  empresa: string;
  correo: string;
  telefono: string;
  negocio: string;
  necesita: string;
  comentarios: string;
  /** Respuestas a las preguntas que no tienen campo propio, por clave (publico, objetivos…) */
  detalles: Record<string, string>;
  /** Preguntas del guion ya respondidas: así se sabe por cuál se va al retomar la conversación */
  respondidas: string[];
  /** Preguntas que ha hecho el visitante, para que la persona del portfolio las responda */
  preguntas: string[];
  /** Siguiente pregunta (lo decide el servidor) */
  pendiente: string | null;
  /** Tipos de proyecto que ha decidido la IA (null: aún no lo ha decidido) */
  tipos: string[] | null;
}

/** Un dato del resumen, con su etiqueta legible (la pone el servidor) y su clave del guion */
export interface SummaryItem {
  label: string;
  value: string;
  key?: string;
}

/** Lo que se guarda en el navegador para poder retomar la conversación */
export interface IntakeState {
  messages: ChatMessage[];
  data: IntakeData;
  /** Detalles del proyecto ya etiquetados, para el resumen y para el envío */
  details: SummaryItem[];
  complete: boolean;
  updatedAt: number;
}

export interface IntakeReply {
  reply: string;
  data: IntakeData;
  complete: boolean;
  summary: SummaryItem[];
}
