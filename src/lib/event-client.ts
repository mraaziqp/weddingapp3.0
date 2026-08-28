/**
 * Browser-side calls into the event hub's API.
 *
 * Mirrors the split in `lib/media.ts` vs `lib/media-server.ts`: nothing here
 * touches Drive or Firestore directly, so no server module — and no
 * credential — is ever pulled into the client bundle.
 */

import { compressImageFile, withTimeout } from './image-utils';
import type { EventRole } from './event-access';
import type { PublicTriviaQuestion } from './event-config';

export type FeedItem = {
  id: string;
  type: 'photo' | 'voice' | 'note';
  url: string | null;
  caption: string | null;
  message: string | null;
  guestId: string | null;
  guestName: string;
  questTag: string | null;
  createdAt: string | null;
  width: number | null;
  height: number | null;
  hidden: boolean;
};

export type FeedResponse = {
  items: FeedItem[];
  reactions: Record<string, Partial<Record<string, number>>>;
  myReactions: Record<string, string>;
  me: { sub: string; name: string; role: EventRole };
  configured: boolean;
};

export type EventProgress = {
  guestId: string;
  guestName: string;
  tasks: Record<string, string>;
  trivia: Record<string, boolean>;
  points: number;
};

export type LeaderboardRow = {
  guestId: string;
  guestName: string;
  points: number;
  tasksDone: number;
};

export type PlayResponse = {
  progress: EventProgress;
  leaderboard: LeaderboardRow[];
  questions: PublicTriviaQuestion[];
};

async function json<T>(res: Response): Promise<T> {
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error((body as { error?: string }).error ?? `Request failed (${res.status})`);
  }
  return body as T;
}

// ── Session ───────────────────────────────────────────────────────────────

export async function joinWithPin(pin: string, name: string) {
  return json<{ ok: true; session: { sub: string; name: string; role: EventRole } }>(
    await fetch('/api/event/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin, name }),
    })
  );
}

export async function joinWithToken(token: string, name?: string) {
  return json<{ ok: true; session: { sub: string; name: string; role: EventRole } }>(
    await fetch('/api/event/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, name }),
    })
  );
}

export async function leaveEvent() {
  await fetch('/api/event/session', { method: 'DELETE' });
}

// ── Feed ──────────────────────────────────────────────────────────────────

export async function fetchFeed(limit = 60): Promise<FeedResponse> {
  return json<FeedResponse>(
    await fetch(`/api/event/feed?limit=${limit}`, { cache: 'no-store' })
  );
}

// ── Uploads ───────────────────────────────────────────────────────────────

/** Venue wifi is the constraint, not the server — fail loudly rather than hang. */
const UPLOAD_TIMEOUT_MS = 45_000;

export async function uploadEventPhoto(input: {
  file: File;
  caption?: string;
  questTag?: string | null;
  onProgress?: (stage: 'compressing' | 'uploading') => void;
}): Promise<{ progress: EventProgress | null }> {
  input.onProgress?.('compressing');

  // Compress before the request, not after. A phone photo is 8-20MB straight
  // off the camera roll and the wall never shows more than ~1600px, so this is
  // the single biggest thing keeping the venue's uplink usable when fifty
  // people upload at once.
  const file = await compressImageFile(input.file, { maxDimension: 1600, quality: 0.82 });

  input.onProgress?.('uploading');

  const form = new FormData();
  form.append('file', file);
  if (input.caption) form.append('caption', input.caption);
  if (input.questTag) form.append('questTag', input.questTag);

  const res = await withTimeout(
    fetch('/api/event/upload', { method: 'POST', body: form }),
    UPLOAD_TIMEOUT_MS
  );

  return json<{ progress: EventProgress | null }>(res);
}

export async function uploadVoiceMemo(blob: Blob, caption?: string): Promise<void> {
  const form = new FormData();
  const extension = blob.type.includes('mp4') ? 'm4a' : 'webm';
  form.append('file', new File([blob], `voice-note.${extension}`, { type: blob.type }));
  if (caption) form.append('caption', caption);

  const res = await withTimeout(
    fetch('/api/event/upload', { method: 'POST', body: form }),
    UPLOAD_TIMEOUT_MS
  );
  await json(res);
}

// ── Notes & reactions ─────────────────────────────────────────────────────

export async function postNote(message: string) {
  return json<{ ok: true }>(
    await fetch('/api/event/memories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message }),
    })
  );
}

export async function react(targetId: string, emoji: string | null) {
  return json<{ ok: true }>(
    await fetch('/api/event/reactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetId, emoji }),
    })
  );
}

// ── Games ─────────────────────────────────────────────────────────────────

export async function fetchPlayState(): Promise<PlayResponse> {
  return json<PlayResponse>(await fetch('/api/event/play', { cache: 'no-store' }));
}

export async function answerTrivia(questionId: string, answerIndex: number) {
  return json<{
    correct: boolean;
    answerIndex: number;
    reveal: string;
    progress: EventProgress;
  }>(
    await fetch('/api/event/play', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ questionId, answerIndex }),
    })
  );
}

// ── Moderation (admins only; the API enforces it) ─────────────────────────

export async function moderateItem(input: {
  id: string;
  type: FeedItem['type'];
  hidden: boolean;
}) {
  return json<{ ok: true; hidden: boolean }>(
    await fetch('/api/event/moderate', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    })
  );
}
