import { NextRequest, NextResponse } from 'next/server';
import {
  checkEventPin,
  createEventSession,
  eventCookieOptions,
  getEventSession,
  isEventAccessConfigured,
  readInviteToken,
  EVENT_COOKIE_NAME,
  type EventRole,
} from '@/lib/event-access';
import { isAuthorizedAdminRequest } from '@/lib/admin-auth';
import { rateLimit, clientIp } from '@/lib/rate-limit';

/**
 * Quick-join for the entertainment evening.
 * ────────────────────────────────────────
 * Two ways in, both designed for a guest standing in a venue on mobile data
 * who will abandon anything resembling a signup form:
 *
 *   POST { pin, name }    the 4-digit code on the table card
 *   POST { token, name? } a personalised magic link, /join?pass=…
 *
 * Either exchanges for one signed httpOnly cookie. There is no account, no
 * password and no email round trip — the cookie *is* the identity, and it
 * carries the role that middleware.ts enforces.
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_NAME_LEN = 40;

/** GET — who am I? Used by the hub to render the right name and controls. */
export async function GET(req: NextRequest) {
  const session = await getEventSession(req);
  if (!session) return NextResponse.json({ session: null }, { status: 200 });

  return NextResponse.json({
    session: { sub: session.sub, name: session.name, role: session.role },
  });
}

export async function POST(req: NextRequest) {
  if (!isEventAccessConfigured()) {
    return NextResponse.json(
      { error: 'The event hub is not set up yet. Please tell the host.' },
      { status: 503 }
    );
  }

  // A 4-digit PIN is only 10,000 possibilities. This limit — not the PIN's
  // own entropy — is what makes guessing it impractical, so it is checked
  // before anything else the request contains.
  const limit = rateLimit(`event-session:${clientIp(req)}`, 8, 60_000);
  if (!limit.allowed) {
    return NextResponse.json(
      { error: 'Too many attempts. Give it a minute and try again.' },
      { status: 429, headers: { 'Retry-After': String(limit.retryAfter) } }
    );
  }

  let body: { pin?: unknown; token?: unknown; name?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Malformed request' }, { status: 400 });
  }

  const providedName =
    typeof body.name === 'string' ? body.name.trim().slice(0, MAX_NAME_LEN) : '';

  let sub: string;
  let name: string;
  let role: EventRole;

  if (typeof body.token === 'string' && body.token) {
    const invite = await readInviteToken(body.token);
    if (!invite) {
      return NextResponse.json(
        { error: 'That link has expired. Ask the host for a new one, or use the PIN.' },
        { status: 401 }
      );
    }
    sub = invite.sub;
    // The name baked into the link wins — it is the one the host typed. A
    // guest may still correct it if the link carried no name.
    name = invite.name || providedName || 'Guest';
    role = invite.role;
  } else if (typeof body.pin === 'string' && checkEventPin(body.pin.trim())) {
    if (!providedName) {
      return NextResponse.json({ error: 'Please add your name first' }, { status: 400 });
    }
    // A PIN is shared, so it can only ever grant the narrowest tier. Anything
    // more has to come from a personalised link the host generated.
    sub = `evt-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    name = providedName;
    role = 'EVENT_ONLY_GUEST';
  } else {
    return NextResponse.json({ error: 'That PIN is not right' }, { status: 401 });
  }

  // The couple are already authenticated as admins; carry that through so
  // they get the moderation controls without a second, separate login.
  if (isAuthorizedAdminRequest(req)) role = 'ADMIN';

  const token = await createEventSession({ sub, name, role });

  const res = NextResponse.json({ ok: true, session: { sub, name, role } });
  res.cookies.set({ ...eventCookieOptions(), value: token });
  return res;
}

/** DELETE — leave the hub (used by the "not you?" link on the join screen). */
export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set({ ...eventCookieOptions(), name: EVENT_COOKIE_NAME, value: '', maxAge: 0 });
  return res;
}
