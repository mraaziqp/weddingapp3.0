import { NextRequest, NextResponse } from 'next/server';
import { listMedia, isDriveConfigured } from '@/lib/google-drive';
import { isAuthorizedAdminRequest } from '@/lib/admin-auth';

/**
 * GET /api/media/albums — which albums exist, and how full each one is.
 *
 * Albums are a label on each file rather than a stored list, so the set of
 * albums is derived from the files themselves. That means an album cannot go
 * stale or point at nothing: empty it and it simply stops existing, which is
 * the behaviour the couple expects from something they think of as a folder.
 *
 * Public by default so guests can browse "Watna & Mendhi" without a session.
 * `?visibility=all` reports across the Vault too, and is admin-gated.
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const requested = req.nextUrl.searchParams.get('visibility') ?? 'public';
  const visibility = requested === 'all' || requested === 'private' ? requested : 'public';

  if (visibility !== 'public' && !isAuthorizedAdminRequest(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!isDriveConfigured()) {
    return NextResponse.json({ albums: [], unfiled: 0, configured: false });
  }

  try {
    // 250 covers a wedding's whole library in one call; the counts are for
    // labelling tabs, not for pagination.
    const { items } = await listMedia({
      visibility,
      limit: 250,
      includeHidden: visibility !== 'public',
    });

    const counts = new Map<string, number>();
    let unfiled = 0;
    for (const item of items) {
      if (!item.album) { unfiled++; continue; }
      counts.set(item.album, (counts.get(item.album) ?? 0) + 1);
    }

    return NextResponse.json({
      albums: [...counts.entries()]
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => a.name.localeCompare(b.name)),
      unfiled,
      total: items.length,
      configured: true,
    });
  } catch (err) {
    console.error('[Media] album listing failed:', err);
    return NextResponse.json({ error: 'Could not load albums' }, { status: 502 });
  }
}
