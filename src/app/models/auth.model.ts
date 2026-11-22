export type TipoUsuarioLogin = 'SISTEMA' | 'ADMIN' | 'CLIENTE';
export type RolUsuario = 'ADMIN_SISTEMA' | 'ADMIN_TIENDA' | 'CLIENTE';

export interface LoginRequestDTO {
  tipo: TipoUsuarioLogin;
  idTienda?: number | null;
  usuario: string;
  password: string;
}

export interface LoginResponseDTO {
  token: string;
  tipoToken: string;
  rol: RolUsuario;
  idTienda: number | null;
  idCliente: number | null;
  nombre: string;
  expiraEnSegundos: number;
}

export interface TiendaPublicaDTO {
  idTienda: number;
  nombreTienda: string;
}