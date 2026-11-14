import makeWASocket, {
  useMultiFileAuthState,
  makeCacheableSignalKeyStore,
  DisconnectReason,
  Browsers,
} from '@itsliaaa/baileys';
import NodeCache from '@cacheable/node-cache';
import pino from 'pino';
import fs from 'fs';
import path from 'path';

// Intercept noisy libsignal Bad MAC / decryption warnings from polluting stderr
const rawConsoleError = console.error;
let isConsoleHooked = false;
function setupConsoleFilter() {
  if (isConsoleHooked) return;
  isConsoleHooked = true;
  console.error = (...args: any[]) => {
    const str = args.map(a => typeof a === 'string' ? a : (a?.message || a?.stack || '')).join(' ');
    if (
      str.includes('Failed to decrypt message with any known session') ||
      str.includes('Bad MAC') ||
      str.includes('Session error:Error: Bad MAC')
    ) {
      return;
    }
    rawConsoleError.apply(console, args);
  };
}
setupConsoleFilter();

// In-memory caches for message retries and Signal key caching
const msgRetryCounterCache = new NodeCache({ stdTTL: 3600, useClones: false });
const messageCache = new NodeCache({ stdTTL: 3600, useClones: false, maxKeys: 1500 });

// Re-export type definitions & constants for backward compatibility
export * from './types/bot.types.ts';

import {
  DEFAULT_CUSTOM_CODE,
  SESSION_DIR,
  BotStatus,
  LogEntry,
  CommandsConfig,
  ProductVariantItem,
} from './types/bot.types.ts';

import { loadCommandsConfig, saveCommandsConfig, DEFAULT_CONFIG } from './config/configManager.ts';
import { generateDaftarProdukText, getProductVariants } from './services/xavieraService.ts';
import { sendMenuInteractiveMessage } from './messages/menuMessage.ts';
import { sendListInteractiveMessage } from './messages/listMessage.ts';
import { sendProductVariantsCarousel } from './messages/carouselMessage.ts';
import { sendAdminContactMessage } from './messages/adminContactMessage.ts';
import { dispatchIncomingMessages, markMessageAsBotSent } from './handlers/messageDispatcher.ts';
import {
  GroupItem,
  loadGroupsConfig,
  setGroupToggle,
  loadGroupOnlySetting,
  saveGroupOnlySetting,
} from './services/groupService.ts';
import { getActiveTenantId, runWithTenant } from './database/tenantContext.ts';

export class BotManager {
  public tenantId: string;
  public sessionDir: string;
  public status: BotStatus = 'idle';
  public phoneNumber: string = '';
  public pairingCode: string = '';
  public customCode: string = DEFAULT_CUSTOM_CODE;
  public user: any = null;
  public logs: LogEntry[] = [];
  public sock: any = null;
  public config: CommandsConfig = DEFAULT_CONFIG;

  constructor(tenantId: string = 't_wanzt') {
    this.tenantId = tenantId;
    this.sessionDir = path.resolve(process.cwd(), 'auth_info_baileys', `tenant_${tenantId}`);
    if (!fs.existsSync(this.sessionDir)) {
      fs.mkdirSync(this.sessionDir, { recursive: true });
    }
    this.loadConfig();
  }

  loadConfig() {
    this.config = runWithTenant(this.tenantId, () => loadCommandsConfig());
  }

  saveConfig(newConfig: Partial<CommandsConfig>) {
    this.config = runWithTenant(this.tenantId, () => saveCommandsConfig(this.config, newConfig));
  }

  addLog(type: 'info' | 'success' | 'warning' | 'error' | 'code', message: string) {
    const entry: LogEntry = {
      id: Date.now() + Math.random().toString(36).substring(2, 6),
      time: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      type,
      message,
    };
    this.logs.push(entry);
    if (this.logs.length > 80) this.logs.shift();
  }

  resolveTargetJid(remoteJid: string): string {
    return remoteJid;
  }

  getStatus() {
    const credsPath = path.join(this.sessionDir, 'creds.json');
    const hasSession = fs.existsSync(credsPath);
    let isRegistered = false;
    if (hasSession) {
      try {
        const creds = JSON.parse(fs.readFileSync(credsPath, 'utf-8'));
        isRegistered = Boolean(creds.registered);
      } catch {}
    }
    return {
      status: this.status,
      phoneNumber: this.phoneNumber,
      pairingCode: this.pairingCode,
      customCode: this.customCode,
      user: this.user,
      logs: this.logs,
      registered: isRegistered,
      tenantId: this.tenantId,
      hasSession,
      config: this.config,
    };
  }

