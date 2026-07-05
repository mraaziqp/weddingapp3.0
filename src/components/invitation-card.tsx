'use client';

import { motion } from 'framer-motion';
import { InvitationConfig } from '@/lib/invitation-config';

/* Shared by the guest /invitation page and the admin editor's live preview,
   so what Razia designs in the editor is pixel-for-pixel what guests see. */

export const easeLuxe = [0.16, 1, 0.3, 1] as const;

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.18, delayChildren: 0.35 } },
};

const riseIn = {
  hidden: { opacity: 0, y: 26 },
  show: { opacity: 1, y: 0, transition: { duration: 1.3, ease: easeLuxe } },
};

const drawLine = {
  hidden: { scaleX: 0, opacity: 0 },
  show: { scaleX: 1, opacity: 1, transition: { duration: 1.4, ease: easeLuxe } },
};

/* ─── Floating gold dust ──────────────────────────────────────────────── */
/* Positions derive from the index only, so server and client render the
   exact same markup — no hydration mismatch. */

export function GoldDust({ count = 26 }: { count?: number }) {
  return (
    <div className="pointer-events-none fixed inset-0 z-[5] overflow-hidden" aria-hidden data-print-hide>
      {Array.from({ length: count }).map((_, i) => {
        const left = (i * 37 + 11) % 100;
        const top = (i * 53 + 23) % 100;
        const size = 2 + (i % 3);
        const duration = 9 + (i % 5) * 2.4;
        const delay = (i % 7) * 1.15;
        const drift = ((i % 4) - 1.5) * 14;
        return (
          <motion.span
            key={i}
            className="absolute rounded-full"
            style={{
              left: `${left}%`,
              top: `${top}%`,
              width: size,
              height: size,
              background: 'radial-gradient(circle, rgba(246,231,183,0.95) 0%, rgba(212,175,55,0.55) 55%, transparent 100%)',
              boxShadow: '0 0 8px 2px rgba(212,175,55,0.35)',
            }}
            animate={{
              y: [0, -46, 0],
              x: [0, drift, 0],
              opacity: [0, 0.85, 0],
              scale: [0.6, 1.15, 0.6],
            }}
            transition={{ duration, delay, repeat: Infinity, ease: 'easeInOut' }}
          />
        );
      })}
    </div>
  );
}

/* ─── The 5×7 print-locked invitation card ────────────────────────────── */
/* container-type: inline-size + cqw typography means every element scales
   in exact proportion to the card's width. The layout is pixel-identical
   at any size — on a phone, a desktop, or exported at high-res for print. */

