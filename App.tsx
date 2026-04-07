import React, { useState } from 'react';
import { Download, Settings2, Sparkles, Layers, Layout, Loader2, Grip, Wand2 } from 'lucide-react';
import { Dropzone } from './components/Dropzone';
import { SlidePreview } from './components/SlidePreview';
import { AppState, ProcessedPage, WatermarkPosition } from './types';
import { renderPdfPagesToImages, generateWatermarkedPdf } from './services/pdfService';
import { analyzeSlideContrast } from './services/geminiService';
import clsx from 'clsx';

function App() {
  const [state, setState] = useState<AppState>({
    file: null,
    pages: [],
    watermarkText: "CONFIDENTIAL",
    isProcessing: false,
    globalPosition: WatermarkPosition.DIAGONAL,
    isGeneratingPdf: false,
  });

  const [analyzeProgress, setAnalyzeProgress] = useState({ current: 0, total: 0 });
  
  const handleFileSelect = async (file: File) => {
    setState(prev => ({ ...prev, file, isProcessing: true, pages: [] }));
    
    try {
      const images = await renderPdfPagesToImages(file);
      const initialPages: ProcessedPage[] = images.map((img, idx) => ({
        pageIndex: idx,
        originalImage: img,
        status: 'pending'
      }));

      setState(prev => ({ 
        ...prev, 
        pages: initialPages,
        isProcessing: false 
      }));

    } catch (error) {
      console.error("Error loading PDF", error);
      alert("Failed to load PDF. Please try a valid PDF file.");
      setState(prev => ({ ...prev, isProcessing: false, file: null }));
    }
  };

  const handleOptimize = async () => {
    const pagesToAnalyze = state.pages; 
    startAnalysis(pagesToAnalyze);
  };

  const startAnalysis = async (pages: ProcessedPage[]) => {
    setAnalyzeProgress({ current: 0, total: pages.length });
    
    // Parallel processing with batching to avoid browser/API exhaustion
    // We do batches of 5
    const BATCH_SIZE = 5;
    
    for (let i = 0; i < pages.length; i += BATCH_SIZE) {
        const batch = pages.slice(i, i + BATCH_SIZE);
        
        // Mark batch as analyzing in UI
        setState(prev => {
            const updated = [...prev.pages];
            batch.forEach((_, idx) => {
                const globalIndex = i + idx;
                if (updated[globalIndex]) updated[globalIndex].status = 'analyzing';
            });
            return { ...prev, pages: updated };
        });

        // Execute parallel requests for the batch
        await Promise.all(batch.map(async (page, batchIdx) => {
            const globalIndex = i + batchIdx;
            try {
                // Pass the current watermark text to the analysis service
                const analysis = await analyzeSlideContrast(page.originalImage, state.watermarkText);
                setState(prev => {
                    const updated = [...prev.pages];
                    if (updated[globalIndex]) {
                        updated[globalIndex].status = 'complete';
                        updated[globalIndex].analysis = analysis;
                    }
                    return { ...prev, pages: updated };
                });
            } catch (error) {
                console.error("Error analyzing page", globalIndex);
                setState(prev => {
                    const updated = [...prev.pages];
                    if (updated[globalIndex]) updated[globalIndex].status = 'error';
                    return { ...prev, pages: updated };
                });
            } finally {
                setAnalyzeProgress(prev => ({ ...prev, current: Math.min(prev.current + 1, prev.total) }));
            }
        }));
    }
  };

  const handleDownload = async () => {
    if (!state.file) return;

    setState(prev => ({ ...prev, isGeneratingPdf: true }));
    
    try {
      const pdfBytes = await generateWatermarkedPdf(
        state.file, 
        state.watermarkText, 
        state.pages, 
        state.globalPosition
      );
      
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `watermarked-${state.file.name}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (e) {
      console.error(e);
      alert("Failed to generate PDF");
    } finally {
      setState(prev => ({ ...prev, isGeneratingPdf: false }));
    }
  };

  return (
    <div className="min-h-screen bg-[#09090b] text-slate-200 selection:bg-indigo-500/30">
      
      {/* Header */}
      <header className="border-b border-gray-800 bg-gray-900/50 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-tr from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <Sparkles className="text-white" size={18} />
            </div>
            <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
              SmartMark AI
            </h1>
            <span className="px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 text-[10px] font-bold tracking-wider border border-indigo-500/20">
              PRO
            </span>
          </div>
          <div className="flex items-center space-x-4">
             {state.file && (
                <button 
                  onClick={() => setState(prev => ({...prev, file: null, pages: []}))}
                  className="text-sm text-gray-400 hover:text-white transition-colors"
                >
                  Start Over
                </button>
             )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {!state.file ? (
          // Empty State
          <div className="flex flex-col items-center justify-center min-h-[60vh] animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="text-center mb-10 max-w-xl">
              <h2 className="text-4xl font-bold text-white mb-4 tracking-tight">
                Intelligent Watermarking
              </h2>
              <p className="text-gray-400 text-lg leading-relaxed">
                Analyzes your slides locally and applies context-aware watermarks that are visible yet unobtrusive.
              </p>
            </div>
            <Dropzone onFileSelect={handleFileSelect} />
            
            {/* Feature Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-16 w-full max-w-4xl text-sm">
                <div className="p-4 rounded-xl bg-gray-800/30 border border-gray-700/50">
                    <div className="w-8 h-8 rounded-full bg-indigo-500/10 flex items-center justify-center text-indigo-400 mb-3"><Sparkles size={16} /></div>
                    <h3 className="font-semibold text-white mb-1">Contrast Adaptive</h3>
                    <p className="text-gray-500">Automatically switches between light and dark watermarks based on slide background.</p>
                </div>
                <div className="p-4 rounded-xl bg-gray-800/30 border border-gray-700/50">
                    <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-400 mb-3"><Layout size={16} /></div>
                    <h3 className="font-semibold text-white mb-1">Smart Placement</h3>
                    <p className="text-gray-500">Detects cluttered areas and suggests optimal opacity to maintain readability.</p>
                </div>
                <div className="p-4 rounded-xl bg-gray-800/30 border border-gray-700/50">
                    <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-400 mb-3"><Layers size={16} /></div>
                    <h3 className="font-semibold text-white mb-1">Batch Processing</h3>
                    <p className="text-gray-500">Process entire PDFs instantly. Each page is analyzed individually.</p>
                </div>
            </div>
          </div>
        ) : (
          // Editor State
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in fade-in duration-500">
            {/* Sidebar Controls */}
            <div className="lg:col-span-1 space-y-6">
              
              <div className="bg-gray-800/40 backdrop-blur-sm border border-gray-700 rounded-2xl p-6 sticky top-24">
                <div className="flex items-center space-x-2 mb-6">
                  <Settings2 className="text-indigo-400" size={20} />
                  <h3 className="text-lg font-semibold text-white">Configuration</h3>
                </div>

                <div className="space-y-6">
                  <div>
                    <label className="block text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">
                      Watermark Text
                    </label>
                    <input
                      type="text"
                      value={state.watermarkText}
                      onChange={(e) => setState(prev => ({ ...prev, watermarkText: e.target.value }))}
                      className="w-full bg-gray-900/50 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all placeholder-gray-600"
                      placeholder="e.g. DRAFT DO NOT SHARE"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">
                      Position
                    </label>
                    <div className="grid grid-cols-4 gap-2">
                       {/* Position Grid */}
                      {[
                        { id: WatermarkPosition.TOP_LEFT, icon: '⌜' },
                        { id: WatermarkPosition.CENTER, icon: '+' },
                        { id: WatermarkPosition.TOP_RIGHT, icon: '⌝' },
                        { id: WatermarkPosition.BOTTOM_LEFT, icon: '⌞' },
                        { id: WatermarkPosition.DIAGONAL, icon: '/' },
                        { id: WatermarkPosition.BOTTOM_RIGHT, icon: '⌟' },
                      ].map((pos) => (
                        <button
                          key={pos.id}
                          onClick={() => setState(prev => ({ ...prev, globalPosition: pos.id }))}
                          className={clsx(
                            "h-10 rounded-lg border flex items-center justify-center text-lg font-mono transition-all",
                            state.globalPosition === pos.id 
                              ? "bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-900/20" 
                              : "bg-gray-800 border-gray-700 text-gray-400 hover:bg-gray-700"
                          )}
                          title={pos.id}
                        >
                          {pos.icon}
                        </button>
                      ))}
                      
                      {/* Tiled Button (Spans 2 cols) */}
                      <button
                          onClick={() => setState(prev => ({ ...prev, globalPosition: WatermarkPosition.TILED }))}
                          className={clsx(
                            "col-span-2 h-10 rounded-lg border flex items-center justify-center space-x-2 text-sm font-medium transition-all",
                            state.globalPosition === WatermarkPosition.TILED 
                              ? "bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-900/20" 
                              : "bg-gray-800 border-gray-700 text-gray-400 hover:bg-gray-700"
                          )}
                          title="Tiled Array"
                        >
                          <Grip size={16} />
                          <span>Tiled Array</span>
                        </button>
                    </div>
                  </div>

                  {/* Optimize Button */}
                  <div className="pt-2">
                     <button
                        onClick={handleOptimize}
                        disabled={analyzeProgress.current > 0 && analyzeProgress.current < analyzeProgress.total}
                        className="w-full h-12 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl font-bold flex items-center justify-center space-x-2 shadow-lg shadow-emerald-900/30 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                     >
                        {analyzeProgress.current > 0 && analyzeProgress.current < analyzeProgress.total ? (
                            <><Loader2 className="animate-spin" size={18} /><span>Optimizing...</span></>
                        ) : (
                            <><Wand2 size={18} /><span>Optimize with AI</span></>
                        )}
                     </button>
                     <p className="text-[10px] text-gray-500 mt-2 text-center">
                        Analyzes slide content and adjusts spacing/color for "{state.watermarkText}".
                     </p>
                  </div>

                  <div className="pt-6 border-t border-gray-700">
                    <button
                      onClick={handleDownload}
                      disabled={state.isGeneratingPdf}
                      className="w-full bg-white text-gray-900 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed h-12 rounded-xl font-semibold flex items-center justify-center space-x-2 transition-all shadow-xl shadow-white/5 active:scale-95"
                    >
                      {state.isGeneratingPdf ? (
                        <Loader2 className="animate-spin" size={20} />
                      ) : (
                        <Download size={20} />
                      )}
                      <span>{state.isGeneratingPdf ? 'Processing...' : `Export PDF`}</span>
                    </button>
                    <p className="text-xs text-center text-gray-500 mt-3">
                      Generates a new standard PDF file.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Main Preview Area */}
            <div className="lg:col-span-2 space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-white flex items-center">
                  Slides 
                  <span className="ml-3 px-2 py-0.5 rounded-full bg-gray-800 text-xs text-gray-400 border border-gray-700">
                    {state.pages.length} Pages
                  </span>
                </h3>
                {analyzeProgress.current > 0 && analyzeProgress.current < analyzeProgress.total && (
                  <div className="flex items-center space-x-2 text-xs text-indigo-400">
                    <Loader2 size={12} className="animate-spin" />
                    <span>Analyzing {analyzeProgress.current}/{analyzeProgress.total}</span>
                  </div>
                )}
              </div>

              {state.isProcessing ? (
                <div className="flex flex-col items-center justify-center h-64 space-y-4">
                  <Loader2 className="animate-spin text-indigo-500" size={48} />
                  <p className="text-gray-400">Rendering slides...</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {state.pages.map((page) => (
                    <SlidePreview 
                      key={page.pageIndex}
                      page={page}
                      watermarkText={state.watermarkText}
                      position={state.globalPosition}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;