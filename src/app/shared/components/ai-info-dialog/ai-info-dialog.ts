import { Component, ElementRef, effect, inject, viewChild } from '@angular/core';
import { AiInfoService } from '../../../core/services/ai-info.service';
import { CloseButton } from '../close-button/close-button';
import { PROFILE } from '../../../core/data/profile.data';

// Información sobre el uso de IA en el portfolio (transparencia: ley europea de IA y protección de datos).
// Es un <dialog> nativo: el foco queda dentro, se cierra con Escape y devuelve el foco al botón que lo abrió.
@Component({
  selector: 'app-ai-info-dialog',
  imports: [CloseButton],
  templateUrl: './ai-info-dialog.html',
  styleUrl: './ai-info-dialog.css'
})
export class AiInfoDialog {
  protected readonly profile = PROFILE;

  protected readonly service = inject(AiInfoService);
  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');

  constructor() {
    effect(() => {
      const dialog = this.dialog().nativeElement;
      if (this.service.isOpen() && !dialog.open) {
        dialog.showModal();
      } else if (!this.service.isOpen() && dialog.open) {
        dialog.close();
      }
    });
  }

  // Clic fuera de la ventana (en el fondo oscurecido): se cierra
  protected onBackdropClick(event: MouseEvent) {
    if (event.target === this.dialog().nativeElement) {
      this.service.close();
    }
  }
}
