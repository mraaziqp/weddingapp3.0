
'use client';
import { useState, useRef, useEffect } from 'react';
import { motion, useScroll, useTransform, AnimatePresence } from 'framer-motion';
import { Calendar, MapPin, Music, Send, Heart, Loader2 } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import type { Household } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { DigitalPass } from './digital-pass';
import { StaggeredText } from './staggered-text';

const GOOGLE_CALENDAR_URL =
  'https://calendar.google.com/calendar/render?action=TEMPLATE' +
  '&text=The+Wedding+of+Razia+%26+Abduraziq' +
  '&dates=20260906T130000Z/20260906T200000Z' +
  '&details=The+union+of+Razia+%26+Abduraziq.+We+cannot+wait+to+celebrate+with+you!' +
  '&location=Tuscany+in+Rylands%2C+Cape+Town%2C+South+Africa' +
  '&sf=true&output=xml';
import { submitRsvpAction } from '@/app/actions';

// ── Floating petal/particle overlay for the invite hero ──────────────────
type Petal = { id: number; x: number; size: number; dur: number; delay: number; drift: number; rot: number; type: 'petal' | 'spark' }
function FloatingPetals({ count = 18 }: { count?: number }) {
  const [petals, setPetals] = useState<Petal[]>([]);
  useEffect(() => {
    setPetals(Array.from({ length: count }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      size: Math.random() * 10 + 6,
      dur: Math.random() * 12 + 10,
      delay: Math.random() * 14,
      drift: (Math.random() - 0.5) * 80,
      rot: Math.random() * 720 - 360,
      type: Math.random() > 0.4 ? 'petal' : 'spark',
    })));
  }, [count]);
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>
      {petals.map(p => (
        <motion.div
          key={p.id}
          className="absolute"
          style={{ left: `${p.x}%`, bottom: 0, opacity: 0 }}
          animate={{ y: [0, -(typeof window !== 'undefined' ? window.innerHeight : 800) * 1.2], x: [0, p.drift], opacity: [0, 0.5, 0], rotate: [0, p.rot] }}
          transition={{ duration: p.dur, delay: p.delay, repeat: Infinity, ease: 'easeOut' }}
        >
          {p.type === 'petal' ? (
            <svg width={p.size} height={p.size * 1.4} viewBox="0 0 10 14" fill="rgba(212,175,55,0.7)" xmlns="http://www.w3.org/2000/svg">
              <ellipse cx="5" cy="7" rx="4" ry="6.5" />
            </svg>
          ) : (
            <svg width={p.size * 0.8} height={p.size * 0.8} viewBox="0 0 20 20" fill="rgba(246,231,183,0.6)" xmlns="http://www.w3.org/2000/svg">
              <path d="M10 0 L11.5 8.5 L20 10 L11.5 11.5 L10 20 L8.5 11.5 L0 10 L8.5 8.5 Z" />
            </svg>
          )}
        </motion.div>
      ))}
    </div>
  );
}

// ── Shimmering gold ornamental divider ────────────────────────────────────
function GoldDivider() {
  return (
    <div className="flex items-center justify-center gap-3 my-6">
      <motion.div
        className="h-px flex-1 max-w-[80px]"
        style={{ background: 'linear-gradient(to right, transparent, rgba(212,175,55,0.6))' }}
        initial={{ scaleX: 0 }}
        whileInView={{ scaleX: 1 }}
        transition={{ duration: 0.8, delay: 0.2 }}
      />
      <motion.span
        className="text-[#d4af37] text-lg"
        initial={{ opacity: 0, scale: 0 }}
        whileInView={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, delay: 0.4, type: 'spring' }}
      >
        ✦
      </motion.span>
      <motion.span
        className="font-headline text-[#d4af37] text-xl italic"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.5 }}
      >
        R&amp;A
      </motion.span>
      <motion.span
        className="text-[#d4af37] text-lg"
        initial={{ opacity: 0, scale: 0 }}
        whileInView={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, delay: 0.4, type: 'spring' }}
      >
        ✦
      </motion.span>
      <motion.div
        className="h-px flex-1 max-w-[80px]"
        style={{ background: 'linear-gradient(to left, transparent, rgba(212,175,55,0.6))' }}
        initial={{ scaleX: 0 }}
        whileInView={{ scaleX: 1 }}
        transition={{ duration: 0.8, delay: 0.2 }}
      />
    </div>
  );
}

