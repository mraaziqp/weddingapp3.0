import { NextRequest, NextResponse } from 'next/server';
import {
  listMedia,
  countMedia,
  trashMedia,
  setMediaVisibility,
  isDriveConfigured,
  type MediaVisibility,
} from '@/lib/google-drive';
import { isAuthorizedAdminRequest } from '@/lib/admin-auth';

/**
 * Reads the media store (Google Drive) for the Live Wall, venue screen,
 * gallery feed and the couple's Vault.
 *
 * `visibility=public` is open — that's the wall everyone sees at the venue.
 * `private` and `all` are the couple's Vault and are admin-gated, the same way
 * /api/checkin gates itself: middleware.ts only matches page paths, so every
 * API route has to check admin auth for itself.
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const requested = params.get('visibility') ?? 'public';
  const visibility: MediaVisibility | 'all' =
    requested === 'private' || requested === 'all' ? requested : 'public';

  // Auth is checked before the config check so the gate behaves identically
  // whether or not Drive is wired up — otherwise an unconfigured deploy would
  // answer Vault requests with 200, which reads as "this endpoint is open".
  if (visibility !== 'public' && !isAuthorizedAdminRequest(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!isDriveConfigured()) {
    // An unconfigured Drive should render an empty wall, not crash the venue
    // screen mid-reception.
    return NextResponse.json({ items: [], count: 0, nextPageToken: null, configured: false });
  }

  // ?count=1 returns just the total, for the dashboard's photo tile.
  if (params.get('count')) {
    try {
      return NextResponse.json({ count: await countMedia(visibility), configured: true });
    } catch (err) {
      console.error('[Media] count failed:', err);
      return NextResponse.json({ error: 'Could not count photos' }, { status: 502 });
    }
  }

  const limitParam = Number(params.get('limit'));
  const limit = Number.isFinite(limitParam) && limitParam > 0 ? Math.min(limitParam, 200) : 60;

  try {
    const result = await listMedia({
      visibility,
      questTag: params.get('questTag'),
      guestId: params.get('guestId'),
      limit,
      pageToken: params.get('pageToken') ?? undefined,
    });
    return NextResponse.json({ ...result, configured: true });
  } catch (err) {
    console.error('[Media] list failed:', err);
    return NextResponse.json({ error: 'Could not load photos' }, { status: 502 });
  }
}

/** DELETE /api/media?id=xxx — admin moderation. Trashes rather than hard-deletes. */
export async function DELETE(req: NextRequest) {
  if (!isAuthorizedAdminRequest(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const id = req.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

  try {
    await trashMedia(id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[Media] delete failed:', err);
    return NextResponse.json({ error: 'Could not remove that photo' }, { status: 502 });
  }
}

/** PATCH /api/media — admin moves a photo between the Live Wall and the Vault. */
export async function PATCH(req: NextRequest) {
  if (!isAuthorizedAdminRequest(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id, visibility } = await req.json();
    if (!id || typeof id !== 'string') {
      return NextResponse.json({ error: 'Missing id' }, { status: 400 });
    }
    if (visibility !== 'public' && visibility !== 'private') {
      return NextResponse.json({ error: 'visibility must be public or private' }, { status: 400 });
    }

    await setMediaVisibility(id, visibility);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[Media] visibility change failed:', err);
    return NextResponse.json({ error: 'Could not update that photo' }, { status: 502 });
  }
}
