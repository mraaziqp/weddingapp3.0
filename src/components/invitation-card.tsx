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

/* ─── Ambient drifting petals: a soft, continuous botanical layer behind
   the whole page (distinct from GoldDust's sparkle and any one-off burst
   on open). Positions/durations derive from index only — same markup on
   server and client, no hydration mismatch. ─────────────────────────── */
export function PetalDrift({ count = 10 }: { count?: number }) {
  const petals = ['🌸', '🌺', '🌼', '🌷'];
  return (
    <div className="pointer-events-none fixed inset-0 z-[4] overflow-hidden" aria-hidden data-print-hide>
      {Array.from({ length: count }).map((_, i) => {
        const left = (i * 53 + 7) % 100;
        const size = 14 + (i % 3) * 5;
        const duration = 16 + (i % 5) * 4;
        const delay = (i % 6) * 2.4;
        const drift = ((i % 3) - 1) * 40;
        return (
          <motion.span
            key={i}
            className="absolute select-none opacity-0"
            style={{ left: `${left}%`, top: '-8%', fontSize: size }}
            animate={{
              y: ['0vh', '112vh'],
              x: [0, drift],
              rotate: [0, i % 2 === 0 ? 200 : -200],
              opacity: [0, 0.55, 0.55, 0],
            }}
            transition={{ duration, delay, repeat: Infinity, ease: 'linear' }}
          >
            {petals[i % petals.length]}
          </motion.span>
        );
      })}
    </div>
  );
}

/* ─── Small botanical accents (bells + flourish) ──────────────────────── */

export function WeddingBells({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 40" className={className} fill="none" stroke="currentColor" strokeWidth="1.3" aria-hidden>
      {/* ribbon bow at center */}
      <path d="M32 3c-3 0-5.5 2-5.5 2s2.5 2 5.5 2 5.5-2 5.5-2-2.5-2-5.5-2z" fill="currentColor" stroke="none" opacity="0.9" />
      <circle cx="32" cy="5" r="1.1" fill="currentColor" stroke="none" />
      <path d="M32 7v4" />
      {/* left bell */}
      <path d="M14 13.5c0-5 4-9 9-9" strokeLinecap="round" />
      <path d="M23 4.5c5 0 9 4 9 9v6.2c0 1.8 0.9 2.8 1.8 3.6H12.2c0.9-0.8 1.8-1.8 1.8-3.6v-6.2z" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="23" cy="26.3" r="1.5" fill="currentColor" stroke="none" />
      <path d="M17.5 28.3c1.3 2.3 3.6 3.7 5.5 3.7s4.2-1.4 5.5-3.7" strokeLinecap="round" />
      {/* right bell (mirrored) */}
      <g transform="translate(64,0) scale(-1,1)">
        <path d="M14 13.5c0-5 4-9 9-9" strokeLinecap="round" />
        <path d="M23 4.5c5 0 9 4 9 9v6.2c0 1.8 0.9 2.8 1.8 3.6H12.2c0.9-0.8 1.8-1.8 1.8-3.6v-6.2z" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="23" cy="26.3" r="1.5" fill="currentColor" stroke="none" />
        <path d="M17.5 28.3c1.3 2.3 3.6 3.7 5.5 3.7s4.2-1.4 5.5-3.7" strokeLinecap="round" />
      </g>
    </svg>
  );
}

/* A tiny trailing sprig — three petals off a curved stem — used to flank
   the ampersand and frame small details without competing with the photo. */
export function FlowerSprig({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.1" aria-hidden>
      <path d="M2 20c8-2 14-8 20-16" strokeLinecap="round" />
      {[[10, 15], [16, 10], [22, 6]].map(([x, y], i) => (
        <g key={i} transform={`translate(${x} ${y})`}>
          <ellipse cx="0" cy="0" rx="3.2" ry="2" fill="currentColor" stroke="none" opacity="0.85" transform="rotate(-30)" />
          <ellipse cx="1.6" cy="-1.6" rx="2.6" ry="1.7" fill="currentColor" stroke="none" opacity="0.7" transform="rotate(10)" />
        </g>
      ))}
    </svg>
  );
}

