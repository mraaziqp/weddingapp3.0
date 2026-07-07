'use client';

import { useState, useTransition } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Trash2, Mail, Phone } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const CATEGORIES = ['Venue', 'Catering', 'Photography', 'Flowers', 'Music', 'Transport', 'Stationery', 'Decor', 'Other'];
const STATUSES = ['Enquired', 'Confirmed', 'Paid', 'Cancelled'];

const vendorSchema = z.object({
  name: z.string().min(1),
  category: z.string().min(1),
  contactName: z.string().optional(),
  contactEmail: z.string().email().optional(),
  contactPhone: z.string().optional(),
  price: z.number().positive(),
  status: z.enum(['Enquired', 'Confirmed', 'Paid', 'Cancelled']),
  depositPaid: z.number().nonnegative().optional().default(0),
});

type Vendor = z.infer<typeof vendorSchema> & { id: string };

export default function VendorsPage() {
  const [vendors, setVendors] = useState<Vendor[]>([]);

  const [isOpen, setIsOpen] = useState(false);
  const [, startTransition] = useTransition();
  const { toast } = useToast();
  const { register, handleSubmit, reset, formState: { errors } } = useForm({ resolver: zodResolver(vendorSchema), defaultValues: { status: 'Enquired' } });

  const onSubmit = (data: typeof vendorSchema._type) => {
    startTransition(() => {
      const newVendor: Vendor = {
        ...data,
        id: `${Date.now()}`,
      };
      setVendors([...vendors, newVendor]);
      reset();
      setIsOpen(false);
      toast({ title: 'Vendor added' });
    });
  };

  const deleteVendor = (id: string) => {
    setVendors(vendors.filter(v => v.id !== id));
    toast({ title: 'Vendor removed' });
  };

  const statusColor = {
    'Enquired': 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    'Confirmed': 'bg-green-500/20 text-green-400 border-green-500/30',
    'Paid': 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    'Cancelled': 'bg-red-500/20 text-red-400 border-red-500/30',
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-headline text-3xl italic font-bold tracking-tight text-amber-50">👔 Vendor Manager</h1>
          <p className="text-white/50 text-sm mt-2">Organize contacts, track payments, confirm services</p>
        </div>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2 bg-amber-500 hover:bg-amber-600">
              <Plus size={16} /> Add Vendor
            </Button>
          </DialogTrigger>
          <DialogContent className="glass-card max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add Vendor</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <Label>Vendor Name *</Label>
                <Input {...register('name')} placeholder="e.g., Tuscany in Rylands" className="mt-1" />
                {errors.name && <p className="text-red-400 text-xs mt-1">{String(errors.name.message)}</p>}
              </div>
              <div>
                <Label>Category *</Label>
                <select {...register('category')} className="w-full mt-1 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white">
                  <option value="">Select category</option>
                  {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                </select>
                {errors.category && <p className="text-red-400 text-xs mt-1">{String(errors.category.message)}</p>}
              </div>
              <div>
                <Label>Contact Name</Label>
                <Input {...register('contactName')} placeholder="John Smith" className="mt-1" />
              </div>
              <div>
                <Label>Email</Label>
                <Input {...register('contactEmail')} type="email" placeholder="john@vendor.co.za" className="mt-1" />
              </div>
              <div>
                <Label>Phone</Label>
                <Input {...register('contactPhone')} placeholder="+27 21 123 4567" className="mt-1" />
              </div>
              <div>
                <Label>Price (ZAR) *</Label>
                <Input {...register('price', { valueAsNumber: true })} type="number" className="mt-1" />
                {errors.price && <p className="text-red-400 text-xs mt-1">{String(errors.price.message)}</p>}
              </div>
              <div>
                <Label>Status *</Label>
                <select {...register('status')} className="w-full mt-1 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white">
                  {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <Label>Deposit Paid (ZAR)</Label>
                <Input {...register('depositPaid', { valueAsNumber: true })} type="number" className="mt-1" />
              </div>
              <Button type="submit" className="w-full">Add Vendor</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Vendor Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {vendors.map(vendor => (
          <motion.div key={vendor.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <Card className="glass-card h-full flex flex-col">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{vendor.name}</CardTitle>
                    <p className="text-xs text-white/40 mt-1">{vendor.category}</p>
                  </div>
                  <Badge className={statusColor[vendor.status]}>{vendor.status}</Badge>
                </div>
              </CardHeader>
              <CardContent className="flex-1 space-y-3">
                {vendor.contactName && <p className="text-sm"><strong>Contact:</strong> {vendor.contactName}</p>}
                {vendor.contactEmail && (
                  <a href={`mailto:${vendor.contactEmail}`} className="text-sm text-amber-400 hover:underline flex items-center gap-2">
                    <Mail size={14} /> {vendor.contactEmail}
                  </a>
                )}
                {vendor.contactPhone && (
                  <a href={`tel:${vendor.contactPhone}`} className="text-sm text-amber-400 hover:underline flex items-center gap-2">
                    <Phone size={14} /> {vendor.contactPhone}
                  </a>
                )}
                <div className="pt-2 border-t border-white/10">
                  <p className="text-sm"><strong>Total:</strong> R{vendor.price.toLocaleString()}</p>
                  <p className="text-sm text-white/60"><strong>Deposit:</strong> R{(vendor.depositPaid || 0).toLocaleString()}</p>
                  <p className="text-sm text-white/60"><strong>Balance:</strong> R{(vendor.price - (vendor.depositPaid || 0)).toLocaleString()}</p>
                </div>
              </CardContent>
              <div className="p-4 border-t border-white/10">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => deleteVendor(vendor.id)}
                  className="w-full text-red-400 hover:text-red-300"
                >
                  <Trash2 size={14} className="mr-2" /> Remove
                </Button>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
