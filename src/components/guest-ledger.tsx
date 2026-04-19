"use client";

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PlusCircle, Edit, MoreHorizontal, Trash2, Download } from 'lucide-react';
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

const AddHouseholdForm = ({ onAddHousehold, setOpen }: { onAddHousehold: (data: any) => void, setOpen: (open: boolean) => void }) => {
    const { register, control, handleSubmit, formState: { errors } } = useForm({
        resolver: zodResolver(householdSchema),
        defaultValues: {
            name: '',
            guests: [{ firstName: '', lastName: '' }],
        },
    });

    const { fields, append, remove } = useFieldArray({ control, name: 'guests' });
    const { toast } = useToast();

    const onSubmit = (data: z.infer<typeof householdSchema>) => {
        onAddHousehold(data);
        toast({ title: 'Household Added', description: `${data.name} has been added to the guest list.` });
        setOpen(false);
    };

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
                <Label htmlFor="name">Household Name</Label>
                <Input id="name" {...register('name')} placeholder="e.g., The Smith Family" />
                {errors.name && <p className="text-red-500 text-xs mt-1">{`${errors.name.message}`}</p>}
            </div>
            <div>
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
                {errors.guests && <p className="text-red-500 text-xs mt-1">{`${errors.guests.message}`}</p>}
                <Button type="button" variant="outline" size="sm" className="mt-2" onClick={() => append({ firstName: '', lastName: '' })}>
                    Add Guest
                </Button>
            </div>
            <Button type="submit" className="w-full">Save Household</Button>
        </form>
    );
};

export function GuestLedger() {
    const [households, setHouseholds] = useState<Household[]>(initialHouseholds);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);

    const handleAddHousehold = (data: { name: string; guests: { firstName: string; lastName: string }[] }) => {
        const newHousehold: Household = {
            id: `household-${Date.now()}`,
            name: data.name,
            address: 'TBD',
            qrCode: `WEDU-HH-${Date.now()}`,
            guests: data.guests.map((g, i) => ({
                id: `guest-${Date.now()}-${i}`,
                householdId: `household-${Date.now()}`,
                firstName: g.firstName,
                lastName: g.lastName,
                rsvpStatus: 'Pending',
            }))
        };
        setHouseholds(current => [newHousehold, ...current]);
    };
    
    const handleRsvpChange = (guestId: string, newStatus: "Confirmed" | "Pending" | "Regret") => {
        setHouseholds(currentHouseholds =>
            currentHouseholds.map(h => ({
                ...h,
                guests: h.guests.map(g => (g.id === guestId ? { ...g, rsvpStatus: newStatus } : g))
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
                        <AddHouseholdForm onAddHousehold={handleAddHousehold} setOpen={setIsAddModalOpen} />
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
                                    <TableHead>Table</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {households.map((household) => (
                                    <TableRow key={household.id} className="border-white/10 hover:bg-white/5">
                                        <TableCell className="font-medium">{household.name}</TableCell>
                                        <TableCell>{household.guests.length}</TableCell>
                                        <TableCell>
                                            <div className='flex gap-2 items-center'>
                                                {household.guests.map(guest => (
                                                    <Popover key={guest.id}>
                                                        <PopoverTrigger asChild>
                                                            <motion.div
                                                                className={cn("h-3 w-3 rounded-full cursor-pointer", statusColors[guest.rsvpStatus])}
                                                                animate={{ scale: [1, 1.2, 1] }}
                                                                transition={{ duration: 1.5, repeat: Infinity, delay: Math.random() }}
                                                            />
                                                        </PopoverTrigger>
                                                        <PopoverContent className="w-auto p-2 glass-card">
                                                            <div className='flex flex-col gap-1'>
                                                                <p className='text-xs font-bold px-2'>{guest.firstName}</p>
                                                                <Button variant="ghost" size="sm" onClick={() => handleRsvpChange(guest.id, 'Confirmed')}>Confirmed</Button>
                                                                <Button variant="ghost" size="sm" onClick={() => handleRsvpChange(guest.id, 'Pending')}>Pending</Button>
                                                                <Button variant="ghost" size="sm" onClick={() => handleRsvpChange(guest.id, 'Regret')}>Regret</Button>
                                                            </div>
                                                        </PopoverContent>
                                                    </Popover>
                                                ))}
                                            </div>
                                        </TableCell>
                                        <TableCell>TBD</TableCell>
                                        <TableCell className="text-right">
                                            <Button variant="ghost" size="icon" className="h-8 w-8">
                                                <MoreHorizontal className="h-4 w-4" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </motion.div>
    );
}
