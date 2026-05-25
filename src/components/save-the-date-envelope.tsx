'use client';

/**
 * SaveTheDateEnvelope
 * ─────────────────────────────────────────────────────
 * Animated save-the-date reveal — PREMIUM version:
 *  1. Background photo (couple henna hands) + "SAVE THE DATE" text fades in
 *  2. Large navy/gold envelope floats up — pauses with wax seal pulsing
 *  3. Guest taps wax seal → gold burst → flap opens (3-D rotateX)
 *  4. Card slides out of envelope with couple's details
 *  5. "Formal invitation to follow" appears — no RSVP prompt
 *
 * Tracks views and opens via /api/std/track (deduplicated with localStorage).
 * ─────────────────────────────────────────────────────
 * To customise: edit the COUPLE constant below.
 * Place your couple photo at /public/couple-bg.jpg (or set bgImage to '').
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  motion,
  AnimatePresence,
  useAnimationControls,
} from 'framer-motion';

// ── Couple details — edit here ────────────────────────────────────────────────
const COUPLE = {
  partner1Short: 'Abdu-Raazig',
  partner2Short: 'Razia',
  partner1Full: 'Abdu-Raazig Sarber',
  partner2Full: 'Razia Shade',
  date: '06.09.2026',
  dateVerbose: 'Saturday, 6th September 2026',
  venue: 'The Grand Pavilion',
  city: 'Cape Town',
  /** Path to couple photo under /public — leave '' for gradient-only bg */
  bgImage: '/couple-bg.jpg',
};

// ── Dimensions — BIGGER envelope ──────────────────────────────────────────────
const ENV_W   = 420;
const ENV_H   = 275;
const FLAP_H  = 175; // V-flap height (≈ 64 % of ENV_H)
const CARD_W  = 370;
const CARD_H  = 500;
const ENV_TOP = 320; // px above envelope in the stage (clip-zone height)

// ── Wax seal — intricate golden seal ──────────────────────────────────────────
function WaxSeal({ size = 110 }: { size?: number }) {
  const C = size / 2;
  const R_OUT  = size * 0.44;
  const R_SCAL = size * 0.14;
  const R_IN   = size * 0.31;
  const N = 14;

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      aria-hidden
      style={{ filter: 'drop-shadow(0 3px 10px rgba(0,0,0,0.5))' }}
    >
      <defs>
        <radialGradient id="wax-g" cx="35%" cy="28%" r="72%">
          <stop offset="0%"   stopColor="#fdf5d8" />
          <stop offset="30%"  stopColor="#f5d982" />
          <stop offset="65%"  stopColor="#d4af37" />
          <stop offset="100%" stopColor="#a07d28" />
        </radialGradient>
        <radialGradient id="wax-inner" cx="45%" cy="40%" r="55%">
          <stop offset="0%"   stopColor="#f9e8a8" />
          <stop offset="100%" stopColor="#c49a3c" />
        </radialGradient>
        <filter id="wax-shadow">
          <feDropShadow dx="0" dy="1" stdDeviation="2" floodColor="#000" floodOpacity="0.3" />
        </filter>
      </defs>

      {/* Outer scalloped petals */}
      {Array.from({ length: N }, (_, i) => {
        const a = (i / N) * Math.PI * 2;
        return (
          <circle
            key={i}
            cx={C + R_OUT * Math.cos(a)}
            cy={C + R_OUT * Math.sin(a)}
            r={R_SCAL}
            fill="url(#wax-g)"
          />
        );
      })}

      {/* Secondary inner petals (offset) */}
      {Array.from({ length: N }, (_, i) => {
        const a = ((i + 0.5) / N) * Math.PI * 2;
        return (
          <circle
            key={`inner-${i}`}
            cx={C + R_OUT * 0.85 * Math.cos(a)}
            cy={C + R_OUT * 0.85 * Math.sin(a)}
            r={R_SCAL * 0.7}
            fill="url(#wax-g)"
            opacity={0.7}
          />
        );
      })}

      {/* Main body disc */}
      <circle cx={C} cy={C} r={R_IN + 5} fill="url(#wax-g)" filter="url(#wax-shadow)" />

      {/* Inner ring detail */}
      <circle cx={C} cy={C} r={R_IN - 2} fill="none" stroke="rgba(100,55,18,0.25)" strokeWidth="1" />
      <circle cx={C} cy={C} r={R_IN - 6} fill="none" stroke="rgba(100,55,18,0.15)" strokeWidth="0.5" />

      {/* Specular highlight */}
      <ellipse
        cx={C * 0.75}
        cy={C * 0.68}
        rx={R_IN * 0.38}
        ry={R_IN * 0.2}
        fill="rgba(255,255,255,0.42)"
      />

      {/* Monogram text */}
      <text
        x={C}
        y={C + size * 0.075}
        textAnchor="middle"
        fontSize={size * 0.24}
        fontFamily="'Great Vibes', cursive"
        fill="rgba(90,48,15,0.78)"
      >
        AR
      </text>
    </svg>
  );
}

