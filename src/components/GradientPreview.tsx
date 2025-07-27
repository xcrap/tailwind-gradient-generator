import React from 'react';
import { GradientLayer } from './GradientGenerator';

interface GradientPreviewProps {
  layers: GradientLayer[];
  onLayerClick: (layerId: string) => void;
  activeLayerId?: string;
}

const generateGradientCSS = (layer: GradientLayer): string => {
  const { color, positionX, positionY, spread, opacity } = layer;
  
  // Convert hex to RGB for opacity
  const hex = color.replace('#', '');
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  const alpha = opacity / 100;
  
  const colorWithOpacity = `rgba(${r}, ${g}, ${b}, ${alpha})`;
  const transparentColor = `rgba(${r}, ${g}, ${b}, 0)`;
  
  // Create smooth radial gradient with middle stop
  const middleOpacity = alpha * 0.2;
  const middleStop = spread * 0.5;
  
  return `radial-gradient(circle ${spread}% at ${positionX}% ${positionY}%, ${colorWithOpacity} 0%, rgba(${r}, ${g}, ${b}, ${middleOpacity}) ${middleStop}%, ${transparentColor} ${spread}%)`;
};

export const GradientPreview: React.FC<GradientPreviewProps> = ({
  layers,
  onLayerClick,
  activeLayerId
}) => {
  // Generate combined background style
  const backgroundImages = layers.map(layer => generateGradientCSS(layer));
  
  const combinedStyle = {
    backgroundImage: backgroundImages.join(', '),
    backgroundBlendMode: layers.map(layer => layer.blendMode).join(', ')
  };

  return (
    <div className="relative w-full h-full overflow-hidden rounded-lg">
      {/* Main gradient background */}
      <div 
        className="absolute inset-0"
        style={combinedStyle}
      />
      
      {/* Interactive gradient points */}
      {layers.map((layer, index) => (
        <div
          key={layer.id}
          className={`absolute w-4 h-4 rounded-full border-2 cursor-pointer transform -translate-x-1/2 -translate-y-1/2 transition-all duration-200 ${
            activeLayerId === layer.id 
              ? 'border-white bg-white shadow-lg scale-125' 
              : 'border-white/60 bg-white/40 hover:bg-white/60'
          }`}
          style={{
            left: `${layer.positionX}%`,
            top: `${layer.positionY}%`,
            zIndex: 30
          }}
          onClick={() => onLayerClick(layer.id)}
        />
      ))}
      
      {/* Content overlay */}
      <div 
        className="absolute inset-0 pointer-events-none"
        style={{ zIndex: 40 }}
      >
        <div className="flex items-center justify-center h-full">
          <div className="text-center text-white/80">
            <h2 className="text-2xl font-bold mb-2">Gradient Preview</h2>
            <p className="text-sm">Click points to edit layers</p>
          </div>
        </div>
      </div>
    </div>
  );
};