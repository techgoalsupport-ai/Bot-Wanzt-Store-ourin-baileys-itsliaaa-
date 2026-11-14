export type TenantAccountStatus = 'active' | 'suspended' | 'expired';

/**
 * Mengevaluasi apakah timestamp kedaluwarsa (expires_at) sudah melewati waktu sekarang.
 * Mengembalikan true tepat ketika waktu sekarang >= expires_at.
 */
export function isTenantTimestampExpired(
  expiresAt: string | null | undefined,
  nowMs: number = Date.now()
): boolean {
  if (!expiresAt || typeof expiresAt !== 'string') {
    return false;
  }
  const expMs = new Date(expiresAt).getTime();
  if (!Number.isFinite(expMs)) {
    return false;
  }
  return expMs <= nowMs;
}

/**
 * Menentukan status efektif tenant secara real-time berdasarkan status tersimpan
 * dan timestamp expires_at.
 * - Status 'suspended' selalu diprioritaskan (tidak tertimpa 'expired').
 * - Status 'active' otomatis berubah menjadi 'expired' tepat saat expires_at <= nowMs.
 */
export function resolveEffectiveTenantStatus(
  status: string | null | undefined,
  expiresAt: string | null | undefined,
  nowMs: number = Date.now()
): TenantAccountStatus {
  if (status === 'suspended') {
    return 'suspended';
  }
  if (status === 'expired') {
    return 'expired';
  }
  if (isTenantTimestampExpired(expiresAt, nowMs)) {
    return 'expired';
  }
  return 'active';
}
