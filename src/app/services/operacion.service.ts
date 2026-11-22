import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { OperacionResponseDTO } from '../models/sistema.model';

@Injectable({
  providedIn: 'root'
})
export class OperacionService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  listarPorTienda(
    idTienda: number,
    limite = 100
  ): Observable<OperacionResponseDTO[]> {
    const params = new HttpParams().set('limite', limite);
    return this.http.get<OperacionResponseDTO[]>(
      `${this.apiUrl}/tiendas/${idTienda}/operaciones`,
      { params }
    );
  }

  listarTodas(
    idTienda?: number | null,
    limite = 100
  ): Observable<OperacionResponseDTO[]> {
    let params = new HttpParams().set('limite', limite);
    if (idTienda != null) {
      params = params.set('idTienda', idTienda);
    }
    return this.http.get<OperacionResponseDTO[]>(`${this.apiUrl}/operaciones`, {
      params
    });
  }
}