import { query } from '../config/db.js';

export async function activeSol() {
  const result = await query(`SELECT id, clave_sol, clave_sol_activa_hasta FROM solicitudes_clave_sol WHERE estado='aprobada' AND clave_sol_activa_hasta > NOW() ORDER BY clave_sol_activa_hasta DESC LIMIT 1`);
  return result.rows[0] || null;
}

export async function requireActiveSol(req, res, next) {
  try {
    const sol = await activeSol();
    if (!sol) return res.status(403).json({ error: 'No hay una clave SOL activa. El administrador debe solicitarla, esperar la aceptación de SUNAT y generarla.', code: 'SOL_INACTIVA' });
    req.activeSol = sol;
    next();
  } catch (error) { next(error); }
}
