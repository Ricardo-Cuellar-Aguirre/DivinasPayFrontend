import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, inject } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';
import { RouterModule } from '@angular/router';
import { SesionAlmacenada } from '../../interceptor/auth.interceptor';
import { ClienteResponseDTO } from '../../models/cliente.model';
import { ErrorResponse } from '../../models/sistema.model';
import { TiendaResponseDTO, TiendaUpdateDTO } from '../../models/tienda.model';
import { AuthService } from '../../services/auth.service';
import { ClienteService } from '../../services/cliente.service';
import { TiendaService } from '../../services/tienda.service';

@Component({
  selector: 'app-configuracion',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './configuracion.component.html',
  styleUrl: './configuracion.component.css'
})
export class ConfiguracionComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly clienteService = inject(ClienteService);
  private readonly tiendaService = inject(TiendaService);

  sesion: SesionAlmacenada | null = null;
  perfilCliente: ClienteResponseDTO | null = null;
  tiendaInfo: TiendaResponseDTO | null = null;

  editandoTienda = false;
  guardando = false;
  cargando = true;
  mensajeExito: string | null = null;
  mensajeError: string | null = null;

  tiendaForm!: FormGroup;

  ngOnInit(): void {
    this.sesion = this.authService.sesionActual;
    if (!this.sesion) return;

    this.tiendaForm = this.fb.group({
      nombreTienda: ['', [Validators.required, Validators.maxLength(100)]],
      direccion: ['', [Validators.required, Validators.maxLength(150)]],
      telefono: ['', [Validators.required, Validators.pattern(/^[0-9]{9}$/)]],
      usuarioAdmin: ['', [Validators.required, Validators.maxLength(30)]]
    });

    if (this.sesion.rol === 'CLIENTE' && this.sesion.idTienda && this.sesion.idCliente) {
      this.cargarPerfilCliente(this.sesion.idTienda, this.sesion.idCliente);
    } else if (this.sesion.rol === 'ADMIN_TIENDA' && this.sesion.idTienda) {
      this.cargarDatosTienda(this.sesion.idTienda);
    } else {
      this.cargando = false;
    }
  }

  private cargarPerfilCliente(idTienda: number, idCliente: number): void {
    this.clienteService.obtener(idTienda, idCliente).subscribe({
      next: (cli) => {
        this.perfilCliente = cli;
        this.cargando = false;
      },
      error: (err: HttpErrorResponse) => {
        this.cargando = false;
        const body = err.error as ErrorResponse | undefined;
        this.mensajeError = body?.mensaje || 'No se pudo cargar tu perfil.';
      }
    });

    this.tiendaService.obtener(idTienda).subscribe({
      next: (t) => (this.tiendaInfo = t),
      error: () => (this.tiendaInfo = null)
    });
  }

  private cargarDatosTienda(idTienda: number): void {
    this.tiendaService.obtener(idTienda).subscribe({
      next: (t) => {
        this.tiendaInfo = t;
        this.tiendaForm.patchValue({
          nombreTienda: t.nombreTienda,
          direccion: t.direccion,
          telefono: t.telefono,
          usuarioAdmin: t.usuarioAdmin
        });
        this.cargando = false;
      },
      error: (err: HttpErrorResponse) => {
        this.cargando = false;
        const body = err.error as ErrorResponse | undefined;
        this.mensajeError = body?.mensaje || 'No se pudieron cargar los datos de la tienda.';
      }
    });
  }

  guardarCambiosTienda(): void {
    if (!this.tiendaInfo || this.tiendaForm.invalid) {
      this.tiendaForm.markAllAsTouched();
      return;
    }

    this.guardando = true;
    this.mensajeError = null;
    this.mensajeExito = null;

    const val = this.tiendaForm.value;
    const dto: TiendaUpdateDTO = {
      nombreTienda: val.nombreTienda.trim(),
      direccion: val.direccion.trim(),
      telefono: val.telefono.trim(),
      usuarioAdmin: val.usuarioAdmin.trim()
    };

    this.tiendaService.actualizar(this.tiendaInfo.idTienda, dto).subscribe({
      next: (actualizada) => {
        this.tiendaInfo = actualizada;
        this.guardando = false;
        this.editandoTienda = false;
        this.mensajeExito = 'Los datos del establecimiento se actualizaron correctamente.';
      },
      error: (err: HttpErrorResponse) => {
        this.guardando = false;
        const body = err.error as ErrorResponse | undefined;
        this.mensajeError = body?.mensaje || 'Error al actualizar los datos de la tienda.';
      }
    });
  }
}