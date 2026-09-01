'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, Sparkles, Upload, RefreshCw, Trophy, Heart, Search, X, Film, Image as ImageIcon } from 'lucide-react';
import { LiveMasonryGrid } from '@/components/live-masonry-grid';
import { fetchPublicWallItems, deleteMediaItem, WallItem } from '@/lib/media';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { MultiMediaUploaderModal } from '@/components/multi-media-uploader-modal';

const filterTabs = ['All', '📸 Photos', '🎥 Videos', '🎯 Quests'];

export default function LiveWallPage() {
  const [mediaItems, setMediaItems] = useState<WallItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploaderModalOpen, setIsUploaderModalOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [authorName, setAuthorName] = useState('');
  const { toast } = useToast();

  const loadMedia = async () => {
    try {
      const items = await fetchPublicWallItems(100);
      setMediaItems(items);
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

  const handleUploadSuccess = (newItems: WallItem[]) => {
    setMediaItems(prev => [...newItems, ...prev]);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Admin: Delete this photo from the live wall & database?')) return;
    try {
      const ok = await deleteMediaItem(id, '0408');
      if (ok) {
        setMediaItems(prev => prev.filter(item => item.id !== id));
        toast({ title: '🗑️ Photo deleted', description: 'Removed from live wall and database.' });
      }
    } catch {
      toast({ variant: 'destructive', title: 'Could not delete photo' });
    }
  };

  const filteredItems = useMemo(() => {
    return mediaItems.filter(item => {
      const isVid = item.imageUrl?.startsWith('data:video') || /\.(mp4|webm|mov)$/i.test(item.imageUrl || '') || item.mediaType === 'video';
      if (activeFilter === '📸 Photos' && isVid) return false;
      if (activeFilter === '🎥 Videos' && !isVid) return false;
      if (activeFilter === '🎯 Quests' && !item.questTag && !item.description?.toLowerCase().includes('quest')) return false;

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

  return (
    <div className="min-h-screen w-full bg-[radial-gradient(ellipse_at_50%_0%,#09261b_0%,#03160e_50%,#010905_100%)] text-white p-4 sm:p-6 lg:p-8 relative selection:bg-amber-500 selection:text-black">
      {/* Dedicated Multi-Media Uploader Modal */}
      <MultiMediaUploaderModal
        isOpen={isUploaderModalOpen}
        onClose={() => setIsUploaderModalOpen(false)}
        onUploadSuccess={handleUploadSuccess}
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
            {/* Name Tag Pill */}
            <div className="flex items-center gap-1.5 bg-white/10 rounded-full px-3.5 py-2 border border-amber-500/30">
              <span className="text-[10px] uppercase font-bold text-amber-400">Tag:</span>
              <input
                type="text"
                value={authorName}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="Your name or table..."
                className="bg-transparent text-xs text-white placeholder:text-white/40 focus:outline-none w-32 truncate"
              />
            </div>

            <Button
              onClick={() => setIsUploaderModalOpen(true)}
              size="lg"
              className="rounded-full bg-gradient-to-r from-amber-200 via-amber-400 to-amber-500 text-black font-extrabold px-7 hover:scale-105 transition-all shadow-[0_0_20px_rgba(212,175,55,0.4)]"
            >
              <Camera size={18} className="mr-2" />
              📸 Upload Photos &amp; Videos
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
          <div className="inline-flex items-center gap-3 mt-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs text-white/70">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              {mediaItems.length} Total Memories
            </span>
            <span>•</span>
            <span>📸 {photoCount} Photos</span>
            <span>•</span>
            <span>🎥 {videoCount} Videos</span>
          </div>

          {/* Category tabs & Search filter bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 w-full max-w-2xl mt-4 pt-4 border-t border-white/10">
            <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1">
              {filterTabs.map(tab => (
                <Button
                  key={tab}
                  size="sm"
                  variant={activeFilter === tab ? 'default' : 'outline'}
                  onClick={() => setActiveFilter(tab)}
                  className={`rounded-full text-xs font-bold transition-all ${
                    activeFilter === tab
                      ? 'bg-amber-400 text-black border-amber-400 font-extrabold shadow-md'
                      : 'border-white/15 text-white/70 bg-white/5 hover:bg-white/10'
                  }`}
                >
                  {tab}
                </Button>
              ))}
            </div>

            <div className="relative w-full sm:w-56">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search guest or tag..."
                className="w-full rounded-full bg-white/10 border border-white/15 pl-8 pr-4 py-1.5 text-xs text-white placeholder:text-white/40 focus:outline-none focus:border-amber-400"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/40 hover:text-white">
                  <X size={13} />
                </button>
              )}
            </div>
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
        ) : filteredItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center glass-card !rounded-3xl border-white/10 max-w-lg mx-auto p-8 space-y-4">
            <div className="w-16 h-16 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center text-2xl">
              📸
            </div>
            <h3 className="font-headline italic text-3xl font-bold text-white">
              {searchQuery ? 'No matching memories found' : 'The Live Wall is Ready!'}
            </h3>
            <p className="text-sm text-white/60 leading-relaxed">
              Select multiple photos and videos to share live on the big screen!
            </p>
            <Button
              onClick={() => setIsUploaderModalOpen(true)}
              className="rounded-full bg-amber-400 text-black font-bold px-8 hover:bg-amber-300 shadow-lg"
            >
              <Camera size={16} className="mr-2" /> Upload Memories
            </Button>
          </div>
        ) : (
          <LiveMasonryGrid mediaItems={filteredItems} onDelete={handleDelete} />
        )}
      </main>
    </div>
  );
}
