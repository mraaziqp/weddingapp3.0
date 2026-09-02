import 'server-only';
import { Timestamp, FieldValue } from 'firebase-admin/firestore';
import { adminDb } from './firebase-admin';
import type {
  Guest,
  GuestTag,
  Household,
  MenuItem,
  MenuCourse,
  DietaryFlag,
  TimelineEvent,
  TimelineCategory,
  TrackItem,
  TrackColumn,
  Gift,
  Vendor,
  VendorStatus,
  BudgetItem,
  WellWish,
} from './types';

/**
 * Firestore data layer — the replacement for the Supabase one. Server only.
 * ────────────────────────────────────────────────────────────
 * Exposes exactly the same function names and signatures as the old
 * lib/supabase.ts so call sites only had to change their import path.
 *
 * Two deliberate carry-overs from the Supabase schema:
 *
 *  - Document ids are the app's own string ids (`household-1784052451187`,
 *    `guest-…`), not Firestore auto-ids. Every cross-reference in the existing
 *    data uses them, and keeping them means the migration is a straight copy
 *    with no id remapping and no chance of orphaning a guest from a household.
 *
 *  - Field names stay snake_case. They are what the migrated documents
 *    contain, and the mappers below already translate to the app's camelCase
 *    types, so renaming would buy nothing and risk a silent mismatch.
 *
 * Firestore has no joins, so a household's guests are fetched with a second
 * query on `guests.household_id` rather than Supabase's `select('*, guests(*)')`.
 *
 * Everything here runs through the Admin SDK, which bypasses security rules.
 * That is deliberate: firestore.rules denies browsers all access, and every
 * read or write a page needs arrives through /api/data, which authorises it.
 * Guests can therefore never read the guest list, which the Supabase anon key
 * this replaced allowed by design.
 */

// Raw Firestore documents are untyped; this alias is the single sanctioned
// escape hatch at the query boundary — everything past the mappers is typed.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DbRow = Record<string, any>;

export const COLLECTIONS = {
  households: 'households',
  guests: 'guests',
  tables: 'tables',
  menuItems: 'menu_items',
  timelineEvents: 'timeline_events',
  tracks: 'tracks',
  gifts: 'gifts',
  contributions: 'contributions',
  stdOpens: 'std_opens',
  stdConfig: 'std_config',
  vendors: 'vendors',
  budgetItems: 'budget_items',
  budgetSettings: 'budget_settings',
  wellWishes: 'well_wishes',
} as const;

/** Reads every document in a collection, with the document id folded in. */
async function readAll(name: string): Promise<DbRow[]> {
  const snap = await adminDb().collection(name).get();
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

/** The Admin SDK's equivalent of the client SDK's serverTimestamp(). */
const now = () => FieldValue.serverTimestamp();

/**
 * Normalises a Firestore timestamp to an ISO string.
 *
 * Documents written by this app hold a Timestamp; documents copied by the
 * migration script hold the original ISO string from Postgres. Both shapes
 * exist in the same collection, so every read has to handle both.
 */
export function toIso(value: unknown): string | null {
  if (!value) return null;
  if (value instanceof Timestamp) return value.toDate().toISOString();
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'string') return value;
  return null;
}

// ── Type mappers (DB snake_case ↔ app camelCase) ─────────────────────────────

export function dbToGuest(g: DbRow): Guest {
  return {
    id: g.id,
    householdId: g.household_id,
    firstName: g.first_name,
    lastName: g.last_name,
    rsvpStatus: g.rsvp_status as 'Confirmed' | 'Pending' | 'Regret',
    dietaryRestrictions: g.dietary_restrictions ?? undefined,
    songRequest: g.song_request ?? undefined,
    tags: g.tags ? (String(g.tags).split(',') as GuestTag[]) : undefined,
  };
}

export function dbToHousehold(h: DbRow): Household {
  return {
    id: h.id,
    name: h.name,
    address: '',
    qrCode: h.qr_code,
    guests: (h.guests ?? []).map(dbToGuest),
  };
}

export function dbToMenuItem(m: DbRow): MenuItem {
  return {
    id: m.id,
    name: m.name,
    description: m.description ?? '—',
    course: m.course as MenuCourse,
    dietaryFlags: m.dietary_flags
      ? String(m.dietary_flags).split(',').map((f: string) => f.trim() as DietaryFlag)
      : [],
    sortOrder: m.sort_order ?? 0,
  };
}

// ── Households & guests ──────────────────────────────────────────────────────

/**
 * All households with their guests attached.
 *
 * Reads both collections whole and joins in memory. Firestore cannot join, and
 * the alternative — one guests query per household — would be 122 sequential
 * round trips for this dataset.
 */
