import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  ProductoServicioRequestDTO,
  ProductoServicioResponseDTO
} from '../models/producto-servicio.model';

@Injectable({
  providedIn: 'root'
})
export class ProductoServicioService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/tiendas`;

  crear(
    idTienda: number,
    dto: ProductoServicioRequestDTO
  ): Observable<ProductoServicioResponseDTO> {
    return this.http.post<ProductoServicioResponseDTO>(
      `${this.baseUrl}/${idTienda}/productos`,
      dto
    );
  }

  listar(
    idTienda: number,
    soloActivos = false
  ): Observable<ProductoServicioResponseDTO[]> {
    const params = new HttpParams().set('soloActivos', soloActivos);
    return this.http.get<ProductoServicioResponseDTO[]>(
      `${this.baseUrl}/${idTienda}/productos`,
      { params }
    );
  }

  obtener(
    idTienda: number,
    idProducto: number
  ): Observable<ProductoServicioResponseDTO> {
    return this.http.get<ProductoServicioResponseDTO>(
      `${this.baseUrl}/${idTienda}/productos/${idProducto}`
    );
  }

  actualizar(
    idTienda: number,
    idProducto: number,
    dto: ProductoServicioRequestDTO
  ): Observable<ProductoServicioResponseDTO> {
    return this.http.put<ProductoServicioResponseDTO>(
      `${this.baseUrl}/${idTienda}/productos/${idProducto}`,
      dto
    );
  }

  darDeBaja(idTienda: number, idProducto: number): Observable<void> {
    return this.http.delete<void>(
      `${this.baseUrl}/${idTienda}/productos/${idProducto}`
    );
  }
}