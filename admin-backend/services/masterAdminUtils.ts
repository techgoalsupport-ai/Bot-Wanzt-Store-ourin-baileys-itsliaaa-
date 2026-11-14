export interface MasterAdminContactInput {
  id?: number;
  name: string;
  phone: string;
  weight: number;
}

export interface MasterAdminContactRecord {
  id: number;
  name: string;
  phone: string;
  cleanPhone: string;
  weight: number;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export const DEFAULT_MASTER_ADMIN_NAME = 'Master Admin Utama';
export const DEFAULT_MASTER_ADMIN_PHONE = '+6285712439395';
export const DEFAULT_MASTER_ADMIN_CLEAN_PHONE = '6285712439395';

/**
 * Mengonversi nomor WhatsApp ke format resmi Indonesia (+628...)
 */
export function normalizeMasterAdminPhone(raw: string): string {
  let digits = String(raw || '').replace(/\D/g, '');
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
 * Mengonversi nomor WhatsApp ke angka bersih untuk tautan wa.me (628...)
 */
export function toCleanWaDigits(raw: string): string {
  const normalized = normalizeMasterAdminPhone(raw);
  return normalized.replace(/\D/g, '');
}

/**
 * Membagi total probabilitas 100% secara merata untuk N admin (misal: [50, 50] atau [34, 33, 33])
 */
export function equalizeWeights(count: number): number[] {
  if (count <= 0) return [];
  if (count === 1) return [100];

  const base = Math.floor(100 / count);
  const remainder = 100 - base * count;
  return Array.from({ length: count }, (_, idx) => (idx < remainder ? base + 1 : base));
}

/**
 * Menyeimbangkan bobot persentase seluruh admin secara otomatis agar total selalu tepat 100%
 * saat salah satu slider digeser. Mendukung nilai 0% hingga 100%.
 */
export function rebalanceWeights(
  weights: number[],
  changedIndex: number,
  requestedValue: number
): number[] {
  const len = weights.length;
  if (len === 0) return [];
  if (len === 1) return [100];
  if (changedIndex < 0 || changedIndex >= len) {
    return equalizeWeights(len);
  }

  const clampedTarget = Math.max(0, Math.min(100, Math.round(requestedValue)));
  const remaining = 100 - clampedTarget;

  const otherIndices: number[] = [];
  for (let i = 0; i < len; i++) {
    if (i !== changedIndex) otherIndices.push(i);
  }

  const result = new Array<number>(len).fill(0);
  result[changedIndex] = clampedTarget;

  if (remaining === 0) {
    return result;
  }

  // Untuk 2 admin, seluruh sisa langsung diberikan ke admin satunya (presisi 100%)
  if (otherIndices.length === 1) {
    result[otherIndices[0]] = remaining;
    return result;
  }

  const sanitizedOthers = otherIndices.map((idx) => Math.max(0, Math.round(Number(weights[idx]) || 0)));
  const otherTotal = sanitizedOthers.reduce((sum, val) => sum + val, 0);

  if (otherTotal <= 0) {
    const even = equalizeWeights(otherIndices.length);
    let distributed = 0;
    otherIndices.forEach((origIdx, pos) => {
      const share = Math.round((even[pos] / 100) * remaining);
      result[origIdx] = share;
      distributed += share;
    });
    const diff = remaining - distributed;
    if (diff !== 0) {
      result[otherIndices[0]] = Math.max(0, result[otherIndices[0]] + diff);
    }
    return result;
  }

  // Distribusi proporsional memakai metode Largest Remainder agar jumlah selalu pas
  const exactShares = sanitizedOthers.map((val) => (val / otherTotal) * remaining);
  const floored = exactShares.map((s) => Math.floor(s));
  let leftover = remaining - floored.reduce((a, b) => a + b, 0);

  const remainders = exactShares
    .map((s, idx) => ({ idx, rem: s - floored[idx] }))
    .sort((a, b) => b.rem - a.rem);

  for (let i = 0; i < remainders.length && leftover > 0; i++) {
    floored[remainders[i].idx] += 1;
    leftover -= 1;
  }

  otherIndices.forEach((origIdx, pos) => {
    result[origIdx] = floored[pos];
  });

  return result;
}

export interface ValidationResult {
  valid: boolean;
  error?: string;
  normalizedItems: {
    name: string;
    phone: string;
    weight: number;
  }[];
}

/**
 * Memvalidasi daftar kontak Master Admin sebelum disimpan ke database
 */
export function validateMasterAdminList(items: MasterAdminContactInput[]): ValidationResult {
  if (!Array.isArray(items) || items.length === 0) {
    return {
      valid: false,
      error: 'Minimal harus terdapat 1 kontak Master Admin yang aktif.',
      normalizedItems: [],
    };
  }

  const normalizedItems: { name: string; phone: string; weight: number }[] = [];
  const seenPhones = new Set<string>();
  let totalWeight = 0;
  let activeCount = 0;

  for (let i = 0; i < items.length; i++) {
    const row = items[i];
    const cleanName = String(row?.name || '').trim();
    if (!cleanName) {
      return {
        valid: false,
        error: `Nama Master Admin #${i + 1} wajib diisi.`,
        normalizedItems: [],
      };
    }

    const normalizedPhone = normalizeMasterAdminPhone(String(row?.phone || ''));
    const digitsOnly = normalizedPhone.replace(/\D/g, '');
    if (!digitsOnly || digitsOnly.length < 10 || digitsOnly.length > 16) {
      return {
        valid: false,
        error: `Nomor WhatsApp "${cleanName}" tidak valid (minimal 8 digit setelah +62).`,
        normalizedItems: [],
      };
    }

    if (seenPhones.has(digitsOnly)) {
      return {
        valid: false,
        error: `Nomor WhatsApp ${normalizedPhone} terduplikasi. Setiap Master Admin harus memakai nomor yang berbeda.`,
        normalizedItems: [],
      };
    }
    seenPhones.add(digitsOnly);

    const rawWeight = Number(row?.weight);
    if (!Number.isFinite(rawWeight) || rawWeight < 0 || rawWeight > 100) {
      return {
        valid: false,
        error: `Persentase peluang "${cleanName}" harus berada di antara 0% sampai 100%.`,
        normalizedItems: [],
      };
    }

    const intWeight = Math.round(rawWeight);
    totalWeight += intWeight;
    if (intWeight > 0) {
      activeCount += 1;
    }

    normalizedItems.push({
      name: cleanName,
      phone: normalizedPhone,
      weight: intWeight,
    });
  }

  if (activeCount === 0 || totalWeight === 0) {
    return {
      valid: false,
      error: 'Minimal harus ada 1 Master Admin dengan probabilitas lebih dari 0%.',
      normalizedItems: [],
    };
  }

  if (totalWeight !== 100) {
    return {
      valid: false,
      error: `Total seluruh probabilitas Master Admin harus tepat 100% (saat ini ${totalWeight}%).`,
      normalizedItems: [],
    };
  }

  return {
    valid: true,
    normalizedItems,
  };
}

/**
 * Memilih 1 kontak Master Admin secara acak berbobot berdasarkan persentase masing-masing.
 * @param admins Daftar kontak Master Admin
 * @param randomFloatFn Fungsi penghasil angka acak [0, 1) yang bisa di-inject untuk unit test
 */
export function pickWeightedMasterAdmin<T extends { name: string; phone: string; weight: number }>(
  admins: T[],
  randomFloatFn: () => number = Math.random
): T {
  const eligible = admins.filter((a) => Number(a.weight) > 0);
  if (eligible.length === 0) {
    if (admins.length > 0) {
      return admins[0];
    }
    return {
      name: DEFAULT_MASTER_ADMIN_NAME,
      phone: DEFAULT_MASTER_ADMIN_PHONE,
      weight: 100,
    } as T;
  }

  if (eligible.length === 1) {
    return eligible[0];
  }

  const totalWeight = eligible.reduce((sum, item) => sum + Number(item.weight), 0);
  const rawRand = randomFloatFn();
  const safeRand = Number.isFinite(rawRand) ? Math.min(0.999999999999, Math.max(0, rawRand)) : 0;
  let threshold = safeRand * totalWeight;

  for (let i = 0; i < eligible.length; i++) {
    threshold -= Number(eligible[i].weight);
    if (threshold < 0) {
      return eligible[i];
    }
  }

  return eligible[eligible.length - 1];
}
