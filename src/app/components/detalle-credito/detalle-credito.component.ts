import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { finalize, timeout } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from '../../services/auth.service';
import {
  CompraBackendDTO,
  CompraService,
  CuotaBackendDTO
} from '../../services/compra.service';

@Component({
  selector: 'app-detalle-credito',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './detalle-credito.component.html',
  styleUrl: './detalle-credito.component.css'
})
export class DetalleCreditoComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly http = inject(HttpClient);
  private readonly compraService = inject(CompraService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly authService = inject(AuthService);

  readonly esAdminTienda = this.authService.sesionActual?.rol === 'ADMIN_TIENDA';

  idCliente = 0;
  idCompra = 0;
  compra: CompraBackendDTO | null = null;
  cliente: any = null;
  cargando = true;


  modalPagoAbierto = false;
  cuotaAPagar: CuotaBackendDTO | null = null;
  metodoPago: 'TARJETA' | 'YAPE_PLIN' | 'PAGO_EFECTIVO' = 'YAPE_PLIN';
  procesandoPago = false;
  errorPago: string | null = null;
  mensajeExito: string | null = null;

  ngOnInit(): void {
    this.route.paramMap.subscribe((params) => {
      this.idCliente = Number(params.get('idCliente') || 0);
      this.idCompra = Number(params.get('idCompra') || 0);
      if (this.idCliente && this.idCompra) {
        this.cargarDetalle();
      }
    });
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
          
        }
      }
    }
    return 1;
  }

  cargarDetalle(): void {
    this.cargando = true;
    const idTienda = this.obtenerIdTiendaSesion();

    this.http
      .get(`${environment.apiUrl}/tiendas/${idTienda}/clientes/${this.idCliente}`)
      .subscribe({
        next: (cli) => {
          this.cliente = cli;
          this.cdr.detectChanges();
        }
      });

    this.compraService
      .obtener(idTienda, this.idCliente, this.idCompra)
      .pipe(
        timeout(8000),
        finalize(() => {
          this.cargando = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: (data) => {
          this.compra = data;
          this.cdr.detectChanges();
        },
        error: () => {
          this.compra = null;
          this.cdr.detectChanges();
        }
      });
  }

  get creditoFinalizado(): boolean {
    if (!this.compra?.cuotas?.length) return false;
    return this.compra.cuotas.every((q) => q.estado?.trim().toLowerCase() === 'pagado');
  }

  get etiquetaTasaCliente(): string {
    const tipo = (this.cliente?.tipoTasa || '').trim().toLowerCase();
    const tasa = Number(this.cliente?.tasaInteres ?? 24).toFixed(2);
    if (tipo === 'nominal') {
      const cap = (this.cliente?.capitalizacion || '').trim().toLowerCase();
      const mapa: Record<string, string> = {
        diaria: 'TND',
        mensual: 'TNM',
        bimestral: 'TNB',
        trimestral: 'TNT',
        cuatrimestral: 'TNC',
        semestral: 'TNS',
        anual: 'TNA'
      };
      const sigla = mapa[cap] || 'TNM';
      return `${sigla}: ${tasa}%`;
    }
    return `TEA: ${tasa}%`;
  }

  volverAlPerfil(): void {
    this.router.navigate(['/creditos']);
  }

  abrirModalPago(cuota: CuotaBackendDTO): void {
    if (cuota.estado?.trim().toLowerCase() === 'pagado') return;
    this.cuotaAPagar = cuota;
    this.errorPago = null;
    this.modalPagoAbierto = true;
    this.cdr.detectChanges();
  }

  cerrarModalPago(): void {
    if (this.procesandoPago) return;
    this.modalPagoAbierto = false;
    this.cuotaAPagar = null;
    this.cdr.detectChanges();
  }

  confirmarPagoCuota(): void {
    if (!this.compra || !this.cuotaAPagar || this.procesandoPago) return;
    this.procesandoPago = true;
    this.errorPago = null;
    this.cdr.detectChanges();

    const idTienda = this.obtenerIdTiendaSesion();
    const fechaHoy = this.hoyLocalIso();

    this.compraService
      .pagarCuota(idTienda, this.idCliente, this.compra.idCompra, this.cuotaAPagar.numero, fechaHoy)
      .pipe(
        timeout(8000),
        finalize(() => {
          this.procesandoPago = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: (compraActualizada) => {
          const num = this.cuotaAPagar?.numero;
          this.compra = compraActualizada;
          this.modalPagoAbierto = false;
          this.cuotaAPagar = null;
          this.mensajeExito = `Cuota #${num} pagada correctamente.`;
          this.cdr.detectChanges();
        },
        error: (err) => {
          this.errorPago = err?.error?.mensaje || 'No se pudo procesar el pago de la cuota.';
          this.cdr.detectChanges();
        }
      });
  }

  descargarCronograma(): void {
    if (!this.compra) return;
    const encabezados = [
      'N° Cuota',
      'Fecha de Pago',
      'Saldo Inicial',
      'Cuota Fija',
      'Interés',
      'Amortización',
      'Saldo Pendiente',
      'Estado'
    ];
    const filas = (this.compra.cuotas || []).map((q) => [
      q.numero,
      q.fechaVencimiento,
      q.saldoInicial.toFixed(2),
      q.cuota.toFixed(2),
      q.interes.toFixed(2),
      q.amortizacion.toFixed(2),
      q.saldoFinal.toFixed(2),
      q.estado
    ]);

    const csv = [encabezados.join(','), ...filas.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `cronograma-credito-${this.compra.idCompra}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }
}