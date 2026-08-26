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
};

/** Raw item shape returned by /api/media — mirrors DriveMedia. */
type ApiMediaItem = {
  id: string;
  url: string;
  guestName: string | null;
  questTag: string | null;
  width: number | null;
  height: number | null;
};

export function toWallItem(m: ApiMediaItem): WallItem {
  return {
    id: m.id,
    imageUrl: m.url,
    description: m.questTag ? `${m.questTag} — a cherished memory` : 'A cherished memory',
    imageHint: m.questTag ?? undefined,
    guestName: m.guestName ?? 'A Guest',
    likes: 0,
    width: m.width ?? undefined,
    height: m.height ?? undefined,
  };
}

/** Latest public guest photos, newest first. Safe to call from the browser. */
export async function fetchPublicWallItems(limit = 60): Promise<WallItem[]> {
  const res = await fetch(`/api/media?visibility=public&limit=${limit}`, { cache: 'no-store' });
  if (!res.ok) throw new Error(`Could not load the wall (${res.status})`);
  const body = (await res.json()) as { items?: ApiMediaItem[] };
  return (body.items ?? []).map(toWallItem);
}
