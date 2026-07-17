import { ImageResponse } from 'next/og';
import { readFileSync } from 'fs';
import { join } from 'path';

export const alt = "R&A's Wedding — The Union of Razia & Abduraziq";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = 'image/png';

export default function Image() {
  // Load Bismillah PNG from local file system at build time to prevent Edge runtime network dependencies
  let bismillahSrc = '';
  try {
    const bismillahPath = join(process.cwd(), 'public', 'bismillah.png');
    const bismillahData = readFileSync(bismillahPath).toString('base64');
    bismillahSrc = `data:image/png;base64,${bismillahData}`;
  } catch (err) {
    console.error('Failed to load local Bismillah PNG:', err);
  }

  return new ImageResponse(
    (
      <div
        style={{
          background: '#c5d6cc', // Custom duckegg blue-green background
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          padding: '60px',
        }}
      >
        {/* Soft Eucalyptus leaves in the top-left corner */}
        <svg
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '260px',
            height: '260px',
            color: '#1e3d29',
            opacity: 0.75,
          }}
          viewBox="0 0 100 100"
          fill="none"
          stroke="currentColor"
        >
          {/* Main branch stems */}
          <path d="M0,0 Q30,10 60,40" strokeWidth="1.2" />
          <path d="M0,0 Q10,35 45,70" strokeWidth="1.0" />
          
          {/* Top-left leaf pairs */}
          <path d="M15,10 C25,5 32,22 22,27 C12,32 5,15 15,10 Z" fill="currentColor" fillOpacity="0.1" strokeWidth="0.8" />
          <path d="M28,20 C38,15 42,32 32,37 C22,42 18,25 28,20 Z" fill="currentColor" fillOpacity="0.1" strokeWidth="0.8" />
          <path d="M42,32 C52,27 55,42 45,47 C35,52 32,37 42,32 Z" fill="currentColor" fillOpacity="0.1" strokeWidth="0.8" />

          <path d="M8,18 C15,25 30,18 25,10 C20,2 8,10 8,18 Z" fill="currentColor" fillOpacity="0.1" strokeWidth="0.8" />
          <path d="M18,32 C25,40 40,32 35,22 C30,12 18,22 18,32 Z" fill="currentColor" fillOpacity="0.1" strokeWidth="0.8" />
          <path d="M30,48 C37,56 52,48 47,38 C42,28 30,38 30,48 Z" fill="currentColor" fillOpacity="0.1" strokeWidth="0.8" />
        </svg>

        {/* Soft Eucalyptus leaves in the bottom-right corner */}
        <svg
          style={{
            position: 'absolute',
            bottom: 0,
            right: 0,
            width: '260px',
            height: '260px',
            color: '#1e3d29',
            opacity: 0.75,
            transform: 'rotate(180deg)',
          }}
          viewBox="0 0 100 100"
          fill="none"
          stroke="currentColor"
        >
          {/* Main branch stems */}
          <path d="M0,0 Q30,10 60,40" strokeWidth="1.2" />
          <path d="M0,0 Q10,35 45,70" strokeWidth="1.0" />
          
          {/* Leaf pairs */}
          <path d="M15,10 C25,5 32,22 22,27 C12,32 5,15 15,10 Z" fill="currentColor" fillOpacity="0.1" strokeWidth="0.8" />
          <path d="M28,20 C38,15 42,32 32,37 C22,42 18,25 28,20 Z" fill="currentColor" fillOpacity="0.1" strokeWidth="0.8" />
          <path d="M42,32 C52,27 55,42 45,47 C35,52 32,37 42,32 Z" fill="currentColor" fillOpacity="0.1" strokeWidth="0.8" />

          <path d="M8,18 C15,25 30,18 25,10 C20,2 8,10 8,18 Z" fill="currentColor" fillOpacity="0.1" strokeWidth="0.8" />
          <path d="M18,32 C25,40 40,32 35,22 C30,12 18,22 18,32 Z" fill="currentColor" fillOpacity="0.1" strokeWidth="0.8" />
          <path d="M30,48 C37,56 52,48 47,38 C42,28 30,38 30,48 Z" fill="currentColor" fillOpacity="0.1" strokeWidth="0.8" />
        </svg>

        {/* Elegant thin green frame border */}
        <div
          style={{
            position: 'absolute',
            top: 30,
            left: 30,
            right: 30,
            bottom: 30,
            border: '1.5px solid #1e3d29',
            opacity: 0.25,
            display: 'flex',
          }}
        />

        {/* Bismillah Calligraphy (Using local base64 embedded PNG) */}
        {bismillahSrc && (
          // eslint-disable-next-line @next/next/no-img-element -- next/og's ImageResponse (Satori) requires plain <img>, next/image doesn't render here
          <img
            src={bismillahSrc}
            style={{
              width: '340px',
              height: '75px',
              marginBottom: '6px',
              objectFit: 'contain',
              // Use CSS filter to invert black calligraphy to deep forest green
              filter: 'brightness(0.3) sepia(1) hue-rotate(80deg) saturate(2)',
            }}
            alt="Bismillah"
          />
        )}

        {/* Bismillah Subtitle */}
        <div
          style={{
            color: '#1e3d29',
            fontSize: '18px',
            fontFamily: 'serif',
            fontStyle: 'italic',
            letterSpacing: '0.04em',
            marginBottom: '32px',
            opacity: 0.9,
          }}
        >
          In the Name of Allah, the Most Gracious, the Most Merciful
        </div>

        {/* R&A script monogram */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#94711c', // Muted wedding gold
            fontSize: '78px',
            fontFamily: 'serif',
            fontStyle: 'italic',
            fontWeight: 'bold',
            marginBottom: '20px',
            textShadow: '0px 1px 1px rgba(255,255,255,0.5)',
          }}
        >
          R&amp;A
        </div>

        {/* THE WEDDING OF */}
        <div
          style={{
            color: '#1e3d29',
            fontSize: '28px',
            fontWeight: 'bold',
            letterSpacing: '0.22em',
            textTransform: 'uppercase',
            marginBottom: '10px',
          }}
        >
          The Wedding of
        </div>

        {/* Razia & Abduraziq script names */}
        <div
          style={{
            color: '#94711c',
            fontSize: '70px',
            fontFamily: 'serif',
            fontStyle: 'italic',
            fontWeight: 'bold',
            marginBottom: '24px',
            textShadow: '0px 1px 1px rgba(255,255,255,0.5)',
          }}
        >
          Razia &amp; Abduraziq
        </div>

        {/* Date */}
        <div
          style={{
            color: '#122217',
            fontSize: '22px',
            fontWeight: 'bold',
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            marginBottom: '8px',
          }}
        >
          6 September 2026
        </div>

        {/* Venue Locations */}
        <div
          style={{
            color: '#1e3d29',
            fontSize: '18px',
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            opacity: 0.95,
          }}
        >
          Masjidul Quds &amp; Tuscany Hall
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
