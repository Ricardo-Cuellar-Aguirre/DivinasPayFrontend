import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, inject } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';
import { Router } from '@angular/router';
import {
  FormaVentaProducto,
  ProductoServicioRequestDTO,
  ProductoServicioResponseDTO
} from '../../models/producto-servicio.model';
import { ErrorResponse } from '../../models/sistema.model';
import { AuthService } from '../../services/auth.service';
import { ProductoServicioService } from '../../services/producto-servicio.service';

@Component({
  selector: 'app-productos',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './productos.component.html',
  styleUrl: './productos.component.css'
})
export class ProductosComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly productoService = inject(ProductoServicioService);
  private readonly router = inject(Router);

  idTienda!: number;
  esAdminTienda = false;

  productos: ProductoServicioResponseDTO[] = [];
  filtroTexto = '';
  soloActivos = true;

  cargando = true;
  guardando = false;
  mostrarModal = false;
  productoEditando: ProductoServicioResponseDTO | null = null;

  mensajeExito: string | null = null;
  mensajeError: string | null = null;
  errorFormulario: string | null = null;

  productoForm!: FormGroup;

  ngOnInit(): void {
    const sesion = this.authService.sesionActual;
    if (!sesion?.idTienda) {
      this.router.navigate(['/login']);
      return;
    }

    this.idTienda = sesion.idTienda;
    this.esAdminTienda = sesion.rol === 'ADMIN_TIENDA';
    this.inicializarFormulario();
    this.cargarProductos();
  }

  private inicializarFormulario(): void {
    this.productoForm = this.fb.group({
      descripcion: ['', [Validators.required, Validators.maxLength(150)]],
      marca: ['', [Validators.maxLength(50)]],
      proveedor: ['', [Validators.maxLength(80)]],
      unidadMedida: ['Servicio', [Validators.required, Validators.maxLength(20)]],
      imagen: ['', [Validators.maxLength(255)]],
      precioContado: [null, [Validators.required, Validators.min(0.01)]],
      precioCredito: [null, [Validators.required, Validators.min(0.01)]],
      formaVenta: ['En meses' as FormaVentaProducto, [Validators.required]]
    });
  }

  cargarProductos(): void {
    this.cargando = true;
    const consultarSoloActivos = this.esAdminTienda ? false : true;

    this.productoService.listar(this.idTienda, consultarSoloActivos).subscribe({
      next: (lista) => {
        this.productos = lista;
        this.cargando = false;
      },
      error: (err: HttpErrorResponse) => {
        this.cargando = false;
        const body = err.error as ErrorResponse | undefined;
        this.mensajeError = body?.mensaje || 'No se pudo cargar el catálogo de productos.';
      }
    });
  }

  get productosFiltrados(): ProductoServicioResponseDTO[] {
    const q = this.filtroTexto.trim().toLowerCase();
    return this.productos.filter((p) => {
      const coincideEstado = this.soloActivos ? p.estado : true;
      const coincideTexto =
        !q ||
        p.descripcion.toLowerCase().includes(q) ||
        (p.marca && p.marca.toLowerCase().includes(q)) ||
        (p.proveedor && p.proveedor.toLowerCase().includes(q));
      return coincideEstado && coincideTexto;
    });
  }

  abrirModalNuevo(): void {
    this.productoEditando = null;
    this.errorFormulario = null;
    this.productoForm.reset({
      descripcion: '',
      marca: '',
      proveedor: '',
      unidadMedida: 'Servicio',
      imagen: '',
      precioContado: null,
      precioCredito: null,
      formaVenta: 'En meses'
    });
    this.mostrarModal = true;
  }

  abrirModalEditar(prod: ProductoServicioResponseDTO): void {
    this.productoEditando = prod;
    this.errorFormulario = null;
    this.productoForm.reset({
      descripcion: prod.descripcion,
      marca: prod.marca ?? '',
      proveedor: prod.proveedor ?? '',
      unidadMedida: prod.unidadMedida,
      imagen: prod.imagen ?? '',
      precioContado: prod.precioContado,
      precioCredito: prod.precioCredito,
      formaVenta: prod.formaVenta
    });
    this.mostrarModal = true;
  }

  cerrarModal(): void {
    this.mostrarModal = false;
  }

  guardarProducto(): void {
    if (this.productoForm.invalid) {
      this.productoForm.markAllAsTouched();
      return;
    }

    const val = this.productoForm.value;
    const contado = Number(val.precioContado);
    const credito = Number(val.precioCredito);

    if (credito <= contado) {
      this.errorFormulario =
        'El precio de lista (crédito) debe ser mayor que el precio al contado.';
      return;
    }

    this.guardando = true;
    this.errorFormulario = null;

    const dto: ProductoServicioRequestDTO = {
      descripcion: val.descripcion.trim(),
      marca: val.marca?.trim() || null,
      proveedor: val.proveedor?.trim() || null,
      unidadMedida: val.unidadMedida.trim(),
      imagen: val.imagen?.trim() || null,
      precioContado: contado,
      precioCredito: credito,
      formaVenta: val.formaVenta
    };

    const peticion$ = this.productoEditando
      ? this.productoService.actualizar(
          this.idTienda,
          this.productoEditando.idProductoServicio,
          dto
        )
      : this.productoService.crear(this.idTienda, dto);

    peticion$.subscribe({
      next: () => {
        this.guardando = false;
        this.mostrarModal = false;
        this.mensajeExito = this.productoEditando
          ? 'Producto o servicio actualizado correctamente.'
          : 'Producto o servicio registrado en el catálogo.';
        this.cargarProductos();
      },
      error: (err: HttpErrorResponse) => {
        this.guardando = false;
        const body = err.error as ErrorResponse | undefined;
        this.errorFormulario = body?.mensaje || 'Error al guardar el producto o servicio.';
      }
    });
  }

  darDeBajaProducto(prod: ProductoServicioResponseDTO): void {
    const ok = window.confirm(
      `¿Deseas dar de baja "${prod.descripcion}"? Dejará de estar disponible para nuevas compras.`
    );
    if (!ok) return;

    this.productoService.darDeBaja(this.idTienda, prod.idProductoServicio).subscribe({
      next: () => {
        this.mensajeExito = `"${prod.descripcion}" fue dado de baja del catálogo.`;
        this.cargarProductos();
      },
      error: (err: HttpErrorResponse) => {
        const body = err.error as ErrorResponse | undefined;
        this.mensajeError = body?.mensaje || 'No se pudo dar de baja el producto.';
      }
    });
  }
}