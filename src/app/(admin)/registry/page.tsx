
'use client';
import { motion } from "framer-motion";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import Image from "next/image";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useState } from "react";
import { PlusCircle } from "lucide-react";

const initialGifts = [
    { id: 1, name: "Le Creuset Dutch Oven", price: 3500, imageUrl: "https://picsum.photos/seed/dutch-oven/400/300", imageHint: "kitchenware cooking", storeUrl: "#", isCrowdfund: true, fundedAmount: 2500, category: "Kitchen", store: 'Yuppiechef' },
    { id: 2, name: "Sonos One Speaker Set", price: 4000, imageUrl: "https://picsum.photos/seed/sonos/400/300", imageHint: "tech audio", storeUrl: "#", isCrowdfund: false, fundedAmount: 4000, category: "Electronics", store: 'Takealot' },
    { id: 3, name: "Parachute Linen Sheets", price: 2500, imageUrl: "https://picsum.photos/seed/sheets/400/300", imageHint: "bedroom decor", storeUrl: "#", isCrowdfund: false, fundedAmount: 0, category: "Home", store: '@home' },
    { id: 4, name: "Honeymoon Airfare", price: 10000, imageUrl: "https://picsum.photos/seed/honeymoon/400/300", imageHint: "travel airplane", storeUrl: "#", isCrowdfund: true, fundedAmount: 8000, category: "Honeymoon", store: 'Custom' },
    { id: 5, name: "Vitamix Blender", price: 5000, imageUrl: "https://picsum.photos/seed/blender/400/300", imageHint: "kitchen appliance", storeUrl: "#", isCrowdfund: false, fundedAmount: 5000, category: "Kitchen", store: 'Yuppiechef' },
    { id: 6, name: "National Park Pass", price: 800, imageUrl: "https://picsum.photos/seed/park-pass/400/300", imageHint: "travel adventure", storeUrl: "#", isCrowdfund: false, fundedAmount: 0, category: "Experiences", store: 'Custom' },
];

type Gift = typeof initialGifts[0];

const giftSchema = z.object({
    name: z.string().min(1, 'Item name is required'),
    price: z.number().min(1, 'Price must be greater than 0'),
    imageUrl: z.string().url('Must be a valid URL'),
    storeUrl: z.string().url('Must be a valid URL'),
    store: z.enum(['Takealot', 'Yuppiechef', '@home', 'Woolworths', 'Custom']),
});

const containerVariants = {
    visible: { transition: { staggerChildren: 0.05 } },
};

const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { type: 'spring' } },
};

const GiftCard = ({ gift }: { gift: Gift }) => {
    const fundedPercentage = gift.isCrowdfund ? (gift.fundedAmount / gift.price) * 100 : (gift.fundedAmount > 0 ? 100 : 0);
    const isFunded = gift.isCrowdfund ? gift.fundedAmount >= gift.price : gift.fundedAmount > 0;

    return (
        <motion.div variants={itemVariants}>
            <Card className="glass-card !p-0 !rounded-2xl overflow-hidden group">
                <div className="relative">
                    <Image src={gift.imageUrl} alt={gift.name} width={400} height={300} className="w-full h-48 object-cover transition-transform duration-300 group-hover:scale-105" data-ai-hint={gift.imageHint}/>
                    {isFunded && <Badge className="absolute top-2 right-2 bg-aurora-gold text-black">Funded</Badge>}
                    <Badge variant="secondary" className="absolute top-2 left-2 bg-black/50 text-white border-none">{gift.store}</Badge>
                </div>
                <div className="p-4 space-y-3">
                    <h3 className="font-headline text-lg truncate text-aurora-soft-gold">{gift.name}</h3>
                    <p className="text-2xl font-bold text-white">R {gift.price.toLocaleString('en-ZA')}</p>
                    {gift.isCrowdfund && (
                         <div className="space-y-1">
                            <Progress value={fundedPercentage} className="h-2 [&>div]:bg-gradient-to-r from-aurora-soft-gold to-aurora-gold"/>
                            <p className="text-xs text-muted-foreground">R {gift.fundedAmount.toLocaleString('en-ZA')} of R {gift.price.toLocaleString('en-ZA')} funded</p>
                        </div>
                    )}
                    <div className="flex items-center justify-between pt-2">
                         <div className="flex items-center space-x-2">
                             <Switch id={`crowdfund-${gift.id}`} defaultChecked={gift.isCrowdfund} />
                             <label htmlFor={`crowdfund-${gift.id}`} className="text-xs text-muted-foreground">Crowdfund</label>
                         </div>
                         <a href={gift.storeUrl} target="_blank" rel="noopener noreferrer" className="text-xs font-semibold text-aurora-gold hover:underline">View Store</a>
                    </div>
                </div>
            </Card>
        </motion.div>
    );
};

