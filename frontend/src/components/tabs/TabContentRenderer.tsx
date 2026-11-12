import React from 'react';
import { TabStoreInfo } from './TabStoreInfo';
import { TabSaldo } from './TabSaldo';
import { TabCommand } from './TabCommand';
import { TabProduk } from './TabProduk';
import { TabKuponPromo } from './TabKuponPromo';
import { TabSsm } from './TabSsm';
import { TabTopUp } from './TabTopUp';
import { TabConnectionDedicated } from './TabConnectionDedicated';
import { TabKoneksiLayanan } from './TabKoneksiLayanan';
import { TabGrup } from './TabGrup';
import { TabTransaksi } from './TabTransaksi';
import { TabAccountSecurity } from './TabAccountSecurity';
import { TabBotManagement } from './TabBotManagement';
import { useStoreConfig } from '../../hooks/useStoreConfig';
import { useXavieraData } from '../../hooks/useXavieraData';
import { useWhatsAppGroups } from '../../hooks/useWhatsAppGroups';
import { useButtonModal } from '../../hooks/useButtonModal';
import { useBotConnection } from '../../hooks/useBotConnection';
import { useTransactions } from '../../hooks/useTransactions';
import { usePricingConfig } from '../../hooks/usePricingConfig';
import { usePromos } from '../../hooks/usePromos';
import { useLunasQrisData } from '../../hooks/useLunasQrisData';

interface TabContentRendererProps {
  selectedTab: string;
  setSelectedTab?: (tab: string) => void;
  storeConfig: ReturnType<typeof useStoreConfig>;
  xaviera: ReturnType<typeof useXavieraData>;
  groupsData: ReturnType<typeof useWhatsAppGroups>;
  buttonModal: ReturnType<typeof useButtonModal>;
  botConn: ReturnType<typeof useBotConnection>;
  transactionsState: ReturnType<typeof useTransactions>;
  pricingState: ReturnType<typeof usePricingConfig>;
  promosState: ReturnType<typeof usePromos>;
  lunasQrisData?: ReturnType<typeof useLunasQrisData>;
  showToast: (msg: string) => void;
  currentUsername?: string;
  onUsernameUpdated?: (newUsername: string) => void;
}

