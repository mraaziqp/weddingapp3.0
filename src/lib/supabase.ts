import { createClient } from '@supabase/supabase-js';
import type { Guest, Household } from './types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

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
        tags: g.tags ?? undefined,
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
    guests: { firstName: string; lastName: string }[]
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

    // Delete all existing guests and re-insert (simplest approach)
    await supabase.from('guests').delete().eq('household_id', householdId);
    const ts = Date.now();
    const guestRows = guests.map((g, i) => ({
        id: g.id ?? `guest-${ts}-${i}`,
        household_id: householdId,
        first_name: g.firstName,
        last_name: g.lastName,
        rsvp_status: g.rsvpStatus ?? 'Pending',
    }));
    const { error: gErr } = await supabase.from('guests').insert(guestRows);
    if (gErr) throw gErr;
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
