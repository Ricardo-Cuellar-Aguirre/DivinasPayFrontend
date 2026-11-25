import { Routes } from '@angular/router';
import { authGuard } from './guard/auth.guard';
import { roleGuard } from './guard/role.guard';
import { LoginComponent } from './components/login/login.component';
import { LayoutComponent } from './components/layout/layout.component';
import { DashboardComponent } from './components/dashboard/dashboard.component';
import { ClientesComponent } from './components/clientes/clientes.component';
import { CrearClienteComponent } from './components/clientes/crear-cliente/crear-cliente.component';
import { PerfilCrediticioComponent } from './components/perfil-crediticio/perfil-crediticio.component';
import { ProductosComponent } from './components/productos/productos.component';
import { DetalleCreditoComponent } from './components/detalle-credito/detalle-credito.component';
import { TiendasComponent } from './components/tiendas/tiendas.component';
import { ConfiguracionComponent } from './components/configuracion/configuracion.component';
import { AuditoriaComponent } from './components/auditoria/auditoria.component';
import { ObtenerCuentaComponent } from './components/obtener-cuenta/obtener-cuenta.component';
import { NovedadesComponent } from './components/novedades/novedades.component';
import { UbicarTiendasComponent } from './components/ubicar-tiendas/ubicar-tiendas.component';

export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: 'login', component: LoginComponent },
  { path: 'registro', component: ObtenerCuentaComponent },
  {
    path: '',
    component: LayoutComponent,
    canActivate: [authGuard],
    children: [
      {
        path: 'novedades',
        component: NovedadesComponent,
        canActivate: [roleGuard],
        data: { roles: ['ADMIN_TIENDA', 'CLIENTE'] }
      },
      {
        path: 'ubicar-tiendas',
        component: UbicarTiendasComponent,
        canActivate: [roleGuard],
        data: { roles: ['ADMIN_TIENDA', 'CLIENTE'] }
      },
      {
        path: 'dashboard',
        component: DashboardComponent,
        canActivate: [roleGuard],
        data: { roles: ['ADMIN_TIENDA'] }
      },
      {
        path: 'clientes',
        component: ClientesComponent,
        canActivate: [roleGuard],
        data: { roles: ['ADMIN_TIENDA'] }
      },
      {
        path: 'clientes/nuevo',
        component: CrearClienteComponent,
        canActivate: [roleGuard],
        data: { roles: ['ADMIN_TIENDA'] }
      },
      {
        path: 'clientes/:idCliente',
        component: PerfilCrediticioComponent,
        canActivate: [roleGuard],
        data: { roles: ['ADMIN_TIENDA', 'CLIENTE'] }
      },
      {
        path: 'productos',
        component: ProductosComponent,
        canActivate: [roleGuard],
        data: { roles: ['ADMIN_TIENDA', 'CLIENTE'] }
      },
      {
        path: 'creditos',
        component: PerfilCrediticioComponent,
        canActivate: [roleGuard],
        data: { roles: ['ADMIN_TIENDA', 'CLIENTE'] }
      },
      {
        path: 'mis-compras',
        redirectTo: 'creditos',
        pathMatch: 'full'
      },
      {
        path: 'creditos/:idCliente/:idCompra',
        component: DetalleCreditoComponent,
        canActivate: [roleGuard],
        data: { roles: ['ADMIN_TIENDA', 'CLIENTE'] }
      },
      {
        path: 'tiendas',
        component: TiendasComponent,
        canActivate: [roleGuard],
        data: { roles: ['ADMIN_SISTEMA'] }
      },
      {
        path: 'auditoria',
        component: AuditoriaComponent,
        canActivate: [roleGuard],
        data: { roles: ['ADMIN_SISTEMA', 'ADMIN_TIENDA'] }
      },
      {
        path: 'configuracion',
        component: ConfiguracionComponent,
        canActivate: [roleGuard],
        data: { roles: ['ADMIN_TIENDA', 'CLIENTE'] }
      },
      {
        path: '',
        redirectTo: 'login',
        pathMatch: 'full'
      }
    ]
  },
  {
    path: '**',
    redirectTo: 'login'
  }
];