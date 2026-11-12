import { getMasterDb } from '../database/masterSqlite.ts';
import {
  getTelegramConfig,
  saveTelegramConfig,
  sendAdminMessageToTelegram,
  TelegramTenantSummary,
} from '../../backend/services/telegramService.ts';

export class TelegramAdminService {
  /**
   * Mengambil daftar ringkasan bot Telegram seluruh tenant untuk Master Admin.
   * Privasi Terjamin: bot_token dan chat_id TIDAK PERNAH diekspos ke Master Admin.
   */
  static getAllTenantsTelegramSummary(): TelegramTenantSummary[] {
    const db = getMasterDb();
    const tenants = db.prepare(`
      SELECT tenant_id, store_name
      FROM tenants
      ORDER BY id ASC
    `).all() as Array<{ tenant_id: string; store_name: string }>;

    return tenants.map((t) => {
      const config = getTelegramConfig(t.tenant_id);

      let status: 'online' | 'offline' | 'suspend' | 'nonaktif' = 'nonaktif';
      if (config.adminDisabled) {
        status = 'suspend';
      } else if (!config.isConfigured) {
        status = 'nonaktif';
      } else if (config.notifEnabled) {
        status = 'online';
      } else {
        status = 'offline';
      }

      return {
        tenantId: t.tenant_id,
        storeName: t.store_name || 'Toko Tanpa Nama',
        isConfigured: config.isConfigured,
        notifEnabled: config.notifEnabled,
        adminDisabled: config.adminDisabled,
        status,
        updatedAt: config.updatedAt,
      };
    });
  }

  /**
   * Master Admin mematikan atau mengaktifkan kembali bot Telegram tenant
   */
  static toggleTenantTelegram(tenantId: string): { success: boolean; adminDisabled: boolean; status: string } {
    const current = getTelegramConfig(tenantId);
    const newDisabled = !current.adminDisabled;

    saveTelegramConfig(tenantId, { adminDisabled: newDisabled });

    let status: 'online' | 'offline' | 'suspend' | 'nonaktif' = 'nonaktif';
    if (newDisabled) {
      status = 'suspend';
    } else if (!current.isConfigured) {
      status = 'nonaktif';
    } else if (current.notifEnabled) {
      status = 'online';
    } else {
      status = 'offline';
    }

    return {
      success: true,
      adminDisabled: newDisabled,
      status,
    };
  }

  /**
   * Master Admin mengirimkan pesan resmi ke Telegram Owner toko
   */
  static async sendAdminMessage(
    tenantId: string,
    message: string
  ): Promise<{ success: boolean; error?: string }> {
    if (!message || !message.trim()) {
      return { success: false, error: 'Pesan pengumuman tidak boleh kosong' };
    }

    const db = getMasterDb();
    const tenant = db.prepare('SELECT store_name FROM tenants WHERE tenant_id = ?').get(tenantId) as any;
    const storeName = tenant?.store_name || tenantId;

    return sendAdminMessageToTelegram(tenantId, message.trim(), storeName);
  }
}
