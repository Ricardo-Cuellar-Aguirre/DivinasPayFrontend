import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { finalize, timeout } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface ClienteListaDTO {
  idCliente: number;
  idTienda: number;
  nombreCliente: string;
  tipoTasa: string;
  tasaInteres: number;
  capitalizacion: string | null;
  moneda: string;
  limiteMaxCredito: number;
  maxMesesCredito: number;
  fechaCorte: number;
  fechaPago: number;
  usuarioCliente: string;
}

@Component({
  selector: 'app-clientes',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './clientes.component.html',
  styleUrl: './clientes.component.css'
})
export class ClientesComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly cdr = inject(ChangeDetectorRef);

  adminIdTienda = 1;
  clientes: ClienteListaDTO[] = [];
  cargando = true;
  mensajeExito: string | null = null;
  mensajeError: string | null = null;

  modalEditarAbierto = false;
  clienteEditando: ClienteListaDTO | null = null;
  editNombre = '';
  editCorreo = '';
  editLimiteMaxCredito = 1500;
  editMaxMesesCredito = 6;
  guardandoEdicion = false;
  errorEdicion: string | null = null;


  modalEliminarAbierto = false;
  clienteAEliminar: ClienteListaDTO | null = null;
  eliminando = false;

  ngOnInit(): void {
    this.detectarTiendaAdmin();
    this.cargarClientesTienda();
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
          // Ignorar
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

  cargarClientesTienda(): void {
    this.cargando = true;
    this.http
      .get<ClienteListaDTO[]>(`${environment.apiUrl}/tiendas/${this.adminIdTienda}/clientes`)
      .pipe(
        timeout(8000),
        finalize(() => {
          this.cargando = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: (lista) => {
          this.clientes = (lista || []).sort((a, b) => a.idCliente - b.idCliente);
          this.cdr.detectChanges();
        },
        error: () => {
          this.mensajeError = 'No se pudo cargar la lista de clientes de la tienda.';
          this.cdr.detectChanges();
        }
      });
  }

  irACrearUsuario(): void {
    this.router.navigate(['/clientes/nuevo']);
  }

  verCliente(cli: ClienteListaDTO): void {
    this.router.navigate(['/clientes', cli.idCliente]);
  }

  etiquetaTasa(cli: ClienteListaDTO): string {
    if ((cli.tipoTasa || '').toLowerCase() === 'nominal') {
      const mapa: Record<string, string> = {
        diaria: 'TND',
        mensual: 'TNM',
        bimestral: 'TNB',
        trimestral: 'TNT',
        cuatrimestral: 'TNC',
        semestral: 'TNS',
        anual: 'TNA'
      };
      const sigla = mapa[(cli.capitalizacion || '').toLowerCase()] || 'TNM';
      return `${sigla} ${Number(cli.tasaInteres).toFixed(2)}%`;
    }
    return `TEA ${Number(cli.tasaInteres).toFixed(2)}%`;
  }


  abrirModalEditar(cli: ClienteListaDTO): void {
    this.clienteEditando = cli;
    this.editNombre = cli.nombreCliente;
    this.editCorreo = cli.usuarioCliente;
    this.editLimiteMaxCredito = Number(cli.limiteMaxCredito);
    this.editMaxMesesCredito = Number(cli.maxMesesCredito);
    this.errorEdicion = null;
    this.modalEditarAbierto = true;
    this.cdr.detectChanges();
  }

  cerrarModalEditar(): void {
    if (this.guardandoEdicion) return;
    this.modalEditarAbierto = false;
    this.clienteEditando = null;
    this.errorEdicion = null;
    this.cdr.detectChanges();
  }

  guardarEdicionCliente(): void {
    if (!this.clienteEditando || this.guardandoEdicion) return;
    this.errorEdicion = null;

    if (!this.editNombre.trim()) {
      this.errorEdicion = 'El nombre del cliente es obligatorio.';
      return;
    }
    if (!this.editCorreo.trim() || this.editCorreo.trim().length > 30) {
      this.errorEdicion = 'El correo es obligatorio y no debe superar los 30 caracteres.';
      return;
    }
    if (!this.editLimiteMaxCredito || this.editLimiteMaxCredito <= 0) {
      this.errorEdicion = 'La línea máxima de crédito debe ser mayor a 0.';
      return;
    }
    if (!this.editMaxMesesCredito || this.editMaxMesesCredito < 1) {
      this.errorEdicion = 'El máximo de meses debe ser al menos 1.';
      return;
    }

    this.guardandoEdicion = true;
    this.cdr.detectChanges();

    const payload = {
      nombreCliente: this.editNombre.trim(),
      tipoTasa: this.clienteEditando.tipoTasa,
      tasaInteres: this.clienteEditando.tasaInteres,
      capitalizacion:
        this.clienteEditando.tipoTasa === 'Efectiva' ? null : this.clienteEditando.capitalizacion,
      moneda: this.clienteEditando.moneda || 'Soles',
      limiteMaxCredito: Number(this.editLimiteMaxCredito),
      maxMesesCredito: Number(this.editMaxMesesCredito),
      fechaCorte: this.clienteEditando.fechaCorte,
      fechaPago: this.clienteEditando.fechaPago,
      usuarioCliente: this.editCorreo.trim()
    };

    this.http
      .put(
        `${environment.apiUrl}/tiendas/${this.adminIdTienda}/clientes/${this.clienteEditando.idCliente}`,
        payload
      )
      .pipe(
        timeout(8000),
        finalize(() => {
          this.guardandoEdicion = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: () => {
          const nombre = this.editNombre.trim();
          this.modalEditarAbierto = false;
          this.clienteEditando = null;
          this.mensajeExito = `Datos de "${nombre}" actualizados correctamente.`;
          this.cargarClientesTienda();
        },
        error: (err) => {
          this.errorEdicion = err?.error?.mensaje || 'No se pudieron actualizar los datos del cliente.';
          this.cdr.detectChanges();
        }
      });
  }

  
  confirmarDarDeBaja(cli: ClienteListaDTO): void {
    this.clienteAEliminar = cli;
    this.modalEliminarAbierto = true;
    this.cdr.detectChanges();
  }

  cerrarModalEliminar(): void {
    if (this.eliminando) return;
    this.modalEliminarAbierto = false;
    this.clienteAEliminar = null;
    this.cdr.detectChanges();
  }

  ejecutarDarDeBaja(): void {
    if (!this.clienteAEliminar || this.eliminando) return;
    this.eliminando = true;
    this.cdr.detectChanges();

    const idCliente = this.clienteAEliminar.idCliente;
    const nombre = this.clienteAEliminar.nombreCliente;

    this.http
      .delete(`${environment.apiUrl}/tiendas/${this.adminIdTienda}/clientes/${idCliente}`)
      .pipe(
        timeout(8000),
        finalize(() => {
          this.eliminando = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: () => {
          this.modalEliminarAbierto = false;
          this.clienteAEliminar = null;
          this.mensajeExito = `El cliente "${nombre}" fue eliminado de la base de datos.`;
          this.cargarClientesTienda();
        },
        error: (err) => {
          this.modalEliminarAbierto = false;
          this.clienteAEliminar = null;
          this.mensajeError = err?.error?.mensaje || 'No se pudo eliminar al cliente de la base de datos.';
          this.cdr.detectChanges();
        }
      });
  }
}