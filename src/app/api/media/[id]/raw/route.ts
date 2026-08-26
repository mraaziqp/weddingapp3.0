import { NextRequest, NextResponse } from 'next/server';
import { getMediaStream, isDriveConfigured } from '@/lib/google-drive';

/**
 * Same-origin image proxy for a Drive-hosted photo.
 *
 * Drive's own download links need an OAuth header and its `thumbnailLink`
 * URLs expire after a few hours, so neither can be handed to an <img> tag.
 * Streaming through here keeps the photos on stable, cacheable, same-origin
 * URLs — which also means next/image needs no remotePatterns entry for Drive.
 *
 * Drive file ids are immutable and content never changes under one, so these
 * responses are safe to cache hard.
 */

export const runtime = 'nodejs';

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;

  if (!isDriveConfigured()) {
    return NextResponse.json({ error: 'Media store not configured' }, { status: 503 });
  }
  // Drive ids are opaque but always URL-safe base64-ish; reject anything else
  // rather than forwarding junk to the API.
  if (!/^[A-Za-z0-9_-]{10,200}$/.test(id)) {
    return NextResponse.json({ error: 'Bad id' }, { status: 400 });
  }

  try {
    const file = await getMediaStream(id);
    if (!file) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const headers = new Headers({
      'Content-Type': file.mimeType,
      'Cache-Control': 'public, max-age=31536000, immutable',
      'X-Content-Type-Options': 'nosniff',
      // Photos are shown inline on the wall, never offered as a download here.
      'Content-Disposition': 'inline',
    });
    if (file.size) headers.set('Content-Length', file.size);

    return new NextResponse(file.body, { status: 200, headers });
  } catch (err) {
    console.error(`[Media] raw fetch failed for ${id}:`, err);
    return NextResponse.json({ error: 'Could not load that photo' }, { status: 502 });
  }
}
