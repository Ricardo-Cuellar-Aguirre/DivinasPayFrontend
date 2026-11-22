import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { PagosClienteDTO } from '../models/pago.model';

@Injectable({
  providedIn: 'root'
})
export class PagoService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/tiendas`;

  obtenerEstadoCuenta(
    idTienda: number,
    idCliente: number
  ): Observable<PagosClienteDTO> {
    return this.http.get<PagosClienteDTO>(
      `${this.baseUrl}/${idTienda}/clientes/${idCliente}/pagos`
    );
  }
}