
'use client';

import { Suspense, useEffect, useState, useRef, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { AnimatePresence, motion, useAnimationControls } from 'framer-motion';

import { GuestEventHub } from '@/components/guest-event-hub';
import { LuxuryLoader } from '@/components/luxury-loader';
import { households } from '@/lib/mock-data';
import type { Household } from '@/lib/types';
import { useAudio } from '@/lib/audio-context';
import {
  EXPERIENCE_SETTINGS_EVENT,
  readExperienceSettings,
  type IntroMusic,
} from '@/lib/experience-settings';

// ── Fireworks burst (CSS keyframe trigger) ────────────────────────────────
function FireworkShot({ x, delay }: { x: number; delay: number }) {
  const sparks = Array.from({ length: 12 }, (_, i) => i);
  return (
    <motion.div
      className="absolute bottom-0 pointer-events-none"
      style={{ left: `${x}%` }}
      initial={{ y: 0, opacity: 1 }}
      animate={{ y: '-65vh', opacity: [1, 1, 0] }}
      transition={{ duration: 0.9, delay, ease: [0.2, 0, 0.8, 1] }}
    >
      {sparks.map(i => (
        <motion.div
          key={i}
          className="absolute w-1.5 h-1.5 rounded-full"
          style={{ background: ['#d4af37', '#f6e7b7', '#ffffff', '#c0c0c0', '#ffcba4'][i % 5] }}
          initial={{ scale: 1, x: 0, y: 0, opacity: 0 }}
          animate={{
            scale: [0, 1, 0],
            x: Math.cos((i / 12) * Math.PI * 2) * (40 + Math.random() * 30),
            y: Math.sin((i / 12) * Math.PI * 2) * (40 + Math.random() * 30),
            opacity: [0, 1, 0],
          }}
          transition={{ duration: 0.7, delay: delay + 0.85, ease: 'easeOut' }}
        />
      ))}
    </motion.div>
  );
}

// ── Cinematic "The day is finally here" intro ─────────────────────────────
const EventDayIntro = ({ household, onComplete }: { household: Household; onComplete: () => void }) => {
  const [phase, setPhase] = useState<'enter' | 'exit'>('enter');
  const [introMusic, setIntroMusic] = useState<IntroMusic>('spark-rise');
  const introAudioCtxRef = useRef<AudioContext | null>(null);
  const titleControls = useAnimationControls();
  const subtitleControls = useAnimationControls();
  const { isMuted } = useAudio();

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
    return () => {
      clearTimeout(exitTimer);
      if (introAudioCtxRef.current) {
        void introAudioCtxRef.current.close();
        introAudioCtxRef.current = null;
      }
    };
  }, [playIntroMusic]);

  return (
    <motion.div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center text-center p-8 overflow-hidden"
      style={{ background: 'radial-gradient(ellipse at 50% 35%, #124735 0%, #06221a 42%, #020706 100%)' }}
      animate={phase === 'exit' ? { y: '-100%' } : { y: '0%' }}
      transition={{ duration: 1.0, ease: [0.76, 0, 0.24, 1] }}
      onAnimationComplete={() => { if (phase === 'exit') onComplete(); }}
    >
      <motion.div
        className="absolute -top-28 left-1/2 -translate-x-1/2 h-72 w-72 rounded-full"
        style={{ background: 'radial-gradient(circle, rgba(212,175,55,0.26) 0%, rgba(212,175,55,0.02) 70%, transparent 100%)', filter: 'blur(20px)' }}
        animate={{ x: [0, 14, -10, 0], y: [0, 12, -8, 0], scale: [1, 1.04, 0.96, 1] }}
        transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* Gold dust particles */}
      {Array.from({ length: 40 }).map((_, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full bg-[#d4af37]"
          style={{
            width: Math.random() * 3 + 1,
            height: Math.random() * 3 + 1,
            left: `${Math.random() * 100}%`,
            bottom: '-4px',
          }}
          animate={{ y: [0, -(typeof window !== 'undefined' ? window.innerHeight : 700) * 1.1], opacity: [0, 0.6, 0] }}
          transition={{ duration: Math.random() * 6 + 5, delay: Math.random() * 4, repeat: Infinity, ease: 'easeOut' }}
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
            className="space-y-6 z-10"
          >
            {/* Monogram */}
            <motion.p
              className="font-headline text-6xl md:text-7xl italic text-luxe-gradient"
              initial={{ scale: 0.4, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.8, type: 'spring', stiffness: 120 }}
              style={{ textShadow: '0 0 40px rgba(212,175,55,0.6), 0 0 80px rgba(212,175,55,0.2)' }}
            >
              R&amp;A
            </motion.p>

            <motion.div
              initial={{ width: 0 }}
              animate={{ width: '160px' }}
              transition={{ delay: 0.6, duration: 0.8, ease: 'easeOut' }}
              className="mx-auto h-px bg-gradient-to-r from-transparent via-[#d4af37]/60 to-transparent"
            />

            <motion.h1
              className="font-headline text-3xl md:text-4xl italic text-luxe-gradient"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.9, duration: 0.8 }}
              style={{ textShadow: '0 0 20px rgba(212,175,55,0.3)' }}
            >
              The day is finally here.
            </motion.h1>

            <motion.h2
              className="font-headline text-2xl md:text-3xl italic text-[#f6e7b7]/80 leading-relaxed max-w-sm mx-auto"
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
              className="text-[#f6e7b7]/30 text-xs uppercase tracking-[0.4em]"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 2, duration: 0.8 }}
            >
              September 6, 2026 · Tuscany in Rylands
            </motion.p>
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

  useEffect(() => {
    const hasSeenIntro = sessionStorage.getItem('hasSeenEventIntro') === 'true';
    if (hasSeenIntro) setIntroDone(true);
  }, []);

  const household: Household | undefined = households.find(h => h.qrCode === guestId);

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
        <h2 className="font-headline text-2xl italic text-[#1C1C1C]">Oops — we couldn't find your invite.</h2>
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
