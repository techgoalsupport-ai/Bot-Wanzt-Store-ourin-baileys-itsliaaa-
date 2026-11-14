import { Router, Request, Response } from 'express';
import {
  initAuth,
  verifyLogin,
  createSession,
  validateSession,
  getSession,
  revokeSession,
  updateTenantUsername,
  updateTenantPassword,
} from '../services/authManager.ts';
import { impersonationTokens } from '../../admin-backend/routes/adminRoutes.ts';
import { TenantManager } from '../../admin-backend/services/tenantManager.ts';
import { saveStoreInfo, loadStoreInfo } from '../config/configManager.ts';
import { botManager } from '../botManager.ts';
import { toOfficialIndonesianPhone } from '../services/placeholderHelper.ts';
import { MasterAdminContactService } from '../../admin-backend/services/masterAdminContactService.ts';
import { TenantStatusService } from '../../admin-backend/services/tenantStatusService.ts';

export const authRouter = Router();

// Inisialisasi akun default admin jika belum ada
initAuth();

// 1. Verifikasi Login (POST /api/auth/login)
authRouter.post('/login', async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body || {};
    const authResult = verifyLogin(username, password);
    if (!authResult) {
      return res.status(401).json({ success: false, error: 'Username atau password salah!' });
    }
    const resolvedUsername = authResult.username || username;
    const resolvedTenantId = authResult.tenantId || 't_wanzt';
    const accountStatus = await TenantStatusService.enforceRealtimeTenantExpiry(resolvedTenantId);
    const token = createSession(resolvedUsername, resolvedTenantId);

    // Set cookie untuk memastikan request selanjutnya otomatis teridentifikasi tenant-nya
    res.cookie('tenant_id', resolvedTenantId, { path: '/', httpOnly: false, maxAge: 7 * 24 * 3600 * 1000 });
    res.cookie('auth_token', token, { path: '/', httpOnly: false, maxAge: 7 * 24 * 3600 * 1000 });

    return res.json({
      success: true,
      token,
      user: { username: resolvedUsername, tenantId: resolvedTenantId, accountStatus },
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err?.message || 'Server error' });
  }
});

// 2. Cek Validitas Sesi (GET /api/auth/session)
authRouter.get('/session', async (req: Request, res: Response) => {
  const authHeader = req.headers['authorization'] || '';
  const token = authHeader.replace(/^Bearer\s+/i, '') || (req.query.token as string) || '';

  // A. Cek sesi impersonasi dari Master Admin ("Buka Toko")
  if (token && impersonationTokens.has(token)) {
    const imp = impersonationTokens.get(token);
    if (imp && Date.now() < imp.expiresAt) {
      const tenant = TenantManager.getTenant(imp.tenantId);
      const username = tenant?.username || `Tenant-${imp.tenantId}`;
      const accountStatus = await TenantStatusService.enforceRealtimeTenantExpiry(imp.tenantId);
      res.cookie('tenant_id', imp.tenantId, { path: '/', httpOnly: false, maxAge: 7 * 24 * 3600 * 1000 });
      return res.json({ authenticated: true, user: { username, tenantId: imp.tenantId, accountStatus } });
    } else if (imp) {
      impersonationTokens.delete(token);
    }
  }

  // B. Cek sesi reguler pengguna / tenant
  const session = getSession(token);
  if (session) {
    const accountStatus = await TenantStatusService.enforceRealtimeTenantExpiry(session.tenantId);
    res.cookie('tenant_id', session.tenantId, { path: '/', httpOnly: false, maxAge: 7 * 24 * 3600 * 1000 });
    return res.json({ authenticated: true, user: { username: session.username, tenantId: session.tenantId, accountStatus } });
  }

  return res.json({ authenticated: false, user: null });
});

// 3. Logout Sesi (POST /api/auth/logout)
authRouter.post('/logout', (req: Request, res: Response) => {
  const authHeader = req.headers['authorization'] || '';
  const token = authHeader.replace(/^Bearer\s+/i, '');
  revokeSession(token);
  res.clearCookie('tenant_id', { path: '/' });
  res.clearCookie('auth_token', { path: '/' });
  return res.json({ success: true });
});

// 4. Cek Kelengkapan Data Store Info Wajib (GET /api/auth/store-status)
authRouter.get('/store-status', async (req: Request, res: Response) => {
  const currentInfo = loadStoreInfo();
  const isComplete = Boolean(
    currentInfo.storeName && currentInfo.storeName.trim() &&
    currentInfo.ownerName && currentInfo.ownerName.trim() &&
    currentInfo.ownerNumber && currentInfo.ownerNumber.trim()
  );

  // Ambil juga status akun tenant aktif dari master.db secara real-time
  const tenantId = (req as any).tenantId || req.cookies?.tenant_id || 't_wanzt';
  const accountStatus = await TenantStatusService.enforceRealtimeTenantExpiry(tenantId);

  return res.json({ complete: isComplete, storeInfo: currentInfo, accountStatus, tenantId });
});


