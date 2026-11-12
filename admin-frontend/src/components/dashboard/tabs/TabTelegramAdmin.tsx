import React, { useState, useEffect, useMemo } from 'react';
import {
  Send,
  RefreshCw,
  Search,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  MessageSquare,
  ShieldAlert,
  Info,
} from 'lucide-react';
import { SendTelegramMessageModal } from '../../modals/SendTelegramMessageModal';

export interface TenantTelegramItem {
  tenantId: string;
  storeName: string;
  isConfigured: boolean;
  notifEnabled: boolean;
  adminDisabled: boolean;
  status: 'online' | 'offline' | 'suspend' | 'nonaktif';
  updatedAt: string | null;
}

interface TabTelegramAdminProps {
  showToast: (msg: string) => void;
}

export const TabTelegramAdmin: React.FC<TabTelegramAdminProps> = ({ showToast }) => {
  const [items, setItems] = useState<TenantTelegramItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'online' | 'offline' | 'suspend' | 'nonaktif'>('all');
  const [togglingId, setTogglingId] = useState<string | null>(null);

  // Modal Kirim Pesan
  const [selectedTenantForMessage, setSelectedTenantForMessage] = useState<{
    tenantId: string;
    storeName: string;
  } | null>(null);
  const [isMessageModalOpen, setIsMessageModalOpen] = useState(false);

  const fetchTelegramData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/telegram/tenants');
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setItems(data.data);
      } else {
        showToast(data.error || 'Gagal memuat status bot Telegram');
      }
    } catch (err: any) {
      showToast('Koneksi terputus: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTelegramData();
  }, []);

  const handleToggleBot = async (item: TenantTelegramItem) => {
    setTogglingId(item.tenantId);
    try {
      const res = await fetch(`/api/admin/telegram/tenants/${item.tenantId}/toggle`, {
        method: 'POST',
      });
      const data = await res.json();
      if (data.success) {
        showToast(data.message || 'Status bot Telegram berhasil diperbarui');
        setItems((prev) =>
          prev.map((t) => {
            if (t.tenantId !== item.tenantId) return t;
            const newAdminDisabled = !t.adminDisabled;
            let newStatus: 'online' | 'offline' | 'suspend' | 'nonaktif' = 'nonaktif';
            if (newAdminDisabled) {
              newStatus = 'suspend';
            } else if (!t.isConfigured) {
              newStatus = 'nonaktif';
            } else if (t.notifEnabled) {
              newStatus = 'online';
            } else {
              newStatus = 'offline';
            }
            return {
              ...t,
              adminDisabled: newAdminDisabled,
              status: newStatus,
            };
          })
        );
      } else {
        showToast(data.error || 'Gagal mengubah status bot');
      }
    } catch (err: any) {
      showToast('Error koneksi: ' + err.message);
    } finally {
      setTogglingId(null);
    }
  };

  const handleOpenMessageModal = (item: TenantTelegramItem) => {
    if (!item.isConfigured) {
      showToast('Tenant belum mengonfigurasi bot Telegram.');
      return;
    }
    setSelectedTenantForMessage({
      tenantId: item.tenantId,
      storeName: item.storeName,
    });
    setIsMessageModalOpen(true);
  };

  // Metrics summary
  const metrics = useMemo(() => {
    const total = items.length;
    const online = items.filter((i) => i.status === 'online').length;
    const offline = items.filter((i) => i.status === 'offline').length;
    const suspend = items.filter((i) => i.status === 'suspend').length;
    const nonaktif = items.filter((i) => i.status === 'nonaktif').length;
    return { total, online, offline, suspend, nonaktif };
  }, [items]);

  // Filtering list
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchSearch =
        item.storeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.tenantId.toLowerCase().includes(searchQuery.toLowerCase());
      if (!matchSearch) return false;

      if (statusFilter === 'all') return true;
      return item.status === statusFilter;
    });
  }, [items, searchQuery, statusFilter]);

  // Sesuai instruksi pengguna:
  // 1. Nonaktif (abu-abu): bot belum di set oleh tenant
  // 2. Online (hijau): bot terhubung
  // 3. Offline (abu-abu): bot di matikan oleh tenant
  // 4. Suspend (merah): bot di matikan oleh admin
  const renderStatusBadge = (status: TenantTelegramItem['status']) => {
    switch (status) {
      case 'online':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Online
          </span>
        );
      case 'offline':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
            Offline
          </span>
        );
      case 'suspend':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
            Suspend
          </span>
        );
      case 'nonaktif':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-100 text-slate-500 border border-slate-200">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />
            Nonaktif
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Area */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <span>Manajemen Notifikasi Bot Telegram</span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-sky-50 text-sky-600 border border-sky-200">
              Per-Tenant
            </span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Pantau status bot Telegram setiap unit toko, kelola sakelar aktif/suspend, dan kirimkan pengumuman resmi ke pemilik toko.
          </p>
        </div>

        <button
          type="button"
          onClick={fetchTelegramData}
          disabled={loading}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold transition shadow-2xs active:scale-[0.98] cursor-pointer disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-sky-600' : 'text-slate-500'}`} />
          <span>Segarkan Data</span>
        </button>
      </div>

      {/* Ringkasan Status / Metrik */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5">
        <div className="p-4 bg-white border border-slate-200/90 rounded-2xl shadow-xs space-y-1">
          <p className="text-[11px] font-semibold text-slate-500">Total Unit Tenant</p>
          <p className="text-2xl font-black text-slate-900">{metrics.total}</p>
          <p className="text-[10px] text-slate-400">Database unit terdaftar</p>
        </div>

        <div className="p-4 bg-white border border-slate-200/90 rounded-2xl shadow-xs space-y-1">
          <p className="text-[11px] font-semibold text-emerald-700">Online</p>
          <p className="text-2xl font-black text-emerald-600">{metrics.online}</p>
          <p className="text-[10px] text-emerald-700/80">Bot terhubung</p>
        </div>

        <div className="p-4 bg-white border border-slate-200/90 rounded-2xl shadow-xs space-y-1">
          <p className="text-[11px] font-semibold text-slate-600">Offline</p>
          <p className="text-2xl font-black text-slate-700">{metrics.offline}</p>
          <p className="text-[10px] text-slate-400">Dimatikan tenant</p>
        </div>

        <div className="p-4 bg-white border border-slate-200/90 rounded-2xl shadow-xs space-y-1">
          <p className="text-[11px] font-semibold text-rose-700">Suspend</p>
          <p className="text-2xl font-black text-rose-600">{metrics.suspend}</p>
          <p className="text-[10px] text-rose-700/80">Dimatikan admin</p>
        </div>

        <div className="p-4 bg-white border border-slate-200/90 rounded-2xl shadow-xs space-y-1">
          <p className="text-[11px] font-semibold text-slate-500">Nonaktif</p>
          <p className="text-2xl font-black text-slate-500">{metrics.nonaktif}</p>
          <p className="text-[10px] text-slate-400">Belum di-set tenant</p>
        </div>
      </div>

      {/* Banner Informasi Kebijakan Privasi */}
      <div className="p-4 bg-sky-50/70 border border-sky-100 rounded-2xl flex items-start gap-3 text-xs text-sky-900">
        <Info className="w-5 h-5 text-sky-600 shrink-0 mt-0.5" />
        <div className="space-y-0.5">
          <p className="font-bold text-sky-950">Privasi Kredensial Bot Terjamin Sepenuhnya</p>
          <p className="text-sky-800 leading-relaxed text-[11px]">
            Sesuai standar keamanan sistem, Master Admin hanya dapat melihat status operasional bot dan menonaktifkannya melalui sakelar kontrol. Token rahasia bot dan ID obrolan pemilik toko tidak dapat diakses atau dilihat oleh siapapun.
          </p>
        </div>
      </div>

      {/* Toolbar Filter & Pencarian */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 bg-white border border-slate-200/90 rounded-2xl shadow-xs">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari toko atau ID tenant..."
            className="w-full pl-9 pr-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-sky-500 focus:bg-white transition"
          />
        </div>

        {/* Status Filter Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          <button
            type="button"
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 rounded-xl font-semibold transition cursor-pointer text-[11px] ${
              statusFilter === 'all'
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Semua ({metrics.total})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('online')}
            className={`px-3 py-1.5 rounded-xl font-semibold transition cursor-pointer text-[11px] ${
              statusFilter === 'online'
                ? 'bg-emerald-600 text-white'
                : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
            }`}
          >
            Online ({metrics.online})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('offline')}
            className={`px-3 py-1.5 rounded-xl font-semibold transition cursor-pointer text-[11px] ${
              statusFilter === 'offline'
                ? 'bg-slate-600 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Offline ({metrics.offline})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('suspend')}
            className={`px-3 py-1.5 rounded-xl font-semibold transition cursor-pointer text-[11px] ${
              statusFilter === 'suspend'
                ? 'bg-rose-600 text-white'
                : 'bg-rose-50 text-rose-700 hover:bg-rose-100'
            }`}
          >
            Suspend ({metrics.suspend})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('nonaktif')}
            className={`px-3 py-1.5 rounded-xl font-semibold transition cursor-pointer text-[11px] ${
              statusFilter === 'nonaktif'
                ? 'bg-slate-500 text-white'
                : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
            }`}
          >
            Nonaktif ({metrics.nonaktif})
          </button>
        </div>
      </div>

      {/* Tabel Data Tenant Bot Telegram */}
      <div className="bg-white border border-slate-200/90 rounded-2xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-bold text-[11px] uppercase tracking-wider">
                <th className="py-3 px-4">ID Tenant</th>
                <th className="py-3 px-4">Nama Toko</th>
                <th className="py-3 px-4">Status Bot</th>
                <th className="py-3 px-4">Terakhir Diperbarui</th>
                <th className="py-3 px-4 text-center">Kirim Pesan</th>
                <th className="py-3 px-4 text-center">Aksi Management</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <Send className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    <p className="text-xs font-semibold">Tidak ada data unit yang cocok dengan pencarian.</p>
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => {
                  const isSuspended = item.adminDisabled;
                  const isToggling = togglingId === item.tenantId;

                  return (
                    <tr key={item.tenantId} className="hover:bg-slate-50/50 transition">
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                        {item.tenantId}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-800">{item.storeName}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        {renderStatusBadge(item.status)}
                      </td>
                      <td className="py-3.5 px-4 text-slate-500 font-mono text-[11px]">
                        {item.updatedAt ? new Date(item.updatedAt).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' }) : '-'}
                      </td>

                      {/* KOLOM 1: KIRIM PESAN */}
                      <td className="py-3.5 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => handleOpenMessageModal(item)}
                          disabled={!item.isConfigured}
                          title={item.isConfigured ? 'Kirim pesan ke Telegram owner' : 'Tenant belum memasang bot'}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-50 text-sky-700 hover:bg-sky-100 border border-sky-200 transition font-semibold text-[11px] cursor-pointer disabled:opacity-35 disabled:cursor-not-allowed active:scale-[0.98]"
                        >
                          <Send className="w-3.5 h-3.5 text-sky-600" />
                          <span>Kirim Pesan</span>
                        </button>
                      </td>

                      {/* KOLOM 2: AKSI MANAGEMENT (TOGGLE ON/OFF SAKELAR ADMIN) */}
                      <td className="py-3.5 px-4 text-center">
                        <div className="inline-flex items-center justify-center gap-2">
                          <button
                            type="button"
                            role="switch"
                            aria-checked={!isSuspended}
                            disabled={isToggling}
                            onClick={() => handleToggleBot(item)}
                            title={isSuspended ? 'Nyalakan kembali bot (buka suspend)' : 'Matikan bot (suspend)'}
                            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 disabled:opacity-50 ${
                              !isSuspended ? 'bg-emerald-500' : 'bg-slate-300'
                            }`}
                          >
                            <span className="sr-only">Toggle Status Bot</span>
                            <span
                              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out flex items-center justify-center ${
                                !isSuspended ? 'translate-x-5' : 'translate-x-0'
                              }`}
                            >
                              {isToggling && (
                                <RefreshCw className="w-2.5 h-2.5 animate-spin text-slate-600" />
                              )}
                            </span>
                          </button>

                          <span
                            className={`text-[11px] font-bold min-w-[50px] text-left ${
                              !isSuspended ? 'text-emerald-700' : 'text-rose-600'
                            }`}
                          >
                            {!isSuspended ? 'ON' : 'OFF'}
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Kirim Pesan Telegram */}
      <SendTelegramMessageModal
        isOpen={isMessageModalOpen}
        onClose={() => setIsMessageModalOpen(false)}
        tenant={selectedTenantForMessage}
        onSuccess={(msg) => {
          showToast(msg);
        }}
      />
    </div>
  );
};
