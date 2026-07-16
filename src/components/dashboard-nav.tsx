
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, useCallback } from "react";
import {
  Armchair,
  Bot,
  CalendarDays,
  CalendarHeart,
  ChevronLeft,
  ChevronRight,
  Gift,
  Heart,
  LayoutDashboard,
  Mail,
  Music,
  QrCode,
  Users,
  DollarSign,
  Briefcase,
  Sparkles,
} from "lucide-react";
import { motion } from "framer-motion";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/dashboard", icon: <LayoutDashboard size={28} />, label: "Dashboard" },
  { href: "/guests", icon: <Users size={28} />, label: "Guest Ledger" },
  { href: "/seating", icon: <Armchair size={28} />, label: "Seating Studio" },
  { href: "/budget", icon: <DollarSign size={28} />, label: "Budget" },
  { href: "/vendors", icon: <Briefcase size={28} />, label: "Vendors" },
  { href: "/registry", icon: <Gift size={28} />, label: "Registry" },
  { href: "/vault", icon: <Heart size={28} />, label: "Memory Vault" },
  { href: "/playlist", icon: <Music size={28} />, label: "Playlist" },
  { href: "/ai-secretary", icon: <Bot size={28} />, label: "AI Secretary" },
  { href: "/invites", icon: <Mail size={28} />, label: "Invite Studio" },
  { href: "/invitation-editor", icon: <Sparkles size={28} />, label: "Invitation Editor" },
  { href: "/rsvp-analytics", icon: <QrCode size={28} />, label: "RSVP Analytics" },
  { href: "/save-the-date", icon: <CalendarHeart size={28} />, label: "Save the Date" },
  { href: "/qr-scanner", icon: <QrCode size={28} />, label: "Bouncer Mode" },
  { href: "/planner", icon: <CalendarDays size={28} />, label: "Planner Suite" },
];

export function DashboardNav() {
  const pathname = usePathname();
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  const updateScrollState = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }, []);

  // Keep the active tab in view, and recompute scroll affordances whenever
  // the nav resizes or the route changes (15 tabs never all fit on mobile).
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const active = el.querySelector<HTMLElement>('[data-active="true"]');
    active?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    updateScrollState();
    setIsMobile(window.innerWidth < 640);

    const resizeObserver = new ResizeObserver(updateScrollState);
    resizeObserver.observe(el);
    el.addEventListener('scroll', updateScrollState, { passive: true });
    return () => {
      resizeObserver.disconnect();
      el.removeEventListener('scroll', updateScrollState);
    };
  }, [pathname, updateScrollState]);

  const scrollByAmount = (dir: 1 | -1) => {
    scrollerRef.current?.scrollBy({ left: dir * 160, behavior: 'smooth' });
  };

  return (
    <nav className="fixed bottom-[max(0.75rem,env(safe-area-inset-bottom))] left-1/2 z-50 -translate-x-1/2 px-2 sm:px-0">
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 300, damping: 20, delay: 0.5 }}
        className="relative flex max-w-[calc(100vw-1rem)] items-center rounded-2xl border border-white/10 bg-white/5 shadow-2xl shadow-black/40 backdrop-blur-2xl"
      >
        {/* Left scroll affordance */}
        {canScrollLeft && (
          <>
            <div className="pointer-events-none absolute left-9 top-0 bottom-0 z-10 w-8 rounded-l-2xl bg-gradient-to-r from-black/40 to-transparent sm:left-11" />
            <button
              type="button"
              aria-label="Scroll navigation left"
              onClick={() => scrollByAmount(-1)}
              className="absolute left-0.5 z-20 flex h-9 w-8 items-center justify-center rounded-full text-white/70 hover:text-white sm:h-11"
            >
              <ChevronLeft size={18} />
            </button>
          </>
        )}

        <div
          ref={scrollerRef}
          className="flex items-center gap-1 overflow-x-auto scroll-smooth px-2 py-2 sm:gap-3 sm:px-6 sm:py-3"
          style={{ scrollbarWidth: 'none' }}
        >
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            const linkContent = (
              <Link href={item.href} passHref prefetch={false}>
                <motion.div
                  data-active={isActive}
                  whileHover={isMobile ? undefined : { scale: 1.15 }}
                  whileTap={{ scale: 0.9 }}
                  transition={{ type: "spring", stiffness: 400, damping: 15 }}
                  className={cn(
                    `relative flex h-10 w-10 flex-shrink-0 cursor-pointer items-center justify-center rounded-full transition-all duration-300 sm:h-12 sm:w-12`,
                    isActive ? 'text-black' : 'text-gray-300 hover:text-white'
                  )}
                >
                  {isActive && (
                    <motion.div
                      layoutId="active-nav-item"
                      className="absolute inset-0 rounded-full bg-gradient-to-r from-[#d4af37] to-[#f6e7b7] shadow-[0_0_20px_rgba(212,175,55,0.4)]"
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.8, opacity: 0 }}
                      transition={{ type: "spring", stiffness: 500, damping: 30 }}
                    />
                  )}
                  <div className="relative z-10">
                    {item.icon}
                  </div>
                </motion.div>
              </Link>
            );

            if (isMobile) {
              return (
                <div key={item.href}>
                  {linkContent}
                </div>
              );
            }

            return (
              <Tooltip key={item.href}>
                <TooltipTrigger asChild>
                  {linkContent}
                </TooltipTrigger>
                <TooltipContent side="top" className="glass-card !rounded-lg !py-1 !px-2 !text-xs">
                  <p>{item.label}</p>
                </TooltipContent>
              </Tooltip>
            );
          })}
        </div>

        {/* Right scroll affordance — the main signal that more tabs exist off-screen */}
        {canScrollRight && (
          <>
            <div className="pointer-events-none absolute right-9 top-0 bottom-0 z-10 w-8 rounded-r-2xl bg-gradient-to-l from-black/40 to-transparent sm:right-11" />
            <button
              type="button"
              aria-label="Scroll navigation right"
              onClick={() => scrollByAmount(1)}
              className="absolute right-0.5 z-20 flex h-9 w-8 items-center justify-center rounded-full text-white/70 hover:text-white sm:h-11"
            >
              <ChevronRight size={18} />
            </button>
          </>
        )}
      </motion.div>
    </nav>
  );
}
