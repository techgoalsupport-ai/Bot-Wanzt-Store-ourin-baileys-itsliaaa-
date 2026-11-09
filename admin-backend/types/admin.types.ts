export interface TenantRecord {
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

export interface CreateTenantInput {
  tenant_id?: string;
  store_name?: string;
  owner_name?: string;
  owner_phone?: string;
  username?: string;
  password?: string;
  package_name?: string;
  duration_days?: number;
  max_groups?: number;
  notes?: string;
}

export interface CreateTenantResult extends TenantRecord {
  generated_username?: string;
  generated_password?: string;
}

export interface GlobalStats {
  totalTenants: number;
  activeTenants: number;
  expiredTenants: number;
  suspendedTenants: number;
  serverTime: string;
}
