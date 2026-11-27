import { useEffect, useState } from 'react';
import { api } from '../../api.js';
import { useAuth } from '../../contexts/AuthContext.jsx';
import Notice from '../../components/Notice.jsx';

export default function EmployeeProfilePage() {
  const { user, refresh } = useAuth(); const [form, setForm] = useState({ correo: '', contrasena_actual: '', contrasena_nueva: '', confirmar: '' }); const [error, setError] = useState(''); const [message, setMessage] = useState('');
  useEffect(() => { if (user) setForm((old) => ({ ...old, correo: user.correo })); }, [user]);
  const change = (e) => setForm({ ...form, [e.target.name]: e.target.value });
  async function submit(e) { e.preventDefault(); setError(''); setMessage(''); if (form.contrasena_nueva !== form.confirmar) return setError('La confirmación no coincide.'); try { await api('/employee/profile', { method: 'PUT', body: JSON.stringify(form) }); await refresh(); setForm((old) => ({ ...old, contrasena_actual: '', contrasena_nueva: '', confirmar: '' })); setMessage('Tu perfil fue actualizado.'); } catch (err) { setError(err.message); } }
  return <main className="admin-main page-section"><div className="contenedor narrow"><p className="eyebrow">Mi cuenta</p><h1>Mi perfil</h1><div className="turno-aviso"><strong>Turno laboral</strong><span>{user?.turno_nombre} · {String(user?.turno_inicio || '').slice(0, 5)} – {String(user?.turno_fin || '').slice(0, 5)} · Hora de Perú</span></div><Notice error>{error}</Notice><Notice>{message}</Notice><form className="admin-card admin-form" onSubmit={submit}><label className="campo">Correo<input type="email" name="correo" value={form.correo} onChange={change} required /></label><label className="campo">Contraseña actual<input type="password" name="contrasena_actual" value={form.contrasena_actual} onChange={change} required /></label><label className="campo">Nueva contraseña<input type="password" name="contrasena_nueva" value={form.contrasena_nueva} onChange={change} minLength="8" /></label><label className="campo">Confirmar nueva contraseña<input type="password" name="confirmar" value={form.confirmar} onChange={change} minLength="8" /></label><button className="boton boton-primario">Guardar perfil</button></form></div></main>;
}
