
import React, { useState } from 'react';
import { Copy, Check, Lock, Cloud, FileText, AlertCircle, ShieldCheck } from 'lucide-react';
import { ProcessingStatus, ValidationResult } from '../types';
import { ValidationReport } from './ValidationReport';

interface ComparisonViewProps {
  originalText: string;
  sanitizedText: string;
  finalOutput: string;
  status: string;
  validation?: ValidationResult;
}

export const ComparisonView: React.FC<ComparisonViewProps> = ({ originalText, sanitizedText, finalOutput, status, validation }) => {
  const [activeTab, setActiveTab] = useState<'original' | 'sanitized' | 'final' | 'audit'>('final');
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
    if (activeTab === 'audit') return;
    navigator.clipboard.writeText(getTextToDisplay());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const renderContent = (text: string) => {
    if (activeTab === 'audit') {
      if (validation) return <ValidationReport result={validation} />;
      return (
        <div className="flex flex-col items-center justify-center h-full text-slate-500 max-w-md mx-auto text-center p-8">
            <ShieldCheck className="w-10 h-10 text-slate-300 mb-4" />
            <h3 className="text-lg font-semibold text-slate-900 mb-2">Audit Report Pending</h3>
            <p>Once cloud analysis is complete, a full privacy validation report will be generated here.</p>
        </div>
      );
    }

    if (!text) {
        if (activeTab === 'sanitized' && !sanitizedText) return <div className="text-slate-400 italic flex h-full items-center justify-center">Waiting for local sanitization...</div>;
        
        if (activeTab === 'final' && !finalOutput) {
            if (status === ProcessingStatus.AWAITING_CLOUD_CONSENT) {
                return (
                    <div className="flex flex-col items-center justify-center h-full text-slate-500 max-w-md mx-auto text-center p-8">
                        <AlertCircle className="w-10 h-10 text-amber-500 mb-4" />
                        <h3 className="text-lg font-semibold text-slate-900 mb-2">Consent Required</h3>
                        <p>Please review the <span className="font-semibold text-indigo-600">Local Sanitize</span> tab to ensure all PII is properly redacted.</p>
                        <p className="mt-2">Once verified, click <span className="font-bold">"Analyze & Summarize"</span> to continue.</p>
                    </div>
                );
            }
            return <div className="text-slate-400 italic flex h-full items-center justify-center">Waiting for cloud processing...</div>;
        }
        return null;
    }

    if (activeTab === 'sanitized') {
        const parts = text.split(/(\[REDACTED_[A-Z]+(?:_[0-9]+)?\])/g);
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
        <div className="flex border-b border-slate-200 bg-slate-50 shrink-0">
            <button 
                onClick={() => setActiveTab('original')}
                className={`flex-1 py-3 px-4 text-xs font-bold uppercase tracking-wider flex items-center justify-center space-x-2 transition-colors ${activeTab === 'original' ? 'bg-white text-indigo-600 border-t-2 border-t-indigo-500' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'}`}
            >
                <FileText className="w-4 h-4" />
                <span className="hidden sm:inline">Source</span>
            </button>
            <button 
                onClick={() => setActiveTab('sanitized')}
                className={`flex-1 py-3 px-4 text-xs font-bold uppercase tracking-wider flex items-center justify-center space-x-2 transition-colors ${activeTab === 'sanitized' ? 'bg-white text-emerald-600 border-t-2 border-t-emerald-500' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'}`}
            >
                <Lock className="w-4 h-4" />
                <span className="hidden sm:inline">Sanitized</span>
            </button>
            <button 
                onClick={() => setActiveTab('final')}
                className={`flex-1 py-3 px-4 text-xs font-bold uppercase tracking-wider flex items-center justify-center space-x-2 transition-colors ${activeTab === 'final' ? 'bg-white text-blue-600 border-t-2 border-t-blue-500' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'}`}
            >
                <Cloud className="w-4 h-4" />
                <span className="hidden sm:inline">Analysis</span>
            </button>
            <button 
                onClick={() => setActiveTab('audit')}
                className={`flex-1 py-3 px-4 text-xs font-bold uppercase tracking-wider flex items-center justify-center space-x-2 transition-colors ${activeTab === 'audit' ? 'bg-white text-amber-600 border-t-2 border-t-amber-500' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'}`}
            >
                <ShieldCheck className="w-4 h-4" />
                <span className="hidden sm:inline">Privacy Audit</span>
            </button>
        </div>

        {/* Toolbar */}
        <div className="px-4 py-2 border-b border-slate-100 flex justify-between items-center bg-white min-h-[36px] shrink-0">
            <span className="text-[10px] text-slate-400 font-mono uppercase">
                {activeTab === 'audit' ? 'Privacy Validation Engine v1.0' : `${getTextToDisplay().length} Characters`}
            </span>
            {activeTab !== 'audit' && (
                <button 
                    onClick={handleCopy}
                    className="text-slate-400 hover:text-indigo-600 transition-colors p-1 rounded hover:bg-slate-50"
                    title="Copy current tab"
                >
                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </button>
            )}
        </div>

        {/* Content Area - Fixed vertical scrolling behavior */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden p-6 bg-white text-sm leading-relaxed font-mono text-slate-800 custom-scrollbar">
            {renderContent(getTextToDisplay())}
        </div>
    </div>
  );
};
