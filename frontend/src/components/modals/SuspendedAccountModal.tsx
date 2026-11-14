import { useEffect, useState } from 'react';
import { AlertTriangle, MessageCircle, LogOut, ShieldAlert, X } from 'lucide-react';
import { getMasterAdminWaLink, MASTER_ADMIN_PHONE } from '../../config/adminContact';

interface SuspendedAccountModalProps {
  storeName?: string;
  tenantUsername?: string;
  onLogout: () => void | Promise<void>;
  onCloseTemporary?: () => void;
}

export const SuspendedAccountModal: React.FC<SuspendedAccountModalProps> = ({
  storeName,
  tenantUsername,
  onLogout,
  onCloseTemporary,
}) => {
  const [assignedAdmin, setAssignedAdmin] = useState<{ name: string; phone: string }>({
    name: 'Master Admin',
    phone: MASTER_ADMIN_PHONE,
  });

  useEffect(() => {
    let cancelled = false;
    fetch('/api/auth/master-admin-contact')
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled && data?.success && data?.admin?.phone) {
          setAssignedAdmin({
            name: String(data.admin.name || 'Master Admin'),
            phone: String(data.admin.phone),
          });
        }
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, []);

  const waMessage = `Halo ${assignedAdmin.name}, saya pemilik toko *${storeName || tenantUsername || 'Toko Saya'}* (username: ${tenantUsername || '-'}). Akun toko saya saat ini ditangguhkan (suspended). Mohon bantuan untuk mengaktifkan kembali akun dan bot WhatsApp saya. Terima kasih.`;
  const waLink = getMasterAdminWaLink(waMessage, assignedAdmin.phone);

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="suspended-modal-title"
      aria-describedby="suspended-modal-desc"
      className="fixed inset-0 z-[9999] bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 select-none animate-in fade-in duration-200"
    >
      <div className="bg-white rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl border border-rose-200 relative">
        {/* Tombol Tutup Sementara di Pojok Kanan Atas */}
        {onCloseTemporary && (
          <button
            type="button"
            onClick={onCloseTemporary}
            className="absolute top-4 right-4 z-20 w-8 h-8 rounded-full bg-black/20 hover:bg-black/35 text-white/90 hover:text-white flex items-center justify-center transition cursor-pointer"
            title="Tutup popup sementara"
          >
            <X className="w-4 h-4" />
          </button>
        )}

        {/* Banner Atas Merah & Oranye */}
        <div className="bg-gradient-to-br from-rose-600 via-rose-700 to-amber-700 px-6 py-8 text-white text-center relative overflow-hidden">
          <div className="absolute -top-12 -right-12 w-40 h-40 bg-white/10 rounded-full blur-2xl pointer-events-none" />
          <div className="absolute -bottom-8 -left-8 w-32 h-32 bg-amber-400/10 rounded-full blur-xl pointer-events-none" />

          <div className="relative z-10 flex flex-col items-center">
            <div className="w-16 h-16 rounded-2xl bg-white/15 border border-white/20 backdrop-blur-xs flex items-center justify-center shadow-lg mb-4 text-white">
              <ShieldAlert className="w-9 h-9 text-rose-100" />
            </div>
            <span className="px-3 py-1 rounded-full text-[11px] font-bold tracking-wider uppercase bg-white/20 border border-white/30 text-white mb-2">
              Status Akun Ditangguhkan
            </span>
            <h2 id="suspended-modal-title" className="text-2xl font-extrabold tracking-tight">
              Akun Toko Ditangguhkan
            </h2>
            <p className="text-rose-100 text-xs mt-1">
              Operasional toko dan koneksi bot WhatsApp dihentikan sementara
            </p>
          </div>
        </div>

        {/* Konten Penjelasan */}
        <div className="p-6 md:p-8 space-y-5">
          <div className="rounded-2xl bg-rose-50 border border-rose-200/80 p-4 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div className="text-xs text-rose-900 leading-relaxed space-y-1">
              <p className="font-semibold text-rose-950">
                Pemberitahuan dari Master Admin:
              </p>
              <p id="suspended-modal-desc">
                Akun toko <span className="font-bold underline">{storeName || tenantUsername || 'Anda'}</span> telah ditangguhkan (suspend) oleh Master Admin. Seluruh sambungan bot WhatsApp otomatis diputus dan dashboard dikunci sementara sampai Anda menyelesaikan proses verifikasi dengan Master Admin.
              </p>
            </div>
          </div>

          <div className="rounded-xl bg-slate-50 border border-slate-200 p-3.5 text-xs text-slate-600 space-y-1.5">
            <div className="flex justify-between items-center">
              <span className="text-slate-500">Toko:</span>
              <span className="font-semibold text-slate-800">{storeName || 'Toko Penyewa'}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-500">Username:</span>
              <span className="font-mono font-medium text-slate-800">{tenantUsername || '-'}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-500">Kontak Admin ({assignedAdmin.name}):</span>
              <span className="font-mono font-semibold text-indigo-700">{assignedAdmin.phone}</span>
            </div>
          </div>

          {/* Tombol Aksi */}
          <div className="space-y-2.5 pt-2">
            <a
              href={waLink}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full inline-flex items-center justify-center gap-2 px-5 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold rounded-2xl shadow-md hover:shadow-lg transition-all duration-150 cursor-pointer active:scale-[0.98]"
            >
              <MessageCircle className="w-5 h-5" />
              <span>Hubungi Master Admin</span>
            </a>

            {/* Tombol Tutup Sementara */}
            {onCloseTemporary && (
              <button
                type="button"
                onClick={onCloseTemporary}
                className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl border border-slate-300 transition-colors cursor-pointer active:scale-[0.98]"
              >
                <X className="w-3.5 h-3.5 text-slate-500" />
                <span>Tutup Sementara</span>
              </button>
            )}

            <button
              type="button"
              onClick={onLogout}
              className="w-full inline-flex items-center justify-center gap-2 px-5 py-2.5 text-slate-600 hover:text-rose-600 hover:bg-rose-50 text-xs font-medium rounded-xl border border-slate-200 hover:border-rose-200 transition-colors cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Keluar / Logout Akun</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

