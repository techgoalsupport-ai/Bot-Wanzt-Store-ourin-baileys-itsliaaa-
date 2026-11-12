import { getTenantDb } from '../database/tenantDbManager.ts';
import { getActiveTenantId } from '../database/tenantContext.ts';

export interface TelegramConfig {
  botToken: string;
  chatId: string;
  notifEnabled: boolean;
  adminDisabled: boolean;
  isConfigured: boolean;
  updatedAt?: string;
}

export interface TelegramTenantSummary {
  tenantId: string;
  storeName: string;
  isConfigured: boolean;
  notifEnabled: boolean;
  adminDisabled: boolean;
  status: 'online' | 'offline' | 'suspend' | 'nonaktif';
  updatedAt?: string;
}

/**
 * Membaca konfigurasi Telegram untuk tenant tertentu
 */
export function getTelegramConfig(tenantId?: string): TelegramConfig {
  const targetId = tenantId || getActiveTenantId() || 't_wanzt';
  try {
    const db = getTenantDb(targetId);
    const row = db.prepare(`
      SELECT bot_token, chat_id, notif_enabled, admin_disabled, updated_at
      FROM telegram_config
      WHERE id = 1
    `).get() as any;

    if (row) {
      const isConfigured = Boolean(row.bot_token && row.chat_id);
      return {
        botToken: row.bot_token || '',
        chatId: row.chat_id || '',
        notifEnabled: Boolean(row.notif_enabled),
        adminDisabled: Boolean(row.admin_disabled),
        isConfigured,
        updatedAt: row.updated_at || '',
      };
    }
  } catch (err) {
    console.error(`[TelegramService] Gagal membaca telegram_config untuk tenant ${targetId}:`, err);
  }

  return {
    botToken: '',
    chatId: '',
    notifEnabled: false,
    adminDisabled: false,
    isConfigured: false,
  };
}

/**
 * Menyimpan konfigurasi Telegram untuk tenant
 */
export function saveTelegramConfig(
  tenantId: string,
  update: {
    botToken?: string;
    chatId?: string;
    notifEnabled?: boolean;
    adminDisabled?: boolean;
  }
): TelegramConfig {
  const targetId = tenantId || getActiveTenantId() || 't_wanzt';
  const db = getTenantDb(targetId);
  const current = getTelegramConfig(targetId);

  const newBotToken = update.botToken !== undefined ? String(update.botToken).trim() : current.botToken;
  const newChatId = update.chatId !== undefined ? String(update.chatId).trim() : current.chatId;
  const newNotifEnabled = update.notifEnabled !== undefined ? (update.notifEnabled ? 1 : 0) : (current.notifEnabled ? 1 : 0);
  const newAdminDisabled = update.adminDisabled !== undefined ? (update.adminDisabled ? 1 : 0) : (current.adminDisabled ? 1 : 0);
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO telegram_config (id, bot_token, chat_id, notif_enabled, admin_disabled, updated_at)
    VALUES (1, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      bot_token = excluded.bot_token,
      chat_id = excluded.chat_id,
      notif_enabled = excluded.notif_enabled,
      admin_disabled = excluded.admin_disabled,
      updated_at = excluded.updated_at
  `).run(newBotToken, newChatId, newNotifEnabled, newAdminDisabled, now);

  return {
    botToken: newBotToken,
    chatId: newChatId,
    notifEnabled: Boolean(newNotifEnabled),
    adminDisabled: Boolean(newAdminDisabled),
    isConfigured: Boolean(newBotToken && newChatId),
    updatedAt: now,
  };
}

/**
 * Mengirim pesan langsung via Telegram Bot API
 */
export async function sendTelegramMessage(
  token: string,
  chatId: string,
  message: string,
  parseMode: 'HTML' | 'Markdown' = 'HTML'
): Promise<{ success: boolean; error?: string; messageId?: number }> {
  if (!token || !chatId) {
    return { success: false, error: 'Token bot atau Chat ID Telegram belum diatur' };
  }

  try {
    const url = `https://api.telegram.org/bot${token}/sendMessage`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: parseMode,
        disable_web_page_preview: true,
      }),
    });

    const data = await res.json();
    if (data.ok) {
      return { success: true, messageId: data.result?.message_id };
    }

    // Jika gagal karena parse mode HTML, coba kirim plain text
    if (parseMode === 'HTML' && String(data.description).toLowerCase().includes('parse')) {
      const plainText = message.replace(/<[^>]+>/g, '');
      const retryRes = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: plainText,
          disable_web_page_preview: true,
        }),
      });
      const retryData = await retryRes.json();
      if (retryData.ok) {
        return { success: true, messageId: retryData.result?.message_id };
      }
      return { success: false, error: retryData.description || 'Gagal mengirim pesan ke Telegram' };
    }

    return { success: false, error: data.description || 'Gagal mengirim pesan ke Telegram' };
  } catch (err: any) {
    console.error('[TelegramService] Error network ke Telegram API:', err);
    return { success: false, error: err?.message || 'Gagal menghubungi server Telegram' };
  }
}

