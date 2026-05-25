'use client';

/**
 * SaveTheDateEnvelope
 * ─────────────────────────────────────────────────────
 * Animated save-the-date reveal:
 *  1. Background photo + "SAVE THE DATE" text fades in
 *  2. Navy envelope floats up — pauses with wax seal pulsing
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

// ── Dimensions ────────────────────────────────────────────────────────────────
const ENV_W   = 340;
const ENV_H   = 215;
const FLAP_H  = 136; // V-flap height (≈ 63 % of ENV_H)
const CARD_W  = 300;
const CARD_H  = 370;
const ENV_TOP = 230; // px above envelope in the stage (clip-zone height)

// ── Wax seal ──────────────────────────────────────────────────────────────────
function WaxSeal({ size = 90 }: { size?: number }) {
  const C = size / 2;
  const R_OUT  = size * 0.43;
  const R_SCAL = size * 0.135;
  const R_IN   = size * 0.30;
  const N = 12;

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      aria-hidden
      style={{ filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.4))' }}
    >
      <defs>
        <radialGradient id="wax-g" cx="38%" cy="32%" r="70%">
          <stop offset="0%"   stopColor="#fdf0c8" />
          <stop offset="55%"  stopColor="#e8c47a" />
          <stop offset="100%" stopColor="#c49a3c" />
        </radialGradient>
      </defs>

      {/* Scalloped petals */}
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

      {/* Body */}
      <circle cx={C} cy={C} r={R_IN + 3} fill="url(#wax-g)" />

      {/* Specular highlight */}
      <ellipse
        cx={C * 0.77}
        cy={C * 0.70}
        rx={R_IN * 0.36}
        ry={R_IN * 0.22}
        fill="rgba(255,255,255,0.38)"
      />

      {/* Monogram */}
      <text
        x={C}
        y={C + size * 0.07}
        textAnchor="middle"
        fontSize={size * 0.22}
        fontFamily="'Great Vibes', cursive"
        fill="rgba(100,55,18,0.72)"
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
      {Array.from({ length: 20 }, (_, i) => {
        const angle  = (i / 20) * 360;
        const dist   = 44 + (i % 4) * 18;
        const color  = i % 3 === 0 ? '#f6e7b7' : '#d4af37';
        const pxSize = 2 + (i % 3);
        return (
          <motion.div
            key={i}
            className="absolute rounded-full"
            style={{ width: pxSize, height: pxSize, background: color }}
            initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
            animate={{
              x: Math.cos((angle * Math.PI) / 180) * dist,
              y: Math.sin((angle * Math.PI) / 180) * dist,
              opacity: 0,
              scale: 0,
            }}
            transition={{ duration: 0.65, ease: [0.2, 0, 0.8, 1] }}
          />
        );
      })}
    </div>
  );
}

// ── Lace / scalloped top edge on the revealed card ───────────────────────────
function LaceTop({ width }: { width: number }) {
  const STEP  = 11;
  const count = Math.ceil(width / STEP);
  return (
    <svg
      width={width}
      height={16}
      viewBox={`0 0 ${width} 16`}
      className="absolute top-0 left-0"
      aria-hidden
      style={{ pointerEvents: 'none' }}
    >
      {Array.from({ length: count }, (_, i) => (
        <circle key={i} cx={i * STEP + STEP / 2} cy={0} r={STEP / 2} fill="white" />
      ))}
    </svg>
  );
}

// ── Ambient floating particles ────────────────────────────────────────────────
interface Dust { id: number; x: number; y: number; size: number; dur: number; delay: number; drift: number }
function AmbientDust() {
  const [particles, setParticles] = useState<Dust[]>([]);
  useEffect(() => {
    setParticles(
      Array.from({ length: 40 }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: Math.random() * 2.5 + 0.8,
        dur: Math.random() * 14 + 8,
        delay: Math.random() * 10,
        drift: (Math.random() - 0.5) * 30,
      }))
    );
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>
      {particles.map(p => (
        <motion.div
          key={p.id}
          className="absolute rounded-full"
          style={{ left: `${p.x}%`, top: `${p.y}%`, width: p.size, height: p.size, opacity: 0, background: '#d4af37' }}
          animate={{ y: [0, -70, -140], x: [0, p.drift], opacity: [0, 0.55, 0] }}
          transition={{ duration: p.dur, delay: p.delay, repeat: Infinity, ease: 'easeOut' }}
        />
      ))}
    </div>
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
      scale: [1, 1.11, 1],
      filter: [
        'drop-shadow(0 0 6px rgba(212,175,55,0.2))',
        'drop-shadow(0 0 24px rgba(212,175,55,0.85))',
        'drop-shadow(0 0 6px rgba(212,175,55,0.2))',
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
      scale: [1.18, 0],
      opacity: [1, 0],
      transition: { duration: 0.38, ease: [0.4, 0, 1, 1] },
    });

    // 2. Flap opens (3-D rotateX)
    const t1 = setTimeout(() => {
      void flapCtrl.start({
        rotateX: 180,
        transition: { duration: 0.95, ease: [0.4, 0, 0.2, 1] },
      });
    }, 200);

    // 3. Card + content appear
    const t2 = setTimeout(() => setPhase('revealed'), 1050);

    timers.current.push(t1, t2);
  }, [phase, track, sealCtrl, flapCtrl]);

  const showCard     = phase === 'opening' || phase === 'revealed';
  const showEnvelope = phase !== 'revealed';

  return (
    <div className="relative min-h-[100dvh] w-full flex flex-col items-center justify-between py-10 px-4 select-none overflow-hidden">

      {/* ── Background ── */}
      {COUPLE.bgImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={COUPLE.bgImage}
          alt=""
          aria-hidden
          className="absolute inset-0 w-full h-full object-cover object-center pointer-events-none"
          style={{ filter: 'brightness(0.55) saturate(0.85)' }}
        />
      ) : (
        <div
          className="absolute inset-0"
          style={{ background: 'linear-gradient(160deg, #091422 0%, #152240 45%, #091a14 100%)' }}
        />
      )}
      {/* Vignette */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse at 50% 40%, transparent 30%, rgba(0,0,0,0.65) 100%)' }}
      />
      <AmbientDust />

      {/* ── SAVE THE DATE ── */}
      <motion.div
        className="relative z-10 text-center pt-2"
        initial={{ opacity: 0, y: -18 }}
        animate={{ opacity: phase !== 'loading' ? 1 : 0, y: 0 }}
        transition={{ duration: 1.1, delay: 0.4 }}
      >
        {(['SAVE', 'THE', 'DATE'] as const).map((word, i) => (
          <motion.div
            key={word}
            initial={{ opacity: 0, letterSpacing: '0.04em' }}
            animate={{
              opacity: phase !== 'loading' ? 1 : 0,
              letterSpacing: word === 'THE' ? '0.45em' : '0.18em',
            }}
            transition={{ delay: 0.35 + i * 0.28, duration: 0.9 }}
            style={{
              fontFamily: "'Cinzel', serif",
              fontSize: word === 'THE' ? '1.05rem' : '3rem',
              fontWeight: word === 'THE' ? 400 : 700,
              color: '#ffffff',
              lineHeight: word === 'THE' ? 1.5 : 1.05,
              textShadow: '0 2px 28px rgba(0,0,0,0.7)',
            }}
          >
            {word}
          </motion.div>
        ))}
      </motion.div>

      {/* ── Envelope + Card stage ── */}
      <div
        className="relative z-10"
        style={{ width: ENV_W, height: ENV_TOP + ENV_H }}
      >

        {/*
         * Card clip zone — overflow:hidden restricts the card to only
         * the region ABOVE the envelope while it slides up.
         * z-index 9 places it just below the envelope front (z:10),
         * so the lower portion of the card stays hidden inside.
         */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: (ENV_W - CARD_W) / 2,
            width: CARD_W,
            height: ENV_TOP,    // only allows card to show above envelope
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
                  background: 'linear-gradient(175deg, #fdfaf4 0%, #f7edd6 100%)',
                }}
                initial={{ y: CARD_H }}
                animate={{ y: phase === 'revealed' ? ENV_TOP - CARD_H + 50 : CARD_H - 20 }}
                exit={{ y: CARD_H, transition: { duration: 0.3 } }}
                transition={{ type: 'spring', stiffness: 48, damping: 15, delay: 0.45 }}
              >
                <LaceTop width={CARD_W} />

                {/* Card content */}
                <motion.div
                  className="flex flex-col items-center justify-center h-full pt-6 pb-8 px-7 text-center gap-2"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: phase === 'revealed' ? 1 : 0 }}
                  transition={{ delay: 1.3, duration: 0.9 }}
                >
                  <p
                    style={{
                      fontFamily: "'Great Vibes', cursive",
                      fontSize: '1.95rem',
                      color: '#7b1d2e',
                      lineHeight: 1.3,
                    }}
                  >
                    {COUPLE.partner1Full}
                  </p>
                  <p
                    style={{
                      fontFamily: "'Playfair Display', serif",
                      fontSize: '0.78rem',
                      color: '#7b1d2e',
                      letterSpacing: '0.12em',
                      opacity: 0.75,
                    }}
                  >
                    and
                  </p>
                  <p
                    style={{
                      fontFamily: "'Great Vibes', cursive",
                      fontSize: '1.95rem',
                      color: '#7b1d2e',
                      lineHeight: 1.3,
                    }}
                  >
                    {COUPLE.partner2Full}
                  </p>

                  <div
                    className="flex items-center gap-2 my-2 w-full"
                    style={{ opacity: 0.25 }}
                  >
                    <div className="flex-1 h-px" style={{ background: '#7b1d2e' }} />
                    <span style={{ color: '#7b1d2e', fontSize: '0.5rem' }}>✦</span>
                    <div className="flex-1 h-px" style={{ background: '#7b1d2e' }} />
                  </div>

                  <p
                    style={{
                      fontFamily: "'Playfair Display', serif",
                      fontSize: '0.72rem',
                      color: '#7b1d2e',
                      lineHeight: 1.85,
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
                      fontSize: '1.65rem',
                      color: '#7b1d2e',
                      marginTop: 6,
                    }}
                  >
                    {COUPLE.date}
                  </p>

                  <p
                    style={{
                      fontFamily: "'Cinzel', serif",
                      fontSize: '0.6rem',
                      color: '#7b1d2e',
                      letterSpacing: '0.18em',
                      opacity: 0.6,
                      marginTop: 2,
                    }}
                  >
                    {COUPLE.venue} · {COUPLE.city}
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
              initial={{ y: 60, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 30, opacity: 0, scale: 0.95, transition: { duration: 0.45 } }}
              transition={{ delay: 1.7, duration: 0.9, type: 'spring', stiffness: 75, damping: 18 }}
            >
              {/* Inside (lighter shade, revealed when flap opens) */}
              <div
                className="absolute inset-0 rounded-2xl"
                style={{ background: 'linear-gradient(180deg, #233f70 0%, #1a3060 100%)' }}
              />

              {/* Front body */}
              <div
                className="absolute inset-0 rounded-2xl"
                style={{
                  background: 'linear-gradient(148deg, #1d3870 0%, #142c58 55%, #1a305c 100%)',
                  boxShadow: '0 24px 70px rgba(0,0,0,0.6), inset 0 -2px 0 rgba(255,255,255,0.04)',
                }}
              />
              {/* Gold rim */}
              <div
                className="absolute inset-[1px] rounded-2xl pointer-events-none"
                style={{ border: '1px solid rgba(212,175,55,0.22)' }}
              />

              {/* Monogram */}
              <motion.div
                className="absolute"
                style={{ top: '13%', left: '50%', translateX: '-50%', zIndex: 12, whiteSpace: 'nowrap' }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 2.4, duration: 0.9 }}
              >
                <p
                  style={{
                    fontFamily: "'Great Vibes', cursive",
                    fontSize: '1.55rem',
                    color: 'rgba(212,175,55,0.84)',
                    letterSpacing: '0.05em',
                  }}
                >
                  {COUPLE.partner1Short[0]} &amp; {COUPLE.partner2Short[0]}
                </p>
              </motion.div>

              {/* Wax seal */}
              <motion.div
                className="absolute cursor-pointer"
                style={{ top: '50%', left: '50%', translateX: '-50%', translateY: '-50%', zIndex: 20 }}
                animate={sealCtrl}
                whileTap={phase === 'idle' ? { scale: 0.88 } : {}}
                onClick={handleSealClick}
                role="button"
                tabIndex={0}
                aria-label="Tap the wax seal to open"
                onKeyDown={(e) => e.key === 'Enter' && void handleSealClick()}
              >
                <div className="relative">
                  {showBurst && <GoldBurst />}
                  <WaxSeal size={88} />
                </div>
              </motion.div>

              {/* Tap hint */}
              <AnimatePresence>
                {phase === 'idle' && (
                  <motion.div
                    className="absolute"
                    style={{ bottom: '10%', left: '50%', translateX: '-50%', zIndex: 15 }}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ delay: 0.9 }}
                  >
                    <motion.p
                      className="text-[10px] uppercase tracking-[0.3em] whitespace-nowrap"
                      style={{ color: 'rgba(212,175,55,0.7)', fontFamily: "'Cinzel', serif" }}
                      animate={{ opacity: [0.45, 1, 0.45] }}
                      transition={{ duration: 2, repeat: Infinity }}
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
                  background: 'linear-gradient(155deg, #1e3c74 0%, #142c58 100%)',
                  clipPath: 'polygon(0 0, 100% 0, 50% 100%)',
                  borderTopLeftRadius: '1rem',
                  borderTopRightRadius: '1rem',
                  transformOrigin: 'top center',
                  transformPerspective: 900,
                  zIndex: 14,
                  boxShadow: 'inset 0 -1px 0 rgba(255,255,255,0.06)',
                }}
                animate={flapCtrl}
                initial={{ rotateX: 0 }}
              />

              {/* Flap inner face — visible after 90 ° rotation */}
              <div
                className="absolute top-0 left-0 right-0"
                style={{
                  height: FLAP_H,
                  background: 'linear-gradient(180deg, #233f70 0%, #1e3868 100%)',
                  clipPath: 'polygon(0 0, 100% 0, 50% 100%)',
                  borderTopLeftRadius: '1rem',
                  borderTopRightRadius: '1rem',
                  zIndex: 2,
                }}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Couple names + date ── */}
      <motion.div
        className="relative z-10 text-center pb-2"
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: phase !== 'loading' ? 1 : 0, y: 0 }}
        transition={{ delay: 2.8, duration: 1 }}
      >
        <p
          style={{
            fontFamily: "'Great Vibes', cursive",
            fontSize: '2.1rem',
            color: 'rgba(212,175,55,0.92)',
          }}
        >
          {COUPLE.partner1Short} &amp; {COUPLE.partner2Short}
        </p>
        <p
          style={{
            fontFamily: "'Cinzel', serif",
            fontSize: '1.05rem',
            color: '#ffffff',
            letterSpacing: '0.22em',
            fontWeight: 600,
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
              fontSize: '1.3rem',
              color: 'rgba(255,255,255,0.62)',
            }}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ delay: 1.9, duration: 1.1 }}
          >
            Formal invitation to follow
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}
