import { Router, Request, Response } from 'express';
import { TokenService } from '../../admin-backend/services/tokenService.ts';

export const tenantTokenRouter = Router();

// POST /api/bot/redeem-token: Penukaran token voucher perpanjangan masa sewa oleh tenant
tenantTokenRouter.post('/redeem-token', (req: Request, res: Response) => {
  try {
    const { tokenCode } = req.body;
    const tenantId = (req as any).tenantId || req.body.tenantId || 't_wanzt';

    if (!tokenCode || typeof tokenCode !== 'string' || !tokenCode.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Kode token voucher wajib diisi.',
      });
    }

    const result = TokenService.redeemToken(tokenCode, tenantId);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.message,
      });
    }

    res.json({
      success: true,
      message: result.message,
      data: {
        token: result.token,
        addedDuration: result.addedDuration,
        newExpiresAt: result.newExpiresAt,
        newDaysRemaining: result.newDaysRemaining,
        newTotalDays: (result as any).newTotalDays,
      },
    });
  } catch (error: any) {
    console.error('[Tenant Redeem Token Error]:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan sistem saat memproses voucher: ' + error.message,
    });
  }
});
