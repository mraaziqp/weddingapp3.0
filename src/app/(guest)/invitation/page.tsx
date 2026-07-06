'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useScroll, useTransform } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ChevronDown, Volume2, VolumeX, CalendarPlus, MapPin, Sparkles, Heart } from 'lucide-react';
import { InvitationConfig, DEFAULT_INVITATION_CONFIG } from '@/lib/invitation-config';
import { InvitationCard, GiftingCard, GoldDust, easeLuxe } from '@/components/invitation-card';
import { DigitalPass } from '@/components/digital-pass';
import { supabase } from '@/lib/supabase';

/* Default fallback ceremony start: Saturday 6 September 2026, 18:00 SAST (UTC+2). */
const DEFAULT_WEDDING_DATE = new Date('2026-09-06T18:00:00+02:00');

/* ─── Cinematic backdrop: video > image > aurora, with parallax ───────── */
function Backdrop({ config, parallaxY }: { config: InvitationConfig; parallaxY: any }) {
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

      {/* Cinematic grading: vignette + candlelight glow */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,rgba(2,4,6,0.60)_65%,rgba(1,2,4,0.95)_100%)]" />
      <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/30 to-black/80" />
      <div className="absolute inset-0 opacity-60 bg-[radial-gradient(circle_at_50%_18%,rgba(212,175,55,0.16)_0%,transparent_45%)]" />
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
          className="relative flex flex-col items-center justify-center w-16 h-16 sm:w-20 sm:h-20 rounded-2xl border border-[#d4af37]/25 bg-black/40 backdrop-blur-md shadow-[inset_0_1px_10px_rgba(212,175,55,0.08),0_8px_30px_rgba(0,0,0,0.4)]"
        >
          {c.label === 'Secs' && (
            <motion.span
              className="absolute inset-0 rounded-2xl border border-[#d4af37]/40"
              animate={{ scale: [1, 1.08, 1], opacity: [0.4, 0.8, 0.4] }}
              transition={{ duration: 1, repeat: Infinity, ease: 'easeInOut' }}
            />
          )}
          <span
            className="text-xl sm:text-2xl font-semibold text-transparent bg-clip-text bg-gradient-to-b from-[#fdf6dd] to-[#d4af37] tabular-nums"
            style={{ fontFamily: "'Cinzel', serif" }}
          >
            {String(c.value).padStart(2, '0')}
          </span>
          <span className="font-body mt-0.5 text-[7px] sm:text-[8px] uppercase tracking-[0.25em] text-[#f6e7b7]/60">
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
  const [dietaryRestrictions, setDietaryRestrictions] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [params, setParams] = useState<URLSearchParams | null>(null);
  const [householdGuests, setHouseholdGuests] = useState<{ id: string; name: string }[]>([]);

  /* Interactive Envelope Reveal states */
  const [isOpening, setIsOpening] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const { scrollYProgress } = useScroll();
  const parallaxY = useTransform(scrollYProgress, [0, 1], ['0%', '9%']);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setParams(new URLSearchParams(window.location.search));
    }
    fetch('/api/invitation/config')
      .then(r => r.json())
      .then(data => setConfig({ ...DEFAULT_INVITATION_CONFIG, ...data }))
      .catch(() => setConfig(DEFAULT_INVITATION_CONFIG));
  }, []);

  // Auto-populate the guest's name from their personal invite link.
  // Links look like /invitation?household=<id>; a ?name= param wins outright.
  useEffect(() => {
    if (!params) return;

    const nameParam = params.get('name');
    if (nameParam) {
      setGuestName(nameParam);
      return;
    }

    const householdId = params.get('household') || params.get('id');
    if (!householdId) return;

    supabase
      .from('guests')
      .select('id, first_name, last_name')
      .eq('household_id', householdId)
      .then(({ data }) => {
        if (!data?.length) return;
        const guests = data.map(g => ({
          id: g.id as string,
          name: [g.first_name, g.last_name].filter(Boolean).join(' ').trim(),
        })).filter(g => g.name);
        setHouseholdGuests(guests);
        // A single-guest household gets their name filled in for them.
        if (guests.length === 1) {
          setGuestName(current => current || guests[0].name);
        }
      });
  }, [params]);

  const handleOpenEnvelope = () => {
    setIsOpening(true);
    // Play audio unmuted (works as it's triggered directly by user click event)
    if (audioRef.current && config?.musicUrl) {
      audioRef.current.muted = false;
      audioRef.current.volume = 0.35;
      audioRef.current.play().catch(e => console.log('Audio play error:', e));
      setIsAudioPlaying(true);
    }
    // Confetti burst
    import('canvas-confetti').then(({ default: confetti }) => {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#d4af37', '#f6e7b7', '#ffffff'],
      });
    });
    // Open envelope
    setTimeout(() => {
      setIsOpen(true);
    }, 850);
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
          guestName,
          status: rsvpStatus,
          dietaryRestrictions: rsvpStatus === 'Accepted' ? dietaryRestrictions || undefined : undefined,
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
    setDietaryRestrictions('');
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

  /* ─── Envelope Screen ─── */
  if (!isOpen) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#030605] overflow-hidden select-none">
        {config.musicUrl && <audio ref={audioRef} src={config.musicUrl} loop muted />}
        {/* Soft vignette + light rays */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,rgba(212,175,55,0.08)_0%,transparent_50%)]" />
        <div className="absolute inset-0 bg-gradient-to-b from-[#060e0b]/40 via-transparent to-[#020403]/80" />
        <div className="pointer-events-none absolute inset-0 opacity-40 bg-[url('data:image/svg+xml,%3Csvg%20viewBox%3D%220%200%20700%20700%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cfilter%20id%3D%22n%22%3E%3CfeTurbulence%20type%3D%22fractalNoise%22%20baseFrequency%3D%220.7%22%20numOctaves%3D%222%22%20stitchTiles%3D%22stitch%22%2F%3E%3C%2Ffilter%3E%3Crect%20width%3D%22100%25%22%20height%3D%22100%25%22%20filter%3D%22url(%23n)%22%2F%3E%3C%2Fsvg%3E')]" />

        {/* Ambient floating dust */}
        <div className="absolute inset-0 pointer-events-none">
          {Array.from({ length: 24 }).map((_, i) => (
            <motion.span
              key={i}
              className="absolute w-[2px] h-[2px] rounded-full bg-[#d4af37]"
              style={{
                left: `${(i * 31 + 7) % 100}%`,
                top: `${(i * 47 + 13) % 100}%`,
                boxShadow: '0 0 6px 1px rgba(212,175,55,0.4)',
              }}
              animate={{
                y: [0, -60, 0],
                opacity: [0, 0.7, 0],
              }}
              transition={{
                duration: 6 + (i % 4) * 2,
                delay: (i % 6) * 0.8,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
            />
          ))}
        </div>

        {/* Envelope Outer Body */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.2, ease: easeLuxe }}
          className="relative flex flex-col items-center text-center px-6 z-10"
        >
          <p className="font-body text-[10px] uppercase tracking-[0.45em] text-[#d4af37]/60 mb-2">
            You are cordially invited
          </p>
          <h2 className="font-headline text-2xl md:text-3xl italic text-white/50 mb-12">
            The Wedding of
          </h2>

          {/* The Seal Container */}
          <div className="relative w-44 h-44 cursor-pointer" onClick={handleOpenEnvelope}>
            {/* Pulsing rings */}
            <motion.div
              className="absolute inset-[-15px] rounded-full border border-[#d4af37]/20"
              animate={{ scale: [1, 1.15, 1], opacity: [0.3, 0.6, 0.3] }}
              transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
            />
            <motion.div
              className="absolute inset-[-4px] rounded-full border border-[#d4af37]/15"
              animate={{ rotate: 360 }}
              transition={{ duration: 25, repeat: Infinity, ease: 'linear' }}
            />

            {/* Breaking Seal (split into two halves) */}
            <div className="relative w-full h-full flex">
              {/* Left Half */}
              <motion.div
                className="absolute inset-0 overflow-hidden"
                style={{ clipPath: 'inset(0 50% 0 0)' }}
                animate={isOpening ? { x: -35, y: 15, rotate: -15, opacity: 0 } : {}}
                transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
              >
                <img
                  src="/RA-logo.svg"
                  alt="Seal Left"
                  className="w-full h-full filter-gold object-contain"
                />
              </motion.div>

              {/* Right Half */}
              <motion.div
                className="absolute inset-0 overflow-hidden"
                style={{ clipPath: 'inset(0 0 0 50%)' }}
                animate={isOpening ? { x: 35, y: 15, rotate: 15, opacity: 0 } : {}}
                transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
              >
                <img
                  src="/RA-logo.svg"
                  alt="Seal Right"
                  className="w-full h-full filter-gold object-contain"
                />
              </motion.div>
            </div>
          </div>

          <h1 className="font-headline mt-12 text-4xl md:text-5xl italic text-transparent bg-clip-text bg-gradient-to-br from-[#fdf6dd] via-[#e9cf8a] to-[#d4af37]">
            {config.subtitle}
          </h1>
          <p className="font-body mt-2 text-[10px] uppercase tracking-[0.3em] text-[#d4af37]/75">
            September 6, 2026 · Cape Town
          </p>

          <motion.button
            onClick={handleOpenEnvelope}
            className="mt-14 px-8 py-3 rounded-full border border-[#d4af37]/45 bg-[#d4af37]/10 text-[#f6e7b7] font-body text-xs uppercase tracking-[0.25em] shadow-[0_0_15px_rgba(212,175,55,0.15)] transition-all hover:bg-[#d4af37]/20 hover:shadow-[0_0_25px_rgba(212,175,55,0.3)]"
            animate={{
              boxShadow: [
                '0 0 10px rgba(212,175,55,0.05)',
                '0 0 25px rgba(212,175,55,0.25)',
                '0 0 10px rgba(212,175,55,0.05)',
              ],
            }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            Open Invitation
          </motion.button>
        </motion.div>
      </div>
    );
  }

  /* ─── RSVP Confirmation passes ─── */
  if (status) {
    const accepted = status === 'accepted';
    if (accepted) {
      // Build personalized Digital Pass
      const householdObj = {
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
            rsvpStatus: 'Confirmed' as const,
            dietaryRestrictions: dietaryRestrictions || undefined
          }
        ],
        qrCode: params?.get('id') || 'GUEST-' + Date.now()
      };
      return <DigitalPass household={householdObj} />;
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
            You'll Be Missed
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
    <div className="relative min-h-screen bg-[#04070a]">
      {config.musicUrl && <audio ref={audioRef} src={config.musicUrl} loop muted={!isAudioPlaying} autoPlay />}
      <Backdrop config={config} parallaxY={parallaxY} />
      <GoldDust />

      {/* Floating Audio Button */}
      {config.musicUrl && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1, duration: 0.8 }}
          className="fixed bottom-6 right-6 z-40"
          data-print-hide
        >
          <button
            onClick={toggleAudio}
            className="group flex items-center gap-2.5 rounded-full border border-[#d4af37]/35 bg-black/60 p-2.5 pr-4 backdrop-blur-xl shadow-2xl transition-colors hover:border-[#d4af37]/75 hover:bg-black/75"
          >
            <span className="relative flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-[#fdf6dd] to-[#d4af37] text-black">
              {isAudioPlaying ? <Volume2 size={14} /> : <VolumeX size={14} />}
              {isAudioPlaying && (
                <motion.span
                  className="absolute inset-0 rounded-full border border-[#d4af37]"
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
                  className="w-[2px] rounded-full bg-[#d4af37]"
                  animate={isAudioPlaying ? { height: ['25%', '95%', '45%', '85%', '25%'] } : { height: '25%' }}
                  transition={isAudioPlaying ? { duration: 1.2 + i * 0.15, repeat: Infinity, ease: 'easeInOut' } : { duration: 0.3 }}
                />
              ))}
            </span>
            <span className="font-body text-[9px] uppercase tracking-[0.2em] text-white/50 group-hover:text-white/80 transition-colors">
              {isAudioPlaying ? 'Mute' : 'Play Music'}
            </span>
          </button>
        </motion.div>
      )}

      {/* Hero: the card, centered in the first viewport */}
      <section className="relative z-10 flex min-h-screen flex-col items-center justify-center px-4 py-14">
        <InvitationCard config={config} printId />

        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.2, duration: 1.1, ease: easeLuxe }}
          className="mt-12 space-y-6"
          data-print-hide
        >
          <Countdown targetDate={config.weddingDate} />
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <a
              href={googleCalendarUrl(config)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 rounded-full border border-[#d4af37]/35 bg-black/40 px-5 py-2.5 font-body text-[10px] uppercase tracking-[0.24em] text-[#f6e7b7]/90 backdrop-blur-md transition-colors hover:border-[#d4af37]/70 hover:bg-[#d4af37]/10"
            >
              <CalendarPlus size={13} /> Add to calendar
            </a>
            <a
              href={directionsUrl(config)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 rounded-full border border-[#d4af37]/35 bg-black/40 px-5 py-2.5 font-body text-[10px] uppercase tracking-[0.24em] text-[#f6e7b7]/90 backdrop-blur-md transition-colors hover:border-[#d4af37]/70 hover:bg-[#d4af37]/10"
            >
              <MapPin size={13} /> Directions
            </a>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1, y: [0, 8, 0] }}
          transition={{ opacity: { delay: 2, duration: 1 }, y: { delay: 2, duration: 2, repeat: Infinity, ease: 'easeInOut' } }}
          className="mt-10 flex flex-col items-center gap-1 text-white/45 animate-bounce"
          data-print-hide
        >
          <span className="font-body text-[10px] uppercase tracking-[0.3em]">Respond below</span>
          <ChevronDown size={16} />
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
            className="rounded-2xl border border-white/12 bg-white/[0.05] p-6 text-center backdrop-blur-2xl shadow-[0_18px_55px_rgba(0,0,0,0.4)]"
          >
            <p
              className="mb-3 text-[11px] uppercase tracking-[0.3em] text-[#d4af37]/80"
              style={{ fontFamily: "'Cinzel', serif" }}
            >
              Good to know
            </p>
            <p className="font-body leading-relaxed text-white/70">{config.extraInfo}</p>
          </motion.div>
        )}

        {/* Gifting enclosure card — a paper insert tucked with the invitation */}
        {config.giftingPoem?.trim() && (
          <motion.div
            initial={{ opacity: 0, y: 34, rotate: -3, scale: 0.97 }}
            whileInView={{ opacity: 1, y: 0, rotate: -1.2, scale: 1 }}
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
          className="rounded-2xl border border-white/12 bg-white/[0.05] p-6 backdrop-blur-2xl shadow-[0_18px_55px_rgba(0,0,0,0.4)] sm:p-8"
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
                <p className="text-2xl italic text-white/90" style={{ fontFamily: "'Playfair Display', serif" }}>
                  Will you be celebrating with us?
                </p>
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
                  <p className="text-2xl italic text-white/90" style={{ fontFamily: "'Playfair Display', serif" }}>
                    Your response
                  </p>
                  <p className="mt-1 font-body text-xs uppercase tracking-[0.25em] text-white/40">
                    Kindly by {config.rsvpDeadline}
                  </p>
                </div>

                <div className="space-y-4">
                  <div>
                    <Label className="font-body text-xs uppercase tracking-[0.18em] text-white/55">Your name *</Label>
                    {householdGuests.length > 0 && (
                      <div className="mt-2 flex flex-wrap justify-center gap-2">
                        {householdGuests.map(g => (
                          <button
                            key={g.id}
                            type="button"
                            onClick={() => setGuestName(g.name)}
                            className={`rounded-full border px-4 py-1.5 font-body text-xs transition-colors ${
                              guestName === g.name
                                ? 'border-[#d4af37]/80 bg-[#d4af37]/20 text-[#f6e7b7]'
                                : 'border-white/15 bg-white/5 text-white/60 hover:border-[#d4af37]/40 hover:text-white/85'
                            }`}
                          >
                            {g.name}
                          </button>
                        ))}
                      </div>
                    )}
                    <Input
                      value={guestName}
                      onChange={e => setGuestName(e.target.value)}
                      placeholder={householdGuests.length ? 'Tap your name above, or type it' : 'How should we address you?'}
                      className="mt-2 border-white/15 bg-white/5 font-body text-white placeholder:text-white/30"
                    />
                  </div>
                  <div>
                    <Label className="font-body text-xs uppercase tracking-[0.18em] text-white/55">Dietary requirements</Label>
                    <Input
                      value={dietaryRestrictions}
                      onChange={e => setDietaryRestrictions(e.target.value)}
                      placeholder="Halal is served — tell us about allergies etc."
                      className="mt-2 border-white/15 bg-white/5 font-body text-white placeholder:text-white/30"
                    />
                  </div>
                  <div>
                    <Label className="font-body text-xs uppercase tracking-[0.18em] text-white/55">A message for the couple</Label>
                    <Input
                      value={message}
                      onChange={e => setMessage(e.target.value)}
                      placeholder="Optional"
                      className="mt-2 border-white/15 bg-white/5 font-body text-white placeholder:text-white/30"
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
                    className="h-12 flex-1 border-white/20 bg-transparent font-body text-xs uppercase tracking-[0.22em] text-white/65 hover:bg-white/10 hover:text-white"
                  >
                    Regretfully decline
                  </Button>
                </div>

                <button
                  onClick={() => setShowForm(false)}
                  className="mx-auto block font-body text-xs uppercase tracking-[0.2em] text-white/35 transition-colors hover:text-white/60"
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
