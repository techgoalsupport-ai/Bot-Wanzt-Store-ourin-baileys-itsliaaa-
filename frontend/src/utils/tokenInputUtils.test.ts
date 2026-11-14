import test from 'node:test';
import assert from 'node:assert/strict';
import { formatVoucherTokenInput, validateVoucherTokenInput } from './tokenInputUtils';

test('formatVoucherTokenInput strips non-alphanumeric chars, uppercases, groups in 4, and caps at 16', () => {
  assert.equal(formatVoucherTokenInput('1311-abcd-07da-ef12'), '1311-ABCD-07DA-EF12');
  assert.equal(formatVoucherTokenInput('1311 abcd 07da ef12 9999'), '1311-ABCD-07DA-EF12');
  assert.equal(formatVoucherTokenInput('ab!@#cd12'), 'ABCD-12');
  assert.equal(formatVoucherTokenInput(''), '');
});

test('validateVoucherTokenInput validates empty, short, and 16-char tokens', () => {
  const emptyRes = validateVoucherTokenInput('   ');
  assert.equal(emptyRes.valid, false);
  assert.ok(emptyRes.error);

  const shortRes = validateVoucherTokenInput('1311-ABCD');
  assert.equal(shortRes.valid, false);
  assert.equal(shortRes.clean, '1311ABCD');

  const okRes = validateVoucherTokenInput('1311-abcd-07da-ef12');
  assert.equal(okRes.valid, true);
  assert.equal(okRes.clean, '1311ABCD07DAEF12');
  assert.equal(okRes.error, undefined);
});
