import { NextRequest, NextResponse } from 'next/server';
import { ADMIN_COOKIE_NAME, ADMIN_COOKIE_MAX_AGE, getAllowedAdminKeys } from '@/lib/admin-auth';
import { rateLimit, clientIp } from '@/lib/rate-limit';

/**
 * The whole admin surface — the full guest list, dietary details, phone
 * numbers, the private photo vault — sits behind one shared access key, and
 * /admin is linked from a public wedding site. Without a limit here that key
 * can be brute-forced at network speed. Ten attempts a minute is generous for
 * a human typing a key they were given and useless for a script.
 */
const MAX_ATTEMPTS = 10;
const WINDOW_MS = 60_000;

export async function POST(req: NextRequest) {
  const limit = rateLimit(`admin-login:${clientIp(req)}`, MAX_ATTEMPTS, WINDOW_MS);
  if (!limit.allowed) {
    return NextResponse.json(
      { ok: false, error: 'Too many attempts. Please wait a moment and try again.' },
      { status: 429, headers: { 'Retry-After': String(limit.retryAfter) } }
    );
  }

  const { key } = await req.json().catch(() => ({ key: '' }));

  if (!key || typeof key !== 'string') {
    return NextResponse.json({ ok: false, error: 'Please enter your access key.' }, { status: 400 });
  }

  const trimmed = key.trim();
  const brideKey = process.env.FAMILY_ACCESS_KEY_BRIDE;
  const groomKey = process.env.FAMILY_ACCESS_KEY_GROOM;

  if (brideKey && trimmed === brideKey) {
    return NextResponse.json({ ok: true, redirect: `/family/${brideKey}` });
  }
  if (groomKey && trimmed === groomKey) {
    return NextResponse.json({ ok: true, redirect: `/family/${groomKey}` });
  }

  const allowedKeys = getAllowedAdminKeys();
  if (!allowedKeys.includes(trimmed)) {
    return NextResponse.json({ ok: false, error: 'That key is incorrect. Please try again.' }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set({
    name: ADMIN_COOKIE_NAME,
    value: key.trim(),
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: ADMIN_COOKIE_MAX_AGE,
  });
  return response;
}
