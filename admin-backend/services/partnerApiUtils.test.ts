import test from 'node:test';
import assert from 'node:assert/strict';
import {
  generatePartnerApiKey,
  hashPartnerApiKey,
  extractApiKeyFromHeaders,
  parsePartnerDuration,
  SlidingWindowRateLimiter,
} from './partnerApiUtils.ts';

test('generatePartnerApiKey produces unique wzp_ prefixed key with consistent SHA-256 hash', () => {
  const first = generatePartnerApiKey();
  const second = generatePartnerApiKey();

  assert.ok(first.rawKey.startsWith('wzp_'));
  assert.equal(first.rawKey.length, 44); // 'wzp_' (4) + 40 hex chars
  assert.notEqual(first.rawKey, second.rawKey);
  assert.equal(hashPartnerApiKey(first.rawKey), first.keyHash);
  assert.ok(first.prefixKey.startsWith('wzp_'));
  assert.ok(first.prefixKey.includes('...'));
});

test('extractApiKeyFromHeaders prefers x-api-key and falls back to Bearer token', () => {
  assert.equal(extractApiKeyFromHeaders('wzp_abc123', 'Bearer wzp_other'), 'wzp_abc123');
  assert.equal(extractApiKeyFromHeaders(undefined, 'Bearer wzp_bearer_999'), 'wzp_bearer_999');
  assert.equal(extractApiKeyFromHeaders(undefined, 'Basic xyz'), null);
  assert.equal(extractApiKeyFromHeaders(undefined, undefined), null);
});

test('parsePartnerDuration validates flexible duration payloads and rejects invalid values', () => {
  const daysDefault = parsePartnerDuration({}, { allowWeeks: true, defaultValue: 30, defaultUnit: 'days' });
  assert.equal(daysDefault.valid, true);
  if (daysDefault.valid) {
    assert.equal(daysDefault.amount, 30);
    assert.equal(daysDefault.unit, 'days');
    assert.equal(daysDefault.label, '30 Hari');
  }

  const legacyDays = parsePartnerDuration({ duration_days: 90 }, { allowWeeks: true });
  assert.equal(legacyDays.valid, true);
  if (legacyDays.valid) {
    assert.equal(legacyDays.amount, 90);
    assert.equal(legacyDays.unit, 'days');
  }

  const tokenMinutes = parsePartnerDuration({ amount: 15, unit: 'minutes' }, { allowWeeks: false });
  assert.equal(tokenMinutes.valid, true);
  if (tokenMinutes.valid) {
    assert.equal(tokenMinutes.amount, 15);
    assert.equal(tokenMinutes.unit, 'minutes');
    assert.equal(tokenMinutes.label, '15 Menit');
  }

  const negative = parsePartnerDuration({ amount: -5, unit: 'days' }, { allowWeeks: false });
  assert.equal(negative.valid, false);

  const unsupportedUnit = parsePartnerDuration({ amount: 2, unit: 'weeks' }, { allowWeeks: false });
  assert.equal(unsupportedUnit.valid, false);

  const nonInteger = parsePartnerDuration({ amount: 1.5, unit: 'hours' }, { allowWeeks: false });
  assert.equal(nonInteger.valid, false);
});

test('SlidingWindowRateLimiter enforces per-identifier quota and resets after window expires', () => {
  const limiter = new SlidingWindowRateLimiter(3, 10_000);
  const t0 = 1_000_000;

  assert.equal(limiter.check('partner_1', t0).allowed, true);
  assert.equal(limiter.check('partner_1', t0 + 100).allowed, true);
  const third = limiter.check('partner_1', t0 + 200);
  assert.equal(third.allowed, true);
  assert.equal(third.remaining, 0);

  const blocked = limiter.check('partner_1', t0 + 300);
  assert.equal(blocked.allowed, false);
  assert.ok(blocked.retryAfterSeconds >= 1);

  // Separate identifier stays unaffected
  assert.equal(limiter.check('partner_2', t0 + 300).allowed, true);

  // After window expires, requests are allowed again
  assert.equal(limiter.check('partner_1', t0 + 10_500).allowed, true);
});
