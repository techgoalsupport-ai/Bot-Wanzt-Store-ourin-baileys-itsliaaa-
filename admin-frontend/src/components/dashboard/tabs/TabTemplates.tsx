import React, { useState, useEffect } from 'react';
import {
  LayoutTemplate,
  Plus,
  Search,
  Edit2,
  Trash2,
  Copy,
  Check,
  Power,
  Sparkles,
  RefreshCw,
  SlidersHorizontal,
} from 'lucide-react';
import { MessageTemplate, TemplateCategory } from '../../../types/admin.types.ts';
import { AddEditTemplateModal } from '../../modals/AddEditTemplateModal.tsx';
import { DeleteTemplateModal } from '../../modals/DeleteTemplateModal.tsx';

interface TabTemplatesProps {
  onRefreshParent?: () => void;
}

const CATEGORY_TABS: { id: string; label: string; countBadge?: number }[] = [
  { id: 'all', label: 'Semua Kategori' },
  { id: 'menu', label: 'Command Menu' },
  { id: 'list', label: 'Command List' },
  { id: 'carousel', label: 'Carousel' },
  { id: 'invoice', label: 'Invoice' },
  { id: 'confirm_summary', label: 'Ringkasan Order' },
  { id: 'confirm_promo_input', label: 'Input Promo' },
  { id: 'confirm_promo_valid', label: 'Promo Valid' },
  { id: 'confirm_promo_invalid', label: 'Promo Invalid' },
  { id: 'payment_success_dm', label: 'Bayar Sukses DM' },
  { id: 'payment_success_group', label: 'Bayar Sukses Grup' },
  { id: 'payment_expired', label: 'Bayar Kedaluwarsa' },
  { id: 'payment_error', label: 'Gateway Error' },
  { id: 'order_group_notif', label: 'Order Grup ke DM' },
  { id: 'stock_empty', label: 'Stok Habis' },
  { id: 'checkout_session_expired', label: 'Sesi Expired' },
  { id: 'promo_cancelled', label: 'Promo Batal' },
  { id: 'contact_owner_empty', label: 'Owner Kosong' },
  { id: 'contact_admin_empty', label: 'Admin Kosong' },
  { id: 'expiry_warning_owner', label: 'Peringatan Sewa' },
];

