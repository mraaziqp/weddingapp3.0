'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Sparkles, Plus, Trash2, Sliders, RotateCcw, Compass, ShieldAlert, CheckCircle, Scale, Info, Utensils, GlassWater, Flower, Pizza, Settings
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import Link from 'next/link';

interface PlannerItem {
  id: string;
  label: string;
  category: 'plate' | 'glass' | 'decor' | 'food' | 'other';
  shape: 'circle' | 'rectangle';
  width: number; // in inches
  height: number; // in inches (only for rectangle)
  x: number; // canvas center x in inches
  y: number; // canvas center y in inches
  color: string;
}

const PRESET_TEMPLATES = [
  { label: 'Dinner Plate (10.5")', category: 'plate', shape: 'circle', width: 10.5, height: 10.5, color: '#f8fafc' },
  { label: 'Bread Plate (6.5")', category: 'plate', shape: 'circle', width: 6.5, height: 6.5, color: '#f1f5f9' },
  { label: 'Charger Plate (13")', category: 'plate', shape: 'circle', width: 13, height: 13, color: '#d4af37' },
  { label: 'Wine Glass (3.5")', category: 'glass', shape: 'circle', width: 3.5, height: 3.5, color: '#cbd5e1' },
  { label: 'Water Goblet (4")', category: 'glass', shape: 'circle', width: 4.0, height: 4.0, color: '#94a3b8' },
  { label: 'Floral Centerpiece (16")', category: 'decor', shape: 'circle', width: 16.0, height: 16.0, color: '#f472b6' },
  { label: 'Large Platter (18"x12")', category: 'food', shape: 'rectangle', width: 18.0, height: 12.0, color: '#fb923c' },
  { label: 'Small Bowl (6"x6")', category: 'food', shape: 'rectangle', width: 6.0, height: 6.0, color: '#fca5a5' },
  { label: 'Menu Card (5"x8")', category: 'other', shape: 'rectangle', width: 5.0, height: 8.0, color: '#fef08a' },
];

