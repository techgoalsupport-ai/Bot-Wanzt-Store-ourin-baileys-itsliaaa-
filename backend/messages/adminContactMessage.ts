import { CommandsConfig } from '../types/bot.types.ts';
import { resolvePlaceholders, normalizeIndonesianPhone } from '../services/placeholderHelper.ts';
import { DEFAULT_CONTACT_OWNER_EMPTY_TEMPLATE, DEFAULT_CONTACT_ADMIN_EMPTY_TEMPLATE } from '../config/configManager.ts';

/**
 * Mengirimkan vCard kontak Owner Toko dari data Store Info
 */
export async function sendOwnerContactMessage(
  sock: any,
  config: CommandsConfig,
  remoteJid: string,
  quotedMsg?: any,
  addLog?: (type: 'info' | 'success' | 'warning' | 'error' | 'code', msg: string) => void
): Promise<void> {
  if (!sock) return;

  const store = config.storeInfo || {
    storeName: 'Wanzt Store',
    ownerName: 'Wanzt',
    ownerNumber: '6282173515807',
  };

  const displayName = resolvePlaceholders(store.ownerName || '{ownerName}', config) || 'Owner Store';
  const orgName = resolvePlaceholders(store.storeName || '{storeName}', config) || 'Wanzt Store';
  const rawNumber = resolvePlaceholders(store.ownerNumber || '{ownerNumber}', config);
  const cleanNumber = normalizeIndonesianPhone(rawNumber);

  if (!cleanNumber) {
    try {
      const ownerEmptyTpl = config.contactOwnerEmptyText || DEFAULT_CONTACT_OWNER_EMPTY_TEMPLATE;
      const ownerEmptyMsg = resolvePlaceholders(ownerEmptyTpl, config);
      await sock.sendMessage(
        remoteJid,
        { text: ownerEmptyMsg },
        quotedMsg ? { quoted: quotedMsg } : undefined
      );
      if (addLog) {
        addLog('warning', `⚠️ Nomor owner belum di-set pada Store Info.`);
      }
    } catch (err: any) {
      if (addLog) {
        addLog('error', `Gagal mengirim pesan info owner: ${err?.message || err}`);
      }
    }
    return;
  }

  const vcard =
    'BEGIN:VCARD\n' +
    'VERSION:3.0\n' +
    `FN:${displayName}\n` +
    `ORG:${orgName};\n` +
    `TEL;type=CELL;type=VOICE;waid=${cleanNumber}:+${cleanNumber}\n` +
    'END:VCARD';

  try {
    await sock.sendMessage(
      remoteJid,
      {
        contacts: {
          displayName,
          contacts: [{ vcard }],
        },
      },
      quotedMsg ? { quoted: quotedMsg } : undefined
    );
    if (addLog) {
      addLog('success', `👑 Berhasil mengirimkan kartu kontak (vCard) Owner: ${displayName} (${cleanNumber}) ke ${remoteJid}`);
    }
  } catch (err: any) {
    if (addLog) {
      addLog('error', `Gagal mengirim kontak owner: ${err?.message || err}`);
    }
  }
}

/**
 * Mengirimkan vCard kontak Admin Toko dari data Store Info
 * Karena data admin bersifat opsional: jika form admin kosong, kirimkan pesan peringatan
 */
