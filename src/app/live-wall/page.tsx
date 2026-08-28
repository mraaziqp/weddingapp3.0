'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, Sparkles, Upload, RefreshCw, Trophy, Heart, Volume2 } from 'lucide-react';
import { LiveMasonryGrid } from '@/components/live-masonry-grid';
import { fetchPublicWallItems, WallItem } from '@/lib/media';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { compressImageFile } from '@/lib/image-utils';

export default function LiveWallPage() {
  const [mediaItems, setMediaItems] = useState<WallItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadCount, setUploadCount] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const loadMedia = async () => {
    try {
      const items = await fetchPublicWallItems(80);
      setMediaItems(items);
      setUploadCount(items.length);
    } catch {
      // Fallback
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadMedia();
    const interval = setInterval(loadMedia, 10000); // 10s live polling
    return () => clearInterval(interval);
  }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setIsUploading(true);
    try {
      const compressed = await compressImageFile(file);
      const formData = new FormData();
      formData.append('file', compressed);
      formData.append('visibility', 'public');
      formData.append('guestId', 'live-wall-upload');

      const res = await fetch('/api/media/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || 'Upload failed');

      toast({
        title: '🎉 Memory Added to the Live Wall!',
        description: 'Your photo is now live for everyone to see.',
      });

      // Instantly prepend
      const newItem: WallItem = {
        id: data.item?.id || `upload-${Date.now()}`,
        imageUrl: data.mediaUrl,
        description: 'Captured live',
        guestName: 'Wedding Guest',
        likes: 0,
      };
      setMediaItems(prev => [newItem, ...prev]);

      import('canvas-confetti').then(({ default: confetti }) => {
        confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
      });
    } catch (err) {
      console.error(err);
      toast({
        variant: 'destructive',
        title: 'Upload failed',
        description: 'Please try uploading again.',
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[radial-gradient(ellipse_at_50%_0%,#09261b_0%,#03160e_50%,#010905_100%)] text-white p-4 sm:p-6 lg:p-8 relative selection:bg-amber-500 selection:text-black">
      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,video/*"
        onChange={handleFileUpload}
        className="hidden"
      />

      {/* ── Evening Celebration Live Header ── */}
      <header className="text-center mb-8 relative overflow-hidden rounded-3xl border border-amber-500/30 bg-black/60 backdrop-blur-2xl p-6 sm:p-8 shadow-2xl">
        <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_50%_0%,rgba(212,175,55,0.25),transparent_60%)]" />

        <div className="relative z-10 flex flex-col items-center gap-3">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold uppercase tracking-[0.25em] bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm animate-pulse">
            <Sparkles size={13} className="text-amber-400" /> Live Evening Celebration
          </div>

          <h1 className="font-headline italic text-4xl sm:text-6xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-amber-400 to-amber-100 drop-shadow-[0_0_25px_rgba(212,175,55,0.4)]">
            Live Memories Wall
          </h1>

          <p className="text-white/60 tracking-[0.2em] uppercase text-xs max-w-md mx-auto">
            The Union of Razia &amp; Abduraziq · Tuscany in Rylands
          </p>

          {/* Live Action Bar */}
          <div className="flex flex-wrap items-center justify-center gap-3 mt-4">
            <Button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              size="lg"
              className="rounded-full bg-gradient-to-r from-amber-200 via-amber-400 to-amber-500 text-black font-extrabold px-7 hover:scale-105 transition-all shadow-[0_0_20px_rgba(212,175,55,0.4)]"
            >
              <Camera size={18} className="mr-2" />
              {isUploading ? 'Uploading...' : '📸 Snap or Upload Memory'}
            </Button>

            <Button
              asChild
              variant="outline"
              size="lg"
              className="rounded-full border-amber-500/35 bg-white/5 hover:bg-amber-500/15 text-amber-300 text-xs tracking-wider uppercase font-bold"
            >
              <a href="/event">
                <Trophy size={16} className="mr-2" /> Play Quests &amp; Games
              </a>
            </Button>

            <Button
              asChild
              variant="outline"
              size="lg"
              className="rounded-full border-white/10 bg-white/5 hover:bg-white/10 text-white/80 text-xs tracking-wider uppercase font-semibold"
            >
              <a href="/venue-screen" target="_blank" rel="noopener noreferrer">
                📺 Big Screen Mode
              </a>
            </Button>
          </div>

          {/* Live counter */}
          <div className="inline-flex items-center gap-2 mt-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[11px] text-white/50">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span>{mediaItems.length} Real-Time Wedding Memories Captured</span>
          </div>
        </div>
      </header>

      {/* ── Main Masonry Grid ── */}
      <main className="max-w-7xl mx-auto">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-12 h-12 rounded-full border-2 border-amber-400 border-t-transparent animate-spin mb-4" />
            <p className="font-headline italic text-amber-300 text-xl">Loading Live Memories…</p>
          </div>
        ) : mediaItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center glass-card !rounded-3xl border-white/10 max-w-lg mx-auto p-8 space-y-4">
            <div className="w-16 h-16 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center text-2xl">
              📸
            </div>
            <h3 className="font-headline italic text-3xl font-bold text-white">The Live Wall is Ready!</h3>
            <p className="text-sm text-white/60 leading-relaxed">
              Be the first to capture a photo or video from the celebration! Tap the button below to add yours.
            </p>
            <Button
              onClick={() => fileInputRef.current?.click()}
              className="rounded-full bg-amber-400 text-black font-bold px-8 hover:bg-amber-300 shadow-lg"
            >
              <Camera size={16} className="mr-2" /> Upload First Photo
            </Button>
          </div>
        ) : (
          <LiveMasonryGrid mediaItems={mediaItems} />
        )}
      </main>
    </div>
  );
}
