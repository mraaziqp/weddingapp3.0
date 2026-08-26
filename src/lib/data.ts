/**
 * The data layer every page imports.
 * ──────────────────────────────────
 * Exposes the same function names the old lib/supabase.ts did, so call sites
 * only changed their import path.
 *
 * Every call posts to /api/data, which authorises the operation and runs it
 * against Firestore with the Admin SDK. Firestore itself is unreachable from a
 * browser (see firestore.rules), so this is the only route in.
 *
 * This module is for **client components**. Server code — API routes, server
 * components, server actions — imports `firestore-server` directly instead;
 * going through HTTP to reach our own process would be a pointless round trip,
 * and importing the server module from here would drag `firebase-admin` and
 * the service-account credentials into the browser bundle.
 */

import type {
  Guest,
  GuestTag,
  Household,
  MenuItem,
  TimelineEvent,
  TrackItem,
  TrackColumn,
  Gift,
  Vendor,
  BudgetItem,
} from './types';
import type { WellWish } from './types';

export type { WellWish };

/** Invokes one data operation through the API. */
async function call<T>(op: string, args: unknown[] = []): Promise<T> {
  const res = await fetch('/api/data', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ op, args }),
    cache: 'no-store',
  });

  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error ?? `Request failed (${res.status})`);
  return body.result as T;
}

// ── Households & guests ──────────────────────────────────────────────────────

export const fetchHouseholds = () => call<Household[]>('fetchHouseholds');

export const addHousehold = (
  name: string,
  guests: { firstName: string; lastName: string; tags?: GuestTag[] }[]
) => call<Household>('addHousehold', [name, guests]);

export const updateHousehold = (
  householdId: string,
  name: string,
  guests: { id?: string; firstName: string; lastName: string; rsvpStatus?: string }[]
) => call<void>('updateHousehold', [householdId, name, guests]);

export const deleteHousehold = (householdId: string) =>
  call<void>('deleteHousehold', [householdId]);

export const addGuestToHousehold = (
  householdId: string,
  guest: { firstName: string; lastName: string; tags?: GuestTag[] }
) => call<Guest>('addGuestToHousehold', [householdId, guest]);

export const updateGuestRsvp = (
  guestId: string,
  rsvpStatus: 'Confirmed' | 'Pending' | 'Regret',
  extras?: { dietaryRestrictions?: string; songRequest?: string }
) => call<void>('updateGuestRsvp', [guestId, rsvpStatus, extras]);

export const lookupHouseholdByQr = (scanned: string) =>
  call<Household | null>('lookupHouseholdByQr', [scanned]);

export const fetchHouseholdById = (householdId: string) =>
  call<Household | null>('fetchHouseholdById', [householdId]);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const fetchGuestRows = () => call<Record<string, any>[]>('fetchGuestRows');

export const fetchRecentConfirmedGuests = (max?: number) =>
  call<{ id: string; firstName: string; updatedAt: string | null }[]>(
    'fetchRecentConfirmedGuests',
    [max ?? 3]
  );

// ── Menu ─────────────────────────────────────────────────────────────────────

export const fetchMenuItems = () => call<MenuItem[]>('fetchMenuItems');

export const addMenuItem = (
  name: string,
  description: string,
  course: string,
  dietaryFlags: string[] = []
) => call<MenuItem>('addMenuItem', [name, description, course, dietaryFlags]);

export const deleteMenuItem = (id: string) => call<void>('deleteMenuItem', [id]);

export const updateMenuItemsOrder = (items: MenuItem[]) =>
  call<void>('updateMenuItemsOrder', [items]);

// ── Timeline ─────────────────────────────────────────────────────────────────

export const fetchTimelineEvents = () => call<TimelineEvent[]>('fetchTimelineEvents');

export const createTimelineEvent = (event: TimelineEvent) =>
  call<void>('createTimelineEvent', [event]);

export const updateTimelineEvent = (event: TimelineEvent) =>
  call<void>('updateTimelineEvent', [event]);

export const deleteTimelineEvent = (id: string) => call<void>('deleteTimelineEvent', [id]);

export const updateTimelineEventsOrder = (events: TimelineEvent[]) =>
  call<void>('updateTimelineEventsOrder', [events]);

// ── Playlist ─────────────────────────────────────────────────────────────────

export const fetchTracks = () => call<TrackItem[]>('fetchTracks');

export const updateTrackColumn = (trackId: string, column: TrackColumn) =>
  call<void>('updateTrackColumn', [trackId, column]);

export const updateTracksOrder = (tracks: TrackItem[]) =>
  call<void>('updateTracksOrder', [tracks]);

// ── Registry ─────────────────────────────────────────────────────────────────

export const fetchGifts = () => call<Gift[]>('fetchGifts');

// ── Vendors ──────────────────────────────────────────────────────────────────

export const fetchVendors = () => call<Vendor[]>('fetchVendors');

export const addVendor = (vendor: Omit<Vendor, 'id'>) => call<Vendor>('addVendor', [vendor]);

export const deleteVendor = (id: string) => call<void>('deleteVendor', [id]);

// ── Budget ───────────────────────────────────────────────────────────────────

export const fetchBudgetItems = () => call<BudgetItem[]>('fetchBudgetItems');

export const addBudgetItem = (item: Omit<BudgetItem, 'id'>) =>
  call<BudgetItem>('addBudgetItem', [item]);

export const deleteBudgetItem = (id: string) => call<void>('deleteBudgetItem', [id]);

export const fetchTotalBudget = () => call<number>('fetchTotalBudget');

export const updateTotalBudget = (totalBudget: number) =>
  call<void>('updateTotalBudget', [totalBudget]);

// ── Well wishes ──────────────────────────────────────────────────────────────

export const fetchWellWishes = (max?: number) => call<WellWish[]>('fetchWellWishes', [max ?? 200]);

export const addWellWish = (name: string | null, message: string) =>
  call<WellWish>('addWellWish', [name, message]);

export const deleteWellWish = (id: string) => call<void>('deleteWellWish', [id]);
