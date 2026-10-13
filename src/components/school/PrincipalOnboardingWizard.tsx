import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import {
  ShieldCheck,
  Building2,
  User,
  CheckCircle2,
  FileText,
  Lock,
  Smartphone,
  Copy,
  Download,
  ArrowRight,
  ArrowLeft,
  AlertCircle,
  PenTool,
  Check,
  Info,
  Key,
} from 'lucide-react';
import { School, UserProfile, ActivityEvent, MouVersion } from '../../types';
import { useAuth } from '../../context/AuthContext';

interface PrincipalOnboardingWizardProps {
  school?: School;
  userProfile?: UserProfile | null;
  mouVersion?: MouVersion;
  onCompleteOnboarding: (data: {
    schoolId: string;
    signedByName: string;
    signedByTitle?: string;
    signatureData: string;
    mouVersionId?: string;
    secondaryContact?: { name: string; email: string; phone: string; title: string };
  }) => void;
  onClose?: () => void;
}

export const PrincipalOnboardingWizard: React.FC<PrincipalOnboardingWizardProps> = ({
  school,
  userProfile,
  mouVersion,
  onCompleteOnboarding,
  onClose,
}) => {
  const { userProfile: authUserProfile, enableMfaWithCredentials, updateProfileData } = useAuth();
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4 | 5>(1);

  // Step 1: Profile & Credentials
  const [fullName, setFullName] = useState(
    userProfile?.displayName || `${userProfile?.firstName || ''} ${userProfile?.lastName || ''}`.trim() || school?.principalName || ''
  );
  const [email, setEmail] = useState(userProfile?.email || school?.principalEmail || '');
  const [phone, setPhone] = useState(userProfile?.phone || school?.principalPhone || '');
  const [jobTitle, setJobTitle] = useState(userProfile?.jobTitle || 'Principal');
  const [password, setPassword] = useState('••••••••••••');
  const [isPasswordSet, setIsPasswordSet] = useState(true);

  // Step 2: MFA Setup
  const [mfaMethod, setMfaMethod] = useState<'app' | 'sms'>('app');
  const [mfaCode, setMfaCode] = useState('');
  const isAlreadyMfaActive = Boolean(userProfile?.mfaEnabled || authUserProfile?.mfaEnabled);
  const [mfaEnabled, setMfaEnabled] = useState(isAlreadyMfaActive);
  const [reconfigureMfa, setReconfigureMfa] = useState(false);
  const [backupCodes, setBackupCodes] = useState<string[]>([
    'PEF-8812-4091',
    'PEF-9923-1102',
    'PEF-3341-8920',
    'PEF-7712-6549',
    'PEF-5501-3291',
  ]);
  const [copiedCodes, setCopiedCodes] = useState(false);
  const [mfaError, setMfaError] = useState('');

  // Step 3: School Details & Secondary Contact
  const [studentCount, setStudentCount] = useState<number>(school?.studentCount || 450);
  const [secName, setSecName] = useState('');
  const [secEmail, setSecEmail] = useState('');
  const [secPhone, setSecPhone] = useState('');
  const [secTitle, setSecTitle] = useState('Assistant Principal / Support Liaison');

  // Step 4: MOU Legal Terms & Signature
  const [signatureType, setSignatureType] = useState<'typed' | 'drawn'>('typed');
  const [typedSignature, setTypedSignature] = useState(fullName);
  const [typedTitle, setTypedTitle] = useState(userProfile?.jobTitle || 'Principal');
  const [signatureDate] = useState(new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }));
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [signingError, setSigningError] = useState('');

  // Step 5: Completed state
  const [isCompleted, setIsCompleted] = useState(false);

  const handleMfaVerify = (e: React.FormEvent) => {
    e.preventDefault();
    if (mfaCode.length !== 6) {
      setMfaError('Please enter a valid 6-digit verification code.');
      return;
    }
    setMfaError('');
    setMfaEnabled(true);
    setReconfigureMfa(false);
    updateProfileData({ mfaEnabled: true });
    setCurrentStep(3);
  };

  const handleCopyCodes = () => {
    navigator.clipboard.writeText(backupCodes.join('\n'));
    setCopiedCodes(true);
    setTimeout(() => setCopiedCodes(false), 2000);
  };

  const handleFinalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!acceptedTerms) {
      setSigningError('You must check the certification box to sign the MOU.');
      return;
    }
    if (!typedSignature.trim()) {
      setSigningError('Please enter your full legal signature name.');
      return;
    }
    if (!typedTitle.trim()) {
      setSigningError('Please enter your official job title.');
      return;
    }

    setSigningError('');
    setIsCompleted(true);
    setCurrentStep(5);

    onCompleteOnboarding({
      schoolId: school?.id || '',
      signedByName: typedSignature.trim(),
      signedByTitle: typedTitle.trim(),
      signatureData: `${typedSignature.trim()} (${typedTitle.trim()})`,
      mouVersionId: mouVersion?.id,
      secondaryContact: secName
        ? { name: secName, email: secEmail, phone: secPhone, title: secTitle }
        : undefined,
    });
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 md:p-6 animate-fade-in">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-4xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header Bar */}
        <div className="bg-slate-900 text-white px-6 md:px-8 py-5 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black tracking-tight text-white flex items-center gap-2">
                Principal Onboarding & MOU Compliance Wizard
              </h2>
              <p className="text-xs text-slate-400 font-medium">
                {school?.name || 'Partner School Onboarding'} • Annual Funding Agreement 2026–2027
              </p>
            </div>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white text-xs font-bold px-3 py-1.5 rounded-xl hover:bg-slate-800 transition"
            >
              Close
            </button>
          )}
        </div>

        {/* Stepper Progress Indicator */}
        {!isCompleted && (
          <div className="bg-slate-50 border-b border-slate-200 px-6 md:px-8 py-3.5">
            <div className="grid grid-cols-4 gap-2 text-center text-xs">
              {[
                { step: 1, label: 'Account Setup', icon: User },
                { step: 2, label: 'MFA Security', icon: Lock },
                { step: 3, label: 'School & Contacts', icon: Building2 },
                { step: 4, label: 'MOU Execution', icon: FileText },
              ].map((item) => {
                const Icon = item.icon;
                const isActive = currentStep === item.step;
                const isPassed = currentStep > item.step;

                return (
                  <div
                    key={item.step}
                    className={`flex items-center justify-center gap-2 py-2 px-3 rounded-xl border transition-all ${
                      isActive
                        ? 'bg-emerald-600 text-white border-emerald-600 font-bold shadow-xs'
                        : isPassed
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200 font-medium'
                        : 'bg-white text-slate-400 border-slate-200'
                    }`}
                  >
                    {isPassed ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                    )}
                    <span className="hidden sm:inline font-semibold">{item.label}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Modal Body Content */}
        <div className="p-6 md:p-8 overflow-y-auto space-y-6 flex-1 text-xs">
          {/* STEP 1: Account & Credentials Setup */}
          {currentStep === 1 && (
            <div className="space-y-6 max-w-2xl mx-auto">
              <div>
                <span className="text-[10px] font-black tracking-wider uppercase text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200">
                  Step 1 of 4: Account Credentials
                </span>
                <h3 className="text-xl font-black text-slate-900 mt-2">Verify Leadership Profile</h3>
                <p className="text-slate-500">
                  Please confirm your personal details as designated by your funding foundation administrator.
                </p>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4 shadow-xs">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Full Legal Name *</label>
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl font-semibold text-slate-900"
                      required
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Official Job Title</label>
                    <input
                      type="text"
                      value={jobTitle}
                      onChange={(e) => setJobTitle(e.target.value)}
                      className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl font-medium"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Email Address *</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl font-semibold text-slate-900 bg-slate-50"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Direct Phone Line *</label>
                    <input
                      type="text"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="(312) 555-0199"
                      className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl font-medium"
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setCurrentStep(2)}
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-sm flex items-center gap-2"
                >
                  Continue to MFA Setup <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: MFA Enrollment */}
          {currentStep === 2 && (
            <div className="space-y-6 max-w-2xl mx-auto">
              <div>
                <span className="text-[10px] font-black tracking-wider uppercase text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200">
                  Step 2 of 4: Multi-Factor Authentication
                </span>
                <h3 className="text-xl font-black text-slate-900 mt-2">Secure Your Leadership Account</h3>
                <p className="text-slate-500">
                  PEF security guidelines require Multi-Factor Authentication (MFA) to authorize student grant disbursements.
                </p>
              </div>

              {mfaError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl flex items-center gap-2 font-semibold">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {mfaError}
                </div>
              )}

              {(isAlreadyMfaActive || mfaEnabled) && !reconfigureMfa ? (
                <div className="bg-emerald-50/80 border border-emerald-200 rounded-2xl p-6 text-center space-y-4">
                  <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto shadow-xs">
                    <ShieldCheck className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-base font-black text-emerald-950">Two-Factor Authentication is Active</h4>
                    <p className="text-xs text-emerald-800 mt-1 max-w-md mx-auto">
                      Your leadership account is secured with multi-factor authentication (TOTP Authenticator App) and emergency recovery codes.
                    </p>
                  </div>
                  <div className="pt-2 flex flex-col sm:flex-row gap-2 justify-center items-center">
                    <button
                      type="button"
                      onClick={() => setCurrentStep(3)}
                      className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-xs inline-flex items-center gap-2 cursor-pointer"
                    >
                      <span>Continue to School & Contacts</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setReconfigureMfa(true)}
                      className="text-xs text-slate-500 hover:text-slate-800 underline py-2 cursor-pointer"
                    >
                      Reconfigure Authenticator Device
                    </button>
                  </div>
                </div>
              ) : (
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4">
                  <label className="block font-bold text-slate-800">Choose Verification Method:</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setMfaMethod('app')}
                      className={`p-4 rounded-xl border text-left flex items-start gap-3 transition ${
                        mfaMethod === 'app'
                          ? 'border-emerald-600 bg-emerald-50/50 text-emerald-900 font-bold shadow-xs'
                          : 'border-slate-200 bg-white text-slate-600'
                      }`}
                    >
                      <Smartphone className="w-5 h-5 text-emerald-600 mt-0.5" />
                      <div>
                        <div className="font-bold">Authenticator App</div>
                        <div className="text-[11px] text-slate-500 font-normal mt-0.5">Google Authenticator, Duo, or Authy</div>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setMfaMethod('sms')}
                      className={`p-4 rounded-xl border text-left flex items-start gap-3 transition ${
                        mfaMethod === 'sms'
                          ? 'border-emerald-600 bg-emerald-50/50 text-emerald-900 font-bold shadow-xs'
                          : 'border-slate-200 bg-white text-slate-600'
                      }`}
                    >
                      <Smartphone className="w-5 h-5 text-emerald-600 mt-0.5" />
                      <div>
                        <div className="font-bold">SMS Mobile Code</div>
                        <div className="text-[11px] text-slate-500 font-normal mt-0.5">Text message to {phone || 'your phone'}</div>
                      </div>
                    </button>
                  </div>

                  <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
                    <p className="font-bold text-slate-800">Test Verification Code (Simulated)</p>
                    <p className="text-slate-500">
                      Enter any 6-digit verification code (e.g. <span className="font-mono font-bold text-slate-800">123456</span>) to enroll your device:
                    </p>
                    <form onSubmit={handleMfaVerify} className="flex gap-3">
                      <input
                        type="text"
                        maxLength={6}
                        value={mfaCode}
                        onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, ''))}
                        placeholder="123456"
                        className="px-4 py-2 border border-slate-300 rounded-xl font-mono text-base tracking-widest text-center w-36"
                      />
                      <button
                        type="submit"
                        className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-xs"
                      >
                        Verify & Activate MFA
                      </button>
                    </form>
                  </div>

                  {/* Emergency Backup Codes */}
                  <div className="bg-amber-50/60 border border-amber-200 rounded-xl p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-amber-900 flex items-center gap-1.5">
                        <Key className="w-4 h-4 text-amber-700" /> Emergency Backup Recovery Codes
                      </span>
                      <button
                        type="button"
                        onClick={handleCopyCodes}
                        className="text-amber-800 hover:text-amber-950 font-bold flex items-center gap-1 px-2.5 py-1 bg-amber-100 rounded-lg"
                      >
                        {copiedCodes ? <Check className="w-3.5 h-3.5 text-emerald-700" /> : <Copy className="w-3.5 h-3.5" />}
                        {copiedCodes ? 'Copied' : 'Copy All'}
                      </button>
                    </div>
                    <div className="grid grid-cols-3 gap-2 font-mono text-slate-700 text-[11px] bg-white p-2.5 rounded-lg border border-amber-200">
                      {backupCodes.map((code) => (
                        <span key={code} className="text-center font-bold">{code}</span>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              <div className="flex justify-between items-center pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setCurrentStep(1)}
                  className="px-4 py-2 text-slate-600 font-bold hover:text-slate-800 flex items-center gap-1"
                >
                  <ArrowLeft className="w-4 h-4" /> Back
                </button>
                {(!isAlreadyMfaActive && !mfaEnabled) && (
                  <button
                    type="button"
                    onClick={() => setCurrentStep(3)}
                    className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-sm flex items-center gap-2"
                  >
                    Skip for Now / Continue <ArrowRight className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          )}

          {/* STEP 3: School Details & Emergency Contacts */}
          {currentStep === 3 && (
            <div className="space-y-6 max-w-2xl mx-auto">
              <div>
                <span className="text-[10px] font-black tracking-wider uppercase text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200">
                  Step 3 of 4: School & Contact Verification
                </span>
                <h3 className="text-xl font-black text-slate-900 mt-2">School Profile & Designated Contacts</h3>
                <p className="text-slate-500">
                  Verify school enrollment capacity and add authorized secondary contacts to submit requests in your absence.
                </p>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4 shadow-xs">
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-1">
                  <div className="font-bold text-slate-900 text-sm">{school?.name || 'Partner School'}</div>
                  <div className="text-slate-500">{school?.address}, {school?.city}, {school?.state} {school?.zip}</div>
                  <div className="text-slate-500 font-medium">Assigned Annual Allocation: ${(school?.annualBudget || 10000).toLocaleString()}</div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Total Student Enrollment Count</label>
                  <input
                    type="number"
                    value={studentCount}
                    onChange={(e) => setStudentCount(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl font-semibold text-slate-900 max-w-xs"
                  />
                </div>

                <div className="border-t border-slate-200 pt-4 space-y-3">
                  <div className="font-bold text-slate-900 flex items-center justify-between">
                    <span>Authorized Secondary Contact (Optional)</span>
                    <span className="text-[11px] text-slate-400 font-normal">Assistant Principal, Counselor, or Social Worker</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <input
                      type="text"
                      placeholder="Contact Full Name"
                      value={secName}
                      onChange={(e) => setSecName(e.target.value)}
                      className="px-3 py-2 border border-slate-300 rounded-xl"
                    />
                    <input
                      type="email"
                      placeholder="Contact Email"
                      value={secEmail}
                      onChange={(e) => setSecEmail(e.target.value)}
                      className="px-3 py-2 border border-slate-300 rounded-xl"
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <input
                      type="text"
                      placeholder="Phone Number"
                      value={secPhone}
                      onChange={(e) => setSecPhone(e.target.value)}
                      className="px-3 py-2 border border-slate-300 rounded-xl"
                    />
                    <input
                      type="text"
                      placeholder="Role / Title"
                      value={secTitle}
                      onChange={(e) => setSecTitle(e.target.value)}
                      className="px-3 py-2 border border-slate-300 rounded-xl"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-between items-center pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setCurrentStep(2)}
                  className="px-4 py-2 text-slate-600 font-bold hover:text-slate-800 flex items-center gap-1"
                >
                  <ArrowLeft className="w-4 h-4" /> Back
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentStep(4)}
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-sm flex items-center gap-2"
                >
                  Proceed to MOU Agreement <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 4: Digital MOU Review & E-Signature */}
          {currentStep === 4 && (
            <div className="space-y-6 max-w-3xl mx-auto">
              <div>
                <span className="text-[10px] font-black tracking-wider uppercase text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200">
                  Step 4 of 4: Annual Memorandum of Understanding
                </span>
                <h3 className="text-xl font-black text-slate-900 mt-2">2026–2027 PEF Partnership Agreement</h3>
                <p className="text-slate-500">
                  Please review the terms of the Principal Emergency Fund and sign below to activate your school's funding allocation.
                </p>
              </div>

              {signingError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl flex items-center gap-2 font-semibold">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {signingError}
                </div>
              )}

              {/* MOU Document Container */}
              <div className="bg-slate-900 text-slate-200 rounded-2xl border border-slate-800 p-6 md:p-8 space-y-5 text-xs font-serif leading-relaxed shadow-lg max-h-72 overflow-y-auto">
                {mouVersion ? (
                  <div className="prose prose-invert prose-sm max-w-none prose-p:text-slate-300 prose-strong:text-white prose-a:text-emerald-400 font-sans">
                    <ReactMarkdown>{mouVersion.content}</ReactMarkdown>
                  </div>
                ) : (
                  <>
                    <div className="text-center space-y-1 font-sans border-b border-slate-800 pb-4">
                      <h4 className="text-base font-black text-white uppercase tracking-wider">
                        MEMORANDUM OF UNDERSTANDING (MOU)
                      </h4>
                      <p className="text-emerald-400 font-mono text-[11px] font-bold">
                        PRINCIPAL EMERGENCY FUND • ACADEMIC YEAR 2026–2027
                      </p>
                      <p className="text-slate-400 text-[11px]">
                        Between {school?.funderName || 'Horizon Education Foundation'} and {school?.name || 'Partner School'}
                      </p>
                    </div>

                    <div className="space-y-3 font-sans text-slate-300">
                      <p>
                        <strong className="text-white">1. PURPOSE & ALLOCATION:</strong> The Funder grants an annual allocation of{' '}
                        <strong className="text-emerald-400">${(school?.annualBudget || 10000).toLocaleString()}</strong> to the School Principal for the sole purpose of resolving immediate, unexpected student emergency hardship (e.g., housing instability, utility cutoff, winter outerwear, medical supplies).
                      </p>

                      <p>
                        <strong className="text-white">2. DIRECT STUDENT BENEFIT MANDATE:</strong> 100% of approved emergency grants must directly benefit the designated student/family or be paid directly to verified third-party vendors (utility providers, landlords, healthcare clinics). Funds shall never be used for school operating costs, staff stipends, or general supplies.
                      </p>

                      <p>
                        <strong className="text-white">3. MAXIMUM CAP & DISBURSEMENT:</strong> Individual submissions are capped at $2,000 per request. All requests require principal verification. Approved payments are processed within 48 business hours via direct ACH or digital disbursement.
                      </p>

                      <p>
                        <strong className="text-white">4. DOCUMENTATION & AUDIT:</strong> The Principal agrees to retain proof of expenditure/receipts for 30 calendar days and make them available for annual audit review upon request.
                      </p>
                    </div>
                  </>
                )}
              </div>

              {/* Signature Block */}
              <form onSubmit={handleFinalSubmit} className="bg-white border border-slate-200 rounded-2xl p-5 md:p-6 space-y-4 shadow-xs">
                <div className="flex items-center justify-between border-b pb-3">
                  <span className="font-bold text-slate-900 flex items-center gap-2">
                    <PenTool className="w-4 h-4 text-emerald-600" /> Authorized Leadership E-Signature
                  </span>
                  <span className="text-[11px] font-mono text-slate-500">Date: {signatureDate}</span>
                </div>

                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Type Full Legal Name (E-Signature) *</label>
                      <input
                        type="text"
                        value={typedSignature}
                        onChange={(e) => setTypedSignature(e.target.value)}
                        placeholder="e.g. Principal Sarah Jenkins"
                        className="w-full px-4 py-3 border border-slate-300 rounded-xl font-serif text-base italic text-slate-900 bg-slate-50/50"
                        required
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Official Legal Title / Role *</label>
                      <input
                        type="text"
                        value={typedTitle}
                        onChange={(e) => setTypedTitle(e.target.value)}
                        placeholder="e.g. Principal, Head of School"
                        className="w-full px-4 py-3 border border-slate-300 rounded-xl font-medium text-slate-900 bg-slate-50/50"
                        required
                      />
                    </div>
                  </div>

                  <label className="flex items-start gap-3 p-3.5 bg-slate-50 rounded-xl border border-slate-200 cursor-pointer shadow-2xs">
                    <input
                      type="checkbox"
                      checked={acceptedTerms}
                      onChange={(e) => setAcceptedTerms(e.target.checked)}
                      className="mt-0.5 w-4 h-4 rounded text-emerald-600 border-slate-300 focus:ring-emerald-500 shrink-0"
                    />
                    <span className="text-slate-700 font-medium text-[11px] leading-relaxed">
                      I certify that I am the authorized Principal or Executive Leader for <strong>{school?.name || 'this school'}</strong>, and I agree to all terms and reporting mandates of the 2026–2027 Memorandum of Understanding.
                    </span>
                  </label>
                </div>

                <div className="flex justify-between items-center pt-3 border-t border-slate-200">
                  <button
                    type="button"
                    onClick={() => setCurrentStep(3)}
                    className="px-4 py-2 text-slate-600 font-bold hover:text-slate-800 flex items-center gap-1"
                  >
                    <ArrowLeft className="w-4 h-4" /> Back
                  </button>
                  <button
                    type="submit"
                    className="px-8 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-md flex items-center gap-2 text-xs cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    Sign & Execute MOU Agreement
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* STEP 5: Completion & Success View */}
          {currentStep === 5 && (
            <div className="space-y-6 max-w-xl mx-auto text-center py-6 animate-fade-in">
              <div className="w-16 h-16 rounded-3xl bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto border border-emerald-300 shadow-sm">
                <CheckCircle2 className="w-8 h-8" />
              </div>

              <div>
                <h3 className="text-2xl font-black text-slate-900">MOU Successfully Executed!</h3>
                <p className="text-slate-600 mt-1">
                  Your annual agreement for <strong>{school?.name || 'your school'}</strong> is active. You may now submit emergency relief requests up to your <strong>${(school?.annualBudget || 10000).toLocaleString()}</strong> allocation.
                </p>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-left space-y-2 text-xs font-mono">
                <div className="flex justify-between">
                  <span className="text-slate-500">Signatory:</span>
                  <span className="font-bold text-slate-800">{typedSignature}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Official Title:</span>
                  <span className="font-bold text-slate-800">{typedTitle}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Execution Date:</span>
                  <span className="font-bold text-slate-800">{signatureDate}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Compliance Status:</span>
                  <span className="font-bold text-emerald-600">Active & Compliant</span>
                </div>
              </div>

              <div className="pt-4 flex justify-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    if (onClose) onClose();
                  }}
                  className="px-8 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-md"
                >
                  Enter Portal Dashboard
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

function KeyRoundIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M2 18v3c0 .6.4 1 1 1h4v-3h3v-3h2" />
      <circle cx="165" cy="7.5" r=".5" fill="currentColor" />
      <circle cx="15" cy="9" r="6" />
    </svg>
  );
}
