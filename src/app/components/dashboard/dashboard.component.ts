import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { catchError, finalize, forkJoin, map, of, switchMap, timeout } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  CompraBackendDTO,
  CuotaBackendDTO
} from '../../services/compra.service';
import { SolicitudLineaCredito } from '../novedades/novedades.component';

export interface ClienteTiendaDTO {
  idCliente: number;
  idTienda: number;
  nombreCliente: string;
  usuarioCliente: string;
  limiteMaxCredito: number;
  estado?: boolean;
}

export interface CuotaVencimientoFila {
  idTienda: number;
  idCliente: number;
  nombreCliente: string;
  iniciales: string;
  idCompra: number;
  ordenRecibo: string;
  descripcionProducto: string;
  numeroCuota: number;
  fechaVencimiento: string;
  montoCuota: number;
  interes: number;
  estado: string;
}

export interface BarraProyeccionCliente {
  idCliente: number;
  nombreCompleto: string;
  fechaVencimiento: string;
  montoCuota: number;
  porcentajeAltura: number;
}

export interface DetalleReciboPendiente {
  ordenRecibo: string;
  nombreCliente: string;
  descripcionProducto: string;
  cuotasPendientes: CuotaBackendDTO[];
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
})
export class DashboardComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly cdr = inject(ChangeDetectorRef);

  adminIdTienda = 1;
  cargando = true;
  mensajeExito: string | null = null;
  mensajeError: string | null = null;

  clientesTotales: ClienteTiendaDTO[] = [];
  comprasTotales: Array<CompraBackendDTO & { idTienda: number; nombreCliente: string }> = [];
  creditosEnCurso: Array<CompraBackendDTO & { idTienda: number; nombreCliente: string }> = [];
  cuotasPendientesGlobales: CuotaVencimientoFila[] = [];
  barrasProyeccion: BarraProyeccionCliente[] = [];
  proximaCuotaGlobal: CuotaVencimientoFila | null = null;


  modalSolicitudesAbierto = false;
  solicitudesTienda: SolicitudLineaCredito[] = [];
  procesandoSolicitudId: string | null = null;


  modalPagoAbierto = false;
  clienteSeleccionadoId: number | null = null;
  creditoSeleccionadoId: number | null = null;
  cuotaSeleccionadaNumero: number | null = null;
  procesandoPago = false;
  errorModalPago: string | null = null;


  modalDetalleReciboAbierto = false;
  detalleReciboSeleccionado: DetalleReciboPendiente | null = null;

  ngOnInit(): void {
    this.detectarTiendaAdmin();
    this.cargarDashboardTienda();
  }

  private detectarTiendaAdmin(): void {
    for (const storage of [sessionStorage, localStorage]) {
      for (let i = 0; i < storage.length; i++) {
        const key = storage.key(i);
        if (!key) continue;
        const raw = storage.getItem(key);
        if (!raw || !raw.includes('eyJ')) continue;
        try {
          const limpio = raw.replace(/^Bearer\s+/i, '').trim();
          const partes = limpio.split('.');
          if (partes.length === 3) {
            let b64 = partes[1].replace(/-/g, '+').replace(/_/g, '/');
            while (b64.length % 4 !== 0) b64 += '=';
            const claims = JSON.parse(atob(b64));
            if (claims?.idTienda != null) {
              this.adminIdTienda = Number(claims.idTienda);
              return;
            }
          }
        } catch {
          
        }
      }
    }

    for (const storage of [sessionStorage, localStorage]) {
      for (let i = 0; i < storage.length; i++) {
        const key = storage.key(i);
        if (!key) continue;
        const raw = storage.getItem(key);
        if (!raw || !raw.trim().startsWith('{')) continue;
        try {
          const obj = JSON.parse(raw);
          const idT = obj?.idTienda ?? obj?.tienda?.idTienda ?? obj?.sesion?.idTienda;
          if (idT != null) {
            this.adminIdTienda = Number(idT);
            return;
          }
        } catch {
         
        }
      }
    }
  }

  private hoyLocalIso(): string {
    const hoy = new Date();
    const y = hoy.getFullYear();
    const m = String(hoy.getMonth() + 1).padStart(2, '0');
    const d = String(hoy.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  private formatearRecibo(compra: CompraBackendDTO): string {
    if (compra.ordenRecibo && compra.ordenRecibo.trim().length >= 5) {
      return compra.ordenRecibo.trim();
    }
    return String(10000 + compra.idCompra).padStart(6, '0');
  }

  cargarDashboardGlobal(): void {
    this.cargarDashboardTienda();
  }

  cargarDashboardTienda(): void {
    this.cargando = true;
    this.cargarSolicitudesDeMiTienda();

    const idTienda = this.adminIdTienda;

    this.http
      .get<ClienteTiendaDTO[]>(`${environment.apiUrl}/tiendas/${idTienda}/clientes`)
      .pipe(
        catchError(() => of([] as ClienteTiendaDTO[])),
        switchMap((clientesDeTienda) => {
          const clientesFiltrados = (clientesDeTienda || []).filter(
            (c) => Number(c.idTienda ?? idTienda) === Number(idTienda)
          );
          this.clientesTotales = clientesFiltrados;

          if (clientesFiltrados.length === 0) {
            return of([]);
          }

          const peticionesCompras = clientesFiltrados.map((cli) =>
            this.http
              .get<CompraBackendDTO[]>(
                `${environment.apiUrl}/tiendas/${idTienda}/clientes/${cli.idCliente}/compras`
              )
              .pipe(
                catchError(() => of([] as CompraBackendDTO[])),
                map((compras) =>
                  (compras || []).map((comp) => ({
                    ...comp,
                    idTienda,
                    nombreCliente: cli.nombreCliente
                  }))
                )
              )
          );

          return forkJoin(peticionesCompras);
        }),
        timeout(10000),
        finalize(() => {
          this.cargando = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: (gruposCompras) => {
          const todasLasCompras = (
            gruposCompras as Array<Array<CompraBackendDTO & { idTienda: number; nombreCliente: string }>>
          ).flat();
          this.comprasTotales = todasLasCompras;

          this.creditosEnCurso = todasLasCompras.filter(
            (c) =>
              Array.isArray(c.cuotas) &&
              c.cuotas.some((q) => q.estado?.trim().toLowerCase() === 'pendiente')
          );

          const filasPendientes: CuotaVencimientoFila[] = [];
          for (const cred of this.creditosEnCurso) {
            const reciboStr = this.formatearRecibo(cred);
            for (const q of cred.cuotas || []) {
              if (q.estado?.trim().toLowerCase() === 'pendiente') {
                filasPendientes.push({
                  idTienda,
                  idCliente: cred.idCliente,
                  nombreCliente: cred.nombreCliente,
                  iniciales: this.obtenerIniciales(cred.nombreCliente),
                  idCompra: cred.idCompra,
                  ordenRecibo: reciboStr,
                  descripcionProducto: cred.descripcionProducto,
                  numeroCuota: q.numero,
                  fechaVencimiento: q.fechaVencimiento,
                  montoCuota: Number(q.cuota ?? 0),
                  interes: Number(q.interes ?? 0),
                  estado: q.estado
                });
              }
            }
          }

          filasPendientes.sort((a, b) => {
            const cmpFecha = a.fechaVencimiento.localeCompare(b.fechaVencimiento);
            return cmpFecha !== 0 ? cmpFecha : a.numeroCuota - b.numeroCuota;
          });

          this.cuotasPendientesGlobales = filasPendientes;
          this.proximaCuotaGlobal = filasPendientes.length > 0 ? filasPendientes[0] : null;

          this.construirGrafico6Clientes(filasPendientes);
          this.cdr.detectChanges();
        },
        error: () => {
          this.cdr.detectChanges();
        }
      });
  }

  private construirGrafico6Clientes(filasOrdenadas: CuotaVencimientoFila[]): void {
    const porCliente = new Map<number, CuotaVencimientoFila>();
    for (const fila of filasOrdenadas) {
      if (!porCliente.has(fila.idCliente)) {
        porCliente.set(fila.idCliente, fila);
      }
      if (porCliente.size >= 6) break;
    }

    const seleccionados = Array.from(porCliente.values());
    const maxMonto = seleccionados.reduce((acc, item) => Math.max(acc, item.montoCuota), 0);

    this.barrasProyeccion = seleccionados.map((item) => ({
      idCliente: item.idCliente,
      nombreCompleto: item.nombreCliente,
      fechaVencimiento: item.fechaVencimiento,
      montoCuota: item.montoCuota,
      porcentajeAltura: maxMonto > 0 ? Math.max(22, Math.round((item.montoCuota / maxMonto) * 85)) : 50
    }));
  }

  get totalListadoGrafico(): number {
    return this.barrasProyeccion.reduce((sum, b) => sum + b.montoCuota, 0);
  }

  obtenerIniciales(nombre: string): string {
    const partes = (nombre || 'CL').trim().split(/\s+/);
    if (partes.length === 1) return partes[0].substring(0, 2).toUpperCase();
    return (partes[0][0] + partes[1][0]).toUpperCase();
  }

  abrirDetalleRecibo(fila: CuotaVencimientoFila): void {
    const credito = this.creditosEnCurso.find((c) => c.idCompra === fila.idCompra);
    const pendientes = (credito?.cuotas || [])
      .filter((q) => q.estado?.trim().toLowerCase() === 'pendiente')
      .sort((a, b) => a.numero - b.numero);

    this.detalleReciboSeleccionado = {
      ordenRecibo: fila.ordenRecibo,
      nombreCliente: fila.nombreCliente,
      descripcionProducto: fila.descripcionProducto,
      cuotasPendientes: pendientes
    };
    this.modalDetalleReciboAbierto = true;
    this.cdr.detectChanges();
  }

  cerrarDetalleRecibo(): void {
    this.modalDetalleReciboAbierto = false;
    this.detalleReciboSeleccionado = null;
    this.cdr.detectChanges();
  }


  cargarSolicitudesDeMiTienda(): void {
    try {
      const raw = localStorage.getItem('divinas_solicitudes_linea');
      const todas: SolicitudLineaCredito[] = raw ? JSON.parse(raw) : [];
      this.solicitudesTienda = todas.filter(
        (s) => Number(s.idTienda) === Number(this.adminIdTienda) && s.estado === 'En evaluación'
      );
    } catch {
      this.solicitudesTienda = [];
    }
  }

  abrirModalSolicitudes(): void {
    this.cargarSolicitudesDeMiTienda();
    this.modalSolicitudesAbierto = true;
    this.cdr.detectChanges();
  }

  cerrarModalSolicitudes(): void {
    this.modalSolicitudesAbierto = false;
    this.cdr.detectChanges();
  }

  aprobarSolicitud(sol: SolicitudLineaCredito): void {
    if (this.procesandoSolicitudId) return;
    this.procesandoSolicitudId = sol.idSolicitud;
    this.cdr.detectChanges();

    this.http
      .put(`${environment.apiUrl}/tiendas/${this.adminIdTienda}/clientes/${sol.idCliente}/linea-credito`, {
        limiteMaxCredito: sol.lineaSolicitada
      })
      .pipe(
        finalize(() => {
          this.procesandoSolicitudId = null;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: () => {
          this.actualizarEstadoSolicitudStorage(sol.idSolicitud, 'Aprobada');
          this.cargarSolicitudesDeMiTienda();
          this.mensajeExito = `Línea de crédito de ${sol.nombreCliente} ampliada a S/ ${sol.lineaSolicitada.toFixed(2)}.`;
          this.cargarDashboardTienda();
        },
        error: (err) => {
          this.mensajeError = err?.error?.mensaje || 'No se pudo aprobar la solicitud de línea de crédito.';
          this.cdr.detectChanges();
        }
      });
  }

  rechazarSolicitud(sol: SolicitudLineaCredito): void {
    this.actualizarEstadoSolicitudStorage(sol.idSolicitud, 'Rechazada');
    this.cargarSolicitudesDeMiTienda();
    this.mensajeExito = `Solicitud ${sol.idSolicitud} rechazada.`;
    this.cdr.detectChanges();
  }

  private actualizarEstadoSolicitudStorage(idSolicitud: string, estado: 'Aprobada' | 'Rechazada'): void {
    try {
      const raw = localStorage.getItem('divinas_solicitudes_linea');
      const todas: SolicitudLineaCredito[] = raw ? JSON.parse(raw) : [];
      const actualizadas = todas.map((s) => (s.idSolicitud === idSolicitud ? { ...s, estado } : s));
      localStorage.setItem('divinas_solicitudes_linea', JSON.stringify(actualizadas));
    } catch {
      // Ignorar
    }
  }


  get clientesConCreditosActivos(): ClienteTiendaDTO[] {
    const idsConCredito = new Set(this.creditosEnCurso.map((c) => c.idCliente));
    return this.clientesTotales.filter((cli) => idsConCredito.has(cli.idCliente));
  }

  get creditosActivosDelClienteSeleccionado(): Array<CompraBackendDTO & { idTienda: number; nombreCliente: string }> {
    if (!this.clienteSeleccionadoId) return [];
    return this.creditosEnCurso.filter((c) => c.idCliente === Number(this.clienteSeleccionadoId));
  }

  get creditoSeleccionadoObj(): (CompraBackendDTO & { idTienda: number; nombreCliente: string }) | null {
    if (!this.creditoSeleccionadoId) return null;
    return (
      this.creditosActivosDelClienteSeleccionado.find(
        (c) => c.idCompra === Number(this.creditoSeleccionadoId)
      ) || null
    );
  }

  get cuotaPendienteSeleccionadaObj(): CuotaBackendDTO | null {
    const cred = this.creditoSeleccionadoObj;
    if (!cred?.cuotas) return null;
    if (this.cuotaSeleccionadaNumero != null) {
      const exacta = cred.cuotas.find(
        (q) => q.numero === Number(this.cuotaSeleccionadaNumero) && q.estado?.trim().toLowerCase() === 'pendiente'
      );
      if (exacta) return exacta;
    }
    return cred.cuotas.find((q) => q.estado?.trim().toLowerCase() === 'pendiente') || null;
  }

  abrirModalPagoCuota(): void {
    this.errorModalPago = null;
    const primerosClientes = this.clientesConCreditosActivos;
    this.clienteSeleccionadoId = primerosClientes.length > 0 ? primerosClientes[0].idCliente : null;
    this.onCambioClientePago();
    this.modalPagoAbierto = true;
    this.cdr.detectChanges();
  }

  onCambioClientePago(): void {
    const activos = this.creditosActivosDelClienteSeleccionado;
    if (activos.length > 0) {
      this.creditoSeleccionadoId = activos[0].idCompra;
      const prox = activos[0].cuotas?.find((q) => q.estado?.trim().toLowerCase() === 'pendiente');
      this.cuotaSeleccionadaNumero = prox ? prox.numero : null;
    } else {
      this.creditoSeleccionadoId = null;
      this.cuotaSeleccionadaNumero = null;
    }
  }

  seleccionarCreditoParaPagar(cred: CompraBackendDTO & { idTienda: number; nombreCliente: string }): void {
    this.creditoSeleccionadoId = cred.idCompra;
    const prox = cred.cuotas?.find((q) => q.estado?.trim().toLowerCase() === 'pendiente');
    this.cuotaSeleccionadaNumero = prox ? prox.numero : null;
  }

  cerrarModalPagoCuota(): void {
    if (this.procesandoPago) return;
    this.modalPagoAbierto = false;
    this.errorModalPago = null;
    this.cdr.detectChanges();
  }

  confirmarPagoCuotaAdmin(): void {
    const cred = this.creditoSeleccionadoObj;
    const cuota = this.cuotaPendienteSeleccionadaObj;
    if (!cred || !cuota || this.procesandoPago) return;

    this.procesandoPago = true;
    this.errorModalPago = null;
    this.cdr.detectChanges();

    const fechaHoy = this.hoyLocalIso();
    this.http
      .put(
        `${environment.apiUrl}/tiendas/${this.adminIdTienda}/clientes/${cred.idCliente}/compras/${cred.idCompra}/cuotas/${cuota.numero}/pagar`,
        { fechaPago: fechaHoy }
      )
      .pipe(
        timeout(8000),
        finalize(() => {
          this.procesandoPago = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: () => {
          this.modalPagoAbierto = false;
          this.mensajeExito = `Cuota #${cuota.numero} de ${cred.nombreCliente} (${cred.descripcionProducto}) pagada correctamente.`;
          this.cargarDashboardTienda();
        },
        error: (err) => {
          this.errorModalPago = err?.error?.mensaje || 'No se pudo registrar el pago de la cuota.';
          this.cdr.detectChanges();
        }
      });
  }
}