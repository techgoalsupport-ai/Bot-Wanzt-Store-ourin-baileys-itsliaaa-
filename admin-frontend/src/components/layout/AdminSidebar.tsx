import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Building2,
  BarChart3,
  Radio,
  ShieldCheck,
  Store,
  PanelLeftClose,
  PanelLeftOpen,
  X,
  ExternalLink,
  RefreshCw,
  LayoutTemplate,
} from 'lucide-react';

export type AdminNavTab = 'units' | 'templates' | 'stats' | 'broadcast' | 'settings';

interface AdminSidebarProps {
  selectedTab: AdminNavTab;
  setSelectedTab: (tab: AdminNavTab) => void;
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean | ((prev: boolean) => boolean)) => void;
  totalTenants: number;
  activeTenants: number;
  loading: boolean;
  onRefresh: () => void;
  isMobileOpen: boolean;
  onCloseMobile: () => void;
}

interface NavItem {
  id: AdminNavTab;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string | number;
  badgeColor?: string;
  description?: string;
}

export const AdminSidebar: React.FC<AdminSidebarProps> = ({
  selectedTab,
  setSelectedTab,
  isCollapsed,
  setIsCollapsed,
  totalTenants,
  activeTenants,
  loading,
  onRefresh,
  isMobileOpen,
  onCloseMobile,
}) => {
  const navItems: NavItem[] = [
    {
      id: 'units',
      label: 'Daftar Unit Bot',
      icon: Building2,
      badge: totalTenants > 0 ? totalTenants : undefined,
      description: 'Manajemen unit penyewa',
    },
    {
      id: 'templates',
      label: 'Template Message',
      icon: LayoutTemplate,
      description: 'Kelola template pesan bot',
    },
    {
      id: 'stats',
      label: 'Statistik Platform',
      icon: BarChart3,
      badge: activeTenants > 0 ? `${activeTenants} Aktif` : undefined,
      description: 'Metrik & performa bot',
    },
    {
      id: 'broadcast',
      label: 'Pesan Siaran',
      icon: Radio,
      badge: 'Segera',
      description: 'Siaran massal ke tenant',
    },
    {
      id: 'settings',
      label: 'Pengaturan Master',
      icon: ShieldCheck,
      description: 'Kontak & preferensi',
    },
  ];

  const handleNavClick = (id: AdminNavTab) => {
    setSelectedTab(id);
    if (onCloseMobile) onCloseMobile();
  };

  const renderNavItem = (item: NavItem, collapsed: boolean) => {
    const isActive = selectedTab === item.id;
    const Icon = item.icon;

    if (collapsed) {
      return (
        <div key={item.id} className="relative group flex items-center justify-center my-1">
          {/* Garis aktif di sisi paling kiri */}
          {isActive && (
            <div className="absolute left-0 w-1.25 h-7 rounded-r-full bg-[#0084D1]" />
          )}

          <button
            type="button"
            onClick={() => handleNavClick(item.id)}
            title={item.label}
            className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all cursor-pointer ${
              isActive
                ? 'bg-[#0084D1]/12 text-[#0084D1] font-bold shadow-xs'
                : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Icon className="w-5 h-5 stroke-[1.8]" />
          </button>

          {/* Floating Tooltip saat collapsed */}
          <div className="absolute left-full ml-3 px-2.5 py-1.5 bg-slate-900 text-white text-xs font-semibold rounded-md whitespace-nowrap shadow-lg pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity z-50 flex items-center gap-2">
            <span>{item.label}</span>
            {item.badge !== undefined && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-[#0084D1] text-white">
                {item.badge}
              </span>
            )}
          </div>
        </div>
      );
    }

    return (
      <div key={item.id} className="relative flex items-center my-0.5">
        {/* Garis aktif di sisi paling kiri */}
        {isActive && (
          <div className="absolute left-0 w-1.25 h-7 rounded-r-full bg-[#0084D1]" />
        )}

        <button
          type="button"
          onClick={() => handleNavClick(item.id)}
          className={`w-full flex items-center justify-between pl-4 pr-3 py-2.5 rounded-xl text-xs transition-all cursor-pointer ${
            isActive
              ? 'bg-[#0084D1]/10 text-[#0084D1] font-bold'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80 font-medium'
          }`}
        >
          <div className="flex items-center gap-3 min-w-0">
            <Icon
              className={`w-4.5 h-4.5 shrink-0 stroke-[1.8] ${
                isActive ? 'text-[#0084D1]' : 'text-slate-400'
              }`}
            />
            <span className="truncate">{item.label}</span>
          </div>

          {item.badge !== undefined && (
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 shadow-2xs ${
                isActive
                  ? 'bg-[#0084D1] text-white'
                  : 'bg-slate-100 text-slate-600 border border-slate-200'
              }`}
            >
              {item.badge}
            </span>
          )}
        </button>
      </div>
    );
  };

  const renderSidebarContent = (isMobileView: boolean) => {
    const collapsed = !isMobileView && isCollapsed;

    return (
      <div className="flex flex-col h-full justify-between">
        {/* Bagian Atas: Header Brand & Navigasi */}
        <div className="flex flex-col flex-1 overflow-y-auto scrollbar-none">
          {/* Header Bersih */}
          {collapsed ? (
            <div className="flex flex-col items-center gap-2 pt-3.5 pb-3 px-2 border-b border-slate-100">
              <button
                type="button"
                onClick={() => setIsCollapsed(false)}
                className="w-11 h-11 rounded-xl bg-slate-50 hover:bg-sky-50 text-slate-600 hover:text-[#0084D1] border border-slate-200 hover:border-sky-300 flex items-center justify-center transition-all cursor-pointer shadow-2xs group"
                title="Buka Sidebar Navigasi"
              >
                <PanelLeftOpen className="w-5 h-5 transition-transform group-hover:scale-110" />
              </button>

              <div
                className="w-11 h-11 rounded-xl bg-gradient-to-tr from-[#0084D1] to-sky-400 text-white flex items-center justify-center font-bold text-sm shadow-sm shadow-[#0084D1]/20"
                title="Wanzt Apartemen - Master Admin"
              >
                <Building2 className="w-5 h-5" />
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between px-3.5 pt-3.5 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-9.5 h-9.5 rounded-xl bg-gradient-to-tr from-[#0084D1] to-sky-400 text-white flex items-center justify-center font-bold text-sm shadow-sm shadow-[#0084D1]/20 shrink-0">
                  <Building2 className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <h1 className="text-sm font-bold text-slate-900 truncate leading-tight tracking-tight">
                      Wanzt Apartemen
                    </h1>
                  </div>
                  <p className="text-[11px] text-slate-500 truncate flex items-center gap-1.5 mt-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span>Pusat Kendali Bot</span>
                  </p>
                </div>
              </div>

              {/* Tombol Tutup Drawer Mobile */}
              {isMobileView && (
                <button
                  type="button"
                  onClick={onCloseMobile}
                  className="w-8.5 h-8.5 rounded-xl text-slate-400 hover:text-slate-800 hover:bg-slate-100 border border-transparent hover:border-slate-200 flex items-center justify-center transition cursor-pointer shrink-0 ml-1 active:scale-95"
                  aria-label="Tutup Menu"
                >
                  <X className="w-4.5 h-4.5" />
                </button>
              )}

              {/* Tombol Collapse Desktop */}
              {!isMobileView && (
                <button
                  type="button"
                  onClick={() => setIsCollapsed(true)}
                  className="hidden md:flex w-8.5 h-8.5 rounded-xl text-slate-400 hover:text-slate-800 hover:bg-slate-100 border border-transparent hover:border-slate-200 items-center justify-center transition cursor-pointer shrink-0 ml-1"
                  title="Tutup Sidebar"
                >
                  <PanelLeftClose className="w-4.5 h-4.5" />
                </button>
              )}
            </div>
          )}

          {/* Quick Status / Refresh Bar */}
          <div className="px-3 pt-3 pb-2">
            {collapsed ? (
              <button
                type="button"
                onClick={onRefresh}
                disabled={loading}
                title="Muat Ulang Data Apartemen"
                className="w-full h-11 rounded-xl border border-sky-200 bg-sky-50 text-[#0084D1] hover:bg-sky-100 flex items-center justify-center transition-all cursor-pointer shadow-2xs"
              >
                <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
              </button>
            ) : (
              <div className="p-2.5 rounded-xl border border-sky-100 bg-sky-50/60 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-xs font-semibold text-slate-700">
                    {activeTenants} Bot Aktif Online
                  </span>
                </div>
                <button
                  type="button"
                  onClick={onRefresh}
                  disabled={loading}
                  className="p-1 text-[#0084D1] hover:text-[#0073B7] hover:bg-sky-100 rounded-lg transition cursor-pointer"
                  title="Refresh Data"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                </button>
              </div>
            )}
          </div>

          {/* Menu Navigasi */}
          <div className="px-2 py-1 space-y-0.5">
            {navItems.map((item) => renderNavItem(item, collapsed))}
          </div>
        </div>

        {/* Bagian Bawah: Profil Master Admin & Tautan Toko */}
        <div className="border-t border-slate-100 p-2.5 bg-slate-50/50 space-y-2">
          {collapsed ? (
            <div className="flex flex-col items-center gap-2">
              <a
                href="/"
                title="Buka Web Toko (dashboard.wanma2.my.id)"
                className="w-9 h-9 rounded-xl bg-slate-100 text-slate-600 hover:text-[#0084D1] hover:bg-sky-50 border border-slate-200 flex items-center justify-center transition cursor-pointer"
              >
                <Store className="w-4.5 h-4.5" />
              </a>

              <div
                className="w-9 h-9 rounded-xl bg-sky-100 text-[#0084D1] font-bold flex items-center justify-center text-xs border border-sky-200"
                title="Super Admin - Akses Penuh"
              >
                SA
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {/* Profil Card */}
              <div className="flex items-center gap-2.5 p-2 rounded-xl bg-white border border-slate-200/90 shadow-2xs">
                <div className="w-8.5 h-8.5 rounded-xl bg-sky-100 text-[#0084D1] font-bold flex items-center justify-center text-xs border border-sky-200 shrink-0">
                  SA
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <p className="text-xs font-bold text-slate-900 truncate">
                      Super Admin
                    </p>
                    <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-emerald-100 text-emerald-700">
                      Master
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-500 truncate mt-0.5">
                    Akses Penuh Apartemen
                  </p>
                </div>
              </div>

              {/* Tautan Toko */}
              <a
                href="/"
                className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-sky-50/80 hover:text-[#0084D1] border border-slate-200/90 hover:border-sky-200 rounded-xl transition-all shadow-2xs group"
                title="Buka Antarmuka Toko Bot"
              >
                <div className="flex items-center gap-2">
                  <Store className="w-4 h-4 text-emerald-600 group-hover:text-[#0084D1] transition-colors" />
                  <span>Buka Web Toko</span>
                </div>
                <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-[#0084D1] transition-colors" />
              </a>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <>
      {/* 1. Desktop Persistent Sidebar (>= md) */}
      <aside
        className={`hidden md:flex bg-white border-r border-slate-200/90 h-screen flex-col justify-between select-none md:sticky md:top-0 md:z-30 transition-all duration-300 ${
          isCollapsed ? 'md:w-[72px]' : 'md:w-64'
        }`}
      >
        {renderSidebarContent(false)}
      </aside>

      {/* 2. Mobile Drawer Navbar (< md) */}
      <AnimatePresence>
        {isMobileOpen && (
          <div className="md:hidden fixed inset-0 z-50 pointer-events-auto">
            {/* Backdrop dengan animasi fade */}
            <motion.div
              key="admin-mobile-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs"
              onClick={onCloseMobile}
              aria-hidden="true"
            />

            {/* Mobile Drawer */}
            <motion.aside
              key="admin-mobile-drawer"
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 300, mass: 0.8 }}
              className="fixed inset-y-0 left-0 w-72 bg-white border-r border-slate-200 min-h-[100dvh] flex flex-col justify-between shadow-2xl select-none"
            >
              {renderSidebarContent(true)}
            </motion.aside>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};
