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
