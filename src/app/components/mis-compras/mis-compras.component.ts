import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { finalize, timeout } from 'rxjs';
import {
  CompraBackendDTO,
  CompraService,
  CuotaBackendDTO,
  ResumenPagosBackendDTO
} from '../../services/compra.service';

@Component({
  selector: 'app-mis-compras',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './mis-compras.component.html',
  styleUrl: './mis-compras.component.css'
})
export class MisComprasComponent implements OnInit {
  private readonly compraService = inject(CompraService);
  private readonly cdr = inject(ChangeDetectorRef);

  perfilCliente: any = null;
  resumen: ResumenPagosBackendDTO | null = null;
  creditosActivos: CompraBackendDTO[] = [];
  historialCompras: CompraBackendDTO[] = [];
  cargando = true;

  tabActiva: 'ACTIVOS' | 'HISTORIAL' = 'HISTORIAL';

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
    this.cargarDatos();
  }

  private hoyLocalIso(): string {
    const hoy = new Date();
    const anio = hoy.getFullYear();
    const mes = String(hoy.getMonth() + 1).padStart(2, '0');
    const dia = String(hoy.getDate()).padStart(2, '0');
    return `${anio}-${mes}-${dia}`;
  }

  cargarDatos(): void {
    this.cargando = true;

    this.compraService.obtenerPerfilCliente().subscribe({
      next: (perfil) => {
        this.perfilCliente = perfil;
        this.cdr.detectChanges();
      }
    });

    this.compraService.obtenerResumenPagos().subscribe({
      next: (res) => {
        this.resumen = res;
        this.cdr.detectChanges();
      }
    });

    this.compraService
      .listarMisCompras()
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
    this.compraService
      .pagarCuota(this.compraAPagar.idCompra, this.cuotaAPagar.numero, fechaHoy)
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