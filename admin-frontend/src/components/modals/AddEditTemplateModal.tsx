import React, { useState, useEffect } from 'react';
import { X, LayoutTemplate, Sparkles, Check, AlertCircle } from 'lucide-react';
import { MessageTemplate, TemplateCategory } from '../../types/admin.types.ts';

interface AddEditTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (templateData: {
    id?: number;
    name: string;
    category: TemplateCategory;
    content: string;
    is_active: number;
  }) => Promise<{ success: boolean; error?: string }>;
  templateToEdit?: MessageTemplate | null;
}

const CATEGORY_OPTIONS: { id: TemplateCategory; label: string; desc: string }[] = [
  { id: 'menu', label: 'Command Menu', desc: 'Respon menu awal / list opsi perintah bot' },
  { id: 'list', label: 'Command List', desc: 'Respon katalog daftar menu produk / varian' },
  { id: 'carousel', label: 'Command Carousel', desc: 'Respon kartu slide produk unggulan' },
  { id: 'invoice', label: 'Invoice Pembayaran', desc: 'Format rincian tagihan QRIS otomatis' },
  { id: 'confirm_summary', label: 'Konfirmasi: Ringkasan Order', desc: 'Format pesan order summary awal di DM pembeli' },
  { id: 'confirm_promo_input', label: 'Konfirmasi: Input Promo', desc: 'Format instruksi saat pembeli klik pakai kupon promo' },
  { id: 'confirm_promo_valid', label: 'Konfirmasi: Promo Valid', desc: 'Format notifikasi diskon saat kupon promo berhasil' },
  { id: 'confirm_promo_invalid', label: 'Konfirmasi: Promo Invalid', desc: 'Format penolakan kupon saat kupon promo ditolak' },
];

const AVAILABLE_PLACEHOLDERS = [
  { tag: '{storeName}', desc: 'Nama Toko' },
  { tag: '{ownerNumber}', desc: 'No. WA Owner' },
  { tag: '{adminNumber}', desc: 'No. CS/Admin' },
  { tag: '{buyerNumber}', desc: 'No. WA Pembeli' },
  { tag: '{orderId}', desc: 'ID Pesanan' },
  { tag: '{totalPrice}', desc: 'Total Harga' },
  { tag: '{paymentMethod}', desc: 'Metode Bayar' },
  { tag: '{detailItems}', desc: 'Rincian Item' },
  { tag: '{paymentExpiry}', desc: 'Waktu Kadaluarsa' },
  { tag: '{produkName}', desc: 'Nama Produk' },
  { tag: '{varian}', desc: 'Varian Produk' },
  { tag: '{price}', desc: 'Harga Normal' },
  { tag: '{promoCode}', desc: 'Kode Promo' },
  { tag: '{discount}', desc: 'Nominal Diskon' },
  { tag: '{finalPrice}', desc: 'Total Bayar Akhir' },
  { tag: '{reason}', desc: 'Penyebab Gagal' },
  { tag: '{webLink}', desc: 'Link Web' },
];

