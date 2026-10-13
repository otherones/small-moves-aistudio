import React, { useState } from 'react';
import { Search, Filter, RefreshCw, Calendar } from 'lucide-react';
import { EmergencyRequest, SystemRequestStatus, TaskContext, PortalSettings, ActivityEvent } from '../../types';
import { RequestsTable } from '../../components/requests/RequestsTable';
import { SendBackModal } from '../../components/requests/SendBackModal';
import { DenyModal } from '../../components/requests/DenyModal';
import { EditRequestModal } from '../../components/requests/EditRequestModal';
import { EditPayoutModal } from '../../components/requests/EditPayoutModal';
import { ResolvePrincipalTaskModal } from '../../components/requests/ResolvePrincipalTaskModal';
import { getCurrentSchoolYear, getSchoolYearForDate } from '../../utils/schoolYear';
import { useAuth } from '../../context/AuthContext';
import { INITIAL_SETTINGS } from '../../data/defaultSettings';
import { generateAndTranslateEmailLogEntry, generateAndTranslateSmsLogEntry } from '../../utils/emailUtils';
import { dispatchEmail } from '../../services/emailService';
import { dispatchSms } from '../../services/smsService';

interface AdminRequestsListProps {
  requests: EmergencyRequest[];
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
  onCancelRequest?: (request: EmergencyRequest, reason?: string) => void;
  maxPerRequestAmount?: number;
  settings?: PortalSettings;
}

