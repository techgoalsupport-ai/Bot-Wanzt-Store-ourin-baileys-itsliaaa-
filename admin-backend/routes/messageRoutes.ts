import { Router, Request, Response } from 'express';
import { AdminMessagingService } from '../services/adminMessagingService.ts';

export const messageRouter = Router();

messageRouter.post('/tenants/:id/send-message', async (req: Request, res: Response) => {
  try {
    const tenantId = String(req.params.id);
    const { message } = req.body;

    const result = await AdminMessagingService.sendMessageToOwner(tenantId, message);
    return res.json(result);
  } catch (err: any) {
    const statusCode = err?.botOffline ? 400 : 500;
    return res.status(statusCode).json({
      success: false,
      botOffline: Boolean(err?.botOffline),
      message: err?.message || 'Gagal mengirim pesan',
    });
  }
});
