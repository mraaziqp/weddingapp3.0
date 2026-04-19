
'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Target, CameraIcon, Film } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { upload } from '@vercel/blob/client';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { LuxuryLoader } from '@/components/luxury-loader';

interface DisposableCameraUIProps {
  guestId: string;
  visibility: 'public' | 'private';
  questTag?: string | null;
  onUploadComplete: (blob?: unknown) => void;
}

export function DisposableCameraUI({ guestId, visibility, questTag, onUploadComplete }: DisposableCameraUIProps) {
  const [shotsLeft, setShotsLeft] = useState(15);
  const [lastShot, setLastShot] = useState<string | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [isFlashing, setIsFlashing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const { toast } = useToast();

  const handleShutterClick = () => {
    if (shotsLeft > 0 && !isUploading && !isAnimating) {
      if (audioRef.current) {
        audioRef.current.play().catch(e => console.error("Could not play shutter sound:", e));
      }
      fileInputRef.current?.click();
    } else if (shotsLeft <= 0) {
      toast({ title: "No shots left!", description: "You've used all your film." });
    }
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsFlashing(true);
    setIsUploading(true);

    try {
      const newBlob = await upload(file.name, file, {
        access: 'public',
        handleUploadUrl: '/api/upload',
        clientPayload: JSON.stringify({ guestId, visibility, questTag }),
      });

      toast({
        title: visibility === 'public' ? "Shared to the Live Wall!" : "Secretly stashed in the Vault!",
        description: "Your memory has been captured.",
      });

      const reader = new FileReader();
      reader.onloadend = () => {
        setLastShot(reader.result as string);
        setIsAnimating(true);
      };
      reader.readAsDataURL(file);

      import('canvas-confetti').then(({ default: confetti }) => {
        confetti({
          particleCount: 80,
          spread: 60,
          origin: { y: 0.8 },
          colors: ['#d4af37', '#ffffff', '#c0c0c0'],
        });
      });

      setShotsLeft(shotsLeft - 1);
      onUploadComplete(newBlob);
      
    } catch (error) {
      console.error("Upload error:", error);
      toast({
        variant: 'destructive',
        title: 'Upload failed',
        description: 'Could not upload your memory. Please try again.',
      });
    } finally {
      setIsUploading(false);
    }
  };

  useEffect(() => {
    if (isFlashing) {
      const timer = setTimeout(() => setIsFlashing(false), 200);
      return () => clearTimeout(timer);
    }
  }, [isFlashing]);

  return (
    <div className="flex h-full w-full flex-col items-center justify-between p-6 bg-[#FAF9F6] text-black relative overflow-hidden rounded-t-3xl">
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
        {isFlashing && (
          <motion.div
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-white z-50"
            transition={{ duration: 0.2 }}
          />
        )}
      </AnimatePresence>

      {/* Upload overlay — shown over the whole camera while uploading */}
      <AnimatePresence>
        {isUploading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 flex flex-col items-center justify-center bg-[#FAF9F6]/90 backdrop-blur-sm z-40"
          >
            <LuxuryLoader label="Developing..." size="lg" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Out of film screen */}
      <AnimatePresence>
        {shotsLeft <= 0 && !isUploading && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="absolute inset-0 flex flex-col items-center justify-center gap-5 bg-[#FAF9F6] z-30 p-8 text-center"
          >
            <Film size={52} className="text-[#d4af37]" />
            <h2 className="font-headline text-3xl italic text-[#1C1C1C]">Your film is full!</h2>
            <p className="text-base text-black/60 leading-relaxed max-w-xs">
              You used all 15 shots. Head over to the Gallery to see your day captured.
            </p>
          </motion.div>
        )}
      </AnimatePresence>
      
      <header className="w-full flex justify-between items-center z-10 text-lg">
        <span className="font-headline italic text-base text-[#d4af37]">Memory Catcher</span>
        <div className="flex items-center gap-2 text-[#d4af37]">
            <Target size={20} />
            <span className="font-mono">{shotsLeft}/15</span>
        </div>
      </header>

      <main className="relative w-full max-w-[320px] h-auto flex-1 flex flex-col items-center justify-center my-4">
        <div className="relative w-full aspect-[3/4] bg-black/5 rounded-lg border-8 border-black/10 shadow-[0_10px_20px_rgba(0,0,0,0.05),inset_0_0_10px_rgba(0,0,0,0.1)] flex items-center justify-center">
            <CameraIcon size={60} className="text-black/10"/>
        </div>
        
        <AnimatePresence>
            {lastShot && isAnimating && (
                <motion.div
                    key={lastShot}
                    initial={{ y: -50, scale: 1.05, rotate: '-5deg' }}
                    animate={{ y: 350, rotate: '5deg', scale: 1 }}
                    transition={{ type: 'spring', stiffness: 50, damping: 15, delay: 0.5 }}
                    onAnimationComplete={() => {
                        setTimeout(() => {
                            setIsAnimating(false);
                            setLastShot(null);
                        }, 2000);
                    }}
                    className="absolute top-1/2 -translate-y-1/2 w-[80%] aspect-[3/4] p-2 pb-8 bg-white rounded-sm shadow-2xl flex flex-col z-20"
                >
                    <Image src={lastShot} alt="Developed memory" fill className="object-cover p-1"/>
                </motion.div>
            )}
        </AnimatePresence>
      </main>

      <footer className="w-full max-w-md flex flex-col items-center gap-4 z-10 h-24 justify-center">
        <motion.button
            onClick={handleShutterClick}
            disabled={isUploading || isAnimating || shotsLeft <= 0}
            className={cn(
                "w-20 h-20 rounded-full bg-[#D4AF37] flex items-center justify-center shadow-[0_0_20px_rgba(212,175,55,0.5)] border-4 border-[#c8a030]",
                "disabled:opacity-40 disabled:cursor-not-allowed"
            )}
            whileTap={{ scale: 0.9, y: 5 }}
            transition={{ type: 'spring', stiffness: 400, damping: 10 }}
        >
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-yellow-300 to-amber-500" />
        </motion.button>
        <p className="text-xs text-black/30 tracking-widest uppercase">
          {shotsLeft > 0 ? 'Tap to capture' : 'Film used up'}
        </p>
      </footer>
    </div>
  );
}
