import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivateFn, Router } from '@angular/router';
import { RolUsuario } from '../models/auth.model';
import { AuthService } from '../services/auth.service';

export const roleGuard: CanActivateFn = (route: ActivatedRouteSnapshot) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const sesion = authService.sesionActual;

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

  switch (sesion.rol) {
    case 'ADMIN_SISTEMA':
      return router.createUrlTree(['/tiendas']);
    case 'ADMIN_TIENDA':
      return router.createUrlTree(['/dashboard']);
    case 'CLIENTE':
      return router.createUrlTree(['/productos']);
    default:
      return router.createUrlTree(['/login']);
  }
};