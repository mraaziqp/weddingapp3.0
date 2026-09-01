
'use client';

import { motion } from "framer-motion";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { Heart } from "lucide-react";
import { useState } from "react";
import { isVideoItem, type WallItem } from "@/lib/media";
import { CinematicGalleryLightbox } from "./cinematic-gallery-lightbox";

// Generates a base64 gold blur placeholder so images "reveal" from a warm
// champagne shimmer rather than a grey void.
const toBase64 = (str: string) =>
  typeof window === 'undefined' ? Buffer.from(str).toString('base64') : window.btoa(str);

const GOLD_BLUR_DATA_URL = `data:image/svg+xml;base64,${toBase64(
  `<svg xmlns="http://www.w3.org/2000/svg" width="50" height="50"><rect width="50" height="50" fill="#d4af37" opacity="0.25"/></svg>`
)}`;

const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
        opacity: 1,
        transition: { staggerChildren: 0.1, delayChildren: 0.2 }
    },
};

const itemVariants = {
    hidden: { opacity: 0, y: 50, scale: 0.9 },
    visible: { opacity: 1, y: 0, scale: 1, transition: { type: 'spring', stiffness: 100 } },
};

const Polaroid = ({
    item,
    className,
    onClick,
}: {
    item: WallItem;
    className?: string;
    onClick?: () => void;
}) => {
    const [isLiked, setIsLiked] = useState(false);
    
    return (
     <motion.div 
        variants={itemVariants} 
        onClick={onClick}
        className={cn("break-inside-avoid-column p-2 pb-4 bg-white/90 rounded-sm shadow-lg rotate-[-2deg] transition-transform duration-300 hover:rotate-0 hover:scale-105 cursor-pointer", className)}
    >
        <div className="relative">
            {isVideoItem(item) ? (
                <>
                    <video
                        src={item.imageUrl}
                        className="w-full h-auto object-cover"
                        muted
                        playsInline
                        preload="metadata"
                    />
                    {/* Play affordance — the tile opens the lightbox, which is
                        where the clip actually plays with controls. */}
                    <span className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <span className="flex h-11 w-11 items-center justify-center rounded-full bg-black/55 backdrop-blur-sm">
                            <span className="ml-0.5 block h-0 w-0 border-y-[7px] border-l-[12px] border-y-transparent border-l-white" />
                        </span>
                    </span>
                </>
            ) : (
            <Image
                src={item.imageUrl}
                alt={item.description}
                // Drive reports each photo's real pixel size; using it keeps
                // portrait shots from being reserved as squares and reflowing
                // the whole column once they load.
                width={item.width ?? 500}
                height={item.height ?? 500}
                // The grid is 2 columns on phones, 3 from `sm` up. Without
                // this next/image picks a candidate from the intrinsic width
                // (up to 1600px), so a guest on venue cellular downloaded a
                // full-size photo for a half-screen-wide polaroid.
                sizes="(min-width: 640px) 33vw, 50vw"
                className="w-full h-auto object-cover"
                placeholder="blur"
                blurDataURL={GOLD_BLUR_DATA_URL}
                data-ai-hint={item.imageHint}
            />
            )}
        </div>
        <div className="flex justify-between items-center pt-3 px-1">
            <p className="font-headline text-center text-lg italic text-black">{item.guestName}</p>
            <button onClick={() => setIsLiked(!isLiked)} className="flex items-center gap-1 text-gray-500">
                <Heart className={cn("transition-colors", isLiked ? 'text-red-500 fill-current' : 'text-gray-400')} size={16} />
                <span className="text-sm font-medium">{item.likes + (isLiked ? 1 : 0)}</span>
            </button>
        </div>
    </motion.div>
)};

export function LiveMasonryGrid({ mediaItems }: { mediaItems: WallItem[] }) {
    const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

    return (
        <>
            <motion.div
                className="columns-2 sm:columns-3 gap-4 space-y-4"
                variants={containerVariants}
                initial="hidden"
                animate="visible"
            >
                {mediaItems.map((item, i) => (
                    <Polaroid
                        key={item.id}
                        item={item}
                        onClick={() => setLightboxIndex(i)}
                        className={cn(
                            i % 4 === 1 && "rotate-[3deg]",
                            i % 4 === 2 && "rotate-[-4deg]",
                            i % 4 === 3 && "rotate-[1deg]",
                        )}
                    />
                ))}
            </motion.div>

            <CinematicGalleryLightbox
                items={mediaItems}
                currentIndex={lightboxIndex}
                onClose={() => setLightboxIndex(null)}
                onNavigate={setLightboxIndex}
            />
        </>
    );
}
