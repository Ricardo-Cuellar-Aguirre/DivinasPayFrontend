import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivateFn, Router } from '@angular/router';
import { obtenerSesionAlmacenada } from '../interceptor/auth.interceptor';
import { RolUsuario } from '../models/auth.model';

export const roleGuard: CanActivateFn = (route: ActivatedRouteSnapshot) => {
  const router = inject(Router);
  const sesion = obtenerSesionAlmacenada();

  if (!sesion) {
    return router.createUrlTree(['/login']);
  }

  const rolesPermitidos = route.data?.['roles'] as RolUsuario[] | undefined;

  if (!rolesPermitidos || rolesPermitidos.length === 0) {
    return true;
  }

  if (rolesPermitidos.includes(sesion.rol)) {
    return true;
  }

  // Redirección segura según el rol real del token
  switch (sesion.rol) {
    case 'ADMIN_SISTEMA':
      return router.createUrlTree(['/tiendas']);
    case 'ADMIN_TIENDA':
      return router.createUrlTree(['/dashboard']);
    case 'CLIENTE':
      return router.createUrlTree(['/creditos']);
    default:
      return router.createUrlTree(['/login']);
  }
};