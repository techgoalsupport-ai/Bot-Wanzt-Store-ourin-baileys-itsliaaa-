import { getMasterDb } from '../database/masterSqlite.ts';
import { TenantService } from './tenantService.ts';
import { DurationUnit, LicenseToken } from '../types/admin.types.ts';

export class TokenService {
  /**
   * Generator Kode Token Lisensi 16 Karakter Terstruktur
   * Format: DDMM-XXXX-XXDA-XXXX (4 blok x 4 karakter = 16 karakter alfanumerik)
   * - Blok 1: DDMM (Tanggal & Bulan pembuatan token)
   * - Blok 2: 4 karakter acak alfanumerik
   * - Blok 3: Durasi (2 digit angka + 2 huruf kode unit: DA = Hari, MI = Menit, HO = Jam, MO = Bulan)
   * - Blok 4: 4 karakter acak alfanumerik
   */
  static generateTokenCode(amount: number, unit: DurationUnit, date: Date = new Date()): string {
    // 1. Blok 1: DDMM (contoh: 1211 untuk 12 November)
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const block1 = `${day}${month}`;

    // 2. Helper karakter acak
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    const getRandomBlock = (len: number = 4) => {
      let res = '';
      for (let i = 0; i < len; i++) {
        res += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      return res;
    };
    const block2 = getRandomBlock(4);

    // 3. Blok 3: 2 digit angka + 2 huruf kode unit resmi
    // Hari: DA, Menit: MI, Jam: HO, Bulan: MO
    let unitCode = 'DA';
    if (unit === 'minutes') unitCode = 'MI';
    else if (unit === 'hours') unitCode = 'HO';
    else if (unit === 'days') unitCode = 'DA';
    else if (unit === 'months') unitCode = 'MO';
    else if (unit === 'weeks') unitCode = 'DA'; // fallback jika minggu dikonversi

    // Pastikan 2 digit angka (01-99)
    const numPart = String(Math.min(99, Math.max(1, amount))).padStart(2, '0');
    const block3 = `${numPart}${unitCode}`;

    // 4. Blok 4: 4 karakter acak
    const block4 = getRandomBlock(4);

    return `${block1}-${block2}-${block3}-${block4}`;
  }

  /**
   * Helper format label durasi ramah pengguna
   */
  static getDurationLabel(amount: number, unit: DurationUnit): string {
    switch (unit) {
      case 'minutes':
        return `${amount} Menit`;
      case 'hours':
        return `${amount} Jam`;
      case 'days':
        return `${amount} Hari`;
      case 'months':
        return `${amount} Bulan`;
      default:
        return `${amount} Hari`;
    }
  }

  /**
   * Mengambil seluruh token yang tercatat di database
   */
  static getAllTokens(): LicenseToken[] {
    const db = getMasterDb();
    const rows = db.prepare(`
      SELECT
        id,
        token_code,
        amount,
        unit,
        duration_label,
        status,
        created_at,
        used_by_tenant_id,
        used_at
      FROM extension_tokens
      ORDER BY id DESC
    `).all() as any[];

    return rows.map((r) => ({
      id: String(r.id),
      token_code: r.token_code,
      amount: Number(r.amount),
      unit: r.unit as DurationUnit,
      duration_label: r.duration_label,
      status: r.status as 'available' | 'used' | 'revoked',
      created_at: r.created_at,
      used_by_tenant_id: r.used_by_tenant_id || undefined,
      used_at: r.used_at || undefined,
    }));
  }

  /**
   * Membuat token lisensi baru
   */
  static createToken(amount: number, unit: DurationUnit): LicenseToken {
    const db = getMasterDb();
    const durationLabel = this.getDurationLabel(amount, unit);

    let tokenCode = '';
    let isUnique = false;
    let attempts = 0;

    while (!isUnique && attempts < 10) {
      tokenCode = this.generateTokenCode(amount, unit);
      const exists = db.prepare('SELECT id FROM extension_tokens WHERE token_code = ?').get(tokenCode);
      if (!exists) {
        isUnique = true;
      }
      attempts++;
    }

    const now = new Date();
    const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
      now.getDate()
    ).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(
      now.getMinutes()
    ).padStart(2, '0')}`;

    const stmt = db.prepare(`
      INSERT INTO extension_tokens (token_code, amount, unit, duration_label, status, created_at)
      VALUES (?, ?, ?, ?, 'available', ?)
    `);

    const result = stmt.run(tokenCode, amount, unit, durationLabel, dateStr);

    return {
      id: String(result.lastInsertRowid),
      token_code: tokenCode,
      amount,
      unit,
      duration_label: durationLabel,
      status: 'available',
      created_at: dateStr,
    };
  }

  /**
   * Memproses penukaran (redeem) token oleh tenant toko
   * - Universal: dapat digunakan oleh seluruh tenant
   * - Single-use: hanya dapat digunakan 1 kali saja
   * - Menolak jika sudah pernah digunakan oleh tenant lain
   */
  static redeemToken(rawTokenCode: string, tenantId: string): {
    success: boolean;
    message: string;
    token?: LicenseToken;
    addedDuration?: string;
    newExpiresAt?: string;
    newDaysRemaining?: number;
    newTotalDays?: number;
  } {
    const db = getMasterDb();

    // Normalisasi token input (hapus spasi, uppercase)
    const normalizedInput = rawTokenCode.trim().toUpperCase();
    if (!normalizedInput) {
      return { success: false, message: 'Kode token voucher tidak boleh kosong.' };
    }

    // Dukung pencarian baik dengan strip maupun tanpa strip
    const cleanChars = normalizedInput.replace(/[^A-Z0-9]/g, '');
    let formattedWithHyphens = normalizedInput;
    if (cleanChars.length === 16 && !normalizedInput.includes('-')) {
      formattedWithHyphens = `${cleanChars.slice(0, 4)}-${cleanChars.slice(4, 8)}-${cleanChars.slice(8, 12)}-${cleanChars.slice(12, 16)}`;
    }

    // Cari token di database
    const tokenRow = db.prepare(`
      SELECT * FROM extension_tokens
      WHERE token_code = ? OR token_code = ?
    `).get(normalizedInput, formattedWithHyphens) as any;

    if (!tokenRow) {
      return {
        success: false,
        message: 'Kode token voucher tidak ditemukan. Pastikan format 16 karakter (XXXX-XXXX-XXXX-XXXX) sudah benar.',
      };
    }

    // Validasi status voucher
    if (tokenRow.status === 'used') {
      return {
        success: false,
        message: 'Token voucher ini sudah pernah digunakan dan tidak dapat digunakan kembali.',
      };
    }

    if (tokenRow.status === 'revoked') {
      return {
        success: false,
        message: 'Token voucher ini telah dicabut atau dinonaktifkan oleh Master Admin.',
      };
    }

    // Verifikasi keberadaan tenant
    const tenant = TenantService.getTenant(tenantId);
    if (!tenant) {
      return {
        success: false,
        message: `Unit toko bot dengan ID "${tenantId}" tidak ditemukan di database.`,
      };
    }

    if (tenant.status === 'suspended') {
      return {
        success: false,
        message: 'Akun toko sedang ditangguhkan (Suspended) oleh Master Admin. Silakan hubungi Master Admin untuk mengaktifkan akun.',
      };
    }

    // Eksekusi perpanjangan masa sewa tenant
    const amount = Number(tokenRow.amount);
    const unit = tokenRow.unit as DurationUnit;
    const note = `Redeem token voucher: ${tokenRow.token_code} (+${tokenRow.duration_label})`;

    const updatedTenant = TenantService.extendDuration(tenantId, amount, unit, note);

    // Update status token menjadi 'used'
    const now = new Date();
    const usedAtStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
      now.getDate()
    ).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(
      now.getMinutes()
    ).padStart(2, '0')}`;

