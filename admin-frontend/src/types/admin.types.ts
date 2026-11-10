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
