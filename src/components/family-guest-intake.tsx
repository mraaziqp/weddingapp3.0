'use client';

import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Users, Trash2, CheckCircle2, Pencil, Search, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { fetchHouseholds, addHousehold, updateHousehold, deleteHousehold } from '@/lib/supabase';
import type { Household, GuestTag } from '@/lib/types';

const intakeSchema = z.object({
  householdName: z.string().min(1, "Family/household name is required (e.g. 'The Khan Family')"),
  guests: z.array(z.object({
    firstName: z.string().min(1, 'First name is required'),
    lastName: z.string().min(1, 'Last name is required'),
  })).min(1, 'Add at least one guest'),
});

type IntakeValues = z.infer<typeof intakeSchema>;

const SIDE_CONFIG = {
  bride: { label: "Razia's Family & Friends", tag: "Bride's Family" as GuestTag },
  groom: { label: "Abduraziq's Family & Friends", tag: "Groom's Family" as GuestTag },
};

/** Shared add/edit form for a household with any number of guests. */
function HouseholdForm({
  defaultValues,
  onSubmit,
  submitLabel,
}: {
  defaultValues: IntakeValues;
  onSubmit: (data: IntakeValues) => Promise<void>;
  submitLabel: string;
}) {
  const { register, control, handleSubmit, formState: { errors, isSubmitting } } = useForm<IntakeValues>({
    resolver: zodResolver(intakeSchema),
    defaultValues,
  });
  const { fields, append, remove } = useFieldArray({ control, name: 'guests' });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <Label htmlFor="householdName">Family / Household Name</Label>
        <Input
          id="householdName"
          {...register('householdName')}
          placeholder="e.g. The Khan Family"
          className="mt-1"
          autoComplete="off"
        />
        {errors.householdName && <p className="text-red-400 text-xs mt-1">{errors.householdName.message}</p>}
      </div>

      <div className="space-y-2">
        <Label>Guests in this household</Label>
        {fields.map((field, index) => (
          <div key={field.id} className="flex gap-2 items-center">
            <Input {...register(`guests.${index}.firstName`)} placeholder="First name" autoComplete="off" />
            <Input {...register(`guests.${index}.lastName`)} placeholder="Last name" autoComplete="off" />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => remove(index)}
              disabled={fields.length === 1}
            >
              <Trash2 className="h-4 w-4 text-red-400" />
            </Button>
          </div>
        ))}
        {errors.guests && <p className="text-red-400 text-xs">{errors.guests.message as string}</p>}
        <Button type="button" variant="outline" size="sm" onClick={() => append({ firstName: '', lastName: '' })}>
          + Add another guest to this household
        </Button>
      </div>

      <Button type="submit" disabled={isSubmitting} className="w-full bg-[#d4af37] text-black hover:bg-[#c49f2f]">
        {isSubmitting ? 'Saving…' : submitLabel}
      </Button>
    </form>
  );
}

