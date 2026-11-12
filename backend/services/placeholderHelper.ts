import { CommandsConfig } from '../types/bot.types.ts';

export interface VariantPlaceholderContext {
  name?: string;
  variant?: string;
  category?: string;
  stock?: number | string;
  price?: number | string;
  orderId?: string;
  total?: number | string;
  unikCode?: number | string;
  promoCode?: string;
  discount?: number | string;
  finalPrice?: number | string;
  reason?: string;
  customerName?: string;
  customerNumber?: string;
  senderName?: string;
  senderNumber?: string;
  errorMessage?: string;
  tenantId?: string;
  remainingTime?: string;
  expiryDate?: string;
}

/**
 * Normalisasi nomor telepon Indonesia menjadi format kode negara standar tanpa '+' (contoh: 6282173515807)
 */
export function normalizeIndonesianPhone(raw: string | number | undefined | null): string {
  if (!raw) return '';
  let clean = String(raw).replace(/[^0-9]/g, '');
  if (!clean) return '';
  if (clean.startsWith('08')) {
    clean = '62' + clean.slice(1);
  } else if (clean.startsWith('8')) {
    clean = '62' + clean;
  }
  return clean;
}

/**
 * Normalisasi nomor telepon Indonesia menjadi format resmi negara berawalan '+' (contoh: +6282173515807)
 */
export function toOfficialIndonesianPhone(raw: string | number | undefined | null): string {
  const clean = normalizeIndonesianPhone(raw);
  return clean ? `+${clean}` : '';
}

/**
 * Menggantikan seluruh placeholder dinamis dari data Store Info, Varian Produk, dan Transaksi Invoice.
 * Kompatibel dengan semua jenis output teks, tombol, maupun footer di seluruh command.
 */
