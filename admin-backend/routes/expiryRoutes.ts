import { Router, Request, Response } from 'express';
import { checkAllTenantsExpiry } from '../../backend/services/expiryWarningService.ts';

export const expiryRouter = Router();

/**
 * POST /admin/expiry-warning/check-now
 * Memicu pengecekan instan masa kedaluwarsa seluruh tenant dan pengiriman pesan WhatsApp
 */
expiryRouter.post('/expiry-warning/check-now', async (_req: Request, res: Response) => {
  try {
    const report = await checkAllTenantsExpiry(true);
    return res.json({
      success: true,
      message: 'Pengecekan masa kedaluwarsa berhasil dieksekusi',
      report,
    });
  } catch (error: any) {
    console.error('[Admin Expiry] Gagal menjalankan pengecekan:', error);
    return res.status(500).json({
      success: false,
      message: error?.message || 'Gagal mengeksekusi pengecekan kedaluwarsa',
    });
  }
});
