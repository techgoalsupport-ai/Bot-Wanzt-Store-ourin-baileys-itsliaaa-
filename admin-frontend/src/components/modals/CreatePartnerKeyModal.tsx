import React, { useState, useEffect } from 'react';
import { X, KeyRound } from 'lucide-react';

interface CreatePartnerKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (name: string) => Promise<void>;
}

export const CreatePartnerKeyModal: React.FC<CreatePartnerKeyModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
}) => {
  const [name, setName] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen) {
      setName('');
      setErrorMsg('');
      setIsSubmitting(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setErrorMsg('Nama partner atau kolaborator wajib diisi.');
      return;
    }

    setErrorMsg('');
    setIsSubmitting(true);
    try {
      await onConfirm(trimmed);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-partner-key-title"
    >
      <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#0084D1]/10 text-[#0084D1] flex items-center justify-center">
              <KeyRound className="w-4.5 h-4.5" />
            </div>
            <div>
              <h3 id="create-partner-key-title" className="text-sm font-bold text-slate-900">
                Buat API Key Partner Baru
              </h3>
              <p className="text-[11px] text-slate-500">
                Akses unlimited untuk buat akun tenant dan token perpanjangan
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup modal buat API Key"
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="partner-name-input" className="block text-xs font-semibold text-slate-700">
              Nama Partner / Reseller
            </label>
            <input
              id="partner-name-input"
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (errorMsg) setErrorMsg('');
              }}
              placeholder="Contoh: Toko Digital Nusantara atau Reseller Andi"
              className="w-full h-10 px-3.5 rounded-xl bg-slate-50 border border-slate-300 text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-[#0084D1] focus:outline-none transition-colors"
              autoFocus
            />
            {errorMsg ? (
              <p className="text-xs font-medium text-rose-600">{errorMsg}</p>
            ) : (
              <p className="text-[11px] text-slate-500">
                Nama ini dipakai untuk mengidentifikasi aktivitas partner pada log sistem.
              </p>
            )}
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 space-y-1">
            <p className="font-semibold text-slate-800">Hak Akses Endpoint API:</p>
            <p>1. Pembuatan akun bot tenant otomatis (POST /api/v1/partner/tenants/create)</p>
            <p>2. Pembuatan token voucher perpanjangan (POST /api/v1/partner/tokens/create)</p>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 rounded-xl bg-[#0084D1] hover:bg-[#0073B7] active:scale-[0.98] text-white text-xs font-bold shadow-xs transition-all cursor-pointer disabled:opacity-60"
            >
              {isSubmitting ? 'Membuat...' : 'Generate API Key'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
