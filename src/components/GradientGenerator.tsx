import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Slider } from './ui/slider';
import { Badge } from './ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { RefreshCw, Plus, X } from 'lucide-react';

export interface GradientLayer {
  id: string;
  color: string;
  positionX: number;
  positionY: number;
  spread: number;
  opacity: number;
  blendMode: string;
  gradientType: 'radial' | 'radial-free';
  direction?: number; // For oval rotation in degrees
}

export interface MaskSettings {
  enabled: boolean;
  type: 'none' | 'maskX' | 'maskY' | 'maskCenter';
  intensityFrom: number;
  intensityTo: number;
}



const blendModes = [
  'normal',
  'multiply',
  'screen',
  'overlay',
  'soft-light',
  'hard-light',
  'color-dodge',
  'color-burn',
  'darken',
  'lighten'
];

export const GradientGenerator: React.FC = () => {
  const [layers, setLayers] = useState<GradientLayer[]>([
    {
      id: '1',
      color: '#7c3aed',
      positionX: 20,
      positionY: 50,
      spread: 70,
      opacity: 30,
      blendMode: 'normal',
      gradientType: 'radial'
    },
    {
      id: '2',
      color: '#ec4899',
      positionX: 80,
      positionY: 50,
      spread: 70,
      opacity: 25,
      blendMode: 'multiply',
      gradientType: 'radial'
    },
    {
      id: '3',
      color: '#22d3ee',
      positionX: 50,
      positionY: 70,
      spread: 70,
      opacity: 15,
      blendMode: 'hard-light',
      gradientType: 'radial'
    }
  ]);

  const [activeLayer, setActiveLayer] = useState<string>('1');
  const [isDragging, setIsDragging] = useState<string | null>(null);
  const [maskSettings, setMaskSettings] = useState<MaskSettings>({
    enabled: false,
    type: 'none',
    intensityFrom: 30,
    intensityTo: 70
  });
  const previewRef = useRef<HTMLDivElement>(null);

  const updateLayer = (id: string, updates: Partial<GradientLayer>) => {
    setLayers(prev => prev.map(layer =>
      layer.id === id ? { ...layer, ...updates } : layer
    ));
  };

  const addLayer = () => {
    const colors = ['#7c3aed', '#ec4899', '#22d3ee', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];
    const newId = Date.now().toString();
    const newLayer: GradientLayer = {
      id: newId,
      color: colors[Math.floor(Math.random() * colors.length)],
      positionX: 50,
      positionY: 50,
      spread: 50,
      opacity: 20,
      blendMode: 'multiply',
      gradientType: 'radial',
      direction: 0
    };
    setLayers(prev => [...prev, newLayer]);
    setActiveLayer(newId);
  };

  const removeLayer = (id: string) => {
    if (layers.length <= 1) return; // Must have at least one layer
    setLayers(prev => prev.filter(layer => layer.id !== id));
    if (activeLayer === id) {
      const remainingLayers = layers.filter(layer => layer.id !== id);
      setActiveLayer(remainingLayers[0]?.id || '');
    }
  };

  const randomize = useCallback(() => {
    const colors = ['#7c3aed', '#ec4899', '#22d3ee', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];
    const blendModes = ['multiply', 'screen', 'overlay', 'soft-light'];

    setLayers(prev => prev.map((layer, index) => ({
      ...layer,
      color: colors[Math.floor(Math.random() * colors.length)],
      positionX: Math.floor(Math.random() * 100),
      positionY: Math.floor(Math.random() * 100),
      spread: 30 + Math.floor(Math.random() * 40), // 30-70%
      opacity: 15 + Math.floor(Math.random() * 25), // 15-40%
      blendMode: index === 0 ? 'normal' : blendModes[Math.floor(Math.random() * blendModes.length)],
      gradientType: 'radial', // Always default to circles
      direction: 0
    })));
  }, []);

  const handleMouseDown = useCallback((layerId: string, e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(layerId);
    setActiveLayer(layerId);
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging || !previewRef.current) return;

    const rect = previewRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    updateLayer(isDragging, {
      positionX: Math.max(0, Math.min(100, x)),
      positionY: Math.max(0, Math.min(100, y))
    });
  }, [isDragging]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(null);
  }, []);

  // Handle keyboard events for layer deletion
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Backspace' || e.key === 'Delete') {
        // Only delete if we're not typing in an input field
        const target = e.target as HTMLElement;
        if (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA' && activeLayer) {
          e.preventDefault();
          removeLayer(activeLayer);
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [activeLayer, removeLayer]);

  const currentLayer = layers.find(layer => layer.id === activeLayer);

  const generateTailwindClass = (layer: GradientLayer): string => {
    const { color, positionX, positionY, spread, opacity, blendMode, gradientType, direction = 0 } = layer;
    const midStop = Math.round(spread * 0.5);

    if (gradientType === 'radial-free') {
      // Use elliptical radial gradient - smaller at center (50%, 50%) and bigger at edges
      const distanceFromCenterX = Math.abs(positionX - 50);
      const distanceFromCenterY = Math.abs(positionY - 50);
      // Use larger sizes since we'll make the container bigger to prevent clipping
      const ellipseX = Math.round(Math.min(90, 30 + distanceFromCenterX * 1.2));
      const ellipseY = Math.round(Math.min(90, 30 + distanceFromCenterY * 1.2));
      return `absolute -inset-12 bg-[radial-gradient(ellipse_${ellipseX}%_${ellipseY}%_at_${Math.round(positionX)}%_${Math.round(positionY)}%,${color}${Math.round(opacity * 2.55).toString(16).padStart(2, '0')}_0%,${color}${Math.round(opacity * 0.8 * 2.55).toString(16).padStart(2, '0')}_${midStop}%,transparent_${Math.round(spread)}%)] mix-blend-${blendMode} pointer-events-none`;
    }

    return `absolute inset-0 bg-[radial-gradient(circle_at_${Math.round(positionX)}%_${Math.round(positionY)}%,${color}${Math.round(opacity * 2.55).toString(16).padStart(2, '0')}_0%,${color}${Math.round(opacity * 0.8 * 2.55).toString(16).padStart(2, '0')}_${midStop}%,transparent_${Math.round(spread)}%)] mix-blend-${blendMode} pointer-events-none`;
  };

  const generateMaskClasses = (): string => {
    if (!maskSettings.enabled || maskSettings.type === 'none') return '';
    
    const from = maskSettings.intensityFrom;
    const to = maskSettings.intensityTo;
    
    switch (maskSettings.type) {
      case 'maskX':
        // Horizontal masks only use one intensity value
        return `mask-x mask-x-from-${to}%`;
      case 'maskY':
        // Vertical masks only use one intensity value
        return `mask-y mask-y-from-${to}%`;
      case 'maskCenter':
        return `mask-radial mask-radial-from-${from}% mask-radial-to-${to}%`;
      default:
        return '';
    }
  };

  const generateMaskStyles = (): React.CSSProperties => {
    if (!maskSettings.enabled || maskSettings.type === 'none') return {};
    
    const from = maskSettings.intensityFrom;
    const to = maskSettings.intensityTo;
    
    switch (maskSettings.type) {
      case 'maskX':
        const fadeStartX = 100 - to;
        return {
          maskImage: `linear-gradient(to right, transparent 0%, black ${fadeStartX}%, black ${to}%, transparent 100%)`,
          WebkitMaskImage: `linear-gradient(to right, transparent 0%, black ${fadeStartX}%, black ${to}%, transparent 100%)`
        };
      case 'maskY':
        const fadeStartY = 100 - to;
        return {
          maskImage: `linear-gradient(to bottom, transparent 0%, black ${fadeStartY}%, black ${to}%, transparent 100%)`,
          WebkitMaskImage: `linear-gradient(to bottom, transparent 0%, black ${fadeStartY}%, black ${to}%, transparent 100%)`
        };
      case 'maskCenter':
        // Create a smooth radial fade that matches Tailwind's behavior
        return {
          maskImage: `radial-gradient(circle at center, black 0%, black ${from}%, transparent ${to}%)`,
          WebkitMaskImage: `radial-gradient(circle at center, black 0%, black ${from}%, transparent ${to}%)`
        };
      default:
        return {};
    }
  };

  const exportCode = () => {
    const maskClasses = generateMaskClasses();
    const code = `<div class="relative w-full min-h-screen bg-white overflow-hidden${maskClasses ? ` ${maskClasses}` : ''}">
${layers.map(layer => `  <div class="${generateTailwindClass(layer)}"></div>`).join('\n')}
</div>`;

    navigator.clipboard.writeText(code);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-semibold text-gray-900 mb-4">
            Tailwind v4 Radial Gradient Generator
          </h1>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Preview */}
          <div className="space-y-6">
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold">Preview</h2>
                <Button variant="outline" size="sm" onClick={randomize}>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Randomize
                </Button>
              </div>
              <div className="relative w-full h-96 bg-white rounded-lg overflow-hidden">
                <div
                  ref={previewRef}
                  className="relative w-full h-full bg-white overflow-hidden select-none"
                  style={generateMaskStyles()}
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUp}
                  onMouseLeave={handleMouseUp}
                >
                  {layers.map((layer) => (
                    <div
                      key={layer.id}
                      className={layer.gradientType === 'radial-free' ? "absolute -inset-12 pointer-events-none" : "absolute inset-0 pointer-events-none"}
                      style={{
                        background: layer.gradientType === 'radial-free'
                          ? `radial-gradient(ellipse ${Math.round(Math.min(90, 30 + Math.abs(layer.positionX - 50) * 1.2))}% ${Math.round(Math.min(90, 30 + Math.abs(layer.positionY - 50) * 1.2))}% at ${layer.positionX}% ${layer.positionY}%, ${layer.color}${Math.round(layer.opacity * 2.55).toString(16).padStart(2, '0')} 0%, ${layer.color}${Math.round(layer.opacity * 0.8 * 2.55).toString(16).padStart(2, '0')} ${Math.round(layer.spread * 0.5)}%, transparent ${layer.spread}%)`
                          : `radial-gradient(circle at ${layer.positionX}% ${layer.positionY}%, ${layer.color}${Math.round(layer.opacity * 2.55).toString(16).padStart(2, '0')} 0%, ${layer.color}${Math.round(layer.opacity * 0.8 * 2.55).toString(16).padStart(2, '0')} ${Math.round(layer.spread * 0.5)}%, transparent ${layer.spread}%)`,
                        opacity: layer.opacity,
                        mixBlendMode: layer.blendMode as any,
                        transform: layer.gradientType === 'radial-free' && layer.direction ? `rotate(${layer.direction}deg)` : undefined
                      }}
                    />
                  ))}

                  {/* Interactive points */}
                  {layers.map((layer, index) => (
                    <div
                      key={`point-${layer.id}`}
                      className={`absolute w-6 h-6 rounded-full border-2 border-black cursor-pointer transform -translate-x-1/2 -translate-y-1/2 transition-all flex items-center justify-center text-xs font-bold text-white ${activeLayer === layer.id
                        ? 'shadow-lg scale-125'
                        : 'hover:scale-110'
                        } ${isDragging === layer.id ? 'scale-150 shadow-xl' : ''}`}
                      style={{
                        left: `${layer.positionX}%`,
                        top: `${layer.positionY}%`,
                        backgroundColor: layer.color,
                        zIndex: 10,
                        cursor: isDragging === layer.id ? 'grabbing' : 'grab'
                      }}
                      onMouseDown={(e) => handleMouseDown(layer.id, e)}
                    >
                      {index + 1}
                    </div>
                  ))}
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4">Export Code</h2>
              <textarea
                className="w-full h-32 p-3 border rounded-lg font-mono text-sm"
                readOnly
                value={`<div class="relative w-full min-h-screen bg-white overflow-hidden${generateMaskClasses() ? ` ${generateMaskClasses()}` : ''}">
${layers.map(layer => `  <div class="${generateTailwindClass(layer)}"></div>`).join('\n')}
</div>`}
              />
              <Button onClick={exportCode} className="mt-4 w-full">
                Copy Code
              </Button>
            </Card>
          </div>

          {/* Controls */}
          <div className="space-y-6">
            {/* Layer Selection */}
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-600">LAYERS</h2>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={addLayer}
                  className="h-8 w-8 p-0"
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              <div className="flex gap-3 flex-wrap">
                {layers.map((layer, index) => (
                  <div
                    key={layer.id}
                    className={`relative flex flex-col items-center gap-2 p-3 rounded-xl border-2 cursor-pointer transition-all hover:scale-105 w-24 ${activeLayer === layer.id
                      ? 'border-blue-500 bg-blue-50 shadow-md'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                      }`}
                    onClick={() => setActiveLayer(layer.id)}
                  >
                    {layers.length > 1 && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          removeLayer(layer.id);
                        }}
                        className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                    <div
                      className="w-8 h-8 rounded-full border-2 border-white shadow-lg"
                      style={{ backgroundColor: layer.color }}
                    />
                    <span className="text-sm font-bold text-gray-700">{index + 1}</span>
                    <div className="flex flex-col gap-1 w-full">
                      <Badge variant="outline" className="text-xs px-1 py-0.5 font-medium text-center truncate w-full justify-center">
                        {layer.blendMode.replace('-', ' ')}
                      </Badge>
                      <Badge variant={layer.gradientType === 'radial-free' ? 'default' : 'secondary'} className="text-xs px-1 py-0.5 font-medium text-center w-full justify-center">
                        {layer.gradientType === 'radial-free' ? 'oval' : 'circle'}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {/* Mask Controls */}
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-600">CONTAINER MASK</h2>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-600">Enable</span>
                  <button
                    onClick={() => setMaskSettings(prev => ({ ...prev, enabled: !prev.enabled }))}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      maskSettings.enabled ? 'bg-blue-600' : 'bg-gray-200'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        maskSettings.enabled ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              </div>

              {maskSettings.enabled && (
                <div className="space-y-4">
                  {/* Mask Type Selection */}
                  <div className="space-y-2">
                    <label className="text-xs font-semibold uppercase tracking-wide text-gray-600">MASK TYPE</label>
                    <Select
                      value={maskSettings.type}
                      onValueChange={(value) => setMaskSettings(prev => ({ ...prev, type: value as MaskSettings['type'] }))}
                    >
                      <SelectTrigger className="h-10 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        <SelectItem value="maskX">Horizontal Fade</SelectItem>
                        <SelectItem value="maskY">Vertical Fade</SelectItem>
                        <SelectItem value="maskCenter">Center Fade</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Intensity Controls */}
                  {maskSettings.type === 'maskCenter' ? (
                    // Dual intensity controls for center fade
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-semibold uppercase tracking-wide text-gray-600">FADE START</label>
                          <span className="text-xs font-mono text-gray-700">{maskSettings.intensityFrom}%</span>
                        </div>
                        <Slider
                          value={[maskSettings.intensityFrom]}
                          onValueChange={([value]) => {
                            // Ensure from is always less than to
                            const newFrom = Math.min(value, maskSettings.intensityTo - 5);
                            setMaskSettings(prev => ({ ...prev, intensityFrom: newFrom }));
                          }}
                          min={0}
                          max={95}
                          step={5}
                          className="w-full"
                        />
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-semibold uppercase tracking-wide text-gray-600">FADE END</label>
                          <span className="text-xs font-mono text-gray-700">{maskSettings.intensityTo}%</span>
                        </div>
                        <Slider
                          value={[maskSettings.intensityTo]}
                          onValueChange={([value]) => {
                            // Ensure to is always greater than from
                            const newTo = Math.max(value, maskSettings.intensityFrom + 5);
                            setMaskSettings(prev => ({ ...prev, intensityTo: newTo }));
                          }}
                          min={5}
                          max={100}
                          step={5}
                          className="w-full"
                        />
                      </div>
                    </div>
                  ) : (
                    // Single intensity control for horizontal/vertical
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-semibold uppercase tracking-wide text-gray-600">INTENSITY</label>
                        <span className="text-xs font-mono text-gray-700">{maskSettings.intensityTo}%</span>
                      </div>
                      <Slider
                        value={[maskSettings.intensityTo]}
                        onValueChange={([value]) => setMaskSettings(prev => ({ ...prev, intensityTo: value }))}
                        min={0}
                        max={100}
                        step={5}
                        className="w-full"
                      />
                    </div>
                  )}
                </div>
              )}
            </Card>

            {/* Layer Controls */}
            {currentLayer && (
              <Card className="p-6">
                <div className="flex items-center justify-between mb-5">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-600">
                    LAYER {layers.findIndex(l => l.id === currentLayer.id) + 1} CONTROLS
                  </h3>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-mono text-gray-600">{currentLayer.color}</span>
                    <div className="relative">
                      <input
                        type="color"
                        value={currentLayer.color}
                        onChange={(e) => updateLayer(currentLayer.id, { color: e.target.value })}
                        className="w-8 h-8 rounded-full border-2 border-gray-200 cursor-pointer shadow-sm opacity-0 absolute inset-0"
                      />
                      <div
                        className="w-8 h-8 rounded-full border-2 border-gray-200 shadow-sm cursor-pointer"
                        style={{ backgroundColor: currentLayer.color }}
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  {/* Gradient Type Toggle */}
                  <div className="space-y-2">
                    <label className="text-xs font-semibold uppercase tracking-wide text-gray-600">GRADIENT TYPE</label>
                    <div className="flex gap-2">
                      <button
                        onClick={() => updateLayer(currentLayer.id, { gradientType: 'radial' })}
                        className={`flex-1 px-3 py-2 text-sm font-medium rounded-lg border-2 transition-all ${currentLayer.gradientType === 'radial'
                          ? 'border-blue-500 bg-blue-50 text-blue-700'
                          : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                          }`}
                      >
                        Circle
                      </button>
                      <button
                        onClick={() => updateLayer(currentLayer.id, { gradientType: 'radial-free' })}
                        className={`flex-1 px-3 py-2 text-sm font-medium rounded-lg border-2 transition-all ${currentLayer.gradientType === 'radial-free'
                          ? 'border-blue-500 bg-blue-50 text-blue-700'
                          : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                          }`}
                      >
                        Oval
                      </button>
                    </div>
                  </div>

                  {/* First Line: Blend Mode, X Position, Y Position */}
                  <div className="grid grid-cols-3 gap-6 items-end">
                    <div className="space-y-2">
                      <label className="text-xs font-semibold uppercase tracking-wide text-gray-600">BLEND MODE</label>
                      <Select
                        value={currentLayer.blendMode}
                        onValueChange={(value) => updateLayer(currentLayer.id, { blendMode: value })}
                      >
                        <SelectTrigger className="h-10 text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {blendModes.map((mode) => (
                            <SelectItem key={mode} value={mode}>
                              {mode.replace('-', ' ')}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-semibold uppercase tracking-wide text-gray-600">X POSITION</label>
                        <span className="text-xs font-mono text-gray-700">{Math.round(currentLayer.positionX)}%</span>
                      </div>
                      <div className="h-10 flex items-center">
                        <Slider
                          value={[currentLayer.positionX]}
                          onValueChange={([value]) => updateLayer(currentLayer.id, { positionX: value })}
                          min={0}
                          max={100}
                          step={1}
                          className="w-full"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-semibold uppercase tracking-wide text-gray-600">Y POSITION</label>
                        <span className="text-xs font-mono text-gray-700">{Math.round(currentLayer.positionY)}%</span>
                      </div>
                      <div className="h-10 flex items-center">
                        <Slider
                          value={[currentLayer.positionY]}
                          onValueChange={([value]) => updateLayer(currentLayer.id, { positionY: value })}
                          min={0}
                          max={100}
                          step={1}
                          className="w-full"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Second Line: Spread and Opacity */}
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-semibold uppercase tracking-wide text-gray-600">SPREAD</label>
                        <span className="text-xs font-mono text-gray-700">{Math.round(currentLayer.spread)}%</span>
                      </div>
                      <Slider
                        value={[currentLayer.spread]}
                        onValueChange={([value]) => updateLayer(currentLayer.id, { spread: value })}
                        min={30}
                        max={100}
                        step={5}
                        className="w-full"
                      />
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-semibold uppercase tracking-wide text-gray-600">OPACITY</label>
                        <span className="text-xs font-mono text-gray-700">{Math.round(currentLayer.opacity)}%</span>
                      </div>
                      <Slider
                        value={[currentLayer.opacity]}
                        onValueChange={([value]) => updateLayer(currentLayer.id, { opacity: value })}
                        min={5}
                        max={50}
                        step={1}
                        className="w-full"
                      />
                    </div>
                  </div>

                  {/* Direction Control for Oval Gradients */}
                  {currentLayer.gradientType === 'radial-free' && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-semibold uppercase tracking-wide text-gray-600">DIRECTION</label>
                        <span className="text-xs font-mono text-gray-700">{Math.round(currentLayer.direction || 0)}°</span>
                      </div>
                      <Slider
                        value={[currentLayer.direction || 0]}
                        onValueChange={([value]) => updateLayer(currentLayer.id, { direction: value })}
                        min={0}
                        max={360}
                        step={15}
                        className="w-full"
                      />
                    </div>
                  )}
                </div>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};