import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { ListadoPagoDTO } from '../models/pago.model';

@Injectable({
  providedIn: 'root'
})
export class ListadoPagoService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/tiendas`;

  obtenerPorCliente(
    idTienda: number,
    idCliente: number,
    fechaPago?: string
  ): Observable<ListadoPagoDTO> {
    let params = new HttpParams();
    if (fechaPago) {
      params = params.set('fechaPago', fechaPago);
    }

    return this.http.get<ListadoPagoDTO>(
      `${this.baseUrl}/${idTienda}/clientes/${idCliente}/listado-pago`,
      { params }
    );
  }

  obtenerPorTienda(
    idTienda: number,
    fechaPago?: string
  ): Observable<ListadoPagoDTO[]> {
    let params = new HttpParams();
    if (fechaPago) {
      params = params.set('fechaPago', fechaPago);
    }

    return this.http.get<ListadoPagoDTO[]>(
      `${this.baseUrl}/${idTienda}/listado-pago`,
      { params }
    );
  }
}