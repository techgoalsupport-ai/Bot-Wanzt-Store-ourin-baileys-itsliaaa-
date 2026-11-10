import { Router, Request, Response } from 'express';
import { TemplateService, TemplateCategory } from '../services/templateService.ts';

export const templateRouter = Router();

// GET /templates - Mengambil daftar seluruh template pesan
templateRouter.get('/templates', (req: Request, res: Response) => {
  try {
    const category = typeof req.query.category === 'string' ? req.query.category : undefined;
    const templates = TemplateService.getAllTemplates(category);
    return res.json({
      success: true,
      templates,
    });
  } catch (error: any) {
    console.error('[Admin Templates] Gagal mengambil template:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Gagal memuat template pesan.',
    });
  }
});

// POST /templates - Menambahkan template baru
templateRouter.post('/templates', (req: Request, res: Response) => {
  try {
    const { name, category, content, is_active } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Nama template wajib diisi.',
      });
    }

    const validCategories: TemplateCategory[] = ['menu', 'list', 'carousel', 'invoice', 'confirmation'];
    if (!category || !validCategories.includes(category)) {
      return res.status(400).json({
        success: false,
        error: 'Kategori template tidak valid. Pilihan: menu, list, carousel, invoice, confirmation.',
      });
    }

    if (!content || !content.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Isi pesan template tidak boleh kosong.',
      });
    }

    const newTemplate = TemplateService.createTemplate({
      name,
      category,
      content,
      is_active: is_active !== undefined ? is_active : 1,
    });

    return res.status(201).json({
      success: true,
      message: 'Template berhasil ditambahkan.',
      template: newTemplate,
    });
  } catch (error: any) {
    console.error('[Admin Templates] Gagal menambahkan template:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Gagal menyimpan template baru.',
    });
  }
});

// PUT /templates/:id - Mengedit template
templateRouter.put('/templates/:id', (req: Request, res: Response) => {
  try {
    const id = parseInt(String(req.params.id), 10);
    if (isNaN(id)) {
      return res.status(400).json({ success: false, error: 'ID template tidak valid.' });
    }

    const { name, category, content, is_active } = req.body;
    const updated = TemplateService.updateTemplate(id, {
      name,
      category,
      content,
      is_active,
    });

    if (!updated) {
      return res.status(404).json({ success: false, error: 'Template tidak ditemukan.' });
    }

    return res.json({
      success: true,
      message: 'Template berhasil diperbarui.',
      template: updated,
    });
  } catch (error: any) {
    console.error('[Admin Templates] Gagal mengedit template:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Gagal memperbarui template.',
    });
  }
});

// PATCH /templates/:id/status - Toggle aktif/nonaktifkan template
templateRouter.patch('/templates/:id/status', (req: Request, res: Response) => {
  try {
    const id = parseInt(String(req.params.id), 10);
    if (isNaN(id)) {
      return res.status(400).json({ success: false, error: 'ID template tidak valid.' });
    }

    const { is_active } = req.body;
    const updated = TemplateService.toggleTemplateStatus(id, is_active);

    if (!updated) {
      return res.status(404).json({ success: false, error: 'Template tidak ditemukan.' });
    }

    return res.json({
      success: true,
      message: `Template berhasil ${updated.is_active === 1 ? 'diaktifkan' : 'dinonaktifkan'}.`,
      template: updated,
    });
  } catch (error: any) {
    console.error('[Admin Templates] Gagal toggle status template:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Gagal mengubah status template.',
    });
  }
});

// DELETE /templates/:id - Menghapus template
templateRouter.delete('/templates/:id', (req: Request, res: Response) => {
  try {
    const id = parseInt(String(req.params.id), 10);
    if (isNaN(id)) {
      return res.status(400).json({ success: false, error: 'ID template tidak valid.' });
    }

    const success = TemplateService.deleteTemplate(id);
    if (!success) {
      return res.status(404).json({ success: false, error: 'Template tidak ditemukan atau sudah dihapus.' });
    }

    return res.json({
      success: true,
      message: 'Template berhasil dihapus secara permanen.',
    });
  } catch (error: any) {
    console.error('[Admin Templates] Gagal menghapus template:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Gagal menghapus template.',
    });
  }
});