const AddGiftForm = ({ onAddGift, setOpen }: { onAddGift: (data: Gift) => void; setOpen: (open: boolean) => void }) => {
    const { register, handleSubmit, control, formState: { errors } } = useForm({
        resolver: zodResolver(giftSchema),
    });

    const onSubmit = (data: any) => {
        onAddGift({
            ...data,
            id: Math.random(),
            isCrowdfund: false,
            fundedAmount: 0,
            category: 'Custom'
        });
        setOpen(false);
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
            <div>
                 <Label>Store</Label>
                 <Controller
                    control={control}
                    name="store"
                    render={({ field }) => (
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select a store" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Takealot">Takealot</SelectItem>
                                <SelectItem value="Yuppiechef">Yuppiechef</SelectItem>
                                <SelectItem value="@home">@home</SelectItem>
                                <SelectItem value="Woolworths">Woolworths</SelectItem>
                                <SelectItem value="Custom">Custom</SelectItem>
                            </SelectContent>
                        </Select>
                    )}
                />
                 {errors.store && <p className="text-red-500 text-xs mt-1">{`${errors.store.message}`}</p>}
            </div>
            <Button type="submit" className="w-full">Add Gift</Button>
        </form>
    )
}

const CashFundCard = () => {
    return (
         <motion.div variants={itemVariants} className="md:col-span-2 lg:col-span-2">
            <Card className="glass-card !p-0 !rounded-2xl overflow-hidden group h-full flex flex-col">
                 <div className="relative">
                    <Image src="https://picsum.photos/seed/cash-fund/400/150" alt="Honeymoon" width={400} height={150} className="w-full h-24 object-cover" data-ai-hint="honeymoon beach"/>
                </div>
                 <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
                    <div>
                        <h3 className="font-headline text-lg text-aurora-soft-gold">Honeymoon & Future Home Fund</h3>
                        <p className="text-xs text-muted-foreground">Contribute any amount to our future adventures!</p>
                    </div>
                    <div className="flex gap-2 items-center">
                        <span className="font-bold text-lg">R</span>
                        <Input type="number" placeholder="Enter custom amount" className="bg-white/5 border-white/10" />
                        <Button className="bg-gradient-to-r from-[#d4af37] to-[#f6e7b7] text-black font-medium glossy-sweep">Contribute</Button>
                    </div>
                </div>
            </Card>
        </motion.div>
    )
}


export default function RegistryPage() {
    const [gifts, setGifts] = useState<Gift[]>(initialGifts);
    const [isFormOpen, setIsFormOpen] = useState(false);

    const handleAddGift = (newGift: Gift) => {
        setGifts(prevGifts => [newGift, ...prevGifts]);
    };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
            <h1 className="font-headline text-3xl font-bold italic tracking-tight">Multi-Store Registry</h1>
            <p className="text-muted-foreground tracking-wide">Curate your dream gift list from any store.</p>
        </div>
        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
            <DialogTrigger asChild>
                <Button className="bg-gradient-to-r from-[#d4af37] to-[#f6e7b7] text-black font-medium shadow-lg shadow-[#d4af37]/30 glossy-sweep">
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
      <motion.div 
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <CashFundCard/>
        {gifts.map(gift => <GiftCard key={gift.id} gift={gift} />)}
      </motion.div>
    </div>
  );
}
