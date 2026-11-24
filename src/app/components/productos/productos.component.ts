import { CommonModule } from '@angular/common';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ErrorResponse } from '../../models/sistema.model';
import { AuthService } from '../../services/auth.service';
import { TiendaActivaService } from '../../services/tienda-activa.service';

export interface ItemCatalogo {
  idProductoServicio: number;
  descripcion: string;
  marca: string;
  tipo: string;
  proveedor: string;
  precioContado: number;
  precioCredito: number;
  modalidad: string;
}

export interface SimulacionRequestDTO {
  fechaCompra: string;
  monto: number;
  formaPago: 'Unico pago' | 'En meses';
  numMeses: number;
}

export interface FilaCuotaBackendDTO {
  numero: number;
  fechaVencimiento: string;
  saldoInicial: number;
  cuota: number;
  interes: number;
  amortizacion: number;
  saldoFinal: number;
}

export interface SimulacionResponseDTO {
  idCliente: number;
  fechaCompra: string;
  monto: number;
  formaPago: string;
  numMeses: number;
  cuotaFija: number;
  cuotas: FilaCuotaBackendDTO[];
  totalCuotas: number;
  totalIntereses: number;
}

export interface CuotaSimuladaVista {
  numero: number;
  fechaPago: string;
  montoCuota: number;
}

export interface ResultadoSimulacionVista {
  numCuotas: number;
  cuotaFija: number;
  montoTotal: number;
  cronograma: CuotaSimuladaVista[];
}

