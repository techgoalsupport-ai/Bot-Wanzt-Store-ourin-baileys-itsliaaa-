import fs from 'fs';
import path from 'path';
import { getMasterDb } from '../database/masterSqlite.ts';
import { getBotManager } from '../../backend/botManager.ts';
import { TenantRecord } from '../types/admin.types.ts';

export class TenantStatusService {
  static async setStatus(tenantId: string, status: 'active' | 'suspended' | 'expired'): Promise<TenantRecord> {
    const db = getMasterDb();
    const update = db.prepare('UPDATE tenants SET status = ? WHERE tenant_id = ?').run(status, tenantId);

    if (update.changes === 0) {
      throw new Error(`Tenant dengan ID ${tenantId} tidak ditemukan`);
    }

    if (status === 'suspended') {
      try {
        const bot = getBotManager(tenantId);
        if (bot) {
          await bot.forceDisconnect();
        }
        const sessionDir = path.resolve(process.cwd(), 'auth_info_baileys', `tenant_${tenantId}`);
        const credsPath = path.join(sessionDir, 'creds.json');
        if (fs.existsSync(credsPath)) {
          try {
            fs.unlinkSync(credsPath);
          } catch {}
        }
      } catch (err) {
        console.error(`Gagal memutus koneksi bot saat suspend tenant ${tenantId}:`, err);
      }
    }

    const updated = db.prepare('SELECT * FROM tenants WHERE tenant_id = ?').get(tenantId) as TenantRecord;
    return updated;
  }
}
