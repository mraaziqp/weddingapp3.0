import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import { supabaseAdmin } from '@/lib/supabase';

function getDb() {
  const url = process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.POSTGRES_URL_NON_POOLING || process.env.POSTGRES_PRISMA_URL;
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
  guestId?: string;
  resolvedGuestId?: string;
  householdId?: string;
  status: string;
  dietaryRestrictions?: string;
}) {
  const { guestId, resolvedGuestId, householdId, status, dietaryRestrictions } = params;
  const rsvpStatus = toGuestRsvpStatus(status);

  // Resolve target guest / household ID dynamically if not explicitly set
  let targetResolvedGuestId = resolvedGuestId;
  let targetHouseholdId = householdId;

  if (!targetResolvedGuestId && guestId && guestId.startsWith('guest-')) {
    targetResolvedGuestId = guestId;
  }
  if (!targetHouseholdId && guestId && guestId.startsWith('household-')) {
    targetHouseholdId = guestId;
  }

  if (targetResolvedGuestId) {
    // We know exactly which guest responded — update just that row.
    const update: Record<string, string> = { rsvp_status: rsvpStatus };
    if (dietaryRestrictions) update.dietary_restrictions = dietaryRestrictions;
    const { error } = await supabaseAdmin.from('guests').update(update).eq('id', targetResolvedGuestId);
    if (error) throw error;
    return;
  }

  if (targetHouseholdId) {
    // No specific guest identified (e.g. a shared household link) — the
    // whole household's RSVP applies to everyone in it.
    const { error } = await supabaseAdmin.from('guests').update({ rsvp_status: rsvpStatus }).eq('household_id', targetHouseholdId);
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

    // Neon SQL write - wrapped in try/catch to make it completely non-blocking
    try {
      const sql = getDb();
      await ensureTable();
      await sql`
        INSERT INTO rsvp_responses (guest_id, household_id, guest_name, status, dietary_restrictions, message)
        VALUES (${guestId}, ${householdId}, ${guestName}, ${status}, ${dietaryRestrictions || null}, ${message || null})
      `;
    } catch (sqlErr) {
      console.error('[RSVP] Neon SQL insert failed (non-blocking):', sqlErr);
    }

    // Keep the real guest record in sync. This must never fail the request —
    // the audit log above already has a durable record of the response.
    try {
      await syncGuestRecord({ guestId, resolvedGuestId, householdId, status, dietaryRestrictions });
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
    // 1. Fetch any custom messages/comments from Neon (non-blocking)
    const messagesMap: Record<string, string> = {};
    try {
      const sql = getDb();
      const rsvpRows = await sql`SELECT guest_id, message FROM rsvp_responses WHERE message IS NOT NULL AND message != ''`;
      rsvpRows.forEach(row => {
        if (row.guest_id) {
          messagesMap[row.guest_id] = row.message;
        }
      });
    } catch (sqlErr) {
      console.warn('[RSVP GET] Neon query failed, message comments will be omitted:', sqlErr);
    }

    // 2. Fetch all guests who have responded from Supabase
    const { data: guests, error } = await supabaseAdmin
      .from('guests')
      .select('id, first_name, last_name, rsvp_status, dietary_restrictions, song_request, tags, updated_at')
      .neq('rsvp_status', 'Pending')
      .order('updated_at', { ascending: false });

    if (error) throw error;

    // 3. Map to RsvpResponse format expected by the client
    const responses = (guests || []).map(g => {
      const isBride = g.tags?.includes("Bride's") || g.tags?.includes("Bride's Family") || g.tags?.includes("Bride's Friends");
      
      // Try to find custom message, fallback to song request
      let message = messagesMap[g.id] || undefined;
      if (!message && g.song_request) {
        message = `🎵 Song Request: ${g.song_request}`;
      }

      return {
        id: g.id,
        guest_id: isBride ? 'guest-bride' : 'guest-groom',
        guest_name: `${g.first_name} ${g.last_name}`,
        status: g.rsvp_status === 'Confirmed' ? 'Accepted' : 'Declined',
        dietary_restrictions: g.dietary_restrictions || undefined,
        message: message,
        responded_at: g.updated_at || new Date().toISOString()
      };
    });

    return NextResponse.json({ responses, count: responses.length });
  } catch (err) {
    console.error('[RSVP] GET error:', err);
    return NextResponse.json({ responses: [], count: 0 });
  }
}
