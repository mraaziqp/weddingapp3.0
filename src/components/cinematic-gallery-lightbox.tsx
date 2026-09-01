'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronLeft, ChevronRight, Download, Heart, Trash2, Share2, Sparkles, Film } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { deleteMediaItem, WallItem } from '@/lib/media';

interface CinematicGalleryLightboxProps {
  items: WallItem[];
  currentIndex: number | null;
  onClose: () => void;
  onNavigate: (index: number) => void;
  onDelete?: (id: string) => void;
  isAdmin?: boolean;
}

export function CinematicGalleryLightbox({
  items,
  currentIndex,
  onClose,
  onNavigate,
  onDelete,
  isAdmin = false,
}: CinematicGalleryLightboxProps) {
  const [likes, setLikes] = useState<Record<string, number>>({});
  const [userLiked, setUserLiked] = useState<Record<string, boolean>>({});
  const { toast } = useToast();

  const isOpen = currentIndex !== null && currentIndex >= 0 && currentIndex < items.length;
  const currentItem = isOpen ? items[currentIndex] : null;

  const isVideo =
    currentItem?.imageUrl?.startsWith('data:video') ||
    /\.(mp4|webm|mov|ogg)$/i.test(currentItem?.imageUrl || '') ||
    currentItem?.mediaType === 'video';

  const handlePrev = useCallback(() => {
    if (currentIndex !== null && currentIndex > 0) {
      onNavigate(currentIndex - 1);
    } else if (items.length > 0) {
      onNavigate(items.length - 1); // Loop to end
    }
  }, [currentIndex, items.length, onNavigate]);

  const handleNext = useCallback(() => {
    if (currentIndex !== null && currentIndex < items.length - 1) {
      onNavigate(currentIndex + 1);
    } else if (items.length > 0) {
      onNavigate(0); // Loop to start
    }
  }, [currentIndex, items.length, onNavigate]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') handlePrev();
      if (e.key === 'ArrowRight') handleNext();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handlePrev, handleNext, onClose]);

  const handleLike = (id: string) => {
    const isCurrentlyLiked = userLiked[id];
    setUserLiked(prev => ({ ...prev, [id]: !isCurrentlyLiked }));
    setLikes(prev => ({
      ...prev,
      [id]: (prev[id] || currentItem?.likes || 0) + (isCurrentlyLiked ? -1 : 1),
    }));

    if (!isCurrentlyLiked) {
      import('canvas-confetti').then(({ default: confetti }) => {
        confetti({
          particleCount: 25,
          spread: 45,
          origin: { y: 0.8 },
          colors: ['#ef4444', '#f43f5e', '#fda4af'],
        });
      });
    }
  };

  const handleDownload = async (url: string, name: string) => {
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = objectUrl;
      a.download = name || 'wedding-memory.jpg';
      a.click();
      URL.revokeObjectURL(objectUrl);
      toast({ title: 'Download started' });
    } catch {
      toast({ variant: 'destructive', title: 'Could not download file' });
    }
  };

  return (
    <AnimatePresence>
      {isOpen && currentItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-2xl p-2 sm:p-6 select-none">
          {/* Top Bar Controls */}
          <div className="absolute top-4 inset-x-4 sm:inset-x-8 flex items-center justify-between z-50 pointer-events-auto">
            <div className="flex items-center gap-3">
              <div className="px-3.5 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/10 text-xs font-bold text-amber-300">
                {currentIndex + 1} / {items.length}
              </div>
              {currentItem.questTag && (
                <div className="hidden sm:inline-flex items-center gap-1 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 text-[11px] font-bold text-amber-300">
                  <Sparkles size={11} /> {currentItem.questTag}
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleDownload(currentItem.imageUrl, `wedding-${currentItem.id}.jpg`)}
                className="rounded-full border-white/20 bg-white/10 hover:bg-white/20 text-white text-xs"
              >
                <Download size={14} className="sm:mr-1.5" />
                <span className="hidden sm:inline">Download</span>
              </Button>

              {isAdmin && onDelete && (
                <Button
                  size="sm"
                  onClick={() => {
                    if (confirm('Admin: Delete this photo from gallery and database?')) {
                      onDelete(currentItem.id);
                      onClose();
                    }
                  }}
                  className="rounded-full bg-red-600 hover:bg-red-700 text-white text-xs font-bold"
                >
                  <Trash2 size={14} className="sm:mr-1.5" />
                  <span className="hidden sm:inline">Delete</span>
                </Button>
              )}

              <button
                onClick={onClose}
                className="p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
                title="Close (Esc)"
              >
                <X size={20} />
              </button>
            </div>
          </div>

          {/* Left Arrow Button */}
          <button
            onClick={handlePrev}
            className="absolute left-3 sm:left-6 top-1/2 -translate-y-1/2 z-50 p-3 sm:p-4 rounded-full bg-black/60 hover:bg-amber-500 hover:text-black text-white border border-white/10 transition-all shadow-2xl"
            title="Previous (←)"
          >
            <ChevronLeft size={24} />
          </button>

          {/* Right Arrow Button */}
          <button
            onClick={handleNext}
            className="absolute right-3 sm:right-6 top-1/2 -translate-y-1/2 z-50 p-3 sm:p-4 rounded-full bg-black/60 hover:bg-amber-500 hover:text-black text-white border border-white/10 transition-all shadow-2xl"
            title="Next (→)"
          >
            <ChevronRight size={24} />
          </button>

          {/* Center Main Stage */}
          <motion.div
            key={currentItem.id}
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.2 }}
            className="relative max-w-5xl max-h-[82vh] w-full flex flex-col items-center justify-center p-2"
          >
            <div className="relative rounded-3xl overflow-hidden max-h-[72vh] flex items-center justify-center bg-black/50 shadow-[0_0_50px_rgba(0,0,0,0.8)] border border-white/10">
              {isVideo ? (
                <video
                  src={currentItem.imageUrl}
                  controls
                  autoPlay
                  playsInline
                  className="max-h-[72vh] w-auto max-w-full object-contain"
                />
              ) : (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={currentItem.imageUrl}
                  alt={currentItem.description || 'Wedding photo'}
                  className="max-h-[72vh] w-auto max-w-full object-contain rounded-2xl"
                />
              )}
            </div>

            {/* Bottom Caption Bar */}
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 w-full max-w-2xl px-4 py-3 rounded-2xl bg-black/60 backdrop-blur-xl border border-white/10">
              <div>
                <p className="font-headline italic text-base sm:text-lg font-bold text-[#f6e7b7]">
                  {currentItem.guestName || 'Wedding Guest'}
                </p>
                <p className="text-xs text-white/60">{currentItem.description || 'Cherished wedding memory'}</p>
              </div>

              <button
                onClick={() => handleLike(currentItem.id)}
                className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 hover:bg-red-500/20 border border-white/10 transition-all text-xs text-white font-bold"
              >
                <Heart
                  size={18}
                  className={`transition-all ${
                    userLiked[currentItem.id] ? 'text-red-500 fill-current scale-125' : 'text-white/60'
                  }`}
                />
                <span>{(likes[currentItem.id] ?? currentItem.likes) || 0} Likes</span>
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
