import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { catchError, finalize, forkJoin, of, switchMap, timeout } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from '../../services/auth.service';
import {
  CompraBackendDTO,
  CompraService,
  CuotaBackendDTO,
  ProductoBackendDTO
} from '../../services/compra.service';

export interface ProductoAdminDTO extends Omit<ProductoBackendDTO, 'proveedor' | 'estado'> {
  proveedor?: string | null;
  estado?: boolean;
}

@Component({
  selector: 'app-productos',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './productos.component.html',
  styleUrl: './productos.component.css',
  styles: [`
    .admin-toolbar-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 0.85rem;
      margin-bottom: 1.25rem;
    }
    .filtro-estado-group {
      display: inline-flex;
      background-color: #efece4;
      border: 1px solid #dfd9cc;
      border-radius: 10px;
      padding: 0.25rem;
      gap: 0.25rem;
    }
    .filtro-pill-btn {
      background: transparent;
      border: none;
      border-radius: 8px;
      padding: 0.42rem 0.9rem;
      font-family: inherit;
      font-size: 0.8rem;
      font-weight: 700;
      color: #5e6660;
      cursor: pointer;
    }
    .filtro-pill-btn.active {
      background-color: #283b2e;
      color: #ffffff;
    }
    .btn-crear-prod {
      background-color: #283b2e;
      color: #ffffff;
      border: none;
      border-radius: 10px;
      padding: 0.62rem 1.15rem;
      font-family: inherit;
      font-size: 0.84rem;
      font-weight: 700;
      cursor: pointer;
    }
    .btn-crear-prod:hover {
      background-color: #1c2a20;
    }
    .alert-admin-banner {
      padding: 0.72rem 1rem;
      border-radius: 10px;
      margin-bottom: 1rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 0.84rem;
      font-weight: 600;
    }
    .alert-admin-banner.exito {
      background-color: #e3ece5;
      border: 1px solid #b9d4c0;
      color: #1f3b28;
    }
    .alert-admin-banner.error {
      background-color: #fef2f2;
      border: 1px solid #fecaca;
      color: #b91c1c;
    }
    .alert-admin-banner button {
      background: transparent;
      border: none;
      cursor: pointer;
      font-weight: 700;
    }
    .admin-card-actions {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0.55rem;
      margin-top: 0.85rem;
    }
    .btn-card-editar {
      height: 38px;
      background-color: #ffffff;
      border: 1.5px solid #283b2e;
      color: #283b2e;
      border-radius: 9px;
      font-family: inherit;
      font-size: 0.82rem;
      font-weight: 700;
      cursor: pointer;
    }
    .btn-card-editar:hover {
      background-color: #e8efe9;
    }
    .btn-card-eliminar {
      height: 38px;
      background-color: #fef2f2;
      border: 1px solid #fecaca;
      color: #b91c1c;
      border-radius: 9px;
      font-family: inherit;
      font-size: 0.82rem;
      font-weight: 700;
      cursor: pointer;
    }
    .btn-card-eliminar:hover {
      background-color: #fee2e2;
    }
    .producto-card.bloqueada {
      background-color: #f2efe8;
      border-color: #d6d0c4;
      opacity: 0.86;
    }
    .producto-card.bloqueada .producto-img {
      filter: grayscale(85%) brightness(0.88);
    }
    .badge-inhabilitado {
      position: absolute;
      top: 10px;
      left: 10px;
      background-color: rgba(153, 27, 27, 0.92);
      color: #ffffff;
      font-size: 0.7rem;
      font-weight: 800;
      padding: 0.24rem 0.6rem;
      border-radius: 999px;
    }
    .btn-card-habilitar {
      width: 100%;
      height: 38px;
      margin-top: 0.85rem;
      background-color: #283b2e;
      color: #ffffff;
      border: none;
      border-radius: 9px;
      font-family: inherit;
      font-size: 0.84rem;
      font-weight: 700;
      cursor: pointer;
    }
    .btn-card-habilitar:hover {
      background-color: #1c2a20;
    }
    .admin-form-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0.85rem 1rem;
      margin-top: 0.75rem;
    }
    .admin-form-grid .full-col {
      grid-column: 1 / -1;
    }
    .admin-field {
      display: flex;
      flex-direction: column;
      gap: 0.3rem;
    }
    .admin-field label {
      font-size: 0.74rem;
      font-weight: 700;
      color: #5e6660;
    }
    .admin-input {
      height: 40px;
      background-color: #ffffff;
      border: 1px solid #dcd6ca;
      border-radius: 8px;
      padding: 0 0.8rem;
      font-family: inherit;
      font-size: 0.86rem;
      color: #1f2b24;
    }
    .admin-input.locked {
      background-color: #efece4;
      color: #5e6660;
      font-weight: 700;
      cursor: not-allowed;
    }
    .aviso-creditos-activos {
      background-color: #fffbeb;
      border: 1px solid #fde68a;
      color: #92400e;
      border-radius: 10px;
      padding: 0.85rem 1rem;
      font-size: 0.84rem;
      line-height: 1.45;
      margin: 0.75rem 0;
    }
    .confirm-msg-normal {
      font-size: 0.88rem;
      line-height: 1.45;
      color: #213027;
      margin: 0.75rem 0;
    }
    .btn-danger-confirm {
      height: 40px;
      padding: 0 1.25rem;
      background-color: #b91c1c;
      color: #ffffff;
      border: none;
      border-radius: 8px;
      font-weight: 700;
      cursor: pointer;
    }
  `]
})
export class ProductosComponent implements OnInit {
  private readonly compraService = inject(CompraService);
  private readonly authService = inject(AuthService);
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly cdr = inject(ChangeDetectorRef);

