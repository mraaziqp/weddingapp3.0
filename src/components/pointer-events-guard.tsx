'use client';

import { useEffect } from 'react';

/**
 * Releases the page when Radix leaves it locked.
 *
 * Radix sets `pointer-events: none` on <body> while a modal layer (Dialog,
 * AlertDialog, Select, DropdownMenu, Popover…) is open, and clears it on
 * close. When two of those open/close cycles overlap — submitting a form that
 * programmatically closes its dialog while a toast mounts, or opening one
 * dialog straight after another — the restore gets skipped and the style
 * sticks. The page then looks completely normal but ignores every click,
 * which is the "it froze and I had to refresh" bug.
 *
 * This watches for that precise state — body locked, but nothing actually
 * open — and releases it. It deliberately does nothing while a layer really
 * is open, so it never fights Radix's own (correct) locking.
 */

/** Anything that legitimately justifies the body being locked. */
const OPEN_LAYER_SELECTOR = [
  '[data-radix-popper-content-wrapper]',
  '[role="dialog"]',
  '[role="alertdialog"]',
  '[role="listbox"]',
  '[role="menu"]',
].join(',');

export function PointerEventsGuard() {
  useEffect(() => {
    const release = () => {
      if (document.body.style.pointerEvents !== 'none') return;
      // Something genuinely is open (or still animating out) — leave it alone.
      if (document.querySelector(OPEN_LAYER_SELECTOR)) return;
      document.body.style.removeProperty('pointer-events');
    };

    // React to Radix touching the body, but let it finish its own cleanup
    // first so we only step in once it has actually failed to.
    const observer = new MutationObserver(() => {
      requestAnimationFrame(release);
    });
    observer.observe(document.body, { attributes: true, attributeFilter: ['style'] });

    // Safety net: a layer can be torn down inside a portal without the body's
    // own attributes changing again, so nothing would re-trigger the observer.
    const interval = window.setInterval(release, 400);

    return () => {
      observer.disconnect();
      window.clearInterval(interval);
    };
  }, []);

  return null;
}