/**
 * Menguji koneksi Bot Telegram dengan getMe dan mengirim pesan tes
 */
export async function testTelegramConnection(
  token: string,
  chatId: string,
  storeName: string = 'Toko Anda'
): Promise<{ success: boolean; botName?: string; username?: string; error?: string }> {
  if (!token) return { success: false, error: 'Bot Token wajib diisi' };
  if (!chatId) return { success: false, error: 'Chat ID wajib diisi' };

  try {
    // 1. Cek info bot
    const getMeRes = await fetch(`https://api.telegram.org/bot${token}/getMe`);
    const getMeData = await getMeRes.json();
    if (!getMeData.ok) {
      return {
        success: false,
        error: `Bot Token tidak valid: ${getMeData.description || 'Unauthorized'}`,
      };
    }

    const botName = getMeData.result?.first_name || 'Bot';
    const username = getMeData.result?.username ? `@${getMeData.result.username}` : '';

    // 2. Kirim pesan tes
    const testMsg =
      `🎉 <b>KONEKSI TELEGRAM BERHASIL!</b>\n` +
      `🏪 <b>Toko:</b> ${storeName}\n` +
      `🤖 <b>Bot:</b> ${botName} (${username})\n` +
      `⏰ <b>Waktu Tes:</b> ${new Date().toLocaleString('id-ID')}\n\n` +
      `✅ <i>Selamat! Bot Telegram Anda telah siap menerima notifikasi penjualan resmi secara real-time.</i>`;

    const sendRes = await sendTelegramMessage(token, chatId, testMsg, 'HTML');
    if (!sendRes.success) {
      return {
        success: false,
        botName,
        username,
        error: `Token valid (${botName}), tetapi gagal kirim ke Chat ID ${chatId}: ${sendRes.error}. Pastikan Anda sudah menekan START di bot atau memasukkan bot ke grup tersebut.`,
      };
    }

    return {
      success: true,
      botName,
      username,
    };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Gagal menghubungi Telegram API' };
  }
}

/**
 * Format angka rupiah rapi
 */
function formatRupiah(num?: number | string): string {
  const val = parseInt(String(num || 0), 10);
  return Number.isNaN(val) ? '0' : val.toLocaleString('id-ID');
}

/**
 * Format sensor nomor WhatsApp untuk privasi
 */
function maskPhoneNumber(phone?: string): string {
  if (!phone) return '-';
  const clean = phone.replace(/\D/g, '');
  if (clean.length < 8) return phone;
  const start = clean.slice(0, 4);
  const end = clean.slice(-4);
  return `${start}****${end}`;
}

/**
 * Trigger: Notifikasi Pesanan Berhasil (PAID) ke Telegram
 */
