import { getMasterDb } from '../database/masterSqlite.ts';
import {
  CollaboratorApiKey,
  CollaboratorLog,
  CreatePartnerKeyResult,
} from '../types/admin.types.ts';
import { generatePartnerApiKey, hashPartnerApiKey } from './partnerApiUtils.ts';

function formatTimestampNow(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(
    now.getMinutes()
  )}:${pad(now.getSeconds())}`;
}

export class PartnerApiService {
  static getAllKeys(): CollaboratorApiKey[] {
    const db = getMasterDb();
    const rows = db
      .prepare(
        `
      SELECT
        k.id,
        k.name,
        k.prefix_key,
        k.status,
        k.last_used_at,
        k.created_at,
        (SELECT COUNT(*) FROM collaborator_logs l WHERE l.collaborator_id = k.id) AS usage_count
      FROM collaborator_api_keys k
      ORDER BY k.id DESC
    `
      )
      .all() as any[];

    return rows.map((r) => ({
      id: Number(r.id),
      name: r.name,
      prefix_key: r.prefix_key,
      status: r.status === 'suspended' ? 'suspended' : 'active',
      last_used_at: r.last_used_at || null,
      created_at: r.created_at,
      usage_count: Number(r.usage_count || 0),
    }));
  }

  static createKey(name: string): CreatePartnerKeyResult {
    const cleanName = name.trim();
    if (!cleanName) {
      throw new Error('Nama partner / kolaborator wajib diisi.');
    }

    const db = getMasterDb();
    const { rawKey, keyHash, prefixKey } = generatePartnerApiKey();
    const createdAt = formatTimestampNow();

    const result = db
      .prepare(
        `
      INSERT INTO collaborator_api_keys (name, api_key_hash, prefix_key, status, last_used_at, created_at)
      VALUES (?, ?, ?, 'active', NULL, ?)
    `
      )
      .run(cleanName, keyHash, prefixKey, createdAt);

    return {
      key: {
        id: Number(result.lastInsertRowid),
        name: cleanName,
        prefix_key: prefixKey,
        status: 'active',
        last_used_at: null,
        created_at: createdAt,
        usage_count: 0,
      },
      raw_api_key: rawKey,
    };
  }

  static toggleKeyStatus(id: number | string, status?: 'active' | 'suspended'): CollaboratorApiKey | null {
    const db = getMasterDb();
    const existing = db
      .prepare('SELECT id, name, prefix_key, status, last_used_at, created_at FROM collaborator_api_keys WHERE id = ?')
      .get(id) as any;

    if (!existing) return null;

    const nextStatus: 'active' | 'suspended' =
      status || (existing.status === 'active' ? 'suspended' : 'active');

    db.prepare('UPDATE collaborator_api_keys SET status = ? WHERE id = ?').run(nextStatus, id);

    const usageRow = db
      .prepare('SELECT COUNT(*) as count FROM collaborator_logs WHERE collaborator_id = ?')
      .get(id) as { count: number };

    return {
      id: Number(existing.id),
      name: existing.name,
      prefix_key: existing.prefix_key,
      status: nextStatus,
      last_used_at: existing.last_used_at || null,
      created_at: existing.created_at,
      usage_count: Number(usageRow?.count || 0),
    };
  }

  static deleteKey(id: number | string): boolean {
    const db = getMasterDb();
    const result = db.prepare('DELETE FROM collaborator_api_keys WHERE id = ?').run(id);
    if (result.changes > 0) {
      db.prepare('DELETE FROM collaborator_logs WHERE collaborator_id = ?').run(id);
      return true;
    }
    return false;
  }

  static verifyRawKey(rawKey: string): {
    valid: boolean;
    reason?: 'invalid' | 'suspended';
    partner?: { id: number; name: string; prefix_key: string; status: 'active' | 'suspended' };
  } {
    const db = getMasterDb();
    const keyHash = hashPartnerApiKey(rawKey);
    const row = db
      .prepare('SELECT id, name, prefix_key, status FROM collaborator_api_keys WHERE api_key_hash = ?')
      .get(keyHash) as any;

    if (!row) {
      return { valid: false, reason: 'invalid' };
    }

    if (row.status !== 'active') {
      return {
        valid: false,
        reason: 'suspended',
        partner: {
          id: Number(row.id),
          name: row.name,
          prefix_key: row.prefix_key,
          status: 'suspended',
        },
      };
    }

    return {
      valid: true,
      partner: {
        id: Number(row.id),
        name: row.name,
        prefix_key: row.prefix_key,
        status: 'active',
      },
    };
  }

  static recordUsage(params: {
    collaboratorId: number;
    collaboratorName: string;
    actionType: 'create_tenant' | 'create_token';
    targetId: string;
    durationLabel: string;
    requestIp: string;
  }): void {
    const db = getMasterDb();
    const nowStr = formatTimestampNow();

    db.prepare('UPDATE collaborator_api_keys SET last_used_at = ? WHERE id = ?').run(
      nowStr,
      params.collaboratorId
    );

    db.prepare(
      `
      INSERT INTO collaborator_logs (
        collaborator_id,
        collaborator_name,
        action_type,
        target_id,
        duration_label,
        request_ip,
        created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `
    ).run(
      params.collaboratorId,
      params.collaboratorName,
      params.actionType,
      params.targetId,
      params.durationLabel,
      params.requestIp,
      nowStr
    );
  }

  static getRecentLogs(limit: number = 100): CollaboratorLog[] {
    const db = getMasterDb();
    const safeLimit = Math.max(1, Math.min(500, limit));
    const rows = db
      .prepare(
        `
      SELECT id, collaborator_id, collaborator_name, action_type, target_id, duration_label, request_ip, created_at
      FROM collaborator_logs
      ORDER BY id DESC
      LIMIT ?
    `
      )
      .all(safeLimit) as any[];

    return rows.map((r) => ({
      id: Number(r.id),
      collaborator_id: Number(r.collaborator_id),
      collaborator_name: r.collaborator_name,
      action_type: r.action_type === 'create_token' ? 'create_token' : 'create_tenant',
      target_id: r.target_id,
      duration_label: r.duration_label,
      request_ip: r.request_ip || '-',
      created_at: r.created_at,
    }));
  }
}
