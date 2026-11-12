import { Router, Request, Response } from 'express';
import { TokenService } from '../services/tokenService.ts';
import { DurationUnit } from '../types/admin.types.ts';

export const tokenRouter = Router();

// GET /api/admin/tokens: Mengambil seluruh riwayat token lisensi
tokenRouter.get('/tokens', (_req: Request, res: Response) => {
  try {
    const tokens = TokenService.getAllTokens();
    res.json({
      success: true,
      data: tokens,
    });
  } catch (error: any) {
    console.error('[Token Admin Error] Gagal mengambil daftar token:', error);
    res.status(500).json({
      success: false,
      message: 'Gagal mengambil daftar token: ' + error.message,
    });
  }
});

// POST /api/admin/tokens/create: Membuat token lisensi baru
tokenRouter.post('/tokens/create', (req: Request, res: Response) => {
  try {
    const { amount, unit } = req.body;

    const numAmount = parseInt(String(amount), 10);
    if (!numAmount || isNaN(numAmount) || numAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Parameter amount (durasi) wajib diisi dengan angka lebih dari 0.',
      });
    }

    const validUnits: DurationUnit[] = ['minutes', 'hours', 'days', 'months'];
    const chosenUnit = validUnits.includes(unit) ? (unit as DurationUnit) : 'days';

    const newToken = TokenService.createToken(numAmount, chosenUnit);

    res.json({
      success: true,
      message: `Token ${newToken.token_code} (${newToken.duration_label}) berhasil dibuat.`,
      data: newToken,
    });
  } catch (error: any) {
    console.error('[Token Admin Error] Gagal membuat token baru:', error);
    res.status(500).json({
      success: false,
      message: 'Gagal membuat token baru: ' + error.message,
    });
  }
});

// DELETE /api/admin/tokens/:id: Menghapus token
tokenRouter.delete('/tokens/:id', (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const deleted = TokenService.deleteToken(id);

    if (deleted) {
      res.json({
        success: true,
        message: 'Token lisensi berhasil dihapus.',
      });
    } else {
      res.status(404).json({
        success: false,
        message: 'Token tidak ditemukan.',
      });
    }
  } catch (error: any) {
    console.error('[Token Admin Error] Gagal menghapus token:', error);
    res.status(500).json({
      success: false,
      message: 'Gagal menghapus token: ' + error.message,
    });
  }
});
