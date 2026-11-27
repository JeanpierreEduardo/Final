import pg from 'pg';
import { env } from './env.js';

const { Pool } = pg;

if (!env.databaseUrl) {
  console.warn('Aviso: falta DATABASE_URL en backend/.env');
}

export const pool = new Pool({
  connectionString: env.databaseUrl,
  ssl: env.databaseUrl.includes('neon.tech') ? { rejectUnauthorized: false } : undefined,
  max: 10
});

export function query(text, values) {
  return pool.query(text, values);
}
