import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  DollarSign,
  FileText,
  CheckCircle2,
  AlertTriangle,
  Clock,
  CreditCard,
  Search,
  Filter,
  Building2,
  TrendingUp,
  Calendar,
} from 'lucide-react';
import { EmergencyRequest, School, ActivityEvent, SystemRequestStatus, TaskContext, PortalSettings, AppUser, PendingInvite } from '../../types';
import { RequestsTable } from '../../components/requests/RequestsTable';
import { SendBackModal } from '../../components/requests/SendBackModal';
import { DenyModal } from '../../components/requests/DenyModal';
import { EditRequestModal } from '../../components/requests/EditRequestModal';
import { EditPayoutModal } from '../../components/requests/EditPayoutModal';
import { ResolvePrincipalTaskModal } from '../../components/requests/ResolvePrincipalTaskModal';
import { FiscalYearResetModal, FiscalYearResetOptions } from '../../components/common/FiscalYearResetModal';
import { getCurrentSchoolYear, getSchoolYearForDate } from '../../utils/schoolYear';
import { useAuth } from '../../context/AuthContext';
import { INITIAL_SETTINGS } from '../../data/defaultSettings';
import { generateAndTranslateEmailLogEntry, generateAndTranslateSmsLogEntry } from '../../utils/emailUtils';
import { dispatchEmail } from '../../services/emailService';
import { dispatchSms } from '../../services/smsService';
import { getLastStatusChangeDate } from '../../utils/statusUtils';

