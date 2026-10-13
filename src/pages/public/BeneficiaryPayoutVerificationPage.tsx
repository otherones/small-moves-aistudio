import React, { useState, useEffect } from 'react';
import { useSearchParams, useParams, Link } from 'react-router-dom';
import {
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Building2,
  DollarSign,
  User,
  CreditCard,
  Phone,
  Mail,
  MapPin,
  Globe,
  HelpCircle,
  Clock,
  Loader2,
  Check,
  ChevronDown,
  Info,
  Send,
  ArrowLeft,
  MessageSquare,
  RefreshCw,
} from 'lucide-react';
import {
  EmergencyRequest,
  PortalSettings,
  PayoutMethodConfig,
  RequestPayoutDetails,
  BeneficiaryPayoutPageTemplate,
} from '../../types';
import { GCP_SUPPORTED_LANGUAGES, getLanguageByCode } from '../../data/languages';
import { DEFAULT_BENEFICIARY_PAGE_TEMPLATE, INITIAL_SETTINGS } from '../../data/defaultSettings';
import { renderEmailText } from '../../utils/emailUtils';
import { translateTextMap } from '../../services/translationService';
import { db, cleanForFirestore } from '../../lib/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';

interface Props {
  requests?: EmergencyRequest[];
  settings?: PortalSettings;
  onConfirmPayout?: (
    requestId: string,
    updatedPayoutDetails: RequestPayoutDetails,
    beneficiaryNotes?: string
  ) => void;
  onRequestChanges?: (requestId: string, notes?: string) => void;
}

