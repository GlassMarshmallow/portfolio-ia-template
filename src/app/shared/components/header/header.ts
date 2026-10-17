import { Component, DestroyRef, ElementRef, afterNextRender, inject, signal, viewChild } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';

@Component({
  selector: 'app-header',
  templateUrl: './header.html',
  styleUrl: './header.css',
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

  // Solo en el menú del móvil: allí los iconos de redes no están en el inicio, sino en «Conectemos»
  readonly mobileLinks = [...this.links, { href: '/#contacto', label: 'Contacto' }];

  private readonly openButton = viewChild.required<ElementRef<HTMLButtonElement>>('openButton');
  private readonly closeButton = viewChild.required<ElementRef<HTMLButtonElement>>('closeButton');

  protected readonly menuOpen = signal(false);
  /** Enlace de la sección que se está viendo en el inicio (en negrita, aria-current="location"); fuera del inicio, ninguno */
  protected readonly current = signal<string | null>(null);

  constructor() {
    const router = inject(Router);
    let sections: HTMLElement[] = [];
    // La sección marcada es la última cuyo principio ya ha pasado bajo la barra (donde la deja su enlace, por el
    // scroll-padding-top de 80 px); al final de la página, la última, aunque no llegue arriba.
    const update = () => {
      if (!sections.length) {
        this.current.set(null);
        return;
      }
      const atEnd = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2;
      const passed = sections.filter(section => section.getBoundingClientRect().top <= 100);
      const section = atEnd ? sections[sections.length - 1] : passed[passed.length - 1] ?? sections[0];
      this.current.set(`/#${section.id}`);
    };
    const watch = () => {
      sections = this.mobileLinks
        .map(link => document.getElementById(link.href.split('#')[1]))
        .filter((section): section is HTMLElement => !!section);
      update();
    };
    afterNextRender(() => watch());
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    const events = router.events.subscribe(event => {
      if (event instanceof NavigationEnd) {
        setTimeout(watch);
      }
    });
    inject(DestroyRef).onDestroy(() => {
      events.unsubscribe();
      window.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    });
  }

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
    // Lleva el foco al primer enlace del menú al abrirlo (como el menú de GlassMarshmallow)
    setTimeout(() => this.closeButton().nativeElement.closest('.gm-fullscreen-menu')!.querySelector<HTMLElement>('a')?.focus(), 50);
  }

  // Con el menú abierto, el Tab da la vuelta dentro del menú en lugar de salir a la página de detrás.
  protected trapFocus(event: Event) {
    if (!this.menuOpen()) {
      return;
    }
    const menu = this.closeButton().nativeElement.closest('.gm-fullscreen-menu')!;
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
