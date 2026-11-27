import { Router } from 'express';
import { pool, query } from '../config/db.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { authRequired, requireRole } from '../middleware/auth.js';
import { hashPassword, verifyPassword } from '../utils/password.js';
import { activeSol } from '../utils/sol.js';

const router = Router();
router.use(authRequired, requireRole('administrador', 'empleado'));

router.get('/clients', asyncHandler(async (req, res) => {
  const result = await query("SELECT id,nombre,correo,dni FROM usuarios WHERE rol='usuario' AND activo=TRUE ORDER BY nombre");
  res.json({ clients: result.rows });
}));

router.get('/availability', asyncHandler(async (req, res) => {
  const movie = (await query('SELECT * FROM peliculas WHERE clave=$1 AND estado=\'cartelera\'', [String(req.query.pelicula || '')])).rows[0];
  const fecha = String(req.query.fecha || '');
  const horario = String(req.query.horario || '');
  if (!movie || !/^\d{4}-\d{2}-\d{2}$/.test(fecha) || !['tarde', 'noche'].includes(horario)) return res.status(400).json({ error: 'Película, fecha u horario inválidos.' });
  const result = await query(
    `SELECT a.asiento FROM asientos_ventas a JOIN compras_entradas_cine c ON c.id=a.compra_id
     WHERE a.sala=$1 AND a.fecha_funcion=$2::date AND a.horario=$3 AND c.estado<>'cancelado' ORDER BY a.asiento`,
    [movie.sala, fecha, horario]
  );
  res.json({ movie, fecha, horario, occupied: result.rows.map((row) => row.asiento), filas: 6, columnas: 8 });
}));

router.post('/sales', asyncHandler(async (req, res) => {
  const { pelicula, fecha_funcion: fecha, horario, id_usuario: clientId, asientos = [], comentario = '', precio_unitario: unit } = req.body || {};
  const movie = (await query("SELECT * FROM peliculas WHERE clave=$1 AND estado='cartelera'", [String(pelicula || '')])).rows[0];
  const client = (await query("SELECT id,nombre,correo,dni FROM usuarios WHERE id=$1 AND rol='usuario' AND activo=TRUE", [Number(clientId)])).rows[0];
  const seats = [...new Set((Array.isArray(asientos) ? asientos : []).map((seat) => String(seat).toUpperCase()))];
  const price = Number(unit);
  if (!movie || !client || !/^\d{4}-\d{2}-\d{2}$/.test(String(fecha || '')) || !['tarde', 'noche'].includes(horario) || !seats.length || seats.length > 8 || seats.some((seat) => !/^[A-F][1-8]$/.test(seat)) || !Number.isFinite(price) || price <= 0 || price > 9999) {
    return res.status(400).json({ error: 'Revisa cliente, película, fecha, horario, asientos y precio.' });
  }
  const code = `CIN-${cryptoRandom(8)}`;
  const clientDb = await pool.connect();
  try {
    await clientDb.query('BEGIN');
    const sale = await clientDb.query(
      `INSERT INTO compras_entradas_cine(codigo_seguimiento,id_usuario,nombre_cliente,correo_cliente,pelicula,funcion_horario,sala,fecha_funcion,cantidad,comentario,precio_unitario,total_venta,estado,estado_pago,pelicula_id,id_empleado,asientos_vendidos,doc_cliente)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8::date,$9::integer,$10,$11::numeric,$12::numeric*$9::integer,'registrado','pendiente',$13,$14,$15::jsonb,$16) RETURNING *`,
      [code, client.id, client.nombre, client.correo, movie.titulo, horario, movie.sala, fecha, seats.length, String(comentario).slice(0, 500), price, price, movie.id, req.user.id, JSON.stringify(seats), client.dni]
    );
    for (const seat of seats) {
      await clientDb.query(
        `INSERT INTO asientos_ventas(compra_id,sala,fecha_funcion,horario,asiento) VALUES($1,$2,$3::date,$4,$5)`,
        [sale.rows[0].id, movie.sala, fecha, horario, seat]
      );
    }
    await clientDb.query('COMMIT');
    res.status(201).json({ sale: { ...sale.rows[0], asientos: seats }, message: `Preorden registrada. Código CIN: ${code}` });
  } catch (error) {
    await clientDb.query('ROLLBACK');
    throw error;
  } finally {
    clientDb.release();
  }
}));

