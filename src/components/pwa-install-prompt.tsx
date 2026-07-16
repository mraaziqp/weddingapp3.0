'use client';

import { useState, useEffect } from 'react';
import { Download, X, Share, Smartphone, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export function PwaInstallPrompt() {
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    // 1. Guard for SSR
    if (typeof window === 'undefined') return;

    // 2. Check if already installed / running in standalone mode
    const isStandalone = 
      window.matchMedia('(display-mode: standalone)').matches || 
      (window.navigator as any).standalone === true;
    
    if (isStandalone) return;

    // 3. Check if recently dismissed (within 24 hours to stay active since invites are currently live)
    const dismissedTime = localStorage.getItem('pwa_prompt_dismissed');
    if (dismissedTime) {
      const diff = Date.now() - parseInt(dismissedTime, 10);
      const oneDay = 24 * 60 * 60 * 1000;
      if (diff < oneDay) return;
    }

    // 4. Detect iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const detectIos = /iphone|ipad|ipod/.test(userAgent);
    setIsIos(detectIos);

    // 5. Handle Android / Samsung / Honor / Huawei / Chrome install prompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      // Wait a short delay before showing to ensure page load is smooth
      setTimeout(() => setShowPrompt(true), 3500);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // For iOS, since there's no native event, we show it after a delay
    if (detectIos) {
      setTimeout(() => setShowPrompt(true), 5000);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
      setShowPrompt(false);
    }
  };

  const handleDismiss = () => {
    localStorage.setItem('pwa_prompt_dismissed', Date.now().toString());
    setShowPrompt(false);
  };

  return (
    <AnimatePresence>
      {showPrompt && (
        <motion.div
          initial={{ opacity: 0, y: 50, x: '-50%' }}
          animate={{ opacity: 1, y: 0, x: '-50%' }}
          exit={{ opacity: 0, y: 20, x: '-50%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="fixed bottom-6 left-1/2 z-50 w-[calc(100%-2rem)] max-w-sm"
        >
          <div className="glass-card-static !bg-[#0f1d13]/92 !border-[#d4af37]/35 shadow-2xl rounded-2xl p-4 text-white relative overflow-hidden">
            {/* Elegant decorative top border */}
            <div className="absolute top-0 left-0 right-0 h-[2.5px] bg-gradient-to-r from-transparent via-[#d4af37]/60 to-transparent" />
            
            <button 
              onClick={handleDismiss} 
              className="absolute top-3 right-3 text-white/50 hover:text-white transition-colors"
              aria-label="Close"
            >
              <X size={16} />
            </button>

            <div className="flex items-start gap-3">
              <div className="p-2.5 bg-[#d4af37]/20 rounded-xl text-[#d4af37] shrink-0 mt-0.5">
                {isIos ? <Share size={18} /> : <Download size={18} />}
              </div>

              <div className="flex-1 pr-6">
                <h3 className="font-headline text-lg italic text-[#f6e7b7] flex items-center gap-1.5 leading-tight">
                  Add to Home Screen
                  <Sparkles size={13} className="text-[#d4af37] animate-pulse" />
                </h3>
                
                {isIos ? (
                  <p className="text-xs text-white/85 mt-1 leading-relaxed">
                    Tap the <strong className="text-[#f6e7b7] font-semibold">Share</strong> button in Safari, then select <strong className="text-[#f6e7b7] font-semibold">"Add to Home Screen"</strong> to install the Wedu App on your phone.
                  </p>
                ) : (
                  <p className="text-xs text-white/85 mt-1 leading-relaxed">
                    Install this app on your device screen for instant access to invitations, timelines, seating, and live updates.
                  </p>
                )}

                {!isIos && (
                  <button
                    onClick={handleInstallClick}
                    className="mt-3 w-full bg-[#d4af37] text-[#0f1d13] text-xs font-bold py-2 px-4 rounded-lg hover:bg-[#f6e7b7] transition-all flex items-center justify-center gap-1.5 shadow-md active:scale-95"
                  >
                    <Smartphone size={14} />
                    Install Wedu App
                  </button>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
