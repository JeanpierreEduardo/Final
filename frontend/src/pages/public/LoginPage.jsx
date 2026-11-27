import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext.jsx';
import Notice from '../../components/Notice.jsx';

function destination(user, next) {
  if (user.rol === 'administrador') return '/admin';
  if (user.rol === 'empleado') return '/empleado/ventas';
  return next && next.startsWith('/') && !next.startsWith('//') ? next : '/';
}

export default function LoginPage() {
  const { user, login, register } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const [registerMode, setRegisterMode] = useState(params.get('modo') === 'registro');
  const [form, setForm] = useState({ nombre: '', dni: '', correo: '', contrasena: '', confirmar: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => { if (user) navigate(destination(user, params.get('next')), { replace: true }); }, [user]);
  const change = (event) => setForm((old) => ({ ...old, [event.target.name]: event.target.value }));
  async function submit(event) {
    event.preventDefault(); setError('');
    if (registerMode && form.contrasena !== form.confirmar) return setError('Las contraseñas no coinciden.');
    setBusy(true);
    try {
      const logged = registerMode ? await register(form.nombre, form.dni, form.correo, form.contrasena) : await login(form.correo, form.contrasena);
      navigate(destination(logged, params.get('next')), { replace: true });
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  }
  return <main className="auth-fondo"><div className="auth-main"><Link className="logo" to="/">Cine<span>Max</span> Perú</Link><section className="auth-tarjeta"><div className="auth-tabs"><button type="button" className={`auth-tab ${!registerMode ? 'activo' : ''}`} onClick={() => { setRegisterMode(false); setError(''); }}>Iniciar sesión</button><button type="button" className={`auth-tab ${registerMode ? 'activo' : ''}`} onClick={() => { setRegisterMode(true); setError(''); }}>Crear cuenta</button></div><p className="subtitulo-auth">{registerMode ? 'Crea tu cuenta CineMax' : 'Ingresa para continuar con tu reserva'}</p><form className="formulario-auth" onSubmit={submit}>{registerMode && <><label className="campo">Nombre completo<input name="nombre" value={form.nombre} onChange={change} minLength="3" maxLength="120" required /></label><label className="campo">DNI<input name="dni" inputMode="numeric" pattern="[0-9]{8}" maxLength="8" value={form.dni} onChange={change} required /></label></>}<label className="campo">Correo electrónico<input type="email" name="correo" value={form.correo} onChange={change} required /></label><label className="campo">Contraseña<input type="password" name="contrasena" value={form.contrasena} onChange={change} minLength="8" required /></label>{registerMode && <label className="campo">Confirmar contraseña<input type="password" name="confirmar" value={form.confirmar} onChange={change} minLength="8" required /></label>}<Notice error>{error}</Notice><button className="boton boton-primario boton-ancho" disabled={busy}>{busy ? 'Procesando…' : registerMode ? 'Crear cuenta' : 'Iniciar sesión'}</button></form></section></div></main>;
}
