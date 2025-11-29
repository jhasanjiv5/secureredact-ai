import React, { useRef, useState } from 'react';
import { Upload, FileText, AlertCircle } from 'lucide-react';

interface UploadZoneProps {
  onFileSelect: (file: File) => void;
  disabled?: boolean;
}

export const UploadZone: React.FC<UploadZoneProps> = ({ onFileSelect, disabled }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled) setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (disabled) return;

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      validateAndPassFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      validateAndPassFile(e.target.files[0]);
    }
  };

  const validateAndPassFile = (file: File) => {
    setError(null);
    const validTypes = ['text/plain', 'application/json', 'text/markdown', 'text/csv', 'application/pdf'];
    
    // Allow standard text types + PDF
    const isText = file.type.startsWith('text/') || 
                   validTypes.includes(file.type) || 
                   file.name.endsWith('.md') || 
                   file.name.endsWith('.txt') ||
                   file.name.endsWith('.pdf');

    if (!isText) {
      setError("Please upload a valid file (.txt, .md, .json, .csv, .pdf)");
      return;
    }
    
    if (file.size > 5 * 1024 * 1024) { // Increased to 5MB for PDFs
        setError("File is too large. Please upload a file smaller than 5MB.");
        return;
    }

    onFileSelect(file);
  };

  return (
    <div className="w-full max-w-2xl mx-auto mb-8">
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !disabled && fileInputRef.current?.click()}
        className={`
          relative border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-all duration-200
          ${isDragging 
            ? 'border-indigo-500 bg-indigo-50 ring-4 ring-indigo-100' 
            : 'border-slate-300 hover:border-indigo-400 hover:bg-slate-50'
          }
          ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
        `}
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileInput}
          className="hidden"
          accept=".txt,.md,.json,.csv,.pdf"
          disabled={disabled}
        />
        
        <div className="flex flex-col items-center justify-center space-y-4">
          <div className={`p-4 rounded-full ${isDragging ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-400'}`}>
            <Upload className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-slate-900">
              Click to upload or drag and drop
            </h3>
            <p className="text-sm text-slate-500 mt-1">
              Supports .txt, .md, .json, .csv, .pdf (Max 5MB)
            </p>
          </div>
        </div>
      </div>

      {error && (
        <div className="flex items-center mt-4 p-4 bg-red-50 border border-red-100 rounded-lg text-red-700 text-sm">
          <AlertCircle className="w-4 h-4 mr-2 flex-shrink-0" />
          {error}
        </div>
      )}
    </div>
  );
};