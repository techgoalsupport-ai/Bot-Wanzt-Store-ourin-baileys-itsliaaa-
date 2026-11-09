import { TenantService } from './tenantService.ts';
import { TenantStatusService } from './tenantStatusService.ts';
import { normalizeIndonesianPhone } from '../utils/phoneUtils.ts';
import { generateCleanId, generateStructuredUsername, generateRandomPassword } from '../utils/generatorUtils.ts';
export * from '../types/admin.types.ts';
export { normalizeIndonesianPhone };

export class TenantManager {
  static cleanId(name?: string): string {
    return generateCleanId(name);
  }

  static generateStructuredUsername(): string {
    return generateStructuredUsername();
  }

  static generateRandomPassword(): string {
    return generateRandomPassword();
  }

  static getAllTenants() {
    return TenantService.getAllTenants();
  }

  static getTenant(tenantId: string) {
    return TenantService.getTenant(tenantId);
  }

  static createTenant(input: any) {
    return TenantService.createTenant(input);
  }

  static extendDuration(tenantId: string, days: number, note?: string) {
    return TenantService.extendDuration(tenantId, days, note);
  }

  static setStatus(tenantId: string, status: 'active' | 'suspended' | 'expired') {
    return TenantStatusService.setStatus(tenantId, status);
  }

  static resetPassword(tenantId: string, newPassword?: string) {
    return TenantService.resetPassword(tenantId, newPassword);
  }

  static deleteTenant(tenantId: string) {
    return TenantService.deleteTenant(tenantId);
  }

  static getGlobalStats() {
    return TenantService.getGlobalStats();
  }

  static updateStoreInfo(tenantId: string, storeName: string, ownerName: string, ownerPhone: string) {
    return TenantService.updateStoreInfo(tenantId, storeName, ownerName, ownerPhone);
  }
}
