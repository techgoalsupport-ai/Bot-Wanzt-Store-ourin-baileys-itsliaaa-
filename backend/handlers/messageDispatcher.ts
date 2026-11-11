import fs from 'fs';
import path from 'path';
import { ALLOWED_PREFIXES, CommandsConfig, SESSION_DIR } from '../types/bot.types.ts';
import { sendMenuInteractiveMessage } from '../messages/menuMessage.ts';
import { sendListInteractiveMessage } from '../messages/listMessage.ts';
import { sendProductVariantsCarousel } from '../messages/carouselMessage.ts';
import { sendAdminContactMessage, sendOwnerContactMessage, sendInvoiceAdminContactMessage } from '../messages/adminContactMessage.ts';
import { isKnownProduct, checkXavieraBalance, DEFAULT_CATALOG } from '../services/xavieraService.ts';
import { resolvePlaceholders, normalizeIndonesianPhone } from '../services/placeholderHelper.ts';
import { loadGroupsConfig } from '../services/groupService.ts';
import { createLunasQrisTransaction, startLunasQrisPolling } from '../services/lunasQrisService.ts';
import { recordTransaction, updateTransactionStatus } from '../services/transactionManager.ts';
import {
  DEFAULT_INVOICE_TEMPLATE,
  DEFAULT_CONFIRM_SUMMARY_TEMPLATE,
  DEFAULT_CONFIRM_INPUT_PROMO_TEMPLATE,
  DEFAULT_CONFIRM_PROMO_SUCCESS_TEMPLATE,
  DEFAULT_CONFIRM_PROMO_INVALID_TEMPLATE,
  DEFAULT_PAYMENT_SUCCESS_DM_TEMPLATE,
  DEFAULT_PAYMENT_SUCCESS_GROUP_TEMPLATE,
  DEFAULT_PAYMENT_EXPIRED_TEMPLATE,
  DEFAULT_PAYMENT_ERROR_TEMPLATE,
  DEFAULT_ORDER_GROUP_NOTIF_TEMPLATE,
  DEFAULT_STOCK_EMPTY_TEMPLATE,
  DEFAULT_SESSION_EXPIRED_TEMPLATE,
  DEFAULT_PROMO_CANCELLED_TEMPLATE,
} from '../config/configManager.ts';
import { getPricingConfig, validateAndApplyPromo, db } from '../database/sqlite.ts';
import QRCode from 'qrcode';
import axios from 'axios';

export interface DispatcherDeps {
  addLog: (type: 'info' | 'success' | 'warning' | 'error' | 'code', msg: string) => void;
  resolveTargetJid: (jid: string) => string;
}

// Set untuk melacak ID pesan yang dikirim otomatis oleh bot agar tidak terjadi loop respon
export const botSentMessageIds = new Set<string>();

export interface CheckoutSession {
  senderJid: string;
  senderCleanNumber: string;
  senderName: string;
  groupJid?: string;
  productName: string;
  variantName: string;
  price: number;
  costPrice: number;
  initialMargin: number;
  variantId?: string;
  createdAt: number;
  expiresAt: number; // 90 detik
  waitingForPromo: boolean;
}

// Map untuk melacak sesi checkout aktif berbasis JID pembeli (timeout 90 detik)
export const activeCheckoutSessions = new Map<string, CheckoutSession>();

export interface ExecuteInvoiceParams {
  sock: any;
  config: CommandsConfig;
  senderJid: string;
  senderCleanNumber: string;
  senderName: string;
  remoteJid: string;
  isGroup: boolean;
  productName: string;
  variantName: string;
  price: number;
  finalPrice?: number;
  promoCode?: string;
  discountAmount?: number;
  promoId?: number;
  quotedMessage?: any;
  deps: DispatcherDeps;
}

export function markMessageAsBotSent(id?: string) {
  if (!id) return;
  botSentMessageIds.add(id);
  if (botSentMessageIds.size > 1000) {
    const oldest = botSentMessageIds.values().next().value;
    if (oldest) botSentMessageIds.delete(oldest);
  }
}