  // --- Facade methods for backward compatibility ---
  async generateDaftarProdukText(): Promise<string> {
    return generateDaftarProdukText(this.config);
  }

  async getProductVariants(productName: string): Promise<ProductVariantItem[]> {
    return getProductVariants(productName, this.config);
  }

  async sendMenuInteractiveMessage(remoteJid: string, quotedMsg?: any): Promise<void> {
    return sendMenuInteractiveMessage(this.sock, this.config, remoteJid, quotedMsg, (t, m) => this.addLog(t, m));
  }

  async sendListInteractiveMessage(remoteJid: string, quotedMsg?: any): Promise<void> {
    return sendListInteractiveMessage(this.sock, this.config, remoteJid, quotedMsg, (t, m) => this.addLog(t, m));
  }

  async sendProductVariantsCarousel(remoteJid: string, productName: string, quotedMsg?: any): Promise<void> {
    return sendProductVariantsCarousel(
      this.sock,
      this.config,
      remoteJid,
      productName,
      quotedMsg,
      (t, m) => this.addLog(t, m),
      (jid) => this.resolveTargetJid(jid)
    );
  }

  async sendAdminContact(remoteJid: string, quotedMsg?: any): Promise<void> {
    return sendAdminContactMessage(this.sock, this.config, remoteJid, quotedMsg, (t, m) => this.addLog(t, m));
  }

  async sendTextMessage(toPhone: string, text: string): Promise<boolean> {
    if (!this.sock || this.status !== 'connected') {
      throw new Error('Bot WhatsApp sedang offline atau tidak terhubung');
    }
    if (!text || !text.trim()) {
      throw new Error('Isi pesan teks tidak boleh kosong');
    }

    let clean = toPhone.replace(/\D/g, '');
    if (clean.startsWith('0')) {
      clean = '62' + clean.slice(1);
    } else if (clean.startsWith('8')) {
      clean = '62' + clean;
    }
    if (!clean.includes('@s.whatsapp.net')) {
      clean = `${clean}@s.whatsapp.net`;
    }

    await this.sock.sendMessage(clean, { text: text.trim() });
    this.addLog('info', `Pesan resmi Master Admin berhasil dikirim ke nomor owner: ${toPhone}`);
    return true;
  }

