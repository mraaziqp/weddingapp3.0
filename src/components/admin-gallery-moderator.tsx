'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Trash2, Download, RefreshCw, Image as ImageIcon, Video, ShieldAlert, Search,
  CheckSquare, Square, Pencil, Eye, EyeOff, Loader2, X, Save, FolderPlus,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { OverlayPortal } from '@/components/overlay-portal';
import { useToast } from '@/hooks/use-toast';
import {
  deleteMediaItem, updateMediaItem, toWallItem, isVideoItem,
  type WallItem, type MediaEdit,
} from '@/lib/media';

const filterTabs = ['All', '📸 Photos', '🎥 Videos', '🎯 Quests', '🙈 Hidden'] as const;

/** The fields the couple can change on one item. */
type EditDraft = {
  caption: string;
  guestName: string;
  questTag: string;
  album: string;
  visibility: 'public' | 'private';
};

function draftFrom(item: WallItem): EditDraft {
  return {
    caption: item.caption ?? '',
    guestName: item.guestName === 'A Guest' ? '' : item.guestName ?? '',
    questTag: item.questTag ?? '',
    album: item.album ?? '',
    visibility: item.visibility === 'private' ? 'private' : 'public',
  };
}

export function AdminGalleryModerator() {
  const [items, setItems] = useState<WallItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<WallItem | null>(null);
  const [activeFilter, setActiveFilter] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBatchDeleting, setIsBatchDeleting] = useState(false);
  const [draft, setDraft] = useState<EditDraft | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [isFiling, setIsFiling] = useState(false);
  const { toast } = useToast();

  const loadMedia = useCallback(async () => {
    try {
      setLoading(true);
      // `visibility=all` spans the Live Wall and the private Vault, which is
      // what the couple moderates. The route checks the admin cookie for it,
      // and includes already-hidden items so they can be brought back.
      const res = await fetch('/api/media?visibility=all&limit=250', { cache: 'no-store' });
      if (!res.ok) throw new Error(`Gallery load failed (${res.status})`);
      const data = await res.json();
      setItems((data.items ?? []).map(toWallItem));
    } catch {
      toast({ variant: 'destructive', title: 'Could not load gallery items' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { loadMedia(); }, [loadMedia]);

  // Close the lightbox on Escape — on a laptop at the reception desk that is
  // the reflex, and trapping the couple in a modal mid-party is unforgivable.
  useEffect(() => {
    if (!selectedItem) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') closeLightbox(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedItem]);

  const openLightbox = (item: WallItem) => {
    setSelectedItem(item);
    setDraft(null);
  };

  const closeLightbox = () => {
    setSelectedItem(null);
    setDraft(null);
  };

  /** Writes one change through to Drive and mirrors it into local state. */
  const applyEdit = async (id: string, edit: MediaEdit, successTitle: string) => {
    setBusyId(id);
    const error = await updateMediaItem(id, edit);
    setBusyId(null);

    if (error) {
      toast({ variant: 'destructive', title: 'Could not save', description: error });
      return false;
    }

    const patch: Partial<WallItem> = {};
    if (edit.caption !== undefined) patch.caption = edit.caption?.trim() || undefined;
    if (edit.guestName !== undefined) patch.guestName = edit.guestName?.trim() || 'A Guest';
    if (edit.questTag !== undefined) patch.questTag = edit.questTag?.trim() || undefined;
    if (edit.album !== undefined) patch.album = edit.album?.trim() || undefined;
    if (edit.visibility !== undefined) patch.visibility = edit.visibility;
    if (edit.hidden !== undefined) patch.hidden = edit.hidden;
    // Keep the caption line in step with the wall's own precedence rule.
    if (edit.caption !== undefined || edit.questTag !== undefined) {
      const caption = patch.caption ?? undefined;
      const tag = edit.questTag !== undefined ? patch.questTag : undefined;
      patch.description = caption || (tag ? `${tag} — a cherished memory` : 'A cherished memory');
    }

    setItems(prev => prev.map(i => (i.id === id ? { ...i, ...patch } : i)));
    setSelectedItem(prev => (prev && prev.id === id ? { ...prev, ...patch } : prev));
    toast({ title: successTitle });
    return true;
  };

  const saveDraft = async () => {
    if (!selectedItem || !draft) return;
    setIsSaving(true);
    const ok = await applyEdit(
      selectedItem.id,
      {
        caption: draft.caption,
        guestName: draft.guestName,
        questTag: draft.questTag,
        album: draft.album,
        visibility: draft.visibility,
      },
      '✏️ Changes saved'
    );
    setIsSaving(false);
    if (ok) setDraft(null);
  };

  const toggleHidden = (item: WallItem, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const next = !item.hidden;
    applyEdit(
      item.id,
      { hidden: next },
      next ? '🙈 Hidden from the wall' : '👁️ Back on the wall'
    );
  };

  const toggleSelect = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleBatchDelete = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`Move ${selectedIds.size} selected items to the trash? They stay recoverable in Google Drive for 30 days.`)) return;

    setIsBatchDeleting(true);
    try {
      const ids = Array.from(selectedIds);
      const results = await Promise.all(ids.map(id => deleteMediaItem(id)));
      const removed = new Set(ids.filter((_, i) => results[i]));
      const failed = ids.length - removed.size;

      setItems(prev => prev.filter(i => !removed.has(i.id)));
      setSelectedIds(new Set());
      toast({
        title: `🗑️ ${removed.size} item${removed.size === 1 ? '' : 's'} moved to trash`,
        description: failed
          ? `${failed} could not be removed — try again.`
          : 'Recoverable from Google Drive for 30 days.',
        variant: failed ? 'destructive' : undefined,
      });
    } catch {
      toast({ variant: 'destructive', title: 'Error during batch delete' });
    } finally {
      setIsBatchDeleting(false);
    }
  };

  const handleDelete = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!confirm('Move this to the trash? It stays recoverable in Google Drive for 30 days.')) return;

    setDeletingId(id);
    try {
      if (!(await deleteMediaItem(id))) throw new Error('Deletion failed');
      setItems(prev => prev.filter(item => item.id !== id));
      if (selectedItem?.id === id) closeLightbox();
      setSelectedIds(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      toast({
        title: '🗑️ Moved to trash',
        description: 'Off the live wall, and recoverable from Google Drive for 30 days.',
      });
    } catch {
      toast({ variant: 'destructive', title: 'Failed to delete' });
    } finally {
      setDeletingId(null);
    }
  };

  const handleDownload = async (item: WallItem, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      const res = await fetch(item.imageUrl);
      const blob = await res.blob();
      // Drive serves these without a file extension, so the type from the
      // blob is the only thing that names the download correctly.
      const ext = (blob.type.split('/')[1] || 'jpg').replace('quicktime', 'mov');
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = objectUrl;
      a.download = `wedding-${item.id}.${ext}`;
      a.click();
      URL.revokeObjectURL(objectUrl);
      toast({ title: 'Download started' });
    } catch {
      toast({ variant: 'destructive', title: 'Download failed' });
    }
  };

  const filteredItems = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return items.filter(item => {
      const isVid = isVideoItem(item);
      if (activeFilter === '📸 Photos' && isVid) return false;
      if (activeFilter === '🎥 Videos' && !isVid) return false;
      if (activeFilter === '🎯 Quests' && !item.questTag) return false;
      if (activeFilter === '🙈 Hidden' && !item.hidden) return false;
      if (activeFilter === '📁 Unfiled' && item.album) return false;
      if (activeFilter.startsWith('📁 ') && activeFilter !== '📁 Unfiled'
          && item.album !== activeFilter.slice(3)) return false;

      if (query) {
        return Boolean(
          item.guestName?.toLowerCase().includes(query) ||
          item.caption?.toLowerCase().includes(query) ||
          item.description?.toLowerCase().includes(query) ||
          item.questTag?.toLowerCase().includes(query)
        );
      }
      return true;
    });
  }, [items, activeFilter, searchQuery]);

  const selectAll = () => {
    setSelectedIds(prev =>
      prev.size === filteredItems.length ? new Set() : new Set(filteredItems.map(i => i.id))
    );
  };

  const albums = useMemo(() => {
    const counts = new Map<string, number>();
    for (const i of items) if (i.album) counts.set(i.album, (counts.get(i.album) ?? 0) + 1);
    return [...counts.entries()].map(([name, count]) => ({ name, count }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [items]);

  /** Files every selected item under one album — the bulk-tidy action. */
  const fileSelectedInto = async (album: string | null) => {
    if (selectedIds.size === 0) return;
    setIsFiling(true);
    const ids = [...selectedIds];
    const errors = await Promise.all(ids.map(id => updateMediaItem(id, { album })));
    const failed = errors.filter(Boolean).length;

    setItems(prev => prev.map(i =>
      selectedIds.has(i.id) ? { ...i, album: album?.trim() || undefined } : i));
    setSelectedIds(new Set());
    setIsFiling(false);
    toast({
      title: album ? `📁 Moved to ${album}` : '📤 Removed from album',
      description: failed ? `${failed} could not be moved.` : `${ids.length - failed} items updated.`,
      variant: failed ? 'destructive' : undefined,
    });
  };

  const promptNewAlbum = () => {
    const name = window.prompt('Name this album (e.g. Watna & Mendhi, Engagement)')?.trim();
    if (name) fileSelectedInto(name.slice(0, 60));
  };

  const { photoCount, videoCount, hiddenCount } = useMemo(() => {
    let photos = 0, videos = 0, hidden = 0;
    for (const i of items) {
      if (isVideoItem(i)) videos++; else photos++;
      if (i.hidden) hidden++;
    }
    return { photoCount: photos, videoCount: videos, hiddenCount: hidden };
  }, [items]);

  const allSelected = filteredItems.length > 0 && selectedIds.size === filteredItems.length;

  return (
    <div className="rounded-3xl bg-black/40 border border-amber-500/25 p-4 sm:p-6 backdrop-blur-2xl shadow-2xl space-y-5 text-white">
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
            Tap any item to edit its caption and credit, hide it from the wall, or remove it.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs font-mono text-amber-300">
            {items.length} total ({photoCount} 📸 • {videoCount} 🎥{hiddenCount ? ` • ${hiddenCount} 🙈` : ''})
          </div>
          <Button
            onClick={loadMedia}
            disabled={loading}
            size="sm"
            variant="outline"
            className="min-h-[44px] rounded-full border-amber-500/30 bg-white/5 hover:bg-amber-500/20 text-amber-300 text-xs font-bold"
          >
            <RefreshCw size={14} className={`mr-1.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </Button>
        </div>
      </div>

      {/* Filters and batch tools */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* -mx-1/px-1 keeps the focus ring of the first chip from being clipped
            by the scroll container on narrow phones. */}
        <div className="-mx-1 flex items-center gap-1.5 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {[...filterTabs, ...(albums.length || items.some(i => !i.album) ? ['📁 Unfiled'] : []),
            ...albums.map(a => `📁 ${a.name}`)].map(tab => (
            <Button
              key={tab}
              size="sm"
              variant={activeFilter === tab ? 'default' : 'outline'}
              onClick={() => setActiveFilter(tab)}
              className={`min-h-[40px] shrink-0 rounded-full text-xs font-bold transition-all ${
                activeFilter === tab
                  ? 'bg-amber-400 text-black border-amber-400 font-extrabold shadow-md'
                  : 'border-white/15 text-white/70 bg-white/5 hover:bg-white/10'
              }`}
            >
              {tab}
            </Button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2.5 md:justify-end">
          {filteredItems.length > 0 && (
            <>
              <Button
                onClick={selectAll}
                size="sm"
                variant="outline"
                className="min-h-[44px] rounded-full border-white/15 bg-white/5 text-xs text-white/80"
              >
                {allSelected
                  ? <CheckSquare size={13} className="mr-1 text-amber-400" />
                  : <Square size={13} className="mr-1" />}
                {allSelected ? 'Deselect All' : 'Select All'}
              </Button>

              {selectedIds.size > 0 && (
                <>
                  <select
                    aria-label="File selected items into an album"
                    disabled={isFiling}
                    value=""
                    onChange={e => {
                      const v = e.target.value;
                      if (v === '__new__') promptNewAlbum();
                      else if (v === '__clear__') fileSelectedInto(null);
                      else if (v) fileSelectedInto(v);
                      e.target.value = '';
                    }}
                    className="min-h-[44px] rounded-full border border-white/15 bg-white/10 px-3 text-base text-white sm:text-xs"
                  >
                    <option value="">Move {selectedIds.size} to…</option>
                    {albums.map(a => (
                      <option key={a.name} value={a.name}>{a.name}</option>
                    ))}
                    <option value="__new__">+ New album…</option>
                    <option value="__clear__">Remove from album</option>
                  </select>
                  <Button
                    onClick={promptNewAlbum}
                    disabled={isFiling}
                    size="sm"
                    variant="outline"
                    className="min-h-[44px] rounded-full border-amber-500/30 bg-white/5 text-xs text-amber-300"
                  >
                    {isFiling
                      ? <Loader2 size={13} className="mr-1 animate-spin" />
                      : <FolderPlus size={13} className="mr-1" />}
                    New album
                  </Button>
                </>
              )}

              {selectedIds.size > 0 && (
                <Button
                  onClick={handleBatchDelete}
                  disabled={isBatchDeleting}
                  size="sm"
                  className="min-h-[44px] rounded-full bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-md"
                >
                  {isBatchDeleting
                    ? <Loader2 size={13} className="mr-1 animate-spin" />
                    : <Trash2 size={13} className="mr-1" />}
                  {isBatchDeleting ? 'Deleting…' : `Delete Selected (${selectedIds.size})`}
                </Button>
              )}
            </>
          )}

          <div className="relative w-full sm:w-52">
            <Search size={13} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
            {/* text-base: iOS Safari zooms the whole page when a focused input
                is under 16px, which throws the dashboard layout sideways. */}
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search name, caption or tag…"
              className="w-full min-h-[44px] rounded-full bg-white/10 border border-white/15 pl-8 pr-3 py-1.5 text-base sm:text-xs text-white placeholder:text-white/40 focus:outline-none focus:border-amber-400"
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
            {searchQuery || activeFilter !== 'All' ? 'Nothing matches that filter' : 'No photos or videos uploaded yet'}
          </p>
          <p className="text-xs text-white/50">Guest uploads from the camera or live wall will appear here.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-3.5">
          {filteredItems.map(item => {
            const isVideo = isVideoItem(item);
            const isSelected = selectedIds.has(item.id);

            return (
              <div
                key={item.id}
                onClick={() => openLightbox(item)}
                className={`group relative rounded-2xl overflow-hidden bg-white/5 border transition-all cursor-pointer shadow-md aspect-square ${
                  isSelected ? 'border-amber-400 ring-2 ring-amber-400/50' : 'border-white/10 hover:border-amber-400/60'
                } ${item.hidden ? 'opacity-55' : ''}`}
              >
                {isVideo ? (
                  <video
                    src={item.imageUrl}
                    className="w-full h-full object-cover"
                    muted
                    playsInline
                    preload="metadata"
                  />
                ) : (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={item.imageUrl}
                    alt={item.caption || `Upload from ${item.guestName}`}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    loading="lazy"
                    decoding="async"
                  />
                )}

                <button
                  type="button"
                  onClick={e => toggleSelect(item.id, e)}
                  className={`absolute top-1.5 left-1.5 grid h-9 w-9 place-items-center rounded-lg backdrop-blur-md transition-all z-20 ${
                    isSelected ? 'bg-amber-400 text-black shadow-lg' : 'bg-black/60 text-white/80 hover:text-white'
                  }`}
                  aria-label={isSelected ? 'Deselect' : 'Select for batch action'}
                >
                  {isSelected ? <CheckSquare size={15} /> : <Square size={15} />}
                </button>

                <button
                  type="button"
                  onClick={e => toggleHidden(item, e)}
                  disabled={busyId === item.id}
                  className="absolute top-1.5 right-1.5 grid h-9 w-9 place-items-center rounded-lg bg-black/60 text-white/80 backdrop-blur-md hover:text-white transition-all z-20 disabled:opacity-50"
                  aria-label={item.hidden ? 'Show on the wall' : 'Hide from the wall'}
                >
                  {busyId === item.id
                    ? <Loader2 size={15} className="animate-spin" />
                    : item.hidden ? <EyeOff size={15} className="text-red-300" /> : <Eye size={15} />}
                </button>

                {isVideo && (
                  <div className="absolute bottom-11 right-1.5 rounded-full bg-black/70 p-1 text-amber-300 z-10">
                    <Video size={12} />
                  </div>
                )}

                <div className="absolute inset-x-0 bottom-0 p-2 bg-gradient-to-t from-black/90 via-black/50 to-transparent z-10">
                  <p className="text-[10px] font-bold text-white truncate">{item.guestName}</p>
                  <p className="text-[9px] text-amber-300/80 truncate">
                    {item.hidden ? 'Hidden from wall' : item.album || item.caption || item.questTag || 'Live capture'}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Lightbox and editor */}
      <OverlayPortal>
      <AnimatePresence>
        {selectedItem && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeLightbox}
            className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-start sm:items-center justify-center overflow-y-auto overscroll-contain p-3 sm:p-4"
          >
            <motion.div
              initial={{ scale: 0.94, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.94, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              className="relative my-auto w-full max-w-2xl rounded-3xl border border-amber-500/30 bg-[#111] p-4 sm:p-5 shadow-2xl space-y-4"
              style={{ marginBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
            >
              <button
                type="button"
                onClick={closeLightbox}
                className="absolute right-3 top-3 z-10 grid h-10 w-10 place-items-center rounded-full bg-black/70 text-white/70 hover:text-white"
                aria-label="Close"
              >
                <X size={18} />
              </button>

              <div className="flex max-h-[45vh] items-center justify-center overflow-hidden rounded-2xl bg-black">
                {isVideoItem(selectedItem) ? (
                  <video
                    src={selectedItem.imageUrl}
                    controls
                    playsInline
                    preload="metadata"
                    className="max-h-[45vh] w-auto mx-auto object-contain"
                  />
                ) : (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={selectedItem.imageUrl}
                    alt={selectedItem.caption || 'Full preview'}
                    className="max-h-[45vh] w-auto mx-auto object-contain rounded-xl"
                  />
                )}
              </div>

              {draft ? (
                <div className="space-y-3">
                  <FieldLabel>Credited to</FieldLabel>
                  <input
                    value={draft.guestName}
                    onChange={e => setDraft({ ...draft, guestName: e.target.value })}
                    maxLength={80}
                    placeholder="A Guest"
                    className="w-full min-h-[44px] rounded-xl border border-white/15 bg-white/10 px-3 text-base text-white placeholder:text-white/35 focus:border-amber-400 focus:outline-none"
                  />

                  <FieldLabel>Caption</FieldLabel>
                  <textarea
                    value={draft.caption}
                    onChange={e => setDraft({ ...draft, caption: e.target.value })}
                    maxLength={280}
                    rows={2}
                    placeholder="Say something about this moment…"
                    className="w-full resize-y rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-base text-white placeholder:text-white/35 focus:border-amber-400 focus:outline-none"
                  />
                  <p className="text-right text-[10px] text-white/40">{draft.caption.length}/280</p>

                  <FieldLabel>Tag</FieldLabel>
                  <input
                    value={draft.questTag}
                    onChange={e => setDraft({ ...draft, questTag: e.target.value })}
                    maxLength={60}
                    placeholder="e.g. First Dance"
                    className="w-full min-h-[44px] rounded-xl border border-white/15 bg-white/10 px-3 text-base text-white placeholder:text-white/35 focus:border-amber-400 focus:outline-none"
                  />

                  <FieldLabel>Album</FieldLabel>
                  <input
                    value={draft.album}
                    onChange={e => setDraft({ ...draft, album: e.target.value })}
                    maxLength={60}
                    list="album-names"
                    placeholder="Watna & Mendhi, Engagement, …"
                    className="w-full min-h-[44px] rounded-xl border border-white/15 bg-white/10 px-3 text-base text-white placeholder:text-white/35 focus:border-amber-400 focus:outline-none"
                  />
                  <datalist id="album-names">
                    {albums.map(a => <option key={a.name} value={a.name} />)}
                  </datalist>

                  <FieldLabel>Where it shows</FieldLabel>
                  <div className="grid grid-cols-2 gap-2">
                    {(['public', 'private'] as const).map(value => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setDraft({ ...draft, visibility: value })}
                        className={`min-h-[44px] rounded-xl border px-3 text-xs font-bold transition-all ${
                          draft.visibility === value
                            ? 'border-amber-400 bg-amber-400 text-black'
                            : 'border-white/15 bg-white/5 text-white/70 hover:bg-white/10'
                        }`}
                      >
                        {value === 'public' ? 'Live Wall' : 'Private Vault'}
                      </button>
                    ))}
                  </div>

                  <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
                    <Button
                      onClick={() => setDraft(null)}
                      variant="ghost"
                      className="min-h-[44px] rounded-full text-white/70 hover:text-white"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={saveDraft}
                      disabled={isSaving}
                      className="min-h-[44px] rounded-full bg-[#d4af37] font-bold text-black hover:bg-[#c49f2f]"
                    >
                      {isSaving
                        ? <Loader2 size={15} className="mr-1.5 animate-spin" />
                        : <Save size={15} className="mr-1.5" />}
                      {isSaving ? 'Saving…' : 'Save changes'}
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="pr-10 text-center sm:text-left">
                    <p className="font-headline text-lg font-bold italic text-[#f6e7b7]">
                      {selectedItem.guestName}
                    </p>
                    <p className="text-xs text-white/55">{selectedItem.description}</p>
                    <div className="mt-2 flex flex-wrap justify-center gap-1.5 sm:justify-start">
                      <Chip>{selectedItem.visibility === 'private' ? 'Private Vault' : 'Live Wall'}</Chip>
                      {selectedItem.album && <Chip>📁 {selectedItem.album}</Chip>}
                      {selectedItem.questTag && <Chip>{selectedItem.questTag}</Chip>}
                      {selectedItem.hidden && <Chip tone="danger">Hidden</Chip>}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    <Button
                      onClick={() => setDraft(draftFrom(selectedItem))}
                      className="min-h-[44px] rounded-full bg-[#d4af37] text-xs font-bold text-black hover:bg-[#c49f2f]"
                    >
                      <Pencil size={14} className="mr-1.5" /> Edit
                    </Button>
                    <Button
                      onClick={() => toggleHidden(selectedItem)}
                      disabled={busyId === selectedItem.id}
                      variant="outline"
                      className="min-h-[44px] rounded-full border-white/15 bg-white/5 text-xs text-white/80"
                    >
                      {selectedItem.hidden
                        ? <><Eye size={14} className="mr-1.5" /> Show</>
                        : <><EyeOff size={14} className="mr-1.5" /> Hide</>}
                    </Button>
                    <Button
                      onClick={() => handleDownload(selectedItem)}
                      variant="outline"
                      className="min-h-[44px] rounded-full border-amber-500/30 bg-white/5 text-xs text-amber-300 hover:bg-amber-500/20"
                    >
                      <Download size={14} className="mr-1.5" /> Save
                    </Button>
                    <Button
                      onClick={() => handleDelete(selectedItem.id)}
                      disabled={deletingId === selectedItem.id}
                      className="min-h-[44px] rounded-full bg-red-600 text-xs font-bold text-white shadow-lg hover:bg-red-700"
                    >
                      {deletingId === selectedItem.id
                        ? <Loader2 size={14} className="mr-1.5 animate-spin" />
                        : <Trash2 size={14} className="mr-1.5" />}
                      Delete
                    </Button>
                  </div>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      </OverlayPortal>
    </div>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-bold uppercase tracking-widest text-white/45">{children}</p>
  );
}

function Chip({ children, tone }: { children: React.ReactNode; tone?: 'danger' }) {
  return (
    <span
      className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${
        tone === 'danger'
          ? 'border-red-500/30 bg-red-500/20 text-red-300'
          : 'border-white/15 bg-white/5 text-white/60'
      }`}
    >
      {children}
    </span>
  );
}
