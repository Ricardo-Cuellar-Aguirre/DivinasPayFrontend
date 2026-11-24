import { HttpInterceptorFn } from '@angular/common/http';
import { RolUsuario } from '../models/auth.model';

const CLAVE_SESION = 'divinaspay_sesion';

export interface SesionAlmacenada {
  token: string;
  tipoToken: string;
  rol: RolUsuario;
  idTienda: number | null;
  idCliente: number | null;
  nombre: string;
  expiraEnSegundos: number;
  expiraEnTimestamp: number;
}

export function obtenerSesionAlmacenada(): SesionAlmacenada | null {
  const raw = localStorage.getItem(CLAVE_SESION);
  if (!raw) return null;
  try {
    const sesion = JSON.parse(raw) as SesionAlmacenada;
    if (sesion.expiraEnTimestamp && Date.now() > sesion.expiraEnTimestamp) {
      localStorage.removeItem(CLAVE_SESION);
      return null;
    }
    return sesion;
  } catch {
    localStorage.removeItem(CLAVE_SESION);
    return null;
  }
}

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  if (req.url.includes('/api/auth/')) {
    return next(req);
  }

  const sesion = obtenerSesionAlmacenada();
  if (!sesion?.token) {
    return next(req);
  }

  const reqAutenticada = req.clone({
    setHeaders: {
      Authorization: `${sesion.tipoToken || 'Bearer'} ${sesion.token}`
    }
  });

  return next(reqAutenticada);
};