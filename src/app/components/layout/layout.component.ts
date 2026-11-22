import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { RouterModule } from '@angular/router';
import { SesionAlmacenada } from '../../interceptor/auth.interceptor';
import { TiendaResponseDTO } from '../../models/tienda.model';
import { AuthService } from '../../services/auth.service';
import { TiendaService } from '../../services/tienda.service';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './layout.component.html',
  styleUrl: './layout.component.css'
})
export class LayoutComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly tiendaService = inject(TiendaService);

  sesion: SesionAlmacenada | null = null;
  tiendaActual: TiendaResponseDTO | null = null;
  mostrarAyuda = false;

  ngOnInit(): void {
    this.sesion = this.authService.sesionActual;

    if (this.sesion?.idTienda) {
      this.tiendaService.obtener(this.sesion.idTienda).subscribe({
        next: (tienda) => (this.tiendaActual = tienda),
        error: () => (this.tiendaActual = null)
      });
    }
  }

  get inicialesUsuario(): string {
    if (!this.sesion?.nombre) return 'DP';
    return this.sesion.nombre
      .split(' ')
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() ?? '')
      .join('');
  }

  get etiquetaRol(): string {
    switch (this.sesion?.rol) {
      case 'ADMIN_SISTEMA':
        return 'Administrador del Sistema';
      case 'ADMIN_TIENDA':
        return 'Administrador';
      case 'CLIENTE':
        return 'Cliente';
      default:
        return '';
    }
  }

  toggleAyuda(): void {
    this.mostrarAyuda = !this.mostrarAyuda;
  }

  cerrarSesion(): void {
    this.authService.cerrarSesion();
  }
}