# DivinasPayFrontend

Apartado frontend del proyecto DivinasPay del curso Finanzas e Ingeniería Económica (SI642).
Se conecta al backend `divinasbackend` en `http://localhost:8080/api` (ver `src/environments/environment.ts`).

## Requisitos

- Node.js 22.22.3 o superior (lo exige el Angular CLI)
- Backend corriendo en el puerto 8080

## Ejecutar

```bash
npm install
npm start
```

Abrir `http://localhost:4200/`.

## Roles

| Rol | Qué hace |
|---|---|
| Administrador del sistema | Alta, modificación y baja de tiendas; bitácora general |
| Administrador de tienda | Productos y servicios, clientes (crear, aprobar inscripciones, dar de baja), registrar ventas al crédito, registrar pagos de cuotas, listado de pago, bitácora de su tienda |
| Cliente | Se inscribe (queda pendiente hasta que la tienda le asigna sus condiciones), consulta sus compras, su plan de pagos y su listado de pago, y simula créditos |

## Compilar

```bash
npm run build
```

Los archivos quedan en `dist/`.
