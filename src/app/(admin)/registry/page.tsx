
'use client';
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useState, useEffect } from "react";
import { PlusCircle, Trash2, AlertCircle } from "lucide-react";
import { fetchGifts } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import type { Gift } from "@/lib/types";

const giftSchema = z.object({
    name: z.string().min(1, 'Item name is required'),
    price: z.number().min(1, 'Price must be greater than 0'),
    imageUrl: z.string().url('Must be a valid URL'),
    storeUrl: z.string().url('Must be a valid URL'),
});

const containerVariants = {
    visible: { transition: { staggerChildren: 0.05 } },
};

const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { type: 'spring' } },
};

const GiftCard = ({ gift, onDelete }: { gift: Gift; onDelete: (id: string) => void }) => {
    return (
        <motion.div variants={itemVariants}>
            <Card className="glass-card !p-0 !rounded-2xl overflow-hidden group">
                <div className="relative">
                    {/* eslint-disable-next-line @next/next/no-img-element -- arbitrary external store URLs; next/image needs a fixed domain allow-list which can't cover every store */}
                    <img src={gift.imageUrl} alt={gift.name} className="w-full h-48 object-cover transition-transform duration-300 group-hover:scale-105" />
                    {gift.isPurchased && <Badge className="absolute top-2 right-2 bg-aurora-gold text-black">Purchased</Badge>}
                    <button
                        onClick={() => onDelete(gift.id)}
                        aria-label={`Remove ${gift.name}`}
                        className="absolute top-2 left-2 h-8 w-8 rounded-full bg-black/50 text-white/80 hover:bg-red-500/80 hover:text-white flex items-center justify-center transition-colors"
                    >
                        <Trash2 size={14} />
                    </button>
                </div>
                <div className="p-4 space-y-3">
                    <h3 className="font-headline text-lg truncate text-aurora-soft-gold">{gift.name}</h3>
                    <p className="text-2xl font-bold text-white">R {gift.price.toLocaleString('en-ZA')}</p>
                    <div className="flex items-center justify-between pt-2">
                        <p className="text-xs text-muted-foreground">
                            {gift.isPurchased ? '✓ A guest has claimed this' : 'Still available for guests'}
                        </p>
                        <a href={gift.storeUrl} target="_blank" rel="noopener noreferrer" className="text-xs font-semibold text-aurora-gold hover:underline">View Store</a>
                    </div>
                </div>
            </Card>
        </motion.div>
    );
};

const AddGiftForm = ({ onAddGift, setOpen }: { onAddGift: (data: z.infer<typeof giftSchema>) => Promise<boolean>; setOpen: (open: boolean) => void }) => {
    const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
        resolver: zodResolver(giftSchema),
    });

    const onSubmit = async (data: z.infer<typeof giftSchema>) => {
        const ok = await onAddGift(data);
        if (ok) setOpen(false);
    };

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
                <Label htmlFor="name">Item Name</Label>
                <Input id="name" {...register('name')} />
                {errors.name && <p className="text-red-500 text-xs mt-1">{`${errors.name.message}`}</p>}
            </div>
            <div>
                <Label htmlFor="price">Price (ZAR)</Label>
                <Input id="price" type="number" {...register('price', { valueAsNumber: true })} />
                {errors.price && <p className="text-red-500 text-xs mt-1">{`${errors.price.message}`}</p>}
            </div>
            <div>
                <Label htmlFor="imageUrl">Image URL</Label>
                <Input id="imageUrl" {...register('imageUrl')} />
                {errors.imageUrl && <p className="text-red-500 text-xs mt-1">{`${errors.imageUrl.message}`}</p>}
            </div>
            <div>
                <Label htmlFor="storeUrl">Store Link</Label>
                <Input id="storeUrl" {...register('storeUrl')} />
                {errors.storeUrl && <p className="text-red-500 text-xs mt-1">{`${errors.storeUrl.message}`}</p>}
            </div>
            <Button type="submit" disabled={isSubmitting} className="w-full">
                {isSubmitting ? 'Adding…' : 'Add Gift'}
            </Button>
        </form>
    )
}

export default function RegistryPage() {
    const [gifts, setGifts] = useState<Gift[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState(false);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const { toast } = useToast();

    const loadGifts = () => {
        setLoading(true);
        setLoadError(false);
        fetchGifts()
            .then(setGifts)
            .catch(err => {
                console.error('Failed to load gifts:', err);
                setLoadError(true);
                toast({ variant: 'destructive', title: 'Failed to load gifts', description: 'Check your connection and try again.' });
            })
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        loadGifts();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleAddGift = async (data: z.infer<typeof giftSchema>): Promise<boolean> => {
        try {
            const res = await fetch('/api/gifts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });
            if (!res.ok) throw new Error('Request failed');
            toast({ title: 'Gift added to the registry' });
            loadGifts();
            return true;
        } catch {
            toast({ variant: 'destructive', title: 'Could not add gift', description: 'Please try again.' });
            return false;
        }
    };

    const handleDeleteGift = async (id: string) => {
        const previous = gifts;
        setGifts(g => g.filter(x => x.id !== id));
        try {
            const res = await fetch(`/api/gifts?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
            if (!res.ok) throw new Error('Request failed');
            toast({ title: 'Gift removed' });
        } catch {
            setGifts(previous);
            toast({ variant: 'destructive', title: 'Could not remove gift', description: 'Please try again.' });
        }
    };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
            <h1 className="font-headline text-3xl font-bold italic tracking-tight">Multi-Store Registry</h1>
            <p className="text-muted-foreground tracking-wide">Curate your dream gift list from any store. Guests can anonymously mark an item as bought so nobody duplicates a gift.</p>
        </div>
        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
            <DialogTrigger asChild>
                <Button disabled={loading} className="bg-gradient-to-r from-[#d4af37] to-[#f6e7b7] text-black font-medium shadow-lg shadow-[#d4af37]/30 glossy-sweep">
                    <PlusCircle className="mr-2"/> Add New Gift
                </Button>
            </DialogTrigger>
            <DialogContent className="glass-card">
                <DialogHeader>
                    <DialogTitle>Add a New Gift</DialogTitle>
                </DialogHeader>
                <AddGiftForm onAddGift={handleAddGift} setOpen={setIsFormOpen} />
            </DialogContent>
        </Dialog>
      </div>
      {loading && (
        <div className="text-center py-12 text-white/40">
          <p>Loading gifts...</p>
        </div>
      )}
      {!loading && loadError && (
        <div className="text-center py-12 text-white/40 space-y-3">
          <AlertCircle className="mx-auto h-8 w-8 text-red-400" />
          <p>Couldn&apos;t load the registry.</p>
          <Button variant="outline" onClick={loadGifts}>Try again</Button>
        </div>
      )}
      {!loading && !loadError && gifts.length === 0 && (
        <div className="text-center py-12 text-white/40">
          <p>No gifts yet — add your first item above.</p>
        </div>
      )}
      {!loading && !loadError && gifts.length > 0 && (
        <motion.div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {gifts.map(gift => <GiftCard key={gift.id} gift={gift} onDelete={handleDeleteGift} />)}
        </motion.div>
      )}
    </div>
  );
}
