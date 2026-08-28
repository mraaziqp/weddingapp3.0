'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, Camera, Sparkles, Upload } from 'lucide-react';
import { LiveMasonryGrid } from '../live-masonry-grid';
import { fetchPublicWallItems, WallItem } from '@/lib/media';
import { Button } from '../ui/button';
import { useToast } from '@/hooks/use-toast';
import { compressImageFile } from '@/lib/image-utils';

const filters = ['All', 'Ceremony', 'Candid Vibes', 'Dance Floor', 'Speeches'];

interface GalleryFeedProps {
  partyMode?: boolean;
  isMorningAfter?: boolean;
}

export function GalleryFeed({ partyMode = false, isMorningAfter = false }: GalleryFeedProps) {
  const [activeFilter, setActiveFilter] = useState('All');
  const [mediaItems, setMediaItems] = useState<WallItem[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [authorName, setAuthorName] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('wedding_guest_name');
      if (saved) setAuthorName(saved);
    }
  }, []);

  const handleNameChange = (name: string) => {
    setAuthorName(name);
    if (typeof window !== 'undefined') {
      localStorage.setItem('wedding_guest_name', name);
    }
  };

  const loadMedia = () => {
    fetchPublicWallItems(80)
      .then(items => setMediaItems(items))
      .catch(() => {});
  };

  // Real guest uploads — refreshed every 8s so new captures appear live.
  useEffect(() => {
    loadMedia();
    const id = setInterval(loadMedia, 8_000);
    return () => clearInterval(id);
  }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    let currentName = authorName.trim();
    if (!currentName) {
      const prompted = prompt('Enter your name or table number (e.g. Aunt Fatima):');
      if (prompted && prompted.trim()) {
        currentName = prompted.trim();
        handleNameChange(currentName);
      } else {
        currentName = 'Wedding Guest';
      }
    }

    setIsUploading(true);
    try {
      const compressed = await compressImageFile(file);
      const formData = new FormData();
      formData.append('file', compressed);
      formData.append('visibility', 'public');
      formData.append('guestId', 'gallery-guest');
      formData.append('guestName', currentName);

      const res = await fetch('/api/media/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || 'Upload failed');

      toast({
        title: '🎉 Added to the Live Memories Wall!',
        description: `Your memory is live with tag: ${currentName}`,
      });

      const newItem: WallItem = {
        id: data.item?.id || `upload-${Date.now()}`,
        imageUrl: data.mediaUrl,
        description: `Captured by ${currentName}`,
        guestName: currentName,
        likes: 0,
      };
      setMediaItems(prev => [newItem, ...prev]);

      import('canvas-confetti').then(({ default: confetti }) => {
        confetti({ particleCount: 90, spread: 60, origin: { y: 0.7 } });
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

  const headingColor = partyMode ? '#f6e7b7' : '#1C1C1C';
  const subtitleColor = partyMode ? 'rgba(246,231,183,0.65)' : '#6b7280';

  return (
    <div className="p-2 sm:p-4 space-y-4">
      {/* Hidden File Input for instant upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,video/*"
        onChange={handleFileUpload}
        className="hidden"
      />

      <AnimatePresence mode="wait">
        {isMorningAfter ? (
          <motion.div
            key="morning-after-header"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: 'easeOut' }}
            className="text-center py-10 px-6"
          >
            <motion.p
              className="font-headline italic text-5xl text-[#d4af37]"
              initial={{ scale: 0.7, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2, type: 'spring', stiffness: 120 }}
              style={{ textShadow: '0 0 30px rgba(212,175,55,0.3)' }}
            >
              Thank You
            </motion.p>
            <motion.p
              className="font-headline italic text-2xl text-[#1C1C1C] mt-2 mb-4"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.45 }}
            >
              Razia &amp; Abduraziq
            </motion.p>
            <div className="mx-auto h-px bg-gradient-to-r from-transparent via-[#d4af37]/50 to-transparent mb-5 w-32" />
            <p className="text-gray-500 text-sm max-w-xs mx-auto leading-relaxed mb-7">
              Thank you for celebrating our special day with us. These memories will live in our hearts forever. ❤️
            </p>
            <Button
              className="bg-[#d4af37] text-black font-bold rounded-full px-8 hover:bg-[#b8992d] shadow-[0_4px_20px_rgba(212,175,55,0.35)]"
              onClick={() => window.open('/live-wall', '_blank')}
            >
              <Download className="mr-2 h-4 w-4" />
              Browse All Memories
            </Button>
          </motion.div>
        ) : (
          <motion.header key="normal-header" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white/70 backdrop-blur-md rounded-2xl p-4 border border-[#d4af37]/30 shadow-md">
              <div className="text-center sm:text-left">
                <h2 className="font-headline text-2xl sm:text-3xl font-bold italic" style={{ color: headingColor }}>
                  Live Memories Wall
                </h2>
                <p className="text-xs sm:text-sm" style={{ color: subtitleColor }}>
                  {mediaItems.length} photos &amp; videos captured by guests tonight
                </p>
              </div>

              <Button
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                size="sm"
                className="rounded-full bg-gradient-to-r from-[#f6e7b7] via-[#d4af37] to-[#c8a030] text-black font-extrabold px-5 text-xs shadow-md hover:scale-105 transition-transform"
              >
                <Camera size={15} className="mr-1.5" />
                {isUploading ? 'Uploading...' : '📸 Add Photo / Video'}
              </Button>
            </div>
          </motion.header>
        )}
      </AnimatePresence>

      {/* Filter chips */}
      {!isMorningAfter && (
        <div className="pb-2 overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          <div className="flex gap-2 w-max">
            {filters.map(filter => (
              <Button
                key={filter}
                variant={activeFilter === filter ? 'default' : 'outline'}
                onClick={() => setActiveFilter(filter)}
                size="sm"
                className={
                  activeFilter === filter
                    ? 'bg-[#D4AF37] border-[#D4AF37] text-black rounded-full font-bold text-xs shadow-sm'
                    : partyMode
                    ? 'border-[#d4af37]/30 text-[#f6e7b7]/70 rounded-full bg-white/5 hover:bg-[#d4af37]/15 text-xs'
                    : 'border-gray-300 text-gray-700 rounded-full bg-white/60 hover:bg-white text-xs'
                }
              >
                {filter}
              </Button>
            ))}
          </div>
        </div>
      )}

      {mediaItems.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center" style={{ color: subtitleColor }}>
          <div className="w-14 h-14 rounded-full bg-[#d4af37]/15 flex items-center justify-center mb-3 text-2xl">
            📸
          </div>
          <p className="font-headline italic text-2xl font-bold" style={{ color: headingColor }}>
            Be the First to Add a Memory!
          </p>
          <p className="text-xs sm:text-sm mt-1 max-w-xs text-gray-500">
            Snap a photo with the disposable camera or upload from your gallery!
          </p>
          <Button
            onClick={() => fileInputRef.current?.click()}
            className="mt-4 rounded-full bg-[#d4af37] text-black font-bold px-6 text-xs hover:bg-[#b8992d] shadow-md"
          >
            <Upload size={14} className="mr-1.5" /> Upload First Photo
          </Button>
        </div>
      ) : (
        <LiveMasonryGrid mediaItems={mediaItems} />
      )}
    </div>
  );
}
