import { useState, useEffect, useCallback } from 'react';
import { Check } from 'lucide-react';

// Custom Hooks
import { UserSession } from '../../hooks/useAuth';
import { useBotConnection } from '../../hooks/useBotConnection';
import { useXavieraData } from '../../hooks/useXavieraData';
import { useWhatsAppGroups } from '../../hooks/useWhatsAppGroups';
import { useStoreConfig } from '../../hooks/useStoreConfig';
import { useButtonModal } from '../../hooks/useButtonModal';
import { useLunasQrisData } from '../../hooks/useLunasQrisData';
import { useTransactions } from '../../hooks/useTransactions';
import { usePricingConfig } from '../../hooks/usePricingConfig';
import { usePromos } from '../../hooks/usePromos';

// Modals
import { MandatoryStoreSetupModal } from '../modals/MandatoryStoreSetupModal';
import { AddEditButtonModal } from '../modals/AddEditButtonModal';
import { SuspendedAccountModal } from '../modals/SuspendedAccountModal';
import { ExpiredAccountModal } from '../modals/ExpiredAccountModal';

// Layout components
import { DesktopSidebar } from '../layout/DesktopSidebar';
import { DesktopTopNav } from '../layout/DesktopTopNav';

// Tab Renderer component
import { TabContentRenderer } from '../tabs/TabContentRenderer';


interface TenantDashboardProps {
  auth: {
    token: string | null;
    user: UserSession | null;
    isAuthenticated: boolean | null;
    logout: () => Promise<void>;
    updateUsernameState?: (newUsername: string) => void;
  };
}

