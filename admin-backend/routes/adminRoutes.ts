import { Router } from 'express';
import { authAdminRouter } from './authAdminRoutes.ts';
import { statsRouter } from './statsRoutes.ts';
import { tenantRouter } from './tenantRoutes.ts';
import { messageRouter } from './messageRoutes.ts';
import { impersonateRouter } from './impersonateRoutes.ts';
import { activeAdminTokens, impersonationTokens } from '../services/adminAuthService.ts';

export const adminRouter = Router();

// Re-export untuk backward compatibility
export { activeAdminTokens, impersonationTokens };

// Mount modular sub-routers
adminRouter.use('/auth', authAdminRouter);
adminRouter.use('/', statsRouter);
adminRouter.use('/', tenantRouter);
adminRouter.use('/', messageRouter);
adminRouter.use('/', impersonateRouter);
