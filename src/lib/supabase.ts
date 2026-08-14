import { createClient } from '@supabase/supabase-js';
import type { Guest, GuestTag, Household, MenuItem, MenuCourse, DietaryFlag, TimelineEvent, TimelineCategory, TrackItem, TrackColumn, Gift, Vendor, VendorStatus, BudgetItem } from './types';

// Raw rows come back from Supabase untyped; this alias is the single sanctioned
// escape hatch at the query boundary — everything past the mappers is typed.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DbRow = Record<string, any>;

// Fall back to a dummy URL/key during static-generation (build) so that the
// module can be loaded without throwing. Real env vars must be set on Vercel
// for runtime calls to work.
type RuntimeSupabaseConfig = { supabaseUrl?: string; supabaseAnonKey?: string };

function getInitialConfig() {
  const injected = typeof window !== 'undefined'
    ? (window as Window & { __SUPABASE_CONFIG__?: RuntimeSupabaseConfig }).__SUPABASE_CONFIG__
    : undefined;
  if (injected) {
    const cfg = injected;
    if (cfg.supabaseUrl && cfg.supabaseAnonKey && !cfg.supabaseUrl.includes('placeholder')) {
      return { url: cfg.supabaseUrl, key: cfg.supabaseAnonKey };
    }
  }
  return {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
    key: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.placeholder.placeholder'
  };
}

const { url: supabaseUrl, key: supabaseAnonKey } = getInitialConfig();

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

const supabaseServiceKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  supabaseAnonKey;

export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    storageKey: 'supabase-admin',
  },
});

// ── Type mappers (DB snake_case ↔ app camelCase) ──────────────────────────────

export function dbToGuest(g: DbRow): Guest {
    return {
        id: g.id,
        householdId: g.household_id,
        firstName: g.first_name,
        lastName: g.last_name,
        rsvpStatus: g.rsvp_status as 'Confirmed' | 'Pending' | 'Regret',
        dietaryRestrictions: g.dietary_restrictions ?? undefined,
        songRequest: g.song_request ?? undefined,
        tags: g.tags ? (g.tags.split(',') as GuestTag[]) : undefined,
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
        dietaryFlags: m.dietary_flags ? m.dietary_flags.split(',').map((f: string) => f.trim()) : [],
        sortOrder: m.sort_order ?? 0,
    };
}

// ── CRUD helpers ──────────────────────────────────────────────────────────────

export async function fetchHouseholds(): Promise<Household[]> {
    const { data, error } = await supabase
        .from('households')
        .select('*, guests(*)')
        .order('created_at', { ascending: false });
    if (error) throw error;
    return (data ?? []).map(dbToHousehold);
}

export async function addHousehold(
    name: string,
    guests: { firstName: string; lastName: string; tags?: GuestTag[] }[]
): Promise<Household> {
    const ts = Date.now();
    const id = `household-${ts}`;
    const qrCode = `WEDU-HH-${ts}`;

    const { error: hhErr } = await supabase
        .from('households')
        .insert({ id, name, qr_code: qrCode });
    if (hhErr) throw hhErr;

    const guestRows = guests.map((g, i) => ({
        id: `guest-${ts}-${i}`,
        household_id: id,
        first_name: g.firstName,
        last_name: g.lastName,
        rsvp_status: 'Pending',
        tags: g.tags && g.tags.length > 0 ? g.tags.join(',') : null,
    }));
    const { error: gErr } = await supabase.from('guests').insert(guestRows);
    if (gErr) throw gErr;

    const { data } = await supabase
        .from('households')
        .select('*, guests(*)')
        .eq('id', id)
        .single();
    return dbToHousehold(data);
}