export const AddEditTemplateModal: React.FC<AddEditTemplateModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  templateToEdit,
}) => {
  const [name, setName] = useState('');
  const [category, setCategory] = useState<TemplateCategory>('menu');
  const [content, setContent] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEditMode = !!templateToEdit;

  useEffect(() => {
    if (templateToEdit) {
      setName(templateToEdit.name);
      setCategory(templateToEdit.category);
      setContent(templateToEdit.content);
      setIsActive(templateToEdit.is_active === 1);
    } else {
      setName('');
      setCategory('menu');
      setContent('');
      setIsActive(true);
    }
    setError(null);
  }, [templateToEdit, isOpen]);

  if (!isOpen) return null;

  const handleInsertPlaceholder = (tag: string) => {
    setContent((prev) => prev + tag);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Silakan masukkan nama template.');
      return;
    }
    if (!content.trim()) {
      setError('Isi pesan template tidak boleh kosong.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const res = await onSubmit({
        id: templateToEdit?.id,
        name: name.trim(),
        category,
        content: content.trim(),
        is_active: isActive ? 1 : 0,
      });

      if (res.success) {
        onClose();
      } else {
        setError(res.error || 'Gagal menyimpan template.');
      }
    } catch (err: any) {
      setError(err?.message || 'Terjadi kesalahan sistem.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
      <div className="bg-white border border-slate-200/90 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header Modal */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-sky-50 border border-sky-100 text-[#0084D1] flex items-center justify-center">
              <LayoutTemplate className="w-4.5 h-4.5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                {isEditMode ? 'Edit Template Message' : 'Tambah Template Message Baru'}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {isEditMode
                  ? 'Perbarui konten dan fungsi template pesan bot'
                  : 'Buat format pesan siap pakai untuk toko bot penyewa'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition cursor-pointer"
          >
            <X className="w-4.5 h-4.5" />
          </button>
        </div>

        {/* Form Isi */}
        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4 flex-1">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Nama Template */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Nama Template <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Contoh: Menu Gaya Ringkas & Padat"
              className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white focus:outline-none focus:border-[#0084D1] focus:ring-1 focus:ring-[#0084D1] transition"
            />
          </div>

          {/* Kategori Fungsi Template */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Fungsi Template (Kategori Respon) <span className="text-rose-500">*</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {CATEGORY_OPTIONS.map((opt) => {
                const isSelected = category === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setCategory(opt.id)}
                    className={`text-left p-2.5 rounded-xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'border-[#0084D1] bg-sky-50/70 text-[#0084D1]'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold">{opt.label}</span>
                      {isSelected && <Check className="w-3.5 h-3.5 text-[#0084D1]" />}
                    </div>
                    <p className="text-[10px] text-slate-500 mt-0.5 line-clamp-1">{opt.desc}</p>
                  </button>
                );
              })}
            </div>
            <p className="text-[11px] text-slate-500 mt-1.5">
              Template ini hanya akan muncul pada respon bot bagian yang sesuai.
            </p>
          </div>

          {/* Isi Pesan Template */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-700">
                Isi Pesan Template <span className="text-rose-500">*</span>
              </label>
              <span className="text-[11px] text-slate-400">
                {content.length} karakter
              </span>
            </div>
            <textarea
              required
              rows={7}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Ketik draf pesan template di sini..."
              className="w-full p-3 text-xs font-mono bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white focus:outline-none focus:border-[#0084D1] focus:ring-1 focus:ring-[#0084D1] transition leading-relaxed"
            />
          </div>

          {/* Sisipkan Variabel Placeholder Cepat */}
          <div>
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 mb-2">
              <Sparkles className="w-3.5 h-3.5 text-[#0084D1]" />
              <span>Klik untuk Sisipkan Variabel Placeholder:</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {AVAILABLE_PLACEHOLDERS.map((item) => (
                <button
                  key={item.tag}
                  type="button"
                  onClick={() => handleInsertPlaceholder(item.tag)}
                  className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-sky-50 text-slate-700 hover:text-[#0084D1] border border-slate-200 text-[11px] font-mono transition cursor-pointer flex items-center gap-1"
                  title={item.desc}
                >
                  <span>{item.tag}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Status Aktif */}
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-800">Status Keaktifan</p>
              <p className="text-[11px] text-slate-500">
                Jika aktif, template dapat dipilih oleh seluruh penyewa bot di dashboard toko.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsActive(!isActive)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${
                isActive ? 'bg-[#0084D1]' : 'bg-slate-300'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  isActive ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* Tombol Aksi */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-xl transition cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 text-xs font-semibold text-white bg-[#0084D1] hover:bg-[#0073B7] rounded-xl shadow-xs transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Menyimpan...</span>
                </>
              ) : (
                <span>{isEditMode ? 'Simpan Perubahan' : 'Buat Template'}</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
