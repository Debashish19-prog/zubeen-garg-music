import crypto from 'node:crypto';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

/**
 * Upload sign-in is OFF while OWNER_PASSWORD is unset in .env.local: everyone who can open the site
 * gets the upload tools (the server only listens on 127.0.0.1, so that is this machine).
 *
 * With OWNER_PASSWORD set, the site has one owner: whoever knows it. Signing in sets an HttpOnly
 * cookie holding an HMAC of the issue time, keyed by the password, so changing the password signs
 * every browser out. Everyone else can listen but never sees the upload tools.
 */
const COOKIE = 'zg_owner';
const MAX_AGE = 60 * 60 * 24 * 30; // 30 days

const password = () => process.env.OWNER_PASSWORD || '';
/** true when uploads need the owner password */
export const authEnabled = () => password().length > 0;
export const ownerConfigured = () => password().length >= 6;

const sign = (issued: string) => crypto.createHmac('sha256', 'zg-owner:' + password()).update(issued).digest('base64url');

function safeEqual(a: string, b: string) {
  const x = Buffer.from(a), y = Buffer.from(b);
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}

export function tokenValid(token: string | undefined): boolean {
  if (!token || !ownerConfigured()) return false;
  const [issued, mac] = token.split('.');
  const t = Number(issued);
  if (!Number.isFinite(t) || Date.now() - t > MAX_AGE * 1000 || t > Date.now() + 60_000) return false;
  return safeEqual(mac || '', sign(issued));
}

export async function isOwner(): Promise<boolean> {
  if (!authEnabled()) return true;
  return tokenValid((await cookies()).get(COOKIE)?.value);
}

/* very small brute-force brake: after 5 wrong passwords, wait a minute */
const g = globalThis as unknown as { __zgOwnerFails?: { n: number; until: number } };
const fails = (g.__zgOwnerFails ??= { n: 0, until: 0 });

export async function login(attempt: string, secure: boolean): Promise<{ ok: true } | { ok: false; error: string; status: number }> {
  if (!authEnabled()) return { ok: true };
  if (!ownerConfigured()) return { ok: false, error: 'Set OWNER_PASSWORD (6+ characters) in web/.env.local, then restart the server.', status: 503 };
  if (Date.now() < fails.until) return { ok: false, error: 'Too many wrong passwords. Try again in a minute.', status: 429 };
  await new Promise((r) => setTimeout(r, 350));
  const want = crypto.createHash('sha256').update(password()).digest();
  const got = crypto.createHash('sha256').update(String(attempt || '')).digest();
  if (!crypto.timingSafeEqual(want, got)) {
    if (++fails.n >= 5) {
      fails.n = 0;
      fails.until = Date.now() + 60_000;
    }
    return { ok: false, error: 'That password isn’t right.', status: 401 };
  }
  fails.n = 0;
  const issued = String(Date.now());
  (await cookies()).set(COOKIE, `${issued}.${sign(issued)}`, { httpOnly: true, sameSite: 'strict', secure, path: '/', maxAge: MAX_AGE });
  return { ok: true };
}

export async function logout() {
  (await cookies()).delete(COOKIE);
}

/** True when the request came over https (directly or through a proxy), for the cookie's Secure flag. */
export const isHttps = (req: Request) => new URL(req.url).protocol === 'https:' || req.headers.get('x-forwarded-proto') === 'https';

/**
 * Guard for owner-only routes. Writes must always come from this site's own pages (a cross-site form
 * or script never carries a matching Origin), so other websites can't upload or delete through your
 * browser. The owner cookie is checked only when OWNER_PASSWORD is set.
 */
export async function requireOwner(req: Request): Promise<NextResponse | null> {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    const origin = req.headers.get('origin');
    const host = req.headers.get('x-forwarded-host') || req.headers.get('host');
    let foreign = false;
    try {
      foreign = !!origin && !!host && new URL(origin).host !== host;
    } catch {
      foreign = true; // "null" or malformed origin
    }
    if (foreign) return NextResponse.json({ error: 'cross-site request refused' }, { status: 403 });
  }
  if (!(await isOwner())) return NextResponse.json({ error: 'Only the site owner can do this. Sign in first.' }, { status: 401 });
  return null;
}
