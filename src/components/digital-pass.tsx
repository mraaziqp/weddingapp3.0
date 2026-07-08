'use client';
import QRCode from 'react-qr-code';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Heart, Share2, MapPin, Calendar, Clock } from 'lucide-react';
import type { Household } from '@/lib/types';
import { motion, useAnimationControls } from 'framer-motion';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { fetchTimelineEvents } from '@/lib/supabase';
import { DEFAULT_INVITATION_CONFIG, InvitationConfig } from '@/lib/invitation-config';
import { useToast } from '@/hooks/use-toast';
import type { TimelineEvent } from '@/lib/types';

interface GoldDustParticle { id: number; left: number; top: number; dur: number; dly: number }

function directionsUrl(location: string) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}`;
}

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

export function DigitalPass({ household, config: configProp }: { household: Household; config?: InvitationConfig }) {
  const controls = useAnimationControls();
  const cardRef = useRef<HTMLDivElement>(null);
  const [goldDust, setGoldDust] = useState<GoldDustParticle[]>([]);
  const [config, setConfig] = useState<InvitationConfig>(configProp ?? DEFAULT_INVITATION_CONFIG);
  const [showTimeline, setShowTimeline] = useState(false);
  const [timelineEvents, setTimelineEvents] = useState<TimelineEvent[] | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    setGoldDust(
      Array.from({ length: 30 }, (_, i) => ({
        id: i,
        left: Math.random() * 100,
        top: Math.random() * 100,
        dur: 2 + Math.random() * 3,
        dly: Math.random() * 5,
      }))
    );
  }, []);

  // Real event date/time/venue, so the pass never contradicts what the
  // couple actually set in the invitation editor. Skipped when the caller
  // already has it (the invitation page fetches it once, on mount).
  useEffect(() => {
    if (configProp) return;
    fetch('/api/invitation/config')
      .then(r => r.json())
      .then(data => setConfig(current => ({ ...current, ...data })))
      .catch(() => {});
  }, [configProp]);

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

  const inviteUrl = typeof window !== 'undefined' ? `${window.location.origin}/invite/${household.qrCode}` : '';

  const handleShare = async () => {
    const shareData = {
      title: `${household.name}'s Wedding Pass`,
      text: `We're celebrating ${config.subtitle}'s wedding — here's my digital pass!`,
      url: inviteUrl,
    };
    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch {
        // Cancelled — no toast needed.
      }
      return;
    }
    try {
      await navigator.clipboard.writeText(inviteUrl);
      toast({ title: 'Link copied!', description: 'Your pass link is ready to paste anywhere.' });
    } catch {
      toast({ variant: 'destructive', title: 'Could not copy the link', description: inviteUrl });
    }
  };

  const openTimeline = () => {
    setShowTimeline(true);
    if (timelineEvents === null) {
      fetchTimelineEvents()
        .then(events => setTimelineEvents(events.filter(e => e.isPublic)))
        .catch(() => setTimelineEvents([]));
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col p-4" style={{ background: 'linear-gradient(135deg, #fdfbf5 0%, #fef9f0 50%, #faf5e8 100%)' }}>
      {/* Gold dust in the background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>
        {goldDust.map(p => (
          <motion.div
            key={p.id}
            className="absolute w-1 h-1 rounded-full bg-[#d4af37]"
            style={{ left: `${p.left}%`, top: `${p.top}%`, opacity: 0 }}
            animate={{ opacity: [0, 0.3, 0], scale: [0, 1, 0] }}
            transition={{ duration: p.dur, delay: p.dly, repeat: Infinity }}
          />
        ))}
      </div>

      {/* ── Invitation Card ── */}
      <motion.div
        ref={cardRef}
        initial={{ opacity: 0, y: 40, rotateX: 8 }}
        animate={controls}
        className="relative max-w-2xl mx-auto w-full rounded-3xl overflow-hidden mb-8 mt-8"
        style={{
          background: 'linear-gradient(145deg, rgba(12,18,16,0.95) 0%, rgba(5,18,9,0.95) 40%, rgba(10,26,16,0.95) 100%)',
          boxShadow: '0 30px 80px rgba(0,0,0,0.4), 0 0 40px rgba(212,175,55,0.15), inset 0 1px 0 rgba(212,175,55,0.15)',
          transformStyle: 'preserve-3d',
          transition: 'transform 0.15s ease-out',
        }}
      >
        <HoloSweep />
        <div className="absolute inset-0 rounded-3xl pointer-events-none" style={{ border: '1px solid rgba(212,175,55,0.25)' }} />

        <div className="relative z-10 px-8 py-12 text-center space-y-6">
          <motion.h1 className="font-headline text-5xl italic text-[#f6e7b7]" initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            We Can&apos;t Wait
          </motion.h1>

          <motion.p className="text-xl text-[#d4af37]/80 font-light" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}>
            Thank you for saying yes, <span className="font-semibold text-[#f6e7b7]">{household.name}</span>
          </motion.p>

          <div className="h-px bg-gradient-to-r from-transparent via-[#d4af37]/40 to-transparent my-4" />

          <motion.div className="space-y-4 text-[#f6e7b7]/80" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 }}>
            <div className="flex items-center justify-center gap-3">
              <Calendar size={18} className="text-[#d4af37]" />
              <span>{config.dateTime}</span>
            </div>
            <div className="flex items-center justify-center gap-3">
              <MapPin size={18} className="text-[#d4af37]" />
              <span>{config.location}</span>
            </div>
          </motion.div>

          <div className="h-px bg-gradient-to-r from-transparent via-[#d4af37]/40 to-transparent my-4" />

          <motion.div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-[#d4af37]/20" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.9 }}>
            <p className="text-sm text-[#d4af37]/60 uppercase tracking-wider mb-3">Your Personal QR Code</p>
            <div className="p-3 rounded-xl bg-white mx-auto w-fit">
              <QRCode value={household.qrCode} size={100} bgColor="#ffffff" fgColor="#0a1f18" level="H" />
            </div>
          </motion.div>

          <motion.div className="grid grid-cols-2 gap-3" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.1 }}>
            <Button asChild className="rounded-2xl bg-[#d4af37] hover:bg-[#c8a030] text-black font-semibold h-12 shadow-[0_4px_20px_rgba(212,175,55,0.35)]">
              <Link href={`/invite/${household.qrCode}/camera`}>
                <Heart size={16} className="mr-2" /> Memories
              </Link>
            </Button>
            <Button
              variant="outline"
              onClick={handleShare}
              className="rounded-2xl bg-transparent border border-[#d4af37]/40 text-[#f6e7b7] hover:bg-[#d4af37]/10 h-12 font-semibold"
            >
              <Share2 size={16} className="mr-2" /> Share
            </Button>
          </motion.div>
        </div>
      </motion.div>

      {/* ── Dashboard Section ── */}
      <motion.div className="max-w-2xl mx-auto w-full space-y-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.3 }}>
        <h2 className="text-3xl font-headline italic text-[#1C1C1C] text-center mb-6">Your Wedding Dashboard</h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Timeline Card */}
          <motion.div whileHover={{ y: -4 }} className="bg-white rounded-2xl p-6 border border-[#d4af37]/20 shadow-lg hover:shadow-xl transition-shadow">
            <div className="h-10 w-10 rounded-full bg-[#d4af37]/20 flex items-center justify-center mb-4">
              <Calendar className="text-[#d4af37]" size={20} />
            </div>
            <h3 className="font-headline text-lg italic text-[#1C1C1C] mb-2">Timeline</h3>
            <p className="text-sm text-[#1C1C1C]/60 mb-4">View the wedding day schedule and events</p>
            <Button variant="outline" size="sm" onClick={openTimeline} className="w-full border-[#d4af37]/30 text-[#d4af37] hover:bg-[#d4af37]/5">View Timeline</Button>
          </motion.div>

          {/* Venue Card */}
          <motion.div whileHover={{ y: -4 }} className="bg-white rounded-2xl p-6 border border-[#d4af37]/20 shadow-lg hover:shadow-xl transition-shadow">
            <div className="h-10 w-10 rounded-full bg-[#d4af37]/20 flex items-center justify-center mb-4">
              <MapPin className="text-[#d4af37]" size={20} />
            </div>
            <h3 className="font-headline text-lg italic text-[#1C1C1C] mb-2">Venue Details</h3>
            <p className="text-sm text-[#1C1C1C]/60 mb-4">{config.location}</p>
            <Button asChild variant="outline" size="sm" className="w-full border-[#d4af37]/30 text-[#d4af37] hover:bg-[#d4af37]/5">
              <a href={directionsUrl(config.location)} target="_blank" rel="noopener noreferrer">Get Directions</a>
            </Button>
          </motion.div>

          {/* Connect Card */}
          <motion.div whileHover={{ y: -4 }} className="bg-white rounded-2xl p-6 border border-[#d4af37]/20 shadow-lg hover:shadow-xl transition-shadow">
            <div className="h-10 w-10 rounded-full bg-[#d4af37]/20 flex items-center justify-center mb-4">
              <Heart className="text-[#d4af37]" size={20} />
            </div>
            <h3 className="font-headline text-lg italic text-[#1C1C1C] mb-2">Share Memories</h3>
            <p className="text-sm text-[#1C1C1C]/60 mb-4">Leave photos and messages for us</p>
            <Button asChild variant="outline" size="sm" className="w-full border-[#d4af37]/30 text-[#d4af37] hover:bg-[#d4af37]/5">
              <Link href={`/invite/${household.qrCode}/camera`}>Add Memories</Link>
            </Button>
          </motion.div>
        </div>
      </motion.div>

      {/* ── Timeline Modal ── */}
      <Dialog open={showTimeline} onOpenChange={setShowTimeline}>
        <DialogContent className="max-w-md bg-white text-[#1C1C1C] border-[#d4af37]/20">
          <DialogHeader>
            <DialogTitle className="font-headline text-2xl italic flex items-center gap-2">
              <Clock className="text-[#d4af37]" size={20} /> Wedding Day Timeline
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
            {timelineEvents === null ? (
              <p className="text-sm text-[#1C1C1C]/50 text-center py-6">Loading…</p>
            ) : timelineEvents.length === 0 ? (
              <p className="text-sm text-[#1C1C1C]/50 text-center py-6">The schedule isn&apos;t published yet — check back closer to the day!</p>
            ) : (
              timelineEvents.map(event => (
                <div key={event.id} className="flex gap-3 rounded-xl border border-[#d4af37]/15 p-3">
                  <div className="shrink-0 w-16 text-sm font-semibold text-[#d4af37]">{event.time}</div>
                  <div>
                    <p className="font-semibold text-sm">{event.title}</p>
                    {event.description && <p className="text-xs text-[#1C1C1C]/60 mt-0.5">{event.description}</p>}
                  </div>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
