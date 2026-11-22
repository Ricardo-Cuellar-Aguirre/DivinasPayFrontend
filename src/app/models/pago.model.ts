import { FormaPagoCompra } from './compra.model';

export interface PagoRequestDTO {
  fechaPago?: string | null; // Formato ISO YYYY-MM-DD
}

export interface PagoCompraDTO {
  idCompra: number;
  descripcionProducto: string;
  fechaCompra: string;
  monto: number;
  formaPago: FormaPagoCompra;
  cuotasPagadas: number;
  cuotasTotales: number;
  cuotaAPagar: number | null;
  fechaProximoPago: string | null;
  saldoPendiente: number;
}

export interface PagosClienteDTO {
  idCliente: number;
  nombreCliente: string;
  limiteMaxCredito: number;
  limiteDisponible: number;
  saldoPendienteTotal: number;
  comprasEnCurso: number;
  compras: PagoCompraDTO[];
}

export interface ItemListadoPagoDTO {
  idCompra: number;
  descripcionProducto: string;
  fechaCompra: string;
  montoCompra: number;
  formaPago: FormaPagoCompra;
  numeroCuota: number;
  cuotasTotales: number;
  diasGracia: number;
  interesGracia: number;
  interesCuota: number;
  montoCuota: number;
}

export interface ListadoPagoDTO {
  idCliente: number;
  nombreCliente: string;
  fechaCorte: number;
  fechaPago: string | null;
  totalInteresesAcumulados: number;
  totalAPagar: number;
  detalle: ItemListadoPagoDTO[];
}