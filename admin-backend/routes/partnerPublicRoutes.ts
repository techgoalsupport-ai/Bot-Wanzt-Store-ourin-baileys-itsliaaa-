import { Router, Request, Response, NextFunction } from 'express';
import { PartnerApiService } from '../services/partnerApiService.ts';
import { TenantService } from '../services/tenantService.ts';
import { TokenService } from '../services/tokenService.ts';
import {
  extractApiKeyFromHeaders,
  parsePartnerDuration,
  SlidingWindowRateLimiter,
} from '../services/partnerApiUtils.ts';

export const partnerPublicRouter = Router();

// Rate limiter: maksimal 60 request per menit per partner key / IP
const partnerRateLimiter = new SlidingWindowRateLimiter(60, 60_000);

interface AuthenticatedPartnerRequest extends Request {
  partner?: {
    id: number;
    name: string;
    prefix_key: string;
    status: 'active' | 'suspended';
  };
  clientIp?: string;
}

function getClientIp(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.trim()) {
    return forwarded.split(',')[0].trim();
  }
  return req.ip || req.socket?.remoteAddress || 'unknown';
}

function authenticatePartnerApi(
  req: AuthenticatedPartnerRequest,
  res: Response,
  next: NextFunction
) {
  const clientIp = getClientIp(req);
  req.clientIp = clientIp;

  const rawKey = extractApiKeyFromHeaders(
    req.headers['x-api-key'],
    req.headers.authorization
  );

  if (!rawKey) {
    return res.status(401).json({
      success: false,
      error: 'UNAUTHORIZED',
      message: 'API Key wajib disertakan melalui header "x-api-key" atau "Authorization: Bearer <API_KEY>".',
    });
  }

  const verification = PartnerApiService.verifyRawKey(rawKey);
  if (!verification.valid || !verification.partner) {
    if (verification.reason === 'suspended') {
      return res.status(403).json({
        success: false,
        error: 'API_KEY_SUSPENDED',
        message: 'API Key partner Anda saat ini sedang dinonaktifkan (suspended). Silakan hubungi pengelola.',
      });
    }

    // Rate limit percobaan key tidak valid berbasis IP
    const invalidLimit = partnerRateLimiter.check(`invalid_ip:${clientIp}`);
    if (!invalidLimit.allowed) {
      res.setHeader('Retry-After', String(invalidLimit.retryAfterSeconds));
      return res.status(429).json({
        success: false,
        error: 'RATE_LIMIT_EXCEEDED',
        message: `Terlalu banyak percobaan otentikasi gagal. Coba lagi dalam ${invalidLimit.retryAfterSeconds} detik.`,
      });
    }

    return res.status(401).json({
      success: false,
      error: 'INVALID_API_KEY',
      message: 'API Key tidak valid atau telah dihapus.',
    });
  }

  // Rate limit untuk partner valid
  const rateCheck = partnerRateLimiter.check(`partner:${verification.partner.id}`);
  res.setHeader('X-RateLimit-Remaining', String(rateCheck.remaining));
  if (!rateCheck.allowed) {
    res.setHeader('Retry-After', String(rateCheck.retryAfterSeconds));
    return res.status(429).json({
      success: false,
      error: 'RATE_LIMIT_EXCEEDED',
      message: `Batas request API tercapai. Silakan coba lagi dalam ${rateCheck.retryAfterSeconds} detik.`,
    });
  }

  req.partner = verification.partner;
  next();
}

partnerPublicRouter.use(authenticatePartnerApi);

/**
 * POST /api/v1/partner/tenants/create
 * Membuat unit akun bot tenant baru secara otomatis (unlimited selama API Key aktif).
 */
