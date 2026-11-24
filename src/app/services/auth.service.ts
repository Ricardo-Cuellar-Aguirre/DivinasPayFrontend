import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { environment } from '../../environments/environment';
import { SesionAlmacenada } from '../interceptor/auth.interceptor';
import { LoginRequestDTO, LoginResponseDTO } from '../models/auth.model';
import { TiendaPublicaDTO } from '../models/tienda.model';

const CLAVE_SESION = 'divinaspay_sesion';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/auth`;

  login(dto: LoginRequestDTO): Observable<LoginResponseDTO> {
    return this.http.post<LoginResponseDTO>(`${this.apiUrl}/login`, dto).pipe(
      tap((resp) => {
        const sesion: SesionAlmacenada = {
          token: resp.token,
          tipoToken: resp.tipoToken,
          rol: resp.rol,
          idTienda: resp.idTienda,
          idCliente: resp.idCliente,
          nombre: resp.nombre,
          expiraEnSegundos: resp.expiraEnSegundos,
          expiraEnTimestamp: Date.now() + resp.expiraEnSegundos * 1000
        };
        localStorage.setItem(CLAVE_SESION, JSON.stringify(sesion));
      })
    );
  }

  listarTiendasPublicas(): Observable<TiendaPublicaDTO[]> {
    return this.http.get<TiendaPublicaDTO[]>(`${this.apiUrl}/tiendas`);
  }

  cerrarSesion(): void {
    localStorage.removeItem(CLAVE_SESION);
  }

  get sesionActual(): SesionAlmacenada | null {
    const raw = localStorage.getItem(CLAVE_SESION);
    if (!raw) return null;
    try {
      const sesion = JSON.parse(raw) as SesionAlmacenada;
      if (sesion.expiraEnTimestamp && Date.now() > sesion.expiraEnTimestamp) {
        this.cerrarSesion();
        return null;
      }
      return sesion;
    } catch {
      this.cerrarSesion();
      return null;
    }
  }

  estaAutenticado(): boolean {
    return this.sesionActual !== null;
  }
}