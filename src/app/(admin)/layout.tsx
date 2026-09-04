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
        <div className="pointer-events-none fixed inset-0 -z-20 h-full w-full bg-[linear-gradient(140deg,var(--aurora-midnight),var(--aurora-emerald-deep),#090c10)] bg-[length:350%_350%] animate-[auroraShift_20s_ease_infinite]" />
        <div className="pointer-events-none fixed inset-0 -z-10 h-full w-full bg-[url('data:image/svg+xml,%3Csvg%20viewBox%3D%220%200%20700%20700%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cfilter%20id%3D%22noiseFilter%22%3E%3CfeTurbulence%20type%3D%22fractalNoise%22%20baseFrequency%3D%220.65%22%20numOctaves%3D%223%22%20stitchTiles%3D%22stitch%22%2F%3E%3C%2Ffilter%3E%3Crect%20width%3D%22100%25%22%20height%3D%22100%25%22%20filter%3D%22url(%23noiseFilter)%22%2F%3E%3C%2Fsvg%3E')] opacity-[0.08]" />
        <div
          className="aurora-blob hidden md:block fixed -z-10 top-12 left-10 h-64 w-64 rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(212,175,55,0.22) 0%, rgba(212,175,55,0.02) 70%, transparent 100%)', filter: 'blur(22px)', animationDuration: '17s' }}
        />
        <div
          className="aurora-blob-reverse hidden md:block fixed -z-10 bottom-24 right-8 h-72 w-72 rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(15,118,110,0.24) 0%, rgba(15,118,110,0.02) 72%, transparent 100%)', filter: 'blur(28px)', animationDuration: '19s' }}
        />
        <div
          className="aurora-blob hidden md:block fixed -z-10 top-1/3 right-1/3 h-40 w-40 rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(185,106,142,0.2) 0%, rgba(185,106,142,0.01) 78%, transparent 100%)', filter: 'blur(18px)', animationDuration: '14s' }}
        />
        <div
          className="aurora-blob-reverse hidden md:block fixed -z-10 bottom-1/4 left-1/4 h-56 w-56 rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(107,63,143,0.18) 0%, rgba(107,63,143,0.01) 75%, transparent 100%)', filter: 'blur(26px)', animationDuration: '23s' }}
        />

        <div className="flex min-h-screen flex-col">
          <header className="flex flex-col items-center justify-center gap-3 px-4 py-4 sm:py-5 text-center" data-print-hide>
            <h1 className="font-headline text-3xl italic text-luxe-gradient drop-shadow-[0_0_18px_rgba(212,175,55,0.35)]">
              The Union of Razia &amp; Abduraziq
            </h1>
            <div className="luxe-divider w-full max-w-xs opacity-60" />
            <AdminGlobalSearch />
          </header>
          
          <main className="flex-1 p-4 pb-[calc(8.5rem+env(safe-area-inset-bottom))] sm:p-6 sm:pb-[calc(9.5rem+env(safe-area-inset-bottom))] lg:p-8 lg:pb-[calc(7rem+env(safe-area-inset-bottom))]">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={pathname}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.15, ease: "easeOut" }}
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