// 5. Setup Wajib Data Store Info (POST /api/auth/store-setup)
authRouter.post('/store-setup', (req: Request, res: Response) => {
  try {
    const { storeName, ownerName, ownerNumber } = req.body || {};
    if (!storeName?.trim() || !ownerName?.trim() || !ownerNumber?.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Nama Toko, Nama Owner, dan Nomer Owner wajib diisi!',
      });
    }

    const officialOwnerNumber = toOfficialIndonesianPhone(ownerNumber);
    const updated = saveStoreInfo({
      storeName: storeName.trim(),
      ownerName: ownerName.trim(),
      ownerNumber: officialOwnerNumber,
    });

    // Sinkronkan ke master.db milik Master Admin
    const session = getAuthSessionFromReq(req);
    const tenantId = session?.tenantId || (req as any).tenantId || req.cookies?.tenant_id || req.headers['x-tenant-id'] || 't_wanzt';
    TenantManager.updateStoreInfo(
      tenantId,
      storeName.trim(),
      ownerName.trim(),
      officialOwnerNumber
    );

    botManager.saveConfig({
      ...botManager.config,
      storeInfo: updated,
    });

    return res.json({ success: true, storeInfo: updated });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err?.message || 'Server error' });
  }
});

// Helper untuk mengekstrak identitas tenant & username yang terotentikasi
function getAuthSessionFromReq(req: Request): { username: string; tenantId: string } | null {
  const authHeader = req.headers['authorization'] || '';
  const token = authHeader.replace(/^Bearer\s+/i, '') || (req.query.token as string) || req.cookies?.auth_token || '';

  // 1. Sesi Impersonasi Master Admin
  if (token && impersonationTokens.has(token)) {
    const imp = impersonationTokens.get(token);
    if (imp && Date.now() < imp.expiresAt) {
      const tenant = TenantManager.getTenant(imp.tenantId);
      return { username: tenant?.username || `Tenant-${imp.tenantId}`, tenantId: imp.tenantId };
    }
  }

  // 2. Sesi login reguler
  const session = getSession(token);
  if (session) {
    return { username: session.username, tenantId: session.tenantId };
  }

  // 3. Fallback tenant context
  const tenantId = (req as any).tenantId || req.cookies?.tenant_id || req.headers['x-tenant-id'];
  if (tenantId) {
    const tenant = TenantManager.getTenant(String(tenantId));
    return { username: tenant?.username || 'admin', tenantId: String(tenantId) };
  }

  return null;
}

// 6. Ubah Username Tenant Mandiri (POST /api/auth/profile/update-username)
authRouter.post('/profile/update-username', (req: Request, res: Response) => {
  try {
    const session = getAuthSessionFromReq(req);
    if (!session) {
      return res.status(401).json({ success: false, error: 'Sesi login tidak valid. Silakan login kembali.' });
    }

    const { newUsername } = req.body || {};
    const result = updateTenantUsername(session.tenantId, session.username, newUsername);
    if (!result.success) {
      return res.status(400).json({ success: false, error: result.message });
    }

    return res.json({
      success: true,
      message: result.message,
      username: result.newUsername,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err?.message || 'Server error' });
  }
});

// 7. Ubah Password Tenant Mandiri (POST /api/auth/profile/update-password)
authRouter.post('/profile/update-password', (req: Request, res: Response) => {
  try {
    const session = getAuthSessionFromReq(req);
    if (!session) {
      return res.status(401).json({ success: false, error: 'Sesi login tidak valid. Silakan login kembali.' });
    }

    const { currentPassword, newPassword, confirmPassword } = req.body || {};
    const result = updateTenantPassword(
      session.tenantId,
      session.username,
      currentPassword,
      newPassword,
      confirmPassword
    );

    if (!result.success) {
      return res.status(400).json({ success: false, error: result.message });
    }

    return res.json({
      success: true,
      message: result.message,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err?.message || 'Server error' });
  }
});

// 8. Ambil 1 Kontak Master Admin Acak Berbobot untuk Rujukan Tenant (GET /api/auth/master-admin-contact)
authRouter.get('/master-admin-contact', (_req: Request, res: Response) => {
  try {
    const picked = MasterAdminContactService.pickRandomMasterAdmin();
    return res.json({
      success: true,
      admin: {
        id: picked.id,
        name: picked.name,
        phone: picked.phone,
        cleanPhone: picked.cleanPhone,
      },
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      error: err?.message || 'Gagal memuat kontak Master Admin.',
    });
  }
});

