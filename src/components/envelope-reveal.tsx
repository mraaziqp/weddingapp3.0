'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence, useAnimationControls } from 'framer-motion';
import Image from 'next/image';
import type { Household } from '@/lib/types';
import { StoryScrollInvite } from './story-scroll-invite';
import { Volume2, VolumeX } from 'lucide-react';
import { useAudio } from '@/lib/audio-context';
import {
  EXPERIENCE_SETTINGS_EVENT,
  readExperienceSettings,
  type EnvelopeMusic,
  type EnvelopeStyle,
} from '@/lib/experience-settings';

const ENVELOPE_STYLE_CONFIG: Record<EnvelopeStyle, { background: string; accent: string; text: string; subtitle: string }> = {
  'royal-cinematic': {
    background: 'radial-gradient(ellipse at 50% 50%, #0d2318 0%, #060e09 40%, #000 100%)',
    accent: '#d4af37',
    text: '#f6e7b7',
    subtitle: 'rgba(212,175,55,0.55)',
  },
  'soft-romance': {
    background: 'radial-gradient(ellipse at 50% 45%, #4e3044 0%, #2b1d2c 45%, #100d13 100%)',
    accent: '#f6b1c4',
    text: '#ffeef4',
    subtitle: 'rgba(246,177,196,0.6)',
  },
  'modern-minimal': {
    background: 'linear-gradient(150deg, #10131a 0%, #1b2431 45%, #080a0f 100%)',
    accent: '#9ad3ff',
    text: '#d8e8f6',
    subtitle: 'rgba(154,211,255,0.6)',
  },
};

// ── Ambient gold dust particles ───────────────────────────────────────────
interface Dust { id: number; x: number; y: number; size: number; dur: number; delay: number; drift: number }

function GoldDust({ count = 60, accent = '#d4af37' }: { count?: number; accent?: string }) {
  const [particles, setParticles] = useState<Dust[]>([]);
  useEffect(() => {
    setParticles(
      Array.from({ length: count }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: Math.random() * 3 + 1,
        dur: Math.random() * 12 + 8,
        delay: Math.random() * 10,
        drift: (Math.random() - 0.5) * 40,
      }))
    );
  }, [count]);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>
      {particles.map(p => (
        <motion.div
          key={p.id}
          className="absolute rounded-full"
          style={{ left: `${p.x}%`, top: `${p.y}%`, width: p.size, height: p.size, opacity: 0, background: accent }}
          animate={{ y: [0, -80, -160], x: [0, p.drift], opacity: [0, 0.6, 0] }}
          transition={{ duration: p.dur, delay: p.delay, repeat: Infinity, ease: 'easeOut' }}
        />
      ))}
    </div>
  );
}

// ── Expanding glow rings ──────────────────────────────────────────────────
function GlowRings({ accent = '#d4af37' }: { accent?: string }) {
  const rings = [0, 0.8, 1.6];
  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none" aria-hidden>
      {rings.map((delay, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full"
          style={{ width: 160, height: 160, border: `1px solid ${accent}33` }}
          animate={{ scale: [1, 3.5], opacity: [0.5, 0] }}
          transition={{ duration: 3, delay, repeat: Infinity, ease: 'easeOut' }}
        />
      ))}
    </div>
  );
}

// ── Diagonal light-ray panel ──────────────────────────────────────────────
function LightRays({ accent = '#d4af37' }: { accent?: string }) {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>
      {['-rotate-12', 'rotate-6', '-rotate-24', 'rotate-18'].map((rot, i) => (
        <motion.div
          key={i}
          className={`absolute top-0 left-1/2 h-[200%] w-[1px] origin-top ${rot}`}
          animate={{ opacity: [0.3, 0.8, 0.3] }}
          transition={{ duration: 4 + i, repeat: Infinity, delay: i * 0.7, ease: 'easeInOut' }}
          style={{
            marginLeft: `${(i - 1.5) * 60}px`,
            background: `linear-gradient(to bottom, transparent, ${accent}1f, transparent)`,
          }}
        />
      ))}
    </div>
  );
}

