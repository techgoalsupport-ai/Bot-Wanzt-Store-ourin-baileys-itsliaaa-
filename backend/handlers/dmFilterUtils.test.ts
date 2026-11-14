import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CHECKOUT_SESSION_TIMEOUT_MS,
  shouldAllowIncomingInDispatcher,
  buildInvoiceContactButtons,
} from './dmFilterUtils.ts';

test('CHECKOUT_SESSION_TIMEOUT_MS tepat 3 menit (180.000 ms)', () => {
  assert.equal(CHECKOUT_SESSION_TIMEOUT_MS, 3 * 60 * 1000);
  assert.equal(CHECKOUT_SESSION_TIMEOUT_MS, 180000);
});

test('shouldAllowIncomingInDispatcher mengizinkan semua pesan saat Grup Only OFF', () => {
  assert.equal(
    shouldAllowIncomingInDispatcher({
      groupOnly: false,
      isGroup: false,
      cleanBtn: '',
      hasActiveCheckoutSession: false,
    }),
    true
  );
  assert.equal(
    shouldAllowIncomingInDispatcher({
      groupOnly: false,
      isGroup: true,
      cleanBtn: '',
      hasActiveCheckoutSession: false,
    }),
    true
  );
});

test('shouldAllowIncomingInDispatcher memblokir DM biasa saat Grup Only ON, tetapi mengizinkan grup & kelanjutan sesi order DM', () => {
  // Pesan DM biasa / command tanpa sesi -> diam / ditolak
  assert.equal(
    shouldAllowIncomingInDispatcher({
      groupOnly: true,
      isGroup: false,
      cleanBtn: '',
      hasActiveCheckoutSession: false,
    }),
    false
  );

  // Klik tombol menu/list/vcard biasa di DM tanpa sesi -> ditolak
  assert.equal(
    shouldAllowIncomingInDispatcher({
      groupOnly: true,
      isGroup: false,
      cleanBtn: 'prod_select:Netflix',
      hasActiveCheckoutSession: false,
    }),
    false
  );

  // Pesan di dalam grup -> tetap diizinkan
  assert.equal(
    shouldAllowIncomingInDispatcher({
      groupOnly: true,
      isGroup: true,
      cleanBtn: '',
      hasActiveCheckoutSession: false,
    }),
    true
  );

  // Klik tombol checkout_promo / checkout_direct di DM (baik saat aktif maupun expired agar kirim notif berakhir) -> diizinkan
  assert.equal(
    shouldAllowIncomingInDispatcher({
      groupOnly: true,
      isGroup: false,
      cleanBtn: 'checkout_promo',
      hasActiveCheckoutSession: false,
    }),
    true
  );
  assert.equal(
    shouldAllowIncomingInDispatcher({
      groupOnly: true,
      isGroup: false,
      cleanBtn: 'checkout_direct',
      hasActiveCheckoutSession: false,
    }),
    true
  );

  // Chat DM saat punya activeCheckoutSession (ketik promo / BATAL / PROMO / BAYAR) -> diizinkan
  assert.equal(
    shouldAllowIncomingInDispatcher({
      groupOnly: true,
      isGroup: false,
      cleanBtn: '',
      hasActiveCheckoutSession: true,
    }),
    true
  );
});

test('buildInvoiceContactButtons membuat tombol cta_url ke https://wa.me/{nomerAdmin} dengan fallback ownerNumber', () => {
  assert.deepEqual(buildInvoiceContactButtons('0812345678', '089999999'), [
    { text: '📞 Hubungi Admin', url: 'https://wa.me/62812345678' },
  ]);

  assert.deepEqual(buildInvoiceContactButtons('+62 812-3456-7890'), [
    { text: '📞 Hubungi Admin', url: 'https://wa.me/6281234567890' },
  ]);

  // Fallback ke ownerNumber jika adminNumber kosong
  assert.deepEqual(buildInvoiceContactButtons('', '082173515807'), [
    { text: '📞 Hubungi Admin', url: 'https://wa.me/6282173515807' },
  ]);

  // Jika keduanya kosong, tidak menghasilkan tombol link rusak
  assert.deepEqual(buildInvoiceContactButtons('', ''), []);
});
