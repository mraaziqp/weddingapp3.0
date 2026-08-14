'use client';

import { useCallback, useEffect, useMemo, useSyncExternalStore } from 'react';
import {
  fetchHouseholds,
  addHousehold as addHouseholdRemote,
  updateHousehold as updateHouseholdRemote,
  deleteHousehold as deleteHouseholdRemote,
  addGuestToHousehold as addGuestToHouseholdRemote,
  updateGuestRsvp as updateGuestRsvpRemote,
} from '@/lib/supabase';
import type { GuestTag, Household } from '@/lib/types';

/**
 * Single shared source of households/guests, backed by a module-level store
 * (not a React Context) so every consumer across route groups — admin pages,
 * the family intake flow, invite tooling — reads and writes the same cache.
 * Without this, each screen fetched the same nested household+guest query
 * independently and had no way to see another screen's edits without a
 * full page reload.
 */
type State = {
  households: Household[];
  isLoading: boolean;
  error: boolean;
};

let state: State = { households: [], isLoading: true, error: false };
let hasFetched = false;
let inFlight: Promise<void> | null = null;
const listeners = new Set<() => void>();

function setState(patch: Partial<State>) {
  state = { ...state, ...patch };
  listeners.forEach(listener => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot() {
  return state;
}

function load() {
  if (inFlight) return inFlight;
  inFlight = fetchHouseholds()
    .then(households => setState({ households, isLoading: false, error: false }))
    .catch(() => setState({ isLoading: false, error: true }))
    .finally(() => {
      inFlight = null;
    });
  return inFlight;
}

export function useRealGuests() {
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  useEffect(() => {
    if (!hasFetched) {
      hasFetched = true;
      load();
    }
  }, []);

  const refetch = useCallback(() => load(), []);

  const addHousehold = useCallback(
    async (name: string, guests: { firstName: string; lastName: string; tags?: GuestTag[] }[]) => {
      const newHousehold = await addHouseholdRemote(name, guests);
      setState({ households: [newHousehold, ...state.households] });
      return newHousehold;
    },
    []
  );

  const updateHousehold = useCallback(
    async (
      householdId: string,
      name: string,
      guests: { id?: string; firstName: string; lastName: string; rsvpStatus?: string }[]
    ) => {
      await updateHouseholdRemote(householdId, name, guests);
      await load();
    },
    []
  );

  const deleteHousehold = useCallback(async (householdId: string) => {
    await deleteHouseholdRemote(householdId);
    setState({ households: state.households.filter(h => h.id !== householdId) });
  }, []);

  const addGuestToHousehold = useCallback(
    async (householdId: string, guest: { firstName: string; lastName: string; tags?: GuestTag[] }) => {
      const newGuest = await addGuestToHouseholdRemote(householdId, guest);
      setState({
        households: state.households.map(h =>
          h.id === householdId ? { ...h, guests: [...h.guests, newGuest] } : h
        ),
      });
      return newGuest;
    },
    []
  );

  const updateGuestRsvp = useCallback(
    async (guestId: string, status: 'Confirmed' | 'Pending' | 'Regret') => {
      const previous = state.households;
      setState({
        households: state.households.map(h => ({
          ...h,
          guests: h.guests.map(g => (g.id === guestId ? { ...g, rsvpStatus: status } : g)),
        })),
      });
      try {
        await updateGuestRsvpRemote(guestId, status);
      } catch (err) {
        setState({ households: previous });
        throw err;
      }
    },
    []
  );

  const guests = useMemo(() => snapshot.households.flatMap(h => h.guests), [snapshot.households]);

  return {
    households: snapshot.households,
    guests,
    isLoading: snapshot.isLoading,
    error: snapshot.error,
    refetch,
    addHousehold,
    updateHousehold,
    deleteHousehold,
    addGuestToHousehold,
    updateGuestRsvp,
  };
}
