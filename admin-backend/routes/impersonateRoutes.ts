import { Router, Request, Response } from 'express';
import { TenantService } from '../services/tenantService.ts';
import { AdminAuthService } from '../services/adminAuthService.ts';

export const impersonateRouter = Router();

impersonateRouter.post('/tenants/:id/impersonate', (req: Request, res: Response) => {
  try {
    const tenantId = String(req.params.id);
    const tenant = TenantService.getTenant(tenantId);
    if (!tenant) {
      return res.status(404).json({ success: false, message: 'Tenant tidak ditemukan' });
    }

    const impToken = AdminAuthService.createImpersonationToken(tenantId);

    return res.json({
      success: true,
      token: impToken,
      redirectUrl: `/?impersonate=${impToken}&tenant=${tenantId}`,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err?.message || 'Gagal membuat sesi impersonasi' });
  }
});
