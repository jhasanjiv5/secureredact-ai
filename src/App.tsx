
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Shield, RefreshCw, Download, FileText, Settings, Server, Cloud, ArrowRight, AlertTriangle, ExternalLink, ShieldCheck, ShieldAlert, FileSearch, Info, X, Scale, Key, Unlock, CheckCircle, Save } from 'lucide-react';
import { ProcessingStatus, UploadedFile, RedactionStats, AnalysisResult, RedactionMap, JurisdictionConfig } from './types';
import { generateSummary, countRedactions } from './services/geminiService';
import { extractTextFromPdf, generateRedactedPdf } from './services/pdfService';
import { checkOllamaConnection, sanitizeWithOllama, assessRiskWithOllama, DEFAULT_OLLAMA_CONFIG, OllamaConfig } from './services/ollamaService';
import { UploadZone } from './components/UploadZone';
import { ComparisonView } from './components/ComparisonView';
import { Button } from './components/Button';
import { ContextSelector } from './components/ContextSelector';

const App: React.FC = () => {
  const [status, setStatus] = useState<ProcessingStatus>(ProcessingStatus.IDLE);
  const [file, setFile] = useState<UploadedFile | null>(null);
  const [progress, setProgress] = useState<{current: number, total: number}>({current: 0, total: 0});
  
  // Data Flow State
  const [sanitizedContent, setSanitizedContent] = useState<string>('');
  const [finalContent, setFinalContent] = useState<string>('');
  const [redactionMap, setRedactionMap] = useState<RedactionMap>({});
  
  const [stats, setStats] = useState<RedactionStats>({ originalLength: 0, redactedLength: 0, piiCount: 0 });
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [currentJurisdiction, setCurrentJurisdiction] = useState<JurisdictionConfig | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isMixedContent, setIsMixedContent] = useState(false);
  const [showRiskModal, setShowRiskModal] = useState(false);
  
  // Settings State
  const [showSettings, setShowSettings] = useState(false);
  const [ollamaConfig, setOllamaConfig] = useState<OllamaConfig>(DEFAULT_OLLAMA_CONFIG);
  const [ollamaConnected, setOllamaConnected] = useState<boolean>(false);
  
  const restoreInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (window.location.protocol === 'https:') {
        setIsMixedContent(true);
    }
    let mounted = true;
    checkOllamaConnection(ollamaConfig).then(connected => {
      if (mounted) setOllamaConnected(connected);
    });
    return () => { mounted = false; };
  }, []);

  const handleOllamaCheck = async () => {
    setStatus(ProcessingStatus.IDLE);
    const isConnected = await checkOllamaConnection(ollamaConfig);
    setOllamaConnected(isConnected);
    if (!isConnected) {
        setError(`Could not connect to Ollama at ${ollamaConfig.url}`);
        setStatus(ProcessingStatus.ERROR);
    } else {
        setError(null);
    }
  };

  const handleFileSelect = useCallback(async (selectedFile: File) => {
    setStatus(ProcessingStatus.READING_FILE);
    setError(null);
    setSanitizedContent('');
    setFinalContent('');
    setRedactionMap({});
    setAnalysisResult(null);
    setCurrentJurisdiction(null);
    setStats({ originalLength: 0, redactedLength: 0, piiCount: 0 });
    setProgress({current: 0, total: 0});

    try {
      let text = '';
      if (selectedFile.type === 'application/pdf' || selectedFile.name.endsWith('.pdf')) {
        text = await extractTextFromPdf(selectedFile);
      } else {
        text = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (e) => resolve(e.target?.result as string || '');
          reader.onerror = () => reject(new Error("Failed to read file"));
          reader.readAsText(selectedFile);
        });
      }

      if (text) {
        setFile({
          name: selectedFile.name,
          content: text,
          type: selectedFile.type
        });
        setStatus(ProcessingStatus.AWAITING_CONTEXT);
      } else {
        throw new Error("File appears empty");
      }
    } catch (err: any) {
      setError(err.message || "Failed to process file");
      setStatus(ProcessingStatus.ERROR);
    }
  }, []);

  const startLocalProcessing = async (context: string, jurisdiction: JurisdictionConfig) => {
    if (!file) return;

    try {
      setCurrentJurisdiction(jurisdiction);
      const originalText = file.content;
      setStats(prev => ({ ...prev, originalLength: originalText.length }));
      setStatus(ProcessingStatus.PROCESSING_LOCAL);
      
      const isConnected = await checkOllamaConnection(ollamaConfig);
      if (!isConnected) {
         setOllamaConnected(false);
         setError("Connection Failed. Make sure Ollama is running and OLLAMA_ORIGINS='*' is set."); 
         setStatus(ProcessingStatus.ERROR);
         return; 
      }
      setOllamaConnected(true);

      // Perform Chunked Sanitization
      const localSanitizationResult = await sanitizeWithOllama(
        originalText, 
        ollamaConfig, 
        context, 
        jurisdiction,
        (curr, tot) => setProgress({ current: curr, total: tot })
      );

      // Assess risk on document sample
      const localRisk = await assessRiskWithOllama(originalText, ollamaConfig, jurisdiction);

      const sanitizedText = localSanitizationResult.sanitizedText;
      const map = localSanitizationResult.map;

      setSanitizedContent(sanitizedText);
      setRedactionMap(map);
      
      const piiCount = countRedactions(sanitizedText);
      setStats(prev => ({ ...prev, redactedLength: sanitizedText.length, piiCount }));

      setAnalysisResult({
        summary: '',
        riskLevel: localRisk.riskLevel,
        riskReason: localRisk.riskReason,
        regulatoryWarning: localRisk.regulatoryWarning
      });

      setStatus(ProcessingStatus.AWAITING_CLOUD_CONSENT);

    } catch (err: any) {
      setError(err.message || "An error occurred during local processing.");
      setStatus(ProcessingStatus.ERROR);
    }
  };

  const handleCloudConsent = async (proceed: boolean) => {
    if (!analysisResult || !currentJurisdiction) return;

    if (!proceed) {
        const finalRep = formatFinalReport(analysisResult, "Cloud analysis skipped by user.", currentJurisdiction);
        setFinalContent(finalRep);
        setStatus(ProcessingStatus.COMPLETED);
        return;
    }

    try {
        setStatus(ProcessingStatus.PROCESSING_CLOUD);
        const summary = await generateSummary(sanitizedContent);
        const updatedResult = { ...analysisResult, summary };
        setAnalysisResult(updatedResult);
        const finalRep = formatFinalReport(updatedResult, summary, currentJurisdiction);
        setFinalContent(finalRep);
        setStatus(ProcessingStatus.COMPLETED);
    } catch (err: any) {
        setError("Failed to process with Cloud AI. Local results are preserved.");
        setStatus(ProcessingStatus.COMPLETED);
    }
  };

  const formatFinalReport = (result: AnalysisResult, summaryText: string, jurisdiction: JurisdictionConfig) => {
      return `PRIVACY RISK ASSESSMENT (Local AI)\n` +
             `----------------------------------\n` +
             `Jurisdiction: ${jurisdiction.name} (${jurisdiction.law})\n` +
             `Level:        ${result.riskLevel.toUpperCase()}\n` +
             `Reason:       ${result.riskReason}\n` +
             (result.regulatoryWarning ? `Compliance:   ${result.regulatoryWarning}\n` : '') +
             `\n` +
             `DOCUMENT SUMMARY (Cloud AI)\n` +
             `---------------------------\n` +
             `${summaryText}`;
  };

  const handleDownloadSanitized = () => {
    if (!file || !sanitizedContent) return;

    const originalExt = file.name.split('.').pop()?.toLowerCase();
    let blob: Blob;
    let fileName = `sanitized_${file.name}`;

    try {
        if (originalExt === 'json') {
            try {
                const parsed = JSON.parse(sanitizedContent);
                const pretty = JSON.stringify(parsed, null, 2);
                blob = new Blob([pretty], { type: 'application/json' });
            } catch {
                blob = new Blob([sanitizedContent], { type: 'application/json' });
            }
        } else if (originalExt === 'pdf') {
            blob = generateRedactedPdf(sanitizedContent);
        } else if (originalExt === 'csv') {
            blob = new Blob([sanitizedContent], { type: 'text/csv' });
        } else if (originalExt === 'md') {
            blob = new Blob([sanitizedContent], { type: 'text/markdown' });
        } else {
            blob = new Blob([sanitizedContent], { type: 'text/plain' });
        }

        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    } catch (err) {
        setError("Failed to generate sanitized download file.");
    }
  };

  const handleReset = () => {
    setFile(null);
    setSanitizedContent('');
    setFinalContent('');
    setRedactionMap({});
    setAnalysisResult(null);
    setCurrentJurisdiction(null);
    setStatus(ProcessingStatus.IDLE);
    setError(null);
    setStats({ originalLength: 0, redactedLength: 0, piiCount: 0 });
    setProgress({current: 0, total: 0});
    setShowRiskModal(false);
  };

  const handleDownloadReportPdf = async () => {
    if (!finalContent) return;
    try {
      const pdfBlob = generateRedactedPdf(finalContent);
      const url = URL.createObjectURL(pdfBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `report_${file?.name.replace(/\.[^/.]+$/, "")}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      setError("Failed to generate PDF report.");
    }
  };

  const handleExportKey = () => {
    if (Object.keys(redactionMap).length === 0) return;
    const jsonString = JSON.stringify(redactionMap, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `redaction_key_${file?.name.replace(/\.[^/.]+$/, "")}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleRestoreKeySelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const keyFile = e.target.files?.[0];
    if (!keyFile) return;
    const reader = new FileReader();
    reader.onload = (event) => {
        try {
            const content = event.target?.result as string;
            const map: RedactionMap = JSON.parse(content);
            let restored = sanitizedContent;
            let restoredCount = 0;
            Object.entries(map).forEach(([tag, originalValue]) => {
                if (restored.includes(tag)) {
                    restored = restored.split(tag).join(originalValue);
                    restoredCount++;
                }
            });
            setSanitizedContent(restored);
            setError(null);
            if (restoreInputRef.current) restoreInputRef.current.value = '';
            const newPiiCount = countRedactions(restored);
            setStats(prev => ({ ...prev, piiCount: newPiiCount }));
            alert(`Successfully restored ${restoredCount} items.`);
        } catch (err) {
            setError("Invalid Key File.");
        }
    };
    reader.readAsText(keyFile);
  };

  const risk = getRiskDisplay(analysisResult?.riskLevel, stats.piiCount);
  const RiskIcon = risk.icon;

  function getRiskDisplay(level: string | undefined, count: number) {
    if (level === 'High') return { text: 'High Risk', color: 'text-red-700 bg-red-50 border-red-200', icon: ShieldAlert, headerBg: 'bg-red-500' };
    if (level === 'Medium') return { text: 'Medium Risk', color: 'text-amber-700 bg-amber-50 border-amber-200', icon: AlertTriangle, headerBg: 'bg-amber-500' };
    if (count > 0 || level === 'Low') return { text: 'Low Risk', color: 'text-emerald-700 bg-emerald-50 border-emerald-200', icon: ShieldCheck, headerBg: 'bg-emerald-500' };
    return { text: 'Safe Content', color: 'text-slate-600 bg-slate-50 border-slate-200', icon: Shield, headerBg: 'bg-slate-500' };
  }

  const renderMainContent = () => {
    if (status === ProcessingStatus.AWAITING_CONTEXT && file) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center">
                <ContextSelector 
                    fileName={file.name}
                    onConfirm={(context, jurisdiction) => startLocalProcessing(context, jurisdiction)}
                    onCancel={handleReset}
                />
            </div>
        );
    }

    if (status === ProcessingStatus.IDLE || status === ProcessingStatus.READING_FILE || status === ProcessingStatus.ERROR) {
         return (
             <div className="flex-1 flex flex-col items-center justify-center animate-fade-in">
             <div className="text-center mb-12 max-w-2xl">
               <h2 className="text-4xl font-bold text-slate-900 mb-4">Privacy-First Analysis</h2>
               <p className="text-lg text-slate-600 mb-8">
                 <b>Step 1:</b> Redact PII locally using your offline Ollama ({ollamaConfig.model}).<br/>
                 <b>Step 2:</b> Send sanitized data to Google Cloud for secure analysis.
               </p>
               <div className="flex items-center justify-center space-x-8 mb-8 text-sm text-slate-400">
                    <div className="flex flex-col items-center">
                        <Server className="w-8 h-8 mb-2 text-slate-600" />
                        <span>Local Analysis</span>
                    </div>
                    <ArrowRight className="w-6 h-6" />
                    <div className="flex flex-col items-center">
                        <Shield className="w-8 h-8 mb-2 text-indigo-600" />
                        <span>Sanitized Data</span>
                    </div>
                    <ArrowRight className="w-6 h-6" />
                    <div className="flex flex-col items-center">
                        <Cloud className="w-8 h-8 mb-2 text-blue-600" />
                        <span>Cloud Summary</span>
                    </div>
               </div>
             </div>
             <UploadZone onFileSelect={handleFileSelect} disabled={status === ProcessingStatus.READING_FILE} />
             {error && <div className="mt-4 p-4 bg-red-50 text-red-700 rounded-lg border border-red-200 text-sm font-medium">{error}</div>}
          </div>
         );
    }

    return (
        <div className="flex-1 flex flex-col h-full overflow-hidden">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 mb-4 flex flex-wrap items-center justify-between gap-4 shrink-0">
               <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2 text-sm text-slate-600 bg-slate-100 px-3 py-1.5 rounded-full">
                    <FileText className="w-4 h-4" />
                    <span className="font-medium max-w-[200px] truncate">{file?.name}</span>
                  </div>
                  
                  {status === ProcessingStatus.PROCESSING_LOCAL && (
                    <div className="flex items-center space-x-2 text-indigo-600 text-sm font-medium">
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Local Redaction (Chunk {progress.current} of {progress.total})...</span>
                    </div>
                  )}

                  {status === ProcessingStatus.AWAITING_CLOUD_CONSENT && (
                     <div className="flex items-center space-x-2 text-amber-600 text-sm font-medium bg-amber-50 px-3 py-1.5 rounded-full border border-amber-200">
                        <Shield className="w-4 h-4" />
                        <span>Local Step Done. Cloud Consent Needed.</span>
                     </div>
                  )}

                  {status === ProcessingStatus.PROCESSING_CLOUD && (
                    <div className="flex items-center space-x-2 text-blue-600 text-sm font-medium">
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Step 2: Cloud Analysis...</span>
                    </div>
                  )}

                  {status === ProcessingStatus.COMPLETED && (
                    <div className="flex items-center gap-3">
                        <div className="flex items-center space-x-2 text-slate-600 text-sm font-medium bg-slate-100 px-3 py-1.5 rounded-full">
                            <span>PII Found: {stats.piiCount}</span>
                        </div>
                         <button 
                            onClick={() => setShowRiskModal(true)}
                            className={`flex items-center space-x-2 px-3 py-1.5 rounded-full border ${risk.color} text-sm font-medium transition-all`}
                         >
                            <RiskIcon className="w-4 h-4" />
                            <span>{risk.text}</span>
                         </button>
                    </div>
                  )}
               </div>

               <div className="flex items-center space-x-2">
                  {status === ProcessingStatus.AWAITING_CLOUD_CONSENT && (
                    <>
                        <Button 
                            variant="secondary" 
                            onClick={handleDownloadSanitized}
                            icon={<Save className="w-4 h-4"/>}
                        >
                            Download Sanitized
                        </Button>
                        <Button 
                            variant="secondary" 
                            onClick={() => handleCloudConsent(false)}
                            icon={<CheckCircle className="w-4 h-4"/>}
                        >
                            Skip Cloud
                        </Button>
                        <Button 
                            variant="primary" 
                            onClick={() => handleCloudConsent(true)}
                            icon={<Cloud className="w-4 h-4"/>}
                        >
                            Analyze with Cloud
                        </Button>
                    </>
                  )}

                  {status === ProcessingStatus.COMPLETED && (
                    <>
                      <input type="file" ref={restoreInputRef} onChange={handleRestoreKeySelect} className="hidden" accept=".json" />
                      <Button variant="secondary" onClick={() => restoreInputRef.current?.click()} icon={<Unlock className="w-4 h-4"/>}>Restore</Button>
                      <Button variant="secondary" onClick={handleExportKey} icon={<Key className="w-4 h-4"/>}>Export Key</Button>
                      <Button variant="secondary" onClick={handleDownloadSanitized} icon={<Save className="w-4 h-4"/>}>Clean File</Button>
                      <Button onClick={handleDownloadReportPdf} icon={<Download className="w-4 h-4"/>}>Save Report</Button>
                    </>
                  )}
                  <Button variant="secondary" onClick={handleReset} icon={<RefreshCw className="w-4 h-4"/>} className="ml-2">New</Button>
               </div>
            </div>

            <div className="flex-1 min-h-0 pb-4">
              <ComparisonView 
                originalText={file?.content || ''} 
                sanitizedText={sanitizedContent}
                finalOutput={finalContent}
                status={status}
              />
            </div>
          </div>
    );
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 font-sans">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-indigo-600 rounded-lg"><Shield className="w-6 h-6 text-white" /></div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">SecureRedact AI</h1>
              <p className="text-xs text-slate-500">Local Privacy + Cloud Intelligence</p>
            </div>
          </div>
          <Button variant="ghost" onClick={() => setShowSettings(!showSettings)} icon={<Settings className="w-4 h-4"/>}>Settings</Button>
        </div>
      </header>

      {showSettings && (
        <div className="bg-slate-100 border-b border-slate-200 p-4">
            <div className="max-w-7xl mx-auto flex flex-col sm:flex-row gap-4 items-end">
                <div className="flex-1 w-full">
                    <label className="block text-xs font-semibold text-slate-500 mb-1">Ollama URL</label>
                    <input type="text" value={ollamaConfig.url} onChange={(e) => setOllamaConfig({...ollamaConfig, url: e.target.value})} className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm" />
                </div>
                <div className="flex-1 w-full">
                    <label className="block text-xs font-semibold text-slate-500 mb-1">Model</label>
                    <input type="text" value={ollamaConfig.model} onChange={(e) => setOllamaConfig({...ollamaConfig, model: e.target.value})} className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm" />
                </div>
                <Button onClick={handleOllamaCheck} variant="secondary">Test</Button>
            </div>
        </div>
      )}

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 overflow-hidden flex flex-col relative">
        {renderMainContent()}
        {showRiskModal && analysisResult && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
                <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200">
                    <div className={`${risk.headerBg} p-6 text-white flex justify-between items-start`}>
                        <div className="flex items-center space-x-3">
                            <RiskIcon className="w-6 h-6" />
                            <h3 className="text-lg font-bold">Risk Assessment</h3>
                        </div>
                        <button onClick={() => setShowRiskModal(false)}><X className="w-5 h-5" /></button>
                    </div>
                    <div className="p-6 space-y-6">
                        <p className="text-slate-900 font-medium">{analysisResult.riskReason}</p>
                        <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
                             <h4 className="text-xs font-bold uppercase mb-2">Legal Context</h4>
                             <p className="text-slate-700 text-sm">{analysisResult.regulatoryWarning}</p>
                        </div>
                        <Button variant="secondary" onClick={() => setShowRiskModal(false)}>Close</Button>
                    </div>
                </div>
            </div>
        )}
      </main>
    </div>
  );
};

export default App;
