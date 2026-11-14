import fs from 'fs';
import path from 'path';
import { getMasterDb, hashPassword } from '../database/masterSqlite.ts';
import { initTenantDb, deleteTenantDb } from '../../backend/database/tenantDbManager.ts';
import { getBotManager } from '../../backend/botManager.ts';
import { TenantRecord, CreateTenantInput, CreateTenantResult, GlobalStats } from '../types/admin.types.ts';
import { normalizeIndonesianPhone } from '../utils/phoneUtils.ts';
import { generateCleanId, generateStructuredUsername, generateRandomPassword } from '../utils/generatorUtils.ts';
import { resolveEffectiveTenantStatus } from './tenantExpiryUtils.ts';

export class TenantService {
  static getAllTenants(): TenantRecord[] {
    const db = getMasterDb();
    const rows = db.prepare(`
      SELECT id, tenant_id, store_name, owner_name, owner_phone, username, package_name, status, max_groups, created_at, expires_at, notes
      FROM tenants
      ORDER BY expires_at DESC, id DESC
    `).all() as TenantRecord[];

    const now = new Date().getTime();
    const mapped = rows.map((row) => {
      const exp = new Date(row.expires_at).getTime();
      const created = new Date(row.created_at).getTime();
      const diffDays = Math.ceil((exp - now) / (1000 * 60 * 60 * 24));
      const durationDays = Math.max(1, Math.round((exp - created) / (1000 * 60 * 60 * 24)));

      let botStatus: 'online' | 'offline' = 'offline';
      try {
        const bot = getBotManager(row.tenant_id);
        if (bot && bot.status === 'connected') {
          botStatus = 'online';
        }
      } catch {
        botStatus = 'offline';
      }

      const effectiveStatus = resolveEffectiveTenantStatus(row.status, row.expires_at, now);
      if (effectiveStatus === 'expired' && row.status === 'active') {
        try {
          db.prepare("UPDATE tenants SET status = 'expired' WHERE tenant_id = ? AND status = 'active'").run(row.tenant_id);
        } catch {}
      }

      return {
        ...row,
        owner_phone: normalizeIndonesianPhone(row.owner_phone),
        days_remaining: diffDays > 0 ? diffDays : 0,
        duration_days: durationDays,
        bot_status: botStatus,
        status: effectiveStatus,
      };
    });

    return mapped.sort((a, b) => {
      if (a.status === 'active' && b.status !== 'active') return -1;
      if (a.status !== 'active' && b.status === 'active') return 1;
      return (b.days_remaining || 0) - (a.days_remaining || 0);
    });
  }

  static getTenant(tenantId: string): TenantRecord | null {
    const db = getMasterDb();
    const row = db.prepare(`
      SELECT id, tenant_id, store_name, owner_name, owner_phone, username, package_name, status, max_groups, created_at, expires_at, notes
      FROM tenants
      WHERE tenant_id = ?
    `).get(tenantId) as TenantRecord | undefined;

    if (!row) return null;

    const now = new Date().getTime();
    const exp = new Date(row.expires_at).getTime();
    const created = new Date(row.created_at).getTime();
    const diffDays = Math.ceil((exp - now) / (1000 * 60 * 60 * 24));
    const durationDays = Math.max(1, Math.round((exp - created) / (1000 * 60 * 60 * 24)));

    let botStatus: 'online' | 'offline' = 'offline';
    try {
      const bot = getBotManager(row.tenant_id);
      if (bot && bot.status === 'connected') {
        botStatus = 'online';
      }
    } catch {
      botStatus = 'offline';
    }

    const effectiveStatus = resolveEffectiveTenantStatus(row.status, row.expires_at, now);
    if (effectiveStatus === 'expired' && row.status === 'active') {
      try {
        db.prepare("UPDATE tenants SET status = 'expired' WHERE tenant_id = ? AND status = 'active'").run(row.tenant_id);
      } catch {}
    }

    return {
      ...row,
      status: effectiveStatus,
      owner_phone: normalizeIndonesianPhone(row.owner_phone),
      days_remaining: diffDays > 0 ? diffDays : 0,
      duration_days: durationDays,
      bot_status: botStatus,
    };
  }

  /**
   * Helper untuk menghitung tanggal kedaluwarsa berdasarkan jumlah dan satuan waktu
   */
  static calculateExpirationDate(baseDate: Date, amount: number, unit: string): Date {
    const val = Math.max(0, amount);
    const baseMs = baseDate.getTime();

    switch (unit) {
      case 'minutes':
        return new Date(baseMs + val * 60 * 1000);
      case 'hours':
        return new Date(baseMs + val * 60 * 60 * 1000);
      case 'weeks':
        return new Date(baseMs + val * 7 * 24 * 60 * 60 * 1000);
      case 'months': {
        const newDate = new Date(baseMs);
        newDate.setMonth(newDate.getMonth() + val);
        return newDate;
      }
      case 'days':
      default:
        return new Date(baseMs + val * 24 * 60 * 60 * 1000);
    }
  }

