'use client';

import { useMemo, useTransition, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors,
  DragEndEvent, DragOverlay, useDroppable,
} from '@dnd-kit/core';
import {
  SortableContext, useSortable, arrayMove, verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  ChefHat, GripVertical, Plus, X, Printer, Leaf, Wheat,
  FlameKindling, Nut, ArrowLeft,
} from 'lucide-react';
import Link from 'next/link';
import { allGuests, initialMenuItems } from '@/lib/mock-data';
import type { MenuItem, MenuCourse, DietaryFlag } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

// ── Constants ─────────────────────────────────────────────────────────────
const COURSES: { id: MenuCourse; label: string; emoji: string; accent: string }[] = [
  { id: 'canapes',  label: 'Canapés',  emoji: '🥂', accent: '#f97316' },
  { id: 'starters', label: 'Starters', emoji: '🍤', accent: '#eab308' },
  { id: 'mains',    label: 'Mains',    emoji: '🍖', accent: '#d4af37' },
  { id: 'desserts', label: 'Desserts', emoji: '🍮', accent: '#ec4899' },
];

const DIETARY_META: Record<DietaryFlag, { label: string; icon: React.ElementType; color: string }> = {
  'vegan':       { label: 'Vegan',       icon: Leaf,          color: '#22c55e' },
  'vegetarian':  { label: 'Vegetarian',  icon: Leaf,          color: '#86efac' },
  'gluten-free': { label: 'GF',          icon: Wheat,         color: '#fbbf24' },
  'halal':       { label: 'Halal',       icon: FlameKindling, color: '#10b981' },
  'nut-free':    { label: 'Nut-Free',    icon: Nut,           color: '#f97316' },
};

// ── Print-ready kitchen manifest style (injected into <head> via style tag) ─
const PRINT_STYLES = `
@media print {
  body * { visibility: hidden !important; }
  #kitchen-manifest, #kitchen-manifest * { visibility: visible !important; }
  #kitchen-manifest { position: fixed; inset: 0; background: white; color: black; padding: 40px; font-family: Georgia, serif; }
  .no-print { display: none !important; }
  h1 { font-size: 28pt; border-bottom: 2pt solid black; padding-bottom: 8pt; }
  h2 { font-size: 16pt; margin-top: 20pt; border-bottom: 1pt solid #999; }
  .dish-row { display: flex; justify-content: space-between; padding: 5pt 0; border-bottom: 0.5pt solid #eee; }
  .snapshot-row { display: flex; gap: 20pt; margin-bottom: 20pt; flex-wrap: wrap; }
  .snapshot-pill { border: 1pt solid black; padding: 4pt 10pt; border-radius: 4pt; font-size: 10pt; }
}
`;

// ── Chef's Snapshot ───────────────────────────────────────────────────────
function buildSnapshot() {
  const flags: Record<string, number> = {};
  allGuests.filter(g => g.rsvpStatus === 'Confirmed').forEach(g => {
    const d = g.dietaryRestrictions?.toLowerCase();
    if (!d || d === 'none') return;
    flags[d] = (flags[d] ?? 0) + 1;
  });
  return flags;
}

// ── Sortable dish card ────────────────────────────────────────────────────
function DishCard({ item, onRemove }: { item: MenuItem; onRemove: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: item.id });
  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: isDragging ? 0.4 : 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="group flex items-start gap-2 p-3 rounded-xl bg-white/5 border border-white/10 hover:border-white/20 transition-colors"
    >
      <button {...attributes} {...listeners} className="mt-0.5 cursor-grab touch-none text-white/20 hover:text-white/50">
        <GripVertical size={14} />
      </button>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-white/90 truncate">{item.name}</p>
        <p className="text-[11px] text-white/40 mt-0.5 leading-snug">{item.description}</p>
        {item.dietaryFlags?.length ? (
          <div className="flex gap-1 mt-1.5 flex-wrap">
            {item.dietaryFlags.map(f => {
              const meta = DIETARY_META[f];
              return (
                <span
                  key={f}
                  className="text-[9px] px-1.5 py-0.5 rounded-full uppercase tracking-wide font-bold"
                  style={{ background: `${meta.color}20`, color: meta.color, border: `1px solid ${meta.color}40` }}
                >
                  {meta.label}
                </span>
              );
            })}
          </div>
        ) : null}
      </div>
      <button
        onClick={onRemove}
        className="opacity-0 group-hover:opacity-100 p-1 rounded-full hover:bg-red-500/20 transition-all text-white/30 hover:text-red-400"
      >
        <X size={12} />
      </button>
    </motion.div>
  );
}

