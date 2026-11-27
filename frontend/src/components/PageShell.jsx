import SiteHeader from './SiteHeader.jsx';

export default function PageShell({ children, area = 'public' }) {
  return <><SiteHeader area={area} />{children}<footer className="site-footer"><div className="contenedor"><span>CineMax Perú</span><small>Reservas y gestión de entradas en línea</small></div></footer></>;
}
