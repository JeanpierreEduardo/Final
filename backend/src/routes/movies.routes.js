import { Router } from 'express';
import { query } from '../config/db.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { authRequired, requireRole } from '../middleware/auth.js';
import { env } from '../config/env.js';

const router = Router();

router.get('/', asyncHandler(async (req, res) => {
  const result = await query(`SELECT * FROM peliculas WHERE estado <> 'inactiva' ORDER BY estado='cartelera' DESC,titulo`);
  res.json({ movies: result.rows.map(withPosterUrl) });
}));

router.get('/all', authRequired, requireRole('administrador'), asyncHandler(async (req, res) => {
  const result = await query('SELECT * FROM peliculas ORDER BY fecha_registro DESC,id DESC');
  res.json({ movies: result.rows.map(withPosterUrl) });
}));

router.get('/:id', asyncHandler(async (req, res) => {
  const id = Number(req.params.id);

  if (!Number.isInteger(id)) {
    return res.status(404).json({
      error: 'Película no encontrada.'
    });
  }

  const result = await query(
    'SELECT * FROM peliculas WHERE id = $1 LIMIT 1',
    [id]
  );

  if (!result.rows[0]) {
    return res.status(404).json({
      error: 'Película no encontrada.'
    });
  }

  res.json({
    movie: withPosterUrl(result.rows[0])
  });
}));

router.use(authRequired, requireRole('administrador'));

router.post('/', asyncHandler(async (req, res) => {
  const movie = validateMovie(req.body || {});
  const result = await query(
    `INSERT INTO peliculas(clave,titulo,genero,duracion,clasificacion,sala,sinopsis,poster,estado)
     VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
    [movie.clave, movie.titulo, movie.genero, movie.duracion, movie.clasificacion, movie.sala, movie.sinopsis, movie.poster, movie.estado]
  );
  res.status(201).json({ movie: result.rows[0] });
}));

router.put('/:id', asyncHandler(async (req, res) => {
  const movie = validateMovie(req.body || {});
  const result = await query(
    `UPDATE peliculas SET clave=$1,titulo=$2,genero=$3,duracion=$4,clasificacion=$5,
       sala=$6,sinopsis=$7,poster=$8,estado=$9 WHERE id=$10 RETURNING *`,
    [movie.clave, movie.titulo, movie.genero, movie.duracion, movie.clasificacion, movie.sala, movie.sinopsis, movie.poster, movie.estado, Number(req.params.id)]
  );
  if (!result.rows[0]) return res.status(404).json({ error: 'Película no encontrada.' });
  res.json({ movie: result.rows[0] });
}));

function validateMovie(data) {
  const movie = {
    clave: String(data.clave || '').trim().toLowerCase(),
    titulo: String(data.titulo || '').trim(),
    genero: String(data.genero || '').trim(),
    duracion: Number(data.duracion),
    clasificacion: String(data.clasificacion || 'Todo público').trim(),
    sala: String(data.sala || 'Sala 1').trim(),
    sinopsis: String(data.sinopsis || '').trim(),
    poster: String(data.poster || 'im2.jpg').trim(),
    estado: String(data.estado || 'cartelera')
  };
  if (!/^[a-z0-9][a-z0-9-]{1,79}$/.test(movie.clave) || movie.titulo.length < 2 || movie.genero.length < 1 || !Number.isInteger(movie.duracion) || movie.duracion < 1 || movie.duracion > 600 || !['cartelera', 'proximamente', 'inactiva'].includes(movie.estado)) {
    const error = new Error('Revisa código, título, género, duración, sala y estado de la película.');
    error.status = 400;
    throw error;
  }
  return movie;
}

function withPosterUrl(movie) {
  const poster = String(movie.poster || '');
  if (/^https?:\/\//i.test(poster) || !env.storagePublicBaseUrl || !env.storageBucket) return movie;
  return { ...movie, poster: `${env.storagePublicBaseUrl}/${env.storageBucket}/${poster.replace(/^\/+/, '')}` };
}

export default router;
