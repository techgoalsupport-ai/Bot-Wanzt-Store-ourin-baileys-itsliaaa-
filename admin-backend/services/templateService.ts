import { getMasterDb } from '../database/masterSqlite.ts';

export type TemplateCategory =
  | 'menu'
  | 'list'
  | 'carousel'
  | 'invoice'
  | 'confirm_summary'
  | 'confirm_promo_input'
  | 'confirm_promo_valid'
  | 'confirm_promo_invalid'
  | 'payment_success_dm'
  | 'payment_success_group'
  | 'payment_expired'
  | 'payment_error'
  | 'order_group_notif'
  | 'stock_empty'
  | 'checkout_session_expired'
  | 'promo_cancelled'
  | 'contact_owner_empty'
  | 'contact_admin_empty'
  | 'expiry_warning_owner'
  | 'confirmation';

export interface MessageTemplateRecord {
  id: number;
  name: string;
  category: TemplateCategory;
  content: string;
  is_active: number;
  created_at: string;
  updated_at: string;
}

export interface CreateTemplateInput {
  name: string;
  category: TemplateCategory;
  content: string;
  is_active?: boolean | number;
}

export interface UpdateTemplateInput {
  name?: string;
  category?: TemplateCategory;
  content?: string;
  is_active?: boolean | number;
}

export class TemplateService {
  /**
   * Mengambil semua template (untuk Master Admin)
   */
  static getAllTemplates(category?: string): MessageTemplateRecord[] {
    const db = getMasterDb();
    if (category && category !== 'all') {
      return db
        .prepare('SELECT * FROM message_templates WHERE category = ? ORDER BY id DESC')
        .all(category) as MessageTemplateRecord[];
    }
    return db
      .prepare('SELECT * FROM message_templates ORDER BY id DESC')
      .all() as MessageTemplateRecord[];
  }

  /**
   * Mengambil template yang aktif berdasarkan kategori spesifik (untuk Dashboard Bot Tenant)
   */
  static getActiveTemplatesByCategory(category: string): MessageTemplateRecord[] {
    const db = getMasterDb();
    if (category === 'confirm_summary') {
      return db
        .prepare('SELECT * FROM message_templates WHERE (category = ? OR category = ?) AND is_active = 1 ORDER BY id DESC')
        .all('confirm_summary', 'confirmation') as MessageTemplateRecord[];
    }
    return db
      .prepare('SELECT * FROM message_templates WHERE category = ? AND is_active = 1 ORDER BY id DESC')
      .all(category) as MessageTemplateRecord[];
  }

  /**
   * Mengambil detail template berdasarkan ID
   */
  static getTemplateById(id: number): MessageTemplateRecord | null {
    const db = getMasterDb();
    const row = db.prepare('SELECT * FROM message_templates WHERE id = ?').get(id);
    return (row as MessageTemplateRecord) || null;
  }

  /**
   * Menambahkan template baru
   */
  static createTemplate(input: CreateTemplateInput): MessageTemplateRecord {
    const db = getMasterDb();
    const now = new Date().toISOString();
    const isActive = input.is_active === false || input.is_active === 0 ? 0 : 1;

    const info = db.prepare(`
      INSERT INTO message_templates (name, category, content, is_active, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      input.name.trim(),
      input.category,
      input.content.trim(),
      isActive,
      now,
      now
    );

    return this.getTemplateById(Number(info.lastInsertRowid))!;
  }

  /**
   * Memperbarui template yang sudah ada
   */
  static updateTemplate(id: number, input: UpdateTemplateInput): MessageTemplateRecord | null {
    const db = getMasterDb();
    const existing = this.getTemplateById(id);
    if (!existing) return null;

    const name = input.name !== undefined ? input.name.trim() : existing.name;
    const category = input.category !== undefined ? input.category : existing.category;
    const content = input.content !== undefined ? input.content.trim() : existing.content;
    const isActive = input.is_active !== undefined
      ? (input.is_active === true || input.is_active === 1 ? 1 : 0)
      : existing.is_active;
    const now = new Date().toISOString();

    db.prepare(`
      UPDATE message_templates
      SET name = ?, category = ?, content = ?, is_active = ?, updated_at = ?
      WHERE id = ?
    `).run(name, category, content, isActive, now, id);

    return this.getTemplateById(id);
  }

  /**
   * Mengubah status aktif / nonaktif template
   */
  static toggleTemplateStatus(id: number, explicitStatus?: boolean): MessageTemplateRecord | null {
    const db = getMasterDb();
    const existing = this.getTemplateById(id);
    if (!existing) return null;

    const newStatus = explicitStatus !== undefined
      ? (explicitStatus ? 1 : 0)
      : (existing.is_active === 1 ? 0 : 1);
    const now = new Date().toISOString();

    db.prepare(`
      UPDATE message_templates
      SET is_active = ?, updated_at = ?
      WHERE id = ?
    `).run(newStatus, now, id);

    return this.getTemplateById(id);
  }

  /**
   * Menghapus template
   */
  static deleteTemplate(id: number): boolean {
    const db = getMasterDb();
    const info = db.prepare('DELETE FROM message_templates WHERE id = ?').run(id);
    return info.changes > 0;
  }
}
