import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';

const MASTER_DB_PATH = path.resolve(process.cwd(), 'database', 'master.db');

let masterDb: Database.Database | null = null;

// Helper hashing PBKDF2
export function hashPassword(password: string): string {
  const salt = 'master_salt_wanzt_2026';
  return crypto.pbkdf2Sync(password, salt, 1000, 32, 'sha256').toString('hex');
}

export function initMasterDatabase(): Database.Database {
  if (masterDb) return masterDb;

  const dbDir = path.dirname(MASTER_DB_PATH);
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  // Buat juga direktori database/tenants jika belum ada
  const tenantsDir = path.resolve(process.cwd(), 'database', 'tenants');
  if (!fs.existsSync(tenantsDir)) {
    fs.mkdirSync(tenantsDir, { recursive: true });
  }

  masterDb = new Database(MASTER_DB_PATH);
  masterDb.pragma('journal_mode = WAL');
  masterDb.pragma('busy_timeout = 5000');

  // Tabel Super Admin
  masterDb.exec(`
    CREATE TABLE IF NOT EXISTS super_admins (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      name TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
  `);

  // Tabel Penyewa Toko (Tenants / Apartemen)
  masterDb.exec(`
    CREATE TABLE IF NOT EXISTS tenants (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tenant_id TEXT UNIQUE NOT NULL,
      store_name TEXT NOT NULL,
      owner_name TEXT NOT NULL,
      owner_phone TEXT NOT NULL,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      package_name TEXT DEFAULT 'Pro',
      status TEXT DEFAULT 'active',
      max_groups INTEGER DEFAULT 10,
      created_at TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      notes TEXT,
      warned_3d INTEGER NOT NULL DEFAULT 0,
      warned_1d INTEGER NOT NULL DEFAULT 0,
      warned_5h INTEGER NOT NULL DEFAULT 0,
      warned_1h INTEGER NOT NULL DEFAULT 0
    );
  `);

  // Migrasi kolom flag peringatan sewa pada tabel tenants jika belum ada
  const tenantColumns = masterDb.prepare("PRAGMA table_info(tenants)").all() as { name: string }[];
  const colNames = new Set(tenantColumns.map((c) => c.name));

  if (!colNames.has('warned_3d')) {
    masterDb.exec("ALTER TABLE tenants ADD COLUMN warned_3d INTEGER NOT NULL DEFAULT 0");
  }
  if (!colNames.has('warned_1d')) {
    masterDb.exec("ALTER TABLE tenants ADD COLUMN warned_1d INTEGER NOT NULL DEFAULT 0");
  }
  if (!colNames.has('warned_5h')) {
    masterDb.exec("ALTER TABLE tenants ADD COLUMN warned_5h INTEGER NOT NULL DEFAULT 0");
  }
  if (!colNames.has('warned_1h')) {
    masterDb.exec("ALTER TABLE tenants ADD COLUMN warned_1h INTEGER NOT NULL DEFAULT 0");
  }

  // Tabel Riwayat Perpanjangan Sewa
  masterDb.exec(`
    CREATE TABLE IF NOT EXISTS subscription_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tenant_id TEXT NOT NULL,
      amount INTEGER DEFAULT 0,
      days_added INTEGER NOT NULL,
      note TEXT,
      created_at TEXT NOT NULL
    );
  `);

  // Seed default super admin jika kosong
  const adminCount = (masterDb.prepare('SELECT COUNT(*) as count FROM super_admins').get() as { count: number }).count;
  if (adminCount === 0) {
    const defaultHash = hashPassword('adminwanzt888');
    masterDb.prepare(`
      INSERT INTO super_admins (username, password_hash, name, created_at)
      VALUES (?, ?, ?, ?)
    `).run('adminutama', defaultHash, 'Master Super Admin', new Date().toISOString());
    console.log('[Master DB] Akun super admin default "adminutama" berhasil dibuat.');
  }

  // Seed default tenant (Wanzt Store / t_wanzt) jika kosong
  const tenantCount = (masterDb.prepare('SELECT COUNT(*) as count FROM tenants').get() as { count: number }).count;
  if (tenantCount === 0) {
    const tenantHash = hashPassword('wanzt123');
    const oneYearLater = new Date();
    oneYearLater.setDate(oneYearLater.getDate() + 365);

    masterDb.prepare(`
      INSERT INTO tenants (tenant_id, store_name, owner_name, owner_phone, username, password_hash, package_name, status, max_groups, created_at, expires_at, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      't_wanzt',
      'Wanzt Store',
      'Dzakwan',
      '6282173515807',
      'wanzt',
      tenantHash,
      'Enterprise',
      'active',
      50,
      new Date().toISOString(),
      oneYearLater.toISOString(),
      'Unit Utama Wanzt Store (Apartemen Penthouse)'
    );
    console.log('[Master DB] Tenant default "t_wanzt" berhasil diinisialisasi.');
  }

  // Tabel Template Message
  masterDb.exec(`
    CREATE TABLE IF NOT EXISTS message_templates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      content TEXT NOT NULL,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);

  // Seed default templates jika kosong
  const templateCount = (masterDb.prepare('SELECT COUNT(*) as count FROM message_templates').get() as { count: number }).count;
  if (templateCount === 0) {
    const now = new Date().toISOString();
    const insertTemplate = masterDb.prepare(`
      INSERT INTO message_templates (name, category, content, is_active, created_at, updated_at)
      VALUES (?, ?, ?, 1, ?, ?)
    `);

    // 1. Template Menu
    insertTemplate.run(
      'Menu Utama Ramah & Ringkas',
      'menu',
      'Halo kak {buyerNumber}! 👋\nSelamat datang di *{storeName}*.\n\nBerikut adalah menu utama layanan kami. Silakan pilih produk atau layanan yang Anda inginkan melalui tombol interaktif di bawah.\n\nButuh bantuan? CS kami siap melayani di {ownerNumber}.',
      now,
      now
    );

    // 2. Template List
    insertTemplate.run(
      'Katalog Kategori Produk',
      'list',
      '📋 *KATALOG PRODUK & LAYANAN - {storeName}*\n\nSilakan pilih salah satu kategori produk yang Anda inginkan pada daftar list berikut.\nSeluruh proses transaksi diproses cepat dan otomatis 24/7.',
      now,
      now
    );

    // 3. Template Carousel
    insertTemplate.run(
      'Kartu Produk Unggulan & Order Instan',
      'carousel',
      '⭐ *PRODUK TERBAIK - {storeName}*\n\nGeser ke samping untuk melihat varian dan harga produk.\nKlik tombol *Order* pada kartu produk pilihan Anda untuk langsung mendapatkan invoice QRIS otomatis!',
      now,
      now
    );

    // 4. Template Invoice
    insertTemplate.run(
      'Invoice QRIS Rincian Lengkap',
      'invoice',
      '🧾 *INVOICE PEMBAYARAN - {storeName}*\n----------------------------------------\nNomor Pesanan: #{orderId}\nNomor Pembeli: {buyerNumber}\nMetode Bayar: {paymentMethod}\n\n*Rincian Pesanan:*\n{detailItems}\n\n*TOTAL BAYAR: Rp {totalPrice}*\nBatas Waktu: {paymentExpiry}\n----------------------------------------\nSilakan scan kode QRIS di atas untuk menyelesaikan pesanan Anda. Sistem otomatis memproses pesanan setelah pembayaran terverifikasi!',
      now,
      now
    );

    // 5. Template Konfirmasi: Ringkasan Pesanan
    insertTemplate.run(
      'Ringkasan Pesanan Interaktif',
      'confirm_summary',
      '🛒 *RINCIAN PESANAN*\nHalo kak, silakan konfirmasi pesanan Anda:\n\n• *Produk:* {produkName}\n• *Varian:* {varian}\n• *Harga Normal:* Rp {price}\n\nPunya kode promo? Silakan pilih tombol di bawah untuk menggunakan diskon atau langsung bayar.',
      now,
      now
    );

    // 6. Template Konfirmasi: Permintaan Input Promo
    insertTemplate.run(
      'Instruksi Input Kupon Promo',
      'confirm_promo_input',
      '🎟️ *MASUKKAN KODE PROMO*\nSilakan ketik kode promo Anda (contoh: HEMAT10) atau ketik *BATAL* untuk melanjutkan dengan harga normal.\n\n⏱️ _Batas waktu: 90 detik._',
      now,
      now
    );

    // 7. Template Konfirmasi: Pesan Promo Valid
    insertTemplate.run(
      'Pemberitahuan Promo Berhasil Diterapkan',
      'confirm_promo_valid',
      '🎉 *KODE PROMO BERHASIL DIGUNAKAN!*\n• *Kode Promo:* {promoCode}\n• *Harga Awal:* Rp {price}\n• *Potongan Diskon:* -Rp {discount}\n• *Total Bayar:* Rp {finalPrice}\n\nInvoice pembayaran QRIS sedang diterbitkan...',
      now,
      now
    );

    // 8. Template Konfirmasi: Pesan Promo Invalid
    insertTemplate.run(
      'Pemberitahuan Kode Promo Tidak Valid',
      'confirm_promo_invalid',
      '⚠️ *KODE PROMO TIDAK DAPAT DIGUNAKAN*\nKode promo *{promoCode}* tidak dapat diterapkan.\nPenyebab: *{reason}*\n\nSilakan ketik kode promo lain, atau ketik *BATAL* untuk lanjut bayar harga normal (Rp {price}).',
      now,
      now
    );

    console.log('[Master DB] 8 template pesan default berhasil diinisialisasi.');
  } else {
    // Migrasi data lama dari 'confirmation' menjadi 'confirm_summary'
    masterDb.prepare("UPDATE message_templates SET category = 'confirm_summary' WHERE category = 'confirmation'").run();

    // Pastikan 3 sub-kategori promo terisi jika belum ada
    const now = new Date().toISOString();
    const insertTemplate = masterDb.prepare(`
      INSERT INTO message_templates (name, category, content, is_active, created_at, updated_at)
      VALUES (?, ?, ?, 1, ?, ?)
    `);

    const hasPromoInput = (masterDb.prepare("SELECT COUNT(*) as count FROM message_templates WHERE category = 'confirm_promo_input'").get() as { count: number }).count;
    if (hasPromoInput === 0) {
      insertTemplate.run(
        'Instruksi Input Kupon Promo',
        'confirm_promo_input',
        '🎟️ *MASUKKAN KODE PROMO*\nSilakan ketik kode promo Anda (contoh: HEMAT10) atau ketik *BATAL* untuk melanjutkan dengan harga normal.\n\n⏱️ _Batas waktu: 90 detik._',
        now,
        now
      );
    }

    const hasPromoValid = (masterDb.prepare("SELECT COUNT(*) as count FROM message_templates WHERE category = 'confirm_promo_valid'").get() as { count: number }).count;
    if (hasPromoValid === 0) {
      insertTemplate.run(
        'Pemberitahuan Promo Berhasil Diterapkan',
        'confirm_promo_valid',
        '🎉 *KODE PROMO BERHASIL DIGUNAKAN!*\n• *Kode Promo:* {promoCode}\n• *Harga Awal:* Rp {price}\n• *Potongan Diskon:* -Rp {discount}\n• *Total Bayar:* Rp {finalPrice}\n\nInvoice pembayaran QRIS sedang diterbitkan...',
        now,
        now
      );
    }

    const hasPromoInvalid = (masterDb.prepare("SELECT COUNT(*) as count FROM message_templates WHERE category = 'confirm_promo_invalid'").get() as { count: number }).count;
    if (hasPromoInvalid === 0) {
      insertTemplate.run(
        'Pemberitahuan Kode Promo Tidak Valid',
        'confirm_promo_invalid',
        '⚠️ *KODE PROMO TIDAK DAPAT DIGUNAKAN*\nKode promo *{promoCode}* tidak dapat diterapkan.\nPenyebab: *{reason}*\n\nSilakan ketik kode promo lain, atau ketik *BATAL* untuk lanjut bayar harga normal (Rp {price}).',
        now,
        now
      );
    }
  }

  return masterDb;
}

export function getMasterDb(): Database.Database {
  if (!masterDb) {
    return initMasterDatabase();
  }
  return masterDb;
}
