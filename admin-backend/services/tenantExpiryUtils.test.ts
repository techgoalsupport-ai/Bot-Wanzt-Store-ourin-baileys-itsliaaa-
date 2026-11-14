import test from 'node:test';
import assert from 'node:assert/strict';
import { isTenantTimestampExpired, resolveEffectiveTenantStatus } from './tenantExpiryUtils';

test('isTenantTimestampExpired detects past, boundary, future, and invalid timestamps', () => {
  const now = new Date('2026-11-13T10:00:00.000Z').getTime();

  assert.equal(isTenantTimestampExpired('2026-11-13T09:59:59.000Z', now), true);
  assert.equal(isTenantTimestampExpired('2026-11-13T10:00:00.000Z', now), true);
  assert.equal(isTenantTimestampExpired('2026-11-13T10:00:01.000Z', now), false);
  assert.equal(isTenantTimestampExpired('', now), false);
  assert.equal(isTenantTimestampExpired(undefined, now), false);
  assert.equal(isTenantTimestampExpired('invalid-date', now), false);
});

test('resolveEffectiveTenantStatus prioritizes suspended, preserves expired, and expires active in real time', () => {
  const now = new Date('2026-11-13T10:00:00.000Z').getTime();

  assert.equal(resolveEffectiveTenantStatus('suspended', '2026-11-13T09:00:00.000Z', now), 'suspended');
  assert.equal(resolveEffectiveTenantStatus('suspended', '2026-11-14T10:00:00.000Z', now), 'suspended');
  assert.equal(resolveEffectiveTenantStatus('expired', '2026-11-14T10:00:00.000Z', now), 'expired');
  assert.equal(resolveEffectiveTenantStatus('active', '2026-11-13T09:59:59.999Z', now), 'expired');
  assert.equal(resolveEffectiveTenantStatus('active', '2026-11-13T10:00:00.000Z', now), 'expired');
  assert.equal(resolveEffectiveTenantStatus('active', '2026-11-13T10:05:00.000Z', now), 'active');
});