export async function updateHousehold(
    householdId: string,
    name: string,
    guests: { id?: string; firstName: string; lastName: string; rsvpStatus?: string }[]
): Promise<void> {
    const { error: hhErr } = await supabase
        .from('households')
        .update({ name })
        .eq('id', householdId);
    if (hhErr) throw hhErr;

    // Fetch existing guests to compare and do a differential update
    const { data: existingGuests, error: fetchErr } = await supabase
        .from('guests')
        .select('*')
        .eq('household_id', householdId);
    if (fetchErr) throw fetchErr;

    const existingGuestIds = (existingGuests ?? []).map(g => g.id);
    const newGuestIds = guests.map(g => g.id).filter(Boolean) as string[];

    // 1. Delete guests who are not in the new list
    const idsToDelete = existingGuestIds.filter(id => !newGuestIds.includes(id));
    if (idsToDelete.length > 0) {
        const { error: delErr } = await supabase
            .from('guests')
            .delete()
            .in('id', idsToDelete);
        if (delErr) throw delErr;
    }

    // 2. Separate into inserts and updates
    const ts = Date.now();
    type GuestRow = { id: string; household_id?: string; first_name: string; last_name: string; rsvp_status: string };
    const toInsert: GuestRow[] = [];
    const toUpdate: GuestRow[] = [];

    guests.forEach((g, i) => {
        if (g.id && existingGuestIds.includes(g.id)) {
            toUpdate.push({
                id: g.id,
                first_name: g.firstName,
                last_name: g.lastName,
                rsvp_status: g.rsvpStatus ?? 'Pending',
            });
        } else {
            toInsert.push({
                id: g.id ?? `guest-${ts}-${i}`,
                household_id: householdId,
                first_name: g.firstName,
                last_name: g.lastName,
                rsvp_status: g.rsvpStatus ?? 'Pending',
            });
        }
    });

    // 3. Insert new guests
    if (toInsert.length > 0) {
        const { error: insErr } = await supabase.from('guests').insert(toInsert);
        if (insErr) throw insErr;
    }

    // 4. Update existing guests (update only specific fields to avoid overwriting dietary/song details)
    if (toUpdate.length > 0) {
        const { error: updErr } = await supabase.from('guests').upsert(
            toUpdate.map(g => ({
                id: g.id,
                first_name: g.first_name,
                last_name: g.last_name,
                rsvp_status: g.rsvp_status,
                updated_at: new Date().toISOString(),
            }))
        );
        if (updErr) throw updErr;
    }
}

export async function deleteHousehold(householdId: string): Promise<void> {
    const { error } = await supabase.from('households').delete().eq('id', householdId);
    if (error) throw error;
}

/** Add a single person to an existing household (writes one row to `guests`). */
export async function addGuestToHousehold(
    householdId: string,
    guest: { firstName: string; lastName: string; tags?: GuestTag[] }
): Promise<Guest> {
    const row = {
        id: `guest-${Date.now()}-solo`,
        household_id: householdId,
        first_name: guest.firstName,
        last_name: guest.lastName,
        rsvp_status: 'Pending',
        tags: guest.tags && guest.tags.length > 0 ? guest.tags.join(',') : null,
    };
    const { data, error } = await supabase.from('guests').insert(row).select().single();
    if (error) throw error;
    return dbToGuest(data);
}

export async function updateGuestRsvp(
    guestId: string,
    rsvpStatus: 'Confirmed' | 'Pending' | 'Regret'
): Promise<void> {
    const { error } = await supabase
        .from('guests')
        .update({ rsvp_status: rsvpStatus })
        .eq('id', guestId);
    if (error) throw error;
}

export async function lookupHouseholdByQr(qrCode: string): Promise<Household | null> {
    const { data, error } = await supabase
        .from('households')
        .select('*, guests(*)')
        .eq('qr_code', qrCode)
        .single();
    if (error || !data) return null;
    return dbToHousehold(data);
}

// ── Menu Items ────────────────────────────────────────────────────────────────

export async function fetchMenuItems(): Promise<MenuItem[]> {
    const { data, error } = await supabase
        .from('menu_items')
        .select('*')
        .order('sort_order', { ascending: true });
    if (error) throw error;
    return (data ?? []).map(dbToMenuItem);
}