// ── Course column ─────────────────────────────────────────────────────────
function CourseColumn({
  course, items, onRemove, onAdd,
}: {
  course: typeof COURSES[number];
  items: MenuItem[];
  onRemove: (id: string) => void;
  onAdd: (course: MenuCourse, name: string, desc: string) => void;
}) {
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');

  const { setNodeRef, isOver } = useDroppable({ id: course.id });

  const handleAdd = () => {
    if (!newName.trim()) return;
    onAdd(course.id, newName.trim(), newDesc.trim());
    setNewName(''); setNewDesc(''); setAdding(false);
  };

  return (
    <div
      ref={setNodeRef}
      className="flex flex-col rounded-2xl overflow-hidden border transition-all duration-200"
      style={{
        background: isOver ? `${course.accent}08` : 'rgba(255,255,255,0.03)',
        borderColor: isOver ? `${course.accent}40` : 'rgba(255,255,255,0.08)',
        boxShadow: isOver ? `0 0 20px ${course.accent}20` : undefined,
      }}
    >
      {/* Column header */}
      <div
        className="px-4 py-3 flex items-center gap-2"
        style={{ borderBottom: `1px solid ${course.accent}20`, background: `${course.accent}0a` }}
      >
        <span className="text-base">{course.emoji}</span>
        <span className="font-headline italic text-sm font-semibold" style={{ color: course.accent }}>
          {course.label}
        </span>
        <span
          className="ml-auto text-[11px] font-bold rounded-full px-2 py-0.5"
          style={{ background: `${course.accent}20`, color: course.accent }}
        >
          {items.length}
        </span>
      </div>

      {/* Items */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2 min-h-[200px]">
        <SortableContext items={items.map(i => i.id)} strategy={verticalListSortingStrategy}>
          <AnimatePresence>
            {items.map(item => (
              <DishCard key={item.id} item={item} onRemove={() => onRemove(item.id)} />
            ))}
          </AnimatePresence>
        </SortableContext>
      </div>

      {/* Add item input */}
      <div className="p-3 border-t border-white/5">
        <AnimatePresence>
          {adding ? (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-2"
            >
              <Input
                value={newName}
                onChange={e => setNewName(e.target.value)}
                placeholder="Dish name"
                className="bg-white/5 border-white/10 text-white text-xs h-8"
                onKeyDown={e => e.key === 'Enter' && handleAdd()}
                autoFocus
              />
              <Input
                value={newDesc}
                onChange={e => setNewDesc(e.target.value)}
                placeholder="Short description (optional)"
                className="bg-white/5 border-white/10 text-white text-xs h-8"
                onKeyDown={e => e.key === 'Enter' && handleAdd()}
              />
              <div className="flex gap-2">
                <Button size="sm" className="flex-1 h-7 text-xs" style={{ background: course.accent }} onClick={handleAdd}>
                  Add
                </Button>
                <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => { setAdding(false); setNewName(''); setNewDesc(''); }}>
                  Cancel
                </Button>
              </div>
            </motion.div>
          ) : (
            <Button
              size="sm"
              variant="ghost"
              className="w-full h-8 text-xs text-white/30 hover:text-white/70 justify-start gap-1"
              onClick={() => setAdding(true)}
            >
              <Plus size={12} /> Add dish
            </Button>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────
export default function CulinaryPage() {
  const [items, setItems] = useState<MenuItem[]>(initialMenuItems);
  const [, startTransition] = useTransition();
  const snapshot = useMemo(buildSnapshot, []);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    startTransition(() => {
      setItems(prev => {
        const oldIdx = prev.findIndex(i => i.id === active.id);
        const newIdx = prev.findIndex(i => i.id === over.id);
        if (oldIdx === -1 || newIdx === -1) return prev;
        return arrayMove(prev, oldIdx, newIdx);
      });
    });
  };

  const removeItem = (id: string) => startTransition(() => setItems(p => p.filter(i => i.id !== id)));

  const addItem = (course: MenuCourse, name: string, desc: string) => {
    startTransition(() => {
      const newItem: MenuItem = {
        id: `m-${Date.now()}`,
        name,
        description: desc || '—',
        course,
        dietaryFlags: [],
        sortOrder: items.filter(i => i.course === course).length,
      };
      setItems(p => [...p, newItem]);
    });
  };

  const itemsByCourse = (course: MenuCourse) =>
    items.filter(i => i.course === course).sort((a, b) => a.sortOrder - b.sortOrder);

  // ── Print manifest ──────────────────────────────────────────────────────
  const handlePrint = () => window.print();

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: PRINT_STYLES }} />

      {/* Hidden print target */}
      <div id="kitchen-manifest" className="hidden print:block">
        <h1>Kitchen Manifest — Razia &amp; Abduraziq · 6 September 2026</h1>
        <p style={{ fontSize: '11pt', color: '#555' }}>Tuscany in Rylands · Confirmed guests: {allGuests.filter(g => g.rsvpStatus === 'Confirmed').length}</p>
        <div className="snapshot-row" style={{ display: 'flex', gap: 12, flexWrap: 'wrap', margin: '16pt 0' }}>
          {Object.entries(snapshot).map(([k, v]) => (
            <span key={k} className="snapshot-pill" style={{ border: '1px solid #333', padding: '3pt 10pt', borderRadius: 4, fontSize: 10 }}>
              {v} × {k}
            </span>
          ))}
        </div>
        {COURSES.map(c => (
          <div key={c.id}>
            <h2>{c.emoji} {c.label}</h2>
            {itemsByCourse(c.id).map(item => (
              <div key={item.id} className="dish-row" style={{ display: 'flex', justifyContent: 'space-between', padding: '4pt 0', borderBottom: '0.5pt solid #eee' }}>
                <div>
                  <strong>{item.name}</strong>
                  <span style={{ color: '#666', marginLeft: 8, fontSize: 10 }}>{item.description}</span>
                </div>
                <span style={{ fontSize: 10, color: '#888' }}>
                  {item.dietaryFlags?.map(f => DIETARY_META[f].label).join(' · ')}
                </span>
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* Screen UI */}
      <div className="space-y-6 no-print">
        {/* Page header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Link href="/planner" className="text-white/30 hover:text-white/60 transition-colors">
                <ArrowLeft size={16} />
              </Link>
              <h1 className="font-headline text-3xl italic tracking-tight text-white/90">Culinary Manifest</h1>
            </div>
            <p className="text-white/40 text-sm tracking-wide">Build the 4-course menu · review the Chef's Snapshot below</p>
          </div>
          <Button
            onClick={handlePrint}
            className="gap-2 bg-[#d4af37] text-black font-bold hover:bg-[#b8992d] shadow-[0_4px_20px_rgba(212,175,55,0.3)] flex-shrink-0"
          >
            <Printer size={15} />
            Download Kitchen Manifest
          </Button>
        </div>

        {/* Chef's Snapshot */}
        <motion.div
          className="rounded-2xl p-5 border"
          style={{ background: 'rgba(249,115,22,0.06)', borderColor: 'rgba(249,115,22,0.2)' }}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="flex items-center gap-2 mb-4">
            <ChefHat size={18} className="text-orange-400" />
            <h2 className="font-semibold text-white/80 text-sm tracking-wide">Chef's Snapshot</h2>
            <span className="text-white/30 text-xs">— auto-read from Guest CRM</span>
          </div>
          <div className="flex flex-wrap gap-3">
            {Object.entries(snapshot).length === 0 ? (
              <span className="text-white/30 text-sm">No dietary requirements noted</span>
            ) : Object.entries(snapshot).map(([diet, count]) => (
              <motion.div
                key={diet}
                className="flex items-center gap-2 px-3 py-2 rounded-xl"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.10)' }}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 200, damping: 15 }}
              >
                <span className="text-2xl font-bold text-orange-400">{count}</span>
                <span className="text-xs text-white/50 capitalize">{diet}</span>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Course columns with DnD */}
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            {COURSES.map(course => (
              <CourseColumn
                key={course.id}
                course={course}
                items={itemsByCourse(course.id)}
                onRemove={removeItem}
                onAdd={addItem}
              />
            ))}
          </div>
          <DragOverlay>
            {/* Drag overlay is handled by DishCard's own position */}
          </DragOverlay>
        </DndContext>
      </div>
    </>
  );
}
