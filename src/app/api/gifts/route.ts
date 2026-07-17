import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { isAuthorizedAdminRequest } from '@/lib/admin-auth';

/**
 * The `gifts` table already exists in Supabase (created manually, not by
 * this app). Anonymous claiming needs two columns that may not be there
 * yet — run this once in the Supabase SQL editor if PATCH below 500s with
 * a missing-column error:
 *
 *   alter table gifts add column if not exists is_purchased boolean not null default false;
 *   alter table gifts add column if not exists purchased_at timestamptz;
 */

/**
 * POST /api/gifts — admin-only, adds a new registry item.
 */
export async function POST(req: NextRequest) {
  if (!isAuthorizedAdminRequest(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { name, price, imageUrl, storeUrl } = body;

    if (!name || typeof name !== 'string' || !price || typeof price !== 'number' || price <= 0) {
      return NextResponse.json({ error: 'Name and a positive price are required' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from('gifts')
      .insert({
        name,
        price,
        image_url: typeof imageUrl === 'string' ? imageUrl : '',
        store_url: typeof storeUrl === 'string' ? storeUrl : '',
        is_crowdfund: false,
        funded_amount: 0,
        is_purchased: false,
      })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ ok: true, gift: data });
  } catch (err) {
    console.error('[Gifts] POST error:', err);
    return NextResponse.json({ error: 'Could not add gift' }, { status: 500 });
  }
}

/**
 * DELETE /api/gifts?id=xxx — admin-only, removes a registry item.
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
    const { error } = await supabaseAdmin.from('gifts').delete().eq('id', id);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[Gifts] DELETE error:', err);
    return NextResponse.json({ error: 'Could not delete gift' }, { status: 500 });
  }
}

/**
 * PATCH /api/gifts — public, no auth: any guest can anonymously mark an
 * item bought so nobody else duplicates the gift. No guest identity is
 * ever recorded, only that *someone* claimed it and when.
 *
 * The update's WHERE clause only matches rows still unclaimed
 * (is_purchased = false), so if two guests tap "claim" on the same item
 * at nearly the same moment, only the first write actually changes a
 * row — the second gets back zero affected rows and the client shows
 * "someone just claimed this" instead of silently double-booking it.
 */
export async function PATCH(req: NextRequest) {
  try {
    const { id } = await req.json();
    if (!id || typeof id !== 'string') {
      return NextResponse.json({ error: 'Missing id' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from('gifts')
      .update({ is_purchased: true, purchased_at: new Date().toISOString() })
      .eq('id', id)
      .eq('is_purchased', false)
      .select()
      .maybeSingle();

    if (error) throw error;

    if (!data) {
      // Either it was already claimed by someone else, or the id doesn't exist.
      return NextResponse.json({ ok: false, alreadyClaimed: true }, { status: 409 });
    }

    return NextResponse.json({ ok: true, gift: data });
  } catch (err) {
    console.error('[Gifts] PATCH error:', err);
    return NextResponse.json({ error: 'Could not update gift' }, { status: 500 });
  }
}
