# CineMax React + Node + Neon

Proyecto CineMax integrado con SUNAT. Incluye JWT, roles administrador/empleado/cliente, preórdenes con código CIN, caja, DNI, pagos de demostración, comprobantes imprimibles, clave SOL de 24 horas e imágenes servidas desde Neon Object Storage.

## Variables de Render (backend)

```env
DATABASE_URL=TU_CONEXION_COMPLETA_DE_NEON
NODE_ENV=production
FRONTEND_ORIGIN=https://TU-FRONTEND.vercel.app
JWT_SECRET=UNA_CLAVE_LARGA_Y_PRIVADA
JWT_EXPIRES_IN=8h
NEON_STORAGE_PUBLIC_BASE_URL=https://TU_ENDPOINT_DE_STORAGE
NEON_STORAGE_BUCKET=productos
PORT=10000
```

`JWT_SECRET`, `DATABASE_URL` y las credenciales de Object Storage nunca se colocan en Vercel ni en GitHub.

## Variable de Vercel (frontend)

```env
VITE_API_URL=https://TU-BACKEND.onrender.com/api
```

En Vercel usa `Root Directory=frontend`, `Build Command=npm run build` y `Output Directory=dist`.

En Render usa `Root Directory=backend`, `Build Command=npm install` y `Start Command=npm start`.

## Base de datos

Ejecuta una vez en Render o en un entorno con acceso a Neon:

```powershell
cd backend
npm install
npm run db:init
```

El script crea las columnas de DNI, pagos, comprobantes, solicitudes SOL, usuarios de prueba y películas. Las películas usan como `poster` los nombres de objetos cargados en el bucket `productos`.

## Usuarios de prueba

| Perfil | Correo | Contraseña | DNI |
|---|---|---|---|
| Administrador | `admin@cinemax.pe` | `Admin123*` | — |
| Empleado | `empleado@cinemax.pe` | `Empleado123*` | — |
| Cliente | `cliente@cinemax.pe` | `Cliente123*` | `70000001` |

## Flujo implementado

1. El cliente o trabajador crea una preorden.
2. El sistema genera un código CIN.
3. Caja busca exclusivamente por código CIN.
4. Caja solicita el DNI.
5. El backend verifica que el DNI corresponda al cliente.
6. El empleado selecciona efectivo, Yape o tarjeta.
7. Para tarjeta se valida el número con Luhn; no se guarda el número completo ni CVV.
8. El backend verifica que exista una clave SOL activa.
9. Se genera la boleta o factura.
10. El comprobante se puede imprimir.

Una preorden pendiente no es una venta final. Sin clave SOL activa no se puede cobrar ni emitir comprobante.
