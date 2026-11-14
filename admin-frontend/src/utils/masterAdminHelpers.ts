/**
 * Menampilkan digit nomor Indonesia lokal setelah prefix +62 (misal '85712439395')
 */
export function toAdminDisplayPhone(raw: string): string {
  const digits = String(raw || '').replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith('62')) {
    return digits.slice(2);
  }
  if (digits.startsWith('0')) {
    return digits.slice(1);
  }
  return digits;
}

/**
 * Mengonversi input lokal/internasional menjadi format resmi +628...
 */
export function toAdminOfficialPhone(raw: string): string {
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
 * Mengambil angka bersih 628... untuk link wa.me
 */
export function toAdminWaDigits(raw: string): string {
  return toAdminOfficialPhone(raw).replace(/\D/g, '');
}

/**
 * Membagi total probabilitas 100% secara merata untuk N admin
 */
export function equalizeAdminWeights(count: number): number[] {
  if (count <= 0) return [];
  if (count === 1) return [100];

  const base = Math.floor(100 / count);
  const remainder = 100 - base * count;
  return Array.from({ length: count }, (_, idx) => (idx < remainder ? base + 1 : base));
}

/**
 * Menyeimbangkan bobot persentase seluruh slider agar total selalu tepat 100%
 */
export function rebalanceAdminWeights(
  weights: number[],
  changedIndex: number,
  requestedValue: number
): number[] {
  const len = weights.length;
  if (len === 0) return [];
  if (len === 1) return [100];
  if (changedIndex < 0 || changedIndex >= len) {
    return equalizeAdminWeights(len);
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

  if (otherIndices.length === 1) {
    result[otherIndices[0]] = remaining;
    return result;
  }

  const sanitizedOthers = otherIndices.map((idx) => Math.max(0, Math.round(Number(weights[idx]) || 0)));
  const otherTotal = sanitizedOthers.reduce((sum, val) => sum + val, 0);

  if (otherTotal <= 0) {
    const even = equalizeAdminWeights(otherIndices.length);
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
