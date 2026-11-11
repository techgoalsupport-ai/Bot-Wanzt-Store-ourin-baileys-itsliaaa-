export interface LogEntry {
  id: string;
  time: string;
  type: 'info' | 'success' | 'warning' | 'error' | 'code';
  message: string;
}

export interface BotStatusResponse {
  status: 'idle' | 'connecting' | 'waiting_code' | 'code_ready' | 'connected' | 'closed' | 'error';
  phoneNumber: string;
  pairingCode: string;
  customCode: string;
  user: { id?: string; name?: string } | null;
  logs: LogEntry[];
  hasSession: boolean;
  isRegistered?: boolean;
  accountStatus?: 'active' | 'suspended' | 'expired';
  expiresAt?: string;
}

export type WhatsAppButtonType =
  | 'quick_reply'
  | 'cta_url'
  | 'cta_copy'
  | 'vcard'
  | 'cta_call'
  | 'cta_reminder'
  | 'cta_cancel_reminder';

export interface StoreInfoConfig {
  storeName: string;
  ownerName: string;
  ownerNumber: string;
  adminName?: string;
  adminNumber?: string;
  webLink?: string;
  telegramBot?: string;
  waLink?: string;
}

export type QuickReplyTriggerAction = 'list' | 'menu' | 'owner' | 'admin' | 'unknown';

export interface WhatsAppButton {
  id: string;
  type: WhatsAppButtonType;
  name: string;
  output: string;
  triggerAction?: QuickReplyTriggerAction;
  callTargetName?: string;
  callPhoneNumber?: string;
}

export interface ConfirmationCommandConfig {
  confirmSummaryText: string;
  confirmInputPromoText: string;
  confirmPromoSuccessText: string;
  confirmPromoInvalidText: string;
  confirmFooterText?: string;
}

export interface PricingConfig {
  mode: 'rp' | 'percent';
  value: number;
}


export interface VariantPricingItem {
  variantId: string;
  productName?: string;
  variantName?: string;
  pricingType: 'general' | 'custom';
  mode: 'rp' | 'percent';
  value: number;
}

export interface PromoCodeItem {
  id: number;
  code: string;
  discountMode: 'rp' | 'percent';
  discountValue: number;
  minSpend: number;
  quota: number | null;
  usedCount: number;
  validUntil: string | null;
  isForever: boolean;
  scopeType: 'all' | 'restricted';
  variantIds: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PremiumProduct {
  id: string | number;
  name: string;
  variant: string;
  stock: number | string;
  price: number;
  category?: string;
  status?: 'available' | 'empty' | 'preorder';
}

export interface SmmService {
  service: number | string;
  name: string;
  category: string;
  rate: number;
  min: number;
  max: number;
  refill?: boolean | string;
  platformCategory: string;
}

export interface TopUpItem {
  id: string | number;
  game: string;
  item: string;
  category: string;
  originalPrice: number;
  stock: number | string;
  server: string;
  badge?: string;
  status?: 'available' | 'empty';
}

export interface WhatsAppGroupItem {
  id: string;
  subject: string;
  memberCount: number;
  creation?: number;
  owner?: string;
  desc?: string;
  enabled: boolean;
}

export interface CarouselCard {
  id: string;
  title: string;
  description: string;
  price: string;
  stock: string;
  orderCode: string;
  imageFileName: string;
}

export interface CarouselConfig {
  headerText: string;
  footerText: string;
  orderInstruction: string;
  cards: CarouselCard[];
}

export interface XavieraProfileState {
  data: any;
  loading: boolean;
  error: string | null;
  configured: boolean;
}

export interface LunasQrisBalanceState {
  loading: boolean;
  configured: boolean;
  balance: number | null;
  balanceHold: number | null;
  error: string | null;
}

export interface TransactionItem {
  id: string;
  orderId: string;
  trxId?: string;
  customerNumber: string;
  customerName: string;
  productName: string;
  variantName: string;
  nominal: number;
  uniqueCode: number;
  total: number;
  status: 'pending' | 'paid' | 'cancel';
  paymentUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TransactionSummary {
  totalCount: number;
  paidCount: number;
  pendingCount: number;
  cancelCount: number;
  totalRevenue: number;
}


export const detectSmmPlatform = (categoryName: string = '', serviceName: string = ''): string => {
  const combined = `${categoryName} ${serviceName}`.toLowerCase();
  if (combined.includes('tiktok')) return 'Layanan TikTok';
  if (combined.includes('youtube') || combined.includes('yt ')) return 'Layanan YouTube';
  if (combined.includes('instagram') || combined.includes('ig ')) return 'Layanan Instagram';
  if (combined.includes('facebook') || combined.includes('fb ')) return 'Layanan Facebook';
  if (combined.includes('twitter') || combined.includes(' x ')) return 'Layanan Twitter / X';
  if (combined.includes('telegram')) return 'Layanan Telegram';
  if (combined.includes('shopee')) return 'Layanan Shopee';
  if (combined.includes('tokopedia')) return 'Layanan Tokopedia';
  if (combined.includes('spotify') || combined.includes('soundcloud') || combined.includes('music') || combined.includes('musik')) return 'Layanan Musik';
  return 'Layanan Lainnya';
};

export interface CommandsConfig {
  menuOutputText?: string;
  menuFooterText?: string;
  listOutputText?: string;
  listFooterText?: string;
  carouselOutputText?: string;
  carouselFooterText?: string;
  invoiceOutputText?: string;
  invoiceFooterText?: string;
  confirmSummaryText?: string;
  confirmInputPromoText?: string;
  confirmPromoSuccessText?: string;
  confirmPromoInvalidText?: string;
  confirmFooterText?: string;
  // Transaksi
  paymentSuccessDmText?: string;
  paymentSuccessDmFooter?: string;
  paymentSuccessGroupText?: string;
  paymentSuccessGroupFooter?: string;
  paymentExpiredText?: string;
  paymentExpiredFooter?: string;
  paymentErrorText?: string;
  paymentErrorFooter?: string;
  // Notifikasi
  orderGroupNotifText?: string;
  orderGroupNotifFooter?: string;
  stockEmptyText?: string;
  stockEmptyFooter?: string;
  sessionExpiredText?: string;
  sessionExpiredFooter?: string;
  promoCancelledText?: string;
  promoCancelledFooter?: string;
  // Kontak & Peringatan
  contactOwnerEmptyText?: string;
  contactAdminEmptyText?: string;
  expiryWarningOwnerText?: string;
  expiryWarningOwnerFooter?: string;
}

