import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { finalize, timeout } from 'rxjs';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-crear-cliente',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './crear-cliente.component.html',
  styleUrl: './crear-cliente.component.css'
})
export class CrearClienteComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly cdr = inject(ChangeDetectorRef);

 
  idTienda = 1;
  nombreTienda = '';

  
  nombreCliente = '';
  tipoTasa: 'Efectiva' | 'Nominal' = 'Efectiva';
  tasaInteres = 24;
  capitalizacion = 'Mensual';
  readonly moneda = 'Soles'; 
  limiteMaxCredito = 1500;
  maxMesesCredito = 6;
  fechaCorte = 15;
  fechaPago = 20;
  usuarioCliente = '';
  passwordCliente = '';

  guardando = false;
  errorMensaje: string | null = null;

  ngOnInit(): void {
    this.detectarTiendaAdmin();
    this.cargarNombreTienda();
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
              this.idTienda = Number(claims.idTienda);
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
            this.idTienda = Number(idT);
            return;
          }
        } catch {
          
        }
      }
    }
  }

  private cargarNombreTienda(): void {
    this.http.get<any>(`${environment.apiUrl}/tiendas/${this.idTienda}`).subscribe({
      next: (t) => {
        this.nombreTienda = t?.nombreTienda || `Tienda #${this.idTienda}`;
        this.cdr.detectChanges();
      },
      error: () => {
        this.nombreTienda = `Tienda #${this.idTienda}`;
      }
    });
  }

  onCambioTipoTasa(): void {
    if (this.tipoTasa === 'Nominal' && !this.capitalizacion) {
      this.capitalizacion = 'Mensual';
    }
  }

  registrarCliente(): void {
    if (this.guardando) return;
    this.errorMensaje = null;

    if (!this.nombreCliente.trim()) {
      this.errorMensaje = 'Ingresa el nombre completo del cliente.';
      return;
    }
    if (!this.tasaInteres || this.tasaInteres <= 0) {
      this.errorMensaje = 'Ingresa una tasa de interés válida mayor a 0.';
      return;
    }
    if (!this.limiteMaxCredito || this.limiteMaxCredito <= 0) {
      this.errorMensaje = 'La línea de crédito máxima debe ser mayor a 0.';
      return;
    }
    if (!this.maxMesesCredito || this.maxMesesCredito < 1) {
      this.errorMensaje = 'El máximo de meses de crédito debe ser al menos 1.';
      return;
    }
    if (!this.fechaCorte || this.fechaCorte < 1 || this.fechaCorte > 31) {
      this.errorMensaje = 'El día de corte debe estar entre 1 y 31.';
      return;
    }
    if (!this.fechaPago || this.fechaPago < 1 || this.fechaPago > 31) {
      this.errorMensaje = 'El día de pago debe estar entre 1 y 31.';
      return;
    }
    if (!this.usuarioCliente.trim()) {
      this.errorMensaje = 'Ingresa el correo electrónico del cliente.';
      return;
    }
    if (this.usuarioCliente.trim().length > 30) {
      this.errorMensaje = 'El correo electrónico no puede superar los 30 caracteres.';
      return;
    }
    if (!this.passwordCliente.trim()) {
      this.errorMensaje = 'Ingresa la contraseña para el cliente.';
      return;
    }

    this.guardando = true;
    this.cdr.detectChanges();

    const payload = {
      nombreCliente: this.nombreCliente.trim(),
      tipoTasa: this.tipoTasa,
      tasaInteres: Number(this.tasaInteres),
      capitalizacion: this.tipoTasa === 'Nominal' ? this.capitalizacion : null,
      moneda: this.moneda,
      limiteMaxCredito: Number(this.limiteMaxCredito),
      maxMesesCredito: Number(this.maxMesesCredito),
      fechaCorte: Number(this.fechaCorte),
      fechaPago: Number(this.fechaPago),
      usuarioCliente: this.usuarioCliente.trim(),
      passwordCliente: this.passwordCliente.trim()
    };

    this.http
      .post(`${environment.apiUrl}/tiendas/${this.idTienda}/clientes`, payload)
      .pipe(
        timeout(8000),
        finalize(() => {
          this.guardando = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: () => {
          this.router.navigate(['/clientes']);
        },
        error: (err) => {
          this.errorMensaje =
            err?.error?.mensaje || 'No se pudo registrar el cliente. Verifica los datos ingresados.';
          this.cdr.detectChanges();
        }
      });
  }

  cancelar(): void {
    this.router.navigate(['/clientes']);
  }
}