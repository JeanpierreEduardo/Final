import { Router } from 'express';
import { pool, query } from '../config/db.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { authRequired, requireRole } from '../middleware/auth.js';
import { hashPassword } from '../utils/password.js';
import { validateShift } from '../utils/turns.js';

const router = Router();
router.use(authRequired, requireRole('administrador'));

router.get('/dashboard', asyncHandler(async (req, res) => {
  const [movies, workers, clients, purchases] = await Promise.all([
    query("SELECT COUNT(*)::int AS total, COUNT(*) FILTER (WHERE estado='cartelera')::int AS cartelera FROM peliculas"),
    query("SELECT COUNT(*)::int AS total, COUNT(*) FILTER (WHERE activo=TRUE)::int AS activos FROM usuarios WHERE rol IN ('administrador','empleado')"),
    query("SELECT COUNT(*)::int AS total, COUNT(*) FILTER (WHERE activo=TRUE)::int AS activos FROM usuarios WHERE rol='usuario'"),
    query(`SELECT COUNT(*)::int AS compras,
      COUNT(*) FILTER (WHERE estado='registrado')::int AS registradas,
      COUNT(*) FILTER (WHERE estado='atendido')::int AS atendidas,
      COUNT(*) FILTER (WHERE estado='cancelado')::int AS canceladas,
      COALESCE(SUM(total_venta) FILTER (WHERE estado<>'cancelado'),0)::numeric AS ingresos
      FROM compras_entradas_cine`)
  ]);
  res.json({ movies: movies.rows[0], workers: workers.rows[0], clients: clients.rows[0], purchases: purchases.rows[0] });
}));

router.get('/clients', asyncHandler(async (req, res) => {
  const result = await query(`SELECT id,nombre,correo,dni,activo,fecha_registro FROM usuarios WHERE rol='usuario' ORDER BY nombre,id`);
  res.json({ clients: result.rows });
}));

router.put('/clients/:id', asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const nombre = String(req.body?.nombre || '').trim();
  const correo = String(req.body?.correo || '').trim().toLowerCase();
  const activo = req.body?.activo === true || req.body?.activo === 'true';
  const password = String(req.body?.contrasena || '');
  if (nombre.length < 3 || !/^\S+@\S+\.\S+$/.test(correo) || (password && password.length < 8)) return res.status(400).json({ error: 'Revisa nombre, correo y contraseña.' });
  const hash = password ? await hashPassword(password) : null;
  const result = await query(
    `UPDATE usuarios SET nombre=$1,correo=$2,activo=$3,
      contrasena_hash=COALESCE($4,contrasena_hash),contrasena=CASE WHEN $4 IS NOT NULL THEN NULL ELSE contrasena END,salt=NULL
     WHERE id=$5 AND rol='usuario' RETURNING id,nombre,correo,activo,fecha_registro`,
    [nombre, correo, activo, hash, id]
  );
  if (!result.rows[0]) return res.status(404).json({ error: 'Cliente no encontrado.' });
  if (password || !activo) await query('DELETE FROM sesiones_cinemax WHERE id_usuario=$1', [id]);
  res.json({ client: result.rows[0] });
}));

router.delete('/clients/:id', asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const db = await pool.connect();
  try {
    await db.query('BEGIN');
    await db.query('UPDATE compras_entradas_cine SET id_usuario=NULL,usuario_id=NULL WHERE id_usuario=$1 OR usuario_id=$1', [id]);
    const result = await db.query("DELETE FROM usuarios WHERE id=$1 AND rol='usuario' RETURNING id", [id]);
    if (!result.rows[0]) throw Object.assign(new Error('Cliente no encontrado.'), { status: 404 });
    await db.query('COMMIT');
    res.json({ ok: true });
  } catch (error) {
    await db.query('ROLLBACK');
    throw error;
  } finally {
    db.release();
  }
}));

router.get('/workers', asyncHandler(async (req, res) => {
  const result = await query(`SELECT id,nombre,correo,dni,rol,activo,fecha_registro,turno_nombre,turno_inicio,turno_fin FROM usuarios WHERE rol IN ('administrador','empleado') ORDER BY nombre,id`);
  res.json({ workers: result.rows });
}));

