import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { api, dateText, money } from '../../api.js';
import Loading from '../../components/Loading.jsx';
import Notice from '../../components/Notice.jsx';

export default function PurchasesPage() {
  const [rows, setRows] = useState([]); const [loading, setLoading] = useState(true); const [error, setError] = useState('');
  useEffect(() => { api('/purchases').then((data) => setRows(data.purchases)).catch((e) => setError(e.message)).finally(() => setLoading(false)); }, []);
  return <main className="seccion page-section"><div className="contenedor"><p className="eyebrow">Tu cuenta</p><h1>Mis compras</h1><Notice error>{error}</Notice>{loading ? <Loading /> : !rows.length ? <p className="mensaje">Aún no tienes compras. <Link to="/reservar">Reserva tu primera entrada.</Link></p> : <div className="lista-reservas">{rows.map((row) => <article className="reserva-item" key={row.id}><div><h3>{row.pelicula}</h3><p>Código: <strong>{row.codigo_seguimiento}</strong></p><p>{row.sala} · {row.funcion_horario} · {row.cantidad} entrada(s)</p><p>{row.comentario || 'Sin comentario'} · {dateText(row.fecha_registro)}</p><p>Estado: <span className="estado-badge">{row.estado}</span> · {money(row.total_venta)}</p></div>{row.estado === 'registrado' && <Link className="boton boton-primario" to={`/usuario/compras/${row.id}/editar`}>Actualizar compra</Link>}</article>)}</div>}</div></main>;
}
