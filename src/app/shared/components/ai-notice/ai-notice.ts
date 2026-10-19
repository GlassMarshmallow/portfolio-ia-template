import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

// Aviso de que las respuestas son de una IA (gm-ai-notice), con el enlace a la página "Información sobre la IA".
@Component({
  selector: 'app-ai-notice',
  imports: [RouterLink],
  template: `
    <p class="gm-ai-notice">
      Respuestas generadas con IA a partir de mi perfil; pueden contener errores.
      <a class="gm-ai-notice__link" routerLink="/informacion-ia">Más información sobre la IA</a>
    </p>
  `
})
export class AiNotice {}
