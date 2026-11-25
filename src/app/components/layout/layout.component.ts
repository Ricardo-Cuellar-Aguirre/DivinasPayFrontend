import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, HostListener, OnInit, inject } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { SesionAlmacenada } from '../../interceptor/auth.interceptor';
import { TiendaPublicaDTO } from '../../models/tienda.model';
import { AuthService } from '../../services/auth.service';
import { TiendaActivaService } from '../../services/tienda-activa.service';

interface MenuItem {
  label: string;
  route: string;
  icon: string;
}

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './layout.component.html',
  styleUrl: './layout.component.css'
})
export class LayoutComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly tiendaActivaService = inject(TiendaActivaService);
  private readonly router = inject(Router);
  private readonly cdr = inject(ChangeDetectorRef);

  sesion: SesionAlmacenada | null = null;
  nombreTiendaActual = 'Divinas Salón & Spa';
  direccionTiendaActual = 'Av. Santiago de Surco 1167, Lima';
  menuUsuarioAbierto = false;
  menuItems: MenuItem[] = [];

  ngOnInit(): void {
    this.sesion = this.authService.sesionActual;
    this.configurarMenuPorRol();

    this.tiendaActivaService.tiendaActiva$.subscribe((tienda) => {
      if (tienda) {
        this.nombreTiendaActual = tienda.nombreTienda;
        this.direccionTiendaActual = tienda.direccion || 'Lima, Perú';
        this.cdr.detectChanges();
      }
    });

    this.cargarDatosTienda();
  }

  private configurarMenuPorRol(): void {
    const rol = this.sesion?.rol;

    if (rol === 'CLIENTE') {
      this.menuItems = [
        { label: 'Lo nuevo', route: '/novedades', icon: 'assets/icons/menu-novedades.png' },
        { label: 'Productos y Servicios', route: '/productos', icon: 'assets/icons/menu-productos.png' },
        { label: 'Mi Tienda', route: '/ubicar-tiendas', icon: 'assets/icons/menu-tiendas.png' },
        { label: 'Mis Compras', route: '/creditos', icon: 'assets/icons/menu-compras.png' },
        { label: 'Mi perfil', route: '/configuracion', icon: 'assets/icons/menu-perfil.png' }
      ];
    } else if (rol === 'ADMIN_TIENDA') {
      this.menuItems = [
        { label: 'Dashboard', route: '/dashboard', icon: 'assets/icons/menu-novedades.png' },
        { label: 'Clientes', route: '/clientes', icon: 'assets/icons/menu-perfil.png' },
        { label: 'Productos y Servicios', route: '/productos', icon: 'assets/icons/menu-productos.png' },
        { label: 'Configuración', route: '/configuracion', icon: 'assets/icons/menu-tiendas.png' }
      ];
    } else {
      
      this.menuItems = [
        { label: 'Tiendas', route: '/tiendas', icon: 'assets/icons/menu-tiendas.png' },
        { label: 'Auditoría', route: '/auditoria', icon: 'assets/icons/menu-novedades.png' }
      ];
    }
  }

  private cargarDatosTienda(): void {
    this.authService.listarTiendasPublicas().subscribe({
      next: (tiendas: TiendaPublicaDTO[]) => {
        this.tiendaActivaService.inicializarSiVacio(tiendas, this.sesion?.idTienda);
        this.cdr.detectChanges();
      }
    });
  }

  get inicialesUsuario(): string {
    const nombre = this.sesion?.nombre?.trim() || 'US';
    const partes = nombre.split(/\s+/);
    if (partes.length >= 2) {
      return (partes[0][0] + partes[1][0]).toUpperCase();
    }
    return nombre.slice(0, 2).toUpperCase();
  }

  get etiquetaRol(): string {
    switch (this.sesion?.rol) {
      case 'CLIENTE':
        return 'Cliente';
      case 'ADMIN_TIENDA':
        return 'Administrador';
      case 'ADMIN_SISTEMA':
        return 'Admin Sistema';
      default:
        return 'Usuario';
    }
  }

  toggleMenuUsuario(event: Event): void {
    event.stopPropagation();
    this.menuUsuarioAbierto = !this.menuUsuarioAbierto;
    this.cdr.detectChanges();
  }

  @HostListener('document:click')
  cerrarMenuUsuario(): void {
    if (this.menuUsuarioAbierto) {
      this.menuUsuarioAbierto = false;
      this.cdr.detectChanges();
    }
  }

  irAEditarPerfil(): void {
    this.menuUsuarioAbierto = false;
    this.router.navigate(['/configuracion']);
  }

  cerrarSesion(): void {
    this.menuUsuarioAbierto = false;
    this.tiendaActivaService.limpiar();
    this.authService.cerrarSesion();
    this.router.navigate(['/login']);
  }
}