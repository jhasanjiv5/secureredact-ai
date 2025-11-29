
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Shield, RefreshCw, Download, FileText, Settings, Server, Cloud, ArrowRight, AlertTriangle, ExternalLink, ShieldCheck, ShieldAlert, FileSearch, Info, X, Scale, Key, Unlock } from 'lucide-react';
import { ProcessingStatus, UploadedFile, RedactionStats, AnalysisResult, RedactionMap } from './types';
import { countRedactions } from './services/geminiService';
import { extractTextFromPdf, generateRedactedPdf } from './services/pdfService';
import { checkOllamaConnection, sanitizeWithOllama, assessRiskWithOllama, DEFAULT_OLLAMA_CONFIG, OllamaConfig } from './services/ollamaService';
import { UploadZone } from './components/UploadZone';
import { ComparisonView } from './components/ComparisonView';
import { Button } from './components/Button';

const App: React.FC = () => {
  const [status, setStatus] = useState<ProcessingStatus>(ProcessingStatus.IDLE);
  const [file, setFile] = useState<UploadedFile | null>(null);
  
  // Data Flow State
  const [sanitizedContent, setSanitizedContent] = useState<string>('');
  const [finalContent, setFinalContent] = useState<string>('');
  const [redactionMap, setRedactionMap] = useState<RedactionMap>({});
  
  const [stats, setStats] = useState<RedactionStats>({ originalLength: 0, redactedLength: 0, piiCount: 0 });
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isMixedContent, setIsMixedContent] = useState(false);
  const [showRiskModal, setShowRiskModal] = useState(false);
  
  // Settings State
  const [showSettings, setShowSettings] = useState(false);
  const [ollamaConfig, setOllamaConfig] = useState<OllamaConfig>(DEFAULT_OLLAMA_CONFIG);
  const [ollamaConnected, setOllamaConnected] = useState<boolean>(false);
  
  const restoreInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Check for Mixed Content issues (HTTPS trying to hit HTTP localhost)
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
    setStats({ originalLength: 0, redactedLength: 0, piiCount: 0 });

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
        processHybridWorkflow(text);
      } else {
        throw new Error("File appears empty");
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to process file");
      setStatus(ProcessingStatus.ERROR);
    }
  }, [ollamaConfig]);

  const processHybridWorkflow = async (originalText: string) => {
    try {
      setStats(prev => ({ ...prev, originalLength: originalText.length }));
      
      // Step 1: Local Processing (Ollama)
      setStatus(ProcessingStatus.PROCESSING_LOCAL);
      
      const isConnected = await checkOllamaConnection(ollamaConfig);
      if (!isConnected) {
         setOllamaConnected(false);
         setError("Connection Failed"); 
         setStatus(ProcessingStatus.ERROR);
         return; 
      }
      setOllamaConnected(true);

      // Run parallel local tasks: Sanitize & Assess Risk
      const [localSanitizationResult, localRisk] = await Promise.all([
        sanitizeWithOllama(originalText, ollamaConfig),
        assessRiskWithOllama(originalText, ollamaConfig)
      ]);

      const sanitizedText = localSanitizationResult.sanitizedText;
      const map = localSanitizationResult.map;

      setSanitizedContent(sanitizedText);
      setRedactionMap(map);
      
      const piiCount = countRedactions(sanitizedText);
      setStats(prev => ({ ...prev, redactedLength: sanitizedText.length, piiCount }));

      // Step 2: Cloud Processing (Gemini) - Summarization Only
      setStatus(ProcessingStatus.PROCESSING_CLOUD);
      
      //const summary = await generateSummary(sanitizedText);
      
      // Combine local risk and cloud summary
      const fullResult: AnalysisResult = {
        riskLevel: localRisk.riskLevel,
        riskReason: localRisk.riskReason,
        regulatoryWarning: localRisk.regulatoryWarning
      };
      
      setAnalysisResult(fullResult);

      const formattedOutput = `PRIVACY RISK ASSESSMENT (Local AI)\n` +
                              `----------------------------------\n` +
                              `Level:  ${fullResult.riskLevel.toUpperCase()}\n` +
                              `Reason: ${fullResult.riskReason}\n` +
                              (fullResult.regulatoryWarning ? `Compliance: ${fullResult.regulatoryWarning}\n` : '') 
                              //+
                              //`\n` +
                              //`DOCUMENT SUMMARY (Cloud AI)\n` +
                              //`---------------------------\n` +
                              //`${fullResult.summary}`
                              ;
      
      setFinalContent(formattedOutput);
      setStatus(ProcessingStatus.COMPLETED);

    } catch (err: any) {
      console.error(err);
      setError(err.message || "An error occurred during the hybrid workflow.");
      setStatus(ProcessingStatus.ERROR);
    }
  };

  const handleReset = () => {
    setFile(null);
    setSanitizedContent('');
    setFinalContent('');
    setRedactionMap({});
    setAnalysisResult(null);
    setStatus(ProcessingStatus.IDLE);
    setError(null);
    setStats({ originalLength: 0, redactedLength: 0, piiCount: 0 });
    setShowRiskModal(false);
  };

  const handleDownloadPdf = async () => {
    if (!sanitizedContent) return;
    try {
      const pdfBlob = generateRedactedPdf(sanitizedContent);
      const url = URL.createObjectURL(pdfBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `analysis_${file?.name.replace(/\.[^/.]+$/, "")}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      setError("Failed to generate PDF file.");
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
            
            // Perform restoration
            let restored = sanitizedContent;
            let restoredCount = 0;
            
            Object.entries(map).forEach(([tag, originalValue]) => {
                if (restored.includes(tag)) {
                    // Replace all occurrences of this specific tag
                    restored = restored.split(tag).join(originalValue);
                    restoredCount++;
                }
            });

            setSanitizedContent(restored);
            setError(null);
            // Optional: reset file input
            if (restoreInputRef.current) restoreInputRef.current.value = '';
            
            // Update stats to show fewer redactions
            const newPiiCount = countRedactions(restored);
            setStats(prev => ({ ...prev, piiCount: newPiiCount }));

            alert(`Successfully restored ${restoredCount} items using the provided key.`);

        } catch (err) {
            console.error(err);
            setError("Invalid Key File. Please upload a valid JSON redaction key.");
        }
    };
    reader.readAsText(keyFile);
  };

  const getRiskDisplay = (level: string | undefined, count: number) => {
    const isHighRisk = level === 'High';
    const isMediumRisk = level === 'Medium';
    const isLowRisk = level === 'Low';
    
    if (isHighRisk) {
        return { 
            text: 'High Risk', 
            color: 'text-red-700 bg-red-50 border-red-200 hover:bg-red-100', 
            icon: ShieldAlert,
            headerBg: 'bg-red-500'
        };
    }
    if (isMediumRisk) {
        return { 
            text: 'Medium Risk', 
            color: 'text-amber-700 bg-amber-50 border-amber-200 hover:bg-amber-100', 
            icon: AlertTriangle,
            headerBg: 'bg-amber-500' 
        };
    }
    
    if (count > 0 || isLowRisk) {
         return { 
            text: 'Low Risk', 
            color: 'text-emerald-700 bg-emerald-50 border-emerald-200 hover:bg-emerald-100', 
            icon: ShieldCheck,
            headerBg: 'bg-emerald-500' 
        };
    }

    return { 
        text: 'Safe Content', 
        color: 'text-slate-600 bg-slate-50 border-slate-200', 
        icon: Shield,
        headerBg: 'bg-slate-500'
    };
  };

  const renderErrorContent = () => {
    if (!error && !isMixedContent) return null;

    const isConnectionError = error?.includes('Connect') || error?.includes('Failed to fetch') || !ollamaConnected;

    if (isMixedContent && isConnectionError) {
        return (
            <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg max-w-xl text-amber-900 text-sm">
                <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5" />
                    <div>
                        <h4 className="font-bold mb-1">Browser Security Block (Mixed Content)</h4>
                        <p className="mb-2">
                            This page is loaded via <strong>HTTPS</strong>, but you are trying to connect to a local Ollama server on <strong>HTTP</strong>. 
                            Most browsers block this for security.
                        </p>
                        <p className="font-semibold">Options to fix:</p>
                        <ul className="list-disc ml-5 space-y-1 mt-1">
                            <li>Run this web app on <code>http://localhost</code> if possible.</li>
                            <li>Allow "Insecure Content" for this site in your browser settings.</li>
                            <li>Use a tunnelling service (like ngrok) to give your local Ollama an HTTPS URL.</li>
                        </ul>
                    </div>
                </div>
            </div>
        );
    }

    if (isConnectionError) {
        return (
             <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg max-w-xl text-red-800 text-sm">
                <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5" />
                    <div>
                        <h4 className="font-bold mb-1">Local Connection Failed</h4>
                        <p className="mb-2">We cannot reach Ollama at <code>{ollamaConfig.url}</code>.</p>
                        
                        <p className="font-semibold text-xs uppercase text-red-600 mb-1">Checklist:</p>
                        <ul className="list-disc ml-5 space-y-1 text-slate-700">
                            <li>Is Ollama installed and running?</li>
                            <li>Did you allow browser access? Run this command: <br/>
                                <code className="bg-white px-2 py-1 rounded border border-red-200 block w-full mt-1 select-all">OLLAMA_ORIGINS="*" ollama serve</code>
                            </li>
                            <li>Is the model installed? Run: <code>ollama pull {ollamaConfig.model}</code></li>
                        </ul>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg max-w-xl text-red-800 text-sm font-medium">
          {error}
        </div>
    );
  };

  const risk = getRiskDisplay(analysisResult?.riskLevel, stats.piiCount);
  const RiskIcon = risk.icon;

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 font-sans">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-indigo-600 rounded-lg">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">SecureRedact</h1>
              <p className="text-xs text-slate-500">Local Privacy</p>
            </div>
          </div>
          <Button variant="ghost" onClick={() => setShowSettings(!showSettings)} icon={<Settings className="w-4 h-4"/>}>
             Ollama Config
          </Button>
        </div>
      </header>

      {/* Settings Panel */}
      {showSettings && (
        <div className="bg-slate-100 border-b border-slate-200 p-4">
            <div className="max-w-7xl mx-auto flex flex-col sm:flex-row gap-4 items-end">
                <div className="flex-1 w-full">
                    <label className="block text-xs font-semibold text-slate-500 mb-1">Ollama URL</label>
                    <input 
                        type="text" 
                        value={ollamaConfig.url} 
                        onChange={(e) => setOllamaConfig({...ollamaConfig, url: e.target.value})}
                        className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm"
                        placeholder="http://localhost:11434"
                    />
                </div>
                <div className="flex-1 w-full">
                    <label className="block text-xs font-semibold text-slate-500 mb-1">Local Model Name</label>
                    <input 
                        type="text" 
                        value={ollamaConfig.model} 
                        onChange={(e) => setOllamaConfig({...ollamaConfig, model: e.target.value})}
                        className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm"
                        placeholder="gemma2:2b"
                    />
                </div>
                <Button onClick={handleOllamaCheck} variant="secondary">Test Connection</Button>
            </div>
            {ollamaConnected && <p className="text-green-600 text-xs mt-2 max-w-7xl mx-auto">✓ Ollama Connected</p>}
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 overflow-hidden flex flex-col relative">
        
        {status === ProcessingStatus.IDLE || status === ProcessingStatus.ERROR ? (
          <div className="flex-1 flex flex-col items-center justify-center animate-fade-in">
             <div className="text-center mb-12 max-w-2xl">
               <h2 className="text-4xl font-bold text-slate-900 mb-4">
                 Privacy-First Analysis
               </h2>
               <p className="text-lg text-slate-600 mb-8">
                 <b>Step 1:</b> Redact PII locally using your offline Ollama ({ollamaConfig.model}).<br/>
                 <b>Step 2:</b> Send sanitized data to Gemma for analysis.
               </p>

               <div className="flex items-center justify-center space-x-8 mb-8 text-sm text-slate-400">
                    <div className="flex flex-col items-center">
                        <Server className="w-8 h-8 mb-2 text-slate-600" />
                        <span>Local ({ollamaConfig.model})</span>
                    </div>
                    <ArrowRight className="w-6 h-6" />
                    <div className="flex flex-col items-center">
                        <Shield className="w-8 h-8 mb-2 text-indigo-600" />
                        <span>Sanitized Data</span>
                    </div>
                    <ArrowRight className="w-6 h-6" />
                    <div className="flex flex-col items-center">
                        <Cloud className="w-8 h-8 mb-2 text-blue-600" />
                        <span>Gemma 2</span>
                    </div>
               </div>
             </div>
             
             <UploadZone onFileSelect={handleFileSelect} disabled={false} />
             
             {renderErrorContent()}
             
          </div>
        ) : (
          <div className="flex-1 flex flex-col h-full overflow-hidden">
            {/* Toolbar */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 mb-4 flex flex-wrap items-center justify-between gap-4 shrink-0">
               <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2 text-sm text-slate-600 bg-slate-100 px-3 py-1.5 rounded-full">
                    <FileText className="w-4 h-4" />
                    <span className="font-medium max-w-[200px] truncate">{file?.name}</span>
                  </div>
                  
                  {status === ProcessingStatus.PROCESSING_LOCAL && (
                    <div className="flex items-center space-x-2 text-indigo-600 text-sm font-medium">
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Step 1: Local Redaction & Risk Check ({ollamaConfig.model})...</span>
                    </div>
                  )}

                  {status === ProcessingStatus.PROCESSING_CLOUD && (
                    <div className="flex items-center space-x-2 text-blue-600 text-sm font-medium">
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Step 2: Analysis (Gemma 2)...</span>
                    </div>
                  )}

                  {status === ProcessingStatus.COMPLETED && (
                    <div className="flex items-center gap-3">
                        {/* PII Count Badge */}
                        <div className="flex items-center space-x-2 text-slate-600 text-sm font-medium bg-slate-100 px-3 py-1.5 rounded-full">
                            <span>PII Found: {stats.piiCount}</span>
                        </div>

                        {/* Inferred Risk Badge (Clickable) */}
                         <button 
                            onClick={() => setShowRiskModal(true)}
                            className={`flex items-center space-x-2 px-3 py-1.5 rounded-full border ${risk.color} text-sm font-medium transition-all cursor-pointer`}
                         >
                            <RiskIcon className="w-4 h-4" />
                            <span>{risk.text}</span>
                            <Info className="w-3 h-3 ml-1 opacity-60" />
                         </button>
                    </div>
                  )}
               </div>

               <div className="flex items-center space-x-2">
                  {status === ProcessingStatus.COMPLETED && (
                    <>
                      {/* Hidden File Input for Restoration */}
                      <input 
                        type="file" 
                        ref={restoreInputRef}
                        onChange={handleRestoreKeySelect}
                        className="hidden"
                        accept=".json"
                      />
                      <Button variant="secondary" onClick={() => restoreInputRef.current?.click()} icon={<Unlock className="w-4 h-4"/>}>
                        Restore
                      </Button>
                      <Button variant="secondary" onClick={handleExportKey} icon={<Key className="w-4 h-4"/>}>
                        Export Key
                      </Button>
                      <Button onClick={handleDownloadPdf} icon={<Download className="w-4 h-4"/>}>
                          Save Analysis
                      </Button>
                    </>
                  )}
                  <Button variant="secondary" onClick={handleReset} icon={<RefreshCw className="w-4 h-4"/>} className="ml-2">
                    New
                  </Button>
               </div>
            </div>

            {/* Editor View */}
            <div className="flex-1 min-h-0 pb-4">
              <ComparisonView 
                originalText={file?.content || ''} 
                sanitizedText={sanitizedContent}
                finalOutput={finalContent}
                status={status}
              />
            </div>
          </div>
        )}

        {/* Risk Modal */}
        {showRiskModal && analysisResult && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
                <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200">
                    <div className={`${risk.headerBg} p-6 text-white flex justify-between items-start`}>
                        <div className="flex items-center space-x-3">
                            <div className="p-2 bg-white/20 rounded-lg backdrop-blur-md">
                                <RiskIcon className="w-6 h-6" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold">Privacy Risk Analysis</h3>
                                <p className="text-white/80 text-sm">Automated Legal & Compliance Check</p>
                            </div>
                        </div>
                        <button onClick={() => setShowRiskModal(false)} className="text-white/70 hover:text-white transition-colors">
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                    
                    <div className="p-6 space-y-6">
                        <div>
                            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Risk Classification</h4>
                            <p className="text-slate-900 font-medium text-lg leading-relaxed">
                                {analysisResult.riskReason}
                            </p>
                        </div>

                        <div className="bg-slate-50 rounded-lg p-4 border border-slate-100">
                             <div className="flex items-center space-x-2 mb-2 text-indigo-700">
                                <Scale className="w-4 h-4" />
                                <h4 className="text-xs font-bold uppercase tracking-wider">Regulatory Implications</h4>
                             </div>
                             <p className="text-slate-700 text-sm">
                                {analysisResult.regulatoryWarning || "No specific regulatory violations detected based on the provided text context."}
                             </p>
                        </div>
                        
                        <div className="flex justify-end">
                            <Button variant="secondary" onClick={() => setShowRiskModal(false)}>
                                Close Details
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        )}

      </main>
    </div>
  );
};

export default App;
