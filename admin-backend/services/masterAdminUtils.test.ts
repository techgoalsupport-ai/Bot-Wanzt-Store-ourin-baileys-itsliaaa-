import test from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeMasterAdminPhone,
  toCleanWaDigits,
  equalizeWeights,
  rebalanceWeights,
  validateMasterAdminList,
  pickWeightedMasterAdmin,
} from './masterAdminUtils';

test('normalizeMasterAdminPhone dan toCleanWaDigits menormalisasi variasi format Indonesia', () => {
  assert.equal(normalizeMasterAdminPhone('085712439395'), '+6285712439395');
  assert.equal(normalizeMasterAdminPhone('85712439395'), '+6285712439395');
  assert.equal(normalizeMasterAdminPhone('6285712439395'), '+6285712439395');
  assert.equal(normalizeMasterAdminPhone('+62 857-1243-9395'), '+6285712439395');
  assert.equal(toCleanWaDigits('081234567890'), '6281234567890');
});

test('equalizeWeights membagi 100% secara merata untuk 1, 2, 3, dan 4 admin', () => {
  assert.deepEqual(equalizeWeights(1), [100]);
  assert.deepEqual(equalizeWeights(2), [50, 50]);
  assert.deepEqual(equalizeWeights(3), [34, 33, 33]);
  assert.deepEqual(equalizeWeights(4), [25, 25, 25, 25]);
});

test('rebalanceWeights menjaga total tepat 100% dan mendukung 0% saat 2 atau lebih admin', () => {
  assert.deepEqual(rebalanceWeights([50, 50], 0, 70), [70, 30]);
  assert.deepEqual(rebalanceWeights([50, 50], 1, 0), [100, 0]);
  assert.deepEqual(rebalanceWeights([100], 0, 20), [100]);

  const threeWay = rebalanceWeights([34, 33, 33], 0, 50);
  assert.equal(threeWay[0], 50);
  assert.equal(threeWay.reduce((a, b) => a + b, 0), 100);
  assert.deepEqual(threeWay, [50, 25, 25]);

  const recoverFromZero = rebalanceWeights([100, 0, 0], 0, 40);
  assert.equal(recoverFromZero[0], 40);
  assert.equal(recoverFromZero.reduce((a, b) => a + b, 0), 100);
});

test('validateMasterAdminList menolak data kosong, duplikat, semua 0%, atau total bukan 100%', () => {
  assert.equal(validateMasterAdminList([]).valid, false);
  assert.equal(
    validateMasterAdminList([
      { name: 'Admin 1', phone: '081234567890', weight: 50 },
      { name: 'Admin 2', phone: '+6281234567890', weight: 50 },
    ]).valid,
    false
  );
  assert.equal(
    validateMasterAdminList([
      { name: 'Admin 1', phone: '081234567890', weight: 0 },
      { name: 'Admin 2', phone: '089876543210', weight: 0 },
    ]).valid,
    false
  );
  assert.equal(
    validateMasterAdminList([
      { name: 'Admin 1', phone: '081234567890', weight: 60 },
      { name: 'Admin 2', phone: '089876543210', weight: 60 },
    ]).valid,
    false
  );

  const ok = validateMasterAdminList([
    { name: 'Admin Satu', phone: '081234567890', weight: 100 },
    { name: 'Admin Libur', phone: '89876543210', weight: 0 },
  ]);
  assert.equal(ok.valid, true);
  assert.equal(ok.normalizedItems[0].phone, '+6281234567890');
  assert.equal(ok.normalizedItems[1].phone, '+6289876543210');
});

test('pickWeightedMasterAdmin memilih sesuai bobot dan mengabaikan admin berbobot 0%', () => {
  const admins = [
    { name: 'Admin A', phone: '+6281111111111', weight: 50 },
    { name: 'Admin B', phone: '+6282222222222', weight: 50 },
    { name: 'Admin C (Libur)', phone: '+6283333333333', weight: 0 },
  ];

  assert.equal(pickWeightedMasterAdmin(admins, () => 0.1).name, 'Admin A');
  assert.equal(pickWeightedMasterAdmin(admins, () => 0.49).name, 'Admin A');
  assert.equal(pickWeightedMasterAdmin(admins, () => 0.5).name, 'Admin B');
  assert.equal(pickWeightedMasterAdmin(admins, () => 0.99).name, 'Admin B');

  const skewed = [
    { name: 'Admin A', phone: '+6281111111111', weight: 80 },
    { name: 'Admin B', phone: '+6282222222222', weight: 20 },
  ];
  assert.equal(pickWeightedMasterAdmin(skewed, () => 0.79).name, 'Admin A');
  assert.equal(pickWeightedMasterAdmin(skewed, () => 0.8).name, 'Admin B');
});
