import React from 'react';
import {
  Check,
  Plus,
  Pencil,
  Trash2,
  RefreshCw,
  CheckCircle2,
  Image as ImageIcon,
  Layers,
  Sparkles,
  ExternalLink,
  PhoneCall,
  Copy,
  UserCheck,
  Bell,
  BellOff,
  ChevronDown,
  Upload,
  LayoutTemplate,
} from 'lucide-react';
import { WhatsAppButton, StoreInfoConfig } from '../../types/dashboard.types';
import { TemplatePickerModal, BotCommandCategory } from '../modals/TemplatePickerModal';

interface MediaGalleryPickerProps {
  label: string;
  description: string;
  selectedPicture: string;
  onSelectPicture: (pic: string) => void;
  availablePictures: string[];
  setAvailablePictures: (pics: string[]) => void;
  showToast: (msg: string) => void;
}

const MediaGalleryPicker: React.FC<MediaGalleryPickerProps> = ({
  label,
  description,
  selectedPicture,
  onSelectPicture,
  availablePictures,
  setAvailablePictures,
  showToast,
}) => {
  const [isUploading, setIsUploading] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  const handleRefresh = async () => {
    try {
      const res = await fetch('/api/media/pictures');
      const data = await res.json();
      if (data.pictures) {
        setAvailablePictures(data.pictures);
        showToast('Daftar foto diperbarui');
      }
    } catch {
      showToast('Gagal memuat foto');
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!['image/jpeg', 'image/png', 'image/webp', 'image/jpg'].includes(file.type)) {
      showToast('Gunakan file gambar format JPG, PNG, atau WEBP');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      showToast('Ukuran foto maksimal 10 MB');
      return;
    }

    setIsUploading(true);
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64Data = reader.result as string;
        try {
          const res = await fetch('/api/media/upload', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              filename: file.name,
              data: base64Data,
            }),
          });
          const resData = await res.json();
          if (resData.success) {
            setAvailablePictures(resData.pictures);
            if (resData.filename) {
              onSelectPicture(resData.filename);
            }
            showToast('Foto berhasil diunggah!');
          } else {
            showToast(resData.error || 'Gagal mengunggah foto');
          }
        } catch {
          showToast('Koneksi upload gagal');
        } finally {
          setIsUploading(false);
          if (fileInputRef.current) fileInputRef.current.value = '';
        }
      };
      reader.readAsDataURL(file);
    } catch {
      setIsUploading(false);
      showToast('Gagal membaca file gambar');
    }
  };

  const handleDelete = async (pic: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setIsDeleting(pic);
    try {
      const res = await fetch(`/api/media/${encodeURIComponent(pic)}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        setAvailablePictures(data.pictures);
        if (selectedPicture === pic) {
          const nextPic = data.pictures.length > 0 ? data.pictures[0] : '';
          onSelectPicture(nextPic);
        }
        showToast('Foto berhasil dihapus');
      } else {
        showToast(data.error || 'Gagal menghapus foto');
      }
    } catch {
      showToast('Gagal menghapus foto');
    } finally {
      setIsDeleting(null);
    }
  };

  return (
    <div className="space-y-3.5 p-4 bg-slate-50/80 rounded-2xl border border-slate-200">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/jpg"
        onChange={handleFileChange}
        className="hidden"
      />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h4 className="text-xs font-bold text-slate-800">{label}</h4>
          <p className="text-[11px] text-slate-500">{description}</p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={handleRefresh}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-medium text-slate-600 hover:text-[#0084D1] bg-white rounded-lg border border-slate-200 hover:border-sky-300 transition-all cursor-pointer shadow-2xs active:scale-95"
          >
            <RefreshCw className="w-3 h-3" />
            <span>Refresh</span>
          </button>

          <button
            type="button"
            disabled={isUploading}
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold text-white bg-[#0084D1] hover:bg-[#0073b7] rounded-lg transition-all cursor-pointer shadow-xs disabled:opacity-50 active:scale-95"
          >
            {isUploading ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Upload className="w-3.5 h-3.5" />
            )}
            <span>{isUploading ? 'Mengunggah...' : 'Upload Foto Baru'}</span>
          </button>
        </div>
      </div>

      {/* Grid Galeri Foto Tenant */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 pt-1">
        {/* Card Tombol Upload Cepat */}
        <button
          type="button"
          disabled={isUploading}
          onClick={() => fileInputRef.current?.click()}
          className="group flex flex-col items-center justify-center p-3 rounded-xl border-2 border-dashed border-slate-300 hover:border-[#0084D1] bg-white/70 hover:bg-sky-50/50 transition-all cursor-pointer min-h-[110px] active:scale-[0.98]"
        >
          <div className="w-8 h-8 rounded-full bg-slate-100 group-hover:bg-sky-100 flex items-center justify-center text-slate-500 group-hover:text-[#0084D1] mb-1.5 transition">
            {isUploading ? (
              <RefreshCw className="w-4 h-4 animate-spin text-[#0084D1]" />
            ) : (
              <Plus className="w-4 h-4" />
            )}
          </div>
          <span className="text-[11px] font-semibold text-slate-700 group-hover:text-[#0084D1] text-center leading-tight">
            {isUploading ? 'Proses...' : 'Upload Foto'}
          </span>
          <span className="text-[9px] text-slate-400 mt-0.5">JPG, PNG, WEBP</span>
        </button>

        {/* Daftar Foto */}
        {availablePictures.map((pic) => {
          const isSelected = selectedPicture === pic;
          return (
            <div
              key={pic}
              onClick={() => onSelectPicture(pic)}
              className={`group relative rounded-xl border overflow-hidden cursor-pointer transition flex flex-col bg-white min-h-[110px] ${
                isSelected
                  ? 'border-[#0084D1] ring-2 ring-[#0084D1]/20 shadow-xs'
                  : 'border-slate-200 hover:border-slate-300 hover:shadow-2xs'
              }`}
            >
              {/* Thumbnail Image */}
              <div className="relative w-full h-20 bg-slate-100 overflow-hidden">
                <img
                  src={`/api/media/view?name=${encodeURIComponent(pic)}`}
                  alt={pic}
                  loading="lazy"
                  className="w-full h-full object-cover transition group-hover:scale-105"
                />

                {/* Badge Terpilih */}
                {isSelected && (
                  <div className="absolute top-1.5 left-1.5 bg-[#0084D1] text-white p-1 rounded-md shadow-xs">
                    <Check className="w-3 h-3 stroke-[3]" />
                  </div>
                )}

                {/* Tombol Hapus */}
                <button
                  type="button"
                  title="Hapus foto ini"
                  disabled={isDeleting === pic}
                  onClick={(e) => handleDelete(pic, e)}
                  className="absolute top-1.5 right-1.5 p-1 rounded-md bg-white/90 hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition shadow-xs opacity-0 group-hover:opacity-100 cursor-pointer"
                >
                  {isDeleting === pic ? (
                    <RefreshCw className="w-3 h-3 animate-spin text-rose-600" />
                  ) : (
                    <Trash2 className="w-3 h-3" />
                  )}
                </button>
              </div>

              {/* Caption Nama File */}
              <div className="p-1.5 text-center bg-white border-t border-slate-100">
                <p className="text-[10px] font-mono text-slate-600 truncate max-w-full">
                  {pic}
                </p>
                {isSelected && (
                  <span className="text-[9px] font-semibold text-[#0084D1] block -mt-0.5">
                    Aktif
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {availablePictures.length === 0 && (
        <div className="text-center py-4 bg-white rounded-xl border border-dashed border-slate-200">
          <ImageIcon className="w-6 h-6 text-slate-300 mx-auto mb-1" />
          <p className="text-xs text-slate-500 font-medium">Belum ada foto yang diunggah.</p>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Klik tombol Upload Foto di atas untuk menambahkan foto promosi toko Anda.
          </p>
        </div>
      )}
    </div>
  );
};


interface TabCommandProps {
  selectedCommand: 'Menu' | 'List' | 'Carousel' | 'Invoice' | 'Confirmation';
  setSelectedCommand: (cmd: 'Menu' | 'List' | 'Carousel' | 'Invoice' | 'Confirmation') => void;
  // Menu Props
  menuOutputText: string;
  setMenuOutputText: (txt: string) => void;
  menuFooterText: string;
  setMenuFooterText: React.Dispatch<React.SetStateAction<string>>;
  includeMedia: boolean;
  setIncludeMedia: (val: boolean) => void;
  selectedPicture: string;
  setSelectedPicture: (pic: string) => void;
  availablePictures: string[];
  setAvailablePictures: (pics: string[]) => void;
  menuButtons: WhatsAppButton[];
  onOpenAddButtonModal: () => void;
  onEditButton: (btn: WhatsAppButton) => void;
  onDeleteButton: (id: string) => void;
  onSaveMenu: () => void;
  // List Props
  listOutputText: string;
  setListOutputText: (txt: string) => void;
  listFooterText: string;
  setListFooterText: React.Dispatch<React.SetStateAction<string>>;
  onSaveList: () => void;
  // Carousel Props
  carouselOutputText: string;
  setCarouselOutputText: (txt: string) => void;
  carouselFooterText: string;
  setCarouselFooterText: React.Dispatch<React.SetStateAction<string>>;
  carouselPicture: string;
  setCarouselPicture: (pic: string) => void;
  onSaveCarousel: () => void;
  // Invoice Props
  invoiceOutputText: string;
  setInvoiceOutputText: (txt: string) => void;
  invoiceFooterText: string;
  setInvoiceFooterText: React.Dispatch<React.SetStateAction<string>>;
  onSaveInvoice: () => void;
  // Confirmation (Checkout Promo) Props
  confirmSummaryText: string;
  setConfirmSummaryText: (txt: string) => void;
  confirmInputPromoText: string;
  setConfirmInputPromoText: (txt: string) => void;
  confirmPromoSuccessText: string;
  setConfirmPromoSuccessText: (txt: string) => void;
  confirmPromoInvalidText: string;
  setConfirmPromoInvalidText: (txt: string) => void;
  confirmFooterText: string;
  setConfirmFooterText: React.Dispatch<React.SetStateAction<string>>;
  onSaveConfirmation: () => void;
  // General Props
  storeInfo: StoreInfoConfig;
  isSavingConfig: boolean;
  showToast: (msg: string) => void;
}

const COMMAND_TABS: Array<{ id: 'Menu' | 'List' | 'Carousel' | 'Invoice' | 'Confirmation'; label: string; desc: string }> = [
  { id: 'Menu', label: 'Menu', desc: 'Respon awal bot' },
  { id: 'List', label: 'List', desc: 'Daftar katalog produk' },
  { id: 'Carousel', label: 'Carousel', desc: 'Kartu varian produk' },
  { id: 'Invoice', label: 'Invoice', desc: 'Tagihan QRIS otomatis' },
  { id: 'Confirmation', label: 'Konfirmasi', desc: 'Ringkasan & promo checkout' },
];

export const TabCommand: React.FC<TabCommandProps> = ({
  selectedCommand,
  setSelectedCommand,
  menuOutputText,
  setMenuOutputText,
  menuFooterText,
  setMenuFooterText,
  includeMedia,
  setIncludeMedia,
  selectedPicture,
  setSelectedPicture,
  availablePictures,
  setAvailablePictures,
  menuButtons,
  onOpenAddButtonModal,
  onEditButton,
  onDeleteButton,
  onSaveMenu,
  listOutputText,
  setListOutputText,
  listFooterText,
  setListFooterText,
  onSaveList,
  carouselOutputText,
  setCarouselOutputText,
  carouselFooterText,
  setCarouselFooterText,
  carouselPicture,
  setCarouselPicture,
  onSaveCarousel,
  invoiceOutputText,
  setInvoiceOutputText,
  invoiceFooterText,
  setInvoiceFooterText,
  onSaveInvoice,
  confirmSummaryText,
  setConfirmSummaryText,
  confirmInputPromoText,
  setConfirmInputPromoText,
  confirmPromoSuccessText,
  setConfirmPromoSuccessText,
  confirmPromoInvalidText,
  setConfirmPromoInvalidText,
  confirmFooterText,
  setConfirmFooterText,
  onSaveConfirmation,
  isSavingConfig,
  showToast,
}) => {
  const insertTag = (
    tag: string,
    getter: string,
    setter: (val: string) => void,
    toastMsg?: string
  ) => {
    setter(`${getter} ${tag}`);
    showToast(toastMsg || `Tag ${tag} disisipkan`);
  };

  // State Template Picker Modal
  const [pickerState, setPickerState] = React.useState<{
    isOpen: boolean;
    category: BotCommandCategory;
    categoryLabel: string;
    currentContent: string;
    onSelect: (content: string) => void;
  }>({
    isOpen: false,
    category: 'menu',
    categoryLabel: 'Menu',
    currentContent: '',
    onSelect: () => {},
  });

  const openTemplatePicker = (
    category: BotCommandCategory,
    categoryLabel: string,
    currentContent: string,
    onSelect: (content: string) => void
  ) => {
    setPickerState({
      isOpen: true,
      category,
      categoryLabel,
      currentContent,
      onSelect,
    });
  };

  const getButtonTypeBadge = (btn: WhatsAppButton) => {
    switch (btn.type) {
      case 'cta_url':
        return {
          label: 'CTA Link',
          icon: <ExternalLink className="w-3 h-3 text-[#0084D1]" />,
          color: 'bg-sky-50 text-[#0084D1] border-sky-200',
        };
      case 'cta_copy':
        return {
          label: 'CTA Salin',
          icon: <Copy className="w-3 h-3 text-purple-600" />,
          color: 'bg-purple-50 text-purple-700 border-purple-200',
        };
      case 'vcard':
      case 'cta_call':
        return {
          label: 'Kontak',
          icon: <UserCheck className="w-3 h-3 text-emerald-600" />,
          color: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        };
      case 'cta_reminder':
        return {
          label: 'Reminder',
          icon: <Bell className="w-3 h-3 text-amber-600" />,
          color: 'bg-amber-50 text-amber-700 border-amber-200',
        };
      case 'cta_cancel_reminder':
        return {
          label: 'Batal Reminder',
          icon: <BellOff className="w-3 h-3 text-rose-600" />,
          color: 'bg-rose-50 text-rose-700 border-rose-200',
        };
      case 'quick_reply':
      default:
        return {
          label: 'Quick Reply',
          icon: <PhoneCall className="w-3 h-3 text-slate-600" />,
          color: 'bg-slate-100 text-slate-700 border-slate-200',
        };
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Minimalist Tab Bar */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-slate-900 tracking-tight">Respon Bot</h2>
          <p className="text-xs text-slate-500 mt-0.5">Pilih format pesan otomatis yang ingin diedit.</p>
        </div>

        {/* Sub-Tab Segmented Switcher with mobile horizontal scroll */}
        <div className="w-full md:w-auto max-w-full overflow-x-auto scrollbar-none flex items-center gap-1 p-1 bg-slate-100/90 rounded-xl border border-slate-200/80">
          {COMMAND_TABS.map((tab) => {
            const isActive = selectedCommand === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setSelectedCommand(tab.id)}
                className={`shrink-0 whitespace-nowrap px-3.5 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer active:scale-[0.97] ${
                  isActive
                    ? 'bg-[#0084D1] text-white shadow-xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* COMMAND: MENU */}
      {selectedCommand === 'Menu' && (
        <div className="space-y-5">
          <div className="bg-white border border-slate-200/80 rounded-2xl p-5 sm:p-6 shadow-xs space-y-5">
            {/* Output Text */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-800">
                  Teks Pesan Menu
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => openTemplatePicker('menu', 'Command Menu', menuOutputText, setMenuOutputText)}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-sky-50 hover:bg-[#0084D1] text-[#0084D1] hover:text-white border border-sky-200 hover:border-transparent text-xs font-semibold transition-all shadow-2xs cursor-pointer active:scale-95"
                    title="Pilih Template Resmi untuk Command Menu"
                  >
                    <LayoutTemplate className="w-3.5 h-3.5" />
                    <span>Pilih Template</span>
                  </button>
                  <span className="text-[11px] font-mono text-slate-400">Prefix: / . ! #</span>
                </div>
              </div>

              {/* Tag Chips */}
              <div className="flex flex-wrap items-center gap-1.5 py-1">
                {['{storeName}', '{ownerName}', '{ownerNumber}', '{adminNumber}', '{webLink}', '{waLink}'].map((ph) => (
                  <button
                    key={ph}
                    type="button"
                    onClick={() => insertTag(ph, menuOutputText, setMenuOutputText)}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-mono bg-slate-50 text-slate-700 hover:bg-sky-50 hover:text-[#0084D1] border border-slate-200 hover:border-sky-300 transition cursor-pointer"
                  >
                    <Plus className="w-3 h-3 text-[#0084D1]" />
                    <span>{ph}</span>
                  </button>
                ))}
              </div>

              <textarea
                rows={5}
                value={menuOutputText}
                onChange={(e) => setMenuOutputText(e.target.value)}
                placeholder="Ketik teks pesan menu..."
                className="w-full bg-slate-50/60 border border-slate-200 rounded-xl p-3.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-[#0084D1] focus:ring-2 focus:ring-[#0084D1]/15 transition font-sans leading-relaxed"
              />
            </div>

            {/* Footer Text */}
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <label className="text-xs font-semibold text-slate-800 block">
                Teks Footer
              </label>

              <div className="flex flex-wrap items-center gap-1.5 py-0.5">
                {['{webLink}', '{storeName}', '{ownerNumber}', '{adminNumber}'].map((ph) => (
                  <button
                    key={ph}
                    type="button"
                    onClick={() => insertTag(ph, menuFooterText, setMenuFooterText)}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono bg-slate-50 text-slate-600 hover:text-[#0084D1] border border-slate-200 hover:border-sky-300 transition cursor-pointer"
                  >
                    <Plus className="w-2.5 h-2.5 text-[#0084D1]" />
                    <span>{ph}</span>
                  </button>
                ))}
              </div>

              <input
                type="text"
                value={menuFooterText}
                onChange={(e) => setMenuFooterText(e.target.value)}
                placeholder="{webLink} (opsional)"
                className="w-full bg-slate-50/60 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 font-mono placeholder-slate-400 focus:outline-none focus:bg-white focus:border-[#0084D1] focus:ring-2 focus:ring-[#0084D1]/15 transition"
              />
            </div>

            {/* Media Image Header Option */}
            <div className="pt-2 border-t border-slate-100 space-y-3">
              <label className="inline-flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeMedia}
                  onChange={(e) => setIncludeMedia(e.target.checked)}
                  className="w-4 h-4 text-[#0084D1] rounded border-slate-300 focus:ring-[#0084D1]"
                />
                <span className="text-xs font-semibold text-slate-800">Sertakan gambar header</span>
              </label>

              {includeMedia && (
                <MediaGalleryPicker
                  label="Galeri Foto Header Menu"
                  description="Pilih atau unggah foto promosi yang akan tampil di atas pesan menu WhatsApp."
                  selectedPicture={selectedPicture}
                  onSelectPicture={setSelectedPicture}
                  availablePictures={availablePictures}
                  setAvailablePictures={setAvailablePictures}
                  showToast={showToast}
                />
              )}
            </div>

            {/* Interactive WhatsApp Buttons */}
            <div className="pt-2 border-t border-slate-100 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-semibold text-slate-800">
                    Tombol Interaktif ({menuButtons.length})
                  </h3>
                  <p className="text-[11px] text-slate-400">Tombol aksi yang disertakan pada pesan menu.</p>
                </div>
                <button
                  type="button"
                  onClick={onOpenAddButtonModal}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-white bg-[#0084D1] hover:bg-[#0073b7] transition cursor-pointer shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Tambah Tombol
                </button>
              </div>

              {menuButtons.length === 0 ? (
                <div className="border border-dashed border-slate-200 rounded-xl p-6 text-center text-xs text-slate-400">
                  Belum ada tombol interaktif. Klik Tambah Tombol di atas untuk membuat.
                </div>
              ) : (
                <div className="space-y-2">
                  {menuButtons.map((btn, index) => {
                    const badge = getButtonTypeBadge(btn);
                    return (
                      <div
                        key={btn.id}
                        className="flex items-center justify-between p-3 rounded-xl border border-slate-200/90 bg-white hover:border-slate-300 transition shadow-2xs gap-3"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="w-5 h-5 rounded-md bg-slate-100 text-slate-600 flex items-center justify-center font-mono text-[11px] font-semibold shrink-0">
                            {index + 1}
                          </span>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs font-medium text-slate-900 truncate">
                                {btn.name}
                              </span>
                              <span
                                className={`inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded border ${badge.color}`}
                              >
                                {badge.icon}
                                {badge.label}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-400 font-mono truncate mt-0.5">
                              {btn.output}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => onEditButton(btn)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-[#0084D1] hover:bg-sky-50 transition cursor-pointer"
                            title="Edit tombol"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onDeleteButton(btn.id)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                            title="Hapus tombol"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Save Menu Bar */}
            <div className="pt-3 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                disabled={isSavingConfig}
                onClick={() => onSaveMenu()}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#0084D1] hover:bg-[#0073b7] active:scale-[0.98] text-white text-xs font-semibold shadow-xs transition-all disabled:opacity-50 cursor-pointer"
              >
                {isSavingConfig ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Check className="w-3.5 h-3.5" />
                )}
                Simpan Menu
              </button>
            </div>
          </div>
        </div>
      )}

      {/* COMMAND: LIST */}
      {selectedCommand === 'List' && (
        <div className="space-y-5">
          <div className="bg-white border border-slate-200/80 rounded-2xl p-5 sm:p-6 shadow-xs space-y-5">
            {/* Output Text */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-800">
                  Teks Pesan List Katalog
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => openTemplatePicker('list', 'Command List', listOutputText, setListOutputText)}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-sky-50 hover:bg-[#0084D1] text-[#0084D1] hover:text-white border border-sky-200 hover:border-transparent text-xs font-semibold transition-all shadow-2xs cursor-pointer active:scale-95"
                    title="Pilih Template Resmi untuk Command List"
                  >
                    <LayoutTemplate className="w-3.5 h-3.5" />
                    <span>Pilih Template</span>
                  </button>
                  <span className="text-[11px] font-mono text-slate-400">Prefix: / . ! #</span>
                </div>
              </div>

              {/* Tag Chips */}
              <div className="flex flex-wrap items-center gap-1.5 py-1">
                {['{storeName}', '{daftarProduk}', '{ownerName}', '{webLink}', '{adminNumber}', '{waLink}'].map((ph) => (
                  <button
                    key={ph}
                    type="button"
                    onClick={() => insertTag(ph, listOutputText, setListOutputText)}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-mono bg-slate-50 text-slate-700 hover:bg-sky-50 hover:text-[#0084D1] border border-slate-200 hover:border-sky-300 transition cursor-pointer"
                  >
                    <Plus className="w-3 h-3 text-[#0084D1]" />
                    <span>{ph}</span>
                  </button>
                ))}
              </div>

              <textarea
                rows={6}
                value={listOutputText}
                onChange={(e) => setListOutputText(e.target.value)}
                placeholder="Silakan pilih produk:\n\n{daftarProduk}"
                className="w-full bg-slate-50/60 border border-slate-200 rounded-xl p-3.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-[#0084D1] focus:ring-2 focus:ring-[#0084D1]/15 transition font-sans leading-relaxed"
              />
              <p className="text-[11px] text-slate-400">
                Tag <code className="text-slate-700 bg-slate-100 px-1 py-0.5 rounded font-mono font-medium">{'{daftarProduk}'}</code> otomatis memuat katalog rapi per kategori.
              </p>
            </div>

            {/* Footer Text */}
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <label className="text-xs font-semibold text-slate-800 block">
                Teks Footer
              </label>

              <div className="flex flex-wrap items-center gap-1.5 py-0.5">
                {['{webLink}', '{storeName}', '{ownerNumber}', '{adminNumber}'].map((ph) => (
                  <button
                    key={ph}
                    type="button"
                    onClick={() => insertTag(ph, listFooterText, setListFooterText)}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono bg-slate-50 text-slate-600 hover:text-[#0084D1] border border-slate-200 hover:border-sky-300 transition cursor-pointer"
                  >
                    <Plus className="w-2.5 h-2.5 text-[#0084D1]" />
                    <span>{ph}</span>
                  </button>
                ))}
              </div>

              <input
                type="text"
                value={listFooterText}
                onChange={(e) => setListFooterText(e.target.value)}
                placeholder="{webLink} (opsional)"
                className="w-full bg-slate-50/60 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 font-mono placeholder-slate-400 focus:outline-none focus:bg-white focus:border-[#0084D1] focus:ring-2 focus:ring-[#0084D1]/15 transition"
              />
            </div>

            {/* Save List Bar */}
            <div className="pt-3 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                disabled={isSavingConfig}
                onClick={() => onSaveList()}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#0084D1] hover:bg-[#0073b7] active:scale-[0.98] text-white text-xs font-semibold shadow-xs transition-all disabled:opacity-50 cursor-pointer"
              >
                {isSavingConfig ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Check className="w-3.5 h-3.5" />
                )}
                Simpan List
              </button>
            </div>
          </div>
        </div>
      )}

      {/* COMMAND: CAROUSEL */}
      {selectedCommand === 'Carousel' && (
        <div className="space-y-5">
          <div className="bg-white border border-slate-200/80 rounded-2xl p-5 sm:p-6 shadow-xs space-y-5">
            {/* Header Image for Carousel */}
            <MediaGalleryPicker
              label="Gambar Header Kartu Carousel"
              description="Pilih atau unggah foto promosi yang akan tampil di atas kartu varian produk WhatsApp."
              selectedPicture={carouselPicture}
              onSelectPicture={setCarouselPicture}
              availablePictures={availablePictures}
              setAvailablePictures={setAvailablePictures}
              showToast={showToast}
            />

            {/* Template Output Text */}
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-800">
                  Template Teks Kartu
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => openTemplatePicker('carousel', 'Command Carousel', carouselOutputText, setCarouselOutputText)}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-sky-50 hover:bg-[#0084D1] text-[#0084D1] hover:text-white border border-sky-200 hover:border-transparent text-xs font-semibold transition-all shadow-2xs cursor-pointer active:scale-95"
                    title="Pilih Template Resmi untuk Command Carousel"
                  >
                    <LayoutTemplate className="w-3.5 h-3.5" />
                    <span>Pilih Template</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const defaultVal = `*{storeName}*\n\n*{produkName} | {category}*\n\n*Detail Produk:*\n- Varian: {varian}\n- Harga: {price}\n- Stok: {stock} tersedia\n\nSilakan pilih tindakan di bawah ini untuk melanjutkan.`;
                      setCarouselOutputText(defaultVal);
                      showToast('Template direset ke default');
                    }}
                    className="text-[11px] text-slate-500 hover:text-slate-800 underline cursor-pointer"
                  >
                    Reset Default
                  </button>
                </div>
              </div>

              {/* Tag Chips */}
              <div className="flex flex-wrap items-center gap-1.5 py-1">
                {[
                  '{storeName}',
                  '{produkName}',
                  '{category}',
                  '{varian}',
                  '{price}',
                  '{stock}',
                  '{adminNumber}',
                  '{ownerNumber}',
                  '{webLink}',
                ].map((ph) => (
                  <button
                    key={ph}
                    type="button"
                    onClick={() => insertTag(ph, carouselOutputText, setCarouselOutputText)}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-mono bg-slate-50 text-slate-700 hover:bg-sky-50 hover:text-[#0084D1] border border-slate-200 hover:border-sky-300 transition cursor-pointer"
                  >
                    <Plus className="w-3 h-3 text-[#0084D1]" />
                    <span>{ph}</span>
                  </button>
                ))}
              </div>

              <textarea
                rows={6}
                value={carouselOutputText}
                onChange={(e) => setCarouselOutputText(e.target.value)}
                placeholder="Tulis template kartu carousel..."
                className="w-full bg-slate-50/60 border border-slate-200 rounded-xl p-3.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-[#0084D1] focus:ring-2 focus:ring-[#0084D1]/15 transition font-mono leading-relaxed"
              />
            </div>

            {/* Footer Text */}
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <label className="text-xs font-semibold text-slate-800 block">
                Teks Footer
              </label>

              <div className="flex flex-wrap items-center gap-1.5 py-0.5">
                {['{storeName}', '{webLink}', '{ownerNumber}', '{adminNumber}'].map((ph) => (
                  <button
                    key={ph}
                    type="button"
                    onClick={() => insertTag(ph, carouselFooterText, setCarouselFooterText)}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono bg-slate-50 text-slate-600 hover:text-[#0084D1] border border-slate-200 hover:border-sky-300 transition cursor-pointer"
                  >
                    <Plus className="w-2.5 h-2.5 text-[#0084D1]" />
                    <span>{ph}</span>
                  </button>
                ))}
              </div>

              <input
                type="text"
                value={carouselFooterText}
                onChange={(e) => setCarouselFooterText(e.target.value)}
                placeholder="{storeName} Official"
                className="w-full bg-slate-50/60 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 font-mono placeholder-slate-400 focus:outline-none focus:bg-white focus:border-[#0084D1] focus:ring-2 focus:ring-[#0084D1]/15 transition"
              />
            </div>

            {/* Save Carousel Bar */}
            <div className="pt-3 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                disabled={isSavingConfig}
                onClick={() => onSaveCarousel()}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#0084D1] hover:bg-[#0073b7] active:scale-[0.98] text-white text-xs font-semibold shadow-xs transition-all disabled:opacity-50 cursor-pointer"
              >
                {isSavingConfig ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Check className="w-3.5 h-3.5" />
                )}
                Simpan Carousel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* COMMAND: INVOICE */}
      {selectedCommand === 'Invoice' && (
        <div className="space-y-5">
          <div className="bg-white border border-slate-200/80 rounded-2xl p-5 sm:p-6 shadow-xs space-y-5">
            {/* Output Text */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-800">
                  Template Teks Tagihan Invoice
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => openTemplatePicker('invoice', 'Invoice Pembayaran', invoiceOutputText, setInvoiceOutputText)}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-sky-50 hover:bg-[#0084D1] text-[#0084D1] hover:text-white border border-sky-200 hover:border-transparent text-xs font-semibold transition-all shadow-2xs cursor-pointer active:scale-95"
                    title="Pilih Template Resmi untuk Invoice Pembayaran"
                  >
                    <LayoutTemplate className="w-3.5 h-3.5" />
                    <span>Pilih Template</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const defaultVal = `*INVOICE PEMBAYARAN*\n*{storeName}*\n\nProduk: {produkName}\nVarian: {varian}\nOrder ID: \`{orderId}\`\n\nHarga: Rp {price}\nFee: +Rp {unikCode}\n*TOTAL BAYAR: Rp {total}*\n\nTransfer tepat *Rp {total}* hingga digit terakhir agar otomatis terverifikasi.\nBatas Waktu: 15 Menit.`;
                      setInvoiceOutputText(defaultVal);
                      showToast('Template invoice direset ke default');
                    }}
                    className="text-[11px] text-slate-500 hover:text-slate-800 underline cursor-pointer"
                  >
                    Reset Default
                  </button>
                </div>
              </div>

              {/* Tag Chips */}
              <div className="space-y-1.5 py-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  {[
                    '{storeName}',
                    '{produkName}',
                    '{category}',
                    '{varian}',
                    '{price}',
                    '{adminNumber}',
                    '{webLink}',
                  ].map((ph) => (
                    <button
                      key={ph}
                      type="button"
                      onClick={() => insertTag(ph, invoiceOutputText, setInvoiceOutputText)}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-mono bg-slate-50 text-slate-700 hover:bg-sky-50 hover:text-[#0084D1] border border-slate-200 hover:border-sky-300 transition cursor-pointer"
                    >
                      <Plus className="w-3 h-3 text-[#0084D1]" />
                      <span>{ph}</span>
                    </button>
                  ))}
                </div>

                <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                  {['{orderId}', '{total}', '{unikCode}'].map((ph) => (
                    <button
                      key={ph}
                      type="button"
                      onClick={() => insertTag(ph, invoiceOutputText, setInvoiceOutputText)}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-mono font-medium bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200 transition cursor-pointer"
                    >
                      <Plus className="w-3 h-3 text-amber-600" />
                      <span>{ph}</span>
                    </button>
                  ))}
                </div>
              </div>

              <textarea
                rows={7}
                value={invoiceOutputText}
                onChange={(e) => setInvoiceOutputText(e.target.value)}
                placeholder="Tulis template invoice di sini..."
                className="w-full bg-slate-50/60 border border-slate-200 rounded-xl p-3.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-[#0084D1] focus:ring-2 focus:ring-[#0084D1]/15 transition font-mono leading-relaxed"
              />
            </div>

            {/* Footer Text */}
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <label className="text-xs font-semibold text-slate-800 block">
                Teks Footer
              </label>

              <div className="flex flex-wrap items-center gap-1.5 py-0.5">
                {['{storeName}', '{webLink}', '{ownerNumber}', '{adminNumber}'].map((ph) => (
                  <button
                    key={ph}
                    type="button"
                    onClick={() => insertTag(ph, invoiceFooterText, setInvoiceFooterText)}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono bg-slate-50 text-slate-600 hover:text-[#0084D1] border border-slate-200 hover:border-sky-300 transition cursor-pointer"
                  >
                    <Plus className="w-2.5 h-2.5 text-[#0084D1]" />
                    <span>{ph}</span>
                  </button>
                ))}
              </div>

              <input
                type="text"
                value={invoiceFooterText}
                onChange={(e) => setInvoiceFooterText(e.target.value)}
                placeholder="{storeName} Official"
                className="w-full bg-slate-50/60 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 font-mono placeholder-slate-400 focus:outline-none focus:bg-white focus:border-[#0084D1] focus:ring-2 focus:ring-[#0084D1]/15 transition"
              />
            </div>

            {/* Save Invoice Bar */}
            <div className="pt-3 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                disabled={isSavingConfig}
                onClick={() => onSaveInvoice()}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#0084D1] hover:bg-[#0073b7] active:scale-[0.98] text-white text-xs font-semibold shadow-xs transition-all disabled:opacity-50 cursor-pointer"
              >
                {isSavingConfig ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Check className="w-3.5 h-3.5" />
                )}
                Simpan Invoice
              </button>
            </div>
          </div>
        </div>
      )}

      {/* COMMAND: CONFIRMATION (RINGKASAN & KODE PROMO CHECKOUT) */}
      {selectedCommand === 'Confirmation' && (
        <div className="space-y-5">
          <div className="bg-white border border-slate-200/80 rounded-2xl p-5 sm:p-6 shadow-xs space-y-6">
            <div>
              <h3 className="text-sm font-bold text-slate-800">Pengaturan Konfirmasi Checkout & Kupon Promo</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Atur pesan interaktif yang dikirim ke DM pembeli saat memilih varian produk, meminta input kupon diskon, serta respon validasi kupon.
              </p>
            </div>

            {/* 1. Form Ringkasan Pesanan (Order Summary) */}
            <div className="space-y-2 pt-1 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-xs font-semibold text-slate-800">
                    1. Template Ringkasan Pesanan (Order Summary)
                  </label>
                  <p className="text-[11px] text-slate-500">Pesan awal di DM saat pembeli klik tombol Order di Carousel.</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => openTemplatePicker('confirm_summary', 'Ringkasan Pesanan', confirmSummaryText, setConfirmSummaryText)}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-sky-50 hover:bg-[#0084D1] text-[#0084D1] hover:text-white border border-sky-200 hover:border-transparent text-xs font-semibold transition-all shadow-2xs cursor-pointer active:scale-95"
                    title="Pilih Template Resmi untuk Konfirmasi Ringkasan Pesanan"
                  >
                    <LayoutTemplate className="w-3.5 h-3.5" />
                    <span>Pilih Template</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const defaultVal = `🛒 *RINCIAN PESANAN*\nHalo kak, silakan konfirmasi pesanan Anda:\n\n• *Produk:* {produkName}\n• *Varian:* {varian}\n• *Harga Normal:* Rp {price}\n\nPunya kode promo? Silakan pilih tombol di bawah untuk menggunakan diskon atau langsung bayar.`;
                      setConfirmSummaryText(defaultVal);
                      showToast('Ringkasan pesanan direset ke default');
                    }}
                    className="text-[11px] text-slate-500 hover:text-slate-800 underline cursor-pointer"
                  >
                    Reset Default
                  </button>
                </div>
              </div>

              {/* Tag Chips */}
              <div className="flex flex-wrap items-center gap-1.5 py-1">
                {['{storeName}', '{produkName}', '{varian}', '{price}', '{adminNumber}', '{webLink}'].map((ph) => (
                  <button
                    key={ph}
                    type="button"
                    onClick={() => insertTag(ph, confirmSummaryText, setConfirmSummaryText)}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-mono bg-slate-50 text-slate-700 hover:bg-sky-50 hover:text-[#0084D1] border border-slate-200 hover:border-sky-300 transition cursor-pointer"
                  >
                    <Plus className="w-3 h-3 text-[#0084D1]" />
                    <span>{ph}</span>
                  </button>
                ))}
              </div>

              <textarea
                rows={5}
                value={confirmSummaryText}
                onChange={(e) => setConfirmSummaryText(e.target.value)}
                placeholder="Tulis template ringkasan pesanan di sini..."
                className="w-full bg-slate-50/60 border border-slate-200 rounded-xl p-3.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-[#0084D1] focus:ring-2 focus:ring-[#0084D1]/15 transition font-mono leading-relaxed"
              />
            </div>

            {/* 2. Form Permintaan Input Kode Promo */}
            <div className="space-y-2 pt-3 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-xs font-semibold text-slate-800">
                    2. Template Permintaan Input Kode Promo
                  </label>
                  <p className="text-[11px] text-slate-500">Pesan instruksi saat pembeli menekan tombol Pakai Kode Promo (waktu tunggu 90 detik).</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => openTemplatePicker('confirm_promo_input', 'Input Kode Promo', confirmInputPromoText, setConfirmInputPromoText)}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-sky-50 hover:bg-[#0084D1] text-[#0084D1] hover:text-white border border-sky-200 hover:border-transparent text-xs font-semibold transition-all shadow-2xs cursor-pointer active:scale-95"
                    title="Pilih Template Resmi untuk Permintaan Input Promo"
                  >
                    <LayoutTemplate className="w-3.5 h-3.5" />
                    <span>Pilih Template</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const defaultVal = `🎟️ *MASUKKAN KODE PROMO*\nSilakan ketik kode promo Anda (contoh: HEMAT10) atau ketik *BATAL* untuk melanjutkan dengan harga normal.\n\n⏱️ _Batas waktu: 90 detik._`;
                      setConfirmInputPromoText(defaultVal);
                      showToast('Instruksi promo direset ke default');
                    }}
                    className="text-[11px] text-slate-500 hover:text-slate-800 underline cursor-pointer"
                  >
                    Reset Default
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-1.5 py-1">
                {['{storeName}', '{produkName}', '{varian}', '{price}'].map((ph) => (
                  <button
                    key={ph}
                    type="button"
                    onClick={() => insertTag(ph, confirmInputPromoText, setConfirmInputPromoText)}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-mono bg-slate-50 text-slate-700 hover:bg-sky-50 hover:text-[#0084D1] border border-slate-200 hover:border-sky-300 transition cursor-pointer"
                  >
                    <Plus className="w-3 h-3 text-[#0084D1]" />
                    <span>{ph}</span>
                  </button>
                ))}
              </div>

              <textarea
                rows={4}
                value={confirmInputPromoText}
                onChange={(e) => setConfirmInputPromoText(e.target.value)}
                placeholder="Tulis instruksi input kode promo di sini..."
                className="w-full bg-slate-50/60 border border-slate-200 rounded-xl p-3.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-[#0084D1] focus:ring-2 focus:ring-[#0084D1]/15 transition font-mono leading-relaxed"
              />
            </div>

            {/* 3. Form Pesan Jika Kode Promo VALID */}
            <div className="space-y-2 pt-3 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-xs font-semibold text-slate-800">
                    3. Template Pesan Jika Kode Promo Valid
                  </label>
                  <p className="text-[11px] text-slate-500">Pesan sukses potongan diskon sebelum invoice QRIS otomatis diterbitkan.</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => openTemplatePicker('confirm_promo_valid', 'Pesan Promo Valid', confirmPromoSuccessText, setConfirmPromoSuccessText)}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-sky-50 hover:bg-[#0084D1] text-[#0084D1] hover:text-white border border-sky-200 hover:border-transparent text-xs font-semibold transition-all shadow-2xs cursor-pointer active:scale-95"
                    title="Pilih Template Resmi untuk Pesan Promo Valid"
                  >
                    <LayoutTemplate className="w-3.5 h-3.5" />
                    <span>Pilih Template</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const defaultVal = `🎉 *KODE PROMO BERHASIL DIGUNAKAN!*\n• *Kode Promo:* {promoCode}\n• *Harga Awal:* Rp {price}\n• *Potongan Diskon:* -Rp {discount}\n• *Total Bayar:* Rp {finalPrice}\n\nInvoice pembayaran QRIS sedang diterbitkan...`;
                      setConfirmPromoSuccessText(defaultVal);
                      showToast('Template promo valid direset ke default');
                    }}
                    className="text-[11px] text-slate-500 hover:text-slate-800 underline cursor-pointer"
                  >
                    Reset Default
                  </button>
                </div>
              </div>

              {/* Tag Chips */}
              <div className="flex flex-wrap items-center gap-1.5 py-1">
                {['{storeName}', '{produkName}', '{varian}', '{price}'].map((ph) => (
                  <button
                    key={ph}
                    type="button"
                    onClick={() => insertTag(ph, confirmPromoSuccessText, setConfirmPromoSuccessText)}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-mono bg-slate-50 text-slate-700 hover:bg-sky-50 hover:text-[#0084D1] border border-slate-200 hover:border-sky-300 transition cursor-pointer"
                  >
                    <Plus className="w-3 h-3 text-[#0084D1]" />
                    <span>{ph}</span>
                  </button>
                ))}
                {['{promoCode}', '{discount}', '{finalPrice}'].map((ph) => (
                  <button
                    key={ph}
                    type="button"
                    onClick={() => insertTag(ph, confirmPromoSuccessText, setConfirmPromoSuccessText)}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-mono font-medium bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200 transition cursor-pointer"
                  >
                    <Plus className="w-3 h-3 text-emerald-600" />
                    <span>{ph}</span>
                  </button>
                ))}
              </div>

              <textarea
                rows={5}
                value={confirmPromoSuccessText}
                onChange={(e) => setConfirmPromoSuccessText(e.target.value)}
                placeholder="Tulis template pesan promo valid di sini..."
                className="w-full bg-slate-50/60 border border-slate-200 rounded-xl p-3.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-[#0084D1] focus:ring-2 focus:ring-[#0084D1]/15 transition font-mono leading-relaxed"
              />
            </div>

            {/* 4. Form Pesan Jika Kode Promo INVALID */}
            <div className="space-y-2 pt-3 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-xs font-semibold text-slate-800">
                    4. Template Pesan Jika Kode Promo Tidak Valid
                  </label>
                  <p className="text-[11px] text-slate-500">Pesan penolakan jika kode expired, habis kuota, salah ketik, atau tidak memenuhi syarat.</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => openTemplatePicker('confirm_promo_invalid', 'Pesan Promo Invalid', confirmPromoInvalidText, setConfirmPromoInvalidText)}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-sky-50 hover:bg-[#0084D1] text-[#0084D1] hover:text-white border border-sky-200 hover:border-transparent text-xs font-semibold transition-all shadow-2xs cursor-pointer active:scale-95"
                    title="Pilih Template Resmi untuk Pesan Promo Invalid"
                  >
                    <LayoutTemplate className="w-3.5 h-3.5" />
                    <span>Pilih Template</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const defaultVal = `⚠️ *KODE PROMO TIDAK DAPAT DIGUNAKAN*\nKode promo *{promoCode}* tidak dapat diterapkan.\nPenyebab: *{reason}*\n\nSilakan ketik kode promo lain, atau ketik *BATAL* untuk lanjut bayar harga normal (Rp {price}).`;
                      setConfirmPromoInvalidText(defaultVal);
                      showToast('Template promo invalid direset ke default');
                    }}
                    className="text-[11px] text-slate-500 hover:text-slate-800 underline cursor-pointer"
                  >
                    Reset Default
                  </button>
                </div>
              </div>

              {/* Tag Chips */}
              <div className="flex flex-wrap items-center gap-1.5 py-1">
                {['{storeName}', '{produkName}', '{varian}', '{price}'].map((ph) => (
                  <button
                    key={ph}
                    type="button"
                    onClick={() => insertTag(ph, confirmPromoInvalidText, setConfirmPromoInvalidText)}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-mono bg-slate-50 text-slate-700 hover:bg-sky-50 hover:text-[#0084D1] border border-slate-200 hover:border-sky-300 transition cursor-pointer"
                  >
                    <Plus className="w-3 h-3 text-[#0084D1]" />
                    <span>{ph}</span>
                  </button>
                ))}
                {['{promoCode}', '{reason}'].map((ph) => (
                  <button
                    key={ph}
                    type="button"
                    onClick={() => insertTag(ph, confirmPromoInvalidText, setConfirmPromoInvalidText)}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-mono font-medium bg-rose-50 text-rose-800 hover:bg-rose-100 border border-rose-200 transition cursor-pointer"
                  >
                    <Plus className="w-3 h-3 text-rose-600" />
                    <span>{ph}</span>
                  </button>
                ))}
              </div>

              <textarea
                rows={5}
                value={confirmPromoInvalidText}
                onChange={(e) => setConfirmPromoInvalidText(e.target.value)}
                placeholder="Tulis template pesan promo invalid di sini..."
                className="w-full bg-slate-50/60 border border-slate-200 rounded-xl p-3.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-[#0084D1] focus:ring-2 focus:ring-[#0084D1]/15 transition font-mono leading-relaxed"
              />
            </div>

            {/* 5. Teks Footer Konfirmasi */}
            <div className="space-y-2 pt-3 border-t border-slate-100">
              <label className="text-xs font-semibold text-slate-800 block">
                Teks Footer Pesan Konfirmasi
              </label>

              <div className="flex flex-wrap items-center gap-1.5 py-0.5">
                {['{storeName}', '{webLink}', '{ownerNumber}', '{adminNumber}'].map((ph) => (
                  <button
                    key={ph}
                    type="button"
                    onClick={() => insertTag(ph, confirmFooterText, setConfirmFooterText)}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono bg-slate-50 text-slate-600 hover:text-[#0084D1] border border-slate-200 hover:border-sky-300 transition cursor-pointer"
                  >
                    <Plus className="w-2.5 h-2.5 text-[#0084D1]" />
                    <span>{ph}</span>
                  </button>
                ))}
              </div>

              <input
                type="text"
                value={confirmFooterText}
                onChange={(e) => setConfirmFooterText(e.target.value)}
                placeholder="{storeName} • Konfirmasi Pesanan"
                className="w-full bg-slate-50/60 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 font-mono placeholder-slate-400 focus:outline-none focus:bg-white focus:border-[#0084D1] focus:ring-2 focus:ring-[#0084D1]/15 transition"
              />
            </div>

            {/* Save Confirmation Bar */}
            <div className="pt-3 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                disabled={isSavingConfig}
                onClick={() => onSaveConfirmation()}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#0084D1] hover:bg-[#0073b7] active:scale-[0.98] text-white text-xs font-semibold shadow-xs transition-all disabled:opacity-50 cursor-pointer"
              >
                {isSavingConfig ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Check className="w-3.5 h-3.5" />
                )}
                Simpan Konfirmasi
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Template Picker Modal */}
      <TemplatePickerModal
        isOpen={pickerState.isOpen}
        onClose={() => setPickerState((prev) => ({ ...prev, isOpen: false }))}
        category={pickerState.category}
        categoryLabel={pickerState.categoryLabel}
        currentContent={pickerState.currentContent}
        onSelectTemplate={pickerState.onSelect}
        showToast={showToast}
      />
    </div>
  );
};

