import { query } from '../config/db.js';
import { verifyAccessToken } from '../utils/jwt.js';
import { isInShift, NO_SHIFT, OUT_OF_SHIFT } from '../utils/turns.js';

function tokenFromRequest(req) {
  const header = String(req.headers.authorization || '');
  return header.startsWith('Bearer ') ? header.slice(7).trim() : null;
}

export async function authRequired(req, res, next) {
  try {
    const token = tokenFromRequest(req);
    if (!token) return res.status(401).json({ error: 'Debes iniciar sesión.' });
    const claims = verifyAccessToken(token);
    const result = await query(
      `SELECT id,nombre,correo,dni,rol,activo,turno_nombre,turno_inicio,turno_fin
       FROM usuarios WHERE id=$1 AND activo=TRUE LIMIT 1`,
      [Number(claims.sub)]
    );
    const user = result.rows[0];
    if (!user) return res.status(401).json({ error: 'Tu token ya no es válido. Inicia sesión nuevamente.' });
    if (user.rol === 'empleado') {
      if (!user.turno_nombre || !user.turno_inicio || !user.turno_fin) return res.status(403).json({ error: NO_SHIFT, code: 'NO_SHIFT' });
      if (!isInShift(user)) return res.status(403).json({ error: OUT_OF_SHIFT, code: 'OUT_OF_SHIFT' });
    }
    req.user = user;
    next();
  } catch (error) {
    if (error?.name === 'TokenExpiredError' || error?.name === 'JsonWebTokenError') return res.status(401).json({ error: 'JWT inválido o expirado. Inicia sesión nuevamente.', code: 'JWT_INVALID' });
    next(error);
  }
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user?.rol)) return res.status(403).json({ error: 'No tienes permisos para esta operación.' });
    next();
  };
}

export function requireStaff(req, res, next) {
  return requireRole('administrador', 'empleado')(req, res, next);
}

export function publicUser(user) {
  return {
    id: user.id,
    nombre: user.nombre,
    correo: user.correo,
    dni: user.dni || null,
    rol: user.rol,
    activo: user.activo,
    turno_nombre: user.turno_nombre,
    turno_inicio: user.turno_inicio,
    turno_fin: user.turno_fin
  };
}
