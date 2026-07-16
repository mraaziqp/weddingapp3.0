import { ImageResponse } from 'next/og';

export const size = {
  width: 32,
  height: 32,
};
export const contentType = 'image/png';

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          fontSize: 18,
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
          border: '1.5px solid #d4af37',
        }}
      >
        R
      </div>
    ),
    {
      ...size,
    }
  );
}
