import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { finalize, timeout } from 'rxjs';
import { environment } from '../../../environments/environment';
import { CompraService } from '../../services/compra.service';

@Component({
  selector: 'app-configuracion',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './configuracion.component.html',
  styleUrl: './configuracion.component.css'
})
export class ConfiguracionComponent implements OnInit {
  private readonly compraService = inject(CompraService);
  private readonly http = inject(HttpClient);
  private readonly cdr = inject(ChangeDetectorRef);

  rolUsuario: 'CLIENTE' | 'ADMIN_TIENDA' | 'ADMIN_SISTEMA' = 'CLIENTE';
  idTienda = 1;
  idCliente = 1;
  nombreTienda = 'Divinas Salón & Spa';

  perfilOriginal: any = null;
  cargando = true;
  editando = false;
  guardando = false;

  mensajeExito: string | null = null;
  mensajeError: string | null = null;

  // Campos del formulario
  formNombre = '';
  formCorreo = '';
  formPassword = '';
  formTelefono = '';

  ngOnInit(): void {
    this.detectarSesion();
    this.cargarPerfil();
  }

  get fechaHoyTexto(): string {
    const hoy = new Date();
    const d = String(hoy.getDate()).padStart(2, '0');
    const m = String(hoy.getMonth() + 1).padStart(2, '0');
    const y = hoy.getFullYear();
    return `Hoy, ${d}/${m}/${y}`;
  }

  get esCliente(): boolean {
    return this.rolUsuario === 'CLIENTE';
  }

  get esAdminTienda(): boolean {
    return this.rolUsuario === 'ADMIN_TIENDA';
  }

  get puedeVolverAClientes(): boolean {
    return this.rolUsuario === 'ADMIN_TIENDA' || this.rolUsuario === 'ADMIN_SISTEMA';
  }

  private detectarSesion(): void {
    for (const storage of [sessionStorage, localStorage]) {
      for (let i = 0; i < storage.length; i++) {
        const key = storage.key(i);
        if (!key) continue;
        const raw = storage.getItem(key);
        if (!raw) continue;

        if (raw.trim().startsWith('{')) {
          try {
            const obj = JSON.parse(raw);
            if (obj?.rol) this.rolUsuario = obj.rol;
            if (obj?.idTienda != null) this.idTienda = Number(obj.idTienda);
            if (obj?.idCliente != null) this.idCliente = Number(obj.idCliente);
            if (obj?.nombreTienda) this.nombreTienda = obj.nombreTienda;
          } catch {
            // Ignorar
          }
        } else if (raw.includes('eyJ')) {
          const claims = this.decodificarJwt(raw);
          if (claims) {
            const rolToken = String(claims.rol || claims.role || '').replace('ROLE_', '');
            if (rolToken === 'ADMIN_TIENDA' || rolToken === 'ADMIN_SISTEMA' || rolToken === 'CLIENTE') {
              this.rolUsuario = rolToken;
            }
            if (claims.idTienda != null) this.idTienda = Number(claims.idTienda);
            if (claims.idCliente != null) this.idCliente = Number(claims.idCliente);
          }
        }
      }
    }

    const tiendaRaw = localStorage.getItem('divinas_tienda_asignada');
    if (tiendaRaw) {
      try {
        const t = JSON.parse(tiendaRaw);
        if (t?.nombreTienda) this.nombreTienda = t.nombreTienda;
        if (t?.idTienda) this.idTienda = Number(t.idTienda);
      } catch {
        // Ignorar
      }
    }
  }

  private decodificarJwt(token: string): any | null {
    try {
      const limpio = token.replace(/^Bearer\s+/i, '').trim();
      const partes = limpio.split('.');
      if (partes.length !== 3) return null;
      let base64 = partes[1].replace(/-/g, '+').replace(/_/g, '/');
      while (base64.length % 4 !== 0) base64 += '=';
      return JSON.parse(atob(base64));
    } catch {
      return null;
    }
  }

  cargarPerfil(): void {
    this.cargando = true;

    if (this.esCliente) {
      this.compraService
        .obtenerPerfilCliente()
        .pipe(
          timeout(8000),
          finalize(() => {
            this.cargando = false;
            this.cdr.detectChanges();
          })
        )
        .subscribe({
          next: (cli) => {
            this.perfilOriginal = cli;
            this.idCliente = cli?.idCliente ?? this.idCliente;
            this.idTienda = cli?.tienda?.idTienda ?? cli?.idTienda ?? this.idTienda;
            if (cli?.tienda?.nombreTienda) {
              this.nombreTienda = cli.tienda.nombreTienda;
            }
            this.sincronizarFormularioDesdePerfil();
            this.cdr.detectChanges();
          },
          error: () => {
            this.mensajeError = 'No se pudo cargar la información del cliente.';
            this.cdr.detectChanges();
          }
        });
    } else {
      this.http
        .get(`${environment.apiUrl}/tiendas/${this.idTienda}`)
        .pipe(
          timeout(8000),
          finalize(() => {
            this.cargando = false;
            this.cdr.detectChanges();
          })
        )
        .subscribe({
          next: (tienda: any) => {
            this.perfilOriginal = tienda;
            this.nombreTienda = tienda?.nombreTienda || this.nombreTienda;
            this.formNombre = tienda?.nombreAdmin || tienda?.nombreTienda || 'Administrador';
            this.formCorreo = tienda?.correoAdmin || tienda?.usuarioAdmin || 'admin@divinas.pe';
            this.formTelefono = tienda?.telefono || tienda?.telefonoTienda || '';
            this.formPassword = '';
            this.cdr.detectChanges();
          },
          error: () => {
            this.cargando = false;
            this.cdr.detectChanges();
          }
        });
    }
  }

