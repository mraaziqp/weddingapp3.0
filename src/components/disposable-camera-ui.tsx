
'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Film, Zap, ZapOff, RotateCcw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { upload } from '@vercel/blob/client';
import Image from 'next/image';
import { cn } from '@/lib/utils';

const TOTAL_SHOTS = 20;

interface DisposableCameraUIProps {
  guestId: string;
  visibility: 'public' | 'private';
  questTag?: string | null;
  onUploadComplete: (blob?: unknown) => void;
}

// Retro LED-digit display for shot counter
function FilmCounter({ shotsLeft, total }: { shotsLeft: number; total: number }) {
  const used = total - shotsLeft;
  return (
    <div className="flex items-center gap-1.5">
      <div className="bg-black rounded px-2 py-1 border border-orange-400/40 shadow-[inset_0_0_6px_rgba(0,0,0,0.8),0_0_8px_rgba(245,166,35,0.3)]">
        <span className="font-mono text-sm font-bold text-orange-400 tabular-nums tracking-wider"
          style={{ textShadow: '0 0 8px rgba(245,166,35,0.9)' }}>
          {String(used).padStart(2, '0')}
        </span>
      </div>
      <span className="font-mono text-[10px] text-orange-400/50">/</span>
      <span className="font-mono text-[10px] text-orange-400/50">{total}</span>
    </div>
  );
}

