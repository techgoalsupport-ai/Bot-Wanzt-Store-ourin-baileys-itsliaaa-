import React, { useState } from 'react';
import {
  Store,
  User,
  Phone,
  Globe,
  Save,
  RefreshCw,
  CheckCircle2,
  Copy,
  Check,
  Send,
  MessageSquare,
  ShieldCheck,
  ExternalLink,
  Info,
  Layers,
} from 'lucide-react';
import { StoreInfoConfig } from '../../types/dashboard.types';
import { toDisplayPhone, toOfficialPhone, formatOfficialDisplay } from '../../utils/phoneUtils';

interface TabStoreInfoProps {
  storeInfo: StoreInfoConfig;
  setStoreInfo: (val: StoreInfoConfig) => void;
  isSavingConfig: boolean;
  onSave: (data?: StoreInfoConfig) => void;
  showToast: (msg: string) => void;
}

export const TabStoreInfo: React.FC<TabStoreInfoProps> = ({
  storeInfo,
  setStoreInfo,
  isSavingConfig,
  onSave,
  showToast,
}) => {
  const [formData, setFormData] = useState<StoreInfoConfig>(storeInfo);

  React.useEffect(() => {
    if (storeInfo) setFormData(storeInfo);
  }, [storeInfo]);

  const [copiedTag, setCopiedTag] = useState<string | null>(null);

  const handleCopyTag = (tag: string, label: string) => {
    navigator.clipboard.writeText(tag);
    setCopiedTag(tag);
    showToast(`Placeholder ${tag} (${label}) disalin`);
    setTimeout(() => setCopiedTag(null), 2000);
  };

  const handleSave = () => {
    const toSave: StoreInfoConfig = {
      ...formData,
      ownerNumber: formData.ownerNumber ? toOfficialPhone(formData.ownerNumber) : '',
      adminNumber: formData.adminNumber ? toOfficialPhone(formData.adminNumber) : '',
    };
    setFormData(toSave);
    setStoreInfo(toSave);
    onSave(toSave);
    showToast('Informasi profil toko berhasil disimpan!');
  };

  // Hitung tingkat kelengkapan profil (3 field wajib + 5 opsional)
  const requiredFields = [
    Boolean(formData.storeName?.trim()),
    Boolean(formData.ownerName?.trim()),
    Boolean(formData.ownerNumber?.trim()),
  ];
  const requiredCompletedCount = requiredFields.filter(Boolean).length;
  const isRequiredComplete = requiredCompletedCount === 3;

  const allFields = [
    ...requiredFields,
    Boolean(formData.adminName?.trim()),
    Boolean(formData.adminNumber?.trim()),
    Boolean(formData.webLink?.trim()),
    Boolean(formData.waLink?.trim()),
    Boolean(formData.telegramBot?.trim()),
  ];
  const totalCompletedCount = allFields.filter(Boolean).length;
  const completionPercentage = Math.round((totalCompletedCount / allFields.length) * 100);

  // Initial monogram for store avatar
  const storeInitial = (formData.storeName || 'W').trim().charAt(0).toUpperCase();

  return (
    <div className="space-y-6">
      {/* 1. HERO IDENTITY & ACTIONS BANNER */}
      <div className="bg-gradient-to-r from-white via-sky-50/40 to-white border border-slate-200/90 rounded-2xl p-5 sm:p-6 shadow-2xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
          {/* Sisi Kiri: Avatar Toko + Info Utama */}
          <div className="flex items-center gap-4 min-w-0">
            <div className="relative shrink-0">
              <div className="w-14 h-14 rounded-2xl bg-[#0084D1] text-white flex items-center justify-center font-bold text-2xl shadow-sm shadow-[#0084D1]/25 ring-4 ring-white">
                {storeInitial}
              </div>
              <span
                className={`w-4 h-4 rounded-full border-2 border-white absolute -bottom-1 -right-1 flex items-center justify-center ${
                  isRequiredComplete ? 'bg-emerald-500 text-white' : 'bg-amber-400'
                }`}
              >
                {isRequiredComplete && <Check className="w-2.5 h-2.5 stroke-[3]" />}
              </span>
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg font-bold text-slate-900 tracking-tight truncate">
                  {formData.storeName || 'Nama Toko Belum Diatur'}
                </h2>
                {isRequiredComplete ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    Profil Toko Aktif
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                    Lengkapi 3 Data Wajib
                  </span>
                )}
              </div>

              <p className="text-xs text-slate-500 mt-1 flex items-center gap-2 flex-wrap">
                <span>
                  Owner: <strong className="text-slate-800">{formData.ownerName || 'Belum diisi'}</strong>
                </span>
                <span className="text-slate-300">•</span>
                <span className="font-mono text-slate-600">
                  {formData.ownerNumber ? formatOfficialDisplay(formData.ownerNumber) : 'Nomor belum diisi'}
                </span>
              </p>
            </div>
          </div>

          {/* Sisi Kanan: Progress Kelengkapan */}
          <div className="flex items-center gap-3 self-end md:self-auto shrink-0">
            <div className="text-right pr-3">
              <span className="text-[11px] font-semibold text-slate-500 block">
                Kelengkapan Profil
              </span>
              <span className="font-mono text-xs font-bold text-slate-800">
                {completionPercentage}% Selesai
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. GRID UTAMA: FORMULIR IDENTITAS (KIRI) & PRATINJAU WHATSAPP REAL-TIME (KANAN) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* ============================================================ */}
        {/* KOLOM KIRI: FORMULIR INPUT TERSTRUKTUR (COL 7)               */}
        {/* ============================================================ */}
        <div className="lg:col-span-7 space-y-6">
          {/* SEKSI 1: IDENTITAS UTAMA (WAJIB) */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-sky-50 border border-sky-100 flex items-center justify-center text-[#0084D1]">
                  <Store className="w-3.5 h-3.5" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Identitas Utama Toko
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Informasi wajib yang digunakan bot sebagai nama resmi toko Anda.
                  </p>
                </div>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
                Wajib Diisi
              </span>
            </div>

            {/* Field: Nama Toko */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <span>Nama Toko / Brand</span>
                  <span className="text-rose-500">*</span>
                </label>
                <button
                  type="button"
                  onClick={() => handleCopyTag('{storeName}', 'Nama Toko')}
                  className="text-[10px] font-mono text-[#0084D1] hover:underline cursor-pointer flex items-center gap-1"
                >
                  <code>{'{storeName}'}</code>
                  {copiedTag === '{storeName}' ? (
                    <Check className="w-3 h-3 text-emerald-600" />
                  ) : (
                    <Copy className="w-3 h-3 text-slate-400" />
                  )}
                </button>
              </div>
              <div className="relative flex rounded-xl border border-slate-300 focus-within:border-[#0084D1] focus-within:ring-2 focus-within:ring-[#0084D1]/20 transition bg-white overflow-hidden shadow-2xs">
                <div className="bg-slate-50 px-3.5 py-2.5 flex items-center text-slate-400 border-r border-slate-200">
                  <Store className="w-4 h-4 text-[#0084D1]" />
                </div>
                <input
                  type="text"
                  value={formData.storeName || ''}
                  onChange={(e) => setFormData({ ...formData, storeName: e.target.value })}
                  placeholder="Contoh: Wanzt Store Digital"
                  className="w-full px-3.5 py-2.5 text-xs font-semibold text-slate-900 placeholder-slate-400 focus:outline-none"
                />
              </div>
              <p className="text-[11px] text-slate-500">
                Nama ini tampil pada header pesan, katalog, dan invoice WhatsApp pembeli.
              </p>
            </div>

            {/* Field: Nama Owner & Nomor WhatsApp Owner */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
              {/* Nama Owner */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <span>Nama Pemilik (Owner)</span>
                    <span className="text-rose-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => handleCopyTag('{ownerName}', 'Nama Owner')}
                    className="text-[10px] font-mono text-[#0084D1] hover:underline cursor-pointer flex items-center gap-1"
                  >
                    <code>{'{ownerName}'}</code>
                    {copiedTag === '{ownerName}' ? (
                      <Check className="w-3 h-3 text-emerald-600" />
                    ) : (
                      <Copy className="w-3 h-3 text-slate-400" />
                    )}
                  </button>
                </div>
                <div className="relative flex rounded-xl border border-slate-300 focus-within:border-[#0084D1] focus-within:ring-2 focus-within:ring-[#0084D1]/20 transition bg-white overflow-hidden shadow-2xs">
                  <div className="bg-slate-50 px-3 py-2.5 flex items-center text-slate-400 border-r border-slate-200">
                    <User className="w-4 h-4 text-slate-500" />
                  </div>
                  <input
                    type="text"
                    value={formData.ownerName || ''}
                    onChange={(e) => setFormData({ ...formData, ownerName: e.target.value })}
                    placeholder="Contoh: Ridwan"
                    className="w-full px-3.5 py-2.5 text-xs font-semibold text-slate-900 placeholder-slate-400 focus:outline-none"
                  />
                </div>
              </div>

              {/* Nomor WhatsApp Owner */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <span>WhatsApp Owner</span>
                    <span className="text-rose-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => handleCopyTag('{ownerNumber}', 'Nomor Owner')}
                    className="text-[10px] font-mono text-[#0084D1] hover:underline cursor-pointer flex items-center gap-1"
                  >
                    <code>{'{ownerNumber}'}</code>
                    {copiedTag === '{ownerNumber}' ? (
                      <Check className="w-3 h-3 text-emerald-600" />
                    ) : (
                      <Copy className="w-3 h-3 text-slate-400" />
                    )}
                  </button>
                </div>
                <div className="relative flex rounded-xl border border-slate-300 focus-within:border-[#0084D1] focus-within:ring-2 focus-within:ring-[#0084D1]/20 transition bg-white overflow-hidden shadow-2xs">
                  <div className="bg-slate-50 px-2.5 py-2.5 flex items-center gap-1 text-slate-700 border-r border-slate-200 text-xs font-mono select-none">
                    <span>🇮🇩</span>
                    <span>+62</span>
                  </div>
                  <input
                    type="text"
                    value={toDisplayPhone(formData.ownerNumber)}
                    onChange={(e) => {
                      const cleanDisplay = toDisplayPhone(e.target.value);
                      setFormData({
                        ...formData,
                        ownerNumber: cleanDisplay ? toOfficialPhone(cleanDisplay) : '',
                      });
                    }}
                    placeholder="81234567890"
                    className="w-full px-3 py-2.5 text-xs font-mono font-semibold text-slate-900 placeholder-slate-400 focus:outline-none"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* SEKSI 2: KONTAK CUSTOMER SERVICE & ADMIN BOT (OPSIONAL) */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-sky-50 border border-sky-100 flex items-center justify-center text-[#0084D1]">
                  <MessageSquare className="w-3.5 h-3.5" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Customer Service &amp; Admin
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Kontak alternatif apabila pembeli ingin terhubung langsung ke staf support.
                  </p>
                </div>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                Opsional
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Nama Admin CS */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800">Nama Admin / CS</label>
                  <button
                    type="button"
                    onClick={() => handleCopyTag('{adminName}', 'Nama Admin')}
                    className="text-[10px] font-mono text-[#0084D1] hover:underline cursor-pointer flex items-center gap-1"
                  >
                    <code>{'{adminName}'}</code>
                    {copiedTag === '{adminName}' ? (
                      <Check className="w-3 h-3 text-emerald-600" />
                    ) : (
                      <Copy className="w-3 h-3 text-slate-400" />
                    )}
                  </button>
                </div>
                <div className="relative flex rounded-xl border border-slate-300 focus-within:border-[#0084D1] focus-within:ring-2 focus-within:ring-[#0084D1]/20 transition bg-white overflow-hidden shadow-2xs">
                  <div className="bg-slate-50 px-3 py-2.5 flex items-center text-slate-400 border-r border-slate-200">
                    <User className="w-4 h-4 text-slate-500" />
                  </div>
                  <input
                    type="text"
                    value={formData.adminName || ''}
                    onChange={(e) => setFormData({ ...formData, adminName: e.target.value })}
                    placeholder="Contoh: CS Ramah"
                    className="w-full px-3 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none"
                  />
                </div>
              </div>

              {/* Nomor WhatsApp Admin CS */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800">WhatsApp Admin CS</label>
                  <button
                    type="button"
                    onClick={() => handleCopyTag('{adminNumber}', 'Nomor Admin')}
                    className="text-[10px] font-mono text-[#0084D1] hover:underline cursor-pointer flex items-center gap-1"
                  >
                    <code>{'{adminNumber}'}</code>
                    {copiedTag === '{adminNumber}' ? (
                      <Check className="w-3 h-3 text-emerald-600" />
                    ) : (
                      <Copy className="w-3 h-3 text-slate-400" />
                    )}
                  </button>
                </div>
                <div className="relative flex rounded-xl border border-slate-300 focus-within:border-[#0084D1] focus-within:ring-2 focus-within:ring-[#0084D1]/20 transition bg-white overflow-hidden shadow-2xs">
                  <div className="bg-slate-50 px-2.5 py-2.5 flex items-center gap-1 text-slate-700 border-r border-slate-200 text-xs font-mono select-none">
                    <span>🇮🇩</span>
                    <span>+62</span>
                  </div>
                  <input
                    type="text"
                    value={toDisplayPhone(formData.adminNumber)}
                    onChange={(e) => {
                      const cleanDisplay = toDisplayPhone(e.target.value);
                      setFormData({
                        ...formData,
                        adminNumber: cleanDisplay ? toOfficialPhone(cleanDisplay) : '',
                      });
                    }}
                    placeholder="82345678901"
                    className="w-full px-3 py-2.5 text-xs font-mono text-slate-900 placeholder-slate-400 focus:outline-none"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* SEKSI 3: TAUTAN RESMI TOKO & KANAL MEDIA (OPSIONAL) */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-sky-50 border border-sky-100 flex items-center justify-center text-[#0084D1]">
                  <Globe className="w-3.5 h-3.5" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Website &amp; Saluran Resmi
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Tautan yang disertakan pada tombol WhatsApp dan pesan sambutan.
                  </p>
                </div>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                Opsional
              </span>
            </div>

            {/* Link Website Toko */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-800">Alamat Website Toko</label>
                <button
                  type="button"
                  onClick={() => handleCopyTag('{webLink}', 'Website Toko')}
                  className="text-[10px] font-mono text-[#0084D1] hover:underline cursor-pointer flex items-center gap-1"
                >
                  <code>{'{webLink}'}</code>
                  {copiedTag === '{webLink}' ? (
                    <Check className="w-3 h-3 text-emerald-600" />
                  ) : (
                    <Copy className="w-3 h-3 text-slate-400" />
                  )}
                </button>
              </div>
              <div className="relative flex rounded-xl border border-slate-300 focus-within:border-[#0084D1] focus-within:ring-2 focus-within:ring-[#0084D1]/20 transition bg-white overflow-hidden shadow-2xs">
                <div className="bg-slate-50 px-3 py-2.5 flex items-center text-slate-400 border-r border-slate-200">
                  <Globe className="w-4 h-4 text-slate-500" />
                </div>
                <input
                  type="text"
                  value={formData.webLink || ''}
                  onChange={(e) => setFormData({ ...formData, webLink: e.target.value })}
                  placeholder="https://tokoanda.com"
                  className="w-full px-3 py-2.5 text-xs font-mono text-slate-900 placeholder-slate-400 focus:outline-none"
                />
              </div>
            </div>

            {/* Saluran WhatsApp & Bot Telegram */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
              {/* Saluran WA */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800">Tautan Saluran WA</label>
                  <button
                    type="button"
                    onClick={() => handleCopyTag('{waLink}', 'Saluran WA')}
                    className="text-[10px] font-mono text-[#0084D1] hover:underline cursor-pointer flex items-center gap-1"
                  >
                    <code>{'{waLink}'}</code>
                    {copiedTag === '{waLink}' ? (
                      <Check className="w-3 h-3 text-emerald-600" />
                    ) : (
                      <Copy className="w-3 h-3 text-slate-400" />
                    )}
                  </button>
                </div>
                <div className="relative flex rounded-xl border border-slate-300 focus-within:border-[#0084D1] focus-within:ring-2 focus-within:ring-[#0084D1]/20 transition bg-white overflow-hidden shadow-2xs">
                  <div className="bg-slate-50 px-3 py-2.5 flex items-center text-slate-400 border-r border-slate-200">
                    <Phone className="w-4 h-4 text-emerald-600" />
                  </div>
                  <input
                    type="text"
                    value={formData.waLink || ''}
                    onChange={(e) => setFormData({ ...formData, waLink: e.target.value })}
                    placeholder="https://whatsapp.com/channel/..."
                    className="w-full px-3 py-2.5 text-xs font-mono text-slate-900 placeholder-slate-400 focus:outline-none"
                  />
                </div>
              </div>

              {/* Bot Telegram */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800">Username Bot Telegram</label>
                  <button
                    type="button"
                    onClick={() => handleCopyTag('{telegramBot}', 'Bot Telegram')}
                    className="text-[10px] font-mono text-[#0084D1] hover:underline cursor-pointer flex items-center gap-1"
                  >
                    <code>{'{telegramBot}'}</code>
                    {copiedTag === '{telegramBot}' ? (
                      <Check className="w-3 h-3 text-emerald-600" />
                    ) : (
                      <Copy className="w-3 h-3 text-slate-400" />
                    )}
                  </button>
                </div>
                <div className="relative flex rounded-xl border border-slate-300 focus-within:border-[#0084D1] focus-within:ring-2 focus-within:ring-[#0084D1]/20 transition bg-white overflow-hidden shadow-2xs">
                  <div className="bg-slate-50 px-3 py-2.5 flex items-center text-slate-400 border-r border-slate-200">
                    <Send className="w-4 h-4 text-sky-500" />
                  </div>
                  <input
                    type="text"
                    value={formData.telegramBot || ''}
                    onChange={(e) => setFormData({ ...formData, telegramBot: e.target.value })}
                    placeholder="@namastore_bot"
                    className="w-full px-3 py-2.5 text-xs font-mono text-slate-900 placeholder-slate-400 focus:outline-none"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Tombol Simpan Bawah Form */}
          <div className="flex justify-end pt-1">
            <button
              type="button"
              disabled={isSavingConfig}
              onClick={handleSave}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#0084D1] hover:bg-[#0073B7] text-white text-xs font-bold transition shadow-xs active:scale-[0.98] cursor-pointer disabled:opacity-50"
            >
              {isSavingConfig ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              <span>Simpan Informasi Toko</span>
            </button>
          </div>
        </div>

        {/* ============================================================ */}
        {/* KOLOM KANAN: PRATINJAU REAL-TIME & VARIABEL TEMPLATE (COL 5) */}
        {/* ============================================================ */}
        <div className="lg:col-span-5 space-y-6">
          {/* KARTU PRATINJAU FORMAT PESAN BOT WHATSAPP */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-emerald-600" />
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Pratinjau Pesan WhatsApp
                </h3>
              </div>
              <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                Live Output
              </span>
            </div>

            {/* Bubble WhatsApp Mockup */}
            <div className="bg-[#EFEAE2] p-3.5 rounded-2xl space-y-2 border border-slate-200">
              {/* Bubble Pesan Masuk / Greeting */}
              <div className="bg-white rounded-xl rounded-tl-xs p-3.5 text-xs space-y-2 text-slate-800 shadow-2xs leading-relaxed max-w-[95%]">
                <p className="font-semibold text-slate-900">
                  Halo Kak! Selamat datang di{' '}
                  <span className="text-[#0084D1] font-bold">
                    {formData.storeName || '[Nama Store]'}
                  </span>
                  .
                </p>
                <p className="text-[11px] text-slate-600">
                  Silakan pilih menu katalog akun premium, layanan SMM, atau top up game yang tersedia.
                </p>

                {/* Footer Signature Toko */}
                <div className="pt-2 border-t border-slate-100 space-y-1 font-mono text-[10px] text-slate-600">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-800">Owner:</span>
                    <span>{formData.ownerName || '-'}</span>
                  </div>
                  {formData.ownerNumber && (
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-800">Kontak:</span>
                      <span>{formatOfficialDisplay(formData.ownerNumber)}</span>
                    </div>
                  )}
                  {formData.adminName && (
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-800">CS Admin:</span>
                      <span>{formData.adminName}</span>
                    </div>
                  )}
                  {formData.webLink && (
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-800">Website:</span>
                      <span className="text-[#0084D1] truncate max-w-[140px]">
                        {formData.webLink}
                      </span>
                    </div>
                  )}
                </div>

                <div className="text-[9px] text-slate-400 text-right pt-0.5">
                  12:00 ✓✓
                </div>
              </div>
            </div>

            <p className="text-[11px] text-slate-500 leading-relaxed">
              Pratinjau di atas menunjukkan bagaimana profil toko Anda otomatis terpasang pada template pesan bot WhatsApp.
            </p>
          </div>

          {/* KARTU PANDUAN VARIABEL TEMPLATE (ONE-CLICK COPY) */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-[#0084D1]" />
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Variabel Dinamis Template
                </h3>
              </div>
              <span className="text-[10px] text-slate-400">Klik untuk Salin</span>
            </div>

            <p className="text-[11px] text-slate-500 leading-relaxed">
              Gunakan tag variabel ini pada tab <strong>Respon Bot</strong> (Menu, Sambutan, Invoice). Sistem akan otomatis menggantinya dengan data profil toko Anda:
            </p>

            <div className="space-y-1.5 pt-1">
              {[
                { tag: '{storeName}', label: 'Nama Store Resmi', val: formData.storeName || '-' },
                { tag: '{ownerName}', label: 'Nama Pemilik Toko', val: formData.ownerName || '-' },
                { tag: '{ownerNumber}', label: 'No. WhatsApp Pemilik', val: formatOfficialDisplay(formData.ownerNumber) || '-' },
                { tag: '{adminName}', label: 'Nama Customer Service', val: formData.adminName || '-' },
                { tag: '{adminNumber}', label: 'No. WhatsApp CS', val: formatOfficialDisplay(formData.adminNumber) || '-' },
                { tag: '{webLink}', label: 'Tautan Website Toko', val: formData.webLink || '-' },
                { tag: '{waLink}', label: 'Tautan Saluran WhatsApp', val: formData.waLink || '-' },
                { tag: '{telegramBot}', label: 'Username Bot Telegram', val: formData.telegramBot || '-' },
              ].map((item) => (
                <div
                  key={item.tag}
                  className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-200/80 hover:bg-sky-50/50 hover:border-sky-200 transition group"
                >
                  <div className="min-w-0 pr-2">
                    <div className="flex items-center gap-2">
                      <code className="text-[11px] font-mono font-bold text-[#0084D1]">
                        {item.tag}
                      </code>
                      <span className="text-[10px] text-slate-400 truncate">
                        {item.label}
                      </span>
                    </div>
                    <div className="text-[11px] font-medium text-slate-700 truncate max-w-[200px] mt-0.5">
                      {item.val}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleCopyTag(item.tag, item.label)}
                    className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-500 hover:text-[#0084D1] hover:border-sky-300 transition cursor-pointer shadow-2xs shrink-0"
                    title={`Salin ${item.tag}`}
                  >
                    {copiedTag === item.tag ? (
                      <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[3]" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