export function StoryScrollInvite({ household }: { household: Household }) {
  const [rsvpState, setRsvpState] = useState<'pending' | 'accepted' | 'declined'>('pending');
  const [formStep, setFormStep] = useState<'choice' | 'details' | 'done'>('choice');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const scrollRef = useRef(null);
  const { scrollYProgress } = useScroll({ target: scrollRef });

  const heroOpacity = useTransform(scrollYProgress, [0, 0.12], [1, 0]);
  const heroScale = useTransform(scrollYProgress, [0, 0.12], [1, 0.88]);
  const heroY = useTransform(scrollYProgress, [0, 0.12], [0, -40]);
  const detailsOpacity = useTransform(scrollYProgress, [0.1, 0.22, 0.7], [0, 1, 1]);
  const rsvpOpacity = useTransform(scrollYProgress, [0.72, 0.9], [0, 1]);
  const rsvpY = useTransform(scrollYProgress, [0.72, 0.9], [80, 0]);

  if (formStep === 'done' && rsvpState === 'accepted') {
    return <DigitalPass household={household} />;
  }

  const handleRsvp = async (accepted: boolean) => {
    if (accepted) {
      setFormStep('details');
    } else {
      setIsLoading(true);
      try {
        const result = await submitRsvpAction({
          householdId: household.id,
          rsvpStatus: 'Regret',
          dietary: '',
          song: ''
        });
        if (result.success) {
          setRsvpState('declined');
          setFormStep('done');
          toast({ title: 'RSVP Received', description: "We're sad you can't make it. We appreciate you letting us know." });
        } else {
          toast({ variant: 'destructive', title: 'Oops!', description: 'Something went wrong. Please try again.' });
        }
      } catch (err) {
        toast({ variant: 'destructive', title: 'Error', description: 'Failed to submit RSVP.' });
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);
    const formData = new FormData(event.currentTarget);
    const data = {
      householdId: household.id,
      rsvpStatus: 'Confirmed' as const,
      dietary: String(formData.get('dietary') || ''),
      song: String(formData.get('song') || '')
    };
    const result = await submitRsvpAction(data);
    setIsLoading(false);

    if (result.success) {
      setRsvpState('accepted');
      setFormStep('done');
      const end = Date.now() + 3500;
      const colors = ['#d4af37', '#f6e7b7', '#ffffff', '#c0c0c0', '#ffcba4'];
      import('canvas-confetti').then(({ default: confetti }) => {
        (function frame() {
          confetti({ particleCount: 3, angle: 60, spread: 80, origin: { x: 0, y: 0.6 }, colors, shapes: ['circle', 'square'] });
          confetti({ particleCount: 3, angle: 120, spread: 80, origin: { x: 1, y: 0.6 }, colors, shapes: ['circle', 'square'] });
          if (Date.now() < end) requestAnimationFrame(frame);
        }());
      });
    } else {
      toast({ variant: 'destructive', title: 'Oops!', description: 'Something went wrong. Please try again.' });
    }
  };

  const renderRsvpContent = () => {
    if (formStep === 'done') {
      return (
        <motion.div key="done" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} className="text-center space-y-4">
          <Heart className="mx-auto h-16 w-16 text-gray-300" />
          <h2 className="font-headline text-3xl italic text-[#1C1C1C]/80">Response Received</h2>
          <p className="text-[#1C1C1C]/60">Thank you for letting us know. We'll miss you!</p>
        </motion.div>
      );
    }

    return (
      <div className="w-full text-center">
        <AnimatePresence mode="wait">
          {formStep === 'choice' && (
            <motion.div key="rsvp-choice" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-10">
              <div className="space-y-3">
                <p className="text-[#d4af37]/60 text-xs uppercase tracking-[0.35em]">An invitation to celebrate</p>
                <h2 className="font-headline text-3xl md:text-4xl italic text-[#1C1C1C]">Will you be joining us?</h2>
              </div>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <motion.div whileHover={{ scale: 1.04, y: -2 }} whileTap={{ scale: 0.96 }}>
                  <Button
                    onClick={() => handleRsvp(true)}
                    className="relative overflow-hidden bg-[#D4AF37] hover:bg-[#c8a030] text-white font-medium tracking-widest rounded-full px-10 py-3 shadow-[0_8px_30px_rgba(212,175,55,0.4)] h-14 w-64 text-lg font-headline"
                  >
                    <motion.div
                      className="absolute inset-0 bg-white/10"
                      initial={{ x: '-100%' }}
                      whileHover={{ x: '100%' }}
                      transition={{ duration: 0.4 }}
                    />
                    Joyfully Accept
                  </Button>
                </motion.div>
                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.96 }}>
                  <Button
                    onClick={() => handleRsvp(false)}
                    variant="outline"
                    className="bg-transparent border border-[#D4AF37] text-[#D4AF37] hover:bg-[#D4AF37]/10 font-medium tracking-widest rounded-full px-10 py-3 h-14 w-64 text-lg font-headline"
                  >
                    Regretfully Decline
                  </Button>
                </motion.div>
              </div>
            </motion.div>
          )}

          {formStep === 'details' && (
            <motion.form
              key="rsvp-details"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              onSubmit={handleSubmit}
              className="w-full max-w-lg mx-auto px-6 py-10 space-y-6 text-left"
            >
              <h2 className="font-headline text-3xl italic text-center text-[#1C1C1C] mb-2">We're so excited!</h2>
              <p className="text-center text-[#1C1C1C]/50 text-sm mb-6">Just a few quick details to help us prepare.</p>
              <div className="space-y-2">
                <label htmlFor="dietary" className="text-sm font-medium text-[#1C1C1C]/70 tracking-wide">Dietary requirements for your party?</label>
                <Textarea
                  id="dietary" name="dietary"
                  placeholder="e.g., Vegetarian, Nut Allergy, Halal…"
                  className="bg-white/80 border-[#d4af37]/20 focus:border-[#d4af37] text-base rounded-2xl"
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="song" className="text-sm font-medium text-[#1C1C1C]/70 tracking-wide">Request a song to get you on the dance floor!</label>
                <div className="relative">
                  <Music className="absolute left-4 top-1/2 -translate-y-1/2 text-[#d4af37]/50" size={16} />
                  <Input
                    id="song" name="song"
                    placeholder="Song Title – Artist"
                    className="pl-10 bg-white/80 border-[#d4af37]/20 focus:border-[#d4af37] text-base h-12 rounded-2xl"
                  />
                </div>
              </div>
              <motion.div whileHover={{ scale: 1.02, y: -1 }} whileTap={{ scale: 0.97 }}>
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-[#D4AF37] hover:bg-[#c8a030] text-white h-14 text-base font-medium tracking-widest rounded-full shadow-[0_8px_30px_rgba(212,175,55,0.4)]"
                >
                  {isLoading ? <Loader2 className="animate-spin" size={20} /> : <><Send className="mr-2" size={16} /> Confirm RSVP</>}
                </Button>
              </motion.div>
            </motion.form>
          )}
        </AnimatePresence>
      </div>
    );
  };

  return (
    <div ref={scrollRef} className="min-h-[100dvh] w-full overflow-x-hidden">

      {/* ── SECTION 1: Hero ── */}
      <div className="h-[160vh] relative flex items-center justify-center text-center p-6 flex-col overflow-hidden">
        {/* Cream/blush gradient background */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#fdfbf5] via-[#fef9f0] to-[#faf5e8]" />
        {/* Gold shimmer vignette */}
        <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse at 50% 30%, rgba(212,175,55,0.06) 0%, transparent 70%)' }} />
        {/* Floating petals */}
        <FloatingPetals count={20} />

        <motion.div style={{ opacity: heroOpacity, scale: heroScale, y: heroY }} className="relative z-10 space-y-6 max-w-3xl mx-auto">
          {/* Pre-title */}
          <motion.p
            className="text-[#d4af37]/60 text-xs uppercase tracking-[0.45em] font-light"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.8 }}
          >
            Together with their families
          </motion.p>

          <StaggeredText
            text="The Wedding of"
            el="h2"
            className="font-headline text-2xl md:text-3xl italic text-[#1C1C1C]/50 justify-center"
          />

          {/* Main names with gold shimmer */}
          <div className="relative">
            <StaggeredText
              text="Razia & Abduraziq"
              el="h1"
              className="font-headline text-5xl md:text-7xl lg:text-8xl italic text-[#1C1C1C] justify-center"
            />
            {/* horizontal shimmer line */}
            <motion.div
              className="absolute bottom-0 left-1/2 -translate-x-1/2 h-px w-0"
              style={{ background: 'linear-gradient(to right, transparent, rgba(212,175,55,0.8), transparent)' }}
              animate={{ width: '85%' }}
              transition={{ delay: 1.2, duration: 1.2, ease: 'easeOut' }}
            />
          </div>

          <GoldDivider />

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.6, duration: 1 }}
            className="text-base md:text-xl text-[#1C1C1C]/60 max-w-xl mx-auto leading-relaxed"
          >
            We joyfully invite <span className="font-semibold text-[#1C1C1C]/80">{household.name}</span> to witness and celebrate our union.
          </motion.p>

          {/* Animated scroll hint */}
          <motion.div
            className="flex flex-col items-center gap-2 mt-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 2.2, duration: 0.8 }}
          >
            <p className="text-[#1C1C1C]/30 text-xs tracking-[0.3em] uppercase">scroll</p>
            <motion.div
              className="w-px h-10 bg-gradient-to-b from-[#d4af37]/40 to-transparent"
              animate={{ scaleY: [0, 1, 0], originY: 0 }}
              transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
            />
          </motion.div>
        </motion.div>
      </div>

      {/* ── SECTION 2: Date & Venue ── */}
      <div className="min-h-[100dvh] relative flex items-center justify-center p-6 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-[#faf5e8] via-[#fef9f0] to-[#fdfbf5]" />
        <FloatingPetals count={10} />

        <motion.div style={{ opacity: detailsOpacity }} className="relative z-10 text-center space-y-8 max-w-lg mx-auto px-4">
          <motion.p
            className="text-[#d4af37]/50 text-xs uppercase tracking-[0.45em] font-light"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.8 }}
          >
            Save the date
          </motion.p>

          <motion.p
            className="font-headline text-5xl md:text-6xl italic text-[#d4af37]"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.7 }}
            style={{ textShadow: '0 0 40px rgba(212,175,55,0.25)' }}
          >
            September 6, 2026
          </motion.p>

          <GoldDivider />

          <motion.div
            className="space-y-2"
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.7 }}
          >
            <p className="text-2xl md:text-3xl font-headline italic text-[#1C1C1C]/80">Tuscany in Rylands</p>
            <p className="text-[#1C1C1C]/50 tracking-widest text-sm uppercase">Cape Town, South Africa</p>
          </motion.div>

          <motion.div
            className="flex flex-col sm:flex-row gap-4 justify-center pt-4"
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7, duration: 0.7 }}
          >
            <motion.div whileHover={{ scale: 1.04, y: -2 }} whileTap={{ scale: 0.96 }}>
              <a href={GOOGLE_CALENDAR_URL} target="_blank" rel="noopener noreferrer">
                <Button className="relative overflow-hidden bg-[#D4AF37] hover:bg-[#c8a030] text-white font-medium tracking-widest rounded-full px-8 h-12 shadow-[0_6px_20px_rgba(212,175,55,0.35)] gap-2">
                  <motion.div className="absolute inset-0 bg-white/10" initial={{ x: '-100%' }} whileHover={{ x: '100%' }} transition={{ duration: 0.35 }} />
                  <Calendar size={16} /> Add to Calendar
                </Button>
              </a>
            </motion.div>
            <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.96 }}>
              <a href="https://www.google.com/maps/place/Tuscany+in+Rylands/@-33.9575971,18.5135235,17z" target="_blank" rel="noopener noreferrer">
                <Button variant="outline" className="bg-transparent border border-[#D4AF37] text-[#D4AF37] hover:bg-[#D4AF37]/10 font-medium tracking-widest rounded-full px-8 h-12 gap-2">
                  <MapPin size={16} /> Get Directions
                </Button>
              </a>
            </motion.div>
          </motion.div>
        </motion.div>
      </div>

      {/* ── SECTION 3: RSVP ── */}
      <div className="min-h-[100dvh] relative flex items-center justify-center p-4 pb-24 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-[#fdfbf5] to-[#faf5e8]" />
        <FloatingPetals count={8} />
        <motion.div style={{ opacity: rsvpOpacity, y: rsvpY }} className="relative z-10 w-full max-w-2xl">
          {renderRsvpContent()}
        </motion.div>
      </div>
    </div>
  );
}
