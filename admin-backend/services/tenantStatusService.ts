import fs from 'fs';
import path from 'path';
import { getMasterDb } from '../database/masterSqlite.ts';
import { getBotManager } from '../../backend/botManager.ts';
import { TenantRecord } from '../types/admin.types.ts';
import { resolveEffectiveTenantStatus, TenantAccountStatus } from './tenantExpiryUtils.ts';

const disconnectingTenants = new Set<string>();

export class TenantStatusService {
  static async setStatus(tenantId: string, status: TenantAccountStatus): Promise<TenantRecord> {
    const db = getMasterDb();
    const update = db.prepare('UPDATE tenants SET status = ? WHERE tenant_id = ?').run(status, tenantId);

    if (update.changes === 0) {
      throw new Error(`Tenant dengan ID ${tenantId} tidak ditemukan`);
    }

    if (status === 'suspended' || status === 'expired') {
      await this.disconnectBotForStatus(tenantId, status);
    }

    const updated = db.prepare('SELECT * FROM tenants WHERE tenant_id = ?').get(tenantId) as TenantRecord;
    return updated;
  }

  /**
   * Memutuskan koneksi bot secara paksa sesuai alasan status:
   * - 'suspended': putus paksa dan hapus folder/kredensial sesi Baileys.
   * - 'expired': putus paksa namun tetap simpan folder & kredensial sesi Baileys.
   */
  static async disconnectBotForStatus(tenantId: string, reason: 'suspended' | 'expired'): Promise<void> {
    if (disconnectingTenants.has(tenantId)) {
      return;
    }

    disconnectingTenants.add(tenantId);
    const clearSession = reason === 'suspended';

    try {
      const bot = getBotManager(tenantId);
      if (bot) {
        const hasLiveConnection =
          Boolean(bot.sock) ||
          bot.status === 'connected' ||
          bot.status === 'connecting' ||
          bot.status === 'waiting_code' ||
          bot.status === 'code_ready';

        if (hasLiveConnection || clearSession) {
          await bot.forceDisconnect({ clearSession, reason });
        } else if (bot.status !== 'closed') {
          bot.status = 'closed';
        }
      }

      if (clearSession) {
        const sessionDir = path.resolve(process.cwd(), 'auth_info_baileys', `tenant_${tenantId}`);
        const credsPath = path.join(sessionDir, 'creds.json');
        if (fs.existsSync(credsPath)) {
          try {
            fs.unlinkSync(credsPath);
          } catch {}
        }
      }
    } catch (err) {
      console.error(`Gagal memutus koneksi bot saat ${reason} tenant ${tenantId}:`, err);
    } finally {
      disconnectingTenants.delete(tenantId);
    }
  }

  /**
   * Pemeriksaan real-time masa aktif tenant:
   * Jika waktu expires_at sudah lewat, langsung ubah status ke 'expired' dan putuskan bot secara paksa
   * (tetap menyimpan sesi WhatsApp agar mudah terhubung kembali setelah perpanjangan).
   */
  static async enforceRealtimeTenantExpiry(tenantId: string): Promise<TenantAccountStatus> {
    const db = getMasterDb();
    const row = db
      .prepare('SELECT tenant_id, status, expires_at FROM tenants WHERE tenant_id = ?')
      .get(tenantId) as { tenant_id: string; status: string; expires_at: string } | undefined;

    if (!row) {
      return 'active';
    }

    const effectiveStatus = resolveEffectiveTenantStatus(row.status, row.expires_at);

    if (effectiveStatus === 'expired' && row.status !== 'expired') {
      db.prepare("UPDATE tenants SET status = 'expired' WHERE tenant_id = ? AND status = 'active'").run(tenantId);
      console.log(`[Realtime Expiry] Masa sewa tenant ${tenantId} habis. Status diperbarui ke expired & bot diputus.`);
    }

    if (effectiveStatus === 'expired' || effectiveStatus === 'suspended') {
      await this.disconnectBotForStatus(tenantId, effectiveStatus);
    }

    return effectiveStatus;
  }

  /**
   * Memeriksa seluruh tenant yang berstatus 'active' namun expires_at sudah lewat secara instan.
   */
  static async enforceAllExpiredTenants(): Promise<number> {
    const db = getMasterDb();
    const activeRows = db
      .prepare("SELECT tenant_id, status, expires_at FROM tenants WHERE status = 'active'")
      .all() as { tenant_id: string; status: string; expires_at: string }[];

    const nowMs = Date.now();
    let expiredCount = 0;

    for (const row of activeRows) {
      if (resolveEffectiveTenantStatus(row.status, row.expires_at, nowMs) === 'expired') {
        db.prepare("UPDATE tenants SET status = 'expired' WHERE tenant_id = ? AND status = 'active'").run(row.tenant_id);
        await this.disconnectBotForStatus(row.tenant_id, 'expired');
        expiredCount++;
        console.log(`[Realtime Expiry] Tenant ${row.tenant_id} telah melewati batas waktu sewa dan diputus paksa.`);
      }
    }

    return expiredCount;
  }
}
