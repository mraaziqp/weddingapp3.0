'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { Maximize2 } from 'lucide-react';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import type { ImagePlaceholder } from '@/lib/placeholder-images';

// ── Constants ─────────────────────────────────────────────────────────────
const SLIDE_DURATION = 6000;   // ms between auto-advances
const POLL_INTERVAL  = 10000;  // ms between polling for new images

const GUEST_NAMES = [
  'Aunt Fatima', 'Cousin Mike', 'Sarah M.', 'John Doe',
  'Jane Doe', 'Uncle Bob', 'Mo Khan', 'Lerato',
];

// ── Types ─────────────────────────────────────────────────────────────────
type SlideItem = ImagePlaceholder & { guestName: string };

// ── Helpers ───────────────────────────────────────────────────────────────
function buildInitialSlides(): SlideItem[] {
  return PlaceHolderImages
    .filter(p => p.id.startsWith('gallery-'))
    .map((p, i) => ({ ...p, guestName: GUEST_NAMES[i % GUEST_NAMES.length] }));
}

// ── Gold ticker tape for "New Memory" notification ────────────────────────
function TickerLine({ text }: { text: string }) {
  return (
    <motion.div
      className="overflow-hidden whitespace-nowrap"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.4 }}
    >
      <span
        className="font-headline italic text-4xl md:text-5xl lg:text-6xl text-[#d4af37]"
        style={{ textShadow: '0 0 40px rgba(212,175,55,0.7), 0 0 80px rgba(212,175,55,0.3)' }}
      >
        {text}
      </span>
    </motion.div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────
