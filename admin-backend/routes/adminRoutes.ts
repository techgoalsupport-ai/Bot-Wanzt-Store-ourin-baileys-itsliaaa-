import { Router } from 'express';
import { authAdminRouter } from './authAdminRoutes.ts';
import { statsRouter } from './statsRoutes.ts';
import { tenantRouter } from './tenantRoutes.ts';
import { messageRouter } from './messageRoutes.ts';
import { impersonateRouter } from './impersonateRoutes.ts';
import { templateRouter } from './templateRoutes.ts';
import { expiryRouter } from './expiryRoutes.ts';
import { telegramAdminRouter } from './telegramAdminRoutes.ts';
import { tokenRouter } from './tokenRoutes.ts';
import { partnerAdminRouter } from './partnerAdminRoutes.ts';
import { masterSettingsRouter } from './masterSettingsRoutes.ts';
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
adminRouter.use('/', templateRouter);
adminRouter.use('/', expiryRouter);
adminRouter.use('/', tokenRouter);
adminRouter.use('/', partnerAdminRouter);
adminRouter.use('/', masterSettingsRouter);
adminRouter.use('/telegram', telegramAdminRouter);
