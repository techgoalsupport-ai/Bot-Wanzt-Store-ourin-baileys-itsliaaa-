import { db } from '../database/sqlite.ts';
import { getActiveTenantId } from '../database/tenantContext.ts';
import { notifyTransactionPaid, notifyTransactionFailed } from './telegramService.ts';

export interface TransactionRecord {
  id: string;
  orderId: string;
  trxId?: string;
  customerNumber: string;
  customerName: string;
  productName: string;
  variantName: string;
  nominal: number;
  uniqueCode: number;
  total: number;
  status: 'pending' | 'paid' | 'cancel';
  paymentUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TransactionSummary {
  totalCount: number;
  paidCount: number;
  pendingCount: number;
  cancelCount: number;
  totalRevenue: number;
}

interface DbTransactionRow {
  id: string;
  order_id: string;
  trx_id: string | null;
  customer_number: string;
  customer_name: string | null;
  product_name: string;
  variant_name: string;
  nominal: number;
  unique_code: number;
  total: number;
  status: string;
  payment_url: string | null;
  created_at: string;
  updated_at: string;
}

function mapRowToRecord(row: DbTransactionRow): TransactionRecord {
  return {
    id: row.id,
    orderId: row.order_id,
    trxId: row.trx_id || '',
    customerNumber: row.customer_number,
    customerName: row.customer_name || `Pelanggan-${row.customer_number.slice(-4)}`,
    productName: row.product_name,
    variantName: row.variant_name,
    nominal: Number(row.nominal),
    uniqueCode: Number(row.unique_code),
    total: Number(row.total),
    status: (row.status as any) || 'pending',
    paymentUrl: row.payment_url || '',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Membaca seluruh data transaksi dari SQLite database
 */
export function getAllTransactions(): TransactionRecord[] {
  try {
    const rows = db.prepare(`
      SELECT * FROM transactions
      ORDER BY created_at DESC
    `).all() as DbTransactionRow[];

    return rows.map(mapRowToRecord);
  } catch (err) {
    console.error('Gagal membaca transaksi dari SQLite:', err);
    return [];
  }
}

/**
 * Mendaftarkan transaksi baru dengan status 'pending' ke SQLite
 */
export function recordTransaction(data: {
  orderId: string;
  trxId?: string;
  customerNumber: string;
  customerName?: string;
  productName: string;
  variantName: string;
  nominal: number;
  uniqueCode: number;
  total: number;
  paymentUrl?: string;
  status?: 'pending' | 'paid' | 'cancel';
}): TransactionRecord {
  const now = new Date().toISOString();
  const cleanNumber = data.customerNumber.replace(/[^0-9]/g, '');
  const id = `TRX-${data.orderId}`;
  const status = data.status || 'pending';
  const customerName = data.customerName || `Pelanggan-${cleanNumber.slice(-4)}`;

  try {
    const existing = db.prepare(`
      SELECT * FROM transactions
      WHERE order_id = ? OR (trx_id != '' AND trx_id = ?)
    `).get(data.orderId, data.trxId || '') as DbTransactionRow | undefined;

    if (existing) {
      db.prepare(`
        UPDATE transactions
        SET trx_id = ?,
            customer_number = ?,
            customer_name = ?,
            product_name = ?,
            variant_name = ?,
            nominal = ?,
            unique_code = ?,
            total = ?,
            status = ?,
            payment_url = ?,
            updated_at = ?
        WHERE id = ?
      `).run(
        data.trxId || existing.trx_id || '',
        cleanNumber,
        customerName,
        data.productName,
        data.variantName,
        Math.round(data.nominal),
        Math.round(data.uniqueCode),
        Math.round(data.total),
        status,
        data.paymentUrl || existing.payment_url || '',
        now,
        existing.id
      );

      return {
        id: existing.id,
        orderId: existing.order_id,
        trxId: data.trxId || existing.trx_id || '',
        customerNumber: cleanNumber,
        customerName,
        productName: data.productName,
        variantName: data.variantName,
        nominal: Math.round(data.nominal),
        uniqueCode: Math.round(data.uniqueCode),
        total: Math.round(data.total),
        status,
        paymentUrl: data.paymentUrl || existing.payment_url || '',
        createdAt: existing.created_at,
        updatedAt: now,
      };
    } else {
      db.prepare(`
        INSERT INTO transactions (
          id, order_id, trx_id, customer_number, customer_name,
          product_name, variant_name, nominal, unique_code, total,
          status, payment_url, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        id,
        data.orderId,
        data.trxId || '',
        cleanNumber,
        customerName,
        data.productName,
        data.variantName,
        Math.round(data.nominal),
        Math.round(data.uniqueCode),
        Math.round(data.total),
        status,
        data.paymentUrl || '',
        now,
        now
      );

      return {
        id,
        orderId: data.orderId,
        trxId: data.trxId || '',
        customerNumber: cleanNumber,
        customerName,
        productName: data.productName,
        variantName: data.variantName,
        nominal: Math.round(data.nominal),
        uniqueCode: Math.round(data.uniqueCode),
        total: Math.round(data.total),
        status,
        paymentUrl: data.paymentUrl || '',
        createdAt: now,
        updatedAt: now,
      };
    }
  } catch (err) {
    console.error('Gagal menyimpan transaksi ke SQLite:', err);
    return {
      id,
      orderId: data.orderId,
      trxId: data.trxId || '',
      customerNumber: cleanNumber,
      customerName,
      productName: data.productName,
      variantName: data.variantName,
      nominal: Math.round(data.nominal),
      uniqueCode: Math.round(data.uniqueCode),
      total: Math.round(data.total),
      status,
      paymentUrl: data.paymentUrl || '',
      createdAt: now,
      updatedAt: now,
    };
  }
}

/**
 * Memperbarui status transaksi (pending, paid, cancel) di SQLite
 */
export function updateTransactionStatus(
  identifier: string,
  newStatus: 'pending' | 'paid' | 'cancel'
): TransactionRecord | null {
  if (!identifier) return null;
  const now = new Date().toISOString();

  try {
    const existing = db.prepare(`
      SELECT * FROM transactions
      WHERE order_id = ? OR trx_id = ? OR id = ?
    `).get(identifier, identifier, identifier) as DbTransactionRow | undefined;

    if (!existing) return null;

    db.prepare(`
      UPDATE transactions
      SET status = ?, updated_at = ?
      WHERE id = ?
    `).run(newStatus, now, existing.id);

    // Trigger Notifikasi Telegram untuk pesanan Berhasil (Paid) atau Gagal (Cancel/Expired)
    try {
      const tenantId = getActiveTenantId() || 't_wanzt';
      let storeName = 'Toko Anda';
      try {
        const storeRow = db.prepare('SELECT store_name FROM store_info WHERE id = 1').get() as any;
        if (storeRow?.store_name) storeName = storeRow.store_name;
      } catch {}

      if (newStatus === 'paid' && existing.status !== 'paid') {
        notifyTransactionPaid(tenantId, {
          orderId: existing.order_id,
          productName: existing.product_name,
          variantName: existing.variant_name,
          totalPrice: existing.total,
          buyerNumber: existing.customer_number,
          storeName,
        }).catch((err) => console.error('[TelegramNotif] Error kirim paid:', err));
      } else if (newStatus === 'cancel' && existing.status === 'pending') {
        notifyTransactionFailed(tenantId, {
          orderId: existing.order_id,
          productName: existing.product_name,
          variantName: existing.variant_name,
          totalPrice: existing.total,
          reason: 'Batas waktu pembayaran habis / dibatalkan',
          storeName,
        }).catch((err) => console.error('[TelegramNotif] Error kirim failed:', err));
      }
    } catch (notifErr) {
      console.error('[TelegramNotif] Error trigger:', notifErr);
    }

    return {
      ...mapRowToRecord(existing),
      status: newStatus,
      updatedAt: now,
    };
  } catch (err) {
    console.error('Gagal memperbarui status transaksi di SQLite:', err);
    return null;
  }
}

/**
 * Menghapus transaksi berdasarkan ID atau Order ID dari SQLite
 */
export function deleteTransaction(identifier: string): boolean {
  try {
    const result = db.prepare(`
      DELETE FROM transactions
      WHERE id = ? OR order_id = ?
    `).run(identifier, identifier);

    return result.changes > 0;
  } catch (err) {
    console.error('Gagal menghapus transaksi dari SQLite:', err);
    return false;
  }
}

/**
 * Menghitung ringkasan statistik transaksi via SQL agregasi
 */
export function getTransactionSummary(): TransactionSummary {
  try {
    const row = db.prepare(`
      SELECT
        COUNT(*) as totalCount,
        COALESCE(SUM(CASE WHEN status = 'paid' THEN 1 ELSE 0 END), 0) as paidCount,
        COALESCE(SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END), 0) as pendingCount,
        COALESCE(SUM(CASE WHEN status = 'cancel' THEN 1 ELSE 0 END), 0) as cancelCount,
        COALESCE(SUM(CASE WHEN status = 'paid' THEN total ELSE 0 END), 0) as totalRevenue
      FROM transactions
    `).get() as any;

    return {
      totalCount: Number(row?.totalCount || 0),
      paidCount: Number(row?.paidCount || 0),
      pendingCount: Number(row?.pendingCount || 0),
      cancelCount: Number(row?.cancelCount || 0),
      totalRevenue: Number(row?.totalRevenue || 0),
    };
  } catch (err) {
    console.error('Gagal menghitung ringkasan transaksi dari SQLite:', err);
    return {
      totalCount: 0,
      paidCount: 0,
      pendingCount: 0,
      cancelCount: 0,
      totalRevenue: 0,
    };
  }
}
