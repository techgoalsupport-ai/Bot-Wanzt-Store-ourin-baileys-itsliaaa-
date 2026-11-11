export const DEFAULT_CUSTOM_CODE = '';
export const SESSION_DIR = 'session_ourin';

// Supported command prefixes: /, ., !, ?, #, $, %, &
export const ALLOWED_PREFIXES = ['/', '.', '!', '?', '#', '$', '%', '&'];

export type BotStatus =
  | 'idle'
  | 'connecting'
  | 'waiting_code'
  | 'code_ready'
  | 'connected'
  | 'closed'
  | 'error';

export interface LogEntry {
  id: string;
  time: string;
  type: 'info' | 'success' | 'warning' | 'error' | 'code';
  message: string;
}

export type WhatsAppButtonType =
  | 'quick_reply'
  | 'cta_url'
  | 'cta_copy'
  | 'vcard'
  | 'cta_call'
  | 'cta_reminder'
  | 'cta_cancel_reminder';

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

export interface ProductVariantItem {
  id: string;
  name: string;
  variant: string;
  stock: number;
  price: number;
  category: string;
}

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

export interface MenuCommandConfig {
  menuOutputText: string;
  menuFooterText: string;
  menuButtons: WhatsAppButton[];
  includeMedia: boolean;
  selectedPicture: string;
}

export interface ListCommandConfig {
  listOutputText: string;
  listFooterText: string;
}

export interface CarouselCommandConfig {
  carouselOutputText: string;
  carouselFooterText: string;
  carouselPicture: string;
}

export interface InvoiceCommandConfig {
  invoiceOutputText: string;
  invoiceFooterText: string;
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

export interface ApiConfig {
  xavieraApiKey: string;
  xavieraBaseUrl: string;
  lunasQrisApiKey?: string;
  lunasQrisSecretKey?: string;
  lunasQrisBaseUrl?: string;
}

export interface CommandsConfig {
  storeInfo: StoreInfoConfig;
  pricingConfig?: PricingConfig;
  menuOutputText: string;
  menuFooterText?: string;
  menuButtons: WhatsAppButton[];
  includeMedia?: boolean;
  selectedPicture?: string;
  listOutputText: string;
  listFooterText?: string;
  carouselOutputText?: string;
  carouselFooterText?: string;
  carouselPicture?: string;
  invoiceOutputText?: string;
  invoiceFooterText?: string;
  confirmSummaryText?: string;
  confirmInputPromoText?: string;
  confirmPromoSuccessText?: string;
  confirmPromoInvalidText?: string;
  confirmFooterText?: string;
  // Respon Transaksi (Status Bayar)
  paymentSuccessDmText?: string;
  paymentSuccessDmFooter?: string;
  paymentSuccessGroupText?: string;
  paymentSuccessGroupFooter?: string;
  paymentExpiredText?: string;
  paymentExpiredFooter?: string;
  paymentErrorText?: string;
  paymentErrorFooter?: string;
  // Respon Notifikasi Alur Pesanan
  orderGroupNotifText?: string;
  orderGroupNotifFooter?: string;
  stockEmptyText?: string;
  stockEmptyFooter?: string;
  sessionExpiredText?: string;
  sessionExpiredFooter?: string;
  promoCancelledText?: string;
  promoCancelledFooter?: string;
  // Respon Kontak & Pengingat Status
  contactOwnerEmptyText?: string;
  contactAdminEmptyText?: string;
  expiryWarningOwnerText?: string;
  expiryWarningOwnerFooter?: string;
  xavieraApiKey?: string;
  xavieraBaseUrl?: string;
  lunasQrisApiKey?: string;
  lunasQrisSecretKey?: string;
  lunasQrisBaseUrl?: string;
}



