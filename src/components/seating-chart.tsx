'use client';

import React, { useState, useMemo, useTransition } from 'react';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, DragEndEvent, DragStartEvent, DragOverlay, Active } from '@dnd-kit/core';
import { SortableContext, useSortable, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { GripVertical, X, Crown, Plus, Printer, Wand2, AlertTriangle, Users } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import { allGuests, initialTables as mockTables } from '@/lib/mock-data';
import type { Guest, Table, GuestTag } from '@/lib/types';
import { Button } from './ui/button';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { useToast } from '@/hooks/use-toast';

const VENUE_SAMPLE_NAMES = [
  'Razia Abduraziq',
  'Abduraziq',
  'Aaliyah',
  'Yusuf',
  'Fatima',
  'Zayd',
  'Safiyyah',
  'Hassan',
  'Maryam',
  'Bilal',
  'Noor',
  'Ibrahim',
  'Amina',
  'Ismail',
  'Layla',
  'Umar',
  'Sumayyah',
  'Harun',
  'Sara',
  'Rayyan',
  'Hafsa',
];

const VENUE_SAMPLE_GUESTS: Guest[] = VENUE_SAMPLE_NAMES.map((fullName, index) => {
  const [firstName, ...rest] = fullName.split(' ');
  const lastName = rest.join(' ') || `Guest ${index + 1}`;
  const tags: GuestTag[] =
    index < 8
      ? ["Bride's Family"]
      : index < 15
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
    x: 280,
    y: 110,
    guests: [VENUE_SAMPLE_GUESTS[0], VENUE_SAMPLE_GUESTS[1]],
  },
  { id: 'table-1', name: 'Table 1', capacity: 8, shape: 'round-8', guests: [], x: 90, y: 290 },
  { id: 'table-2', name: 'Table 2', capacity: 8, shape: 'round-8', guests: [], x: 330, y: 290 },
  { id: 'table-3', name: 'Table 3', capacity: 8, shape: 'round-8', guests: [], x: 570, y: 290 },
];

// Tag colour map for visual group badges
const TAG_COLORS: Record<string, string> = {
  "Bride's Family":   '#ec4899',
  "Groom's Family":   '#10b981',
  "Bride's Friends":  '#f97316',
  "Groom's Friends":  '#38bdf8',
  'Work':             '#a78bfa',
  'Do Not Sit Together': '#ef4444',
};

const GuestPill = React.forwardRef<HTMLDivElement, { guest: Guest; onRemove?: () => void, isOverlay?: boolean, isDragging?: boolean, style?: React.CSSProperties, [key: string]: any }>(({ guest, onRemove, isOverlay, isDragging, style, ...props }, ref) => {
  const primaryTag = guest.tags?.[0];
  const tagColor   = primaryTag ? TAG_COLORS[primaryTag] : undefined;
  return (
    <motion.div ref={ref} style={{ ...style, cursor: isOverlay ? 'grabbing' : 'grab' }} {...props} layout className={cn("flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-900/60 border border-white/10 text-sm text-white backdrop-blur-md touch-none", isOverlay && "shadow-2xl", isDragging && "opacity-30")}>
      <GripVertical className="h-5 w-5 text-muted-foreground" />
      <span className="font-medium flex-1">{guest.firstName} {guest.lastName}</span>
      {tagColor && (
        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: tagColor }} title={primaryTag} />
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

const TableDropzone = ({ id, table, guests, children, isOver, isAtCapacity, justFilled, hasConflict }: { id: string, table: Table, guests: Guest[], children: React.ReactNode, isOver: boolean, isAtCapacity: boolean, justFilled: boolean, hasConflict: boolean }) => {
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

const DraggableTableWrapper = ({ table, onPositionChange, children }: { table: Table; onPositionChange: (id: string, pos: { x: number; y: number }) => void; children: React.ReactNode }) => {
  return (
    <motion.div
      drag
      dragConstraints={{ left: 0, right: 800, top: 0, bottom: 400 }}
      dragMomentum={false}
      onDragEnd={(event, info) => onPositionChange(table.id, info.point)}
      style={{ x: table.x, y: table.y, position: 'absolute' }}
      className="z-10"
    >
      {children}
    </motion.div>
  );
};

export function SeatingChart() {
  const guestPool = useMemo(
    () => (allGuests.length > 0 ? allGuests : VENUE_SAMPLE_GUESTS),
    []
  );
  const tablePreset = useMemo(
    () => (allGuests.length > 0 ? mockTables : VENUE_LAYOUT_TABLES),
    []
  );
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
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  const activeGuest = useMemo(() => activeDrag?.data.current?.type === 'guest' ? activeDrag.data.current.guest as Guest : null, [activeDrag]);
  const containers = useMemo(() => ['unseated', ...tables.map(t => t.id)], [tables]);

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

  return (
    <div className="flex-1 flex flex-col gap-3">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3" data-print-hide>
        {/* Summary badge */}
        <div className="flex items-center gap-2 text-sm text-white/50">
          <Users size={14} />
          <span>{guestPool.filter(g => g.rsvpStatus === 'Confirmed').length - unseatedGuests.filter(g => g.rsvpStatus === 'Confirmed').length} seated</span>
          <span className="text-white/20">·</span>
          <span>{unseatedGuests.filter(g => g.rsvpStatus === 'Confirmed').length} unseated</span>
          {Object.values(tableConflicts).some(Boolean) && (
            <span className="flex items-center gap-1 text-red-400 text-xs">
              <AlertTriangle size={12} /> Conflicts detected
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            className="gap-2 border-[#d4af37]/50 text-[#f6e7b7] bg-[#d4af37]/10 hover:bg-[#d4af37]/20 font-semibold"
            onClick={magicSeat}
            disabled={isPending || unseatedGuests.filter(g => g.rsvpStatus === 'Confirmed').length === 0}
          >
            <Wand2 size={15} className={isPending ? 'animate-spin' : ''} />
            {isPending ? 'Seating…' : 'Magic Seat'}
          </Button>
          <Button
            variant="outline"
            className="gap-2 border-[#d4af37]/40 text-[#f6e7b7] hover:bg-[#d4af37]/10"
            onClick={() => window.print()}
          >
            <Printer size={15} />
            Print / Save PDF
          </Button>
        </div>
      </div>

      <div id="seating-print-area" className="flex-1 grid grid-cols-12 gap-6">
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <Card className="glass-card col-span-3" data-print-hide>
          <CardHeader><CardTitle>Unseated Guests</CardTitle></CardHeader>
          <CardContent className="space-y-2 h-[calc(100%-6rem)] overflow-y-auto pr-2">
            <SortableContext items={unseatedGuests.map(g => g.id)}>
              {unseatedGuests.map(guest => <SortableGuestPill key={guest.id} guest={guest} />)}
            </SortableContext>
          </CardContent>
        </Card>

        <div className="col-span-9 rounded-2xl bg-black/20 border border-white/10 p-4 relative" id="canvas">
          <div id="main-stage" className="absolute top-4 left-1/2 -translate-x-1/2 w-[40%] h-20 bg-aurora-gold/20 border-2 border-aurora-gold rounded-lg flex items-center justify-center z-0">
            <h3 className='font-headline text-xl text-aurora-soft-gold italic flex items-center gap-2'><Crown /> Main Stage</h3>
          </div>
          
           <Popover>
            <PopoverTrigger asChild>
                <Button variant="outline" className="absolute top-6 right-6 z-20" data-print-hide> <Plus className="mr-2"/> Add Table</Button>
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
              <DraggableTableWrapper key={table.id} table={table} onPositionChange={handleTablePositionChange}>
                  <TableDropzone
                      id={table.id}
                      table={table}
                      guests={table.guests}
                      isOver={!!activeDrag && findContainer(activeDrag.id as string) !== table.id && findContainer(activeDrag.id as string) !== 'unseated'}
                      isAtCapacity={!!activeDrag && table.guests.length >= table.capacity}
                      justFilled={justFilledTable === table.id}
                      hasConflict={tableConflicts[table.id] ?? false}
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
        <DragOverlay>
            {activeGuest ? <GuestPill guest={activeGuest} isOverlay /> : null}
        </DragOverlay>
      </DndContext>
      </div>
    </div>
  );
}
