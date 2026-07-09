'use client';

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Film, Zap, ZapOff, RotateCcw, Shield, Globe, Sliders, Eye } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import { compressImageFile, withTimeout, UploadTimeoutError } from '@/lib/image-utils';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Slider } from './ui/slider';

const TOTAL_SHOTS = 20;

interface DisposableCameraUIProps {
  guestId: string;
  visibility: 'public' | 'private';
  questTag?: string | null;
  onUploadComplete: (blob?: unknown) => void;
}

interface FilterPreset {
  id: string;
  name: string;
  css: string;
}

const FILTER_PRESETS: FilterPreset[] = [
  { id: 'normal', name: 'Normal', css: 'none' },
  { id: 'vintage-70s', name: '1970s Gold', css: 'sepia(0.4) contrast(1.15) saturate(1.3) brightness(0.95)' },
  { id: 'noir', name: 'Noir Cinema', css: 'grayscale(1) contrast(1.4) brightness(0.9)' },
  { id: 'polaroid', name: 'Polaroid', css: 'contrast(0.9) brightness(1.1) saturate(1.05) sepia(0.15) hue-rotate(5deg)' },
  { id: 'summer', name: 'Summer Sun', css: 'saturate(1.45) brightness(1.05) sepia(0.1) hue-rotate(-5deg)' },
  { id: 'cyber', name: 'Cyber Neon', css: 'hue-rotate(60deg) saturate(1.8) contrast(1.2)' },
  { id: 'vhs', name: 'Old VHS', css: 'contrast(1.1) brightness(0.9) saturate(0.8) sepia(0.1)' },
  { id: 'rose', name: 'Warm Rose', css: 'hue-rotate(-25deg) saturate(1.25) contrast(1.05)' },
  { id: 'forest', name: 'Forest Green', css: 'hue-rotate(30deg) saturate(1.1) contrast(1.1) brightness(0.95)' },
  { id: 'lomo-red', name: 'Lomo Red', css: 'hue-rotate(-20deg) saturate(1.6) contrast(1.2) brightness(0.9)' },
  { id: 'dreamy', name: 'Dreamy Pastel', css: 'saturate(0.6) brightness(1.15) blur(0.5px)' },
  { id: 'golden', name: 'Golden Hour', css: 'sepia(0.35) hue-rotate(-15deg) saturate(1.4) brightness(1.05)' },
  { id: 'deep-noir', name: 'Deep Noir', css: 'grayscale(1) contrast(1.6) brightness(0.75)' },
  { id: 'kodak', name: 'Vintage Kodak', css: 'sepia(0.3) contrast(0.9) saturate(1.2) brightness(1.1) hue-rotate(-10deg)' },
  { id: 'faded', name: 'Faded Film', css: 'contrast(0.8) brightness(1.1) saturate(0.7) sepia(0.2)' },
  { id: 'chrome', name: 'Cool Chrome', css: 'grayscale(0.5) contrast(1.3) saturate(0.8) brightness(0.95) hue-rotate(180deg)' },
  { id: 'amber', name: 'Warm Amber', css: 'sepia(0.25) hue-rotate(-5deg) saturate(1.3) brightness(0.98)' },
  { id: 'mint', name: 'Mint Fresh', css: 'hue-rotate(160deg) saturate(1.2) contrast(1.05) brightness(1.02)' },
  { id: 'cinema', name: 'Cinematic', css: 'contrast(1.25) saturate(0.9) brightness(0.95) sepia(0.1)' },
  { id: 'desert', name: 'Desert Sand', css: 'sepia(0.3) hue-rotate(-10deg) saturate(0.9) contrast(1.1) brightness(1.05)' },
  { id: 'neon-glow', name: 'Neon Glow', css: 'saturate(1.8) hue-rotate(45deg) contrast(1.3) brightness(1.1)' },
  { id: 'blush', name: 'Blush Pink', css: 'hue-rotate(-40deg) saturate(1.3) contrast(1.05) brightness(1.02)' },
  { id: 'moody-blue', name: 'Moody Blue', css: 'hue-rotate(200deg) saturate(1.1) contrast(1.15) brightness(0.92)' },
  { id: 'retro-fade', name: 'Retro Fade', css: 'contrast(0.85) brightness(1.2) saturate(0.75) sepia(0.25)' },
  { id: 'crisp-bw', name: 'Crisp B&W', css: 'grayscale(1) contrast(1.5) brightness(1.05)' },
];

