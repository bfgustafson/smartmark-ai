import { SlideAnalysis } from "../types";

/**
 * Analyzes a slide image locally using canvas pixel sampling.
 * No API key or network needed — runs entirely in the browser.
 */
export const analyzeSlideContrast = async (
  base64Image: string,
  watermarkText: string
): Promise<SlideAnalysis> => {
  const img = await loadImage(base64Image);
  const { brightness, variance, edgeDensity } = analyzePixels(img);

  const isDark = brightness < 128;

  // Pick a sophisticated watermark color based on background brightness
  const watermarkColor = pickWatermarkColor(brightness);

  // Higher variance / edge density = busier slide = higher opacity needed to be visible,
  // but also more spacing to avoid clutter
  const busyScore = (variance / 80) * 0.6 + (edgeDensity / 0.15) * 0.4;
  const clampedBusy = Math.min(Math.max(busyScore, 0), 1);

  const opacity = 0.15 + clampedBusy * 0.2; // 0.15 – 0.35

  // Longer text or busier slides get more spacing
  const textLengthFactor = Math.min(watermarkText.length / 20, 1);
  const recommendedSpacing = 1.0 + clampedBusy * 0.8 + textLengthFactor * 0.4;

  const reasoning = isDark
    ? `Dark background (avg brightness ${Math.round(brightness)}). Using light watermark.`
    : `Light background (avg brightness ${Math.round(brightness)}). Using dark watermark.`;

  return {
    isDark,
    watermarkColor,
    opacity: Math.round(opacity * 100) / 100,
    reasoning,
    recommendedSpacing: Math.round(recommendedSpacing * 10) / 10,
  };
};

function loadImage(base64: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = base64.startsWith("data:") ? base64 : `data:image/jpeg;base64,${base64}`;
  });
}

function analyzePixels(img: HTMLImageElement) {
  const canvas = document.createElement("canvas");
  // Sample at reduced resolution for speed
  const scale = Math.min(1, 200 / Math.max(img.width, img.height));
  canvas.width = Math.round(img.width * scale);
  canvas.height = Math.round(img.height * scale);
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;
  const pixelCount = data.length / 4;

  // Compute average brightness and variance
  let totalBrightness = 0;
  const brightnesses: number[] = [];

  for (let i = 0; i < data.length; i += 4) {
    // Perceived brightness (ITU-R BT.601)
    const b = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
    totalBrightness += b;
    brightnesses.push(b);
  }

  const brightness = totalBrightness / pixelCount;

  // Variance tells us how uniform vs. varied the slide is
  let varianceSum = 0;
  for (const b of brightnesses) {
    varianceSum += (b - brightness) ** 2;
  }
  const variance = Math.sqrt(varianceSum / pixelCount);

  // Simple edge density: count pixels that differ significantly from their right neighbor
  let edgeCount = 0;
  const w = canvas.width;
  for (let i = 0; i < brightnesses.length - 1; i++) {
    if (i % w !== w - 1) {
      // not at right edge of row
      if (Math.abs(brightnesses[i] - brightnesses[i + 1]) > 30) {
        edgeCount++;
      }
    }
  }
  const edgeDensity = edgeCount / pixelCount;

  return { brightness, variance, edgeDensity };
}

function pickWatermarkColor(brightness: number): string {
  // Map background brightness to a nice contrasting watermark color
  if (brightness < 60) {
    return "#cbd5e1"; // slate-300 — for very dark backgrounds
  } else if (brightness < 128) {
    return "#e2e8f0"; // slate-200 — for moderately dark
  } else if (brightness < 200) {
    return "#1e293b"; // slate-800 — for moderately light
  } else {
    return "#334155"; // slate-700 — for very light/white backgrounds
  }
}