router.post('/workers', asyncHandler(async (req, res) => {
  const data = validateWorker(req.body || {}, true);
  const hash = await hashPassword(data.contrasena);
  const result = await query(
    `INSERT INTO usuarios(nombre,correo,rol,activo,contrasena_hash,salt,turno_nombre,turno_inicio,turno_fin)
     VALUES($1,$2,$3,TRUE,$4,NULL,$5,$6,$7)
     RETURNING id,nombre,correo,rol,activo,turno_nombre,turno_inicio,turno_fin`,
    [data.nombre, data.correo, data.rol, hash, data.turno_nombre, data.turno_inicio, data.turno_fin]
  );
  res.status(201).json({ worker: result.rows[0] });
}));

router.put('/workers/:id', asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const data = validateWorker(req.body || {}, false);
  if (id === req.user.id && (data.rol !== 'administrador' || !data.activo)) return res.status(400).json({ error: 'No puedes quitarte el rol administrador ni desactivar tu cuenta.' });
  const hash = data.contrasena ? await hashPassword(data.contrasena) : null;
  const result = await query(
    `UPDATE usuarios SET nombre=$1,correo=$2,rol=$3,activo=$4,
      turno_nombre=$5,turno_inicio=$6,turno_fin=$7,
      contrasena_hash=COALESCE($8,contrasena_hash),contrasena=CASE WHEN $8 IS NOT NULL THEN NULL ELSE contrasena END,salt=NULL
     WHERE id=$9 AND rol IN ('administrador','empleado')
     RETURNING id,nombre,correo,rol,activo,turno_nombre,turno_inicio,turno_fin`,
    [data.nombre, data.correo, data.rol, data.activo, data.turno_nombre, data.turno_inicio, data.turno_fin, hash, id]
  );
  if (!result.rows[0]) return res.status(404).json({ error: 'Trabajador o administrador no encontrado.' });
  if (data.contrasena || !data.activo) await query('DELETE FROM sesiones_cinemax WHERE id_usuario=$1', [id]);
  res.json({ worker: result.rows[0] });
}));
router.delete('/workers/:id', asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: 'ID de trabajador inválido.' });
  }
  if (Number(req.user.id) === id) {
    return res.status(400).json({ error: 'No puedes desactivar tu propia cuenta.' });
  }

  // Baja lógica: conserva los registros relacionados, pero desactiva al trabajador.
  const result = await query(
    `UPDATE usuarios
     SET activo = FALSE
     WHERE id = $1 AND rol = 'empleado' AND activo = TRUE
     RETURNING id`,
    [id]
  );

  if (result.rowCount === 0) {
    return res.status(404).json({ error: 'Trabajador no encontrado o ya inactivo.' });
  }

  // Elimina sus sesiones para que la desactivación tenga efecto inmediato.
  await query(
    'DELETE FROM sesiones_cinemax WHERE id_usuario = $1',
    [id]
  );

  return res.status(204).end();
}));


function validateWorker(body, creating) {
  const nombre = String(body.nombre || '').trim().replace(/\s+/g, ' ');
  const correo = String(body.correo || '').trim().toLowerCase();
  const rol = String(body.rol || 'empleado');
  const contrasena = String(body.contrasena || '');
  const activo = body.activo === true || body.activo === 'true';
  if (nombre.length < 3 || nombre.length > 120 || !/^\S+@\S+\.\S+$/.test(correo) || !['administrador', 'empleado'].includes(rol)) throw Object.assign(new Error('Revisa nombre, correo y rol.'), { status: 400 });
  if ((creating && contrasena.length < 8) || (!creating && contrasena && contrasena.length < 8)) throw Object.assign(new Error('La contraseña debe tener al menos 8 caracteres.'), { status: 400 });
  const shift = validateShift(body, rol);
  return { nombre, correo, rol, contrasena, activo: creating ? true : activo, ...shift };
}

export default router;
