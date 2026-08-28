import { NextRequest, NextResponse } from 'next/server';
import { getEventSession } from '@/lib/event-access';
import { setReaction } from '@/lib/event-store';
import { isReaction } from '@/lib/event-config';
import { rateLimit, clientIp } from '@/lib/rate-limit';

/**
 * Emoji reactions on a wall item.
 *
 * POST { targetId, emoji }  — emoji: one of REACTIONS, or null to un-react.
 *
 * The write is a single document keyed by (item, guest), so this is idempotent
 * and the client can fire it optimistically without ever double-counting.
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const session = await getEventSession(req);
  if (!session) {
    return NextResponse.json({ error: 'Join the event first' }, { status: 401 });
  }

  // Reactions are cheap and tapped fast, so the ceiling is high — it exists to
  // stop a script, not a guest with an enthusiastic thumb.
  const limit = rateLimit(`event-react:${session.sub}:${clientIp(req)}`, 120, 60_000);
  if (!limit.allowed) {
    return NextResponse.json(
      { error: 'Easy on the reactions!' },
      { status: 429, headers: { 'Retry-After': String(limit.retryAfter) } }
    );
  }

  let body: { targetId?: unknown; emoji?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Malformed request' }, { status: 400 });
  }

  const targetId = typeof body.targetId === 'string' ? body.targetId.trim() : '';
  if (!targetId || targetId.length > 120) {
    return NextResponse.json({ error: 'Missing target' }, { status: 400 });
  }

  // null means "remove my reaction". Anything else must be one of ours —
  // otherwise the counts map becomes a place to store arbitrary strings.
  const emoji = body.emoji === null ? null : body.emoji;
  if (emoji !== null && !isReaction(emoji)) {
    return NextResponse.json({ error: 'Unknown reaction' }, { status: 400 });
  }

  try {
    await setReaction({ targetId, guestId: session.sub, emoji });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[Event] reaction failed:', err);
    return NextResponse.json({ error: 'Could not save that' }, { status: 502 });
  }
}
