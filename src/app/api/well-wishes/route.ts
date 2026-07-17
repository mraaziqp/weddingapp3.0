import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { isAuthorizedAdminRequest } from '@/lib/admin-auth';

/**
 * A guestbook-style wall guests can post to any time between RSVP-ing and
 * the wedding day — not just at the venue — so there's a reason to come
 * back and see what's new before then. Needs a table in Supabase, run
 * once in the SQL editor:
 *
 *   create table if not exists well_wishes (
 *     id uuid primary key default gen_random_uuid(),
 *     name text,
 *     message text not null,
 *     created_at timestamptz not null default now()
 *   );
 */

const MAX_NAME_LEN = 60;
const MAX_MESSAGE_LEN = 500;

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from('well_wishes')
      .select('id, name, message, created_at')
      .order('created_at', { ascending: false })
      .limit(200);

    if (error) throw error;
    return NextResponse.json({ wishes: data ?? [] });
  } catch (err) {
    console.error('[Well Wishes] GET error:', err);
    return NextResponse.json({ wishes: [] });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const name = typeof body.name === 'string' ? body.name.trim().slice(0, MAX_NAME_LEN) : '';
    const message = typeof body.message === 'string' ? body.message.trim().slice(0, MAX_MESSAGE_LEN) : '';

    if (!message) {
      return NextResponse.json({ error: 'A message is required' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from('well_wishes')
      .insert({ name: name || null, message })
      .select('id, name, message, created_at')
      .single();

    if (error) throw error;
    return NextResponse.json({ ok: true, wish: data });
  } catch (err) {
    console.error('[Well Wishes] POST error:', err);
    return NextResponse.json({ error: 'Could not post your message' }, { status: 500 });
  }
}

/**
 * DELETE /api/well-wishes?id=xxx — admin-only moderation removal.
 */
export async function DELETE(req: NextRequest) {
  if (!isAuthorizedAdminRequest(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const id = req.nextUrl.searchParams.get('id');
  if (!id) {
    return NextResponse.json({ error: 'Missing id' }, { status: 400 });
  }

  try {
    const { error } = await supabaseAdmin.from('well_wishes').delete().eq('id', id);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[Well Wishes] DELETE error:', err);
    return NextResponse.json({ error: 'Could not delete' }, { status: 500 });
  }
}
