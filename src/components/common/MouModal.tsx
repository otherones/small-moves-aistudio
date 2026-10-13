import React, { useState } from 'react';
import { FileText, CheckCircle2, ShieldCheck, X, Sparkles, FileCode } from 'lucide-react';
import { School, MouVersion } from '../../types';
import ReactMarkdown from 'react-markdown';

interface MouModalProps {
  school: School;
  isOpen: boolean;
  mouVersions?: MouVersion[];
  currentMouVersionId?: string;
  onClose: () => void;
  onSignMou: (data: { signedByName: string; signedByTitle?: string; mouVersionId?: string }) => void;
  readOnly?: boolean;
  maxPerRequestAmount?: number;
}

export const MouModal: React.FC<MouModalProps> = ({
  school,
  isOpen,
  onClose,
  onSignMou,
  readOnly = false,
  maxPerRequestAmount = 2000,
  mouVersions = [],
  currentMouVersionId,
}) => {
  const [signerName, setSignerName] = useState(school.principalName || '');
  const [signerTitle, setSignerTitle] = useState('Principal');
  const [agreed, setAgreed] = useState(false);
  const [signing, setSigning] = useState(false);

  const overrideVersion = school.customMouVersionId
    ? mouVersions.find((v) => v.id === school.customMouVersionId)
    : undefined;
  const activeVersionId =
    school.customMouVersionId ||
    (school.currentMouSigned && school.currentMouVersionId ? school.currentMouVersionId : currentMouVersionId);
  const displayMou = overrideVersion || mouVersions.find((v) => v.id === activeVersionId) || mouVersions[0];

  const hasCustomMou = Boolean(
    school.hasCustomMou ||
    school.customMouVersionId ||
    (school.hasCustomMou && school.customMouContent?.trim())
  );

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!agreed || !signerName.trim() || !signerTitle.trim()) return;
    setSigning(true);
    setTimeout(() => {
      onSignMou({
        signedByName: signerName.trim(),
        signedByTitle: signerTitle.trim(),
        mouVersionId: displayMou?.id || 'mou-pef-agreement-2024',
      });
      setSigning(false);
      onClose();
    }, 400);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-slate-100 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
              hasCustomMou
                ? 'bg-[#EDF7FC] border border-[#0089B3]/30 text-[#0089B3]'
                : 'bg-[#EDF7FC] border border-[#0089B3]/30 text-[#0089B3]'
            }`}>
              {hasCustomMou ? <Sparkles className="w-5 h-5" /> : <ShieldCheck className="w-5 h-5" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-semibold text-white">Annual Memorandum of Understanding (MOU)</h3>
                {hasCustomMou && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#EDF7FC] text-[#006E8F] border border-[#0089B3]/30">
                    MOU Override
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 font-normal">{school.name} · Academic Year 2026–2027</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-4 text-xs text-slate-700 leading-relaxed font-normal">
          {hasCustomMou && (
            <div className="p-3 bg-[#EDF7FC] border border-[#0089B3]/30 rounded-xl flex items-start gap-2.5 text-[#006E8F] mb-2">
              <Sparkles className="w-4 h-4 text-[#0089B3] shrink-0 mt-0.5" />
              <div className="text-xs">
                <p className="font-semibold text-[#006E8F]">MOU Version Override Active</p>
                <p className="text-[11px] text-slate-600">
                  This school is assigned MOU version: <strong>{displayMou?.name || 'Non-Default Version'}</strong>.
                  {school.customMouReason && <span className="italic block mt-0.5">Override Note: "{school.customMouReason}"</span>}
                </p>
              </div>
            </div>
          )}

          {displayMou?.content ? (
            <div className="prose prose-xs max-w-none text-slate-700 leading-relaxed space-y-2 bg-slate-50/70 p-4 rounded-xl border border-slate-200">
              <ReactMarkdown>{displayMou.content}</ReactMarkdown>
            </div>
          ) : school.customMouContent ? (
            <div className="prose prose-xs max-w-none text-slate-700 leading-relaxed space-y-2 bg-slate-50/70 p-4 rounded-xl border border-slate-200">
              <ReactMarkdown>{school.customMouContent}</ReactMarkdown>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 space-y-4">
              <div className="space-y-2">
                <h4 className="text-sm font-semibold text-slate-800">1. Program Overview &amp; Purpose</h4>
                <p>
                  The Principal Emergency Fund (PEF) provided by Small Moves provides discretionary emergency financial
                  grants to support students and families experiencing immediate financial hardship or crisis affecting basic
                  needs, housing stability, health, or school attendance.
                </p>
              </div>

              <div className="pt-3 space-y-2">
                <h4 className="text-sm font-semibold text-slate-800">2. Allocation &amp; Spending Guidelines</h4>
                <ul className="list-disc pl-5 space-y-1 text-slate-600">
                  <li>Individual grants may not exceed ${maxPerRequestAmount.toLocaleString()} per request without prior Small Moves board approval.</li>
                  <li>Grants must directly benefit students enrolled at {school.name} or their immediate household.</li>
                  <li>Funds shall not be used for school operational expenses, staff bonuses, or religious activities.</li>
                </ul>
              </div>

              <div className="pt-3 space-y-2">
                <h4 className="text-sm font-semibold text-slate-800">3. Governance &amp; Reporting</h4>
                <p>
                  The Principal ({school.principalName || 'Principal'}) or designated contact agrees to log all payout details
                  accurately, verify beneficiary identity, and ensure compliance with confidential reporting standards.
                </p>
              </div>
            </div>
          )}

          {school.currentMouSigned && (
            <div className="pt-3 p-3 bg-[#F2FCE2] border border-[#6EBF00]/30 rounded-xl flex items-center gap-3 text-[#2D5F00]">
              <CheckCircle2 className="w-5 h-5 text-[#2D5F00] shrink-0" />
              <div>
                <p className="font-semibold text-xs text-[#2D5F00]">MOU Currently Executed &amp; Active</p>
                <p className="text-[11px] text-[#2D5F00]/90">
                  Signed by {school.currentMouSignedBy || school.principalName}
                  {school.currentMouSignedByTitle ? ` (${school.currentMouSignedByTitle})` : ''} on{' '}
                  {school.currentMouSignedAt
                    ? new Date(school.currentMouSignedAt).toLocaleDateString()
                    : '2025-08-15'}
                  {hasCustomMou ? (
                    <span className="block mt-0.5 text-[10px] text-[#006E8F] font-medium">
                      Agreement Type: Non-Default MOU Override ({displayMou?.name || 'Custom'})
                    </span>
                  ) : school.currentMouVersionId ? (
                    <span className="block mt-0.5 text-[10px] text-[#2D5F00]/70">
                      Version: {mouVersions.find((v) => v.id === school.currentMouVersionId)?.name || school.currentMouVersionId}
                    </span>
                  ) : null}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Signing Footer Form */}
        {!(readOnly || school.currentMouSigned) ? (
          <form onSubmit={handleSubmit} className="p-6 bg-slate-50 border-t border-slate-200 space-y-4">
            <label className="flex items-start gap-3 p-3 bg-white border border-slate-200 rounded-xl cursor-pointer shadow-2xs">
              <input
                type="checkbox"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                className="mt-0.5 rounded border-slate-300 text-[#0089B3] focus:ring-[#0089B3] w-4 h-4 cursor-pointer shrink-0"
              />
              <span className="text-xs text-slate-700 font-normal leading-relaxed">
                I hereby confirm and certify that I am authorized to execute this agreement on behalf of <strong>{school.name}</strong> and accept all PEF governance conditions.
              </span>
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Electronic Signature Full Name *
                </label>
                <input
                  type="text"
                  value={signerName}
                  onChange={(e) => setSignerName(e.target.value)}
                  placeholder="e.g. Principal Sarah Jenkins"
                  required
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-normal text-slate-900 focus:outline-hidden focus:border-[#0089B3] focus:ring-1 focus:ring-[#0089B3]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Official Title / Role *
                </label>
                <input
                  type="text"
                  value={signerTitle}
                  onChange={(e) => setSignerTitle(e.target.value)}
                  placeholder="e.g. Principal, Head of School"
                  required
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-normal text-slate-900 focus:outline-hidden focus:border-[#0089B3] focus:ring-1 focus:ring-[#0089B3]"
                />
              </div>
            </div>

            <div className="flex gap-2 justify-end pt-1">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-medium text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                Close
              </button>
              <button
                type="submit"
                disabled={!agreed || !signerName.trim() || !signerTitle.trim() || signing}
                className="px-5 py-2 bg-[#0089B3] hover:bg-[#006E8F] disabled:opacity-50 text-white rounded-xl text-xs font-medium shadow-xs flex items-center gap-2 cursor-pointer transition-colors"
              >
                {signing ? 'Signing...' : 'Sign MOU Agreement'}
              </button>
            </div>
          </form>
        ) : (
          <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs">
            <div className="text-slate-500">
              <p className="italic mb-1 font-normal">
                {!school.currentMouSigned
                  ? `The Annual MOU Agreement requires electronic execution by the designated School Principal (${school.principalName || 'Principal'}).`
                  : 'This Memorandum of Understanding is currently executed and on file for the active school year.'}
              </p>
              {hasCustomMou ? (
                <p className="text-[10px] text-[#6A1CB8] font-medium">
                  Custom School Agreement ({school.name})
                </p>
              ) : displayMou ? (
                <p className="text-[10px] text-slate-400 font-mono font-normal">
                  MOU Version: {displayMou.name} ({displayMou.id})
                </p>
              ) : null}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white font-medium rounded-xl text-xs shrink-0 cursor-pointer"
            >
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
