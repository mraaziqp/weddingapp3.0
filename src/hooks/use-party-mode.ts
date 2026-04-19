'use client';
import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'wedu_party_mode';
const DISPATCH_EVENT = 'wedu:partyMode';

/**
 * Reads/writes Party Mode from localStorage.
 * Same-tab updates fire a custom DOM event so all mounted consumers re-render.
 * Cross-tab updates are received via the native storage event.
 */
export function usePartyMode() {
  const [partyMode, setPartyModeState] = useState(false);

  useEffect(() => {
    // Hydrate from localStorage after mount (avoids SSR mismatch)
    setPartyModeState(localStorage.getItem(STORAGE_KEY) === 'true');

    const handleCustom = (e: Event) => {
      setPartyModeState((e as CustomEvent<boolean>).detail);
    };
    // Cross-tab: native storage event fires automatically
    const handleStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) setPartyModeState(e.newValue === 'true');
    };

    window.addEventListener(DISPATCH_EVENT, handleCustom);
    window.addEventListener('storage', handleStorage);
    return () => {
      window.removeEventListener(DISPATCH_EVENT, handleCustom);
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  const setPartyMode = useCallback((value: boolean) => {
    localStorage.setItem(STORAGE_KEY, String(value));
    setPartyModeState(value);
    // Notify same-tab listeners
    window.dispatchEvent(new CustomEvent<boolean>(DISPATCH_EVENT, { detail: value }));
  }, []);

  return { partyMode, setPartyMode };
}
