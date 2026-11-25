import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { finalize, timeout } from 'rxjs';
import { ErrorResponse, OperacionResponseDTO } from '../../models/sistema.model';
import { AuthService } from '../../services/auth.service';
import { OperacionService } from '../../services/operacion.service';

@Component({
  selector: 'app-auditoria',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './auditoria.component.html',
  styleUrl: './auditoria.component.css',
  styles: [`
    .auditoria-filtros-bar {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(175px, 1fr));
      gap: 0.85rem;
      align-items: end;
      margin-bottom: 1.15rem;
      padding-bottom: 1rem;
      border-bottom: 1px solid #ebe6dc;
    }
    .filtro-item {
      display: flex;
      flex-direction: column;
      gap: 0.3rem;
    }
    .filtro-item label {
      font-size: 0.74rem;
      font-weight: 700;
      color: #5e6660;
    }
    .auditoria-resumen-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 0.75rem;
      font-size: 0.8rem;
      color: #6b726c;
    }
  `]
})
export class AuditoriaComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly operacionService = inject(OperacionService);
  private readonly cdr = inject(ChangeDetectorRef);

  operaciones: OperacionResponseDTO[] = [];
  operacionesFiltradas: OperacionResponseDTO[] = [];
  limite = 100;
  cargando = true;
  mensajeError: string | null = null;


  filtroFechaDesde = '';
  filtroFechaHasta = '';
  filtroRol = 'TODOS';
  filtroAccion = 'TODAS';

  rolesDisponibles: string[] = [];
  accionesDisponibles: string[] = [];

  ngOnInit(): void {
    this.cargarOperaciones();
  }

  cargarOperaciones(): void {
    const sesion = this.authService.sesionActual;
    if (!sesion) return;

    this.cargando = true;
    this.mensajeError = null;
    this.cdr.detectChanges();

    const obs$ =
      sesion.rol === 'ADMIN_SISTEMA'
        ? this.operacionService.listarTodas(null, this.limite)
        : this.operacionService.listarPorTienda(sesion.idTienda!, this.limite);

    obs$
      .pipe(
        timeout(10000),
        finalize(() => {
          this.cargando = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: (lista) => {
          this.operaciones = lista || [];
          this.extraerOpcionesFiltro();
          this.aplicarFiltros();
          this.cdr.detectChanges();
        },
        error: (err: HttpErrorResponse) => {
          const body = err.error as ErrorResponse | undefined;
          this.mensajeError = body?.mensaje || 'No se pudo cargar la bitácora de operaciones.';
          this.cdr.detectChanges();
        }
      });
  }

  private extraerOpcionesFiltro(): void {
    const rolesSet = new Set<string>(['ADMIN_SISTEMA', 'ADMIN_TIENDA', 'CLIENTE']);
    const accionesSet = new Set<string>();

    for (const op of this.operaciones) {
      if (op.rol && op.rol.trim()) {
        rolesSet.add(op.rol.trim());
      }
      if (op.accion && op.accion.trim()) {
        accionesSet.add(op.accion.trim());
      }
    }

    this.rolesDisponibles = Array.from(rolesSet);
    this.accionesDisponibles = Array.from(accionesSet).sort((a, b) => a.localeCompare(b));
  }

  private extraerFechaIsoLocal(fechaHora: string | Date | null | undefined): string {
    if (!fechaHora) return '';
    if (typeof fechaHora === 'string') {
    
      const match = fechaHora.match(/^(\d{4}-\d{2}-\d{2})/);
      if (match) return match[1];
    }
    const d = new Date(fechaHora);
    if (isNaN(d.getTime())) return '';
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  aplicarFiltros(): void {
    this.operacionesFiltradas = this.operaciones.filter((op) => {
      const fechaOp = this.extraerFechaIsoLocal(op.fechaHora);

      if (this.filtroFechaDesde && fechaOp && fechaOp < this.filtroFechaDesde) {
        return false;
      }
      if (this.filtroFechaHasta && fechaOp && fechaOp > this.filtroFechaHasta) {
        return false;
      }
      if (this.filtroRol !== 'TODOS') {
        const rolOp = (op.rol || '').trim();
        if (rolOp !== this.filtroRol) return false;
      }
      if (this.filtroAccion !== 'TODAS') {
        const accionOp = (op.accion || '').trim();
        if (accionOp !== this.filtroAccion) return false;
      }
      return true;
    });
    this.cdr.detectChanges();
  }

  limpiarFiltros(): void {
    this.filtroFechaDesde = '';
    this.filtroFechaHasta = '';
    this.filtroRol = 'TODOS';
    this.filtroAccion = 'TODAS';
    this.aplicarFiltros();
  }
}