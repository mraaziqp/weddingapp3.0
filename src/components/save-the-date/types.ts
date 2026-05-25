// ── Canvas dimensions ──────────────────────────────────────────────────────────
export const CANVAS_W = 480;
export const CANVAS_H = 672;

// ── Element types ──────────────────────────────────────────────────────────────
export type ElementType = 'text' | 'image' | 'qr' | 'sticker';

export interface BaseElement {
  id: string;
  type: ElementType;
  x: number;        // canvas-px
  y: number;        // canvas-px
  width: number;
  height: number;
  rotation: number; // degrees
  opacity: number;  // 0–1
  locked: boolean;
  zIndex: number;
}

export interface TextElement extends BaseElement {
  type: 'text';
  content: string;
  fontFamily: string;
  fontSize: number;
  fontWeight: 'normal' | 'bold';
  fontStyle: 'normal' | 'italic';
  textDecoration: 'none' | 'underline';
  textAlign: 'left' | 'center' | 'right';
  color: string;
  lineHeight: number;     // unitless multiplier
  letterSpacing: number;  // em × 100 (e.g. 50 = 0.5em)
  shadow: boolean;
}

export interface ImageElement extends BaseElement {
  type: 'image';
  src: string;            // data-URL or https
  borderRadius: number;
  objectFit: 'cover' | 'contain';
  isAiGenerated?: boolean;
}

export interface QRElement extends BaseElement {
  type: 'qr';
  value: string;
  fgColor: string;
  bgColor: string;
  borderRadius: number;
}

export interface StickerElement extends BaseElement {
  type: 'sticker';
  stickerId: string;
  color: string;
}

export type DesignElement = TextElement | ImageElement | QRElement | StickerElement;

// ── Background theme ───────────────────────────────────────────────────────────
export interface BackgroundTheme {
  id: string;
  name: string;
  cssBackground: string;    // full CSS background value
  preview: string;          // short gradient for small thumbnail
}

// ── Full design state ──────────────────────────────────────────────────────────
export interface DesignState {
  elements: DesignElement[];
  background: BackgroundTheme;
}

// ── Sticker definition ─────────────────────────────────────────────────────────
export interface StickerDef {
  id: string;
  name: string;
  emoji: string;
  svgPath: string;
  viewBox: string;
  tags: string[];
}

// ── Editor action union ────────────────────────────────────────────────────────
export type EditorAction =
  | { type: 'ADD_ELEMENT'; element: DesignElement }
  | { type: 'UPDATE_ELEMENT'; id: string; patch: Partial<DesignElement> }
  | { type: 'DELETE_ELEMENT'; id: string }
  | { type: 'SET_BACKGROUND'; bg: BackgroundTheme }
  | { type: 'REORDER'; id: string; dir: 'up' | 'down' | 'top' | 'bottom' }
  | { type: 'UNDO' }
  | { type: 'REDO' }
  | { type: 'RESET_TO_DEFAULT' }
  | { type: 'LOAD_DESIGN'; design: DesignState };

// ── History-aware state ────────────────────────────────────────────────────────
export interface EditorHistoryState {
  past: DesignState[];
  present: DesignState;
  future: DesignState[];
}
