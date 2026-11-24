import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { Observable, catchError, concat, first, throwError } from 'rxjs';
import { LoginRequestDTO, LoginResponseDTO } from '../../models/auth.model';
import { ErrorResponse } from '../../models/sistema.model';
import { TiendaPublicaDTO } from '../../models/tienda.model';
import { AuthService } from '../../services/auth.service';

const CLAVE_RECORDAR_USUARIO = 'divinaspay_usuario_recordado';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})
export class LoginComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly cdr = inject(ChangeDetectorRef);

  tiendasPublicas: TiendaPublicaDTO[] = [];
  mostrarPassword = false;
  cargando = false;

  errorLogin: string | null = null;
  infoMensaje: string | null = null;
  loginForm!: FormGroup;

  ngOnInit(): void {
    const usuarioGuardado = localStorage.getItem(CLAVE_RECORDAR_USUARIO) || '';

    this.loginForm = this.fb.group({
      usuario: [usuarioGuardado, [Validators.required]],
      password: ['', [Validators.required]],
      recordarAcceso: [true]
    });

    this.cargarTiendasPublicas();
  }

  private cargarTiendasPublicas(): void {
    this.authService.listarTiendasPublicas().subscribe({
      next: (tiendas: TiendaPublicaDTO[]) => {
        this.tiendasPublicas = tiendas;
      },
      error: () => {
        this.tiendasPublicas = [];
      }
    });
  }

  toggleMostrarPassword(): void {
    this.mostrarPassword = !this.mostrarPassword;
    this.cdr.detectChanges();
  }

  onOlvidePassword(): void {
    this.errorLogin = null;
    this.infoMensaje =
      'Para restablecer tu contraseña, comunícate con el administrador de tu salón o con Soporte 24/7.';
    this.cdr.detectChanges();
  }

  onSocialLogin(proveedor: 'Google' | 'Apple'): void {
    this.errorLogin = null;
    this.infoMensaje = `El inicio de sesión con ${proveedor} estará disponible próximamente. Ingresa con tu usuario y contraseña de DivinasPay.`;
    this.cdr.detectChanges();
  }

  iniciarSesion(): void {
    this.errorLogin = null;
    this.infoMensaje = null;

    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      this.errorLogin = 'Ingresa tu usuario o correo y tu contraseña.';
      this.cdr.detectChanges();
      return;
    }

    const { usuario, password, recordarAcceso } = this.loginForm.value;
    const usuarioLimpio = usuario.trim();

    if (recordarAcceso) {
      localStorage.setItem(CLAVE_RECORDAR_USUARIO, usuarioLimpio);
    } else {
      localStorage.removeItem(CLAVE_RECORDAR_USUARIO);
    }

    this.cargando = true;
    this.cdr.detectChanges();

    const intentos: LoginRequestDTO[] = [];
    for (const tienda of this.tiendasPublicas) {
      intentos.push({
        tipo: 'ADMIN',
        idTienda: tienda.idTienda,
        usuario: usuarioLimpio,
        password
      });
      intentos.push({
        tipo: 'CLIENTE',
        idTienda: tienda.idTienda,
        usuario: usuarioLimpio,
        password
      });
    }
    intentos.push({
      tipo: 'SISTEMA',
      idTienda: null,
      usuario: usuarioLimpio,
      password
    });

    let ultimoError: HttpErrorResponse | null = null;
    const flujos: Observable<LoginResponseDTO>[] = intentos.map((payload, idx) =>
      this.authService.login(payload).pipe(
        catchError((err: HttpErrorResponse) => {
          ultimoError = err;
          if (idx < intentos.length - 1) {
            return new Observable<LoginResponseDTO>((sub) => sub.complete());
          }
          return throwError(() => ultimoError || err);
        })
      )
    );

    concat(...flujos)
      .pipe(first())
      .subscribe({
        next: (resp: LoginResponseDTO) => {
          this.cargando = false;
          this.cdr.detectChanges();

          const destino =
            resp.rol === 'ADMIN_SISTEMA'
              ? '/tiendas'
              : resp.rol === 'CLIENTE'
              ? '/productos'
              : '/dashboard';

          this.router.navigate([destino]);
        },
        error: (err: HttpErrorResponse) => {
          this.cargando = false;
          const body = err?.error as ErrorResponse | undefined;
          this.errorLogin =
            body?.mensaje || 'Usuario o contraseña incorrectos.';
          this.cdr.detectChanges();
        }
      });
  }
}