// ── Gold burst particles on seal click ───────────────────────────────────────
function GoldBurst() {
  return (
    <div
      className="absolute inset-0 flex items-center justify-center pointer-events-none"
      style={{ overflow: 'visible' }}
    >
      {Array.from({ length: 32 }, (_, i) => {
        const angle  = (i / 32) * 360;
        const dist   = 50 + (i % 5) * 22;
        const colors = ['#f6e7b7', '#d4af37', '#fff5d6', '#c49a3c'];
        const color  = colors[i % colors.length];
        const pxSize = 2 + (i % 4);
        return (
          <motion.div
            key={i}
            className="absolute rounded-full"
            style={{ width: pxSize, height: pxSize, background: color }}
            initial={{ x: 0, y: 0, opacity: 1, scale: 1.2 }}
            animate={{
              x: Math.cos((angle * Math.PI) / 180) * dist,
              y: Math.sin((angle * Math.PI) / 180) * dist,
              opacity: 0,
              scale: 0,
            }}
            transition={{ duration: 0.8, ease: [0.2, 0, 0.8, 1] }}
          />
        );
      })}
    </div>
  );
}

// ── Lace / scalloped top edge on the revealed card ───────────────────────────
function LaceTop({ width }: { width: number }) {
  const STEP  = 12;
  const count = Math.ceil(width / STEP);
  return (
    <svg
      width={width}
      height={18}
      viewBox={`0 0 ${width} 18`}
      className="absolute top-0 left-0"
      aria-hidden
      style={{ pointerEvents: 'none' }}
    >
      {Array.from({ length: count }, (_, i) => (
        <circle key={i} cx={i * STEP + STEP / 2} cy={0} r={STEP / 2} fill="#fdfaf4" />
      ))}
    </svg>
  );
}

// ── Ambient floating particles (more & richer) ───────────────────────────────
interface Dust { id: number; x: number; y: number; size: number; dur: number; delay: number; drift: number; color: string }
function AmbientDust() {
  const [particles, setParticles] = useState<Dust[]>([]);
  useEffect(() => {
    const colors = ['#d4af37', '#f6e7b7', '#c49a3c', '#ffffff'];
    setParticles(
      Array.from({ length: 55 }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: Math.random() * 3 + 0.8,
        dur: Math.random() * 16 + 8,
        delay: Math.random() * 12,
        drift: (Math.random() - 0.5) * 40,
        color: colors[i % colors.length],
      }))
    );
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>
      {particles.map(p => (
        <motion.div
          key={p.id}
          className="absolute rounded-full"
          style={{ left: `${p.x}%`, top: `${p.y}%`, width: p.size, height: p.size, opacity: 0, background: p.color }}
          animate={{ y: [0, -80, -160], x: [0, p.drift], opacity: [0, 0.5, 0] }}
          transition={{ duration: p.dur, delay: p.delay, repeat: Infinity, ease: 'easeOut' }}
        />
      ))}
    </div>
  );
}

