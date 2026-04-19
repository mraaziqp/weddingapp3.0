'use client';

import type { ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useToast } from '@/hooks/use-toast';
import { CheckCircle, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

function LuxuryToastItem({ toast }: { toast: { id: string; title?: ReactNode; description?: ReactNode; variant?: string | null } }) {
  return (
    <motion.div
      layout
      key={toast.id}
      initial={{ y: -50, opacity: 0, scale: 0.95 }}
      animate={{ y: 0, opacity: 1, scale: 1 }}
      exit={{ y: -40, opacity: 0, scale: 0.9 }}
      transition={{ type: 'spring', stiffness: 380, damping: 28 }}
      className={cn(
        'flex items-center gap-3 px-5 py-3.5 rounded-full shadow-2xl',
        'bg-[#1C1C1C]/95 backdrop-blur-xl border border-white/10',
        toast.variant === 'destructive' && 'border-red-500/40'
      )}
    >
      {toast.variant === 'destructive' ? (
        <AlertTriangle size={16} className="text-red-400 shrink-0" />
      ) : (
        <CheckCircle size={16} className="text-[#d4af37] shrink-0" />
      )}
      <div>
        {toast.title && (
          <p className={cn(
            'text-sm font-semibold leading-none',
            toast.variant === 'destructive' ? 'text-red-300' : 'text-[#f6e7b7]'
          )}>
            {toast.title}
          </p>
        )}
        {toast.description && (
          <p className="text-xs text-white/50 mt-1">{toast.description}</p>
        )}
      </div>
    </motion.div>
  );
}

export function LuxuryToaster() {
  const { toasts } = useToast();

  return (
    <div className="fixed top-5 left-1/2 -translate-x-1/2 z-[200] flex flex-col items-center gap-2 pointer-events-none">
      <AnimatePresence mode="sync">
        {toasts
          .filter(t => t.open)
          .map(toast => (
            <LuxuryToastItem key={toast.id} toast={toast} />
          ))}
      </AnimatePresence>
    </div>
  );
}