    db.prepare(`
      UPDATE extension_tokens
      SET status = 'used', used_by_tenant_id = ?, used_at = ?
      WHERE id = ?
    `).run(tenantId, usedAtStr, tokenRow.id);

    const newDaysRemaining = updatedTenant.days_remaining ?? 0;
    const rawTotalDays = updatedTenant.duration_days ?? 30;
    const newTotalDays = Math.max(rawTotalDays, newDaysRemaining, 1);

    return {
      success: true,
      message: `Selamat! Voucher berhasil di-redeem. Masa aktif bot WhatsApp toko Anda bertambah ${tokenRow.duration_label}.`,
      token: {
        id: String(tokenRow.id),
        token_code: tokenRow.token_code,
        amount: Number(tokenRow.amount),
        unit: tokenRow.unit,
        duration_label: tokenRow.duration_label,
        status: 'used',
        created_at: tokenRow.created_at,
        used_by_tenant_id: tenantId,
        used_at: usedAtStr,
      },
      addedDuration: tokenRow.duration_label,
      newExpiresAt: updatedTenant.expires_at,
      newDaysRemaining,
      newTotalDays,
    };
  }

  /**
   * Menghapus atau mencabut token lisensi
   */
  static deleteToken(id: number | string): boolean {
    const db = getMasterDb();
    const result = db.prepare('DELETE FROM extension_tokens WHERE id = ?').run(id);
    return result.changes > 0;
  }
}
