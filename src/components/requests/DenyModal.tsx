import React, { useState } from 'react';
import { X, XCircle, AlertTriangle, FileText, Check } from 'lucide-react';
import { EmergencyRequest } from '../../types';

interface DenyModalProps {
  request: EmergencyRequest;
  isOpen: boolean;
  onClose: () => void;
  onConfirmDeny: (denialReason: string) => void;
}

const PRESET_REASONS = [
  'Ineligible expense category under PEF guidelines',
  'Exceeds maximum allowable grant limit per family',
  'Duplicate request already submitted or funded',
  'Alternative school or district relief assistance provided',
  'Insufficient documentation / clarification provided',
];

export const DenyModal: React.FC<DenyModalProps> = ({
  request,
  isOpen,
  onClose,
  onConfirmDeny,
}) => {
  const [denialReason, setDenialReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanReason = denialReason.trim();
    if (!cleanReason) return;

    setIsSubmitting(true);
    onConfirmDeny(cleanReason);
    setIsSubmitting(false);
    onClose();
  };

  const handleSelectPreset = (preset: string) => {
    if (!denialReason) {
      setDenialReason(preset);
    } else if (!denialReason.includes(preset)) {
      setDenialReason(`${denialReason}. ${preset}`);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-[#0F172A] text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-rose-500/20 text-rose-400 rounded-lg">
              <XCircle className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold tracking-tight text-white" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>Deny Emergency Fund Request</h3>
              <p className="text-[11px] text-slate-400">Request {request.id}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Request Context Summary */}
        <div className="px-6 py-3.5 bg-slate-50 border-b border-slate-100 flex items-center justify-between text-xs">
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Beneficiary & School</span>
            <span className="font-bold text-slate-800">{request.beneficiaryName}</span>
            <span className="text-slate-500 ml-1.5">({request.schoolName})</span>
          </div>
          <div className="text-right">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Requested Amount</span>
            <span className="font-extrabold text-slate-900">${request.amount.toLocaleString()}</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          {/* Presets */}
          <div>
            <label className="block font-bold text-slate-700 mb-1.5">
              Quick Reason Presets <span className="text-slate-400 font-normal">(Click to insert)</span>
            </label>
            <div className="flex flex-wrap gap-1.5">
              {PRESET_REASONS.map((preset) => {
                const isSelected = denialReason.includes(preset);
                return (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => handleSelectPreset(preset)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-medium border text-left transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-rose-50 border-rose-300 text-rose-800 font-semibold'
                        : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    {isSelected && <Check className="w-3 h-3 inline mr-1 text-rose-600" />}
                    {preset}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Denial Reason Textarea */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block font-bold text-slate-700">
                Denial Reason / Note <span className="text-rose-500">*</span>
              </label>
              <span className="text-[10px] text-slate-400">
                {denialReason.trim().length} chars
              </span>
            </div>
            <textarea
              rows={4}
              value={denialReason}
              onChange={(e) => setDenialReason(e.target.value)}
              placeholder="State clearly why this request cannot be approved. This explanation will be included in the email notice to the principal and recorded in the audit activity log."
              required
              className="w-full px-3 py-2 border border-slate-300 rounded-xl font-medium focus:outline-hidden focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 text-slate-800 leading-relaxed"
            />
          </div>

          {/* Info Notice */}
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 flex items-start gap-2 text-[11px]">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-0.5 leading-relaxed">
              <p className="font-bold">Notice to Principal & Audit Log</p>
              <p className="text-amber-800">
                The submitter ({request.submitterEmail}) will receive a status notification email with this reason. Any reserved school budget for this request will be released.
              </p>
            </div>
          </div>

          {/* Modal Footer Actions */}
          <div className="flex gap-2 justify-end pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-300 rounded-xl font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!denialReason.trim() || isSubmitting}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-bold rounded-xl shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <XCircle className="w-4 h-4" />
              {isSubmitting ? 'Processing...' : 'Confirm Denial'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
