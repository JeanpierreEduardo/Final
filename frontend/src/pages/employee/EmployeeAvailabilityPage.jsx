import { useEffect, useState } from 'react';
import { api, todayLima } from '../../api.js';
import Notice from '../../components/Notice.jsx';
import SeatMap from '../../components/SeatMap.jsx';

export default function EmployeeAvailabilityPage() {
  const [movies, setMovies] = useState([]); const [form, setForm] = useState({ pelicula: '', fecha: todayLima(), horario: 'tarde' }); const [data, setData] = useState(null); const [error, setError] = useState('');
  useEffect(() => { api('/movies').then((result) => { const active = result.movies.filter((m) => m.estado === 'cartelera'); setMovies(active); if (active[0]) setForm((old) => ({ ...old, pelicula: active[0].clave })); }).catch((e) => setError(e.message)); }, []);
  const change = (e) => setForm({ ...form, [e.target.name]: e.target.value });
  async function submit(e) { e.preventDefault(); setError(''); try { setData(await api(`/employee/availability?pelicula=${encodeURIComponent(form.pelicula)}&fecha=${form.fecha}&horario=${form.horario}`)); } catch (err) { setError(err.message); } }
  return <main className="admin-main page-section"><div className="contenedor"><p className="eyebrow">Taquilla</p><h1>Cartelera y asientos</h1><form className="admin-card admin-form form-grid" onSubmit={submit}><label className="campo">Película<select name="pelicula" value={form.pelicula} onChange={change}>{movies.map((movie) => <option key={movie.id} value={movie.clave}>{movie.titulo}</option>)}</select></label><label className="campo">Fecha<input type="date" name="fecha" value={form.fecha} onChange={change} /></label><label className="campo">Horario<select name="horario" value={form.horario} onChange={change}><option value="tarde">Tarde</option><option value="noche">Noche</option></select></label><button className="boton boton-primario">Consultar</button></form><Notice error>{error}</Notice>{data && <section className="admin-card seat-panel"><h2>{data.movie.titulo} · {data.movie.sala}</h2><p>{data.fecha} · {data.horario} · {data.occupied.length} ocupados</p><SeatMap occupied={data.occupied} /></section>}</div></main>;
}