export const TabContentRenderer: React.FC<TabContentRendererProps> = ({
  selectedTab,
  setSelectedTab,
  storeConfig,
  xaviera,
  groupsData,
  buttonModal,
  botConn,
  transactionsState,
  pricingState,
  promosState,
  lunasQrisData,
  showToast,
  currentUsername,
  onUsernameUpdated,
}) => {
  // 1. INFO PROFIL (Paling Atas)
  if (selectedTab === 'Info Profil' || selectedTab === 'Store Info') {
    return (
      <TabStoreInfo
        storeInfo={storeConfig.storeInfo}
        setStoreInfo={storeConfig.setStoreInfo}
        isSavingConfig={storeConfig.isSavingConfig}
        onSave={(updatedStoreInfo?: any) => {
          const toSave = updatedStoreInfo || storeConfig.storeInfo;
          storeConfig.setStoreInfo(toSave);
          storeConfig.syncConfigToServer({ storeInfo: toSave });
        }}
        showToast={showToast}
      />
    );
  }

  // 2. SALDO (Di Bawah Info Profil)
  if (selectedTab === 'Saldo' || selectedTab === 'tabSaldo') {
    return (
      <TabSaldo
        xavieraProfile={xaviera.xavieraProfile}
        lunasQrisBalance={lunasQrisData?.lunasQrisBalance || undefined}
        onRefreshProfile={xaviera.fetchXavieraProfile}
        onRefreshLunasQris={() => lunasQrisData?.fetchLunasQrisBalance(true)}
        onNavigateToKoneksiLayanan={() => setSelectedTab && setSelectedTab('Koneksi Layanan')}
        showToast={showToast}
      />
    );
  }

  // 3. CONNECTION (Status, Form Nomor WA, 8-Char Pairing Code Checklist, and Live Terminal at bottom)
  if (selectedTab === 'Connection' || selectedTab === 'tab06') {
    return (
      <TabConnectionDedicated
        botData={botConn.botData}
        phone={botConn.phone}
        setPhone={botConn.setPhone}
        customCode={botConn.customCode}
        setCustomCode={botConn.setCustomCode}
        loading={botConn.loading}
        copied={botConn.copied}
        onStartPairing={botConn.handleStartPairing}
        onStop={botConn.handleStop}
        onReset={botConn.handleReset}
        onCopyCode={botConn.handleCopyCode}
        showToast={showToast}
      />
    );
  }

  // 4. KONEKSI LAYANAN (Integrasi API Xaviera & LunasQRIS Payment Gateway)
  if (
    selectedTab === 'Koneksi Layanan' ||
    selectedTab === 'Layanan' ||
    selectedTab === 'API'
  ) {
    return (
      <TabKoneksiLayanan
        xavieraApiKey={xaviera.xavieraApiKey}
        setXavieraApiKey={xaviera.setXavieraApiKey}
        xavieraBaseUrl={xaviera.xavieraBaseUrl}
        setXavieraBaseUrl={xaviera.setXavieraBaseUrl}
        lunasQrisApiKey={storeConfig.lunasQrisApiKey}
        setLunasQrisApiKey={storeConfig.setLunasQrisApiKey}
        lunasQrisSecretKey={storeConfig.lunasQrisSecretKey}
        setLunasQrisSecretKey={storeConfig.setLunasQrisSecretKey}
        lunasQrisBaseUrl={storeConfig.lunasQrisBaseUrl}
        setLunasQrisBaseUrl={storeConfig.setLunasQrisBaseUrl}
        showApiKey={xaviera.showApiKey}
        setShowApiKey={xaviera.setShowApiKey}
        isSavingConfig={storeConfig.isSavingConfig}
        syncConfigToServer={storeConfig.syncConfigToServer}
        showToast={showToast}
      />
    );
  }

  // 5. MANAGEMENT GROUP (Whitelist Grup WhatsApp)
  if (
    selectedTab === 'Management group' ||
    selectedTab === 'Grup' ||
    selectedTab === 'tab04'
  ) {
    return (
      <TabGrup
        groups={groupsData.groups}
        groupSearchQuery={groupsData.groupSearchQuery}
        setGroupSearchQuery={groupsData.setGroupSearchQuery}
        isLoadingGroups={groupsData.isLoadingGroups}
        groupsError={groupsData.groupsError}
        togglingGroupId={groupsData.togglingGroupId}
        copiedGroupId={groupsData.copiedGroupId}
        fetchGroups={groupsData.fetchGroups}
        handleToggleGroup={groupsData.handleToggleGroup}
        copyGroupIdToClipboard={groupsData.copyGroupIdToClipboard}
        botStatus={botConn.botData.status}
      />
    );
  }

  // 6. RESPON BOT (Pesan Auto-reply, Command, Menu, List, Carousel, Invoice)
  if (selectedTab === 'Respon Bot' || selectedTab === 'Command') {
    return (
      <TabCommand
        selectedCommand={storeConfig.selectedCommand}
        setSelectedCommand={storeConfig.setSelectedCommand}
        menuOutputText={storeConfig.menuOutputText}
        setMenuOutputText={storeConfig.setMenuOutputText}
        menuFooterText={storeConfig.menuFooterText}
        setMenuFooterText={storeConfig.setMenuFooterText}
        includeMedia={storeConfig.includeMedia}
        setIncludeMedia={storeConfig.setIncludeMedia}
        selectedPicture={storeConfig.selectedPicture}
        setSelectedPicture={storeConfig.setSelectedPicture}
        availablePictures={storeConfig.availablePictures}
        setAvailablePictures={storeConfig.setAvailablePictures}
        menuButtons={storeConfig.menuButtons}
        onOpenAddButtonModal={buttonModal.handleOpenAddButtonModal}
        onEditButton={buttonModal.handleEditButton}
        onDeleteButton={buttonModal.handleDeleteButton}
        onSaveMenu={(menuData?: any) => {
          const isEvent = menuData && (menuData.nativeEvent || menuData._reactName || menuData.target);
          const payload = (!isEvent && menuData && typeof menuData === 'object') ? menuData : {
            menuOutputText: storeConfig.menuOutputText,
            menuButtons: storeConfig.menuButtons,
            menuFooterText: storeConfig.menuFooterText,
            includeMedia: storeConfig.includeMedia,
            selectedPicture: storeConfig.selectedPicture,
          };
          storeConfig.syncConfigToServer(payload);
          showToast('Konfigurasi Menu berhasil disimpan!');
        }}
        listOutputText={storeConfig.listOutputText}
        setListOutputText={storeConfig.setListOutputText}
        listFooterText={storeConfig.listFooterText}
        setListFooterText={storeConfig.setListFooterText}
        onSaveList={(listData?: any) => {
          const isEvent = listData && (listData.nativeEvent || listData._reactName || listData.target);
          const payload = (!isEvent && listData && typeof listData === 'object') ? listData : {
            listOutputText: storeConfig.listOutputText,
            listFooterText: storeConfig.listFooterText,
          };
          storeConfig.syncConfigToServer(payload);
          showToast('Konfigurasi List berhasil disimpan!');
        }}
        carouselOutputText={storeConfig.carouselOutputText}
        setCarouselOutputText={storeConfig.setCarouselOutputText}
        carouselFooterText={storeConfig.carouselFooterText}
        setCarouselFooterText={storeConfig.setCarouselFooterText}
        carouselPicture={storeConfig.carouselPicture}
        setCarouselPicture={storeConfig.setCarouselPicture}
        onSaveCarousel={(carouselData?: any) => {
          const isEvent = carouselData && (carouselData.nativeEvent || carouselData._reactName || carouselData.target);
          const payload = (!isEvent && carouselData && typeof carouselData === 'object') ? carouselData : {
            carouselOutputText: storeConfig.carouselOutputText,
            carouselPicture: storeConfig.carouselPicture,
            carouselFooterText: storeConfig.carouselFooterText,
          };
          storeConfig.syncConfigToServer(payload);
          showToast('Konfigurasi Carousel berhasil disimpan!');
        }}
        invoiceOutputText={storeConfig.invoiceOutputText}
        setInvoiceOutputText={storeConfig.setInvoiceOutputText}
        invoiceFooterText={storeConfig.invoiceFooterText}
        setInvoiceFooterText={storeConfig.setInvoiceFooterText}
        onSaveInvoice={(invoiceData?: any) => {
          const isEvent = invoiceData && (invoiceData.nativeEvent || invoiceData._reactName || invoiceData.target);
          const payload = (!isEvent && invoiceData && typeof invoiceData === 'object') ? invoiceData : {
            invoiceOutputText: storeConfig.invoiceOutputText,
            invoiceFooterText: storeConfig.invoiceFooterText,
          };
          storeConfig.syncConfigToServer(payload);
          showToast('Konfigurasi Invoice berhasil disimpan!');
        }}
        confirmSummaryText={storeConfig.confirmSummaryText}
        setConfirmSummaryText={storeConfig.setConfirmSummaryText}
        confirmInputPromoText={storeConfig.confirmInputPromoText}
        setConfirmInputPromoText={storeConfig.setConfirmInputPromoText}
        confirmPromoSuccessText={storeConfig.confirmPromoSuccessText}
        setConfirmPromoSuccessText={storeConfig.setConfirmPromoSuccessText}
        confirmPromoInvalidText={storeConfig.confirmPromoInvalidText}
        setConfirmPromoInvalidText={storeConfig.setConfirmPromoInvalidText}
        confirmFooterText={storeConfig.confirmFooterText}
        setConfirmFooterText={storeConfig.setConfirmFooterText}
        onSaveConfirmation={(confirmData?: any) => {
          const isEvent = confirmData && (confirmData.nativeEvent || confirmData._reactName || confirmData.target);
          const payload = (!isEvent && confirmData && typeof confirmData === 'object') ? confirmData : {
            confirmSummaryText: storeConfig.confirmSummaryText,
            confirmInputPromoText: storeConfig.confirmInputPromoText,
            confirmPromoSuccessText: storeConfig.confirmPromoSuccessText,
            confirmPromoInvalidText: storeConfig.confirmPromoInvalidText,
            confirmFooterText: storeConfig.confirmFooterText,
          };
          storeConfig.syncConfigToServer(payload);
          showToast('Konfigurasi Konfirmasi & Promo berhasil disimpan!');
        }}
        // Transaksi
        paymentSuccessDmText={storeConfig.paymentSuccessDmText}
        setPaymentSuccessDmText={storeConfig.setPaymentSuccessDmText}
        paymentSuccessDmFooter={storeConfig.paymentSuccessDmFooter}
        setPaymentSuccessDmFooter={storeConfig.setPaymentSuccessDmFooter}
        paymentSuccessGroupText={storeConfig.paymentSuccessGroupText}
        setPaymentSuccessGroupText={storeConfig.setPaymentSuccessGroupText}
        paymentSuccessGroupFooter={storeConfig.paymentSuccessGroupFooter}
        setPaymentSuccessGroupFooter={storeConfig.setPaymentSuccessGroupFooter}
        paymentExpiredText={storeConfig.paymentExpiredText}
        setPaymentExpiredText={storeConfig.setPaymentExpiredText}
        paymentExpiredFooter={storeConfig.paymentExpiredFooter}
        setPaymentExpiredFooter={storeConfig.setPaymentExpiredFooter}
        paymentErrorText={storeConfig.paymentErrorText}
        setPaymentErrorText={storeConfig.setPaymentErrorText}
        paymentErrorFooter={storeConfig.paymentErrorFooter}
        setPaymentErrorFooter={storeConfig.setPaymentErrorFooter}
        onSaveTransaksi={() => {
          storeConfig.syncConfigToServer({
            paymentSuccessDmText: storeConfig.paymentSuccessDmText,
            paymentSuccessDmFooter: storeConfig.paymentSuccessDmFooter,
            paymentSuccessGroupText: storeConfig.paymentSuccessGroupText,
            paymentSuccessGroupFooter: storeConfig.paymentSuccessGroupFooter,
            paymentExpiredText: storeConfig.paymentExpiredText,
            paymentExpiredFooter: storeConfig.paymentExpiredFooter,
            paymentErrorText: storeConfig.paymentErrorText,
            paymentErrorFooter: storeConfig.paymentErrorFooter,
          });
          showToast('Konfigurasi Respon Transaksi berhasil disimpan!');
        }}
        // Notifikasi
        orderGroupNotifText={storeConfig.orderGroupNotifText}
        setOrderGroupNotifText={storeConfig.setOrderGroupNotifText}
        orderGroupNotifFooter={storeConfig.orderGroupNotifFooter}
        setOrderGroupNotifFooter={storeConfig.setOrderGroupNotifFooter}
        stockEmptyText={storeConfig.stockEmptyText}
        setStockEmptyText={storeConfig.setStockEmptyText}
        stockEmptyFooter={storeConfig.stockEmptyFooter}
        setStockEmptyFooter={storeConfig.setStockEmptyFooter}
        sessionExpiredText={storeConfig.sessionExpiredText}
        setSessionExpiredText={storeConfig.setSessionExpiredText}
        sessionExpiredFooter={storeConfig.sessionExpiredFooter}
        setSessionExpiredFooter={storeConfig.setSessionExpiredFooter}
        promoCancelledText={storeConfig.promoCancelledText}
        setPromoCancelledText={storeConfig.setPromoCancelledText}
        promoCancelledFooter={storeConfig.promoCancelledFooter}
        setPromoCancelledFooter={storeConfig.setPromoCancelledFooter}
        onSaveNotifikasi={() => {
          storeConfig.syncConfigToServer({
            orderGroupNotifText: storeConfig.orderGroupNotifText,
            orderGroupNotifFooter: storeConfig.orderGroupNotifFooter,
            stockEmptyText: storeConfig.stockEmptyText,
            stockEmptyFooter: storeConfig.stockEmptyFooter,
            sessionExpiredText: storeConfig.sessionExpiredText,
            sessionExpiredFooter: storeConfig.sessionExpiredFooter,
            promoCancelledText: storeConfig.promoCancelledText,
            promoCancelledFooter: storeConfig.promoCancelledFooter,
          });
          showToast('Konfigurasi Respon Notifikasi berhasil disimpan!');
        }}
        // Kontak
        contactOwnerEmptyText={storeConfig.contactOwnerEmptyText}
        setContactOwnerEmptyText={storeConfig.setContactOwnerEmptyText}
        contactAdminEmptyText={storeConfig.contactAdminEmptyText}
        setContactAdminEmptyText={storeConfig.setContactAdminEmptyText}
        expiryWarningOwnerText={storeConfig.expiryWarningOwnerText}
        setExpiryWarningOwnerText={storeConfig.setExpiryWarningOwnerText}
        expiryWarningOwnerFooter={storeConfig.expiryWarningOwnerFooter}
        setExpiryWarningOwnerFooter={storeConfig.setExpiryWarningOwnerFooter}
        onSaveKontak={() => {
          storeConfig.syncConfigToServer({
            contactOwnerEmptyText: storeConfig.contactOwnerEmptyText,
            contactAdminEmptyText: storeConfig.contactAdminEmptyText,
            expiryWarningOwnerText: storeConfig.expiryWarningOwnerText,
            expiryWarningOwnerFooter: storeConfig.expiryWarningOwnerFooter,
          });
          showToast('Konfigurasi Respon Kontak & Sewa berhasil disimpan!');
        }}
        storeInfo={storeConfig.storeInfo}
        isSavingConfig={storeConfig.isSavingConfig}
        showToast={showToast}
      />
    );
  }

  // 7. APLIKASI PREMIUM (Katalog Produk & Harga + Sub-tab Kupon Promo)
  if (
    selectedTab === 'Aplikasi Premium' ||
    selectedTab === 'Produk'
  ) {
    return (
      <TabProduk
        productsList={xaviera.productsList}
        loadingProducts={xaviera.loadingProducts}
        productSearch={xaviera.productSearch}
        setProductSearch={xaviera.setProductSearch}
        selectedProductCategory={xaviera.selectedProductCategory}
        setSelectedProductCategory={xaviera.setSelectedProductCategory}
        onRefreshProducts={xaviera.fetchXavieraProducts}
        showToast={showToast}
        pricingMode={pricingState.pricingMode}
        pricingValue={pricingState.pricingValue}
        inputVal={pricingState.inputVal}
        setInputVal={pricingState.setInputVal}
        isSavingPricing={pricingState.isSavingPricing}
        savePricing={pricingState.savePricing}
        handleToggleMode={pricingState.handleToggleMode}
        calculateProductPrice={pricingState.calculateProductPrice}
        variantPricings={pricingState.variantPricings}
        isSavingVariantPricing={pricingState.isSavingVariantPricing}
        calculateVariantPrice={pricingState.calculateVariantPrice}
        getVariantPricingInfo={pricingState.getVariantPricingInfo}
        saveVariantPricing={pricingState.saveVariantPricing}
        promosState={promosState}
      />
    );
  }

  // Kupon Promo Direct Aliasing (if deep linked directly)
  if (
    selectedTab === 'Kupon Promo' ||
    selectedTab === 'Promo' ||
    selectedTab === 'tabPromo'
  ) {
    return (
      <TabKuponPromo
        promosState={promosState}
        productsList={xaviera.productsList}
        pricingMode={pricingState.pricingMode}
        pricingValue={pricingState.pricingValue}
        variantPricings={pricingState.variantPricings}
        calculateVariantPrice={pricingState.calculateVariantPrice}
        showToast={showToast}
      />
    );
  }

  // 8. SMM (Layanan SMM Media Sosial)
  if (
    selectedTab === 'SMM' ||
    selectedTab === 'SSM' ||
    selectedTab === 'tab02'
  ) {
    return (
      <TabSsm
        smmList={xaviera.smmList}
        smmSearch={xaviera.smmSearch}
        setSmmSearch={xaviera.setSmmSearch}
        smmPage={xaviera.smmPage}
        setSmmPage={xaviera.setSmmPage}
        smmItemsPerPage={xaviera.smmItemsPerPage}
        setSmmItemsPerPage={xaviera.setSmmItemsPerPage}
        selectedSmmCategory={xaviera.selectedSmmCategory}
        setSelectedSmmCategory={xaviera.setSelectedSmmCategory}
        loadingSmm={xaviera.loadingSmm}
        fetchXavieraSmm={xaviera.fetchXavieraSmm}
        showToast={showToast}
        smmPricingMode={pricingState.smmPricingMode}
        smmPricingValue={pricingState.smmPricingValue}
        smmInputVal={pricingState.smmInputVal}
        setSmmInputVal={pricingState.setSmmInputVal}
        isSavingSmmPricing={pricingState.isSavingSmmPricing}
        saveSmmPricing={pricingState.saveSmmPricing}
        handleToggleSmmMode={pricingState.handleToggleSmmMode}
        calculateSmmPrice={pricingState.calculateSmmPrice}
      />
    );
  }

  // 9. TOPUP (Katalog Game & Voucher)
  if (
    selectedTab === 'TopUp' ||
    selectedTab === 'Top Up' ||
    selectedTab === 'tab03'
  ) {
    return (
      <TabTopUp
        topUpList={xaviera.topUpList}
        topUpSearch={xaviera.topUpSearch}
        setTopUpSearch={xaviera.setTopUpSearch}
        topUpPage={xaviera.topUpPage}
        setTopUpPage={xaviera.setTopUpPage}
        topUpItemsPerPage={xaviera.topUpItemsPerPage}
        setTopUpItemsPerPage={xaviera.setTopUpItemsPerPage}
        selectedTopUpCategory={xaviera.selectedTopUpCategory}
        setSelectedTopUpCategory={xaviera.setSelectedTopUpCategory}
        loadingTopUp={xaviera.loadingTopUp}
        fetchXavieraGames={xaviera.fetchXavieraGames}
        showToast={showToast}
        topupPricingMode={pricingState.topupPricingMode}
        topupPricingValue={pricingState.topupPricingValue}
        topupInputVal={pricingState.topupInputVal}
        setTopupInputVal={pricingState.setTopupInputVal}
        isSavingTopupPricing={pricingState.isSavingTopupPricing}
        saveTopupPricing={pricingState.saveTopupPricing}
        handleToggleTopupMode={pricingState.handleToggleTopupMode}
        calculateTopupPrice={pricingState.calculateTopupPrice}
      />
    );
  }

  // 10. TRANSAKSI (Riwayat Transaksi LunasQRIS)
  if (selectedTab === 'Transaksi' || selectedTab === 'tab05') {
    return (
      <TabTransaksi
        transactionsState={transactionsState}
        showToast={showToast}
      />
    );
  }

  // 11. KEAMANAN & KREDENSIAL AKUN
  if (
    selectedTab === 'Keamanan Akun' ||
    selectedTab === 'Akun' ||
    selectedTab === 'Keamanan' ||
    selectedTab === 'Kredensial' ||
    selectedTab === 'Ubah Password'
  ) {
    return (
      <TabAccountSecurity
        currentUsername={currentUsername}
        onUsernameUpdated={onUsernameUpdated}
        showToast={showToast}
      />
    );
  }

  // 12. MANAGEMENT BOT (Status Bot, Masa Aktif, Tanggal Expired, Form Redeem Token)
  if (
    selectedTab === 'Management Bot' ||
    selectedTab === 'Bot Management' ||
    selectedTab === 'ManagementBot' ||
    selectedTab === 'Masa Sewa' ||
    selectedTab === 'Voucher Token'
  ) {
    return (
      <TabBotManagement
        botData={botConn.botData}
        showToast={showToast}
      />
    );
  }

  return (
    <div className="py-8 px-4 text-center space-y-2">
      <div className="w-10 h-10 rounded-lg bg-slate-100 border border-slate-200 text-slate-500 mx-auto flex items-center justify-center font-mono font-bold text-xs">
        {selectedTab}
      </div>
      <h4 className="text-sm font-semibold text-slate-800">
        Tab: {selectedTab}
      </h4>
      <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
        Pilih salah satu menu dari navigasi sidebar di sebelah kiri.
      </p>
    </div>
  );
};
