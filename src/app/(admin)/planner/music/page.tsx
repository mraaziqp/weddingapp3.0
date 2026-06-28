'use client';

import { useState, useTransition, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors,
  DragEndEvent, DragOverEvent, DragStartEvent, DragOverlay,
} from '@dnd-kit/core';
import {
  SortableContext, useSortable, arrayMove, verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  Music2, GripVertical, Plus, Check, X, ArrowLeft, Radio,
} from 'lucide-react';
import Link from 'next/link';
import { allGuests, initialTracks } from '@/lib/mock-data';
import type { TrackItem, TrackColumn } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

// ── Column metadata ────────────────────────────────────────────────────────
const COLUMNS: { id: TrackColumn; label: string; emoji: string; accent: string; bgOpacity: string }[] = [
  { id: 'must-play', label: 'Must Play',         emoji: '🎯', accent: '#d4af37', bgOpacity: '#d4af3710' },
  { id: 'if-time',   label: 'If There\'s Time',  emoji: '⏳', accent: '#38bdf8', bgOpacity: '#38bdf810' },
  { id: 'do-not-play', label: 'DO NOT PLAY',     emoji: '🚫', accent: '#f87171', bgOpacity: '#f8717110' },
];

// ── Sortable track card ────────────────────────────────────────────────────
function TrackCard({ item, accent, onRemove }: { item: TrackItem; accent: string; onRemove: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: item.id });
  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: isDragging ? 0.3 : 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="group flex items-center gap-2 px-3 py-2.5 rounded-xl bg-white/5 border border-white/8 hover:border-white/20 transition-all"
    >
      <button {...attributes} {...listeners} className="cursor-grab touch-none text-white/20 hover:text-white/50 flex-shrink-0">
        <GripVertical size={14} />
      </button>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-white/90 truncate">{item.title}</p>
        <p className="text-[11px] text-white/40 truncate">{item.artist}</p>
        {item.requestedBy && (
          <p className="text-[10px] mt-0.5" style={{ color: `${accent}aa` }}>
            via {item.requestedBy}
          </p>
        )}
      </div>
      <button
        onClick={onRemove}
        className="opacity-0 group-hover:opacity-100 p-1 rounded-full hover:bg-red-500/20 text-white/20 hover:text-red-400 transition-all flex-shrink-0"
      >
        <X size={12} />
      </button>
    </motion.div>
  );
}

