import crypto from 'crypto';
import { getMasterDb } from '../database/masterSqlite.ts';
import {
  DEFAULT_MASTER_ADMIN_NAME,
  DEFAULT_MASTER_ADMIN_PHONE,
  MasterAdminContactInput,
  MasterAdminContactRecord,
  pickWeightedMasterAdmin,
  toCleanWaDigits,
  validateMasterAdminList,
} from './masterAdminUtils.ts';

function ensureMasterAdminsTable(): void {
  const db = getMasterDb();
  db.exec(`
    CREATE TABLE IF NOT EXISTS master_admins (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      phone TEXT NOT NULL,
      weight INTEGER NOT NULL DEFAULT 100,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);

  const row = db.prepare('SELECT COUNT(*) as count FROM master_admins').get() as { count: number };
  if (row.count === 0) {
    const nowIso = new Date().toISOString();
    db.prepare(`
      INSERT INTO master_admins (name, phone, weight, sort_order, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(DEFAULT_MASTER_ADMIN_NAME, DEFAULT_MASTER_ADMIN_PHONE, 100, 0, nowIso, nowIso);
  }
}

function cryptoRandomFloat(): number {
  return crypto.randomInt(0, 1000000) / 1000000;
}

export class MasterAdminContactService {
  static getAllMasterAdmins(): MasterAdminContactRecord[] {
    ensureMasterAdminsTable();
    const db = getMasterDb();
    const rows = db
      .prepare('SELECT * FROM master_admins ORDER BY sort_order ASC, id ASC')
      .all() as any[];

    return rows.map((row) => ({
      id: Number(row.id),
      name: String(row.name || DEFAULT_MASTER_ADMIN_NAME),
      phone: String(row.phone || DEFAULT_MASTER_ADMIN_PHONE),
      cleanPhone: toCleanWaDigits(String(row.phone || DEFAULT_MASTER_ADMIN_PHONE)),
      weight: Number(row.weight ?? 0),
      sort_order: Number(row.sort_order ?? 0),
      created_at: String(row.created_at || ''),
      updated_at: String(row.updated_at || ''),
    }));
  }

  static saveMasterAdmins(items: MasterAdminContactInput[]): MasterAdminContactRecord[] {
    ensureMasterAdminsTable();
    const validation = validateMasterAdminList(items);
    if (!validation.valid) {
      throw new Error(validation.error || 'Data kontak Master Admin tidak valid.');
    }

    const db = getMasterDb();
    const nowIso = new Date().toISOString();

    const tx = db.transaction((normalized: { name: string; phone: string; weight: number }[]) => {
      db.prepare('DELETE FROM master_admins').run();
      const insertStmt = db.prepare(`
        INSERT INTO master_admins (name, phone, weight, sort_order, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `);
      normalized.forEach((item, index) => {
        insertStmt.run(item.name, item.phone, item.weight, index, nowIso, nowIso);
      });
    });

    tx(validation.normalizedItems);
    return this.getAllMasterAdmins();
  }

  static pickRandomMasterAdmin(): MasterAdminContactRecord {
    const admins = this.getAllMasterAdmins();
    const picked = pickWeightedMasterAdmin(admins, cryptoRandomFloat);
    return {
      ...picked,
      cleanPhone: toCleanWaDigits(picked.phone),
    };
  }
}
