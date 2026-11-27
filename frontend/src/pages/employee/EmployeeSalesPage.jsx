import { useEffect, useState } from 'react';
import { api, dateText, money } from '../../api.js';
import Loading from '../../components/Loading.jsx';
import Notice from '../../components/Notice.jsx';

export default function EmployeeSalesPage() {
  const [rows, setRows] = useState([]); const [error, setError] = useState('');
  useEffect(() => { api('/employee/sales').then((data) => setRows(data.sales)).catch((e) => setError(e.message)); }, []);
  return <main className="admin-main page-section"><div className="contenedor"><p className="eyebrow">Taquilla</p><h1>Mis ventas</h1><Notice error>{error}</Notice>{!rows.length && !error ? <Loading /> : <div className="table-wrap"><table className="data-table"><thead><tr><th>Código</th><th>Cliente</th><th>Película</th><th>Asientos</th><th>Estado</th><th>Total</th></tr></thead><tbody>{rows.map((row) => <tr key={row.id}><td>{row.codigo_seguimiento}<small>{dateText(row.fecha_registro)}</small></td><td>{row.nombre_cliente}</td><td>{row.pelicula}<small>{row.sala} · {row.funcion_horario}</small></td><td>{(row.asientos || []).join(', ')}</td><td>{row.estado}</td><td>{money(row.total_venta)}</td></tr>)}</tbody></table></div>}</div></main>;
}
