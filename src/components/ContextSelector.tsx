
import React, { useState } from 'react';
import { Button } from './Button';
import { FileText, Stethoscope, Briefcase, Terminal, Shield, Globe, Scale, Receipt } from 'lucide-react';
import { JurisdictionConfig } from '../types';

interface ContextSelectorProps {
  fileName: string;
  onConfirm: (context: string, jurisdiction: JurisdictionConfig) => void;
  onCancel: () => void;
}

export const JURISDICTIONS: JurisdictionConfig[] = [
    { 
        id: 'global', 
        name: 'Global / Unspecified', 
        law: 'International Privacy Standards (GDPR-like)', 
        piiExamples: ['Email', 'Phone', 'Passport Number', 'Credit Card', 'Date of Birth'] 
    },
    { 
        id: 'us', 
        name: 'United States', 
        law: 'HIPAA (Health), CCPA (California), GLBA (Finance)', 
        piiExamples: ['SSN (Social Security)', 'Driver\'s License', 'ZIP Code', 'Health Plan Beneficiary Number', 'Medical Record Number (MRN)'] 
    },
    { 
        id: 'eu', 
        name: 'European Union', 
        law: 'GDPR (General Data Protection Regulation)', 
        piiExamples: ['IBAN', 'National ID', 'Passport Number', 'Tax Identification Number', 'Union Membership', 'Biometric Data'] 
    },
    { 
        id: 'uk', 
        name: 'United Kingdom', 
        law: 'UK GDPR / DPA 2018', 
        piiExamples: ['NHS Number', 'NINO (National Insurance)', 'Sort Code', 'Driver Number'] 
    },
    { 
        id: 'in', 
        name: 'India', 
        law: 'DPDP Act 2023', 
        piiExamples: ['Aadhaar Number', 'PAN Card', 'Voter ID', 'IFSC Code', 'Mobile Number'] 
    },
    { 
        id: 'ca', 
        name: 'Canada', 
        law: 'PIPEDA', 
        piiExamples: ['SIN (Social Insurance)', 'Health Card Number', 'Driver\'s Licence'] 
    },
    { 
        id: 'au', 
        name: 'Australia', 
        law: 'Privacy Act 1988', 
        piiExamples: ['TFN (Tax File Number)', 'Medicare Number', 'Driver Licence'] 
    },
    { 
        id: 'br', 
        name: 'Brazil', 
        law: 'LGPD', 
        piiExamples: ['CPF (Individual Taxpayer)', 'RG (Identity)', 'CNPJ (Business)', 'Voter Title'] 
    }
];

