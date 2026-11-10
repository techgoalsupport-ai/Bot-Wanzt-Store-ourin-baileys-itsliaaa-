import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import express from 'express';
import { createServer as createViteServer } from 'vite';
import { serverApp } from './backend/app.ts';
import { startExpiryWarningScheduler } from './backend/services/expiryWarningService.ts';

const __dirname = import.meta.dirname;

async function startServer() {
  const PORT = parseInt(process.env.PORT || '3000', 10);
  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction) {
    // Mode Development: Inisialisasi Vite dev server untuk Tenant (frontend) dan Master Admin (admin-frontend)
    const viteTenant = await createViteServer({
      root: path.resolve(__dirname, 'frontend'),
      server: {
        middlewareMode: true,
        hmr: { port: 24678 },
      },
      appType: 'spa',
    });

    const viteAdmin = await createViteServer({
      root: path.resolve(__dirname, 'admin-frontend'),
      base: '/admin/',
      configFile: path.resolve(__dirname, 'admin-frontend', 'vite.config.ts'),
      server: {
        middlewareMode: true,
        hmr: { port: 24679 },
      },
      appType: 'spa',
    });

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

  serverApp.listen(PORT, '0.0.0.0', () => {
    console.log(`[Wanzt Store] Server berjalan di http://0.0.0.0:${PORT}`);
    console.log(`[Wanzt Store] Mode: ${isProduction ? 'Production' : 'Development'}`);
    startExpiryWarningScheduler();
  });
}

startServer();
