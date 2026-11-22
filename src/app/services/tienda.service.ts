import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  TiendaRequestDTO,
  TiendaResponseDTO,
  TiendaUpdateDTO
} from '../models/tienda.model';

@Injectable({
  providedIn: 'root'
})
export class TiendaService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/tiendas`;

  crear(dto: TiendaRequestDTO): Observable<TiendaResponseDTO> {
    return this.http.post<TiendaResponseDTO>(this.baseUrl, dto);
  }

  listar(): Observable<TiendaResponseDTO[]> {
    return this.http.get<TiendaResponseDTO[]>(this.baseUrl);
  }

  obtener(idTienda: number): Observable<TiendaResponseDTO> {
    return this.http.get<TiendaResponseDTO>(`${this.baseUrl}/${idTienda}`);
  }

  actualizar(idTienda: number, dto: TiendaUpdateDTO): Observable<TiendaResponseDTO> {
    return this.http.put<TiendaResponseDTO>(`${this.baseUrl}/${idTienda}`, dto);
  }

  darDeBaja(idTienda: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${idTienda}`);
  }
}