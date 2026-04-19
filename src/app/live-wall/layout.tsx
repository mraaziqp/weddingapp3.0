
import { Toaster } from "@/components/ui/toaster"
import { cn } from '@/lib/utils';

export default function LiveWallLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className={cn("font-body antialiased", "bg-background text-foreground", "min-h-screen")}>
        <div className="fixed inset-0 -z-20 h-full w-full bg-[linear-gradient(140deg,var(--aurora-midnight),var(--aurora-emerald-deep),#030608)] bg-[length:320%_320%] animate-[auroraShift_22s_ease_infinite]" />
        <div className="fixed inset-0 -z-10 h-full w-full bg-[url('data:image/svg+xml,%3Csvg%20viewBox%3D%220%200%20700%20700%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cfilter%20id%3D%22noiseFilter%22%3E%3CfeTurbulence%20type%3D%22fractalNoise%22%20baseFrequency%3D%220.65%22%20numOctaves%3D%223%22%20stitchTiles%3D%22stitch%22%2F%3E%3C%2Ffilter%3E%3Crect%20width%3D%22100%25%22%20height%3D%22100%25%22%20filter%3D%22url(%23noiseFilter)%22%2F%3E%3C%2Fsvg%3E')] opacity-[0.08]" />
        <div className="aurora-orb -z-10 top-8 left-10 h-56 w-56" style={{ background: 'radial-gradient(circle, rgba(212,175,55,0.22) 0%, rgba(212,175,55,0.02) 72%, transparent 100%)' }} />
        <div className="aurora-orb -z-10 bottom-10 right-10 h-64 w-64" style={{ background: 'radial-gradient(circle, rgba(15,118,110,0.24) 0%, rgba(15,118,110,0.02) 72%, transparent 100%)', animationDelay: '2.8s' }} />
        {children}
        <Toaster />
    </div>
  );
}
