import { Link } from 'react-router-dom';
import { imagePath } from '../../api.js';

export default function MovieCard({ movie, action = 'cartelera' }) {
  return <article className="tarjeta-pelicula visible">
    <div className="poster"><img className="poster-foto" src={imagePath(movie.poster)} alt={`Póster de ${movie.titulo}`} /><div className="poster-overlay"><span>{movie.clasificacion}</span></div></div>
    <div className="info-pelicula"><h3>{movie.titulo}</h3><p>{movie.genero} · {movie.duracion} min</p><span className="etiqueta-sala">{movie.sala}</span>{action === 'cartelera' && movie.estado === 'cartelera' && <Link className="boton boton-secundario" to={`/reservar?pelicula=${encodeURIComponent(movie.clave)}`}>Elegir horario</Link>}{action === 'soon' && <span className="boton boton-secundario">Próximamente</span>}</div>
  </article>;
}
