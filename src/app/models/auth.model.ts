export type TipoLogin = 'SISTEMA' | 'ADMIN' | 'CLIENTE';
export type RolUsuario = 'ADMIN_SISTEMA' | 'ADMIN_TIENDA' | 'CLIENTE';

export interface LoginRequestDTO {
  tipo: TipoLogin;
  idTienda: number | null;
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