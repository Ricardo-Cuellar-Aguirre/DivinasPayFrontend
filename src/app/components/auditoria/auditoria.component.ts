import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ErrorResponse, OperacionResponseDTO } from '../../models/sistema.model';
import { AuthService } from '../../services/auth.service';
import { OperacionService } from '../../services/operacion.service';

@Component({
  selector: 'app-auditoria',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './auditoria.component.html',
  styleUrl: './auditoria.component.css'
})
export class AuditoriaComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly operacionService = inject(OperacionService);

  operaciones: OperacionResponseDTO[] = [];
  limite = 100;
  cargando = true;
  mensajeError: string | null = null;

  ngOnInit(): void {
    this.cargarOperaciones();
  }

  cargarOperaciones(): void {
    const sesion = this.authService.sesionActual;
    if (!sesion) return;

    this.cargando = true;
    this.mensajeError = null;

    const obs$ =
      sesion.rol === 'ADMIN_SISTEMA'
        ? this.operacionService.listarTodas(null, this.limite)
        : this.operacionService.listarPorTienda(sesion.idTienda!, this.limite);

    obs$.subscribe({
      next: (lista) => {
        this.operaciones = lista;
        this.cargando = false;
      },
      error: (err: HttpErrorResponse) => {
        this.cargando = false;
        const body = err.error as ErrorResponse | undefined;
        this.mensajeError = body?.mensaje || 'No se pudo cargar la bitácora de operaciones.';
      }
    });
  }
}