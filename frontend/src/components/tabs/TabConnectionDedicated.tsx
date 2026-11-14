import React, { FormEvent, useState, useEffect } from 'react';
import {
  Smartphone,
  CheckCircle2,
  AlertCircle,
  Play,
  Clock,
  Square,
  RotateCcw,
  KeyRound,
  Check,
  Copy,
  ShieldCheck,
  X,
  Wifi,
  Radio,
  Terminal,
  Send,
  Eye,
  EyeOff,
  ExternalLink,
  Info,
  Save,
  RefreshCw,
} from 'lucide-react';
import { BotStatusResponse } from '../../types/dashboard.types';
import { LiveTerminal } from '../terminal/LiveTerminal';

interface TabConnectionDedicatedProps {
  botData: BotStatusResponse;
  phone: string;
  setPhone: (val: string) => void;
  customCode: string;
  setCustomCode: (val: string) => void;
  loading: boolean;
  copied: boolean;
  onStartPairing: (e: FormEvent) => void;
  onStop: () => void;
  onReset: () => void;
  onCopyCode: () => void;
  showToast: (msg: string) => void;
}

export const TabConnectionDedicated: React.FC<TabConnectionDedicatedProps> = ({
  botData,
  phone,
  setPhone,
  customCode,
  setCustomCode,
  loading,
  copied,
  onStartPairing,
  onStop,
  onReset,
  onCopyCode,
  showToast,
}) => {
  // State Konfigurasi Notifikasi Telegram Bot
  const [telegramConfig, setTelegramConfig] = useState({
    botToken: '',
    chatId: '',
    notifEnabled: false,
    adminDisabled: false,
    isConfigured: false,
  });
  const [isTestingTelegram, setIsTestingTelegram] = useState(false);
  const [showBotToken, setShowBotToken] = useState(false);
  const [isSavingTelegram, setIsSavingTelegram] = useState(false);

  useEffect(() => {
    fetch('/api/bot/telegram/config')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.config) {
          setTelegramConfig(data.config);
        }
      })
      .catch(() => {});
  }, []);

  const handleSaveTelegram = async () => {
    setIsSavingTelegram(true);
    try {
      const res = await fetch('/api/bot/telegram/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          botToken: telegramConfig.botToken,
          chatId: telegramConfig.chatId,
          notifEnabled: telegramConfig.notifEnabled,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setTelegramConfig(data.config);
        showToast('Pengaturan notifikasi Telegram berhasil disimpan!');
      } else {
        showToast('Gagal menyimpan Telegram: ' + (data.error || 'Server error'));
      }
    } catch (err: any) {
      showToast('Error koneksi: ' + err.message);
    } finally {
      setIsSavingTelegram(false);
    }
  };

  const handleTestTelegram = async () => {
    if (!telegramConfig.botToken || !telegramConfig.chatId) {
      showToast('Isi Bot Token dan Chat ID Telegram terlebih dahulu!');
      return;
    }
    setIsTestingTelegram(true);
    try {
      const res = await fetch('/api/bot/telegram/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          botToken: telegramConfig.botToken,
          chatId: telegramConfig.chatId,
        }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(data.message || 'Pesan tes berhasil terkirim ke Telegram!');
      } else {
        showToast('Gagal tes Telegram: ' + (data.error || 'Periksa token & chat ID'));
      }
    } catch (err: any) {
      showToast('Error koneksi: ' + err.message);
    } finally {
      setIsTestingTelegram(false);
    }
  };

  const trimmedCode = customCode.trim().toUpperCase();
  const isEmpty = trimmedCode.length === 0;
  const hasSymbol = /[^A-Z0-9]/.test(trimmedCode);
  const isExact8Chars = trimmedCode.length === 8;
  const isValidCode = !isEmpty && !hasSymbol && isExact8Chars;

  // Syarat Kriteria Real-Time (Requirements Checklist)
  const reqLength = isExact8Chars;
  const reqNoSymbol = !isEmpty && !hasSymbol;
  const reqAlphanumeric = !isEmpty && /^[A-Z0-9]+$/.test(trimmedCode);

  const getStatusBadge = () => {
    switch (botData.status) {
      case 'connected':
        return {
          title: 'Bot WhatsApp Terhubung',
          desc: 'Bot sedang aktif melayani pesanan dan auto-reply WhatsApp.',
          color: 'bg-emerald-50 text-emerald-700 border-emerald-200',
          dot: 'bg-emerald-500',
        };
      case 'waiting_code':
      case 'code_ready':
        return {
          title: 'Menunggu Input Pairing Code',
          desc: 'Kode pairing siap dimasukkan ke WhatsApp ponsel Anda.',
          color: 'bg-sky-50 text-[#0084D1] border-sky-200',
          dot: 'bg-[#0084D1]',
        };
      case 'connecting':
        return {
          title: 'Sedang Menghubungkan',
          desc: 'Membuat socket session ke server WhatsApp...',
          color: 'bg-amber-50 text-amber-700 border-amber-200',
          dot: 'bg-amber-500',
        };
      case 'error':
        return {
          title: 'Koneksi Error',
          desc: 'Terjadi kendala pada socket sesi. Coba reset sesi.',
          color: 'bg-rose-50 text-rose-700 border-rose-200',
          dot: 'bg-rose-500',
        };
      default:
        return {
          title: 'Bot Belum Terhubung',
          desc: 'Masukkan nomor WhatsApp dan pairing code untuk menghubungkan bot.',
          color: 'bg-slate-50 text-slate-700 border-slate-200',
          dot: 'bg-slate-400',
        };
    }
  };

  const statusInfo = getStatusBadge();
  const isSuspended = botData.accountStatus === 'suspended';
  const isExpired = botData.accountStatus === 'expired';
  const isAccountBlocked = isSuspended || isExpired;

  return (
    <div className="space-y-6">
      {/* Peringatan Akun Ditangguhkan (Suspended) */}
      {isSuspended && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-300 text-rose-800 shadow-xs flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="text-xs font-bold uppercase tracking-wider text-rose-900">
              Akses Bot WhatsApp Diblokir
            </h4>
            <p className="text-xs text-rose-700 leading-relaxed">
              Akun Anda saat ini sedang ditangguhkan (suspended) oleh Master Admin. Seluruh koneksi bot WhatsApp telah diputus dan pembuatan request pairing code baru diblokir.
            </p>
          </div>
        </div>
      )}

      {/* Peringatan Masa Sewa Habis (Expired) */}
      {isExpired && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-300 text-amber-900 shadow-xs flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="text-xs font-bold uppercase tracking-wider text-amber-950">
              Masa Sewa Bot Kedaluwarsa (Expired)
            </h4>
            <p className="text-xs text-amber-800 leading-relaxed">
              Koneksi bot WhatsApp Anda telah diputus karena masa aktif berakhir. Sesi penautan Anda tetap tersimpan. Silakan perpanjang masa aktif menggunakan kode token di tab Management Bot agar dapat terhubung kembali.
            </p>
          </div>
        </div>
      )}

      {/* 1. STATUS KONEKSI WHATSAPP (Header Status Card) */}
      <div className={`p-4 sm:p-5 rounded-2xl border transition-all ${statusInfo.color} shadow-2xs`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/80 border border-current/20 flex items-center justify-center shrink-0">
              <Radio className="w-5 h-5 animate-pulse text-[#0084D1]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${statusInfo.dot}`} />
                <h3 className="text-sm font-bold tracking-tight">{statusInfo.title}</h3>
                {botData.hasSession && (
                  <span className="text-[10px] font-semibold bg-emerald-100/80 text-emerald-800 px-2 py-0.5 rounded-full border border-emerald-300">
                    Sesi Tersimpan
                  </span>
                )}
              </div>
              <p className="text-xs opacity-90 mt-0.5">{statusInfo.desc}</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 justify-end sm:self-auto">
            {botData.phoneNumber && (
              <span className="text-xs font-mono font-bold px-2.5 sm:px-3 py-1.5 rounded-lg bg-white border border-current/20 shadow-2xs">
                +{botData.phoneNumber}
              </span>
            )}
            <button
              type="button"
              onClick={onReset}
              disabled={loading || isAccountBlocked}
              className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all flex items-center gap-1.5 shadow-2xs ${
                isAccountBlocked
                  ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed select-none'
                  : 'bg-white hover:bg-slate-50 border-slate-300 text-slate-700 cursor-pointer active:scale-95'
              }`}
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Sesi</span>
            </button>
            {botData.status === 'connected' && (
              <button
                type="button"
                onClick={onStop}
                disabled={loading}
                className="px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs active:scale-95"
              >
                <Square className="w-3.5 h-3.5 fill-current" />
                <span>Putuskan</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 2. FORM NOMOR WHATSAPP & PAIRING CODE */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Kolom Kiri: Form Input Nomor & Pairing Code (Col 7) */}
        <div className="lg:col-span-7 bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-6 shadow-xs space-y-4 sm:space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-[#0084D1]" />
              <h3 className="text-sm font-bold text-slate-900 tracking-tight">
                Hubungkan WhatsApp Bot
              </h3>
            </div>
            <span className="text-xs text-slate-400">Metode Pairing Code</span>
          </div>

          <form onSubmit={onStartPairing} className="space-y-4">
            {/* 1. Form Nomor WhatsApp */}
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1.5">
                Nomor WhatsApp Bot
              </label>
              <div className="relative flex rounded-xl border border-slate-300 focus-within:border-[#0084D1] focus-within:ring-2 focus-within:ring-[#0084D1]/20 transition-all bg-white overflow-hidden shadow-2xs">
                <div className="bg-slate-50 px-3.5 py-2.5 flex items-center gap-1.5 border-r border-slate-200 text-slate-700 text-xs font-mono font-semibold select-none">
                  <span>🇮🇩</span>
                  <span>+62</span>
                </div>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="857xxxxxxxx"
                  disabled={loading || botData.status === 'connected'}
                  className="w-full px-3.5 py-2.5 text-sm font-mono text-slate-900 placeholder-slate-400 focus:outline-none"
                />
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Masukkan nomor WhatsApp bot tanpa angka 0 di depan (contoh: 81234567890).
              </p>
            </div>

            {/* 2. Pairing Code Form & Requirements */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-slate-800">
                  Custom Pairing Code (8 Karakter)
                </label>
                <span
                  className={`text-[11px] font-mono font-semibold px-2 py-0.5 rounded border transition-colors ${
                    isEmpty
                      ? 'bg-amber-50 text-amber-700 border-amber-200'
                      : hasSymbol
                      ? 'bg-rose-100 text-rose-700 border-rose-300'
                      : isExact8Chars
                      ? 'bg-emerald-100 text-emerald-700 border-emerald-300'
                      : 'bg-sky-50 text-[#0084D1] border-sky-200'
                  }`}
                >
                  {hasSymbol ? 'Simbol Terdeteksi' : `${trimmedCode.length}/8 Karakter`}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  maxLength={8}
                  value={customCode}
                  onChange={(e) => setCustomCode(e.target.value.toUpperCase())}
                  placeholder="Contoh: 12AB34CD"
                  disabled={loading || botData.status === 'connected'}
                  className={`w-full rounded-xl px-3.5 py-2.5 text-sm font-mono font-bold tracking-widest focus:outline-none focus:ring-2 uppercase transition shadow-2xs border ${
                    hasSymbol
                      ? 'bg-rose-50/30 border-rose-400 text-rose-900 focus:border-rose-600 focus:ring-rose-500/20'
                      : isExact8Chars
                      ? 'bg-emerald-50/20 border-emerald-400 text-emerald-900 focus:border-emerald-600 focus:ring-emerald-500/20'
                      : isEmpty
                      ? 'bg-slate-50 border-slate-300 text-slate-800 focus:border-[#0084D1] focus:ring-[#0084D1]/20'
                      : 'bg-slate-50 border-slate-300 text-sky-800 focus:border-[#0084D1] focus:ring-[#0084D1]/20'
                  }`}
                />
                <span
                  className={`text-xs px-3 py-2.5 rounded-xl border font-mono font-bold shrink-0 ${
                    isExact8Chars && !hasSymbol
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
                      : 'bg-slate-100 border-slate-200 text-slate-600'
                  }`}
                >
                  8 Chars
                </span>
              </div>

              {/* Checklist Persyaratan Real-Time */}
              <div className="mt-2.5 p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5">
                <div className="grid grid-cols-4 gap-1.5">
                  {[1, 2, 3, 4].map((seg) => {
                    let segColor = 'bg-slate-200';
                    if (hasSymbol) {
                      if (seg === 1) segColor = 'bg-rose-500';
                    } else if (isValidCode) {
                      segColor = 'bg-emerald-500';
                    } else if (trimmedCode.length >= 7 && seg <= 3) {
                      segColor = 'bg-[#0084D1]';
                    } else if (trimmedCode.length >= 4 && seg <= 2) {
                      segColor = 'bg-amber-400';
                    } else if (trimmedCode.length >= 1 && seg === 1) {
                      segColor = 'bg-amber-400';
                    }
                    return (
                      <div
                        key={seg}
                        className={`h-1.5 rounded-full transition-all duration-300 ${segColor}`}
                      />
                    );
                  })}
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-[11px] font-bold text-slate-700">
                    Persyaratan Pairing Code:
                  </span>
                  <span
                    className={`text-[11px] font-semibold transition-colors ${
                      isValidCode
                        ? 'text-emerald-600 font-bold'
                        : hasSymbol
                        ? 'text-rose-600 font-bold'
                        : isEmpty
                        ? 'text-slate-400'
                        : 'text-amber-600'
                    }`}
                  >
                    {isValidCode
                      ? 'Siap Digunakan ✓'
                      : hasSymbol
                      ? 'Format Tidak Sesuai'
                      : isEmpty
                      ? 'Wajib Diisi'
                      : `Panjang Belum Cukup (${trimmedCode.length}/8)`}
                  </span>
                </div>

                <div className="space-y-1.5 pt-1.5 border-t border-slate-200/70 text-xs">
                  <div
                    className={`flex items-center gap-2 transition-colors ${
                      reqLength ? 'text-emerald-700 font-medium' : 'text-slate-500'
                    }`}
                  >
                    {reqLength ? (
                      <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 stroke-[2.5]" />
                    ) : (
                      <span className="w-3.5 h-3.5 flex items-center justify-center text-slate-400 font-bold shrink-0 text-sm leading-none">
                        •
                      </span>
                    )}
                    <span>Wajib 8 karakter</span>
                    {!reqLength && !isEmpty && (
                      <span className="text-[10px] font-mono text-slate-400">
                        ({trimmedCode.length}/8 karakter)
                      </span>
                    )}
                  </div>

                  <div
                    className={`flex items-center gap-2 transition-colors ${
                      hasSymbol
                        ? 'text-rose-700 font-medium'
                        : reqNoSymbol
                        ? 'text-emerald-700 font-medium'
                        : 'text-slate-500'
                    }`}
                  >
                    {hasSymbol ? (
                      <X className="w-3.5 h-3.5 text-rose-600 shrink-0 stroke-[2.5]" />
                    ) : reqNoSymbol ? (
                      <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 stroke-[2.5]" />
                    ) : (
                      <span className="w-3.5 h-3.5 flex items-center justify-center text-slate-400 font-bold shrink-0 text-sm leading-none">
                        •
                      </span>
                    )}
                    <span>
                      {hasSymbol
                        ? 'Dilarang menyertakan simbol atau spasi'
                        : 'Tidak menyertakan simbol'}
                    </span>
                  </div>

                  <div
                    className={`flex items-center gap-2 transition-colors ${
                      reqAlphanumeric ? 'text-emerald-700 font-medium' : 'text-slate-500'
                    }`}
                  >
                    {reqAlphanumeric ? (
                      <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 stroke-[2.5]" />
                    ) : (
                      <span className="w-3.5 h-3.5 flex items-center justify-center text-slate-400 font-bold shrink-0 text-sm leading-none">
                        •
                      </span>
                    )}
                    <span>Hanya angka dan huruf (A-Z, 0-9)</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Tombol Minta Kode Pairing */}
            <button
              type="submit"
              disabled={
                loading ||
                botData.status === 'connecting' ||
                botData.status === 'connected' ||
                !isValidCode ||
                isAccountBlocked
              }
              className={`w-full py-2.5 px-3 sm:px-4 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-2 ${
                isSuspended
                  ? 'bg-rose-100 text-rose-700 border border-rose-300 cursor-not-allowed select-none shadow-none'
                  : isExpired
                  ? 'bg-amber-100 text-amber-800 border border-amber-300 cursor-not-allowed select-none shadow-none'
                  : botData.status === 'connected'
                  ? 'bg-emerald-600 text-white cursor-default opacity-90 shadow-xs'
                  : loading || botData.status === 'connecting'
                  ? 'bg-[#0084D1] text-white opacity-70 cursor-wait shadow-xs'
                  : !isValidCode
                  ? 'bg-slate-200 text-slate-400 border border-slate-300 cursor-not-allowed select-none shadow-none'
                  : 'bg-[#0084D1] hover:bg-[#0073B7] text-white cursor-pointer active:scale-[0.98] shadow-xs'
              }`}
            >
              {loading || botData.status === 'connecting' ? (
                <Clock className="w-4 h-4 animate-spin text-white" />
              ) : (
                <Play
                  className={`w-4 h-4 fill-current ${
                    isSuspended
                      ? 'text-rose-600'
                      : isExpired
                      ? 'text-amber-600'
                      : !isValidCode && botData.status !== 'connected'
                      ? 'text-slate-400'
                      : 'text-white'
                  }`}
                />
              )}
              <span>
                {isSuspended
                  ? 'Akun Ditangguhkan (Koneksi Diblokir)'
                  : isExpired
                  ? 'Masa Sewa Habis (Koneksi Diblokir)'
                  : botData.status === 'connected'
                  ? 'WhatsApp Bot Telah Terhubung'
                  : loading || botData.status === 'connecting'
                  ? 'Menghubungkan...'
                  : isEmpty
                  ? 'Minta Kode Pairing (Wajib Isi Kode)'
                  : hasSymbol
                  ? 'Minta Kode Pairing (Dilarang Simbol)'
                  : !isExact8Chars
                  ? `Minta Kode Pairing (${trimmedCode.length}/8 Karakter)`
                  : `Minta Kode Pairing (${trimmedCode})`}
              </span>
            </button>
          </form>
        </div>

        {/* Kolom Kanan: Tampilan Pairing Code & Panduan HP (Col 5) */}
        <div className="lg:col-span-5 space-y-5">
          {/* Card Pairing Code Display */}
          <div className="bg-white border-2 border-sky-200 rounded-2xl p-4 sm:p-5 shadow-sm space-y-3.5 sm:space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-[#0084D1]" />
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Kode Pairing Bot
                </h4>
              </div>
              <span className="text-[11px] font-mono text-slate-500">
                {botData.pairingCode ? 'Tersedia' : 'Menunggu Request'}
              </span>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 sm:p-5 text-center space-y-2.5 sm:space-y-3">
              <span className="text-[11px] font-medium text-slate-500 block">
                Ketik kode ini di aplikasi WhatsApp ponsel Anda:
              </span>
              <div className="text-3xl sm:text-4xl font-extrabold font-mono tracking-widest text-slate-900 select-all py-1">
                {botData.pairingCode || customCode || '--------'}
              </div>
              <button
                type="button"
                onClick={onCopyCode}
                disabled={!botData.pairingCode && !customCode}
                className="inline-flex items-center gap-2 px-3.5 sm:px-4 py-2 rounded-xl bg-[#0084D1] hover:bg-[#0073B7] active:scale-95 text-white text-xs font-semibold transition-all shadow-xs cursor-pointer disabled:opacity-40"
              >
                {copied ? <Check className="w-4 h-4 stroke-[3]" /> : <Copy className="w-4 h-4" />}
                <span>{copied ? 'Tersalin ke Clipboard!' : 'Salin Kode Pairing'}</span>
              </button>
            </div>

            {/* Panduan Cepat di Ponsel */}
            <div className="space-y-2 pt-2 border-t border-slate-100 text-xs text-slate-600">
              <div className="font-bold text-slate-800 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>Panduan Input di WhatsApp:</span>
              </div>
              <ol className="space-y-1.5 list-decimal list-inside leading-relaxed text-slate-600 text-[11px]">
                <li>Buka aplikasi WhatsApp di smartphone Anda.</li>
                <li>
                  Buka menu <strong className="text-slate-800 font-semibold">Perangkat Tertaut</strong>.
                </li>
                <li>
                  Ketuk <strong className="text-slate-800 font-semibold">Tautkan Perangkat</strong>.
                </li>
                <li>
                  Pilih <strong className="text-[#0084D1] font-semibold">&quot;Tautkan dengan nomor telepon saja&quot;</strong>.
                </li>
                <li>
                  Ketikkan 8 karakter kode pairing di atas.
                </li>
              </ol>
            </div>
          </div>
        </div>
      </div>

      {/* 2. KONEKSI NOTIFIKASI TRANSAKSI TELEGRAM BOT (PURCHASE NOTICE) */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-sky-50 flex items-center justify-center text-sky-600 border border-sky-100">
              <Send className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                Koneksi Bot Telegram
                <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-sky-50 text-sky-600 border border-sky-200">
                  Bot API
                </span>
              </h3>
              <p className="text-[11px] text-slate-500">
                Kirim notifikasi otomatis instan ke akun atau grup Telegram saat transaksi Berhasil (Paid) atau Gagal (Cancel/Expired).
              </p>
            </div>
          </div>

          {/* Toggle Switcher */}
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={telegramConfig.notifEnabled}
              onChange={(e) => setTelegramConfig({ ...telegramConfig, notifEnabled: e.target.checked })}
              className="sr-only peer"
            />
            <div className="w-10 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-sky-500"></div>
          </label>
        </div>

        {/* Peringatan jika dinonaktifkan oleh master admin */}
        {telegramConfig.adminDisabled && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2.5 text-xs text-rose-800">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Notifikasi Telegram Dinonaktifkan oleh Master Admin (Suspend)</p>
              <p className="text-[11px] text-rose-700 mt-0.5">
                Akses notifikasi bot Telegram untuk unit toko Anda sementara waktu dinonaktifkan oleh administrator sistem.
              </p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Input Bot Token */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-800 flex items-center justify-between">
              <span>Bot Token Telegram</span>
              <a
                href="https://t.me/BotFather"
                target="_blank"
                rel="noreferrer"
                className="text-[10px] text-sky-600 hover:underline flex items-center gap-0.5"
              >
                Dapatkan di @BotFather <ExternalLink className="w-2.5 h-2.5" />
              </a>
            </label>
            <div className="relative flex rounded-xl border border-slate-300 focus-within:border-sky-500 focus-within:ring-2 focus-within:ring-sky-500/20 transition bg-white overflow-hidden shadow-2xs">
              <input
                type={showBotToken ? 'text' : 'password'}
                value={telegramConfig.botToken}
                onChange={(e) => setTelegramConfig({ ...telegramConfig, botToken: e.target.value })}
                placeholder="123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ"
                className="w-full px-3 py-2.5 text-xs font-mono text-slate-900 placeholder-slate-400 focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setShowBotToken(!showBotToken)}
                className="px-3 py-2.5 text-slate-400 hover:text-slate-600 transition"
              >
                {showBotToken ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
            <p className="text-[10px] text-slate-500">
              Token rahasia dari bot yang Anda buat di BotFather.
            </p>
          </div>

          {/* Input Chat ID */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-800 flex items-center justify-between">
              <span>Telegram Chat ID</span>
              <a
                href="https://t.me/userinfobot"
                target="_blank"
                rel="noreferrer"
                className="text-[10px] text-sky-600 hover:underline flex items-center gap-0.5"
              >
                Cek di @userinfobot <ExternalLink className="w-2.5 h-2.5" />
              </a>
            </label>
            <div className="relative flex rounded-xl border border-slate-300 focus-within:border-sky-500 focus-within:ring-2 focus-within:ring-sky-500/20 transition bg-white overflow-hidden shadow-2xs">
              <input
                type="text"
                value={telegramConfig.chatId}
                onChange={(e) => setTelegramConfig({ ...telegramConfig, chatId: e.target.value })}
                placeholder="Contoh: 123456789 atau -100123456789"
                className="w-full px-3 py-2.5 text-xs font-mono text-slate-900 placeholder-slate-400 focus:outline-none"
              />
            </div>
            <p className="text-[10px] text-slate-500">
              ID akun pengguna atau ID grup tujuan notifikasi (gunakan awalan minus untuk grup).
            </p>
          </div>
        </div>

        {/* Panduan Ringkas Cara Setup */}
        <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl space-y-1.5 text-slate-600 text-[11px]">
          <div className="font-bold text-slate-700 flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 text-sky-600" />
            Cara Menghubungkan Notifikasi Telegram:
          </div>
          <ol className="list-decimal list-inside space-y-0.5 pl-1 text-[11px] text-slate-600">
            <li>Buka Telegram, cari <span className="font-semibold text-slate-800">@BotFather</span> dan ketik <code className="bg-slate-200 px-1 py-0.2 rounded text-[10px]">/newbot</code> untuk membuat bot baru.</li>
            <li>Salin token API bot yang diberikan oleh BotFather dan tempel ke kolom <b>Bot Token Telegram</b>.</li>
            <li>Kirim pesan <b>/start</b> ke bot Anda, lalu dapatkan ID Anda via <span className="font-semibold text-slate-800">@userinfobot</span> dan tempel ke kolom <b>Chat ID</b>.</li>
            <li>Klik tombol <b>Tes Kirim Notifikasi</b> untuk memverifikasi sambungan sebelum menyalakan toggle.</li>
          </ol>
        </div>

        {/* Tombol Aksi Telegram */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100">
          <button
            type="button"
            disabled={isTestingTelegram || !telegramConfig.botToken || !telegramConfig.chatId}
            onClick={handleTestTelegram}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition active:scale-[0.98] disabled:opacity-40 cursor-pointer"
          >
            {isTestingTelegram ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Send className="w-3.5 h-3.5 text-sky-600" />
            )}
            <span>Tes Kirim Notifikasi</span>
          </button>

          <button
            type="button"
            disabled={isSavingTelegram}
            onClick={handleSaveTelegram}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold transition shadow-xs active:scale-[0.98] disabled:opacity-50 cursor-pointer"
          >
            {isSavingTelegram ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Save className="w-3.5 h-3.5" />
            )}
            <span>Simpan Pengaturan Telegram</span>
          </button>
        </div>
      </div>

      {/* 3. LIVE TERMINAL DI BAGIAN BAWAH (Confirmed by User in Point 2) */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-[#0084D1]" />
            <h3 className="text-sm font-bold text-slate-900 tracking-tight">
              Live Socket Terminal
            </h3>
          </div>
          <span className="text-[11px] font-mono text-slate-400">
            Real-time Baileys Event Stream
          </span>
        </div>
        <LiveTerminal logs={botData.logs} status={botData.status} />
      </div>
    </div>
  );
};
