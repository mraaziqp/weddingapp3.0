'use client';

import React, { useEffect, useState, useMemo, useRef, useTransition } from 'react';
import { DndContext, closestCenter, MouseSensor, TouchSensor, useSensor, useSensors, DragEndEvent, DragStartEvent, DragOverEvent, DragOverlay, Active } from '@dnd-kit/core';
import { SortableContext, useSortable, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { GripVertical, X, Crown, Plus, Printer, Wand2, AlertTriangle, Users, RotateCcw, Trash2, Settings2, Copy, Eraser, Rows3, ArrowRightLeft, Search } from 'lucide-react';
import { motion, useMotionValue } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import { fetchHouseholds } from '@/lib/supabase';
import type { Guest, Table, GuestTag } from '@/lib/types';
import { Button } from './ui/button';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger } from './ui/select';
import { Input } from './ui/input';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';

const SEATING_LAYOUT_STORAGE_KEY = 'wedu-seating-layout-v1';

const VENUE_SAMPLE_NAMES = [
  'Test Guest 1',
  'Test Guest 2',
  'Test Guest 3',
  'Test Guest 4',
  'Test Guest 5',
  'Test Guest 6',
];

const _VENUE_SAMPLE_GUESTS: Guest[] = VENUE_SAMPLE_NAMES.map((fullName, index) => {
  const [firstName, ...rest] = fullName.split(' ');
  const lastName = rest.join(' ') || `Guest ${index + 1}`;
  const tags: GuestTag[] =
    index < 2
      ? ["Bride's Family"]
      : index < 4
      ? ["Groom's Family"]
      : ["Bride's Friends"];

  return {
    id: `venue-guest-${index + 1}`,
    householdId: `venue-household-${Math.floor(index / 2) + 1}`,
    firstName,
    lastName,
    rsvpStatus: 'Confirmed',
    tags,
  };
});

const VENUE_LAYOUT_TABLES: Table[] = [
  {
    id: 'head-table',
    name: 'Bride & Groom',
    capacity: 2,
    shape: 'rectangle',
    x: 875,
    y: 135,
    guests: [],
  },
  // Left Side (Groom's Side)
  { id: 'table-1', name: 'Table 1', capacity: 10, shape: 'round-10', guests: [], x: 600, y: 320 },
  { id: 'table-2', name: 'Table 2', capacity: 10, shape: 'round-10', guests: [], x: 300, y: 320 },
  { id: 'table-3', name: 'Table 3', capacity: 8, shape: 'round-8', guests: [], x: 600, y: 600 },
  { id: 'table-4', name: 'Table 4', capacity: 8, shape: 'round-8', guests: [], x: 300, y: 600 },
  { id: 'table-5', name: 'Table 5', capacity: 8, shape: 'round-8', guests: [], x: 450, y: 880 },

  // Right Side (Bride's Side)
  { id: 'table-6', name: 'Table 6', capacity: 10, shape: 'round-10', guests: [], x: 1150, y: 320 },
  { id: 'table-7', name: 'Table 7', capacity: 10, shape: 'round-10', guests: [], x: 1450, y: 320 },
  { id: 'table-8', name: 'Table 8', capacity: 8, shape: 'round-8', guests: [], x: 1150, y: 600 },
  { id: 'table-9', name: 'Table 9', capacity: 8, shape: 'round-8', guests: [], x: 1450, y: 600 },
  { id: 'table-10', name: 'Table 10', capacity: 8, shape: 'round-8', guests: [], x: 1300, y: 880 },
];

const VENUE_DIMENSIONS = {
  widthMeters: 25,
  depthMeters: 15,
};

// Tag colour map for visual group badges
const TAG_COLORS: Record<string, string> = {
  "Bride's Family":   '#ec4899',
  "Groom's Family":   '#10b981',
  "Bride's Friends":  '#f97316',
  "Groom's Friends":  '#38bdf8',
  'Work':             '#a78bfa',
  'Do Not Sit Together': '#ef4444',
};

const TAG_LABELS: Record<string, string> = {
  "Bride's Family": 'Bride Fam',
  "Groom's Family": 'Groom Fam',
  "Bride's Friends": 'Bride Friends',
  "Groom's Friends": 'Groom Friends',
  Work: 'Work',
  'Do Not Sit Together': 'Conflict',
};