export async function notifyTransactionPaid(
  tenantId: string,
  orderData: {
    orderId: string;
    productName: string;
    variantName?: string;
    totalPrice: number | string;
    buyerNumber?: string;
    storeName?: string;
    paidAt?: string;
  }
): Promise<boolean> {
  const config = getTelegramConfig(tenantId);
  if (!config.notifEnabled || config.adminDisabled || !config.isConfigured) {
    return false;
  }

  const store = orderData.storeName || 'Toko Anda';
  const timeStr = orderData.paidAt || new Date().toLocaleString('id-ID');
  const maskedPhone = maskPhoneNumber(orderData.buyerNumber);

  const text =
    `🛒 <b>PESANAN BERHASIL (LUNAS)</b>\n` +
    `🏪 <b>Toko:</b> ${store}\n\n` +
    `📦 <b>Produk:</b> ${orderData.productName}\n` +
    `🔖 <b>Varian:</b> ${orderData.variantName || '-'}\n` +
    `🧾 <b>Order ID:</b> <code>${orderData.orderId}</code>\n` +
    `💰 <b>Total Bayar:</b> Rp ${formatRupiah(orderData.totalPrice)}\n` +
    `📱 <b>Pembeli:</b> <code>${maskedPhone}</code>\n` +
    `💳 <b>Metode:</b> QRIS Realtime\n` +
    `⏰ <b>Waktu Lunas:</b> ${timeStr}\n\n` +
    `✅ <i>Pesanan telah berhasil dibayar. Produk otomatis diproses & dikirim ke chat pembeli.</i>`;

  const result = await sendTelegramMessage(config.botToken, config.chatId, text, 'HTML');
  return result.success;
}

/**
 * Trigger: Notifikasi Pesanan Gagal / Kedaluwarsa ke Telegram
 */
export async function notifyTransactionFailed(
  tenantId: string,
  orderData: {
    orderId: string;
    productName: string;
    variantName?: string;
    totalPrice: number | string;
    reason?: string;
    storeName?: string;
  }
): Promise<boolean> {
  const config = getTelegramConfig(tenantId);
  if (!config.notifEnabled || config.adminDisabled || !config.isConfigured) {
    return false;
  }

  const store = orderData.storeName || 'Toko Anda';
  const timeStr = new Date().toLocaleString('id-ID');
  const reason = orderData.reason || 'Batas waktu pembayaran QRIS habis / dibatalkan';

  const text =
    `❌ <b>PESANAN GAGAL / KEDALUWARSA</b>\n` +
    `🏪 <b>Toko:</b> ${store}\n\n` +
    `📦 <b>Produk:</b> ${orderData.productName}\n` +
    `🔖 <b>Varian:</b> ${orderData.variantName || '-'}\n` +
    `🧾 <b>Order ID:</b> <code>${orderData.orderId}</code>\n` +
    `💰 <b>Nominal:</b> Rp ${formatRupiah(orderData.totalPrice)}\n` +
    `⚠️ <b>Keterangan:</b> ${reason}\n` +
    `⏰ <b>Waktu:</b> ${timeStr}\n\n` +
    `ℹ️ <i>Pembeli belum menyelesaikan pembayaran QRIS tepat waktu.</i>`;

  const result = await sendTelegramMessage(config.botToken, config.chatId, text, 'HTML');
  return result.success;
}

/**
 * Pengiriman pesan pengumuman / resmi dari Master Admin ke Telegram Owner Toko
 */
export async function sendAdminMessageToTelegram(
  tenantId: string,
  adminMessage: string,
  storeName?: string
): Promise<{ success: boolean; error?: string }> {
  const config = getTelegramConfig(tenantId);

  if (!config.isConfigured) {
    return {
      success: false,
      error: 'Tenant ini belum mengonfigurasikan Bot Token atau Chat ID Telegram.',
    };
  }

  if (config.adminDisabled) {
    return {
      success: false,
      error: 'Bot Telegram tenant ini sedang dinonaktifkan oleh Master Admin. Aktifkan terlebih dahulu.',
    };
  }

  const store = storeName || tenantId;
  const timeStr = new Date().toLocaleString('id-ID');

  const text =
    `📢 <b>PEMBERITAHUAN RESMI MASTER ADMIN</b>\n` +
    `🏪 <b>Toko:</b> ${store} (<code>${tenantId}</code>)\n\n` +
    `${adminMessage.trim()}\n\n` +
    `────────────────────\n` +
    `⏰ <i>Pesan resmi dari Super Admin Platform • ${timeStr}</i>`;

  return sendTelegramMessage(config.botToken, config.chatId, text, 'HTML');
}
