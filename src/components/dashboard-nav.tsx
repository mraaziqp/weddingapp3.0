
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Armchair,
  Bot,
  CalendarDays,
  CalendarHeart,
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

  return (
    <nav className="fixed bottom-[max(0.75rem,env(safe-area-inset-bottom))] left-1/2 z-50 -translate-x-1/2 px-2 sm:px-0">
      <motion.div 
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 300, damping: 20, delay: 0.5 }}
        className="flex max-w-[calc(100vw-1rem)] items-center gap-1 overflow-x-auto rounded-2xl border border-white/10 bg-white/5 px-2 py-2 shadow-2xl shadow-black/40 backdrop-blur-2xl sm:gap-3 sm:px-6 sm:py-3"
      >
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Tooltip key={item.href}>
              <TooltipTrigger asChild>
                <Link href={item.href} passHref>
                  <motion.div
                    whileHover={{ scale: 1.15 }}
                    whileTap={{ scale: 0.9 }}
                    transition={{ type: "spring", stiffness: 400, damping: 15 }}
                    className={cn(
                      `relative flex h-10 w-10 cursor-pointer items-center justify-center rounded-full transition-all duration-300 sm:h-12 sm:w-12`,
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
              </TooltipTrigger>
              <TooltipContent side="top" className="glass-card !rounded-lg !py-1 !px-2 !text-xs">
                <p>{item.label}</p>
              </TooltipContent>
            </Tooltip>
          )
        })}
      </motion.div>
    </nav>
  );
}