export default function VenueScreenPage() {
  const [slides, setSlides]           = useState<SlideItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection]     = useState(1);
  const [newCapture, setNewCapture]   = useState<SlideItem | null>(null);
  const seenIds   = useRef<Set<string>>(new Set());
  const slideTimer = useRef<ReturnType<typeof setTimeout>>();

  // Lock body scroll for full-bleed cast experience
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  // Seed initial slides
  useEffect(() => {
    const initial = buildInitialSlides();
    initial.forEach(s => seenIds.current.add(s.id));
    setSlides(initial);
  }, []);

  // Auto-advance
  const advance = useCallback((len: number) => {
    setDirection(1);
    setCurrentIndex(prev => (prev + 1) % len);
  }, []);

  useEffect(() => {
    if (!slides.length) return;
    slideTimer.current = setTimeout(() => advance(slides.length), SLIDE_DURATION);
    return () => clearTimeout(slideTimer.current);
  }, [currentIndex, slides.length, advance]);

  // Poll for new images
  // In production: replace the simulation block with a real fetch('/api/media/latest')
  useEffect(() => {
    const poll = setInterval(() => {
      // Simulate a 35% chance of a new photo arriving each poll tick
      if (Math.random() > 0.65) {
        const pool = PlaceHolderImages.filter(p => p.id.startsWith('gallery-'));
        const base = pool[Math.floor(Math.random() * pool.length)];
        const syntheticId = `live-${Date.now()}`;

        if (!seenIds.current.has(syntheticId)) {
          seenIds.current.add(syntheticId);
          const incoming: SlideItem = {
            ...base,
            id: syntheticId,
            description: 'A new memory just captured!',
            guestName: GUEST_NAMES[Math.floor(Math.random() * GUEST_NAMES.length)],
          };

          // Play the "New Memory Captured!" animation for 3.2 s, then push into slideshow
          setNewCapture(incoming);
          setTimeout(() => {
            setSlides(prev => [incoming, ...prev]);
            clearTimeout(slideTimer.current);
            setCurrentIndex(0);
            setNewCapture(null);
          }, 3200);
        }
      }
    }, POLL_INTERVAL);
    return () => clearInterval(poll);
  }, []);

  const goTo = (i: number) => {
    setDirection(i > currentIndex ? 1 : -1);
    setCurrentIndex(i);
    clearTimeout(slideTimer.current);
  };

  const enterFullscreen = () => {
    if (document.documentElement.requestFullscreen) {
      document.documentElement.requestFullscreen();
    }
  };

  // ── Loading state ───────────────────────────────────────────────────────
  if (!slides.length) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center">
        <motion.p
          className="font-headline italic text-[#d4af37] text-2xl"
          animate={{ opacity: [0.3, 1, 0.3] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          Loading memories…
        </motion.p>
      </div>
    );
  }

  const current = slides[currentIndex];

  // ── Render ──────────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 bg-black overflow-hidden">
      {/* ── Full-bleed cinematic slide ────────────────────────────────── */}
      <AnimatePresence custom={direction}>
        <motion.div
          key={current.id}
          custom={direction}
          className="absolute inset-0"
          initial={{ opacity: 0, scale: 1.06 }}
          animate={{ opacity: 1, scale: 1.0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1.6, ease: [0.25, 0.1, 0.25, 1] }}
        >
          <Image
            src={current.imageUrl}
            alt={current.description}
            fill
            className="object-cover"
            data-ai-hint={current.imageHint}
            priority
            sizes="100vw"
          />
          {/* Cinematic radial + directional vignette */}
          <div
            className="absolute inset-0"
            style={{
              background:
                'radial-gradient(ellipse at 50% 50%, transparent 38%, rgba(0,0,0,0.5) 100%), ' +
                'linear-gradient(to top, rgba(0,0,0,0.75) 0%, transparent 45%, rgba(0,0,0,0.3) 100%)',
            }}
          />
        </motion.div>
      </AnimatePresence>

      {/* ── R&A watermark — top centre ────────────────────────────────── */}
      <div className="absolute top-8 left-1/2 -translate-x-1/2 z-20 text-center pointer-events-none select-none">
        <motion.p
          className="font-headline italic text-[#d4af37]/55 text-xl tracking-widest"
          animate={{ opacity: [0.35, 0.65, 0.35] }}
          transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
          style={{ textShadow: '0 0 20px rgba(212,175,55,0.3)' }}
        >
          R&amp;A · September 6, 2026
        </motion.p>
        <p className="text-white/15 text-[10px] uppercase tracking-[0.5em] mt-1">
          Tuscany in Rylands · Cape Town
        </p>
      </div>

      {/* ── Caption — bottom left ─────────────────────────────────────── */}
      <AnimatePresence mode="wait">
        <motion.div
          key={`cap-${current.id}`}
          className="absolute bottom-20 left-10 z-20 pointer-events-none select-none"
          initial={{ opacity: 0, x: -16 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 16 }}
          transition={{ duration: 0.6, delay: 0.8 }}
        >
          <p className="font-headline italic text-white/80 text-2xl">{current.guestName}</p>
          <p className="text-white/35 text-xs tracking-[0.25em] uppercase mt-1">
            {current.description}
          </p>
        </motion.div>
      </AnimatePresence>

      {/* ── Progress dots — bottom centre ────────────────────────────── */}
      <div className="absolute bottom-7 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2">
        {slides.slice(0, 12).map((_, i) => (
          <button key={i} onClick={() => goTo(i)} aria-label={`Go to slide ${i + 1}`}>
            <motion.div
              className="rounded-full bg-white"
              animate={{
                width:   i === currentIndex ? 28 : 6,
                height:  6,
                opacity: i === currentIndex ? 0.9 : 0.3,
              }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            />
          </button>
        ))}
      </div>

      {/* ── Fullscreen button — top right ────────────────────────────── */}
      <button
        onClick={enterFullscreen}
        className="absolute top-8 right-8 z-20 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
        aria-label="Enter fullscreen"
      >
        <Maximize2 size={20} className="text-white/60" />
      </button>

      {/* ── "New Memory Captured!" interrupt overlay ──────────────────── */}
      <AnimatePresence>
        {newCapture && (
          <motion.div
            className="absolute inset-0 z-50 flex flex-col items-center justify-center"
            style={{ background: 'rgba(0,0,0,0.9)' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
          >
            {/* Camera-flash white burst */}
            <motion.div
              className="absolute inset-0 bg-white pointer-events-none"
              initial={{ opacity: 0.85 }}
              animate={{ opacity: 0 }}
              transition={{ duration: 0.55 }}
            />

            {/* Photo card — springs in with slight tilt */}
            <motion.div
              className="relative z-10 rounded-2xl overflow-hidden border-2"
              style={{
                width: 'min(320px, 58vw)',
                height: 'min(420px, 55vh)',
                borderColor: '#d4af37',
                boxShadow:
                  '0 0 100px rgba(212,175,55,0.45), 0 25px 70px rgba(0,0,0,0.7)',
              }}
              initial={{ scale: 0.55, opacity: 0, rotate: -8 }}
              animate={{ scale: 1, opacity: 1, rotate: 0 }}
              transition={{ delay: 0.3, type: 'spring', stiffness: 110, damping: 14 }}
            >
              <Image
                src={newCapture.imageUrl}
                alt="New capture"
                fill
                className="object-cover"
                sizes="320px"
              />
              {/* Shimmer sweep across the card */}
              <motion.div
                className="absolute inset-0 pointer-events-none"
                style={{
                  background:
                    'linear-gradient(135deg, transparent 25%, rgba(212,175,55,0.18) 50%, transparent 75%)',
                }}
                animate={{ x: ['-120%', '120%'] }}
                transition={{ duration: 1.1, delay: 0.9, repeat: 2, ease: 'easeInOut' }}
              />
            </motion.div>

            {/* Text block */}
            <motion.div
              className="z-10 mt-8 text-center"
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.55, duration: 0.7 }}
            >
              <AnimatePresence mode="wait">
                <TickerLine key="label" text="New Memory Captured!" />
              </AnimatePresence>
              <p className="text-white/40 text-sm tracking-[0.4em] uppercase mt-3">
                by {newCapture.guestName}
              </p>
              {/* Expanding gold rule */}
              <motion.div
                className="mx-auto h-px mt-4 bg-gradient-to-r from-transparent via-[#d4af37]/60 to-transparent"
                initial={{ width: 0 }}
                animate={{ width: 240 }}
                transition={{ delay: 0.85, duration: 0.9, ease: 'easeOut' }}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
