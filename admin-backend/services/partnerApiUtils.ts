import crypto from 'crypto';
import { DurationUnit } from '../types/admin.types.ts';

/**
 * Generate raw API key berprefiks `wzp_` dan 32 karakter hex acak.
 */
export function generatePartnerApiKey(): {
  rawKey: string;
  keyHash: string;
  prefixKey: string;
} {
  const randomPart = crypto.randomBytes(20).toString('hex');
  const rawKey = `wzp_${randomPart}`;
  const keyHash = hashPartnerApiKey(rawKey);
  const prefixKey = `${rawKey.slice(0, 12)}...${rawKey.slice(-4)}`;
  return { rawKey, keyHash, prefixKey };
}

/**
 * Hash API key menggunakan SHA-256 agar token mentah tidak pernah disimpan di database.
 */
export function hashPartnerApiKey(rawKey: string): string {
  return crypto.createHash('sha256').update(rawKey.trim()).digest('hex');
}

/**
 * Ekstrak API key dari header `x-api-key` atau `Authorization: Bearer <key>`.
 */
export function extractApiKeyFromHeaders(
  xApiKeyHeader?: string | string[],
  authorizationHeader?: string
): string | null {
  if (typeof xApiKeyHeader === 'string' && xApiKeyHeader.trim().length > 0) {
    return xApiKeyHeader.trim();
  }
  if (Array.isArray(xApiKeyHeader) && xApiKeyHeader.length > 0 && xApiKeyHeader[0].trim()) {
    return xApiKeyHeader[0].trim();
  }
  if (authorizationHeader && /^Bearer\s+/i.test(authorizationHeader)) {
    const token = authorizationHeader.replace(/^Bearer\s+/i, '').trim();
    return token.length > 0 ? token : null;
  }
  return null;
}

/**
 * Validasi dan normalisasi durasi dari payload API Partner.
 * Mendukung field fleksibel:
 * - Tenant: duration_value + duration_unit, atau duration_days, atau amount + unit
 * - Token: amount + unit (atau duration_value + duration_unit)
 */
export function parsePartnerDuration(
  body: Record<string, any>,
  options: { allowWeeks: boolean; defaultValue?: number; defaultUnit?: DurationUnit } = {
    allowWeeks: true,
    defaultValue: 30,
    defaultUnit: 'days',
  }
): { valid: true; amount: number; unit: DurationUnit; label: string } | { valid: false; message: string } {
  const allowedUnits: DurationUnit[] = options.allowWeeks
    ? ['minutes', 'hours', 'days', 'weeks', 'months']
    : ['minutes', 'hours', 'days', 'months'];

  const rawAmount =
    body.duration_value !== undefined
      ? body.duration_value
      : body.amount !== undefined
      ? body.amount
      : body.duration_days !== undefined
      ? body.duration_days
      : undefined;

  const rawUnit =
    body.duration_unit !== undefined
      ? body.duration_unit
      : body.unit !== undefined
      ? body.unit
      : body.duration_days !== undefined
      ? 'days'
      : undefined;

  let finalAmount: number;
  if (rawAmount === undefined || rawAmount === null || rawAmount === '') {
    if (options.defaultValue !== undefined) {
      finalAmount = options.defaultValue;
    } else {
      return { valid: false, message: 'Parameter durasi wajib diisi dengan angka bulat positif (> 0).' };
    }
  } else {
    const parsed = Number(rawAmount);
    if (!Number.isFinite(parsed) || !Number.isInteger(parsed) || parsed <= 0) {
      return { valid: false, message: 'Durasi harus berupa angka bulat positif lebih dari 0.' };
    }
    if (parsed > 3650) {
      return { valid: false, message: 'Durasi maksimal yang diperbolehkan adalah 3650.' };
    }
    finalAmount = parsed;
  }

  let finalUnit: DurationUnit;
  if (rawUnit === undefined || rawUnit === null || rawUnit === '') {
    finalUnit = options.defaultUnit || 'days';
  } else {
    const normalizedUnit = String(rawUnit).trim().toLowerCase() as DurationUnit;
    if (!allowedUnits.includes(normalizedUnit)) {
      return {
        valid: false,
        message: `Satuan waktu (unit) tidak valid. Pilihan yang didukung: ${allowedUnits.join(', ')}.`,
      };
    }
    finalUnit = normalizedUnit;
  }

  return {
    valid: true,
    amount: finalAmount,
    unit: finalUnit,
    label: formatDurationLabelId(finalAmount, finalUnit),
  };
}

export function formatDurationLabelId(amount: number, unit: DurationUnit): string {
  switch (unit) {
    case 'minutes':
      return `${amount} Menit`;
    case 'hours':
      return `${amount} Jam`;
    case 'weeks':
      return `${amount} Minggu`;
    case 'months':
      return `${amount} Bulan`;
    case 'days':
    default:
      return `${amount} Hari`;
  }
}

/**
 * Rate limiter berbasis sliding window di memori untuk mencegah brute-force/spam endpoint Partner API.
 */
export class SlidingWindowRateLimiter {
  private hits = new Map<string, number[]>();
  private readonly maxRequests: number;
  private readonly windowMs: number;

  constructor(maxRequests: number = 60, windowMs: number = 60_000) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
  }

  check(identifier: string, now: number = Date.now()): {
    allowed: boolean;
    remaining: number;
    retryAfterSeconds: number;
  } {
    const windowStart = now - this.windowMs;
    const timestamps = (this.hits.get(identifier) || []).filter((t) => t > windowStart);

    if (timestamps.length >= this.maxRequests) {
      const oldestInWindow = timestamps[0];
      const retryAfterMs = Math.max(1000, oldestInWindow + this.windowMs - now);
      this.hits.set(identifier, timestamps);
      return {
        allowed: false,
        remaining: 0,
        retryAfterSeconds: Math.ceil(retryAfterMs / 1000),
      };
    }

    timestamps.push(now);
    this.hits.set(identifier, timestamps);
    return {
      allowed: true,
      remaining: Math.max(0, this.maxRequests - timestamps.length),
      retryAfterSeconds: 0,
    };
  }

  reset(): void {
    this.hits.clear();
  }
}