// Compact dropdown for reassigning a guest without needing to drag — the
// reliable path on touch devices and when tables are packed close together.
const MoveToDropdown = ({
  guest,
  tables,
  currentContainerId,
  onMoveToTable,
  compact,
}: {
  guest: Guest;
  tables: Table[];
  currentContainerId: string;
  onMoveToTable: (targetId: string) => void;
  compact?: boolean;
}) => {
  const stop = (e: React.SyntheticEvent) => e.stopPropagation();
  return (
    <div onPointerDown={stop} onClick={stop} onMouseDown={stop}>
      <Select value={currentContainerId} onValueChange={onMoveToTable}>
        <SelectTrigger
          className={cn(
            "h-6 w-auto shrink-0 gap-0.5 rounded-full border-white/15 bg-white/10 px-1.5 py-0 text-white/70 hover:bg-white/20 hover:text-white [&>svg]:h-3 [&>svg]:w-3 [&>svg]:opacity-70",
            compact && "h-5 px-1"
          )}
          aria-label={`Move ${guest.firstName} ${guest.lastName} to a different table`}
        >
          <ArrowRightLeft className="h-3 w-3" />
        </SelectTrigger>
        <SelectContent className="glass-card min-w-[13rem] border-white/10 text-white" align="end">
          <SelectItem value="unseated">↩ Unseated Guests</SelectItem>
          {tables.map(t => {
            const isFull = t.id !== currentContainerId && t.guests.length >= t.capacity;
            return (
              <SelectItem key={t.id} value={t.id} disabled={isFull}>
                {t.name} · {t.guests.length}/{t.capacity}{isFull ? ' · Full' : ''}
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>
    </div>
  );
};

const GuestPill = React.forwardRef<HTMLDivElement, {
  guest: Guest;
  onRemove?: () => void;
  isOverlay?: boolean;
  isDragging?: boolean;
  style?: React.CSSProperties;
  tables?: Table[];
  currentContainerId?: string;
  onMoveToTable?: (targetId: string) => void;
  compact?: boolean;
  // Catches dnd-kit's spread {...attributes} {...listeners} (drag handlers).
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}>(({ guest, onRemove, isOverlay, isDragging, style, tables, currentContainerId, onMoveToTable, compact, ...props }, ref) => {
  const primaryTag = guest.tags?.[0];
  const tagColor   = primaryTag ? TAG_COLORS[primaryTag] : undefined;
  const canMove = Boolean(onMoveToTable && tables && currentContainerId);
  return (
    <div
      ref={ref}
      style={{ ...style, cursor: isOverlay ? 'grabbing' : 'grab' }}
      {...props}
      className={cn(
        "flex items-center gap-1.5 rounded-full bg-emerald-900/60 border border-white/10 text-white backdrop-blur-md touch-none",
        compact ? "px-2 py-1 text-xs" : "px-3 py-1.5 text-sm",
        isOverlay && "shadow-2xl",
        isDragging && "opacity-30"
      )}
    >
      <GripVertical className={cn("text-muted-foreground shrink-0", compact ? "h-3.5 w-3.5" : "h-5 w-5")} />
      <span className="font-medium flex-1 truncate">{guest.firstName} {guest.lastName}</span>
      {tagColor && (
        compact ? (
          <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: tagColor }} title={primaryTag} />
        ) : (
          <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide border border-white/20 bg-black/30" title={primaryTag}>
            <span className="w-2 h-2 rounded-full" style={{ background: tagColor }} />
            <span>{primaryTag ? (TAG_LABELS[primaryTag] ?? primaryTag) : 'General'}</span>
          </span>
        )
      )}
      {canMove && (
        <MoveToDropdown
          guest={guest}
          tables={tables!}
          currentContainerId={currentContainerId!}
          onMoveToTable={onMoveToTable!}
          compact={compact}
        />
      )}
      {onRemove && (
        <button onClick={onRemove} className="p-1 rounded-full hover:bg-white/20 shrink-0">
          <X className="h-3 w-3" />
        </button>
      )}
    </div>
  );
});
GuestPill.displayName = "GuestPill";

const SortableGuestPill = ({
  guest,
  onRemove,
  tables,
  currentContainerId,
  onMoveToTable,
  compact,
}: {
  guest: Guest;
  onRemove?: () => void;
  tables?: Table[];
  currentContainerId?: string;
  onMoveToTable?: (targetId: string) => void;
  compact?: boolean;
}) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: guest.id, data: { type: 'guest', guest } });
  const style = { transform: CSS.Transform.toString(transform), transition };
  return (
    <GuestPill
      guest={guest}
      onRemove={onRemove}
      ref={setNodeRef}
      style={style}
      isDragging={isDragging}
      tables={tables}
      currentContainerId={currentContainerId}
      onMoveToTable={onMoveToTable}
      compact={compact}
      {...attributes}
      {...listeners}
    />
  );
};

