import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { isAuthorizedAdminRequest } from '@/lib/admin-auth';

/**
 * Records door check-ins for Bouncer Mode.
 *
 * Scanning used to be display-only — it showed "Welcome!" and fired confetti
 * but never wrote anything, so guests.checked_in_at stayed null and the
 * dashboard's check-in count was permanently 0.
 *
 * middleware.ts only gates admin *pages* (its matcher lists page paths, not
 * /api/*), so this route has to check admin auth itself.
 */
export async function POST(req: NextRequest) {
  if (!isAuthorizedAdminRequest(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { householdId } = await req.json();
    if (!householdId || typeof householdId !== 'string') {
      return NextResponse.json({ error: 'Missing householdId' }, { status: 400 });
    }

    const { data: existing, error: readErr } = await supabaseAdmin
      .from('guests')
      .select('id, first_name, last_name, checked_in_at')
      .eq('household_id', householdId);
    if (readErr) throw readErr;

    if (!existing || existing.length === 0) {
      return NextResponse.json({ error: 'No guests found for that household' }, { status: 404 });
    }

    const alreadyIn = existing.filter((g) => g.checked_in_at);

    // Only stamp the ones not already through the door, so re-scanning a QR
    // never overwrites the original arrival time — and so the response can
    // tell the bouncer honestly that this code has been used before.
    let newlyCheckedIn = 0;
    if (alreadyIn.length < existing.length) {
      const { data: updated, error: updErr } = await supabaseAdmin
        .from('guests')
        .update({ checked_in_at: new Date().toISOString() })
        .eq('household_id', householdId)
        .is('checked_in_at', null)
        .select('id');
      if (updErr) throw updErr;
      newlyCheckedIn = updated?.length ?? 0;
    }

    return NextResponse.json({
      ok: true,
      firstScan: alreadyIn.length === 0,
      newlyCheckedIn,
      alreadyCheckedIn: alreadyIn.length,
      total: existing.length,
      previouslySeenAt: alreadyIn[0]?.checked_in_at ?? null,
    });
  } catch (err) {
    console.error('[Check-in] POST error:', err);
    return NextResponse.json({ error: 'Could not record check-in' }, { status: 500 });
  }
}
