import React, { useState } from 'react';
import { X, Sparkles, Clock, AlertCircle } from 'lucide-react';
import { DurationUnit } from '../../types/admin.types';

interface CreateTokenModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (amount: number, unit: DurationUnit) => void;
}

export const CreateTokenModal: React.FC<CreateTokenModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
}) => {
  const [amount, setAmount] = useState<number | string>(30);
  const [unit, setUnit] = useState<DurationUnit>('days');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (val === '') {
      setAmount('');
      setErrorMsg('Durasi wajib diisi, misal: 30');
      return;
    }
    const num = parseInt(val, 10);
    if (!isNaN(num) && num > 0) {
      setAmount(num);
      setErrorMsg(null);
    }
  };

  const setPreset = (presetAmount: number, presetUnit: DurationUnit) => {
    setAmount(presetAmount);
    setUnit(presetUnit);
    setErrorMsg(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalAmount = typeof amount === 'number' ? amount : parseInt(String(amount), 10);
    if (!finalAmount || isNaN(finalAmount) || finalAmount <= 0) {
      setErrorMsg('Masukkan durasi yang valid lebih dari 0');
      return;
    }

    onConfirm(finalAmount, unit);
  };

  // Preview label unit
  const getUnitLabel = (u: DurationUnit) => {
    switch (u) {
      case 'minutes':
        return 'Menit';
      case 'hours':
        return 'Jam';
      case 'days':
        return 'Hari';
      case 'weeks':
        return 'Minggu';
      case 'months':
        return 'Bulan';
      default:
        return 'Hari';
    }
  };

  // Preview format kode token (misal: 1211-••••-30DA-••••)
  const getPreviewTokenStructure = () => {
    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const block1 = `${day}${month}`;

    let suffix = 'DA';
    if (unit === 'minutes') suffix = 'MI';
    else if (unit === 'hours') suffix = 'HO';
    else if (unit === 'days') suffix = 'DA';
    else if (unit === 'weeks') suffix = 'WE';
    else if (unit === 'months') suffix = 'MO';

    const numStr = String(typeof amount === 'number' ? amount : 30).padStart(2, '0').slice(-2);
    const block3 = `${numStr}${suffix}`;

    return `${block1}-XXXX-${block3}-XXXX`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white border border-slate-200 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header Modal */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#0084D1]/10 text-[#0084D1] flex items-center justify-center">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Buat Token Lisensi Baru</h3>
              <p className="text-xs text-slate-500">
                Generate kode voucher 16-karakter perpanjangan sewa bot
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

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Preset Cepat */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
              Pilihan Cepat Masa Aktif
            </label>
            <div className="grid grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => setPreset(1, 'hours')}
                className={`px-2.5 py-2 rounded-xl text-xs font-semibold border transition-all ${
                  amount === 1 && unit === 'hours'
                    ? 'bg-[#0084D1] text-white border-[#0084D1] shadow-2xs'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                1 Jam
              </button>
              <button
                type="button"
                onClick={() => setPreset(1, 'days')}
                className={`px-2.5 py-2 rounded-xl text-xs font-semibold border transition-all ${
                  amount === 1 && unit === 'days'
                    ? 'bg-[#0084D1] text-white border-[#0084D1] shadow-2xs'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                1 Hari
              </button>
              <button
                type="button"
                onClick={() => setPreset(30, 'days')}
                className={`px-2.5 py-2 rounded-xl text-xs font-semibold border transition-all ${
                  amount === 30 && unit === 'days'
                    ? 'bg-[#0084D1] text-white border-[#0084D1] shadow-2xs'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                30 Hari
              </button>
              <button
                type="button"
                onClick={() => setPreset(3, 'months')}
                className={`px-2.5 py-2 rounded-xl text-xs font-semibold border transition-all ${
                  amount === 3 && unit === 'months'
                    ? 'bg-[#0084D1] text-white border-[#0084D1] shadow-2xs'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                3 Bulan
              </button>
            </div>
          </div>

          {/* Input Durasi & Satuan Waktu */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
              Masa Aktif Token
            </label>
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-1">
                <input
                  type="number"
                  min="1"
                  value={amount}
                  onChange={handleAmountChange}
                  placeholder="30"
                  className="w-full h-11 px-3.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-bold text-center focus:bg-white focus:border-[#0084D1] outline-hidden transition-colors"
                />
              </div>
              <div className="col-span-2">
                <select
                  value={unit}
                  onChange={(e) => setUnit(e.target.value as DurationUnit)}
                  className="w-full h-11 px-3.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-semibold focus:bg-white focus:border-[#0084D1] outline-hidden transition-colors cursor-pointer"
                >
                  <option value="minutes">Menit (Minutes)</option>
                  <option value="hours">Jam (Hours)</option>
                  <option value="days">Hari (Days)</option>
                  <option value="months">Bulan (Months)</option>
                </select>
              </div>
            </div>

            {errorMsg && (
              <p className="text-xs text-rose-600 flex items-center gap-1 font-medium mt-1">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{errorMsg}</span>
              </p>
            )}
          </div>

          {/* Pratinjau Struktur Kode Token */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
              Pratinjau Pola Token:
            </span>
            <div className="flex items-center justify-between">
              <span className="font-mono text-base font-extrabold text-[#0084D1] tracking-wider">
                {getPreviewTokenStructure()}
              </span>
              <span className="text-xs font-bold px-2.5 py-1 rounded-md bg-white border border-slate-200 text-slate-700 shadow-2xs">
                {amount || 0} {getUnitLabel(unit)}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Struktur otomatis mencantumkan tanggal-bulan pembuatan, blok kode acak, kode durasi, dan pengacak akhir.
            </p>
          </div>

          {/* Tombol Aksi */}
          <div className="pt-2 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-bold text-xs transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl bg-[#0084D1] hover:bg-[#0073B7] active:scale-[0.98] text-white font-bold text-xs shadow-xs hover:shadow-md transition-all flex items-center gap-1.5"
            >
              <Sparkles className="w-4 h-4" />
              <span>Konfirmasi & Buat Token</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
