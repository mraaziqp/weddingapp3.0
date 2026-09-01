import { NextRequest, NextResponse } from 'next/server';
import * as store from '@/lib/firestore-server';
import { isAuthorizedAdminRequest } from '@/lib/admin-auth';
import { isAdminConfigured } from '@/lib/firebase-admin';
import { rateLimit, clientIp } from '@/lib/rate-limit';

/**
 * The single data endpoint.
 * ─────────────────────────
 * Firestore is unreachable from a browser (see firestore.rules), so every read
 * and write a page needs arrives here and is dispatched to the Admin SDK data
 * layer. One route rather than thirty keeps the authorisation decision in one
 * readable table instead of scattered across a directory of near-identical
 * files — and makes it obvious at a glance which operations a guest can reach.
 *
 * POST { op: string, args?: unknown[] }  ->  { result }
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Operations any visitor may call. Everything else requires the admin cookie. */
const PUBLIC_OPS = new Set([
  // A guest resolving their own invite code. Returns only the one matching
  // household — never the list — so this cannot be used to enumerate guests
  // without already holding a valid code.
  'lookupHouseholdByQr',
  // A guest opening their own invitation link. Returns one household, and
  // only when the caller already knows its id.
  'fetchHouseholdById',
  // Public event content, no personal data.
  'fetchMenuItems',
  'fetchTimelineEvents',
  'fetchTracks',
  'fetchGifts',
  // The guestbook wall.
  'fetchWellWishes',
  'addWellWish',
  // A guest recording their own RSVP from the invitation form.
  'updateGuestRsvp',
]);

/** Public operations that write, and so need a rate limit. */
const PUBLIC_WRITE_OPS = new Set(['addWellWish', 'updateGuestRsvp']);

/**
 * Everything callable through this endpoint. An operation absent from here is
 * rejected, so adding an export to the data layer never silently widens the
 * API surface.
 */
const OPS = {
  // households & guests
  fetchHouseholds: store.fetchHouseholds,
  addHousehold: store.addHousehold,
  updateHousehold: store.updateHousehold,
  deleteHousehold: store.deleteHousehold,
  addGuestToHousehold: store.addGuestToHousehold,
  updateGuestRsvp: store.updateGuestRsvp,
  lookupHouseholdByQr: store.lookupHouseholdByQr,
  fetchHouseholdById: store.fetchHouseholdById,
  fetchRecentConfirmedGuests: store.fetchRecentConfirmedGuests,
  fetchGuestRows: store.fetchGuestRows,
  // menu
  fetchMenuItems: store.fetchMenuItems,
  addMenuItem: store.addMenuItem,
  deleteMenuItem: store.deleteMenuItem,
  updateMenuItemsOrder: store.updateMenuItemsOrder,
  // timeline
  fetchTimelineEvents: store.fetchTimelineEvents,
  createTimelineEvent: store.createTimelineEvent,
  updateTimelineEvent: store.updateTimelineEvent,
  deleteTimelineEvent: store.deleteTimelineEvent,
  updateTimelineEventsOrder: store.updateTimelineEventsOrder,
  // playlist
  fetchTracks: store.fetchTracks,
  updateTrackColumn: store.updateTrackColumn,
  updateTracksOrder: store.updateTracksOrder,
  // registry
  fetchGifts: store.fetchGifts,
  // vendors
  fetchVendors: store.fetchVendors,
  addVendor: store.addVendor,
  deleteVendor: store.deleteVendor,
  // budget
  fetchBudgetItems: store.fetchBudgetItems,
  addBudgetItem: store.addBudgetItem,
  deleteBudgetItem: store.deleteBudgetItem,
  fetchTotalBudget: store.fetchTotalBudget,
  updateTotalBudget: store.updateTotalBudget,
  // well wishes
  fetchWellWishes: store.fetchWellWishes,
  addWellWish: store.addWellWish,
  deleteWellWish: store.deleteWellWish,
} as const;

type OpName = keyof typeof OPS;

export async function POST(req: NextRequest) {
  let body: { op?: unknown; args?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Malformed request' }, { status: 400 });
  }

  const op = typeof body.op === 'string' ? body.op : '';
  if (!Object.prototype.hasOwnProperty.call(OPS, op)) {
    return NextResponse.json({ error: `Unknown operation` }, { status: 400 });
  }
  const name = op as OpName;

  if (!PUBLIC_OPS.has(name) && !isAuthorizedAdminRequest(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (PUBLIC_WRITE_OPS.has(name) && !isAuthorizedAdminRequest(req)) {
    const limit = rateLimit(`data:${name}:${clientIp(req)}`, 20, 60_000);
    if (!limit.allowed) {
      return NextResponse.json(
        { error: 'Too many requests. Please wait a moment.' },
        { status: 429, headers: { 'Retry-After': String(limit.retryAfter) } }
      );
    }
  }

  // A deploy without credentials fails every single read, and a generic 500
  // makes that look like data loss rather than a missing environment
  // variable. Say which one is missing instead.
  if (!isAdminConfigured()) {
    return NextResponse.json(
      {
        error:
          'The database is not configured on this deployment. ' +
          'Set FIREBASE_SERVICE_ACCOUNT_B64 in the hosting environment.',
        configured: false,
      },
      { status: 503 }
    );
  }

  const args = Array.isArray(body.args) ? body.args : [];

  try {
    // The whitelist above is the type boundary; past it the arguments are
    // whatever the caller sent, which is why every op validates its own input.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await (OPS[name] as (...a: any[]) => Promise<unknown>)(...args);
    return NextResponse.json({ result: result ?? null });
  } catch (err) {
    // Log the detail; return a generic message. Firestore errors can name
    // collections and document paths.
    console.error(`[data] ${name} failed:`, err);
    return NextResponse.json({ error: 'That request could not be completed.' }, { status: 500 });
  }
}
