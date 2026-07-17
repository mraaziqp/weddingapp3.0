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
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
      <html lang="en" suppressHydrationWarning className={`dark ${GeistSans.variable}`}>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `window.__SUPABASE_CONFIG__ = {
              supabaseUrl: ${JSON.stringify(process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '')},
              supabaseAnonKey: ${JSON.stringify(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '')}
            };`,
          }}
        />
      </head>
      <body className={cn("font-body antialiased")}>
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
