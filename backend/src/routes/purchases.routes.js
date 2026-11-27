import { Router } from 'express';
import { query } from '../config/db.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { authRequired, requireStaff } from '../middleware/auth.js';
import { activeSol } from '../utils/sol.js';

const router = Router();
router.use(authRequired);

router.get('/', asyncHandler(async (req, res) => {
  const result = await query(
    `SELECT c.*,p.clave AS pelicula_clave FROM compras_entradas_cine c
     LEFT JOIN peliculas p ON p.id=c.pelicula_id
     WHERE c.id_usuario=$1 ORDER BY c.fecha_registro DESC,c.id DESC`,
    [req.user.id]
  );
  res.json({ purchases: result.rows });
}));

router.get('/all', requireStaff, asyncHandler(async (req, res) => {
  const result = await query(
    `SELECT c.*,p.clave AS pelicula_clave FROM compras_entradas_cine c
     LEFT JOIN peliculas p ON p.id=c.pelicula_id
     ORDER BY c.fecha_registro DESC,c.id DESC LIMIT 500`
  );
  res.json({ purchases: result.rows });
}));

router.get('/clients', requireStaff, asyncHandler(async (req, res) => {
  const result = await query("SELECT id,nombre,correo,dni FROM usuarios WHERE rol='usuario' AND activo=TRUE ORDER BY nombre");
  res.json({ clients: result.rows });
}));

router.get('/:id', asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const result = await query(
    `SELECT c.*,p.clave AS pelicula_clave FROM compras_entradas_cine c
     LEFT JOIN peliculas p ON p.id=c.pelicula_id WHERE c.id=$1 AND ($2='staff' OR c.id_usuario=$3)`,
    [id, ['administrador', 'empleado'].includes(req.user.rol) ? 'staff' : 'user', req.user.id]
  );
  if (!result.rows[0]) return res.status(404).json({ error: 'Compra no encontrada.' });
  res.json({ purchase: result.rows[0] });
}));

router.post('/', asyncHandler(async (req, res) => {
  if (!['usuario', 'administrador', 'empleado'].includes(req.user.rol)) return res.status(403).json({ error: 'Este usuario no puede registrar compras.' });
  const userId = ['administrador', 'empleado'].includes(req.user.rol) ? Number(req.body?.id_usuario) : req.user.id;
  const purchase = await createPurchase(userId, req.body || {}, ['administrador', 'empleado'].includes(req.user.rol));
  res.status(201).json({ purchase, message: `Preorden registrada. Código CIN: ${purchase.codigo_seguimiento}` });
}));

router.put('/:id', asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const isStaff = ['administrador', 'empleado'].includes(req.user.rol);
  const previous = await query('SELECT * FROM compras_entradas_cine WHERE id=$1 AND ($2=TRUE OR id_usuario=$3)', [id, isStaff, req.user.id]);
  if (!previous.rows[0]) return res.status(404).json({ error: 'Compra no encontrada.' });
  if (!isStaff && previous.rows[0].estado !== 'registrado') return res.status(400).json({ error: 'Esta compra ya no se puede modificar.' });
  const body = req.body || {};
  const movie = await getMovie(body.pelicula || previous.rows[0].pelicula_clave || previous.rows[0].pelicula_id);
  if (!movie || movie.estado !== 'cartelera') return res.status(400).json({ error: 'La película no está en cartelera.' });
  const horario = String(body.horario || body.funcion_horario || previous.rows[0].funcion_horario);
  const cantidad = Number(body.cantidad || previous.rows[0].cantidad);
  const comentario = String(body.comentario ?? previous.rows[0].comentario ?? '').trim();
  if (!['tarde', 'noche'].includes(horario) || !Number.isInteger(cantidad) || cantidad < 1 || cantidad > 8) return res.status(400).json({ error: 'Horario o cantidad inválidos.' });
  if (isStaff && body.estado && !['registrado', 'atendido', 'cancelado'].includes(String(body.estado))) return res.status(400).json({ error: 'Estado de compra inválido.' });
  const state = isStaff && body.estado ? String(body.estado) : null;
  const targetUser = isStaff && body.id_usuario ? (await query("SELECT id,nombre,correo,dni FROM usuarios WHERE id=$1 AND rol='usuario' AND activo=TRUE", [Number(body.id_usuario)])).rows[0] : null;
  if (isStaff && body.id_usuario && !targetUser) return res.status(400).json({ error: 'El cliente seleccionado no existe o está inactivo.' });
  const result = await query(
    `UPDATE compras_entradas_cine SET pelicula_id=$1,pelicula=$2,funcion_horario=$3,sala=$4,cantidad=$5,comentario=$6,
       estado=COALESCE($7,estado),id_usuario=COALESCE($8,id_usuario),nombre_cliente=COALESCE($9,nombre_cliente),correo_cliente=COALESCE($10,correo_cliente),doc_cliente=COALESCE($11,doc_cliente)
     WHERE id=$12 AND ($13=TRUE OR id_usuario=$14) AND ($13=TRUE OR estado='registrado') RETURNING *`,
    [movie.id, movie.titulo, horario, movie.sala, cantidad, comentario, state, targetUser?.id || null, targetUser?.nombre || null, targetUser?.correo || null, targetUser?.dni || null, id, isStaff, req.user.id]
  );
  if (!result.rows[0]) return res.status(400).json({ error: 'No se pudo actualizar la compra.' });
  res.json({ purchase: result.rows[0] });
}));