function FilmCounter({ shotsLeft, total }: { shotsLeft: number; total: number }) {
  const used = total - shotsLeft;
  return (
    <div className="flex items-center gap-1.5">
      <div className="bg-black rounded px-2 py-1 border border-amber-500/40 shadow-[inset_0_0_6px_rgba(0,0,0,0.8),0_0_8px_rgba(245,166,35,0.3)]">
        <span className="font-mono text-sm font-bold text-amber-400 tabular-nums tracking-wider"
          style={{ textShadow: '0 0 8px rgba(245,166,35,0.9)' }}>
          {String(used).padStart(2, '0')}
        </span>
      </div>
      <span className="font-mono text-[10px] text-amber-500/50">/</span>
      <span className="font-mono text-[10px] text-amber-500/50">{total}</span>
    </div>
  );
}

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
          className="w-10 h-10 rounded border-2 border-amber-400/50 overflow-hidden bg-black/20 shadow-md flex-shrink-0"
          style={{ outline: '1px solid rgba(0,0,0,0.5)' }}
        >
          <Image src={src} alt={`shot ${i + 1}`} width={40} height={40} className="object-cover w-full h-full" />
        </motion.div>
      ))}
    </div>
  );
}

export function DisposableCameraUI({ guestId, visibility: initialVisibility, questTag, onUploadComplete }: DisposableCameraUIProps) {
  const [shotsLeft, setShotsLeft] = useState(TOTAL_SHOTS);
  const [isAnimating, _setIsAnimating] = useState(false);
  const [isFlashing, setIsFlashing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStalled, setUploadStalled] = useState(false);
  const [lastFailedUpload, setLastFailedUpload] = useState<{ file: File; previewSrc?: string } | null>(null);
  const uploadRequestIdRef = useRef(0);
  const [flashOn, setFlashOn] = useState(true);
  const [recentShots, setRecentShots] = useState<string[]>([]);
  const [polaroidSrc, setPolaroidSrc] = useState<string | null>(null);
  const [polaroidVisible, setPolaroidVisible] = useState(false);
  const [isWinding, setIsWinding] = useState(false);

  // Every captured shot creates a blob: URL for its preview/filmstrip
  // thumbnail; none of them were ever released. A guest taking a dozen
  // photos in one session would retain that many MB in memory for as long
  // as the tab stayed open. Revoke them all when the camera unmounts.
  const blobUrlsRef = useRef<string[]>([]);
  useEffect(() => {
    return () => {
      // Intentionally read at cleanup time (unmount), not mount time — we
      // want every URL accumulated over the whole session, not just what
      // existed when this effect first ran.
      // eslint-disable-next-line react-hooks/exhaustive-deps
      blobUrlsRef.current.forEach(url => URL.revokeObjectURL(url));
    };
  }, []);
  const createTrackedObjectURL = (file: File) => {
    const url = URL.createObjectURL(file);
    blobUrlsRef.current.push(url);
    return url;
  };

  // Filters & Custom sliders states
  const [selectedFilterId, setSelectedFilterId] = useState<string>('normal');
  const [showSliderStudio, setShowSliderStudio] = useState<boolean>(false);
  const [brightness, setBrightness] = useState<number>(100);
  const [contrast, setContrast] = useState<number>(100);
  const [saturation, setSaturation] = useState<number>(100);
  const [sepia, setSepia] = useState<number>(0);
  const [hue, setHue] = useState<number>(0);

  // Local visibility toggle (Shared Live Wall vs Private Vault)
  const [localVisibility, setLocalVisibility] = useState<'public' | 'private'>(initialVisibility);

  // Camera stream state
  const [hasCamera, setHasCamera] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const { toast } = useToast();

  // Selected Filter CSS computation
  const activeCssFilter = useMemo(() => {
    if (selectedFilterId === 'custom') {
      return `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%) sepia(${sepia}%) hue-rotate(${hue}deg)`;
    }
    const preset = FILTER_PRESETS.find(p => p.id === selectedFilterId);
    return preset ? preset.css : 'none';
  }, [selectedFilterId, brightness, contrast, saturation, sepia, hue]);

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
        // Fallback picker is still active
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
    
    // Apply selected visual filters directly on canvas
    ctx.filter = activeCssFilter;
    ctx.drawImage(video, 0, 0);
    
    return new Promise(resolve => {
      canvas.toBlob(blob => {
        if (!blob) { resolve(null); return; }
        resolve(new File([blob], `capture-${Date.now()}.jpg`, { type: 'image/jpeg' }));
      }, 'image/jpeg', 0.92);
    });
  }, [activeCssFilter]);

  const processUpload = useCallback(async (rawFile: File, previewSrc?: string) => {
    const requestId = ++uploadRequestIdRef.current;
    setIsFlashing(true);
    setIsUploading(true);
    setUploadStalled(false);
    setLastFailedUpload(null);

    const stalledTimer = setTimeout(() => {
      if (uploadRequestIdRef.current === requestId) setUploadStalled(true);
    }, 6000);

    try {
      const file = await compressImageFile(rawFile);
      const path = `photos/${Date.now()}-${file.name}`;

      const { data: uploadData, error: uploadError } = await withTimeout(
        supabase.storage.from('wedding-photos').upload(path, file, { contentType: file.type, upsert: false }),
        30000
      );

      // A stale response (user already retried/moved on) should be ignored.
      if (uploadRequestIdRef.current !== requestId) return;

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('wedding-photos')
        .getPublicUrl(uploadData.path);

      // The file is safely in storage at this point — don't fail the whole
      // upload (and re-prompt the guest to retake the shot) just because the
      // metadata row failed to write; log it instead so it can be reconciled later.
      try {
        await supabase.from('media').insert({
          media_url: publicUrl,
          media_type: 'image',
          visibility: localVisibility,
          quest_tag: questTag ?? null,
          guest_id: guestId,
        });
      } catch (metaError) {
        console.error('Media metadata insert failed (file uploaded fine):', metaError);
      }

      toast({
        title: localVisibility === 'public' ? '🌍 Shared to the Live Wall!' : '🔒 Secretly sent to the Couple!',
        description: 'Your memory has been captured.',
      });

      const src = previewSrc ?? createTrackedObjectURL(file);
      setRecentShots(prev => [...prev, src]);
      setPolaroidSrc(src);
      setPolaroidVisible(true);

      import('canvas-confetti').then(({ default: confetti }) => {
        confetti({
          particleCount: 80,
          spread: 60,
          origin: { y: 0.75 },
          colors: ['#d4af37', '#ffffff', '#fb923c', '#a78bfa'],
        });
      });

      setShotsLeft(prev => prev - 1);
      onUploadComplete({ url: publicUrl });

      setIsWinding(true);
      setTimeout(() => setIsWinding(false), 700);

    } catch (error) {
      if (uploadRequestIdRef.current !== requestId) return;
      console.error('Upload error:', error);
      const timedOut = error instanceof UploadTimeoutError;
      setLastFailedUpload({ file: rawFile, previewSrc });
      toast({
        variant: 'destructive',
        title: timedOut ? 'Upload is taking too long' : 'Upload failed',
        description: timedOut
          ? 'Your connection looks slow. Tap "Try Again" to retry this shot.'
          : 'Could not upload your memory. Tap "Try Again" to retry.',
      });
    } finally {
      clearTimeout(stalledTimer);
      if (uploadRequestIdRef.current === requestId) {
        setIsUploading(false);
        setUploadStalled(false);
      }
    }
  }, [guestId, localVisibility, questTag, onUploadComplete, toast]);

  const handleRetryUpload = useCallback(() => {
    if (!lastFailedUpload) return;
    const { file, previewSrc } = lastFailedUpload;
    processUpload(file, previewSrc);
  }, [lastFailedUpload, processUpload]);

  const handleCancelUpload = useCallback(() => {
    // Abandon waiting on this request; a late response will be ignored (see requestId check above).
    uploadRequestIdRef.current++;
    setIsUploading(false);
    setUploadStalled(false);
  }, []);

  const handleShutterClick = async () => {
    if (shotsLeft <= 0 || isUploading || isAnimating) return;

    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => {});
    }

    if (hasCamera) {
      const file = await captureFrame();
      if (file) {
        const preview = createTrackedObjectURL(file);
        await processUpload(file, preview);
      }
    } else {
      fileInputRef.current?.click();
    }
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    const previewSrc = createTrackedObjectURL(file);
    await processUpload(file, previewSrc);
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
    <div className="flex h-full w-full flex-col bg-[#141517] text-white relative overflow-hidden rounded-t-3xl border border-white/10 shadow-2xl p-1 bg-[url('https://www.transparenttextures.com/patterns/leather-bags.png')]">
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

      {/* Uploading overlay */}
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
              className="w-14 h-14 rounded-full border-4 border-amber-400/20 border-t-amber-400 shadow-[0_0_20px_rgba(212,175,55,0.4)]"
            />
            <p className="font-serif italic text-amber-300 text-xl tracking-wide"
              style={{ textShadow: '0 0 10px rgba(245,166,35,0.6)' }}>
              Developing memory…
            </p>
            {uploadStalled ? (
              <div className="flex flex-col items-center gap-3 text-center px-6">
                <p className="text-xs text-white/60 max-w-xs">
                  This is taking longer than usual — your connection may be slow. You can keep waiting or cancel and try again.
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="border-white/20 bg-white/5 text-white hover:bg-white/10"
                  onClick={handleCancelUpload}
                >
                  Cancel
                </Button>
              </div>
            ) : (
              <p className="text-xs text-white/40 tracking-widest uppercase">Please hold still</p>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Retry banner after a failed upload */}
      <AnimatePresence>
        {!isUploading && lastFailedUpload && (
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            className="absolute top-3 left-3 right-3 z-40 flex items-center justify-between gap-3 rounded-xl border border-red-400/30 bg-red-950/80 backdrop-blur-md px-4 py-2.5 shadow-lg"
          >
            <p className="text-xs text-red-200">Your last shot didn&apos;t upload.</p>
            <div className="flex items-center gap-2">
              <Button type="button" size="sm" className="h-7 bg-amber-400 text-black hover:bg-amber-300" onClick={handleRetryUpload}>
                Try Again
              </Button>
              <button
                type="button"
                className="text-[10px] text-red-200/60 hover:text-red-200 uppercase tracking-wide"
                onClick={() => setLastFailedUpload(null)}
              >
                Dismiss
              </button>
            </div>
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
            <Film size={52} className="text-amber-400 animate-pulse" />
            <h2 className="font-serif text-3xl italic text-white">Film&apos;s all used up!</h2>
            <p className="text-sm text-white/40 leading-relaxed max-w-xs font-light">
              You captured all {TOTAL_SHOTS} shots! Head to the gallery to see your beautiful memories.
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

      {/* ── TOP BAR: Retro style header ──────────────────────────────────────── */}
      <div className="flex-shrink-0 flex items-center justify-between px-4 py-3 border-b border-white/10 bg-black/60 backdrop-blur-md">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-200 to-amber-500 flex items-center justify-center shadow-[0_0_12px_rgba(212,175,55,0.5)]">
            <span className="text-[10px] font-black text-black">R&A</span>
          </div>
          <div>
            <p className="text-[11px] font-bold tracking-[0.2em] text-amber-400 uppercase leading-none">Synergy Cam v2</p>
            <p className="text-[8px] text-white/40 tracking-widest uppercase mt-0.5">Tuscany in Rylands</p>
          </div>
        </div>
        
        {/* Destination Privacy Toggle (Couples Vault vs Public Wall) */}
        <div className="flex items-center gap-1.5 bg-black/50 p-1 px-2.5 rounded-full border border-white/5 shadow-inner">
          <button 
            type="button"
            className={cn(
              "p-1.5 rounded-full transition-all text-xs flex items-center gap-1.5", 
              localVisibility === 'public' ? 'bg-amber-500 text-black font-bold' : 'text-white/40 hover:text-white'
            )}
            onClick={() => setLocalVisibility('public')}
            title="Upload to Shared Public Gallery"
          >
            <Globe size={11} /> <span className="text-[8px] uppercase tracking-wider hidden sm:inline">Shared</span>
          </button>
          <button 
            type="button"
            className={cn(
              "p-1.5 rounded-full transition-all text-xs flex items-center gap-1.5", 
              localVisibility === 'private' ? 'bg-amber-500 text-black font-bold' : 'text-white/40 hover:text-white'
            )}
            onClick={() => setLocalVisibility('private')}
            title="Send Privately to Bride & Groom Only"
          >
            <Shield size={11} /> <span className="text-[8px] uppercase tracking-wider hidden sm:inline">Private</span>
          </button>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setFlashOn(f => !f)}
            className={cn("transition-colors", flashOn ? 'text-amber-400' : 'text-white/20')}
            aria-label={flashOn ? 'Flash on' : 'Flash off'}
          >
            {flashOn ? <Zap size={18} /> : <ZapOff size={18} />}
          </button>
          <FilmCounter shotsLeft={shotsLeft} total={TOTAL_SHOTS} />
        </div>
      </div>

      {/* ── VIEW FINDER CONTAINER ────────────────────────────────────────────────── */}
      <div className="flex-1 relative overflow-hidden mx-3 my-3 rounded-2xl bg-black border-2 border-[#2b2d31] shadow-[0_20px_40px_rgba(0,0,0,0.6)]">
        {/* Live video feed with computed CSS filters */}
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          style={{ filter: activeCssFilter }}
          className={cn(
            "absolute inset-0 w-full h-full object-cover transition-opacity duration-500",
            hasCamera ? 'opacity-100' : 'opacity-0'
          )}
        />

        {!hasCamera && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-gradient-to-tr from-[#1b1c1e] to-[#0c0d0e]">
            <div className="w-20 h-20 rounded-full border-2 border-dashed border-amber-500/20 flex items-center justify-center animate-pulse">
              <Film size={28} className="text-amber-500/40" />
            </div>
            <p className="text-[10px] text-white/30 tracking-widest uppercase">Tap shutter button to select photo</p>
          </div>
        )}

        {/* Cinematic Vignette */}
        <div className="absolute inset-0 pointer-events-none z-10"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='grain'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23grain)' opacity='0.07'/%3E%3C/svg%3E")`,
            backgroundSize: '120px 120px',
            boxShadow: 'inset 0 0 100px rgba(0,0,0,0.85)',
          }}
        />

        {/* Viewfinder corner brackets */}
        <div className="absolute inset-0 pointer-events-none z-10 p-3">
          {['top-0 left-0', 'top-0 right-0 rotate-90', 'bottom-0 right-0 rotate-180', 'bottom-0 left-0 -rotate-90'].map((pos, i) => (
            <div key={i} className={cn('absolute w-5 h-5', pos)}>
              <div className="absolute top-0 left-0 w-5 h-0.5 bg-amber-500/40 rounded" />
              <div className="absolute top-0 left-0 w-0.5 h-5 bg-amber-500/40 rounded" />
            </div>
          ))}
        </div>

        {/* Destination overlay banner */}
        <div className="absolute bottom-3 left-3 z-20 flex gap-2 pointer-events-none">
          <Badge variant="outline" className="bg-black/70 border-white/10 text-white/80 py-1 text-[9px] uppercase tracking-wider">
            {localVisibility === 'public' ? (
              <span className="flex items-center gap-1 text-emerald-400"><Globe size={10} /> Shared Wall</span>
            ) : (
              <span className="flex items-center gap-1 text-amber-400"><Shield size={10} /> Secret Vault</span>
            )}
          </Badge>
          {questTag && (
            <Badge variant="outline" className="bg-amber-500 border-none text-black font-bold py-1 text-[9px] uppercase tracking-wider">
              🎯 {questTag.replace(/-/g, ' ')}
            </Badge>
          )}
        </div>

        {/* Custom filter name indicator */}
        <div className="absolute top-3 right-3 z-20 pointer-events-none">
          <Badge variant="outline" className="bg-black/70 border-white/10 text-white/60 py-1 text-[9px] uppercase tracking-wider">
            <Eye size={10} className="mr-1 inline text-amber-500" />
            {selectedFilterId === 'custom' ? 'Custom Studio' : FILTER_PRESETS.find(p => p.id === selectedFilterId)?.name}
          </Badge>
        </div>

        {/* Polaroid animation - Ejects from bottom */}
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
              <div className="w-40 bg-white p-2.5 pb-8 shadow-2xl rounded-sm border border-black/10">
                <motion.div className="relative w-full aspect-[3/4] overflow-hidden bg-gray-200">
                  <Image src={polaroidSrc} alt="Captured" fill className="object-cover" />
                  <motion.div
                    className="absolute inset-0"
                    initial={{ opacity: 1 }}
                    animate={{ opacity: 0 }}
                    transition={{ delay: 0.4, duration: 1.6 }}
                    style={{
                      background: 'radial-gradient(ellipse at center, rgba(200,180,100,0.85) 0%, rgba(160,120,60,0.95) 100%)',
                    }}
                  />
                </motion.div>
                <motion.p
                  className="text-center text-[9px] font-serif italic text-gray-500 mt-2 tracking-wider"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 1.8 }}
                >
                  {localVisibility === 'public' ? '🌍 Shared Wall' : '🔒 Vault'}
                </motion.p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── FILTER & SLIDERS CONTROLS ─────────────────────────────────────────── */}
      <div className="px-3 space-y-3 relative z-20">
        
        {/* Scrollable preset list with preview thumbnails */}
        <div className="flex gap-2 overflow-x-auto pb-1.5 pt-1.5 scrollbar-none">
          {FILTER_PRESETS.map((preset) => (
            <button
              key={preset.id}
              onClick={() => {
                setSelectedFilterId(preset.id);
                setShowSliderStudio(false);
              }}
              className={cn(
                "flex-shrink-0 flex flex-col items-center gap-1.5 px-3 py-1.5 rounded-xl border transition-all text-xs",
                selectedFilterId === preset.id 
                  ? 'bg-amber-500 border-amber-400 text-black font-bold shadow-[0_0_10px_rgba(245,166,35,0.3)]' 
                  : 'bg-white/5 border-white/5 text-white/70 hover:bg-white/10 hover:text-white'
              )}
            >
              <span className="text-[10px] uppercase tracking-wider">{preset.name}</span>
            </button>
          ))}
          
          <button
            onClick={() => {
              setSelectedFilterId('custom');
              setShowSliderStudio(prev => !prev);
            }}
            className={cn(
              "flex-shrink-0 flex flex-col items-center gap-1.5 px-3 py-1.5 rounded-xl border transition-all text-xs",
              selectedFilterId === 'custom' 
                ? 'bg-amber-500 border-amber-400 text-black font-bold shadow-[0_0_10px_rgba(245,166,35,0.3)]' 
                : 'bg-white/5 border-white/5 text-white/70 hover:bg-white/10 hover:text-white'
            )}
          >
            <span className="text-[10px] uppercase tracking-wider flex items-center gap-1">
              <Sliders size={10} /> Studio {selectedFilterId === 'custom' && showSliderStudio ? 'Open' : ''}
            </span>
          </button>
        </div>

        {/* Hidden Custom filter studio sliders */}
        <AnimatePresence>
          {selectedFilterId === 'custom' && showSliderStudio && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="p-4 bg-black/60 border border-white/10 rounded-2xl space-y-3 overflow-hidden backdrop-blur-md"
            >
              <div className="space-y-1">
                <div className="flex justify-between text-[10px] uppercase text-white/40">
                  <span>Brightness</span>
                  <span>{brightness}%</span>
                </div>
                <Slider value={[brightness]} onValueChange={(val) => setBrightness(val[0])} min={50} max={150} />
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-[10px] uppercase text-white/40">
                  <span>Contrast</span>
                  <span>{contrast}%</span>
                </div>
                <Slider value={[contrast]} onValueChange={(val) => setContrast(val[0])} min={50} max={150} />
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-[10px] uppercase text-white/40">
                  <span>Saturation</span>
                  <span>{saturation}%</span>
                </div>
                <Slider value={[saturation]} onValueChange={(val) => setSaturation(val[0])} min={50} max={200} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] uppercase text-white/40">
                    <span>Sepia</span>
                    <span>{sepia}%</span>
                  </div>
                  <Slider value={[sepia]} onValueChange={(val) => setSepia(val[0])} min={0} max={100} />
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] uppercase text-white/40">
                    <span>Hue Shift</span>
                    <span>{hue}°</span>
                  </div>
                  <Slider value={[hue]} onValueChange={(val) => setHue(val[0])} min={-180} max={180} />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>

      {/* ── CAMERA BODY CONTROLS ─────────────────────────────────────────── */}
      <div className="flex-shrink-0 flex items-center justify-between px-6 pb-6 pt-3 gap-4 bg-black/60 backdrop-blur-md mt-2">
        {/* Film wind action */}
        <div className="flex flex-col items-center gap-1 w-12">
          <motion.div
            animate={isWinding ? { rotate: 360 } : { rotate: 0 }}
            transition={{ duration: 0.6 }}
            className="w-8 h-8 rounded-full border border-white/10 flex items-center justify-center bg-black/30 shadow-inner"
          >
            <RotateCcw size={14} className={cn("transition-colors", isWinding ? "text-amber-400 animate-spin" : "text-white/20")} />
          </motion.div>
          <p className="text-[8px] text-white/30 uppercase tracking-widest">Wind</p>
        </div>

        {/* Shutter capture trigger button */}
        <div className="flex flex-col items-center gap-1.5">
          <motion.button
            onClick={handleShutterClick}
            disabled={isBusy || outOfFilm}
            className="relative w-16 h-16 rounded-full flex items-center justify-center focus:outline-none"
            whileTap={!isBusy && !outOfFilm ? { scale: 0.9, y: 2 } : {}}
          >
            {/* Glossy Outer Ring */}
            <div className="absolute inset-0 rounded-full border-4 border-amber-500/20 shadow-[0_0_15px_rgba(212,175,55,0.2)] bg-black/40" />
            {/* Inner Gold trigger surface */}
            <div className="w-12 h-12 rounded-full shadow-[inset_0_2px_4px_rgba(255,255,255,0.15),inset_0_-2px_4px_rgba(0,0,0,0.5),0_4px_12px_rgba(0,0,0,0.5)]"
              style={{
                background: 'radial-gradient(circle at 35% 35%, #f6e7b7 0%, #d4af37 50%, #8a661c 100%)',
              }}
            />
          </motion.button>
          <p className="text-[8px] text-white/40 tracking-[0.25em] uppercase font-bold">
            {outOfFilm ? 'Full' : isBusy ? 'Developing' : 'Capture'}
          </p>
        </div>

        {/* Shots Indicator display */}
        <div className="flex flex-col items-center gap-1 w-12">
          <div className="grid grid-cols-5 gap-0.5 p-1 bg-black/50 rounded-md border border-white/5">
            {Array.from({ length: TOTAL_SHOTS }).map((_, i) => (
              <div
                key={i}
                className={cn(
                  "w-1.5 h-1.5 rounded-full transition-all duration-300",
                  i < TOTAL_SHOTS - shotsLeft ? "bg-amber-400 scale-105" : "bg-white/10"
                )}
              />
            ))}
          </div>
          <p className="text-[8px] text-white/30 uppercase tracking-widest mt-0.5">Shots</p>
        </div>
      </div>
    </div>
  );
}
