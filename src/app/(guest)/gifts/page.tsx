'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Gift as GiftIcon, Plane, Heart, Loader2, AlertCircle } from 'lucide-react';
import { HoneymoonFund } from '@/components/honeymoon-fund';
import { fetchGifts } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import type { Gift } from '@/lib/types';

export default function RegistryPage() {
  const [activeTab, setActiveTab] = useState('honeymoon');
  const [gifts, setGifts] = useState<Gift[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [claimingId, setClaimingId] = useState<string | null>(null);
  const { toast } = useToast();

  const claimed = gifts.filter(g => g.isPurchased).length;

  const loadGifts = useCallback(() => {
    setLoading(true);
    setLoadError(false);
    fetchGifts()
      .then(setGifts)
      .catch(err => {
        console.error('Failed to load gifts:', err);
        setLoadError(true);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadGifts();
  }, [loadGifts]);

  // Anonymous claim — no name, login, or guest link is ever attached to
  // this. It just marks the item bought so the next person sees it's
  // already taken care of.
  const handleClaim = async (gift: Gift) => {
    setClaimingId(gift.id);
    try {
      const res = await fetch('/api/gifts', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: gift.id }),
      });

      if (res.status === 409) {
        toast({
          title: 'Just missed it!',
          description: 'Someone else claimed this a moment ago — take a look at what else is on the list.',
        });
        loadGifts();
        return;
      }
      if (!res.ok) throw new Error('Request failed');

      setGifts(prev => prev.map(g => g.id === gift.id ? { ...g, isPurchased: true } : g));
      toast({ title: '🎁 Marked as bought!', description: `Thank you for getting the ${gift.name} — nobody else will duplicate it.` });
    } catch {
      toast({ variant: 'destructive', title: 'Could not update the registry', description: 'Please try again.' });
    } finally {
      setClaimingId(null);
    }
  };

  return (
    <div className="relative min-h-screen space-y-8 p-4 md:p-8 overflow-hidden bg-gradient-to-br from-gray-900 via-black to-gray-900">
      {/* Animated Background */}
      <div className="fixed inset-0 pointer-events-none z-[-1]">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[60%] rounded-full bg-purple-900/20 blur-[140px] mix-blend-screen animate-pulse" />
        <div className="absolute bottom-[-15%] right-[-15%] w-[60%] h-[60%] rounded-full bg-emerald-900/20 blur-[160px] mix-blend-screen" />
        <div className="absolute top-[40%] right-[10%] w-[40%] h-[40%] rounded-full bg-pink-900/15 blur-[120px] mix-blend-screen animate-pulse delay-1000" />
      </div>

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-8"
      >
        <h1 className="text-4xl md:text-6xl font-light tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-pink-300 to-emerald-400 mb-4">
          Our Registry & Honeymoon Fund
        </h1>
        <p className="text-white/60 text-lg">Help us start our journey together</p>
      </motion.div>

      {/* Tabs */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 bg-white/5 border border-white/10 rounded-lg p-1">
            <TabsTrigger value="honeymoon" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber-600 data-[state=active]:to-pink-600">
              <Plane className="mr-2" size={18} />
              Honeymoon Fund
            </TabsTrigger>
            <TabsTrigger value="gifts" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-emerald-600 data-[state=active]:to-blue-600">
              <GiftIcon className="mr-2" size={18} />
              Gift Registry
            </TabsTrigger>
          </TabsList>

          {/* Honeymoon Fund Tab */}
          <TabsContent value="honeymoon" className="space-y-8 mt-8">
            <HoneymoonFund />
          </TabsContent>

          {/* Gift Registry Tab */}
          <TabsContent value="gifts" className="space-y-8 mt-8">
            {loading ? (
              <div className="flex flex-col items-center gap-3 py-16 text-white/40">
                <Loader2 className="h-8 w-8 animate-spin" />
                <p>Loading the registry…</p>
              </div>
            ) : loadError ? (
              <div className="flex flex-col items-center gap-3 py-16 text-white/40">
                <AlertCircle className="h-8 w-8 text-red-400" />
                <p>Couldn&apos;t load the registry.</p>
                <Button variant="outline" onClick={loadGifts}>Try again</Button>
              </div>
            ) : gifts.length === 0 ? (
              <div className="text-center py-16 text-white/40">
                <p>The registry is empty right now — check back soon!</p>
              </div>
            ) : (
              <>
                {/* Registry Stats */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="grid grid-cols-2 md:grid-cols-3 gap-4"
                >
                  <Card className="glass-card bg-white/5">
                    <CardContent className="pt-6">
                      <p className="text-white/60 text-sm mb-1">Total Items</p>
                      <p className="text-3xl font-bold text-white">{gifts.length}</p>
                    </CardContent>
                  </Card>
                  <Card className="glass-card bg-white/5">
                    <CardContent className="pt-6">
                      <p className="text-white/60 text-sm mb-1">Claimed</p>
                      <p className="text-3xl font-bold text-emerald-400">{claimed}</p>
                    </CardContent>
                  </Card>
                  <Card className="glass-card bg-white/5">
                    <CardContent className="pt-6">
                      <p className="text-white/60 text-sm mb-1">Available</p>
                      <p className="text-3xl font-bold text-pink-400">{gifts.length - claimed}</p>
                    </CardContent>
                  </Card>
                </motion.div>

                {/* Gifts Grid */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                >
                  <AnimatePresence>
                    {gifts.map((gift, idx) => (
                      <motion.div
                        key={gift.id}
                        layout
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ delay: idx * 0.05 }}
                      >
                        <Card className={`glass-card h-full flex flex-col overflow-hidden transition-all ${
                          gift.isPurchased ? 'border-emerald-500/30 opacity-75' : 'border-white/10 hover:border-amber-400/50'
                        }`}>
                          {gift.imageUrl && (
                            <div className="relative h-40 w-full bg-white/5">
                              {/* eslint-disable-next-line @next/next/no-img-element -- arbitrary external store URLs; next/image needs a fixed domain allow-list which can't cover every store */}
                              <img src={gift.imageUrl} alt={gift.name} className="absolute inset-0 h-full w-full object-cover" />
                            </div>
                          )}
                          <CardHeader className="pb-3">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <CardTitle className="text-xl truncate">{gift.name}</CardTitle>
                                {gift.storeUrl && (
                                  <CardDescription className="text-xs mt-1">
                                    <a href={gift.storeUrl} target="_blank" rel="noopener noreferrer" className="hover:underline">
                                      View in store ↗
                                    </a>
                                  </CardDescription>
                                )}
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent className="flex-1 flex flex-col">
                            <p className="text-2xl font-bold text-amber-400 mb-4">R{gift.price.toLocaleString()}</p>
                            <div className="flex-1" />
                            {gift.isPurchased ? (
                              <Badge className="w-full justify-center py-1.5 bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
                                ✓ Already bought — thank you!
                              </Badge>
                            ) : (
                              <Button
                                onClick={() => handleClaim(gift)}
                                disabled={claimingId === gift.id}
                                className="w-full bg-gradient-to-r from-amber-600 to-pink-600 hover:from-amber-700 hover:to-pink-700"
                              >
                                {claimingId === gift.id ? (
                                  <Loader2 className="mr-2 animate-spin" size={16} />
                                ) : (
                                  <Heart className="mr-2" size={16} />
                                )}
                                {claimingId === gift.id ? 'Marking as bought…' : "I'm buying this"}
                              </Button>
                            )}
                          </CardContent>
                        </Card>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </motion.div>
              </>
            )}

            {/* Registry Info */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <Card className="glass-card border-white/10">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <GiftIcon className="text-amber-400" size={24} />
                    About Our Registry
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-white/70">
                  <p>
                    We&apos;ve curated a selection of items we need to start our life together. Tap &quot;I&apos;m buying this&quot; once you&apos;ve got it — it marks the item as taken for every other guest, anonymously, so nobody ends up with two of the same gift.
                  </p>
                  <p>
                    If you&apos;d prefer to contribute to our honeymoon adventure instead, we have a separate fund where you can help us explore the world together!
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>
        </Tabs>
      </motion.div>
    </div>
  );
}
