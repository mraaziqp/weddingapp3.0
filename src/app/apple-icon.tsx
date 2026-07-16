import { ImageResponse } from 'next/og';

export const size = {
  width: 180,
  height: 180,
};
export const contentType = 'image/png';

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          fontSize: 90,
          background: '#022c22', // Emerald green
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#d4af37', // Gold color
          borderRadius: '50%',
          fontFamily: 'serif',
          fontStyle: 'italic',
          fontWeight: 'bold',
          border: '8px solid #d4af37',
        }}
      >
        R&amp;A
      </div>
    ),
    {
      ...size,
    }
  );
}
