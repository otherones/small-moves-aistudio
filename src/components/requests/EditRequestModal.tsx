import React, { useState, useEffect } from 'react';
import { X, Save, AlertTriangle, ShieldAlert, DollarSign, Check, Info } from 'lucide-react';
import { EmergencyRequest, PortalSettings } from '../../types';
import { INITIAL_SETTINGS } from '../../data/defaultSettings';
import { useAuth } from '../../context/AuthContext';

interface EditRequestModalProps {
  request: EmergencyRequest;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updated: Partial<EmergencyRequest>) => void;
  maxPerRequestAmount?: number;
  settings?: PortalSettings;
  isAdmin?: boolean;
}

export const EditRequestModal: React.FC<EditRequestModalProps> = ({
  request,
  isOpen,
  onClose,
  onSave,
  maxPerRequestAmount = 2000,
  settings,
  isAdmin: propIsAdmin,
}) => {
  const { activeRole, userProfile } = useAuth();
  const isAdmin = propIsAdmin ?? (activeRole === 'admin' || userProfile?.role === 'admin');

  const defaultReasons = (settings?.requestReasons && settings.requestReasons.length > 0)
    ? settings.requestReasons
    : (INITIAL_SETTINGS.requestReasons || [
        'Loss of Employment',
        'Housing Insecurity',
        'Death in Family',
        'Crime',
        'Severe illness or accident',
        'Fire, flood, or other natural disaster',
        'Other',
      ]);

  const currentReason = request.reason || request.category || defaultReasons[0];
  const isPredefined = defaultReasons.includes(currentReason) && currentReason !== 'Other';

  const [beneficiaryName, setBeneficiaryName] = useState(request.beneficiaryName);
  const [studentName, setStudentName] = useState(request.studentName || '');
  const [amount, setAmount] = useState<string | number>(request.amount);
  const [selectedReason, setSelectedReason] = useState<string>(isPredefined ? currentReason : 'Other');
  const [customReason, setCustomReason] = useState<string>(isPredefined ? '' : currentReason);
  const [additionalContext, setAdditionalContext] = useState(request.additionalContext || '');
  
  // Override Confirmation Popup state
  const [showOverrideConfirm, setShowOverrideConfirm] = useState(false);
  const [overrideReason, setOverrideReason] = useState('Administrative limit override approved by admin.');
  const [validationError, setValidationError] = useState<string | null>(null);

  // Synchronize form state whenever the modal opens or request changes
  useEffect(() => {
    if (isOpen) {
      const cur = request.reason || request.category || defaultReasons[0];
      const match = defaultReasons.includes(cur) && cur !== 'Other';
      setBeneficiaryName(request.beneficiaryName);
      setStudentName(request.studentName || '');
      setAmount(request.amount);
      setSelectedReason(match ? cur : 'Other');
      setCustomReason(match ? '' : cur);
      setAdditionalContext(request.additionalContext || '');
      setShowOverrideConfirm(false);
      setOverrideReason('Administrative limit override approved by admin.');
      setValidationError(null);
    }
  }, [isOpen, request, settings]);

  if (!isOpen) return null;

  const parsedAmount = Number(amount);
  const isOverLimit = !isNaN(parsedAmount) && parsedAmount > maxPerRequestAmount;

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    if (!amount || isNaN(parsedAmount) || parsedAmount <= 0) {
      setValidationError('Please enter a valid dollar amount greater than 0.');
      return;
    }

    const finalReason = selectedReason === 'Other' ? customReason.trim() : selectedReason;
    if (!finalReason) {
      setValidationError('Please select or specify a reason for this request.');
      return;
    }

    if (isOverLimit) {
      if (isAdmin) {
        // Show confirmation popup for admin override
        setShowOverrideConfirm(true);
        return;
      } else {
        setValidationError(`The maximum standard grant limit is $${maxPerRequestAmount.toLocaleString()} per request. Please contact a Small Moves administrator to request an override.`);
        return;
      }
    }

    // Amount is within standard limit
    executeSave(parsedAmount);
  };

  const executeSave = (finalAmount: number, overrideNote?: string) => {
    const finalReason = selectedReason === 'Other' ? customReason.trim() : selectedReason;
    
    let combinedContext = additionalContext.trim();
    if (overrideNote) {
      combinedContext = combinedContext
        ? `${combinedContext}\n\n[ADMIN OVERRIDE: ${overrideNote}]`
        : `[ADMIN OVERRIDE: ${overrideNote}]`;
    }

    onSave({
      beneficiaryName: beneficiaryName.trim(),
      studentName: studentName.trim() || undefined,
      amount: finalAmount,
      category: finalReason,
      reason: finalReason,
      additionalContext: combinedContext || undefined,
      ...(overrideNote ? { statusNote: `Amount updated to $${finalAmount.toLocaleString()} (Overridden by Admin)` } : {}),
    });

    setShowOverrideConfirm(false);
    onClose();
  };

  const handleConfirmOverride = () => {
    executeSave(parsedAmount, overrideReason.trim() || 'Limit override authorized by admin');
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
        <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden flex flex-col max-h-[90vh]">
          <div className="px-6 py-4 bg-[#0F172A] text-white flex items-center justify-between shrink-0">
            <div>
              <h3 className="text-base font-bold tracking-tight text-white" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
                Edit Request Details ({request.id})
              </h3>
              {isAdmin && (
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-400">
                  <ShieldAlert className="w-3 h-3" /> Admin Edit Permissions Active
                </span>
              )}
            </div>
            <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors cursor-pointer">
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleFormSubmit} noValidate className="p-6 space-y-4 text-xs overflow-y-auto">
            {validationError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                <span className="font-semibold">{validationError}</span>
              </div>
            )}

            <div>
              <label className="block font-bold text-slate-700 mb-1">Requestor</label>
              <div className="w-full px-3 py-2 border border-slate-200 bg-slate-50 text-slate-700 rounded-lg font-medium flex items-center justify-between">
                <span>
                  {request.submitterName || 'Unknown'}
                  {request.submitterRole ? (
                    <span className="text-slate-500 text-[11px] ml-1 capitalize">
                      ({request.submitterRole.replace('_', ' ')})
                    </span>
                  ) : null}
                </span>
                {request.submitterEmail && (
                  <span className="text-[11px] text-slate-500">{request.submitterEmail}</span>
                )}
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Beneficiary Name *</label>
              <input
                type="text"
                value={beneficiaryName}
                onChange={(e) => setBeneficiaryName(e.target.value)}
                required
                className="w-full px-3 py-2 border border-slate-300 rounded-lg font-medium focus:ring-2 focus:ring-[#0089B3] focus:border-[#0089B3] focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Student Name & Grade</label>
              <input
                type="text"
                value={studentName}
                onChange={(e) => setStudentName(e.target.value)}
                placeholder="e.g. Beth (4th Grade)"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg font-medium focus:ring-2 focus:ring-[#0089B3] focus:border-[#0089B3] focus:outline-hidden"
              />
            </div>

            {/* Amount Field */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block font-bold text-slate-700">
                  Amount ($ USD) *
                </label>
                <span className="text-[11px] text-slate-500">
                  Standard max: <strong className="text-slate-700">${maxPerRequestAmount.toLocaleString()}</strong>
                  {isAdmin && <span className="text-[#0089B3] ml-1 font-semibold">(Admin override enabled)</span>}
                </span>
              </div>

              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 font-bold">
                  $
                </div>
                <input
                  type="number"
                  min={1}
                  step="any"
                  placeholder="0"
                  value={amount}
                  onChange={(e) => {
                    let val = e.target.value;
                    if (val.length > 1 && val.startsWith('0') && !val.startsWith('0.')) {
                      val = val.replace(/^0+/, '') || '0';
                    }
                    setAmount(val);
                    setValidationError(null);
                  }}
                  required
                  className={`w-full pl-7 pr-3 py-2 border rounded-lg font-bold text-slate-900 focus:ring-2 focus:outline-hidden text-sm ${
                    isOverLimit
                      ? 'border-amber-400 bg-amber-50/50 focus:ring-amber-400 focus:border-amber-400'
                      : 'border-slate-300 focus:ring-[#0089B3] focus:border-[#0089B3]'
                  }`}
                />
              </div>

              {/* Dynamic limit warning / override prompt */}
              {isOverLimit && (
                <div className="mt-2 p-2.5 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2 text-amber-900">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div className="text-[11px]">
                    <p className="font-bold">
                      Amount exceeds standard limit of ${maxPerRequestAmount.toLocaleString()} (by +${(parsedAmount - maxPerRequestAmount).toLocaleString()})
                    </p>
                    <p className="text-amber-800 mt-0.5">
                      {isAdmin
                        ? 'As an Administrator, you will be prompted with a confirmation dialog to authorize this override upon saving.'
                        : 'Only administrators are authorized to approve amounts exceeding the standard limit.'}
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Reason for Request *</label>
              <select
                value={selectedReason}
                onChange={(e) => setSelectedReason(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg font-medium focus:ring-2 focus:ring-[#0089B3] focus:border-[#0089B3] focus:outline-hidden"
              >
                {defaultReasons.map((r, i) => (
                  <option key={i} value={r}>{r}</option>
                ))}
              </select>
              {selectedReason === 'Other' && (
                <input
                  type="text"
                  placeholder="Explain the reason for request..."
                  value={customReason}
                  onChange={(e) => setCustomReason(e.target.value)}
                  required
                  className="w-full px-3 py-2 mt-2 border border-slate-300 rounded-lg font-medium focus:ring-2 focus:ring-[#0089B3] focus:border-[#0089B3] focus:outline-hidden"
                />
              )}
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Additional Context</label>
              <textarea
                rows={3}
                value={additionalContext}
                onChange={(e) => setAdditionalContext(e.target.value)}
                placeholder="Provide any relevant context or background notes..."
                className="w-full px-3 py-2 border border-slate-300 rounded-lg font-medium focus:ring-2 focus:ring-[#0089B3] focus:border-[#0089B3] focus:outline-hidden"
              />
            </div>

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
                className={`px-5 py-2 text-white rounded-xl font-bold shadow-md flex items-center gap-2 transition-colors cursor-pointer ${
                  isOverLimit && isAdmin
                    ? 'bg-amber-600 hover:bg-amber-700 shadow-amber-600/20'
                    : 'bg-[#0089B3] hover:bg-[#007399] shadow-[#0089B3]/20'
                }`}
              >
                {isOverLimit && isAdmin ? (
                  <>
                    <ShieldAlert className="w-4 h-4" />
                    Review & Authorize Override
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Save Changes
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Admin Override Confirmation Popup */}
      {showOverrideConfirm && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl border border-amber-300 max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 bg-amber-500 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-5 h-5" />
                <h3 className="text-base font-bold tracking-tight" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
                  Confirm Payout Limit Override
                </h3>
              </div>
              <button
                onClick={() => setShowOverrideConfirm(false)}
                className="text-amber-100 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-xl space-y-3">
                <div className="flex items-center justify-between border-b border-amber-200 pb-2">
                  <span className="text-amber-900 font-semibold">Standard Maximum Limit:</span>
                  <span className="font-bold text-slate-700 font-mono">${maxPerRequestAmount.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between border-b border-amber-200 pb-2">
                  <span className="text-amber-900 font-semibold">Requested Amount:</span>
                  <span className="text-base font-extrabold text-amber-700 font-mono">${parsedAmount.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-amber-900 font-semibold">Variance:</span>
                  <span className="font-bold text-amber-600 font-mono">+${(parsedAmount - maxPerRequestAmount).toLocaleString()} over policy</span>
                </div>
              </div>

              <div className="space-y-1 text-slate-600">
                <p className="font-bold text-slate-800">
                  Beneficiary: <span className="font-normal">{beneficiaryName} ({request.id})</span>
                </p>
                <p className="text-[11px] leading-relaxed">
                  As an authorized administrator, you are granting a policy exception to disburse funds above the standard ${maxPerRequestAmount.toLocaleString()} threshold.
                </p>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Administrative Override Reason / Justification
                </label>
                <input
                  type="text"
                  value={overrideReason}
                  onChange={(e) => setOverrideReason(e.target.value)}
                  placeholder="e.g. Board authorized emergency displacement grant"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg font-medium focus:ring-2 focus:ring-amber-500 focus:border-amber-500 focus:outline-hidden"
                />
              </div>

              <div className="flex gap-2 justify-end pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowOverrideConfirm(false)}
                  className="px-4 py-2 border border-slate-300 rounded-xl font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  Back to Edit
                </button>
                <button
                  type="button"
                  onClick={handleConfirmOverride}
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold shadow-md shadow-amber-600/20 flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  Authorize & Save ${parsedAmount.toLocaleString()}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
