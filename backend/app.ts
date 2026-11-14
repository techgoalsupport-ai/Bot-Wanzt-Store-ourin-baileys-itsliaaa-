import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { authRouter } from './routes/authRoutes.ts';
import { botRouter } from './routes/botRoutes.ts';
import { xavieraRouter } from './routes/xavieraRoutes.ts';
import { lunasQrisRouter } from './routes/lunasQrisRoutes.ts';
import { transactionRouter } from './routes/transactionRoutes.ts';
import { mediaRouter } from './routes/mediaRoutes.ts';
import { pricingRouter } from './routes/pricingRoutes.ts';
import { promoRouter } from './routes/promoRoutes.ts';
import { apartmentRouter } from './routes/apartmentRoutes.ts';
import { tenantTemplateRouter } from './routes/tenantTemplateRoutes.ts';
import { tenantTokenRouter } from './routes/tenantTokenRoutes.ts';
import { telegramRouter } from './routes/telegramRoutes.ts';
import { adminRouter } from '../admin-backend/routes/adminRoutes.ts';
import { partnerPublicRouter } from '../admin-backend/routes/partnerPublicRoutes.ts';
import { initMasterDatabase } from '../admin-backend/database/masterSqlite.ts';
import { initTenantDb } from './database/tenantDbManager.ts';
import { initDatabase } from './database/sqlite.ts';

import { tenantContextStorage } from './database/tenantContext.ts';
import { getSession } from './services/authManager.ts';
import { impersonationTokens } from '../admin-backend/routes/adminRoutes.ts';

import { seedDefaultMedia } from './services/mediaManager.ts';

export function createServerApp(): Express {
  // Pastikan database SQLite dan media siap
  initDatabase();
  initMasterDatabase();
  initTenantDb('t_wanzt');
  try {
    seedDefaultMedia();
  } catch (err) {
    console.error('[Media Seed Error]:', err);
  }

  const app = express();

  // Middleware CORS & Body Parser (limit 25mb untuk upload gambar base64)
  app.use(cors());
  app.use(
    express.json({
      limit: '25mb',
      verify: (req: Request, _res: Response, buf: Buffer) => {
        // Simpan rawBody untuk verifikasi signature HMAC-SHA256 LunasQRIS
        (req as any).rawBody = buf.toString('utf-8');
      },
    })
  );
  app.use(express.urlencoded({ extended: true, limit: '25mb' }));

  // Mount Partner REST API Publik sebelum middleware identifikasi sesi tenant
  app.use('/api/v1/partner', partnerPublicRouter);

  // Middleware Identifikasi Tenant (Apartemen Multi-Tenancy)
  app.use((req: Request, _res: Response, next: NextFunction) => {
    let tenantId = 't_wanzt';
    let username = 'admin';

    // 1. Cek query param ?impersonate=... atau ?tenant=...
    const queryTenant = (req.query.tenant as string) || '';
    const impToken = (req.query.impersonate as string) || '';
    if (impToken && impersonationTokens.has(impToken)) {
      const impData = impersonationTokens.get(impToken);
      if (impData && Date.now() < impData.expiresAt) {
        tenantId = impData.tenantId;
      }
    } else if (queryTenant && queryTenant.trim()) {
      tenantId = queryTenant.trim();
    }

    // 2. Cek Header Authorization (Bearer <token>)
    if (!queryTenant && !impToken) {
      const authHeader = req.headers.authorization || '';
      const token = authHeader.replace(/^Bearer\s+/i, '').trim();
      if (token) {
        if (impersonationTokens.has(token)) {
          const impData = impersonationTokens.get(token);
          if (impData && Date.now() < impData.expiresAt) {
            tenantId = impData.tenantId;
          }
        } else {
          const session = getSession(token);
          if (session && session.tenantId) {
            tenantId = session.tenantId;
            username = session.username;
          }
        }
      }
    }

    // 3. Cek Header X-Tenant-Id
    const headerTenant = req.headers['x-tenant-id'] as string;
    if (headerTenant && headerTenant.trim()) {
      tenantId = headerTenant.trim();
    }

    // 4. Cek Cookie tenant_id jika belum terdeteksi dari token/header
    if (tenantId === 't_wanzt') {
      const cookieHeader = req.headers.cookie || '';
      const match = cookieHeader.match(/tenant_id=([^;]+)/);
      if (match && match[1]) {
        tenantId = decodeURIComponent(match[1].trim());
      }
    }

    // Pastikan database unit apartemen tenant siap
    try {
      initTenantDb(tenantId);
    } catch (dbErr) {
      console.error(`[Tenant DB Error] Inisialisasi ${tenantId} gagal:`, dbErr);
    }

    (req as any).tenantId = tenantId;
    tenantContextStorage.run({ tenantId, username }, () => next());
  });

  // Health check endpoint
  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({ status: 'ok', service: 'bot-wanzt-backend', timestamp: new Date().toISOString() });
  });

  // Mount API Routers
  app.use('/api/auth', authRouter);
  app.use('/api/bot', botRouter);
  app.use('/api/bot', tenantTemplateRouter);
  app.use('/api/bot', tenantTokenRouter);
  app.use('/api/bot/telegram', telegramRouter);
  app.use('/api/pricing', pricingRouter);
  app.use('/api/promos', promoRouter);
  app.use('/api/xaviera', xavieraRouter);
  app.use('/api/lunasqris', lunasQrisRouter);
  app.use('/api/transactions', transactionRouter);
  app.use('/api/media', mediaRouter);
  app.use('/api/apartment', apartmentRouter);
  app.use('/api/admin', adminRouter);

  return app;
}

export const serverApp = createServerApp();
