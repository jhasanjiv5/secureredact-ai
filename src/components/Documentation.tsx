
import React from 'react';
import { X, Shield, Lock, Cloud, FileText, CheckCircle, ArrowRight, Table, Server, Cpu, Activity, Search, ShieldCheck, Fingerprint, MessageSquare, Bot } from 'lucide-react';
import { Button } from './Button';

interface DocumentationProps {
  onClose: () => void;
}

export const Documentation: React.FC<DocumentationProps> = ({ onClose }) => {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col border border-slate-200">
        
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-indigo-600 rounded-lg shadow-lg shadow-indigo-200">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">SecureRedact Protocol</h2>
              <p className="text-xs text-slate-500 font-semibold uppercase tracking-widest">Interactive Data Anonymization Framework</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors group">
            <X className="w-5 h-5 text-slate-400 group-hover:text-slate-600" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-8 space-y-12">
          
          {/* Phase Roadmap */}
          <section className="relative">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-10">
                <div className="flex-1 text-center md:text-left">
                    <h3 className="text-2xl font-black text-slate-900 mb-2">Multi-Stage Trust Architecture</h3>
                    <p className="text-slate-500 max-w-xl">A transparent process where you control exactly how your sensitive data is handled.</p>
                </div>
                <div className="flex space-x-2">
                    <div className="px-3 py-1 bg-emerald-100 text-emerald-700 text-[10px] font-bold rounded-full uppercase">Zero-Knowledge Screening</div>
                    <div className="px-3 py-1 bg-blue-100 text-blue-700 text-[10px] font-bold rounded-full uppercase">Local Redaction</div>
                    <div className="px-3 py-1 bg-amber-100 text-amber-700 text-[10px] font-bold rounded-full uppercase">Cloud Audit</div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Step 1 */}
              <div className="relative p-6 rounded-2xl bg-white border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                <div className="absolute -top-4 -left-4 w-10 h-10 bg-indigo-600 text-white rounded-full flex items-center justify-center font-bold shadow-lg">1</div>
                <div className="mb-4 p-3 bg-indigo-50 rounded-xl w-fit">
                    <Bot className="w-6 h-6 text-indigo-600" />
                </div>
                <h4 className="font-bold text-slate-900 mb-2">Interactive Screening</h4>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Upon upload, our <strong>Privacy Companion</strong> performs a local scan. It identifies document type and potential PII patterns (Names, SSNs, etc.) without any data leaving your browser.
                </p>
              </div>

              {/* Step 2 */}
              <div className="relative p-6 rounded-2xl bg-white border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                <div className="absolute -top-4 -left-4 w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold shadow-lg">2</div>
                <div className="mb-4 p-3 bg-blue-50 rounded-xl w-fit">
                    <Lock className="w-6 h-6 text-blue-600" />
                </div>
                <h4 className="font-bold text-slate-900 mb-2">Local Redaction</h4>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Using <strong>Gemma-2-mini</strong> via Ollama, the document is sanitized locally. Real data is replaced with deterministic tags like <code>[REDACTED_NAME_1]</code>.
                </p>
              </div>

              {/* Step 3 */}
              <div className="relative p-6 rounded-2xl bg-white border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                <div className="absolute -top-4 -left-4 w-10 h-10 bg-amber-600 text-white rounded-full flex items-center justify-center font-bold shadow-lg">3</div>
                <div className="mb-4 p-3 bg-amber-50 rounded-xl w-fit">
                    <Cloud className="w-6 h-6 text-amber-600" />
                </div>
                <h4 className="font-bold text-slate-900 mb-2">Hybrid Verification</h4>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Only after local redaction is complete can you choose to send the <strong>anonymized</strong> content to <strong>Gemini-3-Pro</strong> for professional summarization and a privacy leak audit.
                </p>
              </div>
            </div>
          </section>

          {/* Interactive Companion Logic */}
          <section className="bg-slate-900 text-white -mx-8 p-12 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full -mr-32 -mt-32 blur-3xl"></div>
            <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                <div>
                    <div className="inline-flex items-center space-x-2 px-3 py-1 bg-indigo-500/20 text-indigo-300 rounded-full text-[10px] font-bold uppercase mb-4 border border-indigo-500/30">
                        <MessageSquare className="w-3 h-3" />
                        <span>Conversational Intelligence</span>
                    </div>
                    <h3 className="text-3xl font-bold mb-6">Zero-Knowledge Screening</h3>
                    <div className="space-y-4">
                        <div className="flex items-start space-x-4">
                            <div className="p-2 bg-indigo-500/20 rounded-lg"><CheckCircle className="w-5 h-5 text-indigo-400" /></div>
                            <p className="text-slate-300 text-sm">Automated detection of global privacy jurisdictions (GDPR, HIPAA, DPDP).</p>
                        </div>
                        <div className="flex items-start space-x-4">
                            <div className="p-2 bg-indigo-500/20 rounded-lg"><CheckCircle className="w-5 h-5 text-indigo-400" /></div>
                            <p className="text-slate-300 text-sm">Context-aware redaction: the AI understands the difference between a name in a header vs a name in body text.</p>
                        </div>
                        <div className="flex items-start space-x-4">
                            <div className="p-2 bg-indigo-500/20 rounded-lg"><CheckCircle className="w-5 h-5 text-indigo-400" /></div>
                            <p className="text-slate-300 text-sm">User-in-the-loop: modify context and jurisdiction suggestions before a single byte is processed.</p>
                        </div>
                    </div>
                </div>
                <div className="bg-slate-800/50 p-6 rounded-2xl border border-slate-700 backdrop-blur-sm">
                    <h4 className="text-indigo-400 font-mono text-xs mb-4 uppercase font-bold tracking-widest">Processing Lifecycle</h4>
                    <div className="space-y-3 font-mono text-[11px] text-slate-400">
                        <div className="flex items-center space-x-2">
                            <span className="text-indigo-500 font-bold">1.</span>
                            <span>INITIAL_SCAN(local_buffer)</span>
                        </div>
                        <div className="flex items-center space-x-2 ml-4">
                            <span className="text-indigo-400">→</span>
                            <span>COMPANION_CHAT(jurisdiction_match)</span>
                        </div>
                        <div className="flex items-center space-x-2 ml-4">
                            <span className="text-emerald-500 font-bold">2.</span>
                            <span>OLLAMA_REDACTION(deterministic_masking)</span>
                        </div>
                        <div className="flex items-center space-x-2 ml-4">
                            <span className="text-amber-500 font-bold">3.</span>
                            <span>CLOUD_CONSENT_CHECK()</span>
                        </div>
                        <div className="flex items-center space-x-2 ml-8 border-l border-slate-700 pl-4 py-2">
                            <span className="text-blue-500">→</span>
                            <span>GEMINI_AUDIT(anonymized_view)</span>
                        </div>
                    </div>
                </div>
            </div>
          </section>

          {/* Compliance & Export */}
          <section>
            <div className="flex items-center space-x-3 mb-8">
              <div className="p-2 bg-amber-50 rounded-lg border border-amber-100">
                <ShieldCheck className="w-5 h-5 text-amber-600" />
              </div>
              <h3 className="font-bold text-xl text-slate-900">Governance & Auditability</h3>
            </div>
            
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                <div className="grid grid-cols-1 md:grid-cols-2">
                    <div className="p-8 border-b md:border-b-0 md:border-r border-slate-100">
                        <h4 className="font-bold text-slate-800 mb-4 flex items-center">
                            <Fingerprint className="w-4 h-4 mr-2 text-indigo-500" />
                            Secure Export Options
                        </h4>
                        <p className="text-sm text-slate-600 leading-relaxed mb-6">
                            Redacta provides two distinct artifacts for every session:
                        </p>
                        <ul className="space-y-4 text-sm">
                            <li className="flex items-start">
                                <div className="font-bold text-indigo-600 mr-2 min-w-[100px]">CLEAN DATA:</div>
                                <span className="text-slate-500">The sanitized document, safe for distribution or storage in low-security environments.</span>
                            </li>
                            <li className="flex items-start">
                                <div className="font-bold text-indigo-600 mr-2 min-w-[100px]">AUDIT LOG:</div>
                                <span className="text-slate-500">A local JSON key that allows you to "reverse" the redaction locally, restoring original values when needed.</span>
                            </li>
                        </ul>
                    </div>
                    <div className="p-8 bg-slate-50">
                        <h4 className="font-bold text-slate-800 mb-4">Regulatory Compliance</h4>
                        <p className="text-sm text-slate-600 mb-6">
                            By ensuring that risk assessment and initial redaction occur strictly on-device, Redacta simplifies compliance with strict air-gapped data sovereignty requirements.
                        </p>
                        <div className="grid grid-cols-3 gap-2">
                            {['GDPR', 'HIPAA', 'DPDP', 'PIPEDA', 'CCPA', 'LGPD'].map(reg => (
                                <div key={reg} className="px-2 py-1 bg-white border border-slate-200 rounded text-[9px] font-black text-slate-400 text-center">{reg}</div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
          </section>

        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-100 flex justify-center bg-slate-50">
          <Button onClick={onClose} className="w-full max-w-sm py-4 text-base shadow-lg shadow-indigo-100">I Understand the Security Model</Button>
        </div>
      </div>
    </div>
  );
};