/* ─── The 5×7 print-locked invitation card ────────────────────────────── */
/* container-type: inline-size + cqw typography means every element scales
   in exact proportion to the card's width. The layout is pixel-identical
   at any size — on a phone, a desktop, or exported at high-res for print. */

export function InvitationCard({
  config: _config,
  printId = false,
  widthClass = 'w-full sm:w-[500px] md:w-[540px]',
  guestName,
  nikkahOnly = false,
  id,
}: {
  config: InvitationConfig;
  /** Only the guest page sets this — the print CSS targets the id. */
  printId?: boolean;
  widthClass?: string;
  guestName?: string;
  /** Drops the Reception column and any personalization — a single generic
   * card for the Nikaah alone, safe to share with anyone. */
  nikkahOnly?: boolean;
  id?: string;
}) {
  const theme = _config.theme || 'classic-botanical';
  if (theme === 'navy-royal') {
    return (
      <NavyRoyalCard
        config={_config}
        printId={printId}
        widthClass={widthClass}
        guestName={guestName}
        nikkahOnly={nikkahOnly}
        id={id}
      />
    );
  }

  return (
    <motion.div
      variants={stagger}
      initial="hidden"
      animate="show"
      id={id || (printId ? 'invitation-print-card' : undefined)}
      className={`relative mx-auto aspect-[5/7] ${widthClass} [container-type:inline-size] overflow-hidden rounded-[2.5cqw] shadow-[0_30px_90px_rgba(0,0,0,0.25)]`}
      style={{
        backgroundImage: 'url("/villa-courtyard.jpg")',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      {/* Light elegant overlay to soften the watercolor sketch and make text pop */}
      <div className="absolute inset-0 bg-[#faf8f5]/82 z-0 pointer-events-none" />

      {/* Decorative Wedding Flowers in the corners (framing the card) */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/wedding-flowers.png"
        alt=""
        className="absolute top-[-4cqw] left-[-4cqw] w-[34cqw] select-none pointer-events-none opacity-90 rotate-[-12deg] z-10"
        style={{ mixBlendMode: 'multiply' }}
      />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/wedding-flowers.png"
        alt=""
        className="absolute top-[-4cqw] right-[-4cqw] w-[34cqw] select-none pointer-events-none opacity-90 scale-x-[-1] rotate-[12deg] z-10"
        style={{ mixBlendMode: 'multiply' }}
      />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/wedding-flowers.png"
        alt=""
        className="absolute bottom-[-5cqw] left-[-5cqw] w-[36cqw] select-none pointer-events-none opacity-90 scale-y-[-1] rotate-[12deg] z-10"
        style={{ mixBlendMode: 'multiply' }}
      />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/wedding-flowers.png"
        alt=""
        className="absolute bottom-[-5cqw] right-[-5cqw] w-[36cqw] select-none pointer-events-none opacity-90 scale-[-1] rotate-[-12deg] z-10"
        style={{ mixBlendMode: 'multiply' }}
      />

      {/* Card content — vertically composed and centered with compact spacing */}
      <div className="relative flex h-full flex-col items-center justify-center gap-[2.5cqw] px-[8.5cqw] py-[5.5cqw] text-center z-20">
        
        {/* Arabic Calligraphy and Translation */}
        <motion.div variants={riseIn} className="flex flex-col items-center">
          <p
            className="text-[6.8cqw] font-bold leading-none text-[#122217] select-none"
            style={{ fontFamily: "'Amiri', serif" }}
          >
            بِسْمِ اللهِ الرَّحْمٰنِ الرَّحِيْمِ
          </p>
          <p
            className="mt-[1cqw] text-[1.8cqw] font-bold uppercase tracking-[0.14em] text-[#2e3b32] max-w-[52cqw] leading-relaxed"
            style={{ fontFamily: "'Playfair Display', serif" }}
          >
            In The Name of Allah, <br />
            The Most Gracious, The Most Merciful
          </p>
        </motion.div>

        {/* Divider */}
        <motion.div variants={drawLine} className="h-px bg-gradient-to-r from-transparent via-[#122217]/28 to-transparent w-[80cqw]" />

        {/* Families Invitation Header */}
        <motion.p
          variants={riseIn}
          className="text-[2.3cqw] leading-[1.6] text-[#122217] max-w-[80cqw] font-bold"
          style={{ fontFamily: "'Playfair Display', serif" }}
        >
          The Parker and Shade Families Request The Honour Of Your Presence At <br />
          <span className="font-extrabold text-[#083d1c]">
            The Nikaah Ceremony{nikkahOnly ? '' : ' and Reception'}
          </span> of:
        </motion.p>

        {/* Groom & Bride Section */}
        <motion.div variants={riseIn} className="flex flex-col items-center w-full">
          {/* Groom: Abduraziq Parker */}
          <div className="flex flex-col items-center">
            <h1
              className="text-[7.2cqw] leading-none text-[#083d1c] font-bold italic"
              style={{ fontFamily: "'Great Vibes', cursive" }}
            >
              Abduraziq Parker
            </h1>
            <p
              className="mt-[0.6cqw] text-[2.3cqw] font-semibold text-[#2e3b32]"
              style={{ fontFamily: "'Playfair Display', serif" }}
            >
              son of Abdussataar and Shanaaz Parker
            </p>
          </div>

          {/* Script Ampersand, flanked by tiny flower sprigs */}
          <span className="flex items-center gap-[1.4cqw] my-[0.3cqw]">
            <FlowerSprig className="h-[2.4cqw] w-[4cqw] text-[#7a8f6a]/70 scale-x-[-1]" />
            <span
              className="text-[4.8cqw] text-[#083d1c] font-bold"
              style={{ fontFamily: "'Great Vibes', cursive" }}
            >
              &amp;
            </span>
            <FlowerSprig className="h-[2.4cqw] w-[4cqw] text-[#7a8f6a]/70" />
          </span>

          {/* Bride: Razia Shade */}
          <div className="flex flex-col items-center">
            <h1
              className="text-[7.2cqw] leading-none text-[#083d1c] font-bold italic"
              style={{ fontFamily: "'Great Vibes', cursive" }}
            >
              Razia Shade
            </h1>
            <p
              className="mt-[0.6cqw] text-[2.3cqw] font-semibold text-[#2e3b32]"
              style={{ fontFamily: "'Playfair Display', serif" }}
            >
              daughter of Sabri and Samalika Shade
            </p>
          </div>
        </motion.div>

        {/* Wedding bells flourish, tying the couple to the ceremony details */}
        <motion.div variants={riseIn}>
          <WeddingBells className="h-[3.4cqw] w-[5.4cqw] text-[#8a6f1f]/75" />
        </motion.div>

        {/* Details Grid — both Nikaah & Reception normally, or just the
            Nikaah alone (centered, full width) for the generic share card */}
        <motion.div
          variants={riseIn}
          className={`w-full gap-[3.5cqw] border-t border-b border-[#122217]/28 py-[1.8cqw] ${nikkahOnly ? 'flex justify-center' : 'grid grid-cols-2'}`}
        >
          {/* Nikaah Column */}
          <div className={`flex flex-col items-center text-center space-y-[1cqw] ${nikkahOnly ? '' : 'border-r border-[#122217]/28 pr-[1.5cqw]'}`}>
            <h3
              className="text-[2.6cqw] font-extrabold tracking-[0.15em] text-[#122217]"
              style={{ fontFamily: "'Cinzel', serif" }}
            >
              NIKAAH
            </h3>
            <div className="h-px bg-[#122217]/28 w-[10cqw]" />
            <p
              className="text-[2.2cqw] font-bold text-[#122217]"
              style={{ fontFamily: "'Playfair Display', serif" }}
            >
              6 September 2026
            </p>
            <p
              className="text-[2.2cqw] font-extrabold text-[#122217]"
              style={{ fontFamily: "'Playfair Display', serif" }}
            >
              10h00
            </p>
            <div className="h-px bg-[#122217]/28 w-[10cqw]" />
            <p
              className="text-[2cqw] text-[#2e3b32] font-semibold italic leading-snug"
              style={{ fontFamily: "'Playfair Display', serif" }}
            >
              Masjidul Quds Mosque<br />
              Rylands
            </p>
          </div>

          {/* Reception Column — omitted entirely on the generic Nikaah-only card */}
          {!nikkahOnly && (
            <div className="flex flex-col items-center text-center space-y-[1cqw] pl-[1.5cqw]">
              <h3
                className="text-[2.6cqw] font-extrabold tracking-[0.15em] text-[#122217]"
                style={{ fontFamily: "'Cinzel', serif" }}
              >
                RECEPTION
              </h3>
              <div className="h-px bg-[#122217]/28 w-[10cqw]" />
              <p
                className="text-[2.2cqw] font-bold text-[#122217]"
                style={{ fontFamily: "'Playfair Display', serif" }}
              >
                6 September 2026
              </p>
              <p
                className="text-[1.75cqw] font-extrabold text-[#122217]"
                style={{ fontFamily: "'Playfair Display', serif" }}
              >
                5:00 PM for 5:30 PM
              </p>
              <div className="h-px bg-[#122217]/28 w-[10cqw]" />
              <p
                className="text-[2cqw] text-[#2e3b32] font-semibold italic leading-snug"
                style={{ fontFamily: "'Playfair Display', serif" }}
              >
                Tuscany Hall, Rylands<br />
                2 Jane Avenue, Gatesville
              </p>
            </div>
          )}
        </motion.div>

        {/* Islamic Date & Quranic Verse */}
        <motion.div variants={riseIn} className="flex flex-col items-center gap-[0.8cqw]">
          <p
            className="text-[2.4cqw] font-extrabold tracking-[0.08em] text-[#122217]"
            style={{ fontFamily: "'Cinzel', serif" }}
          >
            24 RABĪ&apos; AL-AWWAL 1448
          </p>
          <div className="flex flex-col items-center">
            <p
              className="text-[2.4cqw] italic text-[#083d1c] font-bold"
              style={{ fontFamily: "'Playfair Display', serif" }}
            >
              &ldquo;And We created you in pairs&rdquo;
            </p>
            <p
              className="text-[2cqw] text-[#455249] font-medium mt-[0.2cqw]"
              style={{ fontFamily: "'Playfair Display', serif" }}
            >
              (Surah 78, verse 8)
            </p>
          </div>
        </motion.div>

        {/* Personalized Guest Name — never shown on the generic Nikaah-only
            card, which is meant to be sent to anyone, not one household */}
        {guestName && !nikkahOnly && (
          <motion.div
            variants={riseIn}
            className="flex flex-col items-center"
          >
            <p
              className="text-[3.6cqw] font-extrabold text-[#122217] tracking-wide uppercase"
              style={{ fontFamily: "'Playfair Display', serif" }}
            >
              {guestName}
            </p>
          </motion.div>
        )}

        {/* RSVP Section */}
        {!nikkahOnly && (
          <motion.div variants={riseIn} className="flex flex-col items-center gap-[0.5cqw] w-full">
            <span className="flex items-center gap-[1.6cqw] mb-[0.3cqw]">
              <FlowerSprig className="h-[2cqw] w-[3.4cqw] text-[#8a6f1f]/55 scale-x-[-1] rotate-180" />
              <FlowerSprig className="h-[2cqw] w-[3.4cqw] text-[#8a6f1f]/55 rotate-180" />
            </span>
            <p
              className="text-[2.4cqw] font-extrabold tracking-[0.08em] text-[#122217]"
              style={{ fontFamily: "'Cinzel', serif" }}
            >
              Kindly RSVP by 14 August 2026
            </p>
            <div className="flex justify-center gap-[3.5cqw] text-[2.1cqw] text-[#2e3b32] font-bold" style={{ fontFamily: "'Playfair Display', serif" }}>
              <span>Shanaaz Parker: 0718665122</span>
              <span>Ayaaz Parker: 0718665123</span>
            </div>
            <p
              className="text-[1.8cqw] font-bold tracking-[0.12em] text-[#083d1c] uppercase mt-[0.8cqw]"
              style={{ fontFamily: "'Playfair Display', serif" }}
            >
              Please accept this as a personal invitation
            </p>
          </motion.div>
        )}

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

/* ─── Elegant Navy & Gold Line Art Card (Style 2) ───────────────────────── */
export function NavyRoyalCard({
  config: _config,
  printId = false,
  widthClass = 'w-full sm:w-[500px] md:w-[540px]',
  guestName,
  nikkahOnly = false,
  id,
}: {
  config: InvitationConfig;
  printId?: boolean;
  widthClass?: string;
  guestName?: string;
  nikkahOnly?: boolean;
  id?: string;
}) {
  return (
    <motion.div
      variants={stagger}
      initial="hidden"
      animate="show"
      id={id || (printId ? 'invitation-print-card' : undefined)}
      className={`relative mx-auto aspect-[5/7] ${widthClass} [container-type:inline-size] overflow-hidden rounded-[2.5cqw] shadow-[0_30px_90px_rgba(0,0,0,0.18)] bg-[#fcfbfa] border border-[#d4af37]/20`}
      style={{
        background: 'radial-gradient(circle at center, #fdfcfb 0%, #faf8f5 60%, #f4eee1 100%)'
      }}
    >
      {/* Subtly textured background paper grain overlay */}
      <div 
        className="absolute inset-0 opacity-[0.03] pointer-events-none mix-blend-overlay z-0" 
        style={{
          backgroundImage: 'radial-gradient(#000 1px, transparent 1px)',
          backgroundSize: '4px 4px'
        }}
      />

      {/* Gold Line Art Flowers framing the Navy & Gold card */}
      <GoldLineArtFlower className="absolute top-[-4cqw] left-[-6cqw] w-[46cqw] h-[46cqw] select-none pointer-events-none opacity-[0.38] rotate-[15deg] z-10" />
      <GoldLineArtFlower className="absolute bottom-[-10cqw] right-[-6cqw] w-[50cqw] h-[50cqw] select-none pointer-events-none opacity-[0.38] rotate-[-45deg] scale-x-[-1] z-10" />

      {/* Card content — vertically composed with spaced classic roman typography */}
      <div className="relative flex h-full flex-col items-center justify-between px-[8.5cqw] py-[6cqw] text-center z-20">
        
        {/* Arabic Calligraphy */}
        <motion.div variants={riseIn} className="flex flex-col items-center mt-[1cqw]">
          <p
            className="text-[6.2cqw] font-bold leading-none text-[#b59650] select-none"
            style={{ fontFamily: "'Amiri', serif" }}
          >
            بِسْمِ اللهِ الرَّحْمٰنِ الرَّحِيْمِ
          </p>
        </motion.div>

        {/* Invitation Call Header */}
        <motion.div variants={riseIn} className="flex flex-col items-center gap-[0.5cqw]">
          <p
            className="text-[1.8cqw] font-bold uppercase tracking-[0.24em] text-[#556b82]"
            style={{ fontFamily: "'Cinzel', serif" }}
          >
            Kindly Join Us
          </p>
          <p
            className="text-[1.3cqw] font-medium uppercase tracking-[0.2em] text-[#556b82]/85"
            style={{ fontFamily: "'Cinzel', serif" }}
          >
            For The Wedding Of
          </p>
        </motion.div>

        {/* Groom & Bride Section */}
        <motion.div variants={stagger} className="flex flex-col items-center w-full my-[1cqw]">
          {/* Groom: Abduraziq */}
          <motion.div variants={riseIn} className="flex flex-col items-center">
            <h1
              className="text-[6.4cqw] font-normal tracking-[0.24em] text-[#002855] uppercase"
              style={{ fontFamily: "'Cinzel', serif" }}
            >
              Abduraziq
            </h1>
            <p
              className="mt-[0.6cqw] text-[1.65cqw] font-semibold tracking-[0.16em] text-[#556b82] uppercase"
              style={{ fontFamily: "'Cinzel', serif" }}
            >
              son of Abdussataar and Shanaaz Parker
            </p>
          </motion.div>

          {/* Elegant Navy Script Ampersand */}
          <motion.span 
            variants={riseIn}
            className="text-[5.5cqw] text-[#002855] italic my-[0.5cqw] block"
            style={{ fontFamily: "'Great Vibes', cursive" }}
          >
            &amp;
          </motion.span>

          {/* Bride: Razia */}
          <motion.div variants={riseIn} className="flex flex-col items-center">
            <h1
              className="text-[6.4cqw] font-normal tracking-[0.24em] text-[#002855] uppercase"
              style={{ fontFamily: "'Cinzel', serif" }}
            >
              Razia
            </h1>
            <p
              className="mt-[0.6cqw] text-[1.65cqw] font-semibold tracking-[0.16em] text-[#556b82] uppercase"
              style={{ fontFamily: "'Cinzel', serif" }}
            >
              daughter of Sabri and Samalika Shade
            </p>
          </motion.div>
        </motion.div>

        {/* Wedding Date / Islamic Date */}
        <motion.div variants={riseIn} className="flex flex-col items-center gap-[0.4cqw]">
          <p
            className="text-[2.2cqw] font-bold tracking-[0.2em] text-[#002855] uppercase"
            style={{ fontFamily: "'Cinzel', serif" }}
          >
            September 6<sup>th</sup> 2026
          </p>
          <p
            className="text-[1.8cqw] font-medium tracking-[0.15em] text-[#556b82] uppercase"
            style={{ fontFamily: "'Cinzel', serif" }}
          >
            24 Rabī&apos; Al-Awwal 1448
          </p>
        </motion.div>

        {/* Details Grid */}
        <motion.div
          variants={riseIn}
          className={`w-full gap-[3.5cqw] border-t border-b border-[#556b82]/20 py-[1.8cqw] ${nikkahOnly ? 'flex justify-center' : 'grid grid-cols-2'}`}
        >
          {/* Nikaah Column */}
          <div className={`flex flex-col items-center text-center space-y-[0.8cqw] ${nikkahOnly ? '' : 'border-r border-[#556b82]/20 pr-[1.5cqw]'}`}>
            <h3
              className="text-[2.3cqw] font-bold tracking-[0.22em] text-[#002855] uppercase"
              style={{ fontFamily: "'Cinzel', serif" }}
            >
              Nikaah
            </h3>
            <div className="h-px bg-[#556b82]/20 w-[10cqw]" />
            <p
              className="text-[1.8cqw] font-bold text-[#002855] tracking-[0.14em]"
              style={{ fontFamily: "'Cinzel', serif" }}
            >
              Masjidul Quds Mosque
            </p>
            <p
              className="text-[1.8cqw] font-bold text-[#556b82] tracking-[0.14em]"
              style={{ fontFamily: "'Cinzel', serif" }}
            >
              10h00
            </p>
          </div>

          {/* Reception Column — omitted entirely on the generic Nikaah-only card */}
          {!nikkahOnly && (
            <div className="flex flex-col items-center text-center space-y-[0.8cqw] pl-[1.5cqw]">
              <h3
                className="text-[2.3cqw] font-bold tracking-[0.22em] text-[#002855] uppercase"
                style={{ fontFamily: "'Cinzel', serif" }}
              >
                Reception
              </h3>
              <div className="h-px bg-[#556b82]/20 w-[10cqw]" />
              <p
                className="text-[1.8cqw] font-bold text-[#002855] tracking-[0.14em]"
                style={{ fontFamily: "'Cinzel', serif" }}
              >
                Tuscany Hall, Rylands
              </p>
              <p
                className="text-[1.65cqw] font-bold text-[#556b82] tracking-[0.12em]"
                style={{ fontFamily: "'Cinzel', serif" }}
              >
                5:00 PM for 5:30 PM
              </p>
            </div>
          )}
        </motion.div>

        {/* Personalized Guest Name */}
        {guestName && !nikkahOnly && (
          <motion.div variants={riseIn} className="flex flex-col items-center">
            <p
              className="text-[3.2cqw] font-bold text-[#002855] tracking-[0.18em] uppercase"
              style={{ fontFamily: "'Cinzel', serif" }}
            >
              {guestName}
            </p>
          </motion.div>
        )}

        {/* RSVP Section */}
        {!nikkahOnly && (
          <motion.div variants={riseIn} className="flex flex-col items-center gap-[0.5cqw] w-full mb-[1cqw]">
            <p
              className="text-[1.8cqw] font-bold tracking-[0.16em] text-[#556b82] uppercase"
              style={{ fontFamily: "'Cinzel', serif" }}
            >
              Kindly RSVP by the 14<sup>th</sup> of August
            </p>
            <div 
              className="flex justify-center gap-[3.5cqw] text-[1.7cqw] text-[#002855] font-semibold tracking-[0.08em] uppercase" 
              style={{ fontFamily: "'Cinzel', serif" }}
            >
              <span>Shanaaz Parker: 0718665122</span>
              <span>Ayaaz Parker: 0718665123</span>
            </div>
            <p
              className="text-[1.65cqw] font-bold tracking-[0.18em] text-[#b59650] uppercase mt-[0.6cqw]"
              style={{ fontFamily: "'Cinzel', serif" }}
            >
              Please accept this as a personal invitation
            </p>
          </motion.div>
        )}

      </div>
    </motion.div>
  );
}

/* ─── Gold Outline Ranunculus Flower Component (Style 2 Background) ────── */
function GoldLineArtFlower({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" fill="none" stroke="#d4af37" strokeWidth="0.45" className={className} aria-hidden>
      {/* Center petals */}
      <path d="M50,50 C48,47 52,47 50,50 Z" />
      <path d="M49,49 C46,45 54,45 51,49" />
      <path d="M47,51 C43,45 45,39 53,44" />
      <path d="M53,49 C57,44 55,38 47,43" />
      
      {/* Middle Petals layer 1 */}
      <path d="M46,47 C38,42 41,32 54,35" />
      <path d="M54,47 C62,42 59,32 46,35" />
      <path d="M45,52 C35,48 32,58 43,62" />
      <path d="M55,52 C65,48 68,58 57,62" />
      
      {/* Outer Petals layer 2 */}
      <path d="M42,45 C28,38 32,22 55,26" />
      <path d="M58,45 C72,38 68,22 45,26" />
      <path d="M40,55 C22,50 18,70 38,78" />
      <path d="M60,55 C78,50 82,70 62,78" />
      
      {/* Base/Back Petals */}
      <path d="M50,30 C30,12 70,12 50,30" />
      <path d="M35,60 C15,75 45,90 35,60" />
      <path d="M65,60 C85,75 55,90 65,60" />
      
      {/* Leaves and stems */}
      <path d="M50,75 Q52,88 48,98" />
      {/* Leaf 1 */}
      <path d="M51,80 C58,78 65,82 60,89 C55,96 52,88 51,80 Z" fill="#d4af37" fillOpacity="0.03" />
      <path d="M51,80 Q56,84 60,89" />
      {/* Leaf 2 */}
      <path d="M49,85 C40,84 34,89 38,96 C42,103 47,94 49,85 Z" fill="#d4af37" fillOpacity="0.03" />
      <path d="M49,85 Q44,90 38,96" />
    </svg>
  );
}
