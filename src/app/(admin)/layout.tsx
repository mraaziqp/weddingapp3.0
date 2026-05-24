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
        <div className="fixed inset-0 -z-20 h-full w-full bg-[linear-gradient(140deg,var(--aurora-midnight),var(--aurora-emerald-deep),#090c10)] bg-[length:350%_350%] animate-[auroraShift_20s_ease_infinite]" />
        <div className="fixed inset-0 -z-10 h-full w-full bg-[url('data:image/svg+xml,%3Csvg%20viewBox%3D%220%200%20700%20700%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cfilter%20id%3D%22noiseFilter%22%3E%3CfeTurbulence%20type%3D%22fractalNoise%22%20baseFrequency%3D%220.65%22%20numOctaves%3D%223%22%20stitchTiles%3D%22stitch%22%2F%3E%3C%2Ffilter%3E%3Crect%20width%3D%22100%25%22%20height%3D%22100%25%22%20filter%3D%22url(%23noiseFilter)%22%2F%3E%3C%2Fsvg%3E')] opacity-[0.08]" />
        <motion.div
          className="fixed -z-10 top-12 left-10 h-64 w-64 rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(212,175,55,0.22) 0%, rgba(212,175,55,0.02) 70%, transparent 100%)', filter: 'blur(22px)' }}
          animate={{ x: [0, 26, -8, 0], y: [0, -16, 12, 0], scale: [1, 1.05, 0.96, 1] }}
          transition={{ duration: 17, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="fixed -z-10 bottom-24 right-8 h-72 w-72 rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(15,118,110,0.24) 0%, rgba(15,118,110,0.02) 72%, transparent 100%)', filter: 'blur(28px)' }}
          animate={{ x: [0, -20, 10, 0], y: [0, 20, -12, 0], scale: [1, 0.94, 1.06, 1] }}
          transition={{ duration: 19, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="fixed -z-10 top-1/3 right-1/3 h-40 w-40 rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(185,106,142,0.2) 0%, rgba(185,106,142,0.01) 78%, transparent 100%)', filter: 'blur(18px)' }}
          animate={{ x: [0, 18, -15, 0], y: [0, -12, 14, 0] }}
          transition={{ duration: 14, repeat: Infinity, ease: 'easeInOut' }}
        />
        
        <div className="flex min-h-screen flex-col">
          <header className="flex flex-col items-center justify-center gap-3 px-4 py-4 sm:py-5 text-center" data-print-hide>
            <h1 className="font-headline text-3xl italic text-luxe-gradient drop-shadow-[0_0_18px_rgba(212,175,55,0.35)]">
              The Union of Razia &amp; Abduraziq
            </h1>
            <div className="luxe-divider w-full max-w-xs opacity-60" />
            <AdminGlobalSearch />
          </header>
          
          <main className="flex-1 p-4 sm:p-6 lg:p-8 pb-28">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={pathname}
                initial={{ opacity: 0, y: 18, scale: 0.985 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -14, scale: 0.995 }}
                transition={{ duration: 0.38, ease: [0.4, 0, 0.2, 1] }}
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
