'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { LiveMasonryGrid } from './live-masonry-grid';
import Image from 'next/image';

export function LiveWallClient({ initialMedia }: { initialMedia: any[] }) {
  const [media, setMedia] = useState(initialMedia);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Load initial media
    const loadMedia = async () => {
      try {
        const { data } = await supabase
          .from('media')
          .select('*')
          .eq('visibility', 'public')
          .order('created_at', { ascending: false })
          .limit(50);

        setMedia(data || initialMedia);
      } catch (error) {
        console.error('Failed to load media:', error);
      }
    };

    loadMedia();

    // Subscribe to real-time updates
    const subscription = supabase
      .channel('live-wall')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'media', filter: 'visibility=eq.public' },
        (payload) => {
          setMedia((prev) => [payload.new, ...prev.slice(0, 49)]);
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [initialMedia]);

  return (
    <AnimatePresence mode="popLayout">
      <motion.div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 auto-rows-[200px]">
        {media.map((item) => (
          <motion.div
            key={item.id}
            layout
            initial={{ opacity: 0, scale: 0.8, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ type: 'spring', stiffness: 200, damping: 20 }}
            className="relative rounded-lg overflow-hidden bg-white/5 border border-white/10 group"
          >
            <Image
              src={item.media_url || 'https://via.placeholder.com/400'}
              alt="Guest photo"
              fill
              className="object-cover transition-transform duration-300 group-hover:scale-110"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <motion.div
              className="absolute bottom-3 left-3 right-3 text-white text-xs opacity-0 group-hover:opacity-100"
              initial={{ y: 10 }}
              whileHover={{ y: 0 }}
            >
              <p className="font-semibold">New Memory</p>
              <p className="text-white/60">Just now</p>
            </motion.div>
          </motion.div>
        ))}
      </motion.div>
    </AnimatePresence>
  );
}
