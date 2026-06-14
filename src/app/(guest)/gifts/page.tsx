'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Gift, Plane, Heart } from 'lucide-react';
import { HoneymoonFund } from '@/components/honeymoon-fund';

interface GiftItem {
  id: string;
  name: string;
  store: string;
  price: number;
  image: string;
  claimed: boolean;
}

const gifts: GiftItem[] = [
  { id: '1', name: 'KitchenAid Mixer', store: 'Takealot', price: 4500, image: '🥘', claimed: false },
  { id: '2', name: 'Dyson Vacuum', store: 'Takealot', price: 12000, image: '🧹', claimed: true },
  { id: '3', name: 'Sony WH-1000XM5 Headphones', store: 'Takealot', price: 6500, image: '🎧', claimed: false },
  { id: '4', name: 'Instant Pot Pro', store: 'Takealot', price: 3200, image: '🍲', claimed: false },
  { id: '5', name: 'Nespresso Machine', store: 'Takealot', price: 5000, image: '☕', claimed: false },
  { id: '6', name: 'Air Fryer Deluxe', store: 'Takealot', price: 3800, image: '🍟', claimed: false },
  { id: '7', name: 'Smart Speaker Bundle', store: 'Takealot', price: 2500, image: '🔊', claimed: false },
  { id: '8', name: 'Coffee Table Set', store: 'Superbalist', price: 4000, image: '🛋️', claimed: true },
];

export default function RegistryPage() {
  const [activeTab, setActiveTab] = useState('honeymoon');
  const claimed = gifts.filter(g => g.claimed).length;

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
              <Gift className="mr-2" size={18} />
              Gift Registry
            </TabsTrigger>
          </TabsList>

          {/* Honeymoon Fund Tab */}
          <TabsContent value="honeymoon" className="space-y-8 mt-8">
            <HoneymoonFund />
          </TabsContent>

          {/* Gift Registry Tab */}
          <TabsContent value="gifts" className="space-y-8 mt-8">
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
              {gifts.map((gift, idx) => (
                <motion.div
                  key={gift.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                >
                  <Card className={`glass-card h-full flex flex-col transition-all ${
                    gift.claimed ? 'border-emerald-500/30 opacity-75' : 'border-white/10 hover:border-amber-400/50'
                  }`}>
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-xl">{gift.name}</CardTitle>
                          <CardDescription className="text-xs mt-1">{gift.store}</CardDescription>
                        </div>
                        <div className="text-4xl ml-2">{gift.image}</div>
                      </div>
                    </CardHeader>
                    <CardContent className="flex-1 flex flex-col">
                      <p className="text-2xl font-bold text-amber-400 mb-4">R{gift.price.toLocaleString()}</p>
                      <div className="flex-1" />
                      {gift.claimed ? (
                        <Badge className="w-full justify-center bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
                          ✓ Claimed
                        </Badge>
                      ) : (
                        <Button className="w-full bg-gradient-to-r from-amber-600 to-pink-600 hover:from-amber-700 hover:to-pink-700">
                          <Heart className="mr-2" size={16} />
                          Claim This Gift
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </motion.div>

            {/* Registry Info */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <Card className="glass-card border-white/10">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Gift className="text-amber-400" size={24} />
                    About Our Registry
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-white/70">
                  <p>
                    We've curated a selection of items we need to start our life together. Every gift, no matter the size, is deeply appreciated and will help us create a beautiful home filled with love.
                  </p>
                  <p>
                    If you'd prefer to contribute to our honeymoon adventure instead, we have a separate fund where you can help us explore the world together!
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
