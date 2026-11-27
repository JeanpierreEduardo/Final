import { jsPDF } from 'jspdf';

function value(value, fallback = '-') {
  return value === null || value === undefined || value === '' ? fallback : String(value);
}

export function downloadReceiptPdf(receipt) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const left = 18;
  let y = 20;
  const line = (label, content) => {
    doc.setFont('helvetica', 'bold');
    doc.text(`${label}:`, left, y);
    doc.setFont('helvetica', 'normal');
    doc.text(value(content), left + 42, y);
    y += 7;
  };

  doc.setFillColor(225, 17, 55);
  doc.rect(0, 0, 210, 12, 'F');
  doc.setTextColor(30, 30, 30);
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('CINEMAX PERÚ', left, y);
  y += 10;
  doc.setFontSize(13);
  doc.text(value(receipt.tipo_comprobante, 'COMPROBANTE').toUpperCase(), left, y);
  y += 8;
  doc.setFontSize(12);
  line('Número', receipt.numero_comprobante);
  line('Código CIN', receipt.codigo_seguimiento);
  line('Fecha de pago', receipt.fecha_pago ? new Date(receipt.fecha_pago).toLocaleString('es-PE') : new Date().toLocaleString('es-PE'));
  doc.line(left, y, 192, y);
  y += 8;
  line('Cliente', receipt.cliente_nombre || receipt.nombre_cliente);
  line('DNI', receipt.cliente_dni || receipt.doc_cliente);
  if (receipt.tipo_comprobante === 'factura') {
    line('RUC', receipt.ruc_cliente);
    line('Razón social', receipt.razon_social);
  }
  line('Película', receipt.pelicula);
  line('Sala', receipt.sala);
  line('Fecha función', receipt.fecha_funcion);
  line('Horario', receipt.funcion_horario);
  line('Asientos', Array.isArray(receipt.asientos) ? receipt.asientos.join(', ') : receipt.asientos_vendidos);
  line('Cantidad', receipt.cantidad);
  line('Forma de pago', receipt.forma_pago);
  if (receipt.forma_pago === 'yape') line('Celular Yape', receipt.yape_celular);
  if (receipt.forma_pago === 'tarjeta') {
    line('Tarjeta', receipt.tarjeta_ultimos4 ? `**** **** **** ${receipt.tarjeta_ultimos4}` : 'Tarjeta validada');
    line('Vencimiento', receipt.tarjeta_vencimiento);
  }
  y += 4;
  doc.line(left, y, 192, y);
  y += 10;
  doc.setFontSize(15);
  doc.setFont('helvetica', 'bold');
  doc.text(`TOTAL: S/ ${Number(receipt.total_venta || 0).toFixed(2)}`, left, y);
  y += 13;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('Comprobante generado por CineMax. Gracias por su compra.', left, y);
  doc.save(`${value(receipt.tipo_comprobante, 'comprobante')}-${value(receipt.numero_comprobante, receipt.codigo_seguimiento)}.pdf`);
}

export function printReceipt(receipt) {
  const popup = window.open('', '_blank');
  if (!popup) return;
  const esc = (item) => value(item).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[char]));
  popup.document.write(`<html><head><title>${esc(receipt.numero_comprobante)}</title><style>body{font-family:Arial;max-width:680px;margin:30px auto;color:#111}h1{color:#d9153d}p{margin:7px 0}.line{border-top:1px solid #999;margin:16px 0}@media print{button{display:none}}</style></head><body><h1>CINEMAX PERÚ</h1><h2>${esc(receipt.tipo_comprobante)} ${esc(receipt.numero_comprobante)}</h2><p><b>Código CIN:</b> ${esc(receipt.codigo_seguimiento)}</p><div class="line"></div><p><b>Cliente:</b> ${esc(receipt.cliente_nombre || receipt.nombre_cliente)}</p><p><b>DNI:</b> ${esc(receipt.cliente_dni || receipt.doc_cliente)}</p><p><b>Película:</b> ${esc(receipt.pelicula)}</p><p><b>Sala y horario:</b> ${esc(receipt.sala)} · ${esc(receipt.funcion_horario)}</p><p><b>Fecha:</b> ${esc(receipt.fecha_funcion)}</p><p><b>Asientos:</b> ${esc(Array.isArray(receipt.asientos) ? receipt.asientos.join(', ') : receipt.asientos_vendidos)}</p><p><b>Entradas:</b> ${esc(receipt.cantidad)}</p><p><b>Pago:</b> ${esc(receipt.forma_pago)}</p><p><b>Total:</b> S/ ${Number(receipt.total_venta || 0).toFixed(2)}</p><div class="line"></div><p>Gracias por su compra.</p><script>window.onload=()=>window.print()</script></body></html>`);
  popup.document.close();
}