export const BeneficiaryPayoutVerificationPage: React.FC<Props> = ({
  requests = [],
  settings = INITIAL_SETTINGS,
  onConfirmPayout,
  onRequestChanges,
}) => {
  const [searchParams] = useSearchParams();
  const params = useParams<{ id?: string }>();
  const requestId = params.id || searchParams.get('id') || searchParams.get('requestId') || '';

  // Request & portal settings state
  const [request, setRequest] = useState<EmergencyRequest | null>(null);
  const [portalSettings, setPortalSettings] = useState<PortalSettings>(() => ({
    ...settings,
    payoutPageTemplate: {
      ...DEFAULT_BENEFICIARY_PAGE_TEMPLATE,
      ...(settings?.payoutPageTemplate || {}),
    },
  }));
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Language & Translation state
  const [selectedLanguage, setSelectedLanguage] = useState<string>('en');
  const [showLanguageDropdown, setShowLanguageDropdown] = useState(false);
  const [languageSearch, setLanguageSearch] = useState('');
  const [isTranslating, setIsTranslating] = useState(false);

  // Template text state (translated dynamically)
  const [pageTemplate, setPageTemplate] = useState<BeneficiaryPayoutPageTemplate>(() => ({
    ...DEFAULT_BENEFICIARY_PAGE_TEMPLATE,
    ...(settings?.payoutPageTemplate || {}),
  }));

  // Sync settings whenever parent props update
  useEffect(() => {
    if (settings) {
      setPortalSettings((prev) => ({
        ...prev,
        ...settings,
        payoutPageTemplate: {
          ...DEFAULT_BENEFICIARY_PAGE_TEMPLATE,
          ...(prev?.payoutPageTemplate || {}),
          ...(settings?.payoutPageTemplate || {}),
        },
      }));
      if (settings.payoutPageTemplate) {
        setPageTemplate((prev) => ({
          ...DEFAULT_BENEFICIARY_PAGE_TEMPLATE,
          ...prev,
          ...settings.payoutPageTemplate,
        }));
      }
    }
  }, [settings]);

  // Changes Request Modal / Flow state
  const [showChangesModal, setShowChangesModal] = useState(false);
  const [changeNotes, setChangeNotes] = useState('');
  const [isSubmittingChanges, setIsSubmittingChanges] = useState(false);
  const [isChangesRequested, setIsChangesRequested] = useState(false);

  // Submission state
  const [isSubmittingConfirm, setIsSubmittingConfirm] = useState(false);
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [confirmationTimestamp, setConfirmationTimestamp] = useState<string | null>(null);
  const [confirmError, setConfirmError] = useState<string | null>(null);

  // 1. Fetch Request Details (from props, API, or Firestore)
  useEffect(() => {
    let isMounted = true;

    async function loadRequestData() {
      if (!requestId) {
        setLoading(false);
        setLoadError('No emergency request ID provided in the link. Please check your verification link.');
        return;
      }

      setLoading(true);
      setLoadError(null);

      // Check in memory requests prop first
      const matched = requests.find((r) => r.id === requestId || r.id.toLowerCase() === requestId.toLowerCase());
      if (matched) {
        if (isMounted) {
          setRequest(matched);
          const lang = matched.beneficiaryLanguage || matched.payoutDetails?.beneficiaryLanguage || 'en';
          setSelectedLanguage(lang);
          if (matched.status === 'changes_requested') {
            setIsChangesRequested(true);
            setChangeNotes(matched.payoutDetails?.beneficiaryNotes || matched.statusNote || '');
          } else if (
            matched.status === 'ready_to_pay' ||
            matched.status === 'paid' ||
            matched.payoutDetails?.beneficiaryConfirmedAt
          ) {
            setIsConfirmed(true);
            setConfirmationTimestamp(matched.payoutDetails?.beneficiaryConfirmedAt || matched.updatedAt || new Date().toISOString());
          }
        }
      }

      // Fetch via public API endpoint to get freshest request and portal settings
      try {
        const res = await fetch(`/api/public/payout-details?id=${encodeURIComponent(requestId)}`);
        if (res.ok) {
          const data = await res.json();
          if (data.success && isMounted) {
            if (data.request) {
              setRequest(data.request);
              const lang = data.request.beneficiaryLanguage || data.request.payoutDetails?.beneficiaryLanguage || 'en';
              setSelectedLanguage(lang);
              if (data.request.status === 'changes_requested') {
                setIsChangesRequested(true);
                setChangeNotes(data.request.payoutDetails?.beneficiaryNotes || data.request.statusNote || '');
              } else if (
                data.request.status === 'ready_to_pay' ||
                data.request.status === 'paid' ||
                data.request.payoutDetails?.beneficiaryConfirmedAt
              ) {
                setIsConfirmed(true);
                setConfirmationTimestamp(
                  data.request.payoutDetails?.beneficiaryConfirmedAt || data.request.updatedAt || new Date().toISOString()
                );
              }
            }
            if (data.portalSettings) {
              setPortalSettings((prev) => ({
                ...prev,
                ...data.portalSettings,
                payoutPageTemplate: {
                  ...DEFAULT_BENEFICIARY_PAGE_TEMPLATE,
                  ...(prev?.payoutPageTemplate || {}),
                  ...(data.portalSettings.payoutPageTemplate || {}),
                },
              }));
              if (data.portalSettings.payoutPageTemplate) {
                setPageTemplate((prev) => ({
                  ...DEFAULT_BENEFICIARY_PAGE_TEMPLATE,
                  ...prev,
                  ...data.portalSettings.payoutPageTemplate,
                }));
              }
            }
            setLoading(false);
            return;
          }
        }
      } catch (err) {
        console.warn('API fetch error for public payout details:', err);
      }

      if (matched) {
        setLoading(false);
        return;
      }

      // Client-Side Firestore Fallback
      if (db) {
        try {
          const [docSnap, globalSettingsSnap] = await Promise.all([
            getDoc(doc(db, 'requests', requestId)),
            getDoc(doc(db, 'settings', 'global')),
          ]);

          if (globalSettingsSnap.exists() && isMounted) {
            const freshSettings = globalSettingsSnap.data() as PortalSettings;
            if (freshSettings?.payoutPageTemplate) {
              setPortalSettings((prev) => ({ ...prev, ...freshSettings }));
              setPageTemplate((prev) => ({
                ...DEFAULT_BENEFICIARY_PAGE_TEMPLATE,
                ...prev,
                ...freshSettings.payoutPageTemplate,
              }));
            }
          }

          if (docSnap.exists() && isMounted) {
            const reqData = { id: docSnap.id, ...docSnap.data() } as EmergencyRequest;
            setRequest(reqData);
            const lang = reqData.beneficiaryLanguage || reqData.payoutDetails?.beneficiaryLanguage || 'en';
            setSelectedLanguage(lang);
            if (reqData.status === 'changes_requested') {
              setIsChangesRequested(true);
              setChangeNotes(reqData.payoutDetails?.beneficiaryNotes || reqData.statusNote || '');
            } else if (
              reqData.status === 'ready_to_pay' ||
              reqData.status === 'paid' ||
              reqData.payoutDetails?.beneficiaryConfirmedAt
            ) {
              setIsConfirmed(true);
              setConfirmationTimestamp(
                reqData.payoutDetails?.beneficiaryConfirmedAt || reqData.updatedAt || new Date().toISOString()
              );
            }
            setLoading(false);
            return;
          }
        } catch (dbErr) {
          console.warn('Client Firestore fallback check notice:', dbErr);
        }
      }

      // Fallback: If not found
      if (isMounted) {
        setLoadError(`We could not find an active emergency relief grant with ID "${requestId}".`);
        setLoading(false);
      }
    }

    loadRequestData();

    return () => {
      isMounted = false;
    };
  }, [requestId, requests]);

  // 2. Translate Template and Text when language changes
  useEffect(() => {
    let isCancelled = false;

    async function applyTranslation() {
      if (!selectedLanguage || selectedLanguage.toLowerCase() === 'en') {
        const baseTpl = portalSettings.payoutPageTemplate || DEFAULT_BENEFICIARY_PAGE_TEMPLATE;
        setPageTemplate(baseTpl);
        return;
      }

      setIsTranslating(true);
      const baseTpl = portalSettings.payoutPageTemplate || DEFAULT_BENEFICIARY_PAGE_TEMPLATE;
      const langObj = getLanguageByCode(selectedLanguage);

      try {
        const translated = await translateTextMap(
          {
            headerTitle: baseTpl.headerTitle,
            headerSubtitle: baseTpl.headerSubtitle,
            instructions: baseTpl.instructions,
            confirmButtonText: baseTpl.confirmButtonText,
            correctButtonText: baseTpl.correctButtonText,
            successTitle: baseTpl.successTitle,
            successMessage: baseTpl.successMessage,
            changesRequestedTitle: baseTpl.changesRequestedTitle || 'Changes Requested — Contact Your Principal',
            changesRequestedMessage:
              baseTpl.changesRequestedMessage ||
              'Your request for changes has been submitted and sent back to your school principal. Please contact your principal directly to provide your corrected payment information.',
            footerNote: baseTpl.footerNote,
          },
          selectedLanguage,
          langObj.name
        );

        if (!isCancelled) {
          setPageTemplate(translated as any);
        }
      } catch (err) {
        console.warn('Error translating payout page template:', err);
      } finally {
        if (!isCancelled) {
          setIsTranslating(false);
        }
      }
    }

    applyTranslation();

    return () => {
      isCancelled = true;
    };
  }, [selectedLanguage, portalSettings.payoutPageTemplate]);

  // Context for template rendering
  const renderContext = {
    request_id: request?.id || requestId,
    beneficiary_name: request?.beneficiaryName || 'Beneficiary',
    student_name: request?.studentName || 'Student',
    school_name: request?.schoolName || 'Partner School',
    amount: request?.amount ? request.amount.toLocaleString() : '0',
    category: request?.category || 'Emergency Relief',
    payout_method_name:
      portalSettings.payoutMethods?.find((m) => m.id === request?.payoutDetails?.payoutMethodId)?.name ||
      request?.payoutDetails?.payoutMethodName ||
      'Direct Support',
  };

  // Current Method Config & Payout Details
  const payoutDetails = request?.payoutDetails;
  const currentMethodConfig = (portalSettings.payoutMethods || INITIAL_SETTINGS.payoutMethods).find(
    (m) => m.id === payoutDetails?.payoutMethodId
  );

  // 3. Handle Confirm Action -> Dual-Write (Client SDK + Server API) & Advance to ready_to_pay
  const handleConfirm = async () => {
    if (!request) return;
    setIsSubmittingConfirm(true);
    setConfirmError(null);

    const now = new Date().toISOString();
    const existingDetails = request.payoutDetails || ({} as Partial<RequestPayoutDetails>);
    const updatedPayoutDetails: RequestPayoutDetails = {
      payeeType: existingDetails.payeeType || 'beneficiary_direct',
      thirdPartyPayeeName: existingDetails.thirdPartyPayeeName,
      thirdPartyRelationship: existingDetails.thirdPartyRelationship,
      contactMethod: existingDetails.contactMethod || 'text',
      contactValue: existingDetails.contactValue || '',
      fundUse: existingDetails.fundUse || request.reason || request.category || '',
      payoutMethodId: existingDetails.payoutMethodId || 'zelle',
      payoutMethodName: existingDetails.payoutMethodName || 'Zelle',
      payoutData: existingDetails.payoutData || {},
      submittedAt: existingDetails.submittedAt || now,
      ...existingDetails,
      beneficiaryConfirmedAt: now,
      beneficiaryConfirmedBy: 'Beneficiary (Online Portal)',
      beneficiaryLanguage: selectedLanguage,
      beneficiaryLanguageName: getLanguageByCode(selectedLanguage).name,
    };

    const directFirestorePayload = {
      payoutDetails: cleanForFirestore(updatedPayoutDetails),
      status: 'ready_to_pay',
      statusUpdatedAt: now,
      statusNote: 'Beneficiary confirmed payout details online. Status advanced to Ready to Pay.',
      updatedAt: now,
    };

    let firestoreDirectSuccess = false;
    let serverApiSuccess = false;
    let lastErrorMessage = '';

    // 1. Direct Firestore write using Firebase Client SDK (instant local/remote sync)
    if (db) {
      try {
        const reqRef = doc(db, 'requests', request.id);
        await updateDoc(reqRef, directFirestorePayload);
        firestoreDirectSuccess = true;
      } catch (sdkErr: any) {
        console.warn('Direct client Firestore update failed, relying on server endpoint:', sdkErr);
      }
    }

    // 2. Parallel / Secondary Server API Call (for activity log & email notifications)
    try {
      const res = await fetch('/api/public/payout-confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestId: request.id,
          action: 'confirm',
          confirmedPayoutDetails: updatedPayoutDetails,
          language: selectedLanguage,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data && data.success) {
          serverApiSuccess = true;
        } else {
          lastErrorMessage = data?.error || 'Server reported an issue confirming payout.';
        }
      } else {
        lastErrorMessage = `Confirmation service error (HTTP ${res.status}).`;
      }
    } catch (err: any) {
      console.warn('Error calling public payout-confirm endpoint:', err);
      if (!lastErrorMessage) {
        lastErrorMessage = err?.message || 'Network error reaching payment confirmation service.';
      }
    }

    // Only show success if at least one persistent write path succeeded!
    if (firestoreDirectSuccess || serverApiSuccess) {
      if (onConfirmPayout) {
        onConfirmPayout(request.id, updatedPayoutDetails);
      }
      setRequest((prev) =>
        prev
          ? {
              ...prev,
              status: 'ready_to_pay',
              payoutDetails: updatedPayoutDetails,
              statusNote: 'Beneficiary confirmed payout details online. Status advanced to Ready to Pay.',
              updatedAt: now,
            }
          : prev
      );
      setConfirmError(null);
      setIsConfirmed(true);
      setConfirmationTimestamp(now);
    } else {
      // Failure state: Do NOT falsely show success!
      setConfirmError(
        lastErrorMessage ||
          'We could not verify your payment details due to a temporary network issue. Please check your connection and tap Retry Confirmation.'
      );
    }

    setIsSubmittingConfirm(false);
  };

  // 4. Handle Request Changes Action -> Set to changes_requested and notify principal
  const handleRequestChangesSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!request) return;
    setIsSubmittingChanges(true);

    const now = new Date().toISOString();
    const notes = changeNotes.trim();

    // React state update in parent
    if (onRequestChanges) {
      onRequestChanges(request.id, notes);
    }

    // Backend call
    try {
      await fetch('/api/public/payout-request-changes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestId: request.id,
          action: 'request_changes',
          notes,
          beneficiaryNotes: notes,
          language: selectedLanguage,
        }),
      });
    } catch (err) {
      console.warn('Error calling public payout-request-changes endpoint:', err);
    }

    setIsSubmittingChanges(false);
    setShowChangesModal(false);
    setIsChangesRequested(true);
  };

  const selectedLangObj = getLanguageByCode(selectedLanguage);

  const filteredLanguages = GCP_SUPPORTED_LANGUAGES.filter(
    (l) =>
      l.name.toLowerCase().includes(languageSearch.toLowerCase()) ||
      (l.nativeName && l.nativeName.toLowerCase().includes(languageSearch.toLowerCase())) ||
      l.code.toLowerCase().includes(languageSearch.toLowerCase())
  );

  // Render Loading
  if (loading) {
    return (
      <div className="min-h-screen bg-[#F3F6FA] flex flex-col items-center justify-center p-4">
        <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-lg border border-slate-200 text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-[#EDF7FC] text-[#0089B3] flex items-center justify-center mx-auto animate-pulse">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-[#0F172A]">Loading Payment Verification...</h2>
          <p className="text-xs text-slate-500">Retrieving disbursement instructions securely.</p>
          <div className="flex justify-center pt-2">
            <Loader2 className="w-6 h-6 animate-spin text-[#0089B3]" />
          </div>
        </div>
      </div>
    );
  }

  // Render Error
  if (loadError || !request) {
    return (
      <div className="min-h-screen bg-[#F3F6FA] flex flex-col items-center justify-center p-4">
        <div className="bg-white rounded-3xl p-8 max-w-lg w-full shadow-lg border border-red-200 text-center space-y-5">
          <div className="w-14 h-14 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center mx-auto border border-red-100">
            <AlertTriangle className="w-7 h-7" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-[#0F172A]" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
              Link Not Found or Expired
            </h2>
            <p className="text-xs text-slate-600 leading-relaxed">
              {loadError || 'We were unable to load the payment verification details for this link.'}
            </p>
          </div>
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-left text-xs text-slate-600 space-y-2">
            <div className="font-bold text-slate-800 flex items-center gap-1.5">
              <HelpCircle className="w-4 h-4 text-[#0089B3]" />
              Need Assistance?
            </div>
            <p className="text-[11px]">
              Please reach out to your school principal or coordinator, or contact Small Moves support at{' '}
              <strong className="text-slate-800">support@smallmoves.org</strong>.
            </p>
          </div>
          <Link
            to="/login"
            className="inline-flex items-center justify-center w-full px-5 py-2.5 bg-[#0F172A] hover:bg-[#1E293B] text-white text-xs font-bold rounded-xl transition shadow-xs"
          >
            Go to Portal Login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F3F6FA] text-slate-800 flex flex-col">
      {/* Top Banner Navigation */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
        <div className="max-w-4xl mx-auto px-4 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#0F172A] text-[#6EBF00] flex items-center justify-center font-black text-sm tracking-wider shadow-xs">
              PEF
            </div>
            <div>
              <div className="text-xs font-bold text-slate-900 leading-none">Small Moves Emergency Relief</div>
              <div className="text-[10px] text-slate-500 font-medium mt-0.5">Disbursement Verification Portal</div>
            </div>
          </div>

          {/* Language Selector Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowLanguageDropdown(!showLanguageDropdown)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs font-semibold text-slate-700 transition shadow-2xs cursor-pointer"
            >
              <Globe className="w-4 h-4 text-[#0089B3]" />
              <span>{selectedLangObj.name}</span>
              {isTranslating ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-[#0089B3]" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              )}
            </button>

            {showLanguageDropdown && (
              <div className="absolute right-0 mt-2 w-72 bg-white rounded-2xl shadow-xl border border-slate-200 p-2 z-50 animate-in fade-in zoom-in-95 duration-100">
                <div className="p-2 border-b border-slate-100 mb-1">
                  <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                    Select Your Language
                  </div>
                  <input
                    type="text"
                    placeholder="Search languages..."
                    value={languageSearch}
                    onChange={(e) => setLanguageSearch(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-[#0089B3]"
                    autoFocus
                  />
                </div>

                <div className="max-h-60 overflow-y-auto space-y-0.5 pr-1">
                  {filteredLanguages.map((lang) => {
                    const isSelected = selectedLanguage === lang.code;
                    return (
                      <button
                        key={lang.code}
                        type="button"
                        onClick={() => {
                          setSelectedLanguage(lang.code);
                          setShowLanguageDropdown(false);
                          setLanguageSearch('');
                        }}
                        className={`w-full flex items-center justify-between px-2.5 py-2 text-xs rounded-lg text-left transition cursor-pointer ${
                          isSelected
                            ? 'bg-[#EDF7FC] text-[#0089B3] font-bold'
                            : 'hover:bg-slate-50 text-slate-700'
                        }`}
                      >
                        <div>
                          <div>{lang.name}</div>
                          <div className="text-[10px] text-slate-400 font-normal">{lang.nativeName}</div>
                        </div>
                        {isSelected && <Check className="w-4 h-4 text-[#0089B3]" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Container */}
      <main className="max-w-4xl mx-auto px-4 py-8 flex-1 w-full space-y-6">
        {/* Header Title & Subtitle Card */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 md:p-8 shadow-xs space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#EDF7FC] text-[#0089B3] text-[11px] font-bold">
            <ShieldCheck className="w-3.5 h-3.5" />
            Official Relief Support Disbursement
          </div>
          <h1
            className="text-2xl md:text-3xl font-extrabold text-[#0F172A] tracking-tight"
            style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
          >
            {renderEmailText(pageTemplate.headerTitle, renderContext)}
          </h1>
          <p className="text-xs md:text-sm text-slate-600 leading-relaxed">
            {renderEmailText(pageTemplate.headerSubtitle, renderContext)}
          </p>
        </div>

        {/* State 1: Success Confirmed Screen */}
        {isConfirmed ? (
          <div className="bg-white rounded-3xl border border-emerald-200 shadow-md p-6 md:p-8 space-y-6 animate-in fade-in duration-300">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <div className="space-y-1">
                <h2 className="text-xl md:text-2xl font-bold text-slate-900" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
                  {renderEmailText(pageTemplate.successTitle, renderContext)}
                </h2>
                <p className="text-xs md:text-sm text-slate-600 leading-relaxed">
                  {renderEmailText(pageTemplate.successMessage, renderContext)}
                </p>
              </div>
            </div>

            {/* Confirmation Receipt Details */}
            <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200 space-y-3 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Grant Reference</div>
                  <div className="font-bold text-slate-900 mt-0.5">{request.id}</div>
                </div>
                <div>
                  <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Beneficiary Name</div>
                  <div className="font-bold text-slate-900 mt-0.5">{request.beneficiaryName}</div>
                </div>
                <div>
                  <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Disbursement Amount</div>
                  <div className="font-bold text-[#6EBF00] text-sm mt-0.5">${request.amount.toLocaleString()}</div>
                </div>
                <div>
                  <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Confirmed Method</div>
                  <div className="font-bold text-slate-900 mt-0.5">
                    {currentMethodConfig?.name || request.payoutDetails?.payoutMethodName || 'Direct Transfer'}
                  </div>
                </div>
                {confirmationTimestamp && (
                  <div className="sm:col-span-2">
                    <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Verification Timestamp</div>
                    <div className="text-slate-600 mt-0.5">
                      {new Date(confirmationTimestamp).toLocaleString()}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Footer Support Info */}
            <div className="p-4 bg-[#EDF7FC] rounded-2xl border border-[#0089B3]/20 flex items-center gap-3 text-xs text-slate-700">
              <Info className="w-5 h-5 text-[#0089B3] shrink-0" />
              <p className="text-[11px] leading-relaxed">
                {renderEmailText(pageTemplate.footerNote, renderContext)}
              </p>
            </div>
          </div>
        ) : isChangesRequested ? (
          /* State 2: Changes Requested Screen (Returned to Principal) */
          <div className="bg-white rounded-3xl border border-amber-200 shadow-md p-6 md:p-8 space-y-6 animate-in fade-in duration-300">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-7 h-7" />
              </div>
              <div className="space-y-1">
                <h2 className="text-xl md:text-2xl font-bold text-slate-900" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
                  {renderEmailText(
                    pageTemplate.changesRequestedTitle || 'Changes Requested — Contact Your Principal',
                    renderContext
                  )}
                </h2>
                <p className="text-xs md:text-sm text-slate-600 leading-relaxed">
                  {renderEmailText(
                    pageTemplate.changesRequestedMessage ||
                      'Your request for changes has been submitted and sent back to your school principal. Please contact your principal directly to provide your corrected payment information.',
                    renderContext
                  )}
                </p>
              </div>
            </div>

            {/* Request Summary & Principal Contact Card */}
            <div className="bg-amber-50/50 rounded-2xl p-5 border border-amber-200/80 space-y-4 text-xs">
              <div className="font-bold text-slate-900 uppercase tracking-wider text-[11px]">
                Grant Information & Principal Contact
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase">Grant ID</div>
                  <div className="font-bold text-slate-800 mt-0.5">{request.id}</div>
                </div>
                <div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase">Partner School</div>
                  <div className="font-bold text-slate-800 mt-0.5">{request.schoolName}</div>
                </div>
                <div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase">School Principal / Contact</div>
                  <div className="font-bold text-slate-800 mt-0.5">{request.submitterName || 'School Principal'}</div>
                </div>
                <div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase">Principal Email</div>
                  <div className="font-bold text-slate-800 mt-0.5">
                    {request.submitterEmail ? (
                      <a
                        href={`mailto:${request.submitterEmail}?subject=PEF%20Payment%20Correction%20for%20${encodeURIComponent(
                          request.beneficiaryName
                        )}%20(Grant%20${request.id})`}
                        className="text-[#0089B3] hover:underline"
                      >
                        {request.submitterEmail}
                      </a>
                    ) : (
                      'Contact your school office'
                    )}
                  </div>
                </div>
              </div>

              {changeNotes && (
                <div className="pt-2 border-t border-amber-200/60">
                  <div className="text-[10px] font-bold text-slate-400 uppercase">Your Notes for Principal</div>
                  <div className="font-semibold text-slate-800 mt-0.5 bg-white p-3 rounded-xl border border-amber-200 text-xs">
                    "{changeNotes}"
                  </div>
                </div>
              )}
            </div>

            {/* Direct Action for Beneficiary */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-700">
              <div className="flex items-center gap-2.5">
                <Mail className="w-5 h-5 text-[#0089B3] shrink-0" />
                <span className="text-[11px]">
                  Need to send your updated details right away? Reach out to your principal directly.
                </span>
              </div>
              {request.submitterEmail && (
                <a
                  href={`mailto:${request.submitterEmail}?subject=PEF%20Payment%20Correction%20for%20${encodeURIComponent(
                    request.beneficiaryName
                  )}%20(Grant%20${request.id})`}
                  className="px-4 py-2 bg-[#0F172A] hover:bg-[#1E293B] text-white rounded-xl font-bold text-xs whitespace-nowrap transition"
                >
                  Email Principal Now
                </a>
              )}
            </div>

            {/* Footer Support Info */}
            <div className="p-4 bg-[#EDF7FC] rounded-2xl border border-[#0089B3]/20 flex items-center gap-3 text-xs text-slate-700">
              <Info className="w-5 h-5 text-[#0089B3] shrink-0" />
              <p className="text-[11px] leading-relaxed">
                {renderEmailText(pageTemplate.footerNote, renderContext)}
              </p>
            </div>
          </div>
        ) : (
          /* State 3: Active Payout Review & Confirmation Flow */
          <div className="space-y-6">
            {/* Grant Context Box */}
            <div className="bg-[#0F172A] text-white rounded-3xl p-6 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-md bg-white/10 text-slate-300 text-[10px] font-bold uppercase tracking-wider">
                    {request.id}
                  </span>
                  <span className="text-xs text-slate-400 font-medium">Partner School: {request.schoolName}</span>
                </div>
                <div className="text-lg font-bold text-white">
                  {request.beneficiaryName} {request.studentName && `· Student: ${request.studentName}`}
                </div>
                <div className="text-xs text-slate-300">
                  Purpose: {request.reason || request.category || 'Emergency Relief Assistance'}
                </div>
              </div>

              <div className="md:text-right border-t md:border-t-0 border-white/10 pt-3 md:pt-0">
                <div className="text-3xl font-extrabold text-[#6EBF00]" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
                  ${request.amount.toLocaleString()}
                </div>
                <div className="text-[11px] text-slate-400 font-medium">Approved Emergency Relief</div>
              </div>
            </div>

            {/* Main Form Card */}
            <div className="bg-white rounded-3xl border border-slate-200 shadow-xs p-6 md:p-8 space-y-6">
              {/* Instructions Paragraph */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-xs text-slate-700 leading-relaxed">
                {renderEmailText(pageTemplate.instructions, renderContext)}
              </div>

              {/* Review Current Payment Destination Information */}
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-3">
                    Payment Destination Information
                  </h3>

                  <div className="bg-slate-50/80 rounded-2xl border border-slate-200 p-5 space-y-4 text-xs">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-[#0089B3]">
                          <CreditCard className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="text-[10px] font-bold text-slate-400 uppercase">Disbursement Method</div>
                          <div className="text-sm font-bold text-slate-900">
                            {currentMethodConfig?.name || request.payoutDetails?.payoutMethodName || 'Zelle'}
                          </div>
                        </div>
                      </div>

                      <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 font-bold text-[10px] border border-emerald-200">
                        Verification Required
                      </span>
                    </div>

                    {/* Payee Details */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <div className="text-[10px] font-bold text-slate-400 uppercase">Payee Type</div>
                        <div className="font-semibold text-slate-800 mt-0.5">
                          {payoutDetails?.payeeType === 'third_party'
                            ? 'Third-Party Payee / Provider'
                            : 'Direct to Beneficiary'}
                        </div>
                      </div>

                      {payoutDetails?.payeeType === 'third_party' && payoutDetails.thirdPartyPayeeName && (
                        <div>
                          <div className="text-[10px] font-bold text-slate-400 uppercase">Third-Party Payee Name</div>
                          <div className="font-semibold text-slate-800 mt-0.5">
                            {payoutDetails.thirdPartyPayeeName}{' '}
                            {payoutDetails.thirdPartyRelationship && `(${payoutDetails.thirdPartyRelationship})`}
                          </div>
                        </div>
                      )}

                      {/* Payout Data Fields */}
                      {currentMethodConfig?.fields?.map((field) => {
                        const val = payoutDetails?.payoutData?.[field.key];
                        if (!val) return null;
                        return (
                          <div key={field.key}>
                            <div className="text-[10px] font-bold text-slate-400 uppercase">{field.label}</div>
                            <div className="font-bold text-slate-900 mt-0.5">{val}</div>
                          </div>
                        );
                      })}

                      {/* Fallback for raw payoutData keys if not in config */}
                      {!currentMethodConfig?.fields &&
                        payoutDetails?.payoutData &&
                        Object.entries(payoutDetails.payoutData).map(([k, v]) => {
                          if (!v) return null;
                          return (
                            <div key={k}>
                              <div className="text-[10px] font-bold text-slate-400 uppercase">{k}</div>
                              <div className="font-bold text-slate-900 mt-0.5">{String(v)}</div>
                            </div>
                          );
                        })}

                      {payoutDetails?.contactValue && (
                        <div>
                          <div className="text-[10px] font-bold text-slate-400 uppercase">Contact Confirmation</div>
                          <div className="font-semibold text-slate-800 mt-0.5">
                            {payoutDetails.contactMethod === 'email' ? 'Email: ' : 'Phone: '}
                            {payoutDetails.contactValue}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Inline Error Alert if Confirmation Save Failed */}
                {confirmError && (
                  <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl space-y-2 text-xs text-rose-900 animate-in fade-in duration-200">
                    <div className="flex items-center gap-2 font-bold text-rose-800">
                      <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                      <span>Confirmation Could Not Be Saved</span>
                    </div>
                    <p className="text-[11px] text-rose-700 leading-relaxed">
                      {confirmError}
                    </p>
                    <div className="pt-1 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleConfirm}
                        disabled={isSubmittingConfirm}
                        className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition cursor-pointer shadow-xs"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${isSubmittingConfirm ? 'animate-spin' : ''}`} />
                        <span>Retry Confirmation</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmError(null)}
                        className="px-3 py-1.5 border border-rose-200 hover:bg-rose-100/60 text-rose-700 font-semibold rounded-xl text-xs transition cursor-pointer"
                      >
                        Dismiss
                      </button>
                    </div>
                  </div>
                )}

                {/* Two Action Buttons: Confirm OR Request Edits from Principal */}
                <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
                  <button
                    type="button"
                    onClick={handleConfirm}
                    disabled={isSubmittingConfirm}
                    className="w-full sm:flex-1 py-3.5 px-6 rounded-2xl bg-[#6EBF00] hover:bg-[#5da300] text-slate-950 font-extrabold text-xs tracking-wide shadow-md flex items-center justify-center gap-2 transition active:scale-[0.99] cursor-pointer"
                  >
                    {isSubmittingConfirm ? (
                      <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4 text-slate-950" />
                    )}
                    <span>{renderEmailText(pageTemplate.confirmButtonText, renderContext)}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowChangesModal(true)}
                    className="w-full sm:w-auto py-3.5 px-5 rounded-2xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer"
                  >
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                    <span>{renderEmailText(pageTemplate.correctButtonText, renderContext)}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Footer Support Info */}
            <div className="p-4 bg-white rounded-2xl border border-slate-200 flex items-center gap-3 text-xs text-slate-600">
              <HelpCircle className="w-5 h-5 text-[#0089B3] shrink-0" />
              <p className="text-[11px] leading-relaxed">
                {renderEmailText(pageTemplate.footerNote, renderContext)}
              </p>
            </div>
          </div>
        )}
      </main>

      {/* Changes Request Modal */}
      {showChangesModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 md:p-8 shadow-2xl border border-slate-200 space-y-5 animate-in zoom-in-95 duration-150">
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-200">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Request Payment Detail Changes</h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">Send this grant back to your school principal</p>
                </div>
              </div>
            </div>

            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-xs text-slate-700 space-y-2">
              <p className="font-semibold text-slate-900">How corrections work:</p>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                For security and privacy, payment destination details can only be modified by your school principal or authorized school leader.
              </p>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                Submitting this request will update the grant status to <strong>"Changes Requested"</strong> and immediately notify your principal (<strong className="text-slate-800">{request.submitterName || request.schoolName}</strong>) to update the record.
              </p>
            </div>

            <form onSubmit={handleRequestChangesSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  What needs to be updated? <span className="text-slate-400 font-normal">(Optional)</span>
                </label>
                <textarea
                  rows={3}
                  value={changeNotes}
                  onChange={(e) => setChangeNotes(e.target.value)}
                  placeholder="e.g. My Zelle phone number has changed, or please send via paper check to my new address..."
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
                <button
                  type="submit"
                  disabled={isSubmittingChanges}
                  className="w-full sm:flex-1 py-3 px-5 rounded-2xl bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-xs shadow-md flex items-center justify-center gap-2 transition cursor-pointer"
                >
                  {isSubmittingChanges ? (
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                  ) : (
                    <Send className="w-4 h-4 text-white" />
                  )}
                  <span>Send Request to Principal</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowChangesModal(false)}
                  disabled={isSubmittingChanges}
                  className="w-full sm:w-auto py-3 px-5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-4 text-center text-slate-400 text-[11px]">
        Small Moves Principal Emergency Fund &copy; {new Date().getFullYear()} · Official Relief Portal
      </footer>
    </div>
  );
};
