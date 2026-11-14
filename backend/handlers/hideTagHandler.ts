import { downloadMediaMessage } from '@itsliaaa/baileys';
import pino from 'pino';
import {
  extractAllParticipantJids,
  extractQuotedTarget,
  extractSenderIdentifiers,
  isGroupParticipantAdmin,
} from './hideTagUtils.ts';
import type { DispatcherDeps } from './messageDispatcher.ts';

interface CachedGroupMetadata {
  metadata: any;
  fetchedAt: number;
}

const GROUP_METADATA_CACHE_TTL_MS = 30 * 1000;
const groupMetadataCache = new Map<string, CachedGroupMetadata>();
const silentLogger = pino({ level: 'silent' });

async function getGroupMetadataWithCache(sock: any, groupJid: string): Promise<any | null> {
  const cached = groupMetadataCache.get(groupJid);
  if (cached && Date.now() - cached.fetchedAt < GROUP_METADATA_CACHE_TTL_MS) {
    return cached.metadata;
  }

  try {
    const metadata = await sock.groupMetadata(groupJid);
    if (metadata) {
      groupMetadataCache.set(groupJid, {
        metadata,
        fetchedAt: Date.now(),
      });
    }
    return metadata;
  } catch {
    return cached?.metadata || null;
  }
}

export interface HandleHideTagParams {
  sock: any;
  message: any;
  remoteJid: string;
  commandArg: string;
  deps: DispatcherDeps;
  markBotSent: (id?: string) => void;
}

/**
 * Eksekusi command Hide Tag (.hidetag, .h, .ht) di dalam grup WhatsApp:
 * - Hanya berlaku di dalam grup (@g.us) yang sudah di-whitelist.
 * - Hanya berlaku jika pengirim adalah Admin / Superadmin Grup (PN & LID).
 * - Diam/abaikan tanpa balasan bila dipicu non-admin, atau tanpa teks dan tanpa reply.
 * - Mendukung teks langsung maupun reply teks/media (image, video, audio, sticker, document).
 */
export async function handleHideTagCommand(params: HandleHideTagParams): Promise<void> {
  const { sock, message, remoteJid, commandArg, deps, markBotSent } = params;

  if (!remoteJid.endsWith('@g.us') || !sock) {
    return;
  }

  const trimmedArg = (commandArg || '').trim();
  const quotedTarget = extractQuotedTarget(message?.message);

  // Bila tidak ada argumen teks dan tidak sedang me-reply pesan/media apa pun: diam saja
  if (!trimmedArg && !quotedTarget) {
    return;
  }

  const metadata = await getGroupMetadataWithCache(sock, remoteJid);
  if (!metadata || !Array.isArray(metadata.participants)) {
    return;
  }

  const senderIds = extractSenderIdentifiers(message?.key, sock?.user);
  const isAdmin = isGroupParticipantAdmin(metadata.participants, senderIds);
  if (!isAdmin) {
    // Non-admin: diam / abaikan sesuai kesepakatan
    return;
  }

  const mentions = extractAllParticipantJids(metadata.participants);
  if (mentions.length === 0) {
    return;
  }

  const senderLabel =
    message?.pushName ||
    senderIds[0]?.split('@')[0] ||
    'Admin Grup';

  try {
    // Kasus 1: Admin me-reply pesan media (image / video / audio / sticker / document)
    if (quotedTarget && quotedTarget.kind !== 'text') {
      const quotedMsgObj = {
        key: {
          remoteJid,
          id: quotedTarget.stanzaId || message?.key?.id,
          participant: quotedTarget.participant || message?.key?.participant,
        },
        message: quotedTarget.rawQuotedMessage,
      };

      const mediaBuffer: Buffer = await downloadMediaMessage(
        quotedMsgObj,
        'buffer',
        {},
        {
          logger: silentLogger as any,
          reuploadRequest: sock.updateMediaMessage,
        }
      );

      const finalCaption = trimmedArg || quotedTarget.caption || undefined;

      if (quotedTarget.kind === 'image') {
        const res = await sock.sendMessage(remoteJid, {
          image: mediaBuffer,
          caption: finalCaption,
          mentions,
        });
        markBotSent(res?.key?.id);
      } else if (quotedTarget.kind === 'video') {
        const res = await sock.sendMessage(remoteJid, {
          video: mediaBuffer,
          caption: finalCaption,
          gifPlayback: Boolean(quotedTarget.gifPlayback),
          mentions,
        });
        markBotSent(res?.key?.id);
      } else if (quotedTarget.kind === 'document') {
        const res = await sock.sendMessage(remoteJid, {
          document: mediaBuffer,
          mimetype: quotedTarget.mimetype || 'application/octet-stream',
          fileName: quotedTarget.fileName || 'file',
          caption: finalCaption,
          mentions,
        });
        markBotSent(res?.key?.id);
      } else if (quotedTarget.kind === 'audio') {
        const res = await sock.sendMessage(remoteJid, {
          audio: mediaBuffer,
          mimetype: quotedTarget.mimetype || 'audio/mp4',
          ptt: Boolean(quotedTarget.ptt),
          mentions,
        });
        markBotSent(res?.key?.id);
        if (trimmedArg) {
          const txtRes = await sock.sendMessage(remoteJid, {
            text: trimmedArg,
            mentions,
          });
          markBotSent(txtRes?.key?.id);
        }
      } else if (quotedTarget.kind === 'sticker') {
        const res = await sock.sendMessage(remoteJid, {
          sticker: mediaBuffer,
          mentions,
        });
        markBotSent(res?.key?.id);
        if (trimmedArg) {
          const txtRes = await sock.sendMessage(remoteJid, {
            text: trimmedArg,
            mentions,
          });
          markBotSent(txtRes?.key?.id);
        }
      }

      deps.addLog(
        'success',
        `📢 Hide Tag (${quotedTarget.kind}) terkirim ke ${mentions.length} anggota di grup ${metadata.subject || remoteJid} oleh ${senderLabel}.`
      );
      return;
    }

    // Kasus 2: Teks langsung setelah command atau teks dari pesan yang di-reply
    const textToSend = trimmedArg || (quotedTarget?.kind === 'text' ? quotedTarget.text : '');
    if (!textToSend) {
      return;
    }

    const res = await sock.sendMessage(remoteJid, {
      text: textToSend,
      mentions,
    });
    markBotSent(res?.key?.id);

    deps.addLog(
      'success',
      `📢 Hide Tag terkirim ke ${mentions.length} anggota di grup ${metadata.subject || remoteJid} oleh ${senderLabel}.`
    );
  } catch (err: any) {
    deps.addLog('error', `Gagal menjalankan Hide Tag di grup ${remoteJid}: ${err?.message || err}`);
  }
}
