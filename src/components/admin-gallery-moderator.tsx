'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trash2, Download, RefreshCw, Image as ImageIcon, Video, ShieldAlert, Search, CheckSquare, Square } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { deleteMediaItem, toWallItem, isVideoItem, type WallItem } from '@/lib/media';

const filterTabs = ['All', '📸 Photos', '🎥 Videos', '🎯 Quests'];

export function AdminGalleryModerator() {
  const [items, setItems] = useState<WallItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<WallItem | null>(null);
  const [activeFilter, setActiveFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBatchDeleting, setIsBatchDeleting] = useState(false);
  const { toast } = useToast();

  const loadMedia = async () => {
    try {
      setLoading(true);
      // `visibility=all` spans the Live Wall and the private Vault, which is
      // what the couple moderates. The route checks the admin cookie for it.
      const res = await fetch('/api/media?visibility=all&limit=250', { cache: 'no-store' });
      if (!res.ok) throw new Error(`Gallery load failed (${res.status})`);
      const data = await res.json();
      setItems((data.items ?? []).map(toWallItem));
    } catch {
      toast({ variant: 'destructive', title: 'Could not load gallery items' });
    } finally {
      setLoading(false);
    }
  };

  // Mount-only: the gallery loads once and refreshes via the Refresh button.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { loadMedia(); }, []);

  const toggleSelect = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    if (selectedIds.size === filteredItems.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredItems.map(i => i.id)));
    }
  };

  const handleBatchDelete = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`Delete ${selectedIds.size} selected photos/videos from database and gallery?`)) return;

    setIsBatchDeleting(true);
    try {
      const idsToDelete = Array.from(selectedIds);
      let successCount = 0;
      for (const id of idsToDelete) {
        const ok = await deleteMediaItem(id);
        if (ok) successCount++;
      }

      setItems(prev => prev.filter(i => !selectedIds.has(i.id)));
      setSelectedIds(new Set());
      toast({
        title: `🗑️ ${successCount} items deleted`,
        description: 'Selected photos/videos removed permanently.',
      });
    } catch {
      toast({ variant: 'destructive', title: 'Error during batch delete' });
    } finally {
      setIsBatchDeleting(false);
    }
  };

  const handleDelete = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!confirm('Are you sure you want to delete this image/video from the gallery & database?')) return;

    setDeletingId(id);
    try {
      const ok = await deleteMediaItem(id);
      if (ok) {
        setItems(prev => prev.filter(item => item.id !== id));
        if (selectedItem?.id === id) setSelectedItem(null);
        setSelectedIds(prev => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
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

  const filteredItems = useMemo(() => {
    return items.filter(item => {
      // Drive serves every file from /api/media/<id>/raw with no extension,
      // so sniffing the URL never matches — mediaType is what tells them apart.
      const isVid = isVideoItem(item);
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
  }, [items, activeFilter, searchQuery]);

  const photoCount = items.filter(i => !isVideoItem(i)).length;
  const videoCount = items.length - photoCount;

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

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs font-mono text-amber-300">
            {items.length} total ({photoCount} 📸 • {videoCount} 🎥)
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

      {/* Filter and Batch Tools */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-3 pt-1">
        {/* Category tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1">
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

        {/* Search & Batch delete buttons */}
        <div className="flex items-center gap-2.5 w-full md:w-auto justify-end">
          {filteredItems.length > 0 && (
            <>
              <Button
                onClick={selectAll}
                size="sm"
                variant="outline"
                className="rounded-full border-white/15 bg-white/5 text-xs text-white/80"
              >
                {selectedIds.size === filteredItems.length ? <CheckSquare size={13} className="mr-1 text-amber-400" /> : <Square size={13} className="mr-1" />}
                {selectedIds.size === filteredItems.length ? 'Deselect All' : 'Select All'}
              </Button>

              {selectedIds.size > 0 && (
                <Button
                  onClick={handleBatchDelete}
                  disabled={isBatchDeleting}
                  size="sm"
                  className="rounded-full bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-md"
                >
                  <Trash2 size={13} className="mr-1" />
                  {isBatchDeleting ? 'Deleting...' : `Delete Selected (${selectedIds.size})`}
                </Button>
              )}
            </>
          )}

          <div className="relative w-full sm:w-52">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search guest name..."
              className="w-full rounded-full bg-white/10 border border-white/15 pl-8 pr-3 py-1.5 text-xs text-white placeholder:text-white/40 focus:outline-none focus:border-amber-400"
            />
          </div>
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="text-center py-16 text-white/50">
          <div className="w-10 h-10 rounded-full border-2 border-amber-400 border-t-transparent animate-spin mx-auto mb-3" />
          <p className="font-headline italic text-amber-200">Loading live uploads…</p>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="text-center py-14 bg-white/5 rounded-2xl border border-white/10 p-6 space-y-2">
          <ImageIcon className="mx-auto text-amber-400/40" size={36} />
          <p className="font-headline italic text-lg text-white">
            {searchQuery ? 'No matching media found' : 'No photos or videos uploaded yet'}
          </p>
          <p className="text-xs text-white/50">Guest uploads from the camera or live wall will appear here.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3.5">
          {filteredItems.map((item) => {
            const isVideo =
              item.imageUrl?.startsWith('data:video') ||
              /\.(mp4|webm|mov)$/i.test(item.imageUrl || '') ||
              item.mediaType === 'video';
            const isSelected = selectedIds.has(item.id);

            return (
              <div
                key={item.id}
                onClick={() => setSelectedItem(item)}
                className={`group relative rounded-2xl overflow-hidden bg-white/5 border transition-all cursor-pointer shadow-md aspect-square flex items-center justify-center ${
                  isSelected ? 'border-amber-400 ring-2 ring-amber-400/50' : 'border-white/10 hover:border-amber-400/60'
                }`}
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

                {/* Checkbox toggle on top left */}
                <button
                  type="button"
                  onClick={(e) => toggleSelect(item.id, e)}
                  className={`absolute top-2 left-2 p-1.5 rounded-lg backdrop-blur-md transition-all z-20 ${
                    isSelected ? 'bg-amber-400 text-black shadow-lg' : 'bg-black/60 text-white/70 hover:text-white'
                  }`}
                  title="Select for batch action"
                >
                  {isSelected ? <CheckSquare size={14} /> : <Square size={14} />}
                </button>

                {/* Video icon badge */}
                {isVideo && (
                  <div className="absolute top-2 left-10 bg-black/70 rounded-full p-1 text-amber-300 z-10">
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
