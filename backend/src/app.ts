import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth.js';
import ticketRoutes from './routes/tickets.js';
import dashboardRoutes from './routes/dashboard.js';
import { HttpError } from './services/errors.js';

export function createApp() {
  const app = express();
  app.use(cors());
  app.use(express.json({ limit: '1mb' }));
  app.get('/health', (_req, res) => res.json({ ok: true, ai: process.env.AI_PROVIDER || 'rule' }));
  app.use('/api/auth', authRoutes);
  app.use('/api/tickets', ticketRoutes);
  app.use('/api/dashboard', dashboardRoutes);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  app.use(
    (err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
      if (err instanceof HttpError) {
        return res.status(err.status).json({ error: err.message });
      }
      console.error(err);
      res.status(500).json({ error: 'Internal error' });
    },
  );
  return app;
}
