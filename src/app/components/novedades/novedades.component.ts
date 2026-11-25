import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { CompraService } from '../../services/compra.service';

export interface SolicitudLineaCredito {
  idSolicitud: string;
  idTienda: number;
  idCliente: number;
  nombreCliente: string;
  lineaActual: number;
  lineaSolicitada: number;
  motivo: string;
  fechaRegistro: string;
  estado: 'En evaluación' | 'Aprobada' | 'Rechazada';
}

@Component({
  selector: 'app-novedades',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './novedades.component.html',
  styleUrl: './novedades.component.css'
})
export class NovedadesComponent implements OnInit {
  private readonly compraService = inject(CompraService);
  private readonly cdr = inject(ChangeDetectorRef);

  perfilCliente: any = null;
  lineaActual = 1500;
  maxMesesCliente = 12;

  modalSimuladorAbierto = false;
  montoLibre: number | null = 250;
  cuotasLibre = 3;
  cuotaCalculada = 0;
  totalAPagarCalculado = 0;
  interesesTotalesCalculados = 0;
  teaAplicada = 0;
  temAplicada = 0;

  modalPostulacionAbierto = false;
  montoNuevaLinea: number | null = 2500;
  motivoPostulacion = '';
  errorPostulacion: string | null = null;
  solicitudRegistrada: SolicitudLineaCredito | null = null;

  ngOnInit(): void {
    this.compraService.obtenerPerfilCliente().subscribe({
      next: (perfil) => {
        this.perfilCliente = perfil;
        if (perfil?.limiteMaxCredito) {
          this.lineaActual = Number(perfil.limiteMaxCredito);
          this.montoNuevaLinea = this.lineaActual + 500;
        }
        if (perfil?.maxMesesCredito) {
          this.maxMesesCliente = Number(perfil.maxMesesCredito);
          this.cuotasLibre = Math.min(3, this.maxMesesCliente);
        }
        this.cargarSolicitudPrevia(perfil?.idCliente ?? 1);
        this.recalcularSimulacionLibre();
        this.cdr.detectChanges();
      },
      error: () => {
        this.recalcularSimulacionLibre();
      }
    });
  }

  private cargarSolicitudPrevia(idCliente: number): void {
    try {
      const raw = localStorage.getItem('divinas_solicitudes_linea');
      if (!raw) return;
      const lista: SolicitudLineaCredito[] = JSON.parse(raw);
      const encontrada = lista.find((s) => s.idCliente === idCliente);
      if (encontrada) {
        this.solicitudRegistrada = encontrada;
      }
    } catch {
     
    }
  }

  get opcionesCuotas(): number[] {
    const arr: number[] = [];
    const max = this.maxMesesCliente >= 2 ? this.maxMesesCliente : 12;
    for (let i = 2; i <= max; i++) {
      arr.push(i);
    }
    return arr;
  }

  get etiquetaTasaCliente(): string {
    const tipo = (this.perfilCliente?.tipoTasa || 'Efectiva').trim().toLowerCase();
    const tasa = Number(this.perfilCliente?.tasaInteres ?? 24).toFixed(2);
    if (tipo === 'nominal') {
      const cap = (this.perfilCliente?.capitalizacion || 'Mensual').trim().toLowerCase();
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
      return `${sigla} ${tasa}% (${this.perfilCliente?.capitalizacion || 'Mensual'})`;
    }
    return `TEA ${tasa}%`;
  }

  abrirSimuladorLibre(): void {
    if (!this.montoLibre || this.montoLibre <= 0) {
      this.montoLibre = 250;
    }
    this.recalcularSimulacionLibre();
    this.modalSimuladorAbierto = true;
    this.cdr.detectChanges();
  }

  cerrarSimuladorLibre(): void {
    this.modalSimuladorAbierto = false;
    this.cdr.detectChanges();
  }

