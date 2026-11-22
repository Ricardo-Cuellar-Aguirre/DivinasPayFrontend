import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import {
  limpiarSesionAlmacenada,
  obtenerSesionAlmacenada
} from '../interceptor/auth.interceptor';

export const authGuard: CanActivateFn = () => {
  const router = inject(Router);
  const sesion = obtenerSesionAlmacenada();

  if (!sesion || !sesion.token) {
    return router.createUrlTree(['/login']);
  }

  if (sesion.expiraEnTimestamp && Date.now() >= sesion.expiraEnTimestamp) {
    limpiarSesionAlmacenada();
    return router.createUrlTree(['/login']);
  }

  return true;
};