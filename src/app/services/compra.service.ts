import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface ProductoBackendDTO {
  idProductoServicio: number;
  imagen: string | null;
  proveedor: string;
  marca: string;
  descripcion: string;
  unidadMedida: string;
  precioContado: number;
  precioCredito: number;
  formaVenta: 'En meses' | 'Al contado';
  estado?: boolean;
}

export interface CuotaBackendDTO {
  idCuota: number;
  numero: number;
  fechaVencimiento: string;
  saldoInicial: number;
  cuota: number;
  interes: number;
  amortizacion: number;
  saldoFinal: number;
  estado: 'Pendiente' | 'Pagado';
  fechaPagoReal: string | null;
}

export interface CompraBackendDTO {
  idCompra: number;
  idCliente: number;
  idProductoServicio: number;
  descripcionProducto: string;
  fechaCompra: string;
  monto: number;
  formaPago: 'En meses' | 'Unico pago';
  numMeses: number;
  fechaFinGracia: string;
  diasGracia: number;
  tasaEfectivaAnual: number;
  tasaEfectivaMensual: number;
  capitalCapitalizado: number;
  interesGracia: number;
  cuotaFija: number;
  cuotas: CuotaBackendDTO[];
  totalCuotas: number;
  totalIntereses: number;
  tir: number | null;
  tcea: number;
  ordenRecibo?: string;
  cantidadComprada?: number;
}

export interface SimularCompraRequest {
  fechaCompra?: string;
  monto: number;
  formaPago: 'En meses' | 'Unico pago';
  numMeses?: number;
}

export interface RegistrarCompraRequest {
  idProductoServicio: number;
  fechaCompra?: string;
  formaPago: 'En meses' | 'Unico pago';
  numMeses?: number;
  cantidadComprada: number;
}

export interface PagarCuotaRequest {
  fechaPago?: string;
}

export interface CompraPagoResumenDTO {
  idCompra: number;
  descripcionProducto: string;
  fechaCompra: string;
  monto: number;
  formaPago: 'En meses' | 'Unico pago';
  cuotasPagadas: number;
  cuotasTotales: number;
  cuotaAPagar: number | null;
  fechaProximoPago: string | null;
  saldoPendiente: number;
}

export interface ResumenPagosBackendDTO {
  idCliente: number;
  nombreCliente: string;
  limiteMaxCredito: number;
  limiteDisponible: number;
  saldoPendienteTotal: number;
  comprasEnCurso: number;
  compras?: CompraPagoResumenDTO[];
}

export interface DetalleListadoPagoDTO {
  idCompra: number;
  descripcionProducto: string;
  fechaCompra: string;
  montoCompra: number;
  formaPago: 'En meses' | 'Unico pago';
  numeroCuota: number;
  cuotasTotales: number;
  diasGracia: number;
  interesGracia: number;
  interesCuota: number;
  montoCuota: number;
}

export interface ListadoPagoClienteDTO {
  idCliente: number;
  nombreCliente: string;
  fechaCorte: number;
  fechaPago: string | null;
  totalInteresesAcumulados: number;
  totalAPagar: number;
  detalle: DetalleListadoPagoDTO[];
}

export type CompraResponse = CompraBackendDTO;
export type FilaCuotaResponse = CuotaBackendDTO;

