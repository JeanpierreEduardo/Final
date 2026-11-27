import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { api, money } from '../../api.js';
import Loading from '../../components/Loading.jsx';
import Notice from '../../components/Notice.jsx';

export default function AdminDashboard() {
  const [data, setData] = useState(null); const [error, setError] = useState('');
  useEffect(() => { api('/admin/dashboard').then(setData).catch((e) => setError(e.message)); }, []);
  if (error) return <main className="admin-main"><Notice error>{error}</Notice></main>;
  if (!data) return <main className="admin-main"><Loading /></main>;
  const metrics = [['Películas', data.movies.total], ['En cartelera', data.movies.cartelera], ['Clientes activos', data.clients.activos], ['Trabajadores activos', data.workers.activos], ['Compras', data.purchases.compras], ['Ingresos', money(data.purchases.ingresos)]];
  return <main className="admin-main page-section"><div className="contenedor"><p className="eyebrow">Panel de control</p><h1>Administración CineMax</h1><p className="subtitulo">Gestiona películas, cuentas, turnos y compras desde un solo lugar.</p><div className="metricas">{metrics.map(([label, value]) => <div className="metrica" key={label}><strong>{value}</strong><span>{label}</span></div>)}</div><div className="admin-grid-links"><Link className="admin-card" to="/admin/peliculas"><h2>Películas</h2><p>Crear, actualizar y cambiar el estado de la cartelera.</p></Link><Link className="admin-card" to="/admin/clientes"><h2>Clientes</h2><p>Consultar, editar, activar o desactivar cuentas.</p></Link><Link className="admin-card" to="/admin/trabajadores"><h2>Trabajadores</h2><p>Crear personal y asignar turnos laborales.</p></Link><Link className="admin-card" to="/admin/compras"><h2>Compras</h2><p>Revisar las reservas y ventas registradas.</p></Link></div></div></main>;
}
