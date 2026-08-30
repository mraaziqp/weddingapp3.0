import { NextRequest, NextResponse } from 'next/server';
import { uploadMedia, isDriveConfigured, type MediaVisibility } from '@/lib/google-drive';
import { resolveDisplayName } from '@/lib/firestore-server';

/**
 * Guest photo upload — the only write path into the media store.
 *
 * Photos used to go straight from the guest's browser to Supabase Storage with
 * the anon key. They now go through here so the Google Drive refresh token
 * never leaves the server. The browser sends multipart form-data; we hand the
 * bytes to Drive with the guest/visibility/quest metadata attached.
 */

export const runtime = 'nodejs';
// Guests upload at the venue in real time — nothing here may be cached.
export const dynamic = 'force-dynamic';

/**
 * Client-side compression targets ~1600px/0.82 JPEG, well under this.
 *
 * Deliberately not raised to accommodate video. The platform caps a request
 * body at 32MB (Firebase App Hosting is Cloud Run), and a clip large enough to
 * strain this limit should be going straight to Drive through a resumable
 * session anyway — see /api/media/upload-session. Video that fits is welcome
 * here; video that doesn't has a better route than a bigger ceiling.
 */
const MAX_UPLOAD_BYTES = 15 * 1024 * 1024;

const ALLOWED_MIME =
  /^(image\/(jpeg|png|webp|heic|heif|gif)|video\/(mp4|quicktime|webm|x-matroska|3gpp))$/;

export async function POST(req: NextRequest) {
  if (!isDriveConfigured()) {
    return NextResponse.json(
      { error: 'Photo uploads are not configured yet. Please tell the couple.' },
      { status: 503 }
    );
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: 'Malformed upload' }, { status: 400 });
  }

  const file = form.get('file');
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'No file attached' }, { status: 400 });
  }
  if (file.size === 0) {
    return NextResponse.json({ error: 'That photo came through empty' }, { status: 400 });
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return NextResponse.json(
      { error: 'That photo is too large. Try again from the camera.' },
      { status: 413 }
    );
  }
  if (!ALLOWED_MIME.test(file.type)) {
    return NextResponse.json(
      { error: 'Only photos and videos can be uploaded' },
      { status: 415 }
    );
  }

  const visibility: MediaVisibility = form.get('visibility') === 'private' ? 'private' : 'public';
  const guestId = asTrimmedString(form.get('guestId'));
  const questTag = asTrimmedString(form.get('questTag'));

  try {
    const bytes = await file.arrayBuffer();

    const media = await uploadMedia({
      bytes,
      // Prefix with the timestamp so the Drive folder sorts chronologically
      // when the couple opens it directly in Drive, not just through the app.
      filename: `${new Date().toISOString().replace(/[:.]/g, '-')}-${sanitizeName(file.name)}`,
      mimeType: file.type,
      visibility,
      guestId,
      guestName: await resolveGuestName(guestId),
      questTag,
    });

    return NextResponse.json({ ok: true, media }, { status: 201 });
  } catch (err) {
    console.error('[Media] upload failed:', err);
    return NextResponse.json(
      { error: 'Could not save your photo. Tap "Try Again".' },
      { status: 502 }
    );
  }
}

function asTrimmedString(value: FormDataEntryValue | null): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

function sanitizeName(name: string): string {
  const cleaned = name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(-80);
  return cleaned || 'photo.jpg';
}

/**
 * Looks up a real name so the Live Wall can credit the photo.
 *
 * The wall previously showed a hardcoded "A Guest" under every picture because
 * nothing ever resolved the id. Resolved once here at upload time and frozen
 * into the Drive file's metadata, so rendering the wall stays a single Drive
 * call with no per-photo lookups.
 *
 * The id arriving here is whatever was in the invite URL, and those carry the
 * *household* ("household-123") or its QR code ("WEDU-HH-123") — not a guest
 * row id — so all three shapes have to be tried or every photo would fall back
 * to "A Guest".
 */
async function resolveGuestName(id: string | null): Promise<string | null> {
  if (!id) return null;
  try {
    return await resolveDisplayName(id);
  } catch {
    // A name is a nicety; never fail an upload over it.
    return null;
  }
}