export default function TablePlannerPage() {
  const { toast } = useToast();
  
  // Table Setup
  const [tableShape, setTableShape] = useState<'circle' | 'rectangle'>('circle');
  const [tableDiameter, setTableDiameter] = useState<number>(72); // inches (standard 6ft round)
  const [tableWidth, setTableWidth] = useState<number>(96); // inches (standard 8ft rectangular)
  const [tableHeight, setTableHeight] = useState<number>(36); // inches (standard 3ft rectangular width)
  
  // Items placed on the table
  const [items, setItems] = useState<PlannerItem[]>([
    { id: '1', label: 'Charger Plate', category: 'plate', shape: 'circle', width: 13, height: 13, x: 0, y: 24, color: '#d4af37' },
    { id: '2', label: 'Dinner Plate', category: 'plate', shape: 'circle', width: 10.5, height: 10.5, x: 0, y: 24, color: '#ffffff' },
    { id: '3', label: 'Floral Centerpiece', category: 'decor', shape: 'circle', width: 16, height: 16, x: 0, y: 0, color: '#f472b6' },
    { id: '4', label: 'Wine Glass', category: 'glass', shape: 'circle', width: 3.5, height: 3.5, x: 8, y: 22, color: '#cbd5e1' },
    { id: '5', label: 'Large Platter', category: 'food', shape: 'rectangle', width: 18, height: 12, x: 0, y: -18, color: '#fb923c' },
  ]);
  
  // Selection and Dragging State
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [draggingItemId, setDraggingItemId] = useState<string | null>(null);
  const dragStartOffset = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const canvasRef = useRef<SVGSVGElement | null>(null);

  // Grid / Snapping state
  const [useSnapping, setUseSnapping] = useState<boolean>(true);
  
  // Canvas scale factor: Pixels per Inch
  const ppi = 4.5;
  const canvasSize = 520;
  
  // Calculate areas and crowd indexes
  const { objectsArea, crowdPercentage, crowdStatus } = useMemo(() => {
    let tArea = 0;
    if (tableShape === 'circle') {
      tArea = Math.PI * Math.pow(tableDiameter / 2, 2);
    } else {
      tArea = tableWidth * tableHeight;
    }
    
    let oArea = 0;
    items.forEach(item => {
      if (item.shape === 'circle') {
        oArea += Math.PI * Math.pow(item.width / 2, 2);
      } else {
        oArea += item.width * (item.height || item.width);
      }
    });
    
    const pct = Math.min(Math.round((oArea / tArea) * 100), 100);
    
    let status: 'optimal' | 'crowded' | 'danger' = 'optimal';
    if (pct > 75) status = 'danger';
    else if (pct > 45) status = 'crowded';
    
    return {
      tableArea: Math.round(tArea),
      objectsArea: Math.round(oArea),
      crowdPercentage: pct,
      crowdStatus: status
    };
  }, [tableShape, tableDiameter, tableWidth, tableHeight, items]);

  const selectedItem = useMemo(() => items.find(i => i.id === selectedItemId), [items, selectedItemId]);

  // Handle Dragging Logic in custom SVG bounds
  const getMouseCoords = (e: React.MouseEvent<SVGSVGElement> | MouseEvent) => {
    if (!canvasRef.current) return { x: 0, y: 0 };
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Convert to relative coordinate system where (0,0) is center of canvas
    const relX = (x - canvasSize / 2) / ppi;
    const relY = (y - canvasSize / 2) / ppi;
    return { x: relX, y: relY };
  };

  const handleMouseDown = (id: string, e: React.MouseEvent<SVGElement>) => {
    e.stopPropagation();
    setSelectedItemId(id);
    setDraggingItemId(id);
    
    const item = items.find(i => i.id === id);
    if (!item) return;
    
    if (canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const clickY = e.clientY - rect.top;
      const itemCanvasX = canvasSize / 2 + item.x * ppi;
      const itemCanvasY = canvasSize / 2 + item.y * ppi;
      
      dragStartOffset.current = {
        x: (clickX - itemCanvasX) / ppi,
        y: (clickY - itemCanvasY) / ppi
      };
    }
  };

  useEffect(() => {
    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (!draggingItemId) return;
      
      const mousePos = getMouseCoords(e);
      let newX = mousePos.x - dragStartOffset.current.x;
      let newY = mousePos.y - dragStartOffset.current.y;
      
      if (useSnapping) {
        newX = Math.round(newX * 2) / 2; // Snap to 0.5 inches
        newY = Math.round(newY * 2) / 2;
      }
      
      // Boundaries check based on table bounds
      const item = items.find(i => i.id === draggingItemId);
      if (!item) return;
      
      const radius = item.width / 2;
      if (tableShape === 'circle') {
        const dist = Math.sqrt(newX * newX + newY * newY);
        const maxDist = (tableDiameter / 2) - radius;
        if (dist > maxDist) {
          const angle = Math.atan2(newY, newX);
          newX = Math.cos(angle) * maxDist;
          newY = Math.sin(angle) * maxDist;
        }
      } else {
        const maxX = (tableWidth / 2) - (item.shape === 'circle' ? radius : item.width / 2);
        const maxY = (tableHeight / 2) - (item.shape === 'circle' ? radius : (item.height || item.width) / 2);
        newX = Math.max(-maxX, Math.min(maxX, newX));
        newY = Math.max(-maxY, Math.min(maxY, newY));
      }

      setItems(prev => prev.map(item => item.id === draggingItemId ? { ...item, x: newX, y: newY } : item));
    };

    const handleGlobalMouseUp = () => {
      if (draggingItemId) {
        setDraggingItemId(null);
      }
    };

    if (draggingItemId) {
      window.addEventListener('mousemove', handleGlobalMouseMove);
      window.addEventListener('mouseup', handleGlobalMouseUp);
    }
    
    return () => {
      window.removeEventListener('mousemove', handleGlobalMouseMove);
      window.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [draggingItemId, items, tableShape, tableDiameter, tableWidth, tableHeight, useSnapping]);

  const addPreset = (preset: typeof PRESET_TEMPLATES[0]) => {
    const newItem: PlannerItem = {
      id: `item-${Date.now()}`,
      label: preset.label.split(' (')[0],
      category: preset.category as PlannerItem['category'],
      shape: preset.shape as 'circle' | 'rectangle',
      width: preset.width,
      height: preset.height,
      x: 0,
      y: 0,
      color: preset.color
    };
    setItems(prev => [...prev, newItem]);
    setSelectedItemId(newItem.id);
    toast({
      title: `${newItem.label} added`,
      description: 'Placed at the center of the table. Drag to arrange.'
    });
  };

  const deleteItem = (id: string) => {
    setItems(prev => prev.filter(i => i.id !== id));
    if (selectedItemId === id) setSelectedItemId(null);
    toast({
      title: 'Item removed',
      description: 'The selected object has been taken off the table.'
    });
  };

  const updateSelectedItem = (key: keyof PlannerItem, val: PlannerItem[keyof PlannerItem]) => {
    if (!selectedItemId) return;
    setItems(prev => prev.map(item => item.id === selectedItemId ? { ...item, [key]: val } : item));
  };

  const clearPlanner = () => {
    setItems([]);
    setSelectedItemId(null);
    toast({ title: 'Canvas Cleared', description: 'All items removed.' });
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'plate': return <Utensils className="h-4 w-4" />;
      case 'glass': return <GlassWater className="h-4 w-4" />;
      case 'decor': return <Flower className="h-4 w-4" />;
      case 'food': return <Pizza className="h-4 w-4" />;
      default: return <Settings className="h-4 w-4" />;
    }
  };

  return (
    <div className="relative min-h-screen space-y-8 p-4 md:p-8 overflow-hidden font-sans text-white">
      {/* Dynamic Ambient Background Blobs */}
      <div className="fixed inset-0 pointer-events-none z-[-1]">
        <div className="absolute top-[-10%] left-[-15%] w-[45%] h-[45%] rounded-full bg-amber-900/10 blur-[130px] mix-blend-screen animate-pulse duration-10000" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-purple-900/10 blur-[150px] mix-blend-screen" />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6 pb-6 border-b border-white/10"
      >
        <div className="space-y-2">
          <Badge variant="outline" className="text-[10px] uppercase tracking-[0.2em] border-amber-500/30 text-amber-300 py-1 px-3 bg-amber-500/10 mb-2">
            <Sparkles size={12} className="mr-2 inline" /> Synergy Creative Suite
          </Badge>
          <h1 className="font-serif text-5xl md:text-6xl font-light tracking-tight text-white/90">
            2D Table <span className="italic text-transparent bg-clip-text bg-gradient-to-r from-amber-200 to-amber-500">Spatial</span> Planner
          </h1>
          <p className="text-muted-foreground tracking-wide text-sm md:text-base max-w-2xl font-light">
            Perfect your layout. Customize diameter, drag plates, serving platters, glasses, and decors. Instantly evaluate surface capacity before the big night.
          </p>
        </div>
        
        <div className="flex gap-3">
          <Button asChild variant="outline" className="border-white/10 hover:bg-white/10 text-white">
            <Link href="/planner">
              Back to Suite
            </Link>
          </Button>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start pb-20">
        
        {/* Workspace Canvas (Left/Center) */}
        <Card className="xl:col-span-8 bg-black/40 border-white/10 backdrop-blur-xl rounded-3xl overflow-hidden shadow-2xl relative">
          <div className="absolute top-4 left-4 z-20 flex gap-2">
            <Badge variant="outline" className="bg-black/50 border-white/10 text-white/70 py-1 px-3">
              <Scale className="mr-1.5 h-3.5 w-3.5" /> 1 Inch = {ppi}px
            </Badge>
            <Badge variant="outline" className="bg-black/50 border-white/10 text-white/70 py-1 px-3">
              <Compass className="mr-1.5 h-3.5 w-3.5" /> Center coordinates at (0,0)
            </Badge>
          </div>

          <div className="absolute top-4 right-4 z-20 flex gap-2">
            <Button size="sm" variant="outline" className="h-8 border-white/10 bg-black/50 hover:bg-white/10 text-white" onClick={clearPlanner}>
              <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Clear All
            </Button>
          </div>

          <CardContent className="flex items-center justify-center p-8 bg-[url('https://www.transparenttextures.com/patterns/wood-pattern.png')] bg-opacity-20">
            {/* SVG Visual Workspace */}
            <svg 
              ref={canvasRef}
              width={canvasSize} 
              height={canvasSize} 
              className="bg-black/60 rounded-full border border-white/15 shadow-[inset_0_4px_30px_rgba(0,0,0,0.8)] overflow-visible relative cursor-crosshair select-none"
              onClick={() => setSelectedItemId(null)}
            >
              {/* Background Grid Pattern */}
              <defs>
                <pattern id="canvasGrid" width={ppi * 12} height={ppi * 12} patternUnits="userSpaceOnUse">
                  <path d={`M ${ppi * 12} 0 L 0 0 0 ${ppi * 12}`} fill="none" stroke="rgba(255, 255, 255, 0.03)" strokeWidth="1" />
                  <circle cx="0" cy="0" r="1.5" fill="rgba(255, 255, 255, 0.08)" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#canvasGrid)" className="rounded-full" />
              
              {/* Target guidelines */}
              <line x1="0" y1={canvasSize / 2} x2={canvasSize} y2={canvasSize / 2} stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
              <line x1={canvasSize / 2} y1="0" x2={canvasSize / 2} y2={canvasSize} stroke="rgba(255,255,255,0.03)" strokeWidth="1" />

              {/* Main Table Shape rendering based on settings */}
              {tableShape === 'circle' ? (
                <circle 
                  cx={canvasSize / 2} 
                  cy={canvasSize / 2} 
                  r={(tableDiameter * ppi) / 2} 
                  fill="#15171e"
                  stroke="#d4af37"
                  strokeWidth="3.5"
                  className="shadow-2xl transition-all duration-300 drop-shadow-[0_10px_20px_rgba(212,175,55,0.15)]"
                />
              ) : (
                <rect 
                  x={(canvasSize - tableWidth * ppi) / 2} 
                  y={(canvasSize - tableHeight * ppi) / 2} 
                  width={tableWidth * ppi} 
                  height={tableHeight * ppi} 
                  rx="15" 
                  fill="#15171e"
                  stroke="#d4af37"
                  strokeWidth="3.5"
                  className="shadow-2xl transition-all duration-300 drop-shadow-[0_10px_20px_rgba(212,175,55,0.15)]"
                />
              )}

              {/* Visual Table Textures / Markings */}
              {tableShape === 'circle' && (
                <>
                  <circle cx={canvasSize / 2} cy={canvasSize / 2} r={(tableDiameter * ppi) / 2 - 20} fill="none" stroke="rgba(212, 175, 55, 0.1)" strokeWidth="1" strokeDasharray="5,5" />
                  <circle cx={canvasSize / 2} cy={canvasSize / 2} r={(tableDiameter * ppi) / 4} fill="none" stroke="rgba(255,255,255,0.02)" strokeWidth="1" />
                </>
              )}

              {/* Render Placed items */}
              {items.map((item) => {
                const itemX = canvasSize / 2 + item.x * ppi;
                const itemY = canvasSize / 2 + item.y * ppi;
                const radius = (item.width * ppi) / 2;
                const isSelected = selectedItemId === item.id;
                
                return (
                  <g 
                    key={item.id}
                    className="cursor-move group"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedItemId(item.id);
                    }}
                    onMouseDown={(e) => handleMouseDown(item.id, e)}
                  >
                    {/* Visual selection outline highlight */}
                    {isSelected && (
                      item.shape === 'circle' ? (
                        <circle cx={itemX} cy={itemY} r={radius + 6} fill="none" stroke="#d4af37" strokeWidth="1.5" strokeDasharray="3,3" className="animate-spin" style={{ animationDuration: '15s' }} />
                      ) : (
                        <rect 
                          x={itemX - (item.width * ppi) / 2 - 6} 
                          y={itemY - ((item.height || item.width) * ppi) / 2 - 6} 
                          width={item.width * ppi + 12} 
                          height={(item.height || item.width) * ppi + 12} 
                          fill="none" 
                          stroke="#d4af37" 
                          strokeWidth="1.5" 
                          strokeDasharray="3,3"
                          rx="4"
                        />
                      )
                    )}

                    {/* Placed Item Main body */}
                    {item.shape === 'circle' ? (
                      <circle 
                        cx={itemX} 
                        cy={itemY} 
                        r={radius} 
                        fill={item.color} 
                        stroke={isSelected ? '#d4af37' : 'rgba(0, 0, 0, 0.25)'}
                        strokeWidth="2"
                        className="transition-shadow duration-200 drop-shadow-[0_4px_8px_rgba(0,0,0,0.4)] hover:brightness-110"
                      />
                    ) : (
                      <rect 
                        x={itemX - (item.width * ppi) / 2} 
                        y={itemY - ((item.height || item.width) * ppi) / 2} 
                        width={item.width * ppi} 
                        height={(item.height || item.width) * ppi} 
                        rx="4"
                        fill={item.color} 
                        stroke={isSelected ? '#d4af37' : 'rgba(0, 0, 0, 0.25)'}
                        strokeWidth="2"
                        className="transition-shadow duration-200 drop-shadow-[0_4px_8px_rgba(0,0,0,0.4)] hover:brightness-110"
                      />
                    )}

                    {/* Miniature outline detailing for plate rims */}
                    {item.category === 'plate' && item.shape === 'circle' && (
                      <circle cx={itemX} cy={itemY} r={radius - 8} fill="none" stroke="rgba(0,0,0,0.12)" strokeWidth="1" />
                    )}

                    {/* Inner graphic for centerpieces */}
                    {item.category === 'decor' && item.shape === 'circle' && (
                      <circle cx={itemX} cy={itemY} r={radius - 4} fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5" strokeDasharray="2,2" />
                    )}

                    {/* Item label */}
                    <text 
                      x={itemX} 
                      y={itemY + 4} 
                      textAnchor="middle" 
                      className="text-[9px] font-sans font-semibold tracking-wider pointer-events-none fill-black select-none opacity-80"
                      style={{ fill: item.color === '#ffffff' || item.color === '#f8fafc' ? '#1e293b' : '#ffffff' }}
                    >
                      {item.label}
                    </text>
                  </g>
                );
              })}
            </svg>
          </CardContent>
        </Card>

        {/* Configuration Sidebar (Right) */}
        <div className="xl:col-span-4 space-y-6">
          
          {/* Surface Area Meter */}
          <Card className="bg-black/40 border-white/10 backdrop-blur-xl rounded-3xl shadow-2xl overflow-hidden text-white border">
            <CardHeader className="pb-3 border-b border-white/5">
              <CardTitle className="text-sm font-semibold uppercase tracking-widest text-amber-400/80 flex items-center gap-2">
                <Scale size={16} /> Surface Capacity Index
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-white/40">Total Placed Objects</p>
                  <p className="text-3xl font-light font-serif mt-1">{items.length}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] uppercase tracking-wider text-white/40">Occupied Space</p>
                  <p className="text-3xl font-light font-serif text-amber-400 mt-1">{objectsArea} sq. in.</p>
                </div>
              </div>

              {/* Progress Gauge */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-semibold text-white/80">
                  <span className="text-white/60">Crowding Meter</span>
                  <span className={cn(
                    crowdStatus === 'danger' ? 'text-red-400' : crowdStatus === 'crowded' ? 'text-amber-400' : 'text-emerald-400'
                  )}>{crowdPercentage}% Filled</span>
                </div>
                
                <div className="w-full h-3 rounded-full bg-white/5 overflow-hidden border border-white/10 flex">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${crowdPercentage}%` }}
                    transition={{ duration: 0.5 }}
                    className={cn(
                      "h-full rounded-full transition-all",
                      crowdStatus === 'danger' ? 'bg-gradient-to-r from-red-500 to-rose-600' : crowdStatus === 'crowded' ? 'bg-gradient-to-r from-amber-400 to-amber-500' : 'bg-gradient-to-r from-emerald-400 to-emerald-500'
                    )}
                  />
                </div>
              </div>

              {/* Feedback Alert banner */}
              <div className={cn(
                "p-4 rounded-2xl border flex items-start gap-3 transition-colors",
                crowdStatus === 'danger' 
                  ? 'bg-red-500/10 border-red-500/30 text-red-200' 
                  : crowdStatus === 'crowded' 
                    ? 'bg-amber-500/10 border-amber-500/30 text-amber-200' 
                    : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-200'
              )}>
                {crowdStatus === 'danger' ? (
                  <ShieldAlert className="h-5 w-5 text-red-400 mt-0.5 flex-shrink-0" />
                ) : crowdStatus === 'crowded' ? (
                  <Info className="h-5 w-5 text-amber-400 mt-0.5 flex-shrink-0" />
                ) : (
                  <CheckCircle className="h-5 w-5 text-emerald-400 mt-0.5 flex-shrink-0" />
                )}
                <div>
                  <h4 className="text-sm font-semibold uppercase tracking-wide">
                    {crowdStatus === 'danger' ? 'Critical Overcrowding!' : crowdStatus === 'crowded' ? 'Comfortably Snug' : 'Perfect Spacing'}
                  </h4>
                  <p className="text-xs text-white/50 mt-1 leading-relaxed">
                    {crowdStatus === 'danger' 
                      ? 'The surface area is extremely packed. Serving large platters or extra plates will overlap. Consider removing items or switching to a larger table.'
                      : crowdStatus === 'crowded'
                        ? 'Items fit, but table is snug. Ideal for cozy family-style platters. Ensure glassware has breathing room.'
                        : 'Perfect spacing. Guests will have ample elbow room, and food plates are laid out optimally.'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Table Controller */}
          <Card className="bg-black/40 border-white/10 backdrop-blur-xl rounded-3xl shadow-2xl overflow-hidden border">
            <CardHeader className="pb-3 border-b border-white/5">
              <CardTitle className="text-sm font-semibold uppercase tracking-widest text-amber-400/80 flex items-center gap-2">
                <Sliders size={16} /> Table Dimensions
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-5">
              {/* Shape selector */}
              <div className="grid grid-cols-2 gap-2 p-1 rounded-2xl bg-black/40 border border-white/5">
                <Button 
                  size="sm"
                  variant={tableShape === 'circle' ? 'default' : 'ghost'} 
                  className={cn("rounded-xl transition-all text-white", tableShape === 'circle' && "bg-amber-500 text-black font-bold")}
                  onClick={() => setTableShape('circle')}
                >
                  Round Table
                </Button>
                <Button 
                  size="sm"
                  variant={tableShape === 'rectangle' ? 'default' : 'ghost'} 
                  className={cn("rounded-xl transition-all text-white", tableShape === 'rectangle' && "bg-amber-500 text-black font-bold")}
                  onClick={() => setTableShape('rectangle')}
                >
                  Rectangular
                </Button>
              </div>

              {/* Dimension sliders based on shape */}
              {tableShape === 'circle' ? (
                <div className="space-y-3">
                  <div className="flex justify-between text-sm text-white/80">
                    <span className="text-white/60">Diameter (Round)</span>
                    <span className="font-bold text-amber-400">{tableDiameter}&quot; ({Math.round(tableDiameter * 2.54)} cm)</span>
                  </div>
                  <Slider 
                    value={[tableDiameter]} 
                    onValueChange={(val) => setTableDiameter(val[0])} 
                    min={48} 
                    max={96} 
                    step={6} 
                  />
                  <div className="flex justify-between text-[10px] text-white/30">
                    <span>4ft (48&quot;)</span>
                    <span>5ft (60&quot;)</span>
                    <span>6ft (72&quot;)</span>
                    <span>8ft (96&quot;)</span>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm text-white/80">
                      <span className="text-white/60">Length</span>
                      <span className="font-bold text-amber-400">{tableWidth}&quot; ({Math.round(tableWidth * 2.54)} cm)</span>
                    </div>
                    <Slider 
                      value={[tableWidth]} 
                      onValueChange={(val) => setTableWidth(val[0])} 
                      min={48} 
                      max={120} 
                      step={12} 
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm text-white/80">
                      <span className="text-white/60">Width</span>
                      <span className="font-bold text-amber-400">{tableHeight}&quot; ({Math.round(tableHeight * 2.54)} cm)</span>
                    </div>
                    <Slider 
                      value={[tableHeight]} 
                      onValueChange={(val) => setTableHeight(val[0])} 
                      min={24} 
                      max={48} 
                      step={6} 
                    />
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between pt-3 border-t border-white/5 text-sm">
                <span className="text-white/60">Snap-to-Grid (0.5&quot;)</span>
                <Switch checked={useSnapping} onCheckedChange={setUseSnapping} className="data-[state=checked]:bg-amber-500" />
              </div>
            </CardContent>
          </Card>

          {/* Quick Preset Library */}
          <Card className="bg-black/40 border-white/10 backdrop-blur-xl rounded-3xl shadow-2xl overflow-hidden border">
            <CardHeader className="pb-3 border-b border-white/5">
              <CardTitle className="text-sm font-semibold uppercase tracking-widest text-amber-400/80 flex items-center gap-2">
                <Plus size={16} /> Asset Preset Library
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <p className="text-xs text-white/40 mb-4">Click any item below to add it to the spatial canvas workspace.</p>
              
              <div className="grid grid-cols-2 gap-2.5 max-h-[190px] overflow-y-auto pr-1">
                {PRESET_TEMPLATES.map((preset) => (
                  <Button 
                    key={preset.label}
                    size="sm" 
                    variant="outline" 
                    className="h-10 justify-start gap-2 border-white/5 bg-white/5 text-white/80 hover:bg-amber-500 hover:text-black hover:border-amber-400 transition-all text-xs"
                    onClick={() => addPreset(preset)}
                  >
                    {getCategoryIcon(preset.category)}
                    <span className="truncate">{preset.label}</span>
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Selected Item Editor (AnimatePresence) */}
          <AnimatePresence>
            {selectedItem && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3 }}
              >
                <Card className="bg-black/40 border-amber-500/30 backdrop-blur-xl rounded-3xl shadow-2xl overflow-hidden relative border">
                  <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-amber-400 to-transparent" />
                  <CardHeader className="pb-3 border-b border-white/5 flex flex-row items-center justify-between">
                    <CardTitle className="text-sm font-semibold uppercase tracking-widest text-amber-300 flex items-center gap-2">
                      <Sliders size={16} /> Object Customizer
                    </CardTitle>
                    <Button 
                      size="icon" 
                      variant="ghost" 
                      className="h-8 w-8 text-red-400 hover:bg-red-500/20 hover:text-red-300"
                      onClick={() => deleteItem(selectedItem.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </CardHeader>
                  <CardContent className="pt-6 space-y-4">
                    <div className="space-y-2">
                      <label className="text-xs text-white/40 uppercase tracking-wider">Item Label</label>
                      <input 
                        type="text" 
                        value={selectedItem.label} 
                        onChange={(e) => updateSelectedItem('label', e.target.value)}
                        className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-amber-400 transition-colors text-sm"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-xs text-white/40 uppercase tracking-wider">Width / Diameter</label>
                        <div className="relative">
                          <input 
                            type="number" 
                            value={selectedItem.width} 
                            onChange={(e) => updateSelectedItem('width', parseFloat(e.target.value) || 1)}
                            className="w-full bg-black/40 border border-white/10 rounded-xl pl-4 pr-8 py-2 text-white focus:outline-none focus:border-amber-400 transition-colors text-sm"
                          />
                          <span className="absolute right-3 top-2.5 text-xs text-white/30">in</span>
                        </div>
                      </div>

                      {selectedItem.shape === 'rectangle' && (
                        <div className="space-y-2">
                          <label className="text-xs text-white/40 uppercase tracking-wider">Height / Length</label>
                          <div className="relative">
                            <input 
                              type="number" 
                              value={selectedItem.height || selectedItem.width} 
                              onChange={(e) => updateSelectedItem('height', parseFloat(e.target.value) || 1)}
                              className="w-full bg-black/40 border border-white/10 rounded-xl pl-4 pr-8 py-2 text-white focus:outline-none focus:border-amber-400 transition-colors text-sm"
                            />
                            <span className="absolute right-3 top-2.5 text-xs text-white/30">in</span>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs text-white/40 uppercase tracking-wider">Accent Theme Color</label>
                      <div className="flex gap-2.5">
                        {['#ffffff', '#f8fafc', '#cbd5e1', '#d4af37', '#f472b6', '#fb923c', '#fca5a5', '#c084fc', '#38bdf8'].map((c) => (
                          <button 
                            key={c}
                            className={cn(
                              "w-6 h-6 rounded-full border border-black/40 relative flex items-center justify-center transition-all hover:scale-110",
                              selectedItem.color === c ? 'scale-110 border-white ring-1 ring-amber-400' : ''
                            )}
                            style={{ backgroundColor: c }}
                            onClick={() => updateSelectedItem('color', c)}
                          />
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>

        </div>

      </div>
    </div>
  );
}
