'use client';

import { useEffect } from 'react';

/**
 * Last-resort boundary. Catches throws that escape every nested boundary,
 * including failures in the root layout itself, so a guest opening their
 * invitation never lands on a blank white "Application error" screen with no
 * way forward. Replaces the root layout when it renders, so it ships its own
 * <html>/<body> and inline styles rather than relying on the app's CSS.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[Global] Unhandled error:', error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(150deg,#04070a 0%,#0b1210 60%,#04070a 100%)',
          color: '#f6e7b7',
          fontFamily: 'Georgia, "Times New Roman", serif',
          padding: '24px',
          textAlign: 'center',
        }}
      >
        <div style={{ maxWidth: 460 }}>
          <p style={{ fontSize: 30, fontStyle: 'italic', margin: '0 0 12px' }}>
            Razia &amp; Abduraziq
          </p>
          <p style={{ fontSize: 16, lineHeight: 1.6, color: 'rgba(255,255,255,0.65)', margin: '0 0 24px' }}>
            Something went wrong loading this page. Please try again — if it keeps happening,
            let us know and we&apos;ll sort it out.
          </p>
          <button
            onClick={reset}
            style={{
              cursor: 'pointer',
              borderRadius: 999,
              border: '1px solid rgba(212,175,55,0.45)',
              background: '#122217',
              color: '#f6e7b7',
              padding: '13px 30px',
              fontSize: 12,
              letterSpacing: '0.22em',
              textTransform: 'uppercase',
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
