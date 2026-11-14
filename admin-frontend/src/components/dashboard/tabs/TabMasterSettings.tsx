import { useState, useEffect, useMemo } from 'react';
import {
  Plus,
  Trash2,
  Scale,
  Save,
  Loader2,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import { MasterAdminContact } from '../../../types/admin.types.ts';
import {
  equalizeAdminWeights,
  rebalanceAdminWeights,
  toAdminDisplayPhone,
  toAdminOfficialPhone,
  toAdminWaDigits,
} from '../../../utils/masterAdminHelpers.ts';

interface TabMasterSettingsProps {
  onShowToast: (msg: string) => void;
}

export function TabMasterSettings({ onShowToast }: TabMasterSettingsProps) {
  const [admins, setAdmins] = useState<MasterAdminContact[]>([]);
  const [initialSnapshot, setInitialSnapshot] = useState<string>('[]');
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const loadMasterAdmins = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch('/api/admin/master-admins');
      const data = await res.json();
      if (data.success && Array.isArray(data.admins)) {
        const mapped: MasterAdminContact[] = data.admins.map((a: any) => ({
          id: a.id,
          name: String(a.name || ''),
          phone: String(a.phone || ''),
          weight: Number(a.weight ?? 0),
        }));
        setAdmins(mapped);
        setInitialSnapshot(
          JSON.stringify(mapped.map(({ name, phone, weight }) => ({ name, phone, weight })))
        );
      } else {
        setErrorMsg(data.message || 'Gagal memuat data kontak Master Admin.');
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Gagal terhubung ke server.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMasterAdmins();
  }, []);

  const totalWeight = useMemo(
    () => admins.reduce((sum, item) => sum + Math.round(Number(item.weight) || 0), 0),
    [admins]
  );

  const hasUnsavedChanges = useMemo(() => {
    const current = JSON.stringify(
      admins.map((a) => ({
        name: a.name,
        phone: a.phone,
        weight: a.weight,
      }))
    );
    return current !== initialSnapshot;
  }, [admins, initialSnapshot]);

  const handleFieldChange = (index: number, field: 'name' | 'phone', value: string) => {
    setErrorMsg(null);
    setSuccessMsg(null);
    setAdmins((prev) => {
      const next = [...prev];
      if (!next[index]) return prev;
      if (field === 'phone') {
        const displayDigits = toAdminDisplayPhone(value);
        next[index] = {
          ...next[index],
          phone: displayDigits ? toAdminOfficialPhone(displayDigits) : '',
        };
      } else {
        next[index] = {
          ...next[index],
          name: value,
        };
      }
      return next;
    });
  };

  const handleWeightSliderChange = (index: number, rawVal: number) => {
    setErrorMsg(null);
    setSuccessMsg(null);
    setAdmins((prev) => {
      if (prev.length <= 1) return prev;
      const rebalanced = rebalanceAdminWeights(
        prev.map((a) => a.weight),
        index,
        rawVal
      );
      return prev.map((item, idx) => ({
        ...item,
        weight: rebalanced[idx] ?? 0,
      }));
    });
  };

  const handleEqualizeAll = () => {
    setErrorMsg(null);
    setSuccessMsg(null);
    setAdmins((prev) => {
      const even = equalizeAdminWeights(prev.length);
      return prev.map((item, idx) => ({
        ...item,
        weight: even[idx] ?? 0,
      }));
    });
  };

  const handleAddAdmin = () => {
    setErrorMsg(null);
    setSuccessMsg(null);
    setAdmins((prev) => {
      const nextCount = prev.length + 1;
      const even = equalizeAdminWeights(nextCount);
      const updated = prev.map((item, idx) => ({
        ...item,
        weight: even[idx] ?? 0,
      }));
      updated.push({
        name: `Master Admin ${nextCount}`,
        phone: '',
        weight: even[nextCount - 1] ?? 0,
      });
      return updated;
    });
  };

  const handleRemoveAdmin = (index: number) => {
    if (admins.length <= 1) return;
    setErrorMsg(null);
    setSuccessMsg(null);
    setAdmins((prev) => {
      const remaining = prev.filter((_, idx) => idx !== index);
      const even = equalizeAdminWeights(remaining.length);
      return remaining.map((item, idx) => ({
        ...item,
        weight: even[idx] ?? 0,
      }));
    });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (admins.length === 0) {
      setErrorMsg('Minimal harus terdapat 1 kontak Master Admin.');
      return;
    }

    for (let i = 0; i < admins.length; i++) {
      if (!admins[i].name.trim()) {
        setErrorMsg(`Nama Master Admin #${i + 1} wajib diisi.`);
        return;
      }
      const digits = toAdminWaDigits(admins[i].phone);
      if (!digits || digits.length < 10 || digits.length > 16) {
        setErrorMsg(`Nomor WhatsApp "${admins[i].name.trim()}" tidak valid (minimal 8 digit setelah +62).`);
        return;
      }
    }

    if (totalWeight !== 100) {
      setErrorMsg(`Total seluruh probabilitas harus tepat 100% (saat ini ${totalWeight}%).`);
      return;
    }

    setSaving(true);
    try {
      const payload = admins.map((item) => ({
        name: item.name.trim(),
        phone: toAdminOfficialPhone(item.phone),
        weight: Math.round(Number(item.weight) || 0),
      }));

      const res = await fetch('/api/admin/master-admins', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ admins: payload }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setErrorMsg(data.message || 'Gagal menyimpan pengaturan Master Admin.');
        return;
      }

      const savedList: MasterAdminContact[] = (data.admins || []).map((a: any) => ({
        id: a.id,
        name: String(a.name || ''),
        phone: String(a.phone || ''),
        weight: Number(a.weight ?? 0),
      }));

      setAdmins(savedList);
      setInitialSnapshot(
        JSON.stringify(savedList.map(({ name, phone, weight }) => ({ name, phone, weight })))
      );
      setSuccessMsg('Kontak Master Admin dan distribusi probabilitas berhasil disimpan.');
      onShowToast('Pengaturan kontak Master Admin berhasil diperbarui.');
    } catch (err: any) {
      setErrorMsg(err?.message || 'Terjadi kesalahan saat menyimpan data.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto my-2 space-y-4">
      <form
        onSubmit={handleSave}
        className="bg-white border border-slate-200/90 rounded-2xl shadow-2xs overflow-hidden"
      >
        {/* Header Minimalis */}
        <div className="px-5 sm:px-6 py-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold text-slate-900">
              Kontak Master Admin
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Rujukan tenant diacak otomatis sesuai persentase range slider ({admins.length} nomor).
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {admins.length >= 2 && (
              <button
                type="button"
                onClick={handleEqualizeAll}
                className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-900 text-xs font-medium transition cursor-pointer"
                title="Bagi rata peluang ke seluruh admin"
              >
                <Scale className="w-3.5 h-3.5 text-slate-400" />
                <span>Bagi Rata</span>
              </button>
            )}
            <button
              type="button"
              onClick={handleAddAdmin}
              data-testid="add-master-admin-btn"
              className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium transition cursor-pointer active:scale-[0.98]"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Tambah Admin</span>
            </button>
          </div>
        </div>

        {/* Notifikasi Error / Sukses */}
        {errorMsg && (
          <div className="px-5 sm:px-6 py-3 bg-rose-50/80 border-b border-rose-100 text-rose-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}
        {successMsg && (
          <div className="px-5 sm:px-6 py-3 bg-emerald-50/80 border-b border-emerald-100 text-emerald-700 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Daftar Baris Admin */}
        {loading ? (
          <div className="py-12 flex items-center justify-center gap-2 text-xs text-slate-400">
            <Loader2 className="w-4 h-4 animate-spin text-[#0084D1]" />
            <span>Memuat kontak Master Admin...</span>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {admins.map((admin, idx) => {
              const displayPhone = toAdminDisplayPhone(admin.phone);
              const isZero = admin.weight === 0;

              return (
                <div
                  key={idx}
                  data-testid={`master-admin-card-${idx}`}
                  className={`px-5 sm:px-6 py-4 space-y-3 transition-colors ${
                    isZero ? 'bg-slate-50/60' : 'bg-white'
                  }`}
                >
                  {/* Baris Input Nama, Nomor WA, & Hapus */}
                  <div className="flex items-center gap-2.5 sm:gap-3">
                    <span className="text-xs font-mono text-slate-400 w-5 shrink-0 select-none">
                      {String(idx + 1).padStart(2, '0')}
                    </span>

                    <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
                      <input
                        id={`admin-name-${idx}`}
                        aria-label={`Nama Master Admin ${idx + 1}`}
                        type="text"
                        value={admin.name}
                        onChange={(e) => handleFieldChange(idx, 'name', e.target.value)}
                        placeholder={`Nama Master Admin ${idx + 1}`}
                        className="w-full h-9 px-3 text-sm text-slate-900 bg-slate-50/70 border border-slate-200 rounded-lg focus:bg-white focus:border-[#0084D1] focus:ring-2 focus:ring-[#0084D1]/15 outline-hidden transition"
                      />

                      <div className="flex items-stretch h-9 rounded-lg border border-slate-200 bg-slate-50/70 focus-within:bg-white focus-within:border-[#0084D1] focus-within:ring-2 focus-within:ring-[#0084D1]/15 overflow-hidden transition">
                        <span className="px-2.5 bg-slate-100/80 border-r border-slate-200 flex items-center text-xs font-medium text-slate-500 shrink-0 select-none">
                          +62
                        </span>
                        <input
                          id={`admin-phone-${idx}`}
                          aria-label={`Nomor WhatsApp Master Admin ${idx + 1}`}
                          type="tel"
                          value={displayPhone}
                          onChange={(e) => handleFieldChange(idx, 'phone', e.target.value)}
                          placeholder="85712439395"
                          className="w-full px-3 text-sm font-mono text-slate-900 bg-transparent outline-hidden"
                        />
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRemoveAdmin(idx)}
                      disabled={admins.length <= 1}
                      data-testid={`remove-master-admin-${idx}`}
                      aria-label={`Hapus ${admin.name || `Master Admin ${idx + 1}`}`}
                      title={
                        admins.length <= 1
                          ? 'Minimal 1 Master Admin wajib tersedia'
                          : 'Hapus admin ini'
                      }
                      className="w-9 h-9 rounded-lg inline-flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-rose-50 disabled:opacity-25 disabled:pointer-events-none transition cursor-pointer shrink-0"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Baris Range Slider Ringkas */}
                  <div className="sm:pl-8 flex items-center gap-3">
                    <span className="text-[11px] font-medium text-slate-400 shrink-0">
                      Peluang
                    </span>
                    <input
                      id={`admin-slider-${idx}`}
                      data-testid={`slider-master-admin-${idx}`}
                      aria-label={`Persentase peluang ${admin.name || `Master Admin ${idx + 1}`}`}
                      type="range"
                      min={0}
                      max={100}
                      step={1}
                      disabled={admins.length <= 1}
                      value={admin.weight}
                      onChange={(e) => handleWeightSliderChange(idx, Number(e.target.value))}
                      className="flex-1 h-1.5 bg-slate-200 rounded-full appearance-none cursor-pointer accent-[#0084D1] disabled:opacity-45 disabled:cursor-not-allowed"
                    />
                    <span
                      className={`min-w-[3.5rem] text-right font-mono text-xs font-semibold tabular-nums ${
                        isZero ? 'text-amber-600' : 'text-slate-700'
                      }`}
                    >
                      {isZero ? '0% (Off)' : `${admin.weight}%`}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Footer Simpan Minimalis */}
        <div className="px-5 sm:px-6 py-3.5 bg-slate-50/60 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs">
            {hasUnsavedChanges ? (
              <span className="text-amber-600 font-medium">Belum disimpan</span>
            ) : (
              <span className="text-slate-400 font-mono">Total: {totalWeight}%</span>
            )}
          </div>

          <button
            type="submit"
            disabled={loading || saving}
            data-testid="save-master-admins-btn"
            className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg bg-[#0084D1] hover:bg-[#0073B7] text-white text-xs font-semibold whitespace-nowrap shrink-0 shadow-2xs transition cursor-pointer active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none"
          >
            {saving ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Menyimpan...</span>
              </>
            ) : (
              <>
                <Save className="w-3.5 h-3.5" />
                <span>Simpan Pengaturan</span>
              </>
            )}
          </button>
        </div>
      </form>

      {/* Strip Informasi Sistem Minimalis */}
      <div className="px-5 py-3 bg-white border border-slate-200/80 rounded-xl flex flex-wrap items-center justify-between gap-x-6 gap-y-1.5 text-[11px] text-slate-500">
        <div>
          Master DB: <span className="font-mono text-slate-700">database/master.db</span>
        </div>
        <div>
          Tenant DB: <span className="font-mono text-slate-700">database/tenants/*.db</span>
        </div>
        <div>
          Portal: <span className="font-mono text-slate-700">/admin/</span>
        </div>
      </div>
    </div>
  );
}