  static createTenant(input: CreateTenantInput): CreateTenantResult {
    const db = getMasterDb();
    const rawUsername = input.username?.trim();
    const username = rawUsername || generateStructuredUsername();
    const rawPassword = input.password?.trim();
    const password = rawPassword || generateRandomPassword();
    const passwordHash = hashPassword(password);

    const storeName = input.store_name?.trim() || '';
    const ownerName = input.owner_name?.trim() || '';
    const normalizedPhone = normalizeIndonesianPhone(input.owner_phone);
    const tenantId = input.tenant_id || generateCleanId(storeName || username);

    const createdAt = new Date();
    let expiresAt: Date;

    if (input.duration_value !== undefined && input.duration_unit) {
      expiresAt = this.calculateExpirationDate(createdAt, input.duration_value, input.duration_unit);
    } else {
      const duration = input.duration_days || 365;
      expiresAt = new Date(createdAt.getTime());
      expiresAt.setDate(expiresAt.getDate() + duration);
    }

    db.prepare(`
      INSERT INTO tenants (
        tenant_id, store_name, owner_name, owner_phone, username, password_hash, package_name, status, max_groups, created_at, expires_at, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      tenantId,
      storeName,
      ownerName,
      normalizedPhone,
      username,
      passwordHash,
      'Akses Penuh',
      'active',
      input.max_groups || 50,
      createdAt.toISOString(),
      expiresAt.toISOString(),
      input.notes || (storeName ? `Unit bot toko untuk ${storeName}` : `Unit bot tenant baru (${username})`)
    );

    initTenantDb(tenantId);

    const authFolder = path.resolve(process.cwd(), 'auth_info_baileys', `tenant_${tenantId}`);
    if (!fs.existsSync(authFolder)) {
      fs.mkdirSync(authFolder, { recursive: true });
    }

    const tenantRecord = this.getTenant(tenantId)!;
    return {
      ...tenantRecord,
      generated_username: username,
      generated_password: password,
    };
  }

  static extendDuration(tenantId: string, amount: number, unit: string = 'days', note?: string): TenantRecord {
    const db = getMasterDb();
    const tenant = this.getTenant(tenantId);
    if (!tenant) throw new Error('Tenant tidak ditemukan');

    const currentExp = new Date(tenant.expires_at).getTime();
    const now = new Date().getTime();
    const baseTime = currentExp > now ? currentExp : now;

    const newExp = this.calculateExpirationDate(new Date(baseTime), amount, unit);

    db.prepare(`
      UPDATE tenants
      SET expires_at = ?, status = 'active', warned_3d = 0, warned_1d = 0, warned_5h = 0, warned_1h = 0
      WHERE tenant_id = ?
    `).run(newExp.toISOString(), tenantId);

    db.prepare(`
      INSERT INTO subscription_logs (tenant_id, amount, days_added, note, created_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(tenantId, 0, amount, note || `Perpanjangan sewa +${amount} ${unit}`, new Date().toISOString());

    return this.getTenant(tenantId)!;
  }

  static resetPassword(tenantId: string, newPassword?: string): { tenant_id: string; username: string; new_password: string } {
    const db = getMasterDb();
    const tenant = this.getTenant(tenantId);
    if (!tenant) throw new Error('Tenant tidak ditemukan');

    const passwordToSet = newPassword && newPassword.trim().length > 0
      ? newPassword.trim()
      : generateRandomPassword();

    const passwordHash = hashPassword(passwordToSet);

    db.prepare(`
      UPDATE tenants
      SET password_hash = ?
      WHERE tenant_id = ?
    `).run(passwordHash, tenantId);

    return {
      tenant_id: tenantId,
      username: tenant.username,
      new_password: passwordToSet,
    };
  }

  static deleteTenant(tenantId: string): boolean {
    const db = getMasterDb();
    if (tenantId === 't_wanzt') {
      throw new Error('Tenant default "t_wanzt" tidak boleh dihapus.');
    }

    db.prepare('DELETE FROM tenants WHERE tenant_id = ?').run(tenantId);
    db.prepare('DELETE FROM subscription_logs WHERE tenant_id = ?').run(tenantId);

    deleteTenantDb(tenantId);

    const authFolder = path.resolve(process.cwd(), 'auth_info_baileys', `tenant_${tenantId}`);
    if (fs.existsSync(authFolder)) {
      fs.rmSync(authFolder, { recursive: true, force: true });
    }

    return true;
  }

  static getGlobalStats(): GlobalStats {
    const tenants = this.getAllTenants();
    const totalTenants = tenants.length;
    const activeTenants = tenants.filter((t) => t.status === 'active').length;
    const expiredTenants = tenants.filter((t) => t.status === 'expired').length;
    const suspendedTenants = tenants.filter((t) => t.status === 'suspended').length;

    return {
      totalTenants,
      activeTenants,
      expiredTenants,
      suspendedTenants,
      serverTime: new Date().toISOString(),
    };
  }

  static updateStoreInfo(tenantId: string, storeName: string, ownerName: string, ownerPhone: string): boolean {
    try {
      const db = getMasterDb();
      const normalizedPhone = normalizeIndonesianPhone(ownerPhone);
      const result = db.prepare(`
        UPDATE tenants
        SET store_name = ?, owner_name = ?, owner_phone = ?
        WHERE tenant_id = ?
      `).run(
        storeName ? storeName.trim() : '',
        ownerName ? ownerName.trim() : '',
        normalizedPhone,
        tenantId
      );
      return result.changes > 0;
    } catch (err: any) {
      console.error(`Gagal menyinkronkan store_info ke master.db untuk tenant ${tenantId}:`, err);
      return false;
    }
  }
}
