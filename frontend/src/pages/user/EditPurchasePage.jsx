import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../../api.js';
import Loading from '../../components/Loading.jsx';
import Notice from '../../components/Notice.jsx';

export default function EditPurchasePage() {
  const { id } = useParams(); const navigate = useNavigate(); const [movies, setMovies] = useState([]); const [form, setForm] = useState(null); const [error, setError] = useState(''); const [busy, setBusy] = useState(false);
  useEffect(() => { Promise.all([api('/movies'), api(`/purchases/${id}`)]).then(([movieData, purchaseData]) => { setMovies(movieData.movies); const row = purchaseData.purchase; setForm({ pelicula: row.pelicula_clave || '', horario: row.funcion_horario, cantidad: row.cantidad, comentario: row.comentario || '' }); }).catch((e) => setError(e.message)); }, [id]);
  if (!form) return <main className="seccion page-section"><div className="contenedor narrow">{error ? <Notice error>{error}</Notice> : <Loading />}</div></main>;
  const change = (e) => setForm({ ...form, [e.target.name]: e.target.value });
  async function submit(e) { e.preventDefault(); setBusy(true); setError(''); try { await api(`/purchases/${id}`, { method: 'PUT', body: JSON.stringify({ ...form, cantidad: Number(form.cantidad) }) }); navigate('/usuario/compras'); } catch (err) { setError(err.message); } finally { setBusy(false); } }
  return <main className="seccion page-section"><div className="contenedor narrow"><p className="eyebrow">Compra editable</p><h1>Actualizar compra</h1><form className="formulario-reserva card-form" onSubmit={submit}><label className="campo">Película<select name="pelicula" value={form.pelicula} onChange={change}>{movies.filter((m) => m.estado === 'cartelera' || m.clave === form.pelicula).map((m) => <option key={m.id} value={m.clave}>{m.titulo}</option>)}</select></label><label className="campo">Horario<select name="horario" value={form.horario} onChange={change}><option value="tarde">Tarde</option><option value="noche">Noche</option></select></label><label className="campo">Cantidad<input type="number" name="cantidad" min="1" max="8" value={form.cantidad} onChange={change} /></label><label className="campo campo-ancho">Comentario<textarea name="comentario" value={form.comentario} onChange={change} maxLength="500" /></label><Notice error>{error}</Notice><button className="boton boton-primario" disabled={busy}>{busy ? 'Guardando…' : 'Guardar cambios'}</button><Link className="boton boton-registro" to="/usuario/compras">Volver</Link></form></div></main>;
}
