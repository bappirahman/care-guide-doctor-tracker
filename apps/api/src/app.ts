import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import mongoose from 'mongoose';
import { pinoHttp } from 'pino-http';
import { env } from './config/env.js';
import { logger } from './lib/logger.js';
import { errorHandler, notFoundHandler } from './middleware/error-handler.js';
import { requireAuth, requireRole } from './modules/auth/middleware.js';
import { authRouter } from './modules/auth/routes.js';
import { doctorRouter } from './modules/doctors/routes.js';
import { patientRouter } from './modules/patients/routes.js';
import { statsRouter } from './modules/stats/routes.js';

export function createApp() {
  const app = express();

  // Browsers reach the API through the Next.js rewrite, one proxy hop away. Trusting
  // that hop gives rate limiting and logs the real client IP from X-Forwarded-For.
  app.set('trust proxy', 1);

  app.use(
    pinoHttp({
      logger,
      autoLogging: { ignore: (req) => req.url === '/health' },
      serializers: {
        req: (req: { id: unknown; method: string; url: string }) => ({
          id: req.id,
          method: req.method,
          url: req.url,
        }),
        res: (res: { statusCode: number }) => ({ statusCode: res.statusCode }),
      },
    }),
  );
  app.use(helmet());
  app.use(cors({ origin: env.WEB_ORIGIN, credentials: true }));
  app.use(express.json({ limit: '100kb' }));
  app.use(cookieParser());

  app.get('/health', async (_req, res) => {
    const db = mongoose.connection.db;
    if (!db) {
      res.status(503).json({ status: 'unavailable' });
      return;
    }
    await db.command({ ping: 1 });
    res.json({ status: 'ok' });
  });

  const api = express.Router();
  api.use('/auth', authRouter);
  // Everything past this line needs a valid session, unknown paths included: an
  // anonymous caller gets 401 rather than learning which routes exist.
  api.use(requireAuth, requireRole('admin'));
  api.use('/doctors', doctorRouter);
  api.use('/patients', patientRouter);
  api.use('/stats', statsRouter);
  app.use('/api/v1', api);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
