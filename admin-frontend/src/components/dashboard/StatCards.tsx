import React from 'react';
import { Users, ShieldCheck, Clock, AlertTriangle } from 'lucide-react';
import { Stats, Tenant } from '../../types/admin.types.ts';

interface StatCardsProps {
  stats: Stats | null;
  tenants: Tenant[];
}

export const StatCards: React.FC<StatCardsProps> = ({ stats, tenants }) => {
  return (
    <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* 1. Total Unit */}
      <div className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-xs flex items-center justify-between hover:border-slate-300 transition-all">
        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Unit Terdaftar</p>
          <h3 className="text-2xl font-bold text-slate-900 mt-1">{stats?.totalTenants ?? tenants.length}</h3>
          <p className="text-[11px] text-slate-400 mt-0.5">Seluruh penyewa toko</p>
        </div>
        <div className="w-12 h-12 rounded-xl bg-[#0084D1]/10 border border-[#0084D1]/20 flex items-center justify-center text-[#0084D1] shrink-0">
          <Users className="w-6 h-6 stroke-[1.8]" />
        </div>
      </div>

      {/* 2. Unit Aktif */}
      <div className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-xs flex items-center justify-between hover:border-slate-300 transition-all">
        <div>
          <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wider">Unit Aktif</p>
          <h3 className="text-2xl font-bold text-slate-900 mt-1">{stats?.activeTenants ?? 0}</h3>
          <p className="text-[11px] text-slate-400 mt-0.5">Bot berjalan normal</p>
        </div>
        <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 shrink-0">
          <ShieldCheck className="w-6 h-6 stroke-[1.8]" />
        </div>
      </div>

      {/* 3. Masa Sewa Habis */}
      <div className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-xs flex items-center justify-between hover:border-slate-300 transition-all">
        <div>
          <p className="text-xs font-semibold text-rose-600 uppercase tracking-wider">Masa Sewa Habis</p>
          <h3 className="text-2xl font-bold text-slate-900 mt-1">{stats?.expiredTenants ?? 0}</h3>
          <p className="text-[11px] text-slate-400 mt-0.5">Perlu perpanjangan</p>
        </div>
        <div className="w-12 h-12 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 shrink-0">
          <Clock className="w-6 h-6 stroke-[1.8]" />
        </div>
      </div>

      {/* 4. Unit Ditangguhkan */}
      <div className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-xs flex items-center justify-between hover:border-slate-300 transition-all">
        <div>
          <p className="text-xs font-semibold text-amber-600 uppercase tracking-wider">Unit Ditangguhkan</p>
          <h3 className="text-2xl font-bold text-slate-900 mt-1">{stats?.suspendedTenants ?? 0}</h3>
          <p className="text-[11px] text-slate-400 mt-0.5">Bot dinonaktifkan</p>
        </div>
        <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 shrink-0">
          <AlertTriangle className="w-6 h-6 stroke-[1.8]" />
        </div>
      </div>
    </section>
  );
};
