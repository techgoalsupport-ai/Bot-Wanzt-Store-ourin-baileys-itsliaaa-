import React from 'react';
import {
  ExternalLink,
  Phone,
  MessageSquare,
  Calendar,
  KeyRound,
  Trash2,
} from 'lucide-react';
import { Tenant } from '../../types/admin.types.ts';
import { formatIndonesianPhone } from '../../utils/phoneHelper.ts';
import {
  formatCompactCountdown,
  formatTotalRentalDuration,
  formatExpiryDateTimeWIB,
} from '../../utils/durationFormat.ts';

interface TenantTableRowProps {
  tenant: Tenant;
  nowMs: number;
  onImpersonate: (tenant: Tenant) => void;
  onOpenSendMessage: (tenant: Tenant) => void;
  onOpenExtend: (tenant: Tenant) => void;
  onToggleSuspend: (tenant: Tenant) => void;
  onOpenResetPassword: (tenant: Tenant) => void;
  onOpenDelete: (tenant: Tenant) => void;
}

export const TenantTableRow: React.FC<TenantTableRowProps> = ({
  tenant,
  nowMs,
  onImpersonate,
  onOpenSendMessage,
  onOpenExtend,
  onToggleSuspend,
  onOpenResetPassword,
  onOpenDelete,
}) => {
  const isExp = tenant.status === 'expired';
  const isSusp = tenant.status === 'suspended';
  const countdown = formatCompactCountdown(tenant.expires_at, nowMs);
  const totalDurationLabel = formatTotalRentalDuration(
    tenant.created_at,
    tenant.expires_at,
    tenant.duration_days
  );
  const expiryDisplay = formatExpiryDateTimeWIB(tenant.expires_at, false);

  return (
    <tr className="hover:bg-slate-50/80 transition-colors border-b border-slate-100">
      {/* 1. Status Akun */}
      <td className="py-3.5 px-3.5 whitespace-nowrap">
        {tenant.status === 'active' && (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            Aktif
          </span>
        )}
        {isSusp && (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            Suspend
          </span>
        )}
        {isExp && (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
            Expired
          </span>
        )}
      </td>

      {/* 2. ID Bot */}
      <td className="py-3.5 px-3.5 whitespace-nowrap">
        <span className="font-mono text-xs text-slate-800 font-semibold">{tenant.tenant_id}</span>
      </td>

      {/* 3. Toko (+ Impersonasi) */}
      <td className="py-3.5 px-3.5 whitespace-nowrap">
        <div className="flex items-center gap-1.5">
          <span className="font-bold text-slate-900">
            {tenant.store_name ? (
              tenant.store_name
            ) : (
              <span className="text-slate-400 italic font-normal text-xs">(Belum Dinamai)</span>
            )}
          </span>
          <button
            type="button"
            onClick={() => onImpersonate(tenant)}
            className="text-slate-400 hover:text-[#0084D1] p-0.5 rounded transition-colors cursor-pointer"
            title="Masuk ke Dashboard Toko (Impersonasi)"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </button>
        </div>
      </td>

      {/* 4. Owner */}
      <td className="py-3.5 px-3.5 whitespace-nowrap">
        <span className="text-slate-700 font-medium">
          {tenant.owner_name ? (
            tenant.owner_name
          ) : (
            <span className="text-slate-400 italic font-normal text-[11px]">-</span>
          )}
        </span>
      </td>

      {/* 5. No. WhatsApp */}
      <td className="py-3.5 px-3.5 whitespace-nowrap">
        {(() => {
          if (!tenant.owner_phone || !tenant.owner_phone.trim()) {
            return <span className="text-slate-400 italic font-normal text-[11px]">-</span>;
          }
          const phone = formatIndonesianPhone(tenant.owner_phone);
          return (
            <a
              href={`https://wa.me/${phone.cleanDigits}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-slate-700 hover:text-[#0084D1] transition-colors font-mono text-xs"
              title="Kirim WhatsApp ke Pemilik"
            >
              <Phone className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>{phone.display}</span>
            </a>
          );
        })()}
      </td>

      {/* 6. Username */}
      <td className="py-3.5 px-3.5 whitespace-nowrap">
        <span className="font-mono text-xs text-slate-800 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
          {tenant.username}
        </span>
      </td>

      {/* 7. Masa Sewa */}
      <td className="py-3.5 px-3.5 whitespace-nowrap">
        <div className="font-bold text-slate-900">
          {totalDurationLabel}
        </div>
        <div
          className={`text-[10px] font-mono tabular-nums mt-0.5 font-semibold ${
            countdown.expired || countdown.isCritical
              ? 'text-rose-600'
              : countdown.isUrgent
              ? 'text-amber-600'
              : 'text-slate-500'
          }`}
        >
          {countdown.expired ? 'Masa sewa habis' : `Sisa ${countdown.text}`}
        </div>
      </td>

      {/* 8. Expired */}
      <td className="py-3.5 px-3.5 whitespace-nowrap">
        <div className="text-slate-700 font-medium text-xs">
          {expiryDisplay.dateText}
        </div>
        <div className="text-[10px] font-mono tabular-nums text-slate-500 mt-0.5">
          {expiryDisplay.timeText}
        </div>
      </td>

      {/* 9. Status Bot Baileys */}
      <td className="py-3.5 px-3.5 whitespace-nowrap">
        {tenant.bot_status === 'online' ? (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            Online
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
            <span className="w-2 h-2 rounded-full bg-slate-400"></span>
            Offline
          </span>
        )}
      </td>

      {/* 10. Pesan ke Owner */}
      <td className="py-3.5 px-3.5 whitespace-nowrap text-center">
        <button
          type="button"
          onClick={() => onOpenSendMessage(tenant)}
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-all active:scale-95 cursor-pointer whitespace-nowrap"
          title="Kirim Pesan WhatsApp Resmi ke Owner Toko"
        >
          <MessageSquare className="w-3.5 h-3.5" />
          <span>Pesan</span>
        </button>
      </td>

      {/* 11. Perpanjang */}
      <td className="py-3.5 px-3.5 whitespace-nowrap text-center">
        <button
          type="button"
          onClick={() => onOpenExtend(tenant)}
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-[#0084D1] bg-sky-50 hover:bg-sky-100 border border-sky-200 rounded-lg transition-all active:scale-95 cursor-pointer whitespace-nowrap"
          title="Perpanjang Masa Sewa"
        >
          <Calendar className="w-3.5 h-3.5" />
          <span>Perpanjang</span>
        </button>
      </td>

      {/* 12. Suspend (Toggle Switch) */}
      <td className="py-3.5 px-3.5 whitespace-nowrap text-center">
        <div className="inline-flex items-center justify-center">
          <button
            type="button"
            role="switch"
            aria-checked={tenant.status === 'suspended'}
            onClick={() => onToggleSuspend(tenant)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none cursor-pointer ${
              tenant.status === 'suspended' ? 'bg-amber-500' : 'bg-slate-300 hover:bg-slate-400'
            }`}
            title={
              tenant.status === 'suspended'
                ? 'Suspend ON: Bot dinonaktifkan (Klik untuk mengaktifkan kembali)'
                : 'Suspend OFF: Bot aktif normal (Klik untuk men-suspend)'
            }
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-xs transition-transform ${
                tenant.status === 'suspended' ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
      </td>

      {/* 13. Reset (Reset Password) */}
      <td className="py-3.5 px-3.5 whitespace-nowrap text-center">
        <button
          type="button"
          onClick={() => onOpenResetPassword(tenant)}
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg transition-all active:scale-95 cursor-pointer whitespace-nowrap"
          title="Reset Password Akun Tenant"
        >
          <KeyRound className="w-3.5 h-3.5" />
          <span>Reset</span>
        </button>
      </td>

      {/* 14. Hapus */}
      <td className="py-3.5 px-3.5 whitespace-nowrap text-center">
        {tenant.tenant_id === 't_wanzt' ? (
          <span
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-400 bg-slate-100 border border-slate-200 rounded-lg cursor-not-allowed opacity-60 whitespace-nowrap"
            title="Tenant default sistem tidak dapat dihapus"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Hapus</span>
          </span>
        ) : (
          <button
            type="button"
            onClick={() => onOpenDelete(tenant)}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-all active:scale-95 cursor-pointer whitespace-nowrap"
            title="Hapus Akun Tenant Permanen"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Hapus</span>
          </button>
        )}
      </td>
    </tr>
  );
};