export async function addMenuItem(
    name: string,
    description: string,
    course: string,
    dietaryFlags: string[] = []
): Promise<MenuItem> {
    const id = `menu-${Date.now()}`;
    const { error } = await supabase.from('menu_items').insert({
        id,
        name,
        description: description || null,
        course,
        dietary_flags: dietaryFlags.length > 0 ? dietaryFlags.join(',') : null,
        sort_order: 0,
    });
    if (error) throw error;
    return {
        id,
        name,
        description: description || '—',
        course: course as MenuCourse,
        dietaryFlags: dietaryFlags as DietaryFlag[],
        sortOrder: 0,
    };
}

export async function deleteMenuItem(id: string): Promise<void> {
    const { error } = await supabase.from('menu_items').delete().eq('id', id);
    if (error) throw error;
}

export async function updateMenuItemsOrder(items: MenuItem[]): Promise<void> {
    const { error } = await supabase.from('menu_items').upsert(
        items.map((item, idx) => ({ id: item.id, sort_order: idx }))
    );
    if (error) throw error;
}

// ── Timeline Events ───────────────────────────────────────────────────────────

export function dbToTimelineEvent(e: DbRow): TimelineEvent {
    return {
        id: e.id,
        time: e.time,
        title: e.title,
        description: e.description ?? '',
        category: e.category as TimelineCategory,
        isPublic: e.is_public ?? true,
        duration: e.duration ?? 30,
        sortOrder: e.sort_order ?? 0,
    };
}

export async function fetchTimelineEvents(): Promise<TimelineEvent[]> {
    const { data, error } = await supabase
        .from('timeline_events')
        .select('*')
        .order('sort_order', { ascending: true });
    if (error) throw error;
    return (data ?? []).map(dbToTimelineEvent);
}

export async function updateTimelineEventsOrder(events: TimelineEvent[]): Promise<void> {
    const { error } = await supabase.from('timeline_events').upsert(
        events.map((e, i) => ({ id: e.id, sort_order: i }))
    );
    if (error) throw error;
}

export async function createTimelineEvent(event: TimelineEvent): Promise<void> {
    const { error } = await supabase.from('timeline_events').insert({
        id: event.id,
        time: event.time,
        title: event.title,
        description: event.description ?? null,
        category: event.category,
        is_public: event.isPublic,
        duration: event.duration ?? null,
        sort_order: event.sortOrder,
    });
    if (error) throw error;
}

export async function updateTimelineEvent(event: TimelineEvent): Promise<void> {
    const { error } = await supabase
        .from('timeline_events')
        .update({
            time: event.time,
            title: event.title,
            description: event.description ?? null,
            category: event.category,
            is_public: event.isPublic,
            duration: event.duration ?? null,
            updated_at: new Date().toISOString(),
        })
        .eq('id', event.id);
    if (error) throw error;
}

export async function deleteTimelineEvent(id: string): Promise<void> {
    const { error } = await supabase.from('timeline_events').delete().eq('id', id);
    if (error) throw error;
}

// ── Tracks (Playlist) ─────────────────────────────────────────────────────────

export function dbToTrackItem(t: DbRow): TrackItem {
    return {
        id: t.id,
        title: t.title,
        artist: t.artist ?? 'Unknown',
        column: t.column as TrackColumn,
        requestedBy: t.requested_by ?? null,
        sortOrder: t.sort_order ?? 0,
    };
}

export async function fetchTracks(): Promise<TrackItem[]> {
    const { data, error } = await supabase
        .from('tracks')
        .select('*')
        .order('sort_order', { ascending: true });
    if (error) throw error;
    return (data ?? []).map(dbToTrackItem);
}

