/**
 * phoneUtils.ts
 * Utilitas pemformatan dan sanitasi nomor telepon Indonesia
 */

/**
 * Mengubah nomor telepon menjadi format tampilan input lokal (hanya angka setelah kode negara, diawali '8...')
 * Contoh:
 * '+6282173515807' -> '82173515807'
 * '6282173515807'  -> '82173515807'
 * '082173515807'   -> '82173515807'
 * '82173515807'    -> '82173515807'
 */
export function toDisplayPhone(raw?: string | null): string {
  if (!raw) return '';
  let digits = String(raw).replace(/\D/g, '');
  if (!digits) return '';

  if (digits.startsWith('62')) {
    digits = digits.slice(2);
  } else if (digits.startsWith('0')) {
    digits = digits.slice(1);
  }

  return digits;
}

/**
 * Mengubah nomor telepon lokal/mentah menjadi format resmi negara berawalan '+62'
 * Contoh:
 * '82173515807'    -> '+6282173515807'
 * '082173515807'   -> '+6282173515807'
 * '6282173515807'  -> '+6282173515807'
 * '+6282173515807' -> '+6282173515807'
 */
export function toOfficialPhone(raw?: string | null): string {
  if (!raw) return '';
  let digits = String(raw).replace(/\D/g, '');
  if (!digits) return '';

  if (digits.startsWith('0')) {
    digits = '62' + digits.slice(1);
  } else if (digits.startsWith('8')) {
    digits = '62' + digits;
  } else if (!digits.startsWith('62')) {
    digits = '62' + digits;
  }

  return `+${digits}`;
}

/**
 * Menghasilkan string nomor resmi berawalan '+' yang aman untuk preview / label (mencegah tanda '++')
 */
export function formatOfficialDisplay(raw?: string | null): string {
  if (!raw) return '';
  const official = toOfficialPhone(raw);
  return official;
}