  // --- Socket Lifecycle ---
  async start(rawPhoneNumber: string, customCode: string = DEFAULT_CUSTOM_CODE, isReconnect: boolean = false) {
    if (!rawPhoneNumber) {
      throw new Error('Nomor WhatsApp target wajib diisi');
    }
    const cleanPhone = rawPhoneNumber.replace(/[^0-9]/g, '');
    if (cleanPhone.length < 9) {
      throw new Error('Nomor telepon tidak valid (minimal 9 digit)');
    }

    const codeToUse = (customCode || '').toUpperCase().trim();
    if (!codeToUse) {
      throw new Error('Form pairing code belum diisi! Harap isi kolom kode pairing untuk melakukan koneksi.');
    }
    if (/[^A-Z0-9]/.test(codeToUse)) {
      throw new Error('Custom pairing code tidak sesuai: dilarang menggunakan simbol atau spasi (hanya angka dan huruf saja).');
    }
    if (codeToUse.length !== 8) {
      throw new Error(`Custom pairing code tidak sesuai: wajib tepat 8 karakter (saat ini ${codeToUse.length} karakter).`);
    }

    // Validasi mutlak: tolak koneksi bot jika akun tenant berstatus suspended atau expired secara real-time
    let guardError: Error | null = null;
    try {
      const { TenantStatusService } = await import('../admin-backend/services/tenantStatusService.ts');
      const effectiveStatus = await TenantStatusService.enforceRealtimeTenantExpiry(this.tenantId);
      if (effectiveStatus !== 'active') {
        this.status = 'closed';
        this.addLog('error', `⛔ Permintaan koneksi ditolak: Akun tenant "${this.tenantId}" berstatus ${effectiveStatus}.`);
        guardError = new Error(
          effectiveStatus === 'suspended'
            ? 'Akun toko sedang ditangguhkan (suspended). Seluruh koneksi bot WhatsApp diblokir.'
            : 'Masa sewa bot toko telah kedaluwarsa (expired). Silakan perpanjang masa aktif terlebih dahulu.'
        );
      }
    } catch (checkErr: any) {
      console.warn(`[BotManager] Peringatan pengecekan status tenant ${this.tenantId}:`, checkErr?.message || checkErr);
    }
    if (guardError) {
      throw guardError;
    }

    this.phoneNumber = cleanPhone;
    this.customCode = codeToUse;
    this.status = 'connecting';

    if (this.sock) {
      try {
        await this.sock.end(undefined);
      } catch {}
      this.sock = null;
    }

    // Bersihkan sesi gantung jika belum terdaftar agar tidak terjadi error 401
    const credsPath = path.join(this.sessionDir, 'creds.json');
    if (!isReconnect && fs.existsSync(credsPath)) {
      try {
        const existingCreds = JSON.parse(fs.readFileSync(credsPath, 'utf-8'));
        if (!existingCreds.registered) {
          fs.rmSync(this.sessionDir, { recursive: true, force: true });
          this.addLog('info', 'Membersihkan sesi penautan sebelumnya untuk mencegah konflik kredensial.');
        }
      } catch {
        fs.rmSync(this.sessionDir, { recursive: true, force: true });
      }
    }

    if (!fs.existsSync(this.sessionDir)) {
      fs.mkdirSync(this.sessionDir, { recursive: true });
    }

    this.addLog('info', `Memulai koneksi bot WhatsApp (@itsliaaa/baileys) untuk nomor ${cleanPhone} (Tenant: ${this.tenantId})...`);

    try {
      const { state, saveCreds } = await useMultiFileAuthState(this.sessionDir);
      let waVersion: [number, number, number] = [2, 3000, 1043857760];
      try {
        const res = await fetch('https://raw.githubusercontent.com/WhiskeySockets/Baileys/master/src/Defaults/index.ts', {
          headers: { 'User-Agent': 'Mozilla/5.0' },
          signal: AbortSignal.timeout(4000),
        });
        if (res.ok) {
          const text = await res.text();
          const match = text.match(/const version = \[(\d+),\s*(\d+),\s*(\d+)\]/);
          if (match) {
            waVersion = [parseInt(match[1]), parseInt(match[2]), parseInt(match[3])];
          }
        }
      } catch {}

      this.sock = makeWASocket({
        version: waVersion,
        auth: {
          creds: state.creds,
          keys: makeCacheableSignalKeyStore(state.keys, pino({ level: 'silent' }), undefined),
        },
        logger: pino({ level: 'silent' }),
        browser: Browsers.macOS('Chrome'),
        printQRInTerminal: false,
        markOnlineOnConnect: true,
        generateHighQualityLinkPreview: true,
        syncFullHistory: false,
        connectTimeoutMs: 30_000,
        defaultQueryTimeoutMs: 60_000,
        retryRequestDelayMs: 250,
        maxMsgRetryCount: 5,
        enableRecentMessageCache: true,
        enableAutoSessionRecreation: true,
        msgRetryCounterCache: msgRetryCounterCache as any,
        getMessage: async (key: any) => {
          if (key?.id) {
            const cached = messageCache.get(key.id);
            if (cached) return cached as any;
          }
          return undefined;
        },
      });

      (this.sock as any).tenantId = this.tenantId;

      // Lacak ID pesan yang dikirim bot secara otomatis agar tidak memicu respon berulang (loop)
      const originalSendMessage = this.sock.sendMessage.bind(this.sock);
      this.sock.sendMessage = async (...args: any[]) => {
        const result = await originalSendMessage(...args);
        if (result?.key?.id) {
          markMessageAsBotSent(result.key.id);
          if (result.message) {
            messageCache.set(result.key.id, result.message);
          }
        }
        return result;
      };

      const originalRelayMessage = this.sock.relayMessage?.bind(this.sock);
      if (originalRelayMessage) {
        this.sock.relayMessage = async (jid: string, message: any, options: any) => {
          if (options?.messageId) {
            markMessageAsBotSent(options.messageId);
            if (message) {
              messageCache.set(options.messageId, message);
            }
          }
          return originalRelayMessage(jid, message, options);
        };
      }

      this.sock.ev.on('creds.update', saveCreds);


      // Handler Siklus Koneksi
      this.sock.ev.on('connection.update', async (update: any) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr && !this.sock.authState.creds.registered) {
          this.status = 'waiting_code';
        }

        if (connection === 'open') {
          this.status = 'connected';
          this.user = this.sock.user;
          this.pairingCode = '';
          this.addLog('success', `🎉 Bot BERHASIL TERHUBUNG ke WhatsApp! Akun: ${this.user?.name || this.phoneNumber}`);
        } else if (connection === 'close') {
          const statusCode = (lastDisconnect?.error as any)?.output?.statusCode;
          const isRestartRequired = statusCode === DisconnectReason.restartRequired; // 515
          const isLoggedOut = statusCode === DisconnectReason.loggedOut;

          if (isRestartRequired) {
            this.addLog('info', 'Status restartRequired (515) terdeteksi pasca-pairing, menghubungkan kembali otomatis...');
            setTimeout(async () => {
              await this.start(this.phoneNumber, this.customCode, true).catch((e) => {
                this.addLog('error', `Gagal auto-reconnect: ${e?.message || e}`);
              });
            }, 1500);
            return;
          }

          if (isLoggedOut) {
            this.status = 'closed';
            this.addLog('error', 'Sesi telah dikeluarkan (logged out) oleh WhatsApp. Sesi otomatis dibersihkan.');
            if (fs.existsSync(this.sessionDir)) {
              fs.rmSync(this.sessionDir, { recursive: true, force: true });
            }
          } else {
            this.status = 'closed';
            this.addLog('warning', `Koneksi tertutup. Kode status: ${statusCode || 'unknown'}`);
          }
        }
      });