export const TabTemplates: React.FC<TabTemplatesProps> = () => {
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [copiedId, setCopiedId] = useState<number | null>(null);

  // State Modal
  const [isAddEditOpen, setIsAddEditOpen] = useState(false);
  const [templateToEdit, setTemplateToEdit] = useState<MessageTemplate | null>(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState<MessageTemplate | null>(null);

  const fetchTemplates = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/templates');
      const data = await res.json();
      if (data.success && Array.isArray(data.templates)) {
        setTemplates(data.templates);
      } else {
        setError(data.error || 'Gagal mengambil data template.');
      }
    } catch (err: any) {
      setError(err?.message || 'Gagal menghubungi server.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  const handleCopyText = (template: MessageTemplate) => {
    navigator.clipboard.writeText(template.content);
    setCopiedId(template.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleToggleStatus = async (template: MessageTemplate) => {
    try {
      const res = await fetch(`/api/admin/templates/${template.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: template.is_active === 1 ? 0 : 1 }),
      });
      const data = await res.json();
      if (data.success && data.template) {
        setTemplates((prev) =>
          prev.map((t) => (t.id === template.id ? data.template : t))
        );
      } else {
        alert(data.error || 'Gagal mengubah status template.');
      }
    } catch (err: any) {
      alert(err?.message || 'Gagal mengubah status template.');
    }
  };

  const handleSaveTemplate = async (templateData: {
    id?: number;
    name: string;
    category: TemplateCategory;
    content: string;
    is_active: number;
  }) => {
    const isEdit = !!templateData.id;
    const url = isEdit
      ? `/api/admin/templates/${templateData.id}`
      : '/api/admin/templates';
    const method = isEdit ? 'PUT' : 'POST';

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(templateData),
    });

    const data = await res.json();
    if (data.success) {
      await fetchTemplates();
      return { success: true };
    }
    return { success: false, error: data.error };
  };

  const handleDeleteTemplate = async (id: number) => {
    const res = await fetch(`/api/admin/templates/${id}`, {
      method: 'DELETE',
    });
    const data = await res.json();
    if (data.success) {
      setTemplates((prev) => prev.filter((t) => t.id !== id));
      return { success: true };
    }
    return { success: false, error: data.error };
  };

  // Filter templates
  const filteredTemplates = templates.filter((template) => {
    const matchesCategory =
      selectedCategory === 'all'
        ? true
        : template.category === selectedCategory ||
          (selectedCategory === 'confirm_summary' && template.category === 'confirmation');
    const matchesSearch =
      template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.content.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const getCategoryBadge = (category: string) => {
    switch (category) {
      case 'menu':
        return {
          label: 'Command Menu',
          className: 'bg-sky-50 text-sky-700 border-sky-200',
        };
      case 'list':
        return {
          label: 'Command List',
          className: 'bg-indigo-50 text-indigo-700 border-indigo-200',
        };
      case 'carousel':
        return {
          label: 'Carousel',
          className: 'bg-amber-50 text-amber-700 border-amber-200',
        };
      case 'invoice':
        return {
          label: 'Invoice',
          className: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        };
      case 'confirm_summary':
      case 'confirmation':
        return {
          label: 'Ringkasan Order',
          className: 'bg-purple-50 text-purple-700 border-purple-200',
        };
      case 'confirm_promo_input':
        return {
          label: 'Input Promo',
          className: 'bg-blue-50 text-blue-700 border-blue-200',
        };
      case 'confirm_promo_valid':
        return {
          label: 'Promo Valid',
          className: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        };
      case 'confirm_promo_invalid':
        return {
          label: 'Promo Invalid',
          className: 'bg-rose-50 text-rose-700 border-rose-200',
        };
      case 'payment_success_dm':
        return {
          label: 'Bayar Sukses DM',
          className: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        };
      case 'payment_success_group':
        return {
          label: 'Bayar Sukses Grup',
          className: 'bg-teal-50 text-teal-700 border-teal-200',
        };
      case 'payment_expired':
        return {
          label: 'Bayar Kedaluwarsa',
          className: 'bg-amber-50 text-amber-700 border-amber-200',
        };
      case 'payment_error':
        return {
          label: 'Gateway Error',
          className: 'bg-rose-50 text-rose-700 border-rose-200',
        };
      case 'order_group_notif':
        return {
          label: 'Order Grup ke DM',
          className: 'bg-sky-50 text-sky-700 border-sky-200',
        };
      case 'stock_empty':
        return {
          label: 'Stok Habis',
          className: 'bg-orange-50 text-orange-700 border-orange-200',
        };
      case 'checkout_session_expired':
        return {
          label: 'Sesi Expired',
          className: 'bg-yellow-50 text-yellow-700 border-yellow-200',
        };
      case 'promo_cancelled':
        return {
          label: 'Promo Batal',
          className: 'bg-gray-100 text-gray-700 border-gray-200',
        };
      case 'contact_owner_empty':
        return {
          label: 'Owner Kosong',
          className: 'bg-violet-50 text-violet-700 border-violet-200',
        };
      case 'contact_admin_empty':
        return {
          label: 'Admin Kosong',
          className: 'bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200',
        };
      case 'expiry_warning_owner':
        return {
          label: 'Peringatan Sewa',
          className: 'bg-red-50 text-red-700 border-red-200',
        };
      default:
        return {
          label: category,
          className: 'bg-slate-50 text-slate-700 border-slate-200',
        };
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Kontrol & Tombol Tambah */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-2xs">
        <div>
          <h2 className="text-base font-bold text-slate-900 tracking-tight">
            Katalog Template Message
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Kelola template respon pesan bot resmi yang dapat dipilih oleh seluruh toko penyewa.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={fetchTemplates}
            disabled={loading}
            className="p-2.5 text-slate-600 hover:text-[#0084D1] hover:bg-sky-50 bg-slate-100 rounded-xl transition cursor-pointer border border-slate-200"
            title="Muat Ulang Data Template"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            type="button"
            onClick={() => {
              setTemplateToEdit(null);
              setIsAddEditOpen(true);
            }}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#0084D1] hover:bg-[#0073B7] text-white text-xs font-semibold shadow-xs transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Template</span>
          </button>
        </div>
      </div>

      {/* Filter Kategori & Search Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Pills Kategori */}
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-1">
          {CATEGORY_TABS.map((tab) => {
            const isSelected = selectedCategory === tab.id;
            const count =
              tab.id === 'all'
                ? templates.length
                : templates.filter(
                    (t) =>
                      t.category === tab.id ||
                      (tab.id === 'confirm_summary' && (t.category as string) === 'confirmation')
                  ).length;

            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setSelectedCategory(tab.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-[#0084D1] text-white shadow-2xs'
                    : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200/90'
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                    isSelected ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Input Search */}
        <div className="relative w-full md:w-64">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari nama atau teks template..."
            className="w-full pl-8.5 pr-3 py-1.5 text-xs bg-white border border-slate-200/90 rounded-xl text-slate-900 focus:outline-none focus:border-[#0084D1] focus:ring-1 focus:ring-[#0084D1] transition shadow-2xs"
          />
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl">
          {error}
        </div>
      )}

      {/* Grid Kartu Template */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((n) => (
            <div
              key={n}
              className="bg-white border border-slate-200/90 rounded-2xl p-5 space-y-3 animate-pulse"
            >
              <div className="h-4 bg-slate-200 rounded w-1/3" />
              <div className="h-24 bg-slate-100 rounded-xl" />
              <div className="h-4 bg-slate-200 rounded w-1/4" />
            </div>
          ))}
        </div>
      ) : filteredTemplates.length === 0 ? (
        <div className="bg-white border border-slate-200/90 rounded-2xl p-12 text-center shadow-2xs">
          <div className="w-12 h-12 rounded-2xl bg-sky-50 text-[#0084D1] flex items-center justify-center mx-auto mb-3">
            <LayoutTemplate className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-slate-900">Belum Ada Template</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            {searchQuery
              ? 'Tidak ditemukan template yang cocok dengan pencarian Anda.'
              : 'Belum ada template pada kategori ini. Klik "Tambah Template" untuk membuat template baru.'}
          </p>
          {!searchQuery && (
            <button
              type="button"
              onClick={() => {
                setTemplateToEdit(null);
                setIsAddEditOpen(true);
              }}
              className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#0084D1] text-white text-xs font-semibold shadow-xs hover:bg-[#0073B7] transition cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Buat Template Pertama</span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredTemplates.map((template) => {
            const badge = getCategoryBadge(template.category);
            const isActive = template.is_active === 1;

            return (
              <div
                key={template.id}
                className={`bg-white border rounded-2xl p-4 sm:p-5 flex flex-col justify-between transition-all shadow-2xs group ${
                  isActive
                    ? 'border-slate-200/90 hover:border-sky-300'
                    : 'border-slate-200 bg-slate-50/50 opacity-80'
                }`}
              >
                <div>
                  {/* Baris Atas: Nama & Kategori Badge */}
                  <div className="flex items-start justify-between gap-3 mb-2.5">
                    <div className="min-w-0">
                      <h3 className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                        {template.name}
                      </h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${badge.className}`}
                        >
                          {badge.label}
                        </span>
                        <span
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                            isActive
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-slate-100 text-slate-500 border border-slate-200'
                          }`}
                        >
                          {isActive ? 'Aktif di Toko' : 'Dinonaktifkan'}
                        </span>
                      </div>
                    </div>

                    {/* Tombol Toggle Cepat Status */}
                    <button
                      type="button"
                      onClick={() => handleToggleStatus(template)}
                      className={`p-1.5 rounded-lg border transition cursor-pointer shrink-0 ${
                        isActive
                          ? 'text-emerald-600 bg-emerald-50 border-emerald-200 hover:bg-emerald-100'
                          : 'text-slate-400 bg-slate-100 border-slate-200 hover:text-slate-600'
                      }`}
                      title={isActive ? 'Nonaktifkan Template' : 'Aktifkan Template'}
                    >
                      <Power className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Isi Pesan Pratinjau (Monospace Box) */}
                  <div className="relative my-3 p-3 bg-slate-50 border border-slate-200/80 rounded-xl text-slate-800 text-xs font-mono whitespace-pre-wrap max-h-36 overflow-y-auto leading-relaxed select-text">
                    {template.content}
                  </div>
                </div>

                {/* Baris Bawah: Info & Tombol Aksi */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="text-[10px] text-slate-400">
                    Diperbarui {new Date(template.updated_at).toLocaleDateString('id-ID')}
                  </span>

                  <div className="flex items-center gap-1.5">
                    {/* Tombol Salin */}
                    <button
                      type="button"
                      onClick={() => handleCopyText(template)}
                      className="p-1.5 text-slate-500 hover:text-[#0084D1] hover:bg-sky-50 rounded-lg transition cursor-pointer"
                      title="Salin Isi Pesan"
                    >
                      {copiedId === template.id ? (
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>

                    {/* Tombol Edit */}
                    <button
                      type="button"
                      onClick={() => {
                        setTemplateToEdit(template);
                        setIsAddEditOpen(true);
                      }}
                      className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition cursor-pointer"
                      title="Edit Template"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>

                    {/* Tombol Hapus */}
                    <button
                      type="button"
                      onClick={() => {
                        setTemplateToDelete(template);
                        setIsDeleteOpen(true);
                      }}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                      title="Hapus Template"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Tambah / Edit */}
      <AddEditTemplateModal
        isOpen={isAddEditOpen}
        onClose={() => setIsAddEditOpen(false)}
        onSubmit={handleSaveTemplate}
        templateToEdit={templateToEdit}
      />

      {/* Modal Hapus */}
      <DeleteTemplateModal
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        onConfirm={handleDeleteTemplate}
        template={templateToDelete}
      />
    </div>
  );
};
