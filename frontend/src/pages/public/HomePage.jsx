import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { api } from '../../api.js';
import Loading from '../../components/Loading.jsx';
import MovieCard from './MovieCard.jsx';

export default function HomePage() {
  const [movies, setMovies] = useState([]);
  useEffect(() => { api('/movies').then((data) => setMovies(data.movies)).catch(() => {}); }, []);
  const coming = movies.filter((movie) => movie.estado === 'proximamente').slice(0, 4);
  return <>
    <main>
      <section className="hero">
        <svg className="hero-icono" viewBox="0 0 120 120" aria-hidden="true">
          <g>
            <rect x="15" y="40" width="80" height="55" rx="4" className="reel-hueco" />
            <rect x="15" y="18" width="80" height="18" rx="3" className="reel-aro claqueta-tapa" />
            <path d="M15 18 L35 36 M40 18 L60 36 M65 18 L85 36" className="reel-aro claqueta-tapa" />
          </g>
          <g className="palomitas">
            <circle cx="35" cy="105" r="4" />
            <circle cx="50" cy="110" r="4" />
            <circle cx="65" cy="103" r="4" />
          </g>
        </svg>
        <div className="contenedor hero-contenido">
          <p className="etiqueta-sala">Sala 4 · Estreno de la semana</p>
          <h1>Vive la película más grande en la pantalla más grande</h1>
          <p className="hero-texto">Compra tus entradas en minutos, elige tu asiento y disfruta el estreno en cualquiera de nuestras salas en Lima.</p>
          <div className="funciones"><Link className="boton boton-primario" to="/cartelera">Ver cartelera</Link><Link className="boton boton-registro" to="/como-funciona">Cómo funciona</Link></div>
        </div>
      </section>
      <section className="seccion" id="proximos-estrenos"><div className="contenedor"><h2>Próximos estrenos</h2><p className="subtitulo">Historias que pronto llegarán a nuestra pantalla.</p>{movies.length ? <div className="grid-peliculas">{coming.map((movie) => <MovieCard key={movie.id} movie={movie} action="soon" />)}</div> : <Loading />}</div></section>
      <section className="seccion seccion-alterna"><div className="contenedor"><div className="claqueta-tapa"><h2>Tu próxima historia comienza aquí</h2><p>Reserva con una cuenta CineMax y consulta tus compras cuando quieras.</p><Link className="boton boton-primario" to="/reservar">Reservar entrada</Link></div></div></section>
    </main>
  </>;
}