export async function fetchHouseholds(): Promise<Household[]> {
  const [households, guests] = await Promise.all([
    readAll(COLLECTIONS.households),
    readAll(COLLECTIONS.guests),
  ]);

  const byHousehold = new Map<string, DbRow[]>();
  for (const g of guests) {
    const list = byHousehold.get(g.household_id);
    if (list) list.push(g);
    else byHousehold.set(g.household_id, [g]);
  }

  return households
    .map(h => dbToHousehold({ ...h, guests: byHousehold.get(h.id) ?? [] }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function addHousehold(
  name: string,
  guests: { firstName: string; lastName: string; tags?: GuestTag[] }[]
): Promise<Household> {
  const ts = Date.now();
  const id = `household-${ts}`;
  const qrCode = `WEDU-HH-${ts}`;

  const batch = adminDb().batch();
  batch.set(adminDb().collection(COLLECTIONS.households).doc(id), {
    name,
    address: null,
    qr_code: qrCode,
    created_at: now(),
  });

  const guestRows = guests.map((g, i) => ({
    id: `guest-${ts}-${i}`,
    household_id: id,
    first_name: g.firstName,
    last_name: g.lastName,
    rsvp_status: 'Pending',
    tags: g.tags && g.tags.length > 0 ? g.tags.join(',') : null,
  }));

  for (const row of guestRows) {
    const { id: guestId, ...rest } = row;
    batch.set(adminDb().collection(COLLECTIONS.guests).doc(guestId), {
      ...rest,
      dietary_restrictions: null,
      song_request: null,
      table_id: null,
      checked_in_at: null,
      created_at: now(),
      updated_at: now(),
    });
  }

  await batch.commit();

  return dbToHousehold({ id, name, qr_code: qrCode, guests: guestRows });
}

export async function updateHousehold(
  householdId: string,
  name: string,
  guests: { id?: string; firstName: string; lastName: string; rsvpStatus?: string }[]
): Promise<void> {
  const existing = await adminDb()
    .collection(COLLECTIONS.guests)
    .where('household_id', '==', householdId)
    .get();
  const existingIds = existing.docs.map(d => d.id);
  const newIds = guests.map(g => g.id).filter(Boolean) as string[];

  const batch = adminDb().batch();
  batch.update(adminDb().collection(COLLECTIONS.households).doc(householdId), { name });

  // Remove guests dropped from the list.
  for (const id of existingIds.filter(id => !newIds.includes(id))) {
    batch.delete(adminDb().collection(COLLECTIONS.guests).doc(id));
  }

  const ts = Date.now();
  guests.forEach((g, i) => {
    if (g.id && existingIds.includes(g.id)) {
      // Update only these fields — a full overwrite would wipe the guest's
      // dietary requirements, song request, table and check-in time.
      batch.update(adminDb().collection(COLLECTIONS.guests).doc(g.id), {
        first_name: g.firstName,
        last_name: g.lastName,
        rsvp_status: g.rsvpStatus ?? 'Pending',
        updated_at: now(),
      });
    } else {
      batch.set(adminDb().collection(COLLECTIONS.guests).doc(g.id ?? `guest-${ts}-${i}`), {
        household_id: householdId,
        first_name: g.firstName,
        last_name: g.lastName,
        rsvp_status: g.rsvpStatus ?? 'Pending',
        dietary_restrictions: null,
        song_request: null,
        tags: null,
        table_id: null,
        checked_in_at: null,
        created_at: now(),
        updated_at: now(),
      });
    }
  });

  await batch.commit();
}

/** Deletes a household and its guests — Firestore has no cascading delete. */
export async function deleteHousehold(householdId: string): Promise<void> {
  const guests = await adminDb()
    .collection(COLLECTIONS.guests)
    .where('household_id', '==', householdId)
    .get();

  const batch = adminDb().batch();
  for (const g of guests.docs) batch.delete(g.ref);
  batch.delete(adminDb().collection(COLLECTIONS.households).doc(householdId));
  await batch.commit();
}

export async function addGuestToHousehold(
  householdId: string,
  guest: { firstName: string; lastName: string; tags?: GuestTag[] }
): Promise<Guest> {
  const id = `guest-${Date.now()}`;
  const row = {
    household_id: householdId,
    first_name: guest.firstName,
    last_name: guest.lastName,
    rsvp_status: 'Pending',
    tags: guest.tags && guest.tags.length > 0 ? guest.tags.join(',') : null,
    dietary_restrictions: null,
    song_request: null,
    table_id: null,
    checked_in_at: null,
    created_at: now(),
    updated_at: now(),
  };
  await adminDb().collection(COLLECTIONS.guests).doc(id).set(row);
  return dbToGuest({ id, ...row });
}

export async function updateGuestRsvp(
  guestId: string,
  rsvpStatus: 'Confirmed' | 'Pending' | 'Regret',
  extras?: { dietaryRestrictions?: string; songRequest?: string }
): Promise<void> {
  const update: DbRow = { rsvp_status: rsvpStatus, updated_at: now() };
  if (extras?.dietaryRestrictions !== undefined) {
    update.dietary_restrictions = extras.dietaryRestrictions;
  }
  if (extras?.songRequest !== undefined) update.song_request = extras.songRequest;
  await adminDb().collection(COLLECTIONS.guests).doc(guestId).update(update);
}

/** Loads one household plus its guests. */
async function loadHousehold(householdId: string): Promise<Household | null> {
  const snap = await adminDb().collection(COLLECTIONS.households).doc(householdId).get();
  if (!snap.exists) return null;
  const guests = await adminDb()
    .collection(COLLECTIONS.guests)
    .where('household_id', '==', householdId)
    .get();
  return dbToHousehold({
    id: snap.id,
    ...snap.data(),
    guests: guests.docs.map(d => ({ id: d.id, ...d.data() })),
  });
}

/**
 * Resolves whatever the door scanner produced into a household.
 *
 * Accepts a raw QR code, a household or guest id, or a full invite link —
 * `guestId` matters most in practice because /invite/<code> redirects to
 * /event?guestId=<code>, which is the URL actually sitting in a guest's
 * address bar when a bouncer asks to see it.
 */
export async function lookupHouseholdByQr(scanned: string): Promise<Household | null> {
  const raw = (scanned ?? '').trim();
  if (!raw) return null;

  const candidates: string[] = [raw];

  if (/^https?:\/\//i.test(raw)) {
    try {
      const url = new URL(raw);
      for (const key of ['guestId', 'household', 'id', 'qr', 'code']) {
        const value = url.searchParams.get(key);
        if (value) candidates.push(value.trim());
      }
      // Every path segment, not just the last: the app also hands out
      // /invite/<code>/camera, where the code is second from the end.
      const segments = url.pathname.split('/').filter(Boolean).reverse();
      for (const segment of segments) candidates.push(decodeURIComponent(segment));
    } catch {
      // Not a parseable URL — fall through and try it as a plain code.
    }
  }

  // Bounded so a junk URL can't turn one scan into a dozen round trips while
  // a queue waits at the door.
  const unique = Array.from(new Set(candidates)).slice(0, 6);

  for (const value of unique) {
    // qr_code lookup and direct-id lookup run together — this is the door
    // path, and the miss case used to cost two sequential round trips each.
    const [byQr, byId] = await Promise.all([
      adminDb().collection(COLLECTIONS.households).where('qr_code', '==', value).limit(1).get(),
      adminDb().collection(COLLECTIONS.households).doc(value).get(),
    ]);

    if (!byQr.empty) {
      const found = await loadHousehold(byQr.docs[0].id);
      if (found) return found;
    }
    if (byId.exists) {
      const found = await loadHousehold(byId.id);
      if (found) return found;
    }

    if (value.startsWith('guest-')) {
      const guestSnap = await adminDb().collection(COLLECTIONS.guests).doc(value).get();
      const householdId = guestSnap.exists ? guestSnap.data()!.household_id : null;
      if (householdId) {
        const found = await loadHousehold(householdId);
        if (found) return found;
      }
    }
  }

  return null;
}

// ── Menu items ───────────────────────────────────────────────────────────────

export async function fetchMenuItems(): Promise<MenuItem[]> {
  const rows = await readAll(COLLECTIONS.menuItems);
  return rows.map(dbToMenuItem).sort((a, b) => a.sortOrder - b.sortOrder);
}

export async function addMenuItem(
  name: string,
  description: string,
  course: string,
  dietaryFlags: string[] = []
): Promise<MenuItem> {
  const id = `menu-${Date.now()}`;
  const row = {
    name,
    description: description || '',
    course,
    dietary_flags: dietaryFlags.length > 0 ? dietaryFlags.join(',') : null,
    sort_order: 0,
    created_at: now(),
    updated_at: now(),
  };
  await adminDb().collection(COLLECTIONS.menuItems).doc(id).set(row);
  return dbToMenuItem({ id, ...row });
}

export async function deleteMenuItem(id: string): Promise<void> {
  await adminDb().collection(COLLECTIONS.menuItems).doc(id).delete();
}

export async function updateMenuItemsOrder(items: MenuItem[]): Promise<void> {
  const batch = adminDb().batch();
  items.forEach((item, index) => {
    batch.update(adminDb().collection(COLLECTIONS.menuItems).doc(item.id), {
      sort_order: index,
      course: item.course,
      updated_at: now(),
    });
  });
  await batch.commit();
}

// ── Timeline ─────────────────────────────────────────────────────────────────

export function dbToTimelineEvent(e: DbRow): TimelineEvent {
  return {
    id: e.id,
    time: e.time,
    title: e.title,
    description: e.description ?? undefined,
    category: (e.category ?? 'other') as TimelineCategory,
    isPublic: e.is_public ?? true,
    duration: e.duration ?? undefined,
    sortOrder: e.sort_order ?? 0,
  };
}

export async function fetchTimelineEvents(): Promise<TimelineEvent[]> {
  const rows = await readAll(COLLECTIONS.timelineEvents);
  return rows.map(dbToTimelineEvent).sort((a, b) => a.sortOrder - b.sortOrder);
}

export async function updateTimelineEventsOrder(events: TimelineEvent[]): Promise<void> {
  const batch = adminDb().batch();
  events.forEach((event, index) => {
    batch.update(adminDb().collection(COLLECTIONS.timelineEvents).doc(event.id), {
      sort_order: index,
      updated_at: now(),
    });
  });
  await batch.commit();
}

export async function createTimelineEvent(event: TimelineEvent): Promise<void> {
  await adminDb().collection(COLLECTIONS.timelineEvents).doc(event.id).set({
    time: event.time,
    title: event.title,
    description: event.description ?? null,
    category: event.category,
    is_public: event.isPublic,
    duration: event.duration ?? null,
    sort_order: event.sortOrder,
    created_at: now(),
    updated_at: now(),
  });
}

export async function updateTimelineEvent(event: TimelineEvent): Promise<void> {
  await adminDb().collection(COLLECTIONS.timelineEvents).doc(event.id).update({
    time: event.time,
    title: event.title,
    description: event.description ?? null,
    category: event.category,
    is_public: event.isPublic,
    duration: event.duration ?? null,
    updated_at: now(),
  });
}

export async function deleteTimelineEvent(id: string): Promise<void> {
  await adminDb().collection(COLLECTIONS.timelineEvents).doc(id).delete();
}

// ── Playlist ─────────────────────────────────────────────────────────────────

export function dbToTrackItem(t: DbRow): TrackItem {
  return {
    id: t.id,
    title: t.title,
    artist: t.artist,
    column: (t.column ?? 'if-time') as TrackColumn,
    requestedBy: t.requested_by ?? undefined,
    sortOrder: t.sort_order ?? 0,
  };
}

export async function fetchTracks(): Promise<TrackItem[]> {
  const rows = await readAll(COLLECTIONS.tracks);
  return rows.map(dbToTrackItem).sort((a, b) => a.sortOrder - b.sortOrder);
}

export async function updateTrackColumn(trackId: string, column: TrackColumn): Promise<void> {
  await adminDb().collection(COLLECTIONS.tracks).doc(trackId).update({ column });
}

export async function updateTracksOrder(tracks: TrackItem[]): Promise<void> {
  const batch = adminDb().batch();
  tracks.forEach((track, index) => {
    batch.update(adminDb().collection(COLLECTIONS.tracks).doc(track.id), {
      sort_order: index,
      column: track.column,
    });
  });
  await batch.commit();
}

// ── Registry ─────────────────────────────────────────────────────────────────

export function dbToGift(g: DbRow): Gift {
  return {
    id: g.id,
    name: g.name,
    price: g.price,
    imageUrl: g.image_url ?? '',
    storeUrl: g.store_url ?? '',
    isCrowdfund: g.is_crowdfund ?? false,
    fundedAmount: g.funded_amount ?? 0,
    isPurchased: g.is_purchased ?? false,
  };
}

export async function fetchGifts(): Promise<Gift[]> {
  const rows = await readAll(COLLECTIONS.gifts);
  return rows.map(dbToGift);
}

// ── Vendors ──────────────────────────────────────────────────────────────────

export function dbToVendor(v: DbRow): Vendor {
  return {
    id: v.id,
    name: v.name,
    category: v.category,
    contactName: v.contact_name ?? undefined,
    contactEmail: v.contact_email ?? undefined,
    contactPhone: v.contact_phone ?? undefined,
    price: v.price ?? 0,
    status: (v.status ?? 'Enquired') as VendorStatus,
    depositPaid: v.deposit_paid ?? 0,
  };
}

export async function fetchVendors(): Promise<Vendor[]> {
  const rows = await readAll(COLLECTIONS.vendors);
  return rows.map(dbToVendor);
}

export async function addVendor(vendor: Omit<Vendor, 'id'>): Promise<Vendor> {
  const id = `vendor-${Date.now()}`;
  const row = {
    name: vendor.name,
    category: vendor.category,
    contact_name: vendor.contactName ?? null,
    contact_email: vendor.contactEmail ?? null,
    contact_phone: vendor.contactPhone ?? null,
    price: vendor.price,
    status: vendor.status,
    deposit_paid: vendor.depositPaid,
    created_at: now(),
  };
  await adminDb().collection(COLLECTIONS.vendors).doc(id).set(row);
  return dbToVendor({ id, ...row });
}

export async function deleteVendor(id: string): Promise<void> {
  await adminDb().collection(COLLECTIONS.vendors).doc(id).delete();
}

// ── Budget ───────────────────────────────────────────────────────────────────

export function dbToBudgetItem(b: DbRow): BudgetItem {
  return {
    id: b.id,
    category: b.category,
    name: b.name,
    budgeted: b.budgeted ?? 0,
    actual: b.actual ?? 0,
  };
}

export async function fetchBudgetItems(): Promise<BudgetItem[]> {
  const rows = await readAll(COLLECTIONS.budgetItems);
  return rows.map(dbToBudgetItem);
}

export async function addBudgetItem(item: Omit<BudgetItem, 'id'>): Promise<BudgetItem> {
  const id = `budget-${Date.now()}`;
  const row = {
    category: item.category,
    name: item.name,
    budgeted: item.budgeted,
    actual: item.actual,
    created_at: now(),
  };
  await adminDb().collection(COLLECTIONS.budgetItems).doc(id).set(row);
  return dbToBudgetItem({ id, ...row });
}

export async function deleteBudgetItem(id: string): Promise<void> {
  await adminDb().collection(COLLECTIONS.budgetItems).doc(id).delete();
}

/** The overall budget figure lives in a single well-known document. */
export async function fetchTotalBudget(): Promise<number> {
  const snap = await adminDb().collection(COLLECTIONS.budgetSettings).doc('main').get();
  return snap.exists ? (snap.data()!.total_budget ?? 0) : 0;
}

export async function updateTotalBudget(totalBudget: number): Promise<void> {
  await adminDb()
    .collection(COLLECTIONS.budgetSettings)
    .doc('main')
    .set({ total_budget: totalBudget }, { merge: true });
}

// ── Well wishes ──────────────────────────────────────────────────────────────

export async function fetchWellWishes(max = 200): Promise<WellWish[]> {
  const snap = await adminDb()
    .collection(COLLECTIONS.wellWishes)
    .orderBy('created_at', 'desc')
    .limit(max)
    .get();
  return snap.docs.map(d => ({
    id: d.id,
    name: d.data().name ?? null,
    message: d.data().message,
    created_at: toIso(d.data().created_at),
  }));
}

export async function addWellWish(name: string | null, message: string): Promise<WellWish> {
  const id = `wish-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  // created_at is a real client timestamp rather than serverTimestamp() so the
  // value can be returned immediately — serverTimestamp() resolves to null on
  // the write and would leave the new wish sorting last until a refetch.
  const createdAt = new Date();
  await adminDb().collection(COLLECTIONS.wellWishes).doc(id).set({
    name: name || null,
    message,
    created_at: Timestamp.fromDate(createdAt),
  });
  return { id, name: name || null, message, created_at: createdAt.toISOString() };
}

export async function deleteWellWish(id: string): Promise<void> {
  await adminDb().collection(COLLECTIONS.wellWishes).doc(id).delete();
}

// ── Save-the-date analytics ──────────────────────────────────────────────────

export async function trackStdOpen(event: 'view' | 'opened', userAgent: string | null) {
  const id = `std-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  await adminDb().collection(COLLECTIONS.stdOpens).doc(id).set({
    event_type: event,
    user_agent: userAgent,
    created_at: now(),
  });
}

export async function fetchStdCounts(): Promise<{ views: number; opens: number }> {
  const rows = await readAll(COLLECTIONS.stdOpens);
  return {
    views: rows.filter(r => r.event_type === 'view').length,
    opens: rows.filter(r => r.event_type === 'opened').length,
  };
}

// ── Generic single-document config ───────────────────────────────────────────

export async function readConfigDoc<T>(collectionName: string, id = 'main'): Promise<T | null> {
  const snap = await adminDb().collection(collectionName).doc(id).get();
  return snap.exists ? ((snap.data()!.config ?? snap.data()) as T) : null;
}

export async function writeConfigDoc(
  collectionName: string,
  config: unknown,
  id = 'main'
): Promise<void> {
  await adminDb().collection(collectionName).doc(id).set({ config, updated_at: now() });
}

// ── Check-in (Bouncer Mode) ──────────────────────────────────────────────────

export type CheckInResult = {
  firstScan: boolean;
  newlyCheckedIn: number;
  alreadyCheckedIn: number;
  total: number;
  previouslySeenAt: string | null;
};

/**
 * Stamps arrival on every guest in a household who isn't already through the
 * door, and reports honestly when a code has been used before.
 *
 * Re-scanning must never overwrite the original arrival time — the person on
 * the door needs to be told "this was already scanned", not shown a second
 * burst of confetti.
 */
export async function checkInHousehold(householdId: string): Promise<CheckInResult | null> {
  const snap = await adminDb()
    .collection(COLLECTIONS.guests)
    .where('household_id', '==', householdId)
    .get();

  if (snap.empty) return null;

  const alreadyIn = snap.docs.filter(d => d.data().checked_in_at);
  const arriving = snap.docs.filter(d => !d.data().checked_in_at);

  if (arriving.length) {
    const stamp = Timestamp.now();
    const batch = adminDb().batch();
    for (const d of arriving) batch.update(d.ref, { checked_in_at: stamp });
    await batch.commit();
  }

  return {
    firstScan: alreadyIn.length === 0,
    newlyCheckedIn: arriving.length,
    alreadyCheckedIn: alreadyIn.length,
    total: snap.size,
    previouslySeenAt: alreadyIn.length ? toIso(alreadyIn[0].data().checked_in_at) : null,
  };
}

// ── RSVP sync ────────────────────────────────────────────────────────────────

/** Applies an RSVP to a single guest row. */
export async function setGuestRsvp(
  guestId: string,
  rsvpStatus: 'Confirmed' | 'Regret',
  dietaryRestrictions?: string
): Promise<void> {
  const update: DbRow = { rsvp_status: rsvpStatus, updated_at: now() };
  if (dietaryRestrictions) update.dietary_restrictions = dietaryRestrictions;
  await adminDb().collection(COLLECTIONS.guests).doc(guestId).update(update);
}

/** Applies an RSVP to everyone in a household — for shared invite links. */
export async function setHouseholdRsvp(
  householdId: string,
  rsvpStatus: 'Confirmed' | 'Regret'
): Promise<void> {
  const snap = await adminDb()
    .collection(COLLECTIONS.guests)
    .where('household_id', '==', householdId)
    .get();
  if (snap.empty) return;

  const batch = adminDb().batch();
  for (const d of snap.docs) batch.update(d.ref, { rsvp_status: rsvpStatus, updated_at: now() });
  await batch.commit();
}

/** Every guest, for the RSVP analytics dashboard. */
export async function fetchGuestRows(): Promise<DbRow[]> {
  const rows = await readAll(COLLECTIONS.guests);
  return rows
    .map(r => ({ ...r, updated_at: toIso(r.updated_at) }))
    .sort((a, b) => String(b.updated_at ?? '').localeCompare(String(a.updated_at ?? '')));
}

/**
 * Resolves a display name for a photo credit.
 *
 * The id in an invite URL is the *household* (or its QR code), not a guest row,
 * so all three shapes have to be tried or every photo falls back to "A Guest".
 */
export async function resolveDisplayName(id: string): Promise<string | null> {
  const guest = await adminDb().collection(COLLECTIONS.guests).doc(id).get();
  if (guest.exists) {
    const d = guest.data()!;
    const name = [d.first_name, d.last_name].filter(Boolean).join(' ').trim();
    if (name) return name;
  }

  const byId = await adminDb().collection(COLLECTIONS.households).doc(id).get();
  if (byId.exists) {
    const name = String(byId.data()!.name ?? '').trim();
    if (name) return name;
  }

  const byQr = await adminDb()
    .collection(COLLECTIONS.households)
    .where('qr_code', '==', id)
    .limit(1)
    .get();
  if (!byQr.empty) {
    const name = String(byQr.docs[0].data().name ?? '').trim();
    if (name) return name;
  }

  return null;
}

// ── Registry ─────────────────────────────────────────────────────────────────

export async function addGift(gift: {
  name: string;
  price: number;
  imageUrl?: string;
  storeUrl?: string;
}): Promise<Gift> {
  const id = `gift-${Date.now()}`;
  const row = {
    name: gift.name,
    price: gift.price,
    image_url: gift.imageUrl ?? '',
    store_url: gift.storeUrl ?? '',
    is_crowdfund: false,
    funded_amount: 0,
    is_purchased: false,
    created_at: now(),
  };
  await adminDb().collection(COLLECTIONS.gifts).doc(id).set(row);
  return dbToGift({ id, ...row });
}

export async function deleteGift(id: string): Promise<void> {
  await adminDb().collection(COLLECTIONS.gifts).doc(id).delete();
}

/**
 * Anonymously claims a registry item so nobody duplicates the gift.
 *
 * Runs in a transaction: if two guests tap "claim" at the same moment only the
 * first wins, and the second is told it was just taken rather than silently
 * double-booking it. Returns null when it was already claimed or doesn't exist.
 */
export async function claimGift(id: string): Promise<Gift | null> {
  const ref = adminDb().collection(COLLECTIONS.gifts).doc(id);
  return adminDb().runTransaction(async tx => {
    const snap = await tx.get(ref);
    if (!snap.exists) return null;
    const data = snap.data()!;
    if (data.is_purchased) return null;

    tx.update(ref, { is_purchased: true, purchased_at: Timestamp.now() });
    return dbToGift({ ...data, id, is_purchased: true });
  });
}

/** One household plus its guests, by document id. Public via /api/data. */
export async function fetchHouseholdById(householdId: string): Promise<Household | null> {
  return loadHousehold(householdId);
}

/**
 * The most recently updated confirmed guests, for the dashboard activity feed.
 *
 * Sorted in memory rather than with orderBy(): `updated_at` is a Timestamp on
 * documents this app wrote and an ISO string on migrated ones, and Firestore
 * cannot order across mixed types. The collection is a few hundred documents.
 */
export async function fetchRecentConfirmedGuests(max = 3): Promise<
  { id: string; firstName: string; updatedAt: string | null }[]
> {
  const snap = await adminDb()
    .collection(COLLECTIONS.guests)
    .where('rsvp_status', '==', 'Confirmed')
    .get();

  return snap.docs
    .map(d => ({
      id: d.id,
      firstName: d.data().first_name ?? '',
      updatedAt: toIso(d.data().updated_at),
    }))
    .sort((a, b) => String(b.updatedAt ?? '').localeCompare(String(a.updatedAt ?? '')))
    .slice(0, max);
}

/** Applies an RSVP plus dietary/song details to a whole household. */
export async function submitHouseholdRsvp(input: {
  householdId: string;
  rsvpStatus: 'Confirmed' | 'Regret';
  dietary: string;
  song: string;
}): Promise<void> {
  const snap = await adminDb()
    .collection(COLLECTIONS.guests)
    .where('household_id', '==', input.householdId)
    .get();
  if (snap.empty) return;

  const batch = adminDb().batch();
  for (const d of snap.docs) {
    batch.update(d.ref, {
      rsvp_status: input.rsvpStatus,
      dietary_restrictions: input.dietary || null,
      song_request: input.song || null,
      updated_at: now(),
    });
  }
  await batch.commit();
}

// ── RSVP audit log ───────────────────────────────────────────────────────────

/**
 * A durable record of each RSVP submission, including the guest's free-text
 * message.
 *
 * This lived in a separate Neon Postgres database whose DATABASE_URL was never
 * set in any environment, so every write silently failed and every guest
 * comment was thrown away. Same collection, same data, one database.
 */
export async function recordRsvpResponse(entry: {
  guestId: string;
  householdId?: string | null;
  guestName?: string | null;
  status: string;
  dietaryRestrictions?: string | null;
  message?: string | null;
}): Promise<void> {
  const id = `rsvp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  await adminDb().collection('rsvp_responses').doc(id).set({
    guest_id: entry.guestId,
    household_id: entry.householdId ?? null,
    guest_name: entry.guestName ?? null,
    status: entry.status,
    dietary_restrictions: entry.dietaryRestrictions ?? null,
    message: entry.message ?? null,
    responded_at: now(),
  });
}

/**
 * The most recent free-text message per guest, for the analytics table.
 *
 * Returned keyed two ways on purpose. The invitation form posts whatever id
 * was in the URL, and those links carry the *household* — so a message from a
 * shared household link is filed under a household id, while the analytics
 * table iterates guest rows. Looking up only by guest id silently dropped
 * every comment, which went unnoticed while the audit log's database was
 * unconfigured and no message was ever stored at all.
 */
export async function fetchRsvpMessages(): Promise<{
  byGuest: Record<string, string>;
  byHousehold: Record<string, string>;
}> {
  const snap = await adminDb().collection('rsvp_responses').get();
  const byGuest: Record<string, string> = {};
  const byHousehold: Record<string, string> = {};
  const guestSeenAt: Record<string, string> = {};
  const householdSeenAt: Record<string, string> = {};

  for (const d of snap.docs) {
    const data = d.data();
    if (!data.message) continue;
    const at = toIso(data.responded_at) ?? '';

    // Keep the newest message per key — someone may RSVP twice.
    const guestKey = data.guest_id;
    if (guestKey && (!guestSeenAt[guestKey] || at > guestSeenAt[guestKey])) {
      guestSeenAt[guestKey] = at;
      byGuest[guestKey] = data.message;
    }

    const householdKey = data.household_id ?? (String(guestKey).startsWith('household-') ? guestKey : null);
    if (householdKey && (!householdSeenAt[householdKey] || at > householdSeenAt[householdKey])) {
      householdSeenAt[householdKey] = at;
      byHousehold[householdKey] = data.message;
    }
  }

  return { byGuest, byHousehold };
}

// ── Seating ─────────────────────────────────────────────────────────────

export type SeatingTable = { name: string; guestNames: string[] };

export type SeatingPlan = {
  tables: SeatingTable[];
  /** Where a guest id resolves to their table label, for the personal card. */
  seatByGuestId: Record<string, string>;
  importedAt: string | null;
  sourceFileName: string | null;
};

/**
 * Replaces the whole seating plan in one batch.
 *
 * A seating chart is only ever meaningful as a complete document — a partial
 * write would leave some guests pointing at tables that no longer exist — so
 * the previous plan is cleared in the same batch that writes the new one.
 */
export async function saveSeatingPlan(input: {
  tables: SeatingTable[];
  seatByGuestId: Record<string, string>;
  sourceFileName?: string | null;
}): Promise<{ tables: number; seated: number }> {
  const db = adminDb();
  const batch = db.batch();
  const collection = db.collection(COLLECTIONS.tables);

  const existing = await collection.get();
  for (const doc of existing.docs) batch.delete(doc.ref);

  const importedAt = new Date().toISOString();
  input.tables.forEach((table, i) => {
    batch.set(collection.doc(`table-${i + 1}`), {
      name: table.name,
      guest_names: table.guestNames,
      sort_order: i,
      imported_at: importedAt,
      source_file_name: input.sourceFileName ?? null,
    });
  });

  // Each guest carries their own table label so the guest dashboard needs one
  // document read, not a scan of the whole chart.
  const guests = await db.collection(COLLECTIONS.guests).get();
  for (const doc of guests.docs) {
    const seat = input.seatByGuestId[doc.id] ?? null;
    if ((doc.data().table_id ?? null) !== seat) {
      batch.update(doc.ref, { table_id: seat });
    }
  }

  await batch.commit();
  return {
    tables: input.tables.length,
    seated: Object.keys(input.seatByGuestId).length,
  };
}

export async function fetchSeatingPlan(): Promise<SeatingPlan> {
  const [tableRows, guestRows] = await Promise.all([
    readAll(COLLECTIONS.tables),
    readAll(COLLECTIONS.guests),
  ]);

  const tables = tableRows
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
    .map(t => ({ name: t.name as string, guestNames: (t.guest_names ?? []) as string[] }));

  const seatByGuestId: Record<string, string> = {};
  for (const g of guestRows) {
    if (g.table_id) seatByGuestId[g.id] = g.table_id;
  }

  return {
    tables,
    seatByGuestId,
    importedAt: (tableRows[0]?.imported_at as string) ?? null,
    sourceFileName: (tableRows[0]?.source_file_name as string) ?? null,
  };
}

/** Every guest, flattened, for matching parsed names against the real list. */
export async function fetchGuestDirectory(): Promise<
  { id: string; firstName: string; lastName: string; householdId: string }[]
> {
  const guests = await readAll(COLLECTIONS.guests);
  return guests.map(g => ({
    id: g.id,
    firstName: g.first_name ?? '',
    lastName: g.last_name ?? '',
    householdId: g.household_id ?? '',
  }));
}

/**
 * The seat for one household: their table, and who else is on it.
 *
 * Returns the table of whichever member is seated — a household is seated
 * together in practice, and showing "your table" beats showing nothing when
 * only one member matched the imported chart.
 */
export async function fetchSeatForHousehold(householdId: string): Promise<{
  tableName: string;
  tableMates: string[];
} | null> {
  const db = adminDb();
  const guests = await db
    .collection(COLLECTIONS.guests)
    .where('household_id', '==', householdId)
    .get();

  const seated = guests.docs.map(d => d.data().table_id).find(Boolean);
  if (!seated) return null;

  const tables = await readAll(COLLECTIONS.tables);
  const table = tables.find(t => t.name === seated);

  return {
    tableName: seated as string,
    tableMates: ((table?.guest_names ?? []) as string[]).slice(0, 24),
  };
}
