export interface SlideAnalysis {
  isDark: boolean;
  watermarkColor: string;
  opacity: number;
  reasoning: string;
  recommendedSpacing?: number;
}

export interface ProcessedPage {
  pageIndex: number;
  originalImage: string; // Base64
  status: 'pending' | 'analyzing' | 'complete' | 'error';
  analysis?: SlideAnalysis;
}

export enum WatermarkPosition {
  CENTER = 'center',
  TOP_LEFT = 'top-left',
  TOP_RIGHT = 'top-right',
  BOTTOM_LEFT = 'bottom-left',
  BOTTOM_RIGHT = 'bottom-right',
  DIAGONAL = 'diagonal',
  TILED = 'tiled'
}

export interface AppState {
  file: File | null;
  pages: ProcessedPage[];
  watermarkText: string;
  isProcessing: boolean;
  globalPosition: WatermarkPosition;
  isGeneratingPdf: boolean;
}