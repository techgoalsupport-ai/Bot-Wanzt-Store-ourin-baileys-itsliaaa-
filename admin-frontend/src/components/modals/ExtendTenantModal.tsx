import React, { useState } from 'react';
import { Calendar, X } from 'lucide-react';
import { Tenant } from '../../types/admin.types.ts';

interface ExtendTenantModalProps {
  isOpen: boolean;
  tenant: Tenant | null;
  onClose: () => void;
  onSuccess: () => void;
  showToast: (msg: string) => void;
}

export const ExtendTenantModal: React.FC<ExtendTenantModalProps> = ({
  isOpen,
  tenant,
  onClose,
  onSuccess,
  showToast,
}) => {
  const [extendDays, setExtendDays] = useState<number>(30);
  const [extendNote, setExtendNote] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  if (!isOpen || !tenant) return null;

  const handleExtendSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/admin/tenants/${tenant.tenant_id}/extend`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          days: extendDays,
          note: extendNote,
        }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(data.message || 'Masa sewa berhasil diperpanjang!');
        onClose();
        onSuccess();
      } else {
        showToast(data.message || 'Gagal memperpanjang sewa');
      }
    } catch (err: any) {
      showToast('Error: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-fade-in">
      <div className="bg-white border border-slate-200/90 rounded-2xl w-full max-w-md p-6 shadow-2xl relative space-y-4 text-slate-900">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#0084D1]/10 text-[#0084D1] flex items-center justify-center">
              <Calendar className="w-4.5 h-4.5" />
            </div>
            <h3 className="text-base font-bold text-slate-900 tracking-tight">Perpanjang Masa Sewa Unit</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 hover:bg-slate-100 p-1.5 rounded-lg cursor-pointer transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleExtendSubmit} className="space-y-4 text-xs">
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
            <div>
              <span className="text-[11px] text-slate-500 block">Unit Apartemen:</span>
              <span className="font-bold text-slate-900 text-sm">{tenant.store_name || tenant.tenant_id}</span>
            </div>
            <div className="text-right">
              <span className="text-[11px] text-slate-500 block">Status Saat Ini:</span>
              <span
                className={`font-bold px-2 py-0.5 rounded-full text-[10px] ${
                  tenant.status === 'active'
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : tenant.status === 'suspended'
                    ? 'bg-amber-50 text-amber-700 border border-amber-200'
                    : 'bg-rose-50 text-rose-700 border border-rose-200'
                }`}
              >
                {tenant.status.toUpperCase()}
              </span>
            </div>
          </div>

          <div>
            <label className="block text-slate-700 mb-1.5 font-semibold">Tambah Durasi Hari *</label>
            <div className="grid grid-cols-4 gap-2 mb-2">
              {[30, 60, 90, 365].map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setExtendDays(d)}
                  className={`py-2 text-center rounded-xl font-bold border transition-all cursor-pointer ${
                    extendDays === d
                      ? 'bg-[#0084D1]/10 text-[#0084D1] border-[#0084D1] shadow-2xs'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  +{d === 365 ? '1 Tahun' : `${d} Hari`}
                </button>
              ))}
            </div>
            <input
              type="number"
              min="1"
              required
              value={extendDays}
              onChange={(e) => setExtendDays(parseInt(e.target.value || '1', 10))}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:bg-white focus:outline-none focus:border-[#0084D1] focus:ring-2 focus:ring-[#0084D1]/20 font-mono font-bold"
            />
          </div>

          <div>
            <label className="block text-slate-700 mb-1 font-semibold">Catatan Perpanjangan (Opsional)</label>
            <textarea
              value={extendNote}
              onChange={(e) => setExtendNote(e.target.value)}
              placeholder="Bukti transfer / keterangan pembayaran..."
              rows={2}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-[#0084D1] focus:ring-2 focus:ring-[#0084D1]/20"
            />
          </div>

          <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 font-semibold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 font-semibold text-white bg-[#0084D1] hover:bg-[#0073B7] rounded-xl transition-all shadow-xs disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting ? 'Memproses...' : 'Simpan Perpanjangan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
