import React, { useEffect, useState } from 'react';
import {
  KeyRound,
  ShieldCheck,
  Clock,
  Calendar,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Zap,
  Info,
  Check,
  Copy,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';
import { BotStatusResponse } from '../../types/dashboard.types';
import {
  decomposeMilliseconds,
  formatTotalRentalDuration,
  calculateRemainingPercentage,
  formatExpiryDateTimeWIB,
  pad2,
} from '../../utils/durationFormat';

interface TabBotManagementProps {
  botData?: BotStatusResponse;
  showToast: (msg: string) => void;
}

export const TabBotManagement: React.FC<TabBotManagementProps> = ({ botData, showToast }) => {
  const [tokenInput, setTokenInput] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [redeemSuccess, setRedeemSuccess] = useState<boolean>(false);
  const [redeemedDetails, setRedeemedDetails] = useState<{
    addedDuration?: string;
    newExpiresAt?: string;
    newDaysRemaining?: number;
    newTotalDays?: number;
  } | null>(null);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [nowMs, setNowMs] = useState<number>(() => Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNowMs(Date.now());
    }, 1000);
    return () => window.clearInterval(timer);
  }, []);

  const activeExpiry = redeemedDetails?.newExpiresAt || botData?.expiresAt;
  const expiryTimeMs = activeExpiry ? new Date(activeExpiry).getTime() : NaN;
  const countdown = Number.isFinite(expiryTimeMs)
    ? decomposeMilliseconds(expiryTimeMs - nowMs)
    : decomposeMilliseconds(0);

  // Status Bot: aktif, suspend, atau expired
  const rawStatus = botData?.accountStatus || 'active';
  const botStatus: 'aktif' | 'suspend' | 'expired' =
    rawStatus === 'suspended'
      ? 'suspend'
      : rawStatus === 'expired' || (Number.isFinite(expiryTimeMs) && countdown.expired && !redeemSuccess)
      ? 'expired'
      : 'aktif';

  const totalDurationLabel = formatTotalRentalDuration(
    botData?.createdAt,
    activeExpiry,
    redeemedDetails?.newTotalDays ?? botData?.totalDays
  );
  const percentage = Number.isFinite(expiryTimeMs)
    ? calculateRemainingPercentage(botData?.createdAt, activeExpiry, nowMs)
    : 0;
  const { dateText: formattedExpiry, timeText: formattedExpiryTime } = formatExpiryDateTimeWIB(
    activeExpiry,
    true
  );

  // Auto format token saat mengetik (XXXX-XXXX-XXXX-XXXX)
  const handleTokenChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let raw = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (raw.length > 16) {
      raw = raw.slice(0, 16);
    }

    // Format menjadi 4 grup berisi masing-masing 4 karakter
    const parts: string[] = [];
    for (let i = 0; i < raw.length; i += 4) {
      parts.push(raw.slice(i, i + 4));
    }
    setTokenInput(parts.join('-'));
  };

  // Handler Redeem Token via API Backend
  const handleRedeemToken = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = tokenInput.replace(/[^A-Z0-9]/g, '').trim();

    if (!clean) {
      showToast('Silakan masukkan kode token voucher terlebih dahulu');
      return;
    }

    if (clean.length !== 16) {
      showToast('Format token tidak valid. Token harus terdiri dari 16 karakter alfanumerik (XXXX-XXXX-XXXX-XXXX)');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/bot/redeem-token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ tokenCode: tokenInput }),
      });

      const json = await res.json();

      if (json.success) {
        setRedeemSuccess(true);
        setRedeemedDetails({
          addedDuration: json.data?.addedDuration,
          newExpiresAt: json.data?.newExpiresAt,
          newDaysRemaining: json.data?.newDaysRemaining,
          newTotalDays: json.data?.newTotalDays,
        });
        showToast(json.message || 'Token voucher berhasil digunakan! Masa sewa bertambah.');
        setTokenInput('');
      } else {
        showToast(json.message || 'Gagal menukarkan voucher token.');
      }
    } catch (err: any) {
      showToast('Terjadi kesalahan saat memproses token: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyExample = (exampleCode: string) => {
    navigator.clipboard.writeText(exampleCode);
    setCopiedToken(exampleCode);
    setTokenInput(exampleCode);
    showToast('Contoh token disalin ke form input!');
    setTimeout(() => setCopiedToken(null), 2500);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Header Halaman */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 sm:p-6 bg-white border border-slate-200/90 rounded-2xl shadow-xs">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-[#0084D1]/10 text-[#0084D1] flex items-center justify-center font-bold">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Management Bot</h2>
              <p className="text-xs text-slate-500">
                Informasi status operasional, durasi masa sewa, dan penukaran voucher token lisensi
              </p>
            </div>
          </div>
        </div>

        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 font-medium">
          <Clock className="w-3.5 h-3.5 text-[#0084D1]" />
          <span>Sistem Voucher Mandiri 24/7</span>
        </div>
      </div>

      {/* Banner Notifikasi Berhasil Redeem */}
      {redeemSuccess && (
        <div className="p-4 sm:p-5 bg-emerald-50 border border-emerald-200 rounded-2xl shadow-xs flex items-start justify-between gap-3 animate-in fade-in duration-300">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-emerald-900">
                Voucher Berhasil Di-Redeem!
              </h4>
              <p className="text-xs text-emerald-700 mt-0.5 leading-relaxed">
                Masa aktif bot WhatsApp toko Anda telah berhasil diperpanjang{' '}
                <span className="font-bold underline">
                  +{redeemedDetails?.addedDuration || 'Durasi Tambahan'}
                </span>
                . Status akun otomatis dipulihkan ke Aktif.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white font-bold text-xs hover:bg-emerald-700 shadow-2xs transition-colors shrink-0"
          >
            Muat Ulang Status
          </button>
        </div>
      )}

      {/* 3 Kartu Metrik Utama: Status Bot, Masa Aktif, Tanggal Expired */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5">
        {/* Kartu 1: Status Bot */}
        <div className="p-5 sm:p-6 bg-white border border-slate-200/90 rounded-2xl shadow-xs relative overflow-hidden flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Status Bot
              </span>
              <div
                className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                  botStatus === 'aktif' || redeemSuccess
                    ? 'bg-emerald-50 text-emerald-600'
                    : botStatus === 'suspend'
                    ? 'bg-rose-50 text-rose-600'
                    : 'bg-amber-50 text-amber-600'
                }`}
              >
                {botStatus === 'aktif' || redeemSuccess ? (
                  <ShieldCheck className="w-4 h-4" />
                ) : botStatus === 'suspend' ? (
                  <AlertTriangle className="w-4 h-4" />
                ) : (
                  <Clock className="w-4 h-4" />
                )}
              </div>
            </div>

            <div>
              {(botStatus === 'aktif' || redeemSuccess) && (
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  Aktif Beroperasi
                </div>
              )}
              {botStatus === 'suspend' && !redeemSuccess && (
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
                  <span className="w-2 h-2 rounded-full bg-rose-500" />
                  Ditangguhkan (Suspend)
                </div>
              )}
              {botStatus === 'expired' && !redeemSuccess && (
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                  Masa Sewa Habis (Expired)
                </div>
              )}
            </div>

            <p className="text-xs text-slate-500 leading-relaxed">
              {botStatus === 'aktif' || redeemSuccess
                ? 'Bot WhatsApp toko Anda aktif dan dapat merespon transaksi pelanggan secara normal.'
                : botStatus === 'suspend'
                ? 'Bot dinonaktifkan sementara oleh Master Admin. Hubungi pengelola untuk informasi lebih lanjut.'
                : 'Masa sewa telah berakhir. Silakan gunakan token voucher untuk memperpanjang kembali.'}
            </p>
          </div>
        </div>

        {/* Kartu 2: Masa Aktif Real-Time (Hari, Jam, Menit, Detik) */}
        <div className="p-5 sm:p-6 bg-white border border-slate-200/90 rounded-2xl shadow-xs relative overflow-hidden flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Masa Aktif
              </span>
              <div className="w-8 h-8 rounded-xl bg-sky-50 text-[#0084D1] flex items-center justify-center">
                <Clock className="w-4 h-4" />
              </div>
            </div>

            <div className="grid grid-cols-4 gap-2 pt-0.5">
              <div>
                <div className={`text-xl sm:text-2xl font-extrabold font-mono tabular-nums leading-none ${countdown.expired ? 'text-rose-600' : 'text-slate-900'}`}>
                  {countdown.days}
                </div>
                <div className="text-[10px] font-semibold text-slate-500 mt-1">Hari</div>
              </div>
              <div>
                <div className={`text-xl sm:text-2xl font-extrabold font-mono tabular-nums leading-none ${countdown.expired ? 'text-rose-600' : 'text-slate-900'}`}>
                  {pad2(countdown.hours)}
                </div>
                <div className="text-[10px] font-semibold text-slate-500 mt-1">Jam</div>
              </div>
              <div>
                <div className={`text-xl sm:text-2xl font-extrabold font-mono tabular-nums leading-none ${countdown.expired ? 'text-rose-600' : 'text-slate-900'}`}>
                  {pad2(countdown.minutes)}
                </div>
                <div className="text-[10px] font-semibold text-slate-500 mt-1">Menit</div>
              </div>
              <div>
                <div className={`text-xl sm:text-2xl font-extrabold font-mono tabular-nums leading-none ${countdown.expired ? 'text-rose-600' : 'text-[#0084D1]'}`}>
                  {pad2(countdown.seconds)}
                </div>
                <div className="text-[10px] font-semibold text-slate-500 mt-1">Detik</div>
              </div>
            </div>

            {/* Progress Bar Visual */}
            <div className="space-y-1.5 pt-1">
              <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500">
                <span>Total Paket: {totalDurationLabel}</span>
                <span className="font-mono tabular-nums text-slate-700">{percentage}%</span>
              </div>
              <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    percentage > 40
                      ? 'bg-[#0084D1]'
                      : percentage > 15
                      ? 'bg-amber-500'
                      : 'bg-rose-500'
                  }`}
                  style={{ width: `${percentage}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Kartu 3: Tanggal Expired Real-Time dari Server */}
        <div className="p-5 sm:p-6 bg-white border border-slate-200/90 rounded-2xl shadow-xs relative overflow-hidden flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Tanggal Expired
              </span>
              <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <Calendar className="w-4 h-4" />
              </div>
            </div>

            <div>
              <span className="text-base sm:text-lg font-bold text-slate-900 block leading-snug">
                {formattedExpiry}
              </span>
              <span className="text-xs font-mono tabular-nums text-slate-600 mt-1 block">
                {formattedExpiryTime === '-' ? '-' : `Pukul ${formattedExpiryTime}`}
              </span>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed">
              Sistem akan otomatis mengirimkan pengingat perpanjangan sewa sebelum batas waktu berakhir.
            </p>
          </div>
        </div>
      </div>

      {/* Form Input Kode Token Voucher */}
      <div className="p-6 sm:p-8 bg-white border border-slate-200/90 rounded-2xl shadow-xs space-y-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-[#0084D1]/10 text-[#0084D1] flex items-center justify-center shrink-0">
            <KeyRound className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-bold text-slate-900">
              Perpanjang Masa Sewa Bot (Redeem Token Voucher)
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 mt-1 leading-relaxed">
              Punya kode token lisensi perpanjangan sewa dari admin atau reseller? Masukkan 16 karakter kode token
              voucher di bawah ini untuk memperpanjang durasi bot WhatsApp secara instan.
            </p>
          </div>
        </div>

        <form onSubmit={handleRedeemToken} className="space-y-5">
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
              Kode Token Lisensi
            </label>
            <div className="relative">
              <input
                type="text"
                value={tokenInput}
                onChange={handleTokenChange}
                placeholder="XXXX-XXXX-XXXX-XXXX"
                maxLength={19}
                className="w-full h-13 px-4 sm:px-5 font-mono text-base sm:text-lg font-bold tracking-widest text-slate-900 bg-slate-50 border-2 border-slate-200 rounded-xl focus:bg-white focus:border-[#0084D1] focus:ring-4 focus:ring-[#0084D1]/10 outline-hidden transition-all placeholder:text-slate-400 placeholder:font-normal placeholder:tracking-normal"
              />
              {tokenInput && (
                <button
                  type="button"
                  onClick={() => setTokenInput('')}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 px-2.5 py-1 text-xs text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                >
                  Bersihkan
                </button>
              )}
            </div>
            <p className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-1.5">
              <Info className="w-3.5 h-3.5 text-[#0084D1] shrink-0" />
              <span>
                Format token terdiri dari 16 karakter yang dipisahkan tanda strip per 4 karakter (misal:{' '}
                <span className="font-mono font-semibold text-slate-700">1211-XUEB-30DA-ODHR</span>).
              </span>
            </p>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
            <button
              type="submit"
              disabled={isSubmitting || !tokenInput.trim()}
              className="w-full sm:w-auto px-7 py-3 rounded-xl bg-[#0084D1] hover:bg-[#0073B7] disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-bold text-sm shadow-xs hover:shadow-md active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Memverifikasi Token...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Gunakan Token</span>
                </>
              )}
            </button>

            {tokenInput.length > 0 && (
              <span className="text-xs text-slate-500 font-mono">
                {tokenInput.replace(/[^A-Z0-9]/g, '').length}/16 Karakter
              </span>
            )}
          </div>
        </form>

        {/* Informasi Aturan Token Lisensi */}
        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/90 space-y-2.5">
          <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Ketentuan Penggunaan Token Lisensi Voucher:</span>
          </h4>
          <ul className="text-xs text-slate-600 space-y-1.5 pl-5 list-disc leading-relaxed">
            <li>Token dapat digunakan oleh seluruh penyewa bot tanpa batasan toko.</li>
            <li>Setiap token hanya berlaku untuk 1 kali penggunaan (single-use voucher).</li>
            <li>Token yang telah di-redeem tidak dapat digunakan kembali oleh toko mana pun.</li>
            <li>Masa sewa baru akan langsung terakumulasi otomatis ke sisa masa aktif bot Anda.</li>
          </ul>
        </div>

        {/* Contoh Format Token Cepat untuk Pengujian UI */}
        <div className="p-4 rounded-xl bg-sky-50/60 border border-sky-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="space-y-0.5">
            <span className="text-xs font-bold text-sky-900 block">Contoh Kode Token Voucher:</span>
            <span className="font-mono text-xs font-semibold text-[#0084D1]">
              1211-XUEB-30DA-ODHR (Masa Aktif 30 Hari)
            </span>
          </div>
          <button
            type="button"
            onClick={() => handleCopyExample('1211-XUEB-30DA-ODHR')}
            className="px-3 py-1.5 rounded-lg bg-white border border-sky-200 text-[#0084D1] hover:bg-sky-50 text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition-colors shrink-0 cursor-pointer"
          >
            {copiedToken === '1211-XUEB-30DA-ODHR' ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span>Tersalin ke Form</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Salin & Coba Input</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
