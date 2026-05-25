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
import { supabase } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as { event?: string };
    const { event } = body;

    if (!event || !['view', 'opened'].includes(event)) {
      return NextResponse.json({ error: 'Invalid event' }, { status: 400 });
    }

    const { error } = await supabase.from('std_opens').insert({
      event_type: event,
      user_agent: req.headers.get('user-agent')?.slice(0, 255) ?? null,
    });

    if (error) {
      // Table may not exist yet — fail silently so guest experience is unaffected
      console.warn('[STD track] Supabase insert failed:', error.message);
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}

export async function GET() {
  try {
    const [{ count: views }, { count: opens }] = await Promise.all([
      supabase
        .from('std_opens')
        .select('*', { count: 'exact', head: true })
        .eq('event_type', 'view'),
      supabase
        .from('std_opens')
        .select('*', { count: 'exact', head: true })
        .eq('event_type', 'opened'),
    ]);

    return NextResponse.json({ views: views ?? 0, opens: opens ?? 0 });
  } catch {
    return NextResponse.json({ views: 0, opens: 0 });
  }
}
