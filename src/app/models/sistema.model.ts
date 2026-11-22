export interface VencimientoDTO {
  idCompra: number;
  idCliente: number;
  nombreCliente: string;
  numeroCuota: number;
  fechaVencimiento: string;
  montoCuota: number;
}

export interface ResumenTiendaDTO {
  totalClientesActivos: number;
  totalServiciosRegistrados: number;
  comprasEnCurso: number;
  proximosVencimientos: VencimientoDTO[];
}

export interface OperacionResponseDTO {
  idOperacion: number;
  fechaHora: string; // Formato ISO LocalDateTime
  usuario: string;
  rol: string;
  idTienda: number | null;
  accion: string;
  metodo: string;
  ruta: string;
  codigoHttp: number;
}

export interface ErrorResponse {
  codigo: string;
  mensaje: string;
  detalles: Record<string, string>;
}