import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, inject } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import {
  ClienteRequestDTO,
  ClienteResponseDTO,
  ClienteUpdateDTO,
  TipoCapitalizacion,
  TipoTasa
} from '../../models/cliente.model';
import { ErrorResponse } from '../../models/sistema.model';
import { AuthService } from '../../services/auth.service';
import { ClienteService } from '../../services/cliente.service';

@Component({
  selector: 'app-clientes',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, RouterModule],
  templateUrl: './clientes.component.html',
  styleUrl: './clientes.component.css'
})
export class ClientesComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly clienteService = inject(ClienteService);
  private readonly router = inject(Router);

  idTienda!: number;
  clientes: ClienteResponseDTO[] = [];
  filtroTexto = '';
  soloActivos = true;

  cargando = true;
  guardando = false;
  mostrarModal = false;
  clienteEditando: ClienteResponseDTO | null = null;

  mensajeExito: string | null = null;
  mensajeError: string | null = null;
  errorFormulario: string | null = null;

  readonly capitalizaciones: TipoCapitalizacion[] = [
    'Diaria',
    'Mensual',
    'Bimestral',
    'Trimestral',
    'Semestral',
    'Anual'
  ];

  clienteForm!: FormGroup;

  ngOnInit(): void {
    const sesion = this.authService.sesionActual;
    if (!sesion?.idTienda) {
      this.router.navigate(['/login']);
      return;
    }

    this.idTienda = sesion.idTienda;
    this.inicializarFormulario();
    this.cargarClientes();
  }

  private inicializarFormulario(): void {
    this.clienteForm = this.fb.group({
      nombreCliente: ['', [Validators.required, Validators.maxLength(100)]],
      tipoTasa: ['Efectiva' as TipoTasa, [Validators.required]],
      tasaInteres: [null, [Validators.required, Validators.min(0.0001), Validators.max(200)]],
      capitalizacion: [null as TipoCapitalizacion | null],
      moneda: ['Soles', [Validators.required]],
      limiteMaxCredito: [null, [Validators.required, Validators.min(1)]],
      maxMesesCredito: [6, [Validators.required, Validators.min(1)]],
      fechaCorte: [24, [Validators.required, Validators.min(1), Validators.max(31)]],
      fechaPago: [5, [Validators.required, Validators.min(1), Validators.max(31)]],
      usuarioCliente: ['', [Validators.required, Validators.maxLength(30)]],
      passwordCliente: ['', [Validators.required, Validators.minLength(8), Validators.maxLength(72)]]
    });

    this.clienteForm.get('tipoTasa')?.valueChanges.subscribe((tipo: TipoTasa) => {
      const capCtrl = this.clienteForm.get('capitalizacion');
      if (tipo === 'Nominal') {
        capCtrl?.setValidators([Validators.required]);
        if (!capCtrl?.value) capCtrl?.setValue('Mensual');
      } else {
        capCtrl?.clearValidators();
        capCtrl?.setValue(null);
      }
      capCtrl?.updateValueAndValidity();
    });
  }

  cargarClientes(): void {
    this.cargando = true;
    this.clienteService.listar(this.idTienda).subscribe({
      next: (lista) => {
        this.clientes = lista;
        this.cargando = false;
      },
      error: (err: HttpErrorResponse) => {
        this.cargando = false;
        const body = err.error as ErrorResponse | undefined;
        this.mensajeError = body?.mensaje || 'No se pudo obtener la lista de clientes.';
      }
    });
  }

  get clientesFiltrados(): ClienteResponseDTO[] {
    const q = this.filtroTexto.trim().toLowerCase();
    return this.clientes.filter((c) => {
      const coincideEstado = this.soloActivos ? c.estado : true;
      const coincideTexto =
        !q ||
        c.nombreCliente.toLowerCase().includes(q) ||
        c.usuarioCliente.toLowerCase().includes(q);
      return coincideEstado && coincideTexto;
    });
  }

  abrirModalNuevo(): void {
    this.clienteEditando = null;
    this.errorFormulario = null;
    this.clienteForm.reset({
      nombreCliente: '',
      tipoTasa: 'Efectiva',
      tasaInteres: null,
      capitalizacion: null,
      moneda: 'Soles',
      limiteMaxCredito: null,
      maxMesesCredito: 6,
      fechaCorte: 24,
      fechaPago: 5,
      usuarioCliente: '',
      passwordCliente: ''
    });

    // Habilitar condiciones financieras y contraseña para alta nueva
    this.clienteForm.get('tipoTasa')?.enable();
    this.clienteForm.get('tasaInteres')?.enable();
    this.clienteForm.get('capitalizacion')?.enable();
    this.clienteForm.get('fechaCorte')?.enable();
    this.clienteForm.get('fechaPago')?.enable();
    const passCtrl = this.clienteForm.get('passwordCliente');
    passCtrl?.setValidators([Validators.required, Validators.minLength(8), Validators.maxLength(72)]);
    passCtrl?.updateValueAndValidity();

    this.mostrarModal = true;
  }

  abrirModalEditar(cliente: ClienteResponseDTO): void {
    this.clienteEditando = cliente;
    this.errorFormulario = null;

    this.clienteForm.reset({
      nombreCliente: cliente.nombreCliente,
      tipoTasa: cliente.tipoTasa,
      tasaInteres: cliente.tasaInteres,
      capitalizacion: cliente.capitalizacion,
      moneda: cliente.moneda,
      limiteMaxCredito: cliente.limiteMaxCredito,
      maxMesesCredito: cliente.maxMesesCredito,
      fechaCorte: cliente.fechaCorte,
      fechaPago: cliente.fechaPago,
      usuarioCliente: cliente.usuarioCliente,
      passwordCliente: ''
    });

    // Regla del backend (ClienteController): tasa, capitalización y fechas son inmutables al editar
    this.clienteForm.get('tipoTasa')?.disable();
    this.clienteForm.get('tasaInteres')?.disable();
    this.clienteForm.get('capitalizacion')?.disable();
    this.clienteForm.get('fechaCorte')?.disable();
    this.clienteForm.get('fechaPago')?.disable();

    const passCtrl = this.clienteForm.get('passwordCliente');
    passCtrl?.clearValidators();
    passCtrl?.updateValueAndValidity();

    this.mostrarModal = true;
  }

  cerrarModal(): void {
    this.mostrarModal = false;
  }

  guardarCliente(): void {
    if (this.clienteForm.invalid) {
      this.clienteForm.markAllAsTouched();
      return;
    }

    this.guardando = true;
    this.errorFormulario = null;
    const raw = this.clienteForm.getRawValue();

    if (this.clienteEditando) {
      const dtoUpdate: ClienteUpdateDTO = {
        nombreCliente: raw.nombreCliente.trim(),
        tipoTasa: raw.tipoTasa,
        tasaInteres: Number(raw.tasaInteres),
        capitalizacion: raw.tipoTasa === 'Nominal' ? raw.capitalizacion : null,
        moneda: raw.moneda || 'Soles',
        limiteMaxCredito: Number(raw.limiteMaxCredito),
        maxMesesCredito: Number(raw.maxMesesCredito),
        fechaCorte: Number(raw.fechaCorte),
        fechaPago: Number(raw.fechaPago),
        usuarioCliente: raw.usuarioCliente.trim()
      };

      this.clienteService
        .actualizar(this.idTienda, this.clienteEditando.idCliente, dtoUpdate)
        .subscribe({
          next: () => {
            this.guardando = false;
            this.mostrarModal = false;
            this.mensajeExito = 'Datos del cliente actualizados correctamente.';
            this.cargarClientes();
          },
          error: (err: HttpErrorResponse) => {
            this.guardando = false;
            const body = err.error as ErrorResponse | undefined;
            this.errorFormulario = body?.mensaje || 'Error al actualizar el cliente.';
          }
        });
    } else {
      const dtoCreate: ClienteRequestDTO = {
        nombreCliente: raw.nombreCliente.trim(),
        tipoTasa: raw.tipoTasa,
        tasaInteres: Number(raw.tasaInteres),
        capitalizacion: raw.tipoTasa === 'Nominal' ? raw.capitalizacion : null,
        moneda: 'Soles',
        limiteMaxCredito: Number(raw.limiteMaxCredito),
        maxMesesCredito: Number(raw.maxMesesCredito),
        fechaCorte: Number(raw.fechaCorte),
        fechaPago: Number(raw.fechaPago),
        usuarioCliente: raw.usuarioCliente.trim(),
        passwordCliente: raw.passwordCliente
      };

      this.clienteService.crear(this.idTienda, dtoCreate).subscribe({
        next: () => {
          this.guardando = false;
          this.mostrarModal = false;
          this.mensajeExito = 'Cliente registrado con su línea de crédito activa.';
          this.cargarClientes();
        },
        error: (err: HttpErrorResponse) => {
          this.guardando = false;
          const body = err.error as ErrorResponse | undefined;
          this.errorFormulario = body?.mensaje || 'Error al registrar el cliente.';
        }
      });
    }
  }

  darDeBajaCliente(cliente: ClienteResponseDTO): void {
    const confirmado = window.confirm(
      `¿Deseas dar de baja a ${cliente.nombreCliente}? No podrá realizar nuevas compras a crédito.`
    );
    if (!confirmado) return;

    this.clienteService.darDeBaja(this.idTienda, cliente.idCliente).subscribe({
      next: () => {
        this.mensajeExito = `El cliente ${cliente.nombreCliente} fue dado de baja.`;
        this.cargarClientes();
      },
      error: (err: HttpErrorResponse) => {
        const body = err.error as ErrorResponse | undefined;
        this.mensajeError = body?.mensaje || 'No se pudo dar de baja al cliente.';
      }
    });
  }
}