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
        {/* Monogram seal or Arched Photo/Video Viewport */}
        <motion.div variants={riseIn} className="flex flex-col items-center gap-[1.8cqw]">
          {config.imageUrl || config.videoUrl ? (
            <div className="relative w-[30cqw] aspect-[4/5] rounded-t-full border border-[#d4af37]/50 p-[0.8cqw] shadow-[0_8px_24px_rgba(0,0,0,0.5)] bg-black/45 overflow-hidden group">
              <div className="relative w-full h-full rounded-t-full overflow-hidden border border-[#d4af37]/20">
                {config.videoUrl ? (
                  <video
                    src={config.videoUrl}
                    autoPlay
                    loop
                    muted
                    playsInline
                    className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={config.imageUrl}
                    alt=""
                    className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                )}
              </div>
              {/* Floating gold seal overlayed near the bottom-right corner of the arch */}
              <div className="absolute bottom-[1.2cqw] right-[1.2cqw] flex h-[6.5cqw] w-[6.5cqw] items-center justify-center rounded-full bg-[#0c1210]/95 border border-[#d4af37]/70 shadow-lg backdrop-blur-md">
                <span className="text-[2cqw] font-headline text-[#f6e7b7] tracking-[0.05em]">A·R</span>
              </div>
            </div>
          ) : (
            <div className="relative flex h-[13cqw] w-[13cqw] items-center justify-center rounded-full border border-[#d4af37]/60">
              <div className="absolute inset-[1.1cqw] rounded-full border border-[#d4af37]/25" />
              <span
                className="text-[4.6cqw] text-[#f6e7b7]"
                style={{ fontFamily: "'Cinzel', serif", letterSpacing: '0.08em' }}
              >
                A·R
              </span>
            </div>
          )}
          <motion.p
            initial={{ opacity: 0, letterSpacing: '0.55em' }}
            animate={{ opacity: 1, letterSpacing: '0.34em' }}
            transition={{ delay: 0.5, duration: 1.6, ease: easeLuxe }}
            className="text-[2.3cqw] uppercase text-[#d4af37]/85"
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

/* ─── The cream "Gifting" enclosure card ─────────────────────────────── */
/* Digital twin of the physical gifting card: cream paper, henna-style
   corner mandalas, script heading, the family's poem in elegant serif.
   Same container-query trick as the invitation card, so it scales in
   perfect proportion at any size. */

