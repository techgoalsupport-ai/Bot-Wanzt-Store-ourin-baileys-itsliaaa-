import { getBotManager } from '../../backend/botManager.ts';
import { getMasterDb } from '../database/masterSqlite.ts';
import { TenantRecord } from '../types/admin.types.ts';

export class AdminMessagingService {
  static async sendMessageToOwner(tenantId: string, message: string): Promise<{ success: boolean; message: string }> {
    if (!message || typeof message !== 'string' || !message.trim()) {
      throw new Error('Isi pesan tidak boleh kosong');
    }

    const db = getMasterDb();
    const tenant = db.prepare('SELECT * FROM tenants WHERE tenant_id = ?').get(tenantId) as TenantRecord | undefined;

    if (!tenant) {
      throw new Error('Unit tenant tidak ditemukan');
    }

    if (!tenant.owner_phone || !tenant.owner_phone.trim()) {
      throw new Error('Nomor WhatsApp pemilik (owner) pada unit ini belum diisi oleh tenant');
    }

    const bot = getBotManager(tenantId);
    if (bot.status !== 'connected' || !bot.sock) {
      const error: any = new Error(`Bot WhatsApp toko ${tenant.store_name || tenantId} sedang Offline. Tidak dapat mengirim pesan otomatis via bot.`);
      error.botOffline = true;
      throw error;
    }

    await bot.sendTextMessage(tenant.owner_phone, message.trim());

    return {
      success: true,
      message: `Pesan resmi Master Admin berhasil dikirim ke nomor WhatsApp owner (${tenant.owner_phone}) via bot toko`,
    };
  }
}
