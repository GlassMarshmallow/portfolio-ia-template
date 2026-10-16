import { Component, ElementRef, signal, viewChild } from '@angular/core';
import { Icon } from '../icon/icon';

@Component({
  selector: 'app-header',
  imports: [Icon],
  templateUrl: './header.html',
  host: {
    '(document:keydown.escape)': 'closeMenu()',
    '(document:keydown.tab)': 'trapFocus($event)'
  }
})
export class Header {
  readonly links = [
    // Con "/" delante, para que también funcionen desde las páginas de privacidad y aviso legal
    { href: '/#home', label: 'Inicio' },
    { href: '/#about', label: 'Sobre mí' },
    { href: '/#skills', label: 'Habilidades' }
  ];

  private readonly openButton = viewChild.required<ElementRef<HTMLButtonElement>>('openButton');
  private readonly closeButton = viewChild.required<ElementRef<HTMLButtonElement>>('closeButton');

  protected readonly menuOpen = signal(false);
  protected readonly lightTheme = signal(document.documentElement.dataset['theme'] === 'light');

  toggleTheme() {
    const light = !this.lightTheme();
    this.lightTheme.set(light);
    document.documentElement.dataset['theme'] = light ? 'light' : 'dark';
    try {
      localStorage.setItem('theme', light ? 'light' : 'dark');
    } catch {
      // Sin almacenamiento (modo privado): el cambio vale solo para esta visita
    }
  }

  openMenu() {
    this.menuOpen.set(true);
    // Lleva el foco dentro del menú al abrirlo
    setTimeout(() => this.closeButton().nativeElement.focus());
  }

  // Con el menú abierto, el Tab da la vuelta dentro del menú en lugar de salir a la página de detrás.
  protected trapFocus(event: Event) {
    if (!this.menuOpen()) {
      return;
    }
    const menu = this.closeButton().nativeElement.closest('.mobile-menu')!;
    const focusables = [...menu.querySelectorAll<HTMLElement>('button, a[href]')];
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    const keyboard = event as KeyboardEvent;

    if (keyboard.shiftKey && document.activeElement === first) {
      keyboard.preventDefault();
      last.focus();
    } else if (!keyboard.shiftKey && document.activeElement === last) {
      keyboard.preventDefault();
      first.focus();
    }
  }

  closeMenu(returnFocus = true) {
    if (!this.menuOpen()) {
      return;
    }
    this.menuOpen.set(false);
    // Devuelve el foco al botón que lo abrió
    if (returnFocus) {
      this.openButton().nativeElement.focus();
    }
  }
}