// ── Add-track inline form ──────────────────────────────────────────────────
function AddTrackForm({ column, accent, onAdd }: { column: TrackColumn; accent: string; onAdd: (title: string, artist: string) => void }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [artist, setArtist] = useState('');

  const handleSubmit = () => {
    if (!title.trim()) return;
    onAdd(title.trim(), artist.trim() || 'Unknown');
    setTitle(''); setArtist(''); setOpen(false);
  };

  return (
    <div className="mt-2">
      <AnimatePresence>
        {open ? (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-2 overflow-hidden"
          >
            <Input
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Track title"
              className="bg-white/5 border-white/10 text-white text-xs h-8"
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
              autoFocus
            />
            <Input
              value={artist}
              onChange={e => setArtist(e.target.value)}
              placeholder="Artist"
              className="bg-white/5 border-white/10 text-white text-xs h-8"
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
            />
            <div className="flex gap-2">
              <Button size="sm" className="flex-1 h-7 text-xs" style={{ background: accent }} onClick={handleSubmit}>
                Add
              </Button>
              <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => { setOpen(false); setTitle(''); setArtist(''); }}>
                Cancel
              </Button>
            </div>
          </motion.div>
        ) : (
          <Button
            size="sm"
            variant="ghost"
            className="w-full h-8 text-xs text-white/30 hover:text-white/70 justify-start gap-1"
            onClick={() => setOpen(true)}
          >
            <Plus size={12} /> Add track
          </Button>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Kanban column ──────────────────────────────────────────────────────────
function KanbanColumn({
  col, items, activeId, onAdd, onRemove,
}: {
  col: typeof COLUMNS[number];
  items: TrackItem[];
  activeId: string | null;
  onAdd: (title: string, artist: string, col: TrackColumn) => void;
  onRemove: (id: string) => void;
}) {
  const { setNodeRef, isOver } = typeof useSortable === 'function' ? { setNodeRef: null, isOver: false } : { setNodeRef: null, isOver: false };

  return (
    <div
      id={`col-${col.id}`}
      className="flex flex-col rounded-2xl overflow-hidden border transition-all duration-200 min-h-[400px]"
      style={{
        background: isOver ? col.bgOpacity : 'rgba(255,255,255,0.03)',
        borderColor: `${col.accent}30`,
      }}
    >
      {/* Header */}
      <div
        className="px-4 py-3 flex items-center gap-2 border-b"
        style={{ borderColor: `${col.accent}20`, background: `${col.accent}0a` }}
      >
        <span>{col.emoji}</span>
        <span className="font-semibold text-sm" style={{ color: col.accent }}>{col.label}</span>
        <span
          className="ml-auto text-[11px] font-bold px-2 py-0.5 rounded-full"
          style={{ background: `${col.accent}20`, color: col.accent }}
        >
          {items.length}
        </span>
      </div>

      {/* Track list */}
      <div className="flex-1 p-3 space-y-2 overflow-y-auto">
        <SortableContext items={items.map(i => i.id)} strategy={verticalListSortingStrategy}>
          <AnimatePresence>
            {items.map(item => (
              <TrackCard
                key={item.id}
                item={item}
                accent={col.accent}
                onRemove={() => onRemove(item.id)}
              />
            ))}
          </AnimatePresence>
        </SortableContext>
      </div>

      {/* Add form */}
      <div className="p-3 border-t border-white/5">
        <AddTrackForm column={col.id} accent={col.accent} onAdd={(t, a) => onAdd(t, a, col.id)} />
      </div>
    </div>
  );
}

// ── Guest request sidebar card ─────────────────────────────────────────────
function GuestRequestCard({
  guest, song, onAdd, added,
}: {
  guest: string; song: string; onAdd: () => void; added: boolean;
}) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 10 }}
      animate={{ opacity: 1, x: 0 }}
      className="flex items-start gap-3 p-3 rounded-xl bg-white/4 border border-white/8 group"
    >
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-white/70 truncate">{guest}</p>
        <p className="text-[11px] text-white/40 truncate italic">"{song}"</p>
      </div>
      <button
        onClick={onAdd}
        disabled={added}
        className={cn(
          'flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center transition-all border',
          added
            ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400'
            : 'border-[#d4af37]/40 text-[#d4af37] hover:bg-[#d4af37]/10'
        )}
      >
        {added ? <Check size={12} /> : <Plus size={12} />}
      </button>
    </motion.div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────
export default function VibeControllerPage() {
  const [tracks, setTracks] = useState<TrackItem[]>(initialTracks);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [addedRequests, setAddedRequests] = useState<Set<string>>(new Set());
  const [, startTransition] = useTransition();

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  // Guest requests
  const guestRequests = allGuests
    .filter(g => g.rsvpStatus === 'Confirmed' && (g as any).songRequest)
    .map(g => ({ id: g.id, name: `${g.firstName} ${g.lastName}`, song: (g as any).songRequest as string }));

  const handleDragStart = (e: DragStartEvent) => setActiveId(e.active.id as string);

  const handleDragOver = (e: DragOverEvent) => {
    const { active, over } = e;
    if (!over) return;

    const overId = over.id as string;
    const overCol = COLUMNS.find(c => `col-${c.id}` === overId);

    if (overCol) {
      // Dragging over a column header → move to that column
      startTransition(() => {
        setTracks(prev =>
          prev.map(t => t.id === active.id ? { ...t, column: overCol.id } : t)
        );
      });
    } else {
      // Dragging over another track → might be different column
      const overTrack = tracks.find(t => t.id === overId);
      const activeTrack = tracks.find(t => t.id === active.id);
      if (overTrack && activeTrack && overTrack.column !== activeTrack.column) {
        startTransition(() => {
          setTracks(prev =>
            prev.map(t => t.id === active.id ? { ...t, column: overTrack.column } : t)
          );
        });
      }
    }
  };

  const handleDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    setActiveId(null);
    if (!over) return;

    const overId = over.id as string;
    const overTrack = tracks.find(t => t.id === overId);
    const activeTrack = tracks.find(t => t.id === active.id);

    if (overTrack && activeTrack && overTrack.column === activeTrack.column && active.id !== over.id) {
      startTransition(() => {
        setTracks(prev => {
          const colItems = prev.filter(t => t.column === activeTrack.column).map(t => t.id);
          const oldIdx = colItems.indexOf(active.id as string);
          const newIdx = colItems.indexOf(overId);
          const reordered = arrayMove(colItems, oldIdx, newIdx);
          const rest = prev.filter(t => t.column !== activeTrack.column);
          return [...rest, ...reordered.map(id => prev.find(t => t.id === id)!)];
        });
      });
    }
  };

  const addTrack = (title: string, artist: string, col: TrackColumn) => {
    startTransition(() => {
      setTracks(prev => [...prev, { id: `t-${Date.now()}`, title, artist, column: col, sortOrder: prev.length } as TrackItem]);
    });
  };

  const removeTrack = (id: string) =>
    startTransition(() => setTracks(prev => prev.filter(t => t.id !== id)));

  const addGuestRequest = (guestId: string, name: string, song: string) => {
    if (addedRequests.has(guestId)) return;
    const [title, ...rest] = song.split(' – ');
    addTrack(title, rest.join(' – ') || name, 'must-play');
    setAddedRequests(prev => new Set([...prev, guestId]));
  };

  const activeTrack = activeId ? tracks.find(t => t.id === activeId) : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link href="/planner" className="text-white/30 hover:text-white/60 transition-colors">
              <ArrowLeft size={16} />
            </Link>
            <h1 className="font-headline text-3xl italic tracking-tight text-white/90">Vibe Controller</h1>
          </div>
          <p className="text-white/40 text-sm tracking-wide">
            {tracks.filter(t => t.column === 'must-play').length} must-plays ·{' '}
            {tracks.filter(t => t.column === 'if-time').length} if time ·{' '}
            {tracks.filter(t => t.column === 'do-not-play').length} banned
          </p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 rounded-xl border border-[#d4af37]/20 bg-[#d4af37]/05">
          <Radio size={14} className="text-[#d4af37]" />
          <span className="text-[#d4af37] text-xs font-semibold">DJ Master Sheet</span>
        </div>
      </div>

      {/* Main layout */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          {/* Kanban columns */}
          <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-4">
            {COLUMNS.map(col => (
              <KanbanColumn
                key={col.id}
                col={col}
                items={tracks.filter(t => t.column === col.id)}
                activeId={activeId}
                onAdd={addTrack}
                onRemove={removeTrack}
              />
            ))}
          </div>

          {/* Guest requests sidebar */}
          <div className="rounded-2xl border border-white/8 bg-white/03 flex flex-col overflow-hidden">
            <div
              className="px-4 py-3 flex items-center gap-2 border-b border-white/8"
              style={{ background: 'rgba(212,175,55,0.06)' }}
            >
              <Music2 size={15} className="text-[#d4af37]" />
              <span className="text-sm font-semibold text-[#d4af37]">Guest Requests</span>
              <span className="ml-auto text-[11px] bg-[#d4af37]/20 text-[#d4af37] font-bold px-2 py-0.5 rounded-full">
                {guestRequests.length}
              </span>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {guestRequests.length === 0 ? (
                <p className="text-white/30 text-xs text-center py-8">No song requests yet</p>
              ) : (
                guestRequests.map(gr => (
                  <GuestRequestCard
                    key={gr.id}
                    guest={gr.name}
                    song={gr.song}
                    added={addedRequests.has(gr.id)}
                    onAdd={() => addGuestRequest(gr.id, gr.name, gr.song)}
                  />
                ))
              )}
            </div>
          </div>
        </div>

        <DragOverlay>
          {activeTrack && (
            <div className="px-3 py-2.5 rounded-xl bg-[#1a1a2e] border border-[#d4af37]/30 shadow-2xl opacity-95 w-56">
              <p className="text-sm font-semibold text-white/90 truncate">{activeTrack.title}</p>
              <p className="text-[11px] text-white/40">{activeTrack.artist}</p>
            </div>
          )}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
