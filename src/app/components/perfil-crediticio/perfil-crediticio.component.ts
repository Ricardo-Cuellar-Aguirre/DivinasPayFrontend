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
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { forkJoin } from 'rxjs';
import { ClienteResponseDTO } from '../../models/cliente.model';
import {
  CompraRequestDTO,
  FormaPagoCompra,
  SimulacionRequestDTO,
  SimulacionResponseDTO
} from '../../models/compra.model';
import {
  ListadoPagoDTO,
  PagoCompraDTO,
  PagosClienteDTO
} from '../../models/pago.model';
import { ProductoServicioResponseDTO } from '../../models/producto-servicio.model';
import { ErrorResponse } from '../../models/sistema.model';
import { AuthService } from '../../services/auth.service';
import { ClienteService } from '../../services/cliente.service';
import { CompraService } from '../../services/compra.service';
import { ListadoPagoService } from '../../services/listado-pago.service';
import { PagoService } from '../../services/pago.service';
import { ProductoServicioService } from '../../services/producto-servicio.service';

@Component({
  selector: 'app-perfil-crediticio',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, RouterModule],
  templateUrl: './perfil-crediticio.component.html',
  styleUrl: './perfil-crediticio.component.css'
})
export class PerfilCrediticioComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);
  private readonly clienteService = inject(ClienteService);
  private readonly pagoService = inject(PagoService);
  private readonly productoService = inject(ProductoServicioService);
  private readonly compraService = inject(CompraService);
  private readonly listadoPagoService = inject(ListadoPagoService);

  idTienda!: number;
  idCliente!: number;
  esAdminTienda = false;

  listaClientesTienda: ClienteResponseDTO[] = [];
  cliente: ClienteResponseDTO | null = null;
  estadoCuenta: PagosClienteDTO | null = null;
  listadoCorte: ListadoPagoDTO | null = null;
  productosActivos: ProductoServicioResponseDTO[] = [];

  tabActiva: 'activos' | 'historial' | 'corte' = 'activos';
  cargando = true;
  mensajeError: string | null = null;
  mensajeExito: string | null = null;

  // Modal Simulación / Nuevo Crédito
  mostrarModalCredito = false;
  creditoForm!: FormGroup;
  simulacion: SimulacionResponseDTO | null = null;
  simulando = false;
  registrandoCompra = false;
  errorCredito: string | null = null;

  ngOnInit(): void {
    const sesion = this.authService.sesionActual;
    if (!sesion?.idTienda) {
      this.router.navigate(['/login']);
      return;
    }

    this.idTienda = sesion.idTienda;
    this.esAdminTienda = sesion.rol === 'ADMIN_TIENDA';
    this.inicializarFormularioCredito();

    if (sesion.rol === 'CLIENTE' && sesion.idCliente) {
      this.idCliente = sesion.idCliente;
      this.cargarDatosCliente();
    } else if (this.esAdminTienda) {
      this.clienteService.listar(this.idTienda).subscribe({
        next: (clientes) => {
          this.listaClientesTienda = clientes.filter((c) => c.estado);
          const paramId = Number(this.route.snapshot.paramMap.get('idCliente'));
          if (paramId) {
            this.idCliente = paramId;
            this.cargarDatosCliente();
          } else if (this.listaClientesTienda.length > 0) {
            this.idCliente = this.listaClientesTienda[0].idCliente;
            this.cargarDatosCliente();
          } else {
            this.cargando = false;
          }
        },
        error: () => {
          this.cargando = false;
          this.mensajeError = 'No se pudo cargar la cartera de clientes.';
        }
      });
    }
  }

  private inicializarFormularioCredito(): void {
    const hoyIso = new Date().toISOString().split('T')[0];

    this.creditoForm = this.fb.group({
      idProductoServicio: [null as number | null, [Validators.required]],
      fechaCompra: [hoyIso, [Validators.required]],
      formaPago: ['En meses' as FormaPagoCompra, [Validators.required]],
      numMeses: [3, [Validators.min(1)]]
    });

    // Ajustar reglas según el producto seleccionado
    this.creditoForm.get('idProductoServicio')?.valueChanges.subscribe((idProd) => {
      this.simulacion = null;
      this.errorCredito = null;
      const prod = this.productosActivos.find((p) => p.idProductoServicio === Number(idProd));
      if (prod && prod.formaVenta === 'Al contado') {
        this.creditoForm.patchValue({ formaPago: 'Unico pago', numMeses: 1 });
      }
    });

    this.creditoForm.get('formaPago')?.valueChanges.subscribe((forma: FormaPagoCompra) => {
      this.simulacion = null;
      const mesesCtrl = this.creditoForm.get('numMeses');
      if (forma === 'En meses') {
        mesesCtrl?.setValidators([
          Validators.required,
          Validators.min(1),
          Validators.max(this.cliente?.maxMesesCredito ?? 36)
        ]);
        if (!mesesCtrl?.value || mesesCtrl.value < 1) {
          mesesCtrl?.setValue(1);
        }
      } else {
        mesesCtrl?.clearValidators();
        mesesCtrl?.setValue(1);
      }
      mesesCtrl?.updateValueAndValidity();
    });
  }

  cambiarClienteSeleccionado(nuevoId: number): void {
    this.idCliente = Number(nuevoId);
    this.cargarDatosCliente();
  }

  cargarDatosCliente(): void {
    this.cargando = true;
    this.mensajeError = null;

    forkJoin({
      cliente: this.clienteService.obtener(this.idTienda, this.idCliente),
      pagos: this.pagoService.obtenerEstadoCuenta(this.idTienda, this.idCliente),
      corte: this.listadoPagoService.obtenerPorCliente(this.idTienda, this.idCliente),
      productos: this.productoService.listar(this.idTienda, true)
    }).subscribe({
      next: ({ cliente, pagos, corte, productos }) => {
        this.cliente = cliente;
        this.estadoCuenta = pagos;
        this.listadoCorte = corte;
        this.productosActivos = productos;
        this.cargando = false;
      },
      error: (err: HttpErrorResponse) => {
        this.cargando = false;
        const body = err.error as ErrorResponse | undefined;
        this.mensajeError = body?.mensaje || 'No se pudo cargar el perfil crediticio.';
      }
    });
  }

  get porcentajeUtilizacion(): number {
    if (!this.estadoCuenta || this.estadoCuenta.limiteMaxCredito <= 0) return 0;
    const pct =
      (Number(this.estadoCuenta.saldoPendienteTotal) /
        Number(this.estadoCuenta.limiteMaxCredito)) *
      100;
    return Math.min(100, Math.max(0, Number(pct.toFixed(2))));
  }

  get creditosActivos(): PagoCompraDTO[] {
    if (!this.estadoCuenta) return [];
    return this.estadoCuenta.compras.filter((c) => Number(c.saldoPendiente) > 0);
  }

  get historialCompras(): PagoCompraDTO[] {
    return this.estadoCuenta?.compras ?? [];
  }

  get productoSeleccionado(): ProductoServicioResponseDTO | undefined {
    const id = Number(this.creditoForm.get('idProductoServicio')?.value);
    return this.productosActivos.find((p) => p.idProductoServicio === id);
  }

  abrirModalCredito(): void {
    this.errorCredito = null;
    this.simulacion = null;
    const primerProducto = this.productosActivos[0] ?? null;
    const formaInicial: FormaPagoCompra =
      primerProducto?.formaVenta === 'Al contado' ? 'Unico pago' : 'En meses';

    this.creditoForm.reset({
      idProductoServicio: primerProducto ? primerProducto.idProductoServicio : null,
      fechaCompra: new Date().toISOString().split('T')[0],
      formaPago: formaInicial,
      numMeses: formaInicial === 'En meses' ? Math.min(3, this.cliente?.maxMesesCredito ?? 3) : 1
    });

    this.mostrarModalCredito = true;
  }

  cerrarModalCredito(): void {
    this.mostrarModalCredito = false;
  }

  simularCredito(): void {
    if (this.creditoForm.invalid || !this.productoSeleccionado) {
      this.creditoForm.markAllAsTouched();
      return;
    }

    this.simulando = true;
    this.errorCredito = null;
    const val = this.creditoForm.value;

    const dto: SimulacionRequestDTO = {
      fechaCompra: val.fechaCompra,
      monto: this.productoSeleccionado.precioCredito,
      formaPago: val.formaPago,
      numMeses: val.formaPago === 'En meses' ? Number(val.numMeses) : 1
    };

    this.compraService.simular(this.idTienda, this.idCliente, dto).subscribe({
      next: (resp) => {
        this.simulacion = resp;
        this.simulando = false;
      },
      error: (err: HttpErrorResponse) => {
        this.simulando = false;
        const body = err.error as ErrorResponse | undefined;
        this.errorCredito = body?.mensaje || 'No se pudo simular el plan de pagos.';
      }
    });
  }

  confirmarOtorgarCredito(): void {
    if (!this.esAdminTienda || this.creditoForm.invalid) return;

    this.registrandoCompra = true;
    this.errorCredito = null;
    const val = this.creditoForm.value;

    const dto: CompraRequestDTO = {
      idProductoServicio: Number(val.idProductoServicio),
      fechaCompra: val.fechaCompra,
      formaPago: val.formaPago,
      numMeses: val.formaPago === 'En meses' ? Number(val.numMeses) : 1
    };

    this.compraService.registrar(this.idTienda, this.idCliente, dto).subscribe({
      next: (compraCreada) => {
        this.registrandoCompra = false;
        this.mostrarModalCredito = false;
        this.mensajeExito = `Crédito #${compraCreada.idCompra} registrado con éxito.`;
        this.cargarDatosCliente();
      },
      error: (err: HttpErrorResponse) => {
        this.registrandoCompra = false;
        const body = err.error as ErrorResponse | undefined;
        this.errorCredito = body?.mensaje || 'Error al registrar el crédito.';
      }
    });
  }
}