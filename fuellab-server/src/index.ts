import express, { Request, Response, NextFunction } from 'express';
import fs from 'fs';
import path from 'path';
import { describeDatabaseError, openDatabase, toPublicUser } from './db';
import { authMiddleware, getJwtSecret } from './auth';
import authRoutes from './routes/auth';
import recipesRoutes from './routes/recipes';
import planRoutes from './routes/plan';
import shoppingRoutes from './routes/shopping';
import logRoutes from './routes/log';
import settingsRoutes from './routes/settings';

/**
 * What the server can see of its database settings, for fixing a deploy: which related
 * variable NAMES exist and whether each is empty, plus which deployment is answering.
 * Never includes a value.
 */
function databaseDiagnostics() {
  const related = Object.keys(process.env)
    .filter((k) => /turso|libsql|database/i.test(k))
    .sort()
    .map((k) => `${k}${(process.env[k] ?? '').trim() ? '' : ' (empty)'}`);
  return {
    variablesSeen: related,
    vercelEnvironment: process.env.VERCEL_ENV ?? null,
    commit: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? null,
    deploymentHost: process.env.VERCEL_URL ?? null,
  };
}

export function buildApp(): express.Express {
  const app = express();

  // Connect, create the schema and seed before any API request. On Vercel this runs once per
  // function instance; locally it has already finished by the time start() listens.
  // If the database can't be reached, say so plainly (the web app shows this message) instead
  // of a bare "Internal server error"; the full error goes to the server log.
  app.use('/api', async (_req: Request, res: Response, next: NextFunction) => {
    try {
      await openDatabase();
    } catch (err) {
      console.error('Database connection failed:', err);
      res.status(503).json({ error: describeDatabaseError(err), diagnostics: databaseDiagnostics() });
      return;
    }
    next();
  });

  app.use(express.json({ limit: '1mb' }));

  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({ ok: true });
  });

  // Public auth endpoints.
  app.use('/api/auth', authRoutes);

  // Everything else under /api requires a valid JWT.
  app.use('/api', authMiddleware);

  app.get('/api/me', (req: Request, res: Response) => {
    res.json({ user: toPublicUser(req.currentUser) });
  });

  app.use('/api/recipes', recipesRoutes);
  app.use('/api/plan', planRoutes);
  app.use('/api/shopping', shoppingRoutes);
  app.use('/api/log', logRoutes);
  app.use('/api/settings', settingsRoutes);

  // 404 for unknown API routes.
  app.use('/api', (_req: Request, res: Response) => {
    res.status(404).json({ error: 'Not found' });
  });

  // Serve the web app when it has been built into ../fuellab-web/dist.
  const webDir = [
    path.resolve(__dirname, '../../fuellab-web/dist'),
    path.resolve(process.cwd(), '../fuellab-web/dist'),
  ].find((dir) => fs.existsSync(path.join(dir, 'index.html')));
  if (webDir) {
    app.use(express.static(webDir));
    app.get('/{*splat}', (_req: Request, res: Response) => {
      res.sendFile(path.join(webDir, 'index.html'));
    });
  }

  // Error handler.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    console.error('Unhandled error:', err);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  return app;
}

export async function start(): Promise<void> {
  await openDatabase();
  const port = Number(process.env.PORT) || 4000;
  const app = buildApp();
  app.listen(port, () => {
    console.log(`FuelLab API listening on port ${port}`);
  });
}

if (require.main === module) {
  start().catch((err) => {
    console.error('Failed to start:', err);
    process.exit(1);
  });
}
