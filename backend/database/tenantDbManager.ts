import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { getMasterDb } from '../../admin-backend/database/masterSqlite.ts';

const TENANTS_DIR = path.resolve(process.cwd(), 'database', 'tenants');
const DEFAULT_BOT_DB = path.resolve(process.cwd(), 'database', 'bot.db');

const tenantConnections = new Map<string, Database.Database>();

export function getTenantDbPath(tenantId: string): string {
  if (!fs.existsSync(TENANTS_DIR)) {
    fs.mkdirSync(TENANTS_DIR, { recursive: true });
  }
  const cleanId = tenantId.replace(/[^a-zA-Z0-9_-]/g, '');
  return path.resolve(TENANTS_DIR, `${cleanId}.db`);
}

/**
 * Memeriksa dan memperbarui kolom skema jika database berasal dari versi lama
 */
export function migrateTenantDb(db: Database.Database): void {
  const getCols = (tbl: string): string[] => {
    try {
      const rows = db.pragma(`table_info(${tbl})`) as Array<{ name: string }>;
      return rows.map((r) => r.name);
    } catch {
      return [];
    }
  };

  // 1. Migrasi pricing_config (dari mode/value ke pricing_mode/pricing_value)
  const pricingCols = getCols('pricing_config');
  if (pricingCols.length > 0) {
    if (!pricingCols.includes('pricing_mode')) {
      try {
        db.exec("ALTER TABLE pricing_config ADD COLUMN pricing_mode TEXT DEFAULT 'rp'");
      } catch {}
    }
    if (!pricingCols.includes('pricing_value')) {
      try {
        db.exec("ALTER TABLE pricing_config ADD COLUMN pricing_value REAL DEFAULT 100");
      } catch {}
    }
    if (pricingCols.includes('mode')) {
      try {
        db.exec("UPDATE pricing_config SET pricing_mode = mode WHERE mode IS NOT NULL");
      } catch {}
    }
    if (pricingCols.includes('value')) {
      try {
        db.exec("UPDATE pricing_config SET pricing_value = value WHERE value IS NOT NULL");
      } catch {}
    }
  }

  // 2. Migrasi commands_config (dari command_name ke command_type)
  const cmdCols = getCols('commands_config');
  if (cmdCols.length > 0 && !cmdCols.includes('command_type') && cmdCols.includes('command_name')) {
    try {
      db.exec(`
        CREATE TABLE IF NOT EXISTS commands_config_new (
          command_type TEXT PRIMARY KEY,
          config_data TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );
        INSERT OR IGNORE INTO commands_config_new (command_type, config_data, updated_at)
        SELECT command_name, config_data, updated_at FROM commands_config;
        DROP TABLE commands_config;
        ALTER TABLE commands_config_new RENAME TO commands_config;
      `);
    } catch (e) {
      console.error('[Tenant DB] Error migrasi commands_config:', e);
    }
  }

  // 3. Migrasi group_whitelist (dari group_jid ke group_id)
  const groupCols = getCols('group_whitelist');
  if (groupCols.length > 0 && !groupCols.includes('group_id') && groupCols.includes('group_jid')) {
    try {
      db.exec(`
        CREATE TABLE IF NOT EXISTS group_whitelist_new (
          group_id TEXT PRIMARY KEY,
          enabled INTEGER NOT NULL DEFAULT 1,
          updated_at TEXT NOT NULL
        );
        INSERT OR IGNORE INTO group_whitelist_new (group_id, enabled, updated_at)
        SELECT group_jid, CASE WHEN is_active = 1 THEN 1 ELSE 0 END, COALESCE(updated_at, datetime('now')) FROM group_whitelist;
        DROP TABLE group_whitelist;
        ALTER TABLE group_whitelist_new RENAME TO group_whitelist;
      `);
    } catch (e) {
      console.error('[Tenant DB] Error migrasi group_whitelist:', e);
    }
  }

  // 4. Migrasi promo_codes (dari discount_type/min_transaction ke discount_mode/min_spend)
  const promoCols = getCols('promo_codes');
  if (promoCols.length > 0 && !promoCols.includes('discount_mode')) {
    try {
      db.exec(`
        CREATE TABLE IF NOT EXISTS promo_codes_new (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          code TEXT UNIQUE NOT NULL COLLATE NOCASE,
          discount_mode TEXT NOT NULL DEFAULT 'rp',
          discount_value REAL NOT NULL DEFAULT 0,
          min_spend INTEGER DEFAULT 0,
          quota INTEGER DEFAULT NULL,
          used_count INTEGER NOT NULL DEFAULT 0,
          valid_until TEXT DEFAULT NULL,
          is_forever INTEGER NOT NULL DEFAULT 0,
          scope_type TEXT NOT NULL DEFAULT 'all',
          is_active INTEGER NOT NULL DEFAULT 1,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );
        INSERT OR IGNORE INTO promo_codes_new (id, code, discount_mode, discount_value, min_spend, quota, used_count, valid_until, is_forever, scope_type, is_active, created_at, updated_at)
        SELECT 
          id, 
          code, 
          COALESCE(discount_type, 'rp'), 
          COALESCE(discount_value, 0), 
          COALESCE(min_transaction, 0), 
          quota, 
          COALESCE(used_count, 0), 
          expires_at, 
          CASE WHEN expires_at IS NULL THEN 1 ELSE 0 END, 
          'all', 
          COALESCE(is_active, 1), 
          COALESCE(created_at, datetime('now')), 
          COALESCE(created_at, datetime('now'))
        FROM promo_codes;
        DROP TABLE promo_codes;
        ALTER TABLE promo_codes_new RENAME TO promo_codes;
      `);
    } catch (e) {
      console.error('[Tenant DB] Error migrasi promo_codes:', e);
    }
  }

  // 5. Migrasi store_info (kolom telegram_bot dan wa_link)
  const storeCols = getCols('store_info');
  if (storeCols.length > 0) {
    if (!storeCols.includes('telegram_bot')) {
      try { db.exec("ALTER TABLE store_info ADD COLUMN telegram_bot TEXT DEFAULT ''"); } catch {}
    }
    if (!storeCols.includes('wa_link')) {
      try { db.exec("ALTER TABLE store_info ADD COLUMN wa_link TEXT DEFAULT ''"); } catch {}
    }
  }

  // 6. Migrasi transactions (kolom unique_code dan trx_id)
  const trxCols = getCols('transactions');
  if (trxCols.length > 0) {
    if (!trxCols.includes('unique_code')) {
      try { db.exec("ALTER TABLE transactions ADD COLUMN unique_code INTEGER NOT NULL DEFAULT 0"); } catch {}
    }
    if (!trxCols.includes('trx_id')) {
      try { db.exec("ALTER TABLE transactions ADD COLUMN trx_id TEXT"); } catch {}
    }
  }

  // 7. Migrasi telegram_config
  try {
    db.exec(`
      CREATE TABLE IF NOT EXISTS telegram_config (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        bot_token TEXT DEFAULT '',
        chat_id TEXT DEFAULT '',
        notif_enabled INTEGER DEFAULT 0,
        admin_disabled INTEGER DEFAULT 0,
        updated_at TEXT NOT NULL
      );
    `);
    const teleRow = db.prepare('SELECT id FROM telegram_config WHERE id = 1').get();
    if (!teleRow) {
      db.prepare(`
        INSERT INTO telegram_config (id, bot_token, chat_id, notif_enabled, admin_disabled, updated_at)
        VALUES (1, '', '', 0, 0, datetime('now'))
      `).run();
    }
  } catch {}

  // 8. Migrasi tabel bot_settings (untuk group_only)
  try {
    db.exec(`
      CREATE TABLE IF NOT EXISTS bot_settings (
        setting_key TEXT PRIMARY KEY,
        setting_value TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `);
  } catch {}
}

