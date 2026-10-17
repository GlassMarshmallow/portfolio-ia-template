import { Component, inject } from '@angular/core';
import { AiInfoService } from '../../../core/services/ai-info.service';

// Aviso de que las respuestas son de una IA (gm-ai-notice), con el enlace a "Información sobre la IA".
@Component({
  selector: 'app-ai-notice',
  template: `
    <p class="gm-ai-notice">
      Respuestas generadas con IA a partir de mi perfil; pueden contener errores.
      <button type="button" class="gm-ai-notice__link" (click)="aiInfo.open()">Más información</button>
    </p>
  `
})
export class AiNotice {
  protected readonly aiInfo = inject(AiInfoService);
}
