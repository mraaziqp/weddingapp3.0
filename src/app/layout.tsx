import type {Metadata, Viewport} from 'next';
import { GeistSans } from 'geist/font/sans';
import './globals.css';
import './fonts.css';
import { cn } from '@/lib/utils';
import { TooltipProvider } from '@/components/ui/tooltip';
import { AudioProvider } from '@/lib/audio-context';
import { LuxuryToaster } from '@/components/luxury-toaster';
import { SwRegistration } from '@/components/sw-registration';
import { ExperienceSettingsSync } from '@/components/experience-settings-sync';
import { PwaInstallPrompt } from '@/components/pwa-install-prompt';
import { PointerEventsGuard } from '@/components/pointer-events-guard';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: "R&A's Wedding — The Union of Razia & Abduraziq",
  description: 'Your exclusive digital invitation and event companion.',
  metadataBase: new URL('https://www.raziaraaziq.co.za'),
  manifest: '/manifest.json',
  openGraph: {
    siteName: 'Razia & Abdu-Raazig Wedding',
    type: 'website',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: "R&A's Wedding",
  },
  other: {
    'mobile-web-app-capable': 'yes',
  },
};

export const viewport: Viewport = {
  themeColor: '#d4af37',
  width: 'device-width',
  initialScale: 1,
  // Pinch-zoom stays enabled. This was maximumScale: 1 / userScalable: false,
  // which is a WCAG 1.4.4 failure and a real problem for this guest list in
  // particular — older relatives reading an invitation, a seating chart and a
  // menu on a phone need to be able to zoom in. The usual reason to disable it
  // is iOS auto-zooming on focused inputs, which is better fixed by keeping
  // input font-size at 16px than by locking everyone out of zooming.
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
      <html lang="en" suppressHydrationWarning className={`dark ${GeistSans.variable}`}>
      <body className={cn("font-body antialiased")}>
        <PointerEventsGuard />
        <ExperienceSettingsSync />
        <AudioProvider>
          <TooltipProvider>
            {children}
          </TooltipProvider>
        </AudioProvider>
        <LuxuryToaster />
        <SwRegistration />
        <PwaInstallPrompt />
      </body>
    </html>
  );
}