  esAdminTienda = false;
  adminIdTienda = 1;

  productos: ProductoAdminDTO[] = [];
  productosFiltrados: ProductoAdminDTO[] = [];
  textoBusqueda = '';
  filtroEstadoAdmin: 'TODOS' | 'HABILITADOS' | 'DESHABILITADOS' = 'TODOS';
  cargando = true;

  mensajeExitoAdmin: string | null = null;
  mensajeErrorAdmin: string | null = null;

 
  modalFormAdminAbierto = false;
  modoFormAdmin: 'CREAR' | 'EDITAR' = 'CREAR';
  productoEditandoId: number | null = null;

  formImagen = '';
  formProveedor = '';
  formMarca = '';
  formDescripcion = '';
  formUnidadMedida = 'Unidad';
  readonly unidadesMedida = ['Unidad', 'Kilogramo', 'Gramo', 'Litro', 'Paquete', 'Pack', 'Docena', 'Caja', 'Botella', 'Servicio', 'Sesión'];
  formFormaVenta: 'En meses' | 'Al contado' = 'En meses';
  formPrecioContado = 0;
  formPrecioCredito = 0;
  guardandoProducto = false;
  errorFormAdmin: string | null = null;

  
  modalConfirmarEliminarAbierto = false;
  productoAEliminar: ProductoAdminDTO | null = null;
  verificandoCreditos = false;
  creditosActivosRelacionados = 0;
  procesandoEstado = false;


  modalConfirmarHabilitarAbierto = false;
  productoAHabilitar: ProductoAdminDTO | null = null;

  
  perfilCliente: any = null;
  maxMesesCliente = 7;
  limiteDisponible = 1500;

  modalCompraAbierto = false;
  productoSeleccionado: ProductoAdminDTO | null = null;
  modalidad: 'UNICO' | 'CREDITO' = 'CREDITO';
  cantidadComprada = 1;
  fechaCompra = this.hoyLocalIso();
  numMeses = 3;

  clientesVenta: any[] = [];
  idClienteVenta: number | null = null;

