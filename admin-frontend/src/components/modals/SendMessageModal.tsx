import React, { useState } from 'react';
import { Send, X, AlertTriangle, Phone } from 'lucide-react';
import { Tenant } from '../../types/admin.types.ts';
import { formatIndonesianPhone } from '../../utils/phoneHelper.ts';

interface SendMessageModalProps {
  isOpen: boolean;
  tenant: Tenant | null;
  onClose: () => void;
  showToast: (msg: string) => void;
}

export const SendMessageModal: React.FC<SendMessageModalProps> = ({
  isOpen,
  tenant,
  onClose,
  showToast,
}) => {
  const [messageText, setMessageText] = useState<string>('');
  const [isSendingMessage, setIsSendingMessage] = useState<boolean>(false);

  if (!isOpen || !tenant) return null;

  const phoneInfo = formatIndonesianPhone(tenant.owner_phone);
  const isOnline = tenant.bot_status === 'online';
  const hasPhone = Boolean(tenant.owner_phone && tenant.owner_phone.trim());

  const handleApplyTemplate = (type: 'extend' | 'maintenance' | 'warning') => {
    const owner = tenant.owner_name || 'Owner';
    const store = tenant.store_name || tenant.tenant_id;

    if (type === 'extend') {
      setMessageText(
        `Halo Kak ${owner} (${store}), ini adalah pesan resmi dari Master Admin Wanzt Apartemen.\n\nKami menginformasikan bahwa masa sewa unit bot WhatsApp Anda akan segera berakhir. Silakan lakukan perpanjangan masa sewa agar bot tetap aktif melayani transaksi toko Anda.\n\nTerima kasih!`
      );
    } else if (type === 'maintenance') {
      setMessageText(
        `Halo Kak ${owner} (${store}), ini adalah pemberitahuan resmi dari Master Admin.\n\nAkan dilakukan pemeliharaan server berkala (maintenance). Layanan bot WhatsApp Anda mungkin mengalami jeda sejenak selama proses berlangsung. Terima kasih atas kerja samanya.`
      );
    } else if (type === 'warning') {
      setMessageText(
        `Halo Kak ${owner} (${store}), ini adalah pemberitahuan dari Master Admin terkait akun bot WhatsApp Anda. Mohon segera periksa dashboard toko Anda atau konfirmasi ke kami jika ada kendala. Terima kasih.`
      );
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageText.trim()) return;

    setIsSendingMessage(true);
    try {
      const res = await fetch(`/api/admin/tenants/${tenant.tenant_id}/send-message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: messageText.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(data.message || 'Pesan resmi berhasil dikirim via bot!');
        onClose();
        setMessageText('');
      } else {
        showToast(data.message || 'Gagal mengirim pesan');
      }
    } catch (err: any) {
      showToast('Error: ' + err.message);
    } finally {
      setIsSendingMessage(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-fade-in">
      <div className="bg-white border border-slate-200/90 rounded-2xl w-full max-w-lg p-6 shadow-2xl relative space-y-4 text-slate-900">
        {/* Header Modal */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
              <Send className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 tracking-tight">Kirim Pesan ke Owner Toko</h3>
              <p className="text-[11px] text-slate-500">
                Pesan resmi Master Admin dikirim otomatis oleh bot WhatsApp unit penyewa
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 hover:bg-slate-100 p-1.5 rounded-lg transition-colors cursor-pointer"
            title="Tutup modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Target Info Card */}
        <div className="space-y-4 text-xs">
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 grid grid-cols-2 gap-3">
            <div>
              <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold block">Unit Toko</span>
              <span className="font-bold text-slate-900 truncate block">
                {tenant.store_name || tenant.tenant_id}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold block">Nama Owner</span>
              <span className="font-bold text-slate-900 truncate block">
                {tenant.owner_name || '(Belum Diisi)'}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold block">No. WhatsApp Tujuan</span>
              {hasPhone ? (
                <span className="font-mono text-emerald-700 font-bold">{phoneInfo.display}</span>
              ) : (
                <span className="text-rose-600 font-semibold italic text-[11px]">Nomor belum diisi</span>
              )}
            </div>
            <div>
              <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold block">Status Bot Toko</span>
              {isOnline ? (
                <span className="inline-flex items-center gap-1.5 text-emerald-700 font-bold">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                  Online (Socket Siap)
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 text-slate-500 font-medium">
                  <span className="w-2 h-2 rounded-full bg-slate-400"></span>
                  Offline
                </span>
              )}
            </div>
          </div>

          {!hasPhone && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
              <span>
                Nomor WhatsApp pemilik belum diisi oleh tenant. Pesan tidak dapat dikirim sampai tenant melengkapi nomor telepon di dashboard toko.
              </span>
            </div>
          )}

          {!isOnline && hasPhone && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-xs flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
              <div className="space-y-1">
                <p>
                  Bot WhatsApp toko ini sedang <strong className="text-amber-900 font-bold">Offline</strong>. Socket bot tidak dapat mengirim pesan otomatis saat ini.
                </p>
                <p className="text-[11px] text-amber-700">
                  Anda dapat menggunakan tombol cadangan di bawah untuk mengirim pesan langsung via WhatsApp pribadi Anda.
                </p>
              </div>
            </div>
          )}

          {/* Template Pesan Cepat */}
          <div className="space-y-1.5">
            <span className="text-[11px] font-semibold text-slate-600">Pilih Template Pesan Cepat:</span>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => handleApplyTemplate('extend')}
                className="px-2.5 py-1 text-[11px] font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg border border-slate-200 transition-colors cursor-pointer active:scale-95"
              >
                Perpanjangan Sewa
              </button>
              <button
                type="button"
                onClick={() => handleApplyTemplate('maintenance')}
                className="px-2.5 py-1 text-[11px] font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg border border-slate-200 transition-colors cursor-pointer active:scale-95"
              >
                Maintenance Server
              </button>
              <button
                type="button"
                onClick={() => handleApplyTemplate('warning')}
                className="px-2.5 py-1 text-[11px] font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg border border-slate-200 transition-colors cursor-pointer active:scale-95"
              >
                Peringatan Akun
              </button>
              {messageText && (
                <button
                  type="button"
                  onClick={() => setMessageText('')}
                  className="px-2.5 py-1 text-[11px] font-medium bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-lg border border-slate-200 transition-colors cursor-pointer"
                >
                  Kosongkan
                </button>
              )}
            </div>
          </div>

          {/* Form Input Pesan */}
          <form onSubmit={handleSendMessage} className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-slate-700 font-semibold">Isi Pesan Resmi</label>
                <span className="text-[10px] text-slate-400 font-mono">
                  {messageText.length} karakter
                </span>
              </div>
              <textarea
                required
                rows={5}
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                placeholder="Ketik pesan resmi Master Admin yang ingin disampaikan ke pemilik toko..."
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-[#0084D1] focus:ring-2 focus:ring-[#0084D1]/20 text-xs leading-relaxed font-normal"
              />
            </div>

            {/* Tombol Aksi Bawah */}
            <div className="flex flex-col-reverse sm:flex-row items-center justify-between gap-2.5 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={onClose}
                className="w-full sm:w-auto px-4 py-2 font-semibold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
              >
                Tutup
              </button>

              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                {!isOnline && hasPhone && (
                  <a
                    href={`https://wa.me/${phoneInfo.cleanDigits}?text=${encodeURIComponent(messageText)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-all shadow-xs active:scale-95 cursor-pointer"
                    title="Kirim pesan langsung melalui WhatsApp Web/App pribadi Anda"
                  >
                    <Phone className="w-3.5 h-3.5" />
                    <span>Buka Chat WhatsApp (wa.me)</span>
                  </a>
                )}

                {isOnline && (
                  <button
                    type="submit"
                    disabled={isSendingMessage || !messageText.trim() || !hasPhone}
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#0084D1] hover:bg-[#0073B7] rounded-xl transition-all shadow-xs disabled:opacity-50 cursor-pointer active:scale-95"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{isSendingMessage ? 'Mengirim Pesan...' : 'Kirim via Bot Toko'}</span>
                  </button>
                )}
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
