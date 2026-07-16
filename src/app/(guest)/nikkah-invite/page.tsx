'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, useScroll, useTransform, MotionValue } from 'framer-motion';
import { Download, Loader2, Volume2, VolumeX, Send } from 'lucide-react';
import { InvitationConfig, DEFAULT_INVITATION_CONFIG } from '@/lib/invitation-config';
import { InvitationCard, GoldDust, PetalDrift, WeddingBells, easeLuxe } from '@/components/invitation-card';
import { downloadElementAsImage } from '@/lib/download-card';
import { useToast } from '@/hooks/use-toast';

const staticGoldSpeckles = Array.from({ length: 80 }).map((_, i) => {
  const x = (i * 17 + 7) % 100;
  const y = (i * 23 + 13) % 100;
  const size = 1 + (i % 2); // 1px or 2px gold speckles
  const opacity = 0.35 + (i % 5) * 0.12;
  return { x, y, size, opacity };
});

/* ─── Cinematic backdrop: video > image > aurora, with parallax ───────── */
function Backdrop({ config, parallaxY }: { config: InvitationConfig; parallaxY: MotionValue<string> }) {
  const isNavyRoyal = config.theme === 'navy-royal';

  return (
    <div className="fixed inset-0 z-0 overflow-hidden" data-print-hide>
      <motion.div style={{ y: parallaxY }} className="absolute inset-[-12%]">
        {isNavyRoyal ? (
          <div 
            className="h-full w-full relative"
            style={{
              backgroundColor: '#000307',
              backgroundImage: `
                radial-gradient(circle at 20% 30%, rgba(6, 22, 54, 0.4) 0%, transparent 50%),
                radial-gradient(circle at 80% 40%, rgba(11, 2, 38, 0.4) 0%, transparent 60%),
                radial-gradient(circle at 50% 50%, rgba(0, 32, 69, 0.3) 0%, transparent 70%),
                url("/navy-stars.jpg")
              `,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }}
          >
            {/* Deep navy/black color overlay to keep it dark and rich */}
            <div className="absolute inset-0 bg-gradient-to-b from-[#000307]/50 via-transparent to-[#000307]/75 z-0 pointer-events-none" />

            {/* Gold radial shimmer to make the stars look like gold speckles on the page background */}
            <div 
              className="absolute inset-0 z-0 pointer-events-none opacity-[0.9]" 
              style={{
                background: 'radial-gradient(circle at center, rgba(212,175,55,0.42) 0%, rgba(0,3,10,0.96) 100%)',
                mixBlendMode: 'color-dodge'
              }}
            />

            {/* Rich field of static golden stars/speckles */}
            <div className="absolute inset-0 z-0 pointer-events-none opacity-90">
              {staticGoldSpeckles.map((s, idx) => (
                <div
                  key={idx}
                  className="absolute rounded-full bg-[#d4af37]"
                  style={{
                    left: `${s.x}%`,
                    top: `${s.y}%`,
                    width: s.size,
                    height: s.size,
                    opacity: s.opacity,
                    boxShadow: s.size > 1 ? '0 0 4px 1px rgba(212,175,55,0.45)' : 'none',
                  }}
                />
              ))}
            </div>
          </div>
        ) : config.videoUrl ? (
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

      {/* Cinematic grading overlays (only for classic botanical style) */}
      {!isNavyRoyal && (
        <>
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,rgba(250,248,245,0.15)_65%,rgba(250,248,245,0.55)_100%)]" />
          <div className="absolute inset-0 bg-gradient-to-b from-white/25 via-white/10 to-[#faf8f5]/85" />
          <div className="absolute inset-0 opacity-30 bg-[radial-gradient(circle_at_50%_18%,rgba(212,175,55,0.08)_0%,transparent_45%)]" />
        </>
      )}
    </div>
  );
}

