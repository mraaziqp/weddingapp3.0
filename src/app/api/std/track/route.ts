/**
 * /api/std/track
 * ──────────────────────────────────────────────────────────────────────────────
 * Tracks save-the-date opens for admin analytics.
 *
 * Required Supabase table — run this ONCE in your Supabase SQL editor:
 *
 *   create table if not exists std_opens (
 *     id          uuid        default gen_random_uuid() primary key,
 *     event_type  text        not null,   -- 'view' | 'opened'
 *     user_agent  text,
 *     created_at  timestamptz default now()
 *   );
 *
 * POST  /api/std/track  { event: 'view' | 'opened' }
 * GET   /api/std/track  → { views: number, opens: number }
 */

import { NextRequest, NextResponse } from 'next/server';
import { trackStdOpen, fetchStdCounts } from '@/lib/firestore-server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as { event?: string };
    const { event } = body;

    // Compared against the literals directly so TypeScript narrows `event` to
    // the union the store expects — Array.includes() only returns a boolean.
    if (event !== 'view' && event !== 'opened') {
      return NextResponse.json({ error: 'Invalid event' }, { status: 400 });
    }

    try {
      await trackStdOpen(event, req.headers.get('user-agent')?.slice(0, 255) ?? null);
    } catch (writeErr) {
      // Analytics must never break the guest experience.
      console.warn('[STD track] write failed:', writeErr);
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}

export async function GET() {
  try {
    return NextResponse.json(await fetchStdCounts());
  } catch {
    return NextResponse.json({ views: 0, opens: 0 });
  }
}
