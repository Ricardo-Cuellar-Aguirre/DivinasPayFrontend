import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { catchError, finalize, forkJoin, of } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from '../../services/auth.service';
import { TiendaActivaService } from '../../services/tienda-activa.service';

export interface TiendaPublicaDTO {
  idTienda: number;
  nombreTienda: string;
}

export interface TiendaDetalleDTO {
  idTienda: number;
  nombreTienda: string;
  direccion: string;
  telefono: string;
  usuarioAdmin: string;
  estado: boolean;
}

export interface TarjetaTiendaVista {
  idTienda: number;
  nombreTienda: string;
  direccion?: string;
  telefono?: string;
  seleccionada: boolean;
}

const STORAGE_TIENDA_ASIGNADA = 'divinas_tienda_asignada';
const STORAGE_TIENDA_POR_USUARIO = 'divinas_tiendas_usuarios';

@Component({
  selector: 'app-ubicar-tiendas',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './ubicar-tiendas.component.html',
  styleUrl: './ubicar-tiendas.component.css'
})
export class UbicarTiendasComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);
  private readonly tiendaActivaService = inject(TiendaActivaService);
  private readonly cdr = inject(ChangeDetectorRef);

  tiendas: TarjetaTiendaVista[] = [];
  idTiendaAsignada: number | null = null;
  nombreTiendaAsignada = '';
  cargando = true;
  errorCarga: string | null = null;

  ngOnInit(): void {
    this.idTiendaAsignada = this.resolverIdTiendaDeCuenta();
    this.cargarTiendas();
  }

  /**
   * Obtiene el idTienda con el que fue creada la cuenta del cliente.
   * No permite cambiarlo por otra tienda.
   */
  private resolverIdTiendaDeCuenta(): number | null {
    const sesion = this.authService.sesionActual;
    if (sesion?.idTienda) {
      return Number(sesion.idTienda);
    }

    try {
      const usuario = (sesion as any)?.usuario ?? sesion?.nombre;
      if (usuario) {
        const mapaRaw = localStorage.getItem(STORAGE_TIENDA_POR_USUARIO);
        if (mapaRaw) {
          const mapa = JSON.parse(mapaRaw);
          const encontrada = mapa[String(usuario).toLowerCase()];
          if (encontrada?.idTienda) {
            return Number(encontrada.idTienda);
          }
        }
      }

      const asignadaRaw = localStorage.getItem(STORAGE_TIENDA_ASIGNADA);
      if (asignadaRaw) {
        const asignada = JSON.parse(asignadaRaw);
        if (asignada?.idTienda) {
          return Number(asignada.idTienda);
        }
      }
    } catch {
      // Ignorar errores de parseo
    }

    return null;
  }

  private cargarTiendas(): void {
    this.cargando = true;
    this.errorCarga = null;
    this.cdr.detectChanges();

    const peticionPublicas$ = this.http
      .get<TiendaPublicaDTO[]>(`${environment.apiUrl}/auth/tiendas`)
      .pipe(catchError(() => of([] as TiendaPublicaDTO[])));

    const peticionDetalleAsignada$ =
      this.idTiendaAsignada !== null
        ? this.http
            .get<TiendaDetalleDTO>(`${environment.apiUrl}/tiendas/${this.idTiendaAsignada}`)
            .pipe(catchError(() => of(null)))
        : of(null);

    forkJoin({
      publicas: peticionPublicas$,
      detalleAsignada: peticionDetalleAsignada$
    })
      .pipe(
        finalize(() => {
          this.cargando = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: ({ publicas, detalleAsignada }) => {
          const lista = publicas || [];

          this.tiendas = lista.map((t) => {
            const esTiendaCuenta =
              this.idTiendaAsignada !== null && t.idTienda === this.idTiendaAsignada;

            return {
              idTienda: t.idTienda,
              nombreTienda: t.nombreTienda,
              direccion: esTiendaCuenta ? detalleAsignada?.direccion : undefined,
              telefono: esTiendaCuenta ? detalleAsignada?.telefono : undefined,
              seleccionada: esTiendaCuenta
            };
          });

          const tiendaCuenta = this.tiendas.find((t) => t.seleccionada);
          if (tiendaCuenta) {
            this.nombreTiendaAsignada = tiendaCuenta.nombreTienda;
            this.sincronizarTiendaFija(tiendaCuenta.idTienda, tiendaCuenta.nombreTienda);
          }

          if (this.tiendas.length === 0) {
            this.errorCarga = 'No hay tiendas registradas disponibles en este momento.';
          }

          this.cdr.detectChanges();
        },
        error: () => {
          this.tiendas = [];
          this.errorCarga = 'No se pudo cargar la información de las tiendas.';
          this.cdr.detectChanges();
        }
      });
  }

  private sincronizarTiendaFija(idTienda: number, nombreTienda: string): void {
    const servicioAny = this.tiendaActivaService as any;
    if (typeof servicioAny.seleccionarTienda === 'function') {
      servicioAny.seleccionarTienda({ idTienda, nombreTienda });
    } else if (typeof servicioAny.setTiendaActiva === 'function') {
      servicioAny.setTiendaActiva({ idTienda, nombreTienda });
    }
  }
}