import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, inject } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';
import { ErrorResponse } from '../../models/sistema.model';
import {
  TiendaRequestDTO,
  TiendaResponseDTO,
  TiendaUpdateDTO
} from '../../models/tienda.model';
import { TiendaService } from '../../services/tienda.service';

@Component({
  selector: 'app-tiendas',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './tiendas.component.html',
  styleUrl: './tiendas.component.css'
})
export class TiendasComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly tiendaService = inject(TiendaService);

  tiendas: TiendaResponseDTO[] = [];
  cargando = true;
  guardando = false;
  mostrarModal = false;
  tiendaEditando: TiendaResponseDTO | null = null;

  mensajeExito: string | null = null;
  mensajeError: string | null = null;
  errorFormulario: string | null = null;

  tiendaForm!: FormGroup;

  ngOnInit(): void {
    this.tiendaForm = this.fb.group({
      nombreTienda: ['', [Validators.required, Validators.maxLength(100)]],
      direccion: ['', [Validators.required, Validators.maxLength(150)]],
      telefono: ['', [Validators.required, Validators.pattern(/^[0-9]{9}$/)]],
      usuarioAdmin: ['', [Validators.required, Validators.maxLength(30)]],
      passwordAdmin: [
        '',
        [Validators.required, Validators.minLength(8), Validators.maxLength(72)]
      ]
    });

    this.cargarTiendas();
  }

  cargarTiendas(): void {
    this.cargando = true;
    this.tiendaService.listar().subscribe({
      next: (lista) => {
        this.tiendas = lista;
        this.cargando = false;
      },
      error: (err: HttpErrorResponse) => {
        this.cargando = false;
        const body = err.error as ErrorResponse | undefined;
        this.mensajeError = body?.mensaje || 'No se pudo cargar la lista de tiendas.';
      }
    });
  }

  abrirModalNueva(): void {
    this.tiendaEditando = null;
    this.errorFormulario = null;
    this.tiendaForm.reset({
      nombreTienda: '',
      direccion: '',
      telefono: '',
      usuarioAdmin: '',
      passwordAdmin: ''
    });

    const passCtrl = this.tiendaForm.get('passwordAdmin');
    passCtrl?.setValidators([
      Validators.required,
      Validators.minLength(8),
      Validators.maxLength(72)
    ]);
    passCtrl?.updateValueAndValidity();

    this.mostrarModal = true;
  }

  abrirModalEditar(tienda: TiendaResponseDTO): void {
    this.tiendaEditando = tienda;
    this.errorFormulario = null;
    this.tiendaForm.reset({
      nombreTienda: tienda.nombreTienda,
      direccion: tienda.direccion,
      telefono: tienda.telefono,
      usuarioAdmin: tienda.usuarioAdmin,
      passwordAdmin: ''
    });

    const passCtrl = this.tiendaForm.get('passwordAdmin');
    passCtrl?.clearValidators();
    passCtrl?.updateValueAndValidity();

    this.mostrarModal = true;
  }

  cerrarModal(): void {
    this.mostrarModal = false;
  }

  guardarTienda(): void {
    if (this.tiendaForm.invalid) {
      this.tiendaForm.markAllAsTouched();
      return;
    }

    this.guardando = true;
    this.errorFormulario = null;
    const val = this.tiendaForm.value;

    if (this.tiendaEditando) {
      const dtoUpdate: TiendaUpdateDTO = {
        nombreTienda: val.nombreTienda.trim(),
        direccion: val.direccion.trim(),
        telefono: val.telefono.trim(),
        usuarioAdmin: val.usuarioAdmin.trim()
      };

      this.tiendaService.actualizar(this.tiendaEditando.idTienda, dtoUpdate).subscribe({
        next: () => {
          this.guardando = false;
          this.mostrarModal = false;
          this.mensajeExito = 'Datos de la tienda actualizados correctamente.';
          this.cargarTiendas();
        },
        error: (err: HttpErrorResponse) => {
          this.guardando = false;
          const body = err.error as ErrorResponse | undefined;
          this.errorFormulario = body?.mensaje || 'No se pudo actualizar la tienda.';
        }
      });
    } else {
      const dtoCreate: TiendaRequestDTO = {
        nombreTienda: val.nombreTienda.trim(),
        direccion: val.direccion.trim(),
        telefono: val.telefono.trim(),
        usuarioAdmin: val.usuarioAdmin.trim(),
        passwordAdmin: val.passwordAdmin
      };

      this.tiendaService.crear(dtoCreate).subscribe({
        next: () => {
          this.guardando = false;
          this.mostrarModal = false;
          this.mensajeExito = 'Tienda registrada y habilitada en la plataforma.';
          this.cargarTiendas();
        },
        error: (err: HttpErrorResponse) => {
          this.guardando = false;
          const body = err.error as ErrorResponse | undefined;
          this.errorFormulario = body?.mensaje || 'No se pudo registrar la tienda.';
        }
      });
    }
  }

  darDeBajaTienda(tienda: TiendaResponseDTO): void {
    const ok = window.confirm(
      `¿Deseas dar de baja a "${tienda.nombreTienda}"? Ni su administrador ni sus clientes podrán iniciar sesión.`
    );
    if (!ok) return;

    this.tiendaService.darDeBaja(tienda.idTienda).subscribe({
      next: () => {
        this.mensajeExito = `La tienda "${tienda.nombreTienda}" fue dada de baja.`;
        this.cargarTiendas();
      },
      error: (err: HttpErrorResponse) => {
        const body = err.error as ErrorResponse | undefined;
        this.mensajeError = body?.mensaje || 'No se pudo dar de baja la tienda.';
      }
    });
  }
}