import { NextRequest, NextResponse } from 'next/server';
import { fetchWellWishes, addWellWish, deleteWellWish } from '@/lib/firestore-server';
import { isAuthorizedAdminRequest } from '@/lib/admin-auth';
import { rateLimit, clientIp } from '@/lib/rate-limit';

/**
 * The guestbook wall — guests can post any time between RSVP-ing and the
 * wedding, so there's a reason to come back and see what's new.
 *
 * Now backed by the `well_wishes` Firestore collection. On Supabase this was
 * silently broken in production: the table had row-level security enabled but
 * no insert policy, so every guest POST failed with 42501 while reads
 * succeeded — the wall looked fine and stayed permanently empty.
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_NAME_LEN = 60;
const MAX_MESSAGE_LEN = 500;

export async function GET() {
  try {
    return NextResponse.json({ wishes: await fetchWellWishes(200) });
  } catch (err) {
    console.error('[Well Wishes] GET error:', err);
    return NextResponse.json({ wishes: [] });
  }
}

export async function POST(req: NextRequest) {
  // Public, unauthenticated write on a wall everyone can see — worth a limit
  // so one person can't flood it.
  const limit = rateLimit(`well-wishes:${clientIp(req)}`, 10, 60_000);
  if (!limit.allowed) {
    return NextResponse.json(
      { error: 'That is a lot of love. Give it a moment and try again.' },
      { status: 429, headers: { 'Retry-After': String(limit.retryAfter) } }
    );
  }

  try {
    const body = await req.json();
    const name = typeof body.name === 'string' ? body.name.trim().slice(0, MAX_NAME_LEN) : '';
    const message =
      typeof body.message === 'string' ? body.message.trim().slice(0, MAX_MESSAGE_LEN) : '';

    if (!message) {
      return NextResponse.json({ error: 'A message is required' }, { status: 400 });
    }

    const wish = await addWellWish(name || null, message);
    return NextResponse.json({ ok: true, wish });
  } catch (err) {
    console.error('[Well Wishes] POST error:', err);
    return NextResponse.json({ error: 'Could not post your message' }, { status: 500 });
  }
}

/** DELETE /api/well-wishes?id=xxx — admin-only moderation removal. */
export async function DELETE(req: NextRequest) {
  if (!isAuthorizedAdminRequest(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const id = req.nextUrl.searchParams.get('id');
  if (!id) {
    return NextResponse.json({ error: 'Missing id' }, { status: 400 });
  }

  try {
    await deleteWellWish(id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[Well Wishes] DELETE error:', err);
    return NextResponse.json({ error: 'Could not delete' }, { status: 500 });
  }
}
