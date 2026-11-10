import { Router, Request, Response } from 'express';
import { TemplateService } from '../../admin-backend/services/templateService.ts';

export const tenantTemplateRouter = Router();

// GET /api/bot/templates - Mengambil daftar template aktif untuk penyewa toko
tenantTemplateRouter.get('/templates', (req: Request, res: Response) => {
  try {
    const category = typeof req.query.category === 'string' ? req.query.category.trim() : '';
    
    // Jika ada kategori spesifik, panggil query terisolasi
    if (category && category !== 'all') {
      const templates = TemplateService.getActiveTemplatesByCategory(category);
      return res.json({
        success: true,
        category,
        templates,
      });
    }

    // Jika tidak ada kategori, ambil semua template yang aktif saja
    const allTemplates = TemplateService.getAllTemplates().filter((t) => t.is_active === 1);
    return res.json({
      success: true,
      templates: allTemplates,
    });
  } catch (error: any) {
    console.error('[Tenant Templates] Gagal mengambil template aktif:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Gagal memuat katalog template pesan.',
      templates: [],
    });
  }
});
