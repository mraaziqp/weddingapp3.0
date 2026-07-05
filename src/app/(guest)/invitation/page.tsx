'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useScroll, useTransform } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ChevronDown, Volume2, VolumeX, CalendarPlus, MapPin } from 'lucide-react';
import { InvitationConfig, DEFAULT_INVITATION_CONFIG } from '@/lib/invitation-config';
import { InvitationCard, GoldDust, easeLuxe } from '@/components/invitation-card';

/* Ceremony start: Saturday 6 September 2026, 18:00 SAST (UTC+2). */
const WEDDING_DATE = new Date('2026-09-06T18:00:00+02:00');

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

      {/* Cinematic grading: vignette + candlelight glow so the card always reads */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,rgba(2,4,6,0.55)_62%,rgba(1,2,4,0.92)_100%)]" />
      <div className="absolute inset-0 bg-gradient-to-b from-black/55 via-black/25 to-black/75" />
      <div className="absolute inset-0 opacity-60 bg-[radial-gradient(circle_at_50%_18%,rgba(212,175,55,0.14)_0%,transparent_42%)]" />
    </div>
  );
}

/* ─── Custom ambient audio player ─────────────────────────────────────── */

function AudioPlayer({ src }: { src: string }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isOn, setIsOn] = useState(false);

  // Browsers block un-muted autoplay: start muted for ambience, let the
  // guest opt into sound with one tap.
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = 0.35;
    audio.play().catch(() => {});
  }, []);

  const toggle = () => {
    const audio = audioRef.current;
    if (!audio) return;
    const turningOn = !isOn;
    audio.muted = !turningOn;
    if (turningOn) audio.play().catch(() => {});
    setIsOn(turningOn);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 2.2, duration: 1, ease: easeLuxe }}
      className="fixed bottom-5 right-5 z-40"
      data-print-hide
    >
      <audio ref={audioRef} src={src} loop muted={!isOn} />
      <button
        onClick={toggle}
        aria-label={isOn ? 'Mute background music' : 'Play background music'}
        className="group flex items-center gap-2.5 rounded-full border border-[#d4af37]/30 bg-black/50 py-2.5 pl-3.5 pr-4 backdrop-blur-xl shadow-[0_8px_30px_rgba(0,0,0,0.5),0_0_18px_rgba(212,175,55,0.12)] transition-colors hover:border-[#d4af37]/60 hover:bg-black/65"
      >
        <span className="relative flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-[#f6e7b7] to-[#d4af37] text-black">
          {isOn ? <Volume2 size={13} /> : <VolumeX size={13} />}
          {isOn && (
            <motion.span
              className="absolute inset-0 rounded-full border border-[#d4af37]"
              animate={{ scale: [1, 1.7], opacity: [0.7, 0] }}
              transition={{ duration: 1.6, repeat: Infinity, ease: 'easeOut' }}
            />
          )}
        </span>
        {/* Tiny equalizer */}
        <span className="flex h-4 items-end gap-[2.5px]" aria-hidden>
          {[0, 1, 2, 3].map(i => (
            <motion.span
              key={i}
              className="w-[2.5px] rounded-full bg-[#d4af37]"
              animate={isOn ? { height: ['30%', '95%', '45%', '80%', '30%'] } : { height: '28%' }}
              transition={isOn ? { duration: 1.1 + i * 0.18, repeat: Infinity, ease: 'easeInOut' } : { duration: 0.4 }}
            />
          ))}
        </span>
        <span className="font-body text-[10px] uppercase tracking-[0.22em] text-white/60 group-hover:text-white/85 transition-colors">
          {isOn ? 'Sound on' : 'Sound off'}
        </span>
      </button>
    </motion.div>
  );
}

/* ─── Countdown to the big day ────────────────────────────────────────── */

