import React, { useState } from 'react';
import {
  Building2,
  X,
  CheckCircle2,
  Copy,
  Check,
  Sparkles,
} from 'lucide-react';
import { CreatedTenantResult } from '../../types/admin.types.ts';

interface AddTenantModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  showToast: (msg: string) => void;
}

export const AddTenantModal: React.FC<AddTenantModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  showToast,
}) => {
  const [creationMode, setCreationMode] = useState<'auto' | 'custom'>('auto');
  const [newStoreName, setNewStoreName] = useState<string>('');
  const [newOwnerName, setNewOwnerName] = useState<string>('');
  const [newOwnerPhone, setNewOwnerPhone] = useState<string>('');
  const [newUsername, setNewUsername] = useState<string>('');
  const [newPassword, setNewPassword] = useState<string>('');
  const [durationValue, setDurationValue] = useState<number | string>(30);
  const [durationUnit, setDurationUnit] = useState<'minutes' | 'hours' | 'days' | 'weeks' | 'months'>('days');
  const [newNotes, setNewNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [createdTenantResult, setCreatedTenantResult] = useState<CreatedTenantResult | null>(null);
  const [copiedNewTenant, setCopiedNewTenant] = useState<boolean>(false);

  if (!isOpen) return null;

  /**
   * Helper untuk menghitung pratinjau tanggal kedaluwarsa
   */
  const getExpiryPreview = () => {
    const now = new Date();
    const val = Math.max(0, parseInt(String(durationValue), 10) || 0);
    const newDate = new Date(now.getTime());

    switch (durationUnit) {
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

  const handleCreateTenant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!durationValue || parseInt(String(durationValue), 10) <= 0) {
      showToast('Durasi wajib diisi dengan angka positif');
      return;
    }
    setIsSubmitting(true);
    try {
      const payload: any = {
        duration_value: parseInt(String(durationValue), 10),
        duration_unit: durationUnit,
        notes: newNotes,
      };

      if (creationMode === 'custom') {
        payload.store_name = newStoreName;
        payload.owner_name = newOwnerName;
        payload.owner_phone = newOwnerPhone;
        payload.username = newUsername;
        payload.password = newPassword;
      }

      const res = await fetch('/api/admin/tenants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) {
        showToast(data.message || 'Unit tenant berhasil dibuat!');
        setCreatedTenantResult({
          username: data.data.username,
          password: data.data.generated_password || newPassword,
          tenant_id: data.data.tenant_id,
          store_name: data.data.store_name,
          duration_days: data.data.duration_days,
        });

        // Reset input fields
        setNewStoreName('');
        setNewOwnerName('');
        setNewOwnerPhone('');
        setNewUsername('');
        setNewPassword('');
        setDurationValue(30);
        setDurationUnit('days');
        setNewNotes('');

        onSuccess();
      } else {
        showToast(data.message || 'Gagal mendaftarkan tenant');
      }
    } catch (err: any) {
      showToast('Error: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    onClose();
    setCreatedTenantResult(null);
  };

  const getDurationLabel = () => {
    if (durationUnit === 'minutes') return 'Menit';
    if (durationUnit === 'hours') return 'Jam';
    if (durationUnit === 'weeks') return 'Minggu';
    if (durationUnit === 'months') return 'Bulan';
    return 'Hari';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-fade-in">
      <div className="bg-white border border-slate-200/90 rounded-2xl w-full max-w-lg p-6 shadow-2xl relative space-y-4 max-h-[90vh] overflow-y-auto text-slate-900">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#0084D1]/10 text-[#0084D1] flex items-center justify-center">
              <Building2 className="w-4.5 h-4.5" />
            </div>
            <h3 className="text-base font-bold text-slate-900 tracking-tight">
              {createdTenantResult ? 'Kredensial Unit Baru' : 'Daftarkan Unit Toko Baru'}
            </h3>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="text-slate-400 hover:text-slate-700 hover:bg-slate-100 p-1.5 rounded-lg cursor-pointer transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {createdTenantResult ? (
          /* Tampilan Sukses Kredensial Baru */
          <div className="space-y-4 text-xs">
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 space-y-3">
              <div className="flex items-center gap-2 text-emerald-800 font-bold text-xs">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                <span>Unit Berhasil Terdaftar (Akses Penuh)</span>
              </div>
              <p className="text-slate-600 text-[11px] leading-relaxed">
                Data Nama Store, Nama Owner, dan Nomor WhatsApp dikosongkan terlebih dahulu. Saat penyewa login pertama kali, popup wajib isi profil toko akan muncul otomatis di dashboard mereka.
              </p>

              <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-2 font-mono shadow-2xs">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500">ID Unit:</span>
                  <span className="text-[#0084D1] font-bold">{createdTenantResult.tenant_id}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500">Username:</span>
                  <span className="text-slate-900 font-bold bg-slate-100 px-2 py-0.5 rounded border border-slate-200">{createdTenantResult.username}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500">Password:</span>
                  <span className="text-amber-700 font-bold bg-amber-50 px-2 py-0.5 rounded border border-amber-200">{createdTenantResult.password}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500">Estimasi Masa Sewa:</span>
                  <span className="text-emerald-700 font-bold">~ {createdTenantResult.duration_days} Hari</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  const textToCopy = `Kredensial Akses Bot WhatsApp Store:\nUsername: ${createdTenantResult.username}\nPassword: ${createdTenantResult.password}\nSilakan login dan lengkapi profil toko Anda.`;
                  navigator.clipboard.writeText(textToCopy);
                  setCopiedNewTenant(true);
                  showToast('Kredensial berhasil disalin ke clipboard!');
                  setTimeout(() => setCopiedNewTenant(false), 3000);
                }}
                className="flex-1 py-2.5 px-3 bg-[#0084D1] hover:bg-[#0073B7] text-white font-semibold rounded-xl transition-all shadow-xs inline-flex items-center justify-center gap-1.5 cursor-pointer"
              >
                {copiedNewTenant ? (
                  <>
                    <Check className="w-4 h-4 text-white" />
                    <span>Kredensial Tersalin!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 text-white" />
                    <span>Salin Kredensial untuk Tenant</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl transition-colors cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        ) : (
          /* Form Pembuatan Tenant */
          <form onSubmit={handleCreateTenant} className="space-y-4 text-xs">
            {/* Switcher Mode: Otomatis Instan vs Kustom */}
            <div className="flex items-center p-1 bg-slate-100 rounded-xl border border-slate-200">
              <button
                type="button"
                onClick={() => setCreationMode('auto')}
                className={`flex-1 py-2 text-center rounded-lg font-semibold transition-all cursor-pointer ${
                  creationMode === 'auto'
                    ? 'bg-[#0084D1] text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                ⚡ Otomatis Instan (Rekomendasi)
              </button>
              <button
                type="button"
                onClick={() => setCreationMode('custom')}
                className={`flex-1 py-2 text-center rounded-lg font-semibold transition-all cursor-pointer ${
                  creationMode === 'custom'
                    ? 'bg-[#0084D1] text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                ✍️ Input Manual (Kustom)
              </button>
            </div>

            {creationMode === 'auto' ? (
              /* Mode Otomatis Instan */
              <div className="p-3.5 rounded-xl bg-sky-50/60 border border-sky-100 space-y-2">
                <div className="flex items-start gap-2.5 text-slate-700">
                  <Sparkles className="w-4 h-4 text-[#0084D1] shrink-0 mt-0.5" />
                  <div className="text-[11px] leading-relaxed">
                    <p className="font-bold text-slate-900">Sistem Otomatis:</p>
                    <ul className="list-disc list-inside space-y-0.5 text-slate-600 mt-1">
                      <li>Username acak terstruktur akan dibuat otomatis (misal: <code className="text-[#0084D1] font-mono font-bold">tenant_4829</code>).</li>
                      <li>Password acak aman akan dibuat otomatis (misal: <code className="text-amber-700 font-mono font-bold">pass_k72x</code>).</li>
                      <li>Nama Toko, Nama Owner, dan Nomor WhatsApp dikosongkan agar diisi mandiri oleh tenant via popup modal saat pertama kali login.</li>
                    </ul>
                  </div>
                </div>
              </div>
            ) : (
              /* Mode Input Kustom */
              <div className="space-y-3 p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-700 mb-1 font-semibold">Nama Toko (Opsional)</label>
                    <input
                      type="text"
                      value={newStoreName}
                      onChange={(e) => setNewStoreName(e.target.value)}
                      placeholder="Kosongkan jika diisi penyewa"
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#0084D1] focus:ring-2 focus:ring-[#0084D1]/20"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-700 mb-1 font-semibold">Nama Pemilik (Opsional)</label>
                    <input
                      type="text"
                      value={newOwnerName}
                      onChange={(e) => setNewOwnerName(e.target.value)}
                      placeholder="Kosongkan jika diisi penyewa"
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#0084D1] focus:ring-2 focus:ring-[#0084D1]/20"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-700 mb-1 font-semibold">No. WhatsApp Pemilik (Opsional)</label>
                  <input
                    type="text"
                    value={newOwnerPhone}
                    onChange={(e) => setNewOwnerPhone(e.target.value.replace(/[^0-9]/g, ''))}
                    placeholder="08123456789 (Kosongkan jika diisi penyewa)"
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#0084D1] focus:ring-2 focus:ring-[#0084D1]/20 font-mono"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-700 mb-1 font-semibold">Username Login (Opsional)</label>
                    <input
                      type="text"
                      value={newUsername}
                      onChange={(e) => setNewUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                      placeholder="Kosongkan untuk auto-generate"
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#0084D1] focus:ring-2 focus:ring-[#0084D1]/20 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-700 mb-1 font-semibold">Password Awal (Opsional)</label>
                    <input
                      type="text"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Kosongkan untuk auto-generate"
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#0084D1] focus:ring-2 focus:ring-[#0084D1]/20"
                    />
                  </div>
                </div>
              </div>
            )}

            <div>
              <label className="block text-slate-700 mb-1.5 font-semibold">Set Masa Sewa Awal *</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  min="1"
                  required
                  value={durationValue}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === '') {
                      setDurationValue('');
                    } else {
                      setDurationValue(parseInt(val, 10));
                    }
                  }}
                  className={`flex-1 bg-slate-50 border ${!durationValue ? 'border-rose-500 ring-1 ring-rose-500/20' : 'border-slate-300'} rounded-xl px-3 py-2.5 text-slate-900 focus:bg-white focus:outline-none focus:border-[#0084D1] focus:ring-2 focus:ring-[#0084D1]/20 font-mono font-bold text-sm`}
                />
                <select
                  value={durationUnit}
                  onChange={(e) => setDurationUnit(e.target.value as any)}
                  className="bg-slate-100 border border-slate-300 rounded-xl px-3 py-2.5 text-slate-900 focus:outline-none focus:border-[#0084D1] font-semibold text-xs cursor-pointer"
                >
                  <option value="minutes">Menit</option>
                  <option value="hours">Jam</option>
                  <option value="days">Hari</option>
                  <option value="weeks">Minggu</option>
                  <option value="months">Bulan</option>
                </select>
              </div>
              
              {!durationValue && (
                <div className="mt-1.5 flex items-center gap-1.5 text-rose-500 font-bold text-[10px] animate-pulse">
                  <div className="w-1 h-1 rounded-full bg-rose-500" />
                  <span>Form Tersebut Wajib Di Isi, Misal : 1</span>
                </div>
              )}
              
              {/* Expiry Preview */}
              <div className="mt-2 p-2.5 rounded-lg bg-emerald-50/50 border border-emerald-100 flex items-start gap-2">
                <div className="w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center shrink-0 mt-0.5">
                  <Check className="w-2.5 h-2.5 text-white" />
                </div>
                <div className="text-[10px] text-emerald-800 leading-tight">
                  <p className="font-bold">Akan berakhir pada:</p>
                  <p className="font-mono mt-0.5">{getExpiryPreview()} WIB</p>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-slate-700 mb-1 font-semibold">Catatan Sewa (Opsional)</label>
              <textarea
                value={newNotes}
                onChange={(e) => setNewNotes(e.target.value)}
                placeholder="Catatan pengelola..."
                rows={2}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-[#0084D1] focus:ring-2 focus:ring-[#0084D1]/20"
              />
            </div>

            <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2 font-semibold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2 font-semibold text-white bg-[#0084D1] hover:bg-[#0073B7] rounded-xl transition-all shadow-xs disabled:opacity-50 cursor-pointer"
              >
                {isSubmitting ? 'Memproses Unit...' : 'Daftarkan Unit'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
