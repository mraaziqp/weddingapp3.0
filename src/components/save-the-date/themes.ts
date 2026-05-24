import type { BackgroundTheme } from './types';

export const BACKGROUND_THEMES: BackgroundTheme[] = [
  {
    id: 'emerald-noir',
    name: 'Emerald Noir',
    cssBackground: 'linear-gradient(160deg, #064e3b 0%, #022c22 45%, #010a06 100%)',
    preview: 'linear-gradient(135deg, #064e3b, #010a06)',
  },
  {
    id: 'blush-garden',
    name: 'Blush Garden',
    cssBackground: 'linear-gradient(160deg, #fce4ec 0%, #f8bbd0 40%, #fce4ec 100%)',
    preview: 'linear-gradient(135deg, #fce4ec, #f48fb1)',
  },
  {
    id: 'midnight-romance',
    name: 'Midnight Romance',
    cssBackground: 'linear-gradient(160deg, #0d1b2a 0%, #1b2a4a 50%, #0a0f1e 100%)',
    preview: 'linear-gradient(135deg, #0d1b2a, #1b2a4a)',
  },
  {
    id: 'champagne-dreams',
    name: 'Champagne Dreams',
    cssBackground: 'linear-gradient(160deg, #f5e6c8 0%, #fdf6e3 50%, #e8d5a3 100%)',
    preview: 'linear-gradient(135deg, #f5e6c8, #e8d5a3)',
  },
  {
    id: 'rose-gold-luxe',
    name: 'Rose Gold Luxe',
    cssBackground: 'linear-gradient(160deg, #b76e79 0%, #d4a0a7 40%, #f2d7d9 100%)',
    preview: 'linear-gradient(135deg, #b76e79, #f2d7d9)',
  },
  {
    id: 'celestial-night',
    name: 'Celestial Night',
    cssBackground: 'radial-gradient(ellipse at 20% 20%, #1a0533 0%, #0a001f 60%, #00001a 100%)',
    preview: 'radial-gradient(circle, #1a0533, #00001a)',
  },
  {
    id: 'forest-foliage',
    name: 'Forest & Foliage',
    cssBackground: 'linear-gradient(160deg, #1b4332 0%, #2d6a4f 45%, #081c15 100%)',
    preview: 'linear-gradient(135deg, #1b4332, #081c15)',
  },
  {
    id: 'dusty-mauve',
    name: 'Dusty Mauve',
    cssBackground: 'linear-gradient(160deg, #7c5c7c 0%, #a07fa0 50%, #4a3a5a 100%)',
    preview: 'linear-gradient(135deg, #7c5c7c, #4a3a5a)',
  },
  {
    id: 'arctic-white',
    name: 'Arctic White',
    cssBackground: 'linear-gradient(160deg, #f8f9fa 0%, #e9ecef 50%, #f0f0f0 100%)',
    preview: 'linear-gradient(135deg, #f8f9fa, #dee2e6)',
  },
  {
    id: 'obsidian-pearl',
    name: 'Obsidian & Pearl',
    cssBackground: 'linear-gradient(160deg, #1a1a1a 0%, #2d2d2d 50%, #0a0a0a 100%)',
    preview: 'linear-gradient(135deg, #1a1a1a, #0a0a0a)',
  },
  {
    id: 'terracotta-bohemian',
    name: 'Bohemian Terra',
    cssBackground: 'linear-gradient(160deg, #8b4513 0%, #d2691e 45%, #5c2c0f 100%)',
    preview: 'linear-gradient(135deg, #8b4513, #d2691e)',
  },
  {
    id: 'sage-linen',
    name: 'Sage & Linen',
    cssBackground: 'linear-gradient(160deg, #7a9e7e 0%, #c8d5b9 50%, #4a7050 100%)',
    preview: 'linear-gradient(135deg, #7a9e7e, #c8d5b9)',
  },
];

export const DEFAULT_THEME = BACKGROUND_THEMES[0];
