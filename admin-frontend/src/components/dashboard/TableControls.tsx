import React from 'react';
import { Plus, Search, ArrowUpDown } from 'lucide-react';
import { Stats, Tenant } from '../../types/admin.types.ts';

interface TableControlsProps {
  tenants: Tenant[];
  stats: Stats | null;
  statusFilter: 'all' | 'active' | 'expired' | 'suspended';
  setStatusFilter: (filter: 'all' | 'active' | 'expired' | 'suspended') => void;
  sortBy: 'duration_desc' | 'duration_asc' | 'newest';
  setSortBy: (sort: 'duration_desc' | 'duration_asc' | 'newest') => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  onOpenAddModal: () => void;
}

export const TableControls: React.FC<TableControlsProps> = ({
  tenants,
  stats,
  statusFilter,
  setStatusFilter,
  sortBy,
  setSortBy,
  searchQuery,
  setSearchQuery,
  onOpenAddModal,
}) => {
  return (
    <section className="space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight">Daftar Unit Apartemen Toko</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Kelola seluruh instance bot WhatsApp penyewa, durasi sewa, dan status operasional.
          </p>
        </div>

        <button
          type="button"
          onClick={onOpenAddModal}
          className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-white bg-[#0084D1] hover:bg-[#0073B7] active:scale-95 rounded-xl transition-all shadow-xs cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Daftarkan Unit Baru</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 p-2 bg-white border border-slate-200/90 rounded-2xl shadow-xs">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
          <button
            type="button"
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
              statusFilter === 'all'
                ? 'bg-[#0084D1] text-white shadow-2xs font-bold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
            }`}
          >
            Semua Unit ({tenants.length})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('active')}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
              statusFilter === 'active'
                ? 'bg-emerald-600 text-white shadow-2xs font-bold'
                : 'text-slate-600 hover:text-emerald-700 hover:bg-emerald-50'
            }`}
          >
            Aktif ({stats?.activeTenants ?? 0})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('expired')}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
              statusFilter === 'expired'
                ? 'bg-rose-600 text-white shadow-2xs font-bold'
                : 'text-slate-600 hover:text-rose-700 hover:bg-rose-50'
            }`}
          >
            Expired ({stats?.expiredTenants ?? 0})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('suspended')}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
              statusFilter === 'suspended'
                ? 'bg-amber-600 text-white shadow-2xs font-bold'
                : 'text-slate-600 hover:text-amber-700 hover:bg-amber-50'
            }`}
          >
            Ditangguhkan ({stats?.suspendedTenants ?? 0})
          </button>
        </div>

        <div className="flex items-center gap-2">
          {/* Sorting Control */}
          <div className="relative flex items-center">
            <ArrowUpDown className="w-3.5 h-3.5 absolute left-3 text-slate-400 pointer-events-none" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-slate-50 border border-slate-300 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-700 focus:bg-white focus:outline-none focus:border-[#0084D1] cursor-pointer transition-colors"
            >
              <option value="duration_desc">Masa Sewa: Terpanjang</option>
              <option value="duration_asc">Masa Sewa: Segera Habis</option>
              <option value="newest">Paling Baru Terdaftar</option>
            </select>
          </div>

          {/* Search Input */}
          <div className="relative flex-1 md:w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari toko, pemilik, no WA..."
              className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-[#0084D1] transition-colors"
            />
          </div>
        </div>
      </div>
    </section>
  );
};
