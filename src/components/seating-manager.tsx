'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Trash2, Users, Edit2, Save, X, Maximize2, BarChart3 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { fetchHouseholds } from '@/lib/supabase';

interface Table {
  id: string;
  number: number;
  capacity: number;
  assignedGuests: string[];
  notes?: string;
}

interface SeatingAnalytics {
  totalTables: number;
  totalCapacity: number;
  assignedSeats: number;
  unassignedGuests: number;
  averageTableFill: number;
}

export function SeatingManager() {
  const [tables, setTables] = useState<Table[]>([]);
  const [unassignedGuests, setUnassignedGuests] = useState<string[]>([]);
  const [editingTable, setEditingTable] = useState<Table | null>(null);
  const [newTableCapacity, setNewTableCapacity] = useState('8');
  const { toast } = useToast();

  // Load the real guest list — no seats pre-assigned until you drag guests in.
  useEffect(() => {
    fetchHouseholds()
      .then(households => {
        const names = households.flatMap(h => h.guests.map(g => `${g.firstName} ${g.lastName}`));
        setUnassignedGuests(names);
      })
      .catch(() => setUnassignedGuests([]));
  }, []);

  const addTable = () => {
    const newTable: Table = {
      id: `table-${Date.now()}`,
      number: Math.max(...tables.map(t => t.number), 0) + 1,
      capacity: parseInt(newTableCapacity) || 8,
      assignedGuests: [],
    };
    setTables([...tables, newTable]);
    setNewTableCapacity('8');
    toast({ title: 'Table Added', description: `Table ${newTable.number} created` });
  };

  const deleteTable = (id: string) => {
    const table = tables.find(t => t.id === id);
    const guests = table?.assignedGuests || [];
    setTables(tables.filter(t => t.id !== id));
    setUnassignedGuests([...unassignedGuests, ...guests]);
    toast({ title: 'Table Removed' });
  };

  const assignGuest = (guestName: string, tableId: string) => {
    setTables(tables.map(t => {
      if (t.id === tableId && t.assignedGuests.length < t.capacity) {
        return { ...t, assignedGuests: [...t.assignedGuests, guestName] };
      }
      return t;
    }));
    setUnassignedGuests(unassignedGuests.filter(g => g !== guestName));
  };

  const removeGuest = (guestName: string, tableId: string) => {
    setTables(tables.map(t => {
      if (t.id === tableId) {
        return { ...t, assignedGuests: t.assignedGuests.filter(g => g !== guestName) };
      }
      return t;
    }));
    setUnassignedGuests([...unassignedGuests, guestName]);
  };

  // Calculate analytics
  const analytics: SeatingAnalytics = {
    totalTables: tables.length,
    totalCapacity: tables.reduce((sum, t) => sum + t.capacity, 0),
    assignedSeats: tables.reduce((sum, t) => sum + t.assignedGuests.length, 0),
    unassignedGuests: unassignedGuests.length,
    averageTableFill: tables.length > 0
      ? Math.round((tables.reduce((sum, t) => sum + t.assignedGuests.length, 0) / tables.reduce((sum, t) => sum + t.capacity, 0)) * 100)
      : 0,
  };

  return (
    <div className="space-y-8">
      {/* Analytics Cards */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="grid grid-cols-2 md:grid-cols-4 gap-4"
      >
        {[
          { label: 'Tables', value: analytics.totalTables, icon: '🎯' },
          { label: 'Total Capacity', value: analytics.totalCapacity, icon: '👥' },
          { label: 'Assigned', value: analytics.assignedSeats, icon: '✓' },
          { label: 'Avg Fill %', value: `${analytics.averageTableFill}%`, icon: '📊' },
        ].map((stat, i) => (
          <Card key={i} className="glass-card">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-white/60 uppercase tracking-wide mb-1">{stat.label}</p>
                  <p className="text-2xl font-bold text-white">{stat.value}</p>
                </div>
                <span className="text-3xl opacity-30">{stat.icon}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </motion.div>

      {/* Controls */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="flex gap-4 items-end"
      >
        <div className="flex-1">
          <label className="text-sm text-white/70 block mb-2">Table Capacity</label>
          <Input
            type="number"
            value={newTableCapacity}
            onChange={(e) => setNewTableCapacity(e.target.value)}
            placeholder="8"
            className="border-white/20"
          />
        </div>
        <Button onClick={addTable} className="bg-emerald-600 hover:bg-emerald-700">
          <Plus size={18} className="mr-2" />
          Add Table
        </Button>
      </motion.div>

      {/* Tables Grid */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
      >
        <AnimatePresence mode="popLayout">
          {tables.map((table, idx) => (
            <motion.div
              key={table.id}
              layout
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="h-fit"
            >
              <Card className="glass-card h-full flex flex-col hover:border-amber-400/50 transition-all">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-500 to-pink-500 flex items-center justify-center font-bold text-white">
                        {table.number}
                      </div>
                      <div>
                        <CardTitle className="text-lg">Table {table.number}</CardTitle>
                        <CardDescription className="text-xs">
                          {table.assignedGuests.length}/{table.capacity} seats
                        </CardDescription>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteTable(table.id)}
                      className="text-red-400 hover:text-red-300"
                    >
                      <Trash2 size={18} />
                    </Button>
                  </div>

                  {/* Capacity Bar */}
                  <div className="mt-3 space-y-1">
                    <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${(table.assignedGuests.length / table.capacity) * 100}%` }}
                        transition={{ type: 'spring' }}
                        className="h-full bg-gradient-to-r from-emerald-500 to-emerald-600"
                      />
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="flex-1 space-y-3">
                  {/* Assigned Guests */}
                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold text-white">Seated Guests</h4>
                    {table.assignedGuests.length > 0 ? (
                      <div className="space-y-1 max-h-40 overflow-y-auto">
                        {table.assignedGuests.map((guest, i) => (
                          <motion.div
                            key={i}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 10 }}
                            className="flex items-center justify-between p-2 bg-emerald-500/10 rounded border border-emerald-500/20 group"
                          >
                            <span className="text-sm text-white/80">{guest}</span>
                            <button
                              onClick={() => removeGuest(guest, table.id)}
                              className="opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <X size={14} className="text-red-400 hover:text-red-300" />
                            </button>
                          </motion.div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-white/50 italic">No guests assigned</p>
                    )}
                  </div>

                  {/* Add Guest */}
                  {table.assignedGuests.length < table.capacity && unassignedGuests.length > 0 && (
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm" className="w-full">
                          <Plus size={14} className="mr-2" />
                          Add Guest
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="glass-card">
                        <DialogHeader>
                          <DialogTitle>Assign Guest to Table {table.number}</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-2 max-h-60 overflow-y-auto py-4">
                          {unassignedGuests.map((guest) => (
                            <Button
                              key={guest}
                              variant="outline"
                              className="w-full justify-start text-left"
                              onClick={() => {
                                assignGuest(guest, table.id);
                              }}
                            >
                              + {guest}
                            </Button>
                          ))}
                        </div>
                      </DialogContent>
                    </Dialog>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </AnimatePresence>
      </motion.div>

      {/* Unassigned Guests Panel */}
      {unassignedGuests.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="glass-card border-yellow-500/30 bg-yellow-500/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Users className="text-yellow-500" size={20} />
                Unassigned Guests ({unassignedGuests.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                {unassignedGuests.map((guest) => (
                  <div
                    key={guest}
                    className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg text-sm text-white/80"
                  >
                    {guest}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  );
}
