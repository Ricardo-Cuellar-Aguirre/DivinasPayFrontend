import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  ClienteRequestDTO,
  ClienteResponseDTO,
  ClienteUpdateDTO
} from '../models/cliente.model';

@Injectable({
  providedIn: 'root'
})
export class ClienteService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/tiendas`;

  crear(idTienda: number, dto: ClienteRequestDTO): Observable<ClienteResponseDTO> {
    return this.http.post<ClienteResponseDTO>(
      `${this.baseUrl}/${idTienda}/clientes`,
      dto
    );
  }

  listar(idTienda: number): Observable<ClienteResponseDTO[]> {
    return this.http.get<ClienteResponseDTO[]>(`${this.baseUrl}/${idTienda}/clientes`);
  }

  obtener(idTienda: number, idCliente: number): Observable<ClienteResponseDTO> {
    return this.http.get<ClienteResponseDTO>(
      `${this.baseUrl}/${idTienda}/clientes/${idCliente}`
    );
  }

  actualizar(
    idTienda: number,
    idCliente: number,
    dto: ClienteUpdateDTO
  ): Observable<ClienteResponseDTO> {
    return this.http.put<ClienteResponseDTO>(
      `${this.baseUrl}/${idTienda}/clientes/${idCliente}`,
      dto
    );
  }

  darDeBaja(idTienda: number, idCliente: number): Observable<void> {
    return this.http.delete<void>(
      `${this.baseUrl}/${idTienda}/clientes/${idCliente}`
    );
  }
}