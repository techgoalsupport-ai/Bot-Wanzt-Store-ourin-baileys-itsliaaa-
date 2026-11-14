import { Router, Request, Response } from 'express';
import { MasterAdminContactService } from '../services/masterAdminContactService.ts';

export const masterSettingsRouter = Router();

masterSettingsRouter.get('/master-admins', (_req: Request, res: Response) => {
  try {
    const admins = MasterAdminContactService.getAllMasterAdmins();
    return res.json({ success: true, admins });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      message: err?.message || 'Gagal memuat daftar kontak Master Admin.',
    });
  }
});

masterSettingsRouter.put('/master-admins', (req: Request, res: Response) => {
  try {
    const items = Array.isArray(req.body?.admins) ? req.body.admins : [];
    const savedAdmins = MasterAdminContactService.saveMasterAdmins(items);
    return res.json({
      success: true,
      admins: savedAdmins,
      message: 'Pengaturan kontak dan distribusi Master Admin berhasil disimpan.',
    });
  } catch (err: any) {
    return res.status(400).json({
      success: false,
      message: err?.message || 'Gagal menyimpan kontak Master Admin.',
    });
  }
});
