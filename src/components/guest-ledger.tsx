"use client";

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { PlusCircle, MoreHorizontal, Trash2, Download, Pencil, Link2, Copy } from 'lucide-react';
import { households as initialHouseholds } from '@/lib/mock-data';
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

function HouseholdForm({
    defaultValues,
    onSubmit,
    submitLabel,
}: {
    defaultValues: HouseholdFormValues;
    onSubmit: (data: HouseholdFormValues) => void;
    submitLabel: string;
}) {
    const { register, control, handleSubmit, formState: { errors } } = useForm<HouseholdFormValues>({
        resolver: zodResolver(householdSchema),
        defaultValues,
    });
    const { fields, append, remove } = useFieldArray({ control, name: 'guests' });

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
                <Label htmlFor="name">Household Name</Label>
                <Input id="name" {...register('name')} placeholder="e.g., The Smith Family" className="mt-1" />
                {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
            </div>
            <div className="space-y-2">
                <Label>Guests</Label>
                {fields.map((field, index) => (
                    <div key={field.id} className="flex gap-2 items-center">
                        <Input {...register(`guests.${index}.firstName`)} placeholder="First Name" />
                        <Input {...register(`guests.${index}.lastName`)} placeholder="Last Name" />
                        <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)} disabled={fields.length === 1}>
                            <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                    </div>
                ))}
                {errors.guests && <p className="text-red-500 text-xs mt-1">{errors.guests.message as string}</p>}
                <Button type="button" variant="outline" size="sm" onClick={() => append({ firstName: '', lastName: '' })}>
                    + Add Guest
                </Button>
            </div>
            <Button type="submit" className="w-full">{submitLabel}</Button>
        </form>
    );
}

export function GuestLedger() {
    const [households, setHouseholds] = useState<Household[]>(initialHouseholds);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [editingHousehold, setEditingHousehold] = useState<Household | null>(null);
    const [deletingHousehold, setDeletingHousehold] = useState<Household | null>(null);
    const { toast } = useToast();

    const handleAddHousehold = (data: HouseholdFormValues) => {
        const ts = Date.now();
        const newHousehold: Household = {
            id: `household-${ts}`,
            name: data.name,
            address: 'TBD',
            qrCode: `WEDU-HH-${ts}`,
            guests: data.guests.map((g, i) => ({
                id: `guest-${ts}-${i}`,
                householdId: `household-${ts}`,
                firstName: g.firstName,
                lastName: g.lastName,
                rsvpStatus: 'Pending',
            })),
        };
        setHouseholds(current => [newHousehold, ...current]);
        toast({ title: 'Household Added', description: `${data.name} has been added to the guest list.` });
        setIsAddModalOpen(false);
    };

    const handleEditHousehold = (data: HouseholdFormValues) => {
        if (!editingHousehold) return;
        const updated: Household = {
            ...editingHousehold,
            name: data.name,
            guests: data.guests.map((g, i) => {
                const existing = editingHousehold.guests[i];
                return {
                    id: existing?.id ?? `guest-${Date.now()}-${i}`,
                    householdId: editingHousehold.id,
                    firstName: g.firstName,
                    lastName: g.lastName,
                    rsvpStatus: existing?.rsvpStatus ?? 'Pending',
                    dietaryRestrictions: existing?.dietaryRestrictions,
                    songRequest: existing?.songRequest,
                    tags: existing?.tags,
                };
            }),
        };
        setHouseholds(current => current.map(h => h.id === editingHousehold.id ? updated : h));
        toast({ title: 'Household Updated', description: `${data.name} has been saved.` });
        setEditingHousehold(null);
    };

    const handleDeleteHousehold = (household: Household) => {
        setHouseholds(current => current.filter(h => h.id !== household.id));
        toast({ title: 'Household Removed', description: `${household.name} has been deleted.` });
        setDeletingHousehold(null);
    };

    const handleCopyInviteLink = (household: Household) => {
        const link = `${window.location.origin}/invite/${household.qrCode}`;
        navigator.clipboard.writeText(link).then(() => {
            toast({ title: 'Invite Link Copied!', description: link });
        });
    };

    const handleRsvpChange = (guestId: string, newStatus: "Confirmed" | "Pending" | "Regret") => {
        setHouseholds(current =>
            current.map(h => ({
                ...h,
                guests: h.guests.map(g => g.id === guestId ? { ...g, rsvpStatus: newStatus } : g),
            }))
        );
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
                    <DialogTrigger asChild>
                        <Button variant="outline" className="gap-2">
                            <PlusCircle size={16} /> Add Household
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="glass-card border-white/10 text-foreground">
                        <DialogHeader>
                            <DialogTitle className="font-headline text-2xl italic">New Household</DialogTitle>
                        </DialogHeader>
                        <HouseholdForm
                            defaultValues={{ name: '', guests: [{ firstName: '', lastName: '' }] }}
                            onSubmit={handleAddHousehold}
                            submitLabel="Add Household"
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
                                {households.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                                            No households yet. Click <strong>Add Household</strong> to get started.
                                        </TableCell>
                                    </TableRow>
                                )}
                                {households.map((household) => (
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
                                                {household.guests.map(guest => (
                                                    <Popover key={guest.id}>
                                                        <PopoverTrigger asChild>
                                                            <button className="flex items-center gap-1 group">
                                                                <motion.div
                                                                    className={cn("h-3 w-3 rounded-full cursor-pointer", statusColors[guest.rsvpStatus])}
                                                                    animate={{ scale: [1, 1.2, 1] }}
                                                                    transition={{ duration: 1.5, repeat: Infinity, delay: Math.random() }}
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
