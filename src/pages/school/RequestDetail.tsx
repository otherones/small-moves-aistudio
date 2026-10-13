import React, { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  CreditCard,
  Edit3,
  XCircle,
  MessageSquare,
  Clock,
  User,
  Building2,
  Calendar,
  FileText,
  DollarSign,
  ShieldCheck,
  Send,
  Languages,
  Globe,
  CheckCircle2,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { EmergencyRequest, ActivityEvent, RequestPayoutDetails } from '../../types';
import { StatusBadge } from '../../components/common/StatusBadge';
import { StatusStepper } from '../../components/common/StatusStepper';
import { EditRequestModal } from '../../components/requests/EditRequestModal';
import { EditPayoutModal } from '../../components/requests/EditPayoutModal';
import { CancelRequestModal } from '../../components/requests/CancelRequestModal';
import { INITIAL_SETTINGS } from '../../data/defaultSettings';
import { generateAndTranslateEmailLogEntry, generateAndTranslateSmsLogEntry } from '../../utils/emailUtils';
import { dispatchEmail } from '../../services/emailService';
import { dispatchSms } from '../../services/smsService';

interface RequestDetailProps {
  requests: EmergencyRequest[];
  activityLogs: ActivityEvent[];
  settings?: any; // any to avoid importing PortalSettings
  onUpdateRequest: (id: string, updates: Partial<EmergencyRequest>, options?: { customLogMessage?: string; skipLog?: boolean; eventType?: any }) => void;
  onCancelRequest: (request: EmergencyRequest, reason?: string) => void;
  onAddActivityNote: (requestId: string, message: string) => void;
  maxPerRequestAmount?: number;
}

export const RequestDetail: React.FC<RequestDetailProps> = ({
  requests,
  activityLogs,
  settings,
  onUpdateRequest,
  onCancelRequest,
  onAddActivityNote,
  maxPerRequestAmount = 2000,
}) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { userProfile } = useAuth();

  const request = requests.find((r) => r.id === id);

  const [editModalOpen, setEditModalOpen] = useState(false);
  const [payoutModalOpen, setPayoutModalOpen] = useState(false);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [responseMessage, setResponseMessage] = useState('');
  const [submittingResponse, setSubmittingResponse] = useState(false);
  const [beneficiaryResentAlert, setBeneficiaryResentAlert] = useState(false);
  const [isResendingBeneficiary, setIsResendingBeneficiary] = useState(false);
  const [principalResentAlert, setPrincipalResentAlert] = useState(false);
  const [isResendingPrincipal, setIsResendingPrincipal] = useState(false);

  if (!request) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 text-center">
        <h2 className="text-xl font-bold text-slate-800">Request Not Found</h2>
        <p className="text-xs text-slate-500 mt-2">The request ID {id} could not be located.</p>
        <Link to="/requests" className="inline-block mt-4 text-xs font-bold text-emerald-600 hover:underline">
          Return to Requests List
        </Link>
      </div>
    );
  }

  const reqLogs = activityLogs.filter((l) => l.requestId === request.id && !l.isInternalNote);

  const handleResendBeneficiaryConfirmation = async () => {
    setIsResendingBeneficiary(true);
    const existingEmailLogs = request.emailLogs || [];
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

  const handleResendPrincipalReminder = async () => {
    setIsResendingPrincipal(true);
    const existingEmailLogs = request.emailLogs || [];
    let newEmailLogs = [...existingEmailLogs];

    const reminderEmailLog =
      (await generateAndTranslateEmailLogEntry(
        request,
        'reminder_scheduled',
        settings?.emailTemplates || INITIAL_SETTINGS.emailTemplates,
        'Action is pending on this emergency fund request.'
      )) ||
      (await generateAndTranslateEmailLogEntry(
        request,
        'status_change_to_waiting_on_principal',
        settings?.emailTemplates || INITIAL_SETTINGS.emailTemplates,
        'Action is pending on this emergency fund request.'
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

    onAddActivityNote(
      request.id,
      `Notification email reminder resent to principal / submitter (${request.submitterEmail}).`
    );
    setIsResendingPrincipal(false);
    setPrincipalResentAlert(true);
    setTimeout(() => setPrincipalResentAlert(false), 3000);
  };

  const handleResponseSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!responseMessage.trim()) return;
    setSubmittingResponse(true);

    setTimeout(() => {
      const nextStatus = request.previousStatus || 'in_review';
      onUpdateRequest(
        request.id,
        {
          status: nextStatus,
          taskContext: null,
          statusNote: `Response provided by school requester: ${responseMessage.trim()}`,
        },
        {
          customLogMessage: `School submitter response provided: ${responseMessage.trim()}. Request status moved back to ${nextStatus === 'ready_to_pay' ? 'Ready to Pay' : 'In Review'}.`,
          eventType: 'response',
        }
      );
      setResponseMessage('');
      setSubmittingResponse(false);
    }, 400);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Top Navigation */}
      <div className="flex items-center justify-between">
        <Link
          to="/requests"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-800"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Requests
        </Link>

        {/* Action Header Buttons */}
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap justify-end">
          {request.status === 'waiting_on_principal' && (
            <>
              <button
                onClick={() => navigate(`/requests/${request.id}/payout`)}
                className="h-9 px-3.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs shadow-sm flex items-center gap-1.5 cursor-pointer transition-all"
              >
                <CreditCard className="w-3.5 h-3.5" />
                Complete Payout
              </button>
              <button
                onClick={handleResendPrincipalReminder}
                disabled={isResendingPrincipal}
                className="h-9 px-3 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-semibold rounded-xl text-xs flex items-center gap-1.5 shadow-2xs cursor-pointer disabled:opacity-50 transition-all"
              >
                <Send className="w-3.5 h-3.5 text-amber-600" />
                {isResendingPrincipal ? 'Sending...' : 'Resend Comms'}
              </button>
            </>
          )}

          {request.status === 'waiting_on_beneficiary' && (
            <button
              onClick={handleResendBeneficiaryConfirmation}
              disabled={isResendingBeneficiary}
              className="h-9 px-3 bg-white hover:bg-slate-50 text-purple-700 border border-purple-200 font-semibold rounded-xl text-xs flex items-center gap-1.5 shadow-2xs cursor-pointer disabled:opacity-50 transition-all"
            >
              <Send className="w-3.5 h-3.5 text-purple-600" />
              {isResendingBeneficiary ? 'Sending...' : 'Resend Beneficiary Comms'}
            </button>
          )}

          {request.status === 'changes_requested' && (
            <button
              onClick={() => {
                if (request.taskContext === 'payout_change') setPayoutModalOpen(true);
                else setEditModalOpen(true);
              }}
              className="h-9 px-3.5 bg-orange-600 hover:bg-orange-500 text-white font-bold rounded-xl text-xs shadow-sm flex items-center gap-1.5 cursor-pointer transition-all"
            >
              <Edit3 className="w-3.5 h-3.5" />
              Complete Changes
            </button>
          )}

          {request.status === 'changes_requested' && (
            <button
              onClick={() => setEditModalOpen(true)}
              className="h-9 px-3 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-1.5 cursor-pointer transition-all"
            >
              <Edit3 className="w-3.5 h-3.5 text-slate-500" />
              Edit
            </button>
          )}

          {request.status !== 'paid' && request.status !== 'canceled' && (
            <button
              onClick={() => setCancelModalOpen(true)}
              className="h-9 px-3 border border-rose-200 rounded-xl text-xs font-semibold text-rose-600 hover:bg-rose-50 flex items-center gap-1.5 cursor-pointer transition-all"
            >
              <XCircle className="w-3.5 h-3.5 text-rose-500" />
              Cancel
            </button>
          )}
        </div>
      </div>

      {principalResentAlert && (
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

      {/* Title & Status Row */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-[#0F172A] tracking-tight" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>{request.id}</h1>
            <StatusBadge status={request.status} isAdminView={false} />
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Beneficiary: <strong className="text-slate-800">{request.beneficiaryName}</strong> · School: <strong className="text-slate-800">{request.schoolName}</strong> · Requestor: <strong className="text-slate-800">{request.submitterName}</strong>
          </p>
        </div>

        <div className="text-right border-t md:border-t-0 pt-3 md:pt-0 border-slate-100">
          <div className="text-3xl font-bold text-[#0F172A]" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>${request.amount.toLocaleString()}</div>
          <div className="text-xs text-slate-500 font-medium">Emergency Category: {request.category}</div>
        </div>
      </div>

      {/* Status Stepper */}
      <StatusStepper request={request} isAdminView={false} />

      {/* Response Required Prompt (if response_requested) */}
      {request.status === 'response_requested' && (
        <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2 text-amber-950 font-bold text-sm">
            <MessageSquare className="w-5 h-5 text-amber-600" />
            <span>Question from Admin Requires Your Response</span>
          </div>

          <p className="text-xs text-amber-900 bg-white p-3 rounded-xl border border-amber-200 font-medium">
            "{request.statusNote || 'Please provide clarification regarding this request.'}"
          </p>

          <form onSubmit={handleResponseSubmit} className="space-y-3">
            <textarea
              rows={3}
              value={responseMessage}
              onChange={(e) => setResponseMessage(e.target.value)}
              placeholder="Type your response here..."
              required
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-medium focus:outline-hidden focus:border-amber-500"
            />
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={submittingResponse || !responseMessage.trim()}
                className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl text-xs shadow-md shadow-amber-600/20 flex items-center gap-2"
              >
                <Send className="w-4 h-4" />
                Submit Response
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 2-Column Content Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Left Column (3/5 lg): Request & Payout Details */}
        <div className="lg:col-span-3 space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
              <FileText className="w-4 h-4 text-emerald-600" />
              Request Information
            </h3>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-slate-400 font-medium">Beneficiary</span>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <p className="font-bold text-slate-800 text-sm">{request.beneficiaryName}</p>
                  {(request.payoutDetails?.beneficiaryLanguage || request.beneficiaryLanguage) && (request.payoutDetails?.beneficiaryLanguage || request.beneficiaryLanguage) !== 'en' && (
                    <span className="px-2 py-0.5 bg-purple-50 border border-purple-200 text-purple-700 font-bold rounded-full text-[10px] flex items-center gap-1">
                      <Languages className="w-3 h-3 text-purple-600" />
                      {request.payoutDetails?.beneficiaryLanguageName || request.beneficiaryLanguageName || request.payoutDetails?.beneficiaryLanguage || request.beneficiaryLanguage}
                    </span>
                  )}
                </div>
              </div>

              <div>
                <span className="text-slate-400 font-medium">Enrolled Student</span>
                <p className="font-bold text-slate-800">{request.studentName || 'Not specified'}</p>
              </div>

              <div className="col-span-2">
                <span className="text-slate-400 font-medium">Reason for Request</span>
                <p className="font-bold text-slate-800 text-sm mt-0.5">{request.reason || request.category}</p>
              </div>

              <div>
                <span className="text-slate-400 font-medium">Requestor</span>
                <p className="font-bold text-slate-800">
                  {request.submitterName}
                  {request.submitterRole ? (
                    <span className="ml-1 text-[11px] font-normal text-slate-500 capitalize">
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
                  {new Date(request.createdAt).toLocaleString()}
                </p>
              </div>
            </div>

            {request.additionalContext && (
              <div className="pt-3 border-t border-slate-100 text-xs">
                <span className="text-slate-400 font-medium block mb-1">Additional Context</span>
                <p className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-slate-700 leading-relaxed font-medium">
                  {request.additionalContext}
                </p>
              </div>
            )}
          </div>

          {/* Payout Details Card */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-emerald-600" />
                Payout & Disbursement Details
              </h3>

              {request.payoutDetails && !['in_review', 'response_requested', 'paid', 'canceled'].includes(request.status) && (
                <button
                  onClick={() => setPayoutModalOpen(true)}
                  className="text-xs font-bold text-emerald-600 hover:underline flex items-center gap-1"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  Edit Payout
                </button>
              )}
            </div>

            {!request.payoutDetails ? (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-center space-y-2">
                <p className="text-xs font-bold text-amber-900">Payout information has not been entered yet.</p>
                {!['in_review', 'response_requested'].includes(request.status) && (
                  <button
                    onClick={() => navigate(`/requests/${request.id}/payout`)}
                    className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-xl text-xs shadow-xs"
                  >
                    Enter Payout Details Now
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div className="col-span-2 bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <span className="text-slate-400 font-medium block">What will the funds be used for</span>
                  <p className="font-bold text-slate-800 text-sm mt-0.5">{request.payoutDetails.fundUse || 'Not specified'}</p>
                </div>

                <div>
                  <span className="text-slate-400 font-medium">Payee Type</span>
                  <p className="font-bold text-slate-800 capitalize">
                    {request.payoutDetails.payeeType.replace('_', ' ')}
                  </p>
                </div>

                {request.payoutDetails.thirdPartyPayeeName && (
                  <div>
                    <span className="text-slate-400 font-medium">Third-Party Payee</span>
                    <p className="font-bold text-slate-800">
                      {request.payoutDetails.thirdPartyPayeeName} ({request.payoutDetails.thirdPartyRelationship})
                    </p>
                  </div>
                )}

                <div>
                  <span className="text-slate-400 font-medium">Payment Method</span>
                  <p className="font-bold text-slate-800">{request.payoutDetails.payoutMethodName}</p>
                </div>

                <div>
                  <span className="text-slate-400 font-medium">Contact Value</span>
                  <p className="font-bold text-slate-800">{request.payoutDetails.contactValue}</p>
                </div>

                {(() => {
                  const pData = request.payoutDetails.payoutData || {};
                  const activeMethods = (settings?.payoutMethods && settings.payoutMethods.length > 0)
                    ? settings.payoutMethods
                    : INITIAL_SETTINGS.payoutMethods;
                  const currentMethod = activeMethods.find((m: any) => m.id === request.payoutDetails.payoutMethodId);
                  const isAch = request.payoutDetails.payoutMethodId === 'direct_deposit';
                  const definedFields = currentMethod?.fields || [];

                  if (definedFields.length > 0) {
                    return definedFields.map((field: any) => {
                      const val = pData[field.key];
                      if (!val) return null;
                      const isFullWidth = field.key === 'mailingAddress' || field.key === 'deliveryDetails' || field.key === 'memo';
                      const isMono = field.key === 'handle' || field.key === 'email' || field.key === 'accountNumber' || field.key === 'routingNumber';
                      const displayVal = (isAch && (field.key === 'accountNumber' || field.key === 'routingNumber'))
                        ? `••••${val.slice(-4)}`
                        : val;

                      return (
                        <div key={field.key} className={isFullWidth ? 'col-span-2' : ''}>
                          <span className="text-slate-400 font-medium block">{field.label}</span>
                          <p className={`font-bold text-slate-800 ${isMono ? 'font-mono' : ''}`}>{displayVal}</p>
                        </div>
                      );
                    });
                  }

                  return Object.entries(pData).map(([key, val]) => {
                    if (!val) return null;
                    return (
                      <div key={key} className="col-span-2">
                        <span className="text-slate-400 font-medium block capitalize">{key.replace(/([A-Z])/g, ' $1')}</span>
                        <p className="font-bold text-slate-800">{String(val)}</p>
                      </div>
                    );
                  });
                })()}

                {request.payoutDetails.beneficiaryConfirmedAt && (
                  <div className="col-span-2 p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900">
                    <p className="font-bold text-xs">Beneficiary Identity Confirmed</p>
                    <p className="text-[11px] text-emerald-700">
                      Verified by {request.payoutDetails.beneficiaryConfirmedBy} on{' '}
                      {new Date(request.payoutDetails.beneficiaryConfirmedAt).toLocaleDateString()}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Column (2/5 lg): Activity Trail */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
              <Clock className="w-4 h-4 text-slate-500" />
              Activity Trail & Audit Log
            </h3>

            {reqLogs.length === 0 ? (
              <p className="text-xs text-slate-400 italic">No activity recorded yet.</p>
            ) : (
              <div className="relative pl-4 border-l-2 border-slate-100 space-y-4 text-xs">
                {reqLogs.map((log) => (
                  <div key={log.id} className="relative">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 absolute -left-[21px] top-1 border-2 border-white" />
                    <div className="font-bold text-slate-800">{log.message}</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">
                      {log.actorName} ({log.actorRole}) · {new Date(log.timestamp).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Edit Request Modal */}
      <EditRequestModal
        request={request}
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        onSave={(updates) =>
          onUpdateRequest(
            request.id,
            request.status === 'changes_requested'
              ? { ...updates, status: request.previousStatus || 'in_review', taskContext: null }
              : updates
          )
        }
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
        onSavePayout={(payoutDetails, updatedAmount) =>
          onUpdateRequest(request.id, {
            ...(updatedAmount !== undefined ? { amount: updatedAmount } : {}),
            payoutDetails,
            status:
              request.status === 'changes_requested'
                ? request.previousStatus || 'in_review'
                : 'waiting_on_beneficiary',
            taskContext: null,
            statusNote: 'Payout info updated by school user.',
          })
        }
      />

      {/* Cancel Modal */}
      <CancelRequestModal
        request={request}
        isOpen={cancelModalOpen}
        onClose={() => setCancelModalOpen(false)}
        onConfirmCancel={(reason) => {
          onCancelRequest(request, reason);
          setCancelModalOpen(false);
          navigate('/requests');
        }}
        isAdmin={false}
      />
    </div>
  );
};
