import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  TiendaPublicaDTO,
  TiendaRequestDTO,
  TiendaResponseDTO,
  TiendaUpdateDTO
} from '../models/tienda.model';

@Injectable({
  providedIn: 'root'
})
export class TiendaService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/tiendas`;

  listarPublicas(): Observable<TiendaPublicaDTO[]> {
    return this.http.get<TiendaPublicaDTO[]>(`${environment.apiUrl}/auth/tiendas`);
  }

  listar(): Observable<TiendaResponseDTO[]> {
    return this.http.get<TiendaResponseDTO[]>(this.apiUrl);
  }

  obtener(idTienda: number): Observable<TiendaResponseDTO> {
    return this.http.get<TiendaResponseDTO>(`${this.apiUrl}/${idTienda}`);
  }

  crear(dto: TiendaRequestDTO): Observable<TiendaResponseDTO> {
    return this.http.post<TiendaResponseDTO>(this.apiUrl, dto);
  }

  actualizar(idTienda: number, dto: TiendaUpdateDTO): Observable<TiendaResponseDTO> {
    return this.http.put<TiendaResponseDTO>(`${this.apiUrl}/${idTienda}`, dto);
  }

  darDeBaja(idTienda: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${idTienda}`);
  }
}