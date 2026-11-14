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
  warned_3d?: number;
  warned_1d?: number;
  warned_5h?: number;
  warned_1h?: number;
  days_remaining?: number;
  duration_days?: number;
  bot_status?: 'online' | 'offline';
}

export type DurationUnit = 'minutes' | 'hours' | 'days' | 'weeks' | 'months';

export interface CreateTenantInput {
  tenant_id?: string;
  store_name?: string;
  owner_name?: string;
  owner_phone?: string;
  username?: string;
  password?: string;
  package_name?: string;
  duration_value?: number;
  duration_unit?: DurationUnit;
  duration_days?: number; // Keep for backward compatibility
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

