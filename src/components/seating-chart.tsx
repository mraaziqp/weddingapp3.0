'use client';

import React, { useEffect, useState, useMemo, useRef, useTransition } from 'react';
import { DndContext, closestCenter, MouseSensor, TouchSensor, useSensor, useSensors, DragEndEvent, DragStartEvent, DragOverlay, Active } from '@dnd-kit/core';
import { SortableContext, useSortable, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { GripVertical, X, Crown, Plus, Printer, Wand2, AlertTriangle, Users, RotateCcw, Trash2, Settings2, Copy, Eraser, Rows3 } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import { fetchHouseholds } from '@/lib/supabase';
import type { Guest, Table, GuestTag } from '@/lib/types';
import { Button } from './ui/button';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
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

const VENUE_SAMPLE_GUESTS: Guest[] = VENUE_SAMPLE_NAMES.map((fullName, index) => {
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
    x: 300,
    y: 135,
    guests: [],
  },
  { id: 'table-1', name: 'Table 1', capacity: 8, shape: 'round-8', guests: [], x: 70, y: 345 },
  { id: 'table-2', name: 'Table 2', capacity: 8, shape: 'round-8', guests: [], x: 330, y: 345 },
  { id: 'table-3', name: 'Table 3', capacity: 8, shape: 'round-8', guests: [], x: 590, y: 345 },
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const GuestPill = React.forwardRef<HTMLDivElement, { guest: Guest; onRemove?: () => void, isOverlay?: boolean, isDragging?: boolean, style?: React.CSSProperties, [key: string]: any }>(({ guest, onRemove, isOverlay, isDragging, style, ...props }, ref) => {
  const primaryTag = guest.tags?.[0];
  const tagColor   = primaryTag ? TAG_COLORS[primaryTag] : undefined;
  return (
    <motion.div ref={ref} style={{ ...style, cursor: isOverlay ? 'grabbing' : 'grab' }} {...props} layout className={cn("flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-900/60 border border-white/10 text-sm text-white backdrop-blur-md touch-none", isOverlay && "shadow-2xl", isDragging && "opacity-30")}>
      <GripVertical className="h-5 w-5 text-muted-foreground" />
      <span className="font-medium flex-1">{guest.firstName} {guest.lastName}</span>
      {tagColor && (
        <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide border border-white/20 bg-black/30" title={primaryTag}>
          <span className="w-2 h-2 rounded-full" style={{ background: tagColor }} />
          <span>{primaryTag ? (TAG_LABELS[primaryTag] ?? primaryTag) : 'General'}</span>
        </span>
      )}
      {onRemove && (
        <button onClick={onRemove} className="p-1 rounded-full hover:bg-white/20">
          <X className="h-3 w-3" />
        </button>
      )}
    </motion.div>
  );
});
GuestPill.displayName = "GuestPill";

const SortableGuestPill = ({ guest, onRemove }: { guest: Guest, onRemove?: () => void }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: guest.id, data: { type: 'guest', guest } });
  const style = { transform: CSS.Transform.toString(transform), transition };
  return <GuestPill guest={guest} onRemove={onRemove} ref={setNodeRef} style={style} isDragging={isDragging} {...attributes} {...listeners} />;
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
                        <div className={cn("min-h-[40px] w-56 space-y-1 p-2 rounded-lg", table.shape.startsWith('round') ? 'w-56' : 'w-64')}>
                            {children}
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
      style={{ x: table.x, y: table.y, position: 'absolute' }}
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
  const [justFilledTable, setJustFilledTable] = useState<string | null>(null);
  const [showUnseatedPanel, setShowUnseatedPanel] = useState(true);
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
    return table?.id;
  };
  
  const handleDragStart = (event: DragStartEvent) => setActiveDrag(event.active);
  
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (!over) {
      setActiveDrag(null);
      return;
    }
    
    const originalContainerId = findContainer(active.id as string);
    const overContainerId = findContainer(over.id as string);
    
    if (!originalContainerId || !overContainerId || active.id === over.id) {
        setActiveDrag(null);
        return;
    }

    const isMovingToNewContainer = originalContainerId !== overContainerId;
    
    if (isMovingToNewContainer) {
        const guestToMove = guestPool.find(g => g.id === active.id);
        if (!guestToMove) return;

        const overTable = tables.find(t => t.id === overContainerId);
        if (overTable && overTable.guests.length >= overTable.capacity) {
            toast({ variant: 'destructive', title: 'Table Full', description: `${overTable.name} cannot seat more guests.`});
            setActiveDrag(null);
            return;
        }

        // Remove from old container
        setUnseatedGuests(g => g.filter(guest => guest.id !== active.id));
        setTables(current => current.map(t => ({
            ...t,
            guests: t.guests.filter(g => g.id !== active.id)
        })));
        
        // Add to new container
        if (overContainerId === 'unseated') {
            setUnseatedGuests(g => [...g, guestToMove]);
        } else {
            setTables(current => current.map(t => {
                if (t.id === overContainerId) {
                   return { ...t, guests: [...t.guests, guestToMove] };
                }
                return t;
            }));
            const finalTable = tables.find(t => t.id === overContainerId);
            if (finalTable && finalTable.guests.length + 1 === finalTable.capacity) {
                setJustFilledTable(overContainerId);
                setTimeout(() => setJustFilledTable(null), 2000);
            }
        }
    } else { // Sort within same container
         if (originalContainerId === 'unseated') {
            setUnseatedGuests(guests => {
                const oldIndex = guests.findIndex(g => g.id === active.id);
                const newIndex = guests.findIndex(g => g.id === over.id);
                return arrayMove(guests, oldIndex, newIndex);
            });
        } else {
             setTables(current => current.map(t => {
                if (t.id === originalContainerId) {
                    const oldIndex = t.guests.findIndex(g => g.id === active.id);
                    const newIndex = t.guests.findIndex(g => g.id === over.id);
                    return { ...t, guests: arrayMove(t.guests, oldIndex, newIndex) };
                }
                return t;
            }));
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

  const addTable = (shape: 'round-8' | 'round-10' | 'rectangle') => {
      const newTable: Table = {
          id: `table-${Date.now()}`,
          name: `Table ${tables.length + 1}`,
          capacity: shape === 'round-10' ? 10 : 8,
          shape: shape,
          x: 200,
          y: 200,
          guests: [],
      };
      setTables(current => [...current, newTable]);
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
    <div className="flex-1 flex flex-col gap-3">
      {/* Toolbar */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between" data-print-hide>
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
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        {(showUnseatedPanel || !isMobile) && (
          <Card className="glass-card lg:col-span-3" data-print-hide>
            <CardHeader><CardTitle>Unseated Guests</CardTitle></CardHeader>
            <CardContent className="space-y-2 overflow-y-auto pr-2 max-h-[34dvh] lg:max-h-[calc(100%-6rem)]">
              <SortableContext items={unseatedGuests.map(g => g.id)}>
                {unseatedGuests.map(guest => <SortableGuestPill key={guest.id} guest={guest} />)}
              </SortableContext>
            </CardContent>
          </Card>
        )}

        <div className="lg:col-span-9">
        <div className="relative h-[62dvh] min-h-[520px] overflow-auto rounded-2xl border border-white/10 bg-black/20 p-3 sm:p-4 lg:h-full" id="canvas-shell">
        <div ref={canvasBoundsRef} className="relative min-h-[520px] min-w-[760px] lg:min-h-full lg:min-w-0" id="canvas">
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

          <div className="absolute top-[94px] left-1/2 -translate-x-1/2 h-[68%] w-[96px] rounded-full border border-[#d4af37]/35 bg-[#d4af37]/10 pointer-events-none z-0" />
          <div className="absolute top-[130px] left-1/2 -translate-x-1/2 text-[10px] uppercase tracking-[0.2em] text-[#f6e7b7]/80 pointer-events-none z-0">
            Main Aisle
          </div>

          <div id="main-stage" className="absolute top-4 left-1/2 -translate-x-1/2 w-[40%] h-20 bg-aurora-gold/20 border-2 border-aurora-gold rounded-lg flex items-center justify-center z-0">
            <h3 className='font-headline text-xl text-aurora-soft-gold italic flex items-center gap-2'><Crown /> Main Stage</h3>
          </div>
          
           <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size={isMobile ? 'sm' : 'default'} className="absolute right-4 top-4 z-20" data-print-hide> <Plus className="mr-2"/> Add Table</Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto glass-card p-2">
                <div className="flex flex-col gap-2">
                    <Button variant="ghost" onClick={() => addTable('round-8')}>Round 8-Seater</Button>
                    <Button variant="ghost" onClick={() => addTable('round-10')}>Round 10-Seater</Button>
                    <Button variant="ghost" onClick={() => addTable('rectangle')}>Rectangular Table</Button>
                </div>
            </PopoverContent>
          </Popover>

            <SortableContext items={containers}>
            {tables.map(table => (
              <DraggableTableWrapper key={table.id} table={table} onPositionChange={handleTablePositionChange} dragBoundsRef={canvasBoundsRef}>
                  <TableDropzone
                      id={table.id}
                      table={table}
                      guests={table.guests}
                      isOver={!!activeDrag && findContainer(activeDrag.id as string) !== table.id && findContainer(activeDrag.id as string) !== 'unseated'}
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
                            <SortableGuestPill key={guest.id} guest={guest} onRemove={() => removeGuestFromTable(guest.id)} />
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