router.get('/cash/:code', asyncHandler(async (req, res) => {
  const code = String(req.params.code || '').trim().toUpperCase();
  const result = await query(
    `SELECT c.*,u.dni AS cliente_dni,u.nombre AS cliente_nombre,u.correo AS cliente_correo,
      p.titulo AS pelicula_titulo,p.sala AS pelicula_sala
     FROM compras_entradas_cine c
     LEFT JOIN usuarios u ON u.id=c.id_usuario
     LEFT JOIN peliculas p ON p.id=c.pelicula_id
     WHERE UPPER(c.codigo_seguimiento)=$1 LIMIT 1`, [code]
  );
  if (!result.rows[0]) return res.status(404).json({ error: 'No existe una reserva o preorden con ese código CIN.' });
  const row = result.rows[0];
  if (row.estado_pago === 'pagado') return res.status(400).json({ error: 'Esta preorden ya fue cobrada.' });
  res.json({ preorder: row });
}));

router.post('/cash/:code/pay', asyncHandler(async (req, res) => {
  const code = String(req.params.code || '').trim().toUpperCase();
  const dni = String(req.body?.dni || '').trim();
  const formaPago = String(req.body?.forma_pago || '').toLowerCase();
  const tipoComprobante = String(req.body?.tipo_comprobante || 'boleta').toLowerCase();
  const numeroTarjeta = String(req.body?.numero_tarjeta || '').replace(/\D/g, '');
  const ruc = String(req.body?.ruc || '').trim();
  const razonSocial = String(req.body?.razon_social || '').trim();
  if (!/^\d{8}$/.test(dni) || !['efectivo', 'yape', 'tarjeta'].includes(formaPago) || !['boleta', 'factura'].includes(tipoComprobante)) return res.status(400).json({ error: 'DNI, comprobante o método de pago inválido.' });
  if (formaPago === 'tarjeta' && !luhn(numeroTarjeta)) return res.status(400).json({ error: 'La tarjeta no supera la validación de número.' });
  if (tipoComprobante === 'factura' && (!/^\d{11}$/.test(ruc) || razonSocial.length < 3)) return res.status(400).json({ error: 'Para factura se necesita RUC válido y razón social.' });
  const sol = await activeSol();
  if (!sol) return res.status(403).json({ error: 'No hay una clave SOL activa. No se puede cobrar ni emitir la boleta.', code: 'SOL_INACTIVA' });
  const found = (await query(`SELECT c.*,u.dni AS cliente_dni,u.nombre AS cliente_nombre,u.correo AS cliente_correo FROM compras_entradas_cine c LEFT JOIN usuarios u ON u.id=c.id_usuario WHERE UPPER(c.codigo_seguimiento)=$1 LIMIT 1`, [code])).rows[0];
  if (!found) return res.status(404).json({ error: 'Preorden no encontrada.' });
  if (found.estado_pago === 'pagado') return res.status(400).json({ error: 'La preorden ya fue cobrada.' });
  if (found.cliente_dni !== dni) return res.status(400).json({ error: 'El DNI no corresponde al cliente de esta preorden.' });
  const db = await pool.connect();
  try {
    await db.query('BEGIN');
    const sequence = await db.query('UPDATE comprobante_seq SET ultimo=ultimo+1 WHERE id=1 RETURNING ultimo');
    const number = `${tipoComprobante === 'boleta' ? 'B001' : 'F001'}-${String(sequence.rows[0].ultimo).padStart(8, '0')}`;
    const updated = await db.query(
      `UPDATE compras_entradas_cine SET estado='registrado',estado_pago='pagado',fecha_pago=NOW(),id_empleado=$1,id_emisor=$1,id_clave_sol=$2,forma_pago=$3,tipo_comprobante=$4,doc_cliente=$5,ruc_cliente=$6,razon_social=$7,tarjeta_ultimos4=$8,numero_comprobante=$9,monto=total_venta,fecha=NOW()
       WHERE id=$10 AND estado_pago='pendiente' RETURNING *`,
      [req.user.id, sol.id, formaPago, tipoComprobante, dni, tipoComprobante === 'factura' ? ruc : null, tipoComprobante === 'factura' ? razonSocial : null, formaPago === 'tarjeta' ? numeroTarjeta.slice(-4) : null, number, found.id]
    );
    if (!updated.rows[0]) throw Object.assign(new Error('La preorden ya fue cobrada por otro usuario.'), { status: 409 });
    await db.query('COMMIT');
    res.json({ receipt: { ...updated.rows[0], cliente_dni: dni, cliente_nombre: found.cliente_nombre, numero_comprobante: number }, message: `${tipoComprobante === 'boleta' ? 'Boleta' : 'Factura'} generada correctamente.` });
  } catch (error) { await db.query('ROLLBACK'); throw error; } finally { db.release(); }
}));