export const AdminRequestsList: React.FC<AdminRequestsListProps> = ({
  requests,
  onUpdateRequestStatus,
  onUpdateRequest,
  onCancelRequest,
  maxPerRequestAmount = 2000,
  settings,
}) => {
  const { userProfile } = useAuth();
  const currentSY = getCurrentSchoolYear(settings);
  const [tabFilter, setTabFilter] = useState<'all' | 'open' | 'denied' | 'paid'>('all');
  const [specificStatus, setSpecificStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const [selectedRequest, setSelectedRequest] = useState<EmergencyRequest | null>(null);
  const [sendBackModalOpen, setSendBackModalOpen] = useState(false);
  const [denyModalOpen, setDenyModalOpen] = useState(false);
  const [resolveTaskModalOpen, setResolveTaskModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editPayoutModalOpen, setEditPayoutModalOpen] = useState(false);

  const handleResendBeneficiaryConfirmation = async (req: EmergencyRequest) => {
    // Guard: Never dispatch reminders if beneficiary already confirmed payment details
    if (req.payoutDetails?.beneficiaryConfirmedAt) {
      return;
    }

    const existingEmailLogs = req.emailLogs || [];
    const existingSmsLogs = req.smsLogs || [];
    let newEmailLogs = [...existingEmailLogs];
    let newSmsLogs = [...existingSmsLogs];

    const contactMethod = req.payoutDetails?.contactMethod;
    const contactValue = req.payoutDetails?.contactValue?.trim() || '';
    const isEmailContact = contactMethod === 'email' || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactValue);
    const isTextContact = contactMethod === 'text' || /^\+?[0-9\s\-()]{7,}$/.test(contactValue);

    // Only dispatch confirmation email to beneficiary if contact method is email
    if (contactMethod ? contactMethod === 'email' : isEmailContact) {
      const beneficiaryEmailLog = await generateAndTranslateEmailLogEntry(
        req,
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
              requestId: req.id,
              schoolId: req.schoolId,
              schoolName: req.schoolName,
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
        req,
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
              requestId: req.id,
              schoolId: req.schoolId,
              schoolName: req.schoolName,
            },
            settings,
            userProfile?.email
          ).catch((err) => console.error('Error dispatching beneficiary confirmation SMS:', err));
        }
      }
    }

    if (onUpdateRequest) {
      onUpdateRequest(
        req.id,
        {
          emailLogs: newEmailLogs,
          smsLogs: newSmsLogs,
        },
        { skipLog: true }
      );
    }
  };

  const handleConfirmBeneficiary = (req: EmergencyRequest) => {
    const updatedPayout = req.payoutDetails
      ? {
          ...req.payoutDetails,
          beneficiaryConfirmedAt: new Date().toISOString(),
          beneficiaryConfirmedBy: userProfile?.displayName || userProfile?.email || 'PEF Administrator',
        }
      : undefined;

    onUpdateRequest(req.id, {
      payoutDetails: updatedPayout,
      status: 'ready_to_pay',
      statusNote: 'Beneficiary identity confirmed by admin. Queue moved to Ready to Pay.',
    });
  };

  const handleResendPrincipalReminder = async (req: EmergencyRequest) => {
    const existingEmailLogs = req.emailLogs || [];
    let newEmailLogs = [...existingEmailLogs];

    const reminderEmailLog =
      (await generateAndTranslateEmailLogEntry(
        req,
        'reminder_scheduled',
        settings?.emailTemplates || INITIAL_SETTINGS.emailTemplates,
        'Automated reminder: Action is pending on this emergency fund request.'
      )) ||
      (await generateAndTranslateEmailLogEntry(
        req,
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
            requestId: req.id,
            schoolId: req.schoolId,
            schoolName: req.schoolName,
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
          req.id,
          {
            emailLogs: newEmailLogs,
          },
          { skipLog: true }
        );
      }
    }
  };

  // Filter strictly by current school year
  const yearRequests = requests.filter((r) => {
    return getSchoolYearForDate(r.createdAt) === currentSY;
  });

  // Filtering
  const filteredRequests = yearRequests.filter((r) => {
    if (tabFilter === 'open') {
      if (r.status === 'paid' || r.status === 'denied' || r.status === 'canceled') return false;
    } else if (tabFilter === 'paid') {
      if (r.status !== 'paid') return false;
    } else if (tabFilter === 'denied') {
      if (r.status !== 'denied' && r.status !== 'canceled') return false;
    }

    if (specificStatus !== 'all' && r.status !== specificStatus) return false;

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        r.id.toLowerCase().includes(q) ||
        r.schoolName.toLowerCase().includes(q) ||
        r.beneficiaryName.toLowerCase().includes(q) ||
        r.category.toLowerCase().includes(q) ||
        r.submitterName.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
          ADMIN MASTER REQUESTS QUEUE
        </h1>
        <p className="text-xs text-slate-500 mt-0.5 font-normal">
          Unified management across all partner schools and funding categories
        </p>
      </div>

      {/* Tabs and Filters */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-1 overflow-x-auto pb-1 lg:pb-0">
          {[
            { id: 'all', label: 'All Requests', count: yearRequests.length },
            { id: 'open', label: 'Open Queue', count: yearRequests.filter((r) => r.status !== 'paid' && r.status !== 'denied' && r.status !== 'canceled').length },
            { id: 'paid', label: 'Paid Out', count: yearRequests.filter((r) => r.status === 'paid').length },
            { id: 'denied', label: 'Denied / Canceled', count: yearRequests.filter((r) => r.status === 'denied' || r.status === 'canceled').length },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setTabFilter(tab.id as any)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-colors whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
                tabFilter === tab.id
                  ? 'bg-[#0F172A] text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <span>{tab.label}</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${tabFilter === tab.id ? 'bg-[#0089B3] text-white font-bold' : 'bg-slate-200 text-slate-700'}`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          {/* Status Dropdown */}
          <select
            value={specificStatus}
            onChange={(e) => setSpecificStatus(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-hidden focus:border-[#0089B3] focus:ring-1 focus:ring-[#0089B3] cursor-pointer"
          >
            <option value="all">All Specific Statuses</option>
            <option value="in_review">In Review</option>
            <option value="waiting_on_principal">Waiting on Principal</option>
            <option value="waiting_on_beneficiary">Waiting on Beneficiary</option>
            <option value="ready_to_pay">Ready to Pay</option>
            <option value="changes_requested">Changes Requested</option>
            <option value="response_requested">Response Requested</option>
            <option value="paid">Paid</option>
            <option value="denied">Denied</option>
            <option value="canceled">Canceled</option>
          </select>

          {/* Search */}
          <div className="relative min-w-[200px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search request..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-normal focus:outline-hidden focus:border-[#0089B3] focus:ring-1 focus:ring-[#0089B3]"
            />
          </div>
        </div>
      </div>

      <RequestsTable
        requests={filteredRequests}
        isAdminView
        onCancelRequest={onCancelRequest}
        onApproveRequest={(req) => onUpdateRequestStatus(req.id, 'waiting_on_principal', 'Approved by admin.')}
        onRequestChanges={(req) => {
          setSelectedRequest(req);
          setSendBackModalOpen(true);
        }}
        onResolvePrincipalTask={(req) => {
          setSelectedRequest(req);
          setResolveTaskModalOpen(true);
        }}
        onResendBeneficiaryConfirmation={handleResendBeneficiaryConfirmation}
        onConfirmBeneficiary={handleConfirmBeneficiary}
        onResendPrincipalReminder={handleResendPrincipalReminder}
        onDenyRequest={(req) => {
          setSelectedRequest(req);
          setDenyModalOpen(true);
        }}
        onMarkAsPaid={(req) => onUpdateRequestStatus(req.id, 'paid', 'Disbursement recorded as paid.')}
        onEditRequest={(req) => {
          setSelectedRequest(req);
          setEditModalOpen(true);
        }}
        onEditPayout={(req) => {
          setSelectedRequest(req);
          setEditPayoutModalOpen(true);
        }}
      />

      {/* Modals */}
      {selectedRequest && (
        <DenyModal
          request={selectedRequest}
          isOpen={denyModalOpen}
          onClose={() => setDenyModalOpen(false)}
          onConfirmDeny={(denialReason) =>
            onUpdateRequestStatus(selectedRequest.id, 'denied', denialReason)
          }
        />
      )}

      {selectedRequest && (
        <SendBackModal
          request={selectedRequest}
          isOpen={sendBackModalOpen}
          onClose={() => setSendBackModalOpen(false)}
          onConfirmSendBack={(newStatus, taskContext, note) =>
            onUpdateRequestStatus(selectedRequest.id, newStatus, note, taskContext)
          }
        />
      )}

      {selectedRequest && (
        <ResolvePrincipalTaskModal
          request={selectedRequest}
          isOpen={resolveTaskModalOpen}
          onClose={() => setResolveTaskModalOpen(false)}
          onResolveTask={(reqId, nextStatus, resolutionNote) => {
            onUpdateRequestStatus(reqId, nextStatus, resolutionNote);
          }}
          onOpenEditPayout={(req) => {
            setSelectedRequest(req);
            setEditPayoutModalOpen(true);
          }}
          onOpenEditRequest={(req) => {
            setSelectedRequest(req);
            setEditModalOpen(true);
          }}
        />
      )}

      {selectedRequest && (
        <EditRequestModal
          request={selectedRequest}
          isOpen={editModalOpen}
          onClose={() => setEditModalOpen(false)}
          onSave={(updates) => onUpdateRequest(selectedRequest.id, updates)}
          maxPerRequestAmount={maxPerRequestAmount}
          settings={settings}
        />
      )}

      {selectedRequest && (
        <EditPayoutModal
          request={selectedRequest}
          isOpen={editPayoutModalOpen}
          onClose={() => setEditPayoutModalOpen(false)}
          settings={settings}
          maxPerRequestAmount={maxPerRequestAmount}
          onSavePayout={(payoutDetails, updatedAmount) => {
            const isConfirmed = !!(
              selectedRequest.payoutDetails?.beneficiaryConfirmedAt || payoutDetails.beneficiaryConfirmedAt
            );
            onUpdateRequest(selectedRequest.id, {
              ...(updatedAmount !== undefined ? { amount: updatedAmount } : {}),
              payoutDetails: {
                ...payoutDetails,
                ...(isConfirmed
                  ? {
                      beneficiaryConfirmedAt:
                        selectedRequest.payoutDetails?.beneficiaryConfirmedAt ||
                        payoutDetails.beneficiaryConfirmedAt,
                      beneficiaryConfirmedBy:
                        selectedRequest.payoutDetails?.beneficiaryConfirmedBy ||
                        payoutDetails.beneficiaryConfirmedBy,
                    }
                  : {}),
              },
              status: isConfirmed ? 'ready_to_pay' : 'waiting_on_beneficiary',
              statusNote: isConfirmed
                ? `Payout updated${updatedAmount !== undefined ? ` (Amount: $${updatedAmount.toLocaleString()})` : ''} by admin.`
                : `Payout updated${updatedAmount !== undefined ? ` (Amount: $${updatedAmount.toLocaleString()})` : ''}. Pending beneficiary verification.`,
            });
          }}
        />
      )}
    </div>
  );
};