function HennaCorner({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 100 100"
      className={className}
      aria-hidden
      fill="none"
      stroke="currentColor"
    >
      {/* quarter mandala fan */}
      <circle cx="0" cy="0" r="46" strokeWidth="1.4" />
      <circle cx="0" cy="0" r="40" strokeWidth="1" strokeDasharray="1.5 3.5" />
      <circle cx="0" cy="0" r="28" strokeWidth="1.2" />
      <circle cx="0" cy="0" r="22" strokeWidth="0.9" strokeDasharray="1 3" />
      {/* petals between r28 and r46 */}
      {Array.from({ length: 6 }).map((_, i) => {
        const a = (i + 0.5) * (Math.PI / 2 / 6);
        const x1 = Math.cos(a) * 28, y1 = Math.sin(a) * 28;
        const xm = Math.cos(a) * 42, ym = Math.sin(a) * 42;
        const spread = 0.09;
        const xa = Math.cos(a - spread) * 34, ya = Math.sin(a - spread) * 34;
        const xb = Math.cos(a + spread) * 34, yb = Math.sin(a + spread) * 34;
        return (
          <path
            key={i}
            d={`M ${x1} ${y1} Q ${xa} ${ya} ${xm} ${ym} Q ${xb} ${yb} ${x1} ${y1}`}
            strokeWidth="1"
          />
        );
      })}
      {/* dots on the outer rim */}
      {Array.from({ length: 5 }).map((_, i) => {
        const a = (i + 0.5) * (Math.PI / 2 / 5);
        return (
          <circle
            key={`d${i}`}
            cx={Math.cos(a) * 52}
            cy={Math.sin(a) * 52}
            r="1.6"
            fill="currentColor"
            stroke="none"
          />
        );
      })}
      {/* paisley curl trailing off the mandala */}
      <path d="M 46 20 q 26 2 30 24 q -14 -6 -22 -14 q -6 -6 -8 -10" strokeWidth="1.1" />
      <path d="M 20 46 q 2 26 24 30 q -6 -14 -14 -22 q -6 -6 -10 -8" strokeWidth="1.1" />
      <circle cx="70" cy="38" r="1.5" fill="currentColor" stroke="none" />
      <circle cx="38" cy="70" r="1.5" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function GiftingCard({
  poem,
  widthClass = 'w-[min(92vw,520px)]',
}: {
  poem: string;
  widthClass?: string;
}) {
  return (
    <div
      className={`relative mx-auto ${widthClass} [container-type:inline-size] overflow-hidden rounded-[2cqw] shadow-[0_30px_90px_rgba(0,0,0,0.55),0_0_40px_rgba(212,175,55,0.08)]`}
      style={{
        background:
          'radial-gradient(circle at 50% 8%, rgba(255,252,244,1) 0%, rgba(250,243,229,1) 55%, rgba(242,232,212,1) 100%)',
      }}
    >
      {/* paper grain */}
      <div className="pointer-events-none absolute inset-0 opacity-[0.35] mix-blend-multiply bg-[url('data:image/svg+xml,%3Csvg%20viewBox%3D%220%200%20700%20700%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cfilter%20id%3D%22p%22%3E%3CfeTurbulence%20type%3D%22fractalNoise%22%20baseFrequency%3D%220.9%22%20numOctaves%3D%222%22%20stitchTiles%3D%22stitch%22%2F%3E%3C%2Ffilter%3E%3Crect%20width%3D%22100%25%22%20height%3D%22100%25%22%20filter%3D%22url(%23p)%22%20opacity%3D%220.35%22%2F%3E%3C%2Fsvg%3E')]" />

      {/* hairline gold frame */}
      <div className="pointer-events-none absolute inset-[2.6cqw] rounded-[1.2cqw] border border-[#b49254]/40" />

      {/* henna corner mandalas */}
      <div className="pointer-events-none absolute left-[1cqw] top-[1cqw] h-[24cqw] w-[24cqw] text-[#a08a5f]/55">
        <HennaCorner className="h-full w-full" />
      </div>
      <div className="pointer-events-none absolute right-[1cqw] top-[1cqw] h-[24cqw] w-[24cqw] scale-x-[-1] text-[#a08a5f]/55">
        <HennaCorner className="h-full w-full" />
      </div>
      <div className="pointer-events-none absolute bottom-[1cqw] left-[1cqw] h-[24cqw] w-[24cqw] scale-y-[-1] text-[#a08a5f]/55">
        <HennaCorner className="h-full w-full" />
      </div>
      <div className="pointer-events-none absolute bottom-[1cqw] right-[1cqw] h-[24cqw] w-[24cqw] scale-x-[-1] scale-y-[-1] text-[#a08a5f]/55">
        <HennaCorner className="h-full w-full" />
      </div>

      {/* content */}
      <div className="relative flex flex-col items-center px-[13cqw] py-[9cqw] text-center">
        <p
          className="text-[11cqw] leading-none text-[#8a6f3c]"
          style={{ fontFamily: "'Great Vibes', cursive", textShadow: '0 1px 0 rgba(255,255,255,0.6)' }}
        >
          Gifting
        </p>

        {/* small flourish divider */}
        <div className="mt-[3cqw] flex items-center gap-[2cqw] text-[#b49254]">
          <div className="h-px w-[10cqw] bg-gradient-to-r from-transparent to-[#b49254]/70" />
          <svg viewBox="0 0 24 24" className="h-[2.6cqw] w-[2.6cqw]" fill="currentColor" aria-hidden>
            <path d="M12 21s-6.7-4.3-9.3-8.4C.8 9.5 2.3 5.6 5.7 5.1c2-.3 3.9.8 4.9 2.6l1.4 2.3 1.4-2.3c1-1.8 2.9-2.9 4.9-2.6 3.4.5 4.9 4.4 3 7.5C18.7 16.7 12 21 12 21z" />
          </svg>
          <div className="h-px w-[10cqw] bg-gradient-to-l from-transparent to-[#b49254]/70" />
        </div>

        <p
          className="mt-[4.5cqw] whitespace-pre-line text-[3.9cqw] italic leading-[1.85] text-[#4c4436]"
          style={{ fontFamily: "'Playfair Display', serif" }}
        >
          {poem}
        </p>
      </div>
    </div>
  );
}