/** Fastest path for one person — no household name required. */
function QuickAddPerson({ onDone, tag }: { onDone: () => void; tag: GuestTag }) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim() || !lastName.trim()) {
      toast({ variant: 'destructive', title: 'Please fill in both names' });
      return;
    }
    setSaving(true);
    try {
      await addHousehold(`${firstName.trim()} ${lastName.trim()}`, [
        { firstName: firstName.trim(), lastName: lastName.trim(), tags: [tag] },
      ]);
      toast({ title: 'Added!', description: `${firstName.trim()} ${lastName.trim()} is on the guest list.` });
      setFirstName('');
      setLastName('');
      onDone();
    } catch {
      toast({ variant: 'destructive', title: 'Could not add that guest', description: 'Please try again.' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-3 sm:flex-row sm:items-end">
      <div className="flex-1">
        <Label htmlFor="qa-first">First name</Label>
        <Input id="qa-first" value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="First name" className="mt-1" autoComplete="off" />
      </div>
      <div className="flex-1">
        <Label htmlFor="qa-last">Last name</Label>
        <Input id="qa-last" value={lastName} onChange={e => setLastName(e.target.value)} placeholder="Last name" className="mt-1" autoComplete="off" />
      </div>
      <Button type="submit" disabled={saving} className="bg-[#d4af37] text-black hover:bg-[#c49f2f] sm:w-auto">
        <UserPlus size={16} className="mr-2" />
        {saving ? 'Adding…' : 'Add'}
      </Button>
    </form>
  );
}

export function FamilyGuestIntake({ side }: { side: 'bride' | 'groom' }) {
  const config = SIDE_CONFIG[side];
  const [households, setHouseholds] = useState<Household[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [justAdded, setJustAdded] = useState<string | null>(null);
  const [mode, setMode] = useState<'household' | 'person'>('household');
  const [editingHousehold, setEditingHousehold] = useState<Household | null>(null);
  const [search, setSearch] = useState('');
  const { toast } = useToast();

  const loadHouseholds = () => {
    fetchHouseholds()
      .then(setHouseholds)
      .catch(() => toast({ variant: 'destructive', title: 'Could not load the guest list' }))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    loadHouseholds();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onAddHousehold = async (data: IntakeValues) => {
    try {
      const newHousehold = await addHousehold(
        data.householdName,
        data.guests.map(g => ({ ...g, tags: [config.tag] }))
      );
      setHouseholds(current => [newHousehold, ...current]);
      setJustAdded(newHousehold.name);
      toast({ title: 'Added!', description: `${data.householdName} is on the guest list.` });
      setTimeout(() => setJustAdded(null), 4000);
    } catch {
      toast({ variant: 'destructive', title: 'Could not add that household', description: 'Please try again.' });
    }
  };

  const onSaveEdit = async (data: IntakeValues) => {
    if (!editingHousehold) return;
    try {
      const guestsWithIds = data.guests.map((g, i) => ({
        ...g,
        id: editingHousehold.guests[i]?.id,
        rsvpStatus: editingHousehold.guests[i]?.rsvpStatus ?? 'Pending',
      }));
      await updateHousehold(editingHousehold.id, data.householdName, guestsWithIds);
      loadHouseholds();
      toast({ title: 'Saved', description: `${data.householdName} has been updated.` });
      setEditingHousehold(null);
    } catch {
      toast({ variant: 'destructive', title: 'Could not save changes', description: 'Please try again.' });
    }
  };

  const handleRemove = async (household: Household) => {
    if (!window.confirm(`Remove "${household.name}" and all ${household.guests.length} guest(s)?`)) return;
    try {
      await deleteHousehold(household.id);
      setHouseholds(current => current.filter(h => h.id !== household.id));
    } catch {
      toast({ variant: 'destructive', title: 'Could not remove that household' });
    }
  };

  const mySideHouseholds = useMemo(
    () => households.filter(h => h.guests.some(g => g.tags?.includes(config.tag))),
    [households, config.tag]
  );

  const filteredHouseholds = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return mySideHouseholds;
    return mySideHouseholds.filter(h =>
      h.name.toLowerCase().includes(q) ||
      h.guests.some(g => `${g.firstName} ${g.lastName}`.toLowerCase().includes(q))
    );
  }, [mySideHouseholds, search]);

  const totalGuestCount = mySideHouseholds.reduce((sum, h) => sum + h.guests.length, 0);

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_20%_10%,rgba(212,175,55,0.12),transparent_40%),linear-gradient(160deg,#0a0f0c,#050705)] px-4 py-10 text-white">
      <div className="mx-auto max-w-xl space-y-6">
        <div className="text-center space-y-2">
          <p className="font-headline text-4xl italic text-luxe-gradient">Add Your Guests</p>
          <p className="text-white/60 text-sm">{config.label} &middot; Razia &amp; Abduraziq&apos;s Wedding</p>
          <p className="text-white/40 text-xs max-w-sm mx-auto">
            Add each family or household you know from your side. Group people who live together
            (e.g. a couple, or parents + kids) into one entry so they get one invite. Adding one
            person on their own? Use the &ldquo;One person&rdquo; tab — no household name needed.
          </p>
        </div>

        <Card className="glass-card border-white/10">
          <CardContent className="pt-6 space-y-4">
            <div className="flex gap-2 rounded-lg border border-white/10 bg-white/5 p-1">
              <button
                type="button"
                onClick={() => setMode('household')}
                className={`flex-1 rounded-md py-2 text-sm font-medium transition-colors ${
                  mode === 'household' ? 'bg-[#d4af37] text-black' : 'text-white/60 hover:text-white'
                }`}
              >
                Family / Household
              </button>
              <button
                type="button"
                onClick={() => setMode('person')}
                className={`flex-1 rounded-md py-2 text-sm font-medium transition-colors ${
                  mode === 'person' ? 'bg-[#d4af37] text-black' : 'text-white/60 hover:text-white'
                }`}
              >
                One Person
              </button>
            </div>

            {mode === 'household' ? (
              <HouseholdForm
                key="add-household"
                defaultValues={{ householdName: '', guests: [{ firstName: '', lastName: '' }] }}
                onSubmit={onAddHousehold}
                submitLabel="Add to Guest List"
              />
            ) : (
              <QuickAddPerson tag={config.tag} onDone={loadHouseholds} />
            )}

            {justAdded && (
              <motion.p
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-2 text-sm text-emerald-400"
              >
                <CheckCircle2 size={15} /> {justAdded} added — it now shows up for the couple instantly.
              </motion.p>
            )}
          </CardContent>
        </Card>

        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs uppercase tracking-widest text-white/40 flex items-center gap-2">
              <Users size={13} /> Added so far ({totalGuestCount} guests)
            </p>
          </div>

          {mySideHouseholds.length > 6 && (
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-white/30" />
              <Input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search names…"
                className="h-9 border-white/15 bg-white/5 pl-9 text-sm"
              />
            </div>
          )}

          {isLoading ? (
            <p className="text-white/40 text-sm">Loading…</p>
          ) : filteredHouseholds.length === 0 ? (
            <p className="text-white/40 text-sm">
              {mySideHouseholds.length === 0 ? 'No one added yet — be the first!' : 'No names match your search.'}
            </p>
          ) : (
            <div className="space-y-2">
              {filteredHouseholds.map(h => (
                <div key={h.id} className="flex items-center justify-between gap-2 rounded-lg border border-white/10 bg-white/5 px-4 py-2.5">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{h.name}</p>
                    <p className="text-xs text-white/50 truncate">{h.guests.map(g => `${g.firstName} ${g.lastName}`).join(', ')}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <Button variant="ghost" size="icon" onClick={() => setEditingHousehold(h)} aria-label={`Edit ${h.name}`}>
                      <Pencil size={14} className="text-white/60" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleRemove(h)} aria-label={`Remove ${h.name}`}>
                      <Trash2 size={15} className="text-red-400/70" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <Dialog open={!!editingHousehold} onOpenChange={open => { if (!open) setEditingHousehold(null); }}>
        <DialogContent className="glass-card border-white/10 text-white">
          <DialogHeader>
            <DialogTitle className="font-headline text-2xl italic">Edit Household</DialogTitle>
          </DialogHeader>
          {editingHousehold && (
            <HouseholdForm
              key={editingHousehold.id}
              defaultValues={{
                householdName: editingHousehold.name,
                guests: editingHousehold.guests.map(g => ({ firstName: g.firstName, lastName: g.lastName })),
              }}
              onSubmit={onSaveEdit}
              submitLabel="Save Changes"
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
