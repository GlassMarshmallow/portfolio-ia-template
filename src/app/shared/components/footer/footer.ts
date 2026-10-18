import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { GITHUB_URL, LINKEDIN_URL, PROFILE } from '../../../core/data/profile.data';

@Component({
  selector: 'app-footer',
  imports: [RouterLink],
  templateUrl: './footer.html'
})
export class Footer {
  protected readonly profile = PROFILE;
  protected readonly githubUrl = GITHUB_URL;
  protected readonly linkedinUrl = LINKEDIN_URL;
  protected readonly year = new Date().getFullYear();
}
