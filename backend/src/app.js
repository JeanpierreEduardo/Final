import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { env } from './config/env.js';
import authRoutes from './routes/auth.routes.js';
import moviesRoutes from './routes/movies.routes.js';
import purchasesRoutes from './routes/purchases.routes.js';
import adminRoutes from './routes/admin.routes.js';
import employeeRoutes from './routes/employee.routes.js';
import sunatRoutes from './routes/sunat.routes.js';
import { errorHandler } from './middleware/error.js';

const app = express();
app.use(helmet({ crossOriginResourcePolicy: false }));
const allowedOrigins = new Set([
  ...String(env.frontendOrigin || '').split(',').map((origin) => origin.trim()).filter(Boolean),
  'http://localhost:5173',
  'http://127.0.0.1:5173'
]);
app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.has(origin)) return callback(null, true);
    return callback(new Error(`Origen no permitido: ${origin}`));
  },
  credentials: true
}));
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());

app.get('/api/health', (req, res) => res.json({ ok: true, service: 'CineMax API' }));
app.use('/api/auth', authRoutes);
app.use('/api/movies', moviesRoutes);
app.use('/api/purchases', purchasesRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/employee', employeeRoutes);
app.use('/api/sunat', sunatRoutes);
app.use((req, res) => res.status(404).json({ error: 'Ruta no encontrada.' }));
app.use(errorHandler);

export default app;
