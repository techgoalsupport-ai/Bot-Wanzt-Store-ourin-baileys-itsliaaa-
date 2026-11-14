import React, { useState } from 'react';
import { X, Copy, Check, ShieldAlert, KeyRound } from 'lucide-react';

interface PartnerKeyCreatedModalProps {
  isOpen: boolean;
  partnerName: string;
  rawApiKey: string;
  onClose: () => void;
  showToast: (msg: string) => void;
}

export const PartnerKeyCreatedModal: React.FC<PartnerKeyCreatedModalProps> = ({
  isOpen,
  partnerName,
  rawApiKey,
  onClose,
  showToast,
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(rawApiKey);
    setCopied(true);
    showToast('API Key berhasil disalin ke clipboard!');
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="partner-key-created-title"
    >
      <div className="w-full max-w-lg bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <KeyRound className="w-4.5 h-4.5" />
            </div>
            <div>
              <h3 id="partner-key-created-title" className="text-sm font-bold text-slate-900">
                API Key Partner Berhasil Dibuat
              </h3>
              <p className="text-[11px] text-slate-500">Partner: {partnerName}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup modal API Key baru"
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 flex items-start gap-2.5 text-xs text-amber-800">
            <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              Demi keamanan, <strong>API Key lengkap hanya ditampilkan satu kali ini saja</strong>. Harap salin dan simpan di tempat aman sebelum menutup jendela ini.
            </p>
          </div>

          <div className="space-y-1.5">
            <span className="block text-xs font-semibold text-slate-700">Secret API Key</span>
            <div className="flex items-center gap-2 p-3 rounded-xl bg-slate-50 border border-slate-200">
              <code className="flex-1 font-mono text-xs sm:text-sm font-bold text-slate-900 break-all select-all">
                {rawApiKey}
              </code>
              <button
                type="button"
                onClick={handleCopy}
                className="px-3 py-1.5 rounded-lg bg-[#0084D1] hover:bg-[#0073B7] text-white text-xs font-bold inline-flex items-center gap-1.5 shrink-0 transition-colors cursor-pointer"
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Tersalin' : 'Salin'}</span>
              </button>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-colors cursor-pointer"
            >
              Saya Sudah Menyimpan Key
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
