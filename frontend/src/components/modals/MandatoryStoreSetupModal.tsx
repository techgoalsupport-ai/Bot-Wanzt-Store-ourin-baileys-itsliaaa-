import React, { useState, FormEvent } from 'react';
import { Store, User, ShieldAlert, CheckCircle2, AlertCircle } from 'lucide-react';
import { StoreInfoConfig } from '../../types/dashboard.types';
import { toDisplayPhone, toOfficialPhone } from '../../utils/phoneUtils';

interface MandatoryStoreSetupModalProps {
  initialStoreInfo?: StoreInfoConfig;
  onSuccess: (updatedStore: StoreInfoConfig) => void;
}

export const MandatoryStoreSetupModal: React.FC<MandatoryStoreSetupModalProps> = ({
  initialStoreInfo,
  onSuccess,
}) => {
  const [storeName, setStoreName] = useState(initialStoreInfo?.storeName || '');
  const [ownerName, setOwnerName] = useState(initialStoreInfo?.ownerName || '');
  const [ownerNumber, setOwnerNumber] = useState(toDisplayPhone(initialStoreInfo?.ownerNumber));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    const trimmedStoreName = storeName.trim();
    const trimmedOwnerName = ownerName.trim();
    const cleanNumber = toDisplayPhone(ownerNumber);

    if (!trimmedStoreName) {
      setError('Nama Toko wajib diisi.');
      return;
    }
    if (!trimmedOwnerName) {
      setError('Nama Owner wajib diisi.');
      return;
    }
    if (!cleanNumber || cleanNumber.length < 8) {
      setError('Nomer WhatsApp tidak valid. Masukkan minimal 8-13 digit angka.');
      return;
    }

    const fullOwnerNumber = toOfficialPhone(cleanNumber);

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/auth/store-setup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          storeName: trimmedStoreName,
          ownerName: trimmedOwnerName,
          ownerNumber: fullOwnerNumber,
        }),
      });

      const data = await res.json();
      if (data.success && data.storeInfo) {
        onSuccess(data.storeInfo);
      } else {
        setError(data.error || 'Gagal menyimpan pengaturan toko.');
      }
    } catch (err: any) {
      setError(err?.message || 'Terjadi kesalahan koneksi server.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
      {/* Modal Dialog Card (Non-dismissible) */}
      <div className="w-full max-w-lg bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header Modal - Clean Industrial Minimalism */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-white">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center shrink-0">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 tracking-tight">
                Pengaturan Wajib Informasi Toko
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Lengkapi 3 data berikut untuk mengaktifkan koneksi bot WhatsApp
              </p>
            </div>
          </div>
          <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
            Wajib Diisi
          </span>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="p-3 rounded-lg bg-amber-50/70 border border-amber-200 text-xs text-amber-900 leading-relaxed">
            <p className="font-semibold text-amber-950 flex items-center gap-1.5 mb-0.5">
              <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
              Sistem Memerlukan Data Toko
            </p>
            <p className="text-[11px] text-amber-800">
              Bot WhatsApp terkunci dan belum dapat digunakan sebelum Nama Toko, Nama Owner, dan Nomer Owner dilengkapi. Data ini digunakan untuk identitas pesan, kontak invoice (vCard), dan notifikasi pembayaran.
            </p>
          </div>

          {error && (
            <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-2">
              <AlertCircle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Input Nama Toko */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Nama Toko <span className="text-rose-500">*</span>
            </label>
            <div className="relative flex items-center rounded-lg border border-slate-300 focus-within:border-sky-600 focus-within:ring-2 focus-within:ring-sky-600/20 transition-all bg-white shadow-2xs overflow-hidden">
              <div className="pl-3 pr-2 text-slate-400">
                <Store className="w-4 h-4" />
              </div>
              <input
                type="text"
                required
                value={storeName}
                onChange={(e) => setStoreName(e.target.value)}
                placeholder="Contoh: Wanzt Store Official"
                disabled={loading}
                className="w-full py-2.5 pr-3 text-sm text-slate-900 placeholder-slate-400 bg-transparent focus:outline-none"
              />
            </div>
          </div>

          {/* Input Nama Owner */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Nama Owner / Pemilik <span className="text-rose-500">*</span>
            </label>
            <div className="relative flex items-center rounded-lg border border-slate-300 focus-within:border-sky-600 focus-within:ring-2 focus-within:ring-sky-600/20 transition-all bg-white shadow-2xs overflow-hidden">
              <div className="pl-3 pr-2 text-slate-400">
                <User className="w-4 h-4" />
              </div>
              <input
                type="text"
                required
                value={ownerName}
                onChange={(e) => setOwnerName(e.target.value)}
                placeholder="Contoh: Wanzt"
                disabled={loading}
                className="w-full py-2.5 pr-3 text-sm text-slate-900 placeholder-slate-400 bg-transparent focus:outline-none"
              />
            </div>
          </div>

          {/* Input Nomer Owner WhatsApp (dengan prefix +62 konsisten dengan WhatsAppConnectionPanel) */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Nomer Owner WhatsApp <span className="text-rose-500">*</span>
            </label>
            <div className="relative flex rounded-lg border border-slate-300 focus-within:border-sky-600 focus-within:ring-2 focus-within:ring-sky-600/20 transition-all bg-white overflow-hidden shadow-2xs">
              <div className="bg-slate-100 px-3 py-2.5 flex items-center gap-1 border-r border-slate-200 text-slate-700 text-xs font-mono font-semibold select-none">
                <span>🇮🇩</span>
                <span>+62</span>
              </div>
              <input
                type="text"
                required
                value={toDisplayPhone(ownerNumber)}
                onChange={(e) => setOwnerNumber(toDisplayPhone(e.target.value))}
                placeholder="82173515807"
                disabled={loading}
                className="w-full px-3 py-2.5 text-sm font-mono text-slate-900 placeholder-slate-400 focus:outline-none bg-transparent"
              />
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Masukkan nomor tanpa angka 0 di depan (contoh: 82173515807).
            </p>
          </div>

          {/* Tombol Simpan & Buka Kunci */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 rounded-lg bg-sky-600 hover:bg-sky-700 text-white font-semibold text-sm shadow-2xs transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                  <span>Menyimpan ke Database...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Simpan & Buka Kunci Bot</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
