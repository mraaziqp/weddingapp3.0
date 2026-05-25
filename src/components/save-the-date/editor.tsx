'use client';

import React, {
  useCallback, useEffect, useReducer, useRef, useState,
} from 'react';
import QRCode from 'react-qr-code';
import { toPng } from 'html-to-image';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import {
  generateSaveDateCopyAction,
  generateSaveDateGradientAction,
} from '@/app/actions';
import {
  ALargeSmall, Image as ImageIcon, QrCode, Sticker,
  Palette, Bot, Undo2, Redo2, Printer, Download,
  Trash2, Lock, Unlock, BringToFront, SendToBack,
  Bold, Italic, Underline, AlignLeft, AlignCenter,
  AlignRight, Sparkles, Link, RefreshCw, Check, X,
  ChevronUp, ChevronDown, Settings, Copy,
} from 'lucide-react';
import { BACKGROUND_THEMES, DEFAULT_THEME } from './themes';
import { STICKERS } from './stickers';
import type {
  DesignElement, DesignState, EditorAction, EditorHistoryState,
  TextElement, ImageElement, QRElement, StickerElement, BackgroundTheme,
} from './types';
import { CANVAS_W, CANVAS_H } from './types';

// ── Unique ID ──────────────────────────────────────────────────────────────────
const uid = () => Math.random().toString(36).slice(2, 9);

// ── Fonts available ───────────────────────────────────────────────────────────
const FONTS = [
  { label: 'Great Vibes (Script)', value: "'Great Vibes', cursive" },
  { label: 'Playfair Display (Serif)', value: "'Playfair Display', serif" },
  { label: 'Cinzel (Roman)', value: "'Cinzel', serif" },
  { label: 'Geist Sans (Modern)', value: "'Geist Sans', sans-serif" },
  { label: 'Georgia (Classic)', value: 'Georgia, serif' },
  { label: 'Times New Roman', value: "'Times New Roman', serif" },
  { label: 'Courier New (Mono)', value: "'Courier New', monospace" },
  { label: 'Arial (Clean)', value: 'Arial, sans-serif' },
];

// ── Default element factories ─────────────────────────────────────────────────
const makeText = (overrides: Partial<TextElement> = {}): TextElement => ({
  id: uid(), type: 'text',
  x: 80, y: 240, width: 320, height: 60,
  rotation: 0, opacity: 1, locked: false, zIndex: 10,
  content: 'Your Text Here',
  fontFamily: "'Playfair Display', serif",
  fontSize: 28, fontWeight: 'normal', fontStyle: 'normal',
  textDecoration: 'none', textAlign: 'center',
  color: '#f6e7b7', lineHeight: 1.3, letterSpacing: 0,
  shadow: false,
  ...overrides,
});

const makeQR = (url: string): QRElement => ({
  id: uid(), type: 'qr',
  x: 165, y: 490, width: 150, height: 150,
  rotation: 0, opacity: 1, locked: false, zIndex: 20,
  value: url, fgColor: '#022c22', bgColor: '#ffffff', borderRadius: 12,
});

const makeSticker = (stickerId: string): StickerElement => ({
  id: uid(), type: 'sticker',
  x: 40, y: 40, width: 64, height: 64,
  rotation: 0, opacity: 1, locked: false, zIndex: 15,
  stickerId, color: '#d4af37',
});

// ── Reducer ────────────────────────────────────────────────────────────────────
const INITIAL_ELEMENTS: DesignElement[] = [
  makeText({ id: 'el-together', content: 'Together with their families', fontSize: 11, fontFamily: "'Cinzel', serif", color: 'rgba(212,175,55,0.7)', y: 60, letterSpacing: 50, height: 24 }),
  makeText({ id: 'el-name1', content: 'Razia', fontSize: 58, fontFamily: "'Great Vibes', cursive", color: '#f6e7b7', y: 120, height: 80, shadow: true }),
  makeText({ id: 'el-amp', content: '&', fontSize: 32, fontFamily: "'Great Vibes', cursive", color: '#d4af37', y: 210, height: 44 }),
  makeText({ id: 'el-name2', content: 'Abduraziq', fontSize: 58, fontFamily: "'Great Vibes', cursive", color: '#f6e7b7', y: 260, height: 80, shadow: true }),
  makeText({ id: 'el-std', content: 'Save the Date', fontSize: 22, fontFamily: "'Cinzel', serif", color: '#d4af37', y: 365, letterSpacing: 30, fontWeight: 'bold', height: 36 }),
  makeText({ id: 'el-date', content: 'Saturday, 6th September 2025', fontSize: 14, fontFamily: "'Playfair Display', serif", color: '#f6e7b7', y: 420, height: 26 }),
  makeText({ id: 'el-venue', content: 'The Grand Pavilion · Cape Town', fontSize: 10, fontFamily: "'Cinzel', serif", color: 'rgba(246,231,183,0.6)', y: 455, letterSpacing: 30, height: 20 }),
];

const INITIAL_STATE: DesignState = {
  elements: INITIAL_ELEMENTS,
  background: DEFAULT_THEME,
};

function designReducer(state: DesignState, action: EditorAction): DesignState {
  switch (action.type) {
    case 'LOAD_DESIGN':
      return action.design;
    case 'ADD_ELEMENT':
      return { ...state, elements: [...state.elements, action.element] };
    case 'UPDATE_ELEMENT':
      return {
        ...state,
        elements: state.elements.map(el =>
          el.id === action.id ? { ...el, ...action.patch } as DesignElement : el
        ),
      };
    case 'DELETE_ELEMENT':
      return { ...state, elements: state.elements.filter(e => e.id !== action.id) };
    case 'SET_BACKGROUND':
      return { ...state, background: action.bg };
    case 'REORDER': {
      const sorted = [...state.elements].sort((a, b) => a.zIndex - b.zIndex);
      const idx = sorted.findIndex(e => e.id === action.id);
      if (idx < 0) return state;
      if (action.dir === 'up' && idx < sorted.length - 1) {
        [sorted[idx].zIndex, sorted[idx + 1].zIndex] = [sorted[idx + 1].zIndex, sorted[idx].zIndex];
      } else if (action.dir === 'down' && idx > 0) {
        [sorted[idx].zIndex, sorted[idx - 1].zIndex] = [sorted[idx - 1].zIndex, sorted[idx].zIndex];
      } else if (action.dir === 'top') {
        const max = Math.max(...state.elements.map(e => e.zIndex));
        sorted[idx].zIndex = max + 1;
      } else if (action.dir === 'bottom') {
        const min = Math.min(...state.elements.map(e => e.zIndex));
        sorted[idx].zIndex = min - 1;
      }
      return { ...state, elements: sorted };
    }
    default:
      return state;
  }
}

function historyReducer(
  state: EditorHistoryState,
  action: EditorAction
): EditorHistoryState {
  if (action.type === 'LOAD_DESIGN') {
    return { past: [], present: action.design, future: [] };
  }
  if (action.type === 'UNDO') {
    if (state.past.length === 0) return state;
    const previous = state.past[state.past.length - 1];
    return {
      past: state.past.slice(0, -1),
      present: previous,
      future: [state.present, ...state.future],
    };
  }
  if (action.type === 'REDO') {
    if (state.future.length === 0) return state;
    const next = state.future[0];
    return {
      past: [...state.past, state.present],
      present: next,
      future: state.future.slice(1),
    };
  }
  if (action.type === 'RESET_TO_DEFAULT') {
    return { past: [], present: INITIAL_STATE, future: [] };
  }
  const newPresent = designReducer(state.present, action);
  if (newPresent === state.present) return state;
  return {
    past: [...state.past.slice(-30), state.present],
    present: newPresent,
    future: [],
  };
}

// ── Tab type ──────────────────────────────────────────────────────────────────
type LeftTab = 'text' | 'image' | 'stickers' | 'qr' | 'backgrounds' | 'ai' | 'familyverse';

