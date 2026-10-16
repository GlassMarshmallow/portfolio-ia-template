import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AiInfoService } from '../../../core/services/ai-info.service';
import { Icon } from '../icon/icon';
import { GITHUB_URL, LINKEDIN_URL, PROFILE } from '../../../core/data/profile.data';

@Component({
  selector: 'app-footer',
  imports: [Icon, RouterLink],
  templateUrl: './footer.html',
  styleUrl: './footer.css'
})
export class Footer {
  protected readonly profile = PROFILE;
  protected readonly githubUrl = GITHUB_URL;
  protected readonly linkedinUrl = LINKEDIN_URL;
  protected readonly year = new Date().getFullYear();

  protected readonly aiInfo = inject(AiInfoService);
}
