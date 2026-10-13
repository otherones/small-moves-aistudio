import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Send, ShieldCheck, AlertCircle, DollarSign, CreditCard, ChevronDown, ChevronUp, FileText, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { School, EmergencyRequest, PortalSettings } from '../../types';
import { MouModal } from "../../components/common/MouModal";
import { PendingAssignmentPage } from '../auth/PendingAssignmentPage';
import { getSchoolAvailableBudget } from '../../utils/budgetUtils';
import { getCurrentSchoolYear } from '../../utils/schoolYear';

interface NewRequestProps {
  schools: School[];
  requests?: EmergencyRequest[];
  onCreateRequest: (newReq: Partial<EmergencyRequest>) => void;
  maxPerRequestAmount?: number;
  settings: PortalSettings;
  onUpdateSchool?: (schoolId: string, updates: Partial<School>) => void;
}

export const NewRequest: React.FC<NewRequestProps> = ({
  schools,
  requests = [],
  onCreateRequest,
  maxPerRequestAmount = 2000,
  settings,
  onUpdateSchool,
}) => {
  const { userProfile, activeSchoolId } = useAuth();
  const navigate = useNavigate();
  const currentSY = getCurrentSchoolYear(settings);

  const school = schools.find(
    (s) => s.id === activeSchoolId || userProfile?.schoolIds?.includes(s.id)
  ) || (userProfile?.role === 'admin' ? schools[0] : undefined);

  if (!school || userProfile?.role === 'unassigned') {
    return <PendingAssignmentPage />;
  }

  const isAdmin = userProfile?.role === 'admin';
  const isPrincipal = userProfile?.role === 'principal';
  const isMouSigned = Boolean(school?.currentMouSigned);

  const defaultReasons = settings.requestReasons || [];

  const [beneficiaryName, setBeneficiaryName] = useState('');
  const [studentName, setStudentName] = useState('');
  const [amount, setAmount] = useState<string>('');
  const [reasonForRequest, setReasonForRequest] = useState(defaultReasons[0] || 'Housing Insecurity');
  const [customReasonForRequest, setCustomReasonForRequest] = useState('');
  
  const [additionalContext, setAdditionalContext] = useState('');
  const [mouAcknowledged, setMouAcknowledged] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showMouModal, setShowMouModal] = useState(false);

  // Hard route guard: Block unverified / unsigned schools from reaching request form
  if (!isMouSigned && !isAdmin) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12 space-y-6">
        <div>
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Link>
        </div>

        <div className="bg-white border border-amber-200 rounded-3xl p-6 sm:p-8 shadow-xl space-y-6 text-center">
          <div className="w-14 h-14 rounded-2xl bg-amber-50 border border-amber-200 text-amber-700 flex items-center justify-center mx-auto shadow-xs">
            <FileText className="w-7 h-7" />
          </div>

          <div className="space-y-2">
            <span className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-800 border border-amber-300">
              MOU Execution Required
            </span>
            <h2
              className="text-2xl font-bold text-slate-900 tracking-tight"
              style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
            >
              Annual Agreement Must Be Executed
            </h2>
            <p className="text-xs text-slate-600 max-w-lg mx-auto leading-relaxed">
              Before emergency relief fund requests can be created for{' '}
              <strong className="text-slate-900">{school.name}</strong>, the annual Principal Emergency Fund Memorandum of Understanding (MOU) must be reviewed and executed.
            </p>
          </div>

          <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl text-left text-xs space-y-2 max-w-md mx-auto text-slate-600">
            <div className="flex justify-between border-b border-slate-200/60 pb-1.5">
              <span className="text-slate-500">School:</span>
              <span className="font-semibold text-slate-900">{school.name}</span>
            </div>
            <div className="flex justify-between border-b border-slate-200/60 pb-1.5">
              <span className="text-slate-500">Designated Principal:</span>
              <span className="font-medium text-slate-800">{school.principalName || 'School Principal'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">MOU Status:</span>
              <span className="font-bold text-amber-700">Pending Execution</span>
            </div>
          </div>

          {isPrincipal ? (
            <div className="space-y-3 pt-2 max-w-md mx-auto">
              <button
                type="button"
                onClick={() => setShowMouModal(true)}
                className="w-full py-3 bg-[#0089B3] hover:bg-[#007399] text-white font-bold rounded-xl text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md shadow-[#0089B3]/20 transition-all cursor-pointer"
              >
                <FileText className="w-4 h-4" />
                Review & Execute Annual MOU Now
              </button>
              <p className="text-[11px] text-slate-500">
                Signing takes less than 2 minutes and will immediately unlock emergency request submissions.
              </p>
            </div>
          ) : (
            <div className="space-y-3 pt-2 max-w-md mx-auto">
              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-[11px] text-amber-900 leading-relaxed text-left">
                ℹ️ <strong>Action Needed by Principal:</strong> As an authorized secondary contact, you cannot execute the master MOU. Please contact your principal (<strong>{school.principalName || 'Principal'}</strong>{school.principalEmail ? ` at ${school.principalEmail}` : ''}) to log in and sign the annual agreement.
              </div>
              <Link
                to="/dashboard"
                className="inline-flex items-center justify-center px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl text-xs transition-colors"
              >
                Return to School Dashboard
              </Link>
            </div>
          )}
        </div>

        {/* MOU Modal when principal executes right on this screen */}
        {showMouModal && (
          <MouModal
            school={school}
            isOpen={showMouModal}
            onClose={() => setShowMouModal(false)}
            onSignMou={(data) => {
              if (onUpdateSchool) {
                onUpdateSchool(school.id, {
                  currentMouSigned: true,
                  currentMouSignedBy: data.signedByName,
                  currentMouSignedByTitle: data.signedByTitle || 'Principal',
                  currentMouSignedAt: new Date().toISOString(),
                  currentMouVersionId: data.mouVersionId,
                  status: 'active',
                });
              }
              setShowMouModal(false);
            }}
            readOnly={!isPrincipal}
            maxPerRequestAmount={maxPerRequestAmount}
            mouVersions={settings?.mouVersions}
            currentMouVersionId={settings?.currentMouVersionId}
          />
        )}
      </div>
    );
  }

  const maxCap = maxPerRequestAmount;
  const availableBudget = requests.length > 0
    ? getSchoolAvailableBudget(school, requests, currentSY)
    : school.budgetAvailable;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    // Hard form guard against unsigned MOU
    if (!school.currentMouSigned && !isAdmin) {
      setErrorMsg('Cannot submit emergency request: The Annual School MOU must be executed first.');
      return;
    }

    const parsedAmount = Number(amount);
    if (!amount.trim() || isNaN(parsedAmount) || parsedAmount <= 0) {
      setErrorMsg('Please enter a valid amount greater than $0.');
      return;
    }
    if (parsedAmount > maxCap) {
      setErrorMsg(`Individual requests cannot exceed the $${maxCap.toLocaleString()} maximum cap.`);
      return;
    }
    if (parsedAmount > availableBudget) {
      setErrorMsg(`Requested amount ($${parsedAmount.toLocaleString()}) exceeds the school's available budget ($${availableBudget.toLocaleString()}).`);
      return;
    }
    if (!mouAcknowledged) {
      setErrorMsg('You must acknowledge MOU compliance before submitting.');
      return;
    }

    const finalReason = reasonForRequest === 'Other' ? customReasonForRequest : reasonForRequest;

    if (!finalReason.trim()) {
      setErrorMsg('Please provide a Reason for Request.');
      return;
    }

    // Generate collision-free sequential Request ID
    const existingIds = new Set(requests.map((r) => r.id));
    let maxNum = 2000;
    for (const r of requests) {
      const match = r.id.match(/^REQ-2026-(\d+)$/);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxNum && num < 90000) {
          maxNum = num;
        }
      }
    }
    let uniqueId = `REQ-2026-${maxNum + 1}`;
    while (existingIds.has(uniqueId)) {
      maxNum++;
      uniqueId = `REQ-2026-${maxNum + 1}`;
    }

    const newReq: Partial<EmergencyRequest> = {
      id: uniqueId,
      schoolId: school.id,
      schoolName: school.name,
      submitterId: userProfile.uid,
      submitterName: userProfile.displayName,
      submitterEmail: userProfile.email,
      submitterRole: userProfile.role as 'principal' | 'additional_contact',
      beneficiaryName: beneficiaryName.trim(),
      studentName: studentName.trim() || undefined,
      amount: parsedAmount,
      category: finalReason.trim(),
      reason: finalReason.trim(),
      additionalContext: additionalContext.trim() || undefined,
      status: 'in_review',
      mouAcknowledged: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    onCreateRequest(newReq);
    navigate('/dashboard?submitted=true');
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      {/* Back Button & Title */}
      <div>
        <Link
          to="/dashboard"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-800 mb-3"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </Link>
        <h1 className="text-3xl font-bold text-[#0F172A] tracking-tight" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>Submit Emergency Fund Request</h1>
        <p className="text-xs text-slate-500 mt-1">
          Submitting request on behalf of <strong className="text-slate-800">{school.name}</strong> (Available Budget: ${availableBudget.toLocaleString()})
        </p>
      </div>

      {errorMsg && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-center gap-3 text-rose-800 text-xs font-bold">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Main Card Form */}
      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 md:p-8 space-y-6 text-xs">
        {/* Section 1: People */}
        <div className="space-y-4">
          <div className="border-b border-slate-100 pb-2">
            <h3 className="text-sm font-bold text-slate-900">1. People Details</h3>
            <p className="text-[11px] text-slate-500">Beneficiary is the person who will receive the financial grant.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Beneficiary Name (Parent / Household) *</label>
              <input
                type="text"
                placeholder="e.g. Maria Rodriguez"
                value={beneficiaryName}
                onChange={(e) => setBeneficiaryName(e.target.value)}
                required
                className="w-full px-3 py-2 border border-slate-300 rounded-xl font-medium focus:outline-hidden focus:border-[#0089B3] focus:ring-1 focus:ring-[#0089B3]"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Enrolled Student Name & Grade (Optional)</label>
              <input
                type="text"
                placeholder="e.g. Mateo Rodriguez (Grade 11)"
                value={studentName}
                onChange={(e) => setStudentName(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl font-medium focus:outline-hidden focus:border-[#0089B3] focus:ring-1 focus:ring-[#0089B3]"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Request Details */}
        <div className="space-y-4">
          <div className="border-b border-slate-100 pb-2">
            <h3 className="text-sm font-bold text-slate-900">2. Request Amount & Category</h3>
            <p className="text-[11px] text-slate-500">Maximum cap per request: ${maxCap.toLocaleString()}.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Amount Requested ($) *</label>
              <div className="relative">
                <DollarSign className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="number"
                  min={1}
                  max={maxCap}
                  placeholder="0"
                  value={amount}
                  onChange={(e) => {
                    let val = e.target.value;
                    if (val.length > 1 && val.startsWith('0') && !val.startsWith('0.')) {
                      val = val.replace(/^0+/, '') || '0';
                    }
                    setAmount(val);
                  }}
                  required
                  className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-xl font-bold text-slate-900 text-sm focus:outline-hidden focus:border-[#0089B3] focus:ring-1 focus:ring-[#0089B3]"
                />
              </div>
              <p className="text-[10px] text-slate-400 mt-1">Remaining school budget: ${availableBudget.toLocaleString()}</p>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Reason for Request *</label>
              <select
                value={reasonForRequest}
                onChange={(e) => setReasonForRequest(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl font-medium focus:outline-hidden focus:border-[#0089B3] focus:ring-1 focus:ring-[#0089B3]"
              >
                {defaultReasons.map((r, i) => (
                  <option key={i} value={r}>{r}</option>
                ))}
              </select>
              {reasonForRequest === 'Other' && (
                <input
                  type="text"
                  placeholder="Explain the reason for request..."
                  value={customReasonForRequest}
                  onChange={(e) => setCustomReasonForRequest(e.target.value)}
                  required
                  className="w-full px-3 py-2 mt-2 border border-slate-300 rounded-xl font-medium focus:outline-hidden focus:border-[#0089B3] focus:ring-1 focus:ring-[#0089B3]"
                />
              )}
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Additional Context & Circumstances</label>
            <textarea
              rows={3}
              placeholder="Provide any additional relevant details to help administrators review..."
              value={additionalContext}
              onChange={(e) => setAdditionalContext(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-xl font-medium focus:outline-hidden focus:border-[#0089B3] focus:ring-1 focus:ring-[#0089B3]"
            />
          </div>
        </div>

        {/* Section 3: Compliance & MOU */}
        <div className="p-4 bg-[#EDF7FC]/60 border border-[#0089B3]/20 rounded-2xl space-y-3">
          <div className="flex items-center gap-2 font-bold text-slate-900">
            <ShieldCheck className="w-4 h-4 text-[#0089B3]" />
            <span>Compliance Acknowledgement</span>
          </div>

          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={mouAcknowledged}
              onChange={(e) => setMouAcknowledged(e.target.checked)}
              required
              className="mt-0.5 rounded border-slate-300 text-[#0089B3] focus:ring-[#0089B3] w-4 h-4 cursor-pointer accent-[#0089B3]"
            />
            <span className="text-xs text-slate-700 font-medium leading-relaxed">
              I confirm this request complies with the active{' '}
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  setShowMouModal(true);
                }}
                className="text-[#0089B3] underline font-bold cursor-pointer hover:text-[#007399]"
              >
                Memorandum of Understanding (MOU)
              </button>
              {' '}and directly supports student basic needs or household emergency relief.
            </span>
          </label>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
          <Link
            to="/dashboard"
            className="px-5 py-2.5 border border-slate-300 rounded-xl font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={!mouAcknowledged}
            className="px-6 py-2.5 bg-[#0089B3] hover:bg-[#007399] disabled:opacity-50 text-white font-bold rounded-xl text-xs shadow-md shadow-[#0089B3]/20 flex items-center gap-2 transition-colors cursor-pointer"
          >
            <Send className="w-4 h-4" />
            Submit Emergency Request
          </button>
        </div>
      </form>

      {/* MOU Modal */}
      <MouModal
        school={school}
        isOpen={showMouModal}
        onClose={() => setShowMouModal(false)}
        onSignMou={() => {}}
        readOnly
        maxPerRequestAmount={maxPerRequestAmount}
        mouVersions={settings?.mouVersions}
        currentMouVersionId={settings?.currentMouVersionId}
      />
    </div>
  );
};
