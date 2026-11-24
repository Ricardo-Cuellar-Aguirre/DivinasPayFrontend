import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { finalize, timeout } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  CompraBackendDTO,
  CompraService,
  CuotaBackendDTO,
  ResumenPagosBackendDTO
} from '../../services/compra.service';

@Component({
  selector: 'app-perfil-crediticio',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './perfil-crediticio.component.html',
  styleUrl: './perfil-crediticio.component.css'
})
export class PerfilCrediticioComponent implements OnInit {
  private readonly compraService = inject(CompraService);
  private readonly route = inject(ActivatedRoute);
  private readonly http = inject(HttpClient);
  private readonly cdr = inject(ChangeDetectorRef);

  idClienteRuta: number | null = null;
  perfilCliente: any = null;
  resumen: ResumenPagosBackendDTO | null = null;
  creditosActivos: CompraBackendDTO[] = [];
  historialCompras: CompraBackendDTO[] = [];
  cargando = true;

  tabActiva: 'ACTIVOS' | 'HISTORIAL' = 'ACTIVOS';

  // Filtro 1: Intervalo de fechas
  filtroFechaDesde = '';
  filtroFechaHasta = '';

  // Filtro 2: Monto menor o mayor a la cantidad ingresada
  filtroMontoCondicion: 'TODOS' | 'MENOR' | 'MAYOR' = 'TODOS';
  filtroMontoCantidad: number | null = null;

  // Modal de pago de cuota
  modalPagoAbierto = false;
  compraAPagar: CompraBackendDTO | null = null;
  cuotaAPagar: CuotaBackendDTO | null = null;
  metodoPago: 'TARJETA' | 'YAPE_PLIN' | 'PAGO_EFECTIVO' = 'YAPE_PLIN';
  procesandoPago = false;
  errorPago: string | null = null;
  mensajeExitoPago: string | null = null;

  ngOnInit(): void {
    const paramId = this.route.snapshot.paramMap.get('idCliente');
    this.idClienteRuta = paramId ? Number(paramId) : null;
    this.cargarDatos();
  }

  private hoyLocalIso(): string {
    const hoy = new Date();
    const anio = hoy.getFullYear();
    const mes = String(hoy.getMonth() + 1).padStart(2, '0');
    const dia = String(hoy.getDate()).padStart(2, '0');
    return `${anio}-${mes}-${dia}`;
  }

  private obtenerIdTiendaSesion(): number {
    for (const storage of [sessionStorage, localStorage]) {
      for (let i = 0; i < storage.length; i++) {
        const key = storage.key(i);
        if (!key) continue;
        const raw = storage.getItem(key);
        if (!raw || !raw.trim().startsWith('{')) continue;
        try {
          const obj = JSON.parse(raw);
          const idTienda = obj?.idTienda ?? obj?.tienda?.idTienda ?? obj?.sesion?.idTienda;
          if (idTienda != null) return Number(idTienda);
        } catch {
          // Ignorar
        }
      }
    }
    return 1;
  }

