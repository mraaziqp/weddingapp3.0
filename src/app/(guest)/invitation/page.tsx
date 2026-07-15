'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useScroll, useTransform, MotionValue } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ChevronDown, Volume2, VolumeX, CalendarPlus, MapPin, Download, Loader2 } from 'lucide-react';
import { InvitationConfig, DEFAULT_INVITATION_CONFIG } from '@/lib/invitation-config';
import { InvitationCard, GiftingCard, GoldDust, PetalDrift, WeddingBells, FlowerSprig, easeLuxe } from '@/components/invitation-card';
import { DigitalPass } from '@/components/digital-pass';
import { useToast } from '@/hooks/use-toast';
import { supabase, dbToHousehold } from '@/lib/supabase';
import { downloadElementAsImage } from '@/lib/download-card';
import type { Household } from '@/lib/types';

/* Default fallback ceremony start: Saturday 6 September 2026, 18:00 SAST (UTC+2). */
const DEFAULT_WEDDING_DATE = new Date('2026-09-06T18:00:00+02:00');

/* ─── Cinematic backdrop: video > image > aurora, with parallax ───────── */
function Backdrop({ config, parallaxY }: { config: InvitationConfig; parallaxY: MotionValue<string> }) {
  return (
    <div className="fixed inset-0 z-0 overflow-hidden" data-print-hide>
      <motion.div style={{ y: parallaxY }} className="absolute inset-[-12%]">
        {config.videoUrl ? (
          <video
            src={config.videoUrl}
            autoPlay
            loop
            muted
            playsInline
            className="h-full w-full object-cover"
          />
        ) : config.imageUrl ? (
          <motion.img
            src={config.imageUrl}
            alt=""
            initial={{ scale: 1.08 }}
            animate={{ scale: 1 }}
            transition={{ duration: 14, ease: 'easeOut' }}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="h-full w-full bg-[linear-gradient(150deg,var(--aurora-midnight)_0%,var(--aurora-emerald-deep)_45%,#03040a_100%)]" />
        )}
      </motion.div>

      {/* Cinematic grading: soft, light-lively vignette + warm candlelight glow */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,rgba(250,248,245,0.15)_65%,rgba(250,248,245,0.55)_100%)]" />
      <div className="absolute inset-0 bg-gradient-to-b from-white/25 via-white/10 to-[#faf8f5]/85" />
      <div className="absolute inset-0 opacity-30 bg-[radial-gradient(circle_at_50%_18%,rgba(212,175,55,0.08)_0%,transparent_45%)]" />
    </div>
  );
}

/* ─── Countdown Clock: circular timepiece style ──────────────────────── */
function Countdown({ targetDate }: { targetDate?: string }) {
  const [left, setLeft] = useState<{ d: number; h: number; m: number; s: number } | null>(null);

  useEffect(() => {
    const target = targetDate ? new Date(targetDate) : DEFAULT_WEDDING_DATE;
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

  if (!left) return <div className="h-20" aria-hidden />;

  const cells = [
    { value: left.d, label: 'Days' },
    { value: left.h, label: 'Hours' },
    { value: left.m, label: 'Mins' },
    { value: left.s, label: 'Secs' },
  ];

  return (
    <div className="flex items-center justify-center gap-3 sm:gap-4 md:gap-5">
      {cells.map((c, i) => (
        <motion.div
          key={c.label}
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: i * 0.1, duration: 0.8 }}
          className="relative flex flex-col items-center justify-center w-16 h-16 sm:w-20 sm:h-20 rounded-2xl border border-[#8a6f1f]/25 bg-white/80 backdrop-blur-md shadow-[inset_0_1px_10px_rgba(138,111,31,0.08),0_8px_30px_rgba(138,111,31,0.04)]"
        >
          {c.label === 'Secs' && (
            <motion.span
              className="absolute inset-0 rounded-2xl border border-[#8a6f1f]/40"
              animate={{ scale: [1, 1.08, 1], opacity: [0.4, 0.8, 0.4] }}
              transition={{ duration: 1, repeat: Infinity, ease: 'easeInOut' }}
            />
          )}
          <span
            className="text-xl sm:text-2xl font-extrabold text-[#031207] tabular-nums"
            style={{ fontFamily: "'Cinzel', serif" }}
          >
            {String(c.value).padStart(2, '0')}
          </span>
          <span className="font-body mt-0.5 text-[7px] sm:text-[8px] uppercase tracking-[0.25em] text-[#031207]/65">
            {c.label}
          </span>
        </motion.div>
      ))}
    </div>
  );
}

