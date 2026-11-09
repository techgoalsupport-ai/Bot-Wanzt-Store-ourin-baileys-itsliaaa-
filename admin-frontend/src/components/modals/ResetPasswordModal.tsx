import React, { useState } from 'react';
import {
  KeyRound,
  X,
  Sparkles,
  CheckCircle2,
  Copy,
  Check,
} from 'lucide-react';
import { Tenant, ResetPasswordResult } from '../../types/admin.types.ts';

interface ResetPasswordModalProps {
  isOpen: boolean;
  tenant: Tenant | null;
  onClose: () => void;
  onSuccess: () => void;
  showToast: (msg: string) => void;
}

export const ResetPasswordModal: React.FC<ResetPasswordModalProps> = ({
  isOpen,
  tenant,
  onClose,
  onSuccess,
  showToast,
}) => {
  const [newResetPassword, setNewResetPassword] = useState<string>('');
  const [resetSuccessData, setResetSuccessData] = useState<ResetPasswordResult | null>(null);
  const [copiedPassword, setCopiedPassword] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  if (!isOpen || !tenant) return null;

  const generateRandomPassword = () => {
    const chars = 'abcdefghjkmnpqrstuvwxyz23456789';
    let gen = 'pass_';
    for (let i = 0; i < 6; i++) {
      gen += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setNewResetPassword(gen);
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/admin/tenants/${tenant.tenant_id}/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          new_password: newResetPassword,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setResetSuccessData(data.data);
        showToast(`Password untuk ${tenant.store_name || tenant.tenant_id} berhasil direset!`);
        onSuccess();
      } else {
        showToast(data.message || 'Gagal mereset password');
      }
    } catch (err: any) {
      showToast('Error: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyPassword = (pwd: string) => {
    navigator.clipboard.writeText(pwd);
    setCopiedPassword(true);
    setTimeout(() => setCopiedPassword(false), 2000);
  };

  const handleClose = () => {
    onClose();
    setResetSuccessData(null);
    setNewResetPassword('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-fade-in">
      <div className="bg-white border border-slate-200/90 rounded-2xl w-full max-w-md p-6 shadow-2xl relative space-y-4 text-slate-900">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-200">
              <KeyRound className="w-4.5 h-4.5" />
            </div>
            <h3 className="text-base font-bold text-slate-900 tracking-tight">
              Reset Password Akun Tenant
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

        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between text-xs">
          <div>
            <span className="text-[11px] text-slate-500 block">Unit Toko:</span>
            <span className="font-bold text-slate-900">{tenant.store_name || tenant.tenant_id}</span>
          </div>
          <div className="text-right">
            <span className="text-[11px] text-slate-500 block">Username Login:</span>
            <span className="font-mono text-[#0084D1] font-bold">{tenant.username}</span>
          </div>
        </div>

        {resetSuccessData ? (
          <div className="space-y-4 text-xs">
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl space-y-2.5">
              <div className="flex items-center gap-2 text-emerald-800 font-bold text-xs">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                <span>Password Berhasil Diperbarui</span>
              </div>
              <div>
                <p className="text-[11px] text-slate-600 mb-1.5">Kredensial login baru untuk tenant:</p>
                <div className="flex items-center justify-between p-2.5 bg-white rounded-lg border border-slate-200 font-mono text-xs shadow-2xs">
                  <div className="space-y-1">
                    <div>
                      <span className="text-slate-500">Username: </span>
                      <span className="text-slate-900 font-bold">{resetSuccessData.username}</span>
                    </div>
                    <div>
                      <span className="text-slate-500">Password: </span>
                      <span className="text-amber-700 font-bold">{resetSuccessData.new_password}</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopyPassword(resetSuccessData.new_password)}
                    className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md border border-slate-300 transition-colors inline-flex items-center gap-1 text-[11px] font-semibold cursor-pointer shrink-0"
                    title="Salin password"
                  >
                    {copiedPassword ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="text-emerald-700 font-bold">Tersalin</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-slate-600" />
                        <span>Salin</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
            <div className="flex justify-end pt-2 border-t border-slate-100 text-xs">
              <button
                type="button"
                onClick={handleClose}
                className="px-5 py-2 font-semibold text-white bg-[#0084D1] hover:bg-[#0073B7] rounded-xl transition-all shadow-xs cursor-pointer"
              >
                Selesai
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleResetPassword} className="space-y-4 text-xs">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-slate-700 font-semibold">Password Baru</label>
                <button
                  type="button"
                  onClick={generateRandomPassword}
                  className="text-[11px] text-[#0084D1] hover:text-[#0073B7] transition-colors inline-flex items-center gap-1 cursor-pointer font-bold"
                >
                  <Sparkles className="w-3 h-3" />
                  <span>Buat Acak Otomatis</span>
                </button>
              </div>
              <input
                type="text"
                required
                value={newResetPassword}
                onChange={(e) => setNewResetPassword(e.target.value)}
                placeholder="Masukkan kata sandi baru atau klik Buat Acak"
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-[#0084D1] focus:ring-2 focus:ring-[#0084D1]/20 font-mono text-xs font-semibold"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                Tenant dapat menggunakan kata sandi ini untuk login ke dashboard tokonya.
              </p>
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
                disabled={isSubmitting || !newResetPassword.trim()}
                className="px-5 py-2 font-semibold text-white bg-[#0084D1] hover:bg-[#0073B7] rounded-xl transition-all shadow-xs disabled:opacity-50 cursor-pointer inline-flex items-center gap-1.5"
              >
                <KeyRound className="w-4 h-4" />
                <span>{isSubmitting ? 'Menyimpan...' : 'Simpan Password Baru'}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