router.delete('/:id', requireStaff, asyncHandler(async (req, res) => {
  const result = await query('DELETE FROM compras_entradas_cine WHERE id=$1 RETURNING id', [Number(req.params.id)]);
  if (!result.rows[0]) return res.status(404).json({ error: 'Compra no encontrada.' });
  res.json({ ok: true });
}));

async function getMovie(value) {
  const key = String(value || '');
  const result = await query('SELECT * FROM peliculas WHERE clave=$1 OR id::text=$1 LIMIT 1', [key]);
  return result.rows[0];
}

async function createPurchase(userId, data, allowState = false) {
  const movie = await getMovie(data.pelicula || data.peliculaId);
  const horario = String(data.horario || data.funcion_horario || '');
  const cantidad = Number(data.cantidad || data.entradas);
  const comentario = String(data.comentario || '').trim();
  const tipoComprobante = String(data.tipo_comprobante || 'ninguno').toLowerCase();
  let docCliente = String(data.doc_cliente || '').trim();
  if (!movie || movie.estado !== 'cartelera') throw Object.assign(new Error('La película seleccionada no está disponible.'), { status: 400 });
  if (!['tarde', 'noche'].includes(horario) || !Number.isInteger(cantidad) || cantidad < 1 || cantidad > 8) throw Object.assign(new Error('Selecciona horario y entre 1 y 8 entradas.'), { status: 400 });
  if (!Number.isInteger(userId) || userId < 1) throw Object.assign(new Error('Selecciona un cliente válido.'), { status: 400 });
  if (!['ninguno', 'boleta', 'factura'].includes(tipoComprobante)) throw Object.assign(new Error('Tipo de comprobante inválido.'), { status: 400 });
  if (tipoComprobante === 'factura' && !/^\d{11}$/.test(docCliente)) throw Object.assign(new Error('Para factura ingresa un RUC de 11 dígitos.'), { status: 400 });
  const user = (await query('SELECT id,nombre,correo,dni FROM usuarios WHERE id=$1 AND rol=\'usuario\' AND activo=TRUE', [userId])).rows[0];
  if (!user) throw Object.assign(new Error('El cliente seleccionado no existe o está inactivo.'), { status: 400 });
  if (!docCliente && user.dni) docCliente = user.dni;
  if (tipoComprobante === 'boleta' && !/^\d{8}$/.test(docCliente)) throw Object.assign(new Error('El cliente debe tener un DNI válido para la boleta.'), { status: 400 });
  const state = allowState && ['registrado', 'atendido', 'cancelado'].includes(String(data.estado))
    ? String(data.estado)
    : 'registrado';
  const code = `CIN-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
  const result = await query(
    `INSERT INTO compras_entradas_cine(codigo_seguimiento,id_usuario,nombre_cliente,correo_cliente,pelicula,funcion_horario,sala,fecha_funcion,cantidad,comentario,estado,estado_pago,pelicula_id,precio_unitario,total_venta,asientos_vendidos,tipo_comprobante,doc_cliente)
     VALUES($1,$2,$3,$4,$5,$6,$7,CURRENT_DATE,$8::integer,$9,$10,'pendiente',$11,18::numeric,18::numeric*$8::integer,'[]'::jsonb,$12,NULLIF($13,'')) RETURNING *`,
    [code, user.id, user.nombre, user.correo, movie.titulo, horario, movie.sala, cantidad, comentario, state, movie.id, tipoComprobante, docCliente]
  );
  return result.rows[0];
}

export default router;
