import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { generateWAMessageFromContent, prepareWAMessageMedia } from '@itsliaaa/baileys';
import { CommandsConfig } from '../types/bot.types.ts';
import { getProductVariants } from '../services/xavieraService.ts';
import { buildQuoteContextInfo } from '../services/quoteHelper.ts';
import { resolvePlaceholders } from '../services/placeholderHelper.ts';
import { getPricingConfig, calculateSellingPrice, calculateSellingPriceForVariant } from '../database/sqlite.ts';
import { getPicturePath } from '../services/mediaManager.ts';
import { getActiveTenantId } from '../database/tenantContext.ts';

import { DEFAULT_STOCK_EMPTY_TEMPLATE } from '../config/configManager.ts';

export async function sendProductVariantsCarousel(
  sock: any,
  config: CommandsConfig,
  remoteJid: string,
  productName: string,
  quotedMsg?: any,
  addLog?: (type: 'info' | 'success' | 'warning' | 'error' | 'code', msg: string) => void,
  resolveTargetJid?: (jid: string) => string
): Promise<void> {
  if (!sock) return;

  if (addLog) {
    addLog('info', `Menyiapkan kartu carousel varian produk "${productName}" untuk ${remoteJid}...`);
  }
  const rawVariants = await getProductVariants(productName, config);
  // Filter varian produk: hanya tampilkan varian yang memiliki stok tersedia (stok > 0)
  const variants = (rawVariants || []).filter((v) => Number(v.stock) > 0);

  if (!variants || variants.length === 0) {
    const stockTpl = config.stockEmptyText || DEFAULT_STOCK_EMPTY_TEMPLATE;
    const cleanNum = (remoteJid.split('@')[0] || '').replace(/[^0-9]/g, '');
    const emptyText = resolvePlaceholders(stockTpl, config, {
      name: productName,
      customerName: cleanNum,
      customerNumber: cleanNum,
    });
    await sock.sendMessage(
      remoteJid,
      {
        text: emptyText,
      },
      quotedMsg ? { quoted: quotedMsg } : undefined
    );
    if (addLog) {
      addLog('warning', `⚠️ Seluruh varian produk "${productName}" stoknya 0 / kosong, carousel tidak dikirim.`);
    }
    return;
  }

  // Siapkan media gambar header untuk setiap kartu carousel.
  // Protokol resmi WhatsApp Mobile (Android/iOS) mewajibkan header media (imageMessage)
  // pada setiap kartu carousel. Tanpa media, WhatsApp client tidak memiliki layout view
  // dan akan memunculkan "Versi WhatsApp Anda tidak mendukungnya. Perbarui WhatsApp".
  let uploadedMedia: any = null;
  try {
    const tenantId = (sock as any)?.tenantId || getActiveTenantId();
    const pictureName = config.carouselPicture || config.selectedPicture || 'snaptik-app-7690985506468908308-slide-2.jpg';
    let imageBuffer: Buffer | null = null;

    const picPath = getPicturePath(tenantId, pictureName);
    if (picPath && fs.existsSync(picPath)) {
      imageBuffer = fs.readFileSync(picPath);
    }

    if (imageBuffer && sock.waUploadToServer) {
      uploadedMedia = await prepareWAMessageMedia(
        { image: imageBuffer },
        { upload: sock.waUploadToServer }
      );
    }
  } catch (mediaErr: any) {
    if (addLog) {
      addLog('warning', `Upload media header carousel gagal: ${mediaErr?.message || mediaErr}`);
    }
  }

  const defaultTemplate = `*{storeName}*

*{produkName} | {category}*

Nikmati produk pilihanmu dengan harga terbaik di Wanzt Store.

*Detail Produk:*
- Varian: {varian}
- Harga: {price}
- Stok: {stock} tersedia

Produk tersedia selama stok masih ada. Silakan pilih tindakan di bawah ini untuk melanjutkan.`;

  const template = config.carouselOutputText?.trim() || defaultTemplate;

  // Ambil pengaturan markup harga produk dari config / SQLite
  const pricing = config.pricingConfig || getPricingConfig();

  // Bangun daftar kartu varian (dengan header media gambar valid agar dapat dirender oleh WhatsApp)
  const cards = variants.slice(0, 10).map((v) => {
    const cat = (v.category || 'Streaming').trim();
    const pName = v.name || productName;

    // Hitung harga jual berdasarkan pengaturan markup varian (custom atau general)
    const rawPrice = Number(v.price) || 0;
    const { sellingPrice } = calculateSellingPriceForVariant(rawPrice, v.id, pName, v.variant);

    const captionText = resolvePlaceholders(template, config, {
      name: pName,
      category: cat,
      variant: v.variant,
      stock: v.stock,
      price: sellingPrice,
    });

    const cardFooterText = resolvePlaceholders(
      config.carouselFooterText || '{storeName} Official',
      config,
      {
        name: pName,
        category: cat,
        variant: v.variant,
      }
    );

    const cardHeader: any = {
      title: '',
      subtitle: '',
      hasMediaAttachment: Boolean(uploadedMedia?.imageMessage),
    };

    if (uploadedMedia?.imageMessage) {
      cardHeader.imageMessage = uploadedMedia.imageMessage;
    }

    return {
      header: cardHeader,
      body: {
        text: captionText,
      },
      footer: {
        text: cardFooterText,
      },
      nativeFlowMessage: {
        buttons: [
          {
            name: 'quick_reply',
            buttonParamsJson: JSON.stringify({
              display_text: '🛒 Order',
              id: `order_var:${encodeURIComponent(pName)}|${encodeURIComponent(v.variant)}|${sellingPrice}`,
            }),
          },
          {
            name: 'quick_reply',
            buttonParamsJson: JSON.stringify({
              display_text: '📞 Contact Admin',
              id: 'contact_admin',
            }),
          },
        ],
      },
    };
  });

  try {
    const targetJid = resolveTargetJid ? resolveTargetJid(remoteJid) : remoteJid;
    const userJid = sock.user?.id || sock.authState?.creds?.me?.id || '';

    const storeTitle = resolvePlaceholders('{storeName}', config);
    const mainBody = `Katalog Varian Produk *${productName}* • ${storeTitle}`;
    const mainFooter = `${storeTitle} • Silakan geser kartu varian di bawah ini`;

    const interactiveContent: any = {
      body: { text: mainBody },
      footer: { text: mainFooter },
      header: {
        title: '',
        hasMediaAttachment: false,
      },
      carouselMessage: {
        cards,
        carouselCardType: 1,
        messageVersion: 1,
      },
    };

    if (quotedMsg) {
      const contextInfo = buildQuoteContextInfo(quotedMsg, targetJid, userJid);
      if (contextInfo) {
        interactiveContent.contextInfo = contextInfo;
      }
    }

    // Bangun payload WAMessage resmi dengan messageSecret 32 bytes
    const fullCarouselMsg = generateWAMessageFromContent(
      targetJid,
      {
        viewOnceMessage: {
          message: {
            messageContextInfo: {
              deviceListMetadata: {},
              deviceListMetadataVersion: 2,
              messageSecret: crypto.randomBytes(32),
            },
            interactiveMessage: interactiveContent,
          },
        },
      },
      { userJid, quoted: quotedMsg }
    );

    // Sertakan stanza node <biz> (type native_flow v=9) agar pesan Carousel diizinkan dan dirender oleh WhatsApp
    const ts = Math.floor(Date.now() / 1000) - 77980457;
    const bizNodes = [
      {
        tag: 'biz',
        attrs: {
          actual_actors: '2',
          host_storage: '2',
          privacy_mode_ts: `${ts}`,
        },
        content: [
          {
            tag: 'engagement',
            attrs: {
              customer_service_state: 'open',
              conversation_state: 'open',
            },
          },
          {
            tag: 'interactive',
            attrs: { type: 'native_flow', v: '1' },
            content: [
              {
                tag: 'native_flow',
                attrs: { v: '9', name: 'mixed' },
                content: [],
              },
            ],
          },
        ],
      },
    ];

    await sock.relayMessage(targetJid, fullCarouselMsg.message, {
      messageId: fullCarouselMsg.key?.id || undefined,
      additionalNodes: bizNodes,
    });

    if (addLog) {
      addLog(
        'success',
        `✅ Berhasil mengirim pesan CAROUSEL berisi ${cards.length} kartu varian untuk "${productName}" ke ${targetJid}`
      );
    }
  } catch (err: any) {
    if (addLog) {
      addLog(
        'warning',
        `Gagal mengirim carousel varian (${err?.message || err}). Mengirim fallback teks varian...`
      );
    }
    try {
      const targetJid = resolveTargetJid ? resolveTargetJid(remoteJid) : remoteJid;
      for (const card of cards.slice(0, 3)) {
        await sock.sendMessage(
          targetJid,
          { text: card.body.text },
          quotedMsg ? { quoted: quotedMsg } : undefined
        );
      }
    } catch (fallbackErr: any) {
      if (addLog) {
        addLog('error', `Fallback pesan varian gagal: ${fallbackErr?.message || fallbackErr}`);
      }
    }
  }
}
