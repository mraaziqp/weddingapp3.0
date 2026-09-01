import { NextRequest, NextResponse } from 'next/server';
import {
  createResumableSession,
  isDriveConfigured,
  type MediaVisibility,
  type MediaScope,
} from '@/lib/google-drive';
import { isAuthorizedAdminRequest } from '@/lib/admin-auth';
import { resolveDisplayName } from '@/lib/firestore-server';
import { rateLimit, clientIp } from '@/lib/rate-limit';

/**
 * Mints a one-shot Drive upload URI so the browser can send a large file
 * — in practice, a video — straight to Google.
 *
 * The app's own upload route cannot carry these: this deploys to Firebase App
 * Hosting (Cloud Run), which rejects a request body over 32MB, and a short
 * clip off a phone is routinely larger than that.
 *
 * Two callers, both gated here rather than only in middleware — middleware's
 * matcher lists page paths, so an unguarded API route is one URL away from
 * letting anyone write into the couple's Drive:
 *
 *  - the couple, from the Memory Vault, identified by the admin cookie;
 *  - a guest at the venue, who must present the invite code from their own
 *    link. That code is resolved to a real household before any session is
 *    minted, so an arbitrary caller cannot open one, and guests are rate
 *    limited on top.
 *
 * Guests need this path for the same reason the couple does: phone video is
 * routinely larger than the 32MB request body Cloud Run will accept, so it
 * cannot be proxied through the app at all.
 *
 * The URI returned is scoped to a single file in a single folder, so handing
 * it to the browser grants nothing else.
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Drive's own per-file ceiling is far higher; this is a sanity bound. */
const MAX_BYTES = 2 * 1024 * 1024 * 1024;

const ALLOWED_MIME =
  /^(image\/(jpeg|png|webp|heic|heif|gif)|video\/(mp4|quicktime|webm|x-matroska|3gpp))$/;

export async function POST(req: NextRequest) {
  const isAdmin = isAuthorizedAdminRequest(req);

  if (!isAdmin) {
    // One session per file, and a guest emptying a full camera roll is a
    // legitimate burst — but not an unbounded one.
    const limit = rateLimit(`upload-session:${clientIp(req)}`, 120, 60_000);
    if (!limit.allowed) {
      return NextResponse.json(
        { error: 'Uploading too fast. Give it a moment.' },
        { status: 429, headers: { 'Retry-After': String(limit.retryAfter) } }
      );
    }
  }

  if (!isDriveConfigured()) {
    return NextResponse.json(
      { error: 'The media store is not configured yet.' },
      { status: 503 }
    );
  }

  let body: {
    filename?: unknown;
    mimeType?: unknown;
    sizeBytes?: unknown;
    visibility?: unknown;
    scope?: unknown;
    caption?: unknown;
    guestId?: unknown;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Malformed request' }, { status: 400 });
  }

  const mimeType = typeof body.mimeType === 'string' ? body.mimeType.split(';')[0].trim() : '';
  if (!ALLOWED_MIME.test(mimeType)) {
    return NextResponse.json({ error: 'Only photos and videos can be uploaded' }, { status: 415 });
  }

  const sizeBytes = Number(body.sizeBytes);
  if (!Number.isFinite(sizeBytes) || sizeBytes <= 0) {
    return NextResponse.json({ error: 'Missing file size' }, { status: 400 });
  }
  if (sizeBytes > MAX_BYTES) {
    return NextResponse.json({ error: 'That file is too large' }, { status: 413 });
  }

  const visibility: MediaVisibility = body.visibility === 'private' ? 'private' : 'public';
  const scope: MediaScope = body.scope === 'event' ? 'event' : 'wedding';

  // A guest must prove they hold a real invite code before a session is minted.
  // Resolving it also gives the wall a name to credit the photo to.
  let guestId: string | null = null;
  let guestName: string | null = 'Razia & Abduraziq';

  if (!isAdmin) {
    guestId = typeof body.guestId === 'string' ? body.guestId.trim().slice(0, 120) : '';
    if (!guestId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    guestName = await resolveDisplayName(guestId).catch(() => null);
    if (!guestName) {
      // Unknown code — refuse rather than let an anonymous caller open a
      // write session against the couple's Drive.
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }
  const caption =
    typeof body.caption === 'string' && body.caption.trim()
      ? body.caption.trim().slice(0, 140)
      : null;

  const rawName = typeof body.filename === 'string' ? body.filename : '';
  const filename = `${new Date().toISOString().replace(/[:.]/g, '-')}-${sanitizeName(rawName)}`;

  try {
    const { uploadUri } = await createResumableSession({
      filename,
      mimeType,
      visibility,
      scope,
      caption,
      sizeBytes,
      guestId,
      // Credited to whoever uploaded it — the couple from the Vault, or the
      // resolved household for a guest — rather than the "A Guest" fallback.
      guestName,
    });

    return NextResponse.json({ ok: true, uploadUri });
  } catch (err) {
    console.error('[Media] resumable session failed:', err);
    return NextResponse.json({ error: 'Could not start that upload' }, { status: 502 });
  }
}

function sanitizeName(name: string): string {
  const cleaned = name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(-80);
  return cleaned || 'upload';
}