@Component({
  selector: 'app-productos',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './productos.component.html',
  styleUrl: './productos.component.css'
})
export class ProductosComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);
  private readonly tiendaActivaService = inject(TiendaActivaService);
  private readonly cdr = inject(ChangeDetectorRef);

  catalogoCompleto: ItemCatalogo[] = [];
  catalogoFiltrado: ItemCatalogo[] = [];
  marcasDisponibles: string[] = [];

  cargando = true;
  textoBusqueda = '';
  marcaSeleccionada = '';
  precioMinimo: number | null = null;
  tipoSeleccionado = '';

  // Modal de compra y simulación
  productoAComprar: ItemCatalogo | null = null;
  modalidadCompra: 'CONTADO' | 'CREDITO' = 'CREDITO';
  compraConfirmada = false;

  // Campos del simulador de cuotas
  numCuotasSimulacion: number | null = 3;
  fechaPrimerPagoSimulacion = '';
  simulando = false;
  errorSimulacion: string | null = null;
  resultadoSimulacion: ResultadoSimulacionVista | null = null;

  ngOnInit(): void {
    this.tiendaActivaService.tiendaActiva$.subscribe((tienda) => {
      const idTienda = tienda?.idTienda ?? this.authService.sesionActual?.idTienda ?? 1;
      this.cargarProductosPorTienda(idTienda);
    });
  }

  private cargarProductosPorTienda(idTienda: number): void {
    this.cargando = true;
    this.cdr.detectChanges();

    this.http.get<any[]>(`${environment.apiUrl}/tiendas/${idTienda}/productos`).subscribe({
      next: (data) => {
        this.catalogoCompleto = (data || []).map((item, idx) => this.normalizarItem(item, idx));
        this.extraerMarcas();
        this.aplicarFiltros();
        this.cargando = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.catalogoCompleto = [];
        this.catalogoFiltrado = [];
        this.cargando = false;
        this.cdr.detectChanges();
      }
    });
  }

  private normalizarItem(raw: any, index: number): ItemCatalogo {
    const contado = Number(raw.precioContado ?? raw.precio ?? 0);
    const credito = Number(raw.precioCredito ?? raw.precioLista ?? contado);
    const tipoRaw = (raw.tipo ?? raw.categoria ?? 'Servicio').toString().trim();

    return {
      idProductoServicio: raw.idProductoServicio ?? raw.idProducto ?? index + 1,
      descripcion: raw.descripcion ?? raw.nombre ?? 'Servicio estético',
      marca: (raw.marca ?? 'Divinas').toString().trim(),
      tipo: tipoRaw,
      proveedor: raw.proveedor ?? 'Distribuidora Estética Perú SAC',
      precioContado: contado,
      precioCredito: credito,
      modalidad: raw.modalidad ?? (credito > contado ? 'En meses' : 'Al contado')
    };
  }

  private extraerMarcas(): void {
    const setMarcas = new Set<string>();
    for (const item of this.catalogoCompleto) {
      if (item.marca) {
        setMarcas.add(item.marca);
      }
    }
    this.marcasDisponibles = Array.from(setMarcas).sort((a, b) => a.localeCompare(b));
  }

  aplicarFiltros(): void {
    const termino = this.textoBusqueda.trim().toLowerCase();
    const marca = this.marcaSeleccionada;
    const minPrecio =
      this.precioMinimo !== null &&
      this.precioMinimo !== undefined &&
      !Number.isNaN(Number(this.precioMinimo))
        ? Number(this.precioMinimo)
        : null;
    const tipo = this.tipoSeleccionado.toLowerCase();

    this.catalogoFiltrado = this.catalogoCompleto.filter((item) => {
      const coincideDescripcion =
        !termino || item.descripcion.toLowerCase().includes(termino);
      const coincideMarca = !marca || item.marca === marca;
      const coincidePrecio =
        minPrecio === null || item.precioContado >= minPrecio;
      const coincideTipo =
        !tipo || item.tipo.toLowerCase().includes(tipo);

      return coincideDescripcion && coincideMarca && coincidePrecio && coincideTipo;
    });

    this.cdr.detectChanges();
  }

  limpiarFiltros(): void {
    this.textoBusqueda = '';
    this.marcaSeleccionada = '';
    this.precioMinimo = null;
    this.tipoSeleccionado = '';
    this.aplicarFiltros();
  }

  abrirModalCompra(item: ItemCatalogo): void {
    this.productoAComprar = item;
    this.modalidadCompra = 'CREDITO';
    this.compraConfirmada = false;
    this.numCuotasSimulacion = 3;
    this.fechaPrimerPagoSimulacion = this.obtenerFechaHoyISO();
    this.errorSimulacion = null;
    this.resultadoSimulacion = null;
    this.simulando = false;
    this.cdr.detectChanges();
  }

  cerrarModalCompra(): void {
    this.productoAComprar = null;
    this.compraConfirmada = false;
    this.errorSimulacion = null;
    this.resultadoSimulacion = null;
    this.simulando = false;
    this.cdr.detectChanges();
  }

  cambiarModalidad(modalidad: 'CONTADO' | 'CREDITO'): void {
    this.modalidadCompra = modalidad;
    this.errorSimulacion = null;
    if (modalidad === 'CONTADO') {
      this.resultadoSimulacion = null;
    }
    this.cdr.detectChanges();
  }

  onCambioParametrosSimulacion(): void {
    this.errorSimulacion = null;
    this.resultadoSimulacion = null;
  }

  simularCredito(): void {
    if (!this.productoAComprar) return;

    this.errorSimulacion = null;
    this.resultadoSimulacion = null;

    const cuotas = Number(this.numCuotasSimulacion);
    if (!cuotas || !Number.isInteger(cuotas) || cuotas < 1) {
      this.errorSimulacion = 'Ingresa un número de cuotas válido (mínimo 1).';
      this.cdr.detectChanges();
      return;
    }

    if (!this.fechaPrimerPagoSimulacion) {
      this.errorSimulacion = 'Selecciona la fecha de primer pago.';
      this.cdr.detectChanges();
      return;
    }

    const sesion = this.authService.sesionActual;
    const idTienda = sesion?.idTienda;
    const idCliente = sesion?.idCliente;

    if (!idTienda || !idCliente) {
      this.errorSimulacion = 'No se encontró una sesión de cliente activa para simular.';
      this.cdr.detectChanges();
      return;
    }

    const montoProducto = Number(this.productoAComprar.precioCredito.toFixed(2));
    const payload: SimulacionRequestDTO = {
      fechaCompra: this.fechaPrimerPagoSimulacion,
      monto: montoProducto,
      formaPago: 'En meses',
      numMeses: cuotas
    };

    this.simulando = true;
    this.cdr.detectChanges();

    // Llama a CompraController.simular (no guarda ni modifica nada en la base de datos)
    this.http
      .post<SimulacionResponseDTO>(
        `${environment.apiUrl}/tiendas/${idTienda}/clientes/${idCliente}/compras/simular`,
        payload
      )
      .pipe(
        finalize(() => {
          this.simulando = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: () => {
          this.resultadoSimulacion = this.generarCronogramaMontoExacto(
            montoProducto,
            cuotas,
            this.fechaPrimerPagoSimulacion
          );
          this.cdr.detectChanges();
        },
        error: (err: HttpErrorResponse) => {
          const body = err?.error as ErrorResponse | undefined;
          this.errorSimulacion =
            body?.mensaje || 'No se pudo calcular la simulación con los datos ingresados.';
          this.cdr.detectChanges();
        }
      });
  }

  /**
   * Genera la cuota fija y las fechas mensuales a partir de fechaPrimerPago,
   * garantizando que la suma de todas las cuotas sea exactamente igual al monto del producto.
   */
  private generarCronogramaMontoExacto(
    montoTotal: number,
    numCuotas: number,
    fechaPrimerPagoISO: string
  ): ResultadoSimulacionVista {
    const cuotaFijaBase = Number((montoTotal / numCuotas).toFixed(2));
    const cronograma: CuotaSimuladaVista[] = [];

    for (let i = 0; i < numCuotas; i++) {
      const esUltima = i === numCuotas - 1;
      const montoCuota = esUltima
        ? Number((montoTotal - cuotaFijaBase * (numCuotas - 1)).toFixed(2))
        : cuotaFijaBase;

      cronograma.push({
        numero: i + 1,
        fechaPago: this.sumarMesesFormateado(fechaPrimerPagoISO, i),
        montoCuota
      });
    }

    return {
      numCuotas,
      cuotaFija: cuotaFijaBase,
      montoTotal,
      cronograma
    };
  }

  private sumarMesesFormateado(fechaISO: string, mesesASumar: number): string {
    const [anio, mes, dia] = fechaISO.split('-').map(Number);
    const totalMeses = mes - 1 + mesesASumar;
    const anioDestino = anio + Math.floor(totalMeses / 12);
    const mesDestino = (totalMeses % 12) + 1;
    const ultimoDiaMes = new Date(anioDestino, mesDestino, 0).getDate();
    const diaDestino = Math.min(dia, ultimoDiaMes);

    return `${String(diaDestino).padStart(2, '0')}/${String(mesDestino).padStart(2, '0')}/${anioDestino}`;
  }

  private obtenerFechaHoyISO(): string {
    const hoy = new Date();
    const anio = hoy.getFullYear();
    const mes = String(hoy.getMonth() + 1).padStart(2, '0');
    const dia = String(hoy.getDate()).padStart(2, '0');
    return `${anio}-${mes}-${dia}`;
  }

  confirmarSolicitudCompra(): void {
    // Confirmación únicamente visual en memoria sin modificar la base de datos
    this.compraConfirmada = true;
    this.cdr.detectChanges();
  }
}