export async function executeLunasQrisInvoice(params: ExecuteInvoiceParams): Promise<void> {
  const {
    sock,
    config,
    senderJid,
    senderCleanNumber,
    senderName,
    remoteJid,
    isGroup,
    productName,
    variantName,
    price,
    finalPrice,
    promoCode,
    discountAmount,
    promoId,
    deps,
  } = params;

  const effectiveAmount = finalPrice !== undefined && finalPrice > 0 ? finalPrice : price;
  const orderId = 'ORD-' + Date.now().toString(36).toUpperCase() + '-' + Math.random().toString(36).substring(2, 6).toUpperCase();

  const lunasKey = (config.lunasQrisApiKey || '').trim();
  const lunasBase = (config.lunasQrisBaseUrl || 'https://lunasqris.com').trim();

  if (!lunasKey) {
    deps.addLog('error', '❌ API Key LunasQRIS belum diisi. Gagal menerbitkan QRIS otomatis.');
    const errorTpl = config.paymentErrorText || DEFAULT_PAYMENT_ERROR_TEMPLATE;
    const errorMsg = resolvePlaceholders(errorTpl, config, {
      name: productName,
      variant: variantName,
      orderId,
      price: effectiveAmount,
      total: effectiveAmount,
      customerName: senderName,
      customerNumber: senderCleanNumber,
      errorMessage: 'Metode pembayaran otomatis QRIS belum dapat digunakan saat ini. API Key belum diatur.',
    });
    try {
      const errRes = await sock.sendMessage(senderJid, { text: errorMsg });
      markMessageAsBotSent(errRes?.key?.id);
    } catch {}
    return;
  }

  deps.addLog('info', `💳 Menghubungi gateway LunasQRIS untuk order ${orderId} (Nominal: Rp ${effectiveAmount.toLocaleString('id-ID')})...`);

  let trxData: any = null;
  try {
    const lunasRes = await createLunasQrisTransaction(
      lunasKey,
      {
        amount: effectiveAmount,
        order_id: orderId,
        customer_name: senderName,
        description: `${productName} - ${variantName}`,
      },
      lunasBase
    );
    trxData = lunasRes.data;
  } catch (apiErr: any) {
    deps.addLog('error', `❌ Gagal membuat transaksi LunasQRIS: ${apiErr?.message || apiErr}`);
    const errorTpl = config.paymentErrorText || DEFAULT_PAYMENT_ERROR_TEMPLATE;
    const failMsg = resolvePlaceholders(errorTpl, config, {
      name: productName,
      variant: variantName,
      orderId,
      price: effectiveAmount,
      total: effectiveAmount,
      customerName: senderName,
      customerNumber: senderCleanNumber,
      errorMessage: apiErr?.message || 'Gagal terhubung ke gateway pembayaran',
    });
    try {
      const failRes = await sock.sendMessage(senderJid, { text: failMsg });
      markMessageAsBotSent(failRes?.key?.id);
    } catch {}
    return;
  }

  // Rekam transaksi baru ke SQLite
  try {
    recordTransaction({
      orderId,
      trxId: trxData.trx_id,
      customerNumber: senderCleanNumber,
      customerName: senderName,
      productName,
      variantName,
      nominal: trxData.amount,
      uniqueCode: trxData.unique_code,
      total: trxData.total_amount,
      paymentUrl: trxData.payment_url,
      status: 'pending',
    });
  } catch (dbErr: any) {
    deps.addLog('warning', `Catat transaksi ke SQLite ada kendala: ${dbErr?.message}`);
  }

  // Aktifkan poller otomatis LunasQRIS
  startLunasQrisPolling(
    {
      orderId,
      trxId: trxData.trx_id,
      senderJid,
      groupJid: isGroup ? remoteJid : undefined,
      senderName,
      productName,
      variantName,
      price: effectiveAmount,
      totalAmount: trxData.total_amount,
      uniqueCode: trxData.unique_code,
      apiKey: lunasKey,
      baseUrl: lunasBase,
      onPaid: async () => {
        try {
          updateTransactionStatus(orderId, 'paid');
        } catch {}

        if (promoId) {
          try {
            db.prepare('UPDATE promo_codes SET used_count = used_count + 1 WHERE id = ?').run(promoId);
          } catch (pErr: any) {
            deps.addLog('warning', `Gagal menambah counter promo: ${pErr?.message}`);
          }
        }

        const paidTpl = config.paymentSuccessDmText || DEFAULT_PAYMENT_SUCCESS_DM_TEMPLATE;
        const paidMsg = resolvePlaceholders(paidTpl, config, {
          name: productName,
          variant: variantName,
          orderId,
          price: trxData.total_amount,
          total: trxData.total_amount,
          customerName: senderName,
          customerNumber: senderCleanNumber,
        });
        try {
          const pRes = await sock.sendMessage(senderJid, { text: paidMsg });
          markMessageAsBotSent(pRes?.key?.id);
        } catch {}

        if (isGroup && remoteJid) {
          try {
            const grpPaidTpl = config.paymentSuccessGroupText || DEFAULT_PAYMENT_SUCCESS_GROUP_TEMPLATE;
            const grpPaid = resolvePlaceholders(grpPaidTpl, config, {
              name: productName,
              variant: variantName,
              orderId,
              price: trxData.total_amount,
              total: trxData.total_amount,
              customerName: senderName,
              customerNumber: senderCleanNumber,
            });
            const grpRes = await sock.sendMessage(remoteJid, { text: grpPaid, mentions: [senderJid] });
            markMessageAsBotSent(grpRes?.key?.id);
          } catch {}
        }
      },
      onExpired: async () => {
        try {
          updateTransactionStatus(orderId, 'cancel');
        } catch {}
        try {
          const expTpl = config.paymentExpiredText || DEFAULT_PAYMENT_EXPIRED_TEMPLATE;
          const expMsg = resolvePlaceholders(expTpl, config, {
            name: productName,
            variant: variantName,
            orderId,
            price: effectiveAmount,
            total: effectiveAmount,
            customerName: senderName,
            customerNumber: senderCleanNumber,
          });
          const eRes = await sock.sendMessage(senderJid, { text: expMsg });
          markMessageAsBotSent(eRes?.key?.id);
        } catch {}
      },
    },
    deps.addLog
  );

  // Generate buffer QR Code untuk dikirim ke WhatsApp
  let qrBuffer: Buffer | null = null;
  if (trxData.qris_string) {
    try {
      qrBuffer = await QRCode.toBuffer(trxData.qris_string, {
        width: 480,
        margin: 2,
        color: { dark: '#000000', light: '#FFFFFF' },
      });
    } catch (qrErr: any) {
      deps.addLog('warning', `Gagal generate QR buffer: ${qrErr?.message}`);
    }
  }

  // Siapkan teks Invoice dari template
  const matchedCat = DEFAULT_CATALOG.find((cat) =>
    cat.items.some((item) => item.toLowerCase() === productName.toLowerCase())
  );
  const category = matchedCat?.kategori || 'Digital';

  const invoiceTemplate =
    config.invoiceOutputText && config.invoiceOutputText.trim()
      ? config.invoiceOutputText
      : DEFAULT_INVOICE_TEMPLATE;

  const invoiceCaption = resolvePlaceholders(invoiceTemplate, config, {
    name: productName,
    variant: variantName,
    category,
    price: effectiveAmount,
    total: trxData.total_amount,
    orderId,
    promoCode: promoCode || '-',
    discount: discountAmount || 0,
    finalPrice: effectiveAmount,
  });

  const invoiceFooterTemplate =
    config.invoiceFooterText && config.invoiceFooterText.trim()
      ? config.invoiceFooterText
      : '{storeName} • Invoice LunasQRIS';

  const invoiceFooter = resolvePlaceholders(invoiceFooterTemplate, config, {
    name: productName,
    variant: variantName,
    category,
    price: effectiveAmount,
    total: trxData.total_amount,
    orderId,
  });

  const invoiceButtons = [
    {
      text: '📞 Hubungi Admin',
      id: 'invoice_contact_admin',
    },
  ];

  try {
    if (qrBuffer) {
      try {
        const invRes = await sock.sendMessage(senderJid, {
          image: qrBuffer,
          caption: invoiceCaption,
          footer: invoiceFooter,
          nativeFlow: invoiceButtons,
        });
        markMessageAsBotSent(invRes?.key?.id);
      } catch {
        const invRes = await sock.sendMessage(senderJid, {
          image: qrBuffer,
          caption: `${invoiceCaption}\n\n*${invoiceFooter}*`,
        });
        markMessageAsBotSent(invRes?.key?.id);
      }
    } else {
      const invRes = await sock.sendMessage(senderJid, {
        text: `${invoiceCaption}\n\n💳 Link Pembayaran: ${trxData.payment_url}`,
        footer: invoiceFooter,
        nativeFlow: invoiceButtons,
      });
      markMessageAsBotSent(invRes?.key?.id);
    }
    deps.addLog('success', `🧾 Invoice LunasQRIS untuk ${productName} (${variantName}) berhasil dikirimkan ke DM ${senderJid}`);
  } catch (sendErr: any) {
    deps.addLog('error', `Gagal mengirim invoice ke WhatsApp ${senderJid}: ${sendErr?.message || sendErr}`);
  }
}

