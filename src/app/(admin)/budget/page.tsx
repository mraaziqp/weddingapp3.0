'use client';

import { useState, useEffect, useTransition } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Trash2, ArrowLeft, Download } from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const CATEGORIES = ['Venue', 'Catering', 'Photography', 'Décor', 'Attire', 'Music', 'Transport', 'Stationery', 'Other'];

const budgetItemSchema = z.object({
  category: z.string().min(1),
  name: z.string().min(1),
  budgeted: z.number().positive(),
  actual: z.number().nonnegative().optional().default(0),
});

type BudgetItem = z.infer<typeof budgetItemSchema> & { id: string };

export default function BudgetPage() {
  const [items, setItems] = useState<BudgetItem[]>([
    { id: '1', category: 'Venue', name: 'Tuscany in Rylands', budgeted: 25000, actual: 25000 },
    { id: '2', category: 'Catering', name: 'Premier Catering Co', budgeted: 35000, actual: 32000 },
    { id: '3', category: 'Photography', name: 'Pro Photography', budgeted: 8000, actual: 8000 },
  ]);
  const [totalBudget, setTotalBudget] = useState(100000);
  const [isOpen, setIsOpen] = useState(false);
  const [, startTransition] = useTransition();
  const { toast } = useToast();
  const { register, handleSubmit, reset, formState: { errors } } = useForm({ resolver: zodResolver(budgetItemSchema) });

  const totalBudgeted = items.reduce((sum, item) => sum + item.budgeted, 0);
  const totalActual = items.reduce((sum, item) => sum + item.actual, 0);
  const remaining = totalBudget - totalActual;
  const percentUsed = Math.round((totalActual / totalBudget) * 100);

  const chartData = CATEGORIES.map(cat => ({
    category: cat,
    budgeted: items.filter(i => i.category === cat).reduce((sum, i) => sum + i.budgeted, 0),
    actual: items.filter(i => i.category === cat).reduce((sum, i) => sum + i.actual, 0),
  })).filter(d => d.budgeted > 0 || d.actual > 0);

  const onSubmit = (data: typeof budgetItemSchema._type) => {
    startTransition(() => {
      const newItem: BudgetItem = {
        ...data,
        id: `${Date.now()}`,
      };
      setItems([...items, newItem]);
      reset();
      setIsOpen(false);
      toast({ title: 'Expense added' });
    });
  };

  const deleteItem = (id: string) => {
    setItems(items.filter(i => i.id !== id));
    toast({ title: 'Expense removed' });
  };

  const exportCSV = () => {
    const csv = [
      ['Category', 'Item', 'Budgeted', 'Actual', 'Variance'],
      ...items.map(i => [i.category, i.name, i.budgeted, i.actual, i.actual - i.budgeted]),
      ['', 'TOTAL', totalBudgeted, totalActual, totalActual - totalBudgeted],
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'budget.csv';
    a.click();
    toast({ title: 'Budget exported as CSV' });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-headline text-3xl italic font-bold tracking-tight text-amber-50">💰 Budget Tracker</h1>
          <p className="text-white/50 text-sm mt-2">Monitor every rupee spent vs. budgeted</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={exportCSV} variant="outline" className="gap-2">
            <Download size={16} /> Export CSV
          </Button>
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2 bg-amber-500 hover:bg-amber-600">
                <Plus size={16} /> Add Expense
              </Button>
            </DialogTrigger>
            <DialogContent className="glass-card">
              <DialogHeader>
                <DialogTitle>Add Expense</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div>
                  <Label>Category</Label>
                  <select {...register('category')} className="w-full mt-1 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white">
                    {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                  </select>
                  {errors.category && <p className="text-red-400 text-xs mt-1">{String(errors.category.message)}</p>}
                </div>
                <div>
                  <Label>Item Name</Label>
                  <Input {...register('name')} placeholder="e.g., Venue rental" className="mt-1" />
                  {errors.name && <p className="text-red-400 text-xs mt-1">{String(errors.name.message)}</p>}
                </div>
                <div>
                  <Label>Budgeted Amount (ZAR)</Label>
                  <Input {...register('budgeted', { valueAsNumber: true })} type="number" className="mt-1" />
                  {errors.budgeted && <p className="text-red-400 text-xs mt-1">{String(errors.budgeted.message)}</p>}
                </div>
                <div>
                  <Label>Actual Amount (ZAR)</Label>
                  <Input {...register('actual', { valueAsNumber: true })} type="number" className="mt-1" />
                </div>
                <Button type="submit" className="w-full">Add Expense</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Budget', value: `R${totalBudget.toLocaleString()}`, color: 'blue' },
          { label: 'Total Spent', value: `R${totalActual.toLocaleString()}`, color: 'amber' },
          { label: 'Remaining', value: `R${remaining.toLocaleString()}`, color: remaining >= 0 ? 'green' : 'red' },
          { label: '% Used', value: `${percentUsed}%`, color: 'purple' },
        ].map(card => (
          <Card key={card.label} className="glass-card bg-black/40 border border-white/10">
            <CardContent className="pt-6">
              <p className="text-white/60 text-sm">{card.label}</p>
              <p className={`text-2xl font-bold mt-2 text-${card.color}-400`}>{card.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="glass-card">
          <CardHeader>
            <CardTitle>Spending by Category</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                <XAxis dataKey="category" stroke="rgba(255,255,255,0.5)" />
                <YAxis stroke="rgba(255,255,255,0.5)" />
                <Tooltip contentStyle={{ backgroundColor: 'rgba(0,0,0,0.8)', border: '1px solid rgba(255,255,255,0.2)' }} />
                <Legend />
                <Bar dataKey="budgeted" fill="#d4af37" />
                <Bar dataKey="actual" fill="#f97316" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader>
            <CardTitle>Budget Allocation</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={chartData} dataKey="actual" cx="50%" cy="50%" innerRadius={60} outerRadius={100} label>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={['#d4af37', '#f97316', '#10b981', '#38bdf8', '#a855f7'][index % 5]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: 'rgba(0,0,0,0.8)', border: '1px solid rgba(255,255,255,0.2)' }} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Expense List */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle>Expense Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {items.map(item => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/5 hover:border-white/10 transition-colors"
              >
                <div>
                  <p className="font-medium text-white">{item.name}</p>
                  <p className="text-xs text-white/40">{item.category} • R{item.budgeted.toLocaleString()} budgeted</p>
                </div>
                <div className="flex items-center gap-4">
                  <span className={item.actual > item.budgeted ? 'text-red-400' : 'text-white'}>{`R${item.actual.toLocaleString()}`}</span>
                  <Button size="icon" variant="ghost" onClick={() => deleteItem(item.id)} className="h-8 w-8">
                    <Trash2 size={14} />
                  </Button>
                </div>
              </motion.div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
