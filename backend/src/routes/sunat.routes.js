import { Router } from 'express';
import { query } from '../config/db.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { authRequired } from '../middleware/auth.js';
import { activeSol } from '../utils/sol.js';

const router = Router();
router.use(authRequired);

async function moduleRoles(userId) {
  const result = await query('SELECT rol FROM usuario_rol WHERE id_usuario=$1 AND modulo=\'sunat\'', [userId]);
  return result.rows.map((row) => row.rol);
}
async function can(userId, roles) { return (await moduleRoles(userId)).some((role) => roles.includes(role)); }
async function requireSunat(req, res, roles) {
  if (!(await can(req.user.id, roles))) { res.status(403).json({ error: 'No tienes acceso al módulo SUNAT.' }); return false; }
  return true;
}

router.get('/me', asyncHandler(async (req, res) => res.json({ roles: await moduleRoles(req.user.id) })));
router.get('/estado-clave', asyncHandler(async (req, res) => {
  if (!(await requireSunat(req, res, ['administrador']))) return;
  const sol = await activeSol();
  res.json({ activa: Boolean(sol), solicitud_id: sol?.id || null, clave: sol?.clave_sol || null, activa_hasta: sol?.clave_sol_activa_hasta || null });
}));

router.get('/solicitudes', asyncHandler(async (req, res) => {
  if (!(await requireSunat(req, res, ['administrador']))) return;
  const result = await query(`SELECT s.*,u.nombre AS usuario_nombre,u.correo AS usuario_correo FROM solicitudes_clave_sol s JOIN usuarios u ON u.id=s.id_usuario ORDER BY s.fecha_registro DESC`);
  res.json({ solicitudes: result.rows, staff: true });
}));

router.post('/solicitudes', asyncHandler(async (req, res) => {
  if (!(await requireSunat(req, res, ['administrador']))) return;
  const razon = String(req.body?.razon_social || '').trim(); const ruc = String(req.body?.ruc || '').trim();
  const representante = String(req.body?.representante || '').trim(); const correo = String(req.body?.correo || req.user.correo || '').trim().toLowerCase();
  if (razon.length < 3 || !/^\d{11}$/.test(ruc) || representante.length < 3 || !/^\S+@\S+\.\S+$/.test(correo)) return res.status(400).json({ error: 'Completa razón social, RUC de 11 dígitos, representante y correo válido.' });
  const result = await query(`INSERT INTO solicitudes_clave_sol(id_usuario,razon_social,ruc,representante,correo,descripcion) VALUES($1,$2,$3,$4,$5,$6) RETURNING *`, [req.user.id, razon, ruc, representante, correo, String(req.body?.descripcion || '').trim() || null]);
  res.status(201).json({ solicitud: result.rows[0] });
}));

router.patch('/solicitudes/:id/estado', asyncHandler(async (req, res) => {
  if (!(await requireSunat(req, res, ['administrador']))) return;
  const estado = String(req.body?.estado || '');
  if (!['en proceso','aprobada','rechazado'].includes(estado)) return res.status(400).json({ error: 'Estado inválido.' });
  const result = await query('UPDATE solicitudes_clave_sol SET estado=$1,actualizado_por=$2,actualizado_en=NOW() WHERE id=$3 RETURNING *', [estado, req.user.id, Number(req.params.id)]);
  if (!result.rows[0]) return res.status(404).json({ error: 'Solicitud no encontrada.' });
  if (req.body?.observacion) await query('INSERT INTO observaciones(id_usuario,id_solicitud,texto) VALUES($1,$2,$3)', [req.user.id, result.rows[0].id, String(req.body.observacion).trim()]);
  res.json({ solicitud: result.rows[0] });
}));

router.post('/solicitudes/:id/generar-clave', asyncHandler(async (req, res) => {
  if (!(await requireSunat(req, res, ['administrador']))) return;
  const id = Number(req.params.id);
  const solicitud = (await query("SELECT * FROM solicitudes_clave_sol WHERE id=$1 AND LOWER(TRIM(estado))='aprobada'", [id])).rows[0];
  if (!solicitud) return res.status(400).json({ error: 'La solicitud debe estar aceptada por SUNAT antes de generar la clave.' });
  const clave = `SOL-${randomKey(20)}`;
  const result = await query(`UPDATE solicitudes_clave_sol SET clave_sol=$1,clave_sol_activa_hasta=NOW()+INTERVAL '24 hours',actualizado_por=$2,actualizado_en=NOW() WHERE id=$3 RETURNING id,estado,clave_sol,clave_sol_activa_hasta`, [clave, req.user.id, id]);
  res.json({ clave: result.rows[0] });
}));

router.get('/comprobantes', asyncHandler(async (req, res) => {
  const staff = await can(req.user.id, ['administrador','empleado']);
  if (!staff && !(await can(req.user.id, ['cliente','usuario']))) return res.status(403).json({ error: 'No tienes acceso al módulo SUNAT.' });
  const result = await query(`SELECT c.id,c.codigo_seguimiento,c.nombre_cliente,c.correo_cliente,c.tipo_comprobante,c.doc_cliente,c.numero_comprobante,c.total_venta,c.estado,c.fecha_registro,s.estado AS estado_clave_sol FROM compras_entradas_cine c LEFT JOIN solicitudes_clave_sol s ON s.id=c.id_clave_sol ${staff ? '' : 'WHERE c.id_usuario=$1'} ORDER BY c.fecha_registro DESC LIMIT 500`, staff ? [] : [req.user.id]);
  res.json({ comprobantes: result.rows });
}));

router.get('/fiscalizacion', asyncHandler(async (req, res) => {
  if (!(await requireSunat(req, res, ['administrador','empleado']))) return;
  const result = await query(`SELECT COALESCE(c.doc_cliente,'sin documento') AS contribuyente, COUNT(*)::INTEGER AS operaciones, COALESCE(SUM(c.total_venta),0)::NUMERIC(12,2) AS total_vendido, MAX(c.fecha_registro) AS ultima_venta FROM compras_entradas_cine c WHERE c.estado <> 'cancelado' GROUP BY c.doc_cliente ORDER BY total_vendido DESC`);
  res.json({ fiscalizacion: result.rows });
}));

export default router;

function randomKey(length) { return Array.from({ length }, () => 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[Math.floor(Math.random() * 32)]).join(''); }
