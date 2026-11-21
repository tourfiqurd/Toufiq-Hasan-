import 'dotenv/config';
import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import net from 'net';
import { FIREBASE_PROJECT_ID, USE_FIREBASE_EMULATOR } from './server/firebaseAdmin.ts';
import { seedDemoIntoEmulator } from './server/seedEmulator.ts';
import { adminApplicationsRouter } from './server/routes/adminApplications.ts';
import { adminUsersRouter } from './server/routes/adminUsers.ts';
import { principalUsersRouter } from './server/routes/principalUsers.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = Number(process.env.PORT || 3000);

function probeTcp(host: string, port: number, timeoutMs = 150): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    let settled = false;
    const done = (ok: boolean) => {
      if (settled) return;
      settled = true;
      socket.destroy();
      resolve(ok);
    };
    socket.setTimeout(timeoutMs);
    socket.once('connect', () => done(true));
    socket.once('timeout', () => done(false));
    socket.once('error', () => done(false));
    socket.connect(port, host);
  });
}

async function createApp() {
  const app = express();
  app.use(express.json({ limit: '2mb' }));

  app.get('/api/health', async (_req, res) => {
    const emulatorReachable = USE_FIREBASE_EMULATOR
      ? await probeTcp('127.0.0.1', 9099).then(async (authOk) =>
          authOk ? probeTcp('127.0.0.1', 9000) : false
        )
      : false;
    res.json({
      ok: true,
      projectId: FIREBASE_PROJECT_ID,
      usingEmulator: USE_FIREBASE_EMULATOR,
      emulatorReachable,
    });
  });

  app.use('/api/admin', adminApplicationsRouter);
  app.use('/api/admin', adminUsersRouter);
  app.use('/api/principal', principalUsersRouter);

  app.post('/api/emulator/seed', async (_req, res) => {
    if (!USE_FIREBASE_EMULATOR) {
      res.status(403).json({
        ok: false,
        error: 'Emulator seeding is disabled in production mode.',
      });
      return;
    }
    try {
      const result = await seedDemoIntoEmulator();
      res.json({ ok: true, ...result });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to seed emulator';
      res.status(500).json({ ok: false, error: msg });
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
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api/')) {
        next();
        return;
      }
      const indexHtml = path.join(distDir, 'index.html');
      if (fs.existsSync(indexHtml)) {
        res.sendFile(indexHtml);
      } else {
        res.status(404).send('Build output not found.');
      }
    });
  }

  return app;
}

createApp()
  .then((app) => {
    app.listen(PORT, '0.0.0.0', () => {
      console.log(
        `[Academia Server] Running on http://0.0.0.0:${PORT} (Firebase project: ${FIREBASE_PROJECT_ID}, emulator: ${USE_FIREBASE_EMULATOR})`
      );
    });
  })
  .catch((err) => {
    console.error('[Academia Server] Failed to start:', err);
    process.exit(1);
  });
