export function errorHandler(error, req, res, next) {
  console.error(error);
  if (res.headersSent) return next(error);
  if (error.code === '23505') {
    return res.status(409).json({ error: error.constraint?.includes('asiento')
      ? 'Uno de los asientos acaba de ocuparse. Actualiza el mapa.'
      : 'Ese correo, código o película ya está registrado.' });
  }
  if (error.code === '23503') return res.status(409).json({ error: 'El registro relacionado no existe.' });
  res.status(error.status || 500).json({ error: error.message || 'Error interno del servidor.' });
}
