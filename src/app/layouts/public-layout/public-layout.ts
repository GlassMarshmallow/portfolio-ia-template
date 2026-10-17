import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AiInfoDialog } from '../../shared/components/ai-info-dialog/ai-info-dialog';
import { Footer } from '../../shared/components/footer/footer';
import { Header } from '../../shared/components/header/header';
import { SceneBackdrop } from '../../shared/components/scene-backdrop/scene-backdrop';

// Marco de la parte pública: fondo, menú, la página que toque y pie.
@Component({
  selector: 'app-public-layout',
  imports: [RouterOutlet, SceneBackdrop, Header, Footer, AiInfoDialog],
  templateUrl: './public-layout.html'
})
export class PublicLayout {}
