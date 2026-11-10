import { Router, Request, Response } from 'express';
import { TenantService } from '../services/tenantService.ts';
import { TenantStatusService } from '../services/tenantStatusService.ts';

export const tenantRouter = Router();

// 1. Daftar Seluruh Tenant
tenantRouter.get('/tenants', (_req: Request, res: Response) => {
  try {
    const tenants = TenantService.getAllTenants();
    res.json({ success: true, data: tenants });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err?.message || 'Gagal memuat daftar tenant' });
  }
});

// 2. Buat Tenant Baru
tenantRouter.post('/tenants', (req: Request, res: Response) => {
  try {
    const { store_name, owner_name, owner_phone, username, password, duration_days, duration_value, duration_unit, notes } = req.body || {};

    const newTenant = TenantService.createTenant({
      store_name: store_name ? String(store_name).trim() : '',
      owner_name: owner_name ? String(owner_name).trim() : '',
      owner_phone: owner_phone ? String(owner_phone).trim() : '',
      username: username ? String(username).trim() : undefined,
      password: password ? String(password).trim() : undefined,
      duration_value: duration_value !== undefined ? parseInt(duration_value, 10) : undefined,
      duration_unit: duration_unit,
      duration_days: duration_days ? parseInt(duration_days, 10) : undefined,
      notes: notes ? String(notes).trim() : undefined,
    });

    res.json({
      success: true,
      message: 'Unit tenant berhasil dibuat',
      data: newTenant,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err?.message || 'Gagal membuat tenant' });
  }
});

// 3. Perpanjang Durasi Sewa Tenant
tenantRouter.post('/tenants/:id/extend', (req: Request, res: Response) => {
  try {
    const tenantId = String(req.params.id);
    const { days, amount, unit, note } = req.body;
    
    // Support legacy 'days' or new 'amount' + 'unit'
    const finalAmount = parseInt(amount || days, 10);
    const finalUnit = unit || 'days';

    if (isNaN(finalAmount) || finalAmount <= 0) {
      return res.status(400).json({ success: false, message: 'Jumlah durasi harus berupa angka positif' });
    }

    const updated = TenantService.extendDuration(tenantId, finalAmount, finalUnit, note);
    res.json({ success: true, message: `Masa sewa berhasil diperpanjang +${finalAmount} ${finalUnit}`, data: updated });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err?.message || 'Gagal memperpanjang sewa' });
  }
});

// 4. Ubah Status Tenant (Suspend / Aktif / Expired)
tenantRouter.post('/tenants/:id/status', async (req: Request, res: Response) => {
  try {
    const tenantId = String(req.params.id);
    const { status } = req.body;

    if (!['active', 'suspended', 'expired'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Status tidak valid' });
    }

    const updated = await TenantStatusService.setStatus(tenantId, status);
    res.json({ success: true, message: `Status tenant diubah menjadi ${status}`, data: updated });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err?.message || 'Gagal mengubah status tenant' });
  }
});

// 5. Reset Password Tenant
tenantRouter.post('/tenants/:id/reset-password', (req: Request, res: Response) => {
  try {
    const tenantId = String(req.params.id);
    const { new_password } = req.body;
    const result = TenantService.resetPassword(tenantId, new_password);
    res.json({
      success: true,
      message: `Password tenant ${tenantId} berhasil diperbarui`,
      data: result,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err?.message || 'Gagal mereset password' });
  }
});

// 6. Hapus Tenant
tenantRouter.delete('/tenants/:id', (req: Request, res: Response) => {
  try {
    const tenantId = String(req.params.id);
    TenantService.deleteTenant(tenantId);
    res.json({ success: true, message: `Tenant ${tenantId} berhasil dihapus permanen` });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err?.message || 'Gagal menghapus tenant' });
  }
});
