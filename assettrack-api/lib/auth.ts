import { randomBytes } from 'crypto';
import { SignJWT, jwtVerify } from 'jose';
import type { VercelRequest } from '@vercel/node';
import { HttpError } from './http-error';

const APP = 'assettrack';
const TTL_SECONDS = 30 * 24 * 3600;

function secret(): Uint8Array {
  const s = process.env.JWT_SECRET;
  if (!s || s.length < 32) throw new Error('JWT_SECRET missing or shorter than 32 characters');
  return new TextEncoder().encode(s);
}

/** Every app install gets an anonymous guest identity tagged role=guest, app=assettrack. */
export async function issueGuestToken() {
  const guestId = 'guest-' + randomBytes(6).toString('hex');
  const token = await new SignJWT({ role: 'guest', app: APP })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(guestId)
    .setIssuedAt()
    .setExpirationTime(`${TTL_SECONDS}s`)
    .sign(secret());
  return { token, guestId, expiresIn: TTL_SECONDS };
}

/** Returns the guest ID, or throws 401. The app should call /v1/auth/guest again on TOKEN_INVALID. */
export async function requireGuest(req: VercelRequest): Promise<string> {
  const header = req.headers.authorization ?? '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!token) throw new HttpError(401, 'Missing token', 'TOKEN_INVALID');
  try {
    const { payload } = await jwtVerify(token, secret(), { algorithms: ['HS256'] });
    if (payload.role !== 'guest' || payload.app !== APP || !payload.sub) throw new Error('bad claims');
    return payload.sub;
  } catch (err) {
    if (err instanceof Error && err.message.includes('JWT_SECRET')) throw err; // config error -> 500
    throw new HttpError(401, 'Invalid or expired token', 'TOKEN_INVALID');
  }
}

export const APP_ID = APP;
