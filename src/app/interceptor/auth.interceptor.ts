import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { environment } from '../../environments/environment';
import { LoginResponseDTO } from '../models/auth.model';

export interface SesionAlmacenada extends LoginResponseDTO {
  expiraEnTimestamp: number;
}

export const SESSION_STORAGE_KEY = 'divinas_sesion';

export function obtenerSesionAlmacenada(): SesionAlmacenada | null {
  const raw =
    localStorage.getItem(SESSION_STORAGE_KEY) ??
    sessionStorage.getItem(SESSION_STORAGE_KEY);

  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as SesionAlmacenada;
  } catch {
    limpiarSesionAlmacenada();
    return null;
  }
}

export function limpiarSesionAlmacenada(): void {
  localStorage.removeItem(SESSION_STORAGE_KEY);
  sessionStorage.removeItem(SESSION_STORAGE_KEY);
}

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  const esApiPropia = req.url.startsWith(environment.apiUrl);
  const esEndpointPublico =
    req.url.includes('/auth/login') || req.url.includes('/auth/tiendas');

  let requestClonada = req;

  if (esApiPropia && !esEndpointPublico) {
    const sesion = obtenerSesionAlmacenada();
    if (sesion?.token) {
      const prefijo = sesion.tipoToken || 'Bearer';
      requestClonada = req.clone({
        setHeaders: {
          Authorization: `${prefijo} ${sesion.token}`
        }
      });
    }
  }

  return next(requestClonada).pipe(
    catchError((error: HttpErrorResponse) => {
      if (esApiPropia && !esEndpointPublico && error.status === 401) {
        limpiarSesionAlmacenada();
        router.navigate(['/login']);
      }
      return throwError(() => error);
    })
  );
};