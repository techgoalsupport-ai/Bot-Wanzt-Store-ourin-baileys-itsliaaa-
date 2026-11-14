import { useState, useEffect, useMemo } from 'react';
import { Tenant, Stats } from './types/admin.types.ts';
import { AdminSidebar, AdminNavTab } from './components/layout/AdminSidebar.tsx';
import { AdminHeader } from './components/layout/AdminHeader.tsx';
import { StatCards } from './components/dashboard/StatCards.tsx';
import { TableControls } from './components/dashboard/TableControls.tsx';
import { TenantTable } from './components/dashboard/TenantTable.tsx';
import { AddTenantModal } from './components/modals/AddTenantModal.tsx';
import { ExtendTenantModal } from './components/modals/ExtendTenantModal.tsx';
import { ResetPasswordModal } from './components/modals/ResetPasswordModal.tsx';
import { SendMessageModal } from './components/modals/SendMessageModal.tsx';
import { DeleteTenantModal } from './components/modals/DeleteTenantModal.tsx';
import { ToggleSuspendModal } from './components/modals/ToggleSuspendModal.tsx';
import { TabTemplates } from './components/dashboard/tabs/TabTemplates.tsx';
import { TabTelegramAdmin } from './components/dashboard/tabs/TabTelegramAdmin.tsx';
import { TabTokenManagement } from './components/dashboard/tabs/TabTokenManagement.tsx';
import { TabPartnerApi } from './components/dashboard/tabs/TabPartnerApi.tsx';
import { TabMasterSettings } from './components/dashboard/tabs/TabMasterSettings.tsx';
import {
  Radio,
  BarChart3,
  CheckCircle2,
  Server,
} from 'lucide-react';

