'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, Download } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import Image from 'next/image';
import type { Media } from '@/lib/types';

export default function VaultPage() {
  const [mediaItems, setMediaItems] = useState<Media[]>([]);
  const [activeTab, setActiveTab] = useState<'shared' | 'private'>('shared');
  const [loading, setLoading] = useState(true);
  const [selectedPhoto, setSelectedPhoto] = useState<Media | null>(null);
  const [likes, setLikes] = useState<Record<string, number>>({});
  const { toast } = useToast();

  useEffect(() => {
    loadMedia();
    // loadMedia reads activeTab, which is the dependency that matters here.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  const loadMedia = async () => {
    try {
      setLoading(true);
      const visibility = activeTab === 'shared' ? 'public' : 'private';
      const { data } = await supabase
        .from('media')
        .select('*')
        .eq('visibility', visibility)
        .eq('media_type', 'image')
        .order('created_at', { ascending: false })
        .limit(50);

      setMediaItems(data || []);
    } catch (error) {
      console.error('Failed to load media:', error);
      toast({ variant: 'destructive', title: 'Failed to load vault' });
    } finally {
      setLoading(false);
    }
  };

  const toggleLike = (id: string) => {
    setLikes(prev => ({
      ...prev,
      [id]: (prev[id] || 0) + 1
    }));
  };

  const downloadPhoto = async (url: string, name: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = name || 'photo.jpg';
      a.click();
      toast({ title: 'Photo downloaded' });
    } catch {
      toast({ variant: 'destructive', title: 'Failed to download' });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="font-headline text-3xl font-bold italic tracking-tight text-amber-50">💝 Memory Vault</h1>
        <p className="text-white/50 text-sm mt-2">Every precious moment from your loved ones</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-3">
        {['shared', 'private'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab as 'shared' | 'private')}
            className={`px-4 py-2 rounded-lg font-semibold transition-all ${
              activeTab === tab
                ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/30'
                : 'bg-white/5 text-white/60 hover:bg-white/10'
            }`}
          >
            {tab === 'shared' ? '📸 Shared Gallery' : '🔒 Private Vault'}
            <span className="text-xs ml-2">({mediaItems.length})</span>
          </button>
        ))}
      </div>

      {/* Loading State */}
      {loading && (
        <div className="text-center py-12 text-white/40">
          <p>Loading memories...</p>
        </div>
      )}

      {/* Photos Grid */}
      {!loading && (
        <AnimatePresence>
          {mediaItems.length === 0 ? (
            <div className="text-center py-12 text-white/40">
              <Heart className="mx-auto mb-4 opacity-30" size={40} />
              <p>No {activeTab} memories yet</p>
            </div>
          ) : (
            <motion.div
              layout
              className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              {mediaItems.map((item) => (
                <motion.div
                  key={item.id}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  whileHover={{ scale: 1.02 }}
                  onClick={() => setSelectedPhoto(item)}
                  className="relative group rounded-lg overflow-hidden bg-white/5 border border-white/10 cursor-pointer"
                >
                  {/* Image */}
                  <div className="relative w-full aspect-square">
                    <Image
                      src={item.media_url || 'https://via.placeholder.com/400'}
                      alt="Guest photo"
                      fill
                      className="object-cover transition-transform duration-300 group-hover:scale-110"
                    />
                  </div>

                  {/* Hover Overlay */}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleLike(item.id);
                      }}
                      className="p-2 bg-white/20 rounded-full hover:bg-white/30 transition-colors"
                    >
                      <Heart size={20} className="text-red-400" fill="currentColor" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        downloadPhoto(item.media_url, `photo-${item.id}.jpg`);
                      }}
                      className="p-2 bg-white/20 rounded-full hover:bg-white/30 transition-colors"
                    >
                      <Download size={20} className="text-white" />
                    </button>
                  </div>

                  {/* Like Badge */}
                  {likes[item.id] > 0 && (
                    <Badge className="absolute top-2 left-2 bg-red-500/80">
                      ❤️ {likes[item.id]}
                    </Badge>
                  )}
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      )}

      {/* Lightbox Modal */}
      {selectedPhoto && (
        <div
          onClick={() => setSelectedPhoto(null)}
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            onClick={(e) => e.stopPropagation()}
            className="relative max-w-2xl w-full"
          >
            <Image
              src={selectedPhoto.media_url || 'https://via.placeholder.com/600'}
              alt="Full photo"
              width={600}
              height={600}
              className="w-full rounded-lg"
            />
            <button
              onClick={() => setSelectedPhoto(null)}
              className="absolute -top-10 right-0 text-white hover:text-amber-400 transition-colors"
            >
              ✕
            </button>
          </motion.div>
        </div>
      )}
    </div>
  );
}
