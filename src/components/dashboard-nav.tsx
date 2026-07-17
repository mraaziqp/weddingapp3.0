
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
  Grid3x3,
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
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
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
  const [menuOpen, setMenuOpen] = useState(false);

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

  // Close the "all tools" menu automatically whenever navigation happens —
  // otherwise a guest tapping a tile lands on the new page with the sheet
  // still open over it.
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  const scrollByAmount = (dir: 1 | -1) => {
    scrollerRef.current?.scrollBy({ left: dir * 160, behavior: 'smooth' });
  };

  const activeItem = navItems.find((item) => item.href === pathname);

  return (
    <>
      <nav className="fixed bottom-[max(0.75rem,env(safe-area-inset-bottom))] left-1/2 z-50 -translate-x-1/2 px-2 sm:px-0">
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ type: "spring", stiffness: 300, damping: 20, delay: 0.5 }}
          className="relative flex max-w-[calc(100vw-1rem)] items-center rounded-2xl border border-white/10 bg-white/5 shadow-2xl shadow-black/40 backdrop-blur-2xl"
        >
          {/* "All Tools" menu button — the primary way to jump anywhere on
              mobile, where scanning icons in a horizontal scroll strip
              (with no visible labels) is genuinely hard to navigate.
              Always present, both mobile and desktop, at the front of the bar. */}
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            aria-label="Open all admin tools"
            className="relative flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-gray-300 transition-colors hover:text-white sm:h-12 sm:w-12 mx-1 sm:mx-1.5"
          >
            <Grid3x3 size={24} className="sm:hidden" />
            <Grid3x3 size={26} className="hidden sm:block" />
          </button>
          <div className="h-6 w-px shrink-0 bg-white/10 sm:h-8" />

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

        {/* Current-page label — makes the icon-only bar meaningful on
            touch devices, where the desktop hover tooltips never show. */}
        {activeItem && (
          <p className="mt-1.5 text-center text-[10px] font-semibold uppercase tracking-[0.2em] text-[#f6e7b7]/70 sm:hidden">
            {activeItem.label}
          </p>
        )}
      </nav>

      {/* "All Tools" menu — a scannable, labeled grid of every admin
          destination, so finding the right tool never requires scrolling
          through 15 unlabeled icons or knowing what each one means. */}
      <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
        <SheetContent side="bottom" className="glass-card max-h-[80vh] overflow-y-auto rounded-t-3xl border-t border-white/10 bg-[#0b1210]/95 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
          <SheetHeader>
            <SheetTitle className="font-headline text-xl italic text-[#f6e7b7]">All Admin Tools</SheetTitle>
          </SheetHeader>
          <div className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-4">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  prefetch={false}
                  className={cn(
                    "flex flex-col items-center gap-2 rounded-2xl border p-3 text-center transition-colors",
                    isActive
                      ? "border-[#d4af37]/60 bg-[#d4af37]/15 text-[#f6e7b7]"
                      : "border-white/10 bg-white/[0.03] text-gray-300 hover:border-[#d4af37]/30 hover:bg-white/[0.06] hover:text-white"
                  )}
                >
                  <span className={cn("flex h-10 w-10 items-center justify-center rounded-full", isActive ? "bg-[#d4af37]/20" : "bg-white/5")}>
                    {item.icon}
                  </span>
                  <span className="text-[11px] font-medium leading-tight">{item.label}</span>
                </Link>
              );
            })}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
