
import React, { useState, useEffect } from 'react';
import { Shield, Sparkles, ArrowRight, Check, Info, Globe, AlertCircle, MessageSquare, Bot, AlertTriangle, ExternalLink, Settings, RefreshCw, Server } from 'lucide-react';
import { Button } from './Button';
import { ScreeningResult, JurisdictionConfig } from '../types';
import { JURISDICTIONS } from './ContextSelector';

interface PrivacyScreeningProps {
  fileName: string;
  result: ScreeningResult | null;
  onConfirm: (context: string, jurisdiction: JurisdictionConfig) => void;
  onCancel: () => void;
  onRetry: () => void;
  isLoading: boolean;
  isConnectionError?: boolean;
}

export const PrivacyScreening: React.FC<PrivacyScreeningProps> = ({ 
  fileName, 
  result, 
  onConfirm, 
  onCancel,
  onRetry,
  isLoading,
  isConnectionError 
}) => {
  const [selectedJurisdiction, setSelectedJurisdiction] = useState<JurisdictionConfig>(JURISDICTIONS[0]);
  const [customContext, setCustomContext] = useState('');
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (result) {
      const jur = JURISDICTIONS.find(j => j.id === result.suggestedJurisdictionId) || JURISDICTIONS[0];
      setSelectedJurisdiction(jur);
      setCustomContext(result.detectedContext);
      
      const timer = setTimeout(() => setStep(1), 500);
      const timer2 = setTimeout(() => setStep(2), 1500);
      return () => { clearTimeout(timer); clearTimeout(timer2); };
    }
  }, [result]);

  if (isLoading) {
    return (
      <div className="w-full max-w-2xl mx-auto flex flex-col items-center justify-center p-12 bg-white rounded-2xl border border-slate-200 shadow-xl animate-pulse">
        <div className="p-4 bg-indigo-100 rounded-full mb-6 text-center">
          <Shield className="w-10 h-10 text-indigo-600 animate-bounce mx-auto" />
          <div className="mt-2 text-[10px] font-bold text-indigo-600 uppercase tracking-widest">Local Mode Only</div>
        </div>
        <h3 className="text-xl font-bold text-slate-800 mb-2">Analyzing locally...</h3>
        <p className="text-slate-500 text-center max-w-xs text-sm">Your data stays on your machine. I'm using your local LLM to perform a zero-trust privacy screen.</p>
      </div>
    );
  }

  if (isConnectionError) {
    return (
        <div className="w-full max-w-3xl mx-auto flex flex-col bg-white rounded-2xl shadow-2xl border border-red-200 overflow-hidden">
            <div className="bg-red-50 p-6 border-b border-red-100 flex items-center space-x-4">
                <div className="p-3 bg-red-100 rounded-xl">
                    <Server className="w-8 h-8 text-red-600" />
                </div>
                <div>
                    <h3 className="text-xl font-bold text-red-900">Local LLM Required for Screening</h3>
                    <p className="text-sm text-red-700">Privacy screening is restricted to local execution for maximum security.</p>
                </div>
            </div>
            
            <div className="p-8 space-y-6">
                <div className="space-y-4">
                    <h4 className="font-bold text-slate-900 flex items-center">
                        <Settings className="w-4 h-4 mr-2" />
                        How to fix the connection:
                    </h4>
                    <ul className="space-y-3 text-sm text-slate-600">
                        <li className="flex items-start space-x-2">
                            <span className="w-5 h-5 bg-slate-100 rounded flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">1</span>
                            <span>Open your terminal and ensure <strong>Ollama</strong> is installed and running.</span>
                        </li>
                        <li className="flex items-start space-x-2">
                            <span className="w-5 h-5 bg-slate-100 rounded flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">2</span>
                            <span>The browser requires <strong>CORS</strong> permission to talk to Ollama.</span>
                        </li>
                    </ul>
                    <div className="bg-slate-900 p-4 rounded-lg font-mono text-[11px] text-slate-400">
                        # Run with browser access enabled:<br/>
                        $env:OLLAMA_ORIGINS="*"; ollama serve
                    </div>
                </div>

                <div className="pt-6 border-t border-slate-100 flex flex-col sm:flex-row gap-4">
                    <Button variant="secondary" onClick={onCancel} className="flex-1">Cancel</Button>
                    <Button variant="primary" onClick={onRetry} className="flex-1 bg-indigo-600">
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Try Again
                    </Button>
                </div>
                <p className="text-center text-[10px] text-slate-400 italic">Cloud-based screening is disabled to prevent accidental PII leakage before redaction.</p>
            </div>
        </div>
    );
  }

  const jur = selectedJurisdiction;

  return (
    <div className="w-full max-w-3xl mx-auto flex flex-col bg-slate-900 rounded-2xl shadow-2xl border border-slate-800 overflow-hidden min-h-[500px]">
      <div className="bg-slate-800 p-4 border-b border-slate-700 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="relative">
            <div className="w-10 h-10 bg-indigo-600 rounded-full flex items-center justify-center">
              <Bot className="w-6 h-6 text-white" />
            </div>
            <div className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-slate-800 rounded-full"></div>
          </div>
          <div>
            <h3 className="text-white font-bold text-sm leading-none mb-1">Redacta</h3>
            <span className="text-emerald-400 text-[10px] font-bold uppercase tracking-widest">Local Privacy Companion</span>
          </div>
        </div>
        <div className="flex items-center space-x-2">
           <div className="px-2 py-0.5 rounded bg-slate-700 text-slate-400 text-[9px] font-bold uppercase">No Data Uploaded</div>
           <div className="text-slate-400 text-xs font-mono">{fileName}</div>
        </div>
      </div>

      <div className="flex-1 p-6 space-y-6 overflow-y-auto">
        <div className={`flex items-start space-x-3 transition-all duration-500 transform ${step >= 1 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
           <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center shrink-0">
             <MessageSquare className="w-4 h-4 text-indigo-400" />
           </div>
           <div className="bg-slate-800 text-slate-200 p-4 rounded-2xl rounded-tl-none max-w-[85%] border border-slate-700 shadow-sm">
             <p className="text-sm">Hi! I've scanned your document <strong>locally</strong>. Here are the potential PII markers I found:</p>
             <div className="mt-3 bg-slate-900/50 p-3 rounded-lg border border-slate-700/50">
               <div className="text-[10px] font-bold text-slate-500 uppercase mb-2">Findings (Local Analysis)</div>
               <div className="flex flex-wrap gap-2">
                 {result?.findings.map((f, i) => (
                   <span key={i} className="px-2 py-0.5 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded text-[10px] font-bold">
                     {f}
                   </span>
                 ))}
               </div>
             </div>
           </div>
        </div>

        <div className={`flex items-start space-x-3 transition-all duration-500 delay-300 transform ${step >= 2 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
           <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center shrink-0">
             <Globe className="w-4 h-4 text-indigo-400" />
           </div>
           <div className="bg-slate-800 text-slate-200 p-4 rounded-2xl rounded-tl-none max-w-[85%] border border-slate-700 shadow-sm">
             <p className="text-sm leading-relaxed">{result?.explanation}</p>
             
             <div className="mt-4 p-4 bg-indigo-600/10 border border-indigo-500/30 rounded-xl">
               <div className="flex items-center space-x-2 text-indigo-400 mb-2">
                 <Shield className="w-4 h-4" />
                 <span className="text-xs font-bold uppercase">Privacy Protection Profile</span>
               </div>
               <div className="text-white font-bold">{jur.name}</div>
               <div className="text-[10px] text-slate-400 font-medium mt-1 uppercase">{jur.law}</div>
             </div>
           </div>
        </div>

        <div className={`transition-all duration-700 delay-700 transform ${step >= 2 ? 'opacity-100' : 'opacity-0'}`}>
          <div className="flex items-center justify-center py-4">
            <div className="h-px bg-slate-800 flex-1"></div>
            <span className="px-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Adjust Settings</span>
            <div className="h-px bg-slate-800 flex-1"></div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-2 ml-1">Jurisdiction</label>
              <select 
                value={selectedJurisdiction.id}
                onChange={(e) => setSelectedJurisdiction(JURISDICTIONS.find(j => j.id === e.target.value) || JURISDICTIONS[0])}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-sm text-white focus:ring-2 focus:ring-indigo-500 outline-none"
              >
                {JURISDICTIONS.map(j => <option key={j.id} value={j.id}>{j.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-2 ml-1">Context</label>
              <input 
                type="text" 
                value={customContext}
                onChange={(e) => setCustomContext(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-sm text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                placeholder="e.g. Sales Invoice"
              />
            </div>
          </div>
        </div>
      </div>

      <div className={`p-6 bg-slate-800/50 border-t border-slate-700 flex justify-between items-center transition-all duration-500 delay-1000 ${step >= 2 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
        <button onClick={onCancel} className="text-slate-400 hover:text-white text-xs font-bold uppercase transition-colors">Abort</button>
        <div className="flex space-x-3">
          <Button variant="primary" onClick={() => onConfirm(customContext, jur)} className="px-8 bg-indigo-500 hover:bg-indigo-600 shadow-lg shadow-indigo-500/20">
            Apply Protections
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </div>
    </div>
  );
};
