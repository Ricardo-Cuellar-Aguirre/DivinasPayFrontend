export interface Tienda {
  idTienda?: number;
  nombreTienda: string;
  direccion: string;
  telefono: string;
  usuarioAdmin: string;
  passwordAdmin?: string;
  estado: boolean;
}

export interface TiendaRequestDTO {
  nombreTienda: string;
  direccion: string;
  telefono: string; // Exactamente 9 dígitos [0-9]{9}
  usuarioAdmin: string;
  passwordAdmin: string; // Entre 8 y 72 caracteres
}

export interface TiendaResponseDTO {
  idTienda: number;
  nombreTienda: string;
  direccion: string;
  telefono: string;
  usuarioAdmin: string;
  estado: boolean;
}

export interface TiendaUpdateDTO {
  nombreTienda: string;
  direccion: string;
  telefono: string;
  usuarioAdmin: string;
}