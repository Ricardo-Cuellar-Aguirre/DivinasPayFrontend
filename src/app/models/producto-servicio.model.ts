export type FormaVentaProducto = 'Al contado' | 'En meses';

export interface ProductoServicio {
  idProductoServicio?: number;
  idTienda?: number;
  imagen?: string | null;
  proveedor?: string | null;
  marca?: string | null;
  descripcion: string;
  unidadMedida: string;
  precioContado: number;
  precioCredito: number;
  formaVenta: FormaVentaProducto;
  estado: boolean;
}

export interface ProductoServicioRequestDTO {
  imagen?: string | null;
  proveedor?: string | null;
  marca?: string | null;
  descripcion: string;
  unidadMedida: string;
  precioContado: number;
  precioCredito: number; // Debe ser mayor a precioContado
  formaVenta?: FormaVentaProducto;
}

export interface ProductoServicioResponseDTO {
  idProductoServicio: number;
  idTienda: number;
  imagen: string | null;
  proveedor: string | null;
  marca: string | null;
  descripcion: string;
  unidadMedida: string;
  precioContado: number;
  precioCredito: number;
  formaVenta: FormaVentaProducto;
  estado: boolean;
}