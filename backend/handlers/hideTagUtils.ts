export const HIDE_TAG_COMMANDS = ['hidetag', 'ht', 'h'] as const;

export interface GroupParticipantLike {
  id?: string | null;
  lid?: string | null;
  phoneNumber?: string | null;
  admin?: string | null;
}

export interface SenderKeyLike {
  fromMe?: boolean;
  participant?: string | null;
  participantAlt?: string | null;
  remoteJid?: string | null;
}

export interface BotUserLike {
  id?: string | null;
  lid?: string | null;
}

export type QuotedTarget =
  | {
      kind: 'text';
      text: string;
      stanzaId?: string;
      participant?: string;
    }
  | {
      kind: 'image' | 'video' | 'audio' | 'sticker' | 'document';
      rawQuotedMessage: Record<string, any>;
      mediaMsg: Record<string, any>;
      caption?: string;
      mimetype?: string;
      fileName?: string;
      ptt?: boolean;
      gifPlayback?: boolean;
      stanzaId?: string;
      participant?: string;
    };

export function isHideTagCommand(commandName: string): boolean {
  const clean = (commandName || '').trim().toLowerCase();
  return (HIDE_TAG_COMMANDS as readonly string[]).includes(clean);
}

/**
 * Normalisasi JID WhatsApp: hapus suffix device (:12@ -> @), trim, lowercase,
 * dan samakan @c.us menjadi @s.whatsapp.net.
 */
export function normalizeJidIdentifier(rawJid?: string | null): string {
  if (!rawJid || typeof rawJid !== 'string') return '';
  let jid = rawJid.trim().toLowerCase();
  if (!jid) return '';
  if (jid.includes(':')) {
    jid = jid.replace(/:[0-9]+@/, '@');
  }
  if (jid.endsWith('@c.us')) {
    jid = jid.replace(/@c\.us$/, '@s.whatsapp.net');
  }
  return jid;
}

/**
 * Kumpulkan seluruh identitas JID pengirim (PN maupun LID) untuk validasi admin grup
 * pada mode addressing PN maupun LID.
 */
export function extractSenderIdentifiers(
  key?: SenderKeyLike | null,
  botUser?: BotUserLike | null
): string[] {
  const candidates: string[] = [];
  const push = (val?: string | null) => {
    const norm = normalizeJidIdentifier(val);
    if (norm && !candidates.includes(norm)) {
      candidates.push(norm);
    }
  };

  push(key?.participant);
  push(key?.participantAlt);

  if (key?.fromMe) {
    push(botUser?.id);
    push(botUser?.lid);
  }

  return candidates;
}

/**
 * Verifikasi apakah pengirim termasuk admin atau superadmin grup.
 * Mencocokkan terhadap id, lid, dan phoneNumber peserta grup.
 */
export function isGroupParticipantAdmin(
  participants: GroupParticipantLike[] | undefined | null,
  senderIds: string[]
): boolean {
  if (!Array.isArray(participants) || participants.length === 0 || !Array.isArray(senderIds) || senderIds.length === 0) {
    return false;
  }

  const senderSet = new Set(
    senderIds.map((id) => normalizeJidIdentifier(id)).filter(Boolean)
  );
  if (senderSet.size === 0) return false;

  for (const participant of participants) {
    if (!participant) continue;
    const role = (participant.admin || '').toLowerCase();
    if (role !== 'admin' && role !== 'superadmin') continue;

    const pId = normalizeJidIdentifier(participant.id);
    const pLid = normalizeJidIdentifier(participant.lid);
    const pPhone = normalizeJidIdentifier(participant.phoneNumber);

    if (
      (pId && senderSet.has(pId)) ||
      (pLid && senderSet.has(pLid)) ||
      (pPhone && senderSet.has(pPhone))
    ) {
      return true;
    }
  }

  return false;
}

/**
 * Ambil seluruh JID peserta grup yang valid dan unik untuk array mentions.
 */
export function extractAllParticipantJids(
  participants: GroupParticipantLike[] | undefined | null
): string[] {
  if (!Array.isArray(participants) || participants.length === 0) return [];
  const result: string[] = [];
  const seen = new Set<string>();

  for (const participant of participants) {
    if (!participant) continue;
    const jid =
      normalizeJidIdentifier(participant.id) ||
      normalizeJidIdentifier(participant.lid) ||
      normalizeJidIdentifier(participant.phoneNumber);
    if (!jid || seen.has(jid)) continue;
    seen.add(jid);
    result.push(jid);
  }

  return result;
}

/**
 * Buka pembungkus pesan WhatsApp (ephemeralMessage, viewOnceMessage, viewOnceMessageV2,
 * viewOnceMessageV2Extension, documentWithCaptionMessage, editedMessage).
 */
