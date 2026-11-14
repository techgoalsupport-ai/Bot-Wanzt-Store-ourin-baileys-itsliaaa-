/**
 * Memformat input kode token voucher ke bentuk XXXX-XXXX-XXXX-XXXX
 * (hanya alfanumerik A-Z0-9, huruf besar, maksimal 16 karakter).
 */
export function formatVoucherTokenInput(rawValue: string): string {
  let clean = (rawValue || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (clean.length > 16) {
    clean = clean.slice(0, 16);
  }

  const parts: string[] = [];
  for (let i = 0; i < clean.length; i += 4) {
    parts.push(clean.slice(i, i + 4));
  }
  return parts.join('-');
}

/**
 * Memvalidasi kelengkapan kode token voucher 16 karakter sebelum dikirim ke server.
 */
export function validateVoucherTokenInput(rawValue: string): {
  valid: boolean;
  clean: string;
  error?: string;
} {
  const clean = (rawValue || '').toUpperCase().replace(/[^A-Z0-9]/g, '').trim();
  if (!clean) {
    return {
      valid: false,
      clean,
      error: 'Silakan masukkan kode token voucher terlebih dahulu.',
    };
  }
  if (clean.length !== 16) {
    return {
      valid: false,
      clean,
      error: 'Format token tidak valid. Token harus 16 karakter huruf/angka (XXXX-XXXX-XXXX-XXXX).',
    };
  }
  return { valid: true, clean };
}