export default function NikkahInvitePage() {
  const [config, setConfig] = useState<InvitationConfig | null>(null);
  const [activeTheme, setActiveTheme] = useState<'classic-botanical' | 'navy-royal' | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
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
    let queryParams: URLSearchParams | null = null;
    if (typeof window !== 'undefined') {
      queryParams = new URLSearchParams(window.location.search);
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
          const tempSide = queryParams.get('side');
          if (tempSide === 'bride') {
            merged.theme = 'navy-royal';
          } else if (tempSide === 'groom') {
            merged.theme = 'classic-botanical';
          }
        }
        setConfig(merged);
        setActiveTheme(merged.theme || 'classic-botanical');
      })
      .catch(() => {
        setConfig(DEFAULT_INVITATION_CONFIG);
        setActiveTheme(DEFAULT_INVITATION_CONFIG.theme || 'classic-botanical');
      });
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
    const emojis = activeTheme === 'navy-royal' ? [] : ['🔔', '🌸', '🌹', '🌺', '🌼', '🌷', '🔔', '🌸', '🌹', '🌼'];
    const newParticles = emojis.length > 0 ? Array.from({ length: 48 }).map((_, i) => {
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
    }) : [];
    setParticles(newParticles);
  };

  const toggleAudio = () => {
    const audio = audioRef.current;
    if (!audio) return;
    const turningOn = !isAudioPlaying;
    audio.muted = !turningOn;
    if (turningOn) audio.play().catch(() => {});
    setIsAudioPlaying(turningOn);
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

  const handleWhatsAppShare = () => {
    if (!phoneNumber) {
      toast({
        variant: 'destructive',
        title: 'Phone number required',
        description: 'Please enter a valid phone number to share.',
      });
      return;
    }
    // Clean phone number (remove spaces, leading zeros, etc. and prep country code if needed)
    let cleaned = phoneNumber.replace(/\D/g, '');
    if (cleaned.startsWith('0') && cleaned.length === 10) {
      cleaned = '27' + cleaned.substring(1); // default to South Africa country code +27
    } else if (!cleaned.startsWith('27') && cleaned.length === 9) {
      cleaned = '27' + cleaned;
    }
    
    // Construct public invitation URL
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://raziazaraaziq.co.za';
    const inviteUrl = `${baseUrl}/nikkah-invite?theme=${activeTheme}`;
    
    const textMessage = `Assalamu Alaikum. You are warmly invited to our Nikaah ceremony. Please view the details and invitation card here: ${inviteUrl}`;
    const whatsappUrl = `https://api.whatsapp.com/send?phone=${cleaned}&text=${encodeURIComponent(textMessage)}`;
    
    window.open(whatsappUrl, '_blank');
  };

  if (!config || !activeTheme) {
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

  const currentTheme = activeTheme;
  const currentConfig = { ...config, theme: currentTheme };

  /* ─── Envelope Screen (Intro Video + Wax Seal Splitting Transition) ─── */
  if (!isOpen) {
    return (
      <div 
        onClick={handleOpenEnvelope}
        className="fixed inset-0 z-50 flex flex-col items-center justify-center overflow-hidden select-none cursor-pointer"
      >
        {/* Living theme backdrop behind the video */}
        <div className="absolute inset-0 z-0">
          <Backdrop config={currentConfig} parallaxY={new MotionValue()} />
          <GoldDust count={currentTheme === 'navy-royal' ? 120 : 26} />
          {currentTheme !== 'navy-royal' && <PetalDrift />}
        </div>

        {/* Floating Cinematic Video Frame */}
        <div className="relative z-10 flex flex-col items-center justify-center w-full h-full p-4">
          <video
            src="/intro-video.mp4"
            autoPlay
            loop
            muted
            playsInline
            onEnded={handleOpenEnvelope}
            className={`w-[calc(min(100vw-32px,(100dvh-160px)*9/16))] aspect-[9/16] max-h-[80vh] rounded-2xl border border-[#d4af37]/30 shadow-[0_20px_50px_rgba(0,0,0,0.5)] object-cover transition-all duration-700 ease-out ${isOpening ? 'opacity-0 scale-110 blur-md' : 'opacity-100 scale-100'}`}
          />
          
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 }}
            className="mt-4 text-center z-20"
          >
            <p
              className="text-[11px] uppercase tracking-[0.25em] text-[#8a6f1f] bg-white/70 px-4 py-1.5 rounded-full border border-[#8a6f1f]/20 backdrop-blur-md shadow-sm animate-pulse"
              style={{ fontFamily: "'Cinzel', serif" }}
            >
              Tap to Open Invitation
            </p>
          </motion.div>
        </div>

        {/* Cinematic Vignette Overlay to darken the background slightly */}
        <div className="absolute inset-0 bg-black/25 z-0 pointer-events-none" />

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
    <div className="relative min-h-screen bg-[#faf8f5]">
      <Backdrop config={currentConfig} parallaxY={parallaxY} />
      <GoldDust count={currentTheme === 'navy-royal' ? 120 : 26} />
      {currentTheme !== 'navy-royal' && <PetalDrift />}

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

      {/* Hero: the Nikaah-only card, centered */}
      <section className="relative z-10 flex min-h-screen flex-col items-center justify-center px-0 sm:px-4 py-14 gap-8">
        {/* Dynamic theme switcher tabs */}
        <div className="flex gap-2 p-1.5 bg-white/60 backdrop-blur-md rounded-full border border-[#8a6f1f]/20 shadow-sm z-30" data-print-hide>
          <button
            onClick={() => setActiveTheme('classic-botanical')}
            className={`px-4 py-2 rounded-full font-body text-[9px] uppercase tracking-[0.16em] font-bold transition-all ${currentTheme === 'classic-botanical' ? 'bg-[#083d1c] text-[#faf8f5] shadow-md' : 'text-[#2e3b32] hover:bg-[#8a6f1f]/10'}`}
          >
            Groom (Botanical)
          </button>
          <button
            onClick={() => setActiveTheme('navy-royal')}
            className={`px-4 py-2 rounded-full font-body text-[9px] uppercase tracking-[0.16em] font-bold transition-all ${currentTheme === 'navy-royal' ? 'bg-[#002855] text-[#faf8f5] shadow-md' : 'text-[#556b82] hover:bg-[#8a6f1f]/10'}`}
          >
            Bride (Navy &amp; Gold)
          </button>
        </div>

        <motion.div
          initial={{ opacity: 0, y: -14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.1, ease: easeLuxe }}
          className="text-center"
          data-print-hide
        >
          <WeddingBells className="mx-auto mb-2 h-6 w-9 text-[#8a6f1f]/75" />
          <p
            className="font-body text-[10px] uppercase tracking-[0.35em] text-[#8a6f1f]"
            style={{ fontFamily: "'Cinzel', serif" }}
          >
            Generic Nikaah Invitation
          </p>
          <p className="mt-2 max-w-md font-body text-xs text-[#031207]/65 px-4">
            No name, no Reception details — just the Nikaah. Download this once and forward
            it to anyone; it doesn&apos;t need a personal link.
          </p>
        </motion.div>

        {/* Nikaah Only Card */}
        <InvitationCard 
          config={currentConfig} 
          nikkahOnly 
          printId 
        />

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
            className={`flex items-center gap-2 rounded-full border border-[#8a6f1f]/35 px-6 py-3 font-body text-[10px] uppercase tracking-[0.24em] text-[#faf8f5] shadow-lg transition-colors disabled:opacity-60 ${currentTheme === 'navy-royal' ? 'bg-[#002855] hover:bg-[#001733]' : 'bg-[#052611] hover:bg-[#031207]'}`}
          >
            {downloading ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
            {downloading ? 'Preparing…' : `Download ${currentTheme === 'navy-royal' ? 'Bride' : 'Groom'} Invite`}
          </button>
          <p className="text-center font-body text-[9px] uppercase tracking-[0.2em] text-[#031207]/55">
            Save it to your device or share it manually
          </p>
        </motion.div>

        {/* WhatsApp Direct Share Panel */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.65, duration: 1, ease: easeLuxe }}
          className="w-full max-w-[95vw] sm:max-w-sm p-5 bg-white/60 backdrop-blur-md rounded-2xl border border-[#8a6f1f]/20 shadow-lg text-center"
          data-print-hide
        >
          <h4 className="font-body text-[10px] uppercase tracking-[0.2em] font-extrabold text-[#031207] mb-2.5">
            Auto-Send to Guest via WhatsApp
          </h4>
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-body text-[10px] font-bold text-[#031207]/45">
                +27
              </span>
              <input
                type="tel"
                value={phoneNumber}
                onChange={e => setPhoneNumber(e.target.value)}
                placeholder="071 866 5122"
                className="w-full pl-11 pr-3 py-2.5 rounded-full border border-[#8a6f1f]/35 bg-white/70 font-body text-xs tracking-wider text-[#031207] placeholder-[#031207]/35 focus:outline-none focus:border-[#d4af37] focus:ring-1 focus:ring-[#d4af37]"
              />
            </div>
            <button
              onClick={handleWhatsAppShare}
              className={`flex items-center justify-center gap-1.5 rounded-full px-5 py-2.5 font-body text-[10px] uppercase tracking-[0.18em] text-white shadow-md transition-colors ${currentTheme === 'navy-royal' ? 'bg-[#002855] hover:bg-[#001733]' : 'bg-[#052611] hover:bg-[#031207]'}`}
            >
              <Send size={11} />
              <span>Share</span>
            </button>
          </div>
          <p className="mt-2 text-[9px] font-body text-[#031207]/55 uppercase tracking-[0.14em]">
            Auto-prefixes +27 country code. Opens WhatsApp web or app.
          </p>
        </motion.div>
      </section>
    </div>
  );
}
