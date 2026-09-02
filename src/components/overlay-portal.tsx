'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';

/**
 * Renders a full-screen overlay into document.body.
 *
 * `position: fixed` is resolved against the nearest ancestor that establishes a
 * containing block, and `transform`, `filter`, `backdrop-filter`, `perspective`
 * and `will-change` all do that. This app's look is built from exactly those
 * properties — glass cards, aurora blurs, framer-motion transitions — so a
 * single page can carry well over a hundred of them.
 *
 * A modal rendered in place therefore stops being full-screen without warning:
 * the memory-wall lightbox inherited a blurred card's box and measured
 * 862×9801 starting above the fold, so the photo it was centring sat thousands
 * of pixels below the viewport and guests saw only a dark sheet they could not
 * scroll past. Nothing in the modal's own markup hints at it, and it appears
 * only once the modal is nested under the wrong parent — which is why every
 * overlay goes through here rather than being fixed case by case.
 */
export function OverlayPortal({ children }: { children: React.ReactNode }) {
  // Portals need a DOM to target, so the first client render matches the
  // server's empty output and the overlay is attached immediately after.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) return null;
  return createPortal(children, document.body);
}

/** Freezes the page behind an open overlay. Pass `false` to release it. */
export function useBodyScrollLock(active: boolean) {
  useEffect(() => {
    if (!active) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [active]);
}