partnerPublicRouter.post('/tenants/create', (req: AuthenticatedPartnerRequest, res: Response) => {
  try {
    const body = req.body || {};
    const durationResult = parsePartnerDuration(body, {
      allowWeeks: true,
      defaultValue: 30,
      defaultUnit: 'days',
    });

    if (!durationResult.valid) {
      return res.status(400).json({
        success: false,
        error: 'INVALID_DURATION',
        message: durationResult.message,
      });
    }

    const created = TenantService.createTenant({
      store_name: typeof body.store_name === 'string' ? body.store_name.trim() : '',
      owner_name: typeof body.owner_name === 'string' ? body.owner_name.trim() : '',
      owner_phone: typeof body.owner_phone === 'string' ? body.owner_phone.trim() : '',
      username: typeof body.username === 'string' && body.username.trim() ? body.username.trim() : undefined,
      password: typeof body.password === 'string' && body.password.trim() ? body.password.trim() : undefined,
      duration_value: durationResult.amount,
      duration_unit: durationResult.unit,
      notes: `Dibuat via Partner API (${req.partner!.name})`,
    });

    PartnerApiService.recordUsage({
      collaboratorId: req.partner!.id,
      collaboratorName: req.partner!.name,
      actionType: 'create_tenant',
      targetId: created.tenant_id,
      durationLabel: durationResult.label,
      requestIp: req.clientIp || 'unknown',
    });

    const host = req.get('host');
    const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'https';
    const loginUrl = host ? `${protocol}://${host}/` : '/';

    return res.status(201).json({
      success: true,
      message: 'Akun tenant bot WhatsApp berhasil dibuat otomatis.',
      data: {
        tenant_id: created.tenant_id,
        username: created.generated_username || created.username,
        password: created.generated_password,
        store_name: created.store_name,
        duration_value: durationResult.amount,
        duration_unit: durationResult.unit,
        duration_label: durationResult.label,
        days_active: created.days_remaining ?? durationResult.amount,
        expires_at: created.expires_at,
        login_url: loginUrl,
        guide: 'Login ke dashboard menggunakan username & password di atas, lalu lengkapi profil toko dan sambungkan nomor WhatsApp bot.',
      },
    });
  } catch (error: any) {
    console.error('[Partner Public API Error] Gagal membuat tenant:', error);
    const statusCode = /UNIQUE constraint failed/i.test(error?.message || '') ? 409 : 500;
    return res.status(statusCode).json({
      success: false,
      error: statusCode === 409 ? 'USERNAME_ALREADY_EXISTS' : 'CREATE_TENANT_FAILED',
      message:
        statusCode === 409
          ? 'Username sudah digunakan oleh tenant lain. Kosongkan field username untuk auto-generate unik.'
          : error?.message || 'Gagal membuat akun tenant baru.',
    });
  }
});

/**
 * POST /api/v1/partner/tokens/create
 * Membuat token lisensi voucher perpanjangan masa sewa sekali pakai (single-use).
 */
partnerPublicRouter.post('/tokens/create', (req: AuthenticatedPartnerRequest, res: Response) => {
  try {
    const body = req.body || {};
    const durationResult = parsePartnerDuration(body, {
      allowWeeks: false,
      defaultValue: 30,
      defaultUnit: 'days',
    });

    if (!durationResult.valid) {
      return res.status(400).json({
        success: false,
        error: 'INVALID_DURATION',
        message: durationResult.message,
      });
    }

    const token = TokenService.createToken(durationResult.amount, durationResult.unit);

    PartnerApiService.recordUsage({
      collaboratorId: req.partner!.id,
      collaboratorName: req.partner!.name,
      actionType: 'create_token',
      targetId: token.token_code,
      durationLabel: token.duration_label,
      requestIp: req.clientIp || 'unknown',
    });

    return res.status(201).json({
      success: true,
      message: `Token lisensi perpanjangan ${token.duration_label} berhasil dibuat.`,
      data: {
        token_code: token.token_code,
        amount: token.amount,
        unit: token.unit,
        duration_label: token.duration_label,
        status: token.status,
        created_at: token.created_at,
        guide: 'Pembeli dapat menukarkan kode token ini di menu Management Bot pada dashboard toko mereka.',
      },
    });
  } catch (error: any) {
    console.error('[Partner Public API Error] Gagal membuat token:', error);
    return res.status(500).json({
      success: false,
      error: 'CREATE_TOKEN_FAILED',
      message: error?.message || 'Gagal membuat token perpanjangan.',
    });
  }
});
