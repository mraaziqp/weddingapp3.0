import { NextRequest, NextResponse } from 'next/server';
import { checkInHousehold } from '@/lib/firestore-server';
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

    // Only stamps guests not already through the door, so re-scanning a QR
    // never overwrites the original arrival time — and so the response can
    // tell the bouncer honestly that this code has been used before.
    const result = await checkInHousehold(householdId);

    if (!result) {
      return NextResponse.json({ error: 'No guests found for that household' }, { status: 404 });
    }

    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    console.error('[Check-in] POST error:', err);
    return NextResponse.json({ error: 'Could not record check-in' }, { status: 500 });
  }
}
