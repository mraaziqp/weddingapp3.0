import 'server-only';
import { listMedia, isDriveConfigured } from './google-drive';
import { toWallItem, type WallItem } from './media';

/**
 * Server-component media reads.
 *
 * The Live Wall renders on the server behind a 15s revalidate window, so it
 * calls Drive directly rather than looping back through /api/media — which
 * would mean an HTTP round trip to our own host on every cache miss, and needs
 * an absolute URL that differs between local, preview and production.
 */
export async function fetchPublicWallItemsServer(limit = 60): Promise<WallItem[]> {
  if (!isDriveConfigured()) return [];
  const { items } = await listMedia({ visibility: 'public', limit });
  return items.map(toWallItem);
}
