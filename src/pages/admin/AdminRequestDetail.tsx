import React, { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Edit3,
  CreditCard,
  MessageSquare,
  Clock,
  UserCheck,
  Send,
  Building2,
  FileText,
  AlertCircle,
  HelpCircle,
  Bell,
  MessageCircle,
  RotateCcw,
  Eye,
  EyeOff,
  Mail,
  PhoneCall,
} from 'lucide-react';
import { EmergencyRequest, ActivityEvent, SystemRequestStatus, TaskContext, EmailLogEntry } from '../../types';
import { StatusBadge } from '../../components/common/StatusBadge';
import { StatusStepper } from '../../components/common/StatusStepper';
import { SendBackModal } from '../../components/requests/SendBackModal';
import { DenyModal } from '../../components/requests/DenyModal';
import { EditRequestModal } from '../../components/requests/EditRequestModal';
import { EditPayoutModal } from '../../components/requests/EditPayoutModal';
import { EmailDetailModal } from '../../components/requests/EmailDetailModal';
import { ResolvePrincipalTaskModal } from '../../components/requests/ResolvePrincipalTaskModal';
import { CancelRequestModal } from '../../components/requests/CancelRequestModal';
import { INITIAL_SETTINGS } from '../../data/defaultSettings';
import { generateEmailLogEntry, generateAndTranslateEmailLogEntry, generateAndTranslateSmsLogEntry } from '../../utils/emailUtils';
import { dispatchEmail } from '../../services/emailService';
import { dispatchSms } from '../../services/smsService';
import { useAuth } from '../../context/AuthContext';

interface AdminRequestDetailProps {
  requests: EmergencyRequest[];
  activityLogs: ActivityEvent[];
  settings?: any; // Just use any for PortalSettings to avoid importing issues
  onUpdateRequestStatus: (
    requestId: string,
    newStatus: SystemRequestStatus,
    note?: string,
    taskContext?: TaskContext
  ) => void;
  onUpdateRequest: (
    id: string,
    updates: Partial<EmergencyRequest>,
    options?: { customLogMessage?: string; skipLog?: boolean; eventType?: ActivityEvent['eventType'] }
  ) => void;
  onAddActivityNote: (requestId: string, message: string, isInternalNote?: boolean) => void;
  onCancelRequest?: (request: EmergencyRequest, reason?: string) => void;
  maxPerRequestAmount?: number;
}

