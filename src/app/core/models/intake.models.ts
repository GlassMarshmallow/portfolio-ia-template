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
  /** Tipos de proyecto detectados por la IA (tienda_online, reservas…) */
  tipos: string[];
  /** Respuestas a los temas del guion de consultora, por clave (publico, horarios…) */
  detalles: Record<string, string>;
  /** Temas que no aplican a este proyecto */
  noAplica: string[];
  /** Tema por el que se ha preguntado en el último mensaje (lo decide el servidor) */
  pendiente: string | null;
}

/** Un dato del resumen, con su etiqueta legible (la pone el servidor) */
export interface SummaryItem {
  label: string;
  value: string;
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