  simulacion: CompraBackendDTO | null = null;
  simulando = false;
  procesandoCompra = false;
  errorCompra: string | null = null;

  modalExitoAbierto = false;
  compraExitosa: CompraBackendDTO | null = null;
  modalidadExitosa: 'UNICO' | 'CREDITO' = 'CREDITO';

  ngOnInit(): void {
    const sesion = this.authService.sesionActual;
    this.esAdminTienda = sesion?.rol === 'ADMIN_TIENDA';
    this.detectarTiendaAdmin(sesion?.idTienda);
    this.cargarCatalogoYDatos();
    if (this.esAdminTienda) {
      this.cargarClientesVenta();
    }
  }

  private cargarClientesVenta(): void {
    this.http
      .get<any[]>(`${environment.apiUrl}/tiendas/${this.adminIdTienda}/clientes`)
      .subscribe({
        next: (lista) => {
          this.clientesVenta = (lista || [])
            .filter((c) => c.estado !== false && !c.pendienteAprobacion)
            .sort((a, b) => String(a.nombreCliente).localeCompare(String(b.nombreCliente)));
          this.cdr.detectChanges();
        }
      });
  }

  onClienteVentaChange(): void {
    this.errorCompra = null;
    this.simulacion = null;
    const cliente = this.clientesVenta.find((c) => c.idCliente === Number(this.idClienteVenta));
    this.perfilCliente = cliente ?? null;
    if (!cliente) {
      this.cdr.detectChanges();
      return;
    }
    this.maxMesesCliente = Number(cliente.maxMesesCredito) || 1;
    if (this.numMeses > this.maxMesesCliente) {
      this.numMeses = this.maxMesesCliente;
    }
    if (this.maxMesesCliente < 2 && this.modalidad === 'CREDITO') {
      this.modalidad = 'UNICO';
    }
    this.compraService.obtenerPagos(this.adminIdTienda, cliente.idCliente).subscribe({
      next: (res) => {
        if (res?.limiteDisponible != null) {
          this.limiteDisponible = res.limiteDisponible;
          this.cdr.detectChanges();
        }
      }
    });
    this.actualizarSimulacion();
  }

  private detectarTiendaAdmin(idTiendaSesion?: number | null): void {
    if (idTiendaSesion != null) {
      this.adminIdTienda = Number(idTiendaSesion);
      return;
    }
    for (const storage of [sessionStorage, localStorage]) {
      for (let i = 0; i < storage.length; i++) {
        const key = storage.key(i);
        if (!key) continue;
        const raw = storage.getItem(key);
        if (!raw || !raw.includes('eyJ')) continue;
        try {
          const limpio = raw.replace(/^Bearer\s+/i, '').trim();
          const partes = limpio.split('.');
          if (partes.length === 3) {
            let b64 = partes[1].replace(/-/g, '+').replace(/_/g, '/');
            while (b64.length % 4 !== 0) b64 += '=';
            const claims = JSON.parse(atob(b64));
            if (claims?.idTienda != null) {
              this.adminIdTienda = Number(claims.idTienda);
              return;
            }
          }
        } catch {
         
        }
      }
    }
  }

  private hoyLocalIso(): string {
    const hoy = new Date();
    const anio = hoy.getFullYear();
    const mes = String(hoy.getMonth() + 1).padStart(2, '0');
    const dia = String(hoy.getDate()).padStart(2, '0');
    return `${anio}-${mes}-${dia}`;
  }

