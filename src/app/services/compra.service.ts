import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  CompraRequestDTO,
  CompraResponseDTO,
  SimulacionRequestDTO,
  SimulacionResponseDTO
} from '../models/compra.model';
import { PagoRequestDTO } from '../models/pago.model';

@Injectable({
  providedIn: 'root'
})
export class CompraService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/tiendas`;

  private rutaCompras(idTienda: number, idCliente: number): string {
    return `${this.baseUrl}/${idTienda}/clientes/${idCliente}/compras`;
  }

  simular(
    idTienda: number,
    idCliente: number,
    dto: SimulacionRequestDTO
  ): Observable<SimulacionResponseDTO> {
    return this.http.post<SimulacionResponseDTO>(
      `${this.rutaCompras(idTienda, idCliente)}/simular`,
      dto
    );
  }

  registrar(
    idTienda: number,
    idCliente: number,
    dto: CompraRequestDTO
  ): Observable<CompraResponseDTO> {
    return this.http.post<CompraResponseDTO>(
      this.rutaCompras(idTienda, idCliente),
      dto
    );
  }

  listarPorCliente(
    idTienda: number,
    idCliente: number
  ): Observable<CompraResponseDTO[]> {
    return this.http.get<CompraResponseDTO[]>(
      this.rutaCompras(idTienda, idCliente)
    );
  }

  obtener(
    idTienda: number,
    idCliente: number,
    idCompra: number
  ): Observable<CompraResponseDTO> {
    return this.http.get<CompraResponseDTO>(
      `${this.rutaCompras(idTienda, idCliente)}/${idCompra}`
    );
  }

  pagarCuota(
    idTienda: number,
    idCliente: number,
    idCompra: number,
    numeroCuota: number,
    dto?: PagoRequestDTO
  ): Observable<CompraResponseDTO> {
    return this.http.put<CompraResponseDTO>(
      `${this.rutaCompras(idTienda, idCliente)}/${idCompra}/cuotas/${numeroCuota}/pagar`,
      dto ?? {}
    );
  }
}