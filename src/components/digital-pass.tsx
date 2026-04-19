'use client';
import QRCode from 'react-qr-code';
import Image from 'next/image';
import { Button } from './ui/button';
import { Download, Camera, Plane } from 'lucide-react';
import type { Household } from '@/lib/types';
import { motion, useAnimationControls } from 'framer-motion';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { useEffect, useRef } from 'react';

// Shimmer bar that sweeps across the card (holographic effect)
function HoloSweep() {
  return (
    <motion.div
      className="absolute inset-0 pointer-events-none rounded-3xl overflow-hidden z-10"
      aria-hidden
    >
      <motion.div
        className="absolute top-0 -left-full w-1/2 h-full"
        style={{
          background:
            'linear-gradient(105deg, transparent 30%, rgba(255,255,255,0.07) 50%, rgba(212,175,55,0.08) 60%, transparent 70%)',
        }}
        animate={{ left: ['−100%', '200%'] }}
        transition={{ duration: 3.5, repeat: Infinity, repeatDelay: 2.5, ease: 'easeInOut' }}
      />
    </motion.div>
  );
}

export function DigitalPass({ household }: { household: Household }) {
  const { toast } = useToast();
  const controls = useAnimationControls();
  const cardRef = useRef<HTMLDivElement>(null);

  const downloadPass = () => {
    toast({
      title: 'Save your pass',
      description: 'Take a screenshot of this screen to keep your boarding pass handy at the door.',
    });
  };

  // Card entrance sequence
  useEffect(() => {
    controls.start({
      opacity: 1,
      y: 0,
      rotateX: 0,
      transition: { duration: 0.9, ease: [0.22, 1, 0.36, 1] },
    });
  }, [controls]);

  // Tilt-on-device-motion / pointer-move
  useEffect(() => {
    const card = cardRef.current;
    if (!card) return;
    const handleMove = (e: PointerEvent) => {
      const rect = card.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width - 0.5) * 14;
      const y = ((e.clientY - rect.top) / rect.height - 0.5) * -10;
      card.style.transform = `perspective(800px) rotateY(${x}deg) rotateX(${y}deg) scale(1.02)`;
    };
    const handleLeave = () => { card.style.transform = ''; };
    card.addEventListener('pointermove', handleMove);
    card.addEventListener('pointerleave', handleLeave);
    return () => {
      card.removeEventListener('pointermove', handleMove);
      card.removeEventListener('pointerleave', handleLeave);
    };
  }, []);

  return (
    <motion.div
      className="min-h-screen w-full flex items-center justify-center p-4"
      style={{ background: 'radial-gradient(ellipse at 50% 30%, #0d2318 0%, #030a06 100%)' }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6 }}
    >
      {/* Gold dust in the background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>
        {Array.from({ length: 30 }).map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 rounded-full bg-[#d4af37]"
            style={{ left: `${Math.random() * 100}%`, top: `${Math.random() * 100}%`, opacity: 0 }}
            animate={{ opacity: [0, 0.4, 0], scale: [0, 1, 0] }}
            transition={{ duration: 2 + Math.random() * 3, delay: Math.random() * 5, repeat: Infinity }}
          />
        ))}
      </div>

      <motion.div
        ref={cardRef}
        initial={{ opacity: 0, y: 60, rotateX: 8 }}
        animate={controls}
        className="relative w-full max-w-sm rounded-3xl overflow-hidden"
        style={{
          background: 'linear-gradient(145deg, #0d2318 0%, #051209 40%, #0a1a10 70%, #081510 100%)',
          boxShadow: '0 30px 80px rgba(0,0,0,0.8), 0 0 1px rgba(212,175,55,0.4), inset 0 1px 0 rgba(212,175,55,0.15)',
          transformStyle: 'preserve-3d',
          transition: 'transform 0.15s ease-out',
        }}
      >
        <HoloSweep />

        {/* Gold border line */}
        <div className="absolute inset-0 rounded-3xl pointer-events-none" style={{ border: '1px solid rgba(212,175,55,0.25)' }} />

        {/* ── Header ── */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4">
          <div className="flex items-center gap-2">
            <div className="relative w-8 h-8">
              <Image src="/RA-logo.svg" alt="R&A" fill className="filter-gold object-contain" />
            </div>
            <div>
              <p className="font-headline text-xs uppercase tracking-[0.2em] text-[#d4af37]/60">Wedu 3.0</p>
              <p className="font-headline text-sm italic text-[#f6e7b7]/80">Boarding Pass</p>
            </div>
          </div>
          <Plane size={18} className="text-[#d4af37]/40 rotate-45" />
        </div>

        {/* ── Dashed divider ── */}
        <div className="mx-6 border-t border-dashed border-[#d4af37]/15" />

        {/* ── Route section ── */}
        <div className="flex items-center justify-between px-6 py-5">
          <div>
            <p className="text-[10px] uppercase tracking-[0.25em] text-[#d4af37]/40 mb-1">Origin</p>
            <p className="font-headline text-4xl text-[#d4af37]">CPT</p>
            <p className="text-xs text-[#f6e7b7]/40 mt-0.5">Cape Town</p>
          </div>
          {/* Animated flight path */}
          <div className="flex items-center gap-1 flex-1 mx-4">
            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-[#d4af37]/30 to-transparent" />
            <motion.div
              animate={{ x: [0, 4, 0] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            >
              <Plane size={14} className="text-[#d4af37]/50 rotate-45" />
            </motion.div>
            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-[#d4af37]/30 to-transparent" />
          </div>
          <div className="text-right">
            <p className="text-[10px] uppercase tracking-[0.25em] text-[#d4af37]/40 mb-1">Destination</p>
            <p className="font-headline text-4xl text-[#d4af37]">UNION</p>
            <p className="text-xs text-[#f6e7b7]/40 mt-0.5">Forever</p>
          </div>
        </div>

        {/* ── Dashed divider ── */}
        <div className="mx-6 border-t border-dashed border-[#d4af37]/15" />

        {/* ── Guest info ── */}
        <div className="px-6 py-5 space-y-4">
          <div>
            <p className="text-[10px] uppercase tracking-[0.25em] text-[#d4af37]/40 mb-1">Passenger</p>
            <motion.p
              className="font-headline text-2xl italic text-[#f6e7b7]"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5, duration: 0.6 }}
            >
              {household.name}
            </motion.p>
          </div>
          <div className="flex gap-8">
            <div>
              <p className="text-[10px] uppercase tracking-[0.25em] text-[#d4af37]/40 mb-1">Date</p>
              <p className="text-sm font-medium text-[#f6e7b7]/80">Sept 6, 2026</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-[0.25em] text-[#d4af37]/40 mb-1">Time</p>
              <p className="text-sm font-medium text-[#f6e7b7]/80">15:00 SAST</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-[0.25em] text-[#d4af37]/40 mb-1">Class</p>
              <p className="text-sm font-medium text-[#d4af37]">First</p>
            </div>
          </div>
        </div>

        {/* ── Dashed divider ── */}
        <div className="mx-6 border-t border-dashed border-[#d4af37]/15" />

        {/* ── QR code ── */}
        <motion.div
          className="flex flex-col items-center gap-3 px-6 py-5"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.7, duration: 0.5, type: 'spring' }}
        >
          <div className="p-3 rounded-2xl bg-white relative">
            <QRCode value={household.qrCode} size={110} bgColor="#ffffff" fgColor="#0a1f18" level="H" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white p-1 rounded-md">
              <Image src="/RA-logo.svg" alt="R&A" width={26} height={26} className="filter-black" />
            </div>
          </div>
          <p className="text-[10px] font-mono text-[#d4af37]/30 tracking-widest">{household.qrCode}</p>
        </motion.div>

        {/* ── Action buttons ── */}
        <div className="px-6 pb-6 grid gap-2">
          <Button
            asChild
            className="w-full rounded-2xl bg-[#d4af37] hover:bg-[#c8a030] text-black font-semibold tracking-wide h-12 shadow-[0_4px_20px_rgba(212,175,55,0.35)]"
          >
            <Link href={`/invite/${household.qrCode}/camera`}>
              <Camera size={16} className="mr-2" /> Leave a Memory
            </Link>
          </Button>
          <Button
            onClick={downloadPass}
            variant="outline"
            className="w-full rounded-2xl bg-transparent border border-[#d4af37]/20 text-[#f6e7b7]/60 hover:bg-[#d4af37]/5 hover:text-[#f6e7b7] h-12 tracking-wide"
          >
            <Download size={16} className="mr-2" /> Save to Device
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}