/* ─── Calendar + directions helpers ───────────────────────────────────── */
function googleCalendarUrl(config: InvitationConfig) {
  // Convert standard date string, default to September 6, 2026
  let datesParam = '20260906T160000Z/20260906T215900Z';
  if (config.weddingDate) {
    try {
      const parsedDate = new Date(config.weddingDate);
      if (!isNaN(parsedDate.getTime())) {
        const startISO = parsedDate.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
        const endDate = new Date(parsedDate.getTime() + 6 * 60 * 60 * 1000); // +6 hours
        const endISO = endDate.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
        datesParam = `${startISO}/${endISO}`;
      }
    } catch (_) {}
  }

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: `Wedding of ${config.subtitle}`,
    dates: datesParam,
    details: `${config.title} — ${config.dateTime}. Dress code: ${config.dressCode}.`,
    location: config.location,
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

function directionsUrl(config: InvitationConfig) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(config.location)}`;
}

/* ─── Main Page Component ─────────────────────────────────────────────── */
export default function InvitationPage() {
  const [config, setConfig] = useState<InvitationConfig | null>(null);
  const [status, setStatus] = useState<'accepted' | 'declined' | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [guestName, setGuestName] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [downloadingCard, setDownloadingCard] = useState(false);
  const [params, setParams] = useState<URLSearchParams | null>(null);
  const [householdGuests, setHouseholdGuests] = useState<{ id: string; name: string }[]>([]);
  // The real Supabase guests.id for whoever is responding, when known — lets
  // the RSVP write land on that exact row instead of just a name string.
  const [selectedGuestId, setSelectedGuestId] = useState<string | null>(null);
  // The real household row (with its actual qr_code) — the digital pass's QR
  // code and "Memories" link must use this, not the raw household DB id.
  const [resolvedHousehold, setResolvedHousehold] = useState<Household | null>(null);

  /* Interactive Envelope Reveal states */
  const [isOpening, setIsOpening] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  // A slot for the couple's own soundtrack: drop a file named exactly
  // `invitation-music.mp3` into /public and it plays automatically, no
  // admin upload needed. An admin-uploaded config.musicUrl still wins.
  // musicAvailable flips false silently if the fallback file was never added.
  const [musicAvailable, setMusicAvailable] = useState(true);
  const [particles, setParticles] = useState<{
    id: number;
    emoji: string;
    scale: number;
    rotate: number;
    tx: number;
    ty: number;
    delay: number;
    duration: number;
  }[]>([]);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const { scrollYProgress } = useScroll();
  const parallaxY = useTransform(scrollYProgress, [0, 1], ['0%', '9%']);
  const { toast } = useToast();

  // Admin-uploaded music (config.musicUrl) always wins; otherwise fall back
  // to a static file the couple can drop in themselves — see musicAvailable.
  const musicSrc = config?.musicUrl || '/invitation-music.mp3';

  // One persistent Audio object for the whole visit — created imperatively
  // (not a JSX <audio> tag) so it survives the envelope→invitation screen
  // swap without restarting from 0 or re-requesting autoplay permission.
  useEffect(() => {
    const audio = new Audio(musicSrc);
    audio.loop = true;
    const handleError = () => setMusicAvailable(false);
    audio.addEventListener('error', handleError);
    audioRef.current = audio;
    return () => {
      audio.removeEventListener('error', handleError);
      audio.pause();
      audio.src = '';
      audioRef.current = null;
    };
  }, [musicSrc]);

  useEffect(() => {
    let queryParams: URLSearchParams | null = null;
    if (typeof window !== 'undefined') {
      queryParams = new URLSearchParams(window.location.search);
      setParams(queryParams);
    }
    fetch('/api/invitation/config')
      .then(r => r.json())
      .then(data => {
        const merged = { ...DEFAULT_INVITATION_CONFIG, ...data };
        if (queryParams) {
          const tempTheme = queryParams.get('theme');
          if (tempTheme === 'classic-botanical' || tempTheme === 'navy-royal') {
            merged.theme = tempTheme;
          }
        }
        setConfig(merged);
      })
      .catch(() => setConfig(DEFAULT_INVITATION_CONFIG));
  }, []);

  // Auto-populate the guest's name from their personal invite link.
  // Links look like /invitation?household=<id>; a ?name= param wins outright.
  useEffect(() => {
    if (!params) return;

    const nameParam = params.get('name');
    if (nameParam) setGuestName(nameParam);

    const householdId = params.get('household') || params.get('id');
    if (!householdId) return;

    // Fetch the REAL household row — its actual qr_code (not the raw DB id
    // in the URL) is what the digital pass and Memories link must use.
    supabase
      .from('households')
      .select('*, guests(*)')
      .eq('id', householdId)
      .single()
      .then(({ data }) => {
        if (data) {
          const hh = dbToHousehold(data);
          setResolvedHousehold(hh);

          // Pull autofill from Household Name directly as requested
          if (!nameParam && hh.name) {
            setGuestName(hh.name);
          }

          // Populate the household guests list for the RSVP checkbox fields
          if (hh.guests) {
            const guests = hh.guests.map(g => ({
              id: g.id,
              name: [g.firstName, g.lastName].filter(Boolean).join(' ').trim(),
            })).filter(g => g.name);
            setHouseholdGuests(guests);

            if (guests.length === 1) {
              setSelectedGuestId(current => current ?? guests[0].id);
            }
          }
        }
      });
  }, [params]);

  const handleOpenEnvelope = () => {
    // Guards against the video's onEnded firing after a tap already started
    // the split, or a second tap mid-transition re-triggering everything.
    if (isOpening) return;
    setIsOpening(true);
    // Play audio unmuted (works as it's triggered directly by user click event)
    if (audioRef.current && musicAvailable) {
      audioRef.current.muted = false;
      audioRef.current.volume = 0.35;
      audioRef.current.play().catch(e => console.log('Audio play error:', e));
      setIsAudioPlaying(true);
    }
    
    // Spawn falling wedding bells and flowers particles exploding from the center
    const emojis = ['🔔', '🌸', '🌹', '🌺', '🌼', '🌷', '🔔', '🌸', '🌹', '🌼'];
    const newParticles = Array.from({ length: 48 }).map((_, i) => {
      const emoji = emojis[i % emojis.length];
      const angle = Math.random() * Math.PI * 2;
      const distance = 80 + Math.random() * 240; // travel distance
      return {
        id: i,
        emoji,
        scale: 0.6 + Math.random() * 1.2,
        rotate: Math.random() * 360,
        tx: Math.cos(angle) * distance, // travel x (px)
        ty: Math.sin(angle) * distance + 250, // travel y (px) + gravity fall
        delay: Math.random() * 0.15,
        // Tuned to resolve right around when the envelope finishes parting
        // (~1.15s below), so the burst and the reveal land together.
        duration: 1.1 + Math.random() * 0.5,
      };
    });
    setParticles(newParticles);

    // The split panel's onAnimationComplete (below) is the primary trigger,
    // synced exactly to when the parting animation actually finishes. This
    // timeout is a safety net only — if the tab is backgrounded or a browser
    // quirk ever stops that callback from firing, a guest must never be
    // stuck looking at a half-open envelope forever. Total panel animation
    // is 0.1s delay + 1.05s duration = 1.15s; this fires just after.
    setTimeout(() => setIsOpen(true), 1300);
  };

  const toggleAudio = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isAudioPlaying) {
      audio.pause();
      setIsAudioPlaying(false);
    } else {
      audio.muted = false;
      audio.play().catch(() => {});
      setIsAudioPlaying(true);
    }
  };

  const downloadCard = async () => {
    if (downloadingCard) return;
    setDownloadingCard(true);
    try {
      const filename = `${(config?.subtitle ?? 'wedding-invitation').replace(/\s+/g, '-').toLowerCase()}.png`;
      await downloadElementAsImage('invitation-print-card', filename);
    } catch (err) {
      console.error('[Invitation] Download card failed:', err);
      toast({
        variant: 'destructive',
        title: 'Download failed',
        description: 'Please try Print instead (Ctrl/Cmd+P) — it works even when the download doesn’t.',
      });
    } finally {
      setDownloadingCard(false);
    }
  };



  const submitRsvp = async (rsvpStatus: 'Accepted' | 'Declined') => {
    if (!guestName.trim()) {
      alert('Please enter your name');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/rsvp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          guestId: params?.get('id') || 'guest-' + Date.now(),
          householdId: params?.get('household'),
          // The real guests.id, when we know exactly who's responding — lets
          // the server sync this RSVP straight onto that guest's own row.
          resolvedGuestId: selectedGuestId,
          guestName,
          status: rsvpStatus,
          message: message || undefined,
        }),
      });
      if (res.ok) {
        setStatus(rsvpStatus === 'Accepted' ? 'accepted' : 'declined');
        // Confetti on accept
        if (rsvpStatus === 'Accepted') {
          import('canvas-confetti').then(({ default: confetti }) => {
            const end = Date.now() + 3000;
            const colors = ['#d4af37', '#f6e7b7', '#ffffff'];
            (function frame() {
              confetti({ particleCount: 3, angle: 60, spread: 80, origin: { x: 0, y: 0.6 }, colors });
              confetti({ particleCount: 3, angle: 120, spread: 80, origin: { x: 1, y: 0.6 }, colors });
              if (Date.now() < end) requestAnimationFrame(frame);
            }());
          });
        }
      } else {
        alert('Failed to submit RSVP. Please try again.');
      }
    } catch {
      alert('Error submitting RSVP');
    } finally {
      setSubmitting(false);
    }
  };

  const resetToInvitation = () => {
    setStatus(null);
    setShowForm(false);
    setGuestName('');
    setMessage('');
  };

  if (!config) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#04070a]">
        <motion.div
          className="h-14 w-14 rounded-full border border-[#d4af37]/20 border-t-[#d4af37]"
          animate={{ rotate: 360 }}
          transition={{ duration: 1.4, repeat: Infinity, ease: 'linear' }}
        />
      </div>
    );
  }

  /* ─── Envelope Screen (Intro Video + Wax Seal Splitting Transition) ─── */
  if (!isOpen) {
    return (
      <div 
        onClick={handleOpenEnvelope}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black overflow-hidden select-none cursor-pointer"
      >
        {/* Intro Video Element — softens with a blur+zoom as it hands off to the split */}
        <video
          src="/intro-video.mp4"
          autoPlay
          muted
          playsInline
          onEnded={handleOpenEnvelope}
          className={`absolute inset-0 w-full h-full object-contain z-10 transition-all duration-700 ease-out ${isOpening ? 'opacity-0 scale-110 blur-md' : 'opacity-100 scale-100 blur-0'}`}
        />

        {/* Cinematic Vignette Overlay to darken the video slightly */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/25 via-transparent to-black/55 z-20 pointer-events-none" />

        {/* Falling wedding bells & flowers particles */}
        {particles.map(p => (
          <motion.span
            key={p.id}
            className="absolute z-40 text-4xl pointer-events-none select-none"
            style={{ left: '50%', top: '50%' }}
            initial={{ scale: 0, x: '-50%', y: '-50%', rotate: 0, opacity: 1 }}
            animate={{
              scale: p.scale,
              x: `calc(-50% + ${p.tx}px)`,
              y: `calc(-50% + ${p.ty}px)`,
              rotate: p.rotate + 360,
              opacity: [1, 1, 0],
            }}
            transition={{
              duration: p.duration,
              delay: p.delay,
              ease: 'easeOut',
            }}
          >
            {p.emoji}
          </motion.span>
        ))}

        {/* Split Screens Overlay (beautiful white envelope + golden wax
            seal splitting apart) — fades in first so it blends with the
            video's own blur-out instead of popping in as a hard cut. */}
        {isOpening && (
          <motion.div
            className="absolute inset-0 flex flex-col z-30 pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
          >
            {/* Top Half of Envelope */}
            <motion.div
              className="flex-1 bg-[#ffffff] border-b border-[#d4af37]/35 relative flex items-end justify-center"
              initial={{ y: '0%' }}
              animate={{ y: '-100%' }}
              transition={{ duration: 1.05, delay: 0.1, ease: [0.77, 0, 0.175, 1] }}
            >
              {/* Top Half of Wax Seal */}
              <div 
                className="absolute bottom-[-48px] w-24 h-24 overflow-hidden z-40"
                style={{ clipPath: 'inset(0 0 50% 0)' }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/RA-logo.svg"
                  alt=""
                  className="w-full h-full filter-gold object-contain"
                />
              </div>
              {/* Fine border lines inside the envelope */}
              <div className="absolute inset-[3vw] border border-[#d4af37]/15 rounded-t-[1.5vw] pointer-events-none" />
            </motion.div>

            {/* Bottom Half of Envelope — its completion is what reveals the
                real invitation, so the swap lands exactly when the parting
                animation actually finishes instead of an approximated timer. */}
            <motion.div
              className="flex-1 bg-[#ffffff] border-t border-[#d4af37]/35 relative flex items-start justify-center"
              initial={{ y: '0%' }}
              animate={{ y: '100%' }}
              transition={{ duration: 1.05, delay: 0.1, ease: [0.77, 0, 0.175, 1] }}
              onAnimationComplete={() => setIsOpen(true)}
            >
              {/* Bottom Half of Wax Seal */}
              <div 
                className="absolute top-[-48px] w-24 h-24 overflow-hidden z-40"
                style={{ clipPath: 'inset(50% 0 0 0)' }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/RA-logo.svg"
                  alt=""
                  className="w-full h-full filter-gold object-contain"
                />
              </div>
              
              {/* Unveiling label inside envelope */}
              <div className="mt-16 text-center">
                <p
                  className="text-[2.2vw] xs:text-[1.8vw] md:text-xs font-semibold uppercase tracking-[0.25em] text-[#8a6f1f] animate-pulse"
                  style={{ fontFamily: "'Playfair Display', serif" }}
                >
                  Unveiling...
                </p>
              </div>
              {/* Fine border lines inside the envelope */}
              <div className="absolute inset-[3vw] border border-[#d4af37]/15 rounded-b-[1.5vw] pointer-events-none" />
            </motion.div>
          </motion.div>
        )}
      </div>
    );
  }

  /* ─── RSVP Confirmation passes ─── */
  if (status) {
    const accepted = status === 'accepted';
    if (accepted) {
      // Use the real household record when we have one — its actual qr_code
      // is what makes the QR image and "Memories" deep link resolve to
      // something real, instead of the raw household id from the URL.
      const householdObj: Household = resolvedHousehold
        ? {
            ...resolvedHousehold,
            guests: resolvedHousehold.guests.map(g =>
              g.id === selectedGuestId
                ? { ...g, rsvpStatus: 'Confirmed' }
                : g
            ),
          }
        : {
            id: params?.get('household') || 'hh-' + Date.now(),
            name: guestName,
            address: '',
            guests: [
              {
                id: params?.get('id') || 'guest-' + Date.now(),
                householdId: params?.get('household') || 'hh-' + Date.now(),
                firstName: guestName,
                lastName: '',
                isAttending: true,
                rsvpStatus: 'Confirmed' as const
              }
            ],
            qrCode: params?.get('id') || 'GUEST-' + Date.now()
          };
      return <DigitalPass household={householdObj} config={config ?? undefined} />;
    }

    return (
      <div className="relative min-h-screen overflow-hidden bg-[#04070a]">
        <GoldDust count={14} />
        <div className="relative z-10 flex min-h-screen flex-col items-center justify-center gap-8 px-6 text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1.1, ease: easeLuxe }}
            className="flex h-24 w-24 items-center justify-center rounded-full border border-[#d4af37]/50"
          >
            <span className="text-4xl">🕊️</span>
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25, duration: 1.2, ease: easeLuxe }}
            className="text-luxe-gradient text-5xl italic md:text-7xl"
            style={{ fontFamily: "'Playfair Display', serif" }}
          >
            You&apos;ll Be Missed
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.55, duration: 1.2 }}
            className="max-w-xl font-body text-lg leading-relaxed text-white/65"
          >
            Thank you for letting us know, <span className="text-[#f6e7b7]">{guestName}</span>.
            You will be in our hearts on the day.
          </motion.p>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }}>
            <Button
              onClick={resetToInvitation}
              variant="outline"
              className="border-[#d4af37]/40 bg-transparent font-body tracking-[0.2em] text-[#f6e7b7] hover:bg-[#d4af37]/10 hover:text-[#f6e7b7] uppercase text-xs h-11 px-8"
            >
              ← Back to invitation
            </Button>
          </motion.div>
        </div>
      </div>
    );
  }

  /* ─── Main Invitation Screen ─── */
  return (
    <div className="relative min-h-screen bg-[#faf8f5]">
      <Backdrop config={config} parallaxY={parallaxY} />
      <GoldDust />
      <PetalDrift />

      {/* Floating Audio Button */}
      {musicAvailable && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1, duration: 0.8 }}
          className="fixed bottom-6 right-6 z-40"
          data-print-hide
        >
          <button
            onClick={toggleAudio}
            className="group flex items-center gap-2.5 rounded-full border border-[#8a6f1f]/35 bg-white/75 p-2.5 pr-4 backdrop-blur-xl shadow-lg transition-colors hover:border-[#8a6f1f]/75 hover:bg-white/95"
          >
            <span className="relative flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-[#faf8f5] to-[#8a6f1f] text-white">
              {isAudioPlaying ? <Volume2 size={14} className="text-[#031207]" /> : <VolumeX size={14} className="text-[#031207]" />}
              {isAudioPlaying && (
                <motion.span
                  className="absolute inset-0 rounded-full border border-[#8a6f1f]"
                  animate={{ scale: [1, 1.8], opacity: [0.6, 0] }}
                  transition={{ duration: 1.8, repeat: Infinity, ease: 'easeOut' }}
                />
              )}
            </span>
            {/* Equalizer animation */}
            <span className="flex h-4 items-end gap-[2px]" aria-hidden>
              {[0, 1, 2, 3].map(i => (
                <motion.span
                  key={i}
                  className="w-[2px] rounded-full bg-[#8a6f1f]"
                  animate={isAudioPlaying ? { height: ['25%', '95%', '45%', '85%', '25%'] } : { height: '25%' }}
                  transition={isAudioPlaying ? { duration: 1.2 + i * 0.15, repeat: Infinity, ease: 'easeInOut' } : { duration: 0.3 }}
                />
              ))}
            </span>
            <span className="font-body text-[9px] uppercase tracking-[0.2em] text-[#031207]/60 group-hover:text-[#031207]/95 transition-colors">
              {isAudioPlaying ? 'Mute' : 'Play Music'}
            </span>
          </button>
        </motion.div>
      )}

      {/* Hero: the card, centered in the first viewport */}
      <section className="relative z-10 flex min-h-[100dvh] flex-col items-center justify-center px-0 sm:px-4 py-8">
        <InvitationCard 
          config={config} 
          guestName={guestName || undefined} 
          printId 
          widthClass="w-[calc(min(100vw-32px,(100dvh-120px)*5/7))] sm:w-[500px] md:w-[540px]"
        />

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1, y: [0, 8, 0] }}
          transition={{ opacity: { delay: 2, duration: 1 }, y: { delay: 2, duration: 2, repeat: Infinity, ease: 'easeInOut' } }}
          className="mt-8 flex flex-col items-center gap-1 text-[#031207]/55 animate-bounce"
          data-print-hide
        >
          <span className="font-body text-[10px] uppercase tracking-[0.3em]">Scroll for details</span>
          <ChevronDown size={16} />
        </motion.div>
      </section>

      {/* Info Options & Countdown (placed right below the card viewport) */}
      <section className="relative z-10 flex flex-col items-center px-4 py-12" data-print-hide>
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 1.1, ease: easeLuxe }}
          className="space-y-6 w-full max-w-xl text-center"
        >
          <Countdown targetDate={config.weddingDate} />
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <a
              href={googleCalendarUrl(config)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 rounded-full border border-[#8a6f1f]/35 bg-white/70 px-5 py-2.5 font-body text-[10px] uppercase tracking-[0.24em] text-[#031207] backdrop-blur-md transition-all hover:border-[#8a6f1f]/70 hover:bg-[#8a6f1f]/10 hover:shadow-md"
            >
              <CalendarPlus size={13} /> Add to calendar
            </a>
            <a
              href={directionsUrl(config)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 rounded-full border border-[#8a6f1f]/35 bg-white/70 px-5 py-2.5 font-body text-[10px] uppercase tracking-[0.24em] text-[#031207] backdrop-blur-md transition-all hover:border-[#8a6f1f]/70 hover:bg-[#8a6f1f]/10 hover:shadow-md"
            >
              <MapPin size={13} /> Directions
            </a>
            <button
              onClick={downloadCard}
              disabled={downloadingCard}
              className="flex items-center gap-2 rounded-full border border-[#8a6f1f]/35 bg-white/70 px-5 py-2.5 font-body text-[10px] uppercase tracking-[0.24em] text-[#031207] backdrop-blur-md transition-all hover:border-[#8a6f1f]/70 hover:bg-[#8a6f1f]/10 hover:shadow-md disabled:opacity-60"
            >
              {downloadingCard ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
              {downloadingCard ? 'Preparing…' : 'Download Card'}
            </button>
          </div>
          <p className="font-body text-[9px] uppercase tracking-[0.2em] text-[#031207]/55">
            Save it, print it, or share it straight to WhatsApp
          </p>
        </motion.div>
      </section>

      {/* Details + RSVP (web-only; hidden in print) */}
      <section className="relative z-10 mx-auto max-w-xl px-4 pb-28 space-y-8" data-print-hide>
        {config.extraInfo && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 1.1, ease: easeLuxe }}
            className="rounded-2xl border border-[#8a6f1f]/20 bg-white/90 p-6 text-center backdrop-blur-2xl shadow-[0_15px_45px_rgba(138,111,31,0.08)]"
          >
            <WeddingBells className="mx-auto mb-3 h-6 w-9 text-[#8a6f1f]/75" />
            <p
              className="mb-3 text-[11px] uppercase tracking-[0.3em] text-[#8a6f1f]"
              style={{ fontFamily: "'Cinzel', serif" }}
            >
              Good to know
            </p>
            <p className="font-body leading-relaxed text-[#031207]/80">{config.extraInfo}</p>
          </motion.div>
        )}

        {/* Gifting enclosure card — a paper insert tucked with the invitation */}
        {config.giftingPoem?.trim() && (
          <motion.div
            initial={{ opacity: 0, y: 34, rotate: 0, scale: 0.97 }}
            whileInView={{ opacity: 1, y: 0, rotate: 0, scale: 1 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 1.3, ease: easeLuxe }}
          >
            <GiftingCard poem={config.giftingPoem} />
          </motion.div>
        )}

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 1.1, ease: easeLuxe }}
          className="rounded-2xl border border-[#8a6f1f]/20 bg-white/90 p-6 backdrop-blur-2xl shadow-[0_15px_45px_rgba(138,111,31,0.08)] sm:p-8"
        >
          <AnimatePresence mode="wait" initial={false}>
            {!showForm ? (
              <motion.div
                key="ask"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.35 }}
                className="space-y-5 text-center"
              >
                <span className="flex items-center justify-center gap-3">
                  <FlowerSprig className="h-4 w-7 text-[#8a6f1f]/55 scale-x-[-1]" />
                  <p className="text-2xl italic text-[#031207]/90" style={{ fontFamily: "'Playfair Display', serif" }}>
                    Will you be celebrating with us?
                  </p>
                  <FlowerSprig className="h-4 w-7 text-[#8a6f1f]/55" />
                </span>
                <Button
                  onClick={() => setShowForm(true)}
                  className="h-14 w-full bg-gradient-to-r from-[#e9cf8a] via-[#d4af37] to-[#b98a2e] font-body text-sm font-semibold uppercase tracking-[0.25em] text-black shadow-[0_8px_30px_rgba(212,175,55,0.3)] transition-shadow hover:shadow-[0_10px_40px_rgba(212,175,55,0.45)]"
                >
                  Respond to the invitation
                </Button>
              </motion.div>
            ) : (
              <motion.div
                key="form"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.4, ease: easeLuxe }}
                className="space-y-5"
              >
                <div className="text-center">
                  <p className="text-2xl italic text-[#031207]/90" style={{ fontFamily: "'Playfair Display', serif" }}>
                    Your response
                  </p>
                  <p className="mt-1 font-body text-xs uppercase tracking-[0.25em] text-[#031207]/55">
                    Kindly by {config.rsvpDeadline}
                  </p>
                </div>

                <div className="space-y-4">
                  <div>
                    <Label className="font-body text-xs uppercase tracking-[0.18em] text-[#031207]/70">Your name *</Label>
                    {householdGuests.length > 0 && (
                      <div className="mt-2 flex flex-wrap justify-center gap-2">
                        {householdGuests.map(g => (
                          <button
                            key={g.id}
                            type="button"
                            onClick={() => { setGuestName(g.name); setSelectedGuestId(g.id); }}
                            className={`rounded-full border px-4 py-1.5 font-body text-xs transition-colors ${
                              guestName === g.name
                                ? 'border-[#8a6f1f]/80 bg-[#8a6f1f]/10 text-[#031207]'
                                : 'border-[#8a6f1f]/20 bg-white/40 text-[#031207]/60 hover:border-[#8a6f1f]/60 hover:text-[#031207]'
                            }`}
                          >
                            {g.name}
                          </button>
                        ))}
                      </div>
                    )}
                    <Input
                      value={guestName}
                      onChange={e => {
                        setGuestName(e.target.value);
                        // Typing something that no longer matches the selected chip
                        // means we can't be sure which guest row this is anymore.
                        if (!householdGuests.some(g => g.name === e.target.value)) setSelectedGuestId(null);
                      }}
                      placeholder={householdGuests.length ? 'Tap your name above, or type it' : 'How should we address you?'}
                      className="mt-2 border-[#8a6f1f]/20 bg-white/60 font-body text-[#031207] placeholder:text-[#031207]/30 focus:border-[#8a6f1f]/60 focus:bg-white"
                    />
                  </div>

                  <div>
                    <Label className="font-body text-xs uppercase tracking-[0.18em] text-[#031207]/70">A message for the couple</Label>
                    <Input
                      value={message}
                      onChange={e => setMessage(e.target.value)}
                      placeholder="Optional"
                      className="mt-2 border-[#8a6f1f]/20 bg-white/60 font-body text-[#031207] placeholder:text-[#031207]/30 focus:border-[#8a6f1f]/60 focus:bg-white"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-3 pt-1 sm:flex-row">
                  <Button
                    onClick={() => submitRsvp('Accepted')}
                    disabled={submitting}
                    className="h-12 flex-1 bg-gradient-to-r from-[#e9cf8a] via-[#d4af37] to-[#b98a2e] font-body text-xs font-semibold uppercase tracking-[0.22em] text-black hover:shadow-[0_8px_30px_rgba(212,175,55,0.4)]"
                  >
                    Joyfully accept
                  </Button>
                  <Button
                    onClick={() => submitRsvp('Declined')}
                    disabled={submitting}
                    variant="outline"
                    className="h-12 flex-1 border-[#8a6f1f]/35 bg-transparent font-body text-xs uppercase tracking-[0.22em] text-[#031207]/65 hover:bg-[#8a6f1f]/10 hover:text-[#031207]"
                  >
                    Regretfully decline
                  </Button>
                </div>

                <button
                  onClick={() => setShowForm(false)}
                  className="mx-auto block font-body text-xs uppercase tracking-[0.2em] text-[#031207]/40 transition-colors hover:text-[#031207]/80"
                >
                  ← Back
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 1.4 }}
          className="text-center text-lg italic text-white/40"
          style={{ fontFamily: "'Great Vibes', cursive" }}
        >
          We cannot wait to celebrate with you
        </motion.p>
      </section>
    </div>
  );
}