export async function sendAdminContactMessage(
  sock: any,
  config: CommandsConfig,
  remoteJid: string,
  quotedMsg?: any,
  addLog?: (type: 'info' | 'success' | 'warning' | 'error' | 'code', msg: string) => void
): Promise<void> {
  if (!sock) return;

  const store = config.storeInfo;
  const rawNumber = store?.adminNumber ? String(store.adminNumber).trim() : '';
  const cleanNumber = normalizeIndonesianPhone(rawNumber);

  // Pengecekan form opsional admin: jika form kosong / belum diatur
  if (!cleanNumber) {
    try {
      const adminEmptyTpl = config.contactAdminEmptyText || DEFAULT_CONTACT_ADMIN_EMPTY_TEMPLATE;
      const adminEmptyMsg = resolvePlaceholders(adminEmptyTpl, config);
      await sock.sendMessage(
        remoteJid,
        { text: adminEmptyMsg },
        quotedMsg ? { quoted: quotedMsg } : undefined
      );
      if (addLog) {
        addLog('info', `ℹ️ Form admin belum di-set. Mengirimkan pesan status admin ke ${remoteJid}`);
      }
    } catch (err: any) {
      if (addLog) {
        addLog('error', `Gagal mengirim pesan status admin: ${err?.message || err}`);
      }
    }
    return;
  }

  // Jika form admin terisi, susun dan kirim vCard
  const displayName = resolvePlaceholders(store?.adminName || '{adminName}', config) || 'Admin Store';
  const orgName = resolvePlaceholders(store?.storeName || '{storeName}', config) || 'Wanzt Store';

  const vcard =
    'BEGIN:VCARD\n' +
    'VERSION:3.0\n' +
    `FN:${displayName}\n` +
    `ORG:${orgName};\n` +
    `TEL;type=CELL;type=VOICE;waid=${cleanNumber}:+${cleanNumber}\n` +
    'END:VCARD';

  try {
    await sock.sendMessage(
      remoteJid,
      {
        contacts: {
          displayName,
          contacts: [{ vcard }],
        },
      },
      quotedMsg ? { quoted: quotedMsg } : undefined
    );
    if (addLog) {
      addLog('success', `📞 Berhasil mengirimkan kartu kontak (vCard) Admin: ${displayName} (${cleanNumber}) ke ${remoteJid}`);
    }
  } catch (err: any) {
    if (addLog) {
      addLog('error', `Gagal mengirim kontak admin: ${err?.message || err}`);
    }
  }
}

/**
 * Mengirimkan vCard kontak Admin untuk tombol Invoice.
 * Sesuai spesifikasi: Jika nomor admin pada dashboard kosong (karena opsional),
 * maka bot secara otomatis mengirimkan vCard nomor Owner toko.
 */
export async function sendInvoiceAdminContactMessage(
  sock: any,
  config: CommandsConfig,
  remoteJid: string,
  quotedMsg?: any,
  addLog?: (type: 'info' | 'success' | 'warning' | 'error' | 'code', msg: string) => void
): Promise<void> {
  if (!sock) return;

  const store = config.storeInfo;
  const adminRaw = store?.adminNumber ? String(store.adminNumber).trim() : '';
  const adminClean = normalizeIndonesianPhone(adminRaw);

  // 1. Jika nomor admin diisi di dashboard, kirim vCard Admin
  if (adminClean) {
    const displayName = resolvePlaceholders(store?.adminName || '{adminName}', config) || 'Admin Store';
    const orgName = resolvePlaceholders(store?.storeName || '{storeName}', config) || 'Wanzt Store';
    const vcard =
      'BEGIN:VCARD\n' +
      'VERSION:3.0\n' +
      `FN:${displayName}\n` +
      `ORG:${orgName};\n` +
      `TEL;type=CELL;type=VOICE;waid=${adminClean}:+${adminClean}\n` +
      'END:VCARD';

    try {
      await sock.sendMessage(
        remoteJid,
        {
          contacts: {
            displayName,
            contacts: [{ vcard }],
          },
        },
        quotedMsg ? { quoted: quotedMsg } : undefined
      );
      if (addLog) {
        addLog('success', `📞 Berhasil mengirimkan kartu kontak (vCard) Admin: ${displayName} (${adminClean}) ke ${remoteJid}`);
      }
    } catch (err: any) {
      if (addLog) {
        addLog('error', `Gagal mengirim kontak admin: ${err?.message || err}`);
      }
    }
    return;
  }

  // 2. Jika form admin kosong (karena opsional), otomatis kirimkan vCard nomor Owner!
  if (addLog) {
    addLog('info', `ℹ️ Nomor admin tidak diisi di dashboard. Mengalihkan pengiriman vCard ke nomor Owner...`);
  }
  await sendOwnerContactMessage(sock, config, remoteJid, quotedMsg, addLog);
}

