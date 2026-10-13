import React, { useState, useEffect } from 'react';
import { X, AlertTriangle, Check, Ban } from 'lucide-react';
import { EmergencyRequest } from '../../types';

interface CancelRequestModalProps {
  request: EmergencyRequest;
  isOpen: boolean;
  onClose: () => void;
  onConfirmCancel: (reason?: string) => void;
  isAdmin?: boolean;
}

const CANCEL_PRESET_REASONS = [
  'Family situation resolved / assistance no longer needed',
  'Duplicate emergency request submitted',
  'Alternative school or community support secured',
  'Canceled per school / principal request',
  'Submitted in error / incorrect request parameters',
];

export const CancelRequestModal: React.FC<CancelRequestModalProps> = ({
  request,
  isOpen,
  onClose,
  onConfirmCancel,
  isAdmin = false,
}) => {
  const [cancelReason, setCancelReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setCancelReason('');
      setIsSubmitting(false);
    }
  }, [isOpen, request?.id]);

  if (!isOpen || !request) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    const finalReason = cancelReason.trim()
      ? cancelReason.trim()
      : isAdmin
      ? 'Request canceled by administrator. Reserved budget released.'
      : 'Request canceled by school user. Reserved budget released.';
    onConfirmCancel(finalReason);
    setIsSubmitting(false);
    onClose();
  };

  const handleSelectPreset = (preset: string) => {
    if (!cancelReason) {
      setCancelReason(preset);
    } else if (!cancelReason.includes(preset)) {
      setCancelReason(`${cancelReason}. ${preset}`);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-6 py-4 bg-[#0F172A] text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-rose-500/20 text-rose-400 rounded-lg">
              <Ban className="w-4 h-4" />
            </div>
            <div>
              <h3
                className="text-base font-bold tracking-tight text-white"
                style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
              >
                Confirm Request Cancellation
              </h3>
              <p className="text-[11px] text-slate-400">Request {request.id}</p>
            </div>
          </div>
          <button
            type="button"
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
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Reserved Amount</span>
            <span className="font-extrabold text-slate-900 text-sm">${request.amount.toLocaleString()}</span>
          </div>
        </div>

        {/* Financial & Warning Notice */}
        <div className="px-6 pt-4 pb-1">
          <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-950 flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-bold text-rose-900">Are you sure you want to cancel this emergency request?</p>
              <p className="text-rose-800/90 text-[11px] leading-relaxed">
                Canceling this request will update its status to <strong className="font-bold">Canceled</strong> and
                immediately release the <strong className="font-bold">${request.amount.toLocaleString()}</strong> reserved
                grant back to <strong className="font-bold">{request.schoolName}</strong>'s available budget.
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 pt-3 space-y-4 text-xs">
          {/* Quick Presets */}
          <div>
            <label className="block font-bold text-slate-700 mb-1.5">
              Cancellation Reason Presets <span className="text-slate-400 font-normal">(Click to select)</span>
            </label>
            <div className="flex flex-wrap gap-1.5">
              {CANCEL_PRESET_REASONS.map((preset) => {
                const isSelected = cancelReason.includes(preset);
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

          {/* Reason Textarea */}
          <div>
            <label className="block font-bold text-slate-700 mb-1">
              Reason / Cancellation Notes <span className="text-slate-400 font-normal">(Recorded in activity history)</span>
            </label>
            <textarea
              rows={2}
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="Provide a brief explanation for canceling this request (optional)..."
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-hidden focus:border-rose-500 focus:ring-1 focus:ring-rose-500 focus:bg-white resize-none"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-200 hover:bg-slate-50 rounded-xl text-xs font-semibold text-slate-700 transition-colors cursor-pointer"
            >
              Keep Request
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <Ban className="w-3.5 h-3.5" />
              {isSubmitting ? 'Canceling...' : 'Yes, Cancel Request'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
