import test from 'node:test';
import assert from 'node:assert/strict';
import { handleHideTagCommand } from './hideTagHandler.ts';

function createMockDeps() {
  const logs: Array<{ type: string; msg: string }> = [];
  return {
    logs,
    deps: {
      addLog: (type: 'info' | 'success' | 'warning' | 'error' | 'code', msg: string) => {
        logs.push({ type, msg });
      },
      resolveTargetJid: (jid: string) => jid,
    },
  };
}

test('handleHideTagCommand mengirim pesan teks dan mentions seluruh anggota saat dipicu Admin Grup (mode LID)', async () => {
  const sentPayloads: Array<{ jid: string; content: any }> = [];
  const markedIds: Array<string | undefined> = [];
  const { deps, logs } = createMockDeps();

  const mockSock = {
    user: { id: '628000000000@s.whatsapp.net', lid: '999000@lid' },
    groupMetadata: async () => ({
      id: '120363000111222@g.us',
      subject: 'Grup Test Toko',
      participants: [
        { id: '111000@lid', phoneNumber: '628111111111@s.whatsapp.net', admin: 'superadmin' },
        { id: '222000@lid', phoneNumber: '628222222222@s.whatsapp.net', admin: null },
        { id: '333000@lid', phoneNumber: '628333333333@s.whatsapp.net', admin: null },
      ],
    }),
    sendMessage: async (jid: string, content: any) => {
      sentPayloads.push({ jid, content });
      return { key: { id: 'BOT-SENT-1' } };
    },
  };

  await handleHideTagCommand({
    sock: mockSock,
    message: {
      key: {
        remoteJid: '120363000111222@g.us',
        participant: '111000:2@lid',
        participantAlt: '628111111111@s.whatsapp.net',
      },
      pushName: 'Admin Toko',
      message: {
        conversation: '.ht Promo hari ini!',
      },
    },
    remoteJid: '120363000111222@g.us',
    commandArg: 'Promo hari ini!',
    deps,
    markBotSent: (id) => markedIds.push(id),
  });

  assert.equal(sentPayloads.length, 1);
  assert.equal(sentPayloads[0].jid, '120363000111222@g.us');
  assert.equal(sentPayloads[0].content.text, 'Promo hari ini!');
  assert.deepEqual(sentPayloads[0].content.mentions, ['111000@lid', '222000@lid', '333000@lid']);
  assert.deepEqual(markedIds, ['BOT-SENT-1']);
  assert.equal(logs.some((l) => l.type === 'success'), true);
});

test('handleHideTagCommand diam/mengabaikan jika dipicu oleh Non-Admin Grup', async () => {
  const sentPayloads: Array<any> = [];
  const { deps } = createMockDeps();

  const mockSock = {
    user: { id: '628000000000@s.whatsapp.net' },
    groupMetadata: async () => ({
      id: '120363000111999@g.us',
      subject: 'Grup Non Admin',
      participants: [
        { id: '111000@lid', admin: 'admin' },
        { id: '222000@lid', admin: null },
      ],
    }),
    sendMessage: async (jid: string, content: any) => {
      sentPayloads.push({ jid, content });
      return { key: { id: 'BOT-SENT-ERR' } };
    },
  };

  await handleHideTagCommand({
    sock: mockSock,
    message: {
      key: { remoteJid: '120363000111999@g.us', participant: '222000@lid' },
      message: { conversation: '.ht Coba tag semua' },
    },
    remoteJid: '120363000111999@g.us',
    commandArg: 'Coba tag semua',
    deps,
    markBotSent: () => {},
  });

  assert.equal(sentPayloads.length, 0);
});

test('handleHideTagCommand mendukung reply pesan teks tanpa argumen tambahan', async () => {
  const sentPayloads: Array<any> = [];
  const { deps } = createMockDeps();

  const mockSock = {
    user: { id: '628000000000@s.whatsapp.net' },
    groupMetadata: async () => ({
      id: '120363000222333@g.us',
      subject: 'Grup Reply Test',
      participants: [
        { id: '628111111111@s.whatsapp.net', admin: 'admin' },
        { id: '628222222222@s.whatsapp.net', admin: null },
      ],
    }),
    sendMessage: async (jid: string, content: any) => {
      sentPayloads.push({ jid, content });
      return { key: { id: 'BOT-SENT-REPLY' } };
    },
  };

  await handleHideTagCommand({
    sock: mockSock,
    message: {
      key: { remoteJid: '120363000222333@g.us', participant: '628111111111@s.whatsapp.net' },
      message: {
        extendedTextMessage: {
          text: '.h',
          contextInfo: {
            stanzaId: 'MSG-QUOTED-1',
            participant: '628222222222@s.whatsapp.net',
            quotedMessage: {
              conversation: 'Pesanan siap diproses jam 10.00 WIB!',
            },
          },
        },
      },
    },
    remoteJid: '120363000222333@g.us',
    commandArg: '',
    deps,
    markBotSent: () => {},
  });

  assert.equal(sentPayloads.length, 1);
  assert.equal(sentPayloads[0].content.text, 'Pesanan siap diproses jam 10.00 WIB!');
  assert.deepEqual(sentPayloads[0].content.mentions, [
    '628111111111@s.whatsapp.net',
    '628222222222@s.whatsapp.net',
  ]);
});

test('handleHideTagCommand mengabaikan perintah di luar grup atau tanpa teks/reply', async () => {
  const sentPayloads: Array<any> = [];
  const { deps } = createMockDeps();
  let metadataCalled = false;

  const mockSock = {
    groupMetadata: async () => {
      metadataCalled = true;
      return null;
    },
    sendMessage: async (jid: string, content: any) => {
      sentPayloads.push({ jid, content });
      return { key: { id: 'X' } };
    },
  };

  // Di luar grup (DM)
  await handleHideTagCommand({
    sock: mockSock,
    message: { key: { remoteJid: '628123@s.whatsapp.net' }, message: { conversation: '.ht tes' } },
    remoteJid: '628123@s.whatsapp.net',
    commandArg: 'tes',
    deps,
    markBotSent: () => {},
  });

  // Di grup tapi kosong & tanpa reply
  await handleHideTagCommand({
    sock: mockSock,
    message: { key: { remoteJid: '120363000@g.us' }, message: { conversation: '.ht' } },
    remoteJid: '120363000@g.us',
    commandArg: '',
    deps,
    markBotSent: () => {},
  });

  assert.equal(metadataCalled, false);
  assert.equal(sentPayloads.length, 0);
});