  cargarDatos(): void {
    this.cargando = true;

    const perfilObs$ = this.idClienteRuta
      ? this.http.get(`${environment.apiUrl}/tiendas/${this.obtenerIdTiendaSesion()}/clientes/${this.idClienteRuta}`)
      : this.compraService.obtenerPerfilCliente();

    perfilObs$.subscribe({
      next: (perfil) => {
        this.perfilCliente = perfil;
        this.cdr.detectChanges();
      }
    });

    const pagosObs$ = this.idClienteRuta
      ? this.compraService.obtenerPagos(this.idClienteRuta)
      : this.compraService.obtenerPagos();

    pagosObs$.subscribe({
      next: (res) => {
        this.resumen = res;
        this.cdr.detectChanges();
      }
    });

    const comprasObs$ = this.idClienteRuta
      ? this.compraService.listar(this.idClienteRuta)
      : this.compraService.listar();

    comprasObs$
      .pipe(
        timeout(8000),
        finalize(() => {
          this.cargando = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: (lista) => {
          const compras = (lista || []).sort((a, b) => b.idCompra - a.idCompra);

          // Créditos activos: compras con al menos 1 cuota en estado 'Pendiente' en la tabla cuota
          this.creditosActivos = compras.filter(
            (c) =>
              Array.isArray(c.cuotas) &&
              c.cuotas.some((q) => q.estado?.trim().toLowerCase() === 'pendiente')
          );

          // Historial de compras: todas las compras cuyas cuotas en la tabla cuota estén en estado 'Pagado'
          this.historialCompras = compras.filter(
            (c) =>
              Array.isArray(c.cuotas) &&
              c.cuotas.length > 0 &&
              c.cuotas.every((q) => q.estado?.trim().toLowerCase() === 'pagado')
          );

          this.cdr.detectChanges();
        },
        error: () => {
          this.creditosActivos = [];
          this.historialCompras = [];
          this.cdr.detectChanges();
        }
      });
  }

  get historialFiltrado(): CompraBackendDTO[] {
    return this.historialCompras.filter((item) => {
      // Filtro 1: Intervalo de fechas
      if (this.filtroFechaDesde && item.fechaCompra < this.filtroFechaDesde) {
        return false;
      }
      if (this.filtroFechaHasta && item.fechaCompra > this.filtroFechaHasta) {
        return false;
      }

      // Filtro 2: Monto menor o mayor a la cantidad ingresada
      const montoCompra = Number(item.monto ?? 0);
      if (
        this.filtroMontoCondicion !== 'TODOS' &&
        this.filtroMontoCantidad !== null &&
        this.filtroMontoCantidad !== undefined &&
        String(this.filtroMontoCantidad) !== ''
      ) {
        const valorIngresado = Number(this.filtroMontoCantidad);
        if (!Number.isNaN(valorIngresado)) {
          if (this.filtroMontoCondicion === 'MENOR' && !(montoCompra <= valorIngresado)) {
            return false;
          }
          if (this.filtroMontoCondicion === 'MAYOR' && !(montoCompra >= valorIngresado)) {
            return false;
          }
        }
      }

      return true;
    });
  }

  limpiarFiltros(): void {
    this.filtroFechaDesde = '';
    this.filtroFechaHasta = '';
    this.filtroMontoCondicion = 'TODOS';
    this.filtroMontoCantidad = null;
  }

  get lineaMaxima(): number {
    return Number(this.resumen?.limiteMaxCredito ?? this.perfilCliente?.limiteMaxCredito ?? 1500);
  }

  get creditoDisponible(): number {
    return Number(this.resumen?.limiteDisponible ?? this.lineaMaxima);
  }

  get creditoUtilizado(): number {
    return Math.max(0, this.lineaMaxima - this.creditoDisponible);
  }

  get porcentajeUtilizacion(): number {
    if (this.lineaMaxima <= 0) return 0;
    return Math.min(100, (this.creditoUtilizado / this.lineaMaxima) * 100);
  }

  get etiquetaTipoTasa(): string {
    return this.perfilCliente?.tipoTasa?.toLowerCase() === 'nominal' ? 'TNA' : 'TEA';
  }

  formatearRecibo(item: CompraBackendDTO): string {
    if (item.ordenRecibo && item.ordenRecibo.trim().length >= 5) {
      return item.ordenRecibo.trim();
    }
    return String(10000 + item.idCompra).padStart(6, '0');
  }

  cuotasPagadasCount(compra: CompraBackendDTO): number {
    return (compra.cuotas || []).filter((q) => q.estado?.trim().toLowerCase() === 'pagado').length;
  }

  siguienteCuotaPendiente(compra: CompraBackendDTO): CuotaBackendDTO | null {
    return (compra.cuotas || []).find((q) => q.estado?.trim().toLowerCase() === 'pendiente') || null;
  }

  formatearFecha(iso: string | undefined | null): string {
    if (!iso) return '-';
    return iso.split('-').reverse().join('/');
  }

  abrirModalPago(compra: CompraBackendDTO, cuota: CuotaBackendDTO): void {
    this.compraAPagar = compra;
    this.cuotaAPagar = cuota;
    this.errorPago = null;
    this.modalPagoAbierto = true;
    this.cdr.detectChanges();
  }

  cerrarModalPago(): void {
    if (this.procesandoPago) return;
    this.modalPagoAbierto = false;
    this.compraAPagar = null;
    this.cuotaAPagar = null;
    this.cdr.detectChanges();
  }

  confirmarPagoCuota(): void {
    if (!this.compraAPagar || !this.cuotaAPagar || this.procesandoPago) return;
    this.procesandoPago = true;
    this.errorPago = null;
    this.cdr.detectChanges();

    const fechaHoy = this.hoyLocalIso();
    const idTienda = this.obtenerIdTiendaSesion();
    const idCliente = this.compraAPagar.idCliente;

    this.compraService
      .pagarCuota(idTienda, idCliente, this.compraAPagar.idCompra, this.cuotaAPagar.numero, fechaHoy)
      .pipe(
        timeout(8000),
        finalize(() => {
          this.procesandoPago = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: () => {
          const numCuota = this.cuotaAPagar?.numero;
          const desc = this.compraAPagar?.descripcionProducto;
          this.modalPagoAbierto = false;
          this.compraAPagar = null;
          this.cuotaAPagar = null;
          this.mensajeExitoPago = `Cuota #${numCuota} de "${desc}" pagada correctamente.`;
          this.cargarDatos();
        },
        error: (err) => {
          this.errorPago = err?.error?.mensaje || 'No se pudo procesar el pago de la cuota.';
          this.cdr.detectChanges();
        }
      });
  }
}