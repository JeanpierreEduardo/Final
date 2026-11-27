// La versión original conectaba directamente desde el navegador a Neon.
// Esa conexión fue retirada por seguridad. La aplicación activa usa:
//   backend/.env -> DATABASE_URL
//   frontend -> API Node.js en http://localhost:3000/api
export const NEON_DATABASE_URL = 'REMOVIDA_POR_SEGURIDAD';
