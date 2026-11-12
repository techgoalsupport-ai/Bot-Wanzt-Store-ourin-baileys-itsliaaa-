import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Store,
  Wallet,
  Smartphone,
  Server,
  Users,
  MessageSquareCode,
  Package,
  Share2,
  Gamepad2,
  Receipt,
  PanelLeftClose,
  PanelLeftOpen,
  Radio,
  X,
  LogOut,
  Bot,
} from 'lucide-react';
import { BotStatusResponse, StoreInfoConfig } from '../../types/dashboard.types';

interface DesktopSidebarProps {
  selectedTab: string;
  setSelectedTab: (tab: string) => void;
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean | ((prev: boolean) => boolean)) => void;
  botData: BotStatusResponse;
  storeInfo: StoreInfoConfig;
  promosCount?: number;
  transactionsCount?: number;
  groupsCount?: number;
  username?: string;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
  onLogout?: () => void;
}

interface NavItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string | number;
  badgeColor?: string;
  aliases?: string[];
}

export const DesktopSidebar: React.FC<DesktopSidebarProps> = ({
  selectedTab,
  setSelectedTab,
  isCollapsed,
  setIsCollapsed,
  botData,
  storeInfo,
  promosCount = 0,
  transactionsCount = 0,
  groupsCount = 0,
  username = 'Admin',
  isMobileOpen = false,
  onCloseMobile,
  onLogout,
}) => {
  const handleNavClick = (id: string) => {
    setSelectedTab(id);
    if (onCloseMobile) onCloseMobile();
  };
  // Status Bot Helper
  const getBotStatusBadge = () => {
    switch (botData.status) {
      case 'connected':
        return { label: 'Online', bg: 'bg-emerald-500', text: 'text-emerald-700', border: 'border-emerald-300' };
      case 'waiting_code':
      case 'code_ready':
        return { label: 'Pairing', bg: 'bg-[#0084D1]', text: 'text-[#0084D1]', border: 'border-sky-300' };
      case 'connecting':
        return { label: 'Connecting', bg: 'bg-amber-500', text: 'text-amber-700', border: 'border-amber-300' };
      case 'error':
        return { label: 'Error', bg: 'bg-rose-500', text: 'text-rose-700', border: 'border-rose-300' };
      default:
        return { label: 'Offline', bg: 'bg-slate-400', text: 'text-slate-600', border: 'border-slate-300' };
    }
  };

  const statusBadge = getBotStatusBadge();

  // 10 Menu Navigasi dalam URUTAN PERSIS yang diminta oleh Pengguna:
  // 1. Info Profil (Paling atas)
  // 2. Saldo (Di bawah Info Profil)
  // 3. Connection
  // 4. Koneksi Layanan
  // 5. Management group
  // 6. Respon Bot
  // 7. Aplikasi Premium
  // 8. SMM
  // 9. TopUp
  // 10. Transaksi
  const navItems: NavItem[] = [
    {
      id: 'Info Profil',
      label: 'Info Profil',
      icon: Store,
      aliases: ['Store Info'],
    },
    {
      id: 'Saldo',
      label: 'Saldo',
      icon: Wallet,
      aliases: ['tabSaldo'],
    },
    {
      id: 'Connection',
      label: 'Connection',
      icon: Smartphone,
      badge: statusBadge.label,
      badgeColor: botData.status === 'connected' ? 'bg-emerald-600' : 'bg-[#0084D1]',
      aliases: ['tab06'],
    },
    {
      id: 'Koneksi Layanan',
      label: 'Koneksi Layanan',
      icon: Server,
      aliases: ['Layanan', 'API'],
    },
    {
      id: 'Management group',
      label: 'Management group',
      icon: Users,
      badge: groupsCount > 0 ? groupsCount : undefined,
      aliases: ['Grup', 'tab04'],
    },
    {
      id: 'Respon Bot',
      label: 'Respon Bot',
      icon: MessageSquareCode,
      aliases: ['Command'],
    },
    {
      id: 'Aplikasi Premium',
      label: 'Aplikasi Premium',
      icon: Package,
      badge: promosCount > 0 ? `${promosCount} Promo` : undefined,
      aliases: ['Produk', 'Kupon Promo', 'Promo', 'tabPromo'],
    },
    {
      id: 'SMM',
      label: 'SMM',
      icon: Share2,
      aliases: ['SSM', 'tab02'],
    },
    {
      id: 'TopUp',
      label: 'TopUp',
      icon: Gamepad2,
      aliases: ['Top Up', 'tab03'],
    },
    {
      id: 'Transaksi',
      label: 'Transaksi',
      icon: Receipt,
      badge: transactionsCount > 0 ? transactionsCount : undefined,
      aliases: ['tab05'],
    },
    {
      id: 'Management Bot',
      label: 'Management Bot',
      icon: Bot,
      badge: botData.accountStatus === 'suspended' ? 'Suspend' : botData.accountStatus === 'expired' ? 'Expired' : undefined,
      badgeColor: botData.accountStatus === 'suspended' ? 'bg-rose-600' : 'bg-amber-600',
      aliases: ['Bot Management', 'ManagementBot', 'Masa Sewa', 'Voucher Token'],
    },
  ];

  const checkIsActive = (item: NavItem) => {
    if (selectedTab === item.id) return true;
    if (item.aliases && item.aliases.includes(selectedTab)) return true;
    return false;
  };

  const renderNavItem = (item: NavItem, collapsed: boolean) => {
    const isActive = checkIsActive(item);
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
            <Icon className="w-5.5 h-5.5 stroke-[1.8]" />
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
      <>
        {/* Bagian Atas: Header & Brand */}
        <div className="flex flex-col flex-1 overflow-y-auto scrollbar-none">
          {/* Header Bersih */}
          {collapsed ? (
            <div className="flex flex-col items-center gap-2 pt-3 pb-2.5 px-2 border-b border-slate-100">
              {/* Tombol Besar Expand Sidebar */}
              <button
                type="button"
                onClick={() => setIsCollapsed(false)}
                className="w-11 h-11 rounded-xl bg-slate-50 hover:bg-sky-50 text-slate-600 hover:text-[#0084D1] border border-slate-200 hover:border-sky-300 flex items-center justify-center transition-all cursor-pointer shadow-2xs group"
                title="Buka Sidebar Navigasi"
              >
                <PanelLeftOpen className="w-5 h-5 transition-transform group-hover:scale-110" />
              </button>

              {/* Monogram Brand Avatar */}
              <button
                type="button"
                onClick={() => handleNavClick('Info Profil')}
                title={`Toko: ${storeInfo.storeName || 'Wanzt Store'}`}
                className="w-11 h-11 rounded-xl bg-gradient-to-tr from-[#0084D1] to-sky-400 text-white flex items-center justify-center font-bold text-base shadow-sm shadow-[#0084D1]/20 cursor-pointer hover:opacity-95 transition"
              >
                {(storeInfo.storeName || 'W').trim().charAt(0).toUpperCase()}
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between px-3.5 pt-3.5 pb-3 border-b border-slate-100">
              {/* Brand Avatar + Title */}
              <button
                type="button"
                onClick={() => handleNavClick('Info Profil')}
                className="flex items-center gap-2.5 min-w-0 text-left cursor-pointer group flex-1"
              >
                <div className="w-9.5 h-9.5 rounded-xl bg-gradient-to-tr from-[#0084D1] to-sky-400 text-white flex items-center justify-center font-bold text-sm shadow-sm shadow-[#0084D1]/20 shrink-0 group-hover:opacity-95 transition">
                  {(storeInfo.storeName || 'W').trim().charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <h1 className="text-sm font-bold text-slate-900 truncate leading-tight tracking-tight group-hover:text-[#0084D1] transition-colors">
                    {storeInfo.storeName || 'Wanzt Store'}
                  </h1>
                  <p className="text-[11px] text-slate-500 truncate flex items-center gap-1.5 mt-0.5">
                    <span className={`w-1.5 h-1.5 rounded-full ${statusBadge.bg}`} />
                    <span>WhatsApp Bot</span>
                  </p>
                </div>
              </button>

              {/* Tombol Tutup Drawer khusus Mobile */}
              {isMobileView && onCloseMobile && (
                <button
                  type="button"
                  onClick={onCloseMobile}
                  className="w-8.5 h-8.5 rounded-xl text-slate-400 hover:text-slate-800 hover:bg-slate-100 border border-transparent hover:border-slate-200 flex items-center justify-center transition cursor-pointer shrink-0 ml-1 active:scale-95"
                  aria-label="Tutup Menu"
                >
                  <X className="w-4.5 h-4.5" />
                </button>
              )}

              {/* Tombol Collapse Sidebar Desktop */}
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

          {/* 3. Primary Connection Status Button */}
          <div className="px-3 pt-3 pb-2">
            {collapsed ? (
              <button
                type="button"
                onClick={() => handleNavClick('Connection')}
                title={`Status: ${statusBadge.label}`}
                className={`w-full h-11 rounded-xl border flex items-center justify-center transition-all cursor-pointer shadow-2xs ${
                  botData.status === 'connected'
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                    : 'border-sky-200 bg-sky-50 text-[#0084D1] hover:bg-sky-100'
                }`}
              >
                <Radio className="w-5 h-5 animate-pulse" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => handleNavClick('Connection')}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl border transition-all cursor-pointer shadow-2xs group ${
                  botData.status === 'connected'
                    ? 'border-emerald-200 bg-emerald-50/70 text-emerald-800 hover:bg-emerald-100/70'
                    : 'border-sky-200 bg-sky-50/70 text-[#0084D1] hover:bg-sky-100/70'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span
                    className={`w-2 h-2 rounded-full ${statusBadge.bg} ${
                      botData.status === 'connected' ? 'animate-ping' : ''
                    }`}
                  />
                  <span className="text-xs font-semibold tracking-tight truncate">
                    {botData.status === 'connected' ? 'Bot Terhubung' : 'Hubungkan Bot'}
                  </span>
                </div>
                <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-white border border-slate-200 text-slate-700">
                  {statusBadge.label}
                </span>
              </button>
            )}
          </div>

          {/* 4. Daftar 10 Menu Navigasi Utama */}
          <div className="px-2 py-1 space-y-0.5">
            {navItems.map((item) => renderNavItem(item, collapsed))}
          </div>
        </div>

        {/* Bagian Bawah: Profile Card / Quick Status (Dapat diklik untuk Ubah Kredensial Akun) */}
        <div className="border-t border-slate-100 p-2.5 bg-slate-50/50">
          {collapsed ? (
            <div className="flex justify-center">
              <button
                type="button"
                onClick={() => {
                  setSelectedTab('Keamanan Akun');
                  if (isMobileView && onCloseMobile) onCloseMobile();
                }}
                className={`relative p-1 rounded-xl transition cursor-pointer group ${
                  selectedTab === 'Keamanan Akun' ? 'ring-2 ring-[#0084D1] bg-sky-50' : 'hover:bg-slate-200/60'
                }`}
                title="Klik untuk mengubah Username & Password Akun"
              >
                <div className="w-9 h-9 rounded-xl bg-sky-100 text-[#0084D1] font-bold flex items-center justify-center text-xs border border-sky-200 group-hover:border-[#0084D1] group-hover:scale-105 transition-all">
                  {username.slice(0, 2).toUpperCase()}
                </div>
                <span
                  className={`w-2.5 h-2.5 rounded-full border-2 border-white absolute bottom-0.5 right-0.5 ${statusBadge.bg}`}
                />
              </button>
            </div>
          ) : (
            <div
              className={`flex items-center justify-between p-1.5 rounded-xl transition ${
                selectedTab === 'Keamanan Akun'
                  ? 'bg-sky-50/80 border border-sky-200 shadow-2xs'
                  : 'hover:bg-slate-100/80'
              }`}
            >
              <button
                type="button"
                onClick={() => {
                  setSelectedTab('Keamanan Akun');
                  if (isMobileView && onCloseMobile) onCloseMobile();
                }}
                className="flex items-center gap-2.5 min-w-0 flex-1 text-left cursor-pointer group"
                title="Klik untuk mengubah Username & Password Akun"
              >
                <div className="relative shrink-0">
                  <div className="w-8.5 h-8.5 rounded-xl bg-sky-100 text-[#0084D1] font-bold flex items-center justify-center text-xs border border-sky-200 group-hover:border-[#0084D1] group-hover:scale-105 transition-all">
                    {username.slice(0, 2).toUpperCase()}
                  </div>
                  <span
                    className={`w-2.5 h-2.5 rounded-full border-2 border-white absolute -bottom-0.5 -right-0.5 ${statusBadge.bg}`}
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <p className="text-xs font-bold text-slate-900 truncate group-hover:text-[#0084D1] transition-colors">
                      {storeInfo.ownerName || username}
                    </p>
                    <span className="text-[9px] font-medium px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 group-hover:bg-sky-100 group-hover:text-sky-700 transition">
                      Ubah Akun
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-500 truncate">
                    Admin Store · {statusBadge.label}
                  </p>
                </div>
              </button>

              {/* Tombol Logout khusus Mobile Drawer */}
              {isMobileView && onLogout && (
                <button
                  type="button"
                  onClick={onLogout}
                  className="p-2 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition cursor-pointer shrink-0 ml-1"
                  title="Keluar"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              )}
            </div>
          )}
        </div>
      </>
    );
  };

  return (
    <>
      {/* 1. Desktop Persistent Sidebar (>= md) */}
      <aside
        className={`hidden md:flex bg-white border-r border-slate-200 h-screen flex-col justify-between select-none md:sticky md:top-0 md:z-30 transition-all duration-300 ${
          isCollapsed ? 'md:w-[72px]' : 'md:w-64'
        }`}
      >
        {renderSidebarContent(false)}
      </aside>

      {/* 2. Mobile Drawer Navbar (< md) dengan Animasi Masuk & Keluar yang Mulus */}
      <AnimatePresence>
        {isMobileOpen && (
          <div className="md:hidden fixed inset-0 z-50 pointer-events-auto">
            {/* Backdrop dengan animasi fade in / fade out */}
            <motion.div
              key="mobile-nav-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs"
              onClick={onCloseMobile}
              aria-hidden="true"
            />

            {/* Mobile Sidebar Drawer dengan animasi slide in / slide out & swipe-to-close */}
            <motion.aside
              key="mobile-nav-drawer"
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 300, mass: 0.8 }}
              drag="x"
              dragConstraints={{ left: -320, right: 0 }}
              dragElastic={0.05}
              onDragEnd={(_e, info) => {
                if (info.offset.x < -60 || info.velocity.x < -200) {
                  if (onCloseMobile) onCloseMobile();
                }
              }}
              className="fixed inset-y-0 left-0 w-[285px] sm:w-80 bg-white border-r border-slate-200 min-h-[100dvh] flex flex-col justify-between shadow-2xl select-none"
            >
              {renderSidebarContent(true)}
            </motion.aside>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};

