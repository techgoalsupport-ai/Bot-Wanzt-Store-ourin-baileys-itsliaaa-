import { Router, Request, Response } from 'express';
import { PartnerApiService } from '../services/partnerApiService.ts';

export const partnerAdminRouter = Router();

// GET /api/admin/partners: Ambil semua API key partner dan log aktivitas terbaru
partnerAdminRouter.get('/partners', (req: Request, res: Response) => {
  try {
    const keys = PartnerApiService.getAllKeys();
    const limit = parseInt(String(req.query.limit || '100'), 10);
    const logs = PartnerApiService.getRecentLogs(isNaN(limit) ? 100 : limit);

    res.json({
      success: true,
      data: {
        keys,
        logs,
      },
    });
  } catch (error: any) {
    console.error('[Partner Admin Error] Gagal memuat data partner:', error);
    res.status(500).json({
      success: false,
      message: 'Gagal memuat data API Key partner: ' + error.message,
    });
  }
});

// POST /api/admin/partners/create: Buat API key partner baru
partnerAdminRouter.post('/partners/create', (req: Request, res: Response) => {
  try {
    const name = typeof req.body?.name === 'string' ? req.body.name.trim() : '';
    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'Nama partner / kolaborator wajib diisi.',
      });
    }

    const result = PartnerApiService.createKey(name);
    res.json({
      success: true,
      message: `API Key untuk "${result.key.name}" berhasil dibuat.`,
      data: result,
    });
  } catch (error: any) {
    console.error('[Partner Admin Error] Gagal membuat API key:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Gagal membuat API Key partner.',
    });
  }
});

// PATCH /api/admin/partners/:id/status: Aktifkan atau suspend API key partner
partnerAdminRouter.patch('/partners/:id/status', (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const requestedStatus = req.body?.status;
    const validStatus =
      requestedStatus === 'active' || requestedStatus === 'suspended' ? requestedStatus : undefined;

    const updated = PartnerApiService.toggleKeyStatus(id, validStatus);
    if (!updated) {
      return res.status(404).json({
        success: false,
        message: 'API Key partner tidak ditemukan.',
      });
    }

    res.json({
      success: true,
      message: `API Key "${updated.name}" sekarang berstatus ${updated.status === 'active' ? 'Aktif' : 'Suspend'}.`,
      data: updated,
    });
  } catch (error: any) {
    console.error('[Partner Admin Error] Gagal mengubah status API key:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Gagal mengubah status API Key partner.',
    });
  }
});

// DELETE /api/admin/partners/:id: Hapus API key partner beserta lognya
partnerAdminRouter.delete('/partners/:id', (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const deleted = PartnerApiService.deleteKey(id);
    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: 'API Key partner tidak ditemukan.',
      });
    }

    res.json({
      success: true,
      message: 'API Key partner berhasil dihapus.',
    });
  } catch (error: any) {
    console.error('[Partner Admin Error] Gagal menghapus API key:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Gagal menghapus API Key partner.',
    });
  }
});