export function TenantDashboard({ auth }: TenantDashboardProps) {
  const [selectedTab, setSelectedTab] = useState<string>('Info Profil');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth < 1280;
    }
    return false;
  });
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const [accountStatus, setAccountStatus] = useState<'active' | 'suspended' | 'expired'>(() => {
    return auth.user?.accountStatus || 'active';
  });
  const [isSuspendModalDismissed, setIsSuspendModalDismissed] = useState<boolean>(false);
  const [isExpireModalDismissed, setIsExpireModalDismissed] = useState<boolean>(false);

  // Callback sinkronisasi status akun secara real-time dari polling status bot
  const handleAccountStatusChange = useCallback((newStatus: 'active' | 'suspended' | 'expired') => {
    setAccountStatus((prev) => {
      if (prev !== newStatus) {
        if (newStatus === 'suspended') {
          // Begitu Master Admin mengubah status menjadi suspended, langsung reset dismiss
          // sehingga popup banned seketika muncul di layar tanpa refresh!
          setIsSuspendModalDismissed(false);
        } else if (newStatus === 'expired') {
          // Begitu masa sewa berakhir (expired), langsung munculkan popup expired
          setIsExpireModalDismissed(false);
        } else if (newStatus === 'active') {
          setIsSuspendModalDismissed(false);
          setIsExpireModalDismissed(false);
        }
        return newStatus;
      }
      return prev;
    });
  }, []);

  // 1. Data Integrasi Xaviera API
  const xaviera = useXavieraData(showToast);

  // 2. Data & Pengaturan Toko (Store Info, Command Menu, List, Carousel, Media)
  const storeConfig = useStoreConfig(xaviera.xavieraApiKey, xaviera.xavieraBaseUrl, showToast);

  // 3. Data & Saldo Payment Gateway LunasQRIS API
  const lunasQrisData = useLunasQrisData(storeConfig.lunasQrisApiKey, storeConfig.lunasQrisBaseUrl, showToast);

  // 4. Koneksi & Polling Socket WhatsApp Bot (dengan sinkronisasi status akun real-time)
  const botConn = useBotConnection(
    showToast,
    storeConfig.loadInitialConfig,
    (apiKey, baseUrl) => {
      if (apiKey) xaviera.setXavieraApiKey(apiKey);
      if (baseUrl) xaviera.setXavieraBaseUrl(baseUrl);
    },
    handleAccountStatusChange
  );


  // Ambil store info awal tenant secara langsung saat mount
  useEffect(() => {
    fetch('/api/auth/store-status')
      .then((res) => res.json())
      .then((data) => {
        if (data.accountStatus) {
          setAccountStatus(data.accountStatus);
        }
        if (data.storeInfo && (data.storeInfo.storeName || data.storeInfo.ownerName)) {
          storeConfig.setStoreInfo((prev) => ({
            ...prev,
            ...data.storeInfo,
          }));
        }
      })
      .catch(() => {});
  }, []);

  // Pantau expiresAt secara real-time: tepat saat waktu kedaluwarsa tercapai, langsung panggil refreshStatus()
  // agar backend memutus koneksi bot & memunculkan popup expired tanpa menunggu interval berikutnya
  useEffect(() => {
    const expiresAtStr = botConn.botData.expiresAt;
    if (!expiresAtStr || accountStatus !== 'active') return;

    const expMs = new Date(expiresAtStr).getTime();
    if (!Number.isFinite(expMs)) return;

    const remainingMs = expMs - Date.now();
    if (remainingMs <= 0) {
      botConn.refreshStatus();
      return;
    }

    const timeoutId = window.setTimeout(() => {
      botConn.refreshStatus();
    }, Math.min(remainingMs + 50, 2147483647));

    return () => window.clearTimeout(timeoutId);
  }, [botConn.botData.expiresAt, accountStatus, botConn.refreshStatus]);


  // 5. Whitelist Grup WhatsApp
  const groupsData = useWhatsAppGroups(selectedTab, botConn.botData.status, showToast);

  // 6. Modal Tambah & Edit Tombol WhatsApp Native Flow
  const buttonModal = useButtonModal(
    storeConfig.menuButtons,
    storeConfig.setMenuButtons,
    (_updatedButtons) => {},
    showToast
  );

  // 7. Riwayat Transaksi LunasQRIS
  const transactionsState = useTransactions(showToast);

  // 8. Pengaturan Harga Produk (Markup Margin Rp atau %)
  const pricingState = usePricingConfig(showToast);

  // 9. Pengaturan Kupon Promo (Diskon Margin APK Premium)
  const promosState = usePromos(showToast);

  // Cek apakah 3 data wajib Store Info sudah diisi lengkap
  const isStoreInfoComplete = Boolean(
    storeConfig.storeInfo?.storeName && storeConfig.storeInfo.storeName.trim() &&
    storeConfig.storeInfo?.ownerName && storeConfig.storeInfo.ownerName.trim() &&
    storeConfig.storeInfo?.ownerNumber && storeConfig.storeInfo.ownerNumber.trim()
  );

  const displayStoreName = storeConfig.storeInfo?.storeName || 'Dashboard Toko';

  return (
    <div className="min-h-screen bg-slate-50/70 text-slate-900 font-sans selection:bg-[#0084D1]/20 antialiased flex">
      {/* 1. Desktop Sidebar (Left) */}
      <DesktopSidebar
        selectedTab={selectedTab}
        setSelectedTab={(tab) => {
          setSelectedTab(tab);
          setIsMobileMenuOpen(false);
        }}
        isCollapsed={isSidebarCollapsed}
        setIsCollapsed={setIsSidebarCollapsed}
        botData={botConn.botData}
        storeInfo={storeConfig.storeInfo}
        promosCount={promosState.promos.filter((p) => p.isActive).length}
        transactionsCount={transactionsState.transactions.length}
        groupsCount={groupsData.groups.filter((g) => g.enabled).length}
        username={auth.user?.username}
        isMobileOpen={isMobileMenuOpen}
        onCloseMobile={() => setIsMobileMenuOpen(false)}
        onLogout={auth.logout}
      />

      {/* 2. Main Content Area (Right) */}
      <div className="flex-1 min-w-0 flex flex-col min-h-screen">
        {/* Desktop Top Nav */}
        <DesktopTopNav
          selectedTab={selectedTab}
          botData={botConn.botData}
          xavieraProfile={xaviera.xavieraProfile}
          lunasQrisBalance={lunasQrisData.lunasQrisBalance}
          onRefreshProfile={xaviera.fetchXavieraProfile}
          onRefreshLunasQris={() => lunasQrisData.fetchLunasQrisBalance(true)}
          onNavigateToConnection={() => {
            setSelectedTab('Connection');
            setIsMobileMenuOpen(false);
          }}
          username={auth.user?.username}
          onLogout={auth.logout}
          showToast={showToast}
          isSidebarCollapsed={isSidebarCollapsed}
          onToggleSidebar={() => setIsSidebarCollapsed((prev) => !prev)}
          onOpenMobileMenu={() => setIsMobileMenuOpen(true)}
          storeName={displayStoreName}
        />

        {/* Main Workspace */}
        <main className="flex-1 p-3 sm:p-5 md:p-8 max-w-7xl w-full mx-auto space-y-3.5 sm:space-y-6">
          <div className="bg-white border border-slate-200/90 rounded-2xl p-3.5 sm:p-6 shadow-2xs">
            <TabContentRenderer
              selectedTab={selectedTab}
              setSelectedTab={setSelectedTab}
              storeConfig={storeConfig}
              xaviera={xaviera}
              groupsData={groupsData}
              buttonModal={buttonModal}
              botConn={botConn}
              transactionsState={transactionsState}
              pricingState={pricingState}
              promosState={promosState}
              lunasQrisData={lunasQrisData}
              showToast={showToast}
              currentUsername={auth.user?.username}
              onUsernameUpdated={(newUsername) => {
                if (auth.updateUsernameState) {
                  auth.updateUsernameState(newUsername);
                }
              }}
            />
          </div>
        </main>

        {/* Modal Popup: Add & Edit Button */}
        <AddEditButtonModal
          isOpen={buttonModal.isAddButtonModalOpen}
          onClose={() => {
            buttonModal.setIsAddButtonModalOpen(false);
            buttonModal.setEditingButtonId(null);
          }}
          editingButtonId={buttonModal.editingButtonId}
          modalBtnType={buttonModal.modalBtnType}
          setModalBtnType={buttonModal.setModalBtnType}
          modalBtnName={buttonModal.modalBtnName}
          setModalBtnName={buttonModal.setModalBtnName}
          quickReplyAction={buttonModal.quickReplyAction}
          setQuickReplyAction={buttonModal.setQuickReplyAction}
          quickReplyOutput={buttonModal.quickReplyOutput}
          setQuickReplyOutput={buttonModal.setQuickReplyOutput}
          urlOutput={buttonModal.urlOutput}
          setUrlOutput={buttonModal.setUrlOutput}
          copyOutput={buttonModal.copyOutput}
          setCopyOutput={buttonModal.setCopyOutput}
          callTarget={buttonModal.callTarget}
          setCallTarget={buttonModal.setCallTarget}
          callPhone={buttonModal.callPhone}
          setCallPhone={buttonModal.setCallPhone}
          reminderOutput={buttonModal.reminderOutput}
          setReminderOutput={buttonModal.setReminderOutput}
          cancelReminderOutput={buttonModal.cancelReminderOutput}
          setCancelReminderOutput={buttonModal.setCancelReminderOutput}
          onSave={buttonModal.handleSaveButton}
        />

        {/* Pop-up Modal Wajib Isi Store Info (Non-dismissible) */}
        {!isStoreInfoComplete && accountStatus === 'active' && (
          <MandatoryStoreSetupModal
            initialStoreInfo={storeConfig.storeInfo}
            onSuccess={(updated) => {
              storeConfig.setStoreInfo((prev) => ({ ...prev, ...updated }));
              showToast('Informasi toko berhasil disimpan! Bot siap digunakan.');
            }}
          />
        )}

        {/* Pop-up Modal Pemberitahuan Akun Ditangguhkan / Suspended (dengan opsi tutup sementara) */}
        {accountStatus === 'suspended' && !isSuspendModalDismissed && (
          <SuspendedAccountModal
            storeName={storeConfig.storeInfo?.storeName || displayStoreName}
            tenantUsername={auth.user?.username}
            onLogout={auth.logout}
            onCloseTemporary={() => setIsSuspendModalDismissed(true)}
          />
        )}

        {/* Pop-up Modal Pemberitahuan Masa Sewa Habis / Expired (dengan form token & tutup sementara dev) */}
        {accountStatus === 'expired' && !isExpireModalDismissed && (
          <ExpiredAccountModal
            storeName={storeConfig.storeInfo?.storeName || displayStoreName}
            tenantUsername={auth.user?.username}
            expiresAt={botConn.botData.expiresAt}
            onLogout={auth.logout}
            onCloseTemporary={() => setIsExpireModalDismissed(true)}
            onTokenRedeemed={async (data) => {
              setAccountStatus('active');
              setIsExpireModalDismissed(false);
              await botConn.refreshStatus();
              showToast(
                data?.addedDuration
                  ? `Masa sewa diperpanjang +${data.addedDuration}! Bot siap dihubungkan kembali.`
                  : 'Masa sewa berhasil diperpanjang! Bot siap dihubungkan kembali.'
              );
            }}
          />
        )}



        {/* Footer */}
        <footer className="bg-white border-t border-slate-200 py-3.5 px-6 text-xs text-slate-500">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
            <span>&copy; {displayStoreName}</span>
            <span className="text-slate-400">WhatsApp Bot Multi-Tenant Management System</span>
          </div>
        </footer>
      </div>

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-lg shadow-lg text-xs font-medium flex items-center gap-2 border border-slate-700 animate-in fade-in slide-in-from-bottom-3 duration-200">
          <Check className="w-3.5 h-3.5 text-emerald-400 stroke-[3]" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