  recalcularSimulacionLibre(): void {
    const monto = Number(this.montoLibre ?? 0);
    const n = Number(this.cuotasLibre || 1);

    if (monto <= 0 || n < 1) {
      this.cuotaCalculada = 0;
      this.totalAPagarCalculado = 0;
      this.interesesTotalesCalculados = 0;
      return;
    }

    const r2 = (v: number) => Math.round((v + Number.EPSILON) * 100) / 100;
    const tasaPct = Number(this.perfilCliente?.tasaInteres ?? 24);
    const tipoTasa = (this.perfilCliente?.tipoTasa || 'Efectiva').trim().toLowerCase();
    const cap = (this.perfilCliente?.capitalizacion || 'Mensual').trim().toLowerCase();

    const mapaM: Record<string, number> = {
      diaria: 360,
      mensual: 12,
      bimestral: 6,
      trimestral: 4,
      cuatrimestral: 3,
      semestral: 2,
      anual: 1
    };

    const tasaDecimal = tasaPct / 100;
    const tea =
      tipoTasa === 'nominal'
        ? Math.pow(1 + tasaDecimal / (mapaM[cap] || 12), mapaM[cap] || 12) - 1
        : tasaDecimal;
    const tem = Math.pow(1 + tea, 30 / 360) - 1;

    this.teaAplicada = tea * 100;
    this.temAplicada = tem * 100;

    if (tem <= 0) {
      this.cuotaCalculada = r2(monto / n);
      this.totalAPagarCalculado = r2(monto);
      this.interesesTotalesCalculados = 0;
      return;
    }

    const factor = Math.pow(1 + tem, n);
    const cuotaFija = r2((monto * tem * factor) / (factor - 1));
    const totalPagar = r2(cuotaFija * n);
    const intereses = r2(Math.max(0, totalPagar - monto));

    this.cuotaCalculada = cuotaFija;
    this.totalAPagarCalculado = totalPagar;
    this.interesesTotalesCalculados = intereses;
  }

  abrirModalPostulacion(): void {
    this.errorPostulacion = null;
    if (!this.montoNuevaLinea || this.montoNuevaLinea <= this.lineaActual) {
      this.montoNuevaLinea = this.lineaActual + 500;
    }
    this.modalPostulacionAbierto = true;
    this.cdr.detectChanges();
  }

  cerrarModalPostulacion(): void {
    this.modalPostulacionAbierto = false;
    this.errorPostulacion = null;
    this.cdr.detectChanges();
  }

  registrarPostulacion(): void {
    this.errorPostulacion = null;
    const montoDeseado = Number(this.montoNuevaLinea ?? 0);

    if (!montoDeseado || montoDeseado <= this.lineaActual) {
      this.errorPostulacion = `El monto solicitado debe ser mayor a tu línea actual (S/ ${this.lineaActual.toFixed(2)}).`;
      return;
    }

    const hoy = new Date();
    const fechaIso = `${String(hoy.getDate()).padStart(2, '0')}/${String(hoy.getMonth() + 1).padStart(2, '0')}/${hoy.getFullYear()}`;
    const idCliente = Number(this.perfilCliente?.idCliente ?? 1);
    const idTienda = Number(this.perfilCliente?.idTienda ?? this.perfilCliente?.tienda?.idTienda ?? 1);

    const nuevaSolicitud: SolicitudLineaCredito = {
      idSolicitud: `SOL-${Math.floor(10000 + Math.random() * 90000)}`,
      idTienda,
      idCliente,
      nombreCliente: this.perfilCliente?.nombreCliente || 'Cliente',
      lineaActual: this.lineaActual,
      lineaSolicitada: montoDeseado,
      motivo: this.motivoPostulacion.trim() || 'Ampliación de línea de crédito',
      fechaRegistro: fechaIso,
      estado: 'En evaluación'
    };

    try {
      const raw = localStorage.getItem('divinas_solicitudes_linea');
      const lista: SolicitudLineaCredito[] = raw ? JSON.parse(raw) : [];
      const filtrada = lista.filter((s) => s.idCliente !== idCliente);
      filtrada.unshift(nuevaSolicitud);
      localStorage.setItem('divinas_solicitudes_linea', JSON.stringify(filtrada));
    } catch {
     
    }

    this.solicitudRegistrada = nuevaSolicitud;
    this.modalPostulacionAbierto = false;
    this.cdr.detectChanges();
  }
}