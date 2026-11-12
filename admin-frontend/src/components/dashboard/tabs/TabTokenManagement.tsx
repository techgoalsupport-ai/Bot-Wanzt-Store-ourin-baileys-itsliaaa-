import React, { useState, useMemo, useEffect } from 'react';
import {
  Ticket,
  Plus,
  Search,
  Copy,
  Check,
  Calendar,
  Clock,
  ShieldCheck,
  CheckCircle2,
  Trash2,
  RefreshCw,
} from 'lucide-react';
import { LicenseToken, DurationUnit } from '../../../types/admin.types';
import { CreateTokenModal } from '../../modals/CreateTokenModal';
import { TokenCreatedModal } from '../../modals/TokenCreatedModal';

interface TabTokenManagementProps {
  showToast: (msg: string) => void;
}

export const TabTokenManagement: React.FC<TabTokenManagementProps> = ({ showToast }) => {
  const [tokens, setTokens] = useState<LicenseToken[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [newlyCreatedToken, setNewlyCreatedToken] = useState<{
    code: string;
    label: string;
  } | null>(null);

  // Filter State
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'available' | 'used'>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Pemuatan data token dari backend
  const fetchTokens = async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/admin/tokens');
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setTokens(json.data);
      }
    } catch (err: any) {
      console.error('[Fetch Tokens Error]:', err);
      showToast('Gagal memuat daftar token: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTokens();
  }, []);

  // Handler Pembuatan Token Baru via Backend API
  const handleConfirmCreateToken = async (amount: number, unit: DurationUnit) => {
    try {
      const res = await fetch('/api/admin/tokens/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount, unit }),
      });
      const json = await res.json();

      if (json.success && json.data) {
        setTokens((prev) => [json.data, ...prev]);
        setIsCreateModalOpen(false);
        setNewlyCreatedToken({ code: json.data.token_code, label: json.data.duration_label });
        showToast(`Token ${json.data.token_code} (${json.data.duration_label}) berhasil dibuat!`);
      } else {
        showToast(json.message || 'Gagal membuat token baru.');
      }
    } catch (err: any) {
      showToast('Terjadi kesalahan saat membuat token: ' + err.message);
    }
  };

  // Handler Hapus Token
  const handleDeleteToken = async (id: string, code: string) => {
    if (!window.confirm(`Apakah Anda yakin ingin menghapus token "${code}"?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/admin/tokens/${id}`, {
        method: 'DELETE',
      });
      const json = await res.json();

      if (json.success) {
        setTokens((prev) => prev.filter((t) => t.id !== id));
        showToast(`Token ${code} berhasil dihapus.`);
      } else {
        showToast(json.message || 'Gagal menghapus token.');
      }
    } catch (err: any) {
      showToast('Gagal menghapus token: ' + err.message);
    }
  };

  const handleCopyToken = (id: string, code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    showToast(`Kode token ${code} disalin ke clipboard!`);
    setTimeout(() => setCopiedId(null), 2500);
  };

  // Filter & Search Logic
  const filteredTokens = useMemo(() => {
    return tokens.filter((t) => {
      if (statusFilter !== 'all' && t.status !== statusFilter) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        return (
          t.token_code.toLowerCase().includes(q) ||
          t.duration_label.toLowerCase().includes(q) ||
          (t.used_by_tenant_id && t.used_by_tenant_id.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [tokens, statusFilter, searchQuery]);

  // Metrik Penghitungan
  const totalTokens = tokens.length;
  const availableTokens = tokens.filter((t) => t.status === 'available').length;
  const usedTokens = tokens.filter((t) => t.status === 'used').length;

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Header Halaman */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 sm:p-6 bg-white border border-slate-200/90 rounded-2xl shadow-xs">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-[#0084D1]/10 text-[#0084D1] flex items-center justify-center font-bold">
              <Ticket className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Management Token Lisensi</h2>
              <p className="text-xs text-slate-500">
                Buat dan kelola voucher 16-karakter perpanjangan masa sewa bot multi-tenant
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={fetchTokens}
            title="Muat Ulang Data Token"
            disabled={isLoading}
            className="w-10 h-10 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 flex items-center justify-center transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-[#0084D1]' : ''}`} />
          </button>

          <button
            type="button"
            onClick={() => setIsCreateModalOpen(true)}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#0084D1] hover:bg-[#0073B7] active:scale-[0.98] text-white font-bold text-xs shadow-xs hover:shadow-md transition-all shrink-0 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Buat Token Baru</span>
          </button>
        </div>
      </div>

      {/* 3 Kartu Metrik Ringkasan Token */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-5">
        <div className="p-5 bg-white border border-slate-200/90 rounded-2xl shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">
              Total Token
            </span>
            <span className="text-2xl font-extrabold text-slate-900 font-mono">
              {totalTokens}
            </span>
          </div>
          <div className="w-11 h-11 rounded-xl bg-sky-50 text-[#0084D1] flex items-center justify-center font-bold">
            <Ticket className="w-5 h-5" />
          </div>
        </div>

        <div className="p-5 bg-white border border-slate-200/90 rounded-2xl shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">
              Token Tersedia
            </span>
            <span className="text-2xl font-extrabold text-emerald-600 font-mono">
              {availableTokens}
            </span>
          </div>
          <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="p-5 bg-white border border-slate-200/90 rounded-2xl shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">
              Token Terpakai
            </span>
            <span className="text-2xl font-extrabold text-slate-600 font-mono">
              {usedTokens}
            </span>
          </div>
          <div className="w-11 h-11 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center font-bold">
            <ShieldCheck className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Kontrol Pencarian & Filter Status */}
      <div className="p-4 sm:p-5 bg-white border border-slate-200/90 rounded-2xl shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 w-full md:w-auto overflow-x-auto pb-1 md:pb-0 scrollbar-none">
          <button
            type="button"
            onClick={() => setStatusFilter('all')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-colors whitespace-nowrap cursor-pointer ${
              statusFilter === 'all'
                ? 'bg-[#0084D1] text-white shadow-2xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Semua ({totalTokens})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('available')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-colors whitespace-nowrap cursor-pointer ${
              statusFilter === 'available'
                ? 'bg-emerald-600 text-white shadow-2xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Tersedia ({availableTokens})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('used')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-colors whitespace-nowrap cursor-pointer ${
              statusFilter === 'used'
                ? 'bg-slate-700 text-white shadow-2xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Terpakai ({usedTokens})
          </button>
        </div>

        {/* Input Pencarian */}
        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari kode token atau tenant..."
            className="w-full h-10 pl-9 pr-4 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:border-[#0084D1] outline-hidden transition-colors"
          />
        </div>
      </div>

      {/* Tabel Manajemen Token */}
      <div className="bg-white border border-slate-200/90 rounded-2xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200/80 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                <th className="py-3.5 px-4 sm:px-5">Kode Token (16 Karakter)</th>
                <th className="py-3.5 px-4 sm:px-5">Tanggal Pembuatan</th>
                <th className="py-3.5 px-4 sm:px-5">Masa Aktif Token</th>
                <th className="py-3.5 px-4 sm:px-5">Status Token</th>
                <th className="py-3.5 px-4 sm:px-5 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400 space-y-2">
                    <RefreshCw className="w-7 h-7 mx-auto animate-spin text-[#0084D1]" />
                    <p className="text-xs">Memuat data token dari server...</p>
                  </td>
                </tr>
              ) : filteredTokens.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400 space-y-2">
                    <Ticket className="w-8 h-8 mx-auto text-slate-300" />
                    <p className="text-xs">Belum ada token lisensi atau tidak cocok dengan filter pencarian.</p>
                  </td>
                </tr>
              ) : (
                filteredTokens.map((token) => (
                  <tr key={token.id} className="hover:bg-slate-50/60 transition-colors">
                    {/* Kode Token */}
                    <td className="py-3.5 px-4 sm:px-5">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm font-extrabold text-slate-900 tracking-wider">
                          {token.token_code}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleCopyToken(token.id, token.token_code)}
                          title="Salin Kode Token"
                          className="p-1 rounded-md text-slate-400 hover:text-[#0084D1] hover:bg-sky-50 transition-colors cursor-pointer"
                        >
                          {copiedId === token.id ? (
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </td>

                    {/* Tanggal Pembuatan */}
                    <td className="py-3.5 px-4 sm:px-5">
                      <div className="flex items-center gap-1.5 text-slate-600 font-medium">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        <span>{token.created_at}</span>
                      </div>
                    </td>

                    {/* Masa Aktif Token */}
                    <td className="py-3.5 px-4 sm:px-5">
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-sky-50 border border-sky-100 text-[#0084D1] font-bold font-mono">
                        <Clock className="w-3 h-3 text-[#0084D1]" />
                        <span>{token.duration_label}</span>
                      </div>
                    </td>

                    {/* Status Token */}
                    <td className="py-3.5 px-4 sm:px-5">
                      {token.status === 'available' ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          Tersedia
                        </span>
                      ) : (
                        <div className="space-y-0.5">
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                            Terpakai
                          </span>
                          {token.used_by_tenant_id && (
                            <span className="block text-[10px] text-slate-500 font-mono">
                              Tenant: {token.used_by_tenant_id} {token.used_at ? `(${token.used_at})` : ''}
                            </span>
                          )}
                        </div>
                      )}
                    </td>

                    {/* Aksi */}
                    <td className="py-3.5 px-4 sm:px-5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleCopyToken(token.id, token.token_code)}
                          className="px-2.5 py-1.5 rounded-lg bg-slate-50 hover:bg-sky-50 text-slate-600 hover:text-[#0084D1] border border-slate-200 hover:border-sky-200 text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                        >
                          {copiedId === token.id ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                              <span className="text-emerald-700">Tersalin</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" />
                              <span>Salin</span>
                            </>
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeleteToken(token.id, token.token_code)}
                          title="Hapus Token"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Buat Token */}
      <CreateTokenModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onConfirm={handleConfirmCreateToken}
      />

      {/* Modal Popup Token Baru Dibuat */}
      {newlyCreatedToken && (
        <TokenCreatedModal
          isOpen={Boolean(newlyCreatedToken)}
          tokenCode={newlyCreatedToken.code}
          durationLabel={newlyCreatedToken.label}
          onClose={() => setNewlyCreatedToken(null)}
          showToast={showToast}
        />
      )}
    </div>
  );
};