      // Handler Pesan Masuk didelegasikan ke messageDispatcher dalam konteks tenant
      this.sock.ev.on('messages.upsert', async ({ messages, type }: any) => {
        try {
          const { TenantStatusService } = await import('../admin-backend/services/tenantStatusService.ts');
          const effectiveStatus = await TenantStatusService.enforceRealtimeTenantExpiry(this.tenantId);
          if (effectiveStatus !== 'active') {
            return;
          }
        } catch {}

        for (const m of messages || []) {
          if (m?.key?.id && m?.message) {
            messageCache.set(m.key.id, m.message);
          }
        }
        await runWithTenant(this.tenantId, async () => {
          await dispatchIncomingMessages(this.sock, this.config, messages, type, {
            addLog: (t, m) => this.addLog(t, m),
            resolveTargetJid: (jid) => this.resolveTargetJid(jid),
          });
        });
      });

      // Jika belum terdaftar, panggil requestPairingCode dengan kode kustom
      if (!this.sock.authState.creds.registered) {
        this.status = 'waiting_code';
        this.addLog('info', 'Menunggu soket siap mengirim permintaan pairing code...');
        setTimeout(async () => {
          try {
            this.addLog('info', `Mengirim requestPairingCode("${cleanPhone}", "${codeToUse}")...`);
            const code = await this.sock.requestPairingCode(cleanPhone, codeToUse);
            this.pairingCode = code;
            this.status = 'code_ready';
            this.addLog('code', `🔑 KODE PAIRING SIAP: ${code}`);
            this.addLog('info', 'Silakan buka WhatsApp di HP > Perangkat Tertaut > masukkan kode di atas.');
          } catch (err: any) {
            this.status = 'error';
            this.addLog('error', `Gagal mendapatkan kode pairing: ${err?.message || err}`);
          }
        }, 3000);
      } else {
        this.addLog('success', 'Sesi kredensial terdaftar ditemukan, menghubungkan otomatis...');
      }

