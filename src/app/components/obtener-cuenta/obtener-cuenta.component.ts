import { CommonModule } from '@angular/common';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ClienteRequestDTO, ClienteResponseDTO } from '../../models/cliente.model';
import { ErrorResponse } from '../../models/sistema.model';
import { TiendaPublicaDTO } from '../../models/tienda.model';
import { AuthService } from '../../services/auth.service';
import { TiendaActivaService } from '../../services/tienda-activa.service';

const STORAGE_TIENDA_ASIGNADA = 'divinas_tienda_asignada';
const STORAGE_TIENDA_POR_USUARIO = 'divinas_tiendas_usuarios';
const CLAVE_RECORDAR_USUARIO = 'divinaspay_usuario_recordado';
const MAX_EMAIL_LENGTH = 30;

@Component({
  selector: 'app-obtener-cuenta',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './obtener-cuenta.component.html',
  styleUrl: './obtener-cuenta.component.css'
})
export class ObtenerCuentaComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);
  private readonly tiendaActivaService = inject(TiendaActivaService);
  private readonly cdr = inject(ChangeDetectorRef);

  readonly maxEmailLength = MAX_EMAIL_LENGTH;

  tiendasDisponibles: TiendaPublicaDTO[] = [];
  cargandoTiendas = true;
  enviando = false;
  errorMensaje: string | null = null;

  // Campos del formulario
  idTiendaSeleccionada: number | null = null;
  nombre = '';
  email = '';
  password = '';
  confirmarPassword = '';
  recordarAcceso = true;

  // Visibilidad de contraseñas
  mostrarPassword = false;
  mostrarConfirmarPassword = false;

  ngOnInit(): void {
    this.cargarTiendasActivas();
  }

  private cargarTiendasActivas(): void {
    this.cargandoTiendas = true;
    this.cdr.detectChanges();

    this.authService
      .listarTiendasPublicas()
      .pipe(
        finalize(() => {
          this.cargandoTiendas = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: (tiendas) => {
          this.tiendasDisponibles = tiendas || [];
          this.cdr.detectChanges();
        },
        error: () => {
          this.tiendasDisponibles = [];
          this.errorMensaje = 'No se pudieron cargar las tiendas activas disponibles.';
          this.cdr.detectChanges();
        }
      });
  }

  registrarCuenta(): void {
    this.errorMensaje = null;

    if (!this.idTiendaSeleccionada) {
      this.errorMensaje = 'Selecciona una tienda activa para vincular tu cuenta.';
      return;
    }

    const nombreLimpio = this.nombre.trim();
    const usuarioLimpio = this.email.trim();

    if (!nombreLimpio) {
      this.errorMensaje = 'Ingresa tu nombre.';
      return;
    }

    if (!usuarioLimpio) {
      this.errorMensaje = 'Ingresa tu email.';
      return;
    }

    if (usuarioLimpio.length > this.maxEmailLength) {
      this.errorMensaje = `El email no puede superar los ${this.maxEmailLength} caracteres.`;
      return;
    }

    if (!this.password || this.password.length < 8 || this.password.length > 72) {
      this.errorMensaje = 'La contraseña debe tener entre 8 y 72 caracteres.';
      return;
    }

    if (this.password !== this.confirmarPassword) {
      this.errorMensaje = 'Las contraseñas no coinciden.';
      return;
    }

    const idTienda = Number(this.idTiendaSeleccionada);
    const tiendaObj = this.tiendasDisponibles.find((t) => t.idTienda === idTienda);
    const nombreTienda = tiendaObj?.nombreTienda ?? `Tienda #${idTienda}`;

    // Valores crediticios iniciales requeridos por las restricciones CHECK de la tabla cliente
    const payload: ClienteRequestDTO = {
      nombreCliente: nombreLimpio,
      tipoTasa: 'Efectiva',
      tasaInteres: 24,
      capitalizacion: null,
      moneda: 'Soles',
      limiteMaxCredito: 1500,
      maxMesesCredito: 12,
      fechaCorte: 15,
      fechaPago: 25,
      usuarioCliente: usuarioLimpio,
      passwordCliente: this.password
    };

    this.enviando = true;
    this.cdr.detectChanges();

    // Endpoint público AuthController.registrarCliente -> inserta en la tabla cliente
    this.http
      .post<ClienteResponseDTO>(
        `${environment.apiUrl}/auth/registro/cliente/${idTienda}`,
        payload
      )
      .pipe(
        finalize(() => {
          this.enviando = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: (resp) => {
          const idTiendaFinal = resp?.idTienda ?? idTienda;
          this.fijarTiendaInmutable(usuarioLimpio, idTiendaFinal, nombreTienda);

          if (this.recordarAcceso) {
            localStorage.setItem(CLAVE_RECORDAR_USUARIO, usuarioLimpio);
          } else {
            localStorage.removeItem(CLAVE_RECORDAR_USUARIO);
          }

          this.router.navigate(['/login']);
        },
        error: (err: HttpErrorResponse) => {
          const body = err?.error as ErrorResponse | undefined;
          if (body?.detalles && Object.keys(body.detalles).length > 0) {
            this.errorMensaje = Object.values(body.detalles)[0];
          } else {
            this.errorMensaje =
              body?.mensaje || 'No se pudo completar el registro en la tienda seleccionada.';
          }
          this.cdr.detectChanges();
        }
      });
  }

  private fijarTiendaInmutable(usuario: string, idTienda: number, nombreTienda: string): void {
    localStorage.setItem(
      STORAGE_TIENDA_ASIGNADA,
      JSON.stringify({ idTienda, nombreTienda, bloqueada: true })
    );

    try {
      const mapaRaw = localStorage.getItem(STORAGE_TIENDA_POR_USUARIO);
      const mapa: Record<string, { idTienda: number; nombreTienda: string }> = mapaRaw
        ? JSON.parse(mapaRaw)
        : {};
      mapa[usuario.toLowerCase()] = { idTienda, nombreTienda };
      localStorage.setItem(STORAGE_TIENDA_POR_USUARIO, JSON.stringify(mapa));
    } catch {
      // Ignorar errores de almacenamiento local
    }

    this.tiendaActivaService.seleccionarTienda({ idTienda, nombreTienda });
  }
}