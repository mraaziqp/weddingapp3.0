
import type { Metadata } from 'next';
import '../globals.css';
import { cn } from '@/lib/utils';
import FloatingParticles from '@/components/floating-particles';

export const metadata: Metadata = {
  title: 'An Invitation from Razia & Abduraziq',
  description: 'You are invited!',
  // Prevent indexing of guest-specific pages
  robots: {
    index: false,
    follow: false,
  },
};

export default function GuestLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className={cn(
        "font-body antialiased", 
        "bg-[#FAF9F6] text-[#1C1C1C]",
        "w-full max-w-[100vw] overflow-x-hidden [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]",
        "min-h-[100dvh]"
        )}>
        <div className="fixed inset-0 -z-10 h-full w-full bg-[radial-gradient(circle_at_18%_16%,rgba(212,175,55,0.14),transparent_34%),radial-gradient(circle_at_84%_10%,rgba(185,106,142,0.12),transparent_30%),linear-gradient(150deg,#fffdfa_0%,#fbf7ef_45%,#f5efe3_100%)]" />
        <div className="fixed inset-0 -z-10 h-full w-full bg-[url('data:image/svg+xml,%3Csvg%20viewBox%3D%220%200%20700%20700%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cfilter%20id%3D%22noiseFilter%22%3E%3CfeTurbulence%20type%3D%22fractalNoise%22%20baseFrequency%3D%220.8%22%20numOctaves%3D%223%22%20stitchTiles%3D%22stitch%22%2F%3E%3C%2Ffilter%3E%3Crect%20width%3D%22100%25%22%20height%3D%22100%25%22%20filter%3D%22url(%23noiseFilter)%22%2F%3E%3C%2Fsvg%3E')] opacity-[0.16]" />
        <div className="aurora-orb -z-10 top-[-40px] left-[8%] h-56 w-56" style={{ background: 'radial-gradient(circle, rgba(212,175,55,0.2) 0%, rgba(212,175,55,0.03) 68%, transparent 100%)' }} />
        <div className="aurora-orb -z-10 bottom-[8%] right-[6%] h-64 w-64" style={{ background: 'radial-gradient(circle, rgba(15,118,110,0.18) 0%, rgba(15,118,110,0.03) 72%, transparent 100%)', animationDelay: '2.2s' }} />
        <FloatingParticles />
        <main className="min-h-[100dvh]">{children}</main>
    </div>
  );
}
