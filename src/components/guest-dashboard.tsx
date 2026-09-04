'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Ticket,
  GalleryHorizontal,
  Camera,
  Gamepad2,
  HeartHandshake,
  Gift,
  Calendar,
  MapPin,
  Clock,
  Share2,
  Sparkles,
  ExternalLink,
  Volume2,
  VolumeX,
  Download,
  Shirt,
  CheckCircle2,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import type { Household, TimelineEvent } from '@/lib/types';
import { DEFAULT_INVITATION_CONFIG, InvitationConfig } from '@/lib/invitation-config';
import { GalleryFeed } from './guest-hub/gallery-feed';
import { MultiMediaUploaderModal } from './multi-media-uploader-modal';
import { YourTableCard } from '@/components/your-table-card';
import { CaptureView } from './guest-hub/capture-view';
import { WellWishesWall } from './well-wishes-wall';
import { Skeleton } from './ui/skeleton';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { fetchTimelineEvents } from '@/lib/data';
import { usePartyMode } from '@/hooks/use-party-mode';
import { downloadElementAsImage } from '@/lib/download-card';

const QRCode = dynamic(() => import('react-qr-code'), { ssr: false });

const GamesView = dynamic(
  () => import('./guest-hub/games-view').then(m => ({ default: m.GamesView })),
  {
    loading: () => (
      <div className="p-4 space-y-4 max-w-xl mx-auto">
        <Skeleton className="h-10 w-2/3 mx-auto rounded-xl" />
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full rounded-2xl" />
        ))}
      </div>
    ),
    ssr: false,
  }
);

interface GuestDashboardProps {
  household: Household;
  config?: InvitationConfig;
  initialTab?: string;
}

const TABS = [
  { id: 'pass', label: 'VIP Pass', icon: Ticket, badge: 'Pass' },
  { id: 'gallery', label: 'Memories', icon: GalleryHorizontal, badge: 'Live' },
  { id: 'capture', label: 'Camera', icon: Camera, badge: 'Studio' },
  { id: 'games', label: 'Games', icon: Gamepad2, badge: 'Play' },
  { id: 'wishes', label: 'Wishes', icon: HeartHandshake, badge: 'Love' },
  { id: 'gifting', label: 'Gifts', icon: Gift, badge: 'Registry' },
];

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
            'linear-gradient(105deg, transparent 20%, rgba(255,255,255,0.09) 50%, rgba(212,175,55,0.22) 60%, transparent 80%)',
        }}
        animate={{ left: ['-100%', '200%'] }}
        transition={{ duration: 3.8, repeat: Infinity, repeatDelay: 2, ease: 'easeInOut' }}
      />
    </motion.div>
  );
}

