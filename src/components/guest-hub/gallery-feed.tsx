
'use client';
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from 'framer-motion';
import { Download, Camera } from 'lucide-react';
import { LiveMasonryGrid } from "../live-masonry-grid";
import { fetchPublicWallItems, fetchAlbums, WallItem, type Album } from "@/lib/media";
import { Button } from "../ui/button";

const ALL = "All";

interface GalleryFeedProps {
  partyMode?: boolean;
  isMorningAfter?: boolean;
  /** Bumped by the parent after an upload, to pull the wall again immediately
   *  rather than leaving the guest waiting out the 20s poll for their own photo. */
  refreshKey?: number;
}

export function GalleryFeed({ partyMode = false, isMorningAfter = false, refreshKey = 0 }: GalleryFeedProps) {
    // These chips used to be a fixed, decorative list that filtered nothing.
    // They are now the real albums the couple has filed photos into, so the
    // Watna & Mendhi and engagement sets are one tap apart.
    const [activeFilter, setActiveFilter] = useState(ALL);
    const [albums, setAlbums] = useState<Album[]>([]);
    const [mediaItems, setMediaItems] = useState<WallItem[]>([]);
    // Listing 60 files out of Drive takes a few seconds on a cold function.
    // Without this the wall rendered "No memories yet" for that whole window,
    // which reads as a broken gallery rather than a loading one.
    const [hasLoaded, setHasLoaded] = useState(false);

    // Real guest uploads — refreshed every 20s so new captures appear live.
    // Filtering goes back to the server rather than slicing the loaded page,
    // so an album with more photos than one page still shows all of them.
    useEffect(() => {
        let cancelled = false;
        setHasLoaded(false);
        const load = () => {
            fetchPublicWallItems(60, activeFilter === ALL ? undefined : activeFilter)
                .then(items => { if (!cancelled) setMediaItems(items); })
                .catch(() => {})
                .finally(() => { if (!cancelled) setHasLoaded(true); });
        };
        load();
        const id = setInterval(load, 20_000);
        return () => { cancelled = true; clearInterval(id); };
        // refreshKey re-runs this so a guest sees their own upload immediately.
    }, [refreshKey, activeFilter]);

    useEffect(() => {
        let cancelled = false;
        fetchAlbums()
            .then(r => { if (!cancelled) setAlbums(r.albums); })
            .catch(() => {});
        return () => { cancelled = true; };
    }, [refreshKey]);

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
              ) : null}
              {/*
                No "normal" header here any more — this feed only ever mounts
                inside the dashboard's own gallery tab, which already renders
                "Live Memory Wall" and its own Add Photo button right above.
                The repeated title read as a mistake, not as emphasis.
              */}
            </AnimatePresence>

            {/* Filter chips — hidden in morning-after mode */}
            {!isMorningAfter && albums.length > 0 && (
              <div className="pb-6 overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                  <div className="flex gap-2 w-max">
                      {[ALL, ...albums.map(a => a.name)].map(filter => (
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
                              {filter !== ALL && (
                                <span className="ml-1.5 opacity-60">
                                  {albums.find(a => a.name === filter)?.count}
                                </span>
                              )}
                          </Button>
                      ))}
                  </div>
              </div>
            )}
            
            {!hasLoaded ? (
                <div
                    className="flex flex-col items-center justify-center py-16 text-center"
                    style={{ color: subtitleColor }}
                >
                    <div
                        className="mb-3 h-9 w-9 animate-spin rounded-full border-2 border-t-transparent"
                        style={{ borderColor: '#d4af37', borderTopColor: 'transparent' }}
                    />
                    <p className="font-headline italic text-xl" style={{ color: headingColor }}>
                        Loading the memories…
                    </p>
                </div>
            ) : mediaItems.length === 0 ? (
                <div
                    className="flex flex-col items-center justify-center py-16 text-center"
                    style={{ color: subtitleColor }}
                >
                    <Camera size={36} className="mb-3 opacity-60" />
                    <p className="font-headline italic text-xl" style={{ color: headingColor }}>
                        {activeFilter === ALL ? 'No memories yet' : `Nothing in ${activeFilter} yet`}
                    </p>
                    <p className="text-sm mt-1">Snap the first photo with the disposable camera!</p>
                </div>
            ) : (
                <LiveMasonryGrid mediaItems={mediaItems} />
            )}
        </div>
    )
}