function Countdown() {
  const [left, setLeft] = useState<{ d: number; h: number; m: number; s: number } | null>(null);

  useEffect(() => {
    const tick = () => {
      const ms = WEDDING_DATE.getTime() - Date.now();
      if (ms <= 0) {
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
  }, []);

  if (!left) return <div className="h-[52px]" aria-hidden />;

  const cells: Array<[number, string]> = [
    [left.d, 'Days'],
    [left.h, 'Hours'],
    [left.m, 'Min'],
    [left.s, 'Sec'],
  ];

  return (
    <div className="flex items-center justify-center gap-5 sm:gap-7">
      {cells.map(([value, label], i) => (
        <div key={label} className="flex items-center gap-5 sm:gap-7">
          {i > 0 && <span className="text-[#d4af37]/40 text-lg font-light">·</span>}
          <div className="flex flex-col items-center">
            <span
              className="text-2xl sm:text-3xl text-[#f6e7b7] tabular-nums"
              style={{ fontFamily: "'Cinzel', serif" }}
            >
              {String(value).padStart(2, '0')}
            </span>
            <span className="font-body mt-0.5 text-[9px] uppercase tracking-[0.28em] text-white/40">
              {label}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ─── Calendar + directions helpers ───────────────────────────────────── */

function googleCalendarUrl(config: InvitationConfig) {
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: `Wedding of ${config.subtitle}`,
    // 18:00–23:59 SAST expressed in UTC
    dates: '20260906T160000Z/20260906T215900Z',
    details: `${config.title} — ${config.dateTime}. Dress code: ${config.dressCode}.`,
    location: config.location,
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

function directionsUrl(config: InvitationConfig) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(config.location)}`;
}

/* ─── Page ────────────────────────────────────────────────────────────── */

export default function InvitationPage() {
  const [config, setConfig] = useState<InvitationConfig | null>(null);
  const [status, setStatus] = useState<'accepted' | 'declined' | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [guestName, setGuestName] = useState('');
  const [dietaryRestrictions, setDietaryRestrictions] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [params, setParams] = useState<URLSearchParams | null>(null);

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

  /* Confirmation screens */
  if (status) {
    const accepted = status === 'accepted';
    return (
      <div className="relative min-h-screen overflow-hidden bg-[#04070a]">
        <GoldDust count={accepted ? 34 : 14} />
        {accepted && (
          <div className="pointer-events-none fixed inset-0 overflow-hidden">
            {Array.from({ length: 26 }).map((_, i) => (
              <motion.div
                key={i}
                className="absolute text-2xl"
                initial={{ opacity: 1, y: -40, x: `${(i * 41 + 7) % 100}%` }}
                animate={{ opacity: 0, y: '105vh', rotate: (i % 2 ? 1 : -1) * 200 }}
                transition={{ duration: 3.4 + (i % 4) * 0.5, delay: (i % 6) * 0.22, ease: 'easeIn' }}
              >
                {['✨', '🥂', '💍', '🕊️', '🌟'][i % 5]}
              </motion.div>
            ))}
          </div>
        )}
        <div className="relative z-10 flex min-h-screen flex-col items-center justify-center gap-8 px-6 text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1.1, ease: easeLuxe }}
            className="flex h-24 w-24 items-center justify-center rounded-full border border-[#d4af37]/50"
          >
            <span className="text-4xl">{accepted ? '🥂' : '🕊️'}</span>
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25, duration: 1.2, ease: easeLuxe }}
            className="text-luxe-gradient text-5xl italic md:text-7xl"
            style={{ fontFamily: "'Playfair Display', serif" }}
          >
            {accepted ? "We Can't Wait" : "You'll Be Missed"}
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.55, duration: 1.2 }}
            className="max-w-xl font-body text-lg leading-relaxed text-white/65"
          >
            {accepted ? (
              <>
                Thank you, <span className="text-[#f6e7b7]">{guestName}</span>. We are overjoyed to
                celebrate with you on <span className="text-[#f6e7b7]">September 6th, 2026</span> at
                Tuscany in Rylands.
              </>
            ) : (
              <>
                Thank you for letting us know, <span className="text-[#f6e7b7]">{guestName}</span>.
                You will be in our hearts on the day.
              </>
            )}
          </motion.p>
          {accepted && dietaryRestrictions && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
              className="rounded-full border border-emerald-400/25 bg-emerald-500/10 px-5 py-2 font-body text-sm text-emerald-300"
            >
              ✓ Dietary notes received: {dietaryRestrictions}
            </motion.p>
          )}
          {accepted && (
            <motion.a
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.9 }}
              href={googleCalendarUrl(config)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 rounded-full border border-[#d4af37]/40 px-6 py-2.5 font-body text-xs uppercase tracking-[0.22em] text-[#f6e7b7] transition-colors hover:bg-[#d4af37]/10"
            >
              <CalendarPlus size={14} /> Add to calendar
            </motion.a>
          )}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1 }}>
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

  /* Main invitation */
  return (
    <div className="relative min-h-screen bg-[#04070a]">
      <Backdrop config={config} parallaxY={parallaxY} />
      <GoldDust />
      {config.musicUrl && <AudioPlayer src={config.musicUrl} />}

      {/* Hero: the card, centered in the first viewport */}
      <section className="relative z-10 flex min-h-screen flex-col items-center justify-center px-4 py-14">
        <InvitationCard config={config} printId />

        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 2.3, duration: 1.1, ease: easeLuxe }}
          className="mt-9 space-y-6"
          data-print-hide
        >
          <Countdown />
          <div className="flex flex-wrap items-center justify-center gap-3">
            <a
              href={googleCalendarUrl(config)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 rounded-full border border-[#d4af37]/35 bg-black/30 px-5 py-2.5 font-body text-[10px] uppercase tracking-[0.24em] text-[#f6e7b7]/90 backdrop-blur-md transition-colors hover:border-[#d4af37]/70 hover:bg-[#d4af37]/10"
            >
              <CalendarPlus size={13} /> Add to calendar
            </a>
            <a
              href={directionsUrl(config)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 rounded-full border border-[#d4af37]/35 bg-black/30 px-5 py-2.5 font-body text-[10px] uppercase tracking-[0.24em] text-[#f6e7b7]/90 backdrop-blur-md transition-colors hover:border-[#d4af37]/70 hover:bg-[#d4af37]/10"
            >
              <MapPin size={13} /> Directions
            </a>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1, y: [0, 8, 0] }}
          transition={{ opacity: { delay: 2.8, duration: 1 }, y: { delay: 2.8, duration: 2, repeat: Infinity, ease: 'easeInOut' } }}
          className="mt-8 flex flex-col items-center gap-1 text-white/45"
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
                    <Input
                      value={guestName}
                      onChange={e => setGuestName(e.target.value)}
                      placeholder="How should we address you?"
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
