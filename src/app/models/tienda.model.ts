export interface TiendaPublicaDTO {
  idTienda: number;
  nombreTienda: string;
  direccion?: string;
  telefono?: string;
}

export interface TiendaRequestDTO {
  nombreTienda: string;
  direccion: string;
  telefono: string;
  usuarioAdmin: string;
  passwordAdmin: string;
}

export interface TiendaUpdateDTO {
  nombreTienda: string;
  direccion: string;
  telefono: string;
  usuarioAdmin: string;
}

export interface TiendaResponseDTO {
  idTienda: number;
  nombreTienda: string;
  direccion: string;
  telefono: string;
  usuarioAdmin: string;
  estado: boolean;
}