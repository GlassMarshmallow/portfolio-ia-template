import { Component, inject } from '@angular/core';
import { AiInfoService } from '../../../../core/services/ai-info.service';
import { TextPage } from '../../../../shared/components/text-page/text-page';
import { PROFILE } from '../../../../core/data/profile.data';

// Política de privacidad
@Component({
  selector: 'app-privacy',
  imports: [TextPage],
  templateUrl: './privacy.html'
})
export class Privacy {
  protected readonly profile = PROFILE;

  protected readonly aiInfo = inject(AiInfoService);
}
