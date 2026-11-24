import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { TiendaPublicaDTO } from '../models/tienda.model';

const CLAVE_TIENDA_SELECCIONADA = 'divinaspay_tienda_activa';

@Injectable({
  providedIn: 'root'
})
export class TiendaActivaService {
  private readonly tiendaSubject = new BehaviorSubject<TiendaPublicaDTO | null>(
    this.leerTiendaGuardada()
  );

  readonly tiendaActiva$ = this.tiendaSubject.asObservable();

  get tiendaActual(): TiendaPublicaDTO | null {
    return this.tiendaSubject.value;
  }

  seleccionarTienda(tienda: TiendaPublicaDTO): void {
    localStorage.setItem(CLAVE_TIENDA_SELECCIONADA, JSON.stringify(tienda));
    this.tiendaSubject.next(tienda);
  }

  inicializarSiVacio(tiendas: TiendaPublicaDTO[], idTiendaSesion?: number | null): void {
    if (!tiendas || tiendas.length === 0) return;

    const guardada = this.tiendaSubject.value;
    if (guardada) {
      const actualizada = tiendas.find((t) => t.idTienda === guardada.idTienda);
      if (actualizada) {
        this.seleccionarTienda(actualizada);
        return;
      }
    }

    const porSesion = tiendas.find((t) => t.idTienda === idTiendaSesion);
    this.seleccionarTienda(porSesion || tiendas[0]);
  }

  limpiar(): void {
    localStorage.removeItem(CLAVE_TIENDA_SELECCIONADA);
    this.tiendaSubject.next(null);
  }

  private leerTiendaGuardada(): TiendaPublicaDTO | null {
    const raw = localStorage.getItem(CLAVE_TIENDA_SELECCIONADA);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as TiendaPublicaDTO;
    } catch {
      return null;
    }
  }
}