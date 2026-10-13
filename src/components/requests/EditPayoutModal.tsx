import React, { useState, useEffect } from 'react';
import { X, Save, CreditCard, Building2, AlertTriangle, ShieldAlert, Check } from 'lucide-react';
import { EmergencyRequest, RequestPayoutDetails, PortalSettings, School } from '../../types';
import { LanguageSelect } from '../common/LanguageSelect';
import { INITIAL_SETTINGS } from '../../data/defaultSettings';
import { useAuth } from '../../context/AuthContext';

interface EditPayoutModalProps {
  request: EmergencyRequest;
  isOpen: boolean;
  onClose: () => void;
  onSavePayout: (payoutDetails: RequestPayoutDetails, updatedAmount?: number) => void;
  settings?: PortalSettings;
  schools?: School[];
  maxPerRequestAmount?: number;
}

export const EditPayoutModal: React.FC<EditPayoutModalProps> = ({
  request,
  isOpen,
  onClose,
  onSavePayout,
  settings,
  schools = [],
  maxPerRequestAmount: propMaxAmount,
}) => {
  const { activeRole, userProfile, activeSchoolId } = useAuth();
  const isAdmin = activeRole === 'admin' || userProfile?.role === 'admin';
  const maxPerRequestAmount = propMaxAmount || settings?.maxPerRequestAmount || 2000;
  const current = request.payoutDetails;

  // Resolve associated school address
  const school = schools.find(s => s.id === request.schoolId) ||
    schools.find(s => s.id === activeSchoolId) ||
    schools[0];

  const formatSchoolAddress = (sch?: School): string => {
    if (!sch) return '';
    const parts = [sch.name, sch.address, `${sch.city}, ${sch.state} ${sch.zip}`.trim()].filter(Boolean);
    return parts.join('\n');
  };

  // Available payout methods
  const activeMethods = (settings?.payoutMethods && settings.payoutMethods.length > 0)
    ? settings.payoutMethods.filter(m => m.active)
    : INITIAL_SETTINGS.payoutMethods.filter(m => m.active);

  const resolveMethodId = (rawMethodId?: string): string => {
    if (!rawMethodId) return activeMethods[0]?.id || 'check';
    if (activeMethods.some(m => m.id === rawMethodId)) return rawMethodId;
    if (rawMethodId === 'direct_deposit') {
      const checkMethod = activeMethods.find(m => m.id === 'check');
      return checkMethod ? checkMethod.id : (activeMethods[0]?.id || 'check');
    }
    if (rawMethodId === 'zelle_venmo') {
      const zelleMethod = activeMethods.find(m => m.id === 'zelle');
      return zelleMethod ? zelleMethod.id : (activeMethods[0]?.id || 'zelle');
    }
    return activeMethods[0]?.id || 'check';
  };

  const defaultFundUses = (settings?.fundUses && settings.fundUses.length > 0)
    ? settings.fundUses
    : ['Groceries and other household items', 'Rental payment', 'Mortgage payment', 'Utility bills and other household expenses', 'Funeral expenses', 'Recovery after a crime', 'Recovery after an illness', 'Recovery after an accident', 'Other'];

  const initialFundUse = current?.fundUse || defaultFundUses[0];
  const isFundUsePredefined = defaultFundUses.includes(initialFundUse) && initialFundUse !== 'Other';

  const [amount, setAmount] = useState<string | number>(request.amount);
  const [selectedFundUse, setSelectedFundUse] = useState<string>(isFundUsePredefined ? initialFundUse : 'Other');
  const [customFundUse, setCustomFundUse] = useState<string>(isFundUsePredefined ? '' : initialFundUse);

  const [payeeType, setPayeeType] = useState<'beneficiary_direct' | 'third_party'>(
    current?.payeeType || 'beneficiary_direct'
  );
  const [thirdPartyPayeeName, setThirdPartyPayeeName] = useState(current?.thirdPartyPayeeName || '');
  const [thirdPartyRelationship, setThirdPartyRelationship] = useState(current?.thirdPartyRelationship || '');
  const [contactMethod, setContactMethod] = useState<'email' | 'text'>(current?.contactMethod || 'email');
  const [contactValue, setContactValue] = useState(current?.contactValue || request.submitterEmail || '');
  const [beneficiaryLanguage, setBeneficiaryLanguage] = useState<string>(
    current?.beneficiaryLanguage || request.beneficiaryLanguage || 'en'
  );
  const [beneficiaryLanguageName, setBeneficiaryLanguageName] = useState<string>(
    current?.beneficiaryLanguageName || request.beneficiaryLanguageName || 'English'
  );
  
  const [payoutMethodId, setPayoutMethodId] = useState<string>(resolveMethodId(current?.payoutMethodId));
  const [payoutData, setPayoutData] = useState<Record<string, string>>(current?.payoutData || {});
  const [sendToSchool, setSendToSchool] = useState<boolean>(false);

  // Override Confirmation Popup state
  const [showOverrideConfirm, setShowOverrideConfirm] = useState(false);
  const [overrideReason, setOverrideReason] = useState('Administrative limit override approved by admin.');
  const [validationError, setValidationError] = useState<string | null>(null);

  // Synchronize form state whenever the modal opens or request/settings change
  useEffect(() => {
    if (isOpen) {
      const cur = request.payoutDetails;
      const initialU = cur?.fundUse || defaultFundUses[0];
      const matchU = defaultFundUses.includes(initialU) && initialU !== 'Other';
      setAmount(request.amount);
      setSelectedFundUse(matchU ? initialU : 'Other');
      setCustomFundUse(matchU ? '' : initialU);

      setPayeeType(cur?.payeeType || 'beneficiary_direct');
      setThirdPartyPayeeName(cur?.thirdPartyPayeeName || '');
      setThirdPartyRelationship(cur?.thirdPartyRelationship || '');
      setContactMethod(cur?.contactMethod || 'email');
      setContactValue(cur?.contactValue || request.submitterEmail || '');
      setBeneficiaryLanguage(cur?.beneficiaryLanguage || request.beneficiaryLanguage || 'en');
      setBeneficiaryLanguageName(cur?.beneficiaryLanguageName || request.beneficiaryLanguageName || 'English');
      
      const chosenMethodId = resolveMethodId(cur?.payoutMethodId);
      setPayoutMethodId(chosenMethodId);
      const initialPData = cur?.payoutData ? { ...cur.payoutData } : {};
      setPayoutData(initialPData);

      // Check if existing address matches school address
      const schoolAddressFormatted = formatSchoolAddress(school);
      const isMatchingSchool = !!(
        chosenMethodId === 'check' &&
        schoolAddressFormatted &&
        initialPData.mailingAddress &&
        (initialPData.mailingAddress.trim() === schoolAddressFormatted.trim() ||
          (school && initialPData.mailingAddress.includes(school.address) && initialPData.mailingAddress.includes(school.zip)))
      );
      setSendToSchool(isMatchingSchool);
      setShowOverrideConfirm(false);
      setOverrideReason('Administrative limit override approved by admin.');
      setValidationError(null);
    }
  }, [isOpen, request, settings, school]);

  const handleToggleSendToSchool = (checked: boolean) => {
    setSendToSchool(checked);
    if (checked) {
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

  if (!isOpen) return null;

  const currentSelectedMethod = activeMethods.find(m => m.id === payoutMethodId) || activeMethods[0];
  const parsedAmount = Number(amount);
  const isOverLimit = !isNaN(parsedAmount) && parsedAmount > maxPerRequestAmount;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    if (!amount || isNaN(parsedAmount) || parsedAmount <= 0) {
      setValidationError('Please enter a valid dollar amount greater than 0.');
      return;
    }

    if (isOverLimit) {
      if (isAdmin) {
        setShowOverrideConfirm(true);
        return;
      } else {
        setValidationError(`The maximum standard grant limit is $${maxPerRequestAmount.toLocaleString()} per request. Please contact a Small Moves administrator to request an override.`);
        return;
      }
    }

    executeSave(parsedAmount);
  };

  const executeSave = (finalAmount: number, overrideNote?: string) => {
    const selectedMethod = activeMethods.find(m => m.id === payoutMethodId) || activeMethods[0];
    const payoutMethodName = selectedMethod ? selectedMethod.name : payoutMethodId;

    const finalFundUse = selectedFundUse === 'Other' ? customFundUse.trim() : selectedFundUse;

    // Prune payoutData to only include fields relevant to selectedMethod
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

    if (payoutMethodId === 'check' && sendToSchool) {
      cleanedPayoutData.mailingAddress = formatSchoolAddress(school);
    }

    const updated: RequestPayoutDetails = {
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
      submittedAt: current?.submittedAt || new Date().toISOString(),
      beneficiaryConfirmedAt: current?.beneficiaryConfirmedAt,
      beneficiaryConfirmedBy: current?.beneficiaryConfirmedBy,
      paidAt: current?.paidAt,
      paidBy: current?.paidBy,
    };

    onSavePayout(updated, finalAmount !== request.amount ? finalAmount : undefined);
    setShowOverrideConfirm(false);
    onClose();
  };

  const handleConfirmOverride = () => {
    executeSave(parsedAmount, overrideReason.trim() || 'Limit override authorized by admin');
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
        <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden max-h-[90vh] flex flex-col">
          <div className="px-6 py-4 bg-[#0F172A] text-white flex items-center justify-between shrink-0">
            <div>
              <div className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-[#0089B3]" />
                <h3 className="text-base font-bold tracking-tight text-white" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
                  Edit Payout Information ({request.id})
                </h3>
              </div>
              {isAdmin && (
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-400 mt-0.5">
                  <ShieldAlert className="w-3 h-3" /> Admin Override Permissions Active
                </span>
              )}
            </div>
            <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors cursor-pointer">
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} noValidate className="p-6 space-y-4 text-xs overflow-y-auto">
            {validationError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                <span className="font-semibold">{validationError}</span>
              </div>
            )}

            {/* Payout Amount with Admin Override Capability */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block font-bold text-slate-700">
                  Payout Amount ($ USD) *
                </label>
                <span className="text-[11px] text-slate-500">
                  Standard cap: <strong className="text-slate-700">${maxPerRequestAmount.toLocaleString()}</strong>
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

              {isOverLimit && (
                <div className="mt-2 p-2.5 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2 text-amber-900">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div className="text-[11px]">
                    <p className="font-bold">
                      Amount exceeds standard limit of ${maxPerRequestAmount.toLocaleString()} (by +${(parsedAmount - maxPerRequestAmount).toLocaleString()})
                    </p>
                    <p className="text-amber-800 mt-0.5">
                      {isAdmin
                        ? 'As an Administrator, you will be prompted to confirm and authorize this override upon saving.'
                        : 'Only administrators are authorized to approve amounts exceeding the standard limit.'}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* What will the funds be used for */}
            <div>
              <label className="block font-bold text-slate-700 mb-1">What will the funds be used for? *</label>
              <select
                value={selectedFundUse}
                onChange={(e) => setSelectedFundUse(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg font-medium focus:ring-2 focus:ring-[#0089B3] focus:border-[#0089B3] focus:outline-hidden"
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
                  className="w-full px-3 py-1.5 mt-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#0089B3] focus:border-[#0089B3] focus:outline-hidden"
                />
              )}
            </div>

            {/* Who Receives Funds */}
            <div>
              <label className="block font-bold text-slate-700 mb-1.5">Who receives funds?</label>
              <div className="grid grid-cols-2 gap-2">
                <label
                  className={`p-2.5 rounded-xl border text-center font-bold cursor-pointer transition-all ${
                    payeeType === 'beneficiary_direct'
                      ? 'border-[#0089B3] bg-[#EDF7FC] text-[#0F172A] shadow-xs'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="payeeType"
                    checked={payeeType === 'beneficiary_direct'}
                    onChange={() => setPayeeType('beneficiary_direct')}
                    className="sr-only"
                  />
                  Beneficiary Directly
                </label>

                <label
                  className={`p-2.5 rounded-xl border text-center font-bold cursor-pointer transition-all ${
                    payeeType === 'third_party'
                      ? 'border-[#0089B3] bg-[#EDF7FC] text-[#0F172A] shadow-xs'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="payeeType"
                    checked={payeeType === 'third_party'}
                    onChange={() => setPayeeType('third_party')}
                    className="sr-only"
                  />
                  Third-Party Payee
                </label>
              </div>
            </div>

            {payeeType === 'third_party' && (
              <div className="grid grid-cols-2 gap-3 p-3 bg-amber-50 border border-amber-200 rounded-xl">
                <div>
                  <label className="block font-bold text-amber-900 mb-1">Third-Party Payee Name *</label>
                  <input
                    type="text"
                    value={thirdPartyPayeeName}
                    onChange={(e) => setThirdPartyPayeeName(e.target.value)}
                    placeholder="e.g. ComEd, Landlord"
                    required
                    className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-bold text-amber-900 mb-1">Relationship / Type *</label>
                  <input
                    type="text"
                    value={thirdPartyRelationship}
                    onChange={(e) => setThirdPartyRelationship(e.target.value)}
                    placeholder="e.g. Electric Utility"
                    required
                    className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg"
                  />
                </div>
              </div>
            )}

            {/* Contact Method */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Contact Method</label>
                <select
                  value={contactMethod}
                  onChange={(e) => setContactMethod(e.target.value as 'email' | 'text')}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg font-medium bg-white"
                >
                  <option value="email">Email Address</option>
                  <option value="text">Mobile Text (SMS)</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  {contactMethod === 'email' ? 'Email Address *' : 'Phone Number *'}
                </label>
                <input
                  type="text"
                  value={contactValue}
                  onChange={(e) => setContactValue(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg font-medium bg-white"
                />
              </div>
            </div>

            {/* Language Selection */}
            <LanguageSelect
              value={beneficiaryLanguage}
              onChange={handleLanguageChange}
              label="Beneficiary Preferred Communication Language"
              helperText="Communications sent to this beneficiary will be translated automatically before dispatch."
            />

            {/* Payout Method Picker */}
            <div>
              <label className="block font-bold text-slate-700 mb-1">Payment Method *</label>
              <select
                value={payoutMethodId}
                onChange={(e) => setPayoutMethodId(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg font-bold text-slate-900 bg-white"
              >
                {activeMethods.map(m => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            </div>

            {/* Dynamic method details */}
            {currentSelectedMethod && (
              <div className="space-y-3 p-4 bg-slate-50 border border-slate-200 rounded-xl">
                {currentSelectedMethod.description && (
                  <p className="text-xs text-slate-600 font-medium">{currentSelectedMethod.description}</p>
                )}

                {/* Special Send to School option for Paper Check */}
                {payoutMethodId === 'check' && (
                  <div className="p-3 bg-white border border-[#0089B3]/30 rounded-xl shadow-2xs">
                    <label className="flex items-start gap-2.5 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={sendToSchool}
                        onChange={(e) => handleToggleSendToSchool(e.target.checked)}
                        className="rounded text-[#0089B3] focus:ring-[#0089B3] mt-0.5 w-4 h-4"
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

                {currentSelectedMethod.fields && currentSelectedMethod.fields.length > 0 ? (
                  currentSelectedMethod.fields
                    .filter(field => !(payoutMethodId === 'gift_card' && (field.key === 'cardType' || field.key === 'merchant')))
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
                              className={`w-full px-3 py-2 border rounded-lg font-medium text-xs focus:ring-2 focus:ring-[#0089B3] focus:outline-hidden ${
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
                            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg font-medium text-xs focus:ring-2 focus:ring-[#0089B3] focus:outline-hidden"
                          />
                        )}
                      </div>
                    ))
                ) : (
                  <p className="text-xs text-slate-500 italic">No additional field inputs required for this payment method.</p>
                )}
              </div>
            )}

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
                    Save Payout Details
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Admin Override Confirmation Popup for Payout Details */}
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
                  Beneficiary: <span className="font-normal">{request.beneficiaryName} ({request.id})</span>
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
