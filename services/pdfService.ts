import { PDFDocument, rgb, degrees, StandardFonts } from 'pdf-lib';
import { ProcessedPage, WatermarkPosition } from '../types';

// Declare global pdfjsLib from the CDN script
declare const pdfjsLib: any;

export const renderPdfPagesToImages = async (file: File): Promise<string[]> => {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const numPages = pdf.numPages;
  const images: string[] = [];

  // Process all pages
  const pagesToProcess = numPages;

  for (let i = 1; i <= pagesToProcess; i++) {
    const page = await pdf.getPage(i);
    const viewport = page.getViewport({ scale: 1.0 }); // Thumbnail scale
    
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.height = viewport.height;
    canvas.width = viewport.width;

    if (context) {
      await page.render({
        canvasContext: context,
        viewport: viewport
      }).promise;
      images.push(canvas.toDataURL('image/jpeg', 0.8));
    }
  }

  return images;
};

// Helper to hex to RGB (0-1)
const hexToRgb = (hex: string) => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16) / 255,
    g: parseInt(result[2], 16) / 255,
    b: parseInt(result[3], 16) / 255
  } : { r: 0.5, g: 0.5, b: 0.5 };
};

export const generateWatermarkedPdf = async (
  originalFile: File,
  watermarkText: string,
  processedPages: ProcessedPage[],
  globalPosition: WatermarkPosition
): Promise<Uint8Array> => {
  const arrayBuffer = await originalFile.arrayBuffer();
  const pdfDoc = await PDFDocument.load(arrayBuffer);
  const helveticaFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const pages = pdfDoc.getPages();

  // We only have analysis for the pages we processed. 
  
  for (let i = 0; i < pages.length; i++) {
    const page = pages[i];
    const { width, height } = page.getSize();
    
    // Find matching analysis or use default/last
    const analysis = processedPages[i]?.analysis || 
                     processedPages[processedPages.length - 1]?.analysis || 
                     { watermarkColor: '#808080', opacity: 0.3, isDark: false, reasoning: 'default', recommendedSpacing: 1.0 };

    const colorRgb = hexToRgb(analysis.watermarkColor);
    
    let fontSize = width / 15; 
    let textWidth = helveticaFont.widthOfTextAtSize(watermarkText, fontSize);
    let textHeight = helveticaFont.heightAtSize(fontSize);

    let x = 0;
    let y = 0;
    let rotation = degrees(0);

    if (globalPosition === WatermarkPosition.TILED) {
      // Tiled logic matching the improved preview
      fontSize = width / 24; 
      textWidth = helveticaFont.widthOfTextAtSize(watermarkText, fontSize);
      textHeight = helveticaFont.heightAtSize(fontSize);
      rotation = degrees(-30);

      // Define grid spacing with AI recommendation
      const spacingMultiplier = analysis.recommendedSpacing || 1.0;
      
      // ALGORITHMIC BASELINE + AI ADJUSTMENT
      // The baseline is "Place text based on length" -> textWidth.
      // Then we add padding. The padding scales with font size.
      // The AI "evaluates" this by providing the multiplier.
      const horizontalPadding = fontSize * 4; 
      const verticalPadding = fontSize * 6;

      const gapX = (textWidth + horizontalPadding * spacingMultiplier);
      const gapY = (textHeight + verticalPadding * spacingMultiplier);

      // Loop to cover the entire page with some bleed for rotation
      // We start negative and go beyond width/height to ensure corners are covered when rotated
      for (let ty = -height * 0.5; ty < height * 1.5; ty += gapY) {
        for (let tx = -width * 0.5; tx < width * 1.5; tx += gapX) {
           // Create a brick-offset effect
           // Normalize loop index for modulus
           const rowIdx = Math.floor(ty / gapY);
           const offsetX = (rowIdx % 2 === 0) ? 0 : gapX / 2;

           page.drawText(watermarkText, {
            x: tx + offsetX,
            y: ty,
            size: fontSize,
            font: helveticaFont,
            color: rgb(colorRgb.r, colorRgb.g, colorRgb.b),
            opacity: analysis.opacity, 
            rotate: rotation,
          });
        }
      }
    } else {
      // Single Position Logic
      switch (globalPosition) {
        case WatermarkPosition.CENTER:
          x = (width - textWidth) / 2;
          y = (height - textHeight) / 2;
          break;
        case WatermarkPosition.TOP_LEFT:
          x = 40;
          y = height - textHeight - 40;
          break;
        case WatermarkPosition.TOP_RIGHT:
          x = width - textWidth - 40;
          y = height - textHeight - 40;
          break;
        case WatermarkPosition.BOTTOM_LEFT:
          x = 40;
          y = 40;
          break;
        case WatermarkPosition.BOTTOM_RIGHT:
          x = width - textWidth - 40;
          y = 40;
          break;
        case WatermarkPosition.DIAGONAL:
          rotation = degrees(45);
          // Center calculation with rotation consideration
          x = (width / 2) - (textWidth / 2 * 0.7);
          y = (height / 2) - (textHeight / 2);
          break;
      }

      page.drawText(watermarkText, {
        x,
        y,
        size: fontSize,
        font: helveticaFont,
        color: rgb(colorRgb.r, colorRgb.g, colorRgb.b),
        opacity: analysis.opacity,
        rotate: rotation,
      });
    }
  }

  return await pdfDoc.save();
};