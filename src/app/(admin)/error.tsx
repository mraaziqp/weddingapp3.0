'use client';

import { useEffect } from 'react';
import { RefreshCw } from 'lucide-react';

/**
 * Recovery UI for the admin section.
 *
 * Without a boundary here, one throw inside any admin client component takes
 * the whole route down to Next's bare "Application error: a client-side
 * exception has occurred" — a dead page whose only escape is a manual
 * refresh. reset() re-renders the segment in place instead.
 */
export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[Admin] Unhandled error:', error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-5 px-6 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full border border-[#d4af37]/30 bg-[#d4af37]/10">
        <RefreshCw className="h-7 w-7 text-[#f6e7b7]" />
      </div>
      <div className="space-y-2">
        <h2 className="font-headline text-2xl italic text-[#f6e7b7]">Something went wrong on this page</h2>
        <p className="max-w-md text-sm text-white/55">
          Nothing was lost — your guest list and RSVPs are safe. Try again, and if it keeps
          happening let Raaziq know what you were doing at the time.
        </p>
        {error?.message && (
          <p className="mx-auto max-w-md break-words pt-1 font-mono text-[11px] text-white/35">
            {error.message}
          </p>
        )}
      </div>
      <button
        onClick={reset}
        className="flex items-center gap-2 rounded-full border border-[#d4af37]/40 bg-[#122217] px-6 py-3 font-body text-xs uppercase tracking-[0.22em] text-[#f6e7b7] transition-colors hover:bg-[#1a3220]"
      >
        <RefreshCw size={14} /> Try again
      </button>
    </div>
  );
}
