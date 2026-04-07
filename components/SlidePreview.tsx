import React from 'react';
import { ProcessedPage, WatermarkPosition } from '../types';
import { Loader2, CheckCircle2, AlertCircle, ScanEye } from 'lucide-react';
import clsx from 'clsx';

interface SlidePreviewProps {
  page: ProcessedPage;
  watermarkText: string;
  position: WatermarkPosition;
}

export const SlidePreview: React.FC<SlidePreviewProps> = ({ page, watermarkText, position }) => {
  // Determine watermark style based on analysis
  const watermarkStyle: React.CSSProperties = {
    color: page.analysis?.watermarkColor || '#808080',
    opacity: page.analysis?.opacity || 0.3,
  };

  const getPositionClasses = (pos: WatermarkPosition) => {
    switch(pos) {
      case WatermarkPosition.TOP_LEFT: return 'top-8 left-8';
      case WatermarkPosition.TOP_RIGHT: return 'top-8 right-8';
      case WatermarkPosition.BOTTOM_LEFT: return 'bottom-8 left-8';
      case WatermarkPosition.BOTTOM_RIGHT: return 'bottom-8 right-8';
      case WatermarkPosition.CENTER: return 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2';
      case WatermarkPosition.DIAGONAL: return 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 -rotate-45 origin-center';
      default: return 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2';
    }
  };

  const renderTiledWatermarks = () => {
    const spacing = page.analysis?.recommendedSpacing || 1.0;
    
    // Approximation of the logic in pdfService
    // Since we are in HTML/CSS % world, we have to approximate text width relative to container.
    // A longer word takes more space.
    const charApproxWidth = 2.5; // Approx % width per char
    const textWidth = watermarkText.length * charApproxWidth;
    
    const basePaddingX = 15; // %
    const basePaddingY = 20; // %

    const gapX = textWidth + (basePaddingX * spacing);
    const gapY = basePaddingY * spacing;
    
    const elements = [];
    
    const rows = Math.ceil(150 / gapY) + 2; 
    const cols = Math.ceil(150 / gapX) + 2; 

    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            const isOffset = r % 2 !== 0;
            const offsetAmt = gapX / 2;
            
            const leftPos = (c * gapX) + (isOffset ? offsetAmt : 0) - 20; 
            const topPos = (r * gapY) - 20; 
            
            elements.push(
                <div 
                    key={`${r}-${c}`}
                    className="absolute whitespace-nowrap text-[10px] font-bold -rotate-[30deg]"
                    style={{
                        ...watermarkStyle,
                        left: `${leftPos}%`,
                        top: `${topPos}%`,
                        opacity: (page.analysis?.opacity || 0.3), 
                    }}
                >
                    {watermarkText}
                </div>
            );
        }
    }

    return (
        <div className="absolute inset-0 overflow-hidden pointer-events-none select-none">
            {elements}
        </div>
    );
  };

  return (
    <div className="bg-gray-800/50 rounded-xl overflow-hidden border border-gray-700/50 hover:border-gray-600 transition-all shadow-sm group">
      <div className="relative aspect-video bg-gray-900 overflow-hidden">
        {/* Slide Image */}
        <img 
          src={page.originalImage} 
          alt={`Slide ${page.pageIndex + 1}`} 
          className="w-full h-full object-contain relative z-0"
        />

        {/* Watermark Overlay Preview */}
        {page.status === 'complete' && page.analysis && (
            position === WatermarkPosition.TILED ? renderTiledWatermarks() : (
              <div 
                className={clsx("absolute whitespace-nowrap font-bold text-xl pointer-events-none select-none z-10", getPositionClasses(position))}
                style={watermarkStyle}
              >
                {watermarkText}
              </div>
            )
        )}

        {/* Status Overlay */}
        <div className="absolute top-2 left-2 flex items-center space-x-2 z-20">
          <div className={clsx(
            "backdrop-blur-md px-2 py-1 rounded-md text-xs font-medium flex items-center space-x-1.5 shadow-lg",
            page.status === 'analyzing' && "bg-indigo-500/20 text-indigo-200 border border-indigo-500/30",
            page.status === 'complete' && "bg-emerald-500/20 text-emerald-200 border border-emerald-500/30",
            page.status === 'error' && "bg-red-500/20 text-red-200 border border-red-500/30",
            page.status === 'pending' && "bg-gray-800/80 text-gray-400 border border-gray-700"
          )}>
            {page.status === 'analyzing' && <><Loader2 size={12} className="animate-spin" /> <span>AI Analyzing...</span></>}
            {page.status === 'complete' && <><CheckCircle2 size={12} /> <span>Optimized</span></>}
            {page.status === 'error' && <><AlertCircle size={12} /> <span>Failed</span></>}
            {page.status === 'pending' && <><ScanEye size={12} /> <span>Ready to Optimize</span></>}
          </div>
        </div>
      </div>

      {/* Analysis Details Footer */}
      <div className="p-3 bg-gray-800/80 border-t border-gray-700 flex justify-between items-center text-xs">
        <span className="text-gray-400 font-mono">Page {page.pageIndex + 1}</span>
        {page.status === 'complete' && page.analysis && (
          <div className="flex items-center space-x-3">
             <div className="flex items-center space-x-1.5" title="Detected Background">
                <div 
                    className="w-2 h-2 rounded-full ring-1 ring-gray-600" 
                    style={{backgroundColor: page.analysis.watermarkColor}}
                ></div>
                <span className="text-gray-400">{page.analysis.isDark ? 'Dark BG' : 'Light BG'}</span>
             </div>
             {position === WatermarkPosition.TILED && page.analysis.recommendedSpacing && (
                <>
                <div className="h-3 w-[1px] bg-gray-700"></div>
                <div className="flex items-center space-x-1.5" title="AI Suggested Density">
                    <span className="text-indigo-400 font-medium">Spacing: {page.analysis.recommendedSpacing}x</span>
                </div>
                </>
             )}
          </div>
        )}
      </div>
    </div>
  );
};