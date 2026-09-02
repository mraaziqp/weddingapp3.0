import { NextRequest, NextResponse } from 'next/server';
import { isAuthorizedAdminRequest } from '@/lib/admin-auth';
import { saveSeatingPlan, fetchSeatingPlan, fetchSeatForHousehold } from '@/lib/firestore-server';

/**
 * The saved seating plan.
 *
 * GET  ?householdId=…  a guest asking where they sit — open, and answers only
 *                      with that household's own table and who shares it.
 * GET                  the whole chart, for the admin screen and the venue
 *                      display. Open by design: the chart is printed and put
 *                      on an easel at the door.
 * POST                 replaces the plan. Admin only.
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const householdId = req.nextUrl.searchParams.get('householdId');

  try {
    if (householdId) {
      const seat = await fetchSeatForHousehold(householdId);
      return NextResponse.json({ seat });
    }

    const plan = await fetchSeatingPlan();
    // seatByGuestId maps guest ids to tables; it is the couple's index, not
    // something a public chart request needs, so it does not go out here.
    return NextResponse.json({
      tables: plan.tables,
      importedAt: plan.importedAt,
      sourceFileName: plan.sourceFileName,
    });
  } catch (err) {
    console.error('[Seating] read failed:', err);
    return NextResponse.json({ error: 'Could not load the seating chart' }, { status: 502 });
  }
}

export async function POST(req: NextRequest) {
  if (!isAuthorizedAdminRequest(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: {
    tables?: { name?: unknown; guestNames?: unknown }[];
    seatByGuestId?: Record<string, unknown>;
    sourceFileName?: unknown;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Malformed request' }, { status: 400 });
  }

  if (!Array.isArray(body.tables)) {
    return NextResponse.json({ error: 'tables must be a list' }, { status: 400 });
  }
  if (body.tables.length > 200) {
    return NextResponse.json({ error: 'That is more than 200 tables' }, { status: 400 });
  }

  const tables = body.tables.map(t => ({
    name: String(t?.name ?? '').trim().slice(0, 120),
    guestNames: Array.isArray(t?.guestNames)
      ? (t.guestNames as unknown[]).map(n => String(n).trim().slice(0, 120)).filter(Boolean)
      : [],
  }));

  if (tables.some(t => !t.name)) {
    return NextResponse.json({ error: 'Every table needs a name' }, { status: 400 });
  }

  const seatByGuestId: Record<string, string> = {};
  const tableNames = new Set(tables.map(t => t.name));
  for (const [guestId, tableName] of Object.entries(body.seatByGuestId ?? {})) {
    const name = String(tableName).trim();
    // Refuse to seat anyone at a table that is not in the chart being saved —
    // that would leave a guest pointing at a table nobody can find.
    if (!tableNames.has(name)) continue;
    seatByGuestId[guestId] = name;
  }

  try {
    const saved = await saveSeatingPlan({
      tables,
      seatByGuestId,
      sourceFileName: body.sourceFileName ? String(body.sourceFileName).slice(0, 200) : null,
    });
    return NextResponse.json({ ok: true, ...saved });
  } catch (err) {
    console.error('[Seating] save failed:', err);
    return NextResponse.json({ error: 'Could not save the seating chart' }, { status: 502 });
  }
}
