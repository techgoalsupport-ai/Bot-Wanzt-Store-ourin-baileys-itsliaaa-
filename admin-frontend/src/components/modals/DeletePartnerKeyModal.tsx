import React, { useState } from 'react';
import { X, Trash2, AlertTriangle } from 'lucide-react';
import { CollaboratorApiKey } from '../../types/admin.types.ts';

interface DeletePartnerKeyModalProps {
  isOpen: boolean;
  partnerKey: CollaboratorApiKey | null;
  onClose: () => void;
  onConfirm: (id: number) => Promise<void>;
}

export const DeletePartnerKeyModal: React.FC<DeletePartnerKeyModalProps> = ({
  isOpen,
  partnerKey,
  onClose,
  onConfirm,
}) => {
  const [isDeleting, setIsDeleting] = useState(false);

  if (!isOpen || !partnerKey) return null;

  const handleConfirm = async () => {
    setIsDeleting(true);
    try {
      await onConfirm(partnerKey.id);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-partner-key-title"
    >
      <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <AlertTriangle className="w-4.5 h-4.5" />
            </div>
            <h3 id="delete-partner-key-title" className="text-sm font-bold text-slate-900">
              Hapus API Key Partner
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup modal konfirmasi hapus"
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <p className="text-xs text-slate-600 leading-relaxed">
            Apakah Anda yakin ingin menghapus API Key milik <strong className="text-slate-900">{partnerKey.name}</strong> (<code className="font-mono text-slate-800">{partnerKey.prefix_key}</code>)?
          </p>
          <p className="text-xs text-rose-600 bg-rose-50 border border-rose-200 rounded-xl p-3">
            Semua integrasi milik partner ini akan langsung ditolak server (401 Unauthorized) dan riwayat log key ini ikut dihapus.
          </p>

          <div className="flex items-center justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isDeleting}
              className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={isDeleting}
              className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold inline-flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-60"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>{isDeleting ? 'Menghapus...' : 'Hapus Permanen'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
