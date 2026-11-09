import { Router, Request, Response } from 'express';
import { AdminAuthService } from '../services/adminAuthService.ts';

export const authAdminRouter = Router();

authAdminRouter.post('/login', (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;
    const result = AdminAuthService.login(username, password);
    return res.json({
      success: true,
      token: result.token,
      admin: result.admin,
    });
  } catch (err: any) {
    return res.status(401).json({ success: false, message: err?.message || 'Login gagal' });
  }
});

authAdminRouter.get('/me', (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  const isAuth = AdminAuthService.verifyToken(authHeader);

  if (isAuth) {
    return res.json({ success: true, authenticated: true });
  }
  return res.status(401).json({ success: false, authenticated: false });
});