      return { success: true, status: this.status };
    } catch (err: any) {
      this.status = 'error';
      this.addLog('error', `Inisialisasi bot gagal: ${err?.message || err}`);
      throw err;
    }
  }

  async stop() {
    if (this.sock) {
      try {
        await this.sock.end(undefined);
      } catch {}
      this.sock = null;
    }
    this.status = 'idle';
    this.pairingCode = '';
    this.addLog('info', 'Koneksi WhatsApp bot dimatikan oleh admin.');
  }

  async forceDisconnect(options?: { clearSession?: boolean; reason?: 'suspended' | 'expired' }) {
    const clearSession = options?.clearSession ?? true;
    const reason = options?.reason ?? 'suspended';

    if (this.sock) {
      try {
        if (this.sock.ev) {
          this.sock.ev.removeAllListeners('connection.update');
          this.sock.ev.removeAllListeners('messages.upsert');
          this.sock.ev.removeAllListeners('creds.update');
        }
        await this.sock.end(undefined);
      } catch {}
      this.sock = null;
    }

    // Jika suspended, bersihkan folder sesi kredensial agar WhatsApp terlepas total.
    // Jika expired, simpan folder sesi agar tenant bisa langsung menyambungkan kembali setelah perpanjangan.
    if (clearSession) {
      try {
        if (fs.existsSync(this.sessionDir)) {
          fs.rmSync(this.sessionDir, { recursive: true, force: true });
        }
      } catch (cleanErr) {
        console.error(`Gagal membersihkan folder sesi tenant ${this.tenantId}:`, cleanErr);
      }
    }

    this.status = 'closed';
    this.pairingCode = '';
    if (reason === 'expired') {
      this.addLog(
        'warning',
        '⛔ Koneksi WhatsApp bot diputus paksa karena masa sewa toko telah kedaluwarsa (expired). Sesi penautan tetap disimpan hingga masa aktif diperpanjang.'
      );
    } else {
      this.addLog(
        'warning',
        '⛔ Koneksi WhatsApp bot diputus paksa dan sesi dibersihkan karena akun toko telah ditangguhkan (suspended) oleh Master Admin.'
      );
    }
  }

  async reset() {
    await this.stop();
    if (fs.existsSync(this.sessionDir)) {
      fs.rmSync(this.sessionDir, { recursive: true, force: true });
    }
    this.phoneNumber = '';
    this.pairingCode = '';
    this.customCode = DEFAULT_CUSTOM_CODE;
    this.user = null;
    this.addLog('warning', 'Folder sesi telah dibersihkan total. Siap untuk penautan baru.');
  }

  async getParticipatingGroups(): Promise<{ connected: boolean; groups: GroupItem[]; groupOnly: boolean; message?: string }> {
    const groupOnly = this.getGroupOnlySetting();
    if (!this.sock || this.status !== 'connected') {
      return {
        connected: false,
        groups: [],
        groupOnly,
        message: 'Bot belum terhubung ke WhatsApp. Silakan hubungkan bot terlebih dahulu di tab status.',
      };
    }

    try {
      this.addLog('info', 'Mengambil seluruh grup WhatsApp yang diikuti oleh nomor bot...');
      const rawGroups = await this.sock.groupFetchAllParticipating();
      const toggleMap = runWithTenant(this.tenantId, () => loadGroupsConfig());

      const groups: GroupItem[] = Object.values(rawGroups).map((g: any) => {
        const id = g.id || '';
        const memberCount = Array.isArray(g.participants) ? g.participants.length : (g.size || 0);
        return {
          id,
          subject: g.subject || 'Tanpa Nama Grup',
          memberCount,
          creation: g.creation,
          owner: g.owner,
          desc: g.desc ? (typeof g.desc === 'string' ? g.desc : g.desc.toString('utf-8')) : undefined,
          enabled: toggleMap[id] ?? false,
        };
      });

      // Urutkan grup berdasarkan nama secara alfabetis
      groups.sort((a, b) => a.subject.localeCompare(b.subject, 'id', { sensitivity: 'base' }));

      this.addLog('success', `Berhasil memuat ${groups.length} grup WhatsApp.`);
      return {
        connected: true,
        groups,
        groupOnly,
      };
    } catch (err: any) {
      this.addLog('error', `Gagal mengambil daftar grup dari WhatsApp: ${err?.message || err}`);
      return {
        connected: true,
        groups: [],
        groupOnly,
        message: `Gagal memuat grup: ${err?.message || err}`,
      };
    }
  }

  setGroupToggle(groupId: string, enabled: boolean) {
    return runWithTenant(this.tenantId, () => setGroupToggle(groupId, enabled));
  }

  getGroupOnlySetting(): boolean {
    return runWithTenant(this.tenantId, () => loadGroupOnlySetting());
  }

  setGroupOnlySetting(enabled: boolean): boolean {
    return runWithTenant(this.tenantId, () => saveGroupOnlySetting(enabled));
  }
}

// Pool bot instances per-tenant
const botInstances = new Map<string, BotManager>();

export function getBotManager(tenantId: string = 't_wanzt'): BotManager {
  const cleanId = (tenantId || 't_wanzt').trim();
  if (!botInstances.has(cleanId)) {
    botInstances.set(cleanId, new BotManager(cleanId));
  }
  return botInstances.get(cleanId)!;
}

// Dynamic Proxy: seluruh akses ke botManager (getStatus, start, stop, dsb.)
// otomatis dialihkan ke botManager milik tenant aktif
export const botManager: BotManager = new Proxy({} as BotManager, {
  get(_target, prop) {
    const tenantId = getActiveTenantId();
    const instance = getBotManager(tenantId);
    const value = (instance as any)[prop];
    if (typeof value === 'function') {
      return value.bind(instance);
    }
    return value;
  },
  set(_target, prop, value) {
    const tenantId = getActiveTenantId();
    const instance = getBotManager(tenantId);
    (instance as any)[prop] = value;
    return true;
  },
});
