"use client";

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { PlusCircle, UserPlus, MoreHorizontal, Trash2, Download, Pencil, Link2, Copy } from 'lucide-react';
import { fetchHouseholds, addHousehold, addGuestToHousehold, updateHousehold, deleteHousehold, updateGuestRsvp } from '@/lib/supabase';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import type { Household } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { useToast } from '@/hooks/use-toast';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from './ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from './ui/alert-dialog';

const statusColors = {
    Confirmed: 'bg-green-500',
    Pending: 'bg-yellow-500',
    Regret: 'bg-red-500',
};

const householdSchema = z.object({
    name: z.string().min(1, 'Household name is required'),
    guests: z.array(z.object({
        firstName: z.string().min(1, 'First name is required'),
        lastName: z.string().min(1, 'Last name is required'),
    })).min(1, 'At least one guest is required'),
});

type HouseholdFormValues = z.infer<typeof householdSchema>;

/** Quick-add one person: either as their own invite or into an existing household. */
function AddGuestForm({
    households,
    onDone,
}: {
    households: Household[];
    onDone: () => void;
}) {
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [target, setTarget] = useState<string>('own');
    const [saving, setSaving] = useState(false);
    const { toast } = useToast();

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!firstName.trim() || !lastName.trim()) {
            toast({ variant: 'destructive', title: 'Please fill in both names' });
            return;
        }
        setSaving(true);
        const person = { firstName: firstName.trim(), lastName: lastName.trim() };
        try {
            if (target === 'own') {
                await addHousehold(`${person.firstName} ${person.lastName}`, [person]);
            } else if (target === 'new-multi') {
                await addHousehold(`The ${person.lastName} Family`, [person]);
            } else {
                await addGuestToHousehold(target, person);
            }
            toast({ title: 'Guest added', description: `${person.firstName} ${person.lastName} is on the list.` });
            onDone();
        } catch {
            toast({ variant: 'destructive', title: 'Failed to add guest' });
        } finally {
            setSaving(false);
        }
    };

    return (
        <form onSubmit={submit} className="space-y-4">
            <div className="flex gap-2">
                <div className="flex-1">
                    <Label htmlFor="ag-first">First Name</Label>
                    <Input id="ag-first" value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="First name" className="mt-1" autoFocus />
                </div>
                <div className="flex-1">
                    <Label htmlFor="ag-last">Last Name</Label>
                    <Input id="ag-last" value={lastName} onChange={e => setLastName(e.target.value)} placeholder="Last name" className="mt-1" />
                </div>
            </div>
            <div>
                <Label>Invite</Label>
                <Select value={target} onValueChange={setTarget}>
                    <SelectTrigger className="mt-1">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="glass-card border-white/10 max-h-64">
                        <SelectItem value="own">✨ Their own invite (single guest)</SelectItem>
                        <SelectItem value="new-multi">✨ Create a new household (multi-guest invite)</SelectItem>
                        {households.map(h => (
                            <SelectItem key={h.id} value={h.id}>
                                Join: {h.name} ({h.guests.length} {h.guests.length === 1 ? 'guest' : 'guests'})
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                <p className="mt-1.5 text-xs text-muted-foreground">
                    &ldquo;Their own invite&rdquo; creates a solo guest invite. &ldquo;Create a new household&rdquo; creates a multi-guest family invite. Joining a household adds them to an existing invite.
                </p>
            </div>
            <Button type="submit" disabled={saving} className="w-full">
                {saving ? 'Adding…' : 'Add Guest'}
            </Button>
        </form>
    );
}

function HouseholdForm({
    defaultValues,
    onSubmit,
    submitLabel,
    mode = 'multi',
}: {
    defaultValues: HouseholdFormValues;
    onSubmit: (data: HouseholdFormValues) => void;
    submitLabel: string;
    /** 'single' hides the household name field and locks the form to one guest. */
    mode?: 'single' | 'multi';
}) {
    const { register, control, handleSubmit, watch, formState: { errors } } = useForm<HouseholdFormValues>({
        resolver: zodResolver(householdSchema),
        defaultValues,
    });
    const { fields, append, remove } = useFieldArray({ control, name: 'guests' });
    const isSingle = mode === 'single';
    const firstGuest = watch('guests.0');

    return (
        <form
            onSubmit={handleSubmit((data) =>
                onSubmit(isSingle ? { ...data, name: `${data.guests[0].firstName} ${data.guests[0].lastName}` } : data)
            )}
            className="space-y-4"
        >
            {!isSingle && (
                <div>
                    <Label htmlFor="name">Household Name</Label>
                    <Input id="name" {...register('name')} placeholder="e.g., The Smith Family" className="mt-1" />
                    {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
                </div>
            )}
            <div className="space-y-2">
                <Label>{isSingle ? 'Guest' : 'Guests'}</Label>
                {fields.slice(0, isSingle ? 1 : undefined).map((field, index) => (
                    <div key={field.id} className="flex gap-2 items-center">
                        <Input {...register(`guests.${index}.firstName`)} placeholder="First Name" />
                        <Input {...register(`guests.${index}.lastName`)} placeholder="Last Name" />
                        {!isSingle && (
                            <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)} disabled={fields.length === 1}>
                                <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                        )}
                    </div>
                ))}
                {errors.guests && <p className="text-red-500 text-xs mt-1">{errors.guests.message as string}</p>}
                {!isSingle && (
                    <Button type="button" variant="outline" size="sm" onClick={() => append({ firstName: '', lastName: '' })}>
                        + Add Guest
                    </Button>
                )}
                {isSingle && firstGuest?.firstName && firstGuest?.lastName && (
                    <p className="text-xs text-muted-foreground">
                        Gets their own invite as &ldquo;{firstGuest.firstName} {firstGuest.lastName}&rdquo;.
                    </p>
                )}
            </div>
            <Button type="submit" className="w-full">{submitLabel}</Button>
        </form>
    );
}

export function GuestLedger() {
    const [households, setHouseholds] = useState<Household[]>([]);
    const [loading, setLoading] = useState(true);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [addMode, setAddMode] = useState<'single' | 'multi'>('multi');
    const [isAddGuestOpen, setIsAddGuestOpen] = useState(false);
    const [editingHousehold, setEditingHousehold] = useState<Household | null>(null);
    const [deletingHousehold, setDeletingHousehold] = useState<Household | null>(null);
    const { toast } = useToast();

    // Load from Supabase on mount
    useEffect(() => {
        fetchHouseholds()
            .then(setHouseholds)
            .catch(() => toast({ variant: 'destructive', title: 'Could not load guests' }))
            .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleAddHousehold = async (data: HouseholdFormValues) => {
        try {
            const newHousehold = await addHousehold(data.name, data.guests);
            setHouseholds(current => [newHousehold, ...current]);
            toast({ title: 'Household Added', description: `${data.name} has been added.` });
            setIsAddModalOpen(false);
        } catch {
            toast({ variant: 'destructive', title: 'Failed to add household' });
        }
    };

    const handleEditHousehold = async (data: HouseholdFormValues) => {
        if (!editingHousehold) return;
        try {
            const guestsWithIds = data.guests.map((g, i) => ({
                ...g,
                id: editingHousehold.guests[i]?.id,
                rsvpStatus: editingHousehold.guests[i]?.rsvpStatus ?? 'Pending',
            }));
            await updateHousehold(editingHousehold.id, data.name, guestsWithIds);
            // Reload to get fresh state
            const updated = await fetchHouseholds();
            setHouseholds(updated);
            toast({ title: 'Household Updated', description: `${data.name} has been saved.` });
            setEditingHousehold(null);
        } catch {
            toast({ variant: 'destructive', title: 'Failed to update household' });
        }
    };

    const handleDeleteHousehold = async (household: Household) => {
        try {
            await deleteHousehold(household.id);
            setHouseholds(current => current.filter(h => h.id !== household.id));
            toast({ title: 'Household Removed', description: `${household.name} has been deleted.` });
        } catch {
            toast({ variant: 'destructive', title: 'Failed to delete household' });
        } finally {
            setDeletingHousehold(null);
        }
    };

    const handleCopyInviteLink = (household: Household) => {
        const link = `${window.location.origin}/invite/${household.qrCode}`;
        navigator.clipboard.writeText(link).then(() => {
            toast({ title: 'Invite Link Copied!', description: link });
        });
    };

    const handleRsvpChange = async (guestId: string, newStatus: 'Confirmed' | 'Pending' | 'Regret') => {
        // Optimistic update
        setHouseholds(current =>
            current.map(h => ({
                ...h,
                guests: h.guests.map(g => g.id === guestId ? { ...g, rsvpStatus: newStatus } : g),
            }))
        );
        try {
            await updateGuestRsvp(guestId, newStatus);
        } catch {
            toast({ variant: 'destructive', title: 'Failed to update RSVP' });
            // Revert on error
            const fresh = await fetchHouseholds();
            setHouseholds(fresh);
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex-1 flex flex-col relative gap-3"
        >
            {/* Action bar */}
            <div className="flex items-center justify-between gap-3 flex-wrap">
                <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" className="gap-2 text-[#d4af37] border-[#d4af37]/35 bg-[#d4af37]/5 hover:bg-[#d4af37]/10">
                                <PlusCircle size={16} /> Add Household
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="glass-card border-white/10">
                            <DropdownMenuItem onClick={() => { setAddMode('single'); setIsAddModalOpen(true); }} className="gap-2 cursor-pointer text-white hover:bg-white/10">
                                Single Invite
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => { setAddMode('multi'); setIsAddModalOpen(true); }} className="gap-2 cursor-pointer text-white hover:bg-white/10">
                                Multi Invite (Household)
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                    <DialogContent className="glass-card border-white/10 text-foreground">
                        <DialogHeader>
                            <DialogTitle className="font-headline text-2xl italic">
                                {addMode === 'single' ? 'New Single Invite' : 'New Multi Invite (Household)'}
                            </DialogTitle>
                        </DialogHeader>
                        <HouseholdForm
                            key={addMode}
                            defaultValues={{ name: '', guests: [{ firstName: '', lastName: '' }] }}
                            onSubmit={handleAddHousehold}
                            submitLabel={addMode === 'single' ? 'Add Single Guest' : 'Add Household'}
                            mode={addMode}
                        />
                    </DialogContent>
                </Dialog>

                <Dialog open={isAddGuestOpen} onOpenChange={setIsAddGuestOpen}>
                    <DialogTrigger asChild>
                        <Button variant="outline" className="gap-2">
                            <UserPlus size={16} /> Add Guest
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="glass-card border-white/10 text-foreground">
                        <DialogHeader>
                            <DialogTitle className="font-headline text-2xl italic">Add a Guest</DialogTitle>
                        </DialogHeader>
                        <AddGuestForm
                            households={households}
                            onDone={async () => {
                                setIsAddGuestOpen(false);
                                const fresh = await fetchHouseholds();
                                setHouseholds(fresh);
                            }}
                        />
                    </DialogContent>
                </Dialog>

                <a
                    href="/api/export/guests"
                    download="wedu-guest-manifest.csv"
                    className="inline-flex items-center gap-2 rounded-md border border-[#d4af37]/50 bg-[#d4af37]/10 px-4 py-2 text-sm font-medium text-[#f6e7b7] hover:bg-[#d4af37]/20 transition-colors"
                >
                    <Download size={15} />
                    Export Manifest (.csv)
                </a>
            </div>

            <Card className="glass-card flex-1">
                <CardContent className="p-0 h-full">
                    <div className="overflow-y-auto h-full">
                        <Table>
                            <TableHeader className="sticky top-0 bg-black/20 backdrop-blur-sm z-10">
                                <TableRow className="border-white/10 hover:bg-white/5">
                                    <TableHead>Household</TableHead>
                                    <TableHead>Members</TableHead>
                                    <TableHead>RSVP Status</TableHead>
                                    <TableHead>Invite</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading && (
                                    <TableRow>
                                        <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                                            Loading guests...
                                        </TableCell>
                                    </TableRow>
                                )}
                                {!loading && households.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                                            No households yet. Click <strong>Add Household</strong> to get started.
                                        </TableCell>
                                    </TableRow>
                                )}
                                {!loading && households.map((household) => (
                                    <TableRow key={household.id} className="border-white/10 hover:bg-white/5">
                                        <TableCell className="font-medium">
                                            <div>{household.name}</div>
                                            <div className="text-xs text-muted-foreground mt-0.5">
                                                {household.guests.map(g => g.firstName).join(', ')}
                                            </div>
                                        </TableCell>
                                        <TableCell>{household.guests.length}</TableCell>
                                        <TableCell>
                                            <div className="flex gap-2 items-center flex-wrap">
                                                {household.guests.map((guest, guestIdx) => (
                                                    <Popover key={guest.id}>
                                                        <PopoverTrigger asChild>
                                                            <button className="flex items-center gap-1 group">
                                                                <motion.div
                                                                    className={cn("h-3 w-3 rounded-full cursor-pointer", statusColors[guest.rsvpStatus])}
                                                                    animate={{ scale: [1, 1.2, 1] }}
                                                                    transition={{ duration: 1.5, repeat: Infinity, delay: (guestIdx * 0.37) % 2 }}
                                                                />
                                                                <span className="text-xs text-muted-foreground group-hover:text-foreground transition-colors">{guest.firstName}</span>
                                                            </button>
                                                        </PopoverTrigger>
                                                        <PopoverContent className="w-auto p-2 glass-card">
                                                            <div className="flex flex-col gap-1">
                                                                <p className="text-xs font-bold px-2">{guest.firstName} {guest.lastName}</p>
                                                                <Button variant="ghost" size="sm" onClick={() => handleRsvpChange(guest.id, 'Confirmed')}>✓ Confirmed</Button>
                                                                <Button variant="ghost" size="sm" onClick={() => handleRsvpChange(guest.id, 'Pending')}>◷ Pending</Button>
                                                                <Button variant="ghost" size="sm" onClick={() => handleRsvpChange(guest.id, 'Regret')}>✕ Regret</Button>
                                                            </div>
                                                        </PopoverContent>
                                                    </Popover>
                                                ))}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="gap-1.5 text-[#d4af37] hover:text-[#d4af37] hover:bg-[#d4af37]/10"
                                                onClick={() => handleCopyInviteLink(household)}
                                            >
                                                <Copy size={13} />
                                                Copy Link
                                            </Button>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8">
                                                        <MoreHorizontal className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end" className="glass-card border-white/10">
                                                    <DropdownMenuItem onClick={() => setEditingHousehold(household)} className="gap-2 cursor-pointer">
                                                        <Pencil size={14} /> Edit Household
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => handleCopyInviteLink(household)} className="gap-2 cursor-pointer">
                                                        <Link2 size={14} /> Copy Invite Link
                                                    </DropdownMenuItem>
                                                    <DropdownMenuSeparator className="bg-white/10" />
                                                    <DropdownMenuItem
                                                        onClick={() => setDeletingHousehold(household)}
                                                        className="gap-2 cursor-pointer text-red-400 focus:text-red-400"
                                                    >
                                                        <Trash2 size={14} /> Delete
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>

            {/* Edit Household Dialog */}
            <Dialog open={!!editingHousehold} onOpenChange={open => { if (!open) setEditingHousehold(null); }}>
                <DialogContent className="glass-card border-white/10 text-foreground">
                    <DialogHeader>
                        <DialogTitle className="font-headline text-2xl italic">Edit Household</DialogTitle>
                    </DialogHeader>
                    {editingHousehold && (
                        <HouseholdForm
                            key={editingHousehold.id}
                            defaultValues={{
                                name: editingHousehold.name,
                                guests: editingHousehold.guests.map(g => ({ firstName: g.firstName, lastName: g.lastName })),
                            }}
                            onSubmit={handleEditHousehold}
                            submitLabel="Save Changes"
                        />
                    )}
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation */}
            <AlertDialog open={!!deletingHousehold} onOpenChange={open => { if (!open) setDeletingHousehold(null); }}>
                <AlertDialogContent className="glass-card border-white/10 text-foreground">
                    <AlertDialogHeader>
                        <AlertDialogTitle>Remove {deletingHousehold?.name}?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will permanently delete this household and all {deletingHousehold?.guests.length} guest(s). This cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            className="bg-red-600 hover:bg-red-700"
                            onClick={() => deletingHousehold && handleDeleteHousehold(deletingHousehold)}
                        >
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </motion.div>
    );
}
