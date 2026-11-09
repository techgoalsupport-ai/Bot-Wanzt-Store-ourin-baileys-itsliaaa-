import crypto from 'crypto';
import { getMasterDb, hashPassword } from '../database/masterSqlite.ts';

export const activeAdminTokens = new Set<string>();
export const impersonationTokens = new Map<string, { tenantId: string; expiresAt: number }>();

export class AdminAuthService {
  static login(username?: string, password?: string) {
    if (!username || !password) {
      throw new Error('Username dan password wajib diisi');
    }

    const db = getMasterDb();
    const admin = db.prepare('SELECT * FROM super_admins WHERE username = ?').get(username) as any;

    if (!admin || admin.password_hash !== hashPassword(password)) {
      throw new Error('Kredensial Super Admin tidak valid');
    }

    const token = crypto.randomBytes(32).toString('hex');
    activeAdminTokens.add(token);

    return {
      token,
      admin: {
        id: admin.id,
        username: admin.username,
        name: admin.name,
      },
    };
  }

  static verifyToken(token?: string): boolean {
    if (!token) return false;
    const cleanToken = token.replace('Bearer ', '').trim();
    return activeAdminTokens.has(cleanToken);
  }

  static createImpersonationToken(tenantId: string) {
    const impToken = crypto.randomBytes(24).toString('hex');
    impersonationTokens.set(impToken, {
      tenantId,
      expiresAt: Date.now() + 10 * 60 * 1000, // 10 menit
    });
    return impToken;
  }
}