export const AdminRequestDetail: React.FC<AdminRequestDetailProps> = ({
  requests,
  activityLogs,
  settings,
  onUpdateRequestStatus,
  onUpdateRequest,
  onAddActivityNote,
  onCancelRequest,
  maxPerRequestAmount = 2000,
}) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { userProfile } = useAuth();

  const request = requests.find((r) => r.id === id);

  const [sendBackModalOpen, setSendBackModalOpen] = useState(false);
  const [denyModalOpen, setDenyModalOpen] = useState(false);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [resolveTaskModalOpen, setResolveTaskModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [payoutModalOpen, setPayoutModalOpen] = useState(false);
  const [reverseModalOpen, setReverseModalOpen] = useState(false);
  const [reverseReason, setReverseReason] = useState('');
  const [showFullAch, setShowFullAch] = useState(false);
  const [internalNoteText, setInternalNoteText] = useState('');
  const [reminderSentAlert, setReminderSentAlert] = useState(false);
  const [isResendingPrincipal, setIsResendingPrincipal] = useState(false);
  const [beneficiaryResentAlert, setBeneficiaryResentAlert] = useState(false);
  const [isResendingBeneficiary, setIsResendingBeneficiary] = useState(false);
  const [selectedEmailForModal, setSelectedEmailForModal] = useState<EmailLogEntry | null>(null);

  const effectiveEmailLogs: EmailLogEntry[] = React.useMemo(() => {
    if (!request) return [];
    if (request.emailLogs && request.emailLogs.length > 0) {
      return request.emailLogs;
    }
    const templates = settings?.emailTemplates || INITIAL_SETTINGS.emailTemplates;
    const logs: EmailLogEntry[] = [];
    const subLog = generateEmailLogEntry(request, 'request_submission', templates);
    if (subLog) logs.push(subLog);
    if (request.status !== 'in_review') {
      const statusLog = generateEmailLogEntry(request, request.status, templates);
      if (statusLog) logs.push(statusLog);
    }
    return logs;
  }, [request, settings]);

  if (!request) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 text-center">
        <h2 className="text-xl font-bold text-slate-800">Request Not Found</h2>
        <Link to="/admin/requests" className="text-xs font-bold text-emerald-600 hover:underline mt-2 inline-block">
          Return to Admin Queue
        </Link>
      </div>
    );
  }

  const reqLogs = activityLogs.filter((l) => l.requestId === request.id);

  // Prior giving history across all schools
  const priorGiving = requests.filter(
    (r) =>
      r.id !== request.id &&
      r.beneficiaryName.toLowerCase() === request.beneficiaryName.toLowerCase() &&
      r.status === 'paid'
  );

  const handlePostNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!internalNoteText.trim()) return;
    onAddActivityNote(request.id, internalNoteText.trim(), true);
    setInternalNoteText('');
  };

  const handleSendReminder = async () => {
    setIsResendingPrincipal(true);
    const existingEmailLogs = request.emailLogs && request.emailLogs.length > 0 ? request.emailLogs : effectiveEmailLogs;
    let newEmailLogs = [...existingEmailLogs];

    const reminderEmailLog =
      (await generateAndTranslateEmailLogEntry(
        request,
        'reminder_scheduled',
        settings?.emailTemplates || INITIAL_SETTINGS.emailTemplates,
        'Automated reminder: Action is pending on this emergency fund request.'
      )) ||
      (await generateAndTranslateEmailLogEntry(
        request,
        'status_change_to_waiting_on_principal',
        settings?.emailTemplates || INITIAL_SETTINGS.emailTemplates,
        'Automated reminder: Action is pending on this emergency fund request.'
      ));

    if (reminderEmailLog) {
      newEmailLogs = [reminderEmailLog, ...newEmailLogs];

      const isBeneficiaryRole = !!(
        reminderEmailLog.recipientRole &&
        reminderEmailLog.recipientRole.toLowerCase().includes('beneficiary')
      );

      if (settings) {
        dispatchEmail(
          {
            to: reminderEmailLog.recipientEmail,
            recipientName: reminderEmailLog.recipientName,
            recipientRole: reminderEmailLog.recipientRole,
            subject: reminderEmailLog.subject,
            body: reminderEmailLog.body,
            templateId: reminderEmailLog.templateId,
            triggerEvent: reminderEmailLog.triggerEvent,
            requestId: request.id,
            schoolId: request.schoolId,
            schoolName: request.schoolName,
            targetLanguage: reminderEmailLog.language,
            targetLanguageName: reminderEmailLog.languageName,
            isBeneficiaryEmail: isBeneficiaryRole,
          },
          settings,
          userProfile?.email
        ).catch((err) => console.error('Error dispatching reminder email:', err));
      }

      if (onUpdateRequest) {
        onUpdateRequest(
          request.id,
          {
            emailLogs: newEmailLogs,
          },
          { skipLog: true }
        );
      }
    }

    onAddActivityNote(request.id, `Admin resent email notification/reminder to principal / submitter (${request.submitterEmail}).`);
    setIsResendingPrincipal(false);
    setReminderSentAlert(true);
    setTimeout(() => setReminderSentAlert(false), 3000);
  };

  const handleResendBeneficiaryConfirmation = async () => {
    // Guard: Never dispatch reminders if beneficiary already confirmed payment details
    if (request.payoutDetails?.beneficiaryConfirmedAt) {
      return;
    }

    setIsResendingBeneficiary(true);
    const existingEmailLogs = request.emailLogs && request.emailLogs.length > 0 ? request.emailLogs : effectiveEmailLogs;
    const existingSmsLogs = request.smsLogs || [];
    let newEmailLogs = [...existingEmailLogs];
    let newSmsLogs = [...existingSmsLogs];

    const contactMethod = request.payoutDetails?.contactMethod;
    const contactValue = request.payoutDetails?.contactValue?.trim() || '';
    const isEmailContact = contactMethod === 'email' || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactValue);
    const isTextContact = contactMethod === 'text' || /^\+?[0-9\s\-()]{7,}$/.test(contactValue);

    // Only dispatch confirmation email to beneficiary if contact method is email
    if (contactMethod ? contactMethod === 'email' : isEmailContact) {
      const beneficiaryEmailLog = await generateAndTranslateEmailLogEntry(
        request,
        'status_change_to_waiting_on_beneficiary',
        settings?.emailTemplates || INITIAL_SETTINGS.emailTemplates,
        'Beneficiary verification confirmation notification re-sent.'
      );

      if (beneficiaryEmailLog) {
        newEmailLogs = [beneficiaryEmailLog, ...newEmailLogs];

        const isBeneficiaryRole = !!(
          beneficiaryEmailLog.recipientRole &&
          beneficiaryEmailLog.recipientRole.toLowerCase().includes('beneficiary')
        );

        if (settings) {
          dispatchEmail(
            {
              to: beneficiaryEmailLog.recipientEmail,
              recipientName: beneficiaryEmailLog.recipientName,
              recipientRole: beneficiaryEmailLog.recipientRole,
              subject: beneficiaryEmailLog.subject,
              body: beneficiaryEmailLog.body,
              templateId: beneficiaryEmailLog.templateId,
              triggerEvent: beneficiaryEmailLog.triggerEvent,
              requestId: request.id,
              schoolId: request.schoolId,
              schoolName: request.schoolName,
              targetLanguage: beneficiaryEmailLog.language,
              targetLanguageName: beneficiaryEmailLog.languageName,
              isBeneficiaryEmail: isBeneficiaryRole,
            },
            settings,
            userProfile?.email
          ).catch((err) => console.error('Error dispatching beneficiary confirmation email:', err));
        }
      }
    }

    // Only dispatch SMS if contact method is text/SMS
    if (contactMethod ? contactMethod === 'text' : isTextContact) {
      const beneficiarySmsLog = await generateAndTranslateSmsLogEntry(
        request,
        'status_change_to_waiting_on_beneficiary',
        'Beneficiary verification confirmation re-sent via SMS.'
      );

      if (beneficiarySmsLog) {
        newSmsLogs = [beneficiarySmsLog, ...newSmsLogs];

        if (settings) {
          dispatchSms(
            {
              to: beneficiarySmsLog.to,
              text: beneficiarySmsLog.text,
              recipientName: beneficiarySmsLog.recipientName,
              recipientRole: 'beneficiary',
              targetLanguage: beneficiarySmsLog.language,
              targetLanguageName: beneficiarySmsLog.languageName,
              triggerEvent: 'status_change_to_waiting_on_beneficiary',
              requestId: request.id,
              schoolId: request.schoolId,
              schoolName: request.schoolName,
            },
            settings,
            userProfile?.email
          ).catch((err) => console.error('Error dispatching beneficiary confirmation SMS:', err));
        }
      }
    }

    if (onUpdateRequest) {
      onUpdateRequest(
        request.id,
        {
          emailLogs: newEmailLogs,
          smsLogs: newSmsLogs,
        },
        { skipLog: true }
      );
    }

    onAddActivityNote(
      request.id,
      `Beneficiary confirmation notification resent to ${request.payoutDetails?.contactValue || request.beneficiaryName}.`
    );
    setIsResendingBeneficiary(false);
    setBeneficiaryResentAlert(true);
    setTimeout(() => setBeneficiaryResentAlert(false), 3000);
  };

  const handleConfirmBeneficiary = () => {
    const updatedPayout = request.payoutDetails
      ? {
          ...request.payoutDetails,
          beneficiaryConfirmedAt: new Date().toISOString(),
          beneficiaryConfirmedBy: userProfile?.displayName || userProfile?.email || 'PEF Administrator',
        }
      : undefined;

    onUpdateRequest(request.id, {
      payoutDetails: updatedPayout,
      status: 'ready_to_pay',
      statusNote: 'Beneficiary identity confirmed by admin. Queue moved to Ready to Pay.',
    });
  };

  const handleReverseDenial = (e: React.FormEvent) => {
    e.preventDefault();
    const note = reverseReason.trim()
      ? `Denial reversed by admin. Reason: ${reverseReason.trim()}`
      : 'Denial reversed by admin. Reopened request for review.';

    onUpdateRequestStatus(request.id, 'in_review', note);
    setReverseModalOpen(false);
    setReverseReason('');
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Back Button */}
      <div className="flex items-center justify-between">
        <Link
          to="/admin/requests"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-800"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Admin Master Queue
        </Link>
      </div>

      {reminderSentAlert && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs font-bold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-amber-600" />
          <span>Notification email resent successfully to principal / submitter ({request.submitterEmail})!</span>
        </div>
      )}

      {beneficiaryResentAlert && (
        <div className="p-3 bg-purple-50 border border-purple-200 rounded-xl text-purple-900 text-xs font-bold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-purple-600" />
          <span>Beneficiary confirmation notification resent successfully to {request.payoutDetails?.contactValue || request.beneficiaryName}!</span>
        </div>
      )}

      {/* Header Info */}
      <div className="bg-[#0F172A] text-white rounded-2xl p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-white" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>{request.id}</h1>
            <StatusBadge status={request.status} isAdminView />
          </div>
          <p className="text-xs text-slate-300 mt-1">
            School: <strong className="text-white">{request.schoolName}</strong> · Beneficiary:{' '}
            <strong className="text-white">{request.beneficiaryName}</strong> · Requestor:{' '}
            <strong className="text-white">{request.submitterName}</strong>
          </p>
        </div>

        {/* Dynamic Context Actions */}
        <div className="flex items-center gap-2 flex-wrap lg:flex-nowrap justify-start lg:justify-end shrink-0">
          {(request.status === 'denied' || request.status === 'canceled') && (
            <button
              onClick={() => setReverseModalOpen(true)}
              className="h-9 px-3.5 bg-[#0089B3] hover:bg-[#007399] text-white font-bold rounded-xl text-xs shadow-sm flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reopen Request
            </button>
          )}

          {request.status === 'in_review' && (
            <>
              <button
                onClick={() =>
                  onUpdateRequestStatus(request.id, 'waiting_on_principal', 'Approved by admin review.')
                }
                className="h-9 px-3.5 bg-[#6EBF00] hover:bg-[#5ea300] text-slate-950 font-bold rounded-xl text-xs shadow-sm flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                Approve
              </button>
              <button
                onClick={() => setSendBackModalOpen(true)}
                className="h-9 px-3 bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 hover:border-amber-500/40 font-semibold rounded-xl text-xs flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <HelpCircle className="w-3.5 h-3.5 text-amber-400" />
                Request Info
              </button>
              <button
                onClick={() => setDenyModalOpen(true)}
                className="h-9 px-3 bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 font-semibold rounded-xl text-xs flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <XCircle className="w-3.5 h-3.5 text-rose-400" />
                Deny
              </button>
            </>
          )}

          {(request.status === 'waiting_on_principal' ||
            request.status === 'changes_requested' ||
            request.status === 'response_requested') && (
            <button
              onClick={() => setResolveTaskModalOpen(true)}
              className="h-9 px-3.5 bg-[#0089B3] hover:bg-[#007399] text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
            >
              <PhoneCall className="w-3.5 h-3.5" />
              Resolve Offline
            </button>
          )}

          {request.status === 'waiting_on_principal' && (
            <button
              onClick={handleSendReminder}
              disabled={isResendingPrincipal}
              className="h-9 px-3 bg-slate-800 hover:bg-slate-700 text-amber-200 border border-slate-700 hover:border-amber-500/40 font-semibold rounded-xl text-xs flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5 text-amber-400" />
              {isResendingPrincipal ? 'Sending...' : 'Resend Comms'}
            </button>
          )}

          {request.status === 'waiting_on_beneficiary' && (
            <>
              <button
                onClick={handleConfirmBeneficiary}
                className="h-9 px-3.5 bg-[#0089B3] hover:bg-[#007399] text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
              >
                <UserCheck className="w-3.5 h-3.5" />
                Confirm Beneficiary
              </button>
              <button
                onClick={handleResendBeneficiaryConfirmation}
                disabled={isResendingBeneficiary}
                className="h-9 px-3 bg-slate-800 hover:bg-slate-700 text-purple-200 border border-slate-700 hover:border-purple-500/40 font-semibold rounded-xl text-xs flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5 text-purple-300" />
                {isResendingBeneficiary ? 'Sending...' : 'Resend Comms'}
              </button>
            </>
          )}

          {request.status === 'ready_to_pay' && (
            <>
              <button
                onClick={() => onUpdateRequestStatus(request.id, 'paid', 'Disbursement recorded as paid.')}
                className="h-9 px-4 bg-[#6EBF00] hover:bg-[#5ea300] text-slate-950 font-bold rounded-xl text-xs shadow-sm flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                Mark as Paid
              </button>
              <button
                onClick={() => setSendBackModalOpen(true)}
                className="h-9 px-3 bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 font-semibold rounded-xl text-xs flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <HelpCircle className="w-3.5 h-3.5 text-amber-400" />
                Send Back
              </button>
            </>
          )}

          {request.status !== 'paid' && request.status !== 'denied' && request.status !== 'canceled' && (
            <button
              onClick={() => setCancelModalOpen(true)}
              className="h-9 px-3 bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 font-semibold rounded-xl text-xs flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <XCircle className="w-3.5 h-3.5 text-rose-400" />
              Cancel
            </button>
          )}

          <button
            onClick={() => setEditModalOpen(true)}
            className="h-9 px-3 bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700/60 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <Edit3 className="w-3.5 h-3.5 text-slate-400" />
            Edit
          </button>
        </div>
      </div>

      {/* Progress Stepper */}
      <StatusStepper request={request} isAdminView />

      {/* Prior Giving History Alert */}
      {priorGiving.length > 0 && (
        <div className="p-4 bg-purple-50 border border-purple-200 rounded-2xl flex items-center gap-3 text-purple-900 text-xs">
          <CheckCircle2 className="w-5 h-5 text-purple-600 shrink-0" />
          <div>
            <p className="font-bold">Prior Beneficiary Grant History ({priorGiving.length} prior paid requests)</p>
            <p className="text-[11px] text-purple-700">
              Total previous funds disbursed to {request.beneficiaryName}: $
              {priorGiving.reduce((sum, r) => sum + r.amount, 0).toLocaleString()}
            </p>
          </div>
        </div>
      )}

      {/* Grid: Details & Internal Notes */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Left Column (3/5 lg) */}
        <div className="lg:col-span-3 space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4 text-xs">
            <h3 className="text-sm font-bold text-slate-900 border-b pb-2">Request Details</h3>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-slate-400 font-medium">Beneficiary Name</span>
                <p className="font-bold text-slate-900 text-sm">{request.beneficiaryName}</p>
              </div>

              <div>
                <span className="text-slate-400 font-medium">Student</span>
                <p className="font-bold text-slate-800">{request.studentName || '—'}</p>
              </div>

              <div>
                <span className="text-slate-400 font-medium">Amount</span>
                <p className="font-extrabold text-slate-900 text-base">${request.amount.toLocaleString()}</p>
              </div>

              <div>
                <span className="text-slate-400 font-medium">Reason for Request</span>
                <p className="font-bold text-slate-800">{request.reason || request.category}</p>
              </div>

              <div>
                <span className="text-slate-400 font-medium">Requestor</span>
                <p className="font-bold text-slate-900">
                  {request.submitterName || '—'}
                  {request.submitterRole ? (
                    <span className="ml-1.5 text-[11px] font-semibold text-slate-500 capitalize">
                      ({request.submitterRole.replace('_', ' ')})
                    </span>
                  ) : null}
                </p>
                {request.submitterEmail && (
                  <p className="text-[11px] text-slate-500 mt-0.5">{request.submitterEmail}</p>
                )}
              </div>

              <div>
                <span className="text-slate-400 font-medium">Submitted Date</span>
                <p className="font-bold text-slate-800">
                  {new Date(request.createdAt).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                    hour: 'numeric',
                    minute: '2-digit',
                  })}
                </p>
              </div>

              {request.additionalContext && (
                <div className="col-span-2 bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <span className="text-slate-400 font-medium block mb-1">Additional Context</span>
                  <p className="text-slate-700 leading-relaxed font-medium">{request.additionalContext}</p>
                </div>
              )}
            </div>
          </div>

          {/* Payout Details */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4 text-xs">
            <div className="flex items-center justify-between border-b pb-2">
              <h3 className="text-sm font-bold text-slate-900">Payout & Disbursement Info</h3>
              <button
                onClick={() => setPayoutModalOpen(true)}
                className="text-xs font-bold text-emerald-600 hover:underline flex items-center gap-1"
              >
                <Edit3 className="w-3.5 h-3.5" />
                Edit Payout
              </button>
            </div>

            {!request.payoutDetails ? (
              <p className="text-slate-400 italic">No payout details submitted yet.</p>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                    <span className="text-slate-400 font-medium block">What will the funds be used for</span>
                    <p className="font-bold text-slate-800 mt-0.5">{request.payoutDetails.fundUse || 'Not specified'}</p>
                  </div>

                  <div>
                    <span className="text-slate-400 font-medium">Payee Type</span>
                    <p className="font-bold text-slate-800 capitalize">
                      {request.payoutDetails.payeeType.replace('_', ' ')}
                    </p>
                    {request.payoutDetails.thirdPartyPayeeName && (
                      <p className="text-[11px] text-amber-800 font-semibold mt-0.5">
                        Third Party: {request.payoutDetails.thirdPartyPayeeName} ({request.payoutDetails.thirdPartyRelationship})
                      </p>
                    )}
                  </div>

                  <div>
                    <span className="text-slate-400 font-medium">Method</span>
                    <p className="font-bold text-slate-800">{request.payoutDetails.payoutMethodName}</p>
                  </div>

                  <div>
                    <span className="text-slate-400 font-medium">Contact Confirmation</span>
                    <p className="font-bold text-slate-800">{request.payoutDetails.contactValue}</p>
                  </div>

                  <div>
                    <span className="text-slate-400 font-medium">Preferred Language</span>
                    <p className="font-bold text-slate-800">
                      {request.payoutDetails.beneficiaryLanguageName || request.beneficiaryLanguageName || request.payoutDetails.beneficiaryLanguage || request.beneficiaryLanguage || 'English (Default)'}
                    </p>
                  </div>
                </div>

                {/* Account / Payout Method Details with ACH Unmasking for Admins */}
                {request.payoutDetails.payoutData && (() => {
                  const pData = request.payoutDetails.payoutData;
                  const activeMethods = (settings?.payoutMethods && settings.payoutMethods.length > 0)
                    ? settings.payoutMethods
                    : INITIAL_SETTINGS.payoutMethods;
                  const currentMethod = activeMethods.find((m: any) => m.id === request.payoutDetails.payoutMethodId);
                  const isAch = request.payoutDetails.payoutMethodId === 'direct_deposit';
                  const isCheck = request.payoutDetails.payoutMethodId === 'check';
                  const definedFields = currentMethod?.fields || [];

                  return (
                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-extrabold text-slate-900 text-xs">
                          {isCheck ? 'Check Delivery Information' : isAch ? 'Banking & ACH Details' : `${request.payoutDetails.payoutMethodName || 'Payment'} Details`}
                        </span>
                        {isAch && (pData.routingNumber || pData.accountNumber) && (
                          <button
                            type="button"
                            onClick={() => setShowFullAch(!showFullAch)}
                            className="px-2.5 py-1 bg-white border border-slate-300 rounded-lg text-[11px] font-bold text-indigo-700 hover:bg-indigo-50 flex items-center gap-1.5 shadow-2xs cursor-pointer"
                          >
                            {showFullAch ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                            {showFullAch ? 'Mask Account #' : 'View Full Routing & Account #'}
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-3 text-xs pt-1">
                        {definedFields.length > 0 ? (
                          definedFields.map((field: any) => {
                            const val = pData[field.key];
                            if (!val) return null;

                            const isFullWidth = field.key === 'mailingAddress' || field.key === 'deliveryDetails' || field.key === 'memo';

                            if (isAch && field.key === 'routingNumber') {
                              const rLast4 = val.slice(-4);
                              return (
                                <div key={field.key}>
                                  <span className="text-slate-400 block font-sans text-[10px] font-medium">{field.label}</span>
                                  <span className="font-bold text-slate-900 font-mono tracking-wide">
                                    {showFullAch ? val : `••••••••${rLast4}`}
                                  </span>
                                </div>
                              );
                            }

                            if (isAch && field.key === 'accountNumber') {
                              const aLast4 = val.slice(-4);
                              return (
                                <div key={field.key}>
                                  <span className="text-slate-400 block font-sans text-[10px] font-medium">{field.label}</span>
                                  <span className="font-bold text-slate-900 font-mono tracking-wide">
                                    {showFullAch ? val : `••••••••••••${aLast4}`}
                                  </span>
                                </div>
                              );
                            }

                            return (
                              <div key={field.key} className={isFullWidth ? 'col-span-2' : ''}>
                                <span className="text-slate-400 block font-sans text-[10px] font-medium">{field.label}</span>
                                <span className={`font-bold text-slate-900 text-xs ${field.key === 'handle' || field.key === 'email' ? 'font-mono' : ''}`}>
                                  {val}
                                </span>
                              </div>
                            );
                          })
                        ) : (
                          Object.entries(pData).map(([key, val]) => {
                            if (!val) return null;
                            return (
                              <div key={key} className="col-span-2">
                                <span className="text-slate-400 block font-sans text-[10px] font-medium capitalize">{key.replace(/([A-Z])/g, ' $1')}</span>
                                <span className="font-bold text-slate-900 text-xs">{String(val)}</span>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}
          </div>

          {/* Email Notifications Log */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-3 text-xs">
            <div className="flex items-center justify-between border-b pb-2">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Mail className="w-4 h-4 text-indigo-600" />
                Automated Email Notification Log
              </h3>
              <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-full">
                {effectiveEmailLogs.length} Dispatched
              </span>
            </div>
            <p className="text-[11px] text-slate-500">
              History of transactional email notifications sent for this request. Click any item to review the full rendered email body.
            </p>

            <div className="space-y-2.5 pt-1">
              {effectiveEmailLogs.length === 0 ? (
                <div className="p-4 bg-slate-50 rounded-xl text-center text-slate-400 text-xs italic">
                  No email notifications dispatched yet.
                </div>
              ) : (
                effectiveEmailLogs.map((log) => (
                  <div
                    key={log.id}
                    className="p-3.5 bg-slate-50 hover:bg-slate-100/80 border border-slate-200 rounded-xl space-y-2 transition-all cursor-pointer group"
                    onClick={() => setSelectedEmailForModal(log)}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-extrabold text-slate-900 text-xs group-hover:text-indigo-600 transition-colors line-clamp-1">
                        {log.subject}
                      </span>
                      <span className="text-[10px] font-medium text-slate-400 whitespace-nowrap">
                        {new Date(log.dispatchedAt).toLocaleDateString()}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5">
                      <div className="text-[11px] text-slate-600 flex items-center gap-1.5">
                        <span className="font-semibold text-slate-700">To:</span>
                        <span className="font-medium text-slate-900">{log.recipientName}</span>
                        <span className="text-slate-400 font-mono text-[10px]">({log.recipientEmail})</span>
                      </div>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedEmailForModal(log);
                        }}
                        className="px-2.5 py-1 bg-white border border-indigo-200 text-indigo-700 hover:bg-indigo-600 hover:text-white rounded-lg font-bold text-[11px] flex items-center gap-1 shadow-2xs transition-colors"
                      >
                        <Eye className="w-3 h-3" />
                        <span>Review Full Email</span>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* SMS Notifications Log */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-3 text-xs">
            <div className="flex items-center justify-between border-b pb-2">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-purple-600" />
                Automated SMS & Text Message Log
              </h3>
              <span className="text-[10px] font-bold text-purple-700 bg-purple-50 border border-purple-200 px-2 py-0.5 rounded-full">
                {(request.smsLogs || []).length} Recorded
              </span>
            </div>
            <p className="text-[11px] text-slate-500">
              Dispatches sent via toll-free number (+18887190317) and inbound beneficiary SMS responses.
            </p>

            <div className="space-y-2.5 pt-1">
              {(!request.smsLogs || request.smsLogs.length === 0) ? (
                <div className="p-4 bg-slate-50 rounded-xl text-center text-slate-400 text-xs italic">
                  No SMS notifications dispatched yet for this emergency request.
                </div>
              ) : (
                request.smsLogs.map((log) => (
                  <div
                    key={log.id}
                    className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md ${
                            log.direction === 'inbound'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-purple-100 text-purple-800'
                          }`}
                        >
                          {log.direction === 'inbound' ? 'Inbound Reply' : 'Outbound SMS'}
                        </span>
                        <span className="font-mono text-slate-600 text-[11px]">
                          {log.direction === 'inbound' ? `From: +${log.from}` : `To: +${log.to}`}
                        </span>
                      </div>
                      <span className="text-[10px] font-medium text-slate-400">
                        {new Date(log.dispatchedAt).toLocaleString([], {
                          month: 'numeric',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>

                    <p className="text-slate-800 font-medium text-xs bg-white p-2.5 rounded-lg border border-slate-200/80">
                      {log.text}
                    </p>

                    {log.isTranslated && log.originalText && (
                      <p className="text-[10px] text-slate-400 italic">
                        Original English: {log.originalText} (Translated to {log.languageName || log.language})
                      </p>
                    )}

                    <div className="flex items-center justify-between text-[10px] text-slate-500">
                      <span>Status: <strong className="uppercase font-semibold text-purple-700">{log.status}</strong></span>
                      {log.recipientName && <span>Recipient: <strong>{log.recipientName}</strong></span>}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right Column (2/5 lg): Internal Notes & Activity */}
        <div className="lg:col-span-2 space-y-6">
          {/* Activity Log & Internal Notes */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4 text-xs">
            <div className="flex items-center justify-between border-b pb-2">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Clock className="w-4 h-4 text-emerald-600" />
                Activity Log & Notes
              </h3>
              <span className="text-[10px] font-bold text-slate-600 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-full">
                {reqLogs.length} Events Recorded
              </span>
            </div>

            {/* Post Internal Note Form */}
            <form onSubmit={handlePostNote} className="space-y-2">
              <textarea
                rows={2}
                placeholder="Post confidential admin note (internal only)..."
                value={internalNoteText}
                onChange={(e) => setInternalNoteText(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
              <button
                type="submit"
                disabled={!internalNoteText.trim()}
                className="w-full py-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors"
              >
                <MessageCircle className="w-3.5 h-3.5" />
                <span>Post Internal Note</span>
              </button>
            </form>

            <div className="pt-2 space-y-3 max-h-[500px] overflow-y-auto pr-1">
              {reqLogs.length === 0 ? (
                <div className="p-4 bg-slate-50 rounded-xl text-center text-slate-400 italic">
                  No activity events recorded yet.
                </div>
              ) : (
                reqLogs.map((log) => {
                  const isInternal = log.isInternalNote || log.eventType === 'note';
                  const isBeneficiary = log.eventType === 'beneficiary_confirmed';
                  const isPayout = log.eventType === 'payout_submitted' || log.eventType === 'payout_updated';
                  const isStatus = log.eventType === 'status_change';
                  const isCreated = log.eventType === 'request_created';

                  return (
                    <div
                      key={log.id}
                      className={`p-3.5 rounded-xl border space-y-1.5 text-xs transition-all ${
                        isInternal
                          ? 'bg-amber-50/80 border-amber-200 text-amber-950'
                          : isBeneficiary
                          ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
                          : isPayout
                          ? 'bg-teal-50/70 border-teal-200 text-teal-950'
                          : isStatus
                          ? 'bg-slate-50 border-slate-200 text-slate-900'
                          : 'bg-white border-slate-200 text-slate-800'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {isInternal && (
                            <span className="text-[10px] font-extrabold uppercase tracking-wider bg-amber-200/80 text-amber-900 px-2 py-0.5 rounded-md">
                              Internal Note
                            </span>
                          )}
                          {isBeneficiary && (
                            <span className="text-[10px] font-extrabold uppercase tracking-wider bg-emerald-200/80 text-emerald-900 px-2 py-0.5 rounded-md">
                              Beneficiary Confirmed
                            </span>
                          )}
                          {isPayout && (
                            <span className="text-[10px] font-extrabold uppercase tracking-wider bg-teal-200/80 text-teal-900 px-2 py-0.5 rounded-md">
                              Payout Details
                            </span>
                          )}
                          {isStatus && (
                            <span className="text-[10px] font-extrabold uppercase tracking-wider bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded-md">
                              Status Change
                            </span>
                          )}
                          {isCreated && (
                            <span className="text-[10px] font-extrabold uppercase tracking-wider bg-sky-100 text-sky-800 px-2 py-0.5 rounded-md">
                              Request Submitted
                            </span>
                          )}

                          {log.fromStatus && log.toStatus && (
                            <span className="text-[10px] font-semibold text-slate-500 bg-white/80 border border-slate-200 px-1.5 py-0.5 rounded-md">
                              {log.fromStatus.replace(/_/g, ' ')} → {log.toStatus.replace(/_/g, ' ')}
                            </span>
                          )}
                        </div>

                        <span className="text-[10px] font-medium text-slate-400 whitespace-nowrap">
                          {new Date(log.timestamp).toLocaleString(undefined, {
                            month: 'numeric',
                            day: 'numeric',
                            hour: 'numeric',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>

                      <p className="font-semibold leading-relaxed text-slate-900">{log.message}</p>

                      <div className="text-[10px] font-medium text-slate-500 flex items-center gap-1">
                        <span>Actor:</span>
                        <strong className="text-slate-700">{log.actorName}</strong>
                        {log.actorRole && <span className="text-slate-400">({log.actorRole})</span>}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Reverse Denial Modal */}
      {reverseModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-6 space-y-4 text-xs">
            <div className="flex items-center gap-2 text-indigo-600 font-extrabold text-sm border-b pb-2">
              <RotateCcw className="w-5 h-5" />
              <span>Reverse Denial & Reopen Request</span>
            </div>

            <p className="text-slate-600">
              Reversing this denial will return request <strong className="text-slate-900">{request.id}</strong> back to{' '}
              <strong className="text-emerald-700 font-bold">In Review</strong> status for reprocessing.
            </p>

            <form onSubmit={handleReverseDenial} className="space-y-4">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Reason for Reopening / Notes</label>
                <textarea
                  rows={3}
                  value={reverseReason}
                  onChange={(e) => setReverseReason(e.target.value)}
                  placeholder="e.g. Additional supporting documentation provided by principal..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-medium"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t">
                <button
                  type="button"
                  onClick={() => setReverseModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 rounded-xl font-bold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-md shadow-indigo-600/20"
                >
                  Confirm Reopen Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Send Back Modal */}
      <SendBackModal
        request={request}
        isOpen={sendBackModalOpen}
        onClose={() => setSendBackModalOpen(false)}
        onConfirmSendBack={(newStatus, taskContext, note) => {
          onUpdateRequestStatus(request.id, newStatus, note, taskContext);
        }}
      />

      {/* Deny Request Modal */}
      <DenyModal
        request={request}
        isOpen={denyModalOpen}
        onClose={() => setDenyModalOpen(false)}
        onConfirmDeny={(denialReason) => {
          onUpdateRequestStatus(request.id, 'denied', denialReason);
        }}
      />

      {/* Edit Request Modal */}
      <EditRequestModal
        request={request}
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        onSave={(updates) => onUpdateRequest(request.id, updates)}
        maxPerRequestAmount={maxPerRequestAmount}
        settings={settings}
      />

      {/* Edit Payout Modal */}
      <EditPayoutModal
        request={request}
        isOpen={payoutModalOpen}
        onClose={() => setPayoutModalOpen(false)}
        settings={settings}
        maxPerRequestAmount={maxPerRequestAmount}
        onSavePayout={(payoutDetails, updatedAmount) => {
          const isConfirmed = !!(request.payoutDetails?.beneficiaryConfirmedAt || payoutDetails.beneficiaryConfirmedAt);
          onUpdateRequest(request.id, {
            ...(updatedAmount !== undefined ? { amount: updatedAmount } : {}),
            payoutDetails: {
              ...payoutDetails,
              ...(isConfirmed
                ? {
                    beneficiaryConfirmedAt:
                      request.payoutDetails?.beneficiaryConfirmedAt || payoutDetails.beneficiaryConfirmedAt,
                    beneficiaryConfirmedBy:
                      request.payoutDetails?.beneficiaryConfirmedBy || payoutDetails.beneficiaryConfirmedBy,
                  }
                : {}),
            },
            status: isConfirmed ? 'ready_to_pay' : 'waiting_on_beneficiary',
            statusNote: isConfirmed
              ? `Payout details${updatedAmount !== undefined ? ` and amount ($${updatedAmount.toLocaleString()})` : ''} updated by admin.`
              : `Payout details${updatedAmount !== undefined ? ` and amount ($${updatedAmount.toLocaleString()})` : ''} updated. Pending beneficiary verification.`,
          });
        }}
      />

      {/* Resolve Principal Task Modal */}
      <ResolvePrincipalTaskModal
        request={request}
        isOpen={resolveTaskModalOpen}
        onClose={() => setResolveTaskModalOpen(false)}
        onResolveTask={(reqId, nextStatus, resolutionNote) => {
          onUpdateRequestStatus(reqId, nextStatus, resolutionNote);
        }}
        onOpenEditPayout={() => setPayoutModalOpen(true)}
        onOpenEditRequest={() => setEditModalOpen(true)}
      />

      {/* Email Detail Review Modal */}
      <EmailDetailModal
        emailLog={selectedEmailForModal}
        onClose={() => setSelectedEmailForModal(null)}
      />

      {/* Cancel Request Modal */}
      <CancelRequestModal
        request={request}
        isOpen={cancelModalOpen}
        onClose={() => setCancelModalOpen(false)}
        onConfirmCancel={(reason) => {
          if (onCancelRequest) {
            onCancelRequest(request, reason);
          } else {
            onUpdateRequestStatus(request.id, 'canceled', reason);
          }
          setCancelModalOpen(false);
          navigate('/admin/requests');
        }}
        isAdmin={true}
      />
    </div>
  );
};
