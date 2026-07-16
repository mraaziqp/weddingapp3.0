"use client";

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { PlusCircle, UserPlus, MoreHorizontal, Trash2, Download, Pencil, Link2, Copy, Send, Search } from 'lucide-react';
import { fetchHouseholds, addHousehold, addGuestToHousehold, updateHousehold, deleteHousehold, updateGuestRsvp } from '@/lib/supabase';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import type { Household, GuestTag } from '@/lib/types';
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
    activeSide = 'groom',
    onDone,
}: {
    households: Household[];
    activeSide?: 'groom' | 'bride';
    onDone: () => void;
}) {
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [selectedSide, setSelectedSide] = useState<'groom' | 'bride'>(activeSide);
    const [target, setTarget] = useState<string>('own');
    const [saving, setSaving] = useState(false);
    const { toast } = useToast();

    // Reset selectedSide if activeSide changes
    useEffect(() => {
        setSelectedSide(activeSide);
    }, [activeSide]);

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!firstName.trim() || !lastName.trim()) {
            toast({ variant: 'destructive', title: 'Please fill in both names' });
            return;
        }
        setSaving(true);
        const sideTag = (selectedSide === 'groom' ? "Groom's Family" : "Bride's Family") as GuestTag;
        const person = { 
            firstName: firstName.trim(), 
            lastName: lastName.trim(),
            tags: [sideTag]
        };
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
            
            <div className="flex gap-2">
                <div className="flex-1">
                    <Label htmlFor="ag-side">Guest Side</Label>
                    <Select value={selectedSide} onValueChange={(val: 'groom' | 'bride') => setSelectedSide(val)}>
                        <SelectTrigger id="ag-side" className="mt-1 bg-black/10 border-white/10 text-white">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="glass-card-static border-white/10">
                            <SelectItem value="groom">Groom's Side</SelectItem>
                            <SelectItem value="bride">Bride's Side</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <div className="flex-1">
                    <Label>Invite Type</Label>
                    <Select value={target} onValueChange={setTarget}>
                        <SelectTrigger className="mt-1">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="glass-card-static border-white/10 max-h-64">
                            <SelectItem value="own">✨ Their own invite (single guest)</SelectItem>
                            <SelectItem value="new-multi">✨ Create a new household</SelectItem>
                            {households.map(h => (
                                <SelectItem key={h.id} value={h.id}>
                                    Join: {h.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>
            
            <p className="text-xs text-muted-foreground">
                &ldquo;Their own invite&rdquo; creates a solo guest invite. &ldquo;Create a new household&rdquo; creates a multi-guest family invite. Joining a household adds them to an existing invite.
            </p>
            <Button type="submit" disabled={saving} className="w-full">
                {saving ? 'Adding…' : 'Add Guest'}
            </Button>
        </form>
    );
}

function HouseholdForm({
    defaultValues,
    defaultSide = 'groom',
    onSubmit,
    submitLabel,
    mode = 'multi',
}: {
    defaultValues: HouseholdFormValues;
    defaultSide?: 'groom' | 'bride';
    onSubmit: (data: any) => void;
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
    const [selectedSide, setSelectedSide] = useState<'groom' | 'bride'>(defaultSide);

    // Reset selectedSide if defaultSide changes
    useEffect(() => {
        setSelectedSide(defaultSide);
    }, [defaultSide]);

    return (
        <form
            onSubmit={handleSubmit((data) => {
                const sideTag = (selectedSide === 'groom' ? "Groom's Family" : "Bride's Family") as GuestTag;
                const guestsWithTags = data.guests.map(g => ({
                    ...g,
                    tags: [sideTag]
                }));
                onSubmit(isSingle 
                    ? { ...data, name: `${data.guests[0].firstName} ${data.guests[0].lastName}`, guests: guestsWithTags } 
                    : { ...data, guests: guestsWithTags }
                );
            })}
            className="space-y-4"
        >
            <div className="flex gap-4">
                {!isSingle && (
                    <div className="flex-1">
                        <Label htmlFor="name">Household Name</Label>
                        <Input id="name" {...register('name')} placeholder="e.g., The Smith Family" className="mt-1" />
                        {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
                    </div>
                )}
                <div className={cn("w-44", isSingle && "w-full")}>
                    <Label htmlFor="side">Guest Side</Label>
                    <Select value={selectedSide} onValueChange={(val: 'groom' | 'bride') => setSelectedSide(val)}>
                        <SelectTrigger className="mt-1 bg-black/10 border-white/10 text-white">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="glass-card-static border-white/10">
                            <SelectItem value="groom">Groom's Side</SelectItem>
                            <SelectItem value="bride">Bride's Side</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>
            
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
    const [searchQuery, setSearchQuery] = useState('');
    const [activeSideTab, setActiveSideTab] = useState<'all' | 'groom' | 'bride'>('all');
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
        // Check if any guest belongs to bride or groom side
        const isBrideSide = household.guests?.some(g => g.tags?.some(t => t.includes("Bride's")));
        const isGroomSide = household.guests?.some(g => g.tags?.some(t => t.includes("Groom's")));
        
        let sideParam = '';
        if (isBrideSide) sideParam = '&side=bride';
        else if (isGroomSide) sideParam = '&side=groom';

        const link = `${window.location.origin}/invitation?household=${household.id}&id=${household.id}${sideParam}`;
        navigator.clipboard.writeText(link).then(() => {
            toast({ title: 'Invite Link Copied!', description: link });
        });
    };

    const handleWhatsAppShare = (household: Household) => {
        // Check if any guest belongs to bride or groom side
        const isBrideSide = household.guests?.some(g => g.tags?.some(t => t.includes("Bride's")));
        const isGroomSide = household.guests?.some(g => g.tags?.some(t => t.includes("Groom's")));
        
        let sideParam = '';
        if (isBrideSide) sideParam = '&side=bride';
        else if (isGroomSide) sideParam = '&side=groom';

        // Construct link (with fallback to production URL if local testing)
        let baseUrl = 'https://raziazaraaziq.co.za';
        if (typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
            baseUrl = window.location.origin;
        }

        const link = `${baseUrl}/invitation?household=${household.id}&id=${household.id}${sideParam}`;
        
        // Draft a beautiful message
        const textMessage = `Assalamu Alaikum. We would love for you to join us on our special day. Please view your personalized invitation card and RSVP details here: ${link}`;
        
        const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(textMessage)}`;
        window.open(whatsappUrl, '_blank');
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

    const groomCount = households.filter(h =>
        h.guests?.some(g => g.tags?.some(t => t.includes("Groom's")))
    ).length;

    const brideCount = households.filter(h =>
        h.guests?.some(g => g.tags?.some(t => t.includes("Bride's")))
    ).length;

    const filteredHouseholds = households.filter(h => {
        // 1. Filter by Groom/Bride Side Segment Tab
        if (activeSideTab === 'groom') {
            const isGroom = h.guests?.some(g => g.tags?.some(t => t.includes("Groom's")));
            if (!isGroom) return false;
        } else if (activeSideTab === 'bride') {
            const isBride = h.guests?.some(g => g.tags?.some(t => t.includes("Bride's")));
            if (!isBride) return false;
        }

        // 2. Filter by Search Query
        const query = searchQuery.trim().toLowerCase();
        if (!query) return true;
        const nameMatch = h.name?.toLowerCase().includes(query);
        const guestMatch = h.guests?.some(g => 
            `${g.firstName || ''} ${g.lastName || ''}`.toLowerCase().includes(query)
        );
        return nameMatch || guestMatch;
    });

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex-1 flex flex-col relative gap-3"
        >
            <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="relative flex-1 min-w-[260px] max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search guests or households..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        className="pl-9 border-white/10 bg-white/5 text-white placeholder:text-white/30 h-10 focus:border-[#d4af37]/35 focus:ring-1 focus:ring-[#d4af37]/25"
                    />
                </div>
                
                <div className="flex items-center gap-3 flex-wrap">
                    <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" className="gap-2 text-[#d4af37] border-[#d4af37]/35 bg-[#d4af37]/5 hover:bg-[#d4af37]/10">
                                    <PlusCircle size={16} /> Add Household
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent className="glass-card-static border-white/10">
                                <DropdownMenuItem onClick={() => { setAddMode('single'); setIsAddModalOpen(true); }} className="gap-2 cursor-pointer text-white hover:bg-white/10">
                                    Single Invite
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => { setAddMode('multi'); setIsAddModalOpen(true); }} className="gap-2 cursor-pointer text-white hover:bg-white/10">
                                    Multi Invite (Household)
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                        <DialogContent className="glass-card-static border-white/10 text-foreground">
                            <DialogHeader>
                                <DialogTitle className="font-headline text-2xl italic">
                                    {addMode === 'single' ? 'New Single Invite' : 'New Multi Invite (Household)'}
                                </DialogTitle>
                            </DialogHeader>
                            <HouseholdForm
                                key={`${addMode}-${activeSideTab}`}
                                defaultValues={{ name: '', guests: [{ firstName: '', lastName: '' }] }}
                                defaultSide={activeSideTab === 'bride' ? 'bride' : 'groom'}
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
                        <DialogContent className="glass-card-static border-white/10 text-foreground">
                            <DialogHeader>
                                <DialogTitle className="font-headline text-2xl italic">Add a Guest</DialogTitle>
                            </DialogHeader>
                            <AddGuestForm
                                households={households}
                                activeSide={activeSideTab === 'bride' ? 'bride' : 'groom'}
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
            </div>

            {/* Groom / Bride / All Segment Tabs Switcher */}
            <div className="flex bg-white/5 p-1 rounded-lg border border-white/10 max-w-md gap-1 self-start">
                <button
                    onClick={() => setActiveSideTab('all')}
                    className={cn(
                        "px-4 py-1.5 text-xs font-semibold rounded-md transition-all",
                        activeSideTab === 'all'
                            ? "bg-[#d4af37] text-black shadow-md"
                            : "text-white/60 hover:text-white hover:bg-white/5"
                    )}
                >
                    All Guests ({households.length})
                </button>
                <button
                    onClick={() => setActiveSideTab('groom')}
                    className={cn(
                        "px-4 py-1.5 text-xs font-semibold rounded-md transition-all",
                        activeSideTab === 'groom'
                            ? "bg-[#d4af37] text-black shadow-md"
                            : "text-white/60 hover:text-white hover:bg-white/5"
                    )}
                >
                    Groom's Side ({groomCount})
                </button>
                <button
                    onClick={() => setActiveSideTab('bride')}
                    className={cn(
                        "px-4 py-1.5 text-xs font-semibold rounded-md transition-all",
                        activeSideTab === 'bride'
                            ? "bg-[#d4af37] text-black shadow-md"
                            : "text-white/60 hover:text-white hover:bg-white/5"
                    )}
                >
                    Bride's Side ({brideCount})
                </button>
            </div>

            <Card className="glass-card-static flex-1">
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
                                {!loading && filteredHouseholds.length === 0 && households.length > 0 && (
                                    <TableRow>
                                        <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                                            No guests found matching &ldquo;{searchQuery}&rdquo;.
                                        </TableCell>
                                    </TableRow>
                                )}
                                {!loading && filteredHouseholds.map((household) => (
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
                                                {household.guests.map((guest) => (
                                                    <Popover key={guest.id}>
                                                        <PopoverTrigger asChild>
                                                            <button className="flex items-center gap-1 group">
                                                                <div className={cn("h-3 w-3 rounded-full cursor-pointer transition-transform group-hover:scale-110", statusColors[guest.rsvpStatus])} />
                                                                <span className="text-xs text-muted-foreground group-hover:text-foreground transition-colors">{guest.firstName}</span>
                                                            </button>
                                                        </PopoverTrigger>
                                                        <PopoverContent className="w-auto p-2 glass-card-static">
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
                                             <div className="flex items-center gap-1.5">
                                                 <Button
                                                     variant="ghost"
                                                     size="sm"
                                                     className="gap-1 text-[#d4af37] hover:text-[#d4af37] hover:bg-[#d4af37]/10 h-8 px-2"
                                                     onClick={() => handleCopyInviteLink(household)}
                                                     title="Copy Invite Link"
                                                 >
                                                     <Copy size={13} />
                                                     <span className="hidden xl:inline">Copy Link</span>
                                                 </Button>
                                                 <Button
                                                     variant="ghost"
                                                     size="sm"
                                                     className="gap-1 text-green-400 hover:text-green-400 hover:bg-green-500/10 h-8 px-2"
                                                     onClick={() => handleWhatsAppShare(household)}
                                                     title="Share via WhatsApp"
                                                 >
                                                     <Send size={13} />
                                                     <span className="hidden xl:inline">WhatsApp</span>
                                                 </Button>
                                             </div>
                                         </TableCell>
                                         <TableCell className="text-right">
                                             <DropdownMenu>
                                                 <DropdownMenuTrigger asChild>
                                                     <Button variant="ghost" size="icon" className="h-8 w-8">
                                                         <MoreHorizontal className="h-4 w-4" />
                                                     </Button>
                                                 </DropdownMenuTrigger>
                                                 <DropdownMenuContent align="end" className="glass-card-static border-white/10">
                                                     <DropdownMenuItem onClick={() => setEditingHousehold(household)} className="gap-2 cursor-pointer">
                                                         <Pencil size={14} /> Edit Household
                                                     </DropdownMenuItem>
                                                     <DropdownMenuItem onClick={() => handleCopyInviteLink(household)} className="gap-2 cursor-pointer">
                                                         <Link2 size={14} /> Copy Invite Link
                                                     </DropdownMenuItem>
                                                     <DropdownMenuItem onClick={() => handleWhatsAppShare(household)} className="gap-2 cursor-pointer text-green-400 focus:text-green-400">
                                                         <Send size={14} /> Send over WhatsApp
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
                <DialogContent className="glass-card-static border-white/10 text-foreground">
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
                <AlertDialogContent className="glass-card-static border-white/10 text-foreground">
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
