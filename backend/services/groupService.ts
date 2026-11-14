import { db } from '../database/sqlite.ts';

export interface GroupItem {
  id: string;
  subject: string;
  memberCount: number;
  creation?: number;
  owner?: string;
  desc?: string;
  enabled: boolean;
}

export function loadGroupsConfig(): Record<string, boolean> {
  try {
    const rows = db.prepare('SELECT group_id, enabled FROM group_whitelist').all() as {
      group_id: string;
      enabled: number;
    }[];

    const result: Record<string, boolean> = {};
    for (const row of rows) {
      result[row.group_id] = row.enabled === 1;
    }
    return result;
  } catch (err) {
    console.error('Gagal membaca whitelist grup dari SQLite:', err);
    return {};
  }
}

export function saveGroupsConfig(toggledGroups: Record<string, boolean>): void {
  try {
    const insertGroup = db.prepare(`
      INSERT OR REPLACE INTO group_whitelist (group_id, enabled, updated_at)
      VALUES (?, ?, ?)
    `);
    const now = new Date().toISOString();

    const insertMany = db.transaction((groups: Record<string, boolean>) => {
      for (const [gid, enabled] of Object.entries(groups)) {
        insertGroup.run(gid, enabled ? 1 : 0, now);
      }
    });

    insertMany(toggledGroups);
  } catch (err) {
    console.error('Gagal menyimpan whitelist grup ke SQLite:', err);
  }
}

export function setGroupToggle(groupId: string, enabled: boolean): Record<string, boolean> {
  try {
    const now = new Date().toISOString();
    db.prepare(`
      INSERT OR REPLACE INTO group_whitelist (group_id, enabled, updated_at)
      VALUES (?, ?, ?)
    `).run(groupId, enabled ? 1 : 0, now);

    return loadGroupsConfig();
  } catch (err) {
    console.error(`Gagal mengubah status toggle grup ${groupId} di SQLite:`, err);
    return loadGroupsConfig();
  }
}

function ensureBotSettingsTable(): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS bot_settings (
      setting_key TEXT PRIMARY KEY,
      setting_value TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);
}

export function loadGroupOnlySetting(): boolean {
  try {
    ensureBotSettingsTable();
    const row = db
      .prepare('SELECT setting_value FROM bot_settings WHERE setting_key = ?')
      .get('group_only') as { setting_value: string } | undefined;
    if (!row) return false; // Default OFF sesuai kesepakatan
    return row.setting_value === '1' || row.setting_value === 'true';
  } catch (err) {
    console.error('Gagal membaca pengaturan group_only dari SQLite:', err);
    return false;
  }
}

export function saveGroupOnlySetting(enabled: boolean): boolean {
  try {
    ensureBotSettingsTable();
    const now = new Date().toISOString();
    const val = enabled ? '1' : '0';
    db.prepare(`
      INSERT OR REPLACE INTO bot_settings (setting_key, setting_value, updated_at)
      VALUES ('group_only', ?, ?)
    `).run(val, now);
    return Boolean(enabled);
  } catch (err) {
    console.error('Gagal menyimpan pengaturan group_only ke SQLite:', err);
    return false;
  }
}

