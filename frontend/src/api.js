const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

export async function api(path, options = {}) {
  let response;
  const jwt = sessionStorage.getItem('cinemax_jwt');
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  if (jwt) headers.Authorization = `Bearer ${jwt}`;
  try {
    response = await fetch(`${API_URL}${path}`, {
      headers,
      ...options
    });
  } catch (cause) {
    const error = new Error(`No se pudo conectar con CineMax API (${API_URL}). Verifica que el backend esté ejecutándose.`);
    error.cause = cause;
    throw error;
  }
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.error || 'No se pudo completar la operación.');
    error.code = data.code;
    error.status = response.status;
    throw error;
  }
  return data;
}

export const imagePath = (poster = 'im2.jpg') => {
  if (/^https?:\/\//i.test(poster)) return poster;
  return `/assets/cinemax/${poster.replace(/^img\//, '')}`;
};

export const money = (value) => `S/ ${Number(value || 0).toFixed(2)}`;
export const dateText = (value) => value ? new Date(value).toLocaleString('es-PE') : 'Sin fecha';
export const todayLima = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Lima', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
