import React, { useState } from 'react';
import { PauseCircle, PlayCircle } from 'lucide-react';
import { Tenant } from '../../types/admin.types.ts';

interface ToggleSuspendModalProps {
  isOpen: boolean;
  tenant: Tenant | null;
  onClose: () => void;
  onSuccess: () => void;
  showToast: (msg: string) => void;
}

export const ToggleSuspendModal: React.FC<ToggleSuspendModalProps> = ({
  isOpen,
  tenant,
  onClose,
  onSuccess,
  showToast,
}) => {
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  if (!isOpen || !tenant) return null;

  const isCurrentActive = tenant.status === 'active';
  const nextStatus = isCurrentActive ? 'suspended' : 'active';

  const handleConfirmToggle = async () => {
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/admin/tenants/${tenant.tenant_id}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(
          nextStatus === 'suspended'
            ? `Unit "${tenant.store_name || tenant.tenant_id}" dinonaktifkan (Suspend)!`
            : `Unit "${tenant.store_name || tenant.tenant_id}" aktif kembali!`
        );
        onClose();
        onSuccess();
      } else {
        showToast(data.message || 'Gagal mengubah status unit');
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
        <div className="flex items-center gap-3">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center ${
              isCurrentActive
                ? 'bg-amber-50 border border-amber-200 text-amber-600'
                : 'bg-emerald-50 border border-emerald-200 text-emerald-600'
            }`}
          >
            {isCurrentActive ? <PauseCircle className="w-5 h-5" /> : <PlayCircle className="w-5 h-5" />}
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 tracking-tight">
              {isCurrentActive ? 'Tangguhkan Unit (Suspend)?' : 'Aktifkan Kembali Unit?'}
            </h3>
            <p className="text-xs text-slate-500">
              {isCurrentActive ? 'Bot WhatsApp akan dinonaktifkan' : 'Bot WhatsApp dapat kembali online'}
            </p>
          </div>
        </div>

        <p className="text-xs text-slate-600 leading-relaxed">
          {isCurrentActive ? (
            <>
              Apakah Anda yakin ingin men-suspend unit{' '}
              <strong className="text-slate-900 font-bold">
                &quot;{tenant.store_name || tenant.tenant_id}&quot;
              </strong>
              ? Koneksi bot WhatsApp akan diputus dan layar dashboard toko penyewa akan terkunci dengan popup pemberitahuan suspend.
            </>
          ) : (
            <>
              Apakah Anda yakin ingin mengaktifkan kembali unit{' '}
              <strong className="text-slate-900 font-bold">
                &quot;{tenant.store_name || tenant.tenant_id}&quot;
              </strong>
              ? Penyewa akan dapat menggunakan bot WhatsApp kembali seperti biasa.
            </>
          )}
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
            onClick={handleConfirmToggle}
            disabled={isSubmitting}
            className={`px-4 py-2 text-xs font-semibold text-white rounded-xl transition-all shadow-xs disabled:opacity-50 cursor-pointer inline-flex items-center gap-1.5 ${
              isCurrentActive
                ? 'bg-amber-600 hover:bg-amber-700'
                : 'bg-emerald-600 hover:bg-emerald-700'
            }`}
          >
            {isCurrentActive ? (
              <>
                <PauseCircle className="w-3.5 h-3.5" />
                <span>{isSubmitting ? 'Memproses...' : 'Ya, Suspend Unit'}</span>
              </>
            ) : (
              <>
                <PlayCircle className="w-3.5 h-3.5" />
                <span>{isSubmitting ? 'Memproses...' : 'Ya, Aktifkan Kembali'}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