router.get('/sales', asyncHandler(async (req, res) => {
  const result = await query(
    `SELECT c.*,COALESCE((SELECT json_agg(a.asiento ORDER BY a.asiento) FROM asientos_ventas a WHERE a.compra_id=c.id),c.asientos_vendidos,'[]'::jsonb) AS asientos
     FROM compras_entradas_cine c WHERE c.id_empleado=$1 ORDER BY c.fecha_registro DESC,c.id DESC`,
    [req.user.id]
  );
  res.json({ sales: result.rows });
}));

router.get('/tickets/:code', asyncHandler(async (req, res) => {
  const result = await ticketByCode(String(req.params.code).trim().toUpperCase());
  if (!result) return res.status(404).json({ error: 'Entrada no encontrada.' });
  res.json({ ticket: result });
}));

router.post('/tickets/:code/validate', asyncHandler(async (req, res) => {
  const code = String(req.params.code).trim().toUpperCase();
  const result = await query(
    `UPDATE compras_entradas_cine SET estado='atendido',id_validador=$1,fecha_validacion=NOW()
     WHERE codigo_seguimiento=$2 AND estado='registrado' AND (fecha_funcion IS NULL OR fecha_funcion=(NOW() AT TIME ZONE 'America/Lima')::date)
     RETURNING *`,
    [req.user.id, code]
  );
  if (!result.rows[0]) return res.status(400).json({ error: 'No se puede validar: el código no existe, ya fue atendido, está cancelado o la función no es de hoy.' });
  res.json({ ticket: result.rows[0] });
}));

router.put('/profile', asyncHandler(async (req, res) => {
  const correo = String(req.body?.correo || '').trim().toLowerCase();
  const actual = String(req.body?.contrasena_actual || '');
  const nueva = String(req.body?.contrasena_nueva || '');
  const user = (await query('SELECT * FROM usuarios WHERE id=$1 AND activo=TRUE', [req.user.id])).rows[0];
  const valid = await verifyPassword(actual, user);
  if (!/^\S+@\S+\.\S+$/.test(correo) || !valid.valid || (nueva && nueva.length < 8)) return res.status(400).json({ error: 'Correo, contraseña actual o nueva contraseña inválidos.' });
  const hash = nueva ? await hashPassword(nueva) : user.contrasena_hash;
  const result = await query('UPDATE usuarios SET correo=$1,contrasena_hash=$2,contrasena=NULL,salt=NULL WHERE id=$3 RETURNING id,nombre,correo,rol,activo,turno_nombre,turno_inicio,turno_fin', [correo, hash, req.user.id]);
  res.json({ user: result.rows[0] });
}));

async function ticketByCode(code) {
  const result = await query(
    `SELECT c.*,COALESCE((SELECT json_agg(a.asiento ORDER BY a.asiento) FROM asientos_ventas a WHERE a.compra_id=c.id),c.asientos_vendidos,'[]'::jsonb) AS asientos
     FROM compras_entradas_cine c WHERE c.codigo_seguimiento=$1`,
    [code]
  );
  return result.rows[0];
}

function cryptoRandom(length) {
  return Array.from({ length }, () => Math.floor(Math.random() * 36).toString(36)).join('').toUpperCase();
}

function luhn(number) {
  if (!/^\d{13,19}$/.test(number)) return false;
  let sum = 0; let doubleIt = false;
  for (let i = number.length - 1; i >= 0; i -= 1) {
    let digit = Number(number[i]);
    if (doubleIt) { digit *= 2; if (digit > 9) digit -= 9; }
    sum += digit; doubleIt = !doubleIt;
  }
  return sum % 10 === 0;
}

export default router;
