import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, CreditCard, Send, Lock, AlertCircle, CheckCircle2, Globe, Languages, Building2 } from 'lucide-react';
import { EmergencyRequest, RequestPayoutDetails, PortalSettings, School } from '../../types';
import { LanguageSelect } from '../../components/common/LanguageSelect';
import { getLanguageByCode } from '../../data/languages';
import { INITIAL_SETTINGS } from '../../data/defaultSettings';
import { useAuth } from '../../context/AuthContext';

interface EnterPayoutDetailsProps {
  requests: EmergencyRequest[];
  onSavePayout: (requestId: string, payoutDetails: RequestPayoutDetails) => void;
  settings?: PortalSettings;
  schools?: School[];
}

export const EnterPayoutDetails: React.FC<EnterPayoutDetailsProps> = ({
  requests,
  onSavePayout,
  settings,
  schools = [],
}) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { activeSchoolId } = useAuth();

  const request = requests.find((r) => r.id === id);

  // Resolve associated school address
  const school = request
    ? (schools.find(s => s.id === request.schoolId) ||
       schools.find(s => s.id === activeSchoolId) ||
       schools[0])
    : undefined;

  const formatSchoolAddress = (sch?: School): string => {
    if (!sch) return '';
    const parts = [sch.name, sch.address, `${sch.city}, ${sch.state} ${sch.zip}`.trim()].filter(Boolean);
    return parts.join('\n');
  };

  const defaultFundUses = (settings?.fundUses && settings.fundUses.length > 0)
    ? settings.fundUses
    : ['Groceries and other household items', 'Rental payment', 'Mortgage payment', 'Utility bills and other household expenses', 'Funeral expenses', 'Recovery after a crime', 'Recovery after an illness', 'Recovery after an accident', 'Other'];

  const initialFundUse = request?.payoutDetails?.fundUse || defaultFundUses[0];
  const isFundUsePredefined = defaultFundUses.includes(initialFundUse) && initialFundUse !== 'Other';

  const [selectedFundUse, setSelectedFundUse] = useState<string>(isFundUsePredefined ? initialFundUse : 'Other');
  const [customFundUse, setCustomFundUse] = useState<string>(isFundUsePredefined ? '' : initialFundUse);

  const [payeeType, setPayeeType] = useState<'beneficiary_direct' | 'third_party'>(
    request?.payoutDetails?.payeeType || 'beneficiary_direct'
  );
  const [thirdPartyPayeeName, setThirdPartyPayeeName] = useState(request?.payoutDetails?.thirdPartyPayeeName || '');
  const [thirdPartyRelationship, setThirdPartyRelationship] = useState(request?.payoutDetails?.thirdPartyRelationship || '');
  const [contactMethod, setContactMethod] = useState<'email' | 'text'>(request?.payoutDetails?.contactMethod || 'text');
  const [contactValue, setContactValue] = useState(
    request?.payoutDetails?.contactValue || ''
  );
  const [beneficiaryLanguage, setBeneficiaryLanguage] = useState<string>(
    request?.payoutDetails?.beneficiaryLanguage || request?.beneficiaryLanguage || 'en'
  );
  const [beneficiaryLanguageName, setBeneficiaryLanguageName] = useState<string>(
    request?.payoutDetails?.beneficiaryLanguageName || request?.beneficiaryLanguageName || 'English'
  );
  const activeMethods = (settings?.payoutMethods && settings.payoutMethods.length > 0)
    ? settings.payoutMethods.filter(m => m.active)
    : INITIAL_SETTINGS.payoutMethods.filter(m => m.active);
  const defaultMethodId = activeMethods.length > 0 ? activeMethods[0].id : 'check';
  const [payoutMethodId, setPayoutMethodId] = useState(request?.payoutDetails?.payoutMethodId || defaultMethodId);

  useEffect(() => {
    if (activeMethods.length > 0 && (!payoutMethodId || !activeMethods.some(m => m.id === payoutMethodId))) {
      setPayoutMethodId(activeMethods[0].id);
    }
  }, [activeMethods, payoutMethodId]);

  // Dynamic method fields
  const [payoutData, setPayoutData] = useState<Record<string, string>>(request?.payoutDetails?.payoutData || {});
  const [sendToSchool, setSendToSchool] = useState<boolean>(() => {
    const existingAddr = request?.payoutDetails?.payoutData?.mailingAddress;
    const formattedSch = formatSchoolAddress(school);
    if (!existingAddr || !formattedSch) return false;
    return (
      existingAddr.trim() === formattedSch.trim() ||
      (school ? existingAddr.includes(school.address) && existingAddr.includes(school.zip) : false)
    );
  });

  const handleToggleSendToSchool = (checked: boolean) => {
    setSendToSchool(checked);
    if (checked && school) {
      const schoolAddressFormatted = formatSchoolAddress(school);
      setPayoutData(prev => ({
        ...prev,
        mailingAddress: schoolAddressFormatted,
      }));
    }
  };

  const handleFieldChange = (key: string, value: string) => {
    setPayoutData(prev => ({ ...prev, [key]: value }));
  };

  const handleLanguageChange = (code: string, name: string) => {
    setBeneficiaryLanguage(code);
    setBeneficiaryLanguageName(name);
  };

  if (!request) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12 text-center">
        <h2 className="text-xl font-bold text-slate-800">Request Not Found</h2>
        <Link to="/dashboard" className="text-xs text-emerald-600 font-bold hover:underline mt-2 inline-block">
          Return to Dashboard
        </Link>
      </div>
    );
  }

  if (['in_review', 'response_requested'].includes(request.status)) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12 text-center">
        <h2 className="text-xl font-bold text-slate-800">Edit Locked</h2>
        <p className="text-slate-500 mt-2">
          Payout details cannot be edited while the request is under review.
        </p>
        <Link to={`/requests/${request.id}`} className="text-xs text-emerald-600 font-bold hover:underline mt-4 inline-block">
          Return to Request
        </Link>
      </div>
    );
  }

  // Check prior history for same beneficiary
  const priorRequests = requests.filter(
    (r) =>
      r.id !== request.id &&
      r.beneficiaryName.toLowerCase() === request.beneficiaryName.toLowerCase() &&
      r.status === 'paid'
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const selectedMethod = activeMethods.find(m => m.id === payoutMethodId) || activeMethods[0];
    const payoutMethodName = selectedMethod ? selectedMethod.name : payoutMethodId;

    // Prune payoutData to only fields relevant to selectedMethod (filtering out cardType / merchant if gift_card)
    const cleanedPayoutData: Record<string, string> = {};
    if (selectedMethod?.fields) {
      selectedMethod.fields.forEach(field => {
        if (payoutMethodId === 'gift_card' && (field.key === 'cardType' || field.key === 'merchant')) {
          return;
        }
        if (payoutData[field.key]) {
          cleanedPayoutData[field.key] = payoutData[field.key].trim();
        }
      });
    } else {
      Object.entries(payoutData).forEach(([k, v]) => {
        if (payoutMethodId === 'gift_card' && (k === 'cardType' || k === 'merchant')) {
          return;
        }
        if (v) cleanedPayoutData[k] = v.trim();
      });
    }

    // Ensure mailingAddress is set if sendToSchool is checked
    if (payoutMethodId === 'check' && sendToSchool) {
      cleanedPayoutData.mailingAddress = formatSchoolAddress(school);
    }

    const finalFundUse = selectedFundUse === 'Other' ? customFundUse.trim() : selectedFundUse;

    const payoutDetails: RequestPayoutDetails = {
      payeeType,
      thirdPartyPayeeName: payeeType === 'third_party' ? thirdPartyPayeeName : undefined,
      thirdPartyRelationship: payeeType === 'third_party' ? thirdPartyRelationship : undefined,
      contactMethod,
      contactValue,
      beneficiaryLanguage,
      beneficiaryLanguageName,
      fundUse: finalFundUse,
      payoutMethodId,
      payoutMethodName,
      payoutData: cleanedPayoutData,
      submittedAt: new Date().toISOString(),
    };

    onSavePayout(request.id, payoutDetails);
    navigate(`/requests/${request.id}`);
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div>
        <Link
          to={`/requests/${request.id}`}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-800 mb-3"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Request Details
        </Link>
        <h1 className="text-3xl font-bold text-[#0F172A] tracking-tight" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>Enter Payout Details</h1>
        <p className="text-xs text-slate-500 mt-1">
          Complete disbursement instructions to process payment for <strong className="text-slate-800">{request.beneficiaryName}</strong>
        </p>
      </div>

      {/* Locked Request Summary */}
      <div className="bg-[#0F172A] text-white p-5 rounded-2xl shadow-md flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <Lock className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-400">Locked Request Context</div>
            <div className="text-sm font-extrabold text-white">
              {request.id} · {request.beneficiaryName} {request.studentName && `(${request.studentName})`}
            </div>
            <div className="text-xs text-slate-300 mt-0.5">Reason for Request: {request.reason || request.category}</div>
          </div>
        </div>

        <div className="text-right">
          <div className="text-2xl font-bold text-[#6EBF00]" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>${request.amount.toLocaleString()}</div>
          <div className="text-[11px] text-slate-400">Approved Cap</div>
        </div>
      </div>

      {/* Prior Giving History Alert if applicable */}
      {priorRequests.length > 0 && (
        <div className="p-4 bg-[#EDF7FC] border border-[#0089B3]/20 rounded-2xl flex items-center gap-3 text-slate-900 text-xs">
          <CheckCircle2 className="w-5 h-5 text-[#0089B3] shrink-0" />
          <div>
            <p className="font-bold">Prior Relief History Detected</p>
            <p className="text-[11px] text-slate-600">
              This beneficiary previously received {priorRequests.length} grant(s) totaling $
              {priorRequests.reduce((sum, r) => sum + r.amount, 0).toLocaleString()}.
            </p>
          </div>
        </div>
      )}

      {/* Payout Form */}
      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 md:p-8 space-y-6 text-xs">
        {/* Step 1: What will the funds be used for */}
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-slate-900 border-b pb-2">1. What will the funds be used for?</h3>
          <div>
            <label className="block font-bold text-slate-700 mb-1">Select Intended Fund Usage *</label>
            <select
              value={selectedFundUse}
              onChange={(e) => setSelectedFundUse(e.target.value)}
              className="w-full px-3 py-2.5 border border-slate-300 rounded-xl font-medium focus:outline-hidden focus:border-[#0089B3] focus:ring-1 focus:ring-[#0089B3] bg-white"
            >
              {defaultFundUses.map((u, i) => (
                <option key={i} value={u}>{u}</option>
              ))}
            </select>
            {selectedFundUse === 'Other' && (
              <input
                type="text"
                placeholder="Explain how the funds will be used..."
                value={customFundUse}
                onChange={(e) => setCustomFundUse(e.target.value)}
                required
                className="w-full px-3 py-2 mt-2 border border-slate-300 rounded-xl font-medium focus:outline-hidden focus:border-[#0089B3] focus:ring-1 focus:ring-[#0089B3]"
              />
            )}
          </div>
        </div>

        {/* Step 2: Who Receives Funds */}
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-slate-900 border-b pb-2">2. Who Receives Funds?</h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label
              className={`p-4 rounded-2xl border cursor-pointer transition-all flex flex-col gap-1.5 ${
                payeeType === 'beneficiary_direct'
                  ? 'border-[#0089B3] bg-[#EDF7FC] text-[#0F172A] font-bold shadow-xs'
                  : 'border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold">Beneficiary Directly</span>
                <input
                  type="radio"
                  name="payeeType"
                  checked={payeeType === 'beneficiary_direct'}
                  onChange={() => setPayeeType('beneficiary_direct')}
                  className="accent-[#0089B3]"
                />
              </div>
              <span className="text-[11px] text-slate-500 font-normal">
                Funds issued directly to {request.beneficiaryName} via direct deposit, digital app, or check.
              </span>
            </label>

            <label
              className={`p-4 rounded-2xl border cursor-pointer transition-all flex flex-col gap-1.5 ${
                payeeType === 'third_party'
                  ? 'border-[#0089B3] bg-[#EDF7FC] text-[#0F172A] font-bold shadow-xs'
                  : 'border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold">Third-Party Payee</span>
                <input
                  type="radio"
                  name="payeeType"
                  checked={payeeType === 'third_party'}
                  onChange={() => setPayeeType('third_party')}
                  className="accent-[#0089B3]"
                />
              </div>
              <span className="text-[11px] text-slate-500 font-normal">
                Funds issued to a vendor, utility provider, landlord, or healthcare clinic.
              </span>
            </label>
          </div>

          {payeeType === 'third_party' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 bg-amber-50 border border-amber-200 rounded-2xl">
              <div>
                <label className="block font-bold text-amber-950 mb-1">Third-Party Entity Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Commonwealth Edison (ComEd)"
                  value={thirdPartyPayeeName}
                  onChange={(e) => setThirdPartyPayeeName(e.target.value)}
                  required
                  className="w-full px-3 py-2 bg-white border border-amber-300 rounded-xl font-medium focus:outline-hidden focus:border-[#0089B3]"
                />
              </div>
              <div>
                <label className="block font-bold text-amber-950 mb-1">Payee Relationship / Purpose *</label>
                <input
                  type="text"
                  placeholder="e.g. Electric Utility Provider"
                  value={thirdPartyRelationship}
                  onChange={(e) => setThirdPartyRelationship(e.target.value)}
                  required
                  className="w-full px-3 py-2 bg-white border border-amber-300 rounded-xl font-medium focus:outline-hidden focus:border-[#0089B3]"
                />
              </div>
            </div>
          )}
        </div>

        {/* Step 3: Contact Method & Language */}
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-slate-900 border-b pb-2">3. Contact Method & Language for Communication</h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Preferred Channel *</label>
              <select
                value={contactMethod}
                onChange={(e) => setContactMethod(e.target.value as 'email' | 'text')}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl font-medium focus:outline-hidden focus:border-[#0089B3]"
              >
                <option value="text">Mobile Text Message (SMS)</option>
                <option value="email">Email Address</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                {contactMethod === 'email' ? 'Beneficiary Email Address *' : 'Beneficiary Mobile Phone *'}
              </label>
              <input
                type="text"
                placeholder={contactMethod === 'email' ? 'm.rodriguez@example.com' : '(312) 555-0199'}
                value={contactValue}
                onChange={(e) => setContactValue(e.target.value)}
                required
                className="w-full px-3 py-2 border border-slate-300 rounded-xl font-medium focus:outline-hidden focus:border-[#0089B3]"
              />
            </div>
          </div>

          <div className="pt-1">
            <LanguageSelect
              value={beneficiaryLanguage}
              onChange={handleLanguageChange}
              label="Beneficiary Preferred Communication Language"
              helperText="When sending beneficiary communication, if the language is not English, notifications will automatically be translated via GCP Cloud Translation before being sent."
            />
          </div>
        </div>

        {/* Step 4: Payout Method */}
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-slate-900 border-b pb-2">4. Payment Method & Accounts</h3>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Select Payment Method *</label>
            <select
              value={payoutMethodId}
              onChange={(e) => setPayoutMethodId(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-xl font-bold text-slate-900 focus:outline-hidden focus:border-[#0089B3]"
            >
              {activeMethods.map(m => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          </div>

          {/* Dynamic Details */}
          {activeMethods.map(m => {
            if (m.id !== payoutMethodId) return null;
            return (
              <div key={m.id} className="grid grid-cols-1 gap-4 p-4 bg-slate-50 border border-slate-200 rounded-2xl">
                {m.description && <p className="text-sm text-slate-600 mb-2">{m.description}</p>}

                {/* Special Send to School option for Paper Check */}
                {payoutMethodId === 'check' && (
                  <div className="p-3.5 bg-white border border-[#0089B3]/30 rounded-xl shadow-2xs">
                    <label className="flex items-start gap-2.5 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={sendToSchool}
                        onChange={(e) => handleToggleSendToSchool(e.target.checked)}
                        className="rounded text-[#0089B3] focus:ring-[#0089B3] mt-0.5 w-4 h-4 accent-[#0089B3]"
                      />
                      <div className="text-xs">
                        <span className="font-bold text-slate-800 flex items-center gap-1.5">
                          <Building2 className="w-3.5 h-3.5 text-[#0089B3]" />
                          Send to School
                        </span>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          Automatically populates and locks the mailing address to {school?.name || 'the school'}'s registered address.
                        </p>
                      </div>
                    </label>
                  </div>
                )}

                {m.fields
                  ?.filter(field => !(payoutMethodId === 'gift_card' && (field.key === 'cardType' || field.key === 'merchant')))
                  .map(field => (
                    <div key={field.key}>
                      <label className="block font-bold text-slate-700 mb-1">
                        {field.label} {field.required ? <span className="text-red-500">*</span> : <span className="text-slate-400 font-normal">(Optional)</span>}
                      </label>
                      {field.key === 'mailingAddress' ? (
                        <div className="space-y-1">
                          <textarea
                            rows={3}
                            value={sendToSchool ? formatSchoolAddress(school) : (payoutData[field.key] || '')}
                            onChange={(e) => handleFieldChange(field.key, e.target.value)}
                            disabled={sendToSchool}
                            readOnly={sendToSchool}
                            placeholder={field.placeholder || 'Street Address, Apt/Suite, City, State, ZIP'}
                            required={field.required}
                            className={`w-full px-3 py-2 border rounded-xl font-medium text-xs focus:ring-2 focus:ring-[#0089B3] focus:outline-hidden ${
                              sendToSchool
                                ? 'bg-slate-100/90 text-slate-700 border-slate-300 cursor-not-allowed select-text'
                                : 'bg-white text-slate-900 border-slate-300'
                            }`}
                          />
                          {sendToSchool && (
                            <p className="text-[10px] text-[#0089B3] font-semibold flex items-center gap-1">
                              ✓ Locked to official school address ({school?.name || 'School'})
                            </p>
                          )}
                        </div>
                      ) : (
                        <input
                          type="text"
                          value={payoutData[field.key] || ''}
                          onChange={(e) => handleFieldChange(field.key, e.target.value)}
                          placeholder={field.placeholder}
                          required={field.required}
                          className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-medium text-xs focus:ring-2 focus:ring-[#0089B3] focus:outline-hidden"
                        />
                      )}
                    </div>
                  ))}
              </div>
            );
          })}
        </div>

        {/* Submit */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
          <Link
            to={`/requests/${request.id}`}
            className="px-5 py-2.5 border border-slate-300 rounded-xl font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
          >
            Cancel
          </Link>
          <button
            type="submit"
            className="px-6 py-2.5 bg-[#0089B3] hover:bg-[#007399] text-white font-bold rounded-xl text-xs shadow-md shadow-[#0089B3]/20 flex items-center gap-2 transition-colors cursor-pointer"
          >
            <Send className="w-4 h-4" />
            Submit Payout Details
          </button>
        </div>
      </form>
    </div>
  );
};
