
'use client';
import { useState } from "react";
import { motion, AnimatePresence } from 'framer-motion';
import { Download } from 'lucide-react';
import { LiveMasonryGrid } from "../live-masonry-grid";
import { PlaceHolderImages } from "@/lib/placeholder-images";
import { Button } from "../ui/button";

const filters = ["All", "Ceremony", "Candid Vibes", "Dance Floor", "Speeches"];

interface GalleryFeedProps {
  partyMode?: boolean;
  isMorningAfter?: boolean;
}

export function GalleryFeed({ partyMode = false, isMorningAfter = false }: GalleryFeedProps) {
    const [activeFilter, setActiveFilter] = useState("All");

    const mediaItems = PlaceHolderImages.filter(p => p.id.startsWith('gallery-')).map((p, index) => ({
      ...p,
      id: p.id + '-' + index,
      guestName: ['Aunt Fatima', 'Cousin Mike', 'Sarah Smith', 'John Doe', 'Jane Doe', 'Uncle Bob'][index % 6],
      likes: Math.floor(Math.random() * 50),
    }));

    // Text colours adapt to party mode dark background
    const headingColor  = partyMode ? '#f6e7b7' : '#1C1C1C';
    const subtitleColor = partyMode ? 'rgba(246,231,183,0.5)' : '#6b7280';

    return (
        <div className="p-4">
            <AnimatePresence mode="wait">
              {isMorningAfter ? (
                /* ── Morning After: Thank You state ─────────────── */
                <motion.div
                  key="morning-after-header"
                  initial={{ opacity: 0, y: 24 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.7, ease: 'easeOut' }}
                  className="text-center py-10 px-6"
                >
                  <motion.p
                    className="font-headline italic text-5xl text-[#d4af37]"
                    initial={{ scale: 0.7, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.2, type: 'spring', stiffness: 120 }}
                    style={{ textShadow: '0 0 30px rgba(212,175,55,0.3)' }}
                  >
                    Thank You
                  </motion.p>
                  <motion.p
                    className="font-headline italic text-2xl text-[#1C1C1C] mt-2 mb-4"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.45 }}
                  >
                    Razia &amp; Abduraziq
                  </motion.p>
                  <motion.div
                    className="mx-auto h-px bg-gradient-to-r from-transparent via-[#d4af37]/50 to-transparent mb-5"
                    initial={{ width: 0 }}
                    animate={{ width: 128 }}
                    transition={{ delay: 0.65, duration: 0.8 }}
                  />
                  <motion.p
                    className="text-gray-500 text-sm max-w-xs mx-auto leading-relaxed mb-7"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.9 }}
                  >
                    Thank you for celebrating our special day with us.
                    These memories will live in our hearts forever. ❤️
                  </motion.p>
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 1.1 }}
                  >
                    <Button
                      className="bg-[#d4af37] text-black font-bold rounded-full px-8 hover:bg-[#b8992d] shadow-[0_4px_20px_rgba(212,175,55,0.35)]"
                      onClick={() => window.open('/live-wall', '_blank')}
                    >
                      <Download className="mr-2 h-4 w-4" />
                      Browse All Memories
                    </Button>
                  </motion.div>
                </motion.div>
              ) : (
                /* ── Normal header ───────────────────────────────── */
                <motion.header
                  key="normal-header"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center mb-6"
                >
                  <h1
                    className="font-headline text-3xl font-bold italic"
                    style={{ color: headingColor, transition: 'color 2.5s ease' }}
                  >
                    Live Memory Wall
                  </h1>
                  <p
                    className="tracking-wide mt-1 text-sm"
                    style={{ color: subtitleColor, transition: 'color 2.5s ease' }}
                  >
                    Photos &amp; videos from the celebration
                  </p>
                </motion.header>
              )}
            </AnimatePresence>

            {/* Filter chips — hidden in morning-after mode */}
            {!isMorningAfter && (
              <div className="pb-6 overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                  <div className="flex gap-2 w-max">
                      {filters.map(filter => (
                          <Button
                              key={filter}
                              variant={activeFilter === filter ? "default" : "outline"}
                              onClick={() => setActiveFilter(filter)}
                              className={
                                activeFilter === filter
                                  ? "bg-[#D4AF37] border-[#D4AF37] text-black rounded-full"
                                  : partyMode
                                    ? "border-[#d4af37]/20 text-[#f6e7b7]/55 rounded-full bg-transparent hover:bg-[#d4af37]/10"
                                    : "border-gray-300 text-gray-500 rounded-full bg-white/50 hover:bg-white"
                              }
                          >
                              {filter}
                          </Button>
                      ))}
                  </div>
              </div>
            )}
            
            <LiveMasonryGrid mediaItems={mediaItems} />
        </div>
    )
}

