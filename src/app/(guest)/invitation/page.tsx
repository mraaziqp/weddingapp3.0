'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useScroll, useTransform, MotionValue } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ChevronDown, Volume2, VolumeX, CalendarPlus, MapPin, Download, Loader2 } from 'lucide-react';
import { toSvg } from 'html-to-image';
import { InvitationConfig, DEFAULT_INVITATION_CONFIG } from '@/lib/invitation-config';
import { InvitationCard, GiftingCard, GoldDust, easeLuxe } from '@/components/invitation-card';
import { DigitalPass } from '@/components/digital-pass';
import { useToast } from '@/hooks/use-toast';
import { supabase, dbToHousehold } from '@/lib/supabase';
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

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const { scrollYProgress } = useScroll();
  const parallaxY = useTransform(scrollYProgress, [0, 1], ['0%', '9%']);
  const { toast } = useToast();

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
        if (data) setResolvedHousehold(dbToHousehold(data));
      });

    if (nameParam) return;

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
        // A single-guest household gets their name filled in; multi-guest joins them with '&'.
        if (guests.length === 1) {
          setGuestName(current => current || guests[0].name);
          setSelectedGuestId(current => current ?? guests[0].id);
        } else if (guests.length > 1) {
          setGuestName(current => current || guests.map(g => g.name).join(' & '));
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

  const downloadCard = async () => {
    const node = document.getElementById('invitation-print-card');
    if (!node || downloadingCard) return;
    setDownloadingCard(true);
    try {
      const rect = node.getBoundingClientRect();
      const pixelRatio = 3; // ≈300dpi at the card's on-screen size — sharp
      // enough to print, small enough to share over WhatsApp/email.

      // html-to-image's toPng()/toCanvas() hang indefinitely on this card:
      // their createImage() helper calls HTMLImageElement.decode() on the
      // generated SVG, and decode() never resolves for SVGs built from
      // foreignObject-embedded HTML (a known Chromium quirk) — verified by
      // isolating each internal step. toSvg() itself works fine and fast,
      // so we take the SVG it produces and do the image-load + canvas-draw
      // ourselves with a plain onload handler instead of decode().
      const rasterize = async () => {
        const svgDataUrl = await toSvg(node, { pixelRatio, skipFonts: true, cacheBust: true });
        return new Promise<string>((resolve, reject) => {
          const img = new Image();
          img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = rect.width * pixelRatio;
            canvas.height = rect.height * pixelRatio;
            const ctx = canvas.getContext('2d');
            if (!ctx) { reject(new Error('no canvas context')); return; }
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            resolve(canvas.toDataURL('image/png'));
          };
          img.onerror = () => reject(new Error('SVG failed to rasterize'));
          img.src = svgDataUrl;
        });
      };

      // Belt-and-braces timeout — every step above has tested fast and
      // reliable, but this guarantees the button can never hang forever.
      const dataUrl = await Promise.race([
        rasterize(),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), 12000)),
      ]);

      const a = document.createElement('a');
      a.download = `${(config?.subtitle ?? 'wedding-invitation').replace(/\s+/g, '-').toLowerCase()}.png`;
      a.href = dataUrl;
      a.click();
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

  /* ─── Envelope Screen (Stunning Animated Cover with Splitting Transition) ─── */
  if (!isOpen) {
    return (
      <div 
        onClick={handleOpenEnvelope}
        className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black overflow-hidden select-none cursor-pointer"
      >
        {config.musicUrl && <audio ref={audioRef} src={config.musicUrl} loop />}

        {/* Ken Burns Animated Background Image */}
        <motion.div
          initial={{ scale: 1 }}
          animate={{ scale: 1.06 }}
          transition={{ duration: 18, ease: 'easeOut', repeat: Infinity, repeatType: 'reverse' }}
          className="absolute inset-0 w-full h-full"
          style={{
            backgroundImage: 'url("/intro-bg.jpg")',
            backgroundSize: 'cover',
            backgroundPosition: 'center 40%',
          }}
        />

        {/* Cinematic Vignette Overlay to darken the background image */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/75 via-black/45 to-black/85 z-10 pointer-events-none" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_20%,rgba(0,0,0,0.85)_100%)] z-10 pointer-events-none" />

        {/* Foreground Content */}
        <div className="relative z-20 flex flex-col items-center justify-between h-full w-full py-16 px-6 text-center text-white">
          
          {/* Top: Arabic Bismillah Calligraphy */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1.2, ease: 'easeOut' }}
            className="flex flex-col items-center"
          >
            <p
              className="text-[9.5vw] xs:text-[7.5vw] md:text-5xl font-medium leading-none text-[#f6e7b7] select-none"
              style={{ fontFamily: "'Amiri', serif" }}
            >
              بِسْمِ اللهِ الرَّحْمٰنِ الرَّحِيْمِ
            </p>
          </motion.div>

          {/* Center: Couple Names and Date */}
          <div className="flex flex-col items-center">
            <motion.p
              initial={{ opacity: 0, letterSpacing: '0.5em' }}
              animate={{ opacity: 1, letterSpacing: '0.3em' }}
              transition={{ delay: 0.3, duration: 1.2 }}
              className="text-[2.6vw] xs:text-[2vw] md:text-xs font-light uppercase text-[#f6e7b7]/80 tracking-[0.3em] mb-4"
              style={{ fontFamily: "'Playfair Display', serif" }}
            >
              The Wedding of
            </motion.p>

            <motion.h1
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.5, duration: 1.4, ease: [0.16, 1, 0.3, 1] }}
              className="text-[12vw] xs:text-[10vw] md:text-7xl font-medium italic leading-none tracking-normal text-transparent bg-clip-text bg-gradient-to-br from-[#fdf6dd] via-[#e9cf8a] to-[#d4af37]"
              style={{
                fontFamily: "'Great Vibes', cursive",
                filter: 'drop-shadow(0 2px 15px rgba(212,175,55,0.25))',
              }}
            >
              Abduraziq &amp; Razia
            </motion.h1>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.9, duration: 1 }}
              className="mt-6 text-[3.2vw] xs:text-[2.6vw] md:text-sm font-semibold tracking-[0.2em] text-white/60 uppercase"
              style={{ fontFamily: "'Playfair Display', serif" }}
            >
              06.09.2026
            </motion.p>
          </div>

          {/* Bottom: Pulse Unveil instruction */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.2, duration: 1.2 }}
            className="flex flex-col items-center gap-3"
          >
            {/* Glowing Golden Pulse Ring */}
            <div className="relative w-10 h-10 flex items-center justify-center">
              <motion.div
                className="absolute inset-0 rounded-full border border-[#d4af37]/50"
                animate={{ scale: [1, 2, 1], opacity: [0.6, 0, 0.6] }}
                transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
              />
              <div className="w-2.5 h-2.5 rounded-full bg-[#d4af37] shadow-[0_0_10px_#d4af37]" />
            </div>

            <p
              className="text-[3vw] xs:text-[2.4vw] md:text-xs font-semibold uppercase tracking-[0.3em] text-[#f6e7b7]/90 mt-2"
              style={{ fontFamily: "'Playfair Display', serif" }}
            >
              Tap anywhere to unveil
            </p>
          </motion.div>
        </div>

        {/* Split Screens Overlay (animating out when isOpening is triggered) */}
        <div className="absolute inset-0 flex flex-col z-30 pointer-events-none">
          {/* Top Half */}
          <motion.div
            className="flex-1 bg-black border-b border-[#d4af37]/25"
            initial={{ y: '0%' }}
            animate={isOpening ? { y: '-100%' } : { y: '0%' }}
            transition={{ duration: 1.05, ease: [0.77, 0, 0.175, 1] }}
          />
          {/* Bottom Half */}
          <motion.div
            className="flex-1 bg-black border-t border-[#d4af37]/25"
            initial={{ y: '0%' }}
            animate={isOpening ? { y: '100%' } : { y: '0%' }}
            transition={{ duration: 1.05, ease: [0.77, 0, 0.175, 1] }}
          />
        </div>
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
        <InvitationCard config={config} guestName={guestName || undefined} printId />

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
            <button
              onClick={downloadCard}
              disabled={downloadingCard}
              className="flex items-center gap-2 rounded-full border border-[#d4af37]/35 bg-black/40 px-5 py-2.5 font-body text-[10px] uppercase tracking-[0.24em] text-[#f6e7b7]/90 backdrop-blur-md transition-colors hover:border-[#d4af37]/70 hover:bg-[#d4af37]/10 disabled:opacity-60"
            >
              {downloadingCard ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
              {downloadingCard ? 'Preparing…' : 'Download Card'}
            </button>
          </div>
          <p className="text-center font-body text-[9px] uppercase tracking-[0.2em] text-white/25">
            Save it, print it, or share it straight to WhatsApp
          </p>
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
                            onClick={() => { setGuestName(g.name); setSelectedGuestId(g.id); }}
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
                      onChange={e => {
                        setGuestName(e.target.value);
                        // Typing something that no longer matches the selected chip
                        // means we can't be sure which guest row this is anymore.
                        if (!householdGuests.some(g => g.name === e.target.value)) setSelectedGuestId(null);
                      }}
                      placeholder={householdGuests.length ? 'Tap your name above, or type it' : 'How should we address you?'}
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