interface AdminDashboardProps {
  requests: EmergencyRequest[];
  schools: School[];
  users?: AppUser[];
  pendingInvites?: PendingInvite[];
  activityLogs: ActivityEvent[];
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
  onCancelRequest: (request: EmergencyRequest) => void;
  maxPerRequestAmount?: number;
  settings?: PortalSettings;
  onFiscalYearReset?: (options: FiscalYearResetOptions) => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  requests,
  schools,
  users = [],
  pendingInvites = [],
  activityLogs,
  onUpdateRequestStatus,
  onUpdateRequest,
  onCancelRequest,
  maxPerRequestAmount = 2000,
  settings,
  onFiscalYearReset,
}) => {
  const navigate = useNavigate();
  const { userProfile } = useAuth();

  type AdminDashboardFilter =
    | 'open'
    | 'in_review'
    | 'action_needed'
    | 'paid'
    | 'all'
    | 'waiting_on_principal'
    | 'waiting_on_beneficiary'
    | 'ready_to_pay'
    | 'digital'
    | 'check'
    | 'gift_card';

  const [statusFilter, setStatusFilter] = useState<AdminDashboardFilter>('all');
  const [staleFilter, setStaleFilter] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const handleSetFilter = (status: AdminDashboardFilter, stale = false) => {
    setStatusFilter(status);
    setStaleFilter(stale);
  };
  const [fiscalResetModalOpen, setFiscalResetModalOpen] = useState(false);

  // Active School Year
  const currentSY = getCurrentSchoolYear(settings);

  // Modals
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

  // Filter requests strictly for current school year
  const yearRequests = requests.filter((r) => {
    return getSchoolYearForDate(r.createdAt) === currentSY;
  });

  // Stats Calculations
  const totalDisbursed = yearRequests
    .filter((r) => r.status === 'paid')
    .reduce((sum, r) => sum + r.amount, 0);

  const totalRequestsCount = yearRequests.length;
  const completedRequestsCount = yearRequests.filter((r) => r.status === 'paid').length;
  const actionNeededCount = yearRequests.filter((r) => r.status === 'in_review').length;
  
  const missingMouCount = schools.filter(s => !s.currentMouSigned).length;
  const pendingUsersCount = pendingInvites.filter(i => i.status === 'pending').length;

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const sevenDaysAgoISO = sevenDaysAgo.toISOString();

  // Helper to determine the exact timestamp when a request entered its current status
  const getStatusChangeDate = (r: EmergencyRequest) => getLastStatusChangeDate(r, activityLogs);

  const inReviewAlertCount = yearRequests.filter(
    (r) => r.status === 'in_review' && getStatusChangeDate(r) <= sevenDaysAgoISO
  ).length;
  const waitingPrincipalAlertCount = yearRequests.filter(
    (r) => r.status === 'waiting_on_principal' && getStatusChangeDate(r) <= sevenDaysAgoISO
  ).length;
  const waitingBeneficiaryAlertCount = yearRequests.filter(
    (r) => r.status === 'waiting_on_beneficiary' && getStatusChangeDate(r) <= sevenDaysAgoISO
  ).length;

  const waitingPrincipalLong = yearRequests.filter((r) => r.status === 'waiting_on_principal').length;
  const waitingBeneficiaryLong = yearRequests.filter((r) => r.status === 'waiting_on_beneficiary').length;
  const readyToPayRequests = yearRequests.filter((r) => r.status === 'ready_to_pay');

  // Breakdown chips by payout method for ready_to_pay
  const isDigital = (methodId?: string) => methodId && methodId !== 'check' && !methodId.includes('gift_card');
  const isCheck = (methodId?: string) => methodId === 'check';
  const isGiftCard = (methodId?: string) => methodId && methodId.includes('gift_card');

  const readyDigital = readyToPayRequests.filter((r) => isDigital(r.payoutDetails?.payoutMethodId)).length;
  const readyCheck = readyToPayRequests.filter((r) => isCheck(r.payoutDetails?.payoutMethodId)).length;
  const readyGiftCard = readyToPayRequests.filter((r) => isGiftCard(r.payoutDetails?.payoutMethodId)).length;

  // Base open requests for the Open Requests table on /admin (excludes paid, denied, canceled)
  const openYearRequests = yearRequests.filter(
    (r) => r.status !== 'paid' && r.status !== 'denied' && r.status !== 'canceled'
  );

  // Filter requests based on statusFilter
  const filteredRequests = openYearRequests.filter((r) => {
    // Check 7+ days filter: Acts from last status change date (not last action / updatedAt)
    if (staleFilter && getStatusChangeDate(r) > sevenDaysAgoISO) return false;

    if (statusFilter === 'in_review') {
      if (r.status !== 'in_review') return false;
    } else if (statusFilter === 'action_needed') {
      if (r.status !== 'in_review' && r.status !== 'ready_to_pay') return false;
    } else if (statusFilter === 'waiting_on_principal') {
      if (r.status !== 'waiting_on_principal') return false;
    } else if (statusFilter === 'waiting_on_beneficiary') {
      if (r.status !== 'waiting_on_beneficiary') return false;
    } else if (statusFilter === 'ready_to_pay') {
      if (r.status !== 'ready_to_pay') return false;
    } else if (statusFilter === 'digital') {
      if (r.status !== 'ready_to_pay' || !isDigital(r.payoutDetails?.payoutMethodId)) return false;
    } else if (statusFilter === 'check') {
      if (r.status !== 'ready_to_pay' || !isCheck(r.payoutDetails?.payoutMethodId)) return false;
    } else if (statusFilter === 'gift_card') {
      if (r.status !== 'ready_to_pay' || !isGiftCard(r.payoutDetails?.payoutMethodId)) return false;
    }

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        r.id.toLowerCase().includes(q) ||
        r.schoolName.toLowerCase().includes(q) ||
        r.beneficiaryName.toLowerCase().includes(q) ||
        r.category.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Top Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
            ADMIN OPERATIONS DASHBOARD
          </h1>
          <p className="text-xs text-slate-500 font-normal mt-0.5">
            Overview for Small Moves Principal Emergency Fund
          </p>
        </div>
      </div>

      {/* Row 1: Attention Required */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div
          onClick={() => handleSetFilter('ready_to_pay')}
          className={`h-32 rounded-2xl p-5 shadow-xs flex flex-col justify-between transition-all hover:scale-[1.01] cursor-pointer ${
            statusFilter === 'ready_to_pay' || statusFilter === 'digital' || statusFilter === 'check' || statusFilter === 'gift_card'
              ? 'bg-gradient-to-br from-[#F2FCE2] to-[#E2F7C2] border-2 border-[#6EBF00] ring-2 ring-[#6EBF00]/20'
              : 'bg-gradient-to-br from-[#F2FCE2]/80 to-[#E2F7C2]/60 border border-[#6EBF00]/40 hover:border-[#6EBF00]'
          }`}
        >
          <div className="flex flex-col w-full h-full justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-[#2D5F00] uppercase tracking-wider">Ready to Pay Queue</span>
                {readyToPayRequests.length > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-[#6EBF00] text-slate-950 font-bold text-xs">
                    {readyToPayRequests.length} Ready
                  </span>
                )}
              </div>
              <p className="text-xs text-[#2D5F00]/90 mb-2 font-normal">Click card or chips below to filter by payout method:</p>
            </div>
            <div className="flex flex-wrap items-center gap-1.5 my-1">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleSetFilter('digital');
                }}
                className={`px-2 py-0.5 rounded text-[11px] font-semibold border transition-colors cursor-pointer ${
                  statusFilter === 'digital'
                    ? 'bg-[#2D5F00] text-white border-[#2D5F00]'
                    : 'bg-white border-[#6EBF00]/50 text-[#2D5F00] hover:bg-[#F2FCE2]'
                }`}
              >
                Digital: {readyDigital}
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleSetFilter('check');
                }}
                className={`px-2 py-0.5 rounded text-[11px] font-semibold border transition-colors cursor-pointer ${
                  statusFilter === 'check'
                    ? 'bg-[#2D5F00] text-white border-[#2D5F00]'
                    : 'bg-white border-[#6EBF00]/50 text-[#2D5F00] hover:bg-[#F2FCE2]'
                }`}
              >
                Check: {readyCheck}
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleSetFilter('gift_card');
                }}
                className={`px-2 py-0.5 rounded text-[11px] font-semibold border transition-colors cursor-pointer ${
                  statusFilter === 'gift_card'
                    ? 'bg-[#2D5F00] text-white border-[#2D5F00]'
                    : 'bg-white border-[#6EBF00]/50 text-[#2D5F00] hover:bg-[#F2FCE2]'
                }`}
              >
                Gift Card: {readyGiftCard}
              </button>
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={() => navigate('/admin/schools?filter=missing_mou')}
          className="h-32 text-left bg-[#FEF2F2]/70 rounded-2xl border border-[#FECACA] p-5 shadow-xs flex flex-col justify-between transition-all hover:scale-[1.01] cursor-pointer hover:border-red-300 group"
        >
          <div className="flex items-center justify-between mb-3 w-full">
            <span className="text-xs font-bold text-red-950 uppercase tracking-wider">Missing MOUs</span>
            {missingMouCount > 0 && (
              <span className="w-6 h-6 rounded-full bg-red-100 text-red-900 font-bold text-xs flex items-center justify-center group-hover:bg-red-200 transition-colors">
                {missingMouCount}
              </span>
            )}
          </div>
          <p className="text-xs text-red-900/90 font-normal">
            Partner schools that have not yet signed their Memorandum of Understanding.
          </p>
        </button>
        <button
          type="button"
          onClick={() => navigate('/admin/users?filter=pending')}
          className="h-32 text-left bg-[#EDF7FC]/70 rounded-2xl border border-[#0089B3]/30 p-5 shadow-xs flex flex-col justify-between transition-all hover:scale-[1.01] cursor-pointer hover:border-[#0089B3] group"
        >
          <div className="flex items-center justify-between mb-3 w-full">
            <span className="text-xs font-bold text-[#006E8F] uppercase tracking-wider">Pending User Accounts</span>
            {pendingUsersCount > 0 && (
              <span className="w-6 h-6 rounded-full bg-[#0089B3]/20 text-[#006E8F] font-bold text-xs flex items-center justify-center group-hover:bg-[#0089B3]/30 transition-colors">
                {pendingUsersCount}
              </span>
            )}
          </div>
          <p className="text-xs text-[#006E8F]/90 font-normal">
            New user account invitations that have not been accepted yet.
          </p>
        </button>
      </div>

      {/* Row 2: Process Health Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
        <button
          type="button"
          onClick={() => handleSetFilter('in_review', true)}
          className={`h-32 text-left rounded-2xl p-5 shadow-xs flex flex-col justify-between transition-all hover:scale-[1.01] cursor-pointer ${
            statusFilter === 'in_review' && staleFilter
              ? 'bg-[#EDF7FC] border-2 border-[#0089B3] ring-2 ring-[#0089B3]/20'
              : 'bg-[#EDF7FC]/70 border border-[#C7DCF0] hover:border-[#0089B3]/50'
          }`}
        >
          <div className="flex flex-col gap-1 w-full">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#006E8F] uppercase tracking-wider">7+ days: Review</span>
              {inReviewAlertCount > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-red-600 text-white font-bold text-xs">
                  {inReviewAlertCount} Alerts
                </span>
              )}
            </div>
          </div>
          <p className="text-xs text-[#006E8F]/90 mt-2 font-normal">
            Submitted requests waiting for admin review for &ge; 7 days.
          </p>
        </button>
        <button
          type="button"
          onClick={() => handleSetFilter('waiting_on_principal', true)}
          className={`h-32 text-left rounded-2xl p-5 shadow-xs flex flex-col justify-between transition-all hover:scale-[1.01] cursor-pointer ${
            statusFilter === 'waiting_on_principal' && staleFilter
              ? 'bg-amber-100/90 border-2 border-amber-500 ring-2 ring-amber-500/20'
              : 'bg-amber-50/70 border border-amber-200 hover:border-amber-400'
          }`}
        >
          <div className="flex flex-col gap-1 w-full">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-950 uppercase tracking-wider">7+ days: Principal</span>
              {waitingPrincipalAlertCount > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-red-600 text-white font-bold text-xs">
                  {waitingPrincipalAlertCount} Alerts
                </span>
              )}
            </div>
          </div>
          <p className="text-xs text-amber-900/90 mt-2 font-normal">
            Waiting on principals to submit payout details for &ge; 7 days.
          </p>
        </button>
        <button
          type="button"
          onClick={() => handleSetFilter('waiting_on_beneficiary', true)}
          className={`h-32 text-left rounded-2xl p-5 shadow-xs flex flex-col justify-between transition-all hover:scale-[1.01] cursor-pointer ${
            statusFilter === 'waiting_on_beneficiary' && staleFilter
              ? 'bg-[#EDF7FC] border-2 border-[#0089B3] ring-2 ring-[#0089B3]/20'
              : 'bg-[#EDF7FC]/70 border border-[#0089B3]/20 hover:border-[#0089B3]/40'
          }`}
        >
          <div className="flex flex-col gap-1 w-full">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#006E8F] uppercase tracking-wider">7+ days: Beneficiary</span>
              {waitingBeneficiaryAlertCount > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-red-600 text-white font-bold text-xs">
                  {waitingBeneficiaryAlertCount} Alerts
                </span>
              )}
            </div>
          </div>
          <p className="text-xs text-[#006E8F]/90 mt-2 font-normal">
            Waiting on admin team to confirm beneficiary details for &ge; 7 days.
          </p>
        </button>
      </div>

      {/* Main Admin Queue Table */}
      <div className="space-y-4">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-base font-bold text-slate-900 mr-1" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
              OPEN REQUESTS
            </h2>
            <div className="flex flex-wrap items-center bg-slate-100 rounded-xl p-1 gap-1">
              <button
                type="button"
                onClick={() => handleSetFilter('all')}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                  statusFilter === 'all' ? 'bg-[#0F172A] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                All ({openYearRequests.length})
              </button>
              <button
                type="button"
                onClick={() => handleSetFilter('in_review')}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                  statusFilter.startsWith('in_review') ? 'bg-[#0089B3] text-white shadow-xs' : 'text-[#006E8F] hover:text-[#005570]'
                }`}
              >
                In Review ({yearRequests.filter(r => r.status === 'in_review').length})
              </button>
              <button
                type="button"
                onClick={() => handleSetFilter('waiting_on_principal')}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                  statusFilter.startsWith('waiting_on_principal') ? 'bg-amber-600 text-white shadow-xs' : 'text-amber-800 hover:text-amber-950'
                }`}
              >
                Waiting on Principal ({waitingPrincipalLong})
              </button>
              <button
                type="button"
                onClick={() => handleSetFilter('waiting_on_beneficiary')}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                  statusFilter.startsWith('waiting_on_beneficiary') ? 'bg-[#0089B3] text-white shadow-xs' : 'text-[#006E8F] hover:text-[#005570]'
                }`}
              >
                Waiting on Beneficiary ({waitingBeneficiaryLong})
              </button>
              <button
                type="button"
                onClick={() => handleSetFilter('ready_to_pay')}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                  statusFilter === 'ready_to_pay' ? 'bg-[#6EBF00] text-slate-950 font-bold shadow-xs' : 'text-[#2D5F00] hover:text-slate-950'
                }`}
              >
                Ready to Pay ({readyToPayRequests.length})
              </button>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
            <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 px-3 py-1.5 rounded-xl transition-colors">
              <input 
                type="checkbox" 
                checked={staleFilter} 
                onChange={(e) => setStaleFilter(e.target.checked)}
                className="w-3.5 h-3.5 text-slate-900 border-slate-300 rounded focus:ring-[#0089B3] focus:ring-2 focus:ring-offset-1"
              />
              7+ days
            </label>
            {/* Search */}
            <div className="relative min-w-[220px]">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search request, school..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-normal focus:outline-none focus:border-[#0089B3] focus:ring-1 focus:ring-[#0089B3]"
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
      </div>

      {/* Deny Request Modal */}
      {selectedRequest && (
        <DenyModal
          request={selectedRequest}
          isOpen={denyModalOpen}
          onClose={() => setDenyModalOpen(false)}
          onConfirmDeny={(denialReason) => {
            onUpdateRequestStatus(selectedRequest.id, 'denied', denialReason);
          }}
        />
      )}

      {/* Send Back Modal */}
      {selectedRequest && (
        <SendBackModal
          request={selectedRequest}
          isOpen={sendBackModalOpen}
          onClose={() => setSendBackModalOpen(false)}
          onConfirmSendBack={(newStatus, taskContext, note) => {
            onUpdateRequestStatus(selectedRequest.id, newStatus, note, taskContext);
          }}
        />
      )}

      {/* Resolve Principal Task Modal */}
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

      {/* Edit Request Modal */}
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

      {/* Edit Payout Modal */}
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

      {/* Fiscal Year Reset Modal */}
      {fiscalResetModalOpen && (
        <FiscalYearResetModal
          isOpen={fiscalResetModalOpen}
          onClose={() => setFiscalResetModalOpen(false)}
          schools={schools}
          defaultAnnualBudget={settings?.annualDefaultBudget || 10000}
          onExecuteReset={(options) => {
            if (onFiscalYearReset) {
              onFiscalYearReset(options);
            }
          }}
        />
      )}
    </div>
  );
};
