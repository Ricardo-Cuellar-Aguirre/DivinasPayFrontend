import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { ResumenTiendaDTO } from '../models/sistema.model';

@Injectable({
  providedIn: 'root'
})
export class ResumenService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/tiendas`;

  obtenerResumen(idTienda: number): Observable<ResumenTiendaDTO> {
    return this.http.get<ResumenTiendaDTO>(`${this.baseUrl}/${idTienda}/resumen`);
  }
}