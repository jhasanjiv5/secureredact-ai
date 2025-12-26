
import React from 'react';
import { ValidationResult } from '../types';
import { ShieldCheck, ShieldAlert, AlertTriangle, CheckCircle2, Search, Info } from 'lucide-react';

interface ValidationReportProps {
  result: ValidationResult;
}

export const ValidationReport: React.FC<ValidationReportProps> = ({ result }) => {
  const getScoreColor = (score: number) => {
    if (score >= 95) return 'text-emerald-600 bg-emerald-50 border-emerald-200';
    if (score >= 80) return 'text-amber-600 bg-amber-50 border-amber-200';
    return 'text-red-600 bg-red-50 border-red-200';
  };

  const scoreColor = getScoreColor(result.score);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className={`p-6 rounded-xl border flex items-center justify-between ${scoreColor}`}>
        <div className="flex items-center space-x-4">
          <div className="p-3 bg-white rounded-full shadow-sm">
            {result.score >= 95 ? (
              <ShieldCheck className="w-8 h-8 text-emerald-600" />
            ) : result.score >= 80 ? (
              <AlertTriangle className="w-8 h-8 text-amber-500" />
            ) : (
              <ShieldAlert className="w-8 h-8 text-red-600" />
            )}
          </div>
          <div>
            <h3 className="text-xl font-bold">Privacy Preservation Score</h3>
            <p className="text-sm opacity-80">{result.summary}</p>
          </div>
        </div>
        <div className="text-4xl font-black">{result.score}%</div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Recall (PII Detection)</div>
          <div className="text-2xl font-bold text-slate-800">{(result.accuracyMetrics.recall * 100).toFixed(1)}%</div>
          <div className="w-full bg-slate-200 rounded-full h-1.5 mt-2">
            <div className="bg-indigo-600 h-1.5 rounded-full" style={{ width: `${result.accuracyMetrics.recall * 100}%` }}></div>
          </div>
        </div>
        <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Precision (Formatting Integrity)</div>
          <div className="text-2xl font-bold text-slate-800">{(result.accuracyMetrics.precision * 100).toFixed(1)}%</div>
          <div className="w-full bg-slate-200 rounded-full h-1.5 mt-2">
            <div className="bg-indigo-600 h-1.5 rounded-full" style={{ width: `${result.accuracyMetrics.precision * 100}%` }}></div>
          </div>
        </div>
      </div>

      <div>
        <h4 className="flex items-center text-sm font-bold text-slate-900 mb-3">
          <Search className="w-4 h-4 mr-2 text-indigo-500" />
          Detected Vulnerabilities & Leaks ({result.leaks.length})
        </h4>
        
        {result.leaks.length === 0 ? (
          <div className="bg-emerald-50 border border-emerald-100 p-8 rounded-xl text-center">
            <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
            <p className="text-emerald-800 font-medium">No privacy leaks identified in the audit sample.</p>
            <p className="text-emerald-600 text-xs mt-1">Gemma-2-mini successfully redacted all PII.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {result.leaks.map((leak, idx) => (
              <div key={idx} className="bg-white border border-slate-200 p-4 rounded-lg shadow-sm flex items-start space-x-3">
                <div className={`mt-1 p-1 rounded ${leak.severity === 'Critical' ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-600'}`}>
                  <ShieldAlert className="w-4 h-4" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-slate-900">{leak.item}</span>
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase ${leak.severity === 'Critical' ? 'bg-red-600 text-white' : 'bg-amber-500 text-white'}`}>
                      {leak.severity}
                    </span>
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">Type: <span className="font-medium">{leak.type}</span></div>
                  <div className="text-xs text-slate-600 mt-2 italic bg-slate-50 p-2 rounded border border-slate-100">
                    "{leak.context}"
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-indigo-50 p-4 rounded-lg flex items-start space-x-3">
        <Info className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
        <p className="text-xs text-indigo-800 leading-relaxed">
          <strong>Auditor Note:</strong> This validation is performed by Gemini-3-Pro-Preview using a cross-document semantic comparison. While highly accurate, manual review of high-risk documents is always recommended.
        </p>
      </div>
    </div>
  );
};
