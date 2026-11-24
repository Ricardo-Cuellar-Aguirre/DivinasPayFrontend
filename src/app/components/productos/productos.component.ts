import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { catchError, finalize, of, timeout } from 'rxjs';
import {
  CompraBackendDTO,
  CompraService,
  CuotaBackendDTO,
  ProductoBackendDTO
} from '../../services/compra.service';

@Component({
  selector: 'app-productos',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './productos.component.html',
  styleUrl: './productos.component.css'
})
export class ProductosComponent implements OnInit {
  private readonly compraService = inject(CompraService);
  private readonly router = inject(Router);
  private readonly cdr = inject(ChangeDetectorRef);

  productos: ProductoBackendDTO[] = [];
  productosFiltrados: ProductoBackendDTO[] = [];
  textoBusqueda = '';
  cargando = true;

  perfilCliente: any = null;
  maxMesesCliente = 7;
  limiteDisponible = 1500;

  // Modal de compra + Cantidad (Qty) + Simulador
  modalCompraAbierto = false;
  productoSeleccionado: ProductoBackendDTO | null = null;
  modalidad: 'CONTADO' | 'CREDITO' = 'CREDITO';
  cantidadComprada = 1;
  fechaCompra = this.hoyLocalIso();
  numMeses = 3;
  metodoPagoContado: 'TARJETA' | 'YAPE_PLIN' | 'PAGO_EFECTIVO' = 'YAPE_PLIN';

  simulacion: CompraBackendDTO | null = null;
  simulando = false;
  procesandoCompra = false;
  errorCompra: string | null = null;

  // Ventana modal de confirmación exitosa
  modalExitoAbierto = false;
  compraExitosa: CompraBackendDTO | null = null;
  modalidadExitosa: 'CONTADO' | 'CREDITO' = 'CREDITO';

  ngOnInit(): void {
    this.cargarCatalogoYDatos();
  }

  private hoyLocalIso(): string {
    const hoy = new Date();
    const anio = hoy.getFullYear();
    const mes = String(hoy.getMonth() + 1).padStart(2, '0');
    const dia = String(hoy.getDate()).padStart(2, '0');
    return `${anio}-${mes}-${dia}`;
  }

