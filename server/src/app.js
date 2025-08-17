import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import pino from 'pino';
import pinoHttp from 'pino-http';
import { v4 as uuidv4 } from 'uuid';
import { sequelize } from './db.js';
import authRoutes from './routes/auth.js';
import meRoutes from './routes/me.js';
import supportRoutes from './routes/support.js';
import adminRoutes from './routes/admin.js';
import baseRoutes from './routes/base.js';
import soloRoutes from './routes/solo.js';
import adminAuthRoutes from './routes/admin.auth.js';
import adminTenantsRoutes from './routes/admin.tenants.js';
import tenantAuthRoutes from './routes/tenant.auth.js';
import { requireMaster } from './middlewares/requireMaster.js';
import { attachTenant } from './middlewares/attachTenant.js';
const app = express();

const logger = pino({ level: process.env.NODE_ENV === 'development' ? 'debug' : 'info' });

app.use((req, _res, next) => { (req).id = uuidv4(); next(); });
app.use(pinoHttp({ logger, genReqId: (req) => (req).id }));
app.use(helmet());
app.use(cors({ origin: (process.env.ALLOWED_ORIGINS || '').split(',').map(s=>s.trim()).filter(Boolean), credentials: true }));
app.use(express.json());
app.use('/api', rateLimit({ windowMs: 60_000, max: 300 }));

app.get('/health', (_req, res) => res.json({ ok: true }));

app.get('/api/health', async (_req, res) => {
  try {
    await sequelize.authenticate();
    res.json({ ok: true, db: 'connected' });
  } catch (err) {
    res.status(500).json({ ok: false, db: 'disconnected', error: err.message });
  }
});

// Master admin routes
app.use('/api/admin/auth', adminAuthRoutes);
app.use('/api/admin', requireMaster, adminTenantsRoutes);

// Tenant routes
app.use('/api/t/:slug', attachTenant, tenantAuthRoutes);

// Legacy routes (for backward compatibility)
app.use('/api/auth', authRoutes);
app.use('/api', meRoutes);
app.use('/api/suporte', supportRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/base', baseRoutes);
app.use('/api/solo', soloRoutes);
app.use((err, req, res, _next) => {
  req.log?.error({ err }, 'Unhandled error');
  res.status(500).json({ error: { code: 'internal_error', message: 'Erro interno' } });
});

await sequelize.authenticate();

export default app;
