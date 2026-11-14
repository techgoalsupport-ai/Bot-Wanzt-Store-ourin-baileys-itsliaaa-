export type ExpiryWarningStage = 'h_3d' | 'h_1d' | 'h_5h' | 'h_1h';

export interface ExpiryWarningFlags {
  warned_3d?: number;
  warned_1d?: number;
  warned_5h?: number;
  warned_1h?: number;
}

export interface ExpiryStageMatch {
  stage: ExpiryWarningStage;
  stageLabel: string;
}

export const MINUTE_MS = 60 * 1000;
export const HOUR_MS = 60 * MINUTE_MS;
export const DAY_MS = 24 * HOUR_MS;

/**
 * Memformat selisih waktu riil (ms) menjadi teks sisa waktu bahasa Indonesia yang akurat.
 * Contoh: "1 Jam Lagi", "45 Menit Lagi", "5 Jam Lagi", "24 Jam (1 Hari) Lagi", "2 Hari 18 Jam Lagi".
 */
export function formatRemainingWarningLabel(diffMs: number): string {
  if (!Number.isFinite(diffMs) || diffMs <= 0) {
    return 'Segera Berakhir';
  }

  // Toleransi pembulatan untuk titik milestone utama agar sesuai interval cron 5 menit
  if (diffMs >= 55 * MINUTE_MS && diffMs <= 65 * MINUTE_MS) {
    return '1 Jam Lagi';
  }
  if (diffMs >= 4 * HOUR_MS + 55 * MINUTE_MS && diffMs <= 5 * HOUR_MS + 10 * MINUTE_MS) {
    return '5 Jam Lagi';
  }
  if (diffMs >= 23 * HOUR_MS + 50 * MINUTE_MS && diffMs <= 24 * HOUR_MS + 15 * MINUTE_MS) {
    return '24 Jam (1 Hari) Lagi';
  }
  if (diffMs >= 71 * HOUR_MS + 50 * MINUTE_MS && diffMs <= 72 * HOUR_MS + 15 * MINUTE_MS) {
    return '3 Hari Lagi';
  }

  const totalMinutes = Math.max(1, Math.round(diffMs / MINUTE_MS));

  if (totalMinutes < 60) {
    return `${totalMinutes} Menit Lagi`;
  }

  if (totalMinutes < 24 * 60) {
    const hours = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;
    return mins > 0 ? `${hours} Jam ${mins} Menit Lagi` : `${hours} Jam Lagi`;
  }

  const days = Math.floor(totalMinutes / (24 * 60));
  const remHours = Math.floor((totalMinutes % (24 * 60)) / 60);
  return remHours > 0 ? `${days} Hari ${remHours} Jam Lagi` : `${days} Hari Lagi`;
}

/**
 * Mengevaluasi tahap peringatan masa sewa berdasarkan jendela target yang akurat.
 * Mencegah sisa ~1 jam masuk ke tahap 5 jam dan mencegah sisa ~1 hari masuk ke tahap 3 hari.
 */
export function evaluateExpiryWarningStage(
  diffMs: number,
  flags: ExpiryWarningFlags
): ExpiryStageMatch | null {
  if (!Number.isFinite(diffMs) || diffMs <= 0) {
    return null;
  }

  // 1. Tahap 1 Jam (termasuk grace 10 menit di atas 1 jam agar 1 jam lebih sedikit tetap masuk 1 jam)
  if (diffMs <= 1 * HOUR_MS + 10 * MINUTE_MS) {
    if (!flags.warned_1h) {
      return { stage: 'h_1h', stageLabel: formatRemainingWarningLabel(diffMs) };
    }
    return null;
  }

  // 2. Tahap 5 Jam (jendela 3 jam .. 5 jam 10 menit)
  if (diffMs >= 3 * HOUR_MS && diffMs <= 5 * HOUR_MS + 10 * MINUTE_MS) {
    if (!flags.warned_5h) {
      return { stage: 'h_5h', stageLabel: formatRemainingWarningLabel(diffMs) };
    }
    return null;
  }

  // 3. Tahap 1 Hari / 24 Jam (jendela 18 jam .. 24 jam 15 menit)
  if (diffMs >= 18 * HOUR_MS && diffMs <= 24 * HOUR_MS + 15 * MINUTE_MS) {
    if (!flags.warned_1d) {
      return { stage: 'h_1d', stageLabel: formatRemainingWarningLabel(diffMs) };
    }
    return null;
  }

  // 4. Tahap 3 Hari / 72 Jam (jendela 48 jam .. 72 jam 15 menit)
  if (diffMs >= 48 * HOUR_MS && diffMs <= 72 * HOUR_MS + 15 * MINUTE_MS) {
    if (!flags.warned_3d) {
      return { stage: 'h_3d', stageLabel: formatRemainingWarningLabel(diffMs) };
    }
    return null;
  }

  return null;
}
