import React, { useState } from 'react';
import { Calendar, X, Check, Clock } from 'lucide-react';
import { Tenant, DurationUnit } from '../../types/admin.types.ts';

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
  const [amount, setAmount] = useState<number | string>(30);
  const [unit, setUnit] = useState<DurationUnit>('days');
  const [extendNote, setExtendNote] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  if (!isOpen || !tenant) return null;

  /**
   * Helper untuk menghitung pratinjau tanggal kedaluwarsa baru
   */
  const getExpiryPreview = () => {
    // Gunakan tanggal kadaluwarsa saat ini sebagai basis
    // Jika sudah lewat (expired), gunakan waktu sekarang sebagai basis agar tidak rugi
    const currentExpiry = new Date(tenant.expires_at);
    const now = new Date();
    const baseDate = currentExpiry > now ? currentExpiry : now;
    
    const val = Math.max(0, parseInt(String(amount), 10) || 0);
    const newDate = new Date(baseDate.getTime());

    switch (unit) {
      case 'minutes': newDate.setMinutes(newDate.getMinutes() + val); break;
      case 'hours': newDate.setHours(newDate.getHours() + val); break;
      case 'weeks': newDate.setDate(newDate.getDate() + (val * 7)); break;
      case 'months': newDate.setMonth(newDate.getMonth() + val); break;
      default: newDate.setDate(newDate.getDate() + val); break;
    }

    return new Intl.DateTimeFormat('id-ID', {
      dateStyle: 'full',
      timeStyle: 'short',
    }).format(newDate);
  };

  const handleExtendSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || parseInt(String(amount), 10) <= 0) {
      showToast('Durasi perpanjangan wajib diisi dengan angka positif');
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/admin/tenants/${tenant.tenant_id}/extend`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: parseInt(String(amount), 10),
          unit: unit,
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

  const applyPreset = (amt: number, ut: DurationUnit) => {
    setAmount(amt);
    setUnit(ut);
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
            <label className="block text-slate-700 mb-1.5 font-semibold">Pilih Tambahan Durasi *</label>
            
            {/* Quick Presets */}
            <div className="grid grid-cols-4 gap-2 mb-3">
              {[
                { label: '+1 Jam', amt: 1, ut: 'hours' as DurationUnit },
                { label: '+1 Hari', amt: 1, ut: 'days' as DurationUnit },
                { label: '+30 Hari', amt: 30, ut: 'days' as DurationUnit },
                { label: '+1 Tahun', amt: 12, ut: 'months' as DurationUnit },
              ].map((p, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => applyPreset(p.amt, p.ut)}
                  className={`py-2 text-center rounded-xl font-bold border transition-all cursor-pointer ${
                    amount === p.amt && unit === p.ut
                      ? 'bg-[#0084D1]/10 text-[#0084D1] border-[#0084D1] shadow-2xs'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>

            {/* Custom Input */}
            <div className="flex gap-2">
              <input
                type="number"
                min="1"
                required
                value={amount}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === '') {
                    setAmount('');
                  } else {
                    setAmount(parseInt(val, 10));
                  }
                }}
                className={`flex-1 bg-slate-50 border ${!amount ? 'border-rose-500 ring-1 ring-rose-500/20' : 'border-slate-300'} rounded-xl px-3 py-2.5 text-slate-900 focus:bg-white focus:outline-none focus:border-[#0084D1] focus:ring-2 focus:ring-[#0084D1]/20 font-mono font-bold text-sm`}
              />
              <select
                value={unit}
                onChange={(e) => setUnit(e.target.value as DurationUnit)}
                className="bg-slate-100 border border-slate-300 rounded-xl px-3 py-2.5 text-slate-900 focus:outline-none focus:border-[#0084D1] font-semibold text-xs cursor-pointer"
              >
                <option value="minutes">Menit</option>
                <option value="hours">Jam</option>
                <option value="days">Hari</option>
                <option value="weeks">Minggu</option>
                <option value="months">Bulan</option>
              </select>
            </div>

            {!amount && (
              <div className="mt-1.5 flex items-center gap-1.5 text-rose-500 font-bold text-[10px] animate-pulse">
                <div className="w-1 h-1 rounded-full bg-rose-500" />
                <span>Form Tersebut Wajib Di Isi, Misal : 1</span>
              </div>
            )}

            {/* Expiry Preview */}
            <div className="mt-2.5 p-3 rounded-xl bg-emerald-50/60 border border-emerald-100 flex items-start gap-2.5">
              <div className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
                <Check className="w-3 h-3 text-white" />
              </div>
              <div className="text-[11px] text-emerald-900 leading-tight">
                <p className="font-bold flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  <span>Jadwal Baru Kedaluwarsa:</span>
                </p>
                <p className="font-mono mt-1 text-[10px] bg-white/50 px-2 py-1 rounded border border-emerald-200/50">
                  {getExpiryPreview()} WIB
                </p>
              </div>
            </div>
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
