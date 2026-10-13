import React, { useState } from 'react';
import { Mail, X, Check, Copy, ShieldCheck, User, Calendar, Languages, Globe } from 'lucide-react';
import { EmailLogEntry } from '../../types';

interface EmailDetailModalProps {
  emailLog: EmailLogEntry | null;
  onClose: () => void;
}

export const EmailDetailModal: React.FC<EmailDetailModalProps> = ({ emailLog, onClose }) => {
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'translated' | 'original'>('translated');

  if (!emailLog) return null;

  const isTranslated = !!emailLog.isTranslated && emailLog.language !== 'en';
  const displaySubject = (isTranslated && activeTab === 'original')
    ? (emailLog.originalSubject || emailLog.subject)
    : emailLog.subject;
  const displayBody = (isTranslated && activeTab === 'original')
    ? (emailLog.originalBody || emailLog.body)
    : emailLog.body;

  const handleCopy = () => {
    const fullText = `Subject: ${displaySubject}\nTo: ${emailLog.recipientName} <${emailLog.recipientEmail}>\n\n${displayBody}`;
    navigator.clipboard.writeText(fullText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-2xl w-full flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center">
              <Mail className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-slate-100">{emailLog.templateName}</h3>
              <p className="text-[11px] text-slate-400">Trigger: {emailLog.triggerEvent}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Area */}
        <div className="p-6 overflow-y-auto space-y-4 text-xs">
          {/* Metadata Bar */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/80 pb-2">
              <div className="flex items-center gap-2 text-slate-700">
                <User className="w-3.5 h-3.5 text-slate-400" />
                <span className="font-semibold">Recipient:</span>
                <span className="font-bold text-slate-900">{emailLog.recipientName}</span>
                <span className="text-slate-500 font-mono">({emailLog.recipientEmail})</span>
              </div>
              <div className="flex items-center gap-1.5">
                {isTranslated && (
                  <span className="px-2 py-0.5 bg-purple-100 text-purple-800 font-bold rounded flex items-center gap-1 text-[10px]">
                    <Globe className="w-3 h-3" />
                    Translated ({emailLog.languageName || emailLog.language})
                  </span>
                )}
                <span className="px-2 py-0.5 bg-indigo-100 text-indigo-800 font-bold rounded text-[10px]">
                  {emailLog.recipientRole}
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500 pt-0.5">
              <div className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span>Dispatched: {new Date(emailLog.dispatchedAt).toLocaleString()}</span>
              </div>

              <div className="flex items-center gap-1 text-emerald-700 font-semibold bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded text-[10px]">
                <ShieldCheck className="w-3 h-3" />
                <span>Status: Dispatched & Delivered</span>
              </div>
            </div>
          </div>

          {/* Translation Toggle Tabs if Translated */}
          {isTranslated && (
            <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
              <span className="text-[11px] font-bold text-slate-500 flex items-center gap-1">
                <Languages className="w-3.5 h-3.5 text-purple-600" /> View Version:
              </span>
              <button
                type="button"
                onClick={() => setActiveTab('translated')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                  activeTab === 'translated'
                    ? 'bg-purple-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Translated ({emailLog.languageName || emailLog.language})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('original')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                  activeTab === 'original'
                    ? 'bg-slate-800 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Original (English)
              </button>
            </div>
          )}

          {/* Email Subject Line */}
          <div className="space-y-1">
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              {activeTab === 'translated' && isTranslated ? `Rendered Subject (${emailLog.languageName})` : 'Rendered Email Subject'}
            </label>
            <div className={`p-3 border font-extrabold text-xs rounded-xl shadow-2xs ${
              isTranslated && activeTab === 'translated'
                ? 'bg-purple-50/70 border-purple-200 text-purple-950'
                : 'bg-indigo-50/70 border-indigo-200 text-indigo-950'
            }`}>
              {displaySubject}
            </div>
          </div>

          {/* Full Rendered Email Body */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                {activeTab === 'translated' && isTranslated ? `Rendered Email Body (${emailLog.languageName})` : 'Rendered Email Body Text'}
              </label>
              <span className="text-[10px] text-slate-400 italic">
                {isTranslated && activeTab === 'translated' ? 'GCP Cloud Translation API' : 'Variables Evaluated & Processed'}
              </span>
            </div>

            <div className="p-4 bg-slate-900 text-slate-100 rounded-xl font-mono text-xs whitespace-pre-wrap leading-relaxed border border-slate-800 shadow-inner max-h-72 overflow-y-auto">
              {displayBody}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <button
            onClick={handleCopy}
            className="px-3.5 py-1.5 bg-white border border-slate-300 rounded-xl font-bold text-slate-700 hover:bg-slate-100 flex items-center gap-1.5 text-xs shadow-2xs"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4 text-slate-500" />}
            <span>{copied ? 'Copied to Clipboard' : 'Copy Full Email'}</span>
          </button>

          <button
            onClick={onClose}
            className="px-5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold text-xs"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
