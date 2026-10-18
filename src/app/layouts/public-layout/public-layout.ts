import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Footer } from '../../shared/components/footer/footer';
import { Header } from '../../shared/components/header/header';
import { SceneBackdrop } from '../../shared/components/scene-backdrop/scene-backdrop';

// Marco de la parte pública: fondo, menú, la página que toque y pie.
@Component({
  selector: 'app-public-layout',
  imports: [RouterOutlet, SceneBackdrop, Header, Footer],
  templateUrl: './public-layout.html'
})
export class PublicLayout {}
