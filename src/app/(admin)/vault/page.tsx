
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { Heart, Lock, Video } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { useState, useEffect } from 'react';

const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
        opacity: 1,
        transition: { staggerChildren: 0.07 }
    },
};

const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
};

export default function VaultPage() {
  const [mediaItems, setMediaItems] = useState<any[]>([]);
  const [confessionals, setConfessionals] = useState<any[]>([]);

  useEffect(() => {
    const generatedMedia = PlaceHolderImages.filter(p => p.id.startsWith('gallery-')).map((p, index) => ({
      ...p,
      guestName: 'A Guest',
      type: Math.random() > 0.3 ? 'image' : 'video',
      visibility: Math.random() > 0.5 ? 'public' : 'private',
      timestamp: new Date(Date.now() - Math.random() * 1000 * 60 * 60 * 24),
    }));

    const generatedConfessionals = generatedMedia.filter(item => item.type === 'video' && item.visibility === 'private').slice(0, 3);
    
    setMediaItems(generatedMedia);
    setConfessionals(generatedConfessionals);
  }, []);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-headline text-3xl font-bold italic tracking-tight">The Memory Vault</h1>
        <p className="text-muted-foreground tracking-wide">A private collection of all memories shared by your loved ones.</p>
      </div>

      <motion.div initial="hidden" animate="visible" variants={containerVariants}>
        <motion.div variants={itemVariants}>
            <Card className="glass-card">
                <CardHeader>
                    <CardTitle className="flex items-center gap-3">
                        <Heart className="text-red-400" />
                        The Confessional
                    </CardTitle>
                    <CardDescription>Private video messages left for you.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Carousel opts={{
                        align: "start",
                        loop: true,
                    }}>
                        <CarouselContent>
                            {confessionals.map((item) => (
                                <CarouselItem key={item.id} className="md:basis-1/2 lg:basis-1/3">
                                    <div className="p-1">
                                        <Card className="glass-card !p-0 overflow-hidden group">
                                            <div className='relative aspect-video'>
                                                <Image src={item.imageUrl} alt={item.description} fill className="object-cover transition-transform duration-300 group-hover:scale-105" data-ai-hint={item.imageHint}/>
                                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"/>
                                                <div className="absolute bottom-2 left-4 text-white">
                                                    <p className="font-bold text-sm">{item.guestName}</p>
                                                    <p className="text-xs">{item.timestamp.toLocaleTimeString()}</p>
                                                </div>
                                                <div className="absolute top-2 right-2">
                                                    <Video className="text-white/80" />
                                                </div>
                                            </div>
                                        </Card>
                                    </div>
                                </CarouselItem>
                            ))}
                        </CarouselContent>
                        <CarouselPrevious className='-left-4'/>
                        <CarouselNext className='-right-4' />
                    </Carousel>
                </CardContent>
            </Card>
        </motion.div>
        
        <Separator className="my-8 bg-white/10" />

        <div>
            <h2 className="font-headline text-2xl font-bold italic tracking-tight mb-4">Memory Timeline</h2>
            <div className="space-y-6">
                {mediaItems.map(item => (
                    <motion.div key={item.id} variants={itemVariants}>
                        <Card className="glass-card !p-4 flex items-start gap-4">
                            <Image src={item.imageUrl} alt={item.description} width={128} height={128} className="rounded-lg object-cover aspect-square" data-ai-hint={item.imageHint} />
                            <div className='flex-1'>
                                <div className="flex justify-between items-start">
                                    <div>
                                        <p className="font-bold text-aurora-soft-gold">{item.guestName}</p>
                                        <p className="text-xs text-muted-foreground">{item.timestamp.toLocaleString()}</p>
                                    </div>
                                    <Badge variant={item.visibility === 'public' ? 'secondary' : 'default'} className={cn(
                                        item.visibility === 'private' && 'bg-primary/50 text-primary-foreground border-primary',
                                        item.visibility === 'public' && 'bg-transparent border-muted-foreground text-muted-foreground'
                                    )}>
                                        {item.visibility === 'private' ? <Lock className="mr-2 h-3 w-3" /> : null}
                                        {item.visibility}
                                    </Badge>
                                </div>
                                <div className="mt-4 text-sm bg-black/20 p-3 rounded-lg border border-white/10">
                                    <p>"{item.description}"</p>
                                </div>
                            </div>
                        </Card>
                    </motion.div>
                ))}
            </div>
        </div>
      </motion.div>
    </div>
  );
}
