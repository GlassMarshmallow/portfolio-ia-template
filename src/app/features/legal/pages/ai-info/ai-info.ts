import { Component } from '@angular/core';
import { PROFILE } from '../../../../core/data/profile.data';
import { TextPage } from '../../../../shared/components/text-page/text-page';

// Información sobre el uso de IA en el portfolio (transparencia: ley europea de IA y protección de datos).
// Es una página como la de privacidad: se abre desde el aviso del chat, el pie y la política de privacidad.
@Component({
  selector: 'app-ai-info',
  imports: [TextPage],
  templateUrl: './ai-info.html',
  styleUrl: './ai-info.css'
})
export class AiInfo {
  protected readonly profile = PROFILE;
}
