'use client';

import { useState, useTransition, useEffect } from 'react';
import { motion, AnimatePresence, Reorder } from 'framer-motion';
import {
  Clock, GripVertical, Plus, Globe, Lock, ArrowLeft, Save, Eye,
  Trash2,
} from 'lucide-react';
import Link from 'next/link';
import { fetchTimelineEvents, updateTimelineEventsOrder } from '@/lib/supabase';
import type { TimelineEvent, TimelineCategory } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';

// ── Category metadata ──────────────────────────────────────────────────────
const CAT_META: Record<TimelineCategory, { label: string; color: string; bg: string }> = {
  arrival:       { label: 'Arrival',       color: '#d4af37', bg: '#d4af3720' },
  ceremony:      { label: 'Ceremony',      color: '#10b981', bg: '#10b98120' },
  reception:     { label: 'Reception',     color: '#38bdf8', bg: '#38bdf820' },
  dinner:        { label: 'Dinner',        color: '#f97316', bg: '#f9731620' },
  entertainment: { label: 'Entertainment', color: '#a855f7', bg: '#a855f720' },
  other:         { label: 'Other',         color: '#94a3b8', bg: '#94a3b820' },
};

const CATEGORIES = Object.keys(CAT_META) as TimelineCategory[];

// ── Event card ─────────────────────────────────────────────────────────────
function EventCard({
  event, onUpdate, onRemove,
}: {
  event: TimelineEvent;
  onUpdate: (updated: TimelineEvent) => void;
  onRemove: () => void;
}) {
  const meta = CAT_META[event.category];

  return (
    <Reorder.Item
      value={event}
      id={event.id}
      dragListener={false}
      as="div"
    >
      <motion.div
        layout
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 20, height: 0 }}
        className="flex items-stretch gap-0 group"
      >
        {/* Time bubble + line */}
        <div className="flex flex-col items-center w-14 flex-shrink-0">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center text-[10px] font-black z-10 flex-shrink-0"
            style={{ background: meta.bg, color: meta.color, border: `2px solid ${meta.color}40` }}
          >
            <Clock size={14} />
          </div>
          <div className="w-px flex-1 mt-1" style={{ background: `${meta.color}20` }} />
        </div>

        {/* Content card */}
        <div
          className="flex-1 mb-4 ml-2 rounded-2xl border p-4 transition-all duration-200"
          style={{
            background: 'rgba(255,255,255,0.03)',
            borderColor: 'rgba(255,255,255,0.08)',
          }}
        >
          <div className="flex items-start gap-3">
            {/* Drag handle */}
            <Reorder.Item value={event} id={event.id} as="span" className="cursor-grab touch-none text-white/20 hover:text-white/50 mt-1 flex-shrink-0">
              <GripVertical size={14} />
            </Reorder.Item>

            {/* Time + Title row */}
            <div className="flex-1 grid grid-cols-1 sm:grid-cols-[120px_1fr_auto] gap-2 items-start">
              <Input
                value={event.time}
                onChange={e => onUpdate({ ...event, time: e.target.value })}
                placeholder="14:00"
                className="bg-white/5 border-white/10 text-white text-sm h-8 font-mono w-full"
              />
              <Input
                value={event.title}
                onChange={e => onUpdate({ ...event, title: e.target.value })}
                placeholder="Event title"
                className="bg-white/5 border-white/10 text-white text-sm h-8"
              />

              {/* Category picker */}
              <select
                value={event.category}
                onChange={e => onUpdate({ ...event, category: e.target.value as TimelineCategory })}
                className="h-8 px-2 rounded-lg bg-white/5 border border-white/10 text-white text-xs cursor-pointer outline-none"
                style={{ color: meta.color }}
              >
                {CATEGORIES.map(c => (
                  <option key={c} value={c} className="bg-[#0d0d14] text-white">
                    {CAT_META[c].label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Description row */}
          <div className="mt-2 ml-5">
            <Input
              value={event.description ?? ''}
              onChange={e => onUpdate({ ...event, description: e.target.value })}
              placeholder="Optional notes for the team…"
              className="bg-white/5 border-white/8 text-white/60 text-xs h-7"
            />
          </div>

          {/* Footer row: isPublic toggle + delete */}
          <div className="flex items-center gap-3 mt-3 ml-5">
            <div className="flex items-center gap-2">
              <Switch
                checked={event.isPublic}
                onCheckedChange={v => onUpdate({ ...event, isPublic: v })}
                className="data-[state=checked]:bg-emerald-500"
              />
              <span className={cn('text-xs font-medium flex items-center gap-1', event.isPublic ? 'text-emerald-400' : 'text-white/30')}>
                {event.isPublic ? <><Globe size={11} /> Guest-visible</> : <><Lock size={11} /> Internal</>}
              </span>
            </div>

            {/* Category badge */}
            <span
              className="text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wide font-bold"
              style={{ background: meta.bg, color: meta.color }}
            >
              {meta.label}
            </span>

            <button
              onClick={onRemove}
              className="ml-auto opacity-0 group-hover:opacity-100 p-1 rounded-full hover:bg-red-500/20 text-white/20 hover:text-red-400 transition-all"
            >
              <Trash2 size={12} />
            </button>
          </div>
        </div>
      </motion.div>
    </Reorder.Item>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────
export default function RunOfShowPage() {
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);
  const [, startTransition] = useTransition();
  const { toast } = useToast();

  useEffect(() => {
    fetchTimelineEvents()
      .then(setEvents)
      .catch(err => {
        console.error('Failed to load timeline:', err);
        toast({ variant: 'destructive', title: 'Failed to load timeline' });
      })
      .finally(() => setLoading(false));
  }, [toast]);

  const addEvent = () => {
    const lastTime = events[events.length - 1]?.time ?? '18:00';
    const [h, m] = lastTime.split(':').map(Number);
    const nextHour = h + 1;
    const newTime = `${String(nextHour % 24).padStart(2, '0')}:${String(m).padStart(2, '0')}`;

    startTransition(() => {
      setEvents(prev => [
        ...prev,
        {
          id: `ev-${Date.now()}`,
          time: newTime,
          title: '',
          description: '',
          category: 'other',
          isPublic: false,
        },
      ]);
    });
  };

  const updateEvent = (id: string, updated: TimelineEvent) => {
    startTransition(() => setEvents(prev => prev.map(e => e.id === id ? updated : e)));
  };

  const removeEvent = (id: string) => {
    startTransition(() => setEvents(prev => prev.filter(e => e.id !== id)));
  };

  const saveToGuestProgram = () => {
    try {
      const publicEvents = events.filter(e => e.isPublic);
      localStorage.setItem('wedu_timeline', JSON.stringify(publicEvents));
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      // localStorage not available
    }
  };

  const publicCount = events.filter(e => e.isPublic).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link href="/planner" className="text-white/30 hover:text-white/60 transition-colors">
              <ArrowLeft size={16} />
            </Link>
            <h1 className="font-headline text-3xl italic tracking-tight text-white/90">Run of Show</h1>
          </div>
          <p className="text-white/40 text-sm tracking-wide">
            {events.length} events · {publicCount} guest-visible · Drag to reorder
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-sky-500/20 bg-sky-500/05">
            <Eye size={13} className="text-sky-400" />
            <span className="text-sky-400 text-xs font-semibold">{publicCount} public events</span>
          </div>
          <Button
            onClick={saveToGuestProgram}
            className={cn(
              'gap-2 font-bold shadow-lg transition-all',
              saved
                ? 'bg-emerald-500 text-white shadow-emerald-500/30'
                : 'bg-[#d4af37] text-black hover:bg-[#b8992d] shadow-[#d4af37]/30'
            )}
          >
            <Save size={15} />
            {saved ? 'Saved to Guest Program ✓' : 'Publish to Guest Program'}
          </Button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-2">
        {CATEGORIES.map(c => (
          <span
            key={c}
            className="text-[10px] px-2 py-1 rounded-full uppercase tracking-widest font-bold"
            style={{ background: CAT_META[c].bg, color: CAT_META[c].color }}
          >
            {CAT_META[c].label}
          </span>
        ))}
      </div>

      {loading && (
        <div className="text-center py-12 text-white/40">
          <p>Loading timeline...</p>
        </div>
      )}

      {!loading && (
        <>
          {/* Timeline */}
          <Reorder.Group
            axis="y"
            values={events}
            onReorder={v => startTransition(async () => {
              const reordered = v as TimelineEvent[];
              setEvents(reordered);
              try {
                await updateTimelineEventsOrder(reordered);
              } catch (err) {
                console.error('Failed to save order:', err);
                toast({ variant: 'destructive', title: 'Failed to save order' });
              }
            })}>
        <div className="space-y-0">
          <AnimatePresence>
            {events.map(event => (
              <EventCard
                key={event.id}
                event={event}
                onUpdate={updated => updateEvent(event.id, updated)}
                onRemove={() => removeEvent(event.id)}
              />
            ))}
          </AnimatePresence>
        </div>
      </Reorder.Group>

      {/* Add event button */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex justify-center"
      >
        <Button
          variant="outline"
          onClick={addEvent}
          disabled={loading}
          className="gap-2 border-white/10 text-white/50 hover:text-white hover:border-white/30"
        >
          <Plus size={16} />
          Add Event
        </Button>
      </motion.div>
        </>
      )}
    </div>
  );
}
