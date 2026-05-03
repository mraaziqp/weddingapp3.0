'use client';

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface LuxuryLoaderProps {
  label?: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

const sizeMap = {
  sm: { ring: 'w-12 h-12', text: 'text-xs', inner: 'inset-2' },
  md: { ring: 'w-20 h-20', text: 'text-sm', inner: 'inset-3' },
  lg: { ring: 'w-28 h-28', text: 'text-base', inner: 'inset-4' },
};

export function LuxuryLoader({ label = 'Curating...', className, size = 'md' }: LuxuryLoaderProps) {
  const { ring, text, inner } = sizeMap[size];

  return (
    <div className={cn('flex flex-col items-center gap-4', className)}>
      <motion.div
        className={cn('relative flex items-center justify-center', ring)}
        animate={{ scale: [0.95, 1.05, 0.95] }}
        transition={{ duration: 2.4, ease: 'easeInOut', repeat: Infinity }}
      >
        {/* Outer glowing ring */}
        <motion.div
          className="absolute inset-0 rounded-full border-2 border-[#d4af37]"
          animate={{ opacity: [0.4, 1, 0.4], boxShadow: ['0 0 6px 2px rgba(212,175,55,0.15)', '0 0 22px 6px rgba(212,175,55,0.45)', '0 0 6px 2px rgba(212,175,55,0.15)'] }}
          transition={{ duration: 2.4, ease: 'easeInOut', repeat: Infinity }}
        />
        {/* Inner subtle ring */}
        <div className={cn('absolute rounded-full border border-[#d4af37]/20', inner)} />
        {/* Monogram */}
        <span className="font-headline text-lg italic font-semibold text-[#d4af37] select-none">R&A</span>
      </motion.div>

      <motion.p
        className={cn('tracking-[0.3em] uppercase font-light text-[#d4af37]/80', text)}
        animate={{ opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 2.4, ease: 'easeInOut', repeat: Infinity }}
      >
        {label}
      </motion.p>
    </div>
  );
}
