'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Heart, Plane, TrendingUp, Gift, DollarSign } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface HoneymoonContribution {
  name: string;
  amount: number;
  message?: string;
  date: string;
}

export function HoneymoonFund() {
  const [contributions, setContributions] = useState<HoneymoonContribution[]>([
    { name: 'Naidoo Family', amount: 5000, message: 'Enjoy paradise!', date: '2026-06-01' },
    { name: 'Hassan Cousins', amount: 3000, message: 'Have fun!', date: '2026-06-02' },
    { name: 'Parker Extended', amount: 7500, message: 'Amazing journey ahead!', date: '2026-06-03' },
  ]);

  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ name: '', amount: '', message: '' });
  const { toast } = useToast();

  const targetAmount = 50000;
  const totalRaised = contributions.reduce((sum, c) => sum + c.amount, 0);
  const percentage = Math.round((totalRaised / targetAmount) * 100);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.amount) {
      toast({ title: 'Please fill in all fields', variant: 'destructive' });
      return;
    }

    const newContribution: HoneymoonContribution = {
      name: formData.name,
      amount: parseFloat(formData.amount),
      message: formData.message,
      date: new Date().toISOString().split('T')[0],
    };

    setContributions([newContribution, ...contributions]);
    toast({ title: '💕 Thank You!', description: `Your contribution of R${formData.amount} has been received!` });
    setFormData({ name: '', amount: '', message: '' });
    setShowForm(false);
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center space-y-4"
      >
        <div className="flex justify-center">
          <motion.div
            animate={{ y: [0, -10, 0] }}
            transition={{ duration: 3, repeat: Infinity }}
          >
            <Plane className="text-amber-500" size={48} />
          </motion.div>
        </div>
        <h2 className="text-4xl md:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-pink-400 to-emerald-400">
          Our Honeymoon Adventure Fund
        </h2>
        <p className="text-white/70 text-lg max-w-2xl mx-auto">
          Help us create unforgettable memories on our dream honeymoon to the Maldives, Europe & beyond!
        </p>
      </motion.div>

      {/* Progress Card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.1 }}
      >
        <Card className="glass-card border-amber-400/30 bg-gradient-to-r from-amber-500/5 to-pink-500/5 overflow-hidden">
          <CardContent className="pt-8">
            <div className="space-y-6">
              {/* Stats */}
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                  <p className="text-white/60 text-sm mb-1">Raised</p>
                  <p className="text-2xl font-bold text-amber-400">
                    R{totalRaised.toLocaleString()}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-white/60 text-sm mb-1">Goal</p>
                  <p className="text-2xl font-bold text-white">
                    R{targetAmount.toLocaleString()}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-white/60 text-sm mb-1">Progress</p>
                  <p className="text-2xl font-bold text-emerald-400">{percentage}%</p>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="space-y-2">
                <div className="h-3 bg-white/10 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${percentage}%` }}
                    transition={{ duration: 1, ease: 'easeOut' }}
                    className="h-full bg-gradient-to-r from-amber-500 via-pink-500 to-emerald-500"
                  />
                </div>
                <p className="text-xs text-white/50">
                  R{(targetAmount - totalRaised).toLocaleString()} more to reach our dream!
                </p>
              </div>

              {/* Contribution Button */}
              <Button
                onClick={() => setShowForm(!showForm)}
                className="w-full bg-gradient-to-r from-amber-500 to-pink-500 hover:from-amber-600 hover:to-pink-600 text-white font-semibold py-6 rounded-lg"
              >
                <Heart className="mr-2" size={20} />
                Contribute to Our Honeymoon
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Contribution Form */}
      {showForm && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="glass-card border-pink-400/30 bg-pink-500/5">
            <CardHeader>
              <CardTitle>Make a Contribution 💕</CardTitle>
              <CardDescription>Help us create amazing memories</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="text-sm text-white/70 block mb-2">Your Name</label>
                  <Input
                    placeholder="How should we credit you?"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="border-white/20"
                  />
                </div>
                <div>
                  <label className="text-sm text-white/70 block mb-2">Amount (R)</label>
                  <Input
                    type="number"
                    placeholder="e.g. 2500"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    className="border-white/20"
                  />
                </div>
                <div>
                  <label className="text-sm text-white/70 block mb-2">Message (Optional)</label>
                  <Input
                    placeholder="Send us a lovely message!"
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    className="border-white/20"
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    type="submit"
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                  >
                    <Gift className="mr-2" size={16} />
                    Contribute
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowForm(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Contributions List */}
      <div className="space-y-4">
        <h3 className="text-2xl font-bold text-white flex items-center gap-2">
          <Heart className="text-pink-500" size={24} />
          Our Amazing Supporters ({contributions.length})
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-96 overflow-y-auto">
          {contributions.map((contribution, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.05 }}
            >
              <Card className="glass-card border-white/10 hover:border-pink-400/30 transition-all">
                <CardContent className="pt-6">
                  <div className="space-y-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-semibold text-white">{contribution.name}</p>
                        <p className="text-xs text-white/50">{contribution.date}</p>
                      </div>
                      <Badge className="bg-emerald-500/20 text-emerald-400">
                        R{contribution.amount.toLocaleString()}
                      </Badge>
                    </div>
                    {contribution.message && (
                      <p className="text-sm text-white/70 italic">"{contribution.message}"</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Destination Info */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <Card className="glass-card border-emerald-400/30 bg-emerald-500/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plane className="text-emerald-400" size={24} />
              Our Dream Honeymoon
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-white/5 rounded-lg border border-white/10">
                <p className="text-sm text-white/60 mb-2">First Stop</p>
                <p className="text-lg font-semibold text-white">🏝️ Maldives</p>
                <p className="text-xs text-white/50 mt-1">Crystal waters & overwater villas</p>
              </div>
              <div className="p-4 bg-white/5 rounded-lg border border-white/10">
                <p className="text-sm text-white/60 mb-2">Next Adventure</p>
                <p className="text-lg font-semibold text-white">🗼 Europe</p>
                <p className="text-xs text-white/50 mt-1">Romance & historic beauty</p>
              </div>
              <div className="p-4 bg-white/5 rounded-lg border border-white/10">
                <p className="text-sm text-white/60 mb-2">Exploration</p>
                <p className="text-lg font-semibold text-white">🌍 Beyond</p>
                <p className="text-xs text-white/50 mt-1">Creating unforgettable memories</p>
              </div>
            </div>
            <p className="text-white/70 text-sm">
              Every contribution, big or small, helps us create the honeymoon of our dreams. We're beyond grateful for your love and support! 💕
            </p>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
