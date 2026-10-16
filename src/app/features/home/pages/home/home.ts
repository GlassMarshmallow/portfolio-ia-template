import { Component, afterNextRender } from '@angular/core';
import { About } from '../../components/about/about';
import { Hero } from '../../components/hero/hero';
import { Skills } from '../../components/skills/skills';

// Página de inicio: todas las secciones del portfolio, una debajo de otra.
@Component({
  selector: 'app-home',
  imports: [Hero, About, Skills],
  templateUrl: './home.html'
})
export class Home {
  constructor() {
    // Si se abre un enlace con sección (/#skills), se va a ella cuando ya está pintada: esta página se
    // carga aparte y el router lo intenta antes de que exista.
    afterNextRender(() => {
      const section = decodeURIComponent(location.hash.slice(1));
      if (section) {
        document.getElementById(section)?.scrollIntoView();
      }
    });
  }
}
