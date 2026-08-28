'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, Download, Trash2, ShieldAlert, Sparkles, RefreshCw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { deleteMediaItem, WallItem } from '@/lib/media';

export default function VaultPage() {
  const [mediaItems, setMediaItems] = useState<WallItem[]>([]);
  const [activeTab, setActiveTab] = useState<'shared' | 'private'>('shared');
  const [loading, setLoading] = useState(true);
  const [selectedPhoto, setSelectedPhoto] = useState<WallItem | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const { toast } = useToast();

  const loadMedia = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/media?all=true&limit=150');
      const data = await res.json();
      if (data.ok && Array.isArray(data.items)) {
        setMediaItems(data.items);
      }
    } catch (error) {
      console.error('Failed to load media:', error);
      toast({ variant: 'destructive', title: 'Failed to load vault' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMedia();
  }, []);

  const filteredItems = mediaItems.filter(item => {
    if (activeTab === 'shared') return item.visibility === 'public' || !item.visibility;
    return item.visibility === 'private';
  });

  const handleDelete = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!confirm('Are you sure you want to delete this memory from the gallery?')) return;

    setDeletingId(id);
    try {
      const ok = await deleteMediaItem(id, '0408');
      if (ok) {
        setMediaItems(prev => prev.filter(m => m.id !== id));
        if (selectedPhoto?.id === id) setSelectedPhoto(null);
        toast({ title: '🗑️ Photo deleted', description: 'Removed from live gallery and database.' });
      } else {
        throw new Error('Delete failed');
      }
    } catch {
      toast({ variant: 'destructive', title: 'Could not delete photo' });
    } finally {
      setDeletingId(null);
    }
  };

  const downloadPhoto = async (url: string, name: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = objectUrl;
      a.download = name || 'wedding-photo.jpg';
      a.click();
      URL.revokeObjectURL(objectUrl);
      toast({ title: 'Photo downloaded' });
    } catch {
      toast({ variant: 'destructive', title: 'Failed to download' });
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 sm:p-6 text-white">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-black/40 backdrop-blur-xl p-6 rounded-3xl border border-amber-500/20 shadow-2xl">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/30 mb-2">
            <Sparkles size={12} className="text-amber-400" /> Couple's Memory Vault
          </div>
          <h1 className="font-headline text-3xl sm:text-4xl font-bold italic tracking-tight text-amber-50">
            💝 Gallery Moderation &amp; Vault
          </h1>
          <p className="text-white/60 text-xs sm:text-sm mt-1">
            Review, download, or delete any guest photos and videos live
          </p>
        </div>

        <Button
          onClick={loadMedia}
          disabled={loading}
          variant="outline"
          className="rounded-full border-amber-500/30 bg-white/5 hover:bg-amber-500/20 text-amber-300 font-semibold text-xs"
        >
          <RefreshCw size={14} className={`mr-2 ${loading ? 'animate-spin' : ''}`} /> Refresh Feed
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-3">
        {(['shared', 'private'] as const).map((tab) => {
          const count = mediaItems.filter(item => tab === 'shared' ? (item.visibility === 'public' || !item.visibility) : item.visibility === 'private').length;
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-5 py-2.5 rounded-full font-bold text-xs uppercase tracking-wider transition-all ${
                activeTab === tab
                  ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/30'
                  : 'bg-white/5 text-white/60 hover:bg-white/10 border border-white/10'
              }`}
            >
              {tab === 'shared' ? '📸 Public Live Wall' : '🔒 Private Couple Vault'}
              <span className="ml-2 px-2 py-0.5 rounded-full text-[10px] bg-black/20 text-white font-mono">
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Photos Grid */}
      {loading ? (
        <div className="text-center py-20 text-white/50">
          <div className="w-10 h-10 rounded-full border-2 border-amber-400 border-t-transparent animate-spin mx-auto mb-3" />
          <p className="font-headline italic text-lg text-amber-200">Loading Memories…</p>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="text-center py-16 bg-white/5 rounded-3xl border border-white/10 p-8">
          <Heart className="mx-auto mb-3 opacity-30 text-amber-400" size={40} />
          <p className="font-headline italic text-xl text-white">No {activeTab} memories yet</p>
          <p className="text-xs text-white/40 mt-1">Photos taken by guests will appear here automatically.</p>
        </div>
      ) : (
        <motion.div
          layout
          className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4"
        >
          {filteredItems.map((item) => {
            const isVideo = item.imageUrl?.startsWith('data:video') || /\.(mp4|webm|mov)$/i.test(item.imageUrl || '');
            return (
              <motion.div
                key={item.id}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                whileHover={{ scale: 1.02 }}
                onClick={() => setSelectedPhoto(item)}
                className="relative group rounded-2xl overflow-hidden bg-white/5 border border-white/10 cursor-pointer shadow-lg hover:border-amber-500/50 transition-all aspect-square"
              >
                {isVideo ? (
                  <video
                    src={item.imageUrl}
                    className="w-full h-full object-cover"
                    muted
                  />
                ) : (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={item.imageUrl}
                    alt="Guest photo"
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    loading="lazy"
                  />
                )}

                {/* Top Action Overlay (Delete & Download) */}
                <div className="absolute top-2 right-2 flex items-center gap-1.5 z-10 opacity-90 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => downloadPhoto(item.imageUrl, `photo-${item.id}.jpg`, e)}
                    className="p-2 bg-black/60 backdrop-blur-md rounded-full text-white hover:bg-amber-500 hover:text-black transition-colors"
                    title="Download Photo"
                  >
                    <Download size={14} />
                  </button>
                  <button
                    onClick={(e) => handleDelete(item.id, e)}
                    disabled={deletingId === item.id}
                    className="p-2 bg-red-600/80 backdrop-blur-md rounded-full text-white hover:bg-red-700 transition-colors"
                    title="Delete Photo"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>

                {/* Bottom caption overlay */}
                <div className="absolute inset-x-0 bottom-0 p-2.5 bg-gradient-to-t from-black/85 via-black/40 to-transparent">
                  <p className="text-[11px] font-bold text-white truncate">{item.guestName || 'Guest'}</p>
                  <p className="text-[9px] text-amber-300/80 truncate">{item.description || 'Live capture'}</p>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      )}

      {/* Fullscreen Lightbox Modal */}
      {selectedPhoto && (
        <div
          onClick={() => setSelectedPhoto(null)}
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            onClick={(e) => e.stopPropagation()}
            className="relative max-w-3xl w-full bg-[#111] rounded-3xl overflow-hidden border border-amber-500/30 p-4 space-y-4 shadow-2xl"
          >
            <div className="relative max-h-[70vh] rounded-2xl overflow-hidden flex items-center justify-center bg-black">
              {selectedPhoto.imageUrl?.startsWith('data:video') || /\.(mp4|webm|mov)$/i.test(selectedPhoto.imageUrl || '') ? (
                <video
                  src={selectedPhoto.imageUrl}
                  controls
                  autoPlay
                  playsInline
                  className="max-h-[70vh] w-auto mx-auto object-contain"
                />
              ) : (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={selectedPhoto.imageUrl}
                  alt="Full photo"
                  className="max-h-[70vh] w-auto mx-auto object-contain rounded-xl"
                />
              )}
            </div>

            <div className="flex items-center justify-between pt-2 px-2">
              <div>
                <p className="font-headline italic text-lg text-amber-200">{selectedPhoto.guestName || 'Wedding Guest'}</p>
                <p className="text-xs text-white/50">{selectedPhoto.description}</p>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  onClick={() => downloadPhoto(selectedPhoto.imageUrl, `photo-${selectedPhoto.id}.jpg`)}
                  size="sm"
                  variant="outline"
                  className="rounded-full border-amber-500/30 bg-white/5 text-amber-300 hover:bg-amber-500/20 text-xs"
                >
                  <Download size={14} className="mr-1.5" /> Download
                </Button>
                <Button
                  onClick={() => handleDelete(selectedPhoto.id)}
                  size="sm"
                  className="rounded-full bg-red-600 hover:bg-red-700 text-white font-bold text-xs"
                >
                  <Trash2 size={14} className="mr-1.5" /> Delete
                </Button>
                <Button
                  onClick={() => setSelectedPhoto(null)}
                  size="sm"
                  variant="ghost"
                  className="rounded-full text-white/70 hover:text-white"
                >
                  Close
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