export function EnvelopeReveal({ household }: { household: Household }) {
  const [isOpened, setIsOpened] = useState(false);
  const [isRevealed, setIsRevealed] = useState(false);
  const [isFlashing, setIsFlashing] = useState(false);
  const [envelopeStyle, setEnvelopeStyle] = useState<EnvelopeStyle>('royal-cinematic');
  const [envelopeMusic, setEnvelopeMusic] = useState<EnvelopeMusic>('golden-chimes');
  const audioCtxRef = useRef<AudioContext | null>(null);
  const masterGainRef = useRef<GainNode | null>(null);
  const loopRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const sealControls = useAnimationControls();

  const { isMuted, setMuted } = useAudio();

  useEffect(() => {
    const syncSettings = () => {
      const settings = readExperienceSettings();
      setEnvelopeStyle(settings.envelopeStyle);
      setEnvelopeMusic(settings.envelopeMusic);
    };

    syncSettings();
    window.addEventListener(EXPERIENCE_SETTINGS_EVENT, syncSettings as EventListener);
    window.addEventListener('storage', syncSettings);

    return () => {
      window.removeEventListener(EXPERIENCE_SETTINGS_EVENT, syncSettings as EventListener);
      window.removeEventListener('storage', syncSettings);
    };
  }, []);

  const stopEnvelopeMusic = useCallback(() => {
    if (loopRef.current) {
      clearInterval(loopRef.current);
      loopRef.current = null;
    }

    if (masterGainRef.current && audioCtxRef.current) {
      const now = audioCtxRef.current.currentTime;
      masterGainRef.current.gain.cancelScheduledValues(now);
      masterGainRef.current.gain.setValueAtTime(masterGainRef.current.gain.value, now);
      masterGainRef.current.gain.linearRampToValueAtTime(0.0001, now + 0.3);
    }

    if (audioCtxRef.current) {
      const ctx = audioCtxRef.current;
      audioCtxRef.current = null;
      masterGainRef.current = null;
      setTimeout(() => {
        void ctx.close();
      }, 320);
    }
  }, []);

  const playEnvelopeNote = useCallback((ctx: AudioContext, gainNode: GainNode, frequency: number, when: number, duration: number, wave: OscillatorType) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = wave;
    osc.frequency.setValueAtTime(frequency, when);
    gain.gain.setValueAtTime(0.0001, when);
    gain.gain.exponentialRampToValueAtTime(0.08, when + 0.06);
    gain.gain.exponentialRampToValueAtTime(0.0001, when + duration);

    osc.connect(gain);
    gain.connect(gainNode);
    osc.start(when);
    osc.stop(when + duration + 0.05);
  }, []);

  const startEnvelopeMusic = useCallback(() => {
    if (isMuted || envelopeMusic === 'silent') {
      return;
    }

    stopEnvelopeMusic();

    const Ctx = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) {
      return;
    }

    const ctx = new Ctx();
    const master = ctx.createGain();
    master.gain.value = 0.0001;
    master.connect(ctx.destination);
    const now = ctx.currentTime;
    master.gain.exponentialRampToValueAtTime(0.05, now + 0.9);

    audioCtxRef.current = ctx;
    masterGainRef.current = master;

    const sequence = () => {
      const t = ctx.currentTime + 0.04;
      if (envelopeMusic === 'velvet-pulse') {
        playEnvelopeNote(ctx, master, 196, t, 0.45, 'triangle');
        playEnvelopeNote(ctx, master, 246.94, t + 0.26, 0.35, 'triangle');
      } else {
        playEnvelopeNote(ctx, master, 261.63, t, 0.4, 'sine');
        playEnvelopeNote(ctx, master, 329.63, t + 0.18, 0.35, 'sine');
        playEnvelopeNote(ctx, master, 392, t + 0.34, 0.38, 'sine');
      }
    };

    sequence();
    loopRef.current = setInterval(sequence, envelopeMusic === 'velvet-pulse' ? 1650 : 2000);
  }, [envelopeMusic, isMuted, playEnvelopeNote, stopEnvelopeMusic]);

  useEffect(() => {
    return () => {
      stopEnvelopeMusic();
    };
  }, [stopEnvelopeMusic]);

  const styleConfig = ENVELOPE_STYLE_CONFIG[envelopeStyle] || ENVELOPE_STYLE_CONFIG['royal-cinematic'];

  // Idle breathing animation on the seal
  useEffect(() => {
    sealControls.start({
      scale: [1, 1.06, 1],
      filter: [
        'drop-shadow(0 0 12px rgba(212,175,55,0.4))',
        'drop-shadow(0 0 32px rgba(212,175,55,0.9))',
        'drop-shadow(0 0 12px rgba(212,175,55,0.4))',
      ],
      transition: { duration: 3, repeat: Infinity, ease: 'easeInOut' },
    });
  }, [sealControls]);

  const handleSealClick = async () => {
    // Burst glow + flash sequence before transitioning
    await sealControls.start({
      scale: [1.06, 1.3, 20],
      filter: ['drop-shadow(0 0 60px rgba(212,175,55,1))', 'drop-shadow(0 0 120px rgba(255,255,255,1))'],
      transition: { duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] },
    });
    setIsFlashing(true);
    setTimeout(() => {
      setIsFlashing(false);
      setIsOpened(true);
    }, 250);
    if (!isMuted) startEnvelopeMusic();
  };

  const toggleMute = () => {
    const newMuted = !isMuted;
    setMuted(newMuted);
    if (newMuted) {
      stopEnvelopeMusic();
    } else {
      startEnvelopeMusic();
    }
  };

  return (
    <div className="relative min-h-[100dvh] w-full overflow-hidden">
      {/* ── Cinematic flash overlay ── */}
      <AnimatePresence>
        {isFlashing && (
          <motion.div
            className="fixed inset-0 z-[100] bg-white"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
          />
        )}
      </AnimatePresence>

      {/* ── Opening screen ── */}
      <AnimatePresence onExitComplete={() => setIsRevealed(true)}>
        {!isOpened && (
          <motion.div
            key="envelope-container"
            className="fixed inset-0 z-20 flex flex-col items-center justify-center"
            style={{ background: styleConfig.background }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, transition: { duration: 1.8 } }}
            exit={{ opacity: 0, transition: { duration: 0.4 } }}
          >
            {/* Ambient layers */}
            <LightRays accent={styleConfig.accent} />
            <GoldDust count={70} accent={styleConfig.accent} />
            <GlowRings accent={styleConfig.accent} />

            {/* Subtle vignette */}
            <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse at center, transparent 30%, rgba(0,0,0,0.7) 100%)' }} />

            {/* Centre content */}
            <motion.div
              className="relative flex flex-col items-center gap-8 z-10"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0, transition: { delay: 0.8, duration: 1.2 } }}
            >
              {/* top line — "You are invited to" */}
              <motion.p
                className="text-xs uppercase tracking-[0.4em] font-light"
                style={{ color: styleConfig.subtitle }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1, transition: { delay: 1.2, duration: 1 } }}
              >
                You are cordially invited
              </motion.p>

              {/* The seal */}
              <motion.div
                animate={sealControls}
                whileTap={{ scale: 0.92 }}
                className="relative w-40 h-40 cursor-pointer select-none"
                onClick={handleSealClick}
              >
                {/* rotating outer ring */}
                <motion.div
                  className="absolute inset-[-12px] rounded-full border"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
                  style={{
                    borderColor: `${styleConfig.accent}44`,
                    backgroundImage:
                      `conic-gradient(from 0deg, transparent 70%, ${styleConfig.accent}88 85%, transparent 100%)`,
                    borderRadius: '50%',
                  }}
                />
                {/* rotating inner ring */}
                <motion.div
                  className="absolute inset-[-4px] rounded-full border"
                  animate={{ rotate: -360 }}
                  transition={{ duration: 14, repeat: Infinity, ease: 'linear' }}
                  style={{ borderColor: `${styleConfig.accent}33` }}
                />
                {/* Logo */}
                <div className="relative w-full h-full">
                  <Image
                    src="/RA-logo.svg"
                    alt="R&A Seal"
                    fill
                    className="filter-gold object-contain"
                    priority
                  />
                </div>
              </motion.div>

              {/* names */}
              <motion.div
                className="text-center space-y-1"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1, transition: { delay: 1.5, duration: 1 } }}
              >
                <p className="font-headline text-3xl italic tracking-wide" style={{ color: `${styleConfig.text}e6` }}>Razia &amp; Abduraziq</p>
                <p className="text-xs uppercase tracking-[0.35em]" style={{ color: styleConfig.subtitle }}>September 6, 2026 · Cape Town</p>
              </motion.div>

              {/* tap prompt */}
              <motion.div
                className="flex flex-col items-center gap-2"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1, transition: { delay: 2, duration: 1 } }}
              >
                <motion.div
                  className="px-6 py-2.5 rounded-full border backdrop-blur-sm cursor-pointer"
                  style={{ borderColor: `${styleConfig.accent}66`, background: `${styleConfig.accent}14` }}
                  animate={{ boxShadow: [`0 0 0px ${styleConfig.accent}00`, `0 0 20px ${styleConfig.accent}55`, `0 0 0px ${styleConfig.accent}00`] }}
                  transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
                  onClick={handleSealClick}
                >
                  <p className="text-sm font-light tracking-[0.25em] uppercase" style={{ color: styleConfig.accent }}>Tap the seal to open</p>
                </motion.div>
                {/* scroll indicator dots */}
                <div className="flex gap-1.5 mt-1">
                  {[0, 0.3, 0.6].map((d, i) => (
                    <motion.div
                      key={i}
                      className="w-1 h-1 rounded-full"
                      style={{ background: `${styleConfig.accent}66` }}
                      animate={{ opacity: [0.3, 1, 0.3] }}
                      transition={{ duration: 1.5, delay: d, repeat: Infinity }}
                    />
                  ))}
                </div>
              </motion.div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Invite content ── */}
      {isRevealed && (
        <motion.div
          key="invite-content"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1, transition: { delay: 0.15, duration: 1.8 } }}
        >
          <StoryScrollInvite household={household} />
        </motion.div>
      )}

      {/* ── Audio toggle (appears after invite loads) ── */}
      {isRevealed && (
        <motion.button
          onClick={toggleMute}
          className="fixed bottom-6 right-6 z-50 w-12 h-12 rounded-full bg-black/20 backdrop-blur-md flex items-center justify-center text-[#1C1C1C]/70 border border-black/10 shadow-lg"
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1, transition: { delay: 1.8, type: 'spring' } }}
          whileTap={{ scale: 0.9 }}
        >
          {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
        </motion.button>
      )}
    </div>
  );
}
