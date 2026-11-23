import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { forkJoin } from 'rxjs';
import { ClienteResponseDTO } from '../../models/cliente.model';
import { CompraResponseDTO, CuotaDetalleDTO } from '../../models/compra.model';
import { ErrorResponse } from '../../models/sistema.model';
import { AuthService } from '../../services/auth.service';
import { ClienteService } from '../../services/cliente.service';
import { CompraService } from '../../services/compra.service';

@Component({
  selector: 'app-detalle-credito',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './detalle-credito.component.html',
  styleUrl: './detalle-credito.component.css'
})
export class DetalleCreditoComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);
  private readonly clienteService = inject(ClienteService);
  private readonly compraService = inject(CompraService);

  idTienda!: number;
  idCliente!: number;
  idCompra!: number;
  esAdminTienda = false;

  cliente: ClienteResponseDTO | null = null;
  compra: CompraResponseDTO | null = null;

  cargando = true;
  pagando = false;
  mensajeExito: string | null = null;
  mensajeError: string | null = null;

  // Modal de confirmación de pago
  cuotaAPagarModal: CuotaDetalleDTO | null = null;
  fechaPagoReal = new Date().toISOString().split('T')[0];

  ngOnInit(): void {
    const sesion = this.authService.sesionActual;
    if (!sesion?.idTienda) {
      this.router.navigate(['/login']);
      return;
    }

    this.idTienda = sesion.idTienda;
    this.esAdminTienda = sesion.rol === 'ADMIN_TIENDA';
    this.idCliente = Number(this.route.snapshot.paramMap.get('idCliente'));
    this.idCompra = Number(this.route.snapshot.paramMap.get('idCompra'));

    if (!this.idCliente || !this.idCompra) {
      this.router.navigate(['/creditos']);
      return;
    }

    this.cargarDetalle();
  }

  cargarDetalle(): void {
    this.cargando = true;
    this.mensajeError = null;

    forkJoin({
      cliente: this.clienteService.obtener(this.idTienda, this.idCliente),
      compra: this.compraService.obtener(this.idTienda, this.idCliente, this.idCompra)
    }).subscribe({
      next: ({ cliente, compra }) => {
        this.cliente = cliente;
        this.compra = compra;
        this.cargando = false;
      },
      error: (err: HttpErrorResponse) => {
        this.cargando = false;
        const body = err.error as ErrorResponse | undefined;
        this.mensajeError = body?.mensaje || 'No se pudo obtener el detalle del crédito.';
      }
    });
  }

  get siguienteNumeroCuotaPendiente(): number | null {
    if (!this.compra) return null;
    const pendiente = this.compra.cuotas.find((c) => c.estado === 'Pendiente');
    return pendiente ? pendiente.numero : null;
  }

  get creditoLiquidado(): boolean {
    if (!this.compra) return false;
    return this.compra.cuotas.every((c) => c.estado === 'Pagado');
  }

  abrirModalPago(cuota: CuotaDetalleDTO): void {
    this.cuotaAPagarModal = cuota;
    this.fechaPagoReal = new Date().toISOString().split('T')[0];
  }

  cerrarModalPago(): void {
    this.cuotaAPagarModal = null;
  }

  confirmarPagoCuota(): void {
    if (!this.cuotaAPagarModal || !this.esAdminTienda) return;

    this.pagando = true;
    this.mensajeError = null;
    this.mensajeExito = null;

    const numeroCuota = this.cuotaAPagarModal.numero;

    this.compraService
      .pagarCuota(this.idTienda, this.idCliente, this.idCompra, numeroCuota, {
        fechaPago: this.fechaPagoReal
      })
      .subscribe({
        next: (compraActualizada) => {
          this.compra = compraActualizada;
          this.pagando = false;
          this.cuotaAPagarModal = null;
          this.mensajeExito = `La cuota #${numeroCuota} fue marcada como pagada el ${this.fechaPagoReal}.`;
        },
        error: (err: HttpErrorResponse) => {
          this.pagando = false;
          this.cuotaAPagarModal = null;
          const body = err.error as ErrorResponse | undefined;
          this.mensajeError = body?.mensaje || 'No se pudo registrar el pago de la cuota.';
        }
      });
  }

  descargarCronogramaCsv(): void {
    if (!this.compra || !this.cliente) return;

    const cabeceras = [
      'Nro Cuota',
      'Fecha Vencimiento',
      'Saldo Inicial (S/)',
      'Cuota Fija (S/)',
      'Interes (S/)',
      'Amortizacion (S/)',
      'Saldo Final (S/)',
      'Estado',
      'Fecha Pago Real'
    ];

    const filas = this.compra.cuotas.map((c) => [
      c.numero,
      c.fechaVencimiento,
      c.saldoInicial.toFixed(2),
      c.cuota.toFixed(2),
      c.interes.toFixed(2),
      c.amortizacion.toFixed(2),
      c.saldoFinal.toFixed(2),
      c.estado,
      c.fechaPagoReal ?? '-'
    ]);

    const contenidoCsv = [cabeceras.join(','), ...filas.map((r) => r.join(','))].join('\n');
    const blob = new Blob([contenidoCsv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const enlace = document.createElement('a');
    enlace.href = url;
    enlace.download = `cronograma_credito_${this.compra.idCompra}.csv`;
    enlace.click();
    URL.revokeObjectURL(url);
  }
}