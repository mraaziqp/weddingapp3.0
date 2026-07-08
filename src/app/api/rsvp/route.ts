import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import { supabaseAdmin } from '@/lib/supabase';

function getDb() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL not set');
  return neon(url);
}

// The invitation form submits Accepted/Declined; the guests table (shared
// with the admin Guest Ledger and seating chart) uses these instead.
function toGuestRsvpStatus(status: string): 'Confirmed' | 'Regret' {
  return status === 'Accepted' ? 'Confirmed' : 'Regret';
}

/**
 * Sync the RSVP straight onto the real guest row(s), so the admin Guest
 * Ledger, seating chart, and dietary snapshot reflect it immediately —
 * not just the rsvp_responses audit log below.
 */
async function syncGuestRecord(params: {
  resolvedGuestId?: string;
  householdId?: string;
  status: string;
  dietaryRestrictions?: string;
}) {
  const { resolvedGuestId, householdId, status, dietaryRestrictions } = params;
  const rsvpStatus = toGuestRsvpStatus(status);

  if (resolvedGuestId) {
    // We know exactly which guest responded — update just that row.
    const update: Record<string, string> = { rsvp_status: rsvpStatus };
    if (dietaryRestrictions) update.dietary_restrictions = dietaryRestrictions;
    const { error } = await supabaseAdmin.from('guests').update(update).eq('id', resolvedGuestId);
    if (error) throw error;
    return;
  }

  if (householdId) {
    // No specific guest identified (e.g. a shared household link) — the
    // whole household's RSVP applies to everyone in it.
    const { error } = await supabaseAdmin.from('guests').update({ rsvp_status: rsvpStatus }).eq('household_id', householdId);
    if (error) throw error;
  }
}

async function ensureTable() {
  const sql = getDb();
  await sql`
    CREATE TABLE IF NOT EXISTS rsvp_responses (
      id SERIAL PRIMARY KEY,
      guest_id TEXT,
      household_id TEXT,
      guest_name TEXT,
      status TEXT,
      dietary_restrictions TEXT,
      message TEXT,
      responded_at TIMESTAMP DEFAULT NOW()
    )
  `;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { guestId, householdId, resolvedGuestId, guestName, status, dietaryRestrictions, message } = body;

    if (!guestId || !status) {
      return NextResponse.json({ ok: false, error: 'Missing required fields' }, { status: 400 });
    }

    const sql = getDb();
    await ensureTable();

    await sql`
      INSERT INTO rsvp_responses (guest_id, household_id, guest_name, status, dietary_restrictions, message)
      VALUES (${guestId}, ${householdId}, ${guestName}, ${status}, ${dietaryRestrictions || null}, ${message || null})
    `;

    // Keep the real guest record in sync. This must never fail the request —
    // the audit log above already has a durable record of the response.
    try {
      await syncGuestRecord({ resolvedGuestId, householdId, status, dietaryRestrictions });
    } catch (syncErr) {
      console.error('[RSVP] Guest table sync failed:', syncErr);
    }

    return NextResponse.json({
      ok: true,
      message: `RSVP recorded: ${guestName} - ${status}`,
    });
  } catch (err) {
    console.error('[RSVP] POST error:', err);
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}

export async function GET() {
  try {
    const sql = getDb();
    await ensureTable();
    const responses = await sql`SELECT * FROM rsvp_responses ORDER BY responded_at DESC LIMIT 100`;

    return NextResponse.json({ responses, count: responses.length });
  } catch (err) {
    console.error('[RSVP] GET error:', err);
    return NextResponse.json({ responses: [], count: 0 });
  }
}
