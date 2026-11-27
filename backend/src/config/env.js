import 'dotenv/config';

export const env = {
  port: Number(process.env.PORT || 3000),
  databaseUrl: process.env.DATABASE_URL || '',
  frontendOrigin: process.env.FRONTEND_ORIGIN || 'http://localhost:5173',
  nodeEnv: process.env.NODE_ENV || 'development',
  sessionHours: Number(process.env.SESSION_HOURS || 8),
  jwtSecret: process.env.JWT_SECRET || 'dev-only-change-this-secret',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '8h',
  storagePublicBaseUrl: String(process.env.NEON_STORAGE_PUBLIC_BASE_URL || '').replace(/\/$/, ''),
  storageBucket: process.env.NEON_STORAGE_BUCKET || ''
};