export function InvitationCard({
  config,
  printId = false,
  widthClass = 'w-[min(92vw,520px)]',
}: {
  config: InvitationConfig;
  /** Only the guest page sets this — the print CSS targets the id. */
  printId?: boolean;
  widthClass?: string;
}) {
  // "Abduraziq & Razia" → two names joined by a script ampersand.
  const [nameA, nameB] = config.subtitle.includes('&')
    ? config.subtitle.split('&').map(s => s.trim())
    : [config.subtitle, ''];

  return (
    <motion.div
      variants={stagger}
      initial="hidden"
      animate="show"
      id={printId ? 'invitation-print-card' : undefined}
      className={`relative mx-auto aspect-[5/7] ${widthClass} [container-type:inline-size] overflow-hidden rounded-[2.5cqw] shadow-[0_40px_120px_rgba(0,0,0,0.65),0_0_60px_rgba(212,175,55,0.10)]`}
      style={{
        background:
          'radial-gradient(circle at 50% 0%, rgba(212,175,55,0.10) 0%, transparent 46%),' +
          'radial-gradient(circle at 85% 100%, rgba(15,118,110,0.16) 0%, transparent 52%),' +
          'radial-gradient(circle at 12% 88%, rgba(107,63,143,0.10) 0%, transparent 46%),' +
          'linear-gradient(160deg, #0c1210 0%, #060a09 55%, #04070a 100%)',
      }}
    >
      {/* Foil frame: outer hairline + inner double border with corner flourishes */}
      <div className="pointer-events-none absolute inset-[3cqw] rounded-[1.6cqw] border border-[#d4af37]/45" />
      <div className="pointer-events-none absolute inset-[4.4cqw] rounded-[1.2cqw] border border-[#d4af37]/20" />
      {(['top-0 left-0 border-t-2 border-l-2 rounded-tl-[1.6cqw]', 'top-0 right-0 border-t-2 border-r-2 rounded-tr-[1.6cqw]', 'bottom-0 left-0 border-b-2 border-l-2 rounded-bl-[1.6cqw]', 'bottom-0 right-0 border-b-2 border-r-2 rounded-br-[1.6cqw]'] as const).map(pos => (
        <div
          key={pos}
          className={`pointer-events-none absolute m-[3cqw] h-[7cqw] w-[7cqw] border-[#d4af37]/80 ${pos}`}
        />
      ))}

      {/* Soft sheen sweeping across the card once on entrance */}
      <motion.div
        className="pointer-events-none absolute inset-0"
        initial={{ x: '-130%' }}
        animate={{ x: '130%' }}
        transition={{ delay: 1.6, duration: 2.4, ease: 'easeInOut' }}
        style={{ background: 'linear-gradient(105deg, transparent 42%, rgba(246,231,183,0.09) 50%, transparent 58%)' }}
      />

      {/* Card content */}
      <div className="relative flex h-full flex-col items-center justify-between px-[9cqw] py-[8.5cqw] text-center">
        {/* Monogram seal */}
        <motion.div variants={riseIn} className="flex flex-col items-center gap-[2.2cqw]">
          <div className="relative flex h-[13cqw] w-[13cqw] items-center justify-center rounded-full border border-[#d4af37]/60">
            <div className="absolute inset-[1.1cqw] rounded-full border border-[#d4af37]/25" />
            <span
              className="text-[4.6cqw] text-[#f6e7b7]"
              style={{ fontFamily: "'Cinzel', serif", letterSpacing: '0.08em' }}
            >
              A·R
            </span>
          </div>
          <motion.p
            initial={{ opacity: 0, letterSpacing: '0.55em' }}
            animate={{ opacity: 1, letterSpacing: '0.34em' }}
            transition={{ delay: 0.5, duration: 1.6, ease: easeLuxe }}
            className="text-[2.5cqw] uppercase text-[#d4af37]/85"
            style={{ fontFamily: "'Cinzel', serif" }}
          >
            Together with their families
          </motion.p>
        </motion.div>

        {/* Script flourish + names */}
        <motion.div variants={riseIn} className="flex flex-col items-center">
          <p
            className="text-[7.5cqw] leading-none text-[#e8c96b]"
            style={{ fontFamily: "'Great Vibes', cursive", textShadow: '0 0 24px rgba(212,175,55,0.35)' }}
          >
            {config.title}
          </p>
          <h1
            className="mt-[3.4cqw] text-[10.5cqw] italic leading-[1.18] text-transparent"
            style={{
              fontFamily: "'Playfair Display', serif",
              backgroundImage: 'linear-gradient(115deg, #fdf6dd 0%, #e9cf8a 38%, #d4af37 62%, #f6e7b7 100%)',
              WebkitBackgroundClip: 'text',
              backgroundClip: 'text',
            }}
          >
            {nameA}
            {nameB && (
              <>
                <span
                  className="mx-[2.2cqw] not-italic text-[9cqw] text-[#e8c96b]"
                  style={{ fontFamily: "'Great Vibes', cursive", WebkitTextFillColor: '#e8c96b' }}
                >
                  &amp;
                </span>
                <br />
                {nameB}
              </>
            )}
          </h1>
        </motion.div>

        {/* Divider */}
        <motion.div variants={drawLine} className="luxe-divider w-[62cqw]" />

        {/* Event particulars */}
        <motion.div variants={riseIn} className="flex flex-col items-center gap-[2.6cqw]">
          <p
            className="text-[3.4cqw] uppercase tracking-[0.28em] text-white/90"
            style={{ fontFamily: "'Cinzel', serif" }}
          >
            {config.dateTime}
          </p>
          <p className="font-body text-[3cqw] tracking-[0.14em] text-white/60 uppercase">
            {config.location}
          </p>
          <p className="font-body text-[2.6cqw] tracking-[0.2em] text-[#d4af37]/75 uppercase">
            {config.dressCode}
          </p>
        </motion.div>

        {/* RSVP line */}
        <motion.div variants={riseIn} className="flex flex-col items-center gap-[1.6cqw]">
          <div className="luxe-divider w-[30cqw] opacity-70" />
          <p
            className="text-[2.6cqw] uppercase tracking-[0.3em] text-white/55"
            style={{ fontFamily: "'Cinzel', serif" }}
          >
            Kindly respond by {config.rsvpDeadline}
          </p>
        </motion.div>
      </div>
    </motion.div>
  );
}
