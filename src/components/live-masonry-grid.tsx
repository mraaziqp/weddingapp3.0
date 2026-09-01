'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Heart, Trash2, Maximize2, LayoutGrid, Columns, Film } from 'lucide-react';
import { deleteMediaItem, WallItem } from '@/lib/media';
import { CinematicGalleryLightbox } from './cinematic-gallery-lightbox';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.05, delayChildren: 0.05 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.96 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { type: 'spring', stiffness: 140, damping: 18 } },
};

const Polaroid = ({
  item,
  className,
  onDelete,
  onClick,
}: {
  item: WallItem;
  className?: string;
  onDelete?: (id: string) => void;
  onClick?: () => void;
}) => {
  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(item.likes || 0);

  const isVideo =
    item.imageUrl?.startsWith('data:video') ||
    /\.(mp4|webm|mov|ogg)$/i.test(item.imageUrl || '') ||
    item.mediaType === 'video' ||
    item.description?.toLowerCase().includes('video');

  const handleLike = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isLiked) {
      setIsLiked(true);
      setLikeCount(prev => prev + 1);
      import('canvas-confetti').then(({ default: confetti }) => {
        confetti({
          particleCount: 15,
          spread: 40,
          origin: { y: 0.8 },
          colors: ['#ef4444', '#f43f5e'],
        });
      });
    } else {
      setIsLiked(false);
      setLikeCount(prev => Math.max(0, prev - 1));
    }
  };

  return (
    <motion.div
      variants={itemVariants}
      onClick={onClick}
      className={cn(
        'break-inside-avoid-column p-2.5 pb-3.5 bg-white/95 text-black rounded-2xl shadow-lg transition-all duration-300 hover:rotate-0 hover:scale-[1.02] hover:shadow-2xl border border-black/5 relative group cursor-pointer',
        className
      )}
    >
      <div className="relative rounded-xl overflow-hidden bg-black/5 aspect-[4/5] flex items-center justify-center">
        {isVideo ? (
          <div className="relative w-full h-full">
            <video
              src={item.imageUrl}
              playsInline
              muted
              className="w-full h-full object-cover"
            />
            <div className="absolute top-2 left-2 p-1.5 rounded-full bg-black/70 text-amber-300 backdrop-blur-md">
              <Film size={12} />
            </div>
          </div>
        ) : (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={item.imageUrl}
            alt={item.description || 'Wedding memory'}
            className="w-full h-full object-cover select-none group-hover:scale-105 transition-transform duration-500"
            loading="lazy"
          />
        )}

        {/* Fullscreen zoom hover indicator */}
        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <div className="p-2 rounded-full bg-black/60 text-white/90 backdrop-blur-md shadow-md scale-90 group-hover:scale-100 transition-transform">
            <Maximize2 size={16} />
          </div>
        </div>

        {/* Optional Delete Button */}
        {onDelete && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(item.id);
            }}
            className="absolute top-2 right-2 p-1.5 rounded-full bg-red-600/90 text-white hover:bg-red-700 opacity-80 hover:opacity-100 transition-opacity z-10 shadow-md"
            title="Delete Photo"
          >
            <Trash2 size={13} />
          </button>
        )}
      </div>

      <div className="flex justify-between items-center pt-2.5 px-1">
        <div className="truncate pr-2">
          <p className="font-headline text-sm sm:text-base font-bold italic text-gray-900 leading-tight truncate">
            {item.guestName || 'Wedding Guest'}
          </p>
          <p className="text-[10px] text-gray-400 uppercase tracking-wider mt-0.5 truncate">
            {item.description || 'Cherished memory'}
          </p>
        </div>

        <button
          onClick={handleLike}
          className="flex items-center gap-1 text-xs text-gray-400 hover:text-red-500 transition-colors p-1 rounded-full hover:bg-red-50 flex-shrink-0"
        >
          <Heart
            className={cn('transition-all', isLiked ? 'text-red-500 fill-current scale-110' : 'text-gray-400')}
            size={16}
          />
          <span className="font-semibold text-gray-600 tabular-nums">{likeCount}</span>
        </button>
      </div>
    </motion.div>
  );
};

export function LiveMasonryGrid({
  mediaItems,
  onDelete,
  isAdmin = false,
}: {
  mediaItems: WallItem[];
  onDelete?: (id: string) => void;
  isAdmin?: boolean;
}) {
  const [selectedLightboxIndex, setSelectedLightboxIndex] = useState<number | null>(null);

  return (
    <>
      <motion.div
        className="columns-2 sm:columns-3 lg:columns-4 gap-4 space-y-4"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {mediaItems.map((item, i) => (
          <Polaroid
            key={item.id || i}
            item={item}
            onDelete={onDelete}
            onClick={() => setSelectedLightboxIndex(i)}
            className={cn(
              i % 4 === 1 && 'rotate-[1deg]',
              i % 4 === 2 && 'rotate-[-1deg]',
              i % 4 === 3 && 'rotate-[0.5deg]'
            )}
          />
        ))}
      </motion.div>

      {/* Cinematic Lightbox Viewer */}
      <CinematicGalleryLightbox
        items={mediaItems}
        currentIndex={selectedLightboxIndex}
        onClose={() => setSelectedLightboxIndex(null)}
        onNavigate={(idx) => setSelectedLightboxIndex(idx)}
        onDelete={onDelete}
        isAdmin={isAdmin}
      />
    </>
  );
}
