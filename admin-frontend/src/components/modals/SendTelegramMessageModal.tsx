import React, { useState } from 'react';
import { Send, X, AlertCircle, RefreshCw, MessageSquare } from 'lucide-react';

interface SendTelegramMessageModalProps {
  isOpen: boolean;
  onClose: () => void;
  tenant: {
    tenantId: string;
    storeName: string;
  } | null;
  onSuccess: (msg: string) => void;
}

export const SendTelegramMessageModal: React.FC<SendTelegramMessageModalProps> = ({
  isOpen,
  onClose,
  tenant,
  onSuccess,
}) => {
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !tenant) return null;

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) {
      setError('Pesan tidak boleh kosong');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/admin/telegram/tenants/${tenant.tenantId}/send-message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: message.trim() }),
      });

      const data = await res.json();
      if (data.success) {
        onSuccess(data.message || 'Pesan berhasil dikirim ke Telegram owner!');
        setMessage('');
        onClose();
      } else {
        setError(data.error || 'Gagal mengirim pesan Telegram');
      }
    } catch (err: any) {
      setError('Koneksi terputus: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header Modal */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center border border-sky-100">
              <Send className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Kirim Pesan Telegram ke Owner</h3>
              <p className="text-xs text-slate-500">
                Penerima: <span className="font-semibold text-slate-700">{tenant.storeName}</span> ({tenant.tenantId})
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSend} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2.5 text-xs text-rose-700">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-800">
                Isi Pesan Administrator
              </label>
              <span className="text-[11px] text-slate-400 font-mono">
                {message.length} karakter
              </span>
            </div>
            <textarea
              rows={5}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Tuliskan pengumuman resmi, peringatan masa aktif, atau informasi teknis untuk pemilik toko ini..."
              className="w-full px-3.5 py-2.5 text-xs text-slate-900 placeholder-slate-400 border border-slate-300 rounded-xl focus:outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 resize-none transition"
            />
            <p className="text-[11px] text-slate-500">
              Pesan ini akan dikirim secara instan ke Chat ID Telegram pemilik toko melalui bot yang mereka konfigurasi.
            </p>
          </div>

          <div className="p-3 rounded-xl bg-sky-50/70 border border-sky-100 text-[11px] text-sky-800 space-y-1">
            <p className="font-semibold flex items-center gap-1.5">
              <MessageSquare className="w-3.5 h-3.5 text-sky-600" />
              Privasi & Keamanan Kredensial:
            </p>
            <p className="text-sky-700">
              Token bot dan ID obrolan penyewa tetap terenkripsi dan terlindungi di database masing-masing tenant. Pesan diteruskan melalui perantara aman server internal.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isLoading || !message.trim()}
              className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold transition shadow-xs active:scale-[0.98] disabled:opacity-50 cursor-pointer"
            >
              {isLoading ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              <span>Kirim ke Telegram</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
