import React, { useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { Tenant } from '../../types/admin.types.ts';
import { TenantTableRow } from './TenantTableRow.tsx';

interface TenantTableProps {
  tenants: Tenant[];
  loading: boolean;
  onImpersonate: (tenant: Tenant) => void;
  onOpenSendMessage: (tenant: Tenant) => void;
  onOpenExtend: (tenant: Tenant) => void;
  onToggleSuspend: (tenant: Tenant) => void;
  onOpenResetPassword: (tenant: Tenant) => void;
  onOpenDelete: (tenant: Tenant) => void;
}

export const TenantTable: React.FC<TenantTableProps> = ({
  tenants,
  loading,
  onImpersonate,
  onOpenSendMessage,
  onOpenExtend,
  onToggleSuspend,
  onOpenResetPassword,
  onOpenDelete,
}) => {
  const [nowMs, setNowMs] = useState<number>(() => Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNowMs(Date.now());
    }, 1000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <section className="bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-xs">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[1320px]">
          <thead>
            <tr className="border-b border-slate-200/90 text-[11px] font-bold text-slate-600 uppercase tracking-wider bg-slate-50 select-none">
              <th className="py-3.5 px-3.5 whitespace-nowrap">Status</th>
              <th className="py-3.5 px-3.5 whitespace-nowrap">ID Bot</th>
              <th className="py-3.5 px-3.5 whitespace-nowrap">Toko</th>
              <th className="py-3.5 px-3.5 whitespace-nowrap">Owner</th>
              <th className="py-3.5 px-3.5 whitespace-nowrap">No. WhatsApp</th>
              <th className="py-3.5 px-3.5 whitespace-nowrap">Username</th>
              <th className="py-3.5 px-3.5 whitespace-nowrap">Masa Sewa</th>
              <th className="py-3.5 px-3.5 whitespace-nowrap">Expired</th>
              <th className="py-3.5 px-3.5 whitespace-nowrap">Status Bot</th>
              <th className="py-3.5 px-3.5 whitespace-nowrap text-center">Pesan</th>
              <th className="py-3.5 px-3.5 whitespace-nowrap text-center">Perpanjang</th>
              <th className="py-3.5 px-3.5 whitespace-nowrap text-center">Suspend</th>
              <th className="py-3.5 px-3.5 whitespace-nowrap text-center">Reset</th>
              <th className="py-3.5 px-3.5 whitespace-nowrap text-center">Hapus</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
            {loading ? (
              <tr>
                <td colSpan={14} className="py-12 text-center text-slate-500">
                  <RefreshCw className="w-6 h-6 animate-spin mx-auto text-[#0084D1] mb-2" />
                  Memuat data apartemen...
                </td>
              </tr>
            ) : tenants.length === 0 ? (
              <tr>
                <td colSpan={14} className="py-12 text-center text-slate-500">
                  Tidak ada data unit apartemen yang cocok.
                </td>
              </tr>
            ) : (
              tenants.map((tenant) => (
                <TenantTableRow
                  key={tenant.id}
                  tenant={tenant}
                  nowMs={nowMs}
                  onImpersonate={onImpersonate}
                  onOpenSendMessage={onOpenSendMessage}
                  onOpenExtend={onOpenExtend}
                  onToggleSuspend={onToggleSuspend}
                  onOpenResetPassword={onOpenResetPassword}
                  onOpenDelete={onOpenDelete}
                />
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
};