const TableDropzone = ({
  id,
  table,
  guests,
  children,
  isOver,
  isAtCapacity,
  justFilled,
  hasConflict,
  isLocked,
  onDelete,
  onRename,
  onDuplicate,
  onClearGuests,
  onSetShape,
}: {
  id: string,
  table: Table,
  guests: Guest[],
  children: React.ReactNode,
  isOver: boolean,
  isAtCapacity: boolean,
  justFilled: boolean,
  hasConflict: boolean,
  isLocked?: boolean,
  onDelete?: () => void,
  onRename?: () => void,
  onDuplicate?: () => void,
  onClearGuests?: () => void,
  onSetShape?: (shape: 'round-8' | 'round-10' | 'rectangle') => void,
}) => {
    const { setNodeRef } = useSortable({ id });
    const isFull = guests.length >= table.capacity;
    const tableShapeStyles = {
        'round-8': 'w-36 h-36',
        'round-10': 'w-40 h-40',
        'rectangle': 'w-64 h-24 !rounded-2xl',
    };
    
     React.useEffect(() => {
        if(justFilled) {
            // Dynamically import confetti to keep it out of the initial bundle
            import('canvas-confetti').then(({ default: confetti }) => {
                confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 }, colors: ['#d4af37', '#f6e7b7', '#ffffff'] });
            });
        }
    }, [justFilled]);

    return (
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>
                    <div ref={setNodeRef} className="flex flex-col items-center gap-2">
                        <motion.div
                            className={cn("relative rounded-full flex flex-col items-center justify-center border-2 border-dashed transition-all duration-300", tableShapeStyles[table.shape], {
                                "border-red-500/80 bg-red-900/20 shadow-[0_0_20px_rgba(239,68,68,0.35)]": isAtCapacity || hasConflict,
                                "shadow-[0_0_20px_rgba(212,175,55,0.7)] border-aurora-gold": isOver && !isAtCapacity,
                                "border-white/20": !isOver && !isAtCapacity && !hasConflict,
                            })}
                            animate={{ scale: (isOver && !isAtCapacity) ? 1.05 : 1 }}
                        >
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button
                                  type="button"
                                  size="icon"
                                  variant="ghost"
                                  className="absolute left-2 top-2 z-20 h-7 w-7 rounded-full border border-white/20 bg-black/50 text-white/80 hover:bg-white/10 hover:text-white"
                                  onPointerDown={(event) => event.stopPropagation()}
                                  onClick={(event) => event.stopPropagation()}
                                  aria-label={`Open actions for ${table.name}`}
                                >
                                  <Settings2 size={13} />
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-44 glass-card p-1" align="start" sideOffset={8}>
                                <div className="flex flex-col">
                                  {!isLocked ? (
                                    <>
                                      <Button variant="ghost" className="justify-start gap-2" onClick={onRename}>
                                        <Rows3 size={13} /> Rename
                                      </Button>
                                      <Button variant="ghost" className="justify-start gap-2" onClick={onDuplicate}>
                                        <Copy size={13} /> Duplicate
                                      </Button>
                                      <Button variant="ghost" className="justify-start gap-2" onClick={onClearGuests}>
                                        <Eraser size={13} /> Clear Guests
                                      </Button>
                                      <Button variant="ghost" className="justify-start" onClick={() => onSetShape?.('round-8')}>
                                        Set Round 8
                                      </Button>
                                      <Button variant="ghost" className="justify-start" onClick={() => onSetShape?.('round-10')}>
                                        Set Round 10
                                      </Button>
                                      <Button variant="ghost" className="justify-start" onClick={() => onSetShape?.('rectangle')}>
                                        Set Rectangle
                                      </Button>
                                    </>
                                  ) : (
                                    <p className="px-2 py-1 text-xs text-white/70">Head table is locked.</p>
                                  )}
                                </div>
                              </PopoverContent>
                            </Popover>
                            {onDelete ? (
                              <Button
                                type="button"
                                size="icon"
                                variant="ghost"
                                className="absolute right-2 top-2 z-20 h-7 w-7 rounded-full border border-white/20 bg-black/50 text-red-300 hover:bg-red-500/15 hover:text-red-200"
                                onPointerDown={(event) => event.stopPropagation()}
                                onClick={(event) => {
                                  event.stopPropagation();
                                  onDelete();
                                }}
                                aria-label={`Delete ${table.name}`}
                              >
                                <Trash2 size={14} />
                              </Button>
                            ) : null}
                            <p className="font-bold text-lg tracking-tight">{table.name}</p>
                            <p className="text-sm text-muted-foreground">{guests.length} / {table.capacity}</p>
                            <div className="mt-1 h-1 w-14 overflow-hidden rounded-full bg-white/10">
                              <div
                                className={cn(
                                  "h-full rounded-full transition-all duration-300",
                                  isFull || hasConflict ? "bg-red-400" : "bg-[#d4af37]"
                                )}
                                style={{ width: `${Math.min(100, (guests.length / table.capacity) * 100)}%` }}
                              />
                            </div>
                            {hasConflict && (
                              <motion.div
                                className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-red-500 flex items-center justify-center"
                                animate={{ scale: [1, 1.3, 1] }}
                                transition={{ duration: 1.2, repeat: Infinity }}
                                title="Conflict detected"
                              >
                                <AlertTriangle size={10} className="text-white" />
                              </motion.div>
                            )}
                        </motion.div>
                        <div
                          className={cn(
                            "min-h-[40px] max-h-48 w-56 space-y-1 overflow-y-auto rounded-lg p-2 pr-1.5",
                            "[scrollbar-width:thin] [scrollbar-color:rgba(255,255,255,0.18)_transparent]",
                            "[&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-white/15",
                            table.shape.startsWith('round') ? 'w-56' : 'w-64'
                          )}
                        >
                            {guests.length === 0 ? (
                              <p className="py-3 text-center text-[11px] text-white/25">Drop guests here, or use the move icon</p>
                            ) : (
                              children
                            )}
                            {guests.length >= 5 && (
                              <p className="pointer-events-none sticky bottom-0 -mb-2 bg-gradient-to-t from-black/40 to-transparent pt-3 text-center text-[9px] uppercase tracking-wider text-white/30">
                                scroll for more
                              </p>
                            )}
                        </div>
                    </div>
                </TooltipTrigger>
                <TooltipContent className="glass-card">
                     <p className='font-bold mb-2'>{table.name} Guests:</p>
                    {guests.length > 0 ? (
                        <ul className='list-disc pl-4 text-muted-foreground'>
                            {guests.map(g => <li key={g.id}>{g.firstName} {g.lastName}</li>)}
                        </ul>
                    ) : <p className='text-sm text-muted-foreground'>Drop a guest here.</p>}
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
};

const DraggableTableWrapper = ({ table, onPositionChange, children, dragBoundsRef }: { table: Table; onPositionChange: (id: string, pos: { x: number; y: number }) => void; children: React.ReactNode; dragBoundsRef: React.RefObject<HTMLDivElement | null> }) => {
  const x = useMotionValue(table.x);
  const y = useMotionValue(table.y);

  useEffect(() => {
    x.set(table.x);
    y.set(table.y);
  }, [table.x, table.y, x, y]);

  return (
    <motion.div
      drag
      dragConstraints={dragBoundsRef}
      dragMomentum={false}
      onDragEnd={(_, info) =>
        onPositionChange(table.id, {
          x: table.x + info.offset.x,
          y: table.y + info.offset.y,
        })
      }
      style={{ x, y, position: 'absolute' }}
      className="z-10 touch-none"
    >
      {children}
    </motion.div>
  );
};

