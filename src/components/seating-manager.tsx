'use client';

import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Printer, Users, AlertTriangle } from 'lucide-react';
import { useRealGuests } from '@/hooks/use-real-guests';
import { TAG_LABELS } from '@/components/seating-chart';
import { cn } from '@/lib/utils';
import type { Table } from '@/lib/types';

/**
 * The printable, single-source-of-truth view of the seating plan built by
 * the Visual Planner tab (same `tables` data, no separate model). Always
 * mounted (see `visible`) so the Visual tab's Print button and this tab's
 * own Print button both produce the same clean, paginated list — the
 * absolute-positioned floor-plan canvas is never what actually prints.
 */
export function SeatingManager({ tables, visible }: { tables: Table[]; visible: boolean }) {
  const { households } = useRealGuests();

  const seatedGuestIds = useMemo(
    () => new Set(tables.flatMap(t => t.guests.map(g => g.id))),
    [tables]
  );

  const unseatedGuests = useMemo(
    () => households.flatMap(h => h.guests).filter(g => !seatedGuestIds.has(g.id)),
    [households, seatedGuestIds]
  );

  const sortedTables = useMemo(
    () => [...tables].sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true })),
    [tables]
  );

  const totalCapacity = tables.reduce((sum, t) => sum + t.capacity, 0);
  const totalSeated = tables.reduce((sum, t) => sum + t.guests.length, 0);

  return (
    <div id="seating-list-print" className={cn(!visible && 'hidden')}>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3" data-print-hide>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: 'Tables', value: tables.length },
              { label: 'Total Capacity', value: totalCapacity },
              { label: 'Seated', value: totalSeated },
              { label: 'Unseated', value: unseatedGuests.length },
            ].map(stat => (
              <Card key={stat.label} className="glass-card">
                <CardContent className="pt-4 pb-3 px-4">
                  <p className="text-[10px] uppercase tracking-widest text-white/50">{stat.label}</p>
                  <p className="text-2xl font-bold text-white">{stat.value}</p>
                </CardContent>
              </Card>
            ))}
          </div>
          <Button
            variant="outline"
            className="gap-2 border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/10"
            onClick={() => window.print()}
          >
            <Printer size={15} />
            Print / Save PDF
          </Button>
        </div>

        <div className="hidden print:block print:mb-4">
          <h1 className="text-2xl font-bold">Seating List</h1>
          <p className="text-sm text-black/60">
            {tables.length} tables · {totalSeated} seated · {unseatedGuests.length} unseated
          </p>
        </div>

        {tables.length === 0 ? (
          <p className="text-white/40 text-sm" data-print-hide>
            No tables yet — add tables from the Visual Planner tab.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 print:grid-cols-1 print:gap-2">
            {sortedTables.map(table => {
              const hasConflict = table.guests.filter(g => g.tags?.includes('Do Not Sit Together')).length >= 2;
              return (
                <Card
                  key={table.id}
                  className={cn(
                    'glass-card break-inside-avoid print:border print:border-black/20 print:bg-white print:text-black print:shadow-none',
                    hasConflict && 'border-red-500/40'
                  )}
                >
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center justify-between text-base">
                      <span>{table.name}</span>
                      <span className="text-xs font-normal text-white/50 print:text-black/60">
                        {table.guests.length}/{table.capacity} seated
                      </span>
                    </CardTitle>
                    {hasConflict && (
                      <p className="flex items-center gap-1 text-xs text-red-400 print:text-red-700" data-print-hide>
                        <AlertTriangle size={12} /> Conflicting guests seated together
                      </p>
                    )}
                  </CardHeader>
                  <CardContent className="space-y-1.5 pb-4">
                    {table.guests.length === 0 ? (
                      <p className="text-xs italic text-white/30 print:text-black/40">No guests seated</p>
                    ) : (
                      table.guests
                        .slice()
                        .sort((a, b) => a.firstName.localeCompare(b.firstName))
                        .map(guest => (
                          <div key={guest.id} className="flex items-center justify-between text-sm">
                            <span className="print:text-black">{guest.firstName} {guest.lastName}</span>
                            {guest.tags?.[0] && (
                              <span className="text-[10px] uppercase tracking-wide text-white/40 print:text-black/50">
                                {TAG_LABELS[guest.tags[0]] ?? guest.tags[0]}
                              </span>
                            )}
                          </div>
                        ))
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        <Card className="glass-card break-inside-avoid print:border print:border-black/20 print:bg-white print:text-black print:shadow-none">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Users size={16} className="print:hidden" /> Unseated Guests ({unseatedGuests.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {unseatedGuests.length === 0 ? (
              <p className="text-xs italic text-white/30 print:text-black/40">Everyone is seated 🎉</p>
            ) : (
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 sm:grid-cols-3 print:grid-cols-4">
                {unseatedGuests
                  .slice()
                  .sort((a, b) => a.firstName.localeCompare(b.firstName))
                  .map(guest => (
                    <span key={guest.id} className="text-sm print:text-black">
                      {guest.firstName} {guest.lastName}
                    </span>
                  ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
