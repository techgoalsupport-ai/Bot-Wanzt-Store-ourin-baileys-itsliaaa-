import test from 'node:test';
import assert from 'node:assert/strict';
import {
  decomposeMilliseconds,
  formatCompactCountdown,
  formatTotalRentalDuration,
  calculateRemainingPercentage,
  formatExpiryDateTimeWIB,
} from './durationFormat.ts';

test('decomposeMilliseconds breaks down ms into days, hours, minutes, seconds cleanly', () => {
  const oneDay2Hr3Min4Sec =
    1 * 86_400_000 + 2 * 3_600_000 + 3 * 60_000 + 4 * 1_000;
  const parts = decomposeMilliseconds(oneDay2Hr3Min4Sec);

  assert.equal(parts.expired, false);
  assert.equal(parts.days, 1);
  assert.equal(parts.hours, 2);
  assert.equal(parts.minutes, 3);
  assert.equal(parts.seconds, 4);

  const expired = decomposeMilliseconds(-500);
  assert.equal(expired.expired, true);
  assert.equal(expired.days, 0);
  assert.equal(expired.seconds, 0);
});

test('formatCompactCountdown produces concise real-time strings for multi-day, hours, minutes, seconds, and expired', () => {
  const baseNow = Date.UTC(2026, 10, 12, 10, 0, 0);

  const plusDays = new Date(
    baseNow + 29 * 86_400_000 + 14 * 3_600_000 + 5 * 60_000 + 8 * 1000
  );
  const resDays = formatCompactCountdown(plusDays, baseNow);
  assert.equal(resDays.text, '29h 14j 05m 08d');
  assert.equal(resDays.expired, false);
  assert.equal(resDays.isUrgent, false);

  const plusHours = new Date(baseNow + 5 * 3_600_000 + 12 * 60_000 + 44 * 1000);
  const resHours = formatCompactCountdown(plusHours, baseNow);
  assert.equal(resHours.text, '05j 12m 44d');
  assert.equal(resHours.isUrgent, true);
  assert.equal(resHours.isCritical, false);

  const plusMinutes = new Date(baseNow + 14 * 60_000 + 9 * 1000);
  const resMinutes = formatCompactCountdown(plusMinutes, baseNow);
  assert.equal(resMinutes.text, '14m 09d');
  assert.equal(resMinutes.isUrgent, true);
  assert.equal(resMinutes.isCritical, true);

  const past = new Date(baseNow - 1000);
  const resExpired = formatCompactCountdown(past, baseNow);
  assert.equal(resExpired.expired, true);
  assert.equal(resExpired.text, 'Habis (00d)');
});

test('formatTotalRentalDuration formats minutes, hours, and days accurately without locking to Hari', () => {
  const start = new Date('2026-11-12T10:00:00.000Z');

  assert.equal(
    formatTotalRentalDuration(start, new Date('2026-11-12T10:15:00.000Z')),
    '15 Menit'
  );
  assert.equal(
    formatTotalRentalDuration(start, new Date('2026-11-12T15:00:00.000Z')),
    '5 Jam'
  );
  assert.equal(
    formatTotalRentalDuration(start, new Date('2026-11-12T12:30:00.000Z')),
    '2 Jam 30 Menit'
  );
  assert.equal(
    formatTotalRentalDuration(start, new Date('2026-12-12T10:00:00.000Z')),
    '30 Hari'
  );
});

test('calculateRemainingPercentage computes ms-based ratio and formatExpiryDateTimeWIB formats Asia/Jakarta time', () => {
  const start = new Date('2026-11-12T10:00:00.000Z');
  const end = new Date('2026-11-12T10:20:00.000Z');
  const mid = new Date('2026-11-12T10:10:00.000Z').getTime();

  assert.equal(calculateRemainingPercentage(start, end, mid), 50);
  assert.equal(calculateRemainingPercentage(start, end, end.getTime() + 1000), 0);

  const formatted = formatExpiryDateTimeWIB('2026-11-12T10:15:30.000Z', true);
  assert.ok(formatted.timeText.includes('17:15:30 WIB'));
});
