import { useState } from "react";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { Textarea } from "./ui/textarea";
import { Badge } from "./ui/badge";
import { Copy, Download, Code } from "lucide-react";
import { toast } from "sonner";
import { GradientLayer } from "./GradientGenerator";

interface GradientExporterProps {
  layers: GradientLayer[];
}

export const GradientExporter = ({ layers }: GradientExporterProps) => {
  const [exportFormat, setExportFormat] = useState<'css' | 'html'>('css');

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

  const generateCSS = () => {
    const backgroundImages = layers.map(layer => generateGradientCSS(layer));
    
    const blendModes = layers.map(layer => layer.blendMode).join(', ');
    
    return `.gradient-background {
  background-image: ${backgroundImages.join(',\n    ')};
  background-blend-mode: ${blendModes};
  width: 100%;
  height: 100vh;
  min-height: 400px;
}`;
  };

  const generateHTML = () => {
    const backgroundImages = layers.map(layer => generateGradientCSS(layer));
    
    const blendModes = layers.map(layer => layer.blendMode).join(', ');
    
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Gradient Background</title>
  <style>
    .gradient-background {
      background-image: ${backgroundImages.join(',\n        ')};
      background-blend-mode: ${blendModes};
      width: 100%;
      height: 100vh;
      min-height: 400px;
      margin: 0;
      padding: 0;
    }
    
    body {
      margin: 0;
      padding: 0;
      font-family: system-ui, -apple-system, sans-serif;
    }
  </style>
</head>
<body>
  <div class="gradient-background">
    <!-- Your content here -->
  </div>
</body>
</html>`;
  };

  const getExportContent = () => {
    switch (exportFormat) {
      case 'css':
        return generateCSS();
      case 'html':
        return generateHTML();
      default:
        return '';
    }
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(getExportContent());
      toast("Copied to clipboard!");
    } catch (err) {
      toast("Failed to copy to clipboard");
    }
  };

  const downloadFile = () => {
    const content = getExportContent();
    const extension = exportFormat === 'css' ? 'css' : 'html';
    const blob = new Blob([content], { type: `text/${extension}` });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `gradient-background.${extension}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast(`Downloaded gradient-background.${extension}`);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Export</h3>
        <div className="flex gap-2">
          <Badge 
            variant={exportFormat === 'css' ? "default" : "outline"}
            className="cursor-pointer"
            onClick={() => setExportFormat('css')}
          >
            <Code className="w-3 h-3 mr-1" />
            CSS
          </Badge>
          <Badge 
            variant={exportFormat === 'html' ? "default" : "outline"}
            className="cursor-pointer"
            onClick={() => setExportFormat('html')}
          >
            <Code className="w-3 h-3 mr-1" />
            HTML
          </Badge>
        </div>
      </div>

      <Textarea
        value={getExportContent()}
        readOnly
        className="font-mono text-sm min-h-[200px] resize-none"
        placeholder="Generated code will appear here..."
      />

      <div className="flex gap-2">
        <Button onClick={copyToClipboard} className="flex-1">
          <Copy className="w-4 h-4 mr-2" />
          Copy Code
        </Button>
        <Button onClick={downloadFile} variant="outline" className="flex-1">
          <Download className="w-4 h-4 mr-2" />
          Download
        </Button>
      </div>

      <div className="text-xs text-muted-foreground bg-muted/50 p-3 rounded-lg">
        <strong>CSS:</strong> Pure CSS with background-image gradients • 
        <strong className="ml-2">HTML:</strong> Complete HTML file with embedded styles • 
        <strong className="ml-2">Layers:</strong> {layers.length} active
      </div>
    </div>
  );
};