'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, useScroll, useTransform, MotionValue } from 'framer-motion';
import { Download, Loader2, Volume2, VolumeX } from 'lucide-react';
import { InvitationConfig, DEFAULT_INVITATION_CONFIG } from '@/lib/invitation-config';
import { InvitationCard, GoldDust, PetalDrift, WeddingBells, easeLuxe } from '@/components/invitation-card';
import { downloadElementAsImage } from '@/lib/download-card';
import { useToast } from '@/hooks/use-toast';

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

export default function NikkahInvitePage() {
  const [config, setConfig] = useState<InvitationConfig | null>(null);
  const [downloading, setDownloading] = useState(false);
  const { toast } = useToast();

  /* Interactive Envelope Reveal states */
  const [isOpening, setIsOpening] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
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

  const musicSrc = config?.musicUrl || '/invitation-music.mp3';

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
    fetch('/api/invitation/config')
      .then(r => r.json())
      .then(data => setConfig({ ...DEFAULT_INVITATION_CONFIG, ...data }))
      .catch(() => setConfig(DEFAULT_INVITATION_CONFIG));
  }, []);

  const handleOpenEnvelope = () => {
    if (isOpening) return;
    setIsOpening(true);
    // Play audio unmuted
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
        duration: 1.8 + Math.random() * 1.2,
      };
    });
    setParticles(newParticles);
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

  const download = async () => {
    if (downloading) return;
    setDownloading(true);
    try {
      await downloadElementAsImage('invitation-print-card', 'nikaah-invitation.png');
    } catch (err) {
      console.error('[Nikkah Invite] Download failed:', err);
      toast({
        variant: 'destructive',
        title: 'Download failed',
        description: 'Please try Print instead (Ctrl/Cmd+P) — it works even when the download doesn’t.',
      });
    } finally {
      setDownloading(false);
    }
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
        {/* Intro Video Element */}
        <video
          src="/intro-video.mp4"
          autoPlay
          muted
          playsInline
          onEnded={handleOpenEnvelope}
          className={`absolute inset-0 w-full h-full object-cover z-10 transition-opacity duration-500 ${isOpening ? 'opacity-0' : 'opacity-100'}`}
        />

        {/* Cinematic Vignette Overlay to darken the video slightly */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/45 z-20 pointer-events-none" />

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

        {/* Split Screens Overlay (White Envelope + Golden Wax Seal splitting apart) */}
        {isOpening && (
          <div className="absolute inset-0 flex flex-col z-30 pointer-events-none">
            {/* Top Half of Envelope */}
            <motion.div
              className="flex-1 bg-[#ffffff] border-b border-[#d4af37]/35 relative flex items-end justify-center"
              initial={{ y: '0%' }}
              animate={{ y: '-100%' }}
              transition={{ duration: 1.05, ease: [0.77, 0, 0.175, 1] }}
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

            {/* Bottom Half of Envelope */}
            <motion.div
              className="flex-1 bg-[#ffffff] border-t border-[#d4af37]/35 relative flex items-start justify-center"
              initial={{ y: '0%' }}
              animate={{ y: '100%' }}
              transition={{ duration: 1.05, ease: [0.77, 0, 0.175, 1] }}
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
          </div>
        )}
      </div>
    );
  }

  /* ─── Main Nikaah Invitation Screen ─── */
  return (
    <div className="relative min-h-screen bg-[#04070a]">
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

      {/* Hero: the Nikaah-only card, centered */}
      <section className="relative z-10 flex min-h-screen flex-col items-center justify-center px-0 sm:px-4 py-14 gap-8">
        <motion.div
          initial={{ opacity: 0, y: -14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.1, ease: easeLuxe }}
          className="text-center"
          data-print-hide
        >
          <WeddingBells className="mx-auto mb-2 h-6 w-9 text-[#d4af37]/60" />
          <p
            className="font-body text-[10px] uppercase tracking-[0.35em] text-[#f6e7b7]/70"
            style={{ fontFamily: "'Cinzel', serif" }}
          >
            Generic Nikaah Invitation
          </p>
          <p className="mt-2 max-w-md font-body text-xs text-white/60">
            No name, no Reception details — just the Nikaah. Download this once and forward
            it to anyone; it doesn&apos;t need a personal link.
          </p>
        </motion.div>

        {/* Nikaah Only Card */}
        <InvitationCard config={config} nikkahOnly printId />

        {/* Download Action Button */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 1, ease: easeLuxe }}
          className="flex flex-col items-center gap-3"
          data-print-hide
        >
          <button
            onClick={download}
            disabled={downloading}
            className="flex items-center gap-2 rounded-full border border-[#d4af37]/35 bg-[#122217] px-6 py-3 font-body text-[10px] uppercase tracking-[0.24em] text-[#f6e7b7] shadow-lg transition-colors hover:bg-[#1a3220] disabled:opacity-60"
          >
            {downloading ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
            {downloading ? 'Preparing…' : 'Download Nikaah Invite'}
          </button>
          <p className="text-center font-body text-[9px] uppercase tracking-[0.2em] text-white/40">
            Save it, print it, or share it straight to WhatsApp
          </p>
        </motion.div>
      </section>
    </div>
  );
}
