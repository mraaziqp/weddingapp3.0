'use client';
import { DashboardNav } from "@/components/dashboard-nav";
import { AdminGlobalSearch } from "@/components/admin-global-search";
import { AnimatePresence, motion } from "framer-motion";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="dark">
      <div className={cn("bg-background text-foreground")}>
        <div className="fixed inset-0 -z-20 h-full w-full bg-[linear-gradient(135deg,var(--aurora-emerald),var(--aurora-emerald-deep),#111)] bg-[length:400%_400%] animate-[auroraShift_18s_ease_infinite]" />
        <div className="fixed inset-0 -z-10 h-full w-full bg-[url('data:image/svg+xml,%3Csvg%20viewBox%3D%220%200%20700%20700%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cfilter%20id%3D%22noiseFilter%22%3E%3CfeTurbulence%20type%3D%22fractalNoise%22%20baseFrequency%3D%220.65%22%20numOctaves%3D%223%22%20stitchTiles%3D%22stitch%22%2F%3E%3C%2Ffilter%3E%3Crect%20width%3D%22100%25%22%20height%3D%22100%25%22%20filter%3D%22url(%23noiseFilter)%22%2F%3E%3C%2Fsvg%3E')] opacity-[0.08]" />
        
        <div className="flex min-h-screen flex-col">
          <header className="flex flex-col items-center justify-center gap-3 px-4 py-4 sm:py-5 text-center" data-print-hide>
            <h1 className="font-headline text-3xl italic text-aurora-soft-gold/90">
              The Union of Razia &amp; Abduraziq
            </h1>
            <AdminGlobalSearch />
          </header>
          
          <main className="flex-1 p-4 sm:p-6 lg:p-8 pb-28">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={pathname}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
              >
                {children}
              </motion.div>
            </AnimatePresence>
          </main>

          <DashboardNav />
        </div>
      </div>
    </div>
  );
}
