import { Router, Request, Response } from 'express';
import { TelegramAdminService } from '../services/telegramAdminService.ts';

export const telegramAdminRouter = Router();

// 1. Ambil daftar status bot Telegram seluruh tenant (tanpa token / chat ID)
telegramAdminRouter.get('/tenants', (_req: Request, res: Response) => {
  try {
    const list = TelegramAdminService.getAllTenantsTelegramSummary();
    return res.json({
      success: true,
      data: list,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err?.message || 'Server error' });
  }
});

// 2. Toggle status bot Telegram tenant (Matikan / Hidupkan kembali oleh Master Admin)
telegramAdminRouter.post('/tenants/:id/toggle', (req: Request, res: Response) => {
  try {
    const tenantId = String(req.params.id);
    if (!tenantId) {
      return res.status(400).json({ success: false, error: 'ID Tenant diperlukan' });
    }

    const result = TelegramAdminService.toggleTenantTelegram(tenantId);
    return res.json({
      success: true,
      message: result.adminDisabled
        ? `Bot Telegram untuk tenant ${tenantId} berhasil dinonaktifkan.`
        : `Bot Telegram untuk tenant ${tenantId} berhasil diaktifkan kembali.`,
      data: result,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err?.message || 'Server error' });
  }
});

// 3. Kirim pesan resmi Master Admin ke Telegram Owner toko
telegramAdminRouter.post('/tenants/:id/send-message', async (req: Request, res: Response) => {
  try {
    const tenantId = String(req.params.id);
    const { message } = req.body || {};

    if (!tenantId) {
      return res.status(400).json({ success: false, error: 'ID Tenant diperlukan' });
    }
    if (!message || !message.trim()) {
      return res.status(400).json({ success: false, error: 'Pesan pengumuman tidak boleh kosong' });
    }

    const result = await TelegramAdminService.sendAdminMessage(tenantId, message);
    if (result.success) {
      return res.json({
        success: true,
        message: 'Pesan pengumuman resmi berhasil terkirim ke Telegram pemilik toko.',
      });
    } else {
      return res.status(400).json({
        success: false,
        error: result.error || 'Gagal mengirim pesan Telegram.',
      });
    }
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err?.message || 'Server error' });
  }
});
