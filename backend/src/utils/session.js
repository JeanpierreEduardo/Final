import crypto from 'node:crypto';
import { query } from '../config/db.js';
import { env } from '../config/env.js';

export function createRawToken() {
  return crypto.randomBytes(32).toString('hex');
}

export function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export async function createSession(userId) {
  const rawToken = createRawToken();
  const tokenHash = hashToken(rawToken);
  await query(
    `INSERT INTO sesiones_cinemax(token_hash,id_usuario,expira)
     VALUES($1,$2,NOW()+($3 * INTERVAL '1 hour'))`,
    [tokenHash, userId, env.sessionHours]
  );
  return rawToken;
}

export async function destroySession(rawToken) {
  if (!rawToken) return;
  await query('DELETE FROM sesiones_cinemax WHERE token_hash=$1', [hashToken(rawToken)]);
}

export function cookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: env.nodeEnv === 'production',
    maxAge: env.sessionHours * 60 * 60 * 1000,
    path: '/'
  };
}
