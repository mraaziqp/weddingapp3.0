'use client';

import { useEffect, useState } from 'react';
import { fetchHouseholds } from '@/lib/supabase';
import type { Guest, Household } from '@/lib/types';

/**
 * Live guest list from Supabase — the single source the family intake
 * pages and admin dashboard write to. Replaces the old mock-data imports
 * so planner tools always reflect the real list.
 */
export function useRealGuests() {
  const [households, setHouseholds] = useState<Household[]>([]);
  const [guests, setGuests] = useState<Guest[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchHouseholds()
      .then(hh => {
        setHouseholds(hh);
        setGuests(hh.flatMap(h => h.guests));
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  return { households, guests, isLoading };
}
