import { Router, Request, Response } from 'express';
import { getActiveTenantId } from '../database/tenantContext.ts';
import {
  getTelegramConfig,
  saveTelegramConfig,
  testTelegramConnection,
} from '../services/telegramService.ts';
import { loadStoreInfo } from '../config/configManager.ts';

export const telegramRouter = Router();

// 1. Ambil Konfigurasi Telegram Tenant Aktif
telegramRouter.get('/config', (req: Request, res: Response) => {
  try {
    const tenantId = getActiveTenantId() || 't_wanzt';
    const config = getTelegramConfig(tenantId);
    return res.json({
      success: true,
      config,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err?.message || 'Server error' });
  }
});

// 2. Simpan Konfigurasi Telegram Tenant Aktif
telegramRouter.post('/config', (req: Request, res: Response) => {
  try {
    const tenantId = getActiveTenantId() || 't_wanzt';
    const { botToken, chatId, notifEnabled } = req.body || {};

    const updated = saveTelegramConfig(tenantId, {
      botToken: typeof botToken === 'string' ? botToken.trim() : undefined,
      chatId: typeof chatId === 'string' ? chatId.trim() : undefined,
      notifEnabled: typeof notifEnabled === 'boolean' ? notifEnabled : undefined,
    });

    return res.json({
      success: true,
      message: 'Pengaturan notifikasi Telegram berhasil disimpan!',
      config: updated,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err?.message || 'Server error' });
  }
});

// 3. Tes Koneksi Telegram Bot
telegramRouter.post('/test', async (req: Request, res: Response) => {
  try {
    const tenantId = getActiveTenantId() || 't_wanzt';
    const { botToken, chatId } = req.body || {};

    const currentConfig = getTelegramConfig(tenantId);
    const targetToken = (botToken !== undefined ? String(botToken).trim() : currentConfig.botToken);
    const targetChatId = (chatId !== undefined ? String(chatId).trim() : currentConfig.chatId);

    if (!targetToken || !targetChatId) {
      return res.status(400).json({
        success: false,
        error: 'Bot Token dan Chat ID wajib diisi terlebih dahulu untuk melakukan tes pengiriman.',
      });
    }

    const store = loadStoreInfo();
    const result = await testTelegramConnection(targetToken, targetChatId, store.storeName || 'Toko Anda');

    if (result.success) {
      return res.json({
        success: true,
        botName: result.botName,
        username: result.username,
        message: `Koneksi berhasil! Pesan tes telah terkirim ke Telegram via ${result.botName} (${result.username || ''}).`,
      });
    } else {
      return res.status(400).json({
        success: false,
        error: result.error || 'Gagal mengirim pesan tes ke Telegram.',
      });
    }
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err?.message || 'Server error' });
  }
});
