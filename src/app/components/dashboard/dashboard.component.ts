import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { ListadoPagoDTO } from '../../models/pago.model';
import { ErrorResponse, ResumenTiendaDTO } from '../../models/sistema.model';
import { AuthService } from '../../services/auth.service';
import { ListadoPagoService } from '../../services/listado-pago.service';
import { ResumenService } from '../../services/resumen.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
})
export class DashboardComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly resumenService = inject(ResumenService);
  private readonly listadoPagoService = inject(ListadoPagoService);
  private readonly router = inject(Router);

  idTienda!: number;
  resumen: ResumenTiendaDTO | null = null;
  listadoCorte: ListadoPagoDTO[] = [];
  fechaCorteFiltro = '';
  cargando = true;
  cargandoListado = false;
  mostrarModalCorte = false;
  mensajeError: string | null = null;

  ngOnInit(): void {
    const sesion = this.authService.sesionActual;
    if (!sesion?.idTienda) {
      this.router.navigate(['/login']);
      return;
    }

    this.idTienda = sesion.idTienda;
    this.cargarDashboard();
    this.cargarListadoCorte();
  }

  cargarDashboard(): void {
    this.cargando = true;
    this.mensajeError = null;

    this.resumenService.obtenerResumen(this.idTienda).subscribe({
      next: (data) => {
        this.resumen = data;
        this.cargando = false;
      },
      error: (err: HttpErrorResponse) => {
        this.cargando = false;
        const body = err.error as ErrorResponse | undefined;
        this.mensajeError =
          body?.mensaje || 'No se pudo cargar el resumen financiero de la tienda.';
      }
    });
  }

  cargarListadoCorte(): void {
    this.cargandoListado = true;
    const fechaParam = this.fechaCorteFiltro.trim() || undefined;

    this.listadoPagoService.obtenerPorTienda(this.idTienda, fechaParam).subscribe({
      next: (lista) => {
        this.listadoCorte = lista;
        this.cargandoListado = false;
      },
      error: () => {
        this.listadoCorte = [];
        this.cargandoListado = false;
      }
    });
  }

  get totalCobranzaCiclo(): number {
    return this.listadoCorte.reduce((acc, item) => acc + Number(item.totalAPagar || 0), 0);
  }

  get totalInteresesCiclo(): number {
    return this.listadoCorte.reduce(
      (acc, item) => acc + Number(item.totalInteresesAcumulados || 0),
      0
    );
  }

  get maxCuotaGrafico(): number {
    if (!this.resumen?.proximosVencimientos?.length) return 1;
    return Math.max(
      ...this.resumen.proximosVencimientos.map((v) => Number(v.montoCuota || 0)),
      1
    );
  }

  alturaBarra(monto: number): number {
    return Math.max(18, Math.round((Number(monto) / this.maxCuotaGrafico) * 100));
  }

  abrirModalCorte(): void {
    this.mostrarModalCorte = true;
    this.cargarListadoCorte();
  }

  cerrarModalCorte(): void {
    this.mostrarModalCorte = false;
  }
}