export async function dispatchIncomingMessages(
  sock: any,
  config: CommandsConfig,
  messages: any[],
  type: string,
  deps: DispatcherDeps
): Promise<void> {
  // Izinkan event 'notify' dan 'append' (pesan yang dikirim dari HP/WhatsApp Web bot sendiri masuk sebagai 'append')
  if ((type !== 'notify' && type !== 'append') || !sock) return;

  for (const m of messages) {
    if (!m.message) {
      // Deteksi jika pesan gagal didekripsi (CIPHERTEXT stub)
      if (m.messageStubType === 2 /* CIPHERTEXT */) {
        const participant = m.key?.participant || m.key?.remoteJid || '';
        const cleanId = participant.split('@')[0].split(':')[0];
        if (cleanId) {
          try {
            if (fs.existsSync(SESSION_DIR)) {
              const files = fs.readdirSync(SESSION_DIR);
              for (const f of files) {
                if (f.startsWith(`session-${cleanId}`) && f.endsWith('.json')) {
                  fs.unlinkSync(path.join(SESSION_DIR, f));
                }
              }
            }
          } catch {}
          deps.addLog('warning', `⚠️ Sesi enkripsi dengan ${cleanId} direfresh otomatis untuk memulihkan sesi Signal.`);
        }
      }
      continue;
    }

    // Abaikan jika pesan ini adalah pesan balasan otomatis yang dikirim oleh skrip bot sendiri
    if (m.key?.id && botSentMessageIds.has(m.key.id)) {
      continue;
    }

    // Abaikan pesan riwayat lama (> 120 detik) saat sinkronisasi awal akun
    const msgTimestamp = typeof m.messageTimestamp === 'number'
      ? m.messageTimestamp
      : (m.messageTimestamp as any)?.low || 0;
    const nowSec = Math.floor(Date.now() / 1000);
    if (msgTimestamp && (nowSec - msgTimestamp > 120)) {
      continue;
    }

    let remoteJid = m.key.remoteJid;
    if (!remoteJid || remoteJid === 'status@broadcast') continue;
    // Normalisasi remoteJid dari akhiran device Baileys (contoh: 628xxx:1@s.whatsapp.net -> 628xxx@s.whatsapp.net)
    if (remoteJid.includes(':')) {
      remoteJid = remoteJid.replace(/:[0-9]+@/, '@');
    }
    remoteJid = deps.resolveTargetJid(remoteJid);

    // Sistem Whitelist Grup: Jika pesan berasal dari grup WhatsApp (@g.us),
    // periksa apakah grup ini aktif di toggle whitelist SQLite (tabel group_whitelist)
    const isGroup = remoteJid.endsWith('@g.us');
    if (isGroup) {
      const toggledGroups = loadGroupsConfig();
      const isWhitelisted = Boolean(toggledGroups[remoteJid]);
      if (!isWhitelisted) {
        // Grup tidak di-whitelist / toggle nonaktif: abaikan seluruh command/pesan tanpa respon
        continue;
      }
    }

    // Deteksi apakah pesan berasal dari klik tombol interaktif (Quick Reply / Native Flow / Template / List)
    let isInteractiveButtonResponse = false;
    let isListSelectResponse = false;
    let isQuickReplyResponse = false;
    let buttonIdOrText = '';

    // 1. Tombol Respon WhatsApp (buttonsResponseMessage)
    if (m.message?.buttonsResponseMessage) {
      isInteractiveButtonResponse = true;
      isQuickReplyResponse = true;
      buttonIdOrText =
        m.message.buttonsResponseMessage.selectedButtonId ||
        m.message.buttonsResponseMessage.selectedDisplayText ||
        '';
    }
    // 2. Tombol Balasan Template (templateButtonReplyMessage)
    else if (m.message?.templateButtonReplyMessage) {
      isInteractiveButtonResponse = true;
      isQuickReplyResponse = true;
      buttonIdOrText =
        m.message.templateButtonReplyMessage.selectedId ||
        m.message.templateButtonReplyMessage.selectedDisplayText ||
        '';
    }
    // 3. Tombol Native Flow / Single Select / Quick Reply (interactiveResponseMessage)
    else if (m.message?.interactiveResponseMessage) {
      isInteractiveButtonResponse = true;
      const nativeFlow = m.message.interactiveResponseMessage?.nativeFlowResponseMessage;
      const flowName = (nativeFlow?.name || '').toLowerCase();
      const paramsJson = nativeFlow?.paramsJson;

      let paramId = '';
      let paramTitle = '';
      if (paramsJson) {
        try {
          const parsed = JSON.parse(paramsJson);
          paramId = (parsed.id || parsed.row_id || '').trim();
          paramTitle = (parsed.title || parsed.display_text || '').trim();
          buttonIdOrText = paramId || paramTitle || '';
        } catch {
          buttonIdOrText = paramsJson;
        }
      }
      if (!buttonIdOrText && m.message.interactiveResponseMessage?.body?.text) {
        buttonIdOrText = m.message.interactiveResponseMessage.body.text.trim();
      }

      const isSingleSelect =
        flowName.includes('single_select') ||
        flowName === 'single_select_reply' ||
        buttonIdOrText.startsWith('prod_select:') ||
        paramId.startsWith('prod_select:') ||
        isKnownProduct(buttonIdOrText) ||
        isKnownProduct(paramTitle);

      if (isSingleSelect) {
        isListSelectResponse = true;
      } else {
        isQuickReplyResponse = true;
      }
    }
    // 4. Tombol Balasan List Menu (listResponseMessage)
    else if (m.message?.listResponseMessage) {
      isInteractiveButtonResponse = true;
      isListSelectResponse = true;
      buttonIdOrText =
        m.message.listResponseMessage.singleSelectReply?.selectedRowId ||
        m.message.listResponseMessage.title ||
        '';
    }

    // Ekstraksi teks biasa jika bukan pesan respon tombol
    const rawText =
      m.message?.conversation ||
      m.message?.extendedTextMessage?.text ||
      m.message?.imageMessage?.caption ||
      m.message?.videoMessage?.caption ||
      '';
    const trimmedText = rawText.trim();
    const isFromBotSelf = Boolean(m.key?.fromMe);
    const senderName =
      m.pushName ||
      (isFromBotSelf
        ? sock.user?.name || 'Owner (Bot)'
        : (m.key?.participant || remoteJid).split('@')[0]);

    const cleanBtn = (buttonIdOrText || '').trim();

    // 1. TANGANI INTERAKSI TOMBOL KHUSUS CAROUSEL, ORDER & VCARD
    // A. Tombol Contact Admin & Invoice Contact Admin
    if (
      cleanBtn === 'invoice_contact_admin' ||
      cleanBtn === 'contact_admin' ||
      (isInteractiveButtonResponse &&
        (cleanBtn.toLowerCase().includes('invoice_contact_admin') ||
          cleanBtn.toLowerCase().includes('contact_admin')))
    ) {
      if (
        cleanBtn === 'invoice_contact_admin' ||
        cleanBtn.toLowerCase().includes('invoice_contact_admin')
      ) {
        deps.addLog('info', `📞 Tombol "Hubungi Admin" (dari Invoice) ditekan oleh ${senderName}`);
        await sendInvoiceAdminContactMessage(sock, config, remoteJid, m, deps.addLog);
      } else {
        deps.addLog('info', `📞 Tombol "Contact Admin" ditekan oleh ${senderName}`);
        await sendAdminContactMessage(sock, config, remoteJid, m, deps.addLog);
      }
      continue;
    }

    // B. Tombol Order Varian -> Membuka Sesi Konfirmasi di DM
    if (cleanBtn.startsWith('order_')) {
      let productName = 'Produk Pilihan';
      let variantName = 'Varian Pilihan';
      let price = 5000;

      if (cleanBtn.startsWith('order_var:')) {
        const raw = cleanBtn.replace(/^order_var:/, '');
        const [pEnc, vEnc, pPrice] = raw.split('|');
        try {
          if (pEnc) productName = decodeURIComponent(pEnc);
          if (vEnc) variantName = decodeURIComponent(vEnc);
        } catch {}
        if (pPrice && !isNaN(Number(pPrice))) {
          price = Number(pPrice);
        }
      } else {
        variantName = cleanBtn.replace(/^order_/, '').trim() || 'Varian Pilihan';
      }

      deps.addLog('info', `🛒 Pelanggan ${senderName} menekan tombol ORDER: "${productName} - ${variantName}" (Rp ${price.toLocaleString('id-ID')})`);

      // Dapatkan JID pemicu/pengirim secara presisi untuk pengiriman DM
      let senderJid = m.key?.participant || remoteJid;
      if (senderJid.includes(':')) {
        senderJid = senderJid.replace(/:[0-9]+@/, '@');
      }
      senderJid = deps.resolveTargetJid(senderJid);
      const senderCleanNumber = (senderJid.split('@')[0] || '').replace(/[^0-9]/g, '');

      // 1. Pre-check Saldo Utama di Akun Xaviera (Hitung harga modal berdasarkan markup aktif)
      const currentPricing = config.pricingConfig || getPricingConfig();
      let costPrice = price;
      if (currentPricing.mode === 'rp') {
        costPrice = Math.max(0, price - (currentPricing.value || 0));
      } else {
        const pct = (currentPricing.value || 0) / 100;
        costPrice = pct > 0 ? Math.round(price / (1 + pct)) : price;
      }
      const initialMargin = Math.max(0, price - costPrice);

      try {
        const xavieraBal = await checkXavieraBalance(costPrice, config);
        if (!xavieraBal.sufficient) {
          const stockTpl = config.stockEmptyText || DEFAULT_STOCK_EMPTY_TEMPLATE;
          const outOfStockMsg = resolvePlaceholders(stockTpl, config, {
            name: productName,
            variant: variantName,
            price,
            total: price,
            customerName: senderName,
            customerNumber: senderCleanNumber,
          });
          const resp = await sock.sendMessage(
            remoteJid,
            { text: outOfStockMsg, mentions: [senderJid] },
            { quoted: m }
          );
          markMessageAsBotSent(resp?.key?.id);
          continue;
        }
      } catch (chkErr: any) {
        deps.addLog('warning', `Gagal cek saldo Xaviera (diteruskan): ${chkErr?.message || chkErr}`);
      }

      // 2. Simpan sesi checkout aktif untuk pembeli (timeout 90 detik)
      const sessionData: CheckoutSession = {
        senderJid,
        senderCleanNumber,
        senderName,
        groupJid: isGroup ? remoteJid : undefined,
        productName,
        variantName,
        price,
        costPrice,
        initialMargin,
        variantId: `${productName}|${variantName}`,
        createdAt: Date.now(),
        expiresAt: Date.now() + 90 * 1000,
        waitingForPromo: false,
      };
      activeCheckoutSessions.set(senderJid, sessionData);

      // 3. Jika di Grup: Kirim notifikasi singkat bahwa konfirmasi pesanan dikirim ke DM
      if (isGroup) {
        const grpNotifTpl = config.orderGroupNotifText || DEFAULT_ORDER_GROUP_NOTIF_TEMPLATE;
        const groupNotification = resolvePlaceholders(grpNotifTpl, config, {
          name: productName,
          variant: variantName,
          price,
          total: price,
          customerName: senderName,
          customerNumber: senderCleanNumber,
        });
        try {
          const grpRes = await sock.sendMessage(
            remoteJid,
            { text: groupNotification, mentions: [senderJid] },
            { quoted: m }
          );
          markMessageAsBotSent(grpRes?.key?.id);
          deps.addLog('success', `💬 Notifikasi ringkasan pesanan terkirim ke grup ${remoteJid}`);
        } catch (grpErr: any) {
          deps.addLog('error', `Gagal mengirim notifikasi grup: ${grpErr?.message || grpErr}`);
        }
      }

      // 4. Di Chat Pribadi (DM): Kirim Ringkasan Pesanan dengan 2 Tombol Interaktif
      const matchedCat = DEFAULT_CATALOG.find((cat) =>
        cat.items.some((item) => item.toLowerCase() === productName.toLowerCase())
      );
      const category = matchedCat?.kategori || 'Digital';

      const summaryTemplate =
        config.confirmSummaryText && config.confirmSummaryText.trim()
          ? config.confirmSummaryText
          : DEFAULT_CONFIRM_SUMMARY_TEMPLATE;

      const summaryCaption = resolvePlaceholders(summaryTemplate, config, {
        name: productName,
        variant: variantName,
        category,
        price,
        total: price,
      });

      const confirmFooterTemplate =
        config.confirmFooterText && config.confirmFooterText.trim()
          ? config.confirmFooterText
          : '{storeName} • Konfirmasi Pesanan';

      const confirmFooter = resolvePlaceholders(confirmFooterTemplate, config, {
        name: productName,
        variant: variantName,
        category,
        price,
        total: price,
      });

      const checkoutButtons = [
        {
          text: '🎟️ Pakai Kode Promo',
          id: 'checkout_promo',
        },
        {
          text: '⚡ Lanjut Bayar (Normal)',
          id: 'checkout_direct',
        },
      ];

      try {
        const dmRes = await sock.sendMessage(senderJid, {
          text: summaryCaption,
          footer: confirmFooter,
          nativeFlow: checkoutButtons,
        });
        markMessageAsBotSent(dmRes?.key?.id);
        deps.addLog('success', `📩 Pesan Ringkasan Pesanan & Tombol Promo berhasil dikirim ke DM ${senderJid}`);
      } catch (dmErr: any) {
        deps.addLog('warning', `Kirim ringkasan dengan tombol gagal, fallback teks: ${dmErr?.message}`);
        try {
          const fallbackRes = await sock.sendMessage(senderJid, {
            text: `${summaryCaption}\n\nKetik *PROMO* untuk pakai kupon, atau ketik *BAYAR* untuk lanjut bayar normal.`,
          });
          markMessageAsBotSent(fallbackRes?.key?.id);
        } catch {}
      }

      continue;
    }

    // Tombol: Pakai Kode Promo (Quick Reply)
    if (cleanBtn === 'checkout_promo' || cleanBtn.toLowerCase().includes('checkout_promo')) {
      let senderJid = m.key?.participant || remoteJid;
      if (senderJid.includes(':')) senderJid = senderJid.replace(/:[0-9]+@/, '@');
      senderJid = deps.resolveTargetJid(senderJid);

      const session = activeCheckoutSessions.get(senderJid);
      if (!session || Date.now() > session.expiresAt) {
        activeCheckoutSessions.delete(senderJid);
        const sessExpTpl = config.sessionExpiredText || DEFAULT_SESSION_EXPIRED_TEMPLATE;
        const expText = resolvePlaceholders(sessExpTpl, config, {
          name: session?.productName,
          variant: session?.variantName,
          customerName: senderName,
          customerNumber: (senderJid.split('@')[0] || '').replace(/[^0-9]/g, ''),
        });
        const expRes = await sock.sendMessage(senderJid, {
          text: expText,
        });
        markMessageAsBotSent(expRes?.key?.id);
        continue;
      }

      session.waitingForPromo = true;
      deps.addLog('info', `🎟️ Pelanggan ${senderName} memilih untuk memasukkan kode promo. Menunggu input kode...`);

      const inputPromoTemplate =
        config.confirmInputPromoText && config.confirmInputPromoText.trim()
          ? config.confirmInputPromoText
          : DEFAULT_CONFIRM_INPUT_PROMO_TEMPLATE;

      const inputPromoText = resolvePlaceholders(inputPromoTemplate, config, {
        name: session.productName,
        variant: session.variantName,
        price: session.price,
        total: session.price,
      });

      const confirmFooter = resolvePlaceholders(
        config.confirmFooterText || '{storeName} • Konfirmasi Pesanan',
        config,
        {
          name: session.productName,
          variant: session.variantName,
          price: session.price,
        }
      );

      try {
        const resp = await sock.sendMessage(senderJid, {
          text: inputPromoText,
          footer: confirmFooter,
        });
        markMessageAsBotSent(resp?.key?.id);
      } catch (err: any) {
        deps.addLog('error', `Gagal mengirim instruksi kode promo ke ${senderJid}: ${err?.message}`);
      }
      continue;
    }

    // Tombol: Lanjut Bayar Langsung (Harga Normal)
    if (cleanBtn === 'checkout_direct' || cleanBtn.toLowerCase().includes('checkout_direct')) {
      let senderJid = m.key?.participant || remoteJid;
      if (senderJid.includes(':')) senderJid = senderJid.replace(/:[0-9]+@/, '@');
      senderJid = deps.resolveTargetJid(senderJid);

      const session = activeCheckoutSessions.get(senderJid);
      if (!session || Date.now() > session.expiresAt) {
        activeCheckoutSessions.delete(senderJid);
        const sessExpTpl = config.sessionExpiredText || DEFAULT_SESSION_EXPIRED_TEMPLATE;
        const expText = resolvePlaceholders(sessExpTpl, config, {
          name: session?.productName,
          variant: session?.variantName,
          customerName: senderName,
          customerNumber: (senderJid.split('@')[0] || '').replace(/[^0-9]/g, ''),
        });
        const expRes = await sock.sendMessage(senderJid, {
          text: expText,
        });
        markMessageAsBotSent(expRes?.key?.id);
        continue;
      }

      activeCheckoutSessions.delete(senderJid);
      deps.addLog('info', `⚡ Pelanggan ${senderName} memilih Lanjut Bayar Normal untuk "${session.productName} (${session.variantName})".`);

      await executeLunasQrisInvoice({
        sock,
        config,
        senderJid,
        senderCleanNumber: session.senderCleanNumber,
        senderName: session.senderName,
        remoteJid: session.groupJid || senderJid,
        isGroup: Boolean(session.groupJid),
        productName: session.productName,
        variantName: session.variantName,
        price: session.price,
        quotedMessage: m,
        deps,
      });
      continue;
    }

    // C. Tombol vCard Kontak (Pengiriman kartu kontak WhatsApp nomor)
    if (cleanBtn.startsWith('vcard_')) {
      const rawNum = cleanBtn.replace(/^vcard_/, '').trim();
      const matchedBtn = (config.menuButtons || []).find(
        (b) =>
          (b.type === 'vcard' || b.type === 'cta_call') &&
          ((b.callPhoneNumber && b.callPhoneNumber.replace(/[^0-9]/g, '') === rawNum) || b.id === rawNum)
      );
      const targetName = matchedBtn?.callTargetName || 'Admin Wanzt Store';
      const cleanNum = normalizeIndonesianPhone(matchedBtn?.callPhoneNumber || rawNum) || '6283861276608';

      deps.addLog('info', `📇 Tombol vCard ditekan oleh ${senderName}. Mengirim kartu kontak ${targetName} (${cleanNum})...`);

      const vcard =
        'BEGIN:VCARD\n' +
        'VERSION:3.0\n' +
        `FN:${targetName}\n` +
        `ORG:Wanzt Store;\n` +
        `TEL;type=CELL;type=VOICE;waid=${cleanNum}:+${cleanNum}\n` +
        'END:VCARD';

      try {
        await sock.sendMessage(
          remoteJid,
          {
            contacts: {
              displayName: targetName,
              contacts: [{ vcard }],
            },
          },
          { quoted: m }
        );
        deps.addLog('success', `✅ Berhasil mengirimkan kartu kontak (vCard) ${targetName} (${cleanNum}) ke ${remoteJid}`);
      } catch (err: any) {
        deps.addLog('error', `Gagal mengirim kartu kontak vCard: ${err?.message || err}`);
      }
      continue;
    }

    // 2. TANGANI INTERAKSI DARI DROPDOWN SINGLE SELECT (PEMILIHAN PRODUK LIST)
    let selectedProductName = '';
    if (cleanBtn.startsWith('prod_select:')) {
      selectedProductName = cleanBtn.replace(/^prod_select:/, '').trim();
    } else if (cleanBtn.startsWith('product_select:')) {
      selectedProductName = cleanBtn.replace(/^product_select:/, '').trim();
    } else if (isListSelectResponse && cleanBtn) {
      selectedProductName = cleanBtn;
    } else if (isInteractiveButtonResponse && isKnownProduct(cleanBtn)) {
      selectedProductName = cleanBtn;
    }

    // Deteksi jika pesan pengguna berisi format balasan "Tampilkan varian *(Nama Produk)*"
    if (!selectedProductName && trimmedText) {
      const match = trimmedText.match(/tampilkan\s+varian\s+\*?([^*\n\r]+)\*?/i);
      if (match && match[1]) {
        selectedProductName = match[1].trim();
      } else {
        const firstLine = trimmedText.split('\n')[0].replace(/[*_~`]/g, '').trim();
        if (isKnownProduct(firstLine)) {
          selectedProductName = firstLine;
        }
      }
    }

    if (selectedProductName) {
      deps.addLog(
        'info',
        `📦 Pelanggan ${senderName} memilih produk "${selectedProductName}" dari dropdown Single Select. Menyiapkan carousel varian...`
      );
      try {
        await sendProductVariantsCarousel(
          sock,
          config,
          remoteJid,
          selectedProductName,
          m,
          deps.addLog,
          deps.resolveTargetJid
        );
      } catch (err: any) {
        deps.addLog('error', `Gagal memproses carousel varian: ${err?.message || err}`);
      }
      continue;
    }

    // 3. TANGANI INTERAKSI DARI TOMBOL QUICK REPLY / MENU BUTTONS
    if (isQuickReplyResponse && cleanBtn) {
      const cleanLower = cleanBtn.toLowerCase();
      // Cocokkan dengan tombol yang didaftarkan pada config.menuButtons
      const matchedButton = (config.menuButtons || []).find((b) => {
        const bOutput = (b.output || '').trim().toLowerCase();
        const bName = (b.name || '').trim().toLowerCase();
        const bId = (b.id || '').trim().toLowerCase();
        return (
          bOutput === cleanLower ||
          bName === cleanLower ||
          bId === cleanLower ||
          (bOutput && cleanLower.includes(bOutput)) ||
          (bName && cleanLower.includes(bName))
        );
      });

      if (matchedButton) {
        // A. Tombol bertipe vcard / cta_call: Kirim vCard Kontak
        if (matchedButton.type === 'vcard' || matchedButton.type === 'cta_call') {
          const rawTargetName = matchedButton.callTargetName || '{adminName}';
          const targetName = resolvePlaceholders(rawTargetName, config) || config.storeInfo?.adminName || 'Admin Store';
          const rawPhone = matchedButton.callPhoneNumber || matchedButton.output || '{adminNumber}';
          const resolvedPhone = resolvePlaceholders(rawPhone, config);
          const cleanNum = resolvedPhone.replace(/[^0-9]/g, '') || (config.storeInfo?.adminNumber || config.storeInfo?.ownerNumber || '6282173515807').replace(/[^0-9]/g, '');
          const orgName = resolvePlaceholders('{storeName}', config) || 'Wanzt Store';

          deps.addLog('info', `📇 Tombol "${matchedButton.name}" (vCard) ditekan oleh ${senderName}. Mengirim kartu kontak ${targetName} (${cleanNum})...`);
          const vcard =
            'BEGIN:VCARD\n' +
            'VERSION:3.0\n' +
            `FN:${targetName}\n` +
            `ORG:${orgName};\n` +
            `TEL;type=CELL;type=VOICE;waid=${cleanNum}:+${cleanNum}\n` +
            'END:VCARD';

          try {
            await sock.sendMessage(
              remoteJid,
              {
                contacts: {
                  displayName: targetName,
                  contacts: [{ vcard }],
                },
              },
              { quoted: m }
            );
            deps.addLog('success', `✅ Berhasil mengirimkan kontak vCard ke ${remoteJid}`);
          } catch (err: any) {
            deps.addLog('error', `Gagal mengirim vCard: ${err?.message || err}`);
          }
          continue;
        }

        // B. Aksi Pemicu: LIST
        if (matchedButton.triggerAction === 'list') {
          deps.addLog('info', `🔘 Tombol Quick Reply "${matchedButton.name}" (Action: List) ditekan oleh ${senderName}. Memicu Command List!`);
          try {
            await sendListInteractiveMessage(sock, config, remoteJid, m, deps.addLog);
          } catch (err: any) {
            deps.addLog('error', `Gagal mengirim respon LIST: ${err?.message || err}`);
          }
          continue; // SELESAI, jangan lanjut ke deteksi produk / carousel!
        }

        // C. Aksi Pemicu: MENU
        if (matchedButton.triggerAction === 'menu') {
          deps.addLog('info', `🔘 Tombol Quick Reply "${matchedButton.name}" (Action: Menu) ditekan oleh ${senderName}. Memicu Command Menu!`);
          try {
            await sendMenuInteractiveMessage(sock, config, remoteJid, m, deps.addLog);
          } catch (err: any) {
            deps.addLog('error', `Gagal mengirim respon MENU: ${err?.message || err}`);
          }
          continue; // SELESAI
        }

        // D. Aksi Pemicu: OWNER
        if (matchedButton.triggerAction === 'owner') {
          deps.addLog('info', `👑 Tombol Quick Reply "${matchedButton.name}" (Action: Owner) ditekan oleh ${senderName}. Mengirim Kontak Owner!`);
          try {
            await sendOwnerContactMessage(sock, config, remoteJid, m, deps.addLog);
          } catch (err: any) {
            deps.addLog('error', `Gagal mengirim respon OWNER: ${err?.message || err}`);
          }
          continue; // SELESAI
        }

        // E. Aksi Pemicu: ADMIN
        if (matchedButton.triggerAction === 'admin') {
          deps.addLog('info', `📞 Tombol Quick Reply "${matchedButton.name}" (Action: Admin) ditekan oleh ${senderName}. Mengirim Kontak Admin!`);
          try {
            await sendAdminContactMessage(sock, config, remoteJid, m, deps.addLog);
          } catch (err: any) {
            deps.addLog('error', `Gagal mengirim respon ADMIN: ${err?.message || err}`);
          }
          continue; // SELESAI
        }

        // F. Aksi Pemicu: UNKNOWN / TANPA AKSI
        // Pengguna menginginkan: tombol tanpa aksi pemicu bot TIDAK AKAN merespon
        if (matchedButton.triggerAction === 'unknown' || !matchedButton.triggerAction) {
          deps.addLog('info', `🔘 Tombol Quick Reply "${matchedButton.name}" (Tanpa Aksi Pemicu) ditekan oleh ${senderName}. Bot tidak merespon sesuai aturan.`);
          continue; // SELESAI, tidak merespon sama sekali dan jangan kirim carousel!
        }
      }

      // Jika tombol Quick Reply tidak terdaftar di menuButtons, cek apakah ada teks perintah jelas
      const firstChar = cleanBtn.charAt(0);
      const cleanCmd = ALLOWED_PREFIXES.includes(firstChar)
        ? cleanBtn.substring(1).trim().toLowerCase()
        : cleanBtn.toLowerCase();

      if (cleanCmd === 'list') {
        deps.addLog('info', `🔘 Tombol Quick Reply "${cleanBtn}" ditekan oleh ${senderName}. Memicu Command List!`);
        await sendListInteractiveMessage(sock, config, remoteJid, m, deps.addLog);
        continue;
      }
      if (cleanCmd === 'menu') {
        deps.addLog('info', `🔘 Tombol Quick Reply "${cleanBtn}" ditekan oleh ${senderName}. Memicu Command Menu!`);
        await sendMenuInteractiveMessage(sock, config, remoteJid, m, deps.addLog);
        continue;
      }
      if (cleanCmd === 'owner') {
        deps.addLog('info', `👑 Tombol Quick Reply "${cleanBtn}" ditekan oleh ${senderName}. Mengirim Kontak Owner!`);
        await sendOwnerContactMessage(sock, config, remoteJid, m, deps.addLog);
        continue;
      }
      if (['contact', 'admin', 'kontak'].includes(cleanCmd)) {
        deps.addLog('info', `📞 Tombol Quick Reply "${cleanBtn}" ditekan oleh ${senderName}. Mengirim Kontak Admin!`);
        await sendAdminContactMessage(sock, config, remoteJid, m, deps.addLog);
        continue;
      }

      // Jika tidak ada perintah valid pada tombol quick reply, jangan pernah mengirim carousel
      deps.addLog('info', `🔘 Tombol Quick Reply "${cleanBtn}" ditekan oleh ${senderName} tanpa aksi pemicu. Bot tidak merespon.`);
      continue;
    }

    // 4. TANGANI PESAN TEKS MANUAL
    if (!trimmedText) continue;

    // 4.A TANGANI SESI AKTIF KONFIRMASI CHECKOUT & KODE PROMO DI PRIVATE CHAT (DM)
    let senderJid = m.key?.participant || remoteJid;
    if (senderJid.includes(':')) {
      senderJid = senderJid.replace(/:[0-9]+@/, '@');
    }
    senderJid = deps.resolveTargetJid(senderJid);

    const activeSession = activeCheckoutSessions.get(senderJid);
    if (!isGroup && activeSession) {
      // Kasus 1: Sesi sedang menunggu input kode promo dari pembeli
      if (activeSession.waitingForPromo) {
        if (Date.now() > activeSession.expiresAt) {
          activeCheckoutSessions.delete(senderJid);
          const sessExpTpl = config.sessionExpiredText || DEFAULT_SESSION_EXPIRED_TEMPLATE;
          const expText = resolvePlaceholders(sessExpTpl, config, {
            name: activeSession.productName,
            variant: activeSession.variantName,
            price: activeSession.price,
            total: activeSession.price,
            customerName: activeSession.senderName,
            customerNumber: activeSession.senderCleanNumber,
          });
          const expRes = await sock.sendMessage(senderJid, {
            text: expText,
          });
          markMessageAsBotSent(expRes?.key?.id);
          continue;
        }

        const inputUpper = trimmedText.trim().toUpperCase();

        // 1. Pembeli mengetik 'BATAL'
        if (inputUpper === 'BATAL') {
          activeCheckoutSessions.delete(senderJid);
          deps.addLog('info', `❌ Pelanggan ${senderName} mengetik BATAL untuk promo. Melanjutkan dengan harga normal.`);
          const promoCancelTpl = config.promoCancelledText || DEFAULT_PROMO_CANCELLED_TEMPLATE;
          const cancelMsg = resolvePlaceholders(promoCancelTpl, config, {
            name: activeSession.productName,
            variant: activeSession.variantName,
            price: activeSession.price,
            total: activeSession.price,
            customerName: activeSession.senderName,
            customerNumber: activeSession.senderCleanNumber,
          });
          const cRes = await sock.sendMessage(senderJid, { text: cancelMsg });
          markMessageAsBotSent(cRes?.key?.id);

          await executeLunasQrisInvoice({
            sock,
            config,
            senderJid,
            senderCleanNumber: activeSession.senderCleanNumber,
            senderName: activeSession.senderName,
            remoteJid: activeSession.groupJid || senderJid,
            isGroup: Boolean(activeSession.groupJid),
            productName: activeSession.productName,
            variantName: activeSession.variantName,
            price: activeSession.price,
            quotedMessage: m,
            deps,
          });
          continue;
        }

        // 2. Pembeli mengetik kode promo (misal: HEMAT10)
        const promoResult = validateAndApplyPromo({
          code: trimmedText.trim(),
          variantId: activeSession.variantId || `${activeSession.productName}|${activeSession.variantName}`,
          basePrice: activeSession.costPrice,
          initialMargin: activeSession.initialMargin,
          totalOrderAmount: activeSession.price,
          isApkPremium: true,
        });

        if (!promoResult.isValid) {
          const reason = promoResult.errorMessage || 'Kode promo tidak valid atau tidak dapat digunakan.';
          deps.addLog('warning', `⚠️ Kode promo "${trimmedText.trim()}" oleh ${senderName} invalid: ${reason}`);

          const invalidTemplate =
            config.confirmPromoInvalidText && config.confirmPromoInvalidText.trim()
              ? config.confirmPromoInvalidText
              : DEFAULT_CONFIRM_PROMO_INVALID_TEMPLATE;

          const invalidMsg = resolvePlaceholders(invalidTemplate, config, {
            name: activeSession.productName,
            variant: activeSession.variantName,
            price: activeSession.price,
            promoCode: trimmedText.trim(),
            reason,
          });

          const invFooter = resolvePlaceholders(
            config.confirmFooterText || '{storeName} • Konfirmasi Pesanan',
            config
          );

          const invResp = await sock.sendMessage(senderJid, {
            text: invalidMsg,
            footer: invFooter,
          });
          markMessageAsBotSent(invResp?.key?.id);
          // Biarkan activeSession tetap aktif agar customer bisa mencoba kode lain atau ketik BATAL
          continue;
        }

        // Kode promo VALID!
        activeCheckoutSessions.delete(senderJid);
        const appliedDiscount = promoResult.actualDiscountApplied;
        const finalPrice = promoResult.finalPrice;
        const promoCodeUsed = promoResult.promo?.code || trimmedText.trim().toUpperCase();
        const promoId = promoResult.promo?.id;

        deps.addLog(
          'success',
          `🎉 Kode promo "${promoCodeUsed}" VALID untuk ${senderName}! Potongan: Rp ${appliedDiscount.toLocaleString('id-ID')}, Harga Akhir: Rp ${finalPrice.toLocaleString('id-ID')}`
        );

        const successTemplate =
          config.confirmPromoSuccessText && config.confirmPromoSuccessText.trim()
            ? config.confirmPromoSuccessText
            : DEFAULT_CONFIRM_PROMO_SUCCESS_TEMPLATE;

        const successMsg = resolvePlaceholders(successTemplate, config, {
          name: activeSession.productName,
          variant: activeSession.variantName,
          price: activeSession.price,
          promoCode: promoCodeUsed,
          discount: appliedDiscount,
          finalPrice: finalPrice,
        });

        const succFooter = resolvePlaceholders(
          config.confirmFooterText || '{storeName} • Konfirmasi Pesanan',
          config
        );

        const sRes = await sock.sendMessage(senderJid, {
          text: successMsg,
          footer: succFooter,
        });
        markMessageAsBotSent(sRes?.key?.id);

        await executeLunasQrisInvoice({
          sock,
          config,
          senderJid,
          senderCleanNumber: activeSession.senderCleanNumber,
          senderName: activeSession.senderName,
          remoteJid: activeSession.groupJid || senderJid,
          isGroup: Boolean(activeSession.groupJid),
          productName: activeSession.productName,
          variantName: activeSession.variantName,
          price: activeSession.price,
          finalPrice,
          promoCode: promoCodeUsed,
          discountAmount: appliedDiscount,
          promoId,
          quotedMessage: m,
          deps,
        });
        continue;
      }

      // Kasus 2: Sesi belum waitingForPromo tapi pembeli mengetik teks fallback seperti 'PROMO' atau 'BAYAR'
      const lower = trimmedText.trim().toLowerCase();
      if (lower === 'promo' || lower === 'pakai promo' || lower === 'kode promo') {
        activeSession.waitingForPromo = true;
        deps.addLog('info', `🎟️ Pelanggan ${senderName} mengetik "${trimmedText}" untuk memasukkan kode promo.`);

        const inputPromoTemplate =
          config.confirmInputPromoText && config.confirmInputPromoText.trim()
            ? config.confirmInputPromoText
            : DEFAULT_CONFIRM_INPUT_PROMO_TEMPLATE;

        const inputPromoText = resolvePlaceholders(inputPromoTemplate, config, {
          name: activeSession.productName,
          variant: activeSession.variantName,
          price: activeSession.price,
          total: activeSession.price,
        });

        const confirmFooter = resolvePlaceholders(
          config.confirmFooterText || '{storeName} • Konfirmasi Pesanan',
          config
        );

        try {
          const resp = await sock.sendMessage(senderJid, {
            text: inputPromoText,
            footer: confirmFooter,
          });
          markMessageAsBotSent(resp?.key?.id);
        } catch {}
        continue;
      } else if (lower === 'bayar' || lower === 'lanjut bayar' || lower === 'normal') {
        activeCheckoutSessions.delete(senderJid);
        deps.addLog('info', `⚡ Pelanggan ${senderName} mengetik "${trimmedText}" untuk bayar harga normal.`);

        await executeLunasQrisInvoice({
          sock,
          config,
          senderJid,
          senderCleanNumber: activeSession.senderCleanNumber,
          senderName: activeSession.senderName,
          remoteJid: activeSession.groupJid || senderJid,
          isGroup: Boolean(activeSession.groupJid),
          productName: activeSession.productName,
          variantName: activeSession.variantName,
          price: activeSession.price,
          quotedMessage: m,
          deps,
        });
        continue;
      }
    }

    // 4.B TANGANI COMMAND DENGAN PREFIX (WAJIB PREFIX: / . ! ? # $ % &)
    const firstChar = trimmedText.charAt(0);
    if (!ALLOWED_PREFIXES.includes(firstChar)) {
      // Abaikan teks manual tanpa prefix untuk menghindari spam di obrolan grup
      continue;
    }

    const usedPrefix = firstChar;
    const textWithoutPrefix = trimmedText.substring(1).trim();
    if (!textWithoutPrefix) continue;

    const parts = textWithoutPrefix.split(/\s+/);
    const commandName = parts[0].toLowerCase();
    const commandArg = parts.slice(1).join(' ').trim();

    // A. Command 'menu'
    if (commandName === 'menu') {
      deps.addLog('info', `📩 Menerima command ${usedPrefix}menu dari ${senderName}`);
      try {
        await sendMenuInteractiveMessage(sock, config, remoteJid, m, deps.addLog);
      } catch (sendErr: any) {
        deps.addLog('error', `Gagal mengirim respon MENU: ${sendErr?.message || sendErr}`);
      }
      continue;
    }

    // B. Command 'list'
    if (commandName === 'list') {
      deps.addLog('info', `📋 Menerima command ${usedPrefix}list dari ${senderName}`);
      try {
        await sendListInteractiveMessage(sock, config, remoteJid, m, deps.addLog);
      } catch (sendErr: any) {
        deps.addLog('error', `Gagal mengirim respon LIST: ${sendErr?.message || sendErr}`);
      }
      continue;
    }

    // C. Command 'owner'
    if (commandName === 'owner') {
      deps.addLog('info', `👑 Menerima command ${usedPrefix}owner dari ${senderName}`);
      await sendOwnerContactMessage(sock, config, remoteJid, m, deps.addLog);
      continue;
    }

    // D. Command 'admin' / 'contact'
    if (['admin', 'contact', 'kontak'].includes(commandName)) {
      deps.addLog('info', `📞 Menerima command ${usedPrefix}${commandName} dari ${senderName}`);
      await sendAdminContactMessage(sock, config, remoteJid, m, deps.addLog);
      continue;
    }

    // D. Command 'order' (Mode Uji Coba: Respon Grup & Private Chat)
    if (commandName.startsWith('order')) {
      const variantChoice = commandArg || 'Produk Pilihan';
      deps.addLog('info', `🛒 Pelanggan ${senderName} mengetik command ORDER: "${variantChoice}" (Chat: ${remoteJid})`);

      let senderJid = m.key?.participant || remoteJid;
      if (senderJid.includes(':')) {
        senderJid = senderJid.replace(/:[0-9]+@/, '@');
      }
      senderJid = deps.resolveTargetJid(senderJid);

      if (isGroup) {
        try {
          const groupRes = await sock.sendMessage(
            remoteJid,
            { text: 'testing respon in grup' },
            { quoted: m }
          );
          markMessageAsBotSent(groupRes?.key?.id);
          deps.addLog('success', `💬 [Uji Coba] Pesan "testing respon in grup" terkirim ke grup ${remoteJid}`);
        } catch (grpErr: any) {
          deps.addLog('error', `Gagal mengirim respon grup: ${grpErr?.message || grpErr}`);
        }

        try {
          const privRes = await sock.sendMessage(
            senderJid,
            { text: 'testing respon in private chat' }
          );
          markMessageAsBotSent(privRes?.key?.id);
          deps.addLog('success', `📩 [Uji Coba] Pesan "testing respon in private chat" terkirim ke ${senderJid}`);
        } catch (privErr: any) {
          deps.addLog('error', `Gagal mengirim pesan ke private chat ${senderJid}: ${privErr?.message || privErr}`);
        }
      } else {
        try {
          const privRes = await sock.sendMessage(
            remoteJid,
            { text: 'testing respon in private chat' },
            { quoted: m }
          );
          markMessageAsBotSent(privRes?.key?.id);
          deps.addLog('success', `📩 [Uji Coba] Respon di private chat berhasil terkirim.`);
        } catch (privErr: any) {
          deps.addLog('error', `Gagal mengirim respon private: ${privErr?.message || privErr}`);
        }
      }
      continue;
    }

    // E. Command Nama Produk Langsung (contoh: .netflix, .youtube, .ml, .canva, .spotify, dll.)
    const reservedWords = ['menu', 'list', 'admin', 'contact', 'kontak', 'owner', 'order', 'help', 'info', 'ping', 'start', 'stop'];
    if (!reservedWords.includes(commandName)) {
      deps.addLog('info', `📦 Memproses varian produk "${textWithoutPrefix}" dari ${senderName} [Prefix: "${usedPrefix}${commandName}"]`);
      try {
        await sendProductVariantsCarousel(
          sock,
          config,
          remoteJid,
          textWithoutPrefix,
          m,
          deps.addLog,
          deps.resolveTargetJid
        );
      } catch (err: any) {
        deps.addLog('error', `Gagal memproses carousel varian: ${err?.message || err}`);
      }
      continue;
    }
  }
}

