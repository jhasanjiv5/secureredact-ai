
import React, { useState } from 'react';
import { Copy, Check, Lock, Cloud, FileText } from 'lucide-react';

interface ComparisonViewProps {
  originalText: string;
  sanitizedText: string;
  finalOutput: string;
  status: string;
}

export const ComparisonView: React.FC<ComparisonViewProps> = ({ originalText, sanitizedText, finalOutput, status }) => {
  const [activeTab, setActiveTab] = useState<'original' | 'sanitized' | 'final'>('final');
  const [copied, setCopied] = useState(false);

  const getTextToDisplay = () => {
    switch(activeTab) {
      case 'original': return originalText;
      case 'sanitized': return sanitizedText;
      case 'final': return finalOutput;
      default: return '';
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(getTextToDisplay());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Function to highlight redacted parts
  const renderContent = (text: string) => {
    if (!text) {
        if (activeTab === 'sanitized' && !sanitizedText) return <div className="text-slate-400 italic flex h-full items-center justify-center">Waiting for local sanitization...</div>;
        if (activeTab === 'final' && !finalOutput) return <div className="text-slate-400 italic flex h-full items-center justify-center">Waiting for cloud processing...</div>;
        return null;
    }

    if (activeTab === 'sanitized') {
        const parts = text.split(/(\[REDACTED_[A-Z]+\])/g);
        return parts.map((part, index) => {
        if (part.startsWith('[REDACTED_')) {
            return (
            <span key={index} className="bg-red-100 text-red-700 px-1 rounded text-xs font-mono font-bold select-none mx-0.5 border border-red-200">
                {part}
            </span>
            );
        }
        return <span key={index}>{part}</span>;
        });
    }

    return <span className="whitespace-pre-wrap">{text}</span>;
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Tabs */}
        <div className="flex border-b border-slate-200 bg-slate-50">
            <button 
                onClick={() => setActiveTab('original')}
                className={`flex-1 py-3 px-4 text-sm font-medium flex items-center justify-center space-x-2 transition-colors ${activeTab === 'original' ? 'bg-white text-slate-900 border-t-2 border-t-indigo-500' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'}`}
            >
                <FileText className="w-4 h-4" />
                <span>Original Source</span>
            </button>
            <button 
                onClick={() => setActiveTab('sanitized')}
                className={`flex-1 py-3 px-4 text-sm font-medium flex items-center justify-center space-x-2 transition-colors ${activeTab === 'sanitized' ? 'bg-white text-slate-900 border-t-2 border-t-green-500' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'}`}
            >
                <Lock className="w-4 h-4" />
                <span>Step 1: Sanitize</span>
            </button>
            <button 
                onClick={() => setActiveTab('final')}
                className={`flex-1 py-3 px-4 text-sm font-medium flex items-center justify-center space-x-2 transition-colors ${activeTab === 'final' ? 'bg-white text-slate-900 border-t-2 border-t-blue-500' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'}`}
            >
                <Cloud className="w-4 h-4" />
                <span>Step 2:  Analysis</span>
            </button>
        </div>

        {/* Toolbar */}
        <div className="px-4 py-2 border-b border-slate-100 flex justify-between items-center bg-white">
            <span className="text-xs text-slate-400 font-mono">
                {getTextToDisplay().length} chars
            </span>
            <button 
                onClick={handleCopy}
                className="text-slate-400 hover:text-indigo-600 transition-colors p-1 rounded hover:bg-slate-50"
                title="Copy current tab"
            >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 p-6 overflow-auto bg-white text-sm leading-relaxed font-mono text-slate-800">
            {renderContent(getTextToDisplay())}
        </div>
    </div>
  );
};
