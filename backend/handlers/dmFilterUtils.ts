import { normalizeIndonesianPhone } from '../services/placeholderHelper.ts';

/**
 * Durasi batas waktu sesi konfirmasi checkout (promo / bayar langsung) = 3 menit.
 */
export const CHECKOUT_SESSION_TIMEOUT_MS = 3 * 60 * 1000;

export interface DmFilterContext {
  groupOnly: boolean;
  isGroup: boolean;
  cleanBtn: string;
  hasActiveCheckoutSession: boolean;
}

/**
 * Menentukan apakah pesan masuk berhak masuk ke pemrosesan awal dispatcher
 * saat mode "Grup Only" aktif (ON).
 *
 * Saat `groupOnly === true` dan pesan berasal dari chat pribadi (`!isGroup`):
 * - Hanya tombol checkout (`checkout_promo`, `checkout_direct`, baik aktif maupun kedaluwarsa agar mengirim notifikasi habis waktu)
 *   serta sesi checkout aktif (`activeCheckoutSessions` untuk input promo / `BATAL` / `PROMO` / `BAYAR`) yang diizinkan lewat.
 * - Semua pemicu awal lain di DM (.menu, .list, .ht, nama produk, chat biasa) diblokir total (diam tanpa balasan).
 */
export function shouldAllowIncomingInDispatcher(ctx: DmFilterContext): boolean {
  if (!ctx.groupOnly) return true;
  if (ctx.isGroup) return true;

  const btnLower = (ctx.cleanBtn || '').trim().toLowerCase();
  if (
    btnLower === 'checkout_promo' ||
    btnLower.includes('checkout_promo') ||
    btnLower === 'checkout_direct' ||
    btnLower.includes('checkout_direct')
  ) {
    return true;
  }

  if (ctx.hasActiveCheckoutSession) {
    return true;
  }

  return false;
}

/**
 * Membangun tombol "Hubungi Admin" bertipe cta_url menuju https://wa.me/{nomerAdmin}
 * untuk pesan invoice pembayaran QRIS.
 */
export function buildInvoiceContactButtons(
  adminNumber?: string | null,
  ownerNumber?: string | null
): Array<{ text: string; url: string }> {
  const cleanAdmin = normalizeIndonesianPhone(adminNumber);
  const cleanOwner = normalizeIndonesianPhone(ownerNumber);
  const targetPhone = cleanAdmin || cleanOwner;

  if (!targetPhone) {
    return [];
  }

  return [
    {
      text: '📞 Hubungi Admin',
      url: `https://wa.me/${targetPhone}`,
    },
  ];
}
