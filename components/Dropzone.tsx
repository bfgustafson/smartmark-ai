import React, { useRef, useState } from 'react';
import { Upload, FileType, AlertCircle } from 'lucide-react';
import clsx from 'clsx';

interface DropzoneProps {
  onFileSelect: (file: File) => void;
}

export const Dropzone: React.FC<DropzoneProps> = ({ onFileSelect }) => {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      validateAndPass(e.dataTransfer.files[0]);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      validateAndPass(e.target.files[0]);
    }
  };

  const validateAndPass = (file: File) => {
    // Basic check - we primarily support PDF for the full feature set
    if (file.type === 'application/pdf') {
      onFileSelect(file);
    } else {
      alert("Currently, only PDF files are fully supported for browser-based processing. Please convert your PPT to PDF first.");
    }
  };

  return (
    <div
      className={clsx(
        "relative group cursor-pointer w-full max-w-2xl mx-auto h-64 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center transition-all duration-300",
        isDragging ? "border-indigo-500 bg-indigo-500/10 scale-[1.02]" : "border-gray-700 bg-gray-800/50 hover:bg-gray-800 hover:border-gray-500"
      )}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
    >
      <input
        type="file"
        ref={inputRef}
        className="hidden"
        accept=".pdf"
        onChange={handleFileInput}
      />
      
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-purple-500/5 rounded-2xl pointer-events-none" />
      
      <div className="z-10 flex flex-col items-center space-y-4 text-center p-6">
        <div className={clsx(
          "p-4 rounded-full transition-all duration-300",
          isDragging ? "bg-indigo-500 text-white shadow-lg shadow-indigo-500/50" : "bg-gray-700 text-gray-400 group-hover:bg-gray-600 group-hover:text-white"
        )}>
          <Upload size={32} />
        </div>
        <div>
          <h3 className="text-xl font-semibold text-white mb-2">
            Upload your PDF
          </h3>
          <p className="text-gray-400 text-sm max-w-sm">
            Drag and drop your presentation or click to browse. 
            We'll analyze each page to apply a contrast-perfect watermark.
          </p>
        </div>
        <div className="flex items-center space-x-2 text-xs text-gray-500 bg-gray-800/80 px-3 py-1.5 rounded-full border border-gray-700">
            <FileType size={14} />
            <span>Supports PDF (PPTX via conversion)</span>
        </div>
      </div>
    </div>
  );
};