/**
 * Menginisialisasi seluruh skema tabel lengkap pada database tenant
 */
export function initTenantDbTables(db: Database.Database, tenantId: string): void {
  // Jalankan migrasi kompatibilitas terlebih dahulu untuk database lama
  migrateTenantDb(db);

  const now = new Date().toISOString();

  // 1. Tabel Auth (Kredensial Admin Toko)
  db.exec(`
    CREATE TABLE IF NOT EXISTS auth (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      username TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      salt TEXT NOT NULL,
      iterations INTEGER NOT NULL DEFAULT 100000,
      updated_at TEXT NOT NULL
    );
  `);

  // 2. Tabel Store Info (Profil Toko, Owner, Admin)
  db.exec(`
    CREATE TABLE IF NOT EXISTS store_info (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      store_name TEXT NOT NULL DEFAULT '',
      owner_name TEXT NOT NULL DEFAULT '',
      owner_number TEXT NOT NULL DEFAULT '',
      admin_name TEXT DEFAULT '',
      admin_number TEXT DEFAULT '',
      web_link TEXT DEFAULT '',
      telegram_bot TEXT DEFAULT '',
      wa_link TEXT DEFAULT '',
      updated_at TEXT NOT NULL
    );
  `);

  // 3. Tabel API Config (Kredensial LunasQRIS & Xaviera)
  db.exec(`
    CREATE TABLE IF NOT EXISTS api_config (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      lunas_api_key TEXT DEFAULT '',
      lunas_secret_key TEXT DEFAULT '',
      lunas_base_url TEXT DEFAULT '',
      lunas_default_fee INTEGER DEFAULT 0,
      xaviera_api_key TEXT DEFAULT '',
      xaviera_secret_key TEXT DEFAULT '',
      xaviera_base_url TEXT DEFAULT '',
      xaviera_markup_percent REAL DEFAULT 10,
      updated_at TEXT NOT NULL
    );
  `);

  // 4. Tabel Commands Config (Menu, List, Carousel, Invoice, Confirmation templates & buttons)
  db.exec(`
    CREATE TABLE IF NOT EXISTS commands_config (
      command_type TEXT PRIMARY KEY,
      config_data TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);

  // 5. Tabel Whitelist Grup WhatsApp
  db.exec(`
    CREATE TABLE IF NOT EXISTS group_whitelist (
      group_id TEXT PRIMARY KEY,
      enabled INTEGER NOT NULL DEFAULT 1,
      updated_at TEXT NOT NULL
    );
  `);

  // 5b. Tabel Pengaturan Bot Umum (contoh: group_only)
  db.exec(`
    CREATE TABLE IF NOT EXISTS bot_settings (
      setting_key TEXT PRIMARY KEY,
      setting_value TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);

  // 6. Tabel Riwayat Transaksi (ACID, Indexed)
  db.exec(`
    CREATE TABLE IF NOT EXISTS transactions (
      id TEXT PRIMARY KEY,
      order_id TEXT UNIQUE NOT NULL,
      trx_id TEXT,
      customer_number TEXT NOT NULL,
      customer_name TEXT,
      product_name TEXT NOT NULL,
      variant_name TEXT NOT NULL,
      nominal INTEGER NOT NULL,
      unique_code INTEGER NOT NULL DEFAULT 0,
      total INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      payment_url TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_transactions_order_id ON transactions (order_id);
    CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions (status);
    CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions (created_at DESC);
  `);

  // 7. Tabel Pengaturan Harga Produk (Markup Margin Rp atau %)
  db.exec(`
    CREATE TABLE IF NOT EXISTS pricing_config (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      pricing_mode TEXT NOT NULL DEFAULT 'rp',
      pricing_value REAL NOT NULL DEFAULT 100,
      updated_at TEXT NOT NULL
    );
  `);

  const pricingRow = db.prepare('SELECT id FROM pricing_config WHERE id = 1').get();
  if (!pricingRow) {
    db.prepare(`
      INSERT INTO pricing_config (id, pricing_mode, pricing_value, updated_at)
      VALUES (1, 'rp', 100, ?)
    `).run(now);
  }

  // 7b. Tabel Pengaturan Harga per Kategori Khusus (SMM & TopUp)
  db.exec(`
    CREATE TABLE IF NOT EXISTS category_pricing (
      category TEXT PRIMARY KEY,
      pricing_mode TEXT NOT NULL DEFAULT 'rp',
      pricing_value REAL NOT NULL DEFAULT 100,
      updated_at TEXT NOT NULL
    );
  `);

  const smmRow = db.prepare('SELECT category FROM category_pricing WHERE category = ?').get('smm');
  if (!smmRow) {
    db.prepare(`
      INSERT INTO category_pricing (category, pricing_mode, pricing_value, updated_at)
      VALUES ('smm', 'rp', 100, ?)
    `).run(now);
  }
  const topupRow = db.prepare('SELECT category FROM category_pricing WHERE category = ?').get('topup');
  if (!topupRow) {
    db.prepare(`
      INSERT INTO category_pricing (category, pricing_mode, pricing_value, updated_at)
      VALUES ('topup', 'rp', 100, ?)
    `).run(now);
  }

  // 8. Tabel Pengaturan Harga Custom per-Varian Produk
  db.exec(`
    CREATE TABLE IF NOT EXISTS variant_pricing (
      variant_id TEXT PRIMARY KEY,
      product_name TEXT DEFAULT '',
      variant_name TEXT DEFAULT '',
      pricing_type TEXT NOT NULL DEFAULT 'general',
      pricing_mode TEXT NOT NULL DEFAULT 'rp',
      pricing_value REAL NOT NULL DEFAULT 100,
      updated_at TEXT NOT NULL
    );
  `);

  // 9. Tabel Kupon Promo (Khusus Produk APK Premium)
  db.exec(`
    CREATE TABLE IF NOT EXISTS promo_codes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT UNIQUE NOT NULL COLLATE NOCASE,
      discount_mode TEXT NOT NULL DEFAULT 'rp',
      discount_value REAL NOT NULL DEFAULT 0,
      min_spend INTEGER DEFAULT 0,
      quota INTEGER DEFAULT NULL,
      used_count INTEGER NOT NULL DEFAULT 0,
      valid_until TEXT DEFAULT NULL,
      is_forever INTEGER NOT NULL DEFAULT 0,
      scope_type TEXT NOT NULL DEFAULT 'all',
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS promo_code_variants (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      promo_id INTEGER NOT NULL,
      variant_id TEXT NOT NULL,
      product_name TEXT DEFAULT '',
      variant_name TEXT DEFAULT '',
      FOREIGN KEY (promo_id) REFERENCES promo_codes(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_promo_code ON promo_codes(code);
    CREATE INDEX IF NOT EXISTS idx_promo_variants ON promo_code_variants(promo_id);
  `);

  // 10. Tabel Konfigurasi Notifikasi Telegram Bot
  db.exec(`
    CREATE TABLE IF NOT EXISTS telegram_config (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      bot_token TEXT DEFAULT '',
      chat_id TEXT DEFAULT '',
      notif_enabled INTEGER DEFAULT 0,
      admin_disabled INTEGER DEFAULT 0,
      updated_at TEXT NOT NULL
    );
  `);

  try {
    const teleRow = db.prepare('SELECT id FROM telegram_config WHERE id = 1').get();
    if (!teleRow) {
      db.prepare(`
        INSERT INTO telegram_config (id, bot_token, chat_id, notif_enabled, admin_disabled, updated_at)
        VALUES (1, '', '', 0, 0, ?)
      `).run(now);
    }
  } catch (err) {
    console.error('[Tenant DB] Error inisialisasi telegram_config:', err);
  }

  // Seed data awal dari master.db jika ada data penyewa unit apartemen
  try {
    const storeRow = db.prepare('SELECT id FROM store_info WHERE id = 1').get();
    if (!storeRow) {
      let initStoreName = '';
      let initOwnerName = '';
      let initOwnerPhone = '';

      try {
        const masterDb = getMasterDb();
        const tenantMaster = masterDb.prepare('SELECT * FROM tenants WHERE tenant_id = ?').get(tenantId) as any;
        if (tenantMaster) {
          initStoreName = tenantMaster.store_name || '';
          initOwnerName = tenantMaster.owner_name || '';
          initOwnerPhone = tenantMaster.owner_phone || '';
        }
      } catch {}

      db.prepare(`
        INSERT INTO store_info (id, store_name, owner_name, owner_number, updated_at)
        VALUES (1, ?, ?, ?, ?)
      `).run(initStoreName, initOwnerName, initOwnerPhone, now);
    }
  } catch {}
}

export function initTenantDb(tenantId: string): Database.Database {
  if (tenantConnections.has(tenantId)) {
    return tenantConnections.get(tenantId)!;
  }

  const dbPath = getTenantDbPath(tenantId);

  // Jika ini t_wanzt dan file belum ada, namun bot.db lama ada di root database, salin datanya
  if (tenantId === 't_wanzt' && !fs.existsSync(dbPath) && fs.existsSync(DEFAULT_BOT_DB)) {
    try {
      fs.copyFileSync(DEFAULT_BOT_DB, dbPath);
      console.log(`[Tenant DB] Berhasil menyalin data bot.db ke ${dbPath}`);
    } catch (err) {
      console.error('[Tenant DB] Gagal menyalin bot.db ke t_wanzt.db:', err);
    }
  }

  const db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('busy_timeout = 5000');
  db.pragma('foreign_keys = ON');

  // Jalankan skema tabel lengkap
  initTenantDbTables(db, tenantId);

  tenantConnections.set(tenantId, db);
  return db;
}

export function getTenantDb(tenantId: string = 't_wanzt'): Database.Database {
  const cleanId = (tenantId || 't_wanzt').trim();
  if (tenantConnections.has(cleanId)) {
    return tenantConnections.get(cleanId)!;
  }
  return initTenantDb(cleanId);
}

export function deleteTenantDb(tenantId: string): void {
  const cleanId = (tenantId || '').trim();
  const db = tenantConnections.get(cleanId);
  if (db) {
    try {
      db.close();
    } catch {
      // ignore
    }
    tenantConnections.delete(cleanId);
  }

  const dbPath = getTenantDbPath(cleanId);
  if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath);
  if (fs.existsSync(`${dbPath}-wal`)) fs.unlinkSync(`${dbPath}-wal`);
  if (fs.existsSync(`${dbPath}-shm`)) fs.unlinkSync(`${dbPath}-shm`);
}
