import { Component } from '@angular/core';
import { PROFILE } from '../../../../core/data/profile.data';

@Component({
  selector: 'app-about',
  templateUrl: './about.html'
})
export class About {
  protected readonly profile = PROFILE;
}
