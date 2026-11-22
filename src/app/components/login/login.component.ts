import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, inject } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';
import { Router } from '@angular/router';
import {
  LoginRequestDTO,
  RolUsuario,
  TiendaPublicaDTO,
  TipoUsuarioLogin
} from '../../models/auth.model';
import { ErrorResponse } from '../../models/sistema.model';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})
export class LoginComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  loginForm!: FormGroup;
  tiendasPublicas: TiendaPublicaDTO[] = [];
  cargando = false;
  mostrarPassword = false;
  mensajeError: string | null = null;
  mostrarInfoRegistro = false;

  ngOnInit(): void {
    // Si ya hay una sesión activa, redirigir directamente a su panel
    const sesion = this.authService.sesionActual;
    if (sesion && sesion.expiraEnTimestamp > Date.now()) {
      this.redirigirPorRol(sesion.rol);
      return;
    }

    this.loginForm = this.fb.group({
      tipo: ['ADMIN' as TipoUsuarioLogin, [Validators.required]],
      idTienda: [null as number | null],
      usuario: ['', [Validators.required, Validators.maxLength(100)]],
      password: ['', [Validators.required]],
      recordarAcceso: [true]
    });

    this.configurarValidacionTienda();
    this.cargarTiendas();
  }

  private configurarValidacionTienda(): void {
    this.loginForm.get('tipo')?.valueChanges.subscribe((tipo: TipoUsuarioLogin) => {
      const controlTienda = this.loginForm.get('idTienda');
      if (tipo === 'CLIENTE') {
        controlTienda?.setValidators([Validators.required]);
      } else {
        controlTienda?.clearValidators();
        controlTienda?.setValue(null);
      }
      controlTienda?.updateValueAndValidity();
    });
  }

  private cargarTiendas(): void {
    this.authService.listarTiendasPublicas().subscribe({
      next: (tiendas) => {
        this.tiendasPublicas = tiendas;
      },
      error: () => {
        this.tiendasPublicas = [];
      }
    });
  }

  seleccionarTipo(tipo: TipoUsuarioLogin): void {
    this.loginForm.patchValue({ tipo });
    this.mensajeError = null;
  }

  iniciarSesion(): void {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    this.cargando = true;
    this.mensajeError = null;

    const valores = this.loginForm.value;
    const dto: LoginRequestDTO = {
      tipo: valores.tipo,
      idTienda: valores.tipo === 'CLIENTE' ? Number(valores.idTienda) : null,
      usuario: valores.usuario.trim(),
      password: valores.password
    };

    this.authService.login(dto, Boolean(valores.recordarAcceso)).subscribe({
      next: (resp) => {
        this.cargando = false;
        this.redirigirPorRol(resp.rol);
      },
      error: (err: HttpErrorResponse) => {
        this.cargando = false;
        const cuerpoError = err.error as ErrorResponse | undefined;
        this.mensajeError =
          cuerpoError?.mensaje || 'No se pudo iniciar sesión. Verifica tus credenciales.';
      }
    });
  }

  private redirigirPorRol(rol: RolUsuario): void {
    switch (rol) {
      case 'ADMIN_SISTEMA':
        this.router.navigate(['/tiendas']);
        break;
      case 'ADMIN_TIENDA':
        this.router.navigate(['/dashboard']);
        break;
      case 'CLIENTE':
        this.router.navigate(['/creditos']);
        break;
    }
  }
}