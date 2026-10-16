import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TextPage } from '../../../../shared/components/text-page/text-page';
import { PROFILE } from '../../../../core/data/profile.data';

// Aviso legal
@Component({
  selector: 'app-legal-notice',
  imports: [TextPage, RouterLink],
  templateUrl: './legal-notice.html'
})
export class LegalNotice {
  protected readonly profile = PROFILE;

}
