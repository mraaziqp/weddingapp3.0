
'use client';

import { motion } from "framer-motion";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { Heart } from "lucide-react";
import { useState } from "react";

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

const Polaroid = ({ item, className }: {item: any, className?: string}) => {
    const [isLiked, setIsLiked] = useState(false);
    
    return (
     <motion.div 
        variants={itemVariants} 
        className={cn("break-inside-avoid-column p-2 pb-4 bg-white/90 rounded-sm shadow-lg rotate-[-2deg] transition-transform duration-300 hover:rotate-0 hover:scale-105", className)}
    >
        <div className="relative">
            <Image 
                src={item.imageUrl} 
                alt={item.description} 
                width={500} 
                height={500} 
                className="w-full h-auto object-cover"
                placeholder="blur"
                blurDataURL={GOLD_BLUR_DATA_URL}
                data-ai-hint={item.imageHint}
            />
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

export function LiveMasonryGrid({ mediaItems }: { mediaItems: any[] }) {

    return (
        <motion.div 
            className="columns-2 sm:columns-3 gap-4 space-y-4"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
        >
            {mediaItems.map((item, i) => (
                <Polaroid key={item.id} item={item} className={cn(
                    i % 4 === 1 && "rotate-[3deg]",
                    i % 4 === 2 && "rotate-[-4deg]",
                    i % 4 === 3 && "rotate-[1deg]",
                )}/>
            ))}
        </motion.div>
    );
}
