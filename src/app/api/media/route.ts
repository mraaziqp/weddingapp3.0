import { NextRequest, NextResponse } from 'next/server';
import {
  listMedia,
  countMedia,
  trashMedia,
  updateMedia,
  isDriveConfigured,
  type MediaVisibility,
  type MediaPatch,
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
      // An admin view has to show what it has already hidden, otherwise
      // hiding an item is a one-way door: it drops out of the only list the
      // couple can moderate from and can never be brought back.
      includeHidden: visibility !== 'public',
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

/**
 * PATCH /api/media — admin edits one item on the wall.
 *
 * Accepts any subset of { caption, guestName, questTag, visibility, hidden }.
 * Omitted keys are left alone, so the couple can retag a photo without
 * disturbing who it is credited to.
 */
const CAPTION_MAX = 280;
const NAME_MAX = 80;
const TAG_MAX = 60;

export async function PATCH(req: NextRequest) {
  if (!isAuthorizedAdminRequest(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Malformed request' }, { status: 400 });
  }

  const id = typeof body.id === 'string' ? body.id.trim() : '';
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

  const patch: MediaPatch = {};

  // Length caps are enforced here rather than only in the form: Drive rejects
  // the whole file update once appProperties exceed their quota, so an
  // over-long caption would fail the write instead of being trimmed.
  const text = (value: unknown, max: number, field: string): string | null | undefined => {
    if (value === undefined) return undefined;
    if (value === null) return null;
    if (typeof value !== 'string') throw new Error(`${field} must be text`);
    if (value.length > max) throw new Error(`${field} must be ${max} characters or fewer`);
    return value;
  };

  try {
    const caption = text(body.caption, CAPTION_MAX, 'Caption');
    if (caption !== undefined) patch.caption = caption;

    const guestName = text(body.guestName, NAME_MAX, 'Name');
    if (guestName !== undefined) patch.guestName = guestName;

    const questTag = text(body.questTag, TAG_MAX, 'Tag');
    if (questTag !== undefined) patch.questTag = questTag;

    if (body.visibility !== undefined) {
      if (body.visibility !== 'public' && body.visibility !== 'private') {
        throw new Error('visibility must be public or private');
      }
      patch.visibility = body.visibility;
    }

    if (body.hidden !== undefined) {
      if (typeof body.hidden !== 'boolean') throw new Error('hidden must be true or false');
      patch.hidden = body.hidden;
    }
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 });
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });
  }

  try {
    await updateMedia(id, patch);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[Media] update failed:', err);
    return NextResponse.json({ error: 'Could not update that photo' }, { status: 502 });
  }
}