export function resolvePlaceholders(
  text: string,
  config: CommandsConfig,
  variant?: VariantPlaceholderContext
): string {
  if (!text) return '';

  const store = config.storeInfo || {
    storeName: 'Wanzt Store',
    ownerName: 'Wanzt',
    ownerNumber: '6282173515807',
    adminName: 'Admin Store',
    adminNumber: '6285712439395',
    webLink: 'https://wanztstore.web.id',
    telegramBot: '',
    waLink: '',
  };

  let res = text;

  // 1. Placeholder Informasi Toko (Store Info)
  // Mendukung {adminMumber} sebagai alias dari {adminNumber} (antisipasi typo dari konfigurasi)
  res = res
    .replace(/\{storeName\}|\{namaStore\}/gi, store.storeName || '')
    .replace(/\{ownerName\}|\{namaOwner\}/gi, store.ownerName || '')
    .replace(/\{ownerNumber\}|\{nomerOwner\}/gi, store.ownerNumber || '')
    .replace(/\{adminName\}|\{namaAdmin\}/gi, store.adminName || '')
    .replace(/\{adminNumber\}|\{adminMumber\}|\{nomerAdmin\}/gi, store.adminNumber || '')
    .replace(/\{webLink\}|\{linkWebsite\}/gi, store.webLink || '')
    .replace(/\{waLink\}|\{linkSaluran\}/gi, store.waLink || '')
    .replace(/\{telegramBot\}|\{botTelegram\}/gi, store.telegramBot || '');

  // 2. Placeholder Varian Produk & Transaksi Invoice (jika ada konteks varian / invoice / konfirmasi)
  if (variant) {
    const rawPrice = variant.price !== undefined ? variant.price : 0;
    const numPrice =
      typeof rawPrice === 'number'
        ? rawPrice
        : Number(String(rawPrice).replace(/[^0-9]/g, '')) || 0;
    const formattedPriceNum = numPrice.toLocaleString('id-ID');

    const rawTotal = variant.total !== undefined ? variant.total : numPrice;
    const numTotal =
      typeof rawTotal === 'number'
        ? rawTotal
        : Number(String(rawTotal).replace(/[^0-9]/g, '')) || 0;
    const formattedTotalNum = numTotal.toLocaleString('id-ID');

    const unikStr =
      variant.unikCode !== undefined
        ? String(variant.unikCode)
        : '';

    // Normalisasi harga: jika teks sudah memiliki "Rp {price}", hindari penggandaan Rp Rp
    res = res
      .replace(/Rp\s*\{price\}|Rp\s*\{harga\}/gi, `Rp ${formattedPriceNum}`)
      .replace(/\{price\}|\{harga\}/gi, formattedPriceNum)
      .replace(/Rp\s*\{total\}|Rp\s*\{totalBayar\}/gi, `Rp ${formattedTotalNum}`)
      .replace(/\{total\}|\{totalBayar\}/gi, formattedTotalNum)
      .replace(/\{produkName\}|\{productName\}/gi, variant.name || '')
      .replace(/\{category\}|\{kategori\}/gi, (variant.category || '').trim())
      .replace(/\{varian\}|\{variant\}/gi, variant.variant || '')
      .replace(/\{stock\}|\{stok\}/gi, variant.stock !== undefined ? String(variant.stock) : '')
      .replace(/\{orderId\}|\{order_id\}/gi, variant.orderId || '')
      .replace(/\{unikCode\}|\{kodeUnik\}|\{feeGateway\}/gi, unikStr);

    // 3. Placeholder Promo & Konfirmasi Checkout
    if (variant.promoCode !== undefined) {
      res = res.replace(/\{promoCode\}|\{kodePromo\}/gi, variant.promoCode);
    }

    if (variant.discount !== undefined) {
      const rawDisc = variant.discount;
      const numDisc =
        typeof rawDisc === 'number'
          ? rawDisc
          : Number(String(rawDisc).replace(/[^0-9]/g, '')) || 0;
      const formattedDisc = numDisc.toLocaleString('id-ID');
      res = res
        .replace(/Rp\s*\{discount\}|Rp\s*\{potongan\}|Rp\s*\{diskon\}/gi, `Rp ${formattedDisc}`)
        .replace(/\{discount\}|\{potongan\}|\{diskon\}/gi, formattedDisc);
    }

    if (variant.finalPrice !== undefined) {
      const rawFinal = variant.finalPrice;
      const numFinal =
        typeof rawFinal === 'number'
          ? rawFinal
          : Number(String(rawFinal).replace(/[^0-9]/g, '')) || 0;
      const formattedFinal = numFinal.toLocaleString('id-ID');
      res = res
        .replace(/Rp\s*\{finalPrice\}|Rp\s*\{hargaAkhir\}|Rp\s*\{totalDiskon\}/gi, `Rp ${formattedFinal}`)
        .replace(/\{finalPrice\}|\{hargaAkhir\}|\{totalDiskon\}/gi, formattedFinal);
    }

    if (variant.reason !== undefined) {
      res = res.replace(/\{reason\}|\{alasan\}|\{alasanBatal\}/gi, variant.reason);
    }

    // 4. Placeholder Pembeli, Kendala, & Status Sesi
    const custName = variant.customerName || variant.senderName || '';
    if (custName) {
      res = res.replace(/\{customerName\}|\{senderName\}|\{namaPembeli\}/gi, custName);
    }

    const custNum = variant.customerNumber || variant.senderNumber || '';
    if (custNum) {
      res = res.replace(/\{customerNumber\}|\{senderNumber\}|\{nomorPembeli\}|\{buyerNumber\}/gi, custNum);
    }

    const errMsg = variant.errorMessage || variant.reason || '';
    if (errMsg) {
      res = res.replace(/\{errorMessage\}|\{pesanError\}|\{kendala\}/gi, errMsg);
    }

    if (variant.tenantId !== undefined) {
      res = res.replace(/\{tenantId\}|\{idBot\}|\{idUnit\}/gi, variant.tenantId);
    }

    if (variant.remainingTime !== undefined) {
      res = res.replace(/\{remainingTime\}|\{sisaWaktu\}|\{sisaHari\}/gi, variant.remainingTime);
    }

    if (variant.expiryDate !== undefined) {
      res = res.replace(/\{expiryDate\}|\{waktuKedaluwarsa\}|\{tanggalExpired\}|\{paymentExpiry\}/gi, variant.expiryDate);
    }
  }

  return res;
}


