export default function PreorderModal({ preorder, onClose }) {
  if (!preorder) return null;
  const seats = Array.isArray(preorder.asientos) ? preorder.asientos.join(', ') : preorder.asientos_vendidos || 'Sin asignar';
  return <div className="preorden-overlay" role="dialog" aria-modal="true" aria-label="Preorden generada">
    <article className="preorden-boleta">
      <button type="button" className="preorden-cerrar" onClick={onClose} aria-label="Cerrar">×</button>
      <div className="boleta-sello">PREORDEN</div>
      <p className="eyebrow">CineMax Perú</p>
      <h2>Preorden registrada</h2>
      <p className="boleta-cin">{preorder.codigo_seguimiento}</p>
      <div className="boleta-datos">
        <p><strong>Cliente:</strong> {preorder.nombre_cliente || preorder.cliente_nombre || 'Cliente registrado'}</p>
        <p><strong>DNI:</strong> {preorder.doc_cliente || preorder.cliente_dni || '-'}</p>
        <p><strong>Película:</strong> {preorder.pelicula}</p>
        <p><strong>Función:</strong> {preorder.fecha_funcion || '-'} · {preorder.funcion_horario}</p>
        <p><strong>Asientos:</strong> {seats}</p>
        <p><strong>Entradas:</strong> {preorder.cantidad}</p>
        <p className="boleta-total">Total pendiente: S/ {Number(preorder.total_venta || 0).toFixed(2)}</p>
      </div>
      <p className="boleta-ayuda">Conserva este código CIN. Debes presentarlo en Caja para pagar y obtener tu comprobante.</p>
      <button type="button" className="boton boton-primario" onClick={onClose}>Entendido</button>
    </article>
  </div>;
}