export async function updateTrackColumn(
    trackId: string,
    column: 'must-play' | 'if-time' | 'do-not-play'
): Promise<void> {
    const { error } = await supabase
        .from('tracks')
        .update({ column })
        .eq('id', trackId);
    if (error) throw error;
}

export async function updateTracksOrder(tracks: TrackItem[]): Promise<void> {
    const { error } = await supabase.from('tracks').upsert(
        tracks.map((t, i) => ({ id: t.id, sort_order: i }))
    );
    if (error) throw error;
}

// ── Gifts ─────────────────────────────────────────────────────────────────────

export function dbToGift(g: DbRow): Gift {
    return {
        id: g.id,
        name: g.name,
        price: g.price ?? 0,
        imageUrl: g.image_url ?? '',
        storeUrl: g.store_url ?? '',
        isCrowdfund: g.is_crowdfund ?? false,
        fundedAmount: g.funded_amount ?? 0,
        isPurchased: g.is_purchased ?? false,
    };
}

export async function fetchGifts(): Promise<Gift[]> {
    const { data, error } = await supabase
        .from('gifts')
        .select('*')
        .order('created_at', { ascending: false });
    if (error) throw error;
    return (data ?? []).map(dbToGift);
}

// ── Vendors ───────────────────────────────────────────────────────────────────

export function dbToVendor(v: DbRow): Vendor {
    return {
        id: v.id,
        name: v.name,
        category: v.category,
        contactName: v.contact_name ?? undefined,
        contactEmail: v.contact_email ?? undefined,
        contactPhone: v.contact_phone ?? undefined,
        price: v.price ?? 0,
        status: v.status as VendorStatus,
        depositPaid: v.deposit_paid ?? 0,
    };
}

export async function fetchVendors(): Promise<Vendor[]> {
    const { data, error } = await supabase
        .from('vendors')
        .select('*')
        .order('created_at', { ascending: false });
    if (error) throw error;
    return (data ?? []).map(dbToVendor);
}

export async function addVendor(vendor: Omit<Vendor, 'id'>): Promise<Vendor> {
    const id = `vendor-${Date.now()}`;
    const { error } = await supabase.from('vendors').insert({
        id,
        name: vendor.name,
        category: vendor.category,
        contact_name: vendor.contactName || null,
        contact_email: vendor.contactEmail || null,
        contact_phone: vendor.contactPhone || null,
        price: vendor.price,
        status: vendor.status,
        deposit_paid: vendor.depositPaid || 0,
    });
    if (error) throw error;
    return { ...vendor, id };
}

export async function deleteVendor(id: string): Promise<void> {
    const { error } = await supabase.from('vendors').delete().eq('id', id);
    if (error) throw error;
}

// ── Budget ────────────────────────────────────────────────────────────────────

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
    const { data, error } = await supabase
        .from('budget_items')
        .select('*')
        .order('created_at', { ascending: false });
    if (error) throw error;
    return (data ?? []).map(dbToBudgetItem);
}

export async function addBudgetItem(item: Omit<BudgetItem, 'id'>): Promise<BudgetItem> {
    const id = `budget-${Date.now()}`;
    const { error } = await supabase.from('budget_items').insert({
        id,
        category: item.category,
        name: item.name,
        budgeted: item.budgeted,
        actual: item.actual || 0,
    });
    if (error) throw error;
    return { ...item, id };
}

export async function deleteBudgetItem(id: string): Promise<void> {
    const { error } = await supabase.from('budget_items').delete().eq('id', id);
    if (error) throw error;
}

export async function fetchTotalBudget(): Promise<number> {
    const { data, error } = await supabase
        .from('budget_settings')
        .select('total_budget')
        .eq('id', 'main')
        .maybeSingle();
    if (error) throw error;
    return data?.total_budget ?? 0;
}

export async function updateTotalBudget(totalBudget: number): Promise<void> {
    const { error } = await supabase
        .from('budget_settings')
        .upsert({ id: 'main', total_budget: totalBudget });
    if (error) throw error;
}