export function unwrapWaMessage(rawMessage: any): any {
  let current = rawMessage;
  for (let depth = 0; depth < 6; depth++) {
    if (!current || typeof current !== 'object') break;
    if (current.ephemeralMessage?.message) {
      current = current.ephemeralMessage.message;
      continue;
    }
    if (current.viewOnceMessage?.message) {
      current = current.viewOnceMessage.message;
      continue;
    }
    if (current.viewOnceMessageV2?.message) {
      current = current.viewOnceMessageV2.message;
      continue;
    }
    if (current.viewOnceMessageV2Extension?.message) {
      current = current.viewOnceMessageV2Extension.message;
      continue;
    }
    if (current.documentWithCaptionMessage?.message) {
      current = current.documentWithCaptionMessage.message;
      continue;
    }
    if (current.editedMessage?.message) {
      current = current.editedMessage.message;
      continue;
    }
    break;
  }
  return current;
}

/**
 * Ambil teks utama atau caption dari objek pesan WhatsApp (termasuk yang terbungkus).
 */
export function extractTextFromWaMessage(rawMessage: any): string {
  const msg = unwrapWaMessage(rawMessage);
  if (!msg || typeof msg !== 'object') return '';
  return (
    msg.conversation ||
    msg.extendedTextMessage?.text ||
    msg.imageMessage?.caption ||
    msg.videoMessage?.caption ||
    msg.documentMessage?.caption ||
    ''
  );
}

/**
 * Ambil contextInfo yang memuat quotedMessage dari pesan pengirim.
 */
export function extractQuotedContextInfo(rawMessage: any): any | null {
  const msg = unwrapWaMessage(rawMessage);
  if (!msg || typeof msg !== 'object') return null;

  const candidates = [
    msg.extendedTextMessage?.contextInfo,
    msg.imageMessage?.contextInfo,
    msg.videoMessage?.contextInfo,
    msg.documentMessage?.contextInfo,
    msg.audioMessage?.contextInfo,
    msg.stickerMessage?.contextInfo,
    msg.buttonsResponseMessage?.contextInfo,
    msg.templateButtonReplyMessage?.contextInfo,
    msg.listResponseMessage?.contextInfo,
  ];

  for (const ctx of candidates) {
    if (ctx && ctx.quotedMessage) {
      return ctx;
    }
  }
  return null;
}

/**
 * Ekstrak target teks atau media dari pesan yang sedang di-reply oleh admin.
 */
export function extractQuotedTarget(rawMessage: any): QuotedTarget | null {
  const ctx = extractQuotedContextInfo(rawMessage);
  if (!ctx?.quotedMessage) return null;

  const quoted = unwrapWaMessage(ctx.quotedMessage);
  if (!quoted || typeof quoted !== 'object') return null;

  const stanzaId = ctx.stanzaId ? String(ctx.stanzaId) : undefined;
  const participant = ctx.participant ? normalizeJidIdentifier(ctx.participant) : undefined;

  if (quoted.imageMessage) {
    return {
      kind: 'image',
      rawQuotedMessage: quoted,
      mediaMsg: quoted.imageMessage,
      caption: quoted.imageMessage.caption || undefined,
      stanzaId,
      participant,
    };
  }

  if (quoted.videoMessage) {
    return {
      kind: 'video',
      rawQuotedMessage: quoted,
      mediaMsg: quoted.videoMessage,
      caption: quoted.videoMessage.caption || undefined,
      gifPlayback: Boolean(quoted.videoMessage.gifPlayback),
      stanzaId,
      participant,
    };
  }

  if (quoted.audioMessage) {
    return {
      kind: 'audio',
      rawQuotedMessage: quoted,
      mediaMsg: quoted.audioMessage,
      mimetype: quoted.audioMessage.mimetype || 'audio/mp4',
      ptt: Boolean(quoted.audioMessage.ptt),
      stanzaId,
      participant,
    };
  }

  if (quoted.stickerMessage) {
    return {
      kind: 'sticker',
      rawQuotedMessage: quoted,
      mediaMsg: quoted.stickerMessage,
      stanzaId,
      participant,
    };
  }

  if (quoted.documentMessage) {
    return {
      kind: 'document',
      rawQuotedMessage: quoted,
      mediaMsg: quoted.documentMessage,
      caption: quoted.documentMessage.caption || undefined,
      mimetype: quoted.documentMessage.mimetype || 'application/octet-stream',
      fileName: quoted.documentMessage.fileName || 'file',
      stanzaId,
      participant,
    };
  }

  const text = extractTextFromWaMessage(quoted);
  if (text && text.trim()) {
    return {
      kind: 'text',
      text: text.trim(),
      stanzaId,
      participant,
    };
  }

  return null;
}