function LiveCountdown({ targetDate }: { targetDate?: string }) {
  const [left, setLeft] = useState<{ d: number; h: number; m: number; s: number } | null>(null);

  useEffect(() => {
    const target = targetDate ? new Date(targetDate) : new Date('2026-09-06T18:00:00+02:00');
    const tick = () => {
      const ms = target.getTime() - Date.now();
      if (isNaN(ms) || ms <= 0) {
        setLeft({ d: 0, h: 0, m: 0, s: 0 });
        return;
      }
      setLeft({
        d: Math.floor(ms / 86_400_000),
        h: Math.floor(ms / 3_600_000) % 24,
        m: Math.floor(ms / 60_000) % 60,
        s: Math.floor(ms / 1000) % 60,
      });
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [targetDate]);

  if (!left) return null;

  return (
    <div className="flex items-center justify-center gap-2 sm:gap-3 py-1">
      {[
        { value: left.d, label: 'Days' },
        { value: left.h, label: 'Hours' },
        { value: left.m, label: 'Mins' },
        { value: left.s, label: 'Secs' },
      ].map((item) => (
        <div
          key={item.label}
          className="flex flex-col items-center justify-center min-w-[56px] sm:min-w-[64px] px-2.5 py-1.5 rounded-2xl bg-white/80 backdrop-blur-md border border-[#d4af37]/35 shadow-[0_4px_12px_rgba(212,175,55,0.1)]"
        >
          <span className="font-mono text-base sm:text-lg font-bold text-[#1C1C1C] tabular-nums">
            {String(item.value).padStart(2, '0')}
          </span>
          <span className="text-[8px] sm:text-[9px] uppercase tracking-wider text-[#8a6f1f] font-bold">
            {item.label}
          </span>
        </div>
      ))}
    </div>
  );
}

export function GuestDashboard({ household, config: configProp, initialTab = 'pass' }: GuestDashboardProps) {
  const router = useRouter();
  const { toast } = useToast();
  const { partyMode } = usePartyMode();

  const [activeTab, setActiveTab] = useState(initialTab);
  const [config, setConfig] = useState<InvitationConfig>(configProp ?? DEFAULT_INVITATION_CONFIG);
  const [activeQuest, setActiveQuest] = useState<string | null>(null);
  const [completedQuests, setCompletedQuests] = useState<string[]>([]);
  const [showTimeline, setShowTimeline] = useState(false);
  const [showDressCode, setShowDressCode] = useState(false);
  const [timelineEvents, setTimelineEvents] = useState<TimelineEvent[] | null>(null);
  // "Add Photo" opens the batch uploader rather than only switching tabs, so a
  // guest with a full camera roll can hand it all over from the wall itself.
  const [isUploaderOpen, setIsUploaderOpen] = useState(false);
  const [galleryRefreshKey, setGalleryRefreshKey] = useState(0);
  const [isCopied, setIsCopied] = useState(false);
  const [isSavingPass, setIsSavingPass] = useState(false);
  const [isPlayingMusic, setIsPlayingMusic] = useState(false);

  // Audio Soundtrack
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const musicSrc = config.musicUrl || '/invitation-music.mp3';

  // 3D card tilt reference
  const cardRef = useRef<HTMLDivElement>(null);

  // Secret 7-tap admin portal shortcut on monogram
  const secretTapCount = useRef(0);
  const secretTapTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [secretFlash, setSecretFlash] = useState(false);

  const handleSecretTap = useCallback(() => {
    secretTapCount.current += 1;
    if (secretTapTimer.current) clearTimeout(secretTapTimer.current);
    secretTapTimer.current = setTimeout(() => {
      secretTapCount.current = 0;
    }, 3000);
    if (secretTapCount.current >= 7) {
      secretTapCount.current = 0;
      if (secretTapTimer.current) clearTimeout(secretTapTimer.current);
      setSecretFlash(true);
      setTimeout(() => {
        setSecretFlash(false);
        router.push('/dashboard');
      }, 600);
    }
  }, [router]);

  useEffect(() => {
    if (configProp) return;
    fetch('/api/invitation/config')
      .then(r => r.json())
      .then(data => setConfig(current => ({ ...current, ...data })))
      .catch(() => {});
  }, [configProp]);

  // Audio setup
  useEffect(() => {
    const audio = new Audio(musicSrc);
    audio.loop = true;
    audio.volume = 0.35;
    audioRef.current = audio;
    return () => {
      audio.pause();
      audio.src = '';
      audioRef.current = null;
    };
  }, [musicSrc]);

  const toggleMusic = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlayingMusic) {
      audio.pause();
      setIsPlayingMusic(false);
    } else {
      audio.play().then(() => setIsPlayingMusic(true)).catch(() => {});
    }
  };

  // Card 3D tilt on pointer move
  useEffect(() => {
    const card = cardRef.current;
    if (!card) return;
    const handleMove = (e: PointerEvent) => {
      const rect = card.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width - 0.5) * 12;
      const y = ((e.clientY - rect.top) / rect.height - 0.5) * -8;
      card.style.transform = `perspective(800px) rotateY(${x}deg) rotateX(${y}deg) scale(1.01)`;
    };
    const handleLeave = () => {
      card.style.transform = '';
    };
    card.addEventListener('pointermove', handleMove);
    card.addEventListener('pointerleave', handleLeave);
    return () => {
      card.removeEventListener('pointermove', handleMove);
      card.removeEventListener('pointerleave', handleLeave);
    };
  }, [activeTab]);

  const handleTabChange = useCallback((id: string) => {
    setActiveTab(id);
  }, []);

  const handleSelectQuest = useCallback((questTag: string) => {
    setActiveQuest(questTag);
    handleTabChange('capture');
  }, [handleTabChange]);

  const handleCaptureComplete = useCallback((_blob?: unknown) => {
    setActiveQuest(curr => {
      if (curr) setCompletedQuests(prev => [...prev, curr]);
      return null;
    });
    handleTabChange('gallery');
  }, [handleTabChange]);

  const openTimeline = () => {
    setShowTimeline(true);
    if (timelineEvents === null) {
      fetchTimelineEvents()
        .then(events => setTimelineEvents(events.filter(e => e.isPublic)))
        .catch(() => setTimelineEvents([]));
    }
  };

  const inviteUrl = typeof window !== 'undefined' ? `${window.location.origin}/invite/${household.qrCode}` : '';

  const handleShare = async () => {
    const shareData = {
      title: `${household.name}'s Wedding Pass`,
      text: `We're celebrating Razia & Abduraziq's wedding — here is our VIP digital pass!`,
      url: inviteUrl,
    };
    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch {}
      return;
    }
    try {
      await navigator.clipboard.writeText(inviteUrl);
      toast({ title: 'Link copied!', description: 'Your VIP pass link is ready to share.' });
    } catch {
      toast({ variant: 'destructive', title: 'Could not copy the link', description: inviteUrl });
    }
  };

  const handleSavePassImage = async () => {
    if (isSavingPass) return;
    setIsSavingPass(true);
    try {
      const filename = `wedding-pass-${household.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}.png`;
      await downloadElementAsImage('guest-digital-pass-card', filename, { width: 1200, height: 1600 });
      toast({ title: '✓ Pass Saved!', description: 'Your VIP pass has been downloaded to your photos.' });
    } catch (err) {
      console.error(err);
      toast({ variant: 'destructive', title: 'Could not save image', description: 'Take a screenshot of your pass instead!' });
    } finally {
      setIsSavingPass(false);
    }
  };

  const copyBankingDetails = () => {
    const details = `Razia & Abduraziq Wedding Registry\nBank: Standard Bank\nAccount Name: Abduraziq & Razia\nAccount Number: 10182938475\nBranch Code: 051001\nReference: ${household.name}`;
    navigator.clipboard.writeText(details).then(
      () => {
        setIsCopied(true);
        toast({ title: 'Banking Details Copied!', description: 'Details copied to clipboard for your convenience.' });
        setTimeout(() => setIsCopied(false), 3000);
      },
      // The Clipboard API can reject — no permission, or an insecure/older
      // browser context — and this call had no failure path at all, so a
      // guest would tap Copy and get no feedback whatsoever, good or bad.
      () => {
        toast({ variant: 'destructive', title: 'Could not copy', description: 'Please copy the details above by hand.' });
      }
    );
  };

  const attendingGuests = household.guests?.filter(g => g.isAttending !== false && g.rsvpStatus !== 'Regret') ?? [];

  return (
    <div
      // Fixed to exactly one viewport, not just a minimum — the shared guest
      // layout this mounts inside only sets `min-h-[100dvh]` on its own
      // <main>, which doesn't cap height. Left at `min-h-screen`, this root
      // grew with its content instead of being clipped to the screen, so the
      // `overflow-y-auto` region below never actually had anything to
      // overflow (its scrollHeight equalled its clientHeight) and the whole
      // page scrolled at the document level instead — through markup that
      // sets `overscroll-behavior: contain` and `-webkit-overflow-scrolling:
      // touch` for an element that isn't the true scroll container, which is
      // the known iOS Safari combination that swallows a touch-scroll gesture
      // rather than handing it up to the document. Pinning the height here
      // makes the inner <main> the one real scroll container regardless of
      // what the ancestor does.
      className="h-[100dvh] w-full flex flex-col relative text-[#1C1C1C] transition-colors duration-700 select-none"
      style={{
        background: partyMode
          ? 'radial-gradient(ellipse at 50% 20%, #032b1e 0%, #021a12 55%, #010a07 100%)'
          : 'radial-gradient(ellipse at 50% 10%, #fffdf8 0%, #faf5ec 45%, #f4ece0 100%)',
      }}
    >
      {/* Secret admin flash overlay */}
      <AnimatePresence>
        {secretFlash && (
          <motion.div
            className="fixed inset-0 z-[999] bg-white pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 1, 0] }}
            transition={{ duration: 0.6, times: [0, 0.3, 1] }}
          />
        )}
      </AnimatePresence>

      {/* Floating subtle ambient particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0" aria-hidden>
        {Array.from({ length: 28 }).map((_, i) => (
          <motion.div
            key={i}
            className="absolute rounded-full bg-[#d4af37]"
            style={{
              width: (i % 3) + 1.5,
              height: (i % 3) + 1.5,
              left: `${(i * 19 + 7) % 100}%`,
              top: `${(i * 23 + 11) % 100}%`,
              opacity: 0.25,
            }}
            animate={{
              y: [0, -32, 0],
              opacity: [0.15, 0.5, 0.15],
              scale: [0.9, 1.25, 0.9],
            }}
            transition={{
              duration: 4 + (i % 4),
              repeat: Infinity,
              ease: 'easeInOut',
              delay: (i % 5) * 0.4,
            }}
          />
        ))}
      </div>

      {/* ── Top Header Monogram & Sound Strip ── */}
      <header
        className="relative z-20 flex-shrink-0 flex items-center justify-between px-4 py-3 border-b backdrop-blur-md transition-all duration-500"
        style={{
          backgroundColor: partyMode ? 'rgba(2, 26, 18, 0.88)' : 'rgba(255, 255, 255, 0.8)',
          borderColor: partyMode ? 'rgba(212, 175, 55, 0.35)' : 'rgba(212, 175, 55, 0.2)',
        }}
      >
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#f6e7b7] via-[#d4af37] to-[#b8992d] flex items-center justify-center shadow-md border border-[#d4af37]/40">
            <span className="text-[11px] font-black text-black tracking-tighter">R&amp;A</span>
          </div>
          <div>
            <motion.h1
              onClick={handleSecretTap}
              className="font-headline italic text-base sm:text-lg font-bold text-[#d4af37] cursor-pointer select-none"
              whileHover={{ scale: 1.02 }}
            >
              Razia &amp; Abduraziq
            </motion.h1>
            <p className="text-[9px] uppercase tracking-widest text-[#1C1C1C]/50 dark:text-white/40 font-medium">
              Sunday, September 6, 2026
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Music Soundtrack Player Toggle */}
          <button
            onClick={toggleMusic}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-semibold transition-all ${
              isPlayingMusic
                ? 'bg-[#d4af37] text-black border-[#d4af37] shadow-[0_0_12px_rgba(212,175,55,0.4)]'
                : 'bg-white/60 text-[#8a6f1f] border-[#d4af37]/30 hover:bg-[#d4af37]/10'
            }`}
            title={isPlayingMusic ? 'Mute romantic soundtrack' : 'Play wedding soundtrack'}
          >
            {isPlayingMusic ? (
              <>
                <Volume2 size={13} />
                <span className="text-[10px] hidden xs:inline font-mono">Playing 🎵</span>
              </>
            ) : (
              <>
                <VolumeX size={13} />
                <span className="text-[10px] hidden xs:inline font-mono">Sound</span>
              </>
            )}
          </button>

          <Button
            size="sm"
            variant="outline"
            onClick={handleShare}
            className="h-8 rounded-full border-[#d4af37]/40 text-xs font-medium gap-1.5 hover:bg-[#d4af37]/10"
          >
            <Share2 size={13} />
            <span className="hidden xs:inline">Share</span>
          </Button>
        </div>
      </header>

      {/* ── Top Tabs Navigation (Desktop & Tablet) ── */}
      <div className="relative z-20 hidden md:flex items-center justify-center gap-2 py-3 px-4 bg-white/40 backdrop-blur-md border-b border-[#d4af37]/15">
        {TABS.map(tab => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={`relative px-5 py-2 rounded-full text-xs font-semibold tracking-wide transition-all duration-300 flex items-center gap-2 ${
                isActive
                  ? 'text-black shadow-md'
                  : 'text-[#1C1C1C]/65 hover:text-black hover:bg-white/50'
              }`}
            >
              {isActive && (
                <motion.div
                  layoutId="desktop-tab-pill"
                  className="absolute inset-0 rounded-full bg-gradient-to-r from-[#f6e7b7] via-[#d4af37] to-[#e4be4a] z-0 shadow-sm"
                  transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                />
              )}
              <tab.icon size={15} className={`relative z-10 ${isActive ? 'text-black' : 'text-[#d4af37]'}`} />
              <span className="relative z-10">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ── Main Tab Content Container ── */}
      <main className="relative z-10 flex-1 overflow-y-auto pb-[calc(6rem+env(safe-area-inset-bottom,0px))] md:pb-12 overscroll-y-contain [-webkit-overflow-scrolling:touch]">
        <div className="grid max-w-4xl mx-auto w-full px-4 pt-4 sm:pt-6">
          {/*
            Deliberately NOT `mode="wait"`. That holds the incoming tab until
            the outgoing one finishes animating out, which makes the switch
            depend on an animation frame actually firing — and a phone in low-
            power mode, or a tab the browser has throttled, may not deliver
            one. Reproduced directly: the nav correctly flips to the tapped
            tab and stays there, but the previous tab's content never leaves
            the screen, so the guest is stuck looking at a stale tab that
            neither scrolls where they expect nor shows what they tapped for.
            Same rAF-throttling failure the wedding intro and the event hub's
            own tab switcher already guard against — crossfading instead means
            the new tab mounts immediately, regardless of the old one's exit.
          */}
          <AnimatePresence>
            {/* ─────────────────────────────────────────────────────────────
                TAB 1: VIP PASS & ITINERARY
            ───────────────────────────────────────────────────────────── */}
            {activeTab === 'pass' && (
              <motion.div
                key="pass-tab"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.35, ease: 'easeOut' }}
                className="space-y-6 [grid-area:1/1]"
              >
                {/* Welcome Greeting & Live Countdown */}
                <div className="text-center space-y-2">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-[0.2em] bg-[#d4af37]/20 text-[#8a6f1f] border border-[#d4af37]/35 shadow-sm">
                    <Sparkles size={11} className="text-[#d4af37]" /> VIP Guest Experience
                  </div>
                  <h2 className="font-headline italic text-3xl sm:text-4xl text-[#1C1C1C]">
                    Honoured to have you,{' '}
                    <span className="text-[#8a6f1f] font-semibold">{household.name}</span>
                  </h2>
                  <p className="text-xs sm:text-sm text-[#1C1C1C]/60 max-w-md mx-auto leading-relaxed">
                    Your exclusive pass and interactive guide for the wedding. Please present this pass or your QR code upon entry!
                  </p>
                  <div className="pt-2">
                    <LiveCountdown targetDate={config.weddingDate} />
                  </div>
                </div>

                {/* Their table, once the couple has imported the seating chart. */}
                <YourTableCard householdId={household.id} />

                {/* ── Evening Celebration & Games Spotlight ── */}
                <div className="bg-gradient-to-r from-[#1b2a22] via-[#0d1f17] to-[#1b2a22] border border-[#d4af37]/40 rounded-3xl p-5 sm:p-6 shadow-xl text-white">
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="text-center sm:text-left space-y-1">
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#d4af37]/20 text-[#f6e7b7] border border-[#d4af37]/30">
                        <Sparkles size={11} className="text-[#d4af37] animate-pulse" /> Celebration Mode Active
                      </div>
                      <h3 className="font-headline italic text-2xl font-bold text-[#f6e7b7]">
                        Join Tonight&apos;s Games &amp; Memories!
                      </h3>
                      <p className="text-xs text-white/70 max-w-md">
                        Complete photo scavenger quests, play couple trivia, and upload your live photos &amp; videos to the big screen wall!
                      </p>
                    </div>

                    <div className="flex flex-wrap sm:flex-nowrap items-center gap-2.5 w-full sm:w-auto">
                      <Button
                        onClick={() => handleTabChange('games')}
                        className="flex-1 sm:flex-initial rounded-2xl bg-gradient-to-r from-[#f6e7b7] via-[#d4af37] to-[#c8a030] text-black font-extrabold h-11 px-5 text-xs shadow-lg hover:scale-105 transition-all"
                      >
                        <Gamepad2 size={16} className="mr-1.5" /> Play Games
                      </Button>
                      <Button
                        onClick={() => handleTabChange('capture')}
                        variant="outline"
                        className="flex-1 sm:flex-initial rounded-2xl border-[#d4af37]/50 bg-white/10 hover:bg-[#d4af37]/20 text-[#f6e7b7] font-bold h-11 px-5 text-xs shadow-sm"
                      >
                        <Camera size={16} className="mr-1.5" /> Upload Media
                      </Button>
                    </div>
                  </div>
                </div>

                {/* ── Holographic VIP Pass Card ── */}
                <div className="relative max-w-lg mx-auto w-full">
                  <motion.div
                    ref={cardRef}
                    id="guest-digital-pass-card"
                    className="relative w-full rounded-3xl overflow-hidden shadow-2xl p-7 sm:p-9 text-center text-white"
                    style={{
                      background:
                        'linear-gradient(145deg, rgba(14,22,18,0.98) 0%, rgba(6,22,12,0.98) 45%, rgba(12,32,20,0.98) 100%)',
                      boxShadow:
                        '0 25px 60px rgba(0,0,0,0.45), 0 0 35px rgba(212,175,55,0.22), inset 0 1px 1px rgba(255,255,255,0.18)',
                      transformStyle: 'preserve-3d',
                      transition: 'transform 0.15s ease-out',
                      border: '1px solid rgba(212,175,55,0.4)',
                    }}
                  >
                    <HoloSweep />

                    {/* Monogram Badge */}
                    <div className="relative z-10 flex items-center justify-between mb-4 border-b border-[#d4af37]/25 pb-3">
                      <div className="text-left">
                        <p className="font-headline italic text-xl font-bold text-[#f6e7b7]">Wedding Pass</p>
                        <p className="text-[9px] uppercase tracking-[0.2em] text-[#d4af37]/80">Confirmed VIP Invitation</p>
                      </div>
                      <div className="w-10 h-10 rounded-full border-2 border-[#d4af37]/60 flex items-center justify-center bg-black/40 shadow-inner">
                        <span className="font-headline italic font-bold text-[#f6e7b7] text-xs">R&amp;A</span>
                      </div>
                    </div>

                    <div className="relative z-10 space-y-4">
                      <div>
                        <p className="text-xs uppercase tracking-widest text-[#d4af37]/75 font-semibold">Honoured Guest</p>
                        <h3 className="font-headline text-2xl sm:text-3xl italic text-[#f6e7b7] font-bold mt-0.5">
                          {household.name}
                        </h3>
                        {attendingGuests.length > 0 && (
                          <div className="flex flex-wrap items-center justify-center gap-1.5 mt-2">
                            {attendingGuests.map(g => (
                              <span
                                key={g.id}
                                className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] bg-white/10 border border-[#d4af37]/30 text-white/90"
                              >
                                <CheckCircle2 size={10} className="text-emerald-400" />
                                {`${g.firstName} ${g.lastName}`.trim()}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="py-2.5 px-4 rounded-2xl bg-white/5 border border-[#d4af37]/20 flex items-center justify-around text-xs text-[#f6e7b7]/90">
                        <div className="flex items-center gap-1.5">
                          <Calendar size={14} className="text-[#d4af37]" />
                          <span>{config.dateTime || 'Sunday, 6 Sept 2026'}</span>
                        </div>
                        <div className="h-4 w-px bg-[#d4af37]/30" />
                        <div className="flex items-center gap-1.5">
                          <MapPin size={14} className="text-[#d4af37]" />
                          <span>{config.location || 'Tuscany in Rylands'}</span>
                        </div>
                      </div>

                      {/* Personal QR Code for Door Check-in */}
                      <div className="pt-1">
                        <p className="text-[10px] uppercase tracking-[0.2em] text-[#d4af37]/75 mb-2.5 font-bold">
                          Door Check-In Code
                        </p>
                        <div className="p-3.5 rounded-2xl bg-white mx-auto w-fit shadow-xl border-2 border-[#d4af37]/45">
                          <QRCode
                            value={household.qrCode || household.id}
                            size={124}
                            bgColor="#ffffff"
                            fgColor="#081e14"
                            level="H"
                          />
                        </div>
                        <p className="text-[9px] font-mono text-white/40 mt-2 tracking-wider">
                          CODE: {household.qrCode || household.id}
                        </p>
                      </div>

                      {/* Quick Action Buttons inside the pass */}
                      <div className="grid grid-cols-2 gap-2.5 pt-2">
                        <Button
                          onClick={() => handleTabChange('capture')}
                          className="rounded-xl bg-gradient-to-r from-[#f6e7b7] via-[#d4af37] to-[#c8a030] hover:from-[#f8ebb9] hover:to-[#b89128] text-black font-bold h-11 text-xs shadow-lg"
                        >
                          <Camera size={15} className="mr-1.5" /> Open Camera
                        </Button>
                        <Button
                          onClick={handleSavePassImage}
                          disabled={isSavingPass}
                          variant="outline"
                          className="rounded-xl bg-white/5 border-[#d4af37]/40 text-[#f6e7b7] hover:bg-[#d4af37]/20 hover:text-white h-11 text-xs font-semibold"
                        >
                          <Download size={15} className="mr-1.5" /> {isSavingPass ? 'Saving…' : 'Save Pass'}
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                </div>

                {/* ── Feature Cards Grid ── */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-2">
                  {/* Timeline Card */}
                  <motion.div
                    whileHover={{ y: -3 }}
                    className="bg-white/80 backdrop-blur-md rounded-2xl p-5 border border-[#d4af37]/25 shadow-md flex flex-col justify-between"
                  >
                    <div>
                      <div className="w-10 h-10 rounded-xl bg-[#d4af37]/15 flex items-center justify-center mb-3">
                        <Clock size={19} className="text-[#8a6f1f]" />
                      </div>
                      <h4 className="font-headline italic text-lg font-bold text-[#1C1C1C]">Wedding Timeline</h4>
                      <p className="text-xs text-[#1C1C1C]/60 mt-1 leading-relaxed">
                        Arrival, ceremony, banquet dinner, speeches &amp; dance floor schedule.
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={openTimeline}
                      className="mt-4 w-full rounded-xl border-[#d4af37]/35 text-[#8a6f1f] hover:bg-[#d4af37]/10 font-semibold text-xs"
                    >
                      View Schedule
                    </Button>
                  </motion.div>

                  {/* Venue & Dress Code */}
                  <motion.div
                    whileHover={{ y: -3 }}
                    className="bg-white/80 backdrop-blur-md rounded-2xl p-5 border border-[#d4af37]/25 shadow-md flex flex-col justify-between"
                  >
                    <div>
                      <div className="w-10 h-10 rounded-xl bg-[#d4af37]/15 flex items-center justify-center mb-3">
                        <Shirt size={19} className="text-[#8a6f1f]" />
                      </div>
                      <h4 className="font-headline italic text-lg font-bold text-[#1C1C1C]">Dress Code &amp; Venue</h4>
                      <p className="text-xs text-[#1C1C1C]/60 mt-1 leading-relaxed">
                        Formal / Modest Elegance. Tuscany in Rylands, Cape Town.
                      </p>
                    </div>
                    <div className="grid grid-cols-2 gap-2 mt-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowDressCode(true)}
                        className="rounded-xl border-[#d4af37]/35 text-[#8a6f1f] hover:bg-[#d4af37]/10 font-semibold text-xs"
                      >
                        Style Guide
                      </Button>
                      <Button
                        asChild
                        variant="outline"
                        size="sm"
                        className="rounded-xl border-[#d4af37]/35 text-[#8a6f1f] hover:bg-[#d4af37]/10 font-semibold text-xs"
                      >
                        <a
                          href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                            config.location || 'Tuscany in Rylands'
                          )}`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <ExternalLink size={12} className="mr-1" /> Maps
                        </a>
                      </Button>
                    </div>
                  </motion.div>

                  {/* Scavenger Hunt & Games */}
                  <motion.div
                    whileHover={{ y: -3 }}
                    className="bg-white/80 backdrop-blur-md rounded-2xl p-5 border border-[#d4af37]/25 shadow-md flex flex-col justify-between"
                  >
                    <div>
                      <div className="w-10 h-10 rounded-xl bg-[#d4af37]/15 flex items-center justify-center mb-3">
                        <Gamepad2 size={19} className="text-[#8a6f1f]" />
                      </div>
                      <h4 className="font-headline italic text-lg font-bold text-[#1C1C1C]">Games &amp; Trivia</h4>
                      <p className="text-xs text-[#1C1C1C]/60 mt-1 leading-relaxed">
                        Complete photo scavenger quests &amp; test your couple trivia knowledge!
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleTabChange('games')}
                      className="mt-4 w-full rounded-xl border-[#d4af37]/35 text-[#8a6f1f] hover:bg-[#d4af37]/10 font-semibold text-xs"
                    >
                      Play Games
                    </Button>
                  </motion.div>
                </div>
              </motion.div>
            )}

            {/* ─────────────────────────────────────────────────────────────
                TAB 2: LIVE MEMORY WALL & GALLERY
            ───────────────────────────────────────────────────────────── */}
            {activeTab === 'gallery' && (
              <motion.div
                key="gallery-tab"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.3 }}
                className="space-y-4 [grid-area:1/1]"
              >
                <div className="flex items-center justify-between bg-white/75 backdrop-blur-md p-4 rounded-2xl border border-[#d4af37]/25 shadow-sm">
                  <div>
                    <h3 className="font-headline italic text-2xl font-bold text-[#1C1C1C]">Live Memory Wall</h3>
                    <p className="text-xs text-[#1C1C1C]/60">Real-time photos &amp; videos from the wedding celebration</p>
                  </div>
                  <Button
                    onClick={() => setIsUploaderOpen(true)}
                    size="sm"
                    className="rounded-full bg-[#d4af37] text-black font-bold hover:bg-[#b8992d] text-xs gap-1.5 shadow-md"
                  >
                    <Camera size={14} /> Add Photo
                  </Button>
                </div>

                <div className="bg-white/60 backdrop-blur-md rounded-2xl p-2 sm:p-4 border border-[#d4af37]/20 shadow-lg">
                  <GalleryFeed partyMode={partyMode} refreshKey={galleryRefreshKey} />
                </div>
              </motion.div>
            )}

            {/* ─────────────────────────────────────────────────────────────
                TAB 3: CAMERA & UPLOAD CENTER (SYNERGY CAM)
            ───────────────────────────────────────────────────────────── */}
            {activeTab === 'capture' && (
              <motion.div
                key="capture-tab"
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.97 }}
                transition={{ duration: 0.3 }}
                className="h-[calc(100dvh-170px)] sm:h-[690px] max-w-xl mx-auto w-full rounded-3xl overflow-hidden shadow-2xl border border-[#d4af37]/35 [grid-area:1/1]"
              >
                <CaptureView
                  guestId={household.qrCode || household.id}
                  questTag={activeQuest}
                  onUploadComplete={handleCaptureComplete}
                />
              </motion.div>
            )}

            {/* ─────────────────────────────────────────────────────────────
                TAB 4: GAMES & PHOTO HUNT
            ───────────────────────────────────────────────────────────── */}
            {activeTab === 'games' && (
              <motion.div
                key="games-tab"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.3 }}
                className="max-w-xl mx-auto [grid-area:1/1]"
              >
                <GamesView onSelectQuest={handleSelectQuest} completedQuests={completedQuests} />
              </motion.div>
            )}

            {/* ─────────────────────────────────────────────────────────────
                TAB 5: WELL WISHES GUESTBOOK
            ───────────────────────────────────────────────────────────── */}
            {activeTab === 'wishes' && (
              <motion.div
                key="wishes-tab"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.3 }}
                className="max-w-xl mx-auto [grid-area:1/1]"
              >
                <WellWishesWall defaultName={household.name} />
              </motion.div>
            )}

            {/* ─────────────────────────────────────────────────────────────
                TAB 6: HONEYMOON REGISTRY & BLESSINGS
            ───────────────────────────────────────────────────────────── */}
            {activeTab === 'gifting' && (
              <motion.div
                key="gifting-tab"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.3 }}
                className="max-w-xl mx-auto space-y-6 [grid-area:1/1]"
              >
                <div className="bg-white/85 backdrop-blur-md rounded-3xl p-6 sm:p-8 border border-[#d4af37]/30 shadow-xl text-center space-y-5">
                  <div className="w-14 h-14 rounded-full bg-[#d4af37]/20 flex items-center justify-center mx-auto shadow-inner">
                    <Gift size={28} className="text-[#8a6f1f]" />
                  </div>

                  <div className="space-y-2">
                    <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#8a6f1f] bg-[#d4af37]/15 px-3 py-1 rounded-full">
                      Honeymoon &amp; Blessings
                    </span>
                    <h3 className="font-headline italic text-3xl font-bold text-[#1C1C1C]">
                      Wishing the Newlyweds
                    </h3>
                    <p className="text-sm text-[#1C1C1C]/65 leading-relaxed max-w-md mx-auto">
                      Your love, prayers, and presence on our special day are the greatest gifts of all.
                      If you wish to honour us with a blessing towards our new beginning and honeymoon adventure,
                      we are deeply grateful.
                    </p>
                  </div>

                  {/* Banking Details Box */}
                  <div className="rounded-2xl bg-[#faf5e8] border border-[#d4af37]/30 p-5 text-left space-y-3 shadow-inner">
                    <div className="flex items-center justify-between border-b border-[#d4af37]/20 pb-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-[#8a6f1f]">
                        EFT / Direct Transfer
                      </span>
                      <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                        South Africa
                      </span>
                    </div>

                    <div className="space-y-1.5 text-xs text-[#1C1C1C]/80 font-mono">
                      <p><strong className="font-sans text-[#1C1C1C]/60">Bank:</strong> Standard Bank</p>
                      <p><strong className="font-sans text-[#1C1C1C]/60">Account Name:</strong> Abduraziq &amp; Razia</p>
                      <p><strong className="font-sans text-[#1C1C1C]/60">Account Number:</strong> 10182938475</p>
                      <p><strong className="font-sans text-[#1C1C1C]/60">Branch Code:</strong> 051001</p>
                      <p><strong className="font-sans text-[#1C1C1C]/60">Reference:</strong> {household.name}</p>
                    </div>

                    <Button
                      onClick={copyBankingDetails}
                      className={cn(
                        'w-full mt-3 rounded-xl font-bold hover:shadow-md text-xs h-10 transition-colors duration-300',
                        isCopied
                          ? 'bg-emerald-500 text-white'
                          : 'bg-gradient-to-r from-[#e9cf8a] via-[#d4af37] to-[#b98a2e] text-black'
                      )}
                    >
                      {isCopied ? '✓ Banking Details Copied!' : '📋 Copy Banking Details'}
                    </Button>
                  </div>

                  <p className="text-xs text-[#1C1C1C]/50 italic">
                    With all our love and gratitude, Razia &amp; Abduraziq 🌿✨
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* ── Floating Mobile Bottom Navigation Bar ── */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 p-2.5 pb-[max(0.625rem,env(safe-area-inset-bottom,0.625rem))] pointer-events-none">
        <motion.div
          className="pointer-events-auto relative flex items-center justify-around max-w-sm mx-auto h-16 rounded-2xl border overflow-hidden shadow-2xl backdrop-blur-2xl"
          style={{
            backgroundColor: partyMode ? 'rgba(2, 26, 18, 0.94)' : 'rgba(255, 255, 255, 0.9)',
            borderColor: partyMode ? 'rgba(212, 175, 55, 0.4)' : 'rgba(212, 175, 55, 0.25)',
          }}
        >
          {TABS.map(tab => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={`relative flex flex-col items-center justify-center flex-1 h-full gap-0.5 transition-colors ${
                  isActive ? 'text-[#8a6f1f] font-bold' : 'text-gray-400 hover:text-gray-700'
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="mobile-tab-indicator"
                    className="absolute inset-x-2 inset-y-1.5 rounded-xl bg-[#d4af37]/15 border border-[#d4af37]/35 z-0"
                    transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                  />
                )}
                <tab.icon size={19} className="relative z-10" />
                <span className="relative z-10 text-[9px] tracking-wide">{tab.badge}</span>
              </button>
            );
          })}
        </motion.div>
      </nav>

      {/* ── Timeline Schedule Modal ── */}
      <Dialog open={showTimeline} onOpenChange={setShowTimeline}>
        <DialogContent className="max-w-md bg-white text-[#1C1C1C] border-[#d4af37]/20 rounded-3xl p-6 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="font-headline text-2xl italic flex items-center gap-2 text-[#8a6f1f]">
              <Clock className="text-[#d4af37]" size={22} /> Wedding Day Schedule
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 max-h-[60vh] overflow-y-auto overscroll-contain pr-1 pt-2 [-webkit-overflow-scrolling:touch]">
            {timelineEvents === null ? (
              <p className="text-sm text-[#1C1C1C]/50 text-center py-6">Loading timeline…</p>
            ) : timelineEvents.length === 0 ? (
              <div className="space-y-3">
                {[
                  { time: '17:30', title: 'Guest Arrival & Welcome Refreshments', desc: 'Welcome drinks in the courtyard garden.' },
                  { time: '18:00', title: 'Wedding Ceremony', desc: 'The union of Razia & Abduraziq.' },
                  { time: '19:00', title: 'Canapés & Sunset Photography', desc: 'Cocktails and candid memories.' },
                  { time: '20:00', title: 'Grand Banquet Dinner & Speeches', desc: 'Dinner served with love.' },
                  { time: '21:30', title: 'First Dance & Celebration', desc: 'Dance floor open for all guests!' },
                ].map((item, idx) => (
                  <div key={idx} className="flex gap-3 rounded-2xl bg-[#faf5e8] border border-[#d4af37]/15 p-3.5">
                    <div className="shrink-0 font-mono text-xs font-bold text-[#8a6f1f] pt-0.5">{item.time}</div>
                    <div>
                      <p className="font-semibold text-sm text-[#1C1C1C]">{item.title}</p>
                      <p className="text-xs text-[#1C1C1C]/60 mt-0.5">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              timelineEvents.map(event => (
                <div key={event.id} className="flex gap-3 rounded-2xl bg-[#faf5e8] border border-[#d4af37]/15 p-3.5">
                  <div className="shrink-0 font-mono text-xs font-bold text-[#8a6f1f] pt-0.5">{event.time}</div>
                  <div>
                    <p className="font-semibold text-sm text-[#1C1C1C]">{event.title}</p>
                    {event.description && <p className="text-xs text-[#1C1C1C]/60 mt-0.5">{event.description}</p>}
                  </div>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Dress Code & Palette Guide Modal ── */}
      <Dialog open={showDressCode} onOpenChange={setShowDressCode}>
        <DialogContent className="max-w-md bg-white text-[#1C1C1C] border-[#d4af37]/20 rounded-3xl p-6 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="font-headline text-2xl italic flex items-center gap-2 text-[#8a6f1f]">
              <Shirt className="text-[#d4af37]" size={22} /> Dress Code &amp; Palette
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="p-4 rounded-2xl bg-[#faf5e8] border border-[#d4af37]/20 space-y-2">
              <p className="font-bold text-sm text-[#1C1C1C]">Formal &amp; Modest Elegance</p>
              <p className="text-xs text-[#1C1C1C]/70 leading-relaxed">
                We encourage our guests to dress in formal, elegant, or traditional attire. Warm earthy tones, emerald greens, classic golds, and muted desert hues are celebrated.
              </p>
            </div>

            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-[#8a6f1f] mb-2.5">
                Suggested Colour Palette
              </p>
              <div className="grid grid-cols-4 gap-2 text-center">
                {[
                  { name: 'Tuscan Gold', hex: '#d4af37', text: '#000' },
                  { name: 'Emerald', hex: '#0f4c3a', text: '#fff' },
                  { name: 'Warm Ivory', hex: '#faf5e8', text: '#000', border: true },
                  { name: 'Terracotta', hex: '#c86446', text: '#fff' },
                ].map((color) => (
                  <div key={color.name} className="flex flex-col items-center gap-1">
                    <div
                      className={`w-12 h-12 rounded-2xl shadow-md flex items-center justify-center text-[10px] font-bold ${
                        color.border ? 'border border-black/10' : ''
                      }`}
                      style={{ backgroundColor: color.hex, color: color.text }}
                    />
                    <span className="text-[10px] text-[#1C1C1C]/70 font-medium">{color.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <MultiMediaUploaderModal
        isOpen={isUploaderOpen}
        onClose={() => setIsUploaderOpen(false)}
        guestId={household.qrCode || household.id}
        defaultQuestTag={activeQuest}
        onUploadSuccess={() => {
          setIsUploaderOpen(false);
          setGalleryRefreshKey(k => k + 1);
        }}
      />
    </div>
  );
}
