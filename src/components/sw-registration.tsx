'use client';

import { useEffect } from 'react';

/**
 * Registers the PWA service worker after the page loads.
 * Renders nothing — purely a side-effect component.
 */
export function SwRegistration() {
  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').then((registration) => {
        registration.update().catch(() => {});

        if (registration.waiting) {
          registration.waiting.postMessage({ type: 'SKIP_WAITING' });
        }
      }).catch(() => {
        // SW registration failure is non-fatal; app works without it.
      });
    }
  }, []);

  return null;
}