// Small film-strip thumbnails of recent shots
function FilmStrip({ shots }: { shots: string[] }) {
  if (shots.length === 0) return null;
  return (
    <div className="flex gap-2 items-center justify-center">
      {shots.slice(-4).map((src, i) => (
        <motion.div
          key={i}
          initial={{ scale: 0, rotate: -10 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          className="w-10 h-10 rounded border-2 border-orange-400/50 overflow-hidden bg-black/20 shadow-md flex-shrink-0"
          style={{ outline: '1px solid rgba(0,0,0,0.5)' }}
        >
          <Image src={src} alt={`shot ${i + 1}`} width={40} height={40} className="object-cover w-full h-full" />
        </motion.div>
      ))}
    </div>
  );
}

export function DisposableCameraUI({ guestId, visibility, questTag, onUploadComplete }: DisposableCameraUIProps) {
  const [shotsLeft, setShotsLeft] = useState(TOTAL_SHOTS);
  const [isAnimating, setIsAnimating] = useState(false);
  const [isFlashing, setIsFlashing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [flashOn, setFlashOn] = useState(true);
  const [recentShots, setRecentShots] = useState<string[]>([]);
  const [polaroidSrc, setPolaroidSrc] = useState<string | null>(null);
  const [polaroidVisible, setPolaroidVisible] = useState(false);
  const [isWinding, setIsWinding] = useState(false);

  // Camera stream state
  const [hasCamera, setHasCamera] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const { toast } = useToast();

  // Try to start live camera preview
  useEffect(() => {
    let mounted = true;
    async function startCamera() {
      if (!navigator.mediaDevices?.getUserMedia) return;
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 960 } },
          audio: false,
        });
        if (!mounted) { stream.getTracks().forEach(t => t.stop()); return; }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }
        setHasCamera(true);
      } catch {
        // Permission denied or no camera — file picker fallback is still active
      }
    }
    startCamera();
    return () => {
      mounted = false;
      streamRef.current?.getTracks().forEach(t => t.stop());
    };
  }, []);

  const captureFrame = useCallback(async (): Promise<File | null> => {
    if (!videoRef.current || !canvasRef.current) return null;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 960;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(video, 0, 0);
    return new Promise(resolve => {
      canvas.toBlob(blob => {
        if (!blob) { resolve(null); return; }
        resolve(new File([blob], `capture-${Date.now()}.jpg`, { type: 'image/jpeg' }));
      }, 'image/jpeg', 0.92);
    });
  }, []);

  const processUpload = useCallback(async (file: File, previewSrc?: string) => {
    setIsFlashing(true);
    setIsUploading(true);

    try {
      const newBlob = await upload(file.name, file, {
        access: 'public',
        handleUploadUrl: '/api/upload',
        clientPayload: JSON.stringify({ guestId, visibility, questTag }),
      });

      toast({
        title: visibility === 'public' ? '🎞️ Shared to the Live Wall!' : '🔒 Secretly stashed in the Vault!',
        description: 'Your memory has been captured.',
      });

      // Build preview for polaroid
      const src = previewSrc ?? URL.createObjectURL(file);
      setRecentShots(prev => [...prev, src]);
      setPolaroidSrc(src);
      setPolaroidVisible(true);

      import('canvas-confetti').then(({ default: confetti }) => {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.75 },
          colors: ['#d4af37', '#ffffff', '#f5a623', '#c0c0c0'],
        });
      });

      setShotsLeft(prev => prev - 1);
      onUploadComplete(newBlob);

      // Wind the film
      setIsWinding(true);
      setTimeout(() => setIsWinding(false), 700);

    } catch (error) {
      console.error('Upload error:', error);
      toast({
        variant: 'destructive',
        title: 'Upload failed',
        description: 'Could not upload your memory. Please try again.',
      });
    } finally {
      setIsUploading(false);
    }
  }, [guestId, visibility, questTag, onUploadComplete, toast]);

  const handleShutterClick = async () => {
    if (shotsLeft <= 0 || isUploading || isAnimating) return;

    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => {});
    }

    if (hasCamera) {
      const file = await captureFrame();
      if (file) {
        const preview = URL.createObjectURL(file);
        await processUpload(file, preview);
      }
    } else {
      fileInputRef.current?.click();
    }
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = async () => {
      await processUpload(file, reader.result as string);
    };
    reader.readAsDataURL(file);
    // Reset input so the same file can be selected again
    event.target.value = '';
  };

  useEffect(() => {
    if (isFlashing) {
      const t = setTimeout(() => setIsFlashing(false), 250);
      return () => clearTimeout(t);
    }
  }, [isFlashing]);

  const isBusy = isUploading || isAnimating;
  const outOfFilm = shotsLeft <= 0 && !isUploading;

  return (
    <div className="flex h-full w-full flex-col bg-[#1a1a1a] text-white relative overflow-hidden rounded-t-3xl">
      <canvas ref={canvasRef} className="hidden" />
      <input
        type="file"
        accept="image/*,video/*"
        capture="environment"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
      />
      <audio ref={audioRef} preload="auto" onError={() => {}}>
        <source src="/sounds/shutter-click.mp3" type="audio/mpeg" />
      </audio>

      {/* Flash overlay */}
      <AnimatePresence>
        {isFlashing && flashOn && (
          <motion.div
            initial={{ opacity: 0.95 }}
            animate={{ opacity: [0.95, 1, 0] }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.28, times: [0, 0.1, 1] }}
            className="absolute inset-0 bg-white z-50 pointer-events-none"
          />
        )}
      </AnimatePresence>

      {/* Uploading / Developing overlay */}
      <AnimatePresence>
        {isUploading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm z-40 gap-4"
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              className="w-14 h-14 rounded-full border-4 border-orange-400/20 border-t-orange-400"
            />
            <p className="font-headline italic text-orange-400 text-lg tracking-wide"
              style={{ textShadow: '0 0 10px rgba(245,166,35,0.6)' }}>
              Developing…
            </p>
            <p className="text-xs text-white/40 tracking-widest uppercase">Please hold still</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Out of film screen */}
      <AnimatePresence>
        {outOfFilm && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="absolute inset-0 flex flex-col items-center justify-center gap-5 bg-[#111] z-30 p-8 text-center"
          >
            <Film size={52} className="text-orange-400" />
            <h2 className="font-headline text-3xl italic text-white">Film&apos;s all used up!</h2>
            <p className="text-sm text-white/40 leading-relaxed max-w-xs">
              You captured all {TOTAL_SHOTS} shots! Head to the Gallery to see your memories come to life.
            </p>
            {recentShots.length > 0 && (
              <div className="mt-2">
                <p className="text-[10px] text-white/25 uppercase tracking-widest mb-3">Your last shots</p>
                <FilmStrip shots={recentShots} />
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── TOP BAR: Camera brand strip ──────────────────────────────────────── */}
      <div className="flex-shrink-0 flex items-center justify-between px-4 py-3 border-b border-white/10"
        style={{ background: 'linear-gradient(135deg, #111 0%, #1e1e1e 100%)' }}>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-orange-400 to-yellow-500 flex items-center justify-center shadow-[0_0_12px_rgba(245,166,35,0.5)]">
            <span className="text-[9px] font-black text-black">R&A</span>
          </div>
          <div>
            <p className="text-[11px] font-bold tracking-[0.15em] text-orange-400 uppercase leading-none">Memory Cam</p>
            <p className="text-[9px] text-white/30 tracking-widest">September 6, 2026</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {/* Flash toggle */}
          <button
            onClick={() => setFlashOn(f => !f)}
            className={cn("transition-colors", flashOn ? 'text-yellow-400' : 'text-white/25')}
            aria-label={flashOn ? 'Flash on' : 'Flash off'}
          >
            {flashOn ? <Zap size={18} /> : <ZapOff size={18} />}
          </button>
          <FilmCounter shotsLeft={shotsLeft} total={TOTAL_SHOTS} />
        </div>
      </div>

      {/* ── VIEWFINDER ────────────────────────────────────────────────────────── */}
      <div className="flex-1 relative overflow-hidden mx-3 my-3 rounded-xl bg-black"
        style={{ boxShadow: 'inset 0 0 30px rgba(0,0,0,0.8), 0 0 0 3px #333' }}>
        {/* Live video feed */}
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={cn(
            "absolute inset-0 w-full h-full object-cover transition-opacity duration-500",
            hasCamera ? 'opacity-100' : 'opacity-0'
          )}
        />

        {/* Fallback grain placeholder when no camera */}
        {!hasCamera && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3"
            style={{
              background: 'radial-gradient(ellipse at 50% 40%, #2a2218 0%, #0d0d0d 100%)',
            }}>
            <div className="w-24 h-24 rounded-full border-4 border-orange-400/20 flex items-center justify-center">
              <div className="w-16 h-16 rounded-full border-4 border-orange-400/30 flex items-center justify-center">
                <div className="w-8 h-8 rounded-full bg-orange-400/10 border-2 border-orange-400/40" />
              </div>
            </div>
            <p className="text-[10px] text-white/30 tracking-widest uppercase">Tap to snap</p>
          </div>
        )}

        {/* Grain + vignette overlay (always on top of video) */}
        <div className="absolute inset-0 pointer-events-none z-10"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='grain'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23grain)' opacity='0.08'/%3E%3C/svg%3E")`,
            backgroundSize: '120px 120px',
            boxShadow: 'inset 0 0 80px rgba(0,0,0,0.6)',
          }}
        />

        {/* Viewfinder corner brackets */}
        <div className="absolute inset-0 pointer-events-none z-10 p-3">
          {['top-0 left-0', 'top-0 right-0 rotate-90', 'bottom-0 right-0 rotate-180', 'bottom-0 left-0 -rotate-90'].map((pos, i) => (
            <div key={i} className={cn('absolute w-6 h-6', pos)}>
              <div className="absolute top-0 left-0 w-6 h-0.5 bg-orange-400/50 rounded" />
              <div className="absolute top-0 left-0 w-0.5 h-6 bg-orange-400/50 rounded" />
            </div>
          ))}
        </div>

        {/* Quest badge */}
        {questTag && (
          <motion.div
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="absolute top-3 left-1/2 -translate-x-1/2 z-20 bg-orange-400 text-black text-[10px] font-bold px-3 py-1 rounded-full shadow-lg uppercase tracking-wider whitespace-nowrap"
          >
            🎯 {questTag.replace(/-/g, ' ')}
          </motion.div>
        )}

        {/* Polaroid animation — ejects from the bottom */}
        <AnimatePresence onExitComplete={() => { setPolaroidSrc(null); setPolaroidVisible(false); }}>
          {polaroidVisible && polaroidSrc && (
            <motion.div
              key="polaroid"
              initial={{ y: '110%', rotate: -8, scale: 0.9 }}
              animate={{ y: '15%', rotate: 3, scale: 1 }}
              exit={{ y: '130%', rotate: -6, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 80, damping: 16 }}
              className="absolute inset-x-0 bottom-0 flex justify-center z-30 pointer-events-none"
              onAnimationComplete={() => {
                setTimeout(() => setPolaroidVisible(false), 2200);
              }}
            >
              <div className="w-40 bg-white p-2 pb-7 shadow-2xl rounded-sm"
                style={{ boxShadow: '0 20px 60px rgba(0,0,0,0.6), 0 0 0 1px rgba(0,0,0,0.2)' }}>
                {/* Developing effect — grainy to clear */}
                <motion.div className="relative w-full aspect-[3/4] overflow-hidden bg-gray-200">
                  <Image src={polaroidSrc} alt="Just captured" fill className="object-cover" />
                  <motion.div
                    className="absolute inset-0"
                    initial={{ opacity: 1 }}
                    animate={{ opacity: 0 }}
                    transition={{ delay: 0.5, duration: 1.5 }}
                    style={{
                      background: 'radial-gradient(ellipse at center, rgba(200,180,100,0.9) 0%, rgba(160,120,60,0.95) 100%)',
                    }}
                  />
                </motion.div>
                <motion.p
                  className="text-center text-[8px] text-gray-400 mt-2 font-mono tracking-wider"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 1.8 }}
                >
                  R&amp;A · Sept 6
                </motion.p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── FILM STRIP THUMBNAILS ──────────────────────────────────────────── */}
      <div className="flex-shrink-0 px-4 pb-2 min-h-[48px] flex items-center justify-center">
        <AnimatePresence>
          {recentShots.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
              <FilmStrip shots={recentShots} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── CAMERA BODY / BOTTOM BAR ──────────────────────────────────────── */}
      <div className="flex-shrink-0 flex items-center justify-between px-6 pb-6 pt-3 gap-4"
        style={{ background: 'linear-gradient(180deg, #1a1a1a 0%, #111 100%)' }}>
        {/* Film wind indicator */}
        <div className="flex flex-col items-center gap-1 w-12">
          <motion.div
            animate={isWinding ? { rotate: 360 } : { rotate: 0 }}
            transition={{ duration: 0.6, ease: 'easeInOut' }}
            className="w-8 h-8 rounded-full border-2 border-white/10 flex items-center justify-center"
          >
            <RotateCcw size={14} className={cn("transition-colors", isWinding ? "text-orange-400" : "text-white/20")} />
          </motion.div>
          <p className="text-[8px] text-white/20 uppercase tracking-wider">Wind</p>
        </div>

        {/* Main shutter button */}
        <div className="flex flex-col items-center gap-2">
          <motion.button
            onClick={handleShutterClick}
            disabled={isBusy || outOfFilm}
            aria-label="Take photo"
            className={cn(
              "relative w-20 h-20 rounded-full flex items-center justify-center",
              "disabled:opacity-40 disabled:cursor-not-allowed",
            )}
            whileTap={!isBusy && !outOfFilm ? { scale: 0.88, y: 3 } : {}}
            transition={{ type: 'spring', stiffness: 500, damping: 15 }}
          >
            {/* Outer ring */}
            <div className="absolute inset-0 rounded-full border-4 border-orange-400/30 shadow-[0_0_20px_rgba(245,166,35,0.2)]" />
            {/* Main button surface */}
            <div className="w-14 h-14 rounded-full shadow-[inset_0_2px_4px_rgba(255,255,255,0.15),inset_0_-2px_4px_rgba(0,0,0,0.4),0_4px_12px_rgba(0,0,0,0.5)]"
              style={{
                background: 'radial-gradient(circle at 38% 35%, #ff6b2b 0%, #e85d04 45%, #9c2c00 100%)',
              }}
            />
            {/* Center reflection */}
            <div className="absolute top-[18px] left-[22px] w-3 h-2 rounded-full bg-white/25" />
          </motion.button>
          <p className="text-[9px] text-white/30 tracking-[0.2em] uppercase">
            {outOfFilm ? 'Film full' : isBusy ? 'Processing…' : 'Capture'}
          </p>
        </div>

        {/* Shots left visual */}
        <div className="flex flex-col items-center gap-1 w-12">
          <div className="grid grid-cols-5 gap-0.5">
            {Array.from({ length: TOTAL_SHOTS }).map((_, i) => (
              <div
                key={i}
                className={cn(
                  "w-1.5 h-1.5 rounded-full transition-colors duration-300",
                  i < TOTAL_SHOTS - shotsLeft ? "bg-orange-400/70" : "bg-white/10"
                )}
              />
            ))}
          </div>
          <p className="text-[8px] text-white/20 uppercase tracking-wider mt-0.5">Shots</p>
        </div>
      </div>
    </div>
  );
}
