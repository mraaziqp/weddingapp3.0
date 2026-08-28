'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trash2, Download, RefreshCw, Sparkles, Image as ImageIcon, Video, CheckCircle2, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { deleteMediaItem, WallItem } from '@/lib/media';

export function AdminGalleryModerator() {
  const [items, setItems] = useState<WallItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<WallItem | null>(null);
  const { toast } = useToast();

  const loadMedia = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/media?all=true&limit=150');
      const data = await res.json();
      if (data.ok && Array.isArray(data.items)) {
        setItems(data.items);
      }
    } catch {
      toast({ variant: 'destructive', title: 'Could not load gallery items' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMedia();
  }, []);

  const handleDelete = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!confirm('Are you sure you want to delete this image/video from the gallery & database?')) return;

    setDeletingId(id);
    try {
      const ok = await deleteMediaItem(id, '0408');
      if (ok) {
        setItems(prev => prev.filter(item => item.id !== id));
        if (selectedItem?.id === id) setSelectedItem(null);
        toast({
          title: '🗑️ Deleted successfully',
          description: 'The photo/video was removed from the live wall and database.',
        });
      } else {
        throw new Error('Deletion failed');
      }
    } catch {
      toast({ variant: 'destructive', title: 'Failed to delete photo' });
    } finally {
      setDeletingId(null);
    }
  };

  const handleDownload = async (url: string, name: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = objectUrl;
      a.download = name || 'wedding-media.jpg';
      a.click();
      URL.revokeObjectURL(objectUrl);
      toast({ title: 'Download started' });
    } catch {
      toast({ variant: 'destructive', title: 'Download failed' });
    }
  };

  return (
    <div className="rounded-3xl bg-black/40 border border-amber-500/25 p-6 backdrop-blur-2xl shadow-2xl space-y-6 text-white">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-white/10 pb-5">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-red-500/20 text-red-300 border border-red-500/30 mb-2">
            <ShieldAlert size={12} className="text-red-400" /> Admin Content Moderation
          </div>
          <h3 className="font-headline text-2xl sm:text-3xl font-bold italic text-[#f6e7b7]">
            📸 Live Memories &amp; Gallery Moderation
          </h3>
          <p className="text-xs text-white/60 mt-1">
            Delete any unwanted photos/videos in 1 click or download high-res originals.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs font-mono text-amber-300">
            {items.length} total media files
          </div>
          <Button
            onClick={loadMedia}
            disabled={loading}
            size="sm"
            variant="outline"
            className="rounded-full border-amber-500/30 bg-white/5 hover:bg-amber-500/20 text-amber-300 text-xs font-bold"
          >
            <RefreshCw size={14} className={`mr-1.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </Button>
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="text-center py-16 text-white/50">
          <div className="w-10 h-10 rounded-full border-2 border-amber-400 border-t-transparent animate-spin mx-auto mb-3" />
          <p className="font-headline italic text-amber-200">Loading live uploads…</p>
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-14 bg-white/5 rounded-2xl border border-white/10 p-6 space-y-2">
          <ImageIcon className="mx-auto text-amber-400/40" size={36} />
          <p className="font-headline italic text-lg text-white">No photos or videos uploaded yet</p>
          <p className="text-xs text-white/50">Guest uploads from the camera or live wall will appear here.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3.5">
          {items.map((item) => {
            const isVideo =
              item.imageUrl?.startsWith('data:video') ||
              /\.(mp4|webm|mov)$/i.test(item.imageUrl || '') ||
              item.mediaType === 'video';

            return (
              <div
                key={item.id}
                onClick={() => setSelectedItem(item)}
                className="group relative rounded-2xl overflow-hidden bg-white/5 border border-white/10 hover:border-amber-400/60 transition-all cursor-pointer shadow-md aspect-square flex items-center justify-center"
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
                    alt="Uploaded thumbnail"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    loading="lazy"
                  />
                )}

                {/* Video icon badge */}
                {isVideo && (
                  <div className="absolute top-2 left-2 bg-black/70 rounded-full p-1 text-amber-300">
                    <Video size={12} />
                  </div>
                )}

                {/* Direct 1-Click Delete Button on top right */}
                <button
                  type="button"
                  onClick={(e) => handleDelete(item.id, e)}
                  disabled={deletingId === item.id}
                  className="absolute top-2 right-2 p-2 rounded-full bg-red-600/90 text-white hover:bg-red-700 hover:scale-110 transition-all shadow-lg z-20"
                  title="Delete from Live Gallery & Database"
                >
                  <Trash2 size={13} />
                </button>

                {/* Guest name tag caption overlay */}
                <div className="absolute inset-x-0 bottom-0 p-2 bg-gradient-to-t from-black/90 via-black/50 to-transparent z-10">
                  <p className="text-[10px] font-bold text-white truncate">
                    {item.guestName || 'Guest'}
                  </p>
                  <p className="text-[8px] text-amber-300/80 truncate">
                    {item.description || 'Live capture'}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Lightbox / Action Modal */}
      <AnimatePresence>
        {selectedItem && (
          <div
            onClick={() => setSelectedItem(null)}
            className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="relative max-w-2xl w-full bg-[#111] rounded-3xl overflow-hidden border border-amber-500/30 p-5 space-y-4 shadow-2xl"
            >
              <div className="max-h-[65vh] rounded-2xl overflow-hidden flex items-center justify-center bg-black">
                {selectedItem.imageUrl?.startsWith('data:video') || /\.(mp4|webm|mov)$/i.test(selectedItem.imageUrl || '') ? (
                  <video
                    src={selectedItem.imageUrl}
                    controls
                    autoPlay
                    playsInline
                    className="max-h-[65vh] w-auto mx-auto object-contain"
                  />
                ) : (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={selectedItem.imageUrl}
                    alt="Full preview"
                    className="max-h-[65vh] w-auto mx-auto object-contain rounded-xl"
                  />
                )}
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
                <div className="text-center sm:text-left">
                  <p className="font-headline italic text-lg font-bold text-[#f6e7b7]">
                    Uploaded by: {selectedItem.guestName || 'Wedding Guest'}
                  </p>
                  <p className="text-xs text-white/50">{selectedItem.description}</p>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    onClick={() => handleDownload(selectedItem.imageUrl, `wedding-${selectedItem.id}.jpg`)}
                    size="sm"
                    variant="outline"
                    className="rounded-full border-amber-500/30 bg-white/5 text-amber-300 hover:bg-amber-500/20 text-xs"
                  >
                    <Download size={14} className="mr-1.5" /> Download
                  </Button>
                  <Button
                    onClick={() => handleDelete(selectedItem.id)}
                    disabled={deletingId === selectedItem.id}
                    size="sm"
                    className="rounded-full bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow-lg"
                  >
                    <Trash2 size={14} className="mr-1.5" /> Delete Photo
                  </Button>
                  <Button
                    onClick={() => setSelectedItem(null)}
                    size="sm"
                    variant="ghost"
                    className="rounded-full text-white/70 hover:text-white text-xs"
                  >
                    Close
                  </Button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