  private sincronizarFormularioDesdePerfil(): void {
    if (!this.perfilOriginal) return;
    this.formNombre =
      this.perfilOriginal.nombreCliente ||
      this.perfilOriginal.nombre_cliente ||
      this.perfilOriginal.nombre ||
      '';
    this.formCorreo =
      this.perfilOriginal.usuarioCliente ||
      this.perfilOriginal.usuario_cliente ||
      this.perfilOriginal.correo ||
      '';
    this.formTelefono = this.perfilOriginal.telefono || '';
    this.formPassword = '';
  }

  activarEdicion(): void {
    this.mensajeExito = null;
    this.mensajeError = null;
    this.sincronizarFormularioDesdePerfil();
    this.editando = true;
    this.cdr.detectChanges();
  }

  cancelarEdicion(): void {
    this.editando = false;
    this.mensajeError = null;
    this.sincronizarFormularioDesdePerfil();
    this.cdr.detectChanges();
  }

  guardarCambios(): void {
    if (this.guardando) return;
    this.mensajeError = null;
    this.mensajeExito = null;

    if (!this.formNombre.trim()) {
      this.mensajeError = 'El nombre no puede estar vacío.';
      return;
    }
    if (!this.formCorreo.trim()) {
      this.mensajeError = 'El correo electrónico no puede estar vacío.';
      return;
    }

    this.guardando = true;
    this.cdr.detectChanges();

    if (this.esCliente) {
      const payload: Record<string, string> = {
        nombreCliente: this.formNombre.trim(),
        usuarioCliente: this.formCorreo.trim()
      };

      if (this.formPassword && this.formPassword.trim().length > 0) {
        payload['passwordCliente'] = this.formPassword.trim();
      }

      this.http
        .put(`${environment.apiUrl}/tiendas/${this.idTienda}/clientes/${this.idCliente}/perfil`, payload)
        .pipe(
          timeout(8000),
          finalize(() => {
            this.guardando = false;
            this.cdr.detectChanges();
          })
        )
        .subscribe({
          next: (actualizado: any) => {
            this.perfilOriginal = { ...this.perfilOriginal, ...actualizado };
            this.actualizarDatosEnStorage(this.formNombre.trim(), this.formCorreo.trim());
            this.editando = false;
            this.formPassword = '';
            this.mensajeExito = 'Tus datos personales se actualizaron correctamente.';
            this.cdr.detectChanges();
          },
          error: (err) => {
            this.mensajeError =
              err?.error?.mensaje || 'No se pudieron guardar los cambios en el servidor.';
            this.cdr.detectChanges();
          }
        });
    } else if (this.esAdminTienda) {
      const payloadTienda: any = {
        ...this.perfilOriginal,
        nombreAdmin: this.formNombre.trim(),
        correoAdmin: this.formCorreo.trim(),
        telefono: this.formTelefono.trim()
      };
      if (this.formPassword && this.formPassword.trim().length > 0) {
        payloadTienda.passwordAdmin = this.formPassword.trim();
      }

      this.http
        .put(`${environment.apiUrl}/tiendas/${this.idTienda}`, payloadTienda)
        .pipe(
          timeout(8000),
          finalize(() => {
            this.guardando = false;
            this.cdr.detectChanges();
          })
        )
        .subscribe({
          next: (resp: any) => {
            this.perfilOriginal = resp || payloadTienda;
            this.editando = false;
            this.formPassword = '';
            this.mensajeExito = 'Los datos del administrador se actualizaron correctamente.';
            this.cdr.detectChanges();
          },
          error: (err) => {
            this.mensajeError =
              err?.error?.mensaje || 'No se pudieron actualizar los datos de la tienda.';
            this.cdr.detectChanges();
          }
        });
    }
  }

  private actualizarDatosEnStorage(nuevoNombre: string, nuevoCorreo: string): void {
    for (const storage of [sessionStorage, localStorage]) {
      for (let i = 0; i < storage.length; i++) {
        const key = storage.key(i);
        if (!key) continue;
        const raw = storage.getItem(key);
        if (!raw || !raw.trim().startsWith('{')) continue;
        try {
          const obj = JSON.parse(raw);
          let modificado = false;
          if (obj.nombreCliente !== undefined) {
            obj.nombreCliente = nuevoNombre;
            modificado = true;
          }
          if (obj.nombre !== undefined) {
            obj.nombre = nuevoNombre;
            modificado = true;
          }
          if (obj.usuarioCliente !== undefined) {
            obj.usuarioCliente = nuevoCorreo;
            modificado = true;
          }
          if (modificado) {
            storage.setItem(key, JSON.stringify(obj));
          }
        } catch {
          // Ignorar
        }
      }
    }
  }
}