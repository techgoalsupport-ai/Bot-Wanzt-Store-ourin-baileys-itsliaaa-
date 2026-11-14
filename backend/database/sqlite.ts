import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';

function resolveDatabasePath(): string {
  const rootDbDir = path.resolve(process.cwd(), 'database');
  const backendDbDir = path.resolve(process.cwd(), 'backend', 'database');
  const targetDir = fs.existsSync(rootDbDir) ? rootDbDir : (fs.existsSync(backendDbDir) ? backendDbDir : rootDbDir);

  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  return path.join(targetDir, 'bot.db');
}

import { getActiveTenantId } from './tenantContext.ts';
import { getTenantDb, initTenantDb, migrateTenantDb } from './tenantDbManager.ts';

export const DB_PATH = resolveDatabasePath();

// Dynamic Proxy: Setiap pemanggilan method db (prepare, exec, transaction, dsb.)
// otomatis dialihkan ke file SQLite milik tenant yang sedang aktif (/database/tenants/{tenantId}.db)
export const db: InstanceType<typeof Database> = new Proxy({} as InstanceType<typeof Database>, {
  get(_target, prop) {
    const tenantId = getActiveTenantId();
    const activeDb = getTenantDb(tenantId);
    const value = (activeDb as any)[prop];
    if (typeof value === 'function') {
      return value.bind(activeDb);
    }
    return value;
  },
});

/**
 * Inisialisasi skema tabel SQLite & migrasi otomatis dari file JSON lama (jika ada)
 */