export const ContextSelector: React.FC<ContextSelectorProps> = ({ fileName, onConfirm, onCancel }) => {
  const [customContext, setCustomContext] = useState('');
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);
  const [selectedJurisdictionId, setSelectedJurisdictionId] = useState<string>('global');

  const presets = [
    { 
      id: 'medical', 
      label: 'Medical Records', 
      desc: 'Patient logs, Clinical notes',
      icon: <Stethoscope className="w-5 h-5 text-rose-500" />,
      value: "Medical/Health Records. Strictly redact Patient Names, MRN, DOB, Doctor Names, and Insurance IDs."
    },
    { 
      id: 'legal', 
      label: 'Legal Contracts', 
      desc: 'Agreements, Court docs',
      icon: <Briefcase className="w-5 h-5 text-amber-600" />,
      value: "Legal Documents. Strictly redact Client Names, Case Numbers, Dollar Amounts, and Signatures."
    },
    { 
      id: 'sales', 
      label: 'Sales & Purchase', 
      desc: 'Invoices, Receipts, POs',
      icon: <Receipt className="w-5 h-5 text-emerald-600" />,
      value: "Sales and Purchase Records (Invoices, Purchase Orders, Receipts). Strictly redact Customer Names, Billing Addresses, Payment Methods (Credit Cards/Bank Info), and Transaction IDs."
    },
    { 
      id: 'tech', 
      label: 'System Logs/Code', 
      desc: 'API keys, Server logs',
      icon: <Terminal className="w-5 h-5 text-slate-700" />,
      value: "Technical Logs or Source Code. Strictly redact API Keys, IP Addresses, Passwords, Database Connection Strings, and Usernames."
    },
    { 
      id: 'general', 
      label: 'General / Resume', 
      desc: 'Standard PII (Emails, Phones)',
      icon: <FileText className="w-5 h-5 text-indigo-500" />,
      value: "General Resume or Cover Letter. Redact Name, Email, Phone, Address, and University Names."
    }
  ];

  const handlePresetClick = (value: string, id: string) => {
    setSelectedPreset(id);
    setCustomContext(value);
  };

  const handleConfirm = () => {
    const jurisdiction = JURISDICTIONS.find(j => j.id === selectedJurisdictionId) || JURISDICTIONS[0];
    onConfirm(customContext, jurisdiction);
  };

  const currentJur = JURISDICTIONS.find(j => j.id === selectedJurisdictionId);

  return (
    <div className="w-full max-w-3xl mx-auto animate-fade-in bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
      <div className="p-6 bg-slate-50 border-b border-slate-200 flex items-center justify-between shrink-0">
         <div className="flex items-center space-x-3">
            <div className="bg-indigo-100 p-2 rounded-lg">
                <Shield className="w-6 h-6 text-indigo-600" />
            </div>
            <div>
                <h2 className="text-lg font-bold text-slate-900">Analysis Context & Compliance</h2>
                <p className="text-sm text-slate-500">Processing: <span className="font-mono text-slate-700">{fileName}</span></p>
            </div>
         </div>
      </div>

      <div className="p-8 overflow-y-auto">
        
        {/* Jurisdiction Section */}
        <div className="mb-8 p-4 bg-indigo-50/50 rounded-xl border border-indigo-100">
            <label className="flex items-center text-sm font-bold text-slate-800 mb-3">
                <Globe className="w-4 h-4 mr-2 text-indigo-600" />
                Select Jurisdiction / Country
            </label>
            <div className="flex flex-col md:flex-row gap-4">
                <select 
                    value={selectedJurisdictionId}
                    onChange={(e) => setSelectedJurisdictionId(e.target.value)}
                    className="flex-1 px-4 py-2.5 rounded-lg border border-slate-300 bg-white text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-medium"
                >
                    {JURISDICTIONS.map(j => (
                        <option key={j.id} value={j.id}>{j.name}</option>
                    ))}
                </select>
                <div className="flex-1 text-xs text-slate-600 bg-white p-3 rounded-lg border border-indigo-100 shadow-sm">
                    <div className="font-semibold text-indigo-700 mb-1 flex items-center">
                        <Scale className="w-3 h-3 mr-1" />
                        {currentJur?.law}
                    </div>
                    <div>Targets: {currentJur?.piiExamples.join(', ')}</div>
                </div>
            </div>
        </div>

        <div className="h-px bg-slate-100 mb-8" />

        <p className="text-slate-600 mb-6 font-medium">
            Describe the document type to help the AI identify context-specific PII:
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
            {presets.map((p) => (
                <button
                    key={p.id}
                    onClick={() => handlePresetClick(p.value, p.id)}
                    className={`flex items-start p-4 border rounded-xl transition-all text-left group relative
                        ${selectedPreset === p.id 
                            ? 'border-indigo-600 bg-indigo-50 ring-1 ring-indigo-600 shadow-sm' 
                            : 'border-slate-200 hover:border-indigo-300 hover:bg-slate-50 hover:shadow-sm'
                        }
                    `}
                >
                    <div className="mr-3 mt-0.5">{p.icon}</div>
                    <div>
                        <div className={`font-semibold ${selectedPreset === p.id ? 'text-indigo-900' : 'text-slate-900'}`}>
                            {p.label}
                        </div>
                        <div className="text-xs text-slate-500 mt-1">{p.desc}</div>
                    </div>
                </button>
            ))}
        </div>

        <div className="mb-2">
            <label className="block text-sm font-medium text-slate-700 mb-2">
                Context Description (Custom or Editable)
            </label>
            <textarea
                value={customContext}
                onChange={(e) => {
                    setCustomContext(e.target.value);
                    setSelectedPreset(null);
                }}
                className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 min-h-[100px] text-sm text-slate-900 font-mono shadow-sm"
                placeholder="e.g. This is a chat log from a customer support session. Please redact agent names and order IDs..."
            />
        </div>
      </div>

      <div className="p-6 bg-slate-50 border-t border-slate-200 flex justify-between items-center shrink-0">
            <Button variant="ghost" onClick={onCancel}>
                Cancel
            </Button>
            <Button 
                onClick={handleConfirm}
                disabled={!customContext.trim()}
                className="pl-6 pr-6"
            >
                Start Sanitization
            </Button>
      </div>
    </div>
  );
};
