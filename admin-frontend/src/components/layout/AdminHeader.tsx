import React from 'react';
import { Menu, Store, ExternalLink, RefreshCw, Building2, BarChart3, Radio, ShieldCheck, LayoutTemplate, Send, Ticket } from 'lucide-react';
import { AdminNavTab } from './AdminSidebar.tsx';

interface AdminHeaderProps {
  selectedTab: AdminNavTab;
  loading: boolean;
  onRefresh: () => void;
  onOpenMobileMenu: () => void;
}

export const AdminHeader: React.FC<AdminHeaderProps> = ({
  selectedTab,
  loading,
  onRefresh,
  onOpenMobileMenu,
}) => {
  const getTabInfo = () => {
    switch (selectedTab) {
      case 'units':
        return {
          title: 'Daftar Unit Bot',
          subtitle: 'Pusat Manajemen Multi-Tenant Apartemen Bot WhatsApp',
          icon: Building2,
        };
      case 'templates':
        return {
          title: 'Template Message',
          subtitle: 'Katalog template respon pesan bot resmi untuk seluruh toko',
          icon: LayoutTemplate,
        };
      case 'telegram':
        return {
          title: 'Bot Telegram',
          subtitle: 'Manajemen notifikasi bot Telegram milik masing-masing tenant',
          icon: Send,
        };
      case 'tokens':
        return {
          title: 'Management Token Lisensi',
          subtitle: 'Kelola voucher token lisensi perpanjangan masa sewa bot multi-tenant',
          icon: Ticket,
        };
      case 'stats':
        return {
          title: 'Statistik Platform',
          subtitle: 'Ringkasan performa dan utilisasi instance server',
          icon: BarChart3,
        };
      case 'broadcast':
        return {
          title: 'Pesan Siaran',
          subtitle: 'Pengiriman pesan massal ke seluruh penyewa toko',
          icon: Radio,
        };
      case 'settings':
        return {
          title: 'Pengaturan Master',
          subtitle: 'Konfigurasi akun pengelola dan preferensi sistem',
          icon: ShieldCheck,
        };
      default:
        return {
          title: 'Master Apartemen',
          subtitle: 'Pusat Kendali Platform',
          icon: Building2,
        };
    }
  };

  const tabInfo = getTabInfo();
  const Icon = tabInfo.icon;

  return (
    <header className="sticky top-0 z-20 bg-white/85 backdrop-blur-md border-b border-slate-200/90 h-16 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full flex items-center justify-between gap-4">
        {/* Left: Mobile Hamburger & Tab Title */}
        <div className="flex items-center gap-3 min-w-0">
          {/* Mobile Hamburger Button */}
          <button
            type="button"
            onClick={onOpenMobileMenu}
            className="md:hidden p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition cursor-pointer active:scale-95"
            aria-label="Buka Menu Navigasi"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-[#0084D1]/10 text-[#0084D1] flex items-center justify-center shrink-0 border border-[#0084D1]/20">
              <Icon className="w-4.5 h-4.5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-slate-900 truncate tracking-tight">
                  {tabInfo.title}
                </h2>
                <span className="hidden sm:inline-flex px-2 py-0.5 text-[10px] font-bold bg-[#0084D1]/10 text-[#0084D1] border border-[#0084D1]/20 rounded-md">
                  MASTER
                </span>
              </div>
              <p className="text-[11px] text-slate-500 truncate hidden sm:block">
                {tabInfo.subtitle}
              </p>
            </div>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2.5 shrink-0">
          {/* Tombol Kunjungi Web Toko */}
          <a
            href="/"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-sky-50 hover:text-[#0084D1] border border-slate-200 hover:border-sky-300 rounded-xl transition-all active:scale-95 cursor-pointer shadow-2xs group"
            title="Kunjungi antarmuka toko pengguna biasa (dashboard.wanma2.my.id)"
          >
            <Store className="w-3.5 h-3.5 text-emerald-600 group-hover:text-[#0084D1] transition-colors" />
            <span className="hidden sm:inline">Web Toko</span>
            <ExternalLink className="w-3 h-3 text-slate-400 group-hover:text-[#0084D1] transition-colors" />
          </a>

          {/* Tombol Muat Ulang Data */}
          <button
            type="button"
            onClick={onRefresh}
            disabled={loading}
            className="p-2 text-slate-600 hover:text-[#0084D1] bg-slate-50 hover:bg-sky-50 border border-slate-200 hover:border-sky-300 rounded-xl transition-all active:scale-95 cursor-pointer shadow-2xs disabled:opacity-50"
            title="Muat Ulang Data Apartemen"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-[#0084D1]' : ''}`} />
          </button>
        </div>
      </div>
    </header>
  );
};
