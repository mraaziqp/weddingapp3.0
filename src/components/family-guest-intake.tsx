'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Users, PlusCircle, Trash2, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { fetchHouseholds, addHousehold, deleteHousehold } from '@/lib/supabase';
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

export function FamilyGuestIntake({ side }: { side: 'bride' | 'groom' }) {
  const config = SIDE_CONFIG[side];
  const [households, setHouseholds] = useState<Household[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [justAdded, setJustAdded] = useState<string | null>(null);
  const { toast } = useToast();

  const { register, control, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<IntakeValues>({
    resolver: zodResolver(intakeSchema),
    defaultValues: { householdName: '', guests: [{ firstName: '', lastName: '' }] },
  });
  const { fields, append, remove } = useFieldArray({ control, name: 'guests' });

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

  const onSubmit = async (data: IntakeValues) => {
    try {
      const newHousehold = await addHousehold(
        data.householdName,
        data.guests.map(g => ({ ...g, tags: [config.tag] }))
      );
      setHouseholds(current => [newHousehold, ...current]);
      setJustAdded(newHousehold.name);
      reset({ householdName: '', guests: [{ firstName: '', lastName: '' }] });
      toast({ title: 'Added!', description: `${data.householdName} is on the guest list.` });
      setTimeout(() => setJustAdded(null), 4000);
    } catch {
      toast({ variant: 'destructive', title: 'Could not add that household', description: 'Please try again.' });
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

  const mySideHouseholds = households.filter(h => h.guests.some(g => g.tags?.includes(config.tag)));

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_20%_10%,rgba(212,175,55,0.12),transparent_40%),linear-gradient(160deg,#0a0f0c,#050705)] px-4 py-10 text-white">
      <div className="mx-auto max-w-xl space-y-6">
        <div className="text-center space-y-2">
          <p className="font-headline text-4xl italic text-luxe-gradient">Add Your Guests</p>
          <p className="text-white/60 text-sm">{config.label} &middot; Razia &amp; Abduraziq&apos;s Wedding</p>
          <p className="text-white/40 text-xs max-w-sm mx-auto">
            Add each family or household you know from your side. Group people who live together
            (e.g. a couple, or parents + kids) into one entry so they get one invite.
          </p>
        </div>

        <Card className="glass-card border-white/10">
          <CardContent className="pt-6">
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
                <PlusCircle size={16} className="mr-2" />
                {isSubmitting ? 'Adding…' : 'Add to Guest List'}
              </Button>

              {justAdded && (
                <motion.p
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-2 text-sm text-emerald-400"
                >
                  <CheckCircle2 size={15} /> {justAdded} added — it now shows up for the couple instantly.
                </motion.p>
              )}
            </form>
          </CardContent>
        </Card>

        <div className="space-y-2">
          <p className="text-xs uppercase tracking-widest text-white/40 flex items-center gap-2">
            <Users size={13} /> Added from {config.label} so far ({mySideHouseholds.reduce((sum, h) => sum + h.guests.length, 0)} guests)
          </p>
          {isLoading ? (
            <p className="text-white/40 text-sm">Loading…</p>
          ) : mySideHouseholds.length === 0 ? (
            <p className="text-white/40 text-sm">No one added yet — be the first!</p>
          ) : (
            <div className="space-y-2">
              {mySideHouseholds.map(h => (
                <div key={h.id} className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 px-4 py-2.5">
                  <div>
                    <p className="text-sm font-medium">{h.name}</p>
                    <p className="text-xs text-white/50">{h.guests.map(g => `${g.firstName} ${g.lastName}`).join(', ')}</p>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => handleRemove(h)}>
                    <Trash2 size={15} className="text-red-400/70" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
