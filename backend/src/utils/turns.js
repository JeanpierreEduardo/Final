export const OUT_OF_SHIFT = 'Estás fuera de turno laboral.';
export const NO_SHIFT = 'No tienes un turno laboral asignado. Comunícate con el administrador.';

export function isInShift(user) {
  if (user?.rol !== 'empleado') return true;
  if (!user.turno_nombre || !user.turno_inicio || !user.turno_fin) return false;
  const now = new Date();
  const lima = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'America/Lima', hour: '2-digit', minute: '2-digit', hour12: false
  }).format(now);
  const current = lima === '24:00' ? '00:00' : lima;
  const start = String(user.turno_inicio).slice(0, 5);
  const end = String(user.turno_fin).slice(0, 5);
  if (start < end) return current >= start && current < end;
  if (start > end) return current >= start || current < end;
  return false;
}

export function validateShift(data, role) {
  if (role !== 'empleado') return { turno_nombre: null, turno_inicio: null, turno_fin: null };
  const name = String(data.turno_nombre || '').trim();
  const start = String(data.turno_inicio || '');
  const end = String(data.turno_fin || '');
  const validTime = /^([01]\d|2[0-3]):[0-5]\d$/;
  if (!name || name.length > 60 || !validTime.test(start) || !validTime.test(end) || start === end) {
    const error = new Error('Asigna un nombre de turno y horas de inicio y fin diferentes.');
    error.status = 400;
    throw error;
  }
  return { turno_nombre: name, turno_inicio: start, turno_fin: end };
}
