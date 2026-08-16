import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  /* config options here */

  // Genkit is server-only (it's reached solely through the server actions in
  // src/app/actions.ts). Letting webpack bundle it made it walk the whole
  // OpenTelemetry SDK and try to resolve optional trace exporters that aren't
  // installed — producing a build warning for a package that is never loaded
  // at runtime. Keeping these external means Node requires them directly.
  serverExternalPackages: [
    'genkit',
    '@genkit-ai/core',
    '@genkit-ai/google-genai',
    '@opentelemetry/sdk-node',
  ],

  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        port: '',
        pathname: '/**',
      },
      // Vercel Blob — legacy uploaded photos
      {
        protocol: 'https',
        hostname: '*.public.blob.vercel.storage',
        port: '',
        pathname: '/**',
      },
      // Supabase Storage — wedding photos
      {
        protocol: 'https',
        hostname: 'ljrzrlywesvpxnlbgrqr.supabase.co',
        port: '',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
};

export default nextConfig;
