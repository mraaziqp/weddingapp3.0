import { NextRequest, NextResponse } from 'next/server';
import { listMedia, isDriveConfigured } from '@/lib/google-drive';
import { getEventSession } from '@/lib/event-access';
import { fetchEventNotes, fetchReactions } from '@/lib/event-store';

/**
 * The memory wall's single read.
 * ─────────────────────────────
 * Photos, voice memos, written notes and reaction counts come back together in
 * one response. Every phone in the room polls this, so the number that matters
 * is round trips per poll: three endpoints would be three connections per
 * guest per interval on venue wifi, for one screen.
 *
 * Drive's own list cache (8s, in google-drive.ts) sits behind this, so a burst
 * of simultaneous polls collapses onto a single `files.list` call rather than
 * one per guest — which is what keeps the Drive project inside its rate limit
 * on the one night it cannot fail.
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

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

export async function GET(req: NextRequest) {
  const session = await getEventSession(req);
  if (!session) {
    return NextResponse.json({ error: 'Join the event first' }, { status: 401 });
  }

  const isAdmin = session.role === 'ADMIN';
  const limitParam = Number(req.nextUrl.searchParams.get('limit'));
  const limit =
    Number.isFinite(limitParam) && limitParam > 0 ? Math.min(limitParam, 120) : 60;

  // Admins see hidden items too, greyed out, so a hide can be reversed. For
  // everyone else they simply do not exist.
  const includeHidden = isAdmin;

  try {
    const [media, notes, reactions] = await Promise.all([
      isDriveConfigured()
        ? listMedia({ scope: 'event', visibility: 'public', limit, includeHidden })
        : Promise.resolve({ items: [], nextPageToken: null }),
      fetchEventNotes(limit, includeHidden),
      fetchReactions(session.sub),
    ]);

    const mediaItems: FeedItem[] = media.items.map(m => ({
      id: m.id,
      type: m.kind === 'voice' ? 'voice' : 'photo',
      url: m.url,
      caption: m.caption,
      message: null,
      guestId: m.guestId,
      guestName: m.guestName ?? 'A guest',
      questTag: m.questTag,
      createdAt: m.createdAt,
      width: m.width,
      height: m.height,
      hidden: m.hidden,
    }));

    const noteItems: FeedItem[] = notes.map(n => ({
      id: n.id,
      type: 'note',
      url: null,
      caption: null,
      message: n.message,
      guestId: n.guestId,
      guestName: n.guestName,
      questTag: null,
      createdAt: n.createdAt,
      width: null,
      height: null,
      hidden: n.hidden,
    }));

    // One newest-first stream. Items with no timestamp sort last rather than
    // jumping to the top, which is what an empty string would do.
    const items = [...mediaItems, ...noteItems]
      .sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''))
      .slice(0, limit);

    return NextResponse.json({
      items,
      reactions: reactions.counts,
      myReactions: reactions.mine,
      me: { sub: session.sub, name: session.name, role: session.role },
      configured: isDriveConfigured(),
    });
  } catch (err) {
    console.error('[Event] feed failed:', err);
    return NextResponse.json({ error: 'Could not load the memory wall' }, { status: 502 });
  }
}
