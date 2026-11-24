import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-novedades',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div style="max-width: 1100px; margin: 0 auto;">
      <h1 style="font-size: 1.75rem; font-weight: 700; color: #1f2d24; margin-bottom: 0.25rem;">
        Lo nuevo en DivinasPay
      </h1>
      <p style="font-size: 0.88rem; color: #6b736e; margin-bottom: 1.5rem;">
        Promociones vigentes, paquetes de temporada y beneficios exclusivos en salones afiliados
      </p>

      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 1.25rem;">
        <div style="background: #fff; border: 1px solid #e6e2d8; border-radius: 14px; padding: 1.35rem;">
          <span style="background: #e4ede7; color: #213328; font-size: 0.74rem; font-weight: 600; padding: 0.25rem 0.65rem; border-radius: 999px;">
            Beneficio Crédito
          </span>
          <h3 style="margin: 0.75rem 0 0.4rem; color: #1f2d24;">Financiamiento en cuotas fijas</h3>
          <p style="font-size: 0.86rem; color: #5c6660; line-height: 1.45;">
            Solicita tratamientos capilares y faciales en tu salón favorito y págalos en cuotas mensuales constantes bajo método francés.
          </p>
        </div>

        <div style="background: #fff; border: 1px solid #e6e2d8; border-radius: 14px; padding: 1.35rem;">
          <span style="background: #f4ebd8; color: #6b4e16; font-size: 0.74rem; font-weight: 600; padding: 0.25rem 0.65rem; border-radius: 999px;">
            Catálogo Actualizado
          </span>
          <h3 style="margin: 0.75rem 0 0.4rem; color: #1f2d24;">Nuevos packs de cuidado post-alisado</h3>
          <p style="font-size: 0.86rem; color: #5c6660; line-height: 1.45; margin-bottom: 1rem;">
            Explora los productos de L'Oréal Professionnel, Kérastase y Olaplex disponibles en tienda.
          </p>
          <a routerLink="/productos" style="color: #283b2e; font-weight: 700; font-size: 0.85rem; text-decoration: none;">
            Ver Productos y Servicios →
          </a>
        </div>
      </div>
    </div>
  `
})
export class NovedadesComponent {}