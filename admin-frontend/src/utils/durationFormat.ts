export interface DurationBreakdown {
  totalMs: number;
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  expired: boolean;
}

export interface CompactCountdownResult {
  text: string;
  expired: boolean;
  isUrgent: boolean;
  isCritical: boolean;
}

const pad2 = (n: number): string => String(Math.max(0, Math.floor(n))).padStart(2, '0');

export function decomposeMilliseconds(diffMs: number): DurationBreakdown {
  if (!Number.isFinite(diffMs) || diffMs <= 0) {
    return {
      totalMs: 0,
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
      expired: true,
    };
  }

  const totalSeconds = Math.floor(diffMs / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return {
    totalMs: diffMs,
    days,
    hours,
    minutes,
    seconds,
    expired: false,
  };
}

export function formatCompactCountdown(
  expiresAt: string | Date | undefined | null,
  nowMs: number = Date.now()
): CompactCountdownResult {
  if (!expiresAt) {
    return { text: '-', expired: false, isUrgent: false, isCritical: false };
  }

  const expTime = expiresAt instanceof Date ? expiresAt.getTime() : new Date(expiresAt).getTime();
  if (!Number.isFinite(expTime)) {
    return { text: '-', expired: false, isUrgent: false, isCritical: false };
  }

  const diffMs = expTime - nowMs;
  if (diffMs <= 0) {
    return {
      text: 'Habis (00d)',
      expired: true,
      isUrgent: false,
      isCritical: true,
    };
  }

  const { days, hours, minutes, seconds } = decomposeMilliseconds(diffMs);

  let text = '';
  if (days > 0) {
    text = `${days}h ${pad2(hours)}j ${pad2(minutes)}m ${pad2(seconds)}d`;
  } else if (hours > 0) {
    text = `${pad2(hours)}j ${pad2(minutes)}m ${pad2(seconds)}d`;
  } else if (minutes > 0) {
    text = `${pad2(minutes)}m ${pad2(seconds)}d`;
  } else {
    text = `${pad2(seconds)}d`;
  }

  return {
    text,
    expired: false,
    isUrgent: diffMs < 24 * 60 * 60 * 1000,
    isCritical: diffMs < 60 * 60 * 1000,
  };
}

export function formatTotalRentalDuration(
  createdAt: string | Date | undefined | null,
  expiresAt: string | Date | undefined | null,
  fallbackDays?: number
): string {
  const createdMs = createdAt
    ? createdAt instanceof Date
      ? createdAt.getTime()
      : new Date(createdAt).getTime()
    : NaN;
  const expMs = expiresAt
    ? expiresAt instanceof Date
      ? expiresAt.getTime()
      : new Date(expiresAt).getTime()
    : NaN;

  if (!Number.isFinite(createdMs) || !Number.isFinite(expMs) || expMs <= createdMs) {
    if (fallbackDays !== undefined && fallbackDays > 0) {
      return `${fallbackDays} Hari`;
    }
    return '30 Hari';
  }

  const diffMs = expMs - createdMs;

  if (diffMs < 60_000) {
    const secs = Math.max(1, Math.round(diffMs / 1000));
    return `${secs} Detik`;
  }

  if (diffMs < 3_600_000) {
    const mins = Math.max(1, Math.round(diffMs / 60_000));
    return `${mins} Menit`;
  }

  if (diffMs < 86_400_000) {
    const totalMins = Math.round(diffMs / 60_000);
    const hrs = Math.floor(totalMins / 60);
    const mins = totalMins % 60;
    return mins > 0 ? `${hrs} Jam ${mins} Menit` : `${hrs} Jam`;
  }

  const totalMins = Math.round(diffMs / 60_000);
  const days = Math.floor(totalMins / 1440);
  const remMins = totalMins % 1440;
  const remHours = Math.floor(remMins / 60);

  // Tangani selisih 1 jam akibat pergeseran DST saat kalkulasi bulan/hari kalender
  if (days >= 2 && (remHours === 1 || remHours === 23) && remMins % 60 === 0) {
    return `${Math.round(diffMs / 86_400_000)} Hari`;
  }

  return remHours > 0 ? `${days} Hari ${remHours} Jam` : `${days} Hari`;
}

export function calculateRemainingPercentage(
  createdAt: string | Date | undefined | null,
  expiresAt: string | Date | undefined | null,
  nowMs: number = Date.now()
): number {
  if (!expiresAt) return 0;
  const expMs = expiresAt instanceof Date ? expiresAt.getTime() : new Date(expiresAt).getTime();
  if (!Number.isFinite(expMs)) return 0;

  const remainingMs = expMs - nowMs;
  if (remainingMs <= 0) return 0;

  const createdMs = createdAt
    ? createdAt instanceof Date
      ? createdAt.getTime()
      : new Date(createdAt).getTime()
    : NaN;

  const totalWindowMs =
    Number.isFinite(createdMs) && expMs > createdMs
      ? expMs - createdMs
      : 30 * 24 * 60 * 60 * 1000;

  const pct = Math.round((remainingMs / Math.max(remainingMs, totalWindowMs)) * 100);
  return Math.min(100, Math.max(1, pct));
}

export function formatExpiryDateTimeWIB(
  dateInput: string | Date | undefined | null,
  longDate: boolean = false
): { dateText: string; timeText: string } {
  if (!dateInput) {
    return { dateText: '-', timeText: '-' };
  }

  const d = dateInput instanceof Date ? dateInput : new Date(dateInput);
  if (isNaN(d.getTime())) {
    return { dateText: '-', timeText: '-' };
  }

  try {
    const dateText = new Intl.DateTimeFormat(
      'id-ID',
      longDate
        ? {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric',
            timeZone: 'Asia/Jakarta',
          }
        : {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            timeZone: 'Asia/Jakarta',
          }
    ).format(d);

    const timeParts = new Intl.DateTimeFormat('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
      second: longDate ? '2-digit' : undefined,
      hour12: false,
      timeZone: 'Asia/Jakarta',
    })
      .format(d)
      .replace(/\./g, ':');

    return {
      dateText,
      timeText: `${timeParts} WIB`,
    };
  } catch {
    return {
      dateText: d.toLocaleDateString('id-ID'),
      timeText: `${pad2(d.getHours())}:${pad2(d.getMinutes())} WIB`,
    };
  }
}
