import { useEffect, useState } from 'react';
import { api } from '../../api.js';
import Loading from '../../components/Loading.jsx';
import MovieCard from './MovieCard.jsx';

export default function CatalogPage() {
  const [movies, setMovies] = useState([]); const [error, setError] = useState('');
  useEffect(() => { api('/movies').then((data) => setMovies(data.movies.filter((movie) => movie.estado === 'cartelera'))).catch((e) => setError(e.message)); }, []);
  return <main className="seccion page-section"><div className="contenedor"><p className="eyebrow">CineMax Perú</p><h1>Cartelera</h1><p className="subtitulo">Marca tus favoritas, elige el formato y reserva tu función.</p>{error && <p className="mensaje-error">{error}</p>}{!movies.length && !error ? <Loading /> : <div className="grid-peliculas">{movies.map((movie) => <MovieCard key={movie.id} movie={movie} />)}</div>}</div></main>;
}
