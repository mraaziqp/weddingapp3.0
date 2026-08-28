import { NextRequest, NextResponse } from 'next/server';
import { setMediaHidden, trashMedia } from '@/lib/google-drive';
import { getEventSession } from '@/lib/event-access';
import { setEventNoteHidden } from '@/lib/event-store';

/**
 * Admin moderation for the memory wall.
 *
 * PATCH { id, type, hidden }  hide or unhide one item
 * DELETE ?id=…&type=…         trash a photo for good
 *
 * Hiding is the default action and is reversible: the call is being made on a
 * phone, in a dark room, mid-party, and an accidental tap must cost one tap to
 * undo. DELETE is the deliberate second step, and even that goes to the Drive
 * trash — recoverable for 30 days — rather than erasing the file.
 *
 * Gated on the *event* session's ADMIN role rather than the admin cookie, so
 * the couple can moderate from the same hub the guests are using without
 * switching contexts. That role can only be granted by /api/event/session,
 * which sets it from the admin cookie or a signed admin magic link.
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Target = 'photo' | 'voice' | 'note';

function isTarget(value: unknown): value is Target {
  return value === 'photo' || value === 'voice' || value === 'note';
}

export async function PATCH(req: NextRequest) {
  const session = await getEventSession(req);
  if (session?.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: { id?: unknown; type?: unknown; hidden?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Malformed request' }, { status: 400 });
  }

  const id = typeof body.id === 'string' ? body.id.trim() : '';
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });
  if (!isTarget(body.type)) {
    return NextResponse.json({ error: 'Unknown item type' }, { status: 400 });
  }
  if (typeof body.hidden !== 'boolean') {
    return NextResponse.json({ error: 'hidden must be true or false' }, { status: 400 });
  }

  try {
    if (body.type === 'note') {
      await setEventNoteHidden(id, body.hidden);
    } else {
      await setMediaHidden(id, body.hidden);
    }
    return NextResponse.json({ ok: true, hidden: body.hidden });
  } catch (err) {
    console.error('[Event] moderation failed:', err);
    return NextResponse.json({ error: 'Could not update that item' }, { status: 502 });
  }
}

export async function DELETE(req: NextRequest) {
  const session = await getEventSession(req);
  if (session?.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const id = req.nextUrl.searchParams.get('id');
  const type = req.nextUrl.searchParams.get('type');
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });
  if (!isTarget(type)) {
    return NextResponse.json({ error: 'Unknown item type' }, { status: 400 });
  }

  try {
    if (type === 'note') {
      // Notes have no trash to fall back on, so a "delete" is a permanent
      // hide rather than a destructive write. Nothing here erases a guest's
      // words on a single tap.
      await setEventNoteHidden(id, true);
    } else {
      await trashMedia(id);
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[Event] delete failed:', err);
    return NextResponse.json({ error: 'Could not remove that item' }, { status: 502 });
  }
}
