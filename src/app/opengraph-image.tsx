import { ImageResponse } from 'next/og';

export const alt = "R&A's Wedding — The Union of Razia & Abduraziq";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = 'image/png';

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background: '#022c22', // Deep emerald green
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
        }}
      >
        {/* Elegant thin gold border */}
        <div
          style={{
            position: 'absolute',
            top: 40,
            left: 40,
            right: 40,
            bottom: 40,
            border: '2px solid #d4af37',
            opacity: 0.6,
            display: 'flex',
          }}
        />

        {/* R&A monogram */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 160,
            height: 160,
            borderRadius: '50%',
            border: '3px solid #d4af37',
            color: '#d4af37',
            fontSize: 72,
            fontFamily: 'serif',
            fontStyle: 'italic',
            fontWeight: 'bold',
            marginBottom: 30,
          }}
        >
          R&amp;A
        </div>

        <div
          style={{
            color: '#f6e7b7',
            fontSize: 40,
            fontWeight: 'bold',
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            marginBottom: 10,
          }}
        >
          The Wedding of
        </div>

        <div
          style={{
            color: '#d4af37',
            fontSize: 56,
            fontFamily: 'serif',
            fontStyle: 'italic',
            marginBottom: 20,
          }}
        >
          Razia &amp; Abduraziq
        </div>

        <div
          style={{
            color: '#f6e7b7',
            fontSize: 22,
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            opacity: 0.8,
          }}
        >
          6 September 2026 • Masjidul Quds &amp; Tuscany Hall
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
