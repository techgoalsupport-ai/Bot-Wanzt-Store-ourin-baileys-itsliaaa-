import test from 'node:test';
import assert from 'node:assert/strict';
import {
  isHideTagCommand,
  normalizeJidIdentifier,
  extractSenderIdentifiers,
  isGroupParticipantAdmin,
  extractAllParticipantJids,
  unwrapWaMessage,
  extractTextFromWaMessage,
  extractQuotedTarget,
} from './hideTagUtils.ts';

test('isHideTagCommand hanya cocok dengan hidetag, h, dan ht (case-insensitive)', () => {
  assert.equal(isHideTagCommand('hidetag'), true);
  assert.equal(isHideTagCommand('HIDETAG'), true);
  assert.equal(isHideTagCommand('h'), true);
  assert.equal(isHideTagCommand('HT'), true);
  assert.equal(isHideTagCommand('tagall'), false);
  assert.equal(isHideTagCommand('halo'), false);
  assert.equal(isHideTagCommand(''), false);
});

test('normalizeJidIdentifier menghapus suffix device dan menyamakan @c.us', () => {
  assert.equal(normalizeJidIdentifier('6281234567890:12@s.whatsapp.net'), '6281234567890@s.whatsapp.net');
  assert.equal(normalizeJidIdentifier('12345678901234:3@lid'), '12345678901234@lid');
  assert.equal(normalizeJidIdentifier('6281234567890@c.us'), '6281234567890@s.whatsapp.net');
  assert.equal(normalizeJidIdentifier(''), '');
});

test('isGroupParticipantAdmin mendukung grup mode PN dan mode LID secara akurat', () => {
  const participants = [
    {
      id: '111222333444@lid',
      phoneNumber: '628111111111@s.whatsapp.net',
      admin: 'superadmin',
    },
    {
      id: '628222222222@s.whatsapp.net',
      lid: '555666777888@lid',
      admin: 'admin',
    },
    {
      id: '999888777666@lid',
      phoneNumber: '628333333333@s.whatsapp.net',
      admin: null,
    },
  ];

  // Admin di grup mode LID mengirim lewat participant @lid
  const lidAdminIds = extractSenderIdentifiers({
    participant: '111222333444:2@lid',
    participantAlt: '628111111111@s.whatsapp.net',
  });
  assert.equal(isGroupParticipantAdmin(participants, lidAdminIds), true);

  // Admin yang punya participant @lid tapi grup menyimpan PN di p.id dan LID di p.lid
  const crossLidAdminIds = extractSenderIdentifiers({
    participant: '555666777888@lid',
  });
  assert.equal(isGroupParticipantAdmin(participants, crossLidAdminIds), true);

  // Bot / owner sendiri (fromMe = true) yang tercatat sebagai admin
  const botSelfAdminIds = extractSenderIdentifiers(
    { fromMe: true },
    { id: '628222222222:0@s.whatsapp.net', lid: '555666777888@lid' }
  );
  assert.equal(isGroupParticipantAdmin(participants, botSelfAdminIds), true);

  // Member biasa (admin === null) wajib ditolak
  const memberIds = extractSenderIdentifiers({
    participant: '999888777666@lid',
    participantAlt: '628333333333@s.whatsapp.net',
  });
  assert.equal(isGroupParticipantAdmin(participants, memberIds), false);

  // Pengirim tidak dikenal wajib ditolak
  assert.equal(isGroupParticipantAdmin(participants, ['628999999999@s.whatsapp.net']), false);
});

test('extractAllParticipantJids mengekstrak seluruh JID peserta unik secara rapi', () => {
  const jids = extractAllParticipantJids([
    { id: '111@lid', phoneNumber: '628111@s.whatsapp.net', admin: 'superadmin' },
    { id: '111:2@lid', admin: 'superadmin' },
    { id: '222@lid', admin: null },
    { id: '', lid: '333@lid', admin: null },
    { id: '', phoneNumber: '', lid: '' },
  ]);

  assert.deepEqual(jids, ['111@lid', '222@lid', '333@lid']);
});

test('unwrapWaMessage & extractTextFromWaMessage membuka pesan ephemeral dan viewOnce', () => {
  const ephemeralTextMsg = {
    ephemeralMessage: {
      message: {
        extendedTextMessage: {
          text: '.ht Pengumuman grup',
        },
      },
    },
  };
  assert.equal(extractTextFromWaMessage(ephemeralTextMsg), '.ht Pengumuman grup');

  const viewOnceImgMsg = {
    viewOnceMessageV2: {
      message: {
        imageMessage: {
          caption: '.h Cek gambar ini',
        },
      },
    },
  };
  assert.equal(unwrapWaMessage(viewOnceImgMsg).imageMessage.caption, '.h Cek gambar ini');
  assert.equal(extractTextFromWaMessage(viewOnceImgMsg), '.h Cek gambar ini');
});

test('extractQuotedTarget mengekstrak pesan teks maupun media yang di-reply', () => {
  // 1. Reply pesan teks biasa
  const replyText = {
    extendedTextMessage: {
      text: '.ht',
      contextInfo: {
        stanzaId: 'MSG-TEXT-1',
        participant: '628111@s.whatsapp.net',
        quotedMessage: {
          conversation: 'Besok toko buka jam 08.00 WIB',
        },
      },
    },
  };
  const targetText = extractQuotedTarget(replyText);
  assert.deepEqual(targetText, {
    kind: 'text',
    text: 'Besok toko buka jam 08.00 WIB',
    stanzaId: 'MSG-TEXT-1',
    participant: '628111@s.whatsapp.net',
  });

  // 2. Reply media gambar dalam ephemeralMessage
  const replyImage = {
    ephemeralMessage: {
      message: {
        extendedTextMessage: {
          text: '.ht',
          contextInfo: {
            stanzaId: 'MSG-IMG-2',
            participant: '12345@lid',
            quotedMessage: {
              imageMessage: {
                url: 'https://mmg.whatsapp.net/example',
                mediaKey: new Uint8Array([1, 2, 3]),
                caption: 'Promo Akhir Bulan',
              },
            },
          },
        },
      },
    },
  };
  const targetImage = extractQuotedTarget(replyImage);
  assert.equal(targetImage?.kind, 'image');
  if (targetImage?.kind === 'image') {
    assert.equal(targetImage.caption, 'Promo Akhir Bulan');
    assert.equal(targetImage.stanzaId, 'MSG-IMG-2');
    assert.equal(targetImage.participant, '12345@lid');
  }

  // 3. Tanpa reply mengembalikan null
  assert.equal(extractQuotedTarget({ conversation: '.ht' }), null);
});
