import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  /* config options here */

  // Genkit is server-only (it's reached solely through the server actions in
  // src/app/actions.ts). Letting webpack bundle it made it walk the whole
  // OpenTelemetry SDK and try to resolve optional trace exporters that aren't
  // installed — producing a build warning for a package that is never loaded
  // at runtime. Keeping these external means Node requires them directly.
  serverExternalPackages: [
    // Node-only; must not be bundled for the browser.
    'firebase-admin',
    'genkit',
    '@genkit-ai/core',
    '@genkit-ai/google-genai',
    '@opentelemetry/sdk-node',
  ],

  // Both of these were `true`, which let a type error or a lint failure ship
  // to production unnoticed — the build stayed green while the page broke in
  // the browser. The suites pass clean, so the build now gates on them.
  typescript: {
    ignoreBuildErrors: false,
  },
  eslint: {
    ignoreDuringBuilds: false,
  },
  images: {
    // Guest media is served same-origin from /api/media/<id>/raw, so Drive
    // needs no entry here. The Vercel Blob and Supabase hosts are gone with
    // the stores they named — nothing in the code or the database still
    // points at either, and every extra pattern is one more host that
    // next/image will optimise on our behalf.
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        port: '',
        pathname: '/**',
      },
    ],
  },
};

export default nextConfig;
