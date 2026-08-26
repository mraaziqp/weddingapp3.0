import { NextRequest, NextResponse } from 'next/server';
import {
  setGuestRsvp,
  setHouseholdRsvp,
  fetchGuestRows,
  recordRsvpResponse,
  fetchRsvpMessages,
} from '@/lib/firestore-server';
import { isAuthorizedAdminRequest } from '@/lib/admin-auth';
import { rateLimit, clientIp } from '@/lib/rate-limit';

// The invitation form submits Accepted/Declined; the guests table (shared
// with the admin Guest Ledger and seating chart) uses these instead.
function toGuestRsvpStatus(status: RsvpStatus): 'Confirmed' | 'Regret' {
  return status === 'Accepted' ? 'Confirmed' : 'Regret';
}

type RsvpStatus = 'Accepted' | 'Declined';

/**
 * Only these two values may reach the database.
 *
 * The mapping above is `status === 'Accepted' ? Confirmed : Regret`, so
 * anything unrecognised — a casing slip like "accepted", a client sending
 * "confirmed", a truncated field — silently recorded the guest as *not
 * coming*. That is the worst possible direction for this to fail, so an
 * unknown status is now rejected outright rather than quietly downgraded.
 */
function parseStatus(value: unknown): RsvpStatus | null {
  if (value === 'Accepted' || value === 'Declined') return value;
  return null;
}

/** Free-text fields are guest-supplied and land in the database; bound them. */
const MAX_NAME_LEN = 120;
const MAX_DIETARY_LEN = 500;
const MAX_MESSAGE_LEN = 1000;
const MAX_ID_LEN = 120;

function clean(value: unknown, maxLength: number): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, maxLength) : undefined;
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
  status: RsvpStatus;
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
    await setGuestRsvp(targetResolvedGuestId, rsvpStatus, dietaryRestrictions);
    return;
  }

  if (targetHouseholdId) {
    // No specific guest identified (e.g. a shared household link) — the
    // whole household's RSVP applies to everyone in it.
    await setHouseholdRsvp(targetHouseholdId, rsvpStatus);
  }
}

export async function POST(req: NextRequest) {
  // An RSVP is an unauthenticated write that flips a real guest's attendance,
  // and household ids are millisecond timestamps — guessable enough to
  // enumerate. This won't stop a determined attacker who already knows an id,
  // but it does stop someone walking the id space and mass-setting Regret.
  const limit = rateLimit(`rsvp:${clientIp(req)}`, 20, 60_000);
  if (!limit.allowed) {
    return NextResponse.json(
      { ok: false, error: 'Too many submissions. Please wait a moment.' },
      { status: 429, headers: { 'Retry-After': String(limit.retryAfter) } }
    );
  }

  try {
    const body = await req.json();

    const guestId = clean(body.guestId, MAX_ID_LEN);
    const householdId = clean(body.householdId, MAX_ID_LEN);
    const resolvedGuestId = clean(body.resolvedGuestId, MAX_ID_LEN);
    const guestName = clean(body.guestName, MAX_NAME_LEN);
    const dietaryRestrictions = clean(body.dietaryRestrictions, MAX_DIETARY_LEN);
    const message = clean(body.message, MAX_MESSAGE_LEN);
    const status = parseStatus(body.status);

    if (!guestId) {
      return NextResponse.json({ ok: false, error: 'Missing required fields' }, { status: 400 });
    }
    if (!status) {
      return NextResponse.json(
        { ok: false, error: 'Status must be "Accepted" or "Declined".' },
        { status: 400 }
      );
    }

    // Audit log write — non-blocking, so a failure here never costs the guest
    // their RSVP. The guest record sync below is the one that matters.
    try {
      await recordRsvpResponse({
        guestId,
        householdId,
        guestName,
        status,
        dietaryRestrictions,
        message,
      });
    } catch (logErr) {
      console.error('[RSVP] audit log write failed (non-blocking):', logErr);
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
    // Log the detail, return a generic message — String(err) here handed the
    // caller raw database/driver errors, which is free reconnaissance.
    console.error('[RSVP] POST error:', err);
    return NextResponse.json(
      { ok: false, error: 'Could not record your RSVP. Please try again.' },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  // This returns every responded guest's name and dietary/health info —
  // admin analytics data, not something a guest link should ever expose.
  if (!isAuthorizedAdminRequest(req)) {
    return NextResponse.json({ responses: [], count: 0 }, { status: 401 });
  }

  try {
    // 1. Guest comments from the audit log (non-blocking)
    let messages: { byGuest: Record<string, string>; byHousehold: Record<string, string> } = {
      byGuest: {},
      byHousehold: {},
    };
    try {
      messages = await fetchRsvpMessages();
    } catch (logErr) {
      console.warn('[RSVP GET] message lookup failed, comments omitted:', logErr);
    }

    // 2. Fetch all guests from Firestore
    const guests = await fetchGuestRows();

    // 3. Map to RsvpResponse format expected by the client
    const responses = guests.map(g => {
      const isBride = g.tags?.includes("Bride's") || g.tags?.includes("Bride's Family") || g.tags?.includes("Bride's Friends");
      
      // A message may be filed under this guest, or under their household
      // when it came from a shared invite link.
      let message = messages.byGuest[g.id] || messages.byHousehold[g.household_id] || undefined;
      if (!message && g.song_request) {
        message = `🎵 Song Request: ${g.song_request}`;
      }

      let status = 'Pending';
      if (g.rsvp_status === 'Confirmed') status = 'Accepted';
      else if (g.rsvp_status === 'Regret') status = 'Declined';

      return {
        id: g.id,
        guest_id: isBride ? 'guest-bride' : 'guest-groom',
        guest_name: `${g.first_name || ''} ${g.last_name || ''}`.trim(),
        status,
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
