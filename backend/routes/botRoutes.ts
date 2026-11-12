import { Router, Request, Response } from 'express';
import { botManager } from '../botManager.ts';
import { loadStoreInfo } from '../config/configManager.ts';
import { getActiveTenantId } from '../database/tenantContext.ts';
import { TenantManager } from '../../admin-backend/services/tenantManager.ts';

export const botRouter = Router();

// Status bot saat ini (dilengkapi accountStatus real-time dari master.db)
botRouter.get('/status', (_req: Request, res: Response) => {
  const tenantId = getActiveTenantId();
  const tenant = TenantManager.getTenant(tenantId);
  const accountStatus = tenant?.status || 'active';
  const botStatus = botManager.getStatus();

  const daysRemaining = tenant?.days_remaining ?? 0;
  const rawTotalDays = tenant?.duration_days ?? 30;
  const totalDays = Math.max(rawTotalDays, daysRemaining, 1);

  return res.json({
    ...botStatus,
    accountStatus,
    expiresAt: tenant?.expires_at,
    createdAt: tenant?.created_at,
    daysRemaining,
    totalDays,
  });
});

// Daftar grup WhatsApp tempat bot bergabung
botRouter.get('/groups', async (_req: Request, res: Response) => {
  try {
    const result = await botManager.getParticipatingGroups();
    return res.json(result);
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'Gagal mengambil grup' });
  }
});

// Start bot (dengan Server-Side Hard Guard Status Akun & Store Info)
botRouter.post('/start', async (req: Request, res: Response) => {
  try {
    const tenantId = getActiveTenantId();
    const tenant = TenantManager.getTenant(tenantId);

    // 1. HARD GUARD: Blokir total jika akun sedang suspended atau expired
    if (tenant && tenant.status !== 'active') {
      const isSuspended = tenant.status === 'suspended';
      return res.status(403).json({
        success: false,
        suspended: isSuspended,
        expired: tenant.status === 'expired',
        error: isSuspended
          ? 'Akses Ditolak: Akun toko Anda sedang ditangguhkan (Suspended) oleh Master Admin. Seluruh permintaan koneksi WhatsApp dinonaktifkan.'
          : 'Akses Ditolak: Masa sewa bot Anda telah kedaluwarsa (Expired). Silakan hubungi Master Admin untuk memperpanjang masa sewa.',
      });
    }

    // 2. Server-Side Enforcement Store Info
    const currentStore = botManager.config?.storeInfo || loadStoreInfo();
    const hasStoreName = Boolean(currentStore?.storeName && currentStore.storeName.trim());
    const hasOwnerName = Boolean(currentStore?.ownerName && currentStore.ownerName.trim());
    const hasOwnerNumber = Boolean(currentStore?.ownerNumber && currentStore.ownerNumber.trim());

    if (!hasStoreName || !hasOwnerName || !hasOwnerNumber) {
      return res.status(400).json({
        success: false,
        error:
          'Akses Dikunci: Anda wajib melengkapi Nama Toko, Nama Owner, dan Nomer Owner di Store Info sebelum menjalankan bot WhatsApp!',
        locked: true,
      });
    }

    const { phoneNumber, customCode } = req.body || {};
    const result = await botManager.start(phoneNumber, customCode);
    return res.json(result);
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'Gagal menyalakan bot' });
  }
});

// Stop bot
botRouter.post('/stop', async (_req: Request, res: Response) => {
  try {
    await botManager.stop();
    return res.json({ success: true, status: botManager.getStatus() });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'Gagal menghentikan bot' });
  }
});

// Reset koneksi bot
botRouter.post('/reset', async (_req: Request, res: Response) => {
  try {
    const tenantId = getActiveTenantId();
    const tenant = TenantManager.getTenant(tenantId);
    if (tenant && tenant.status !== 'active') {
      return res.status(403).json({
        success: false,
        suspended: tenant.status === 'suspended',
        error: 'Akses Ditolak: Akun toko Anda sedang ditangguhkan (Suspended).',
      });
    }

    await botManager.reset();
    return res.json({ success: true, status: botManager.getStatus() });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'Gagal mereset bot' });
  }
});

// Simpan konfigurasi bot
botRouter.post('/save-config', (req: Request, res: Response) => {
  try {
    const tenantId = getActiveTenantId();
    const tenant = TenantManager.getTenant(tenantId);
    if (tenant && tenant.status !== 'active') {
      return res.status(403).json({
        success: false,
        suspended: tenant.status === 'suspended',
        error: 'Akses Ditolak: Akun toko Anda sedang ditangguhkan (Suspended).',
      });
    }

    botManager.saveConfig(req.body);
    return res.json({ success: true, config: botManager.config });
  } catch (err: any) {
    console.error('Error saat menyimpan konfigurasi bot:', err);
    return res.status(500).json({ error: err?.message || 'Gagal menyimpan konfigurasi' });
  }
});

// Toggle whitelist respon bot per grup
botRouter.post('/groups/toggle', (req: Request, res: Response) => {
  try {
    const { groupId, enabled } = req.body || {};
    if (!groupId) {
      return res.status(400).json({ error: 'groupId diperlukan' });
    }
    const updatedToggles = botManager.setGroupToggle(groupId, Boolean(enabled));
    return res.json({
      success: true,
      groupId,
      enabled: Boolean(enabled),
      toggles: updatedToggles,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'Gagal mengubah status grup' });
  }
});
