/**
 * Client-side media reads.
 *
 * The store behind these is Google Drive, reached through /api/media so the
 * OAuth refresh token stays on the server. Server components must not import
 * this — they should call `fetchPublicWallItemsServer` from ./media-server,
 * which hits Drive directly and skips the extra HTTP hop.
 */

/** Display shape shared by the guest-photo walls (live wall, venue screen, gallery feed). */
export type WallItem = {
  id: string;
  imageUrl: string;
  description: string;
  imageHint?: string;
  guestName: string;
  likes: number;
  /** Intrinsic pixel size when Drive reported it — lets the masonry grid
   *  reserve the right aspect ratio instead of assuming every photo is square. */
  width?: number;
  height?: number;
  /** 'photo' | 'video' | 'voice'. The wall renders video with a player. */
  mediaType?: string;
  visibility?: string;
  questTag?: string;
  createdAt?: string;
  /** A note attached to the upload — the guest's own, or the couple's edit. */
  caption?: string;
  /** Soft-deleted by an admin: off the wall, still recoverable. */
  hidden?: boolean;
};

/** True when this item should render in a <video> rather than an <img>. */
export function isVideoItem(item: WallItem): boolean {
  return item.mediaType === 'video';
}

/** Raw item shape returned by /api/media — mirrors DriveMedia. */
type ApiMediaItem = {
  id: string;
  url: string;
  guestName: string | null;
  questTag: string | null;
  width: number | null;
  height: number | null;
  kind?: string;
  visibility?: string;
  createdAt?: string;
  caption?: string | null;
  hidden?: boolean;
};

export function toWallItem(m: ApiMediaItem): WallItem {
  return {
    id: m.id,
    imageUrl: m.url,
    description:
      m.caption?.trim() ||
      (m.questTag ? `${m.questTag} — a cherished memory` : 'A cherished memory'),
    imageHint: m.questTag ?? undefined,
    guestName: m.guestName ?? 'A Guest',
    likes: 0,
    width: m.width ?? undefined,
    height: m.height ?? undefined,
    mediaType: m.kind ?? 'photo',
    visibility: m.visibility,
    questTag: m.questTag ?? undefined,
    createdAt: m.createdAt,
    caption: m.caption ?? undefined,
    hidden: m.hidden ?? false,
  };
}

/** Latest public guest photos and videos, newest first. Safe from the browser. */
export async function fetchPublicWallItems(limit = 60): Promise<WallItem[]> {
  const res = await fetch(`/api/media?visibility=public&limit=${limit}`, { cache: 'no-store' });
  if (!res.ok) throw new Error(`Could not load the wall (${res.status})`);
  const body = (await res.json()) as { items?: ApiMediaItem[] };
  return (body.items ?? []).map(toWallItem);
}

/**
 * Removes a photo from the wall. Admin only.
 *
 * Authorisation is the admin session cookie the browser already holds — the
 * key itself is never sent from client code and never appears in the bundle.
 * The route moves the file to the Drive trash rather than destroying it, so a
 * mistaken tap during the reception is recoverable for 30 days.
 */
export type MediaEdit = {
  caption?: string | null;
  guestName?: string | null;
  questTag?: string | null;
  visibility?: 'public' | 'private';
  hidden?: boolean;
};

/**
 * Edits one item on the wall. Admin only, via the same session cookie as
 * `deleteMediaItem`. Resolves to an error message on failure so the caller
 * can show the couple what Drive objected to rather than a generic failure.
 */
export async function updateMediaItem(id: string, edit: MediaEdit): Promise<string | null> {
  try {
    const res = await fetch('/api/media', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, ...edit }),
    });
    if (res.ok) return null;
    const data = await res.json().catch(() => ({}));
    return data.error ?? `Update failed (${res.status})`;
  } catch {
    return 'Could not reach the server. Check your connection.';
  }
}

export async function deleteMediaItem(id: string): Promise<boolean> {
  try {
    const res = await fetch(`/api/media?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
    if (!res.ok) return false;
    const data = await res.json().catch(() => ({}));
    return data.ok !== false;
  } catch (err) {
    console.error('[deleteMediaItem] error:', err);
    return false;
  }
}
