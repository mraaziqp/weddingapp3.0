import { NextRequest, NextResponse } from 'next/server';
import { getEventSession } from '@/lib/event-access';
import { addEventNote } from '@/lib/event-store';
import { rateLimit, clientIp } from '@/lib/rate-limit';

/**
 * Written memories — the wall's text posts.
 *
 * Reads live on /api/event/feed alongside the photos, so there is no GET here;
 * splitting the read would cost the wall a second round trip per poll for no
 * benefit.
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_MESSAGE_LEN = 400;

export async function POST(req: NextRequest) {
  const session = await getEventSession(req);
  if (!session) {
    return NextResponse.json({ error: 'Join the event first' }, { status: 401 });
  }

  const limit = rateLimit(`event-note:${session.sub}:${clientIp(req)}`, 12, 60_000);
  if (!limit.allowed) {
    return NextResponse.json(
      { error: 'That is a lot of feelings. Give it a moment.' },
      { status: 429, headers: { 'Retry-After': String(limit.retryAfter) } }
    );
  }

  let body: { message?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Malformed request' }, { status: 400 });
  }

  const message =
    typeof body.message === 'string' ? body.message.trim().slice(0, MAX_MESSAGE_LEN) : '';
  if (!message) {
    return NextResponse.json({ error: 'Write something first' }, { status: 400 });
  }

  try {
    // The name is taken from the signed session, never from the body — so a
    // guest cannot post a note under someone else's name.
    const note = await addEventNote({
      guestId: session.sub,
      guestName: session.name,
      message,
    });
    return NextResponse.json({ ok: true, note }, { status: 201 });
  } catch (err) {
    console.error('[Event] note failed:', err);
    return NextResponse.json({ error: 'Could not post that. Try again.' }, { status: 502 });
  }
}
