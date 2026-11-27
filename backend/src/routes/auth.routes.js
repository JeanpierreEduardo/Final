import { Router } from 'express';
import { query } from '../config/db.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { hashPassword, verifyPassword } from '../utils/password.js';
import { authRequired, publicUser } from '../middleware/auth.js';
import { signAccessToken } from '../utils/jwt.js';

const router = Router();

router.post('/register', asyncHandler(async (req, res) => {
  const nombre = String(req.body?.nombre || '').trim().replace(/\s+/g, ' ');
  const correo = String(req.body?.correo || '').trim().toLowerCase();
  const dni = String(req.body?.dni || '').trim();
  const contrasena = String(req.body?.contrasena || '');
  if (nombre.length < 3 || nombre.length > 120 || !/^\S+@\S+\.\S+$/.test(correo) || !/^\d{8}$/.test(dni) || contrasena.length < 8 || contrasena.length > 128) {
    return res.status(400).json({ error: 'Usa nombre, correo válido, DNI de 8 dígitos y contraseña de 8 a 128 caracteres.' });
  }
  const hash = await hashPassword(contrasena);
  const result = await query(
    `INSERT INTO usuarios(nombre,correo,dni,contrasena_hash,contrasena,rol,activo)
     VALUES($1,$2,$3,$4,NULL,'usuario',TRUE)
     RETURNING id,nombre,correo,dni,rol,activo,turno_nombre,turno_inicio,turno_fin`,
    [nombre, correo, dni, hash]
  );
  await query("INSERT INTO usuario_rol(id_usuario,modulo,rol) VALUES($1,'cinemax','cliente'),($1,'sunat','cliente') ON CONFLICT (id_usuario,modulo) DO NOTHING", [result.rows[0].id]);
  const token = signAccessToken(result.rows[0]);
  res.status(201).json({ user: publicUser(result.rows[0]), token });
}));

router.post('/login', asyncHandler(async (req, res) => {
  const correo = String(req.body?.correo || '').trim().toLowerCase();
  const contrasena = String(req.body?.contrasena || '');
  const result = await query('SELECT * FROM usuarios WHERE LOWER(correo)=LOWER($1) LIMIT 1', [correo]);
  const user = result.rows[0];
  const check = user ? await verifyPassword(contrasena, user) : { valid: false };
  if (!user || !user.activo || !check.valid) return res.status(401).json({ error: 'Correo o contraseña incorrectos.' });
  if (user.rol === 'empleado') {
    if (!user.turno_nombre || !user.turno_inicio || !user.turno_fin) return res.status(403).json({ error: 'No tienes un turno laboral asignado.', code: 'NO_SHIFT' });
    const { isInShift } = await import('../utils/turns.js');
    if (!isInShift(user)) return res.status(403).json({ error: 'Estás fuera de turno laboral.', code: 'OUT_OF_SHIFT' });
  }
  if (check.legacy) {
    await query('UPDATE usuarios SET contrasena_hash=$1, contrasena=NULL, salt=NULL WHERE id=$2', [await hashPassword(contrasena), user.id]);
  }
  const token = signAccessToken(user);
  res.json({ user: publicUser(user), token });
}));

router.get('/me', authRequired, (req, res) => res.json({ user: publicUser(req.user) }));

router.post('/logout', (req, res) => res.json({ ok: true }));

export default router;