export default function App() {
  const [selectedNavTab, setSelectedNavTab] = useState<AdminNavTab>('units');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState<boolean>(false);

  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'expired' | 'suspended'>('all');
  const [sortBy, setSortBy] = useState<'duration_desc' | 'duration_asc' | 'newest'>('duration_desc');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [selectedTenantForExtend, setSelectedTenantForExtend] = useState<Tenant | null>(null);
  const [selectedTenantForReset, setSelectedTenantForReset] = useState<Tenant | null>(null);
  const [selectedTenantForMessage, setSelectedTenantForMessage] = useState<Tenant | null>(null);
  const [selectedTenantForDelete, setSelectedTenantForDelete] = useState<Tenant | null>(null);
  const [selectedTenantForSuspend, setSelectedTenantForSuspend] = useState<Tenant | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const [tenantsRes, statsRes] = await Promise.all([
        fetch('/api/admin/tenants'),
        fetch('/api/admin/stats'),
      ]);
      const tenantsData = await tenantsRes.json();
      const statsData = await statsRes.json();

      if (tenantsData.success) {
        setTenants(tenantsData.data);
      }
      if (statsData.success) {
        setStats(statsData.data);
      }
    } catch (err: any) {
      showToast('Gagal memuat data dari server: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleImpersonate = async (tenant: Tenant) => {
    try {
      const res = await fetch(`/api/admin/tenants/${tenant.tenant_id}/impersonate`, {
        method: 'POST',
      });
      const data = await res.json();
      if (data.success && data.redirectUrl) {
        window.open(data.redirectUrl, '_blank');
      } else {
        showToast(data.message || 'Gagal membuat sesi impersonasi');
      }
    } catch (err: any) {
      showToast('Error: ' + err.message);
    }
  };

  // Filter & Sorting Logic
  const filteredTenants = useMemo(() => {
    let result = [...tenants];

    if (statusFilter !== 'all') {
      result = result.filter((t) => t.status === statusFilter);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (t) =>
          t.store_name.toLowerCase().includes(q) ||
          t.owner_name.toLowerCase().includes(q) ||
          t.owner_phone.includes(q) ||
          t.tenant_id.toLowerCase().includes(q) ||
          t.username.toLowerCase().includes(q)
      );
    }

    if (sortBy === 'duration_desc') {
      result.sort((a, b) => new Date(b.expires_at).getTime() - new Date(a.expires_at).getTime());
    } else if (sortBy === 'duration_asc') {
      result.sort((a, b) => new Date(a.expires_at).getTime() - new Date(b.expires_at).getTime());
    } else if (sortBy === 'newest') {
      result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }

    return result;
  }, [tenants, statusFilter, searchQuery, sortBy]);

  return (
    <div className="min-h-[100dvh] bg-[#F8FAFC] text-slate-800 flex font-sans antialiased">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-800 text-xs shadow-xl flex items-center gap-2 animate-bounce">
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
          <span className="font-semibold">{toastMessage}</span>
        </div>
      )}

      {/* Sidebar Navigasi Master */}
      <AdminSidebar
        selectedTab={selectedNavTab}
        setSelectedTab={setSelectedNavTab}
        isCollapsed={isSidebarCollapsed}
        setIsCollapsed={setIsSidebarCollapsed}
        totalTenants={tenants.length}
        activeTenants={stats?.activeTenants ?? 0}
        loading={loading}
        onRefresh={fetchData}
        isMobileOpen={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
      />

      {/* Main Workspace Column */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header */}
        <AdminHeader
          selectedTab={selectedNavTab}
          loading={loading}
          onRefresh={fetchData}
          onOpenMobileMenu={() => setIsMobileSidebarOpen(true)}
        />

        {/* Content Workspace */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl w-full mx-auto">
          {selectedNavTab === 'units' && (
            <>
              {/* Metric Cards */}
              <StatCards stats={stats} tenants={tenants} />

              {/* Table Controls (Filter, Sort, Search, Add Button) */}
              <TableControls
                tenants={tenants}
                stats={stats}
                statusFilter={statusFilter}
                setStatusFilter={setStatusFilter}
                sortBy={sortBy}
                setSortBy={setSortBy}
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                onOpenAddModal={() => setIsAddModalOpen(true)}
              />

              {/* 14-Column Tenants Table */}
              <TenantTable
                tenants={filteredTenants}
                loading={loading}
                onImpersonate={handleImpersonate}
                onOpenSendMessage={(tenant) => setSelectedTenantForMessage(tenant)}
                onOpenExtend={(tenant) => setSelectedTenantForExtend(tenant)}
                onToggleSuspend={(tenant) => setSelectedTenantForSuspend(tenant)}
                onOpenResetPassword={(tenant) => setSelectedTenantForReset(tenant)}
                onOpenDelete={(tenant) => setSelectedTenantForDelete(tenant)}
              />
            </>
          )}

          {selectedNavTab === 'templates' && (
            <TabTemplates onRefreshParent={fetchData} />
          )}

          {selectedNavTab === 'telegram' && (
            <TabTelegramAdmin showToast={showToast} />
          )}

          {selectedNavTab === 'tokens' && (
            <TabTokenManagement showToast={showToast} />
          )}

          {selectedNavTab === 'partners' && (
            <TabPartnerApi showToast={showToast} />
          )}

          {selectedNavTab === 'stats' && (
            <div className="space-y-6">
              <StatCards stats={stats} tenants={tenants} />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-6 bg-white border border-slate-200/90 rounded-2xl shadow-xs space-y-4">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-[#0084D1]/10 text-[#0084D1] flex items-center justify-center">
                      <BarChart3 className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">Distribusi Status Sewa Apartemen</h3>
                      <p className="text-xs text-slate-500">Perbandingan unit aktif, kedaluwarsa, dan suspended</p>
                    </div>
                  </div>

                  <div className="space-y-3 pt-2">
                    <div>
                      <div className="flex justify-between text-xs font-semibold mb-1">
                        <span className="text-slate-600">Unit Aktif Beroperasi</span>
                        <span className="text-emerald-600">
                          {stats?.activeTenants ?? 0} dari {tenants.length} unit
                        </span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                        <div
                          className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                          style={{
                            width: `${tenants.length > 0 ? ((stats?.activeTenants ?? 0) / tenants.length) * 100 : 0}%`,
                          }}
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-xs font-semibold mb-1">
                        <span className="text-slate-600">Masa Sewa Habis (Expired)</span>
                        <span className="text-rose-600">
                          {stats?.expiredTenants ?? 0} unit
                        </span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                        <div
                          className="h-full bg-rose-500 rounded-full transition-all duration-500"
                          style={{
                            width: `${tenants.length > 0 ? ((stats?.expiredTenants ?? 0) / tenants.length) * 100 : 0}%`,
                          }}
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-xs font-semibold mb-1">
                        <span className="text-slate-600">Unit Ditangguhkan (Suspended)</span>
                        <span className="text-amber-600">
                          {stats?.suspendedTenants ?? 0} unit
                        </span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                        <div
                          className="h-full bg-amber-500 rounded-full transition-all duration-500"
                          style={{
                            width: `${tenants.length > 0 ? ((stats?.suspendedTenants ?? 0) / tenants.length) * 100 : 0}%`,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-6 bg-white border border-slate-200/90 rounded-2xl shadow-xs space-y-4">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                      <Server className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">Kesehatan Socket Bot WhatsApp</h3>
                      <p className="text-xs text-slate-500">Koneksi real-time multi-session Baileys</p>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Instance Multi-Session:</span>
                      <span className="font-bold text-slate-900">{tenants.length} Instance Aktif</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Penyimpanan Kredensial:</span>
                      <span className="font-mono text-slate-700">auth_info_baileys/tenant_*</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Isolasi Database:</span>
                      <span className="font-mono text-emerald-700 font-bold">SQLite Per-Tenant (WAL Mode)</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {selectedNavTab === 'broadcast' && (
            <div className="p-8 bg-white border border-slate-200/90 rounded-2xl shadow-xs text-center max-w-xl mx-auto space-y-4 my-8">
              <div className="w-14 h-14 rounded-2xl bg-[#0084D1]/10 text-[#0084D1] flex items-center justify-center mx-auto border border-[#0084D1]/20">
                <Radio className="w-7 h-7" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">Fitur Pesan Siaran Massal (Broadcast)</h3>
                <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto leading-relaxed">
                  Kirimkan pengumuman, promo pembaruan sistem, jadwal maintenance, atau pengingat sewa massal ke seluruh nomor pemilik toko sekaligus dalam 1 kali klik.
                </p>
              </div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-sky-50 text-[#0084D1] border border-sky-200 text-xs font-semibold">
                <CheckCircle2 className="w-4 h-4" />
                <span>Siap Dikembangkan Selanjutnya</span>
              </div>
            </div>
          )}

          {selectedNavTab === 'settings' && (
            <TabMasterSettings onShowToast={showToast} />
          )}
        </main>
      </div>

      {/* Modals */}
      <AddTenantModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={fetchData}
        showToast={showToast}
      />

      <ExtendTenantModal
        isOpen={Boolean(selectedTenantForExtend)}
        tenant={selectedTenantForExtend}
        onClose={() => setSelectedTenantForExtend(null)}
        onSuccess={fetchData}
        showToast={showToast}
      />

      <ResetPasswordModal
        isOpen={Boolean(selectedTenantForReset)}
        tenant={selectedTenantForReset}
        onClose={() => setSelectedTenantForReset(null)}
        onSuccess={fetchData}
        showToast={showToast}
      />

      <SendMessageModal
        isOpen={Boolean(selectedTenantForMessage)}
        tenant={selectedTenantForMessage}
        onClose={() => setSelectedTenantForMessage(null)}
        showToast={showToast}
      />

      <DeleteTenantModal
        isOpen={Boolean(selectedTenantForDelete)}
        tenant={selectedTenantForDelete}
        onClose={() => setSelectedTenantForDelete(null)}
        onSuccess={fetchData}
        showToast={showToast}
      />

      <ToggleSuspendModal
        isOpen={Boolean(selectedTenantForSuspend)}
        tenant={selectedTenantForSuspend}
        onClose={() => setSelectedTenantForSuspend(null)}
        onSuccess={fetchData}
        showToast={showToast}
      />
    </div>
  );
}
