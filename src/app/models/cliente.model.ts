export type TipoTasa = 'Nominal' | 'Efectiva';
export type TipoCapitalizacion =
  | 'Diaria'
  | 'Mensual'
  | 'Bimestral'
  | 'Trimestral'
  | 'Cuatrimestral'
  | 'Semestral'
  | 'Anual';

export interface Cliente {
  idCliente?: number;
  idTienda?: number;
  nombreCliente: string;
  tipoTasa: TipoTasa;
  tasaInteres: number;
  capitalizacion?: TipoCapitalizacion | null;
  moneda: string; 
  limiteMaxCredito: number;
  maxMesesCredito: number;
  fechaCorte: number; 
  fechaPago: number;  
  usuarioCliente: string;
  passwordCliente?: string;
  estado: boolean;
}

export interface ClienteRequestDTO {
  nombreCliente: string;
  tipoTasa: TipoTasa;
  tasaInteres: number;
  capitalizacion?: TipoCapitalizacion | null;
  moneda?: string; 
  limiteMaxCredito: number;
  maxMesesCredito: number;
  fechaCorte: number;
  fechaPago: number;
  usuarioCliente: string;
  passwordCliente: string;
}

export interface RegistroClienteDTO {
  nombreCliente: string;
  usuarioCliente: string;
  passwordCliente: string;
}

export interface ClienteResponseDTO {
  idCliente: number;
  idTienda: number;
  nombreCliente: string;
  tipoTasa: TipoTasa;
  tasaInteres: number;
  capitalizacion: TipoCapitalizacion | null;
  moneda: string;
  limiteMaxCredito: number;
  maxMesesCredito: number;
  fechaCorte: number;
  fechaPago: number;
  usuarioCliente: string;
  estado: boolean;
  pendienteAprobacion?: boolean;
}

export interface ClienteUpdateDTO {
  nombreCliente: string;
  tipoTasa: TipoTasa;
  tasaInteres: number;
  capitalizacion?: TipoCapitalizacion | null;
  moneda?: string;
  limiteMaxCredito: number;
  maxMesesCredito: number;
  fechaCorte: number;
  fechaPago: number;
  usuarioCliente: string;
}