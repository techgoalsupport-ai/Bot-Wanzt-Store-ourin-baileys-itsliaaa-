import React, { useState } from 'react';
import { X, CheckCircle2, Copy, Check, ShieldCheck, Ticket } from 'lucide-react';

interface TokenCreatedModalProps {
  isOpen: boolean;
  tokenCode: string;
  durationLabel: string;
  onClose: () => void;
  showToast: (msg: string) => void;
}

export const TokenCreatedModal: React.FC<TokenCreatedModalProps> = ({
  isOpen,
  tokenCode,
  durationLabel,
  onClose,
  showToast,
}) => {
  const [copied, setCopied] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(tokenCode);
    setCopied(true);
    showToast('Kode token berhasil disalin ke clipboard!');
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white border border-slate-200 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header Modal */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-emerald-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6 text-emerald-600" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Token Berhasil Dibuat</h3>
              <p className="text-xs text-slate-500">
                Voucher lisensi siap dibagikan ke penyewa bot
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6">
          {/* Box Kode Token Besar */}
          <div className="p-5 rounded-2xl bg-sky-50/80 border-2 border-dashed border-[#0084D1]/40 text-center space-y-3">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-widest block">
              KODE TOKEN VOUCHER
            </span>
            <div className="font-mono text-2xl sm:text-3xl font-extrabold text-[#0084D1] tracking-wider select-all">
              {tokenCode}
            </div>

            <button
              type="button"
              onClick={handleCopy}
              className={`w-full py-2.5 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all ${
                copied
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-white hover:bg-sky-50 text-[#0084D1] border border-sky-200 shadow-2xs hover:shadow-xs active:scale-[0.98]'
              }`}
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-white" />
                  <span>Kode Token Tersalin!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span>Salin Kode Token</span>
                </>
              )}
            </button>
          </div>

          {/* Rincian Spesifikasi Token */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/90 space-y-2 text-xs">
            <div className="flex justify-between py-1 border-b border-slate-200/60">
              <span className="text-slate-500">Masa Aktif Diberikan:</span>
              <span className="font-bold text-slate-900 font-mono">{durationLabel}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-200/60">
              <span className="text-slate-500">Sifat Voucher:</span>
              <span className="font-bold text-emerald-700">Universal (1x Pakai)</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-500">Status Awal:</span>
              <span className="inline-flex items-center gap-1 font-semibold text-emerald-700">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Tersedia (Ready to Redeem)
              </span>
            </div>
          </div>

          {/* Petunjuk Penggunaan */}
          <div className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-200/80 text-[11px] text-amber-900 flex items-start gap-2 leading-relaxed">
            <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <span>
              Kirimkan kode ini kepada penyewa toko. Penyewa dapat memasukkan kode di menu{' '}
              <strong className="font-bold">"Management Bot"</strong> di dashboard toko mereka untuk
              langsung memperpanjang masa aktif.
            </span>
          </div>

          {/* Tombol Selesai */}
          <button
            type="button"
            onClick={onClose}
            className="w-full py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-xs transition-colors"
          >
            Selesai
          </button>
        </div>
      </div>
    </div>
  );
};
