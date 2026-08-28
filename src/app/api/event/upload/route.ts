import { NextRequest, NextResponse } from 'next/server';
import { uploadMedia, isDriveConfigured } from '@/lib/google-drive';
import { getEventSession } from '@/lib/event-access';
import { completeTask } from '@/lib/event-store';
import { findTask } from '@/lib/event-config';
import { rateLimit, clientIp } from '@/lib/rate-limit';

/**
 * Photo and voice-memo uploads for the entertainment evening.
 * ──────────────────────────────────────────────────────────
 * Separate from /api/media/upload on purpose. That route is open to anyone
 * holding an invite link and writes into the wedding folder; this one requires
 * an event session and writes into the event folder, so the two guest lists —
 * which are not the same people — can never see each other's uploads.
 *
 * The uploader's identity comes from the signed session cookie, never from the
 * form body. A guest cannot post as someone else, and cannot credit a
 * scavenger task to another player's scoreboard.
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * The client compresses to ~1600px / 0.82 JPEG before sending, which lands
 * well under this. The ceiling is here for the paths that skip compression —
 * HEIC that `createImageBitmap` refused, and voice memos.
 */
const MAX_UPLOAD_BYTES = 15 * 1024 * 1024;

const ALLOWED_IMAGE = /^image\/(jpeg|png|webp|heic|heif|gif)$/;
/** What MediaRecorder actually produces across iOS Safari and Android Chrome. */
const ALLOWED_AUDIO = /^audio\/(webm|ogg|mp4|mpeg|aac|wav|x-m4a)(;.*)?$/;

const MAX_CAPTION_LEN = 140;

export async function POST(req: NextRequest) {
  const session = await getEventSession(req);
  if (!session) {
    return NextResponse.json({ error: 'Join the event first' }, { status: 401 });
  }

  if (!isDriveConfigured()) {
    return NextResponse.json(
      { error: 'Uploads are not configured yet. Please tell the host.' },
      { status: 503 }
    );
  }

  // Generous — a guest on a roll genuinely does fire off a dozen photos in a
  // minute — but bounded, so one phone cannot fill the couple's Drive.
  const limit = rateLimit(`event-upload:${session.sub}:${clientIp(req)}`, 40, 60_000);
  if (!limit.allowed) {
    return NextResponse.json(
      { error: 'Slow down a moment — still saving your last few.' },
      { status: 429, headers: { 'Retry-After': String(limit.retryAfter) } }
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
    return NextResponse.json({ error: 'That came through empty' }, { status: 400 });
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return NextResponse.json(
      { error: 'That file is too large. Try again from the camera.' },
      { status: 413 }
    );
  }

  const isAudio = ALLOWED_AUDIO.test(file.type);
  const isImage = ALLOWED_IMAGE.test(file.type);
  if (!isAudio && !isImage) {
    return NextResponse.json(
      { error: 'Only photos and voice notes can be uploaded' },
      { status: 415 }
    );
  }

  const caption = asTrimmedString(form.get('caption'))?.slice(0, MAX_CAPTION_LEN) ?? null;

  // Only a tag that matches a real task is stored. An invented one would
  // otherwise sit on the file and, worse, be handed to the scoreboard.
  const requestedTag = asTrimmedString(form.get('questTag'));
  const questTag = requestedTag && findTask(requestedTag) ? requestedTag : null;

  try {
    const bytes = await file.arrayBuffer();

    const media = await uploadMedia({
      bytes,
      // Timestamp prefix so the folder sorts chronologically when the couple
      // open it directly in Drive rather than through the app.
      filename: `${new Date().toISOString().replace(/[:.]/g, '-')}-${sanitizeName(file.name)}`,
      mimeType: file.type,
      visibility: 'public',
      scope: 'event',
      kind: isAudio ? 'voice' : 'photo',
      guestId: session.sub,
      guestName: session.name,
      questTag,
      caption,
    });

    // The upload is the proof of completion, so the task is credited here and
    // nowhere else — there is no endpoint a guest could call to tick a task
    // off without actually taking the photo.
    let progress = null;
    if (questTag) {
      try {
        progress = await completeTask({
          guestId: session.sub,
          guestName: session.name,
          tag: questTag,
        });
      } catch (err) {
        // The photo is already safely in Drive. Losing the point is a much
        // smaller failure than telling the guest their upload failed and
        // having them shoot it again.
        console.error('[Event] task credit failed:', err);
      }
    }

    return NextResponse.json({ ok: true, media, progress }, { status: 201 });
  } catch (err) {
    console.error('[Event] upload failed:', err);
    return NextResponse.json(
      { error: 'Could not save that. Tap to try again.' },
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
  return cleaned || 'memory.jpg';
}
