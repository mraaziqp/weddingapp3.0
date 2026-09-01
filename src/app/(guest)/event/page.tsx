'use client';

import { Suspense, useEffect, useState, useRef, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { AnimatePresence, motion, useAnimationControls } from 'framer-motion';

import { GuestEventHub } from '@/components/guest-event-hub';
import { GuestDashboard } from '@/components/guest-dashboard';
import { LuxuryLoader } from '@/components/luxury-loader';
import { lookupHouseholdByQr } from '@/lib/supabase';
import type { Household } from '@/lib/types';
import { useAudio } from '@/lib/audio-context';
import {
  EXPERIENCE_SETTINGS_EVENT,
  readExperienceSettings,
  type IntroMusic,
} from '@/lib/experience-settings';
import { Sparkles, ArrowRight, Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';

// ── Fireworks burst ────────────────────────────────
interface SparkOffset { x: number; y: number }
function FireworkShot({ x, delay }: { x: number; delay: number }) {
  const [sparks, setSparks] = useState<SparkOffset[]>([]);

  useEffect(() => {
    setSparks(
      Array.from({ length: 16 }, (_, i) => ({
        x: Math.cos((i / 16) * Math.PI * 2) * (50 + Math.random() * 40),
        y: Math.sin((i / 16) * Math.PI * 2) * (50 + Math.random() * 40),
      }))
    );
  }, []);

  return (
    <motion.div
      className="absolute bottom-0 pointer-events-none z-20"
      style={{ left: `${x}%` }}
      initial={{ y: 0, opacity: 1 }}
      animate={{ y: '-70vh', opacity: [1, 1, 0] }}
      transition={{ duration: 1.1, delay, ease: [0.2, 0, 0.8, 1] }}
    >
      {sparks.map((spark, i) => (
        <motion.div
          key={i}
          className="absolute w-2 h-2 rounded-full shadow-[0_0_8px_#ffd700]"
          style={{ background: ['#d4af37', '#f6e7b7', '#ffffff', '#fbbf24', '#fde047'][i % 5] }}
          initial={{ scale: 1, x: 0, y: 0, opacity: 0 }}
          animate={{
            scale: [0, 1.2, 0],
            x: spark.x,
            y: spark.y,
            opacity: [0, 1, 0],
          }}
          transition={{ duration: 0.85, delay: delay + 1.0, ease: 'easeOut' }}
        />
      ))}
    </motion.div>
  );
}

// ── Corner Filigree Ornaments ─────────────────────────────
const CornerFlourish = ({ className }: { className: string }) => (
  <svg
    viewBox="0 0 100 100"
    className={`absolute w-20 h-20 sm:w-28 sm:h-28 text-amber-400/40 pointer-events-none select-none ${className}`}
    fill="currentColor"
  >
    <path d="M0,0 L0,40 Q10,40 20,30 Q30,20 30,0 Z M0,0 L40,0 Q40,10 30,20 Q20,30 0,30 Z M12,12 Q25,2 45,6 Q35,25 25,35 Q15,45 6,45 Q2,25 12,12 Z M20,20 Q35,15 50,18 Q42,32 35,42 Q25,50 18,50 Q15,35 20,20 Z" />
    <circle cx="8" cy="8" r="3" />
    <circle cx="28" cy="8" r="2" />
    <circle cx="8" cy="28" r="2" />
  </svg>
);

// ── Cinematic Luxury "The day is finally here" Intro ─────────────────────────────
interface DustParticle { id: number; w: number; h: number; left: number; animY: number; dur: number; dly: number }

const EventDayIntro = ({ household, onComplete }: { household: Household; onComplete: () => void }) => {
  const [phase, setPhase] = useState<'enter' | 'exit'>('enter');
  const [introMusic, setIntroMusic] = useState<IntroMusic>('spark-rise');
  const [dustParticles, setDustParticles] = useState<DustParticle[]>([]);
  const introAudioCtxRef = useRef<AudioContext | null>(null);
  const { isMuted } = useAudio();

  useEffect(() => {
    const h = typeof window !== 'undefined' ? window.innerHeight : 900;
    setDustParticles(
      Array.from({ length: 55 }, (_, i) => ({
        id: i,
        w: Math.random() * 3.5 + 1.5,
        h: Math.random() * 3.5 + 1.5,
        left: Math.random() * 100,
        animY: -h * 1.2,
        dur: Math.random() * 7 + 6,
        dly: Math.random() * 4,
      }))
    );
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
    if (isMuted || introMusic === 'silent') return;

    const Ctx = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;

    const ctx = new Ctx();
    const master = ctx.createGain();
    master.gain.value = 0.0001;
    master.connect(ctx.destination);
    master.gain.exponentialRampToValueAtTime(0.09, ctx.currentTime + 0.25);
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
    const colors = ['#d4af37', '#f6e7b7', '#ffffff', '#eab308', '#fbbf24'];
    const end = Date.now() + 3500;
    import('canvas-confetti').then(({ default: confetti }) => {
      (function frame() {
        confetti({ particleCount: 3, angle: 60, spread: 80, origin: { x: 0, y: 0.55 }, colors, zIndex: 1000 });
        confetti({ particleCount: 3, angle: 120, spread: 80, origin: { x: 1, y: 0.55 }, colors, zIndex: 1000 });
        if (Date.now() < end) requestAnimationFrame(frame);
      }());
    });

    playIntroMusic();

    const exitTimer = setTimeout(() => setPhase('exit'), 4200);
    return () => {
      clearTimeout(exitTimer);
      if (introAudioCtxRef.current) {
        void introAudioCtxRef.current.close();
        introAudioCtxRef.current = null;
      }
    };
  }, [playIntroMusic]);

  const handleSkip = () => {
    setPhase('exit');
  };

  return (
    <motion.div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center text-center p-6 sm:p-10 overflow-hidden select-none"
      style={{
        background: 'radial-gradient(ellipse at 50% 30%, #0d3829 0%, #08241b 45%, #020d09 85%, #010604 100%)',
      }}
      animate={phase === 'exit' ? { y: '-100%', opacity: 0.8 } : { y: '0%', opacity: 1 }}
      transition={{ duration: 0.9, ease: [0.76, 0, 0.24, 1] }}
      onAnimationComplete={() => { if (phase === 'exit') onComplete(); }}
    >
      {/* ── Background Glowing Orbs & Aurora Light ── */}
      <motion.div
        className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[450px] w-[450px] sm:h-[650px] sm:w-[650px] rounded-full pointer-events-none"
        style={{
          background: 'radial-gradient(circle, rgba(212,175,55,0.28) 0%, rgba(16,185,129,0.18) 40%, rgba(212,175,55,0.03) 70%, transparent 100%)',
          filter: 'blur(45px)',
        }}
        animate={{
          scale: [1, 1.15, 0.95, 1],
          opacity: [0.7, 0.95, 0.7],
        }}
        transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
      />

      <motion.div
        className="absolute -bottom-20 -left-20 h-96 w-96 rounded-full pointer-events-none"
        style={{
          background: 'radial-gradient(circle, rgba(212,175,55,0.18) 0%, transparent 70%)',
          filter: 'blur(40px)',
        }}
        animate={{ scale: [1, 1.2, 1], opacity: [0.4, 0.7, 0.4] }}
        transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
      />

      <motion.div
        className="absolute -top-20 -right-20 h-96 w-96 rounded-full pointer-events-none"
        style={{
          background: 'radial-gradient(circle, rgba(16,185,129,0.2) 0%, transparent 70%)',
          filter: 'blur(40px)',
        }}
        animate={{ scale: [1.2, 1, 1.2], opacity: [0.5, 0.8, 0.5] }}
        transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* ── Geometric Diamond Damask Texture Overlay ── */}
      <div
        className="absolute inset-0 opacity-[0.08] pointer-events-none mix-blend-overlay"
        style={{
          backgroundImage: `radial-gradient(#d4af37 1px, transparent 1px), radial-gradient(#d4af37 1px, #04120c 1px)`,
          backgroundSize: '40px 40px',
          backgroundPosition: '0 0, 20px 20px',
        }}
      />

      {/* ── Corner Victorian Filigrees ── */}
      <CornerFlourish className="top-4 left-4" />
      <CornerFlourish className="top-4 right-4 rotate-90" />
      <CornerFlourish className="bottom-4 left-4 -rotate-90" />
      <CornerFlourish className="bottom-4 right-4 rotate-180" />

      {/* ── Gold Dust & Twinkling Rising Embers ── */}
      {dustParticles.map(p => (
        <motion.div
          key={p.id}
          className="absolute rounded-full shadow-[0_0_6px_#ffd700] pointer-events-none"
          style={{
            width: p.w,
            height: p.h,
            left: `${p.left}%`,
            bottom: '-10px',
            background: 'radial-gradient(circle, #fff7cc 0%, #d4af37 70%, transparent 100%)',
          }}
          animate={{
            y: [0, p.animY],
            opacity: [0, 0.85, 0],
            scale: [0.5, 1.2, 0.3],
          }}
          transition={{ duration: p.dur, delay: p.dly, repeat: Infinity, ease: 'easeOut' }}
        />
      ))}

      {/* ── Firework Shots ── */}
      {[12, 35, 65, 88].map((x, i) => (
        <FireworkShot key={x} x={x} delay={i * 0.3} />
      ))}

      {/* ── Centre Content ── */}
      <AnimatePresence>
        {phase === 'enter' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.6 }}
            className="space-y-6 z-20 max-w-xl mx-auto flex flex-col items-center"
          >
            {/* Monogram Crest with Rotating Gold Sacred Ring */}
            <div className="relative flex items-center justify-center my-2">
              {/* Animated Rotating Gilded Halo Ring */}
              <motion.div
                className="absolute w-36 h-36 sm:w-44 sm:h-44 rounded-full border border-dashed border-amber-400/40 pointer-events-none"
                animate={{ rotate: 360 }}
                transition={{ duration: 25, repeat: Infinity, ease: 'linear' }}
              />
              <motion.div
                className="absolute w-44 h-44 sm:w-52 sm:h-52 rounded-full border border-amber-500/20 pointer-events-none shadow-[0_0_35px_rgba(212,175,55,0.25)]"
                animate={{ scale: [1, 1.06, 1] }}
                transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
              />

              {/* Glowing 3D Monogram */}
              <motion.div
                initial={{ scale: 0.3, opacity: 0, y: -20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.9, type: 'spring', stiffness: 120 }}
                className="p-6 rounded-full bg-black/40 backdrop-blur-md border border-amber-500/40 shadow-[0_0_50px_rgba(212,175,55,0.4)]"
              >
                <h1
                  className="font-headline text-6xl sm:text-7xl md:text-8xl italic font-black tracking-wider text-transparent bg-clip-text bg-gradient-to-br from-[#fff7d1] via-[#d4af37] to-[#8a661c]"
                  style={{
                    filter: 'drop-shadow(0 0 25px rgba(212,175,55,0.7))',
                  }}
                >
                  R&amp;A
                </h1>
              </motion.div>
            </div>

            {/* Elegant Divider */}
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: '220px' }}
              transition={{ delay: 0.6, duration: 0.8, ease: 'easeOut' }}
              className="h-px bg-gradient-to-r from-transparent via-[#d4af37] to-transparent shadow-[0_0_10px_#d4af37]"
            />

            {/* Headline */}
            <motion.h2
              className="font-headline text-3xl sm:text-4xl md:text-5xl italic font-bold text-transparent bg-clip-text bg-gradient-to-r from-[#fff9db] via-[#f5e2a3] to-[#d4af37]"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.85, duration: 0.8 }}
              style={{ textShadow: '0 0 30px rgba(212,175,55,0.5)' }}
            >
              The day is finally here.
            </motion.h2>

            {/* Welcome Pill */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.2, duration: 0.8 }}
              className="px-6 py-2.5 rounded-full bg-black/50 backdrop-blur-md border border-amber-500/35 shadow-lg"
            >
              <p className="font-headline text-lg sm:text-2xl italic text-[#f6e7b7]">
                Welcome to the celebration,{' '}
                <span className="text-[#ffd700] font-bold">
                  {household.name.replace('The ', '').replace(' Family', '')}
                </span>
              </p>
            </motion.div>

            {/* Date and Location Badge */}
            <motion.p
              className="text-[#f6e7b7]/60 text-xs sm:text-sm uppercase tracking-[0.35em] font-medium"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.6, duration: 0.8 }}
            >
              September 6, 2026 · Tuscany in Rylands
            </motion.p>

            {/* Interactive Fast Enter Button */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 2.0, duration: 0.6 }}
              className="pt-2"
            >
              <Button
                onClick={handleSkip}
                size="lg"
                className="rounded-full bg-gradient-to-r from-[#f6e7b7] via-[#d4af37] to-[#c8a030] text-black font-extrabold px-8 py-6 text-sm shadow-[0_0_25px_rgba(212,175,55,0.4)] hover:scale-105 hover:shadow-[0_0_35px_rgba(212,175,55,0.6)] transition-all flex items-center gap-2 group cursor-pointer"
              >
                <Sparkles size={16} className="text-amber-900 group-hover:rotate-12 transition-transform" />
                <span>Enter Celebration Hub</span>
                <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
              </Button>
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
      <div className="flex h-[100dvh] w-full items-center justify-center bg-[radial-gradient(circle_at_22%_18%,rgba(212,175,55,0.14),transparent_34%),linear-gradient(145deg,#0d3829,#020d09)] text-white">
        <LuxuryLoader label="Curating Your Celebration..." size="lg" />
      </div>
    );
  }

  const effectiveHousehold: Household = household || {
    id: guestId || 'guest-vip',
    name: 'Honoured VIP Guest',
    address: '',
    qrCode: guestId || 'VIP-GUEST',
    guests: [],
  };

  const handleIntroComplete = () => {
    sessionStorage.setItem('hasSeenEventIntro', 'true');
    setIntroDone(true);
  };

  return (
    <>
      <AnimatePresence>
        {!introDone && <EventDayIntro household={effectiveHousehold} onComplete={handleIntroComplete} />}
      </AnimatePresence>
      {introDone && <GuestDashboard household={effectiveHousehold} />}
    </>
  );
}

export default function EventPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen w-full items-center justify-center bg-[radial-gradient(circle_at_22%_18%,rgba(212,175,55,0.14),transparent_34%),linear-gradient(145deg,#0d3829,#020d09)] text-white">
          <LuxuryLoader label="Curating Your Celebration..." size="lg" />
        </div>
      }
    >
      <EventPageContent />
    </Suspense>
  );
}
