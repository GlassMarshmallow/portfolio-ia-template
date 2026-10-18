import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TextPage } from '../../../../shared/components/text-page/text-page';
import { PROFILE } from '../../../../core/data/profile.data';

// Política de privacidad
@Component({
  selector: 'app-privacy',
  imports: [TextPage, RouterLink],
  templateUrl: './privacy.html'
})
export class Privacy {
  protected readonly profile = PROFILE;

}
