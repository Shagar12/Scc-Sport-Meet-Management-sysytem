import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { requireAuth } from './src/middleware/auth.ts';
import type { AuthRequest } from './src/middleware/auth.ts';
import { getOrCreateUser } from './src/db/users.ts';
import {
  applySyncOperationsToSql,
  getMeetSnapshotFromSql,
} from './src/db/sportsRepo.ts';
import type { SyncOperation } from './src/utils/syncQueue.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = Number(process.env.PORT) || 3000;

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '4mb' }));

  app.get('/api/sql/snapshot', requireAuth, async (req: AuthRequest, res) => {
    try {
      const uid = req.user?.uid;
      const email = req.user?.email;
      if (!uid || !email) {
        return res.status(401).json({ error: 'Unauthorized: Missing user claims' });
      }
      await getOrCreateUser(uid, email);
      const snapshot = await getMeetSnapshotFromSql();
      return res.json(snapshot);
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Failed to load database snapshot';
      console.error('GET /api/sql/snapshot error:', error);
      return res.status(500).json({ error: message });
    }
  });

  app.post('/api/sql/sync', requireAuth, async (req: AuthRequest, res) => {
    try {
      const uid = req.user?.uid;
      const email = req.user?.email;
      if (!uid || !email) {
        return res.status(401).json({ error: 'Unauthorized: Missing user claims' });
      }
      const body = req.body as { operations?: unknown } | undefined;
      if (!body || !Array.isArray(body.operations)) {
        return res.status(400).json({ error: 'Invalid sync payload' });
      }

      await getOrCreateUser(uid, email);
      const result = await applySyncOperationsToSql(
        body.operations as SyncOperation[],
        uid,
        email
      );
      return res.json({ ok: true, applied: result.applied });
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Failed to sync changes';
      console.error('POST /api/sql/sync error:', error);
      return res.status(500).json({ error: message });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`SCC Sports Meet server listening on http://0.0.0.0:${PORT}`);
  });
}

void startServer();
