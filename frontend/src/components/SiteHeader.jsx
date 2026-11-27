import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.jsx';

const publicLinks = [['Inicio', '/'], ['Cartelera', '/cartelera'], ['Cómo funciona', '/como-funciona'], ['Reservar', '/reservar'], ['Ubicación', '/ubicacion']];

export default function SiteHeader({ area = 'public' }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const links = area === 'admin'
    ? [['Inicio', '/admin'], ['Clientes', '/admin/clientes'], ['Películas', '/admin/peliculas'], ['Trabajadores', '/admin/trabajadores'], ['Compras', '/admin/compras'], ['Preorden CIN', '/empleado/ventas'], ['Caja', '/empleado/caja'], ['Validar entradas', '/empleado/validar'], ['Clave SOL', '/sunat/clave-sol']]
    : area === 'employee'
      ? [['Preorden CIN', '/empleado/ventas'], ['Caja', '/empleado/caja'], ['Validar entradas', '/empleado/validar'], ['Cartelera y asientos', '/empleado/cartelera'], ['Mis ventas', '/empleado/mis-ventas'], ['Mi perfil', '/empleado/perfil']]
      : area === 'sunat'
        ? [['Clave SOL', '/sunat/clave-sol'], ['Comprobantes', '/sunat/comprobantes'], ['Fiscalización', '/sunat/fiscalizacion']]
      : publicLinks;
  return <header className={`site-header ${area !== 'public' ? 'nav-administrativa' : ''}`}>
    <div className="contenedor barra">
      <Link className="logo" to={area === 'admin' ? '/admin' : area === 'employee' ? '/empleado/ventas' : area === 'sunat' ? '/sunat/clave-sol' : '/'}>Cine<span>Max</span> {area !== 'public' && <small>{area === 'admin' ? 'Administración' : area === 'employee' ? 'Taquilla' : 'SUNAT'}</small>}</Link>
      <nav className="nav-principal"><ul>{links.map(([label, to]) => <li key={to}><NavLink to={to} className={({ isActive }) => isActive ? 'activo' : ''}>{label}</NavLink></li>)}</ul></nav>
      <div className="nav-cuenta">
        {user ? <><div className="nav-identidad"><span>{user.nombre}</span>{user.rol !== 'usuario' && <small className="nav-rol">{user.rol === 'administrador' ? 'Administrador' : 'Trabajador'}</small>}</div>{area === 'public' && user.rol === 'administrador' && <Link className="boton boton-registro boton-nav" to="/sunat/clave-sol">Clave SOL</Link>}{user.rol === 'usuario' && <Link className="boton boton-registro boton-nav" to="/usuario/compras">Mis compras</Link>}<button className="boton boton-primario boton-nav" onClick={async () => { await logout(); navigate('/'); }}>Cerrar sesión</button></> : <><Link className="boton boton-primario boton-nav" to="/login">Iniciar sesión</Link><Link className="boton boton-registro boton-nav" to="/login?modo=registro">Crear cuenta</Link></>}
      </div>
    </div>
  </header>;
}
