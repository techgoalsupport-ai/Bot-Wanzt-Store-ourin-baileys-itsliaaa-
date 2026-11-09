import { Router, Request, Response } from 'express';
import { TenantService } from '../services/tenantService.ts';

export const statsRouter = Router();

statsRouter.get('/stats', (_req: Request, res: Response) => {
  try {
    const stats = TenantService.getGlobalStats();
    res.json({ success: true, data: stats });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err?.message || 'Gagal memuat statistik' });
  }
});
