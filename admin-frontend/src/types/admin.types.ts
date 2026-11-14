export interface Tenant {
  id: number;
  tenant_id: string;
  store_name: string;
  owner_name: string;
  owner_phone: string;
  username: string;
  package_name: string;
  status: 'active' | 'suspended' | 'expired';
  max_groups: number;
  created_at: string;
  expires_at: string;
  notes: string | null;
  warned_3d?: number;
  warned_1d?: number;
  warned_5h?: number;
  warned_1h?: number;
  days_remaining?: number;
  duration_days?: number;
  bot_status?: 'online' | 'offline';
}

export interface Stats {
  totalTenants: number;
  activeTenants: number;
  expiredTenants: number;
  suspendedTenants: number;
  serverTime: string;
}

export interface CreatedTenantResult {
  username: string;
  password?: string;
  tenant_id: string;
  store_name?: string;
  duration_days?: number;
  created_at?: string;
  expires_at?: string;
}

export interface ResetPasswordResult {
  username: string;
  new_password: string;
}

export type TemplateCategory =
  | 'menu'
  | 'list'
  | 'carousel'
  | 'invoice'
  | 'confirm_summary'
  | 'confirm_promo_input'
  | 'confirm_promo_valid'
  | 'confirm_promo_invalid'
  | 'payment_success_dm'
  | 'payment_success_group'
  | 'payment_expired'
  | 'payment_error'
  | 'order_group_notif'
  | 'stock_empty'
  | 'checkout_session_expired'
  | 'promo_cancelled'
  | 'contact_owner_empty'
  | 'contact_admin_empty'
  | 'expiry_warning_owner'
  | 'confirmation';

export interface MessageTemplate {
  id: number;
  name: string;
  category: TemplateCategory;
  content: string;
  is_active: number;
  created_at: string;
  updated_at: string;
}

export type DurationUnit = 'minutes' | 'hours' | 'days' | 'weeks' | 'months';

export interface CreateTemplateInput {
  name: string;
  category: TemplateCategory;
  content: string;
  is_active?: boolean | number;
}

export interface LicenseToken {
  id: string;
  token_code: string;
  amount: number;
  unit: DurationUnit;
  duration_label: string;
  status: 'available' | 'used' | 'revoked';
  created_at: string;
  used_by_tenant_id?: string;
  used_at?: string;
}

export interface CollaboratorApiKey {
  id: number;
  name: string;
  prefix_key: string;
  status: 'active' | 'suspended';
  last_used_at: string | null;
  created_at: string;
  usage_count?: number;
}

export interface CreatePartnerKeyResult {
  key: CollaboratorApiKey;
  raw_api_key: string;
}

export interface CollaboratorLog {
  id: number;
  collaborator_id: number;
  collaborator_name: string;
  action_type: 'create_tenant' | 'create_token';
  target_id: string;
  duration_label: string;
  request_ip: string;
  created_at: string;
}

export interface MasterAdminContact {
  id?: number;
  name: string;
  phone: string;
  cleanPhone?: string;
  weight: number;
  sort_order?: number;
  created_at?: string;
  updated_at?: string;
}
