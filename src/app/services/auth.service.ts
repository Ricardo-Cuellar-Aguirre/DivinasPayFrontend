import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  limpiarSesionAlmacenada,
  obtenerSesionAlmacenada,
  SESSION_STORAGE_KEY,
  SesionAlmacenada
} from '../interceptor/auth.interceptor';
import {
  LoginRequestDTO,
  LoginResponseDTO,
  TiendaPublicaDTO
} from '../models/auth.model';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly baseUrl = `${environment.apiUrl}/auth`;

  private readonly sesionSubject = new BehaviorSubject<SesionAlmacenada | null>(
    obtenerSesionAlmacenada()
  );
  readonly sesion$ = this.sesionSubject.asObservable();

  get sesionActual(): SesionAlmacenada | null {
    return this.sesionSubject.value;
  }

  login(dto: LoginRequestDTO, recordarAcceso = false): Observable<LoginResponseDTO> {
    return this.http.post<LoginResponseDTO>(`${this.baseUrl}/login`, dto).pipe(
      tap((respuesta) => {
        const sesion: SesionAlmacenada = {
          ...respuesta,
          expiraEnTimestamp: Date.now() + respuesta.expiraEnSegundos * 1000
        };

        limpiarSesionAlmacenada();
        const storage = recordarAcceso ? localStorage : sessionStorage;
        storage.setItem(SESSION_STORAGE_KEY, JSON.stringify(sesion));
        this.sesionSubject.next(sesion);
      })
    );
  }

  listarTiendasPublicas(): Observable<TiendaPublicaDTO[]> {
    return this.http.get<TiendaPublicaDTO[]>(`${this.baseUrl}/tiendas`);
  }

  cerrarSesion(): void {
    limpiarSesionAlmacenada();
    this.sesionSubject.next(null);
    this.router.navigate(['/login']);
  }
}