  cargarCatalogoYDatos(): void {
    this.cargando = true;

    if (this.esAdminTienda) {
      this.http
        .get<ProductoAdminDTO[]>(
          `${environment.apiUrl}/tiendas/${this.adminIdTienda}/productos?soloActivos=false`
        )
        .pipe(
          timeout(8000),
          finalize(() => {
            this.cargando = false;
            this.cdr.detectChanges();
          })
        )
        .subscribe({
          next: (lista) => {
            this.productos = (lista || []).sort(
              (a, b) => a.idProductoServicio - b.idProductoServicio
            );
            this.filtrarProductos();
            this.cdr.detectChanges();
          },
          error: () => {
            this.productos = [];
            this.productosFiltrados = [];
            this.cdr.detectChanges();
          }
        });
      return;
    }

   
    this.compraService
      .listarProductosActivos()
      .pipe(
        timeout(8000),
        finalize(() => {
          this.cargando = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: (lista) => {
          this.productos = lista || [];
          this.filtrarProductos();
          this.cdr.detectChanges();
        },
        error: () => {
          this.productos = [];
          this.productosFiltrados = [];
          this.cdr.detectChanges();
        }
      });

    this.compraService.obtenerPerfilCliente().subscribe({
      next: (perfil) => {
        this.perfilCliente = perfil;
        if (perfil?.maxMesesCredito) {
          this.maxMesesCliente = perfil.maxMesesCredito;
        }
        this.cdr.detectChanges();
      }
    });

    this.refrescarSaldoDisponible();
  }

  private refrescarSaldoDisponible(): void {
    this.compraService.obtenerResumenPagos().subscribe({
      next: (res) => {
        if (res?.limiteDisponible != null) {
          this.limiteDisponible = res.limiteDisponible;
          this.cdr.detectChanges();
        }
      }
    });
  }

  get totalHabilitadosCount(): number {
    return this.productos.filter((p) => p.estado !== false).length;
  }

  get totalDeshabilitadosCount(): number {
    return this.productos.filter((p) => p.estado === false).length;
  }

  cambiarFiltroEstadoAdmin(filtro: 'TODOS' | 'HABILITADOS' | 'DESHABILITADOS'): void {
    this.filtroEstadoAdmin = filtro;
    this.filtrarProductos();
  }

  filtrarProductos(): void {
    const termino = this.textoBusqueda.trim().toLowerCase();
    let base = [...this.productos];

    if (this.esAdminTienda) {
      if (this.filtroEstadoAdmin === 'HABILITADOS') {
        base = base.filter((p) => p.estado !== false);
      } else if (this.filtroEstadoAdmin === 'DESHABILITADOS') {
        base = base.filter((p) => p.estado === false);
      }
    }

    if (!termino) {
      this.productosFiltrados = base;
      return;
    }

    this.productosFiltrados = base.filter(
      (p) =>
        p.descripcion.toLowerCase().includes(termino) ||
        (p.marca && p.marca.toLowerCase().includes(termino)) ||
        (p.unidadMedida && p.unidadMedida.toLowerCase().includes(termino))
    );
  }

 
  get formFormaVentaCalculada(): 'En meses' | 'Al contado' {
    return this.formFormaVenta;
  }

  abrirModalCrearProducto(): void {
    this.modoFormAdmin = 'CREAR';
    this.productoEditandoId = null;
    this.formImagen = '';
    this.formProveedor = '';
    this.formMarca = '';
    this.formDescripcion = '';
    this.formUnidadMedida = 'Unidad';
    this.formFormaVenta = 'En meses';
    this.formPrecioContado = 0;
    this.formPrecioCredito = 0;
    this.errorFormAdmin = null;
    this.modalFormAdminAbierto = true;
    this.cdr.detectChanges();
  }

  abrirModalEditarProducto(prod: ProductoAdminDTO): void {
    this.modoFormAdmin = 'EDITAR';
    this.productoEditandoId = prod.idProductoServicio;
    this.formImagen = prod.imagen || '';
    this.formProveedor = prod.proveedor || '';
    this.formMarca = prod.marca || '';
    this.formDescripcion = prod.descripcion || '';

    this.formUnidadMedida = (prod.unidadMedida || 'Unidad').trim();
    this.formFormaVenta = prod.formaVenta === 'Al contado' ? 'Al contado' : 'En meses';

    this.formPrecioContado = Number(prod.precioContado ?? 0);
    this.formPrecioCredito = Number(prod.precioCredito ?? 0);
    this.errorFormAdmin = null;
    this.modalFormAdminAbierto = true;
    this.cdr.detectChanges();
  }

  cerrarModalFormAdmin(): void {
    if (this.guardandoProducto) return;
    this.modalFormAdminAbierto = false;
    this.errorFormAdmin = null;
    this.cdr.detectChanges();
  }

  guardarProductoAdmin(): void {
    if (this.guardandoProducto) return;
    this.errorFormAdmin = null;

    const descLimpia = this.formDescripcion.trim();
    const imgLimpia = this.formImagen.trim();
    const provLimpio = this.formProveedor.trim();
    const marcaLimpia = this.formMarca.trim();
    const pContado = Math.round(Number(this.formPrecioContado) * 100) / 100;
    const pCredito = Math.round(Number(this.formPrecioCredito) * 100) / 100;

    if (!descLimpia) {
      this.errorFormAdmin = 'La descripción del producto o servicio es obligatoria.';
      return;
    }
    if (descLimpia.length > 150) {
      this.errorFormAdmin = 'La descripción no puede superar los 150 caracteres.';
      return;
    }
    if (imgLimpia.length > 255) {
      this.errorFormAdmin = 'La ruta o URL de imagen no puede superar los 255 caracteres.';
      return;
    }
    if (provLimpio.length > 80) {
      this.errorFormAdmin = 'El proveedor no puede superar los 80 caracteres.';
      return;
    }
    if (marcaLimpia.length > 50) {
      this.errorFormAdmin = 'La marca no puede superar los 50 caracteres.';
      return;
    }
    if (!pContado || pContado <= 0) {
      this.errorFormAdmin = 'El precio al contado debe ser mayor a S/ 0.00.';
      return;
    }
    if (!pCredito || pCredito <= pContado) {
      this.errorFormAdmin = 'El precio al crédito debe ser mayor al precio al contado.';
      return;
    }

    const payload = {
      imagen: imgLimpia || null,
      proveedor: provLimpio || null,
      marca: marcaLimpia || null,
      descripcion: descLimpia,
      unidadMedida: this.formUnidadMedida,
      precioContado: pContado,
      precioCredito: pCredito,
      formaVenta: this.formFormaVentaCalculada
    };

    this.guardandoProducto = true;
    this.cdr.detectChanges();

    const peticion$ =
      this.modoFormAdmin === 'CREAR'
        ? this.http.post(
            `${environment.apiUrl}/tiendas/${this.adminIdTienda}/productos`,
            payload
          )
        : this.http.put(
            `${environment.apiUrl}/tiendas/${this.adminIdTienda}/productos/${this.productoEditandoId}`,
            payload
          );

    peticion$
      .pipe(
        timeout(8000),
        finalize(() => {
          this.guardandoProducto = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: () => {
          this.modalFormAdminAbierto = false;
          this.mensajeExitoAdmin =
            this.modoFormAdmin === 'CREAR'
              ? `Producto/servicio "${payload.descripcion}" creado correctamente.`
              : `Producto/servicio "${payload.descripcion}" actualizado correctamente.`;
          this.cargarCatalogoYDatos();
        },
        error: (err) => {
          this.errorFormAdmin =
            err?.error?.mensaje || 'No se pudo guardar el producto o servicio.';
          this.cdr.detectChanges();
        }
      });
  }


  iniciarEliminarProducto(prod: ProductoAdminDTO): void {
    this.productoAEliminar = prod;
    this.creditosActivosRelacionados = 0;
    this.verificandoCreditos = true;
    this.modalConfirmarEliminarAbierto = true;
    this.cdr.detectChanges();

    this.http
      .get<Array<{ idCliente: number }>>(
        `${environment.apiUrl}/tiendas/${this.adminIdTienda}/clientes`
      )
      .pipe(
        catchError(() => of([])),
        switchMap((clientes) => {
          if (!clientes || clientes.length === 0) return of([]);
          const reqs = clientes.map((c) =>
            this.http
              .get<CompraBackendDTO[]>(
                `${environment.apiUrl}/tiendas/${this.adminIdTienda}/clientes/${c.idCliente}/compras`
              )
              .pipe(catchError(() => of([] as CompraBackendDTO[])))
          );
          return forkJoin(reqs);
        }),
        timeout(8000),
        finalize(() => {
          this.verificandoCreditos = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: (gruposCompras) => {
          const todas = (gruposCompras as CompraBackendDTO[][]).flat();
          this.creditosActivosRelacionados = todas.filter(
            (comp) =>
              Number(comp.idProductoServicio) === Number(prod.idProductoServicio) &&
              Array.isArray(comp.cuotas) &&
              comp.cuotas.some((q) => q.estado?.trim().toLowerCase() === 'pendiente')
          ).length;
          this.cdr.detectChanges();
        }
      });
  }

  cerrarModalEliminarProducto(): void {
    if (this.procesandoEstado) return;
    this.modalConfirmarEliminarAbierto = false;
    this.productoAEliminar = null;
    this.cdr.detectChanges();
  }

  confirmarEliminarProducto(): void {
    if (!this.productoAEliminar || this.procesandoEstado) return;
    this.procesandoEstado = true;
    this.cdr.detectChanges();

    const prod = this.productoAEliminar;
    this.http
      .delete(
        `${environment.apiUrl}/tiendas/${this.adminIdTienda}/productos/${prod.idProductoServicio}`
      )
      .pipe(
        timeout(8000),
        finalize(() => {
          this.procesandoEstado = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: () => {
          this.modalConfirmarEliminarAbierto = false;
          this.productoAEliminar = null;
          this.mensajeExitoAdmin = `El producto "${prod.descripcion}" fue ocultado del catálogo de la tienda.`;
          this.cargarCatalogoYDatos();
        },
        error: (err) => {
          this.modalConfirmarEliminarAbierto = false;
          this.productoAEliminar = null;
          this.mensajeErrorAdmin =
            err?.error?.mensaje || 'No se pudo inhabilitar el producto o servicio.';
          this.cdr.detectChanges();
        }
      });
  }


  iniciarHabilitarProducto(prod: ProductoAdminDTO): void {
    this.productoAHabilitar = prod;
    this.modalConfirmarHabilitarAbierto = true;
    this.cdr.detectChanges();
  }

  cerrarModalHabilitarProducto(): void {
    if (this.procesandoEstado) return;
    this.modalConfirmarHabilitarAbierto = false;
    this.productoAHabilitar = null;
    this.cdr.detectChanges();
  }

  confirmarHabilitarProducto(): void {
    if (!this.productoAHabilitar || this.procesandoEstado) return;
    this.procesandoEstado = true;
    this.cdr.detectChanges();

    const prod = this.productoAHabilitar;
    this.http
      .put(
        `${environment.apiUrl}/tiendas/${this.adminIdTienda}/productos/${prod.idProductoServicio}/habilitar`,
        {}
      )
      .pipe(
        timeout(8000),
        finalize(() => {
          this.procesandoEstado = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: () => {
          this.modalConfirmarHabilitarAbierto = false;
          this.productoAHabilitar = null;
          this.mensajeExitoAdmin = `El producto "${prod.descripcion}" fue habilitado nuevamente en la tienda.`;
          this.cargarCatalogoYDatos();
        },
        error: (err) => {
          this.modalConfirmarHabilitarAbierto = false;
          this.productoAHabilitar = null;
          this.mensajeErrorAdmin =
            err?.error?.mensaje || 'No se pudo habilitar el producto o servicio.';
          this.cdr.detectChanges();
        }
      });
  }

  
  get etiquetaTasaCliente(): string {
    if (!this.perfilCliente) return '—';
    const tasa = Number(this.perfilCliente.tasaInteres ?? 0).toFixed(2);
    if (this.perfilCliente.tipoTasa?.toLowerCase() === 'nominal') {
      const cap = this.perfilCliente.capitalizacion || 'Mensual';
      return `TNA ${tasa}% (${cap})`;
    }
    return `TEA ${tasa}%`;
  }

  get totalContadoModal(): number {
    if (!this.productoSeleccionado) return 0;
    return this.productoSeleccionado.precioContado * this.cantidadSeguro;
  }

  get totalCreditoModal(): number {
    if (!this.productoSeleccionado) return 0;
    return this.productoSeleccionado.precioCredito * this.cantidadSeguro;
  }

  get cantidadSeguro(): number {
    const val = Math.floor(Number(this.cantidadComprada));
    return val >= 1 ? val : 1;
  }

  cambiarCantidad(delta: number): void {
    const nueva = this.cantidadSeguro + delta;
    this.cantidadComprada = nueva < 1 ? 1 : nueva;
    this.actualizarSimulacion();
    this.cdr.detectChanges();
  }

  onCantidadInput(): void {
    if (!this.cantidadComprada || this.cantidadComprada < 1) {
      this.cantidadComprada = 1;
    } else {
      this.cantidadComprada = Math.floor(Number(this.cantidadComprada));
    }
    this.actualizarSimulacion();
    this.cdr.detectChanges();
  }

  abrirModalCompra(producto: ProductoAdminDTO): void {
    this.productoSeleccionado = producto;
    this.errorCompra = null;
    this.cantidadComprada = 1;
    this.fechaCompra = this.hoyLocalIso();
    this.simulacion = null;

    if (producto.formaVenta === 'Al contado' || this.maxMesesCliente < 2) {
      this.modalidad = 'UNICO';
      this.numMeses = 1;
    } else {
      this.modalidad = 'CREDITO';
      this.numMeses = Math.min(3, this.maxMesesCliente);
    }

    this.modalCompraAbierto = true;
    this.actualizarSimulacion();
    this.cdr.detectChanges();
  }

  cerrarModalCompra(): void {
    if (this.procesandoCompra) return;
    this.modalCompraAbierto = false;
    this.productoSeleccionado = null;
    this.simulacion = null;
    this.errorCompra = null;
    this.cdr.detectChanges();
  }

  cerrarModalExito(): void {
    this.modalExitoAbierto = false;
    this.compraExitosa = null;
    this.refrescarSaldoDisponible();
    this.cdr.detectChanges();
  }

  irAMisCompras(): void {
    const compra = this.compraExitosa;
    this.modalExitoAbierto = false;
    this.compraExitosa = null;
    if (compra?.idCompra && compra?.idCliente) {
      this.router.navigate(['/creditos', compra.idCliente, compra.idCompra]);
    } else {
      this.router.navigate(['/clientes']);
    }
  }

  get opcionesMeses(): number[] {
    const arr: number[] = [];
    for (let i = 2; i <= this.maxMesesCliente; i++) {
      arr.push(i);
    }
    return arr;
  }

  seleccionarModalidad(nueva: 'UNICO' | 'CREDITO'): void {
    if (nueva === 'CREDITO' && (this.productoSeleccionado?.formaVenta === 'Al contado' || this.maxMesesCliente < 2)) {
      return;
    }
    this.modalidad = nueva;
    this.errorCompra = null;

    if (nueva === 'UNICO') {
      this.numMeses = 1;
    } else if (this.numMeses < 2) {
      this.numMeses = Math.min(3, this.maxMesesCliente);
    }
    this.actualizarSimulacion();
    this.cdr.detectChanges();
  }

  formatearFecha(iso: string | undefined | null): string {
    if (!iso) return '-';
    return iso.split('-').reverse().join('/');
  }

  formatearRecibo(compra: CompraBackendDTO): string {
    if (compra.ordenRecibo && compra.ordenRecibo.trim().length >= 5) {
      return compra.ordenRecibo.trim();
    }
    return String(10000 + (compra.idCompra || 1)).padStart(6, '0');
  }

  private idsCompra(): { idTienda: number; idCliente: number } | null {
    if (this.esAdminTienda) {
      return this.idClienteVenta ? { idTienda: this.adminIdTienda, idCliente: Number(this.idClienteVenta) } : null;
    }
    const sesion = this.authService.sesionActual;
    if (sesion?.idTienda == null || sesion?.idCliente == null) return null;
    return { idTienda: Number(sesion.idTienda), idCliente: Number(sesion.idCliente) };
  }

  actualizarSimulacion(): void {
    if (!this.productoSeleccionado) return;
    const ids = this.idsCompra();
    if (!ids) {
      this.simulacion = null;
      this.cdr.detectChanges();
      return;
    }
    this.errorCompra = null;
    this.simulando = true;
    this.cdr.detectChanges();

    const esUnico = this.modalidad === 'UNICO';
    this.compraService
      .simular(ids.idTienda, ids.idCliente, {
        fechaCompra: this.fechaCompra || this.hoyLocalIso(),
        monto: this.totalCreditoModal,
        formaPago: esUnico ? 'Unico pago' : 'En meses',
        numMeses: esUnico ? undefined : Number(this.numMeses)
      })
      .pipe(
        timeout(8000),
        finalize(() => {
          this.simulando = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: (sim) => {
          this.simulacion = sim;
          this.cdr.detectChanges();
        },
        error: (err) => {
          this.simulacion = null;
          this.errorCompra = err?.error?.mensaje || 'No se pudo obtener la simulación del servidor.';
          this.cdr.detectChanges();
        }
      });
  }

  confirmarCompra(): void {
    if (!this.esAdminTienda || !this.productoSeleccionado || this.procesandoCompra) return;
    this.errorCompra = null;
    if (!this.idClienteVenta) {
      this.errorCompra = 'Selecciona el cliente que realiza la compra.';
      return;
    }

    const esUnico = this.modalidad === 'UNICO' || this.productoSeleccionado.formaVenta === 'Al contado';
    const payload = {
      idProductoServicio: this.productoSeleccionado.idProductoServicio,
      fechaCompra: this.fechaCompra || this.hoyLocalIso(),
      formaPago: esUnico ? ('Unico pago' as const) : ('En meses' as const),
      numMeses: esUnico ? 1 : Number(this.numMeses),
      cantidad: this.cantidadSeguro
    };

    this.procesandoCompra = true;
    this.cdr.detectChanges();

    this.compraService
      .registrar(this.adminIdTienda, Number(this.idClienteVenta), payload)
      .pipe(timeout(10000))
      .subscribe({
        next: (compraCreada) => {
          this.finalizarCompraConExito(compraCreada, esUnico ? 'UNICO' : 'CREDITO');
        },
        error: (err) => {
          this.procesandoCompra = false;
          this.errorCompra =
            err?.error?.mensaje || 'No se pudo registrar la compra. Verifica el crédito disponible del cliente.';
          this.cdr.detectChanges();
        }
      });
  }

  private finalizarCompraConExito(
    compra: CompraBackendDTO,
    modalidadUsada: 'UNICO' | 'CREDITO'
  ): void {
    this.procesandoCompra = false;
    this.modalCompraAbierto = false;
    this.productoSeleccionado = null;
    this.simulacion = null;

    this.compraExitosa = compra;
    this.modalidadExitosa = modalidadUsada;
    this.modalExitoAbierto = true;
    this.refrescarSaldoDisponible();
    this.cdr.detectChanges();
  }
}