import React, { useState } from 'react';
import { AlertTriangle, Trash2 } from 'lucide-react';
import { Tenant } from '../../types/admin.types.ts';

interface DeleteTenantModalProps {
  isOpen: boolean;
  tenant: Tenant | null;
  onClose: () => void;
  onSuccess: () => void;
  showToast: (msg: string) => void;
}

export const DeleteTenantModal: React.FC<DeleteTenantModalProps> = ({
  isOpen,
  tenant,
  onClose,
  onSuccess,
  showToast,
}) => {
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  if (!isOpen || !tenant) return null;

  const handleDeleteSubmit = async () => {
    if (tenant.tenant_id === 't_wanzt') {
      showToast('Unit default "t_wanzt" tidak boleh dihapus!');
      onClose();
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/admin/tenants/${tenant.tenant_id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        showToast(data.message || 'Tenant berhasil dihapus permanen');
        onClose();
        onSuccess();
      } else {
        showToast(data.message || 'Gagal menghapus tenant');
      }
    } catch (err: any) {
      showToast('Error: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-fade-in">
      <div className="bg-white border border-slate-200/90 rounded-2xl w-full max-w-sm p-6 shadow-2xl space-y-4 text-slate-900">
        <div className="flex items-center gap-3 text-rose-600">
          <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-center">
            <AlertTriangle className="w-5 h-5 text-rose-600" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 tracking-tight">Hapus Unit Tenant?</h3>
            <p className="text-xs text-slate-500">Tindakan ini tidak dapat dibatalkan</p>
          </div>
        </div>

        <p className="text-xs text-slate-600 leading-relaxed">
          Apakah Anda yakin ingin menghapus unit apartemen{' '}
          <strong className="text-slate-900 font-bold">
            &quot;{tenant.store_name || tenant.tenant_id}&quot;
          </strong>
          ? Seluruh database toko, sesi WhatsApp, dan riwayat transaksi akan dihapus permanen.
        </p>

        <div className="flex justify-end gap-2.5 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={handleDeleteSubmit}
            disabled={isSubmitting}
            className="px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition-all shadow-xs disabled:opacity-50 cursor-pointer inline-flex items-center gap-1.5"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>{isSubmitting ? 'Menghapus...' : 'Ya, Hapus Permanen'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