  cargarCatalogoYDatos(): void {
    this.cargando = true;
    this.compraService
      .listarProductosActivos()
      .pipe(
        timeout(8000),
        finalize(() => {
          this.cargando = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: (lista) => {
          this.productos = lista || [];
          this.filtrarProductos();
          this.cdr.detectChanges();
        },
        error: () => {
          this.productos = [];
          this.productosFiltrados = [];
          this.cdr.detectChanges();
        }
      });

    this.compraService.obtenerPerfilCliente().subscribe({
      next: (perfil) => {
        this.perfilCliente = perfil;
        if (perfil?.maxMesesCredito) {
          this.maxMesesCliente = perfil.maxMesesCredito;
        }
        this.cdr.detectChanges();
      }
    });

    this.refrescarSaldoDisponible();
  }

  private refrescarSaldoDisponible(): void {
    this.compraService.obtenerResumenPagos().subscribe({
      next: (res) => {
        if (res?.limiteDisponible != null) {
          this.limiteDisponible = res.limiteDisponible;
          this.cdr.detectChanges();
        }
      }
    });
  }

  get etiquetaTasaCliente(): string {
    if (!this.perfilCliente) return 'TEA';
    const tasa = Number(this.perfilCliente.tasaInteres ?? 0).toFixed(2);
    if (this.perfilCliente.tipoTasa?.toLowerCase() === 'nominal') {
      const cap = this.perfilCliente.capitalizacion || 'Mensual';
      return `TNA ${tasa}% (${cap})`;
    }
    return `TEA ${tasa}%`;
  }

  get totalContadoModal(): number {
    if (!this.productoSeleccionado) return 0;
    return this.productoSeleccionado.precioContado * this.cantidadSeguro;
  }

  get totalCreditoModal(): number {
    if (!this.productoSeleccionado) return 0;
    return this.productoSeleccionado.precioCredito * this.cantidadSeguro;
  }

  get cantidadSeguro(): number {
    const val = Math.floor(Number(this.cantidadComprada));
    return val >= 1 ? val : 1;
  }

  cambiarCantidad(delta: number): void {
    const nueva = this.cantidadSeguro + delta;
    this.cantidadComprada = nueva < 1 ? 1 : nueva;
    if (this.modalidad === 'CREDITO') {
      this.actualizarSimulacion();
    }
    this.cdr.detectChanges();
  }

  onCantidadInput(): void {
    if (!this.cantidadComprada || this.cantidadComprada < 1) {
      this.cantidadComprada = 1;
    } else {
      this.cantidadComprada = Math.floor(Number(this.cantidadComprada));
    }
    if (this.modalidad === 'CREDITO') {
      this.actualizarSimulacion();
    }
    this.cdr.detectChanges();
  }

  filtrarProductos(): void {
    const termino = this.textoBusqueda.trim().toLowerCase();
    if (!termino) {
      this.productosFiltrados = [...this.productos];
      return;
    }
    this.productosFiltrados = this.productos.filter(
      (p) =>
        p.descripcion.toLowerCase().includes(termino) ||
        (p.marca && p.marca.toLowerCase().includes(termino)) ||
        (p.unidadMedida && p.unidadMedida.toLowerCase().includes(termino))
    );
  }

  abrirModalCompra(producto: ProductoBackendDTO): void {
    this.productoSeleccionado = producto;
    this.errorCompra = null;
    this.cantidadComprada = 1;
    this.fechaCompra = this.hoyLocalIso();

    if (producto.formaVenta === 'Al contado') {
      this.modalidad = 'CONTADO';
      this.numMeses = 1;
      this.simulacion = null;
    } else {
      this.modalidad = 'CREDITO';
      this.numMeses = Math.min(3, this.maxMesesCliente);
      this.actualizarSimulacion();
    }

    this.modalCompraAbierto = true;
    this.cdr.detectChanges();
  }

  cerrarModalCompra(): void {
    if (this.procesandoCompra) return;
    this.modalCompraAbierto = false;
    this.productoSeleccionado = null;
    this.simulacion = null;
    this.errorCompra = null;
    this.cdr.detectChanges();
  }

  cerrarModalExito(): void {
    this.modalExitoAbierto = false;
    this.compraExitosa = null;
    this.refrescarSaldoDisponible();
    this.cdr.detectChanges();
  }

  irAMisCompras(): void {
    this.modalExitoAbierto = false;
    this.compraExitosa = null;
    this.router.navigate(['/mis-compras']);
  }

  get opcionesMeses(): number[] {
    const arr: number[] = [];
    for (let i = 2; i <= this.maxMesesCliente; i++) {
      arr.push(i);
    }
    return arr;
  }

  seleccionarModalidad(nueva: 'CONTADO' | 'CREDITO'): void {
    if (nueva === 'CREDITO' && this.productoSeleccionado?.formaVenta === 'Al contado') {
      return;
    }
    this.modalidad = nueva;
    this.errorCompra = null;

    if (nueva === 'CONTADO') {
      this.numMeses = 1;
      this.simulacion = null;
    } else {
      if (this.numMeses < 2) {
        this.numMeses = Math.min(3, this.maxMesesCliente);
      }
      this.actualizarSimulacion();
    }
    this.cdr.detectChanges();
  }

  formatearFecha(iso: string | undefined | null): string {
    if (!iso) return '-';
    return iso.split('-').reverse().join('/');
  }

  formatearRecibo(compra: CompraBackendDTO): string {
    if (compra.ordenRecibo && compra.ordenRecibo.trim().length >= 5) {
      return compra.ordenRecibo.trim();
    }
    return String(10000 + (compra.idCompra || 1)).padStart(6, '0');
  }

  actualizarSimulacion(): void {
    if (!this.productoSeleccionado || this.modalidad !== 'CREDITO') return;
    this.errorCompra = null;
    this.simulando = true;
    this.cdr.detectChanges();

    const fecha = this.fechaCompra || this.hoyLocalIso();
    const montoTotal = this.totalCreditoModal;
    const meses = Number(this.numMeses);

    this.compraService
      .simularCompra({
        fechaCompra: fecha,
        monto: montoTotal,
        formaPago: 'En meses',
        numMeses: meses
      })
      .pipe(
        timeout(8000),
        finalize(() => {
          this.simulando = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: (sim) => {
          this.simulacion = sim;
          this.simulando = false;
          this.cdr.detectChanges();
        },
        error: (err) => {
          this.simulando = false;
          if (this.perfilCliente) {
            this.simulacion = this.simularLocalSegunManual(
              this.productoSeleccionado!,
              fecha,
              meses,
              montoTotal
            );
          } else {
            this.simulacion = null;
            this.errorCompra =
              err?.error?.mensaje || 'No se pudo obtener la simulación del servidor.';
          }
          this.cdr.detectChanges();
        }
      });
  }

  private simularLocalSegunManual(
    producto: ProductoBackendDTO,
    fechaCompraIso: string,
    n: number,
    monto: number
  ): CompraBackendDTO {
    const r2 = (v: number) => Math.round((v + Number.EPSILON) * 100) / 100;
    const tasaPct = Number(this.perfilCliente?.tasaInteres ?? 30);
    const tipoTasa = (this.perfilCliente?.tipoTasa || 'Efectiva').toLowerCase();
    const cap = (this.perfilCliente?.capitalizacion || 'Mensual').toLowerCase();

    const mapaM: Record<string, number> = {
      diaria: 360,
      mensual: 12,
      bimestral: 6,
      trimestral: 4,
      semestral: 2,
      anual: 1
    };

    const tasaDecimal = tasaPct / 100;
    const tea =
      tipoTasa === 'nominal'
        ? Math.pow(1 + tasaDecimal / (mapaM[cap] || 12), mapaM[cap] || 12) - 1
        : tasaDecimal;
    const tem = Math.pow(1 + tea, 30 / 360) - 1;

    const [anio, mes, dia] = fechaCompraIso.split('-').map(Number);
    const corte = Number(this.perfilCliente?.fechaCorte ?? 20);
    const diaPago = Number(this.perfilCliente?.fechaPago ?? 26);

    let mesGracia = mes;
    let anioGracia = anio;
    if (dia > corte) {
      mesGracia += 1;
      if (mesGracia > 12) {
        mesGracia = 1;
        anioGracia += 1;
      }
    }
    const ultimoDiaMes = new Date(anioGracia, mesGracia, 0).getDate();
    const diaRealGracia = Math.min(diaPago, ultimoDiaMes);
    const fechaFinGraciaDate = new Date(anioGracia, mesGracia - 1, diaRealGracia);
    const fechaCompraDate = new Date(anio, mes - 1, dia);
    const diasGracia = Math.max(
      0,
      Math.round((fechaFinGraciaDate.getTime() - fechaCompraDate.getTime()) / (1000 * 60 * 60 * 24))
    );

    const capitalCapitalizado = r2(monto * Math.pow(1 + tea, diasGracia / 360));
    const interesGracia = r2(capitalCapitalizado - monto);
    const factor = Math.pow(1 + tem, n);
    const cuotaFija = r2((capitalCapitalizado * tem * factor) / (factor - 1));

    const cuotas: CuotaBackendDTO[] = [];
    let saldo = capitalCapitalizado;
    let totalCuotas = 0;
    let totalIntereses = 0;

    for (let i = 1; i <= n; i++) {
      let mVenc = mesGracia + i;
      let aVenc = anioGracia;
      while (mVenc > 12) {
        mVenc -= 12;
        aVenc += 1;
      }
      const dMax = new Date(aVenc, mVenc, 0).getDate();
      const dVenc = Math.min(diaPago, dMax);
      const fechaVenc = `${aVenc}-${String(mVenc).padStart(2, '0')}-${String(dVenc).padStart(2, '0')}`;

      const interes = r2(saldo * tem);
      let amortizacion = r2(cuotaFija - interes);
      let cuotaActual = cuotaFija;

      if (i === n) {
        amortizacion = r2(saldo);
        cuotaActual = r2(amortizacion + interes);
      }

      const saldoFinal = i === n ? 0 : r2(saldo - amortizacion);

      cuotas.push({
        idCuota: i,
        numero: i,
        fechaVencimiento: fechaVenc,
        saldoInicial: saldo,
        cuota: cuotaActual,
        interes,
        amortizacion,
        saldoFinal,
        estado: 'Pendiente',
        fechaPagoReal: null
      });

      totalCuotas = r2(totalCuotas + cuotaActual);
      totalIntereses = r2(totalIntereses + interes);
      saldo = saldoFinal;
    }

    const tcea = Math.pow(1 + tem, 12) - 1;

    return {
      idCompra: 0,
      idCliente: this.perfilCliente?.idCliente ?? 1,
      idProductoServicio: producto.idProductoServicio,
      descripcionProducto: producto.descripcion,
      fechaCompra: fechaCompraIso,
      monto,
      formaPago: 'En meses',
      numMeses: n,
      fechaFinGracia: `${anioGracia}-${String(mesGracia).padStart(2, '0')}-${String(diaRealGracia).padStart(2, '0')}`,
      diasGracia,
      tasaEfectivaAnual: tea,
      tasaEfectivaMensual: tem,
      capitalCapitalizado,
      interesGracia,
      cuotaFija,
      cuotas,
      totalCuotas,
      totalIntereses,
      tir: tem,
      tcea
    };
  }

  confirmarCompra(): void {
    if (!this.productoSeleccionado || this.procesandoCompra) return;
    this.errorCompra = null;

    const esContado =
      this.modalidad === 'CONTADO' || this.productoSeleccionado.formaVenta === 'Al contado';
    const fecha = this.fechaCompra || this.hoyLocalIso();
    const qty = this.cantidadSeguro;
    const totalContado = this.totalContadoModal;

    const payload = esContado
      ? {
          idProductoServicio: this.productoSeleccionado.idProductoServicio,
          fechaCompra: fecha,
          formaPago: 'Unico pago' as const,
          numMeses: 1,
          cantidadComprada: qty
        }
      : {
          idProductoServicio: this.productoSeleccionado.idProductoServicio,
          fechaCompra: fecha,
          formaPago: 'En meses' as const,
          numMeses: Number(this.numMeses),
          cantidadComprada: qty
        };

    this.procesandoCompra = true;
    this.cdr.detectChanges();

    this.compraService
      .registrarCompra(payload)
      .pipe(timeout(10000))
      .subscribe({
        next: (compraCreada) => {
          const compraConDatos: CompraBackendDTO = {
            ...compraCreada,
            cantidadComprada: compraCreada.cantidadComprada ?? qty,
            monto: esContado ? totalContado : compraCreada.monto
          };

          if (esContado && compraCreada?.idCompra) {
            this.compraService
              .pagarCuota(compraCreada.idCompra, 1, fecha)
              .pipe(
                timeout(8000),
                catchError(() => of(compraConDatos)),
                finalize(() => {
                  this.finalizarCompraConExito(compraConDatos, 'CONTADO');
                })
              )
              .subscribe();
          } else {
            this.finalizarCompraConExito(compraConDatos, 'CREDITO');
          }
        },
        error: (err) => {
          this.procesandoCompra = false;
          this.errorCompra =
            err?.error?.mensaje ||
            'No se pudo registrar la compra en la base de datos. Verifica tu saldo disponible.';
          this.cdr.detectChanges();
        }
      });
  }

  private finalizarCompraConExito(
    compra: CompraBackendDTO,
    modalidadUsada: 'CONTADO' | 'CREDITO'
  ): void {
    this.procesandoCompra = false;
    this.modalCompraAbierto = false;
    this.productoSeleccionado = null;
    this.simulacion = null;

    this.compraExitosa = compra;
    this.modalidadExitosa = modalidadUsada;
    this.modalExitoAbierto = true;
    this.refrescarSaldoDisponible();
    this.cdr.detectChanges();
  }
}