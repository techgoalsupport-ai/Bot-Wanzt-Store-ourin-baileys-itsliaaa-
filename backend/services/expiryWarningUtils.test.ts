import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DAY_MS,
  HOUR_MS,
  MINUTE_MS,
  evaluateExpiryWarningStage,
  formatRemainingWarningLabel,
} from './expiryWarningUtils.ts';

const cleanFlags = { warned_3d: 0, warned_1d: 0, warned_5h: 0, warned_1h: 0 };

test('1 hour remaining (exact, slightly under, or slightly over with cron grace) triggers h_1h and not h_5h', () => {
  const exact1h = evaluateExpiryWarningStage(1 * HOUR_MS, cleanFlags);
  assert.deepEqual(exact1h, { stage: 'h_1h', stageLabel: '1 Jam Lagi' });

  const under1h = evaluateExpiryWarningStage(57 * MINUTE_MS, cleanFlags);
  assert.deepEqual(under1h, { stage: 'h_1h', stageLabel: '1 Jam Lagi' });

  // Bug case sebelumnya: sisa 1 jam 4 menit malah masuk h_5h ("5 Jam Lagi")
  const over1hGrace = evaluateExpiryWarningStage(1 * HOUR_MS + 4 * MINUTE_MS, cleanFlags);
  assert.deepEqual(over1hGrace, { stage: 'h_1h', stageLabel: '1 Jam Lagi' });

  const slightlyMoreOver = evaluateExpiryWarningStage(1 * HOUR_MS + 8 * MINUTE_MS, cleanFlags);
  assert.deepEqual(slightlyMoreOver, { stage: 'h_1h', stageLabel: '1 Jam 8 Menit Lagi' });
});

test('1 day remaining (exact, slightly under, or slightly over with cron grace) triggers h_1d and not h_3d', () => {
  const exact1d = evaluateExpiryWarningStage(1 * DAY_MS, cleanFlags);
  assert.deepEqual(exact1d, { stage: 'h_1d', stageLabel: '24 Jam (1 Hari) Lagi' });

  const under1d = evaluateExpiryWarningStage(23 * HOUR_MS + 55 * MINUTE_MS, cleanFlags);
  assert.deepEqual(under1d, { stage: 'h_1d', stageLabel: '24 Jam (1 Hari) Lagi' });

  // Bug case sebelumnya: sisa 1 hari 5 menit malah masuk h_3d ("3 Hari Lagi")
  const over1dGrace = evaluateExpiryWarningStage(1 * DAY_MS + 5 * MINUTE_MS, cleanFlags);
  assert.deepEqual(over1dGrace, { stage: 'h_1d', stageLabel: '24 Jam (1 Hari) Lagi' });
});

test('5h and 3d milestones fire accurately in their target windows with truthful labels', () => {
  const at5h = evaluateExpiryWarningStage(5 * HOUR_MS, cleanFlags);
  assert.deepEqual(at5h, { stage: 'h_5h', stageLabel: '5 Jam Lagi' });

  const at3h30m = evaluateExpiryWarningStage(3 * HOUR_MS + 30 * MINUTE_MS, cleanFlags);
  assert.deepEqual(at3h30m, { stage: 'h_5h', stageLabel: '3 Jam 30 Menit Lagi' });

  const at3d = evaluateExpiryWarningStage(3 * DAY_MS, cleanFlags);
  assert.deepEqual(at3d, { stage: 'h_3d', stageLabel: '3 Hari Lagi' });

  const at2d12h = evaluateExpiryWarningStage(60 * HOUR_MS, cleanFlags);
  assert.deepEqual(at2d12h, { stage: 'h_3d', stageLabel: '2 Hari 12 Jam Lagi' });
});

test('Intermediate durations outside milestone windows wait cleanly and short packages report honest minutes', () => {
  // Paket 2 jam tidak langsung kirim "5 Jam Lagi" di awal; menunggu hingga masuk jendela 1 jam
  assert.equal(evaluateExpiryWarningStage(2 * HOUR_MS, cleanFlags), null);
  // Paket 36 jam tidak langsung kirim "3 Hari Lagi"; menunggu hingga masuk jendela 1 hari
  assert.equal(evaluateExpiryWarningStage(36 * HOUR_MS, cleanFlags), null);
  // Paket 15 menit melaporkan "15 Menit Lagi" pada stage h_1h
  assert.deepEqual(evaluateExpiryWarningStage(15 * MINUTE_MS, cleanFlags), {
    stage: 'h_1h',
    stageLabel: '15 Menit Lagi',
  });
  // Jika sudah di-warn, stage yang sama tidak kirim ulang
  assert.equal(evaluateExpiryWarningStage(58 * MINUTE_MS, { ...cleanFlags, warned_1h: 1 }), null);
  // Label fallback kedaluwarsa
  assert.equal(formatRemainingWarningLabel(0), 'Segera Berakhir');
});
