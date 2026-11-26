import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Observable, finalize, timeout } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import { CompraService, ListadoPagoClienteDTO } from '../../services/compra.service';


@Component({
  selector: 'app-listado-pago',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './listado-pago.component.html',
  styleUrl: './listado-pago.component.css'
})
export class ListadoPagoComponent implements OnInit {
  private readonly compraService = inject(CompraService);
  private readonly authService = inject(AuthService);
  private readonly cdr = inject(ChangeDetectorRef);

  esAdminTienda = false;
  idTienda: number | null = null;
  idCliente: number | null = null;

  // Vacío = el backend usa la fecha de pago más próxima con cuotas pendientes
  fechaPago = '';
  listados: ListadoPagoClienteDTO[] = [];
  cargando = false;
  mensajeError: string | null = null;

  ngOnInit(): void {
    const sesion = this.authService.sesionActual;
    this.esAdminTienda = sesion?.rol === 'ADMIN_TIENDA';
    this.idTienda = sesion?.idTienda != null ? Number(sesion.idTienda) : null;
    this.idCliente = sesion?.idCliente != null ? Number(sesion.idCliente) : null;
    this.cargar();
  }

  cargar(): void {
    if (this.idTienda == null || (!this.esAdminTienda && this.idCliente == null)) {
      this.mensajeError = 'No se pudo identificar la tienda de la sesión.';
      return;
    }
    this.cargando = true;
    this.mensajeError = null;
    this.cdr.detectChanges();

    const fecha = this.fechaPago || undefined;
    const peticion: Observable<ListadoPagoClienteDTO | ListadoPagoClienteDTO[]> = this.esAdminTienda
      ? this.compraService.obtenerListadoPagoTienda(this.idTienda, fecha)
      : this.compraService.obtenerListadoPagoCliente(this.idTienda, this.idCliente!, fecha);

    peticion
      .pipe(
        timeout(10000),
        finalize(() => {
          this.cargando = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: (resp) => {
          const lista = Array.isArray(resp) ? resp : [resp];
          this.listados = lista.filter((l) => l && l.detalle && l.detalle.length > 0);
          if (!this.fechaPago && this.listados.length > 0 && this.listados[0].fechaPago) {
            this.fechaPago = this.listados[0].fechaPago;
          }
          this.cdr.detectChanges();
        },
        error: (err) => {
          this.listados = [];
          this.mensajeError = err?.error?.mensaje || 'No se pudo generar el listado de pago.';
          this.cdr.detectChanges();
        }
      });
  }

  usarProximaFecha(): void {
    this.fechaPago = '';
    this.cargar();
  }

  imprimir(): void {
    window.print();
  }

  get totalGeneral(): number {
    return this.listados.reduce((acc, l) => acc + Number(l.totalAPagar || 0), 0);
  }

  get interesesGenerales(): number {
    return this.listados.reduce((acc, l) => acc + Number(l.totalInteresesAcumulados || 0), 0);
  }

  formatearFecha(iso: string | null | undefined): string {
    if (!iso) return '-';
    return iso.split('-').reverse().join('/');
  }
}