export function SeatingChart() {
  const isMobile = useIsMobile();
  const canvasBoundsRef = useRef<HTMLDivElement>(null);
  const [realGuests, setRealGuests] = useState<Guest[] | null>(null);
  useEffect(() => {
    fetchHouseholds()
      .then(households => setRealGuests(households.flatMap(h => h.guests)))
      .catch(() => setRealGuests([]));
  }, []);
  const usingVenuePreset = realGuests !== null && realGuests.length === 0;
  const guestPool = useMemo(
    () => (realGuests ?? []),
    [realGuests]
  );
  const tablePreset = VENUE_LAYOUT_TABLES;
  const initiallySeatedIds = useMemo(
    () => new Set(tablePreset.flatMap((table) => table.guests.map((guest) => guest.id))),
    [tablePreset]
  );

  const [unseatedGuests, setUnseatedGuests] = useState<Guest[]>(() =>
    guestPool.filter((guest) => !initiallySeatedIds.has(guest.id))
  );
  const [tables, setTables] = useState<Table[]>(() =>
    tablePreset.map((table) => ({ ...table, guests: [...table.guests] }))
  );
  const [activeDrag, setActiveDrag] = useState<Active | null>(null);
  const [overContainer, setOverContainer] = useState<string | null>(null);
  const [justFilledTable, setJustFilledTable] = useState<string | null>(null);
  const [showUnseatedPanel, setShowUnseatedPanel] = useState(true);
  const [unseatedSearch, setUnseatedSearch] = useState('');
  const [hasHydratedLayout, setHasHydratedLayout] = useState(false);
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();

  useEffect(() => {
    if (!isMobile) {
      setShowUnseatedPanel(true);
    }
  }, [isMobile]);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(SEATING_LAYOUT_STORAGE_KEY);
      if (!raw) {
        // No saved layout yet — seed from whatever guest pool is currently known
        // (placeholder preset until real guests load, then the real list).
        const seatedIds = new Set(tablePreset.flatMap((table) => table.guests.map((guest) => guest.id)));
        setTables(tablePreset.map((table) => ({ ...table, guests: [...table.guests] })));
        setUnseatedGuests(guestPool.filter((guest) => !seatedIds.has(guest.id)));
        setHasHydratedLayout(true);
        return;
      }

      const parsed = JSON.parse(raw) as { tables?: Array<Table & { guests?: Guest[] }>; unseatedGuestIds?: string[] };
      if (!parsed.tables || !Array.isArray(parsed.tables)) {
        setHasHydratedLayout(true);
        return;
      }

      const guestById = new Map(guestPool.map((guest) => [guest.id, guest]));
      const restoredTables: Table[] = parsed.tables.map((table) => ({
        ...table,
        guests: (table.guests ?? []).map((guest) => guestById.get(guest.id)).filter((guest): guest is Guest => Boolean(guest)),
      }));
      const seatedIds = new Set(restoredTables.flatMap((table) => table.guests.map((guest) => guest.id)));
      const restoredUnseatedFromIds = (parsed.unseatedGuestIds ?? []).map((id) => guestById.get(id)).filter((guest): guest is Guest => Boolean(guest));
      const fallbackUnseated = guestPool.filter((guest) => !seatedIds.has(guest.id));
      const unseated = restoredUnseatedFromIds.length > 0 ? restoredUnseatedFromIds : fallbackUnseated;

      setTables(restoredTables);
      setUnseatedGuests(unseated);
      toast({ title: 'Layout restored', description: 'Your latest seating edits were loaded.' });
    } catch {
      // Ignore malformed localStorage and continue with defaults.
    } finally {
      setHasHydratedLayout(true);
    }
  }, [guestPool, tablePreset, toast]);

  useEffect(() => {
    if (!hasHydratedLayout) return;
    const payload = {
      tables,
      unseatedGuestIds: unseatedGuests.map((guest) => guest.id),
    };
    window.localStorage.setItem(SEATING_LAYOUT_STORAGE_KEY, JSON.stringify(payload));
  }, [hasHydratedLayout, tables, unseatedGuests]);

  const resetVenuePreset = () => {
    const resetSeatedIds = new Set(tablePreset.flatMap((table) => table.guests.map((guest) => guest.id)));
    setTables(tablePreset.map((table) => ({ ...table, guests: [...table.guests] })));
    setUnseatedGuests(guestPool.filter((guest) => !resetSeatedIds.has(guest.id)));
    setJustFilledTable(null);
    toast({ title: 'Venue preset reset', description: 'Stage, head table, and guest table layout restored.' });
  };

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 140, tolerance: 8 } })
  );

  const activeGuest = useMemo(() => activeDrag?.data.current?.type === 'guest' ? activeDrag.data.current.guest as Guest : null, [activeDrag]);
  const containers = useMemo(() => ['unseated', ...tables.map(t => t.id)], [tables]);
  const planningTagSummary = useMemo(() => {
    const counts = new Map<string, number>();
    for (const guest of guestPool) {
      const tag = guest.tags?.[0] ?? 'General';
      counts.set(tag, (counts.get(tag) ?? 0) + 1);
    }
    return Array.from(counts.entries());
  }, [guestPool]);

  const filteredUnseatedGuests = useMemo(() => {
    const q = unseatedSearch.trim().toLowerCase();
    if (!q) return unseatedGuests;
    return unseatedGuests.filter(g => `${g.firstName} ${g.lastName}`.toLowerCase().includes(q));
  }, [unseatedGuests, unseatedSearch]);

  // ── Conflict Radar ─────────────────────────────────────────────────────
  const tableConflicts = useMemo(() => {
    const map: Record<string, boolean> = {};
    tables.forEach(t => {
      const hasDoNotSit = t.guests.filter(g => g.tags?.includes('Do Not Sit Together')).length >= 2;
      map[t.id] = hasDoNotSit;
    });
    return map;
  }, [tables]);

  // ── Magic Seat Algorithm ────────────────────────────────────────────────
  const magicSeat = () => {
    startTransition(() => {
      const confirmed = unseatedGuests.filter(g => g.rsvpStatus === 'Confirmed');
      if (!confirmed.length) {
        toast({ title: 'No unseated confirmed guests', description: 'Everyone is already seated or pending.' });
        return;
      }

      // Group by primary tag, then fill tables sequentially keeping groups together
      const groups: Record<string, Guest[]> = {};
      confirmed.forEach(g => {
        const tag = g.tags?.[0] ?? 'General';
        if (!groups[tag]) groups[tag] = [];
        groups[tag].push(g);
      });

      // Sort groups largest-first so families fill whole tables before smaller groups
      const sortedGroups = Object.values(groups).sort((a, b) => b.length - a.length);

      const newTables = tables.map(t => ({ ...t, guests: [...t.guests] }));
      const seatedIds = new Set<string>();

      for (const group of sortedGroups) {
        for (const guest of group) {
          // Find first table with space
          const targetTable = newTables.find(t => t.guests.length < t.capacity);
          if (!targetTable) break;
          targetTable.guests.push(guest);
          seatedIds.add(guest.id);
        }
      }

      setTables(newTables);
      setUnseatedGuests(prev => prev.filter(g => !seatedIds.has(g.id)));
      toast({
        title: `✨ Magic Seat Complete`,
        description: `${seatedIds.size} guests auto-assigned. ${confirmed.length - seatedIds.size} still need seats.`,
      });
    });
  };

  const findContainer = (id: string) => {
    if (id === 'unseated' || tables.some(t => t.id === id)) return id;
    const table = tables.find(t => t.guests.some(g => g.id === id));
    if (table) return table.id;
    if (unseatedGuests.some(g => g.id === id)) return 'unseated';
    if (guestPool.some(g => g.id === id)) return 'unseated';
    return undefined;
  };
  
  const handleDragStart = (event: DragStartEvent) => {
    setActiveDrag(event.active);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    setOverContainer(over?.id as string || null);
    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    const activeContainer = findContainer(activeId);
    const overContainer = findContainer(overId);

    if (!activeContainer || !overContainer || activeContainer === overContainer) {
      return;
    }

    const guestToMove = guestPool.find(g => g.id === activeId);
    if (!guestToMove) return;

    const overTable = tables.find(t => t.id === overContainer);
    if (overTable && overTable.guests.length >= overTable.capacity) {
      return;
    }

    setUnseatedGuests(prev => {
      if (activeContainer === 'unseated') {
        return prev.filter(g => g.id !== activeId);
      } else if (overContainer === 'unseated') {
        const overIndex = prev.findIndex(g => g.id === overId);
        const newIndex = overIndex >= 0 ? overIndex : prev.length;
        const copy = [...prev];
        if (!copy.some(g => g.id === activeId)) {
          copy.splice(newIndex, 0, guestToMove);
        }
        return copy;
      }
      return prev;
    });

    setTables(current => current.map(t => {
      if (t.id === activeContainer) {
        return { ...t, guests: t.guests.filter(g => g.id !== activeId) };
      }
      if (t.id === overContainer) {
        if (!t.guests.some(g => g.id === activeId)) {
          const overIndex = t.guests.findIndex(g => g.id === overId);
          const newIndex = overIndex >= 0 ? overIndex : t.guests.length;
          const copy = [...t.guests];
          copy.splice(newIndex, 0, guestToMove);
          return { ...t, guests: copy };
        }
      }
      return t;
    }));
  };
  
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setOverContainer(null);
    
    if (!over) {
      setActiveDrag(null);
      return;
    }
    
    const activeContainer = findContainer(active.id as string);
    const overContainerId = findContainer(over.id as string);
    
    if (activeContainer && overContainerId && activeContainer === overContainerId) {
      if (activeContainer === 'unseated') {
        setUnseatedGuests(guests => {
          const oldIndex = guests.findIndex(g => g.id === active.id);
          const newIndex = guests.findIndex(g => g.id === over.id);
          return arrayMove(guests, oldIndex, newIndex);
        });
      } else {
        setTables(current => current.map(t => {
          if (t.id === activeContainer) {
            const oldIndex = t.guests.findIndex(g => g.id === active.id);
            const newIndex = t.guests.findIndex(g => g.id === over.id);
            return { ...t, guests: arrayMove(t.guests, oldIndex, newIndex) };
          }
          return t;
        }));
      }

      const finalTable = tables.find(t => t.id === activeContainer);
      if (finalTable && finalTable.guests.length === finalTable.capacity) {
        setJustFilledTable(activeContainer);
        setTimeout(() => setJustFilledTable(null), 2000);
      }
    }

    setActiveDrag(null);
  };
  
  const handleTablePositionChange = (id: string, pos: {x: number, y: number}) => {
      setTables(current => current.map(t => t.id === id ? {...t, x: pos.x, y: pos.y} : t));
  };

  const removeGuestFromTable = (guestId: string) => {
    const guestToMove = guestPool.find(g => g.id === guestId);
    if (!guestToMove) return;

    setTables(current => current.map(t => ({
        ...t,
        guests: t.guests.filter(g => g.id !== guestId)
    })));
    setUnseatedGuests(current => [guestToMove, ...current]);
  };

  // Dropdown-based reassignment — a reliable alternative to drag & drop,
  // especially once tables are packed close together or on touch devices.
  // Locates the guest itself rather than reusing findContainer(), so it
  // can't be affected by that helper's drag-specific edge cases.
  const moveGuestToTable = (guestId: string, targetId: string) => {
    const guestToMove = guestPool.find(g => g.id === guestId);
    if (!guestToMove) return;

    const originId = unseatedGuests.some(g => g.id === guestId)
      ? 'unseated'
      : tables.find(t => t.guests.some(g => g.id === guestId))?.id ?? 'unseated';
    if (originId === targetId) return;

    if (targetId !== 'unseated') {
      const targetTable = tables.find(t => t.id === targetId);
      if (targetTable && targetTable.guests.length >= targetTable.capacity) {
        toast({ variant: 'destructive', title: 'Table full', description: `${targetTable.name} is already at capacity.` });
        return;
      }
    }

    setUnseatedGuests(current => current.filter(g => g.id !== guestId));
    setTables(current => current.map(t => ({ ...t, guests: t.guests.filter(g => g.id !== guestId) })));

    if (targetId === 'unseated') {
      setUnseatedGuests(current => [guestToMove, ...current]);
      toast({ title: 'Moved to Unseated', description: `${guestToMove.firstName} ${guestToMove.lastName} is now unseated.` });
    } else {
      setTables(current => {
        const next = current.map(t => t.id === targetId ? { ...t, guests: [...t.guests, guestToMove] } : t);
        const updated = next.find(t => t.id === targetId);
        if (updated && updated.guests.length === updated.capacity) {
          setJustFilledTable(targetId);
          setTimeout(() => setJustFilledTable(null), 2000);
        }
        return next;
      });
      const targetTable = tables.find(t => t.id === targetId);
      toast({ title: 'Seated!', description: `${guestToMove.firstName} ${guestToMove.lastName} moved to ${targetTable?.name ?? 'table'}.` });
    }
  };

  const addTable = (shape: 'round-8' | 'round-10' | 'rectangle') => {
      // Auto-place in a grid below the preset row so new tables never spawn
      // stacked on top of an existing one — each add just claims the next slot.
      const seatingTables = tables.filter(t => t.id !== 'head-table');
      const columns = 3;
      const col = seatingTables.length % columns;
      const row = Math.floor(seatingTables.length / columns);
      const newTable: Table = {
          id: `table-${Date.now()}`,
          name: `Table ${tables.length + 1}`,
          capacity: shape === 'round-10' ? 10 : 8,
          shape: shape,
          x: 70 + col * 260,
          y: 345 + row * 260,
          guests: [],
      };
      setTables(current => [...current, newTable]);
      toast({ title: 'Table added', description: `${newTable.name} is ready — drag or use the move icon to seat guests.` });
  };

  const deleteTable = (tableId: string) => {
    const tableToDelete = tables.find((table) => table.id === tableId);
    if (!tableToDelete) return;

    setUnseatedGuests((current) => {
      const existing = new Set(current.map((guest) => guest.id));
      const restored = tableToDelete.guests.filter((guest) => !existing.has(guest.id));
      return [...restored, ...current];
    });
    setTables((current) => current.filter((table) => table.id !== tableId));

    toast({
      title: `${tableToDelete.name} deleted`,
      description: `${tableToDelete.guests.length} guest${tableToDelete.guests.length === 1 ? '' : 's'} moved back to Unseated Guests.`,
    });
  };

  const requestDeleteTable = (tableId: string) => {
    const table = tables.find((item) => item.id === tableId);
    if (!table) return;
    const ok = window.confirm(`Delete ${table.name}? Guests will be moved to Unseated Guests.`);
    if (!ok) return;
    deleteTable(tableId);
  };

  const renameTable = (tableId: string) => {
    const table = tables.find((item) => item.id === tableId);
    if (!table) return;
    const nextName = window.prompt('Rename table', table.name)?.trim();
    if (!nextName) return;
    setTables((current) => current.map((item) => (item.id === tableId ? { ...item, name: nextName } : item)));
    toast({ title: 'Table renamed', description: `${table.name} is now ${nextName}.` });
  };

  const duplicateTable = (tableId: string) => {
    const source = tables.find((item) => item.id === tableId);
    if (!source) return;
    const duplicated: Table = {
      ...source,
      id: `table-${Date.now()}`,
      name: `${source.name} Copy`,
      x: source.x + 36,
      y: source.y + 36,
      guests: [],
    };
    setTables((current) => [...current, duplicated]);
    toast({ title: 'Table duplicated', description: `${duplicated.name} added with matching style.` });
  };

  const clearTableGuests = (tableId: string) => {
    const table = tables.find((item) => item.id === tableId);
    if (!table || table.guests.length === 0) return;

    setUnseatedGuests((current) => {
      const existing = new Set(current.map((guest) => guest.id));
      const restored = table.guests.filter((guest) => !existing.has(guest.id));
      return [...restored, ...current];
    });
    setTables((current) => current.map((item) => (item.id === tableId ? { ...item, guests: [] } : item)));
    toast({ title: 'Guests cleared', description: `${table.guests.length} moved back to Unseated Guests.` });
  };

  const setTableShape = (tableId: string, shape: 'round-8' | 'round-10' | 'rectangle') => {
    setTables((current) =>
      current.map((item) => {
        if (item.id !== tableId) return item;

        const requestedCapacity = shape === 'round-10' ? 10 : 8;
        if (item.guests.length > requestedCapacity) {
          toast({
            variant: 'destructive',
            title: 'Too many guests for this shape',
            description: `Move ${item.guests.length - requestedCapacity} guest(s) first.`,
          });
          return item;
        }

        return { ...item, shape, capacity: requestedCapacity };
      })
    );
  };

  return (
    <div className="flex-1 flex flex-col gap-3 min-h-0">
      {/* Toolbar */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between shrink-0" data-print-hide>
        {/* Summary badge */}
        <div className="flex flex-wrap items-center gap-2 text-sm text-white/50">
          <Users size={14} />
          <span>{guestPool.filter(g => g.rsvpStatus === 'Confirmed').length - unseatedGuests.filter(g => g.rsvpStatus === 'Confirmed').length} seated</span>
          <span className="text-white/20">·</span>
          <span>{unseatedGuests.filter(g => g.rsvpStatus === 'Confirmed').length} unseated</span>
          {usingVenuePreset && (
            <>
              <span className="text-white/20">·</span>
              <span className="text-[#d4af37]">6-person test preset</span>
            </>
          )}
          {Object.values(tableConflicts).some(Boolean) && (
            <span className="flex items-center gap-1 text-red-400 text-xs">
              <AlertTriangle size={12} /> Conflicts detected
            </span>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {isMobile && (
            <Button
              variant="outline"
              size="sm"
              className="gap-2 border-white/25 text-white/90 hover:bg-white/10"
              onClick={() => setShowUnseatedPanel((current) => !current)}
            >
              <Users size={14} />
              {showUnseatedPanel ? 'Hide Guests' : 'Show Guests'}
            </Button>
          )}
          <Popover>
            <PopoverTrigger asChild>
              <Button 
                variant="outline" 
                size={isMobile ? 'sm' : 'default'} 
                className="gap-2 border-white/10 hover:bg-white/5 text-white"
              >
                <Plus size={15} /> Add Table
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-48 glass-card p-1 text-white border-white/10" align="end">
              <div className="flex flex-col">
                <Button variant="ghost" className="justify-start text-xs text-white/80 hover:text-white" onClick={() => addTable('round-8')}>Round 8-Seater</Button>
                <Button variant="ghost" className="justify-start text-xs text-white/80 hover:text-white" onClick={() => addTable('round-10')}>Round 10-Seater</Button>
                <Button variant="ghost" className="justify-start text-xs text-white/80 hover:text-white" onClick={() => addTable('rectangle')}>Rectangular Table</Button>
              </div>
            </PopoverContent>
          </Popover>
          <Button
            variant="outline"
            size={isMobile ? 'sm' : 'default'}
            className="gap-2 border-[#d4af37]/50 bg-[#d4af37]/10 font-semibold text-[#f6e7b7] hover:bg-[#d4af37]/20"
            onClick={magicSeat}
            disabled={isPending || unseatedGuests.filter(g => g.rsvpStatus === 'Confirmed').length === 0}
          >
            <Wand2 size={15} className={isPending ? 'animate-spin' : ''} />
            {isPending ? 'Seating…' : 'Magic Seat'}
          </Button>
          <Button
            variant="outline"
            size={isMobile ? 'sm' : 'default'}
            className="gap-2 border-[#d4af37]/40 text-[#f6e7b7] hover:bg-[#d4af37]/10"
            onClick={() => window.print()}
          >
            <Printer size={15} />
            Print / Save PDF
          </Button>
          {usingVenuePreset && (
            <Button
              variant="outline"
              size={isMobile ? 'sm' : 'default'}
              className="gap-2 border-[#d4af37]/40 text-[#f6e7b7] hover:bg-[#d4af37]/10"
              onClick={resetVenuePreset}
            >
              <RotateCcw size={14} />
              Reset Preset
            </Button>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2" data-print-hide>
        <span className="text-xs uppercase tracking-wider text-white/60">Planning Tags</span>
        {planningTagSummary.map(([tag, count]) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-black/30 px-2.5 py-1 text-[11px] text-white/90"
          >
            <span
              className="h-2 w-2 rounded-full"
              style={{ background: TAG_COLORS[tag] ?? '#d1d5db' }}
            />
            <span>{TAG_LABELS[tag] ?? tag}</span>
            <span className="text-white/60">{count}</span>
          </span>
        ))}
      </div>

      <div id="seating-print-area" className="flex min-h-0 flex-1 flex-col gap-4 lg:grid lg:grid-cols-12 lg:gap-6">
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragOver={handleDragOver} onDragEnd={handleDragEnd}>
        {(showUnseatedPanel || !isMobile) && (
          <Card className="glass-card lg:col-span-3 h-full flex flex-col min-h-0" data-print-hide>
            <CardHeader className="space-y-2 shrink-0">
              <CardTitle className="flex items-center justify-between">
                <span>Unseated Guests</span>
                <span className="text-xs font-normal text-white/40">{unseatedGuests.length}</span>
              </CardTitle>
              {unseatedGuests.length > 6 && (
                <div className="relative">
                  <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-white/30" />
                  <Input
                    value={unseatedSearch}
                    onChange={(e) => setUnseatedSearch(e.target.value)}
                    placeholder="Search guests…"
                    className="h-8 border-white/15 bg-white/5 pl-8 text-xs"
                  />
                </div>
              )}
              <p className="text-[11px] text-white/35">Drag a guest onto a table, or tap <ArrowRightLeft className="inline h-2.5 w-2.5 -translate-y-px" /> to assign instantly.</p>
            </CardHeader>
            <CardContent className="space-y-2 overflow-y-auto pr-2 flex-1 min-h-0">
              {filteredUnseatedGuests.length === 0 ? (
                <p className="py-6 text-center text-sm text-white/30">
                  {unseatedGuests.length === 0 ? 'Everyone is seated 🎉' : 'No guests match your search.'}
                </p>
              ) : (
                <SortableContext items={filteredUnseatedGuests.map(g => g.id)}>
                  {filteredUnseatedGuests.map(guest => (
                    <SortableGuestPill
                      key={guest.id}
                      guest={guest}
                      tables={tables}
                      currentContainerId="unseated"
                      onMoveToTable={(targetId) => moveGuestToTable(guest.id, targetId)}
                    />
                  ))}
                </SortableContext>
              )}
            </CardContent>
          </Card>
        )}

        <div className="lg:col-span-9 h-full min-h-0">
        <div className="relative h-[62dvh] min-h-[520px] overflow-auto rounded-2xl border border-white/10 bg-black/20 p-4 lg:h-full scrollbar-thin" id="canvas-shell">
        <div ref={canvasBoundsRef} className="relative w-[2000px] h-[1200px] rounded-2xl bg-black/30 border border-white/5 overflow-hidden" id="canvas">
          <div
            aria-hidden
            className="absolute inset-0 opacity-20 pointer-events-none"
            style={{
              backgroundImage:
                'linear-gradient(to right, rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.04) 1px, transparent 1px)',
              backgroundSize: '64px 64px',
            }}
          />

          <div className="absolute top-4 left-4 z-20 rounded-md border border-white/15 bg-black/45 px-3 py-1 text-[11px] uppercase tracking-wider text-white/80 pointer-events-none">
            Approx Hall: {VENUE_DIMENSIONS.depthMeters}m x {VENUE_DIMENSIONS.widthMeters}m
          </div>

          <div className="absolute top-[140px] left-1/2 -translate-x-1/2 h-[950px] w-[96px] rounded-full border border-[#d4af37]/25 bg-[#d4af37]/5 pointer-events-none z-0" />
          <div className="absolute top-[180px] left-1/2 -translate-x-1/2 text-[10px] uppercase tracking-[0.25em] text-[#f6e7b7]/90 font-bold pointer-events-none z-0">
            Main Aisle
          </div>

          <div id="main-stage" className="absolute top-4 left-1/2 -translate-x-1/2 w-[480px] h-20 bg-aurora-gold/25 border-2 border-aurora-gold rounded-xl flex items-center justify-center z-0 shadow-lg shadow-aurora-gold/10">
            <h3 className='font-headline text-xl text-aurora-soft-gold italic flex items-center gap-2'><Crown /> Main Stage</h3>
          </div>
          
            <SortableContext items={containers}>
            {tables.map(table => (
              <DraggableTableWrapper key={table.id} table={table} onPositionChange={handleTablePositionChange} dragBoundsRef={canvasBoundsRef}>
                  <TableDropzone
                      id={table.id}
                      table={table}
                      guests={table.guests}
                      isOver={overContainer === table.id && !!activeDrag && table.guests.length < table.capacity}
                      isAtCapacity={!!activeDrag && table.guests.length >= table.capacity}
                      justFilled={justFilledTable === table.id}
                      hasConflict={tableConflicts[table.id] ?? false}
                        isLocked={table.id === 'head-table'}
                        onRename={table.id === 'head-table' ? undefined : () => renameTable(table.id)}
                        onDuplicate={table.id === 'head-table' ? undefined : () => duplicateTable(table.id)}
                        onClearGuests={table.id === 'head-table' ? undefined : () => clearTableGuests(table.id)}
                        onSetShape={table.id === 'head-table' ? undefined : (shape) => setTableShape(table.id, shape)}
                        onDelete={table.id === 'head-table' ? undefined : () => requestDeleteTable(table.id)}
                  >
                    <SortableContext items={table.guests.map(g => g.id)}>
                        <div className="space-y-1">
                        {table.guests.map(guest => (
                            <SortableGuestPill
                              key={guest.id}
                              guest={guest}
                              onRemove={() => removeGuestFromTable(guest.id)}
                              tables={tables}
                              currentContainerId={table.id}
                              onMoveToTable={(targetId) => moveGuestToTable(guest.id, targetId)}
                              compact
                            />
                        ))}
                        </div>
                    </SortableContext>
                  </TableDropzone>
              </DraggableTableWrapper>
            ))}
            </SortableContext>
        </div>
          </div>
          </div>
        <DragOverlay>
            {activeGuest ? <GuestPill guest={activeGuest} isOverlay /> : null}
        </DragOverlay>
      </DndContext>
      </div>
    </div>
  );
}
