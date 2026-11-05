import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireGuest } from './auth';
import { HttpError } from './http-error';
import { rateLimit } from './ratelimit';
import { reportServerError } from './errorlog';

export { HttpError };

interface Options {
  name: string;
  methods: string[];
  auth?: boolean;                       // default true: requires a guest token
  limit: { max: number; windowMs: number };
  reportFailures?: boolean;             // default true; the error endpoint sets false to avoid loops
}
type Handler = (req: VercelRequest, res: VercelResponse, ctx: { guestId: string }) => Promise<void>;

const clientIp = (req: VercelRequest) =>
  String(req.headers['x-forwarded-for'] ?? req.headers['x-real-ip'] ?? 'unknown').split(',')[0].trim();

export function route(opts: Options, handler: Handler) {
  return async (req: VercelRequest, res: VercelResponse) => {
    try {
      if (!opts.methods.includes(req.method ?? '')) {
        res.setHeader('Allow', opts.methods.join(', '));
        throw new HttpError(405, 'Method not allowed', 'METHOD_NOT_ALLOWED');
      }
      const needsAuth = opts.auth !== false;
      const guestId = needsAuth ? await requireGuest(req) : 'anonymous';

      const wait = rateLimit(`${opts.name}:${needsAuth ? guestId : clientIp(req)}`, opts.limit.max, opts.limit.windowMs);
      if (wait) {
        res.setHeader('Retry-After', String(wait));
        throw new HttpError(429, 'Too many requests, try again in a moment', 'RATE_LIMITED');
      }
      await handler(req, res, { guestId });
    } catch (err) {
      if (err instanceof HttpError) {
        res.status(err.status).json({ error: { code: err.code, message: err.message } });
        return;
      }
      console.error(`[${opts.name}]`, err);
      if (opts.reportFailures !== false) reportServerError(err, req.url?.split('?')[0] ?? opts.name);
      res.status(500).json({ error: { code: 'INTERNAL', message: 'Something went wrong' } });
    }
  };
}