@Injectable({
  providedIn: 'root'
})
export class CompraService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl;

  private decodificarJwtPayload(token: string): any | null {
    try {
      const limpio = token.replace(/^Bearer\s+/i, '').trim();
      const partes = limpio.split('.');
      if (partes.length !== 3) return null;

      let base64 = partes[1].replace(/-/g, '+').replace(/_/g, '/');
      while (base64.length % 4 !== 0) {
        base64 += '=';
      }
      return JSON.parse(atob(base64));
    } catch {
      return null;
    }
  }

  private obtenerIdsSesion(): { idTienda: number; idCliente: number } {
    const storages: Storage[] = [sessionStorage, localStorage];

    for (const storage of storages) {
      for (let i = 0; i < storage.length; i++) {
        const key = storage.key(i);
        if (!key) continue;
        const raw = storage.getItem(key);
        if (!raw || !raw.trim().startsWith('{')) continue;

        try {
          const obj = JSON.parse(raw);
          const idTienda = obj?.idTienda ?? obj?.tienda?.idTienda ?? obj?.sesion?.idTienda;
          const idCliente = obj?.idCliente ?? obj?.cliente?.idCliente ?? obj?.sesion?.idCliente;

          if (idTienda != null && idCliente != null) {
            return { idTienda: Number(idTienda), idCliente: Number(idCliente) };
          }
        } catch {
          
        }
      }
    }

    for (const storage of storages) {
      for (let i = 0; i < storage.length; i++) {
        const key = storage.key(i);
        if (!key) continue;
        const raw = storage.getItem(key);
        if (!raw) continue;

        if (raw.includes('eyJ')) {
          const posibleToken = raw.trim().startsWith('{')
            ? JSON.parse(raw)?.token || JSON.parse(raw)?.accessToken
            : raw;

          if (typeof posibleToken === 'string') {
            const claims = this.decodificarJwtPayload(posibleToken);
            if (claims?.idTienda != null && claims?.idCliente != null) {
              return {
                idTienda: Number(claims.idTienda),
                idCliente: Number(claims.idCliente)
              };
            }
          }
        }
      }
    }

    const tiendaAsignadaRaw = localStorage.getItem('divinas_tienda_asignada');
    const idTiendaFallback = tiendaAsignadaRaw ? JSON.parse(tiendaAsignadaRaw)?.idTienda || 1 : 1;
    return { idTienda: Number(idTiendaFallback), idCliente: 1 };
  }

  obtener(idCompra: number): Observable<CompraBackendDTO>;
  obtener(idCliente: number, idCompra: number): Observable<CompraBackendDTO>;
  obtener(idTienda: number, idCliente: number, idCompra: number): Observable<CompraBackendDTO>;
  obtener(arg1: number, arg2?: number, arg3?: number): Observable<CompraBackendDTO> {
    const sesion = this.obtenerIdsSesion();
    let idTienda = sesion.idTienda;
    let idCliente = sesion.idCliente;
    let idCompra = arg1;

    if (arg3 !== undefined && arg2 !== undefined) {
      idTienda = arg1;
      idCliente = arg2;
      idCompra = arg3;
    } else if (arg2 !== undefined) {
      idCliente = arg1;
      idCompra = arg2;
    }

    return this.http.get<CompraBackendDTO>(
      `${this.baseUrl}/tiendas/${idTienda}/clientes/${idCliente}/compras/${idCompra}`
    );
  }

  listar(): Observable<CompraBackendDTO[]>;
  listar(idCliente: number): Observable<CompraBackendDTO[]>;
  listar(idTienda: number, idCliente: number): Observable<CompraBackendDTO[]>;
  listar(arg1?: number, arg2?: number): Observable<CompraBackendDTO[]> {
    const sesion = this.obtenerIdsSesion();
    let idTienda = sesion.idTienda;
    let idCliente = sesion.idCliente;

    if (arg2 !== undefined && arg1 !== undefined) {
      idTienda = arg1;
      idCliente = arg2;
    } else if (arg1 !== undefined) {
      idCliente = arg1;
    }

    return this.http.get<CompraBackendDTO[]>(
      `${this.baseUrl}/tiendas/${idTienda}/clientes/${idCliente}/compras`
    );
  }

  listarMisCompras(): Observable<CompraBackendDTO[]> {
    return this.listar();
  }

  simular(payload: SimularCompraRequest): Observable<CompraBackendDTO>;
  simular(
    idTienda: number,
    idCliente: number,
    payload: SimularCompraRequest
  ): Observable<CompraBackendDTO>;
  simular(
    arg1: number | SimularCompraRequest,
    arg2?: number,
    arg3?: SimularCompraRequest
  ): Observable<CompraBackendDTO> {
    const sesion = this.obtenerIdsSesion();
    if (typeof arg1 === 'number' && arg2 !== undefined && arg3 !== undefined) {
      return this.http.post<CompraBackendDTO>(
        `${this.baseUrl}/tiendas/${arg1}/clientes/${arg2}/compras/simular`,
        arg3
      );
    }
    return this.http.post<CompraBackendDTO>(
      `${this.baseUrl}/tiendas/${sesion.idTienda}/clientes/${sesion.idCliente}/compras/simular`,
      arg1 as SimularCompraRequest
    );
  }

  simularCompra(payload: SimularCompraRequest): Observable<CompraBackendDTO> {
    return this.simular(payload);
  }

  registrar(payload: RegistrarCompraRequest): Observable<CompraBackendDTO>;
  registrar(
    idTienda: number,
    idCliente: number,
    payload: RegistrarCompraRequest
  ): Observable<CompraBackendDTO>;
  registrar(
    arg1: number | RegistrarCompraRequest,
    arg2?: number,
    arg3?: RegistrarCompraRequest
  ): Observable<CompraBackendDTO> {
    const sesion = this.obtenerIdsSesion();
    if (typeof arg1 === 'number' && arg2 !== undefined && arg3 !== undefined) {
      return this.http.post<CompraBackendDTO>(
        `${this.baseUrl}/tiendas/${arg1}/clientes/${arg2}/compras`,
        arg3
      );
    }
    return this.http.post<CompraBackendDTO>(
      `${this.baseUrl}/tiendas/${sesion.idTienda}/clientes/${sesion.idCliente}/compras`,
      arg1 as RegistrarCompraRequest
    );
  }

  registrarCompra(payload: RegistrarCompraRequest): Observable<CompraBackendDTO> {
    return this.registrar(payload);
  }

  pagarCuota(
    idCompra: number,
    numeroCuota: number,
    fechaPago?: string
  ): Observable<CompraBackendDTO>;
  pagarCuota(
    idTienda: number,
    idCliente: number,
    idCompra: number,
    numeroCuota: number,
    body?: string | PagarCuotaRequest
  ): Observable<CompraBackendDTO>;
  pagarCuota(
    arg1: number,
    arg2: number,
    arg3?: number | string,
    arg4?: number,
    arg5?: string | PagarCuotaRequest
  ): Observable<CompraBackendDTO> {
    const sesion = this.obtenerIdsSesion();

    if (typeof arg3 === 'number' && arg4 !== undefined) {
      const payload: PagarCuotaRequest =
        typeof arg5 === 'string'
          ? { fechaPago: arg5 }
          : arg5 ?? { fechaPago: new Date().toISOString().split('T')[0] };

      return this.http.put<CompraBackendDTO>(
        `${this.baseUrl}/tiendas/${arg1}/clientes/${arg2}/compras/${arg3}/cuotas/${arg4}/pagar`,
        payload
      );
    }

    const fecha = typeof arg3 === 'string' ? arg3 : new Date().toISOString().split('T')[0];
    return this.http.put<CompraBackendDTO>(
      `${this.baseUrl}/tiendas/${sesion.idTienda}/clientes/${sesion.idCliente}/compras/${arg1}/cuotas/${arg2}/pagar`,
      { fechaPago: fecha }
    );
  }

  obtenerPagos(): Observable<ResumenPagosBackendDTO>;
  obtenerPagos(idCliente: number): Observable<ResumenPagosBackendDTO>;
  obtenerPagos(idTienda: number, idCliente: number): Observable<ResumenPagosBackendDTO>;
  obtenerPagos(arg1?: number, arg2?: number): Observable<ResumenPagosBackendDTO> {
    const sesion = this.obtenerIdsSesion();
    let idTienda = sesion.idTienda;
    let idCliente = sesion.idCliente;

    if (arg2 !== undefined && arg1 !== undefined) {
      idTienda = arg1;
      idCliente = arg2;
    } else if (arg1 !== undefined) {
      idCliente = arg1;
    }

    return this.http.get<ResumenPagosBackendDTO>(
      `${this.baseUrl}/tiendas/${idTienda}/clientes/${idCliente}/pagos`
    );
  }

  obtenerResumenPagos(): Observable<ResumenPagosBackendDTO> {
    return this.obtenerPagos();
  }

  obtenerListadoPagoCliente(
    idTienda: number,
    idCliente: number,
    fechaPago?: string
  ): Observable<ListadoPagoClienteDTO> {
    let params = new HttpParams();
    if (fechaPago) {
      params = params.set('fechaPago', fechaPago);
    }
    return this.http.get<ListadoPagoClienteDTO>(
      `${this.baseUrl}/tiendas/${idTienda}/clientes/${idCliente}/listado-pago`,
      { params }
    );
  }

  obtenerListadoPagoTienda(
    idTienda: number,
    fechaPago?: string
  ): Observable<ListadoPagoClienteDTO[]> {
    let params = new HttpParams();
    if (fechaPago) {
      params = params.set('fechaPago', fechaPago);
    }
    return this.http.get<ListadoPagoClienteDTO[]>(
      `${this.baseUrl}/tiendas/${idTienda}/listado-pago`,
      { params }
    );
  }

  listarProductosActivos(): Observable<ProductoBackendDTO[]> {
    const { idTienda } = this.obtenerIdsSesion();
    return this.http.get<ProductoBackendDTO[]>(
      `${this.baseUrl}/tiendas/${idTienda}/productos?soloActivos=true`
    );
  }

  obtenerPerfilCliente(): Observable<any> {
    const { idTienda, idCliente } = this.obtenerIdsSesion();
    return this.http.get(`${this.baseUrl}/tiendas/${idTienda}/clientes/${idCliente}`);
  }
}