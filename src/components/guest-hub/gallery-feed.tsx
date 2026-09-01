'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, Camera, Sparkles, Upload, Search, Heart, Film, Image as ImageIcon, X } from 'lucide-react';
import { LiveMasonryGrid } from '../live-masonry-grid';
import { fetchPublicWallItems, WallItem } from '@/lib/media';
import { Button } from '../ui/button';
import { useToast } from '@/hooks/use-toast';
import { compressImageFile } from '@/lib/image-utils';

const filterTabs = ['All', '📸 Photos', '🎥 Videos', '🎯 Quests'];

interface GalleryFeedProps {
  partyMode?: boolean;
  isMorningAfter?: boolean;
}

export function GalleryFeed({ partyMode = false, isMorningAfter = false }: GalleryFeedProps) {
  const [activeFilter, setActiveFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [mediaItems, setMediaItems] = useState<WallItem[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);
  const [authorName, setAuthorName] = useState('');
  const [lightboxItem, setLightboxItem] = useState<WallItem | null>(null);
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
    fetchPublicWallItems(100)
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
    const rawFiles = e.target.files;
    e.target.value = '';
    if (!rawFiles || rawFiles.length === 0) return;

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

    const filesArray = Array.from(rawFiles);
    setIsUploading(true);
    setUploadProgress(`Uploading ${filesArray.length} item${filesArray.length > 1 ? 's' : ''}...`);

    try {
      // Compress images in parallel (skip video compression)
      const compressedFiles = await Promise.all(
        filesArray.map(f => (f.type.startsWith('video') ? Promise.resolve(f) : compressImageFile(f)))
      );

      const formData = new FormData();
      for (const file of compressedFiles) {
        formData.append('files', file);
      }
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
        title: `🎉 ${compressedFiles.length} Memory Added!`,
        description: `Live on the Memories Wall with tag: ${currentName}`,
      });

      if (Array.isArray(data.items)) {
        setMediaItems(prev => [...data.items, ...prev]);
      } else {
        loadMedia();
      }

      import('canvas-confetti').then(({ default: confetti }) => {
        confetti({ particleCount: 100, spread: 70, origin: { y: 0.65 } });
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
      setUploadProgress(null);
    }
  };

  // Filtered & Searched media items
  const filteredItems = useMemo(() => {
    return mediaItems.filter(item => {
      // Tab filter
      const isVid = item.imageUrl?.startsWith('data:video') || /\.(mp4|webm|mov)$/i.test(item.imageUrl || '') || item.mediaType === 'video';
      if (activeFilter === '📸 Photos' && isVid) return false;
      if (activeFilter === '🎥 Videos' && !isVid) return false;
      if (activeFilter === '🎯 Quests' && !item.questTag && !item.description?.toLowerCase().includes('quest')) return false;

      // Search query filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const nameMatch = item.guestName?.toLowerCase().includes(query);
        const descMatch = item.description?.toLowerCase().includes(query);
        const tagMatch = item.questTag?.toLowerCase().includes(query);
        if (!nameMatch && !descMatch && !tagMatch) return false;
      }

      return true;
    });
  }, [mediaItems, activeFilter, searchQuery]);

  const photoCount = mediaItems.filter(i => !(i.imageUrl?.startsWith('data:video') || /\.(mp4|webm|mov)$/i.test(i.imageUrl || '') || i.mediaType === 'video')).length;
  const videoCount = mediaItems.length - photoCount;

  const headingColor = partyMode ? '#f6e7b7' : '#1C1C1C';
  const subtitleColor = partyMode ? 'rgba(246,231,183,0.65)' : '#6b7280';

  return (
    <div className="p-2 sm:p-4 space-y-4">
      {/* Hidden File Input for Multiple Uploads */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
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
            {/* Action Bar Header */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white/80 backdrop-blur-md rounded-3xl p-5 border border-[#d4af37]/35 shadow-lg">
              <div className="text-center sm:text-left space-y-1">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#d4af37]/20 text-[#8a6f1f] border border-[#d4af37]/30">
                  <Sparkles size={11} className="text-[#d4af37]" /> Live Memory Stream
                </div>
                <h2 className="font-headline text-2xl sm:text-3xl font-bold italic" style={{ color: headingColor }}>
                  Live Memories Wall
                </h2>
                <div className="flex items-center justify-center sm:justify-start gap-2 text-xs text-gray-500">
                  <span>📸 {photoCount} Photos</span>
                  <span>•</span>
                  <span>🎥 {videoCount} Videos</span>
                </div>
              </div>

              {/* Upload & Name Tag Controls */}
              <div className="flex flex-col sm:flex-row items-center gap-2 w-full sm:w-auto">
                <div className="flex items-center gap-1.5 bg-black/5 rounded-full px-3 py-1.5 border border-gray-200 w-full sm:w-auto">
                  <span className="text-[10px] uppercase font-bold text-amber-600">Tag:</span>
                  <input
                    type="text"
                    value={authorName}
                    onChange={(e) => handleNameChange(e.target.value)}
                    placeholder="Your name or table..."
                    className="bg-transparent text-xs text-gray-800 placeholder:text-gray-400 focus:outline-none w-28 sm:w-32"
                  />
                </div>

                <Button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="w-full sm:w-auto rounded-full bg-gradient-to-r from-[#f6e7b7] via-[#d4af37] to-[#c8a030] hover:scale-105 text-black font-extrabold px-5 text-xs shadow-md transition-all h-10"
                >
                  <Camera size={16} className="mr-1.5" />
                  {isUploading ? (uploadProgress || 'Uploading...') : '📸 Upload Photos / Videos'}
                </Button>
              </div>
            </div>

            {/* Search and Category Filters */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1">
              {/* Category Filter Chips */}
              <div className="flex gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 [&::-webkit-scrollbar]:hidden">
                {filterTabs.map(tab => (
                  <Button
                    key={tab}
                    size="sm"
                    variant={activeFilter === tab ? 'default' : 'outline'}
                    onClick={() => setActiveFilter(tab)}
                    className={`rounded-full text-xs font-bold transition-all ${
                      activeFilter === tab
                        ? 'bg-[#D4AF37] border-[#D4AF37] text-black shadow-md'
                        : 'border-gray-300 text-gray-600 bg-white/60 hover:bg-white'
                    }`}
                  >
                    {tab}
                  </Button>
                ))}
              </div>

              {/* Search input */}
              <div className="relative w-full sm:w-56">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by name or tag..."
                  className="w-full rounded-full bg-white/70 border border-gray-200 pl-8 pr-4 py-1.5 text-xs text-gray-800 placeholder:text-gray-400 focus:outline-none focus:border-[#d4af37]"
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-black">
                    <X size={13} />
                  </button>
                )}
              </div>
            </div>
          </motion.header>
        )}
      </AnimatePresence>

      {/* Grid rendering */}
      {filteredItems.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center" style={{ color: subtitleColor }}>
          <div className="w-14 h-14 rounded-full bg-[#d4af37]/15 flex items-center justify-center mb-3 text-2xl shadow-inner">
            📸
          </div>
          <p className="font-headline italic text-2xl font-bold" style={{ color: headingColor }}>
            {searchQuery ? 'No memories found for that search' : 'Be the First to Add a Memory!'}
          </p>
          <p className="text-xs sm:text-sm mt-1 max-w-xs text-gray-500">
            Select multiple photos and videos from your phone to share live!
          </p>
          <Button
            onClick={() => fileInputRef.current?.click()}
            className="mt-4 rounded-full bg-[#d4af37] text-black font-bold px-6 text-xs hover:bg-[#b8992d] shadow-md"
          >
            <Upload size={14} className="mr-1.5" /> Upload Photos &amp; Videos
          </Button>
        </div>
      ) : (
        <LiveMasonryGrid mediaItems={filteredItems} />
      )}
    </div>
  );
}
