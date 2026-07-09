import { NextRequest, NextResponse } from 'next/server';
import { ADMIN_COOKIE_NAME, ADMIN_COOKIE_MAX_AGE, getAllowedAdminKeys } from '@/lib/admin-auth';

export async function POST(req: NextRequest) {
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
