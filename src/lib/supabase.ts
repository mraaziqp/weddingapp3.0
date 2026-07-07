import { createClient } from '@supabase/supabase-js';
import type { Guest, GuestTag, Household, MenuItem, TimelineEvent, TrackItem, Gift } from './types';

// Fall back to a dummy URL/key during static-generation (build) so that the
// module can be loaded without throwing. Real env vars must be set on Vercel
// for runtime calls to work.
function getInitialConfig() {
  if (typeof window !== 'undefined' && (window as any).__SUPABASE_CONFIG__) {
    const cfg = (window as any).__SUPABASE_CONFIG__;
    if (cfg.supabaseUrl && !cfg.supabaseUrl.includes('placeholder')) {
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

export function dbToGuest(g: Record<string, any>): Guest {
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

export function dbToHousehold(h: Record<string, any>): Household {
    return {
        id: h.id,
        name: h.name,
        address: '',
        qrCode: h.qr_code,
        guests: (h.guests ?? []).map(dbToGuest),
    };
}

export function dbToMenuItem(m: Record<string, any>): MenuItem {
    return {
        id: m.id,
        name: m.name,
        description: m.description ?? '—',
        course: m.course as any,
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
    const toInsert: any[] = [];
    const toUpdate: any[] = [];

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
    for (const g of toUpdate) {
        const { error: updErr } = await supabase
            .from('guests')
            .update({
                first_name: g.first_name,
                last_name: g.last_name,
                rsvp_status: g.rsvp_status,
                updated_at: new Date().toISOString(),
            })
            .eq('id', g.id);
        if (updErr) throw updErr;
    }
}

export async function deleteHousehold(householdId: string): Promise<void> {
    const { error } = await supabase.from('households').delete().eq('id', householdId);
    if (error) throw error;
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
        course: course as any,
        dietaryFlags: (dietaryFlags as any[]) as any,
        sortOrder: 0,
    };
}

export async function deleteMenuItem(id: string): Promise<void> {
    const { error } = await supabase.from('menu_items').delete().eq('id', id);
    if (error) throw error;
}

export async function updateMenuItemsOrder(items: MenuItem[]): Promise<void> {
    const updates = items.map((item, idx) => ({
        id: item.id,
        sort_order: idx,
    }));
    for (const update of updates) {
        const { error } = await supabase
            .from('menu_items')
            .update({ sort_order: update.sort_order })
            .eq('id', update.id);
        if (error) throw error;
    }
}

// ── Timeline Events ───────────────────────────────────────────────────────────

export function dbToTimelineEvent(e: Record<string, any>): TimelineEvent {
    return {
        id: e.id,
        time: e.time,
        title: e.title,
        description: e.description ?? '',
        category: e.category as any,
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
    for (let i = 0; i < events.length; i++) {
        const { error } = await supabase
            .from('timeline_events')
            .update({ sort_order: i })
            .eq('id', events[i].id);
        if (error) throw error;
    }
}

// ── Tracks (Playlist) ─────────────────────────────────────────────────────────

export function dbToTrackItem(t: Record<string, any>): TrackItem {
    return {
        id: t.id,
        title: t.title,
        artist: t.artist ?? 'Unknown',
        column: t.column as any,
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
    for (let i = 0; i < tracks.length; i++) {
        const { error } = await supabase
            .from('tracks')
            .update({ sort_order: i })
            .eq('id', tracks[i].id);
        if (error) throw error;
    }
}

// ── Gifts ─────────────────────────────────────────────────────────────────────

export function dbToGift(g: Record<string, any>): Gift {
    return {
        id: g.id,
        name: g.name,
        price: g.price ?? 0,
        imageUrl: g.image_url ?? '',
        storeUrl: g.store_url ?? '',
        isCrowdfund: g.is_crowdfund ?? false,
        fundedAmount: g.funded_amount ?? 0,
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
