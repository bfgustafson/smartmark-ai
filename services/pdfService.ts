import { PDFDocument, rgb, degrees, StandardFonts } from 'pdf-lib';
import { ProcessedPage, WatermarkPosition } from '../types';

// Declare global pdfjsLib from the CDN script
declare const pdfjsLib: any;

export const renderPdfPagesToImages = async (file: File): Promise<string[]> => {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const numPages = pdf.numPages;
  const images: string[] = [];

  for (let i = 1; i <= numPages; i++) {
    const page = await pdf.getPage(i);
    const viewport = page.getViewport({ scale: 1.0 });

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

  for (let i = 0; i < pages.length; i++) {
    const page = pages[i];
    const { width, height } = page.getSize();

    const analysis = processedPages[i]?.analysis ||
                     processedPages[processedPages.length - 1]?.analysis ||
                     { watermarkColor: '#808080', opacity: 0.3, isDark: false, reasoning: 'default', recommendedSpacing: 1.0 };

    const colorRgb = hexToRgb(analysis.watermarkColor);

    if (globalPosition === WatermarkPosition.TILED) {
      // Match preview: 10px text in ~426px container ≈ 2.3% of width
      const fontSize = width / 42;
      const rotation = degrees(-30); // matches preview's -rotate-[30deg]

      const spacingMultiplier = analysis.recommendedSpacing || 1.0;

      // Match preview's percentage-based spacing algorithm exactly:
      //   charApproxWidth = 2.5% of container width per character
      //   basePaddingX = 15% of container width
      //   basePaddingY = 20% of container height
      const approxTextWidth = watermarkText.length * (width * 0.025);
      const basePaddingX = width * 0.15;
      const basePaddingY = height * 0.20;

      const gapX = approxTextWidth + (basePaddingX * spacingMultiplier);
      const gapY = basePaddingY * spacingMultiplier;

      // Cover entire page with bleed for rotation
      for (let ty = -height * 0.5; ty < height * 1.5; ty += gapY) {
        for (let tx = -width * 0.5; tx < width * 1.5; tx += gapX) {
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
      // Single position: match preview's text-xl in ~426px ≈ 4.7% of width
      const fontSize = width / 21;
      const textWidth = helveticaFont.widthOfTextAtSize(watermarkText, fontSize);
      const textHeight = helveticaFont.heightAtSize(fontSize);

      // Match preview's top-8/left-8 (2rem ≈ 3.7% of container width)
      const margin = width * 0.037;

      let x = 0;
      let y = 0;
      let rotation = degrees(0);

      switch (globalPosition) {
        case WatermarkPosition.CENTER:
          x = (width - textWidth) / 2;
          y = (height - textHeight) / 2;
          break;
        case WatermarkPosition.TOP_LEFT:
          x = margin;
          y = height - textHeight - margin;
          break;
        case WatermarkPosition.TOP_RIGHT:
          x = width - textWidth - margin;
          y = height - textHeight - margin;
          break;
        case WatermarkPosition.BOTTOM_LEFT:
          x = margin;
          y = margin;
          break;
        case WatermarkPosition.BOTTOM_RIGHT:
          x = width - textWidth - margin;
          y = margin;
          break;
        case WatermarkPosition.DIAGONAL:
          // Match preview's -rotate-45 (clockwise descending)
          rotation = degrees(-45);
          x = (width / 2) - (textWidth / 2 * 0.7);
          y = (height / 2) + (textHeight / 2);
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