// ── Envelope ornamental corner flourishes ─────────────────────────────────────
function EnvelopeCorner({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 60 60" fill="none" className={className} aria-hidden>
      <path d="M2 2L2 25Q2 2 25 2Z" stroke="currentColor" strokeWidth="1" opacity="0.5" />
      <path d="M6 6L6 18M6 6L18 6" stroke="currentColor" strokeWidth="0.75" opacity="0.4" />
      <circle cx="4" cy="4" r="1.5" fill="currentColor" opacity="0.5" />
      <path d="M12 12Q16 8 20 12Q24 16 20 20" stroke="currentColor" strokeWidth="0.6" fill="none" opacity="0.35" />
    </svg>
  );
}

// ── Phase type ────────────────────────────────────────────────────────────────
type Phase = 'loading' | 'intro' | 'idle' | 'opening' | 'revealed';

// ── Main component ────────────────────────────────────────────────────────────
export function SaveTheDateEnvelope() {
  const [phase, setPhase]       = useState<Phase>('loading');
  const [showBurst, setShowBurst] = useState(false);
  const sealCtrl  = useAnimationControls();
  const flapCtrl  = useAnimationControls();
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  // ── Deduped tracking ────────────────────────────────────────────────────────
  const track = useCallback(async (event: 'view' | 'opened') => {
    if (typeof window === 'undefined') return;
    const key = `std_tracked_${event}`;
    if (localStorage.getItem(key)) return;
    try {
      await fetch('/api/std/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event }),
      });
      localStorage.setItem(key, '1');
    } catch { /* tracking is best-effort */ }
  }, []);

  // ── Boot sequence ───────────────────────────────────────────────────────────
  useEffect(() => {
    void track('view');
    const push = (fn: () => void, ms: number) => {
      const t = setTimeout(fn, ms);
      timers.current.push(t);
      return t;
    };
    push(() => setPhase('intro'),  400);
    push(() => setPhase('idle'),   3700);
    return () => timers.current.forEach(clearTimeout);
  }, [track]);

  // ── Seal idle pulse ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'idle') return;
    void sealCtrl.start({
      scale: [1, 1.12, 1],
      filter: [
        'drop-shadow(0 0 8px rgba(212,175,55,0.2))',
        'drop-shadow(0 0 30px rgba(212,175,55,0.9))',
        'drop-shadow(0 0 8px rgba(212,175,55,0.2))',
      ],
      transition: { duration: 2.4, repeat: Infinity, ease: 'easeInOut' },
    });
  }, [phase, sealCtrl]);

  // ── Seal click handler ──────────────────────────────────────────────────────
  const handleSealClick = useCallback(async () => {
    if (phase !== 'idle') return;
    setPhase('opening');
    void track('opened');

    // 1. Seal: glow flash → disappear
    setShowBurst(true);
    void sealCtrl.start({
      scale: [1.2, 0],
      opacity: [1, 0],
      transition: { duration: 0.4, ease: [0.4, 0, 1, 1] },
    });

    // 2. Flap opens (3-D rotateX)
    const t1 = setTimeout(() => {
      void flapCtrl.start({
        rotateX: 180,
        transition: { duration: 1.0, ease: [0.4, 0, 0.2, 1] },
      });
    }, 250);

    // 3. Card + content appear
    const t2 = setTimeout(() => setPhase('revealed'), 1100);

    timers.current.push(t1, t2);
  }, [phase, track, sealCtrl, flapCtrl]);

  const showCard     = phase === 'opening' || phase === 'revealed';
  const showEnvelope = phase !== 'revealed';

  return (
    <div className="relative min-h-[100dvh] w-full flex flex-col items-center justify-between py-8 px-4 select-none overflow-hidden">

      {/* ── Background ── */}
      {COUPLE.bgImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={COUPLE.bgImage}
          alt=""
          aria-hidden
          className="absolute inset-0 w-full h-full object-cover object-center pointer-events-none"
          style={{ filter: 'brightness(0.4) saturate(0.8) contrast(1.1)' }}
        />
      ) : (
        <div
          className="absolute inset-0"
          style={{ background: 'linear-gradient(160deg, #091422 0%, #152240 45%, #091a14 100%)' }}
        />
      )}

      {/* Vignette overlay */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse at 50% 40%, transparent 25%, rgba(0,0,0,0.7) 100%)' }}
      />

      {/* Warm overlay tint to blend with photo */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: 'linear-gradient(180deg, rgba(10,15,30,0.4) 0%, rgba(20,10,5,0.3) 50%, rgba(5,5,15,0.5) 100%)' }}
      />

      <AmbientDust />

      {/* ── SAVE THE DATE heading ── */}
      <motion.div
        className="relative z-10 text-center pt-2"
        initial={{ opacity: 0, y: -22 }}
        animate={{ opacity: phase !== 'loading' ? 1 : 0, y: 0 }}
        transition={{ duration: 1.2, delay: 0.4 }}
      >
        {/* Thin decorative line above */}
        <motion.div
          className="mx-auto mb-3"
          style={{ width: 80, height: 1, background: 'linear-gradient(90deg, transparent, rgba(212,175,55,0.5), transparent)' }}
          initial={{ width: 0, opacity: 0 }}
          animate={{ width: 80, opacity: 1 }}
          transition={{ delay: 0.8, duration: 1 }}
        />

        {(['SAVE', 'THE', 'DATE'] as const).map((word, i) => (
          <motion.div
            key={word}
            initial={{ opacity: 0, letterSpacing: '0.04em' }}
            animate={{
              opacity: phase !== 'loading' ? 1 : 0,
              letterSpacing: word === 'THE' ? '0.5em' : '0.2em',
            }}
            transition={{ delay: 0.35 + i * 0.3, duration: 1 }}
            style={{
              fontFamily: "'Cinzel', serif",
              fontSize: word === 'THE' ? '1.1rem' : '3.4rem',
              fontWeight: word === 'THE' ? 400 : 700,
              color: '#ffffff',
              lineHeight: word === 'THE' ? 1.6 : 1.05,
              textShadow: '0 2px 32px rgba(0,0,0,0.8), 0 0 60px rgba(212,175,55,0.15)',
            }}
          >
            {word}
          </motion.div>
        ))}

        {/* Thin decorative line below */}
        <motion.div
          className="mx-auto mt-3"
          style={{ width: 80, height: 1, background: 'linear-gradient(90deg, transparent, rgba(212,175,55,0.5), transparent)' }}
          initial={{ width: 0, opacity: 0 }}
          animate={{ width: 80, opacity: 1 }}
          transition={{ delay: 1.2, duration: 1 }}
        />
      </motion.div>

      {/* ── Envelope + Card stage ── */}
      <div
        className="relative z-10"
        style={{ width: ENV_W, height: ENV_TOP + ENV_H }}
      >

        {/*
         * Card clip zone — overflow:hidden restricts the card to only
         * the region ABOVE the envelope while it slides up.
         */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: (ENV_W - CARD_W) / 2,
            width: CARD_W,
            height: ENV_TOP,
            overflow: 'hidden',
            zIndex: 9,
          }}
        >
          <AnimatePresence>
            {showCard && (
              <motion.div
                className="absolute top-0 left-0 right-0 rounded-2xl shadow-2xl"
                style={{
                  height: CARD_H,
                  background: 'linear-gradient(175deg, #fdfaf4 0%, #f8efd0 50%, #f4e4b5 100%)',
                  boxShadow: '0 20px 60px rgba(0,0,0,0.5), 0 0 0 1px rgba(212,175,55,0.15)',
                }}
                initial={{ y: CARD_H }}
                animate={{ y: phase === 'revealed' ? ENV_TOP - CARD_H + 60 : CARD_H - 30 }}
                exit={{ y: CARD_H, transition: { duration: 0.3 } }}
                transition={{ type: 'spring', stiffness: 42, damping: 14, delay: 0.5 }}
              >
                <LaceTop width={CARD_W} />

                {/* Gold border on card */}
                <div
                  className="absolute inset-3 rounded-xl pointer-events-none"
                  style={{ border: '1px solid rgba(180,140,50,0.25)' }}
                />
                <div
                  className="absolute inset-5 rounded-lg pointer-events-none"
                  style={{ border: '0.5px solid rgba(180,140,50,0.12)' }}
                />

                {/* Card content */}
                <motion.div
                  className="flex flex-col items-center justify-center h-full pt-8 pb-10 px-8 text-center gap-3"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: phase === 'revealed' ? 1 : 0 }}
                  transition={{ delay: 1.4, duration: 1 }}
                >
                  {/* Top ornamental line */}
                  <div className="flex items-center gap-3 w-full max-w-[240px]" style={{ opacity: 0.3 }}>
                    <div className="flex-1 h-px" style={{ background: 'linear-gradient(to right, transparent, #7b1d2e)' }} />
                    <span style={{ color: '#7b1d2e', fontSize: '0.45rem' }}>✦</span>
                    <div className="flex-1 h-px" style={{ background: 'linear-gradient(to left, transparent, #7b1d2e)' }} />
                  </div>

                  <p
                    style={{
                      fontFamily: "'Cinzel', serif",
                      fontSize: '0.58rem',
                      color: '#7b1d2e',
                      letterSpacing: '0.25em',
                      opacity: 0.55,
                      textTransform: 'uppercase',
                    }}
                  >
                    Together with their families
                  </p>

                  <p
                    style={{
                      fontFamily: "'Great Vibes', cursive",
                      fontSize: '2.4rem',
                      color: '#7b1d2e',
                      lineHeight: 1.2,
                    }}
                  >
                    {COUPLE.partner1Full}
                  </p>

                  {/* Ornate ampersand */}
                  <div className="flex items-center gap-3 w-full max-w-[180px]">
                    <div className="flex-1 h-px" style={{ background: 'linear-gradient(to right, transparent, rgba(123,29,46,0.3))' }} />
                    <p
                      style={{
                        fontFamily: "'Great Vibes', cursive",
                        fontSize: '1.6rem',
                        color: '#d4af37',
                        textShadow: '0 0 12px rgba(212,175,55,0.3)',
                      }}
                    >
                      &amp;
                    </p>
                    <div className="flex-1 h-px" style={{ background: 'linear-gradient(to left, transparent, rgba(123,29,46,0.3))' }} />
                  </div>

                  <p
                    style={{
                      fontFamily: "'Great Vibes', cursive",
                      fontSize: '2.4rem',
                      color: '#7b1d2e',
                      lineHeight: 1.2,
                    }}
                  >
                    {COUPLE.partner2Full}
                  </p>

                  {/* Divider */}
                  <div className="flex items-center gap-2 my-1 w-full max-w-[200px]" style={{ opacity: 0.2 }}>
                    <div className="flex-1 h-px" style={{ background: '#7b1d2e' }} />
                    <span style={{ color: '#d4af37', fontSize: '0.5rem' }}>◆</span>
                    <div className="flex-1 h-px" style={{ background: '#7b1d2e' }} />
                  </div>

                  <p
                    style={{
                      fontFamily: "'Playfair Display', serif",
                      fontSize: '0.78rem',
                      color: '#7b1d2e',
                      lineHeight: 1.9,
                      opacity: 0.85,
                    }}
                  >
                    Request the pleasure of your presence
                    <br />
                    at their wedding
                  </p>

                  <p
                    style={{
                      fontFamily: "'Great Vibes', cursive",
                      fontSize: '2rem',
                      color: '#7b1d2e',
                      marginTop: 4,
                    }}
                  >
                    {COUPLE.date}
                  </p>

                  <p
                    style={{
                      fontFamily: "'Cinzel', serif",
                      fontSize: '0.65rem',
                      color: '#7b1d2e',
                      letterSpacing: '0.2em',
                      opacity: 0.55,
                      marginTop: 2,
                    }}
                  >
                    {COUPLE.venue} · {COUPLE.city}
                  </p>

                  {/* Bottom ornamental line */}
                  <div className="flex items-center gap-3 w-full max-w-[240px] mt-2" style={{ opacity: 0.3 }}>
                    <div className="flex-1 h-px" style={{ background: 'linear-gradient(to right, transparent, #7b1d2e)' }} />
                    <span style={{ color: '#d4af37', fontSize: '0.45rem' }}>✦</span>
                    <div className="flex-1 h-px" style={{ background: 'linear-gradient(to left, transparent, #7b1d2e)' }} />
                  </div>

                  <p
                    style={{
                      fontFamily: "'Cinzel', serif",
                      fontSize: '0.5rem',
                      color: 'rgba(123,29,46,0.4)',
                      letterSpacing: '0.3em',
                      textTransform: 'uppercase',
                      marginTop: 4,
                    }}
                  >
                    Formal invitation to follow
                  </p>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ── Envelope ── */}
        <AnimatePresence>
          {showEnvelope && (
            <motion.div
              className="absolute"
              style={{ top: ENV_TOP, left: 0, width: ENV_W, height: ENV_H, zIndex: 10 }}
              initial={{ y: 70, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 35, opacity: 0, scale: 0.94, transition: { duration: 0.5 } }}
              transition={{ delay: 1.7, duration: 1.0, type: 'spring', stiffness: 70, damping: 17 }}
            >
              {/* Inside (lighter shade, revealed when flap opens) */}
              <div
                className="absolute inset-0 rounded-2xl"
                style={{ background: 'linear-gradient(180deg, #253f6e 0%, #1c3462 100%)' }}
              />

              {/* Front body with rich gradient */}
              <div
                className="absolute inset-0 rounded-2xl"
                style={{
                  background: 'linear-gradient(148deg, #1e3c74 0%, #152c5c 35%, #0f2248 70%, #1a3264 100%)',
                  boxShadow: '0 28px 80px rgba(0,0,0,0.65), inset 0 -2px 0 rgba(255,255,255,0.05), inset 0 1px 0 rgba(212,175,55,0.08)',
                }}
              />

              {/* Gold rim border */}
              <div
                className="absolute inset-[1px] rounded-2xl pointer-events-none"
                style={{ border: '1px solid rgba(212,175,55,0.28)' }}
              />

              {/* Inner gold border */}
              <div
                className="absolute rounded-xl pointer-events-none"
                style={{
                  top: 8, left: 8, right: 8, bottom: 8,
                  border: '0.5px solid rgba(212,175,55,0.12)',
                }}
              />

              {/* Corner flourishes */}
              <EnvelopeCorner className="absolute top-1 left-1 w-10 h-10 text-[#d4af37]" />
              <EnvelopeCorner className="absolute top-1 right-1 w-10 h-10 text-[#d4af37] scale-x-[-1]" />
              <EnvelopeCorner className="absolute bottom-1 left-1 w-10 h-10 text-[#d4af37] scale-y-[-1]" />
              <EnvelopeCorner className="absolute bottom-1 right-1 w-10 h-10 text-[#d4af37] scale-[-1]" />

              {/* Shimmer effect on envelope */}
              <motion.div
                className="absolute inset-0 rounded-2xl pointer-events-none"
                style={{
                  background: 'linear-gradient(115deg, transparent 30%, rgba(212,175,55,0.06) 45%, rgba(255,255,255,0.04) 50%, rgba(212,175,55,0.06) 55%, transparent 70%)',
                  backgroundSize: '200% 100%',
                }}
                animate={{ backgroundPosition: ['200% 0%', '-200% 0%'] }}
                transition={{ duration: 4, repeat: Infinity, ease: 'linear', delay: 3 }}
              />

              {/* Monogram initials */}
              <motion.div
                className="absolute"
                style={{ top: '12%', left: '50%', translateX: '-50%', zIndex: 12, whiteSpace: 'nowrap' }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 2.4, duration: 1 }}
              >
                <p
                  style={{
                    fontFamily: "'Great Vibes', cursive",
                    fontSize: '1.8rem',
                    color: 'rgba(212,175,55,0.85)',
                    letterSpacing: '0.06em',
                    textShadow: '0 0 20px rgba(212,175,55,0.3)',
                  }}
                >
                  {COUPLE.partner1Short[0]} &amp; {COUPLE.partner2Short[0]}
                </p>
              </motion.div>

              {/* Wax seal — bigger! */}
              <motion.div
                className="absolute cursor-pointer"
                style={{ top: '50%', left: '50%', translateX: '-50%', translateY: '-50%', zIndex: 20 }}
                animate={sealCtrl}
                whileTap={phase === 'idle' ? { scale: 0.86 } : {}}
                onClick={handleSealClick}
                role="button"
                tabIndex={0}
                aria-label="Tap the wax seal to open"
                onKeyDown={(e) => e.key === 'Enter' && void handleSealClick()}
              >
                <div className="relative">
                  {showBurst && <GoldBurst />}
                  <WaxSeal size={110} />
                </div>
              </motion.div>

              {/* Tap hint */}
              <AnimatePresence>
                {phase === 'idle' && (
                  <motion.div
                    className="absolute"
                    style={{ bottom: '8%', left: '50%', translateX: '-50%', zIndex: 15 }}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ delay: 1.0 }}
                  >
                    <motion.p
                      className="text-[11px] uppercase tracking-[0.35em] whitespace-nowrap"
                      style={{ color: 'rgba(212,175,55,0.75)', fontFamily: "'Cinzel', serif" }}
                      animate={{ opacity: [0.4, 1, 0.4] }}
                      transition={{ duration: 2.2, repeat: Infinity }}
                    >
                      Tap the seal to open
                    </motion.p>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* ── Envelope flap (3-D) ── */}
              <motion.div
                className="absolute top-0 left-0 right-0"
                style={{
                  height: FLAP_H,
                  background: 'linear-gradient(155deg, #1e3c74 0%, #142c58 60%, #1a3060 100%)',
                  clipPath: 'polygon(0 0, 100% 0, 50% 100%)',
                  borderTopLeftRadius: '1rem',
                  borderTopRightRadius: '1rem',
                  transformOrigin: 'top center',
                  transformPerspective: 1000,
                  zIndex: 14,
                  boxShadow: 'inset 0 -1px 0 rgba(255,255,255,0.06)',
                }}
                animate={flapCtrl}
                initial={{ rotateX: 0 }}
              />

              {/* Flap inner face — visible after 90° rotation */}
              <div
                className="absolute top-0 left-0 right-0"
                style={{
                  height: FLAP_H,
                  background: 'linear-gradient(180deg, #253f70 0%, #1e3868 100%)',
                  clipPath: 'polygon(0 0, 100% 0, 50% 100%)',
                  borderTopLeftRadius: '1rem',
                  borderTopRightRadius: '1rem',
                  zIndex: 2,
                }}
              />

              {/* Gold edge on flap fold line */}
              <div
                className="absolute top-0 left-0 right-0 pointer-events-none"
                style={{
                  height: 1,
                  background: 'linear-gradient(90deg, transparent 5%, rgba(212,175,55,0.3) 30%, rgba(212,175,55,0.5) 50%, rgba(212,175,55,0.3) 70%, transparent 95%)',
                  zIndex: 15,
                }}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Couple names + date (bottom) ── */}
      <motion.div
        className="relative z-10 text-center pb-2"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: phase !== 'loading' ? 1 : 0, y: 0 }}
        transition={{ delay: 2.8, duration: 1.1 }}
      >
        <p
          style={{
            fontFamily: "'Great Vibes', cursive",
            fontSize: '2.5rem',
            color: 'rgba(212,175,55,0.92)',
            textShadow: '0 0 30px rgba(212,175,55,0.25)',
          }}
        >
          {COUPLE.partner1Short} &amp; {COUPLE.partner2Short}
        </p>
        <p
          style={{
            fontFamily: "'Cinzel', serif",
            fontSize: '1.15rem',
            color: '#ffffff',
            letterSpacing: '0.25em',
            fontWeight: 600,
            textShadow: '0 2px 10px rgba(0,0,0,0.5)',
          }}
        >
          {COUPLE.date}
        </p>
      </motion.div>

      {/* ── "Formal invitation to follow" ── */}
      <AnimatePresence>
        {phase === 'revealed' && (
          <motion.p
            className="absolute bottom-5 left-0 right-0 text-center z-10"
            style={{
              fontFamily: "'Great Vibes', cursive",
              fontSize: '1.4rem',
              color: 'rgba(255,255,255,0.6)',
              textShadow: '0 0 20px rgba(0,0,0,0.5)',
            }}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ delay: 2.0, duration: 1.2 }}
          >
            Formal invitation to follow
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}
