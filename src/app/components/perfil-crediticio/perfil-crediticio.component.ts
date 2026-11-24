import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { AuthService } from '../../services/auth.service';

export interface PerfilClienteData {
  idCliente: number;
  nombreCliente: string;
  usuarioCliente: string;
  tipoTasa: string;
  tasaInteres: number;
  maxMesesCredito: number;
  fechaCorte: number;
  fechaPago: number;
  limiteMaxCredito: number;
}

export interface CreditoActivoItem {
  idCompra: number;
  nombreProducto: string;
  descripcion: string;
  montoTotalFinanciado: number;
  cuotaFijaMensual: number;
  capitalPendiente: number;
  cuotasPagadas: number;
  totalCuotas: number;
  cuotasRestantes: number;
  fechaVencimientoProxima: string;
  numeroCuotaProxima: number;
  montoCuotaProxima: number;
}

export interface CompraHistorialItem {
  idCompra: number;
  nombreProducto: string;
  fechaCompra: string;
  fechaRaw: Date | null;
  numeroRecibo: string;
  cantidad: number;
  montoTotal: number;
}

@Component({
  selector: 'app-perfil-crediticio',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './perfil-crediticio.component.html',
  styleUrl: './perfil-crediticio.component.css'
})
export class PerfilCrediticioComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly cdr = inject(ChangeDetectorRef);

  tabActiva: 'ACTIVOS' | 'HISTORIAL' = 'ACTIVOS';
  cargando = true;

  cliente: PerfilClienteData = {
    idCliente: 0,
    nombreCliente: 'Cliente DivinasPay',
    usuarioCliente: 'cliente',
    tipoTasa: 'Efectiva',
    tasaInteres: 0,
    maxMesesCredito: 6,
    fechaCorte: 15,
    fechaPago: 20,
    limiteMaxCredito: 0
  };

  creditoUtilizado = 0;
  creditosActivos: CreditoActivoItem[] = [];
  historialCompleto: CompraHistorialItem[] = [];
  historialFiltrado: CompraHistorialItem[] = [];

  mesSeleccionado = '';
  anioSeleccionado = '';
  aniosDisponibles: number[] = [];

  readonly meses = [
    { valor: '1', nombre: 'Enero' },
    { valor: '2', nombre: 'Febrero' },
    { valor: '3', nombre: 'Marzo' },
    { valor: '4', nombre: 'Abril' },
    { valor: '5', nombre: 'Mayo' },
    { valor: '6', nombre: 'Junio' },
    { valor: '7', nombre: 'Julio' },
    { valor: '8', nombre: 'Agosto' },
    { valor: '9', nombre: 'Septiembre' },
    { valor: '10', nombre: 'Octubre' },
    { valor: '11', nombre: 'Noviembre' },
    { valor: '12', nombre: 'Diciembre' }
  ];

  ngOnInit(): void {
    const sesion = this.authService.sesionActual;
    const paramId = this.route.snapshot.paramMap.get('idCliente');
    const idCliente = paramId ? Number(paramId) : sesion?.idCliente ?? 0;
    const idTienda = sesion?.idTienda ?? 1;

    if (sesion?.nombre) {
      this.cliente.nombreCliente = sesion.nombre;
    }

    if (!idCliente) {
      this.cargando = false;
      this.cdr.detectChanges();
      return;
    }

    this.cargarDatosClienteYCompras(idTienda, idCliente);
  }

  private cargarDatosClienteYCompras(idTienda: number, idCliente: number): void {
    forkJoin({
      perfil: this.http
        .get<any>(`${environment.apiUrl}/tiendas/${idTienda}/clientes/${idCliente}`)
        .pipe(
          catchError(() =>
            this.http
              .get<any>(`${environment.apiUrl}/clientes/${idCliente}`)
              .pipe(catchError(() => of(null)))
          )
        ),
      compras: this.http
        .get<any[]>(`${environment.apiUrl}/clientes/${idCliente}/compras`)
        .pipe(
          catchError(() =>
            this.http
              .get<any[]>(`${environment.apiUrl}/tiendas/${idTienda}/clientes/${idCliente}/compras`)
              .pipe(catchError(() => of([])))
          )
        )
    }).subscribe(({ perfil, compras }) => {
      if (perfil) {
        this.cliente = {
          idCliente: perfil.idCliente ?? idCliente,
          nombreCliente: perfil.nombreCliente ?? this.cliente.nombreCliente,
          usuarioCliente: perfil.usuarioCliente ?? this.cliente.usuarioCliente,
          tipoTasa: perfil.tipoTasa ?? 'Efectiva',
          tasaInteres: Number(perfil.tasaInteres ?? 0),
          maxMesesCredito: Number(perfil.maxMesesCredito ?? 6),
          fechaCorte: Number(perfil.fechaCorte ?? 15),
          fechaPago: Number(perfil.fechaPago ?? 20),
          limiteMaxCredito: Number(perfil.limiteMaxCredito ?? 0)
        };
      }

      this.procesarCompras(compras || [], idCliente);
      this.cargando = false;
      this.cdr.detectChanges();
    });
  }

  private procesarCompras(listaCompras: any[], idCliente: number): void {
    const activosTemp: CreditoActivoItem[] = [];
    const historialTemp: CompraHistorialItem[] = [];

    for (const raw of listaCompras) {
      const formaPago = (raw.formaPago ?? '').toString().trim().toLowerCase();
      const estado = (raw.estado ?? '').toString().trim().toLowerCase();

      const nombreProd =
        raw.nombreProducto ??
        raw.productoServicio?.descripcion ??
        raw.producto?.descripcion ??
        raw.descripcion ??
        'Servicio / Producto DivinasPay';

      const descripcionProd =
        raw.descripcionProducto ??
        raw.productoServicio?.marca ??
        raw.observacion ??
        'Amortización francesa · Cuotas mensuales constantes';

      const montoTotal = Number(raw.montoTotal ?? raw.monto ?? 0);
      const cuotasArr: any[] = Array.isArray(raw.cuotas) ? raw.cuotas : [];
      const totalCuotas = Number(raw.numCuotas ?? raw.meses ?? cuotasArr.length ?? 1);

      const esEnMeses =
        formaPago.includes('mes') || formaPago.includes('credito') || formaPago.includes('crédito');
      const estaCancelada =
        estado === 'cancelado' || estado === 'pagado' || estado === 'finalizado';

      if (esEnMeses && !estaCancelada) {
        const pagadas = cuotasArr.filter(
          (q) =>
            (q.estado ?? '').toString().toLowerCase() === 'pagada' ||
            (q.estado ?? '').toString().toLowerCase() === 'pagado'
        ).length;

        const pendientes = cuotasArr.filter(
          (q) =>
            (q.estado ?? '').toString().toLowerCase() !== 'pagada' &&
            (q.estado ?? '').toString().toLowerCase() !== 'pagado'
        );

        const cuotaRef = pendientes[0] ?? cuotasArr[0];
        const cuotaFija = Number(
          cuotaRef?.montoCuota ??
            cuotaRef?.cuotaFija ??
            (totalCuotas > 0 ? montoTotal / totalCuotas : montoTotal)
        );

        const capitalPendiente = Math.max(
          0,
          Number((montoTotal - pagadas * cuotaFija).toFixed(2))
        );
        const numeroCuotaProxima = Number(cuotaRef?.numeroCuota ?? pagadas + 1);
        const fechaVenc = this.formatearFecha(cuotaRef?.fechaVencimiento ?? raw.fechaProximoPago);

        const itemCredito: CreditoActivoItem = {
          idCompra: raw.idCompra ?? 0,
          nombreProducto: nombreProd,
          descripcion: descripcionProd,
          montoTotalFinanciado: montoTotal,
          cuotaFijaMensual: cuotaFija,
          capitalPendiente,
          cuotasPagadas: pagadas,
          totalCuotas,
          cuotasRestantes: Math.max(0, totalCuotas - pagadas),
          fechaVencimientoProxima: fechaVenc,
          numeroCuotaProxima,
          montoCuotaProxima: cuotaFija
        };

        activosTemp.push(itemCredito);

        if (cuotasArr.length === 0 && raw.idCompra) {
          this.cargarCuotasDeCompra(idCliente, raw.idCompra, itemCredito);
        }
      }

      if (estaCancelada) {
        const fechaObj = this.parsearFecha(raw.fechaCompra ?? raw.fecha);
        historialTemp.push({
          idCompra: raw.idCompra ?? 0,
          nombreProducto: nombreProd,
          fechaCompra: this.formatearFecha(raw.fechaCompra ?? raw.fecha),
          fechaRaw: fechaObj,
          numeroRecibo:
            raw.numeroRecibo ??
            raw.codigoRecibo ??
            `REC-${String(raw.idCompra ?? 1).padStart(5, '0')}`,
          cantidad: Number(raw.cantidad ?? 1),
          montoTotal
        });
      }
    }

    this.creditosActivos = activosTemp;
    this.historialCompleto = historialTemp;
    this.recalcularCreditoUtilizado();
    this.extraerAniosHistorial();
    this.filtrarHistorial();
  }

  private cargarCuotasDeCompra(
    idCliente: number,
    idCompra: number,
    item: CreditoActivoItem
  ): void {
    this.http
      .get<any[]>(`${environment.apiUrl}/clientes/${idCliente}/compras/${idCompra}/cuotas`)
      .pipe(
        catchError(() =>
          this.http
            .get<any[]>(`${environment.apiUrl}/compras/${idCompra}/cuotas`)
            .pipe(catchError(() => of([])))
        )
      )
      .subscribe((cuotas) => {
        if (!cuotas || cuotas.length === 0) return;

        const pagadas = cuotas.filter(
          (q) =>
            (q.estado ?? '').toString().toLowerCase() === 'pagada' ||
            (q.estado ?? '').toString().toLowerCase() === 'pagado'
        ).length;
        const pendientes = cuotas.filter(
          (q) =>
            (q.estado ?? '').toString().toLowerCase() !== 'pagada' &&
            (q.estado ?? '').toString().toLowerCase() !== 'pagado'
        );
        const proxima = pendientes[0] ?? cuotas[0];

        item.totalCuotas = cuotas.length;
        item.cuotasPagadas = pagadas;
        item.cuotasRestantes = Math.max(0, cuotas.length - pagadas);
        item.cuotaFijaMensual = Number(
          proxima?.montoCuota ?? proxima?.cuotaFija ?? item.cuotaFijaMensual
        );
        item.capitalPendiente = Math.max(
          0,
          Number((item.montoTotalFinanciado - pagadas * item.cuotaFijaMensual).toFixed(2))
        );
        item.numeroCuotaProxima = Number(proxima?.numeroCuota ?? pagadas + 1);
        item.montoCuotaProxima = item.cuotaFijaMensual;
        item.fechaVencimientoProxima = this.formatearFecha(proxima?.fechaVencimiento);

        this.recalcularCreditoUtilizado();
        this.cdr.detectChanges();
      });
  }

  private recalcularCreditoUtilizado(): void {
    this.creditoUtilizado = this.creditosActivos.reduce(
      (acc, c) => acc + c.capitalPendiente,
      0
    );
  }

  get creditoDisponible(): number {
    return Math.max(0, this.cliente.limiteMaxCredito - this.creditoUtilizado);
  }

  get porcentajeUtilizado(): number {
    if (this.cliente.limiteMaxCredito <= 0) return 0;
    const pct = (this.creditoUtilizado / this.cliente.limiteMaxCredito) * 100;
    return Math.min(100, Math.max(0, pct));
  }

  get etiquetaTipoTasa(): string {
    const t = (this.cliente.tipoTasa ?? '').trim().toLowerCase();
    return t === 'nominal' ? 'TNA' : 'TEA';
  }

  private extraerAniosHistorial(): void {
    const setAnios = new Set<number>([new Date().getFullYear()]);
    for (const h of this.historialCompleto) {
      if (h.fechaRaw) {
        setAnios.add(h.fechaRaw.getFullYear());
      }
    }
    this.aniosDisponibles = Array.from(setAnios).sort((a, b) => b - a);
  }

  filtrarHistorial(): void {
    this.historialFiltrado = this.historialCompleto.filter((item) => {
      if (!item.fechaRaw) {
        return !this.mesSeleccionado && !this.anioSeleccionado;
      }
      const coincideMes =
        !this.mesSeleccionado ||
        item.fechaRaw.getMonth() + 1 === Number(this.mesSeleccionado);
      const coincideAnio =
        !this.anioSeleccionado ||
        item.fechaRaw.getFullYear() === Number(this.anioSeleccionado);
      return coincideMes && coincideAnio;
    });
    this.cdr.detectChanges();
  }

  cambiarTab(tab: 'ACTIVOS' | 'HISTORIAL'): void {
    this.tabActiva = tab;
    this.cdr.detectChanges();
  }

  private parsearFecha(valor: any): Date | null {
    if (!valor) return null;
    const d = new Date(valor);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  private formatearFecha(valor: any): string {
    const d = this.parsearFecha(valor);
    if (!d) return 'Por confirmar';
    const dia = String(d.getUTCDate()).padStart(2, '0');
    const mes = String(d.getUTCMonth() + 1).padStart(2, '0');
    const anio = d.getUTCFullYear();
    return `${dia}/${mes}/${anio}`;
  }
}