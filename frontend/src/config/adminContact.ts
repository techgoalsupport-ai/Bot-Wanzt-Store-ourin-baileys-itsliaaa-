/**
 * Konfigurasi Terpusat Kontak Master Admin
 *
 * File ini menyimpan nomor WhatsApp resmi Master Admin.
 * Jika sewaktu-waktu Anda ingin mengganti nomor WhatsApp Master Admin,
 * Anda cukup mengubah konstanta MASTER_ADMIN_PHONE di file ini!
 */

// Format lokal atau internasional (contoh: '085712439395' atau '6285712439395')
export const MASTER_ADMIN_PHONE = '085712439395';

/**
 * Mengubah nomor telepon menjadi format internasional angka bersih (diawali 62)
 * Contoh: '085712439395' -> '6285712439395'
 */
export function getMasterAdminCleanPhone(phone: string = MASTER_ADMIN_PHONE): string {
  const digits = phone.replace(/[^0-9]/g, '');
  if (digits.startsWith('0')) {
    return '62' + digits.slice(1);
  }
  if (digits.startsWith('8')) {
    return '62' + digits;
  }
  return digits;
}

/**
 * Menghasilkan tautan langsung WhatsApp ke Master Admin
 * Contoh: 'https://wa.me/6285712439395'
 */
export function getMasterAdminWaLink(customMessage?: string, phoneOverride?: string): string {
  const cleanPhone = getMasterAdminCleanPhone(phoneOverride || MASTER_ADMIN_PHONE);
  const base = `https://wa.me/${cleanPhone}`;
  if (customMessage) {
    return `${base}?text=${encodeURIComponent(customMessage)}`;
  }
  return base;
}
