'use client';
import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';

type ParticleShape = 'circle' | 'diamond' | 'petal' | 'spark';

interface Particle {
  id: number;
  x: number;
  size: number;
  duration: number;
  delay: number;
  opacity: number;
  drift: number;
  rotation: number;
  rotationDir: number;
  shape: ParticleShape;
  color: string;
}

const GOLD_COLORS = [
  'rgba(212,175,55,1)',
  'rgba(246,231,183,1)',
  'rgba(255,215,80,1)',
  'rgba(200,160,40,1)',
  'rgba(255,248,220,1)',
];

// SVG petal path (small rose petal silhouette)
const PetalSVG = ({ color, size }: { color: string; size: number }) => (
  <svg width={size} height={size * 1.4} viewBox="0 0 10 14" fill={color} xmlns="http://www.w3.org/2000/svg">
    <ellipse cx="5" cy="7" rx="4" ry="6.5" />
  </svg>
);

const DiamondSVG = ({ color, size }: { color: string; size: number }) => (
  <svg width={size} height={size} viewBox="0 0 10 10" fill={color} xmlns="http://www.w3.org/2000/svg">
    <polygon points="5,0 10,5 5,10 0,5" />
  </svg>
);

const SparkSVG = ({ color, size }: { color: string; size: number }) => (
  <svg width={size} height={size} viewBox="0 0 20 20" fill={color} xmlns="http://www.w3.org/2000/svg">
    <path d="M10 0 L11.5 8.5 L20 10 L11.5 11.5 L10 20 L8.5 11.5 L0 10 L8.5 8.5 Z" />
  </svg>
);

const SHAPES: ParticleShape[] = ['circle', 'diamond', 'petal', 'spark', 'circle', 'circle'];

const FloatingParticles = ({ count = 28 }: { count?: number }) => {
  const [particles, setParticles] = useState<Particle[]>([]);

  useEffect(() => {
    setParticles(
      Array.from({ length: count }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        size: Math.random() * 8 + 4,
        duration: Math.random() * 18 + 14,
        delay: Math.random() * 12,
        opacity: Math.random() * 0.35 + 0.1,
        drift: (Math.random() - 0.5) * 60,
        rotation: Math.random() * 360,
        rotationDir: Math.random() > 0.5 ? 360 : -360,
        shape: SHAPES[Math.floor(Math.random() * SHAPES.length)],
        color: GOLD_COLORS[Math.floor(Math.random() * GOLD_COLORS.length)],
      }))
    );
  }, [count]);

  return (
    <div className="fixed inset-0 -z-10 pointer-events-none overflow-hidden h-full w-full" aria-hidden>
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute"
          style={{
            left: `${p.x}%`,
            bottom: '-5%',
            opacity: 0,
          }}
          animate={{
            y: [0, -(window?.innerHeight ?? 900) * 1.2],
            x: [0, p.drift],
            opacity: [0, p.opacity, p.opacity * 0.6, 0],
            rotate: [p.rotation, p.rotation + p.rotationDir],
          }}
          transition={{
            duration: p.duration,
            delay: p.delay,
            repeat: Infinity,
            ease: 'linear',
          }}
        >
          {p.shape === 'circle' && (
            <div
              style={{ width: p.size, height: p.size, borderRadius: '50%', backgroundColor: p.color, filter: `blur(${p.size * 0.3}px)` }}
            />
          )}
          {p.shape === 'diamond' && <DiamondSVG color={p.color} size={p.size} />}
          {p.shape === 'petal' && <PetalSVG color={p.color} size={p.size} />}
          {p.shape === 'spark' && <SparkSVG color={p.color} size={p.size * 0.8} />}
        </motion.div>
      ))}
    </div>
  );
};

export default FloatingParticles;