// ── Main editor ───────────────────────────────────────────────────────────────
export function SaveTheDateEditor() {
  const [history, dispatchHistory] = useReducer(historyReducer, undefined, (): EditorHistoryState => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('std-design-v1');
        if (saved) return { past: [], present: JSON.parse(saved) as DesignState, future: [] };
      } catch { /* ignore corrupt data */ }
    }
    return { past: [], present: INITIAL_STATE, future: [] };
  });
  const { present: design } = history;
  const dispatch = useCallback((action: EditorAction) => dispatchHistory(action), []);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [leftTab, setLeftTab] = useState<LeftTab>('text');
  const [scale, setScale] = useState(1);
  const [showGrid, setShowGrid] = useState(false);
  const [familyverseKey, setFamilyverseKey] = useState('');
  const [familyverseUrl, setFamilyverseUrl] = useState('https://api.familyverse.app');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [redirectToStd, setRedirectToStd] = useState(true);
  const [isPublishing, setIsPublishing] = useState(false);

  const canvasAreaRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // Load design and redirect settings from Supabase config API on mount
  useEffect(() => {
    fetch('/api/std/config')
      .then(r => r.json())
      .then((data) => {
        if (data.designState) {
          dispatch({ type: 'LOAD_DESIGN', design: data.designState });
        }
        if (data.config && typeof data.config.redirectToStd === 'boolean') {
          setRedirectToStd(data.config.redirectToStd);
        }
      })
      .catch((err) => {
        console.warn('[Editor] failed to load dynamic config:', err);
      });
  }, [dispatch]);

  // Publish live design to Supabase config
  const publishLive = async () => {
    setIsPublishing(true);
    try {
      const partner1El = design.elements.find(e => e.id === 'el-name1') as TextElement | undefined;
      const partner2El = design.elements.find(e => e.id === 'el-name2') as TextElement | undefined;
      const dateEl = design.elements.find(e => e.id === 'el-date') as TextElement | undefined;
      const venueEl = design.elements.find(e => e.id === 'el-venue') as TextElement | undefined;

      const dateText = dateEl?.content ?? '06.09.2026';
      const venueText = venueEl?.content ?? 'The Grand Pavilion';

      let venue = venueText;
      let city = 'Cape Town';
      if (venueText.includes('·')) {
        const parts = venueText.split('·');
        venue = parts[0].trim();
        city = parts[1].trim();
      } else if (venueText.includes(',')) {
        const parts = venueText.split(',');
        venue = parts[0].trim();
        city = parts[1].trim();
      }

      const config = {
        partner1Short: partner1El?.content ?? 'Abdu-Raazig',
        partner2Short: partner2El?.content ?? 'Razia',
        partner1Full: partner1El?.content ?? 'Abdu-Raazig',
        partner2Full: partner2El?.content ?? 'Razia',
        date: dateText,
        venue,
        city,
        redirectToStd
      };

      const res = await fetch('/api/std/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config, designState: design }),
      });
      const data = await res.json();
      if (data.ok) {
        toast({ title: 'Published Successfully!', description: 'Your custom Save the Date is now live for all guests!' });
      } else {
        toast({ title: 'Publish failed', description: data.error || 'Unknown error', variant: 'destructive' });
      }
    } catch (err) {
      toast({ title: 'Publish failed', description: String(err), variant: 'destructive' });
    } finally {
      setIsPublishing(false);
    }
  };

  // Hydrate website URL
  useEffect(() => {
    setWebsiteUrl(window.location.origin);
  }, []);

  // Auto-save design to localStorage on every change
  useEffect(() => {
    try { localStorage.setItem('std-design-v1', JSON.stringify(design)); } catch { /* ignore */ }
  }, [design]);

  // Stable ref to design so event listeners can read current state without re-registering
  const designRef = useRef(design);
  useEffect(() => { designRef.current = design; }, [design]);

  // Scale canvas to fit available space
  useEffect(() => {
    const measure = () => {
      if (!canvasAreaRef.current) return;
      const { width, height } = canvasAreaRef.current.getBoundingClientRect();
      const sx = (width - 64) / CANVAS_W;
      const sy = (height - 64) / CANVAS_H;
      setScale(Math.min(sx, sy, 1.2));
    };
    measure();
    const ro = new ResizeObserver(measure);
    if (canvasAreaRef.current) ro.observe(canvasAreaRef.current);
    return () => ro.disconnect();
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (editingId) return;
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedId) {
        dispatch({ type: 'DELETE_ELEMENT', id: selectedId });
        setSelectedId(null);
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
        e.preventDefault();
        dispatch({ type: 'UNDO' });
      }
      if ((e.metaKey || e.ctrlKey) && (e.key === 'y' || (e.shiftKey && e.key === 'z'))) {
        e.preventDefault();
        dispatch({ type: 'REDO' });
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'd' && selectedId) {
        e.preventDefault();
        const el = designRef.current.elements.find(el => el.id === selectedId);
        if (!el) return;
        const copy = { ...el, id: uid(), x: el.x + 20, y: el.y + 20, zIndex: Date.now() % 10000 };
        dispatch({ type: 'ADD_ELEMENT', element: copy });
        setSelectedId(copy.id);
      }
      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key) && selectedId) {
        e.preventDefault();
        const step = e.shiftKey ? 10 : 1;
        const el = designRef.current.elements.find(el => el.id === selectedId);
        if (!el || el.locked) return;
        const patch =
          e.key === 'ArrowLeft' ? { x: el.x - step } :
          e.key === 'ArrowRight' ? { x: el.x + step } :
          e.key === 'ArrowUp' ? { y: el.y - step } :
          { y: el.y + step };
        dispatch({ type: 'UPDATE_ELEMENT', id: selectedId, patch });
      }
      if (e.key === 'Escape') {
        setSelectedId(null);
        setEditingId(null);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [selectedId, editingId, dispatch]);

  const selectedEl = design.elements.find(e => e.id === selectedId) ?? null;

  // ── Export ──
  const handleExport = useCallback(async () => {
    if (!canvasRef.current) return;
    try {
      const dataUrl = await toPng(canvasRef.current, { pixelRatio: 2 });
      const a = document.createElement('a');
      a.download = 'save-the-date.png';
      a.href = dataUrl;
      a.click();
      toast({ title: 'Downloaded!', description: 'save-the-date.png saved to your device.' });
    } catch {
      toast({ title: 'Export failed', variant: 'destructive' });
    }
  }, [toast]);

  const handlePrint = useCallback(() => window.print(), []);

  // ── Add element helpers ──
  const addText = () => {
    const el = makeText({ x: 40, y: 200, zIndex: Date.now() % 10000 });
    dispatch({ type: 'ADD_ELEMENT', element: el });
    setSelectedId(el.id);
    setLeftTab('text');
  };

  const addQR = () => {
    const el = makeQR(websiteUrl || window.location.origin);
    dispatch({ type: 'ADD_ELEMENT', element: el });
    setSelectedId(el.id);
  };

  const addSticker = (id: string) => {
    const el = makeSticker(id);
    dispatch({ type: 'ADD_ELEMENT', element: el });
    setSelectedId(el.id);
  };

  const duplicateElement = useCallback((id: string) => {
    const el = designRef.current.elements.find(e => e.id === id);
    if (!el) return;
    const copy = { ...el, id: uid(), x: el.x + 20, y: el.y + 20, zIndex: Date.now() % 10000 };
    dispatch({ type: 'ADD_ELEMENT', element: copy });
    setSelectedId(copy.id);
  }, [dispatch]);

  const handleNewDesign = useCallback(() => {
    if (!window.confirm('Start a new design? Your current work will be cleared.')) return;
    try { localStorage.removeItem('std-design-v1'); } catch { /* ignore */ }
    dispatch({ type: 'RESET_TO_DEFAULT' });
    setSelectedId(null);
  }, [dispatch]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    toast({ title: 'Uploading image...', description: 'Sending image to Supabase storage...' });

    try {
      const { supabase } = await import('@/lib/supabase');
      const filename = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
      const bucketName = 'wedding-assets';

      const { data, error } = await supabase.storage
        .from(bucketName)
        .upload(`save-the-date/${filename}`, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) {
        throw error;
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from(bucketName)
        .getPublicUrl(`save-the-date/${filename}`);

      const el: ImageElement = {
        id: uid(), type: 'image',
        x: 40, y: 40, width: 200, height: 200,
        rotation: 0, opacity: 1, locked: false, zIndex: Date.now() % 10000,
        src: publicUrl, borderRadius: 0, objectFit: 'cover',
      };

      dispatch({ type: 'ADD_ELEMENT', element: el });
      setSelectedId(el.id);
      toast({ title: 'Upload Complete!', description: 'Image successfully published to Supabase storage.' });
    } catch (err: any) {
      console.warn('[Upload to Supabase failed]', err);
      toast({
        title: 'Saved locally',
        description: 'Using offline local copy. Please make sure a public Supabase Storage bucket named "wedding-assets" is created.',
      });

      const reader = new FileReader();
      reader.onload = (ev) => {
        const src = ev.target?.result as string;
        const el: ImageElement = {
          id: uid(), type: 'image',
          x: 40, y: 40, width: 200, height: 200,
          rotation: 0, opacity: 1, locked: false, zIndex: Date.now() % 10000,
          src, borderRadius: 0, objectFit: 'cover',
        };
        dispatch({ type: 'ADD_ELEMENT', element: el });
        setSelectedId(el.id);
      };
      reader.readAsDataURL(file);
    }
  };

  // ── FamilyVerse QR ──
  const fetchFamilyVerseQR = async () => {
    if (!familyverseKey) {
      toast({ title: 'API key required', description: 'Enter your FamilyVerse API key first.', variant: 'destructive' });
      return;
    }
    try {
      const res = await fetch(`${familyverseUrl}/qr/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': familyverseKey },
        body: JSON.stringify({ url: websiteUrl, size: 200 }),
      });
      if (!res.ok) throw new Error(`Status ${res.status}`);
      const data = await res.json() as { qrImageUrl?: string; imageUrl?: string };
      const src = data.qrImageUrl || data.imageUrl;
      if (!src) throw new Error('No image URL in response');
      const el: ImageElement = {
        id: uid(), type: 'image',
        x: 150, y: 450, width: 180, height: 180,
        rotation: 0, opacity: 1, locked: false, zIndex: Date.now() % 10000,
        src, borderRadius: 16, objectFit: 'contain',
      };
      dispatch({ type: 'ADD_ELEMENT', element: el });
      setSelectedId(el.id);
      toast({ title: 'FamilyVerse QR added!', description: 'QR code placed on your canvas.' });
    } catch (err) {
      toast({ title: 'FamilyVerse error', description: String(err), variant: 'destructive' });
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] rounded-2xl overflow-hidden border border-white/10">
      <TopBar
        canUndo={history.past.length > 0}
        canRedo={history.future.length > 0}
        onUndo={() => dispatch({ type: 'UNDO' })}
        onRedo={() => dispatch({ type: 'REDO' })}
        showGrid={showGrid}
        onToggleGrid={() => setShowGrid(g => !g)}
        onPrint={handlePrint}
        onExport={handleExport}
        onNewDesign={handleNewDesign}
        isDirty={history.past.length > 0}
        redirectToStd={redirectToStd}
        onToggleRedirect={setRedirectToStd}
        isPublishing={isPublishing}
        onPublish={publishLive}
      />

      <div className="flex flex-1 overflow-hidden">
        {/* ── Left sidebar ── */}
        <LeftSidebar
          activeTab={leftTab}
          onTabChange={setLeftTab}
          onAddText={addText}
          onAddQR={addQR}
          onAddSticker={addSticker}
          onImageUpload={handleImageUpload}
          dispatch={dispatch}
          design={design}
          selectedId={selectedId}
          websiteUrl={websiteUrl}
          setWebsiteUrl={setWebsiteUrl}
          familyverseKey={familyverseKey}
          setFamilyverseKey={setFamilyverseKey}
          familyverseUrl={familyverseUrl}
          setFamilyverseUrl={setFamilyverseUrl}
          onFetchFamilyVerseQR={fetchFamilyVerseQR}
          selectedEl={selectedEl}
        />

        {/* ── Canvas area ── */}
        <div
          ref={canvasAreaRef}
          className="flex-1 flex items-center justify-center overflow-auto"
          style={{ background: 'rgba(0,0,0,0.35)' }}
          onClick={() => { setSelectedId(null); setEditingId(null); }}
        >
          <div
            style={{
              transform: `scale(${scale})`,
              transformOrigin: 'center center',
              flexShrink: 0,
            }}
          >
            <div
              ref={canvasRef}
              id="save-the-date-canvas"
              className="relative overflow-hidden"
              style={{
                width: CANVAS_W, height: CANVAS_H,
                background: design.background.cssBackground,
                boxShadow: '0 32px 80px rgba(0,0,0,0.7)',
              }}
              onClick={e => e.stopPropagation()}
            >
              {showGrid && <GridOverlay />}
              {[...design.elements]
                .sort((a, b) => a.zIndex - b.zIndex)
                .map(el => (
                  <CanvasElement
                    key={el.id}
                    element={el}
                    isSelected={selectedId === el.id}
                    isEditing={editingId === el.id}
                    canvasScale={scale}
                    onSelect={() => { setSelectedId(el.id); setEditingId(null); }}
                    onStartEdit={() => setEditingId(el.id)}
                    onStopEdit={() => setEditingId(null)}
                    onUpdate={patch => dispatch({ type: 'UPDATE_ELEMENT', id: el.id, patch })}
                  />
                ))}
            </div>
          </div>
        </div>

        {/* ── Right properties panel ── */}
        <RightPanel
          element={selectedEl}
          dispatch={dispatch}
          onDeselect={() => setSelectedId(null)}
          onDuplicate={selectedEl ? () => duplicateElement(selectedEl.id) : undefined}
        />
      </div>

      {/* Print styles */}
      <style>{`
        @media print {
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          body > * { display: none !important; }
          #save-the-date-canvas {
            display: block !important;
            position: fixed !important;
            top: 50% !important; left: 50% !important;
            transform: translate(-50%, -50%) !important;
            width: 480px !important; height: 672px !important;
            box-shadow: none !important;
          }
        }
      `}</style>
    </div>
  );
}

// ── Top bar ───────────────────────────────────────────────────────────────────
function TopBar({
  canUndo, canRedo, onUndo, onRedo, showGrid, onToggleGrid, onPrint, onExport, onNewDesign, isDirty,
  redirectToStd, onToggleRedirect, isPublishing, onPublish,
}: {
  canUndo: boolean; canRedo: boolean;
  onUndo: () => void; onRedo: () => void;
  showGrid: boolean; onToggleGrid: () => void;
  onPrint: () => void; onExport: () => void;
  onNewDesign: () => void;
  isDirty: boolean;
  redirectToStd: boolean;
  onToggleRedirect: (checked: boolean) => void;
  isPublishing: boolean;
  onPublish: () => void;
}) {
  return (
    <div className="flex items-center gap-2 px-4 py-2 border-b border-white/10 bg-black/20 backdrop-blur-sm print:hidden">
      <span className="text-sm font-medium text-[#d4af37] mr-2" style={{ fontFamily: "'Cinzel', serif", letterSpacing: '0.1em' }}>
        STD STUDIO
      </span>
      <Separator orientation="vertical" className="h-5 bg-white/10" />
      <Button variant="ghost" size="icon" className="h-8 w-8" disabled={!canUndo} onClick={onUndo} title="Undo (Ctrl+Z)">
        <Undo2 size={15} />
      </Button>
      <Button variant="ghost" size="icon" className="h-8 w-8" disabled={!canRedo} onClick={onRedo} title="Redo (Ctrl+Y)">
        <Redo2 size={15} />
      </Button>
      <Separator orientation="vertical" className="h-5 bg-white/10" />
      <Button variant="ghost" size="sm" className={`h-8 gap-1.5 text-xs ${showGrid ? 'text-[#d4af37]' : ''}`} onClick={onToggleGrid} title="Toggle alignment grid">
        Grid
      </Button>
      <Button variant="ghost" size="sm" className="h-8 gap-1 text-xs text-muted-foreground hover:text-red-400" onClick={onNewDesign} title="Clear canvas and start fresh">
        <RefreshCw size={11} /> New
      </Button>
      {isDirty && (
        <span className="text-[10px] text-emerald-500/70 flex items-center gap-1 select-none">
          <Check size={9} /> saved
        </span>
      )}
      <div className="ml-auto flex items-center gap-3">
        <div className="flex items-center gap-2 bg-white/5 border border-white/10 px-3 py-1 rounded-lg">
          <span className="text-[11px] text-gray-300 font-medium tracking-wide uppercase">Redirect guests to STD:</span>
          <Switch checked={redirectToStd} onCheckedChange={onToggleRedirect} />
        </div>
        <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs border-white/15" onClick={onPrint}>
          <Printer size={13} /> Print
        </Button>
        <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs border-white/15" onClick={onExport}>
          <Download size={13} /> Export
        </Button>
        <Button size="sm" className="h-8 gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-950/20 font-semibold" onClick={onPublish} disabled={isPublishing}>
          <Check size={13} /> {isPublishing ? 'Publishing...' : 'Publish to Live Site'}
        </Button>
      </div>
    </div>
  );
}

// ── Grid overlay ──────────────────────────────────────────────────────────────
function GridOverlay() {
  return (
    <div className="absolute inset-0 pointer-events-none" style={{
      backgroundImage: 'linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)',
      backgroundSize: '40px 40px',
    }} />
  );
}

// ── Left sidebar ──────────────────────────────────────────────────────────────
function LeftSidebar({
  activeTab, onTabChange, onAddText, onAddQR, onAddSticker, onImageUpload,
  dispatch, design, selectedId, websiteUrl, setWebsiteUrl,
  familyverseKey, setFamilyverseKey, familyverseUrl, setFamilyverseUrl,
  onFetchFamilyVerseQR, selectedEl,
}: {
  activeTab: LeftTab; onTabChange: (t: LeftTab) => void;
  onAddText: () => void; onAddQR: () => void;
  onAddSticker: (id: string) => void;
  onImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  dispatch: (a: EditorAction) => void;
  design: DesignState; selectedId: string | null;
  websiteUrl: string; setWebsiteUrl: (v: string) => void;
  familyverseKey: string; setFamilyverseKey: (v: string) => void;
  familyverseUrl: string; setFamilyverseUrl: (v: string) => void;
  onFetchFamilyVerseQR: () => void;
  selectedEl: DesignElement | null;
}) {
  const tabs: { id: LeftTab; icon: React.ReactNode; label: string }[] = [
    { id: 'text', icon: <ALargeSmall size={20} />, label: 'Text' },
    { id: 'image', icon: <ImageIcon size={20} />, label: 'Images' },
    { id: 'stickers', icon: <Sticker size={20} />, label: 'Stickers' },
    { id: 'qr', icon: <QrCode size={20} />, label: 'QR Code' },
    { id: 'backgrounds', icon: <Palette size={20} />, label: 'Backgrounds' },
    { id: 'ai', icon: <Bot size={20} />, label: 'AI Tools' },
    { id: 'familyverse', icon: <Link size={20} />, label: 'FamilyVerse' },
  ];

  return (
    <div className="flex border-r border-white/10 print:hidden" style={{ width: 300 }}>
      {/* Icon rail */}
      <div className="flex flex-col items-center gap-1 py-3 px-1.5 border-r border-white/10 bg-black/15">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => onTabChange(t.id)}
            title={t.label}
            className={`w-10 h-10 flex items-center justify-center rounded-xl transition-all ${activeTab === t.id ? 'bg-[#d4af37]/20 text-[#d4af37]' : 'text-muted-foreground hover:bg-white/5 hover:text-white'}`}
          >
            {t.icon}
          </button>
        ))}
      </div>

      {/* Panel content */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 8 }}
            transition={{ duration: 0.15 }}
          >
            {activeTab === 'text' && (
              <TextPanel onAdd={onAddText} selectedEl={selectedEl} dispatch={dispatch} />
            )}
            {activeTab === 'image' && (
              <ImagePanel onUpload={onImageUpload} />
            )}
            {activeTab === 'stickers' && (
              <StickersPanel onAdd={onAddSticker} />
            )}
            {activeTab === 'qr' && (
              <QRPanel
                websiteUrl={websiteUrl}
                setWebsiteUrl={setWebsiteUrl}
                onAdd={onAddQR}
              />
            )}
            {activeTab === 'backgrounds' && (
              <BackgroundsPanel
                current={design.background}
                dispatch={dispatch}
              />
            )}
            {activeTab === 'ai' && (
              <AIPanel
                selectedEl={selectedEl}
                dispatch={dispatch}
                design={design}
              />
            )}
            {activeTab === 'familyverse' && (
              <FamilyVersePanel
                apiKey={familyverseKey}
                setApiKey={setFamilyverseKey}
                apiUrl={familyverseUrl}
                setApiUrl={setFamilyverseUrl}
                websiteUrl={websiteUrl}
                onGenerate={onFetchFamilyVerseQR}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

// ── Text panel ────────────────────────────────────────────────────────────────
function TextPanel({ onAdd, selectedEl, dispatch }: {
  onAdd: () => void;
  selectedEl: DesignElement | null;
  dispatch: (a: EditorAction) => void;
}) {
  const el = selectedEl?.type === 'text' ? (selectedEl as TextElement) : null;
  const upd = (patch: Partial<TextElement>) => {
    if (!el) return;
    dispatch({ type: 'UPDATE_ELEMENT', id: el.id, patch });
  };

  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold uppercase tracking-widest text-[#d4af37]">Text</p>
      <Button size="sm" className="w-full bg-[#d4af37]/20 border border-[#d4af37]/30 text-[#d4af37] hover:bg-[#d4af37]/30 gap-2" onClick={onAdd}>
        <ALargeSmall size={14} /> Add Text Box
      </Button>
      {el && (
        <div className="space-y-3 pt-1">
          <Separator className="border-white/10" />
          <div className="space-y-1">
            <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">Font Family</Label>
            <select
              value={el.fontFamily}
              onChange={e => upd({ fontFamily: e.target.value })}
              className="w-full h-8 rounded-lg text-xs bg-white/5 border border-white/10 text-foreground px-2"
            >
              {FONTS.map(f => (
                <option key={f.value} value={f.value} style={{ fontFamily: f.value, background: '#1a1a1a' }}>
                  {f.label}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">Font Size: {el.fontSize}px</Label>
            <Slider min={8} max={96} step={1} value={[el.fontSize]} onValueChange={([v]) => upd({ fontSize: v })} />
          </div>
          <div className="space-y-1">
            <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">Color</Label>
            <div className="flex items-center gap-2">
              <input type="color" value={el.color} onChange={e => upd({ color: e.target.value })}
                className="w-8 h-8 rounded-lg cursor-pointer border-0 bg-transparent" />
              <Input value={el.color} onChange={e => upd({ color: e.target.value })}
                className="h-8 text-xs bg-white/5 border-white/10 font-mono" />
            </div>
          </div>
          <div className="flex gap-1">
            <button onClick={() => upd({ fontWeight: el.fontWeight === 'bold' ? 'normal' : 'bold' })}
              className={`flex-1 h-8 rounded-lg text-xs flex items-center justify-center ${el.fontWeight === 'bold' ? 'bg-[#d4af37]/30 text-[#d4af37]' : 'bg-white/5 text-muted-foreground hover:bg-white/10'}`}>
              <Bold size={13} />
            </button>
            <button onClick={() => upd({ fontStyle: el.fontStyle === 'italic' ? 'normal' : 'italic' })}
              className={`flex-1 h-8 rounded-lg text-xs flex items-center justify-center ${el.fontStyle === 'italic' ? 'bg-[#d4af37]/30 text-[#d4af37]' : 'bg-white/5 text-muted-foreground hover:bg-white/10'}`}>
              <Italic size={13} />
            </button>
            <button onClick={() => upd({ textDecoration: el.textDecoration === 'underline' ? 'none' : 'underline' })}
              className={`flex-1 h-8 rounded-lg text-xs flex items-center justify-center ${el.textDecoration === 'underline' ? 'bg-[#d4af37]/30 text-[#d4af37]' : 'bg-white/5 text-muted-foreground hover:bg-white/10'}`}>
              <Underline size={13} />
            </button>
            <button onClick={() => upd({ shadow: !el.shadow })}
              className={`flex-1 h-8 rounded-lg text-xs flex items-center justify-center text-[10px] ${el.shadow ? 'bg-[#d4af37]/30 text-[#d4af37]' : 'bg-white/5 text-muted-foreground hover:bg-white/10'}`}>
              S
            </button>
          </div>
          <div className="flex gap-1">
            {(['left', 'center', 'right'] as const).map(align => (
              <button key={align} onClick={() => upd({ textAlign: align })}
                className={`flex-1 h-8 rounded-lg flex items-center justify-center ${el.textAlign === align ? 'bg-[#d4af37]/30 text-[#d4af37]' : 'bg-white/5 text-muted-foreground hover:bg-white/10'}`}>
                {align === 'left' && <AlignLeft size={13} />}
                {align === 'center' && <AlignCenter size={13} />}
                {align === 'right' && <AlignRight size={13} />}
              </button>
            ))}
          </div>
          <div className="space-y-1">
            <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">Letter Spacing: {el.letterSpacing}</Label>
            <Slider min={-20} max={200} step={5} value={[el.letterSpacing]} onValueChange={([v]) => upd({ letterSpacing: v })} />
          </div>
          <div className="space-y-1">
            <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">Line Height: {el.lineHeight}</Label>
            <Slider min={0.8} max={3} step={0.05} value={[el.lineHeight]} onValueChange={([v]) => upd({ lineHeight: v })} />
          </div>
        </div>
      )}
    </div>
  );
}

// ── Image panel ───────────────────────────────────────────────────────────────
function ImagePanel({ onUpload }: { onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold uppercase tracking-widest text-[#d4af37]">Images</p>
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onUpload} />
      <Button size="sm" className="w-full bg-[#d4af37]/20 border border-[#d4af37]/30 text-[#d4af37] hover:bg-[#d4af37]/30 gap-2"
        onClick={() => fileRef.current?.click()}>
        <ImageIcon size={14} /> Upload Image
      </Button>
      <p className="text-[10px] text-muted-foreground text-center leading-relaxed">
        Upload photos, decorative images, or AI-generated artwork. Drag to reposition after adding.
      </p>
    </div>
  );
}

// ── Stickers panel ────────────────────────────────────────────────────────────
function StickersPanel({ onAdd }: { onAdd: (id: string) => void }) {
  const [filter, setFilter] = useState('');
  const filtered = STICKERS.filter(s =>
    !filter || s.name.toLowerCase().includes(filter.toLowerCase()) || s.tags.some(t => t.includes(filter.toLowerCase()))
  );
  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold uppercase tracking-widest text-[#d4af37]">Stickers & Ornaments</p>
      <Input value={filter} onChange={e => setFilter(e.target.value)} placeholder="Search stickers…"
        className="h-8 text-xs bg-white/5 border-white/10" />
      <div className="grid grid-cols-4 gap-1.5">
        {filtered.map(s => (
          <button key={s.id} onClick={() => onAdd(s.id)}
            className="flex flex-col items-center gap-1 p-2 rounded-xl bg-white/5 hover:bg-[#d4af37]/15 hover:border-[#d4af37]/30 border border-transparent transition-all group">
            <span className="text-2xl">{s.emoji}</span>
            <span className="text-[9px] text-muted-foreground group-hover:text-white truncate w-full text-center">{s.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ── QR panel ──────────────────────────────────────────────────────────────────
function QRPanel({ websiteUrl, setWebsiteUrl, onAdd }: {
  websiteUrl: string; setWebsiteUrl: (v: string) => void; onAdd: () => void;
}) {
  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold uppercase tracking-widest text-[#d4af37]">QR Code</p>
      <div className="space-y-1.5">
        <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">Destination URL</Label>
        <Input value={websiteUrl} onChange={e => setWebsiteUrl(e.target.value)}
          placeholder="https://your-site.com" className="h-8 text-xs bg-white/5 border-white/10 font-mono" />
      </div>
      {websiteUrl && (
        <div className="flex justify-center p-3 bg-white rounded-xl">
          <QRCode value={websiteUrl} size={100} bgColor="#ffffff" fgColor="#022c22" level="H" />
        </div>
      )}
      <Button size="sm" className="w-full bg-[#d4af37]/20 border border-[#d4af37]/30 text-[#d4af37] hover:bg-[#d4af37]/30 gap-2" onClick={onAdd}>
        <QrCode size={14} /> Add QR to Canvas
      </Button>
    </div>
  );
}

// ── Backgrounds panel ─────────────────────────────────────────────────────────
function BackgroundsPanel({ current, dispatch }: {
  current: BackgroundTheme; dispatch: (a: EditorAction) => void;
}) {
  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold uppercase tracking-widest text-[#d4af37]">Backgrounds</p>
      <div className="grid grid-cols-3 gap-2">
        {BACKGROUND_THEMES.map(theme => (
          <button
            key={theme.id}
            onClick={() => dispatch({ type: 'SET_BACKGROUND', bg: theme })}
            className={`relative h-14 rounded-xl overflow-hidden border-2 transition-all ${current.id === theme.id ? 'border-[#d4af37] scale-105' : 'border-transparent hover:border-white/30'}`}
            style={{ background: theme.preview }}
            title={theme.name}
          >
            {current.id === theme.id && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-5 h-5 rounded-full bg-[#d4af37] flex items-center justify-center">
                  <Check size={10} className="text-black" />
                </div>
              </div>
            )}
            <p className="absolute bottom-0 inset-x-0 text-[8px] text-center text-white/80 pb-0.5 truncate px-0.5"
              style={{ background: 'linear-gradient(transparent, rgba(0,0,0,0.5))' }}>
              {theme.name}
            </p>
          </button>
        ))}
      </div>
    </div>
  );
}

// ── AI panel ──────────────────────────────────────────────────────────────────
function AIPanel({ selectedEl, dispatch, design }: {
  selectedEl: DesignElement | null;
  dispatch: (a: EditorAction) => void;
  design: DesignState;
}) {
  const [copyStyle, setCopyStyle] = useState<'romantic' | 'playful' | 'elegant' | 'religious' | 'modern'>('elegant');
  const [copyField, setCopyField] = useState<'headline' | 'sub' | 'verse' | 'tagline'>('verse');
  const [loadingCopy, setLoadingCopy] = useState(false);
  const [loadingGrad, setLoadingGrad] = useState(false);
  const [mood, setMood] = useState('');
  const [lastCopy, setLastCopy] = useState('');
  const { toast } = useToast();

  const generateCopy = async () => {
    const textEl = selectedEl?.type === 'text' ? (selectedEl as TextElement) : null;
    if (!textEl) {
      toast({ title: 'Select a text element first', variant: 'destructive' });
      return;
    }
    setLoadingCopy(true);
    try {
      const partner1El = design.elements.find(e => e.id === 'el-name1') as TextElement | undefined;
      const partner2El = design.elements.find(e => e.id === 'el-name2') as TextElement | undefined;
      const dateEl = design.elements.find(e => e.id === 'el-date') as TextElement | undefined;
      const venueEl = design.elements.find(e => e.id === 'el-venue') as TextElement | undefined;

      const result = await generateSaveDateCopyAction({
        partner1: partner1El?.content ?? 'Partner 1',
        partner2: partner2El?.content ?? 'Partner 2',
        date: dateEl?.content ?? '',
        venue: venueEl?.content ?? '',
        city: '',
        style: copyStyle,
        field: copyField,
      });
      if (result.success && result.text) {
        dispatch({ type: 'UPDATE_ELEMENT', id: textEl.id, patch: { content: result.text } });
        setLastCopy(result.text);
        toast({ title: 'AI text applied!', description: `"${result.text.slice(0, 40)}…"` });
      } else {
        toast({ title: 'AI failed', description: result.error, variant: 'destructive' });
      }
    } finally {
      setLoadingCopy(false);
    }
  };

  const generateGradient = async () => {
    if (!mood) {
      toast({ title: 'Describe the mood first', variant: 'destructive' });
      return;
    }
    setLoadingGrad(true);
    try {
      const result = await generateSaveDateGradientAction({ mood });
      if (result.success && result.cssBackground) {
        dispatch({
          type: 'SET_BACKGROUND',
          bg: { id: 'ai-generated', name: result.name ?? 'AI Theme', cssBackground: result.cssBackground, preview: result.cssBackground },
        });
        toast({ title: 'AI background applied!', description: result.name });
      } else {
        toast({ title: 'Failed', description: result.error, variant: 'destructive' });
      }
    } finally {
      setLoadingGrad(false);
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-xs font-semibold uppercase tracking-widest text-[#d4af37]">AI Tools</p>

      {/* Copy generator */}
      <div className="space-y-2 p-3 rounded-xl bg-white/5 border border-white/10">
        <p className="text-xs font-medium text-white/80 flex items-center gap-1.5">
          <Sparkles size={12} className="text-[#d4af37]" /> AI Copywriter
        </p>
        <p className="text-[10px] text-muted-foreground">Select a text element, then click Generate to fill it with AI-written copy.</p>
        <div className="space-y-1.5">
          <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">Style</Label>
          <select value={copyStyle} onChange={e => setCopyStyle(e.target.value as typeof copyStyle)}
            className="w-full h-7 rounded-lg text-xs bg-black/30 border border-white/10 text-foreground px-2">
            {(['romantic', 'playful', 'elegant', 'religious', 'modern'] as const).map(s => (
              <option key={s} value={s} className="bg-[#1a1a1a]">{s.charAt(0).toUpperCase() + s.slice(1)}</option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">What to generate</Label>
          <select value={copyField} onChange={e => setCopyField(e.target.value as typeof copyField)}
            className="w-full h-7 rounded-lg text-xs bg-black/30 border border-white/10 text-foreground px-2">
            {([['headline', 'Headline'], ['sub', 'Subtitle'], ['verse', 'Verse / Quote'], ['tagline', 'Tagline']] as const).map(([v, l]) => (
              <option key={v} value={v} className="bg-[#1a1a1a]">{l}</option>
            ))}
          </select>
        </div>
        <Button size="sm" className="w-full bg-[#d4af37]/20 text-[#d4af37] border border-[#d4af37]/30 hover:bg-[#d4af37]/30 gap-1.5"
          onClick={generateCopy} disabled={loadingCopy}>
          {loadingCopy ? <RefreshCw size={12} className="animate-spin" /> : <Sparkles size={12} />}
          {loadingCopy ? 'Writing…' : 'Generate Copy'}
        </Button>
        {lastCopy && (
          <p className="text-[10px] italic text-[#f6e7b7]/60 leading-relaxed">"{lastCopy}"</p>
        )}
      </div>

      {/* Background generator */}
      <div className="space-y-2 p-3 rounded-xl bg-white/5 border border-white/10">
        <p className="text-xs font-medium text-white/80 flex items-center gap-1.5">
          <Palette size={12} className="text-[#d4af37]" /> AI Background
        </p>
        <Input value={mood} onChange={e => setMood(e.target.value)}
          placeholder="e.g. dusty rose, moonlit garden" className="h-8 text-xs bg-white/5 border-white/10" />
        <Button size="sm" className="w-full bg-[#d4af37]/20 text-[#d4af37] border border-[#d4af37]/30 hover:bg-[#d4af37]/30 gap-1.5"
          onClick={generateGradient} disabled={loadingGrad}>
          {loadingGrad ? <RefreshCw size={12} className="animate-spin" /> : <Palette size={12} />}
          {loadingGrad ? 'Generating…' : 'Generate Background'}
        </Button>
      </div>
    </div>
  );
}

// ── FamilyVerse panel ─────────────────────────────────────────────────────────
function FamilyVersePanel({
  apiKey, setApiKey, apiUrl, setApiUrl, websiteUrl, onGenerate,
}: {
  apiKey: string; setApiKey: (v: string) => void;
  apiUrl: string; setApiUrl: (v: string) => void;
  websiteUrl: string; onGenerate: () => void;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <p className="text-xs font-semibold uppercase tracking-widest text-[#d4af37]">FamilyVerse</p>
        <Badge variant="outline" className="text-[9px] border-[#d4af37]/30 text-[#d4af37]">Integration</Badge>
      </div>
      <p className="text-[10px] text-muted-foreground leading-relaxed">
        Connect your FamilyVerse app to generate QR codes via their API. Your QR will link to your wedding website.
      </p>
      <div className="space-y-2">
        <div className="space-y-1">
          <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">FamilyVerse API URL</Label>
          <Input value={apiUrl} onChange={e => setApiUrl(e.target.value)}
            className="h-8 text-xs bg-white/5 border-white/10 font-mono" placeholder="https://api.familyverse.app" />
        </div>
        <div className="space-y-1">
          <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">API Key</Label>
          <Input value={apiKey} onChange={e => setApiKey(e.target.value)} type="password"
            className="h-8 text-xs bg-white/5 border-white/10 font-mono" placeholder="fv_live_••••••••••" />
        </div>
        <div className="space-y-1">
          <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">Target URL (for QR)</Label>
          <Input value={websiteUrl} readOnly className="h-8 text-xs bg-white/5 border-white/10 font-mono opacity-60" />
        </div>
        <Button size="sm" className="w-full bg-[#d4af37]/20 border border-[#d4af37]/30 text-[#d4af37] hover:bg-[#d4af37]/30 gap-2" onClick={onGenerate}>
          <QrCode size={14} /> Generate via FamilyVerse
        </Button>
        <p className="text-[9px] text-muted-foreground text-center">
          The QR code image will be placed directly on your canvas.
        </p>
      </div>
    </div>
  );
}

// ── Right panel (properties) ──────────────────────────────────────────────────
function RightPanel({ element, dispatch, onDeselect, onDuplicate }: {
  element: DesignElement | null;
  dispatch: (a: EditorAction) => void;
  onDeselect: () => void;
  onDuplicate?: () => void;
}) {
  if (!element) {
    return (
      <div className="w-64 border-l border-white/10 p-4 flex flex-col items-center justify-center print:hidden">
        <div className="text-center space-y-2 text-muted-foreground">
          <Settings size={28} className="mx-auto opacity-30" />
          <p className="text-xs">Click an element to see its properties</p>
        </div>
      </div>
    );
  }

  const upd = (patch: Partial<DesignElement>) => dispatch({ type: 'UPDATE_ELEMENT', id: element.id, patch });

  return (
    <div className="w-64 border-l border-white/10 p-3 space-y-3 overflow-y-auto print:hidden">
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-[10px] uppercase tracking-widest text-[#d4af37] font-semibold">Properties</p>
        <button onClick={onDeselect} className="text-muted-foreground hover:text-white">
          <X size={14} />
        </button>
      </div>

      {/* Position */}
      <div className="space-y-1.5">
        <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">Position</Label>
        <div className="grid grid-cols-2 gap-1.5">
          <div>
            <Label className="text-[9px] text-muted-foreground">X</Label>
            <Input type="number" value={Math.round(element.x)} onChange={e => upd({ x: Number(e.target.value) })}
              className="h-7 text-xs bg-white/5 border-white/10" />
          </div>
          <div>
            <Label className="text-[9px] text-muted-foreground">Y</Label>
            <Input type="number" value={Math.round(element.y)} onChange={e => upd({ y: Number(e.target.value) })}
              className="h-7 text-xs bg-white/5 border-white/10" />
          </div>
        </div>
      </div>

      {/* Size */}
      <div className="space-y-1.5">
        <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">Size</Label>
        <div className="grid grid-cols-2 gap-1.5">
          <div>
            <Label className="text-[9px] text-muted-foreground">W</Label>
            <Input type="number" value={Math.round(element.width)} onChange={e => upd({ width: Number(e.target.value) })}
              className="h-7 text-xs bg-white/5 border-white/10" />
          </div>
          <div>
            <Label className="text-[9px] text-muted-foreground">H</Label>
            <Input type="number" value={Math.round(element.height)} onChange={e => upd({ height: Number(e.target.value) })}
              className="h-7 text-xs bg-white/5 border-white/10" />
          </div>
        </div>
      </div>

      {/* Rotation + Opacity */}
      <div className="space-y-1">
        <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">Rotation: {element.rotation}°</Label>
        <Slider min={-180} max={180} step={1} value={[element.rotation]} onValueChange={([v]) => upd({ rotation: v })} />
      </div>
      <div className="space-y-1">
        <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">Opacity: {Math.round(element.opacity * 100)}%</Label>
        <Slider min={0} max={1} step={0.01} value={[element.opacity]} onValueChange={([v]) => upd({ opacity: v })} />
      </div>

      {/* Type-specific */}
      {element.type === 'qr' && (
        <div className="space-y-2">
          <Separator className="border-white/10" />
          <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">QR URL</Label>
          <Input value={(element as QRElement).value}
            onChange={e => upd({ value: e.target.value } as Partial<QRElement>)}
            className="h-7 text-xs bg-white/5 border-white/10 font-mono" />
          <div className="grid grid-cols-2 gap-1.5">
            <div>
              <Label className="text-[9px] text-muted-foreground">Foreground</Label>
              <input type="color" value={(element as QRElement).fgColor}
                onChange={e => upd({ fgColor: e.target.value } as Partial<QRElement>)}
                className="w-full h-7 rounded-lg cursor-pointer border-0" />
            </div>
            <div>
              <Label className="text-[9px] text-muted-foreground">Background</Label>
              <input type="color" value={(element as QRElement).bgColor}
                onChange={e => upd({ bgColor: e.target.value } as Partial<QRElement>)}
                className="w-full h-7 rounded-lg cursor-pointer border-0" />
            </div>
          </div>
        </div>
      )}

      {element.type === 'sticker' && (
        <div className="space-y-2">
          <Separator className="border-white/10" />
          <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">Sticker Color</Label>
          <div className="flex items-center gap-2">
            <input type="color" value={(element as StickerElement).color}
              onChange={e => upd({ color: e.target.value } as Partial<StickerElement>)}
              className="w-8 h-8 rounded-lg cursor-pointer border-0 bg-transparent" />
            <Input value={(element as StickerElement).color}
              onChange={e => upd({ color: e.target.value } as Partial<StickerElement>)}
              className="h-8 text-xs bg-white/5 border-white/10 font-mono" />
          </div>
        </div>
      )}

      {element.type === 'image' && (
        <div className="space-y-2">
          <Separator className="border-white/10" />
          <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">Border Radius: {(element as ImageElement).borderRadius}px</Label>
          <Slider min={0} max={160} step={4} value={[(element as ImageElement).borderRadius]}
            onValueChange={([v]) => upd({ borderRadius: v } as Partial<ImageElement>)} />
          <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">Fit Mode</Label>
          <div className="flex gap-1">
            {(['cover', 'contain'] as const).map(fit => (
              <button key={fit} onClick={() => upd({ objectFit: fit } as Partial<ImageElement>)}
                className={`flex-1 h-7 rounded-lg text-xs capitalize transition-all ${
                  (element as ImageElement).objectFit === fit
                    ? 'bg-[#d4af37]/30 text-[#d4af37]'
                    : 'bg-white/5 text-muted-foreground hover:bg-white/10'
                }`}>
                {fit}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Layer controls */}
      <Separator className="border-white/10" />
      <div className="space-y-1.5">
        <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">Layer Order</Label>
        <div className="grid grid-cols-2 gap-1">
          <Button variant="outline" size="sm" className="h-7 text-xs border-white/10 gap-1"
            onClick={() => dispatch({ type: 'REORDER', id: element.id, dir: 'top' })}>
            <BringToFront size={11} /> Front
          </Button>
          <Button variant="outline" size="sm" className="h-7 text-xs border-white/10 gap-1"
            onClick={() => dispatch({ type: 'REORDER', id: element.id, dir: 'bottom' })}>
            <SendToBack size={11} /> Back
          </Button>
          <Button variant="outline" size="sm" className="h-7 text-xs border-white/10 gap-1"
            onClick={() => dispatch({ type: 'REORDER', id: element.id, dir: 'up' })}>
            <ChevronUp size={11} /> Forward
          </Button>
          <Button variant="outline" size="sm" className="h-7 text-xs border-white/10 gap-1"
            onClick={() => dispatch({ type: 'REORDER', id: element.id, dir: 'down' })}>
            <ChevronDown size={11} /> Backward
          </Button>
        </div>
      </div>

      {/* Align on canvas */}
      <Separator className="border-white/10" />
      <div className="space-y-1.5">
        <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">Align on Canvas</Label>
        <div className="grid grid-cols-2 gap-1">
          <Button variant="outline" size="sm" className="h-7 text-xs border-white/10"
            onClick={() => upd({ x: Math.round((CANVAS_W - element.width) / 2) })}
            title="Center horizontally">
            Center H
          </Button>
          <Button variant="outline" size="sm" className="h-7 text-xs border-white/10"
            onClick={() => upd({ y: Math.round((CANVAS_H - element.height) / 2) })}
            title="Center vertically">
            Center V
          </Button>
        </div>
      </div>

      {/* Lock / Duplicate / Delete */}
      <div className="flex gap-1.5 pt-1">
        <Button variant="outline" size="sm" className="flex-1 h-8 text-xs border-white/10 gap-1"
          onClick={() => upd({ locked: !element.locked })}>
          {element.locked ? <><Unlock size={12} /> Unlock</> : <><Lock size={12} /> Lock</>}
        </Button>
        {onDuplicate && (
          <Button variant="outline" size="sm" className="h-8 w-8 text-xs border-white/10 p-0 flex-shrink-0"
            title="Duplicate (Ctrl+D)" onClick={onDuplicate}>
            <Copy size={13} />
          </Button>
        )}
        <Button variant="outline" size="sm" className="flex-1 h-8 text-xs border-red-900/40 text-red-400 hover:bg-red-900/20 gap-1"
          onClick={() => dispatch({ type: 'DELETE_ELEMENT', id: element.id })}>
          <Trash2 size={12} /> Delete
        </Button>
      </div>
    </div>
  );
}

// ── Canvas element (drag + resize + inline edit) ──────────────────────────────
function CanvasElement({
  element, isSelected, isEditing, canvasScale,
  onSelect, onStartEdit, onStopEdit, onUpdate,
}: {
  element: DesignElement; isSelected: boolean; isEditing: boolean;
  canvasScale: number;
  onSelect: () => void;
  onStartEdit: () => void;
  onStopEdit: () => void;
  onUpdate: (patch: Partial<DesignElement>) => void;
}) {
  const elRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(null);
  const resize = useRef<{
    handle: string; startX: number; startY: number;
    origX: number; origY: number; origW: number; origH: number;
  } | null>(null);

  // Drag to move
  const onMouseDownMove = (e: React.MouseEvent) => {
    if (element.locked || isEditing) return;
    if ((e.target as HTMLElement).dataset.handle) return;
    e.stopPropagation();
    onSelect();
    drag.current = {
      startX: e.clientX, startY: e.clientY,
      origX: element.x, origY: element.y,
    };
    const onMove = (me: MouseEvent) => {
      if (!drag.current) return;
      const dx = (me.clientX - drag.current.startX) / canvasScale;
      const dy = (me.clientY - drag.current.startY) / canvasScale;
      onUpdate({ x: drag.current.origX + dx, y: drag.current.origY + dy });
    };
    const onUp = () => {
      drag.current = null;
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  };

  // Resize handles
  const onMouseDownResize = (e: React.MouseEvent, handle: string) => {
    if (element.locked) return;
    e.stopPropagation();
    e.preventDefault();
    resize.current = {
      handle, startX: e.clientX, startY: e.clientY,
      origX: element.x, origY: element.y,
      origW: element.width, origH: element.height,
    };
    const onMove = (me: MouseEvent) => {
      if (!resize.current) return;
      const dx = (me.clientX - resize.current.startX) / canvasScale;
      const dy = (me.clientY - resize.current.startY) / canvasScale;
      const { handle: h, origX, origY, origW, origH } = resize.current;
      let x = origX, y = origY, w = origW, ht = origH;
      if (h.includes('e')) w = Math.max(20, origW + dx);
      if (h.includes('s')) ht = Math.max(20, origH + dy);
      if (h.includes('w')) { x = origX + dx; w = Math.max(20, origW - dx); }
      if (h.includes('n')) { y = origY + dy; ht = Math.max(20, origH - dy); }
      onUpdate({ x, y, width: w, height: ht });
    };
    const onUp = () => {
      resize.current = null;
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  };

  const handleStyle: React.CSSProperties = {
    position: 'absolute', width: 10, height: 10,
    background: '#d4af37', border: '1.5px solid white',
    borderRadius: 2, zIndex: 9999,
  };

  return (
    <div
      ref={elRef}
      style={{
        position: 'absolute',
        left: element.x, top: element.y,
        width: element.width, height: element.height,
        transform: `rotate(${element.rotation}deg)`,
        opacity: element.opacity,
        cursor: element.locked ? 'default' : isEditing ? 'text' : 'move',
        userSelect: isEditing ? 'text' : 'none',
        outline: isSelected && !isEditing ? '1.5px solid #d4af37' : 'none',
        outlineOffset: 2,
        zIndex: element.zIndex,
        transformOrigin: 'center center',
      }}
      onMouseDown={onMouseDownMove}
      onDoubleClick={() => element.type === 'text' && !element.locked && onStartEdit()}
    >
      {/* Content */}
      {element.type === 'text' && (
        isEditing ? (
          <textarea
            autoFocus
            defaultValue={(element as TextElement).content}
            onBlur={e => { onUpdate({ content: e.target.value } as Partial<TextElement>); onStopEdit(); }}
            onClick={e => e.stopPropagation()}
            style={{
              width: '100%', height: '100%',
              background: 'rgba(0,0,0,0.3)', color: 'white',
              border: '1px solid #d4af37', borderRadius: 4,
              fontFamily: (element as TextElement).fontFamily,
              fontSize: (element as TextElement).fontSize,
              fontWeight: (element as TextElement).fontWeight,
              fontStyle: (element as TextElement).fontStyle,
              textAlign: (element as TextElement).textAlign,
              lineHeight: (element as TextElement).lineHeight,
              letterSpacing: `${(element as TextElement).letterSpacing / 100}em`,
              resize: 'none', outline: 'none', padding: 4,
            }}
          />
        ) : (
          <div
            style={{
              width: '100%', height: '100%',
              fontFamily: (element as TextElement).fontFamily,
              fontSize: (element as TextElement).fontSize,
              fontWeight: (element as TextElement).fontWeight,
              fontStyle: (element as TextElement).fontStyle,
              textDecoration: (element as TextElement).textDecoration,
              textAlign: (element as TextElement).textAlign,
              color: (element as TextElement).color,
              lineHeight: (element as TextElement).lineHeight,
              letterSpacing: `${(element as TextElement).letterSpacing / 100}em`,
              textShadow: (element as TextElement).shadow ? '0 2px 12px rgba(0,0,0,0.6)' : undefined,
              overflow: 'hidden', whiteSpace: 'pre-wrap', wordBreak: 'break-word',
            }}
          >
            {(element as TextElement).content}
          </div>
        )
      )}

      {element.type === 'image' && (
        <img
          src={(element as ImageElement).src}
          alt=""
          style={{
            width: '100%', height: '100%',
            objectFit: (element as ImageElement).objectFit,
            borderRadius: (element as ImageElement).borderRadius,
            display: 'block', pointerEvents: 'none',
          }}
        />
      )}

      {element.type === 'qr' && (
        <div style={{
          width: '100%', height: '100%',
          background: (element as QRElement).bgColor,
          borderRadius: (element as QRElement).borderRadius,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 8,
        }}>
          <QRCode
            value={(element as QRElement).value || 'https://example.com'}
            size={Math.min(element.width, element.height) - 16}
            bgColor={(element as QRElement).bgColor}
            fgColor={(element as QRElement).fgColor}
            level="H"
          />
        </div>
      )}

      {element.type === 'sticker' && (() => {
        const def = STICKERS.find(s => s.id === (element as StickerElement).stickerId);
        if (!def) return null;
        return (
          <svg viewBox={def.viewBox} fill={(element as StickerElement).color}
            style={{ width: '100%', height: '100%', pointerEvents: 'none' }}>
            <path d={def.svgPath} />
          </svg>
        );
      })()}

      {/* Resize handles */}
      {isSelected && !element.locked && !isEditing && (['nw', 'ne', 'sw', 'se', 'n', 'e', 's', 'w'] as const).map(h => {
        const pos: React.CSSProperties = {};
        if (h.includes('n')) pos.top = -5; else if (h.includes('s')) pos.bottom = -5; else pos.top = '50%';
        if (h.includes('w')) pos.left = -5; else if (h.includes('e')) pos.right = -5; else pos.left = '50%';
        if (!h.includes('n') && !h.includes('s')) pos.marginTop = -5;
        if (!h.includes('e') && !h.includes('w')) pos.marginLeft = -5;
        const cursors: Record<string, string> = { n: 'n-resize', s: 's-resize', e: 'e-resize', w: 'w-resize', nw: 'nw-resize', ne: 'ne-resize', sw: 'sw-resize', se: 'se-resize' };
        return (
          <div key={h} data-handle={h} style={{ ...handleStyle, ...pos, cursor: cursors[h] }}
            onMouseDown={e => onMouseDownResize(e, h)} />
        );
      })}
    </div>
  );
}
