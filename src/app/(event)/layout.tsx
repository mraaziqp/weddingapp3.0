import type { Metadata } from 'next';
import '../globals.css';
import { cn } from '@/lib/utils';

/**
 * Shell for the entertainment evening.
 *
 * Deliberately lighter than the wedding's guest layout: no floating particles,
 * no aurora orbs. This hub is a scrolling photo wall that has to hold 60fps on
 * a mid-range Android in a dark room, and every always-animating background
 * layer is compositing work competing with the scroll.
 */

export const metadata: Metadata = {
  title: 'The Evening — Razia & Abduraziq',
  description: 'Share the memories from tonight.',
  robots: { index: false, follow: false },
};

export default function EventLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div
      className={cn(
        'font-body antialiased',
        'bg-[#FAF9F6] text-[#1C1C1C]',
        'w-full max-w-[100vw] overflow-x-hidden [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]',
        'min-h-[100dvh]'
      )}
    >
      <div className="fixed inset-0 -z-10 h-full w-full bg-[radial-gradient(circle_at_18%_12%,rgba(212,175,55,0.16),transparent_36%),radial-gradient(circle_at_86%_8%,rgba(185,106,142,0.13),transparent_32%),linear-gradient(155deg,#fffdfa_0%,#fbf7ef_48%,#f5efe3_100%)]" />
      <main className="min-h-[100dvh]">{children}</main>
    </div>
  );
}
