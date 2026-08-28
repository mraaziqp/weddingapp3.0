import { NextRequest, NextResponse } from 'next/server';
import { isAuthorizedAdminRequest } from '@/lib/admin-auth';
import { createInviteToken, isEventRole, isEventAccessConfigured } from '@/lib/event-access';

/**
 * Generates a personalised magic link for one guest.
 *
 * POST { name, role } → { url }
 *
 * The link is a stateless signed token rather than a database row. That means
 * the host can generate a hundred of them on the drive to the venue with no
 * writes, and redeeming one needs no lookup — which matters when a hundred
 * people scan their links inside the same two minutes on arrival.
 *
 * Admin-cookie gated: middleware only guards *pages*, so this checks for
 * itself. Without that, anyone who found the URL could mint themselves an
 * ADMIN session and moderate the wall.
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_NAME_LEN = 40;

export async function POST(req: NextRequest) {
  if (!isAuthorizedAdminRequest(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!isEventAccessConfigured()) {
    return NextResponse.json(
      { error: 'Set EVENT_SESSION_SECRET before generating links' },
      { status: 503 }
    );
  }

  let body: { name?: unknown; role?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Malformed request' }, { status: 400 });
  }

  const name = typeof body.name === 'string' ? body.name.trim().slice(0, MAX_NAME_LEN) : '';
  if (!name) return NextResponse.json({ error: 'A name is required' }, { status: 400 });

  const role = isEventRole(body.role) ? body.role : 'EVENT_ONLY_GUEST';

  const sub = `evt-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  const token = await createInviteToken({ sub, name, role });

  // Prefer the configured public origin: the host may be generating links from
  // localhost or a preview deployment, and a link pointing at either is
  // useless to a guest.
  const origin = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') || req.nextUrl.origin;

  return NextResponse.json({
    ok: true,
    name,
    role,
    url: `${origin}/join?pass=${encodeURIComponent(token)}`,
  });
}
