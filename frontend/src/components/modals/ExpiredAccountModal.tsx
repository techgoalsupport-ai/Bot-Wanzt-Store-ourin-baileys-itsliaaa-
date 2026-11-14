import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  Clock,
  KeyRound,
  LogOut,
  MessageCircle,
  CheckCircle2,
  Loader2,
  X,
} from 'lucide-react';
import { getMasterAdminWaLink, MASTER_ADMIN_PHONE } from '../../config/adminContact';
import { formatVoucherTokenInput, validateVoucherTokenInput } from '../../utils/tokenInputUtils';
import { formatExpiryDateTimeWIB } from '../../utils/durationFormat';

interface ExpiredAccountModalProps {
  storeName?: string;
  tenantUsername?: string;
  expiresAt?: string;
  onLogout: () => void | Promise<void>;
  onCloseTemporary?: () => void;
  onTokenRedeemed: (data?: {
    addedDuration?: string;
    newExpiresAt?: string;
    newDaysRemaining?: number;
    newTotalDays?: number;
  }) => void | Promise<void>;
}

export const ExpiredAccountModal: React.FC<ExpiredAccountModalProps> = ({
  storeName,
  tenantUsername,
  expiresAt,
  onLogout,
  onCloseTemporary,
  onTokenRedeemed,
}) => {
  const [assignedAdmin, setAssignedAdmin] = useState<{ name: string; phone: string }>({
    name: 'Master Admin',
    phone: MASTER_ADMIN_PHONE,
  });
  const [tokenInput, setTokenInput] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/auth/master-admin-contact')
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled && data?.success && data?.admin?.phone) {
          setAssignedAdmin({
            name: String(data.admin.name || 'Master Admin'),
            phone: String(data.admin.phone),
          });
        }
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, []);

  const formattedExpiry = expiresAt ? formatExpiryDateTimeWIB(expiresAt, false) : null;
  const expiryLabel =
    formattedExpiry && formattedExpiry.dateText !== '-'
      ? `${formattedExpiry.dateText}, ${formattedExpiry.timeText.replace(' (Asia/Jakarta)', '')}`
      : 'Telah berakhir';
  const waMessage = `Halo ${assignedAdmin.name}, saya pemilik toko *${storeName || tenantUsername || 'Toko Saya'}* (username: ${tenantUsername || '-'}). Masa sewa bot WhatsApp toko saya telah habis (expired). Saya ingin membeli/meminta token perpanjangan masa aktif bot. Terima kasih.`;
  const waLink = getMasterAdminWaLink(waMessage, assignedAdmin.phone);

  const handleTokenChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMsg(null);
    setTokenInput(formatVoucherTokenInput(e.target.value));
  };

  const handleSubmitToken = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    const validation = validateVoucherTokenInput(tokenInput);
    if (!validation.valid) {
      setErrorMsg(validation.error || 'Kode token tidak valid.');
      return;
    }

    setErrorMsg(null);
    setIsSubmitting(true);

    try {
      const res = await fetch('/api/bot/redeem-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tokenCode: tokenInput }),
      });

      const json = await res.json().catch(() => ({}));
      if (res.ok && json.success) {
        setSuccessMsg(
          json.message || 'Masa aktif berhasil diperpanjang! Menutup popup...'
        );
        setTokenInput('');
        await onTokenRedeemed(json.data);
      } else {
        setErrorMsg(json.message || json.error || 'Token voucher tidak valid atau sudah digunakan.');
      }
    } catch (err: any) {
      setErrorMsg('Gagal menghubungi server: ' + (err?.message || 'Network error'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="expired-modal-title"
      aria-describedby="expired-modal-desc"
      className="fixed inset-0 z-[9999] bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200"
    >
      <div className="bg-white rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl border border-amber-200 relative my-auto">
        {/* Tombol Tutup Sementara di Pojok Kanan Atas (Development) */}
        {onCloseTemporary && (
          <button
            type="button"
            onClick={onCloseTemporary}
            aria-label="Tutup popup sementara"
            className="absolute top-4 right-4 z-20 w-8 h-8 rounded-full bg-black/20 hover:bg-black/35 text-white/90 hover:text-white flex items-center justify-center transition cursor-pointer"
            title="Tutup popup sementara (Development)"
          >
            <X className="w-4 h-4" />
          </button>
        )}

        {/* Banner Atas Amber-Oranye */}
        <div className="bg-gradient-to-br from-amber-600 via-orange-600 to-rose-700 px-6 py-7 text-white text-center relative overflow-hidden">
          <div className="absolute -top-12 -right-12 w-40 h-40 bg-white/10 rounded-full blur-2xl pointer-events-none" />
          <div className="absolute -bottom-8 -left-8 w-32 h-32 bg-amber-300/15 rounded-full blur-xl pointer-events-none" />

          <div className="relative z-10 flex flex-col items-center">
            <div className="w-14 h-14 rounded-2xl bg-white/15 border border-white/25 backdrop-blur-xs flex items-center justify-center shadow-lg mb-3.5 text-white">
              <Clock className="w-8 h-8 text-amber-50" />
            </div>
            <h2 id="expired-modal-title" className="text-2xl font-extrabold tracking-tight">
              Masa Sewa Bot Berakhir
            </h2>
            <p className="text-amber-50/90 text-xs mt-1">
              Koneksi bot WhatsApp otomatis diputus hingga masa aktif diperpanjang
            </p>
          </div>
        </div>

        {/* Konten Utama & Form Token */}
        <div className="p-5 sm:p-7 space-y-4">
          <div className="rounded-2xl bg-amber-50 border border-amber-200/80 p-3.5 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <p id="expired-modal-desc" className="text-xs text-amber-950 leading-relaxed">
              Masa sewa unit bot <span className="font-bold">{storeName || tenantUsername || 'Anda'}</span> telah berakhir. Masukkan <span className="font-semibold">kode token perpanjangan</span> di bawah untuk mengaktifkan kembali bot Anda tanpa perlu pairing ulang.
            </p>
          </div>

          <div className="rounded-xl bg-slate-50 border border-slate-200 p-3 text-xs text-slate-600 space-y-1.5">
            <div className="flex justify-between items-center gap-2">
              <span className="text-slate-500">Toko:</span>
              <span className="font-semibold text-slate-800 truncate">{storeName || 'Toko Penyewa'}</span>
            </div>
            <div className="flex justify-between items-center gap-2">
              <span className="text-slate-500">Username:</span>
              <span className="font-mono font-medium text-slate-800">{tenantUsername || '-'}</span>
            </div>
            <div className="flex justify-between items-center gap-2">
              <span className="text-slate-500">Berakhir Pada:</span>
              <span className="font-mono font-medium text-rose-700 tabular-nums">{expiryLabel}</span>
            </div>
            <div className="flex justify-between items-center gap-2">
              <span className="text-slate-500">Kontak Admin ({assignedAdmin.name}):</span>
              <span className="font-mono font-semibold text-indigo-700 tabular-nums">{assignedAdmin.phone}</span>
            </div>
          </div>

          {/* Form Input Token Perpanjangan */}
          <form onSubmit={handleSubmitToken} className="space-y-3 pt-1">
            <div>
              <label
                htmlFor="expired-token-input"
                className="block text-xs font-bold text-slate-800 mb-1.5"
              >
                Masukkan Kode Token Voucher
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <KeyRound className="w-4 h-4 text-slate-400" />
                </div>
                <input
                  id="expired-token-input"
                  type="text"
                  value={tokenInput}
                  onChange={handleTokenChange}
                  disabled={isSubmitting}
                  maxLength={19}
                  autoComplete="off"
                  placeholder="XXXX-XXXX-XXXX-XXXX"
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-300 bg-white text-slate-900 text-sm font-mono font-bold tracking-widest uppercase placeholder:text-slate-400 placeholder:font-normal placeholder:tracking-normal focus:outline-none focus:ring-2 focus:ring-amber-500/25 focus:border-amber-600 transition"
                />
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Format 16 karakter huruf/angka dari Master Admin.
              </p>
            </div>

            {errorMsg && (
              <div
                role="alert"
                className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 font-medium flex items-start gap-2"
              >
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            {successMsg && (
              <div
                role="status"
                className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 font-medium flex items-start gap-2"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>{successMsg}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 bg-[#0084D1] hover:bg-[#0073B7] disabled:bg-slate-300 disabled:cursor-not-allowed text-white text-sm font-bold rounded-2xl shadow-sm transition-all cursor-pointer active:scale-[0.98]"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Memverifikasi Token...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Konfirmasi Perpanjang</span>
                </>
              )}
            </button>
          </form>

          {/* Tombol Aksi Sekunder */}
          <div className="space-y-2 pt-1 border-t border-slate-100">
            <a
              href={waLink}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-bold rounded-2xl shadow-sm transition-all cursor-pointer active:scale-[0.98]"
            >
              <MessageCircle className="w-4 h-4 sm:w-5 sm:h-5" />
              <span>Hubungi Master Admin</span>
            </a>

            {onCloseTemporary && (
              <button
                type="button"
                onClick={onCloseTemporary}
                className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl border border-slate-300 transition-colors cursor-pointer active:scale-[0.98]"
              >
                <X className="w-3.5 h-3.5 text-slate-500" />
                <span>Tutup Sementara</span>
              </button>
            )}

            <button
              type="button"
              onClick={onLogout}
              className="w-full inline-flex items-center justify-center gap-2 px-5 py-2.5 text-slate-600 hover:text-rose-600 hover:bg-rose-50 text-xs font-medium rounded-xl border border-slate-200 hover:border-rose-200 transition-colors cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Keluar / Logout Akun</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
