import http from 'node:http';
import path from 'node:path';
import fs from 'node:fs';
import type { Express } from 'express';

const __dirname = import.meta.dirname;

// Tangani unhandled rejection dan uncaught exception agar proses server tidak mati mendadak
process.on('uncaughtException', (err) => {
  console.error('[Wanzt Store] Uncaught Exception:', err);
});
process.on('unhandledRejection', (reason, promise) => {
  console.error('[Wanzt Store] Unhandled Rejection at:', promise, 'reason:', reason);
});

function resolvePort(): number {
  const args = process.argv.slice(2);
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--port' && args[i + 1]) {
      const parsed = parseInt(args[i + 1], 10);
      if (!isNaN(parsed) && parsed > 0) return parsed;
    }
    if (arg.startsWith('--port=')) {
      const parsed = parseInt(arg.slice('--port='.length), 10);
      if (!isNaN(parsed) && parsed > 0) return parsed;
    }
  }

  // Di environment Cloud Run/container, PORT sering diset ke port Nginx (8080).
  // Gunakan DEFAULT_APP_PORT (3000) atau abaikan PORT jika sama dengan NGINX_PORT.
  const nginxPort = process.env.NGINX_PORT || '8080';
  const candidate =
    process.env.APP_PORT ||
    process.env.DEFAULT_APP_PORT ||
    (process.env.PORT && process.env.PORT !== nginxPort ? process.env.PORT : '3000');

  const parsed = parseInt(candidate, 10);
  return !isNaN(parsed) && parsed > 0 ? parsed : 3000;
}

async function initializeFullApp(isProduction: boolean): Promise<Express> {
  const [
    { default: express },
    { serverApp },
    { startExpiryWarningScheduler },
    viteModule,
  ] = await Promise.all([
    import('express'),
    import('./backend/app.ts'),
    import('./backend/services/expiryWarningService.ts'),
    !isProduction ? import('vite') : Promise.resolve(null),
  ]);

  if (!isProduction && viteModule) {
    const { createServer: createViteServer } = viteModule;

    // Mode Development: Inisialisasi Vite dev server untuk Tenant (frontend) dan Master Admin (admin-frontend) secara paralel.
    // HMR dan WebSocket (hmr: false, ws: false) dinonaktifkan sesuai batasan runtime environment agar tidak bentrok di port 24678.
    const [viteTenant, viteAdmin] = await Promise.all([
      createViteServer({
        root: path.resolve(__dirname, 'frontend'),
        server: {
          middlewareMode: true,
          hmr: false,
          ws: false,
        },
        appType: 'spa',
      }),
      createViteServer({
        root: path.resolve(__dirname, 'admin-frontend'),
        base: '/admin/',
        configFile: path.resolve(__dirname, 'admin-frontend', 'vite.config.ts'),
        server: {
          middlewareMode: true,
          hmr: false,
          ws: false,
        },
        appType: 'spa',
      }),
    ]);

    serverApp.use((req, res, next) => {
      // Lewati rute API
      if (req.path.startsWith('/api')) {
        return next();
      }

      // Jika path tepat /admin (tanpa slash akhir), redirect ke /admin/ agar path relatif & script base resolve sempurna
      if (req.path === '/admin') {
        return res.redirect(301, '/admin/');
      }

      // Deteksi Subdomain admin.wanma2.my.id ATAU path /admin/
      const isHostAdmin = req.hostname.startsWith('admin.');
      const isPathAdmin = req.path.startsWith('/admin/');

      if (isHostAdmin || isPathAdmin) {
        return viteAdmin.middlewares(req, res, next);
      }

      // Default: Sajikan Web Dashboard Pengguna (dashboard.wanma2.my.id)
      return viteTenant.middlewares(req, res, next);
    });
  } else {
    // Mode Production: Sajikan file build statis dari folder dist (tenant) dan dist-admin (master admin)
    const distTenant = fs.existsSync(path.resolve(__dirname, 'frontend', 'dist'))
      ? path.resolve(__dirname, 'frontend', 'dist')
      : path.resolve(__dirname, 'dist');
    const distAdmin = path.resolve(__dirname, 'dist-admin');

    if (fs.existsSync(distAdmin)) {
      serverApp.use('/admin', express.static(distAdmin));
    }
    if (fs.existsSync(distTenant)) {
      serverApp.use(express.static(distTenant));
    }

    serverApp.use((req, res, next) => {
      if (req.method !== 'GET' || req.path.startsWith('/api')) return next();

      const isHostAdmin = req.hostname.startsWith('admin.');
      const isPathAdmin = req.path === '/admin' || req.path.startsWith('/admin/');

      if (isHostAdmin || isPathAdmin) {
        if (fs.existsSync(distAdmin)) {
          return res.sendFile(path.resolve(distAdmin, 'index.html'));
        }
      }

      if (fs.existsSync(distTenant)) {
        return res.sendFile(path.resolve(distTenant, 'index.html'));
      }
      next();
    });
  }

  try {
    startExpiryWarningScheduler();
  } catch (schedErr) {
    console.error('[Wanzt Store] Gagal memulai scheduler masa sewa:', schedErr);
  }

  return serverApp;
}

function startServer() {
  const port = resolvePort();
  const isProduction = process.env.NODE_ENV === 'production';

  let readyApp: Express | null = null;
  let initError: unknown = null;

  const readyPromise = initializeFullApp(isProduction)
    .then((app) => {
      readyApp = app;
      return app;
    })
    .catch((err) => {
      initError = err;
      console.error('[Wanzt Store] Gagal menginisialisasi aplikasi:', err);
      throw err;
    });

  const httpServer = http.createServer(async (req, res) => {
    const reqUrl = req.url || '/';
    if (reqUrl === '/api/health' || reqUrl.startsWith('/api/health?')) {
      if (initError) {
        res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(
          JSON.stringify({
            status: 'error',
            service: 'bot-wanzt-backend',
            timestamp: new Date().toISOString(),
          })
        );
        return;
      }
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(
        JSON.stringify({
          status: 'ok',
          service: 'bot-wanzt-backend',
          ready: Boolean(readyApp),
          timestamp: new Date().toISOString(),
        })
      );
      return;
    }

    try {
      const app = readyApp ?? (await readyPromise);
      app(req as any, res as any);
    } catch (err) {
      console.error('[Wanzt Store] Request gagal saat inisialisasi:', err);
      if (!res.headersSent) {
        res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ error: 'Server initialization failed' }));
      }
    }
  });

  httpServer.on('error', (err) => {
    console.error(`[Wanzt Store] Server error pada port ${port}:`, err);
    process.exit(1);
  });

  httpServer.listen(port, '0.0.0.0', () => {
    console.log(`[Wanzt Store] Server berjalan di http://0.0.0.0:${port}`);
    console.log(`[Wanzt Store] Mode: ${isProduction ? 'Production' : 'Development'}`);
  });
}

startServer();
