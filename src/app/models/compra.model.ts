export type FormaPagoCompra = 'Unico pago' | 'En meses';
export type EstadoCuota = 'Pendiente' | 'Pagado';

export interface Compra {
  idCompra?: number;
  idCliente: number;
  idProductoServicio: number;
  fechaCompra: string; // Formato ISO YYYY-MM-DD
  monto: number;
  formaPago: FormaPagoCompra;
  numMeses: number;
}

export interface Cuota {
  idCuota?: number;
  idCompra: number;
  numeroCuota: number;
  fechaVencimiento: string;
  montoCuota: number;
  estado: EstadoCuota;
  fechaPagoReal?: string | null;
}

export interface FilaCuota {
  numero: number;
  fechaVencimiento: string;
  saldoInicial: number;
  cuota: number;
  interes: number;
  amortizacion: number;
  saldoFinal: number;
}

export interface CuotaDetalleDTO {
  idCuota: number;
  numero: number;
  fechaVencimiento: string;
  saldoInicial: number;
  cuota: number;
  interes: number;
  amortizacion: number;
  saldoFinal: number;
  estado: EstadoCuota;
  fechaPagoReal: string | null;
}

export interface CompraRequestDTO {
  idProductoServicio: number;
  fechaCompra?: string | null; // Opcional (por defecto hoy en backend)
  formaPago: FormaPagoCompra;
  numMeses?: number | null;
}

export interface CompraResponseDTO {
  idCompra: number;
  idCliente: number;
  idProductoServicio: number;
  descripcionProducto: string;
  fechaCompra: string;
  monto: number;
  formaPago: FormaPagoCompra;
  numMeses: number;
  fechaFinGracia: string;
  diasGracia: number;
  tasaEfectivaAnual: number;
  tasaEfectivaMensual: number;
  capitalCapitalizado: number;
  interesGracia: number;
  cuotaFija: number;
  cuotas: CuotaDetalleDTO[];
  totalCuotas: number;
  totalIntereses: number;
  tir: number | null;
  tcea: number;
}

export interface SimulacionRequestDTO {
  fechaCompra?: string | null;
  monto: number;
  formaPago: FormaPagoCompra;
  numMeses?: number | null;
}

export interface SimulacionResponseDTO {
  idCliente: number;
  fechaCompra: string;
  monto: number;
  formaPago: FormaPagoCompra;
  numMeses: number;
  fechaFinGracia: string;
  diasGracia: number;
  tasaEfectivaAnual: number;
  tasaEfectivaMensual: number;
  capitalCapitalizado: number;
  interesGracia: number;
  cuotaFija: number;
  cuotas: FilaCuota[];
  totalCuotas: number;
  totalIntereses: number;
  tir: number | null;
  tcea: number;
}