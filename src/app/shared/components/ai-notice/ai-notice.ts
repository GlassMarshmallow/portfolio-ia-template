import { Component, inject } from '@angular/core';
import { AiInfoService } from '../../../core/services/ai-info.service';

// Aviso de que las respuestas son de una IA, con el enlace a "Información sobre la IA".
@Component({
  selector: 'app-ai-notice',
  template: `
    <p class="ask-notice">
      Respuestas generadas con IA a partir de mi perfil; pueden contener errores.
      <button type="button" class="ask-notice-link" (click)="aiInfo.open()">Más información</button>
    </p>
  `,
  styleUrl: './ai-notice.css'
})
export class AiNotice {
  protected readonly aiInfo = inject(AiInfoService);
}
