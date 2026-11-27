ORDEN PARA CREAR LA BASE DE DATOS CINE MAX + SUNAT EN NEON

IMPORTANTE: 00_RESET_TOTAL.sql elimina las tablas del proyecto CineMax/SUNAT.
No lo ejecutes si tienes información que deseas conservar.

En el SQL Editor de Neon ejecuta los archivos en este orden:

00_RESET_TOTAL.sql
schema.sql
integracion_sunat.sql
05_COMPATIBILIDAD_SUNAT_COMPANERO.sql
06_DATOS_INICIALES.sql

Credenciales creadas:

Administrador: admin@cinemax.pe / Admin123*
Empleado: empleado@cinemax.pe / Empleado123*
Cliente: cliente@cinemax.pe / Cliente123*
DNI del cliente de prueba: 70000001

Después de crear la base, en Render deja temporalmente el comando:

npm run db:init && npm start

Si la base ya fue creada manualmente con estos cuatro scripts, puedes usar
directamente npm start. No ejecutes db:init repetidamente en producción.

Las imágenes no se crean mediante SQL. Deben permanecer en el bucket
productos de Neon Object Storage y el backend las arma con:
NEON_STORAGE_PUBLIC_BASE_URL + /productos/ + poster.