export function initDatabase(): void {
  // Jalankan migrasi kompatibilitas terlebih dahulu jika database lama masih menggunakan nama kolom versi terdahulu
  try {
    migrateTenantDb(db);
  } catch {}

  // 1. Tabel Auth (Kredensial Admin)
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

  // 4. Tabel Commands Config (Menu, List, Carousel, Invoice templates & buttons)
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

  // Inisialisasi baris default pricing_config jika belum ada
  const pricingRow = db.prepare('SELECT id FROM pricing_config WHERE id = 1').get();
  if (!pricingRow) {
    db.prepare(`
      INSERT INTO pricing_config (id, pricing_mode, pricing_value, updated_at)
      VALUES (1, 'rp', 100, ?)
    `).run(new Date().toISOString());
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

  // Inisialisasi baris default untuk smm dan topup jika belum ada
  const smmRow = db.prepare('SELECT category FROM category_pricing WHERE category = ?').get('smm');
  if (!smmRow) {
    db.prepare(`
      INSERT INTO category_pricing (category, pricing_mode, pricing_value, updated_at)
      VALUES ('smm', 'rp', 100, ?)
    `).run(new Date().toISOString());
  }
  const topupRow = db.prepare('SELECT category FROM category_pricing WHERE category = ?').get('topup');
  if (!topupRow) {
    db.prepare(`
      INSERT INTO category_pricing (category, pricing_mode, pricing_value, updated_at)
      VALUES ('topup', 'rp', 100, ?)
    `).run(new Date().toISOString());
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

  // 10. Tabel Apartemen (Multi-Tenant Units)
  db.exec(`
    CREATE TABLE IF NOT EXISTS tenants (
      id TEXT PRIMARY KEY,
      unit_number TEXT NOT NULL,
      name TEXT NOT NULL,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      salt TEXT NOT NULL,
      phone_number TEXT DEFAULT '',
      plan_name TEXT NOT NULL DEFAULT 'Standard',
      status TEXT NOT NULL DEFAULT 'active',
      start_date TEXT NOT NULL,
      expired_date TEXT NOT NULL,
      max_groups INTEGER NOT NULL DEFAULT 10,
      notes TEXT DEFAULT '',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_tenants_status ON tenants(status);
    CREATE INDEX IF NOT EXISTS idx_tenants_username ON tenants(username);
    CREATE INDEX IF NOT EXISTS idx_tenants_unit ON tenants(unit_number);
  `);

  // 11. Tabel Master Admin (Super Admin Pengelola Apartemen)
  db.exec(`
    CREATE TABLE IF NOT EXISTS master_admin (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      username TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      salt TEXT NOT NULL,
      iterations INTEGER NOT NULL DEFAULT 100000,
      updated_at TEXT NOT NULL
    );
  `);

  // Inisialisasi unit pertama (Unit 101) jika tabel tenants masih kosong
  const tenantCount = db.prepare('SELECT COUNT(*) as count FROM tenants').get() as { count: number };
  if (tenantCount.count === 0) {
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.pbkdf2Sync('admin123', salt, 100000, 64, 'sha512').toString('hex');
    const now = new Date();
    const expired = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);
    db.prepare(`
      INSERT INTO tenants (id, unit_number, name, username, password_hash, salt, phone_number, plan_name, status, start_date, expired_date, max_groups, notes, created_at, updated_at)
      VALUES ('unit-101', 'Unit 101', 'Wanzt Store Utama', 'admin', ?, ?, '082173515807', 'Enterprise', 'active', ?, ?, 50, 'Unit apartemen utama toko official', ?, ?)
    `).run(hash, salt, now.toISOString(), expired.toISOString(), now.toISOString(), now.toISOString());
  }

  // Inisialisasi akun Master Admin default jika belum ada
  const masterAdminRow = db.prepare('SELECT id FROM master_admin WHERE id = 1').get();
  if (!masterAdminRow) {
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.pbkdf2Sync('masterwanzt888', salt, 100000, 64, 'sha512').toString('hex');
    db.prepare(`
      INSERT INTO master_admin (id, username, password_hash, salt, iterations, updated_at)
      VALUES (1, 'superadmin', ?, ?, 100000, ?)
    `).run(hash, salt, new Date().toISOString());
  }

  // Jalankan migrasi data otomatis dari file JSON yang sudah ada
  migrateExistingJsonData();
}

/**
 * Memeriksa apakah ada file JSON lama di folder database,
 * dan memindahkannya ke SQLite tanpa menghilangkan data apa pun.
 */
function migrateExistingJsonData(): void {
  const dbDir = path.dirname(DB_PATH);

  // Helper untuk membaca JSON jika ada
  const readJsonSafe = (fileName: string): any => {
    const candidates = [
      path.join(dbDir, fileName),
      path.resolve(process.cwd(), 'database', fileName),
      path.resolve(process.cwd(), 'backend', 'database', fileName),
    ];
    for (const p of candidates) {
      if (fs.existsSync(p)) {
        try {
          return JSON.parse(fs.readFileSync(p, 'utf-8'));
        } catch {
          // ignore
        }
      }
    }
    return null;
  };

  // A. Migrasi Auth
  const authRow = db.prepare('SELECT id FROM auth WHERE id = 1').get();
  if (!authRow) {
    const oldAuth = readJsonSafe('auth.json');
    if (oldAuth && oldAuth.username && oldAuth.hash && oldAuth.salt) {
      db.prepare(`
        INSERT INTO auth (id, username, password_hash, salt, iterations, updated_at)
        VALUES (1, ?, ?, ?, 100000, ?)
      `).run(
        oldAuth.username,
        oldAuth.hash,
        oldAuth.salt,
        oldAuth.updatedAt || new Date().toISOString()
      );
      console.log('[SQLite Migration] Berhasil memigrasi auth.json ke tabel auth.');
    }
  }

  // B. Migrasi Store Info
  const storeRow = db.prepare('SELECT id FROM store_info WHERE id = 1').get();
  if (!storeRow) {
    const oldStore = readJsonSafe('store_info.json');
    if (oldStore) {
      db.prepare(`
        INSERT INTO store_info (id, store_name, owner_name, owner_number, admin_name, admin_number, web_link, telegram_bot, wa_link, updated_at)
        VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        oldStore.storeName || '',
        oldStore.ownerName || '',
        oldStore.ownerNumber || '',
        oldStore.adminName || '',
        oldStore.adminNumber || '',
        oldStore.webLink || '',
        oldStore.telegramBot || '',
        oldStore.waLink || '',
        oldStore.updatedAt || new Date().toISOString()
      );
      console.log('[SQLite Migration] Berhasil memigrasi store_info.json ke tabel store_info.');
    }
  }

  // C. Migrasi API Config
  const apiRow = db.prepare('SELECT id FROM api_config WHERE id = 1').get();
  if (!apiRow) {
    const oldApi = readJsonSafe('api_config.json');
    if (oldApi) {
      db.prepare(`
        INSERT INTO api_config (id, lunas_api_key, lunas_secret_key, lunas_base_url, lunas_default_fee, xaviera_api_key, xaviera_secret_key, xaviera_base_url, xaviera_markup_percent, updated_at)
        VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        oldApi.lunasQris?.apiKey || '',
        oldApi.lunasQris?.secretKey || '',
        oldApi.lunasQris?.baseUrl || '',
        oldApi.lunasQris?.defaultFee || 0,
        oldApi.xaviera?.apiKey || '',
        oldApi.xaviera?.secretKey || '',
        oldApi.xaviera?.baseUrl || '',
        oldApi.xaviera?.markupPercent || 10,
        oldApi.updatedAt || new Date().toISOString()
      );
      console.log('[SQLite Migration] Berhasil memigrasi api_config.json ke tabel api_config.');
    }
  }

  // D. Migrasi Command Templates (Menu, List, Carousel, Invoice)
  const commandFiles: Record<string, string> = {
    menu: 'command_menu.json',
    list: 'command_list.json',
    carousel: 'command_carousel.json',
    invoice: 'command_invoice.json',
  };

  const insertCmd = db.prepare(`
    INSERT OR REPLACE INTO commands_config (command_type, config_data, updated_at)
    VALUES (?, ?, ?)
  `);

  for (const [cmdType, fileName] of Object.entries(commandFiles)) {
    const existing = db.prepare('SELECT command_type FROM commands_config WHERE command_type = ?').get(cmdType);
    if (!existing) {
      const data = readJsonSafe(fileName);
      if (data) {
        insertCmd.run(cmdType, JSON.stringify(data), new Date().toISOString());
        console.log(`[SQLite Migration] Berhasil memigrasi ${fileName} ke tabel commands_config.`);
      }
    }
  }

  // E. Migrasi Whitelist Grup
  const groupCount = (db.prepare('SELECT count(*) as count FROM group_whitelist').get() as any)?.count || 0;
  if (groupCount === 0) {
    const oldGroups = readJsonSafe('groups_config.json');
    if (oldGroups && oldGroups.toggledGroups) {
      const insertGroup = db.prepare(`
        INSERT OR REPLACE INTO group_whitelist (group_id, enabled, updated_at)
        VALUES (?, ?, ?)
      `);
      const now = new Date().toISOString();
      const insertMany = db.transaction((toggledMap: Record<string, boolean>) => {
        for (const [gid, enabled] of Object.entries(toggledMap)) {
          insertGroup.run(gid, enabled ? 1 : 0, now);
        }
      });
      insertMany(oldGroups.toggledGroups);
      console.log('[SQLite Migration] Berhasil memigrasi groups_config.json ke tabel group_whitelist.');
    }
  }

  // F. Migrasi Transaksi
  const txCount = (db.prepare('SELECT count(*) as count FROM transactions').get() as any)?.count || 0;
  if (txCount === 0) {
    const oldTxs = readJsonSafe('transactions.json');
    if (Array.isArray(oldTxs) && oldTxs.length > 0) {
      const insertTx = db.prepare(`
        INSERT OR REPLACE INTO transactions (
          id, order_id, trx_id, customer_number, customer_name,
          product_name, variant_name, nominal, unique_code, total,
          status, payment_url, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const insertAllTx = db.transaction((records: any[]) => {
        for (const t of records) {
          insertTx.run(
            t.id || `TRX-${t.orderId}`,
            t.orderId,
            t.trxId || '',
            t.customerNumber || '',
            t.customerName || '',
            t.productName || '',
            t.variantName || '',
            Math.round(t.nominal || 0),
            Math.round(t.uniqueCode || 0),
            Math.round(t.total || 0),
            t.status || 'pending',
            t.paymentUrl || '',
            t.createdAt || new Date().toISOString(),
            t.updatedAt || new Date().toISOString()
          );
        }
      });

      insertAllTx(oldTxs);
      console.log(`[SQLite Migration] Berhasil memigrasi ${oldTxs.length} transaksi ke tabel transactions.`);
    }
  }
}

// Inisialisasi otomatis saat modul pertama kali di-load
initDatabase();

export interface PricingConfigRecord {
  mode: 'rp' | 'percent';
  value: number;
  updatedAt: string;
}

/**
 * Membaca pengaturan markup harga produk dari SQLite
 */
export function getPricingConfig(): PricingConfigRecord {
  try {
    const row = db.prepare('SELECT pricing_mode, pricing_value, updated_at FROM pricing_config WHERE id = 1').get() as any;
    if (row) {
      return {
        mode: row.pricing_mode === 'percent' ? 'percent' : 'rp',
        value: typeof row.pricing_value === 'number' ? row.pricing_value : 100,
        updatedAt: row.updated_at || new Date().toISOString(),
      };
    }
  } catch (err) {
    console.error('Gagal membaca pricing_config dari SQLite:', err);
  }
  return {
    mode: 'rp',
    value: 100,
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Menyimpan pengaturan markup harga produk ke SQLite
 */
export function savePricingConfig(mode: 'rp' | 'percent', value: number): PricingConfigRecord {
  const cleanMode: 'rp' | 'percent' = mode === 'percent' ? 'percent' : 'rp';
  const cleanValue = isNaN(Number(value)) ? 0 : Math.max(0, Number(value));
  const now = new Date().toISOString();

  try {
    db.prepare(`
      INSERT OR REPLACE INTO pricing_config (id, pricing_mode, pricing_value, updated_at)
      VALUES (1, ?, ?, ?)
    `).run(cleanMode, cleanValue, now);
  } catch (err) {
    console.error('Gagal menyimpan pricing_config ke SQLite:', err);
  }

  return {
    mode: cleanMode,
    value: cleanValue,
    updatedAt: now,
  };
}

/**
 * Membaca konfigurasi markup harga untuk kategori tertentu ('smm' | 'topup')
 */
export function getCategoryPricing(category: 'smm' | 'topup'): PricingConfigRecord {
  try {
    const row = db
      .prepare('SELECT pricing_mode, pricing_value, updated_at FROM category_pricing WHERE category = ?')
      .get(category) as any;
    if (row) {
      return {
        mode: row.pricing_mode === 'percent' ? 'percent' : 'rp',
        value: typeof row.pricing_value === 'number' ? row.pricing_value : 100,
        updatedAt: row.updated_at || new Date().toISOString(),
      };
    }
  } catch (err) {
    console.error(`Gagal membaca category_pricing [${category}] dari SQLite:`, err);
  }
  return {
    mode: 'rp',
    value: 100,
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Menyimpan konfigurasi markup harga untuk kategori tertentu ('smm' | 'topup')
 */
export function saveCategoryPricing(
  category: 'smm' | 'topup',
  mode: 'rp' | 'percent',
  value: number
): PricingConfigRecord {
  const cleanMode: 'rp' | 'percent' = mode === 'percent' ? 'percent' : 'rp';
  const cleanValue = isNaN(Number(value)) ? 0 : Math.max(0, Number(value));
  const now = new Date().toISOString();

  try {
    db.prepare(`
      INSERT OR REPLACE INTO category_pricing (category, pricing_mode, pricing_value, updated_at)
      VALUES (?, ?, ?, ?)
    `).run(category, cleanMode, cleanValue, now);
  } catch (err) {
    console.error(`Gagal menyimpan category_pricing [${category}] ke SQLite:`, err);
  }

  return {
    mode: cleanMode,
    value: cleanValue,
    updatedAt: now,
  };
}

/**
 * Menghitung harga jual dan margin berdasarkan harga asli serta konfigurasi pricing (Rp atau %)
 */
export function calculateSellingPrice(
  originalPrice: number,
  mode: 'rp' | 'percent' = 'rp',
  value: number = 100
): { sellingPrice: number; margin: number } {
  const base = Math.max(0, Math.round(Number(originalPrice) || 0));
  const val = Math.max(0, Number(value) || 0);

  if (mode === 'percent') {
    const margin = Math.round(base * (val / 100));
    return {
      sellingPrice: base + margin,
      margin,
    };
  } else {
    const margin = Math.round(val);
    return {
      sellingPrice: base + margin,
      margin,
    };
  }
}

export interface VariantPricingRecord {
  variantId: string;
  productName: string;
  variantName: string;
  pricingType: 'general' | 'custom';
  mode: 'rp' | 'percent';
  value: number;
  updatedAt: string;
}

/**
 * Membaca semua konfigurasi harga khusus per varian dari SQLite
 */
export function getAllVariantPricings(): Record<string, VariantPricingRecord> {
  const result: Record<string, VariantPricingRecord> = {};
  try {
    const rows = db.prepare('SELECT variant_id, product_name, variant_name, pricing_type, pricing_mode, pricing_value, updated_at FROM variant_pricing').all() as any[];
    for (const r of rows) {
      result[r.variant_id] = {
        variantId: r.variant_id,
        productName: r.product_name || '',
        variantName: r.variant_name || '',
        pricingType: r.pricing_type === 'custom' ? 'custom' : 'general',
        mode: r.pricing_mode === 'percent' ? 'percent' : 'rp',
        value: typeof r.pricing_value === 'number' ? r.pricing_value : 100,
        updatedAt: r.updated_at || new Date().toISOString(),
      };
    }
  } catch (err) {
    console.error('Gagal membaca variant_pricing dari SQLite:', err);
  }
  return result;
}

/**
 * Membaca konfigurasi harga khusus untuk satu varian
 */
export function getVariantPricing(variantId: string): VariantPricingRecord | null {
  try {
    const row = db.prepare('SELECT variant_id, product_name, variant_name, pricing_type, pricing_mode, pricing_value, updated_at FROM variant_pricing WHERE variant_id = ?').get(String(variantId)) as any;
    if (row) {
      return {
        variantId: row.variant_id,
        productName: row.product_name || '',
        variantName: row.variant_name || '',
        pricingType: row.pricing_type === 'custom' ? 'custom' : 'general',
        mode: row.pricing_mode === 'percent' ? 'percent' : 'rp',
        value: typeof row.pricing_value === 'number' ? row.pricing_value : 100,
        updatedAt: row.updated_at || new Date().toISOString(),
      };
    }
  } catch (err) {
    console.error('Gagal membaca getVariantPricing dari SQLite:', err);
  }
  return null;
}

/**
 * Menyimpan konfigurasi harga varian (apakah General atau Custom)
 */
export function saveVariantPricing(
  variantId: string,
  options: {
    productName?: string;
    variantName?: string;
    pricingType: 'general' | 'custom';
    mode?: 'rp' | 'percent';
    value?: number;
  }
): VariantPricingRecord {
  const cleanId = String(variantId);
  const cleanType: 'general' | 'custom' = options.pricingType === 'custom' ? 'custom' : 'general';
  const cleanMode: 'rp' | 'percent' = options.mode === 'percent' ? 'percent' : 'rp';
  const cleanValue = isNaN(Number(options.value)) ? 0 : Math.max(0, Number(options.value));
  const now = new Date().toISOString();
  const prodName = options.productName || '';
  const varName = options.variantName || '';

  try {
    db.prepare(`
      INSERT OR REPLACE INTO variant_pricing (variant_id, product_name, variant_name, pricing_type, pricing_mode, pricing_value, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(cleanId, prodName, varName, cleanType, cleanMode, cleanValue, now);
  } catch (err) {
    console.error('Gagal menyimpan variant_pricing ke SQLite:', err);
  }

  return {
    variantId: cleanId,
    productName: prodName,
    variantName: varName,
    pricingType: cleanType,
    mode: cleanMode,
    value: cleanValue,
    updatedAt: now,
  };
}

/**
 * Menghitung harga jual varian: jika varian diset Custom, gunakan mode & nominal khusus varian tersebut;
 * jika varian diset General (atau belum pernah diset), gunakan pengaturan harga umum toko.
 */
export function calculateSellingPriceForVariant(
  originalPrice: number,
  variantId?: string | number,
  productName?: string,
  variantName?: string
): {
  sellingPrice: number;
  margin: number;
  pricingType: 'general' | 'custom';
  mode: 'rp' | 'percent';
  value: number;
} {
  const base = Math.max(0, Math.round(Number(originalPrice) || 0));

  let variantConfig: VariantPricingRecord | null = null;
  if (variantId) {
    variantConfig = getVariantPricing(String(variantId));
  }

  // Jika tidak ditemukan via variantId tetapi ada productName & variantName, coba cari fallback
  if (!variantConfig && productName && variantName) {
    try {
      const row = db.prepare('SELECT variant_id, product_name, variant_name, pricing_type, pricing_mode, pricing_value, updated_at FROM variant_pricing WHERE LOWER(product_name) = ? AND LOWER(variant_name) = ?').get(productName.toLowerCase(), variantName.toLowerCase()) as any;
      if (row) {
        variantConfig = {
          variantId: row.variant_id,
          productName: row.product_name,
          variantName: row.variant_name,
          pricingType: row.pricing_type === 'custom' ? 'custom' : 'general',
          mode: row.pricing_mode === 'percent' ? 'percent' : 'rp',
          value: typeof row.pricing_value === 'number' ? row.pricing_value : 100,
          updatedAt: row.updated_at,
        };
      }
    } catch {}
  }

  if (variantConfig && variantConfig.pricingType === 'custom') {
    const calc = calculateSellingPrice(base, variantConfig.mode, variantConfig.value);
    return {
      sellingPrice: calc.sellingPrice,
      margin: calc.margin,
      pricingType: 'custom',
      mode: variantConfig.mode,
      value: variantConfig.value,
    };
  }

  // Gunakan general config
  const general = getPricingConfig();
  const calc = calculateSellingPrice(base, general.mode, general.value);
  return {
    sellingPrice: calc.sellingPrice,
    margin: calc.margin,
    pricingType: 'general',
    mode: general.mode,
    value: general.value,
  };
}

/**
 * Interface Record Kupon Promo SQLite
 */
export interface PromoCodeRecord {
  id: number;
  code: string;
  discountMode: 'rp' | 'percent';
  discountValue: number;
  minSpend: number;
  quota: number | null;
  usedCount: number;
  validUntil: string | null;
  isForever: boolean;
  scopeType: 'all' | 'restricted';
  variantIds: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * Membaca semua Kupon Promo beserta varian terkaitnya
 */
export function getAllPromoCodes(): PromoCodeRecord[] {
  try {
    const promos = db.prepare(`
      SELECT id, code, discount_mode, discount_value, min_spend, quota, used_count, valid_until, is_forever, scope_type, is_active, created_at, updated_at
      FROM promo_codes
      ORDER BY id DESC
    `).all() as any[];

    const variantRows = db.prepare(`
      SELECT promo_id, variant_id FROM promo_code_variants
    `).all() as any[];

    const variantMap: Record<number, string[]> = {};
    for (const v of variantRows) {
      if (!variantMap[v.promo_id]) {
        variantMap[v.promo_id] = [];
      }
      variantMap[v.promo_id].push(String(v.variant_id));
    }

    return promos.map((p) => ({
      id: Number(p.id),
      code: String(p.code).toUpperCase(),
      discountMode: p.discount_mode === 'percent' ? 'percent' : 'rp',
      discountValue: Number(p.discount_value) || 0,
      minSpend: Number(p.min_spend) || 0,
      quota: p.quota !== null && p.quota !== undefined ? Number(p.quota) : null,
      usedCount: Number(p.used_count) || 0,
      validUntil: p.valid_until || null,
      isForever: Boolean(p.is_forever),
      scopeType: p.scope_type === 'restricted' ? 'restricted' : 'all',
      variantIds: variantMap[p.id] || [],
      isActive: Boolean(p.is_active),
      createdAt: p.created_at || new Date().toISOString(),
      updatedAt: p.updated_at || new Date().toISOString(),
    }));
  } catch (err) {
    console.error('Gagal mengambil daftar promo codes:', err);
    return [];
  }
}

/**
 * Mengambil satu Kupon Promo berdasarkan ID
 */
export function getPromoCodeById(id: number): PromoCodeRecord | null {
  try {
    const p = db.prepare(`
      SELECT id, code, discount_mode, discount_value, min_spend, quota, used_count, valid_until, is_forever, scope_type, is_active, created_at, updated_at
      FROM promo_codes WHERE id = ?
    `).get(id) as any;

    if (!p) return null;

    const variants = db.prepare(`
      SELECT variant_id FROM promo_code_variants WHERE promo_id = ?
    `).all(id) as any[];

    return {
      id: Number(p.id),
      code: String(p.code).toUpperCase(),
      discountMode: p.discount_mode === 'percent' ? 'percent' : 'rp',
      discountValue: Number(p.discount_value) || 0,
      minSpend: Number(p.min_spend) || 0,
      quota: p.quota !== null && p.quota !== undefined ? Number(p.quota) : null,
      usedCount: Number(p.used_count) || 0,
      validUntil: p.valid_until || null,
      isForever: Boolean(p.is_forever),
      scopeType: p.scope_type === 'restricted' ? 'restricted' : 'all',
      variantIds: variants.map((v) => String(v.variant_id)),
      isActive: Boolean(p.is_active),
      createdAt: p.created_at || new Date().toISOString(),
      updatedAt: p.updated_at || new Date().toISOString(),
    };
  } catch (err) {
    console.error('Gagal mengambil promo by id:', err);
    return null;
  }
}

/**
 * Mengambil satu Kupon Promo berdasarkan Kode string
 */
export function getPromoCodeByCode(code: string): PromoCodeRecord | null {
  try {
    const cleanCode = code.trim().toUpperCase();
    const p = db.prepare(`
      SELECT id, code, discount_mode, discount_value, min_spend, quota, used_count, valid_until, is_forever, scope_type, is_active, created_at, updated_at
      FROM promo_codes WHERE UPPER(code) = ?
    `).get(cleanCode) as any;

    if (!p) return null;

    const variants = db.prepare(`
      SELECT variant_id FROM promo_code_variants WHERE promo_id = ?
    `).all(p.id) as any[];

    return {
      id: Number(p.id),
      code: String(p.code).toUpperCase(),
      discountMode: p.discount_mode === 'percent' ? 'percent' : 'rp',
      discountValue: Number(p.discount_value) || 0,
      minSpend: Number(p.min_spend) || 0,
      quota: p.quota !== null && p.quota !== undefined ? Number(p.quota) : null,
      usedCount: Number(p.used_count) || 0,
      validUntil: p.valid_until || null,
      isForever: Boolean(p.is_forever),
      scopeType: p.scope_type === 'restricted' ? 'restricted' : 'all',
      variantIds: variants.map((v) => String(v.variant_id)),
      isActive: Boolean(p.is_active),
      createdAt: p.created_at || new Date().toISOString(),
      updatedAt: p.updated_at || new Date().toISOString(),
    };
  } catch (err) {
    console.error('Gagal mengambil promo by code:', err);
    return null;
  }
}

/**
 * Membuat Kupon Promo Baru
 */
export function createPromoCode(data: {
  code: string;
  discountMode: 'rp' | 'percent';
  discountValue: number;
  minSpend?: number;
  quota?: number | null;
  validUntil?: string | null;
  isForever?: boolean;
  scopeType?: 'all' | 'restricted';
  variantIds?: string[];
  isActive?: boolean;
}): PromoCodeRecord {
  const cleanCode = data.code.trim().toUpperCase().replace(/\s+/g, '');
  const cleanMode: 'rp' | 'percent' = data.discountMode === 'percent' ? 'percent' : 'rp';
  const cleanVal = Math.max(0, Number(data.discountValue) || 0);
  const minSpend = Math.max(0, Number(data.minSpend) || 0);
  const quota = data.quota !== null && data.quota !== undefined && Number(data.quota) > 0 ? Number(data.quota) : null;
  const isForever = Boolean(data.isForever);
  const validUntil = isForever ? null : (data.validUntil || null);
  const scopeType: 'all' | 'restricted' = data.scopeType === 'restricted' ? 'restricted' : 'all';
  const isActive = data.isActive !== false ? 1 : 0;
  const now = new Date().toISOString();

  const insert = db.prepare(`
    INSERT INTO promo_codes (code, discount_mode, discount_value, min_spend, quota, used_count, valid_until, is_forever, scope_type, is_active, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?, ?)
  `);

  const info = insert.run(
    cleanCode,
    cleanMode,
    cleanVal,
    minSpend,
    quota,
    validUntil,
    isForever ? 1 : 0,
    scopeType,
    isActive,
    now,
    now
  );

  const promoId = Number(info.lastInsertRowid);

  // Jika jenis terbatas, simpan daftar varian yang diaktifkan
  if (scopeType === 'restricted' && Array.isArray(data.variantIds) && data.variantIds.length > 0) {
    const insertVar = db.prepare(`
      INSERT INTO promo_code_variants (promo_id, variant_id, product_name, variant_name)
      VALUES (?, ?, '', '')
    `);
    const insertMany = db.transaction((vars: string[]) => {
      for (const vId of vars) {
        insertVar.run(promoId, String(vId));
      }
    });
    insertMany(data.variantIds);
  }

  return getPromoCodeById(promoId)!;
}

/**
 * Memperbarui Kupon Promo yang sudah ada
 */
export function updatePromoCode(
  id: number,
  data: {
    code?: string;
    discountMode?: 'rp' | 'percent';
    discountValue?: number;
    minSpend?: number;
    quota?: number | null;
    validUntil?: string | null;
    isForever?: boolean;
    scopeType?: 'all' | 'restricted';
    variantIds?: string[];
    isActive?: boolean;
  }
): PromoCodeRecord | null {
  const existing = getPromoCodeById(id);
  if (!existing) return null;

  const cleanCode = data.code ? data.code.trim().toUpperCase().replace(/\s+/g, '') : existing.code;
  const cleanMode: 'rp' | 'percent' = data.discountMode !== undefined ? (data.discountMode === 'percent' ? 'percent' : 'rp') : existing.discountMode;
  const cleanVal = data.discountValue !== undefined ? Math.max(0, Number(data.discountValue) || 0) : existing.discountValue;
  const minSpend = data.minSpend !== undefined ? Math.max(0, Number(data.minSpend) || 0) : existing.minSpend;
  const quota = data.quota !== undefined ? (data.quota !== null && Number(data.quota) > 0 ? Number(data.quota) : null) : existing.quota;
  const isForever = data.isForever !== undefined ? Boolean(data.isForever) : existing.isForever;
  const validUntil = isForever ? null : (data.validUntil !== undefined ? data.validUntil : existing.validUntil);
  const scopeType: 'all' | 'restricted' = data.scopeType !== undefined ? (data.scopeType === 'restricted' ? 'restricted' : 'all') : existing.scopeType;
  const isActive = data.isActive !== undefined ? (data.isActive ? 1 : 0) : (existing.isActive ? 1 : 0);
  const now = new Date().toISOString();

  db.prepare(`
    UPDATE promo_codes
    SET code = ?, discount_mode = ?, discount_value = ?, min_spend = ?, quota = ?, valid_until = ?, is_forever = ?, scope_type = ?, is_active = ?, updated_at = ?
    WHERE id = ?
  `).run(
    cleanCode,
    cleanMode,
    cleanVal,
    minSpend,
    quota,
    validUntil,
    isForever ? 1 : 0,
    scopeType,
    isActive,
    now,
    id
  );

  // Perbarui daftar varian jika diberikan
  if (data.variantIds !== undefined || data.scopeType !== undefined) {
    db.prepare('DELETE FROM promo_code_variants WHERE promo_id = ?').run(id);

    if (scopeType === 'restricted' && Array.isArray(data.variantIds) && data.variantIds.length > 0) {
      const insertVar = db.prepare(`
        INSERT INTO promo_code_variants (promo_id, variant_id, product_name, variant_name)
        VALUES (?, ?, '', '')
      `);
      const insertMany = db.transaction((vars: string[]) => {
        for (const vId of vars) {
          insertVar.run(id, String(vId));
        }
      });
      insertMany(data.variantIds);
    }
  }

  return getPromoCodeById(id);
}

/**
 * Toggle Status Aktif Kupon
 */
export function togglePromoStatus(id: number, isActive?: boolean): boolean {
  try {
    const existing = getPromoCodeById(id);
    if (!existing) return false;
    const nextState = isActive !== undefined ? (isActive ? 1 : 0) : (existing.isActive ? 0 : 1);
    db.prepare('UPDATE promo_codes SET is_active = ?, updated_at = ? WHERE id = ?').run(
      nextState,
      new Date().toISOString(),
      id
    );
    return true;
  } catch (err) {
    console.error('Gagal toggle promo status:', err);
    return false;
  }
}

/**
 * Hapus Kupon Promo
 */
export function deletePromoCode(id: number): boolean {
  try {
    db.prepare('DELETE FROM promo_code_variants WHERE promo_id = ?').run(id);
    const res = db.prepare('DELETE FROM promo_codes WHERE id = ?').run(id);
    return res.changes > 0;
  } catch (err) {
    console.error('Gagal menghapus kupon promo:', err);
    return false;
  }
}

/**
 * Validasi dan Hitung Potongan Kupon dengan Aturan Margin Protection:
 * - Diskon HANYA memotong margin keuntungan toko.
 * - Diskon TIDAK BISA memotong harga modal dasar (basePrice).
 * - Margin tidak boleh minus (clamped pada 0).
 * - Kupon HANYA berlaku untuk APK Premium (tidak berlaku untuk SMM & TopUp).
 */
export function validateAndApplyPromo(params: {
  code: string;
  variantId: string;
  basePrice: number;
  initialMargin: number;
  totalOrderAmount?: number;
  isApkPremium?: boolean;
}): {
  isValid: boolean;
  errorMessage?: string;
  promo?: PromoCodeRecord;
  nominalDiscountWanted: number;
  actualDiscountApplied: number;
  initialMargin: number;
  finalMargin: number;
  basePrice: number;
  sellingPriceWithoutPromo: number;
  finalPrice: number;
} {
  const { code, variantId, basePrice, initialMargin, totalOrderAmount = 0, isApkPremium = true } = params;

  // Aturan 1: Kupon hanya berlaku untuk APK Premium
  if (!isApkPremium) {
    return {
      isValid: false,
      errorMessage: 'Kode promo hanya berlaku untuk produk APK Premium (tidak berlaku untuk SMM atau TopUp).',
      nominalDiscountWanted: 0,
      actualDiscountApplied: 0,
      initialMargin,
      finalMargin: initialMargin,
      basePrice,
      sellingPriceWithoutPromo: basePrice + initialMargin,
      finalPrice: basePrice + initialMargin,
    };
  }

  const promo = getPromoCodeByCode(code);
  if (!promo) {
    return {
      isValid: false,
      errorMessage: 'Kode promo tidak ditemukan.',
      nominalDiscountWanted: 0,
      actualDiscountApplied: 0,
      initialMargin,
      finalMargin: initialMargin,
      basePrice,
      sellingPriceWithoutPromo: basePrice + initialMargin,
      finalPrice: basePrice + initialMargin,
    };
  }

  if (!promo.isActive) {
    return {
      isValid: false,
      errorMessage: 'Kode promo saat ini sedang nonaktif.',
      promo,
      nominalDiscountWanted: 0,
      actualDiscountApplied: 0,
      initialMargin,
      finalMargin: initialMargin,
      basePrice,
      sellingPriceWithoutPromo: basePrice + initialMargin,
      finalPrice: basePrice + initialMargin,
    };
  }

  // Cek Kuota
  if (promo.quota !== null && promo.usedCount >= promo.quota) {
    return {
      isValid: false,
      errorMessage: 'Kuota penggunaan kode promo ini sudah habis.',
      promo,
      nominalDiscountWanted: 0,
      actualDiscountApplied: 0,
      initialMargin,
      finalMargin: initialMargin,
      basePrice,
      sellingPriceWithoutPromo: basePrice + initialMargin,
      finalPrice: basePrice + initialMargin,
    };
  }

  // Cek Masa Berlaku
  if (!promo.isForever && promo.validUntil) {
    const expiry = new Date(promo.validUntil);
    const now = new Date();
    if (now > expiry) {
      return {
        isValid: false,
        errorMessage: 'Masa berlaku kode promo ini telah berakhir.',
        promo,
        nominalDiscountWanted: 0,
        actualDiscountApplied: 0,
        initialMargin,
        finalMargin: initialMargin,
        basePrice,
        sellingPriceWithoutPromo: basePrice + initialMargin,
        finalPrice: basePrice + initialMargin,
      };
    }
  }

  // Cek Minimum Belanja
  const orderTotal = totalOrderAmount > 0 ? totalOrderAmount : (basePrice + initialMargin);
  if (promo.minSpend > 0 && orderTotal < promo.minSpend) {
    return {
      isValid: false,
      errorMessage: `Minimal transaksi untuk menggunakan promo ini adalah Rp ${promo.minSpend.toLocaleString('id-ID')}.`,
      promo,
      nominalDiscountWanted: 0,
      actualDiscountApplied: 0,
      initialMargin,
      finalMargin: initialMargin,
      basePrice,
      sellingPriceWithoutPromo: basePrice + initialMargin,
      finalPrice: basePrice + initialMargin,
    };
  }

  // Cek Jangkauan / Scope Varian
  if (promo.scopeType === 'restricted') {
    const isEligible = promo.variantIds.includes(String(variantId));
    if (!isEligible) {
      return {
        isValid: false,
        errorMessage: 'Kode promo ini tidak berlaku untuk varian produk yang dipilih.',
        promo,
        nominalDiscountWanted: 0,
        actualDiscountApplied: 0,
        initialMargin,
        finalMargin: initialMargin,
        basePrice,
        sellingPriceWithoutPromo: basePrice + initialMargin,
        finalPrice: basePrice + initialMargin,
      };
    }
  }

  // Hitung Nilai Diskon
  let nominalDiscountWanted = 0;
  if (promo.discountMode === 'percent') {
    // Persentase dipotong dari margin atau harga jual?
    // Contoh user: diskon hanya memotong margin keuntungan. Jika margin Rp 90 dan potongan 50%, margin berkurang 45.
    nominalDiscountWanted = Math.round((initialMargin * promo.discountValue) / 100);
  } else {
    // Mode Rp: nominal tetap
    nominalDiscountWanted = Math.round(promo.discountValue);
  }

  // Aturan Inti: Diskon hanya memotong margin!
  // Nilai margin setelah diskon = Math.max(0, initialMargin - nominalDiscountWanted)
  const finalMargin = Math.max(0, initialMargin - nominalDiscountWanted);
  const actualDiscountApplied = initialMargin - finalMargin;
  const finalPrice = basePrice + finalMargin;

  return {
    isValid: true,
    promo,
    nominalDiscountWanted,
    actualDiscountApplied,
    initialMargin,
    finalMargin,
    basePrice,
    sellingPriceWithoutPromo: basePrice + initialMargin,
    finalPrice,
  };
}



