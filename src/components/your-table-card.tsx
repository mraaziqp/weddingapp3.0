'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Armchair, Users } from 'lucide-react';

type Seat = { tableName: string; tableMates: string[] };

/**
 * "You're at Table 6" on the guest's own pass.
 *
 * Renders nothing at all until a seat comes back. Before the couple imports
 * their chart — and for anyone the chart does not name — there is no honest
 * answer to give, and an empty "Your table: —" card on a wedding invitation
 * reads as a mistake rather than as pending information.
 */
export function YourTableCard({ householdId }: { householdId: string }) {
  const [seat, setSeat] = useState<Seat | null>(null);

  useEffect(() => {
    if (!householdId) return;
    let cancelled = false;
    fetch(`/api/seating?householdId=${encodeURIComponent(householdId)}`, { cache: 'no-store' })
      .then(r => (r.ok ? r.json() : null))
      .then(data => { if (!cancelled && data?.seat) setSeat(data.seat); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [householdId]);

  if (!seat) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className="relative overflow-hidden rounded-3xl border border-[#d4af37]/40 bg-gradient-to-br from-[#fffdf8] via-[#fdf6e6] to-[#f7ecd6] p-5 text-center shadow-lg sm:p-6"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full"
        style={{ background: 'radial-gradient(circle, rgba(212,175,55,0.22), transparent 70%)' }}
      />

      <div className="inline-flex items-center gap-1.5 rounded-full border border-[#d4af37]/35 bg-[#d4af37]/15 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-[#8a6f1f]">
        <Armchair size={11} className="text-[#d4af37]" /> Your Seat
      </div>

      <p className="mt-3 font-headline text-4xl italic text-[#1C1C1C] sm:text-5xl">
        {seat.tableName}
      </p>

      {seat.tableMates.length > 0 && (
        <div className="mt-4 border-t border-[#d4af37]/20 pt-4">
          <p className="flex items-center justify-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.15em] text-[#1C1C1C]/45">
            <Users size={11} /> Sharing your table
          </p>
          <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-[#1C1C1C]/70">
            {seat.tableMates.join(' · ')}
          </p>
        </div>
      )}
    </motion.div>
  );
}
