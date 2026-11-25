import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';
import { finalize, timeout } from 'rxjs';
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
  private readonly cdr = inject(ChangeDetectorRef);

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
    this.tiendaService
      .listar()
      .pipe(
        timeout(8000),
        finalize(() => {
          this.cargando = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: (lista) => {
          this.tiendas = (lista || []).sort((a, b) => a.idTienda - b.idTienda);
          this.cdr.detectChanges();
        },
        error: (err: HttpErrorResponse) => {
          const body = err.error as ErrorResponse | undefined;
          this.mensajeError = body?.mensaje || 'No se pudo cargar la lista de tiendas.';
          this.cdr.detectChanges();
        }
      });
  }

  abrirModalNueva(): void {
    this.tiendaEditando = null;
    this.errorFormulario = null;
    this.guardando = false;
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
    this.cdr.detectChanges();
  }

  abrirModalEditar(tienda: TiendaResponseDTO): void {
    this.tiendaEditando = tienda;
    this.errorFormulario = null;
    this.guardando = false;
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
    this.cdr.detectChanges();
  }

  cerrarModal(): void {
    if (this.guardando) return;
    this.mostrarModal = false;
    this.errorFormulario = null;
    this.cdr.detectChanges();
  }

  guardarTienda(): void {
    if (this.guardando) return;
    if (this.tiendaForm.invalid) {
      this.tiendaForm.markAllAsTouched();
      return;
    }

    this.guardando = true;
    this.errorFormulario = null;
    this.mensajeExito = null;
    this.mensajeError = null;
    this.cdr.detectChanges();

    const val = this.tiendaForm.value;

    if (this.tiendaEditando) {
      const dtoUpdate: TiendaUpdateDTO = {
        nombreTienda: val.nombreTienda.trim(),
        direccion: val.direccion.trim(),
        telefono: val.telefono.trim(),
        usuarioAdmin: val.usuarioAdmin.trim()
      };

      this.tiendaService
        .actualizar(this.tiendaEditando.idTienda, dtoUpdate)
        .pipe(
          timeout(10000),
          finalize(() => {
            this.guardando = false;
            this.cdr.detectChanges();
          })
        )
        .subscribe({
          next: () => {
            this.guardando = false;
            this.mostrarModal = false;
            this.tiendaEditando = null;
            this.mensajeExito = `Tienda "${dtoUpdate.nombreTienda}" actualizada con éxito.`;
            this.cargarTiendas();
            this.cdr.detectChanges();
          },
          error: (err: HttpErrorResponse) => {
            this.guardando = false;
            const body = err.error as ErrorResponse | undefined;
            this.errorFormulario = body?.mensaje || 'No se pudo actualizar la tienda.';
            this.cdr.detectChanges();
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

      this.tiendaService
        .crear(dtoCreate)
        .pipe(
          timeout(10000),
          finalize(() => {
            this.guardando = false;
            this.cdr.detectChanges();
          })
        )
        .subscribe({
          next: () => {
            this.guardando = false;
            this.mostrarModal = false;
            this.tiendaForm.reset();
            this.mensajeExito = `Tienda "${dtoCreate.nombreTienda}" creada con éxito.`;
            this.cargarTiendas();
            this.cdr.detectChanges();
          },
          error: (err: HttpErrorResponse) => {
            this.guardando = false;
            const body = err.error as ErrorResponse | undefined;
            this.errorFormulario = body?.mensaje || 'No se pudo registrar la tienda.';
            this.cdr.detectChanges();
          }
        });
    }
  }

  darDeBajaTienda(tienda: TiendaResponseDTO): void {
    const ok = window.confirm(
      `¿Deseas dar de baja a "${tienda.nombreTienda}"? Ni su administrador ni sus clientes podrán iniciar sesión.`
    );
    if (!ok) return;

    this.tiendaService
      .darDeBaja(tienda.idTienda)
      .pipe(
        timeout(8000),
        finalize(() => this.cdr.detectChanges())
      )
      .subscribe({
        next: () => {
          this.mensajeExito = `La tienda "${tienda.nombreTienda}" fue dada de baja.`;
          this.cargarTiendas();
          this.cdr.detectChanges();
        },
        error: (err: HttpErrorResponse) => {
          const body = err.error as ErrorResponse | undefined;
          this.mensajeError = body?.mensaje || 'No se pudo dar de baja la tienda.';
          this.cdr.detectChanges();
        }
      });
  }
}