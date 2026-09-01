
'use client';

import { Suspense, useEffect, useState, useRef, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { AnimatePresence, motion, useAnimationControls } from 'framer-motion';

import { GuestEventHub } from '@/components/guest-event-hub';
import { LuxuryLoader } from '@/components/luxury-loader';
import { lookupHouseholdByQr } from '@/lib/data';
import type { Household } from '@/lib/types';
import { useAudio } from '@/lib/audio-context';
import {
  EXPERIENCE_SETTINGS_EVENT,
  readExperienceSettings,
  type IntroMusic,
} from '@/lib/experience-settings';

// ── Fireworks burst (CSS keyframe trigger) ────────────────────────────────
interface SparkOffset { x: number; y: number }
function FireworkShot({ x, delay }: { x: number; delay: number }) {
  const [sparks, setSparks] = useState<SparkOffset[]>([]);

  useEffect(() => {
    setSparks(
      Array.from({ length: 12 }, (_, i) => ({
        x: Math.cos((i / 12) * Math.PI * 2) * (40 + Math.random() * 30),
        y: Math.sin((i / 12) * Math.PI * 2) * (40 + Math.random() * 30),
      }))
    );
  }, []);

  return (
    <motion.div
      className="absolute bottom-0 pointer-events-none"
      style={{ left: `${x}%` }}
      initial={{ y: 0, opacity: 1 }}
      animate={{ y: '-65vh', opacity: [1, 1, 0] }}
      transition={{ duration: 0.9, delay, ease: [0.2, 0, 0.8, 1] }}
    >
      {sparks.map((spark, i) => (
        <motion.div
          key={i}
          className="absolute w-1.5 h-1.5 rounded-full"
          style={{ background: ['#d4af37', '#f6e7b7', '#ffffff', '#c0c0c0', '#ffcba4'][i % 5] }}
          initial={{ scale: 1, x: 0, y: 0, opacity: 0 }}
          animate={{
            scale: [0, 1, 0],
            x: spark.x,
            y: spark.y,
            opacity: [0, 1, 0],
          }}
          transition={{ duration: 0.7, delay: delay + 0.85, ease: 'easeOut' }}
        />
      ))}
    </motion.div>
  );
}

/**
 * Gilded corner filigree. Four of these frame the welcome, which is what stops
 * a full-bleed photograph reading like a stock background rather than a card.
 */
const CornerFlourish = ({ className }: { className: string }) => (
  <svg
    viewBox="0 0 100 100"
    aria-hidden="true"
    className={`absolute w-20 h-20 sm:w-28 sm:h-28 text-amber-400/40 pointer-events-none select-none z-[7] ${className}`}
    fill="currentColor"
  >
    <path d="M0,0 L0,40 Q10,40 20,30 Q30,20 30,0 Z M0,0 L40,0 Q40,10 30,20 Q20,30 0,30 Z M12,12 Q25,2 45,6 Q35,25 25,35 Q15,45 6,45 Q2,25 12,12 Z M20,20 Q35,15 50,18 Q42,32 35,42 Q25,50 18,50 Q15,35 20,20 Z" />
    <circle cx="8" cy="8" r="3" />
    <circle cx="28" cy="8" r="2" />
    <circle cx="8" cy="28" r="2" />
  </svg>
);

// ── Cinematic "The day is finally here" intro ─────────────────────────────
interface DustParticle { id: number; w: number; h: number; left: number; animY: number; dur: number; dly: number }
const EventDayIntro = ({ household, onComplete }: { household: Household; onComplete: () => void }) => {
  const [phase, setPhase] = useState<'enter' | 'exit'>('enter');
  const [introMusic, setIntroMusic] = useState<IntroMusic>('spark-rise');
  const [dustParticles, setDustParticles] = useState<DustParticle[]>([]);
  // The welcome wears the same photograph as the save-the-date, so arriving at
  // the venue looks like the invitation the guest has been carrying for weeks.
  // Falls back to the bundled image, and keeps rendering if the config call
  // fails — this screen must never block on the network.
  const [backdrop, setBackdrop] = useState<string>('/couple-bg.jpg');
  const introAudioCtxRef = useRef<AudioContext | null>(null);
  // Read through a ref so the failsafe timer below doesn't re-arm every time
  // the parent re-renders and hands down a fresh onComplete.
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;
  const _titleControls = useAnimationControls();
  const _subtitleControls = useAnimationControls();
  const { isMuted } = useAudio();

  useEffect(() => {
    const h = window.innerHeight;
    setDustParticles(
      Array.from({ length: 40 }, (_, i) => ({
        id: i,
        w: Math.random() * 3 + 1,
        h: Math.random() * 3 + 1,
        left: Math.random() * 100,
        animY: -h * 1.1,
        dur: Math.random() * 6 + 5,
        dly: Math.random() * 4,
      }))
    );
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/std/config')
      .then(r => (r.ok ? r.json() : null))
      .then(data => {
        const image = data?.config?.siteBgImage || data?.config?.bgImage;
        if (!cancelled && typeof image === 'string' && image) setBackdrop(image);
      })
      .catch(() => {
        /* keep the bundled fallback */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const syncSettings = () => {
      const settings = readExperienceSettings();
      setIntroMusic(settings.introMusic);
    };

    syncSettings();
    window.addEventListener(EXPERIENCE_SETTINGS_EVENT, syncSettings as EventListener);
    window.addEventListener('storage', syncSettings);

    return () => {
      window.removeEventListener(EXPERIENCE_SETTINGS_EVENT, syncSettings as EventListener);
      window.removeEventListener('storage', syncSettings);
    };
  }, []);

  const playIntroMusic = useCallback(() => {
    if (isMuted || introMusic === 'silent') {
      return;
    }

    const Ctx = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) {
      return;
    }

    const ctx = new Ctx();
    const master = ctx.createGain();
    master.gain.value = 0.0001;
    master.connect(ctx.destination);
    master.gain.exponentialRampToValueAtTime(0.08, ctx.currentTime + 0.25);
    introAudioCtxRef.current = ctx;

    const play = (freq: number, at: number, duration: number, wave: OscillatorType) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = wave;
      osc.frequency.setValueAtTime(freq, at);
      gain.gain.setValueAtTime(0.0001, at);
      gain.gain.exponentialRampToValueAtTime(0.09, at + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, at + duration);
      osc.connect(gain);
      gain.connect(master);
      osc.start(at);
      osc.stop(at + duration + 0.04);
    };

    const t = ctx.currentTime + 0.05;
    if (introMusic === 'ceremony-bloom') {
      play(220, t, 0.45, 'triangle');
      play(277.18, t + 0.22, 0.45, 'triangle');
      play(329.63, t + 0.46, 0.5, 'triangle');
      play(440, t + 0.78, 0.65, 'triangle');
    } else {
      play(392, t, 0.23, 'sine');
      play(523.25, t + 0.12, 0.23, 'sine');
      play(659.25, t + 0.24, 0.23, 'sine');
      play(783.99, t + 0.36, 0.35, 'sine');
    }
  }, [introMusic, isMuted]);

  useEffect(() => {
    // Sequence: confetti burst → hold → slide up exit
    const colors = ['#d4af37', '#f6e7b7', '#ffffff', '#c0c0c0', '#ffcba4'];
    const end = Date.now() + 3000;
    import('canvas-confetti').then(({ default: confetti }) => {
      (function frame() {
        confetti({ particleCount: 3, angle: 60, spread: 80, origin: { x: 0, y: 0.55 }, colors, zIndex: 1000 });
        confetti({ particleCount: 3, angle: 120, spread: 80, origin: { x: 1, y: 0.55 }, colors, zIndex: 1000 });
        if (Date.now() < end) requestAnimationFrame(frame);
      }());
    });

    playIntroMusic();

    const exitTimer = setTimeout(() => setPhase('exit'), 3600);

    // Safety net. Dismissing the intro hangs entirely off framer-motion's
    // onAnimationComplete, and a browser that throttles rAF — a backgrounded
    // tab, a phone in low-power mode — can leave that callback unfired, which
    // strands the guest on the splash with no way into the hub. On the day
    // that is unrecoverable without a reload, so force the handoff.
    const failsafeTimer = setTimeout(() => onCompleteRef.current(), 6000);

    return () => {
      clearTimeout(exitTimer);
      clearTimeout(failsafeTimer);
      if (introAudioCtxRef.current) {
        void introAudioCtxRef.current.close();
        introAudioCtxRef.current = null;
      }
    };
  }, [playIntroMusic]);

  return (
    <motion.div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center text-center p-8 overflow-hidden bg-[#020706]"
      animate={phase === 'exit' ? { y: '-100%' } : { y: '0%' }}
      transition={{ duration: 1.0, ease: [0.76, 0, 0.24, 1] }}
      onAnimationComplete={() => { if (phase === 'exit') onComplete(); }}
      // Tap anywhere to skip. Guests arriving mid-party don't want to sit
      // through 4.6s of monogram before they can reach the camera.
      onClick={() => setPhase('exit')}
      role="button"
      tabIndex={0}
      aria-label="Skip the welcome animation"
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setPhase('exit'); }}
    >
      {/* ── Photographic backdrop ─────────────────────────────────────
          A slow Ken Burns push. The scrims above it are doing real work:
          the couple can swap this image from the save-the-date editor, so
          the text has to stay legible over a photograph nobody has seen
          yet — hence a dark base, a vertical gradient and a vignette
          rather than relying on the picture being conveniently dim. */}
      <motion.div
        className="absolute inset-0 z-0"
        initial={{ scale: 1.18, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ opacity: { duration: 1.6, ease: 'easeOut' }, scale: { duration: 14, ease: 'easeOut' } }}
      >
        <Image
          src={backdrop}
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover"
        />
      </motion.div>

      {/* Deep emerald wash — ties the photo to the wedding palette */}
      <div
        className="absolute inset-0 z-[1] pointer-events-none mix-blend-multiply"
        style={{ background: 'radial-gradient(ellipse at 50% 35%, #124735 0%, #06221a 55%, #020706 100%)', opacity: 0.55 }}
      />
      {/* Legibility scrim, heaviest behind the text */}
      <div
        className="absolute inset-0 z-[2] pointer-events-none"
        style={{ background: 'linear-gradient(180deg, rgba(2,7,6,0.62) 0%, rgba(2,7,6,0.18) 30%, rgba(2,7,6,0.38) 60%, rgba(2,7,6,0.88) 100%)' }}
      />
      {/* Vignette */}
      <div
        className="absolute inset-0 z-[3] pointer-events-none"
        style={{ background: 'radial-gradient(ellipse at 50% 45%, transparent 45%, rgba(2,7,6,0.42) 80%, rgba(2,7,6,0.85) 100%)' }}
      />
      {/* Gold light bloom drifting above the monogram */}
      <motion.div
        className="absolute -top-28 left-1/2 z-[4] -translate-x-1/2 h-72 w-72 rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(212,175,55,0.34) 0%, rgba(212,175,55,0.04) 70%, transparent 100%)', filter: 'blur(24px)' }}
        animate={{ x: [0, 14, -10, 0], y: [0, 12, -8, 0], scale: [1, 1.04, 0.96, 1] }}
        transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
      />
      {/* A single slow sweep of light across the frame, once on entry */}
      <motion.div
        className="absolute inset-y-0 z-[5] w-1/3 pointer-events-none"
        style={{ background: 'linear-gradient(105deg, transparent, rgba(246,231,183,0.14), transparent)' }}
        initial={{ left: '-40%' }}
        animate={{ left: '120%' }}
        transition={{ duration: 2.6, delay: 0.7, ease: 'easeInOut' }}
      />

      <CornerFlourish className="top-4 left-4" />
      <CornerFlourish className="top-4 right-4 rotate-90" />
      <CornerFlourish className="bottom-4 left-4 -rotate-90" />
      <CornerFlourish className="bottom-4 right-4 rotate-180" />

      {/* Gold dust particles */}
      {dustParticles.map(p => (
        <motion.div
          key={p.id}
          className="absolute z-[6] rounded-full bg-[#d4af37]"
          style={{ width: p.w, height: p.h, left: `${p.left}%`, bottom: '-4px' }}
          animate={{ y: [0, p.animY], opacity: [0, 0.6, 0] }}
          transition={{ duration: p.dur, delay: p.dly, repeat: Infinity, ease: 'easeOut' }}
        />
      ))}

      {/* Firework shots */}
      {[15, 40, 65, 85].map((x, i) => (
        <FireworkShot key={x} x={x} delay={i * 0.25} />
      ))}

      {/* Centre content */}
      <AnimatePresence>
        {phase === 'enter' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            className="space-y-6 z-20 relative"
          >
            {/* Bismillah — the invitation card opens this way, so the welcome
                does too. Set as text in the same Amiri face the card uses
                rather than as an image: public/bismillah.png is not actually a
                PNG (it is a saved web page), and type scales cleanly to any
                screen besides. */}
            <motion.p
              className="font-bold leading-none text-[#f6e7b7]/85 select-none text-2xl md:text-3xl"
              style={{
                fontFamily: "'Amiri', serif",
                textShadow: '0 0 22px rgba(212,175,55,0.45), 0 2px 14px rgba(2,7,6,0.9)',
              }}
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 1.1, ease: 'easeOut' }}
            >
              بِسْمِ اللهِ الرَّحْمٰنِ الرَّحِيْمِ
            </motion.p>

            {/* Monogram, ringed by a slowly turning gilded halo */}
            <div className="relative flex items-center justify-center my-1">
              <motion.div
                aria-hidden="true"
                className="absolute w-36 h-36 sm:w-44 sm:h-44 rounded-full border border-dashed border-amber-400/40 pointer-events-none"
                animate={{ rotate: 360 }}
                transition={{ duration: 25, repeat: Infinity, ease: 'linear' }}
              />
              <motion.div
                aria-hidden="true"
                className="absolute w-44 h-44 sm:w-52 sm:h-52 rounded-full border border-amber-500/20 pointer-events-none shadow-[0_0_35px_rgba(212,175,55,0.25)]"
                animate={{ scale: [1, 1.06, 1] }}
                transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
              />
              <motion.p
                className="relative font-headline text-7xl md:text-8xl italic text-luxe-gradient leading-none"
                initial={{ scale: 0.4, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.25, duration: 0.9, type: 'spring', stiffness: 110 }}
                style={{ textShadow: '0 0 40px rgba(212,175,55,0.6), 0 0 90px rgba(212,175,55,0.28)' }}
              >
                R&amp;A
              </motion.p>
            </div>

            {/* Rule with a centred diamond, rather than a bare hairline */}
            <motion.div
              className="mx-auto flex items-center justify-center gap-3"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6, duration: 0.7 }}
            >
              <motion.span
                className="block h-px bg-gradient-to-r from-transparent to-[#d4af37]/70"
                initial={{ width: 0 }}
                animate={{ width: 72 }}
                transition={{ delay: 0.65, duration: 0.8, ease: 'easeOut' }}
              />
              <motion.span
                className="block h-1.5 w-1.5 rotate-45 bg-[#d4af37]"
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 1.05, duration: 0.4 }}
                style={{ boxShadow: '0 0 10px rgba(212,175,55,0.8)' }}
              />
              <motion.span
                className="block h-px bg-gradient-to-l from-transparent to-[#d4af37]/70"
                initial={{ width: 0 }}
                animate={{ width: 72 }}
                transition={{ delay: 0.65, duration: 0.8, ease: 'easeOut' }}
              />
            </motion.div>

            <motion.h1
              className="font-headline text-3xl md:text-4xl italic text-luxe-gradient"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.9, duration: 0.8 }}
              // Gold bloom for the letterforms, plus a dark drop so the line
              // stays readable wherever the backdrop photograph is bright.
              style={{ textShadow: '0 0 20px rgba(212,175,55,0.35), 0 2px 20px rgba(2,7,6,0.75)' }}
            >
              The day is finally here.
            </motion.h1>

            <motion.h2
              className="font-headline text-2xl md:text-3xl italic text-[#f6e7b7]/90 leading-relaxed max-w-sm mx-auto"
              style={{ textShadow: '0 2px 18px rgba(2,7,6,0.85)' }}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.3, duration: 0.9 }}
            >
              Welcome to the celebration,{' '}
              <span className="text-[#d4af37]">
                {household.name.replace('The ', '').replace(' Family', '')}
              </span>
              .
            </motion.h2>

            <motion.p
              className="text-[#f6e7b7]/55 text-[11px] uppercase tracking-[0.42em]"
              style={{ textShadow: '0 2px 12px rgba(2,7,6,0.9)' }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 2, duration: 0.8 }}
            >
              September 6, 2026 · Tuscany in Rylands
            </motion.p>

            {/* An explicit way in. Tapping anywhere already works, but nothing
                on screen said so — a guest waiting politely for the animation
                had no idea it was skippable. */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 2.2, duration: 0.6 }}
              className="pt-3"
            >
              <button
                type="button"
                onClick={() => setPhase('exit')}
                className="group inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[#f6e7b7] via-[#d4af37] to-[#c8a030] px-7 py-3 text-sm font-extrabold text-black shadow-[0_0_25px_rgba(212,175,55,0.4)] transition-all hover:scale-105 hover:shadow-[0_0_35px_rgba(212,175,55,0.6)]"
              >
                <span>Enter the celebration</span>
                <span aria-hidden="true" className="transition-transform group-hover:translate-x-1">→</span>
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

function EventPageContent() {
  const searchParams = useSearchParams();
  const guestId = searchParams.get('guestId');
  const [introDone, setIntroDone] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [household, setHousehold] = useState<Household | null>(null);

  useEffect(() => {
    const hasSeenIntro = sessionStorage.getItem('hasSeenEventIntro') === 'true';
    if (hasSeenIntro) setIntroDone(true);
  }, []);

  useEffect(() => {
    if (!guestId) { setIsLoading(false); return; }
    lookupHouseholdByQr(guestId)
      .catch(() => null)
      .then(res => { setHousehold(res); setIsLoading(false); });
  }, [guestId]);

  if (isLoading) {
    return (
      <div className="flex h-[100dvh] w-full items-center justify-center bg-[radial-gradient(circle_at_22%_18%,rgba(212,175,55,0.14),transparent_34%),linear-gradient(145deg,#fffdf9,#f5ecdd)]">
        <LuxuryLoader label="Curating..." size="lg" />
      </div>
    );
  }

  if (!guestId || !household) {
    return (
      <div className="flex h-[100dvh] w-full flex-col items-center justify-center gap-6 bg-[radial-gradient(circle_at_20%_20%,rgba(212,175,55,0.16),transparent_34%),linear-gradient(145deg,#fffdf8,#f7f0e4)] text-[#1C1C1C] p-8 text-center">
        <motion.span
          className="font-headline text-6xl text-luxe-gradient"
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          style={{ textShadow: '0 0 30px rgba(212,175,55,0.3)' }}
        >
          R&amp;A
        </motion.span>
        <h2 className="font-headline text-2xl italic text-[#1C1C1C]">Oops — we couldn&apos;t find your invite.</h2>
        <p className="text-base text-black/40 max-w-xs leading-relaxed">
          Please scan your QR code from your original invitation link, or ask Razia or Abduraziq for help.
        </p>
      </div>
    );
  }

  const handleIntroComplete = () => {
    sessionStorage.setItem('hasSeenEventIntro', 'true');
    setIntroDone(true);
  };

  return (
    <>
      <AnimatePresence>
        {!introDone && <EventDayIntro household={household} onComplete={handleIntroComplete} />}
      </AnimatePresence>
      {introDone && <GuestEventHub guestId={guestId} />}
    </>
  );
}

export default function EventPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen w-full items-center justify-center bg-[radial-gradient(circle_at_22%_18%,rgba(212,175,55,0.14),transparent_34%),linear-gradient(145deg,#fffdf9,#f5ecdd)]">
          <LuxuryLoader label="Curating..." size="lg" />
        </div>
      }
    >
      <EventPageContent />
    </Suspense>
  );
}
