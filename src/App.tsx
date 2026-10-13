import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth, isSystemAdminEmail } from './context/AuthContext';
import { Sidebar } from './components/common/Sidebar';
import { ImpersonationBanner } from './components/common/ImpersonationBanner';
import { AlertTriangle, Database, ExternalLink, X } from 'lucide-react';

// Domain Data & Types
import {
  EmergencyRequest,
  School,
  ActivityEvent,
  BudgetTransaction,
  Funder,
  AdminUser,
  PortalSettings,
  SystemRequestStatus,
  TaskContext,
  RequestPayoutDetails,
  AppUser,
  PendingInvite,
  UserRole,
} from './types';
import {
  INITIAL_SETTINGS,
} from './data/defaultSettings';
import {
  generateEmailLogEntry,
  generateAndTranslateEmailLogEntry,
  generateAndTranslateSmsLogEntry,
  renderInviteEmail,
} from './utils/emailUtils';
import { dispatchEmail, updateQueuedEmailUrls } from './services/emailService';
import { dispatchSms } from './services/smsService';
import { formatStatusLabel } from './utils/statusUtils';
import { notifySubscribedAdmins } from './utils/adminSubscriptionUtils';
import { getCurrentSchoolYear } from './utils/schoolYear';
import { computeSchoolBudgetMetrics } from './utils/budgetUtils';
import { FiscalYearResetOptions } from './components/common/FiscalYearResetModal';
import {
  ensureDefaultSettingsExist,
  cleanupResidualMockData,
  subscribeToRequests,
  subscribeToSchools,
  subscribeToActivityLogs,
  subscribeToSettings,
  subscribeToAdminUsers,
  subscribeToManagedUsers,
  subscribeToPendingInvites,
  subscribeToFunders,
  subscribeToSecrets,
  getCachedCollection,
  setCachedCollection,
  subscribeToQuotaStatus,
  getIsQuotaExceeded,
  FIRESTORE_UPGRADE_URL,
  saveRequestToFirestore,
  saveSchoolToFirestore,
  updateSchoolFieldsInFirestore,
  saveActivityLogToFirestore,
  saveSettingsToFirestore,
  saveAdminUserToFirestore,
  deleteAdminUserFromFirestore,
  saveManagedUserToFirestore,
  revokeManagedUserInFirestore,
  reactivateManagedUserInFirestore,
  deleteManagedUserFromFirestore,
  savePendingInviteToFirestore,
  deletePendingInviteFromFirestore,
  saveFunderToFirestore,
  deleteFunderFromFirestore,
  deleteSchoolFromFirestore,
  deleteRequestFromFirestore,
  wipeProductionTestData,
  WipeDataOptions,
} from './lib/firebase';
import { IMPORTED_PARTNER_SCHOOLS } from './data/importedSchools';

// Pages
import { SchoolDashboard } from './pages/school/SchoolDashboard';
import { RequestsList } from './pages/school/RequestsList';
import { NewRequest } from './pages/school/NewRequest';
import { RequestDetail } from './pages/school/RequestDetail';
import { EnterPayoutDetails } from './pages/school/EnterPayoutDetails';
import { HelpCenter } from './pages/school/HelpCenter';
import { UserProfilePage } from './pages/school/UserProfilePage';

import { AdminDashboard } from './pages/admin/AdminDashboard';
import { AdminRequestsList } from './pages/admin/AdminRequestsList';
import { AdminRequestDetail } from './pages/admin/AdminRequestDetail';
import { AdminSchoolsList } from './pages/admin/AdminSchoolsList';
import { AdminNewSchool } from './pages/admin/AdminNewSchool';
import { AdminSchoolDetail } from './pages/admin/AdminSchoolDetail';
import { AdminFundersList } from './pages/admin/AdminFundersList';
import { AdminContactsDirectory } from './pages/admin/AdminContactsDirectory';
import { AdminSettings } from './pages/admin/AdminSettings';
import { AdminManagement } from './pages/admin/AdminManagement';
import { AdminUserManagement } from './pages/admin/AdminUserManagement';
import { AdminReportsList } from './pages/admin/AdminReportsList';
import { AdminReportDetail } from './pages/admin/AdminReportDetail';

import { Login } from './pages/auth/Login';
import { ForgotPassword } from './pages/auth/ForgotPassword';
import { SetupAccount } from './pages/auth/SetupAccount';
import { PendingAssignmentPage } from './pages/auth/PendingAssignmentPage';
import { MfaSetupModal } from './components/auth/MfaSetupModal';
import { BeneficiaryPayoutVerificationPage } from './pages/public/BeneficiaryPayoutVerificationPage';

// Guard component: Accessible ONLY to Admins
const AdminOnlyRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, userProfile, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center text-slate-400 text-xs font-medium">
        Authenticating...
      </div>
    );
  }
  if (!user || !userProfile) {
    return <Navigate to="/login" replace />;
  }
  const isAdmin = userProfile.role === 'admin' || isSystemAdminEmail(user.email);
  if (!isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }
  return <>{children}</>;
};

// Guard component: Accessible ONLY to Users with assigned schools
const SchoolUserRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, userProfile, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center text-slate-400 text-xs font-medium">
        Authenticating...
      </div>
    );
  }
  if (!user || !userProfile) {
    return <Navigate to="/login" replace />;
  }
  if (userProfile.role === 'admin' || isSystemAdminEmail(user.email)) {
    return <>{children}</>;
  }
  const isUnassigned =
    userProfile.role === 'unassigned' ||
    (!userProfile.schoolIds || userProfile.schoolIds.length === 0);
  if (isUnassigned) {
    return <PendingAssignmentPage />;
  }
  return <>{children}</>;
};

function AppContent() {
  const { user, userProfile, loading, isImpersonating, updateProfileData } = useAuth();
  const location = useLocation();

  // Primary State Arrays initialized with local resilient cache
  const [schools, setSchools] = useState<School[]>(() =>
    getCachedCollection<School[]>('schools', IMPORTED_PARTNER_SCHOOLS)
  );
  const [requests, setRequests] = useState<EmergencyRequest[]>(() =>
    getCachedCollection<EmergencyRequest[]>('requests', [])
  );
  const [activityLogs, setActivityLogs] = useState<ActivityEvent[]>(() =>
    getCachedCollection<ActivityEvent[]>('activityLogs', [])
  );
  const [budgetTransactions, setBudgetTransactions] = useState<BudgetTransaction[]>([]);
  const [funders, setFunders] = useState<Funder[]>(() =>
    getCachedCollection<Funder[]>('funders', [])
  );
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>(() =>
    getCachedCollection<AdminUser[]>('adminUsers', [])
  );
  const [settings, setSettings] = useState<PortalSettings>(() =>
    getCachedCollection<PortalSettings>('settings', INITIAL_SETTINGS)
  );
  const [managedUsers, setManagedUsers] = useState<AppUser[]>(() =>
    getCachedCollection<AppUser[]>('managedUsers', [])
  );
  const [pendingInvites, setPendingInvites] = useState<PendingInvite[]>(() =>
    getCachedCollection<PendingInvite[]>('pendingInvites', [])
  );

  // Track if schools collection has loaded from Firestore
  const [schoolsLoadedFromFirestore, setSchoolsLoadedFromFirestore] = useState<boolean>(false);

  // Quota status state
  const [quotaExceeded, setQuotaExceeded] = useState<boolean>(() => getIsQuotaExceeded());
  const [quotaDismissed, setQuotaDismissed] = useState<boolean>(false);

  // Subscribe to quota status changes across all modules
  useEffect(() => {
    return subscribeToQuotaStatus((exceeded) => {
      if (exceeded) {
        setQuotaExceeded(true);
      }
    });
  }, []);

  // Initialize Firestore listeners only when user is authenticated
  useEffect(() => {
    if (!user || loading) {
      return;
    }

    // Ensure settings, canonical records, and cleanup run upon authenticated session
    ensureDefaultSettingsExist().catch((err) => console.warn('Settings init notice:', err));
    cleanupResidualMockData().catch((err) => console.warn('Mock cleanup notice:', err));

    const unsubs: (() => void)[] = [];
    const isAdmin =
      userProfile?.role === 'admin' ||
      isSystemAdminEmail(user.email);

    // 1. Core subscriptions for all authenticated portal users
    unsubs.push(subscribeToRequests((data) => setRequests(data)));
    unsubs.push(
      subscribeToSchools((data, fromFirestore) => {
        setSchools(data);
        if (fromFirestore) {
          setSchoolsLoadedFromFirestore(true);
        }
      })
    );
    unsubs.push(subscribeToActivityLogs((data) => setActivityLogs(data)));
    unsubs.push(subscribeToSettings((data) => setSettings(data)));
    unsubs.push(subscribeToFunders((data) => setFunders(data)));
    unsubs.push(subscribeToPendingInvites((data) => setPendingInvites(data)));

    // 2. Admin-only subscriptions
    if (isAdmin) {
      unsubs.push(subscribeToAdminUsers((data) => setAdminUsers(data)));
      unsubs.push(subscribeToManagedUsers((data) => setManagedUsers(data)));
      unsubs.push(
        subscribeToSecrets((sec) => {
          if (sec.sendgridApiKey !== undefined) {
            setSettings((prev) => ({
              ...prev,
              emailProvider: {
                ...prev.emailProvider,
                sendgridApiKey: sec.sendgridApiKey,
                hasSendgridKey: !!(sec.sendgridApiKey && sec.sendgridApiKey.trim().length > 0),
              },
            }));
          }
        })
      );
    }

    return () => {
      unsubs.forEach((unsub) => {
        try {
          unsub();
        } catch {
          // ignore
        }
      });
    };
  }, [user, userProfile?.role, loading]);

  // Keep school budget metrics accurately synchronized with actual requests.
  // Crucial: Only sync once confirmed from Firestore, and ONLY update derived metrics (never touch annualBudget).
  useEffect(() => {
    if (!schoolsLoadedFromFirestore || !schools.length || !requests.length) return;
    const currentSY = getCurrentSchoolYear(settings);
    let hasChanges = false;
    const updatedSchools = schools.map((s) => {
      const metrics = computeSchoolBudgetMetrics(s, requests, currentSY);
      if (
        s.budgetPaid !== metrics.budgetPaid ||
        s.budgetReserved !== metrics.budgetReserved ||
        s.budgetAvailable !== metrics.budgetAvailable
      ) {
        hasChanges = true;
        const updated: School = {
          ...s,
          budgetPaid: metrics.budgetPaid,
          budgetReserved: metrics.budgetReserved,
          budgetAvailable: metrics.budgetAvailable,
        };
        // Targeted field update: strictly updates only derived metrics without modifying annualBudget
        updateSchoolFieldsInFirestore(s.id, {
          budgetPaid: metrics.budgetPaid,
          budgetReserved: metrics.budgetReserved,
          budgetAvailable: metrics.budgetAvailable,
        }).catch(console.error);
        return updated;
      }
      return s;
    });

    if (hasChanges) {
      setSchools(updatedSchools);
    }
  }, [schoolsLoadedFromFirestore, requests, settings?.currentSchoolYear]);

  // Helper: Synchronize target school budget based on updated requests collection
  // Critical: Targeted update only modifying derived metrics, leaving annualBudget intact
  const syncSchoolBudget = (schoolId: string, customRequests: EmergencyRequest[]) => {
    const targetSchool = schools.find((s) => s.id === schoolId);
    if (!targetSchool) return;
    const currentSY = getCurrentSchoolYear(settings);
    const metrics = computeSchoolBudgetMetrics(targetSchool, customRequests, currentSY);
    const updatedSchool: School = {
      ...targetSchool,
      budgetPaid: metrics.budgetPaid,
      budgetReserved: metrics.budgetReserved,
      budgetAvailable: metrics.budgetAvailable,
    };
    setSchools((prev) => prev.map((s) => (s.id === schoolId ? updatedSchool : s)));
    updateSchoolFieldsInFirestore(schoolId, {
      budgetPaid: metrics.budgetPaid,
      budgetReserved: metrics.budgetReserved,
      budgetAvailable: metrics.budgetAvailable,
    }).catch(console.error);
  };

  // Helper: Add activity log note
  const handleAddActivityNote = (
    requestId: string,
    message: string,
    isInternalNote = false,
    schoolId?: string,
    eventType?: ActivityEvent['eventType'],
    fromStatus?: SystemRequestStatus,
    toStatus?: SystemRequestStatus
  ) => {
    const targetReq = requests.find((r) => r.id === requestId);
    const resolvedSchoolId = schoolId || targetReq?.schoolId || '';
    const newLog: ActivityEvent = {
      id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      requestId: requestId || undefined,
      schoolId: resolvedSchoolId,
      actorId: userProfile?.uid || 'user-unknown',
      actorName:
        userProfile?.displayName ||
        userProfile?.email ||
        (userProfile?.role === 'admin' ? 'PEF Administrator' : 'User'),
      actorRole: userProfile?.role || 'admin',
      eventType: eventType || (isInternalNote ? 'note' : 'status_change'),
      fromStatus,
      toStatus,
      message,
      isInternalNote,
      timestamp: new Date().toISOString(),
    };
    setActivityLogs((prev) => [newLog, ...prev]);
    saveActivityLogToFirestore(newLog).catch(console.error);
  };

  // Handler: Update request status
  const handleUpdateRequestStatus = async (
    requestId: string,
    newStatus: SystemRequestStatus,
    note?: string,
    taskContext?: TaskContext
  ) => {
    const target = requests.find((r) => r.id === requestId);
    if (!target) return;

    const prevStatus = target.status;
    const now = new Date().toISOString();
    const updatedReq: EmergencyRequest = {
      ...target,
      status: newStatus,
      statusUpdatedAt: newStatus !== prevStatus ? now : (target.statusUpdatedAt || now),
      previousStatus: (newStatus === 'response_requested' || newStatus === 'changes_requested') && target.status !== 'response_requested' && target.status !== 'changes_requested' ? target.status : target.previousStatus,
      taskContext: taskContext !== undefined ? taskContext : target.taskContext,
      statusNote: note || target.statusNote,
      updatedAt: now,
    };

    const newEmailLog = await generateAndTranslateEmailLogEntry(
      updatedReq,
      newStatus,
      settings.emailTemplates || INITIAL_SETTINGS.emailTemplates,
      note
    );

    if (newEmailLog) {
      updatedReq.emailLogs = [newEmailLog, ...(updatedReq.emailLogs || [])];
      const isBeneficiary = !!(newEmailLog.recipientRole && newEmailLog.recipientRole.toLowerCase().includes('beneficiary'));
      // Dispatch live email notice via email service / SendGrid
      dispatchEmail(
        {
          to: newEmailLog.recipientEmail,
          recipientName: newEmailLog.recipientName,
          recipientRole: newEmailLog.recipientRole,
          subject: newEmailLog.subject,
          body: newEmailLog.body,
          templateId: newEmailLog.templateId,
          triggerEvent: newEmailLog.triggerEvent,
          requestId: updatedReq.id,
          schoolId: updatedReq.schoolId,
          schoolName: updatedReq.schoolName,
          targetLanguage: newEmailLog.language,
          targetLanguageName: newEmailLog.languageName,
          isBeneficiaryEmail: isBeneficiary,
        },
        settings,
        userProfile?.email
      ).catch((err) => console.error('Error dispatching status update email:', err));
    }

    // Check if SMS dispatch should also occur for beneficiary
    const newSmsLog = await generateAndTranslateSmsLogEntry(
      updatedReq,
      newStatus,
      note
    );

    if (newSmsLog) {
      updatedReq.smsLogs = [newSmsLog, ...(updatedReq.smsLogs || [])];
      dispatchSms(
        {
          to: newSmsLog.to,
          text: newSmsLog.text,
          recipientName: newSmsLog.recipientName,
          recipientRole: 'beneficiary',
          targetLanguage: newSmsLog.language,
          targetLanguageName: newSmsLog.languageName,
          triggerEvent: newStatus,
          requestId: updatedReq.id,
          schoolId: updatedReq.schoolId,
          schoolName: updatedReq.schoolName,
        },
        settings,
        userProfile?.email
      ).catch((err) => console.error('Error dispatching status update SMS:', err));
    }

    const nextRequests = requests.map((r) => (r.id === requestId ? updatedReq : r));
    setRequests(nextRequests);
    saveRequestToFirestore(updatedReq).catch(console.error);

    // Sync school budget
    syncSchoolBudget(target.schoolId, nextRequests);

    const fromLabel = formatStatusLabel(prevStatus, settings.statusDisplayLabels);
    const toLabel = formatStatusLabel(newStatus, settings.statusDisplayLabels);
    let logMsg = `Status changed from '${fromLabel}' to '${toLabel}'${note ? `: ${note}` : '.'}`;
    if (newStatus === 'denied') {
      logMsg = `Request denied by administrator. Reason: ${note || 'No reason specified'}`;
    }

    handleAddActivityNote(
      requestId,
      logMsg,
      false,
      target.schoolId,
      'status_change',
      prevStatus,
      newStatus
    );

    notifySubscribedAdmins({
      request: updatedReq,
      actionStatus: newStatus,
      actionTaken: `Status changed from '${fromLabel}' to '${toLabel}'`,
      actorName: userProfile?.displayName || userProfile?.email || 'Administrator',
      actorEmail: userProfile?.email,
      customNote: note,
      settings,
      users: managedUsers,
    }).catch(console.error);
  };

  // Handler: Update request entity
  const handleUpdateRequest = async (
    id: string,
    updates: Partial<EmergencyRequest>,
    options?: { customLogMessage?: string; skipLog?: boolean; eventType?: ActivityEvent['eventType'] }
  ) => {
    const target = requests.find((r) => r.id === id);
    if (!target) return;

    const updatedReq = { ...target, ...updates, updatedAt: new Date().toISOString() } as EmergencyRequest;
    const nextRequests = requests.map((r) => (r.id === id ? updatedReq : r));
    setRequests(nextRequests);
    saveRequestToFirestore(updatedReq).catch(console.error);

    // Sync school budget if request status or amount changed
    syncSchoolBudget(target.schoolId, nextRequests);

    if (options?.skipLog) return;

    const actor =
      userProfile?.displayName ||
      userProfile?.email ||
      (userProfile?.role === 'admin' ? 'PEF Administrator' : 'User');

    if (options?.customLogMessage) {
      handleAddActivityNote(
        id,
        options.customLogMessage,
        false,
        target.schoolId,
        options.eventType || 'request_edited',
        target.status,
        updatedReq.status
      );
      return;
    }

    // Check if beneficiary newly confirmed
    const newlyConfirmed =
      updates.payoutDetails?.beneficiaryConfirmedAt &&
      !target.payoutDetails?.beneficiaryConfirmedAt;

    if (newlyConfirmed) {
      const confirmedBy = updates.payoutDetails?.beneficiaryConfirmedBy || actor;
      const message = `Beneficiary identity & contact details confirmed by ${confirmedBy}.${updates.statusNote ? ` Note: ${updates.statusNote}` : ' Queue moved to Ready to Pay.'}`;
      handleAddActivityNote(
        id,
        message,
        false,
        target.schoolId,
        'beneficiary_confirmed',
        target.status,
        updatedReq.status
      );
    }

    // Check if status changed
    if (updates.status && updates.status !== target.status) {
      const fromLabel = formatStatusLabel(target.status, settings.statusDisplayLabels);
      const toLabel = formatStatusLabel(updates.status, settings.statusDisplayLabels);
      const message = `Status updated from '${fromLabel}' to '${toLabel}'${updates.statusNote ? `: ${updates.statusNote}` : '.'}`;

      const newEmailLog = await generateAndTranslateEmailLogEntry(
        updatedReq,
        updates.status,
        settings.emailTemplates || INITIAL_SETTINGS.emailTemplates,
        updates.statusNote
      );

      let reqWithLogs: EmergencyRequest = { ...updatedReq };

      if (newEmailLog) {
        reqWithLogs.emailLogs = [newEmailLog, ...(reqWithLogs.emailLogs || [])];

        const isBeneficiaryRole = !!(
          newEmailLog.recipientRole &&
          newEmailLog.recipientRole.toLowerCase().includes('beneficiary')
        );

        dispatchEmail(
          {
            to: newEmailLog.recipientEmail,
            recipientName: newEmailLog.recipientName,
            recipientRole: newEmailLog.recipientRole,
            subject: newEmailLog.subject,
            body: newEmailLog.body,
            templateId: newEmailLog.templateId,
            triggerEvent: newEmailLog.triggerEvent,
            requestId: updatedReq.id,
            schoolId: updatedReq.schoolId,
            schoolName: updatedReq.schoolName,
            targetLanguage: newEmailLog.language,
            targetLanguageName: newEmailLog.languageName,
            isBeneficiaryEmail: isBeneficiaryRole,
          },
          settings,
          userProfile?.email
        ).catch((err) => console.error('Error dispatching status update email:', err));
      }

      // Notify any administrators subscribed to this workflow status
      notifySubscribedAdmins({
        request: updatedReq,
        actionStatus: updates.status,
        actionTaken: `Status updated from '${fromLabel}' to '${toLabel}'`,
        actorName: actor,
        actorEmail: userProfile?.email,
        customNote: updates.statusNote,
        settings,
        users: managedUsers,
      }).catch(console.error);

      // Check if SMS dispatch should also occur for beneficiary
      const newSmsLog = await generateAndTranslateSmsLogEntry(
        updatedReq,
        updates.status,
        updates.statusNote
      );

      if (newSmsLog) {
        reqWithLogs.smsLogs = [newSmsLog, ...(reqWithLogs.smsLogs || [])];
        dispatchSms(
          {
            to: newSmsLog.to,
            text: newSmsLog.text,
            recipientName: newSmsLog.recipientName,
            recipientRole: 'beneficiary',
            targetLanguage: newSmsLog.language,
            targetLanguageName: newSmsLog.languageName,
            triggerEvent: updates.status,
            requestId: updatedReq.id,
            schoolId: updatedReq.schoolId,
            schoolName: updatedReq.schoolName,
          },
          settings,
          userProfile?.email
        ).catch((err) => console.error('Error dispatching status update SMS:', err));
      }

      if (newEmailLog || newSmsLog) {
        setRequests((prev) => prev.map((r) => (r.id === id ? reqWithLogs : r)));
        saveRequestToFirestore(reqWithLogs).catch(console.error);
      }

      if (!newlyConfirmed) {
        handleAddActivityNote(
          id,
          message,
          false,
          target.schoolId,
          'status_change',
          target.status,
          updates.status
        );
      }
      return;
    }

    // Check if payout details provided or updated (when status did not change)
    if (updates.payoutDetails && updates.payoutDetails !== target.payoutDetails && !newlyConfirmed) {
      const pName = updates.payoutDetails.payoutMethodName || 'Direct Transfer';
      const payee =
        updates.payoutDetails.thirdPartyPayeeName ||
        updates.beneficiaryName ||
        target.beneficiaryName;
      const message = `Payout details updated (${pName}). Payee: ${payee}.${updates.statusNote ? ` Note: ${updates.statusNote}` : ''}`;
      handleAddActivityNote(
        id,
        message,
        false,
        target.schoolId,
        'payout_submitted',
        target.status,
        updatedReq.status
      );
      return;
    }

    if (newlyConfirmed) {
      return;
    }

    // Field diffing
    const diffs: string[] = [];
    if (updates.amount !== undefined && updates.amount !== target.amount) {
      diffs.push(`Amount ($${target.amount.toLocaleString()} → $${updates.amount.toLocaleString()})`);
    }
    if (updates.category !== undefined && updates.category !== target.category) {
      diffs.push(`Category ('${target.category}' → '${updates.category}')`);
    }
    if (updates.beneficiaryName !== undefined && updates.beneficiaryName !== target.beneficiaryName) {
      diffs.push(`Beneficiary ('${target.beneficiaryName}' → '${updates.beneficiaryName}')`);
    }
    if (updates.studentName !== undefined && updates.studentName !== target.studentName) {
      diffs.push(`Student ('${target.studentName || 'N/A'}' → '${updates.studentName || 'N/A'}')`);
    }
    if (
      updates.payoutDetails?.payeeType !== undefined &&
      updates.payoutDetails?.payeeType !== target.payoutDetails?.payeeType
    ) {
      diffs.push(`Payee type ('${target.payoutDetails?.payeeType || 'N/A'}' → '${updates.payoutDetails.payeeType}')`);
    }

    const message = diffs.length > 0
      ? `Request details updated by ${actor}: ${diffs.join('; ')}.`
      : `Request details updated by ${actor}.`;

    handleAddActivityNote(
      id,
      message,
      false,
      target.schoolId,
      'request_edited',
      target.status,
      target.status
    );
  };

  // Handler: Create Request
  const handleCreateRequest = async (newReq: Partial<EmergencyRequest>) => {
    let created = { ...newReq } as EmergencyRequest;

    // Collision-free request ID guarantee
    const existingIds = new Set(requests.map((r) => r.id));
    if (!created.id || existingIds.has(created.id)) {
      let maxNum = 2000;
      for (const r of requests) {
        const match = r.id.match(/^REQ-2026-(\d+)$/);
        if (match) {
          const num = parseInt(match[1], 10);
          if (num > maxNum && num < 90000) maxNum = num;
        }
      }
      let uniqueId = `REQ-2026-${maxNum + 1}`;
      while (existingIds.has(uniqueId)) {
        maxNum++;
        uniqueId = `REQ-2026-${maxNum + 1}`;
      }
      created.id = uniqueId;
    }

    // Generate confirmation email log entry
    const subEmailLog = await generateAndTranslateEmailLogEntry(
      created,
      'request_submission',
      settings.emailTemplates || INITIAL_SETTINGS.emailTemplates
    );

    if (subEmailLog) {
      created.emailLogs = [subEmailLog, ...(created.emailLogs || [])];
      dispatchEmail(
        {
          to: subEmailLog.recipientEmail,
          recipientName: subEmailLog.recipientName,
          recipientRole: subEmailLog.recipientRole,
          subject: subEmailLog.subject,
          body: subEmailLog.body,
          templateId: subEmailLog.templateId,
          triggerEvent: subEmailLog.triggerEvent,
          requestId: created.id,
          schoolId: created.schoolId,
          schoolName: created.schoolName,
          targetLanguage: subEmailLog.language,
          targetLanguageName: subEmailLog.languageName,
          isBeneficiaryEmail: false,
        },
        settings,
        userProfile?.email
      ).catch((err) => console.error('Error dispatching request creation confirmation email:', err));
    }

    const nextRequests = [created, ...requests];
    setRequests(nextRequests);
    saveRequestToFirestore(created).catch(console.error);

    // Sync school budget
    syncSchoolBudget(created.schoolId, nextRequests);

    handleAddActivityNote(
      created.id,
      `Emergency request submitted by ${created.submitterName} for ${created.beneficiaryName} ($${created.amount.toLocaleString()} - ${created.category}). Initial status: Pending Review.`,
      false,
      created.schoolId,
      'request_created',
      undefined,
      created.status || 'in_review'
    );

    // Notify administrators subscribed to 'in_review' workflow status
    notifySubscribedAdmins({
      request: created,
      actionStatus: created.status || 'in_review',
      actionTaken: `New emergency request submitted by ${created.submitterName} ($${created.amount.toLocaleString()})`,
      actorName: created.submitterName || userProfile?.displayName || 'School Staff',
      actorEmail: created.submitterEmail || userProfile?.email,
      settings,
      users: managedUsers,
    }).catch(console.error);
  };

  // Handler: Cancel Request
  const handleCancelRequest = (request: EmergencyRequest, reason?: string) => {
    const prevStatus = request.status;
    const cancelNote = reason?.trim() || 'Request canceled. Reserved budget released.';
    const updatedReq: EmergencyRequest = {
      ...request,
      status: 'canceled',
      statusNote: cancelNote,
      updatedAt: new Date().toISOString(),
    };
    const nextRequests = requests.map((r) => (r.id === request.id ? updatedReq : r));
    setRequests(nextRequests);
    saveRequestToFirestore(updatedReq).catch(console.error);

    // Sync school budget
    syncSchoolBudget(request.schoolId, nextRequests);

    handleAddActivityNote(
      request.id,
      cancelNote,
      false,
      request.schoolId,
      'status_change',
      prevStatus,
      'canceled'
    );

    // Notify administrators subscribed to 'canceled' workflow status
    notifySubscribedAdmins({
      request: updatedReq,
      actionStatus: 'canceled',
      actionTaken: `Request canceled. ${cancelNote}`,
      actorName: userProfile?.displayName || userProfile?.email || 'User',
      actorEmail: userProfile?.email,
      customNote: cancelNote,
      settings,
      users: managedUsers,
    }).catch(console.error);
  };

  // Handler: Save Payout Details
  const handleSavePayoutDetails = async (requestId: string, payoutDetails: RequestPayoutDetails) => {
    const target = requests.find((r) => r.id === requestId);
    if (!target) return;

    const prevStatus = target.status;
    const now = new Date().toISOString();
    const updatedReq: EmergencyRequest = {
      ...target,
      payoutDetails,
      status: 'waiting_on_beneficiary',
      statusUpdatedAt: now,
      statusNote: 'Payout details provided. Pending beneficiary verification.',
      updatedAt: now,
    };

    const contactMethod = payoutDetails.contactMethod;
    const contactValue = payoutDetails.contactValue?.trim() || '';
    const isEmailContact = contactMethod === 'email' || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactValue);
    const isTextContact = contactMethod === 'text' || /^\+?[0-9\s\-()]{7,}$/.test(contactValue);

    // Only dispatch confirmation email to beneficiary if contact method is email
    if (contactMethod ? contactMethod === 'email' : isEmailContact) {
      const newEmailLog = await generateAndTranslateEmailLogEntry(
        updatedReq,
        'status_change_to_waiting_on_beneficiary',
        settings.emailTemplates || INITIAL_SETTINGS.emailTemplates,
        'Payout details provided. Pending beneficiary verification.'
      );

      if (newEmailLog) {
        updatedReq.emailLogs = [newEmailLog, ...(updatedReq.emailLogs || [])];
        dispatchEmail(
          {
            to: newEmailLog.recipientEmail,
            recipientName: newEmailLog.recipientName,
            recipientRole: newEmailLog.recipientRole,
            subject: newEmailLog.subject,
            body: newEmailLog.body,
            templateId: newEmailLog.templateId,
            triggerEvent: newEmailLog.triggerEvent,
            requestId: updatedReq.id,
            schoolId: updatedReq.schoolId,
            schoolName: updatedReq.schoolName,
            targetLanguage: newEmailLog.language,
            targetLanguageName: newEmailLog.languageName,
            isBeneficiaryEmail: true,
          },
          settings,
          userProfile?.email
        ).catch((err) => console.error('Error dispatching payout status email:', err));
      }
    }

    // Only dispatch SMS verification to beneficiary if contact method is text/SMS
    if (contactMethod ? contactMethod === 'text' : isTextContact) {
      const newSmsLog = await generateAndTranslateSmsLogEntry(
        updatedReq,
        'status_change_to_waiting_on_beneficiary',
        'Payout details provided. Pending beneficiary verification.'
      );

      if (newSmsLog) {
        updatedReq.smsLogs = [newSmsLog, ...(updatedReq.smsLogs || [])];
        dispatchSms(
          {
            to: newSmsLog.to,
            text: newSmsLog.text,
            recipientName: newSmsLog.recipientName,
            recipientRole: 'beneficiary',
            targetLanguage: newSmsLog.language,
            targetLanguageName: newSmsLog.languageName,
            triggerEvent: 'status_change_to_waiting_on_beneficiary',
            requestId: updatedReq.id,
            schoolId: updatedReq.schoolId,
            schoolName: updatedReq.schoolName,
          },
          settings,
          userProfile?.email
        ).catch((err) => console.error('Error dispatching payout status SMS:', err));
      }
    }

    setRequests((prev) => prev.map((r) => (r.id === requestId ? updatedReq : r)));
    saveRequestToFirestore(updatedReq).catch(console.error);

    handleAddActivityNote(
      requestId,
      `Payout details submitted (${payoutDetails.payoutMethodName}) for ${target.beneficiaryName}. Status set to Waiting on Beneficiary.`,
      false,
      target.schoolId,
      'payout_submitted',
      prevStatus,
      'waiting_on_beneficiary'
    );

    // Notify administrators subscribed to 'waiting_on_beneficiary' workflow status
    notifySubscribedAdmins({
      request: updatedReq,
      actionStatus: 'waiting_on_beneficiary',
      actionTaken: `Payout details submitted (${payoutDetails.payoutMethodName}). Pending beneficiary verification.`,
      actorName: userProfile?.displayName || userProfile?.email || 'Submitter',
      actorEmail: userProfile?.email,
      settings,
      users: managedUsers,
    }).catch(console.error);
  };

  // Handler: Create School
  const handleCreateSchool = (newSchool: Partial<School>) => {
    const created = newSchool as School;
    setSchools((prev) => [created, ...prev]);
    saveSchoolToFirestore(created).catch(console.error);

    const newLog: ActivityEvent = {
      id: `log-${Date.now()}`,
      schoolId: created.id,
      actorId: userProfile?.uid || 'user-unknown',
      actorName: userProfile?.displayName || userProfile?.email || (userProfile?.role === 'admin' ? 'PEF Administrator' : 'Admin'),
      actorRole: userProfile?.role || 'admin',
      eventType: 'status_change',
      message: `New partner school onboarded: ${created.name} ($${(created.annualBudget || 0).toLocaleString()} annual allocation).`,
      timestamp: new Date().toISOString(),
    };
    setActivityLogs((prev) => [newLog, ...prev]);
    saveActivityLogToFirestore(newLog).catch(console.error);

    // Keep funder associatedSchoolIds in sync if a funder was assigned
    if (created.funderId) {
      setFunders((prev) =>
        prev.map((f) => {
          if (f.id === created.funderId) {
            const updated = {
              ...f,
              associatedSchoolIds: Array.from(new Set([...(f.associatedSchoolIds || []), created.id])),
            };
            saveFunderToFirestore(updated).catch(console.error);
            return updated;
          }
          return f;
        })
      );
    }

    // If a principal email is provided on the new school, auto-dispatch onboarding invitation & register user
    if (created.principalEmail && created.principalEmail.trim()) {
      const cleanPrincipalEmail = created.principalEmail.trim();
      const cleanPrincipalName = created.principalName ? created.principalName.replace(/\s*\(Pending\)\s*/gi, '').trim() : 'Principal';
      const userId = `USR-${Date.now()}`;

      // 1. Create Managed User entry
      const newManagedUser: AppUser = {
        id: userId,
        name: cleanPrincipalName || 'Principal',
        email: cleanPrincipalEmail,
        phone: created.principalPhone,
        role: 'principal',
        schoolId: created.id,
        schoolName: created.name,
        jobTitle: 'Principal',
        status: 'pending',
        createdAt: new Date().toISOString(),
        mfaEnabled: false,
      };

      setManagedUsers((prev) => {
        const existingIndex = prev.findIndex((u) => u.email?.toLowerCase() === cleanPrincipalEmail.toLowerCase());
        if (existingIndex >= 0) {
          const updated = [...prev];
          updated[existingIndex] = {
            ...updated[existingIndex],
            schoolId: created.id,
            schoolName: created.name,
            role: 'principal',
            name: cleanPrincipalName || updated[existingIndex].name,
            phone: created.principalPhone || updated[existingIndex].phone,
          };
          saveManagedUserToFirestore(updated[existingIndex]).catch(console.error);
          return updated;
        }
        saveManagedUserToFirestore(newManagedUser).catch(console.error);
        return [newManagedUser, ...prev];
      });

      // 2. Create Pending Invite entry
      const newInvite: PendingInvite = {
        id: `INV-${Date.now()}`,
        email: cleanPrincipalEmail,
        name: cleanPrincipalName || 'Principal',
        role: 'principal',
        schoolId: created.id,
        schoolName: created.name,
        jobTitle: 'Principal',
        invitedBy: userProfile?.displayName || userProfile?.email || 'PEF Administrator',
        invitedAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'pending',
        inviteCode: `INV-${Math.floor(1000 + Math.random() * 9000)}`,
        notes: `Onboarding invitation for ${created.name}. Please review and sign MOU upon login.`,
      };

      setPendingInvites((prev) => {
        const filtered = prev.filter((p) => p.email.toLowerCase() !== cleanPrincipalEmail.toLowerCase());
        return [newInvite, ...filtered];
      });
      savePendingInviteToFirestore(newInvite).catch(console.error);

      try {
        const rendered = renderInviteEmail(settings.emailTemplates || INITIAL_SETTINGS.emailTemplates, {
          recipient_name: newInvite.name,
          school_name: created.name,
          amount: (created.annualBudget || 10000).toLocaleString(),
          role: 'principal',
          invite_link: `${window.location.origin}/setup-account?email=${encodeURIComponent(newInvite.email)}`,
          custom_note: newInvite.notes,
        });

        dispatchEmail(
          {
            to: newInvite.email,
            recipientName: newInvite.name,
            subject: rendered.subject,
            body: rendered.body,
            templateId: rendered.template?.id || 'tpl-10',
            triggerEvent: rendered.template?.triggerEvent || 'principal_invitation',
            schoolId: created.id,
            schoolName: created.name,
          },
          settings,
          userProfile?.email
        ).catch((err) => console.error('Failed to trigger principal onboarding email:', err));
      } catch (err) {
        console.error('Failed to render invite email for new school:', err);
      }
    }
  };

  // Handler: Update School
  const handleUpdateSchool = (schoolId: string, updates: Partial<School>) => {
    const target = schools.find((s) => s.id === schoolId);
    if (!target) return;

    const updatedSchool = { ...target, ...updates } as School;
    if ('funderId' in updates && (!updates.funderId || updates.funderId === '')) {
      delete updatedSchool.funderId;
      delete updatedSchool.funderName;
    }
    setSchools((prev) => prev.map((s) => (s.id === schoolId ? updatedSchool : s)));
    // Targeted update: Only update the explicitly modified fields in Firestore (never overwriting untouched budget)
    updateSchoolFieldsInFirestore(schoolId, updates).catch(console.error);

    // Keep Funder associatedSchoolIds in sync if funderId changed
    const funderChanged = 'funderId' in updates && updates.funderId !== target.funderId;
    if (funderChanged) {
      if (target.funderId) {
        setFunders((prev) =>
          prev.map((f) => {
            if (f.id === target.funderId) {
              const updated = {
                ...f,
                associatedSchoolIds: (f.associatedSchoolIds || []).filter((sid) => sid !== schoolId),
              };
              saveFunderToFirestore(updated).catch(console.error);
              return updated;
            }
            return f;
          })
        );
      }
      if (updates.funderId) {
        setFunders((prev) =>
          prev.map((f) => {
            if (f.id === updates.funderId) {
              const updated = {
                ...f,
                associatedSchoolIds: Array.from(new Set([...(f.associatedSchoolIds || []), schoolId])),
              };
              saveFunderToFirestore(updated).catch(console.error);
              return updated;
            }
            return f;
          })
        );
      }
    }

    // Auto-generate Activity Event for school updates
    let logType: ActivityEvent['eventType'] = 'note';
    let logMessage = `Updated profile settings for ${target.name}.`;

    if (updates.currentMouSigned !== undefined && updates.currentMouSigned !== target.currentMouSigned) {
      logType = 'mou_signed';
      const actorName = userProfile?.displayName || userProfile?.email || 'Administrator';
      logMessage = updates.currentMouSigned
        ? `Annual Memorandum of Understanding (MOU) executed and marked SIGNED for ${target.name} (Signer: ${updates.currentMouSignedBy || actorName}${updates.currentMouSignedByTitle ? `, ${updates.currentMouSignedByTitle}` : ''}).`
        : `Annual Memorandum of Understanding (MOU) status marked as PENDING / UNSIGNED for ${target.name} by ${actorName}.`;
    } else if (updates.hasCustomMou !== undefined && updates.hasCustomMou !== target.hasCustomMou) {
      logType = 'mou_signed';
      logMessage = updates.hasCustomMou
        ? `Custom Memorandum of Understanding (MOU) override configured specifically for ${target.name}.`
        : `Custom MOU override removed for ${target.name}. Reverted to global standard MOU template.`;
    } else if (
      updates.principalName !== undefined ||
      updates.principalEmail !== undefined ||
      updates.principalPhone !== undefined
    ) {
      logType = 'principal_update';
      const name = updates.principalName || target.principalName || 'Principal';
      const email = updates.principalEmail || target.principalEmail || '';
      logMessage = `Updated leadership contact details: ${name} (${email || 'No email'}).`;
    } else if (updates.additionalContacts !== undefined) {
      logType = 'contact_update';
      logMessage = `Updated secondary/emergency contact roster (${updates.additionalContacts.length} contacts on file).`;
    } else if (updates.status !== undefined && updates.status !== target.status) {
      logType = 'status_change';
      logMessage = `School operational status changed from '${target.status}' to '${updates.status}'.`;
    } else if (updates.annualBudget !== undefined && updates.annualBudget !== target.annualBudget) {
      logType = 'budget_adjusted';
      logMessage = `Annual budget limit updated to $${updates.annualBudget.toLocaleString()}.`;
    }

    const newLog: ActivityEvent = {
      id: `log-${Date.now()}`,
      schoolId,
      actorId: userProfile?.uid || 'user-unknown',
      actorName: userProfile?.displayName || userProfile?.email || (userProfile?.role === 'admin' ? 'PEF Administrator' : 'User'),
      actorRole: userProfile?.role || 'admin',
      eventType: logType,
      message: logMessage,
      timestamp: new Date().toISOString(),
    };
    setActivityLogs((prev) => [newLog, ...prev]);
    saveActivityLogToFirestore(newLog).catch(console.error);
  };

  // Handler: Delete School
  const handleDeleteSchool = async (schoolId: string) => {
    const target = schools.find((s) => s.id === schoolId);
    setSchools((prev) => prev.filter((s) => s.id !== schoolId));

    try {
      await deleteSchoolFromFirestore(schoolId);
    } catch (err) {
      console.error('Error deleting school from Firestore:', err);
    }

    const log: ActivityEvent = {
      id: `log-${Date.now()}-${schoolId}`,
      schoolId,
      actorId: userProfile?.uid || 'user-admin',
      actorName: userProfile?.displayName || userProfile?.email || 'PEF Administrator',
      actorRole: 'admin',
      eventType: 'note',
      message: `Partner school removed: ${target?.name || schoolId}.`,
      timestamp: new Date().toISOString(),
    };
    setActivityLogs((prev) => [log, ...prev]);
    saveActivityLogToFirestore(log).catch(console.error);
  };

  // Handler: Wipe Production / Test Data
  const handleWipeProductionData = async (options: WipeDataOptions) => {
    const res = await wipeProductionTestData(options, userProfile?.email || user?.email);
    if (options.wipeSchools) setSchools([]);
    if (options.wipeRequests) setRequests([]);
    if (options.wipeFunders) setFunders([]);
    if (options.wipePendingInvites) setPendingInvites([]);
    if (options.wipeActivityLogs) setActivityLogs([]);
    if (options.wipePrincipalsAndUsers) {
      const currentEmail = (userProfile?.email || user?.email || '').toLowerCase().trim();
      setManagedUsers((prev) =>
        prev.filter((u) => u.role === 'admin' || (u.email && u.email.toLowerCase().trim() === currentEmail))
      );
    }
    const updatedSettings = { ...settings, isProductionReady: true };
    setSettings(updatedSettings);
    saveSettingsToFirestore(updatedSettings).catch(console.error);
    return res;
  };

  // Handler: Add Budget Adjustment
  const handleAddBudgetAdjustment = (
    schoolId: string,
    amount: number,
    reason: string,
    actorName: string
  ) => {
    const target = schools.find((s) => s.id === schoolId);
    if (target) {
      const newAnnual = target.annualBudget + amount;
      const newAvailable = target.budgetAvailable + amount;
      const updatedSchool: School = { ...target, annualBudget: newAnnual, budgetAvailable: newAvailable };
      setSchools((prev) => prev.map((s) => (s.id === schoolId ? updatedSchool : s)));
      updateSchoolFieldsInFirestore(schoolId, {
        annualBudget: newAnnual,
        budgetAvailable: newAvailable,
        updatedAt: new Date().toISOString(),
      }).catch(console.error);
    }

    const newTx: BudgetTransaction = {
      id: `btx-${Date.now()}`,
      schoolId,
      amount,
      type: 'manual_adjustment',
      reason,
      actorName,
      timestamp: new Date().toISOString(),
    };
    setBudgetTransactions((prev) => [newTx, ...prev]);

    // Record Activity Log
    const newLog: ActivityEvent = {
      id: `log-${Date.now()}`,
      schoolId,
      actorId: userProfile?.uid || 'user-unknown',
      actorName: actorName || userProfile?.displayName || userProfile?.email || 'PEF Administrator',
      actorRole: 'admin',
      eventType: 'budget_adjusted',
      message: `Annual fund budget adjusted by ${amount >= 0 ? '+' : ''}$${amount.toLocaleString()}. Reason: ${reason || 'Manual budget adjustment'}`,
      timestamp: new Date().toISOString(),
    };
    setActivityLogs((prev) => [newLog, ...prev]);
    saveActivityLogToFirestore(newLog).catch(console.error);
  };

  // Handler: Fiscal Year End Budget Reset & Annual Rollover
  const handleFiscalYearBudgetReset = (options: FiscalYearResetOptions) => {
    const { targetSchoolYear, baseAnnualBudget, rolloverUnspent, resetCounters, resetMouToPending, selectedSchoolIds, mouVersionId } = options;
    const targetIds = selectedSchoolIds && selectedSchoolIds.length > 0 
      ? selectedSchoolIds 
      : schools.filter((s) => s.status === 'active' || s.status === 'invited').map((s) => s.id);

    const nowIso = new Date().toISOString();
    const newTxList: BudgetTransaction[] = [];
    const newLogList: ActivityEvent[] = [];

    setSchools((prev) =>
      prev.map((school) => {
        if (!targetIds.includes(school.id)) return school;

        const unspent = rolloverUnspent ? Math.max(school.budgetAvailable, 0) : 0;
        const newAnnual = baseAnnualBudget + unspent;
        const newAvailable = newAnnual;
        const newPaid = resetCounters ? 0 : school.budgetPaid;
        const newReserved = resetCounters ? 0 : school.budgetReserved;

        const schoolResetUpdates: Partial<School> = {
          annualBudget: newAnnual,
          budgetAvailable: newAvailable,
          budgetPaid: newPaid,
          budgetReserved: newReserved,
          ...(resetMouToPending
            ? { currentMouSigned: false, currentMouSignedAt: undefined, currentMouSignedBy: undefined, currentMouSignedByTitle: undefined, currentMouVersionId: mouVersionId }
            : {}),
          updatedAt: nowIso,
        };

        const updatedSchool: School = {
          ...school,
          ...schoolResetUpdates,
        };

        updateSchoolFieldsInFirestore(school.id, schoolResetUpdates).catch(console.error);

        const btxAmount = newAvailable - school.budgetAvailable;
        const btx: BudgetTransaction = {
          id: `btx-${Date.now()}-${school.id}`,
          schoolId: school.id,
          amount: btxAmount,
          type: 'fiscal_year_reset',
          reason: `SY ${targetSchoolYear} Fiscal Year End Budget Reset (Base Allocation: $${baseAnnualBudget.toLocaleString()}${rolloverUnspent ? ' + Unspent Rollover' : ''})`,
          actorName: userProfile?.displayName || userProfile?.email || 'PEF Administrator',
          timestamp: nowIso,
        };
        newTxList.push(btx);

        const log: ActivityEvent = {
          id: `log-${Date.now()}-${school.id}`,
          schoolId: school.id,
          actorId: userProfile?.uid || 'user-unknown',
          actorName: userProfile?.displayName || userProfile?.email || 'PEF Administrator',
          actorRole: 'admin',
          eventType: 'budget_adjusted',
          message: `Fiscal Year End Budget Reset executed for SY ${targetSchoolYear}. New annual baseline: $${newAnnual.toLocaleString()} (Available: $${newAvailable.toLocaleString()}).${resetMouToPending ? ' Annual MOU status reset to pending.' : ''}`,
          timestamp: nowIso,
        };
        newLogList.push(log);
        saveActivityLogToFirestore(log).catch(console.error);

        return updatedSchool;
      })
    );

    setBudgetTransactions((prev) => [...newTxList, ...prev]);
    setActivityLogs((prev) => [...newLogList, ...prev]);

    // Transition active system school year to targetSchoolYear
    const updatedSettings: PortalSettings = {
      ...settings,
      currentSchoolYear: targetSchoolYear,
    };
    setSettings(updatedSettings);
    saveSettingsToFirestore(updatedSettings).catch(console.error);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('pef_current_school_year', targetSchoolYear);
    }
  };

  // Handler: Create Funder
  const handleCreateFunder = (funder: Partial<Funder>, assignedSchoolIds: string[] = []) => {
    const newId = funder.id || `FND-${Date.now()}`;
    const newName = funder.name || 'New Funder';
    const associatedSchoolIds = Array.from(new Set([...(funder.associatedSchoolIds || []), ...assignedSchoolIds]));

    const newFunder: Funder = {
      id: newId,
      name: newName,
      type: funder.type || 'Foundation',
      contactName: funder.contactName,
      contactEmail: funder.contactEmail,
      contactPhone: funder.contactPhone,
      notes: funder.notes,
      associatedSchoolIds,
      createdAt: funder.createdAt || new Date().toISOString(),
    };

    setFunders((prev) => [newFunder, ...prev]);
    saveFunderToFirestore(newFunder).catch(console.error);

    // If initial schools were assigned, update each school
    if (associatedSchoolIds.length > 0) {
      setSchools((prev) =>
        prev.map((school) => {
          if (associatedSchoolIds.includes(school.id)) {
            const updatedSchool: School = {
              ...school,
              funderId: newId,
              funderName: newName,
              updatedAt: new Date().toISOString(),
            };
            updateSchoolFieldsInFirestore(school.id, {
              funderId: newId,
              funderName: newName,
              updatedAt: updatedSchool.updatedAt,
            }).catch(console.error);

            // Log activity
            const log: ActivityEvent = {
              id: `log-${Date.now()}-${school.id}`,
              schoolId: school.id,
              actorId: userProfile?.uid || 'user-admin',
              actorName: userProfile?.displayName || userProfile?.email || 'PEF Administrator',
              actorRole: 'admin',
              eventType: 'note',
              message: `School assigned to newly created funder: ${newName}.`,
              timestamp: new Date().toISOString(),
            };
            setActivityLogs((prevLogs) => [log, ...prevLogs]);
            saveActivityLogToFirestore(log).catch(console.error);

            return updatedSchool;
          }
          return school;
        })
      );
    }
  };

  // Handler: Update Funder (with optional school ID list sync)
  const handleUpdateFunder = (
    id: string,
    updates: Partial<Funder>,
    updatedSchoolIds?: string[]
  ) => {
    const target = funders.find((f) => f.id === id);
    const effectiveName = updates.name !== undefined ? updates.name : (target?.name || '');

    let effectiveAssociatedIds = target?.associatedSchoolIds || [];
    if (updatedSchoolIds !== undefined) {
      effectiveAssociatedIds = updatedSchoolIds;
    } else if (updates.associatedSchoolIds !== undefined) {
      effectiveAssociatedIds = updates.associatedSchoolIds;
    }

    const updatedFunder: Funder = {
      ...(target || ({} as Funder)),
      ...updates,
      id,
      name: effectiveName,
      type: updates.type || target?.type || 'Foundation',
      associatedSchoolIds: effectiveAssociatedIds,
    };

    setFunders((prev) => prev.map((f) => (f.id === id ? updatedFunder : f)));
    saveFunderToFirestore(updatedFunder).catch(console.error);

    // If updatedSchoolIds was explicitly provided, sync schools state and Firestore
    if (updatedSchoolIds !== undefined && target) {
      const prevIds = new Set(target.associatedSchoolIds || []);
      const newIds = new Set(updatedSchoolIds);

      const addedIds = updatedSchoolIds.filter((sid) => !prevIds.has(sid));
      const removedIds = (target.associatedSchoolIds || []).filter((sid) => !newIds.has(sid));

      setSchools((prev) =>
        prev.map((school) => {
          if (addedIds.includes(school.id)) {
            const updatedSchool: School = {
              ...school,
              funderId: id,
              funderName: effectiveName,
              updatedAt: new Date().toISOString(),
            };
            updateSchoolFieldsInFirestore(school.id, {
              funderId: id,
              funderName: effectiveName,
              updatedAt: updatedSchool.updatedAt,
            }).catch(console.error);

            const log: ActivityEvent = {
              id: `log-${Date.now()}-${school.id}`,
              schoolId: school.id,
              actorId: userProfile?.uid || 'user-admin',
              actorName: userProfile?.displayName || userProfile?.email || 'PEF Administrator',
              actorRole: 'admin',
              eventType: 'note',
              message: `School assigned to funding partner: ${effectiveName}.`,
              timestamp: new Date().toISOString(),
            };
            setActivityLogs((prevLogs) => [log, ...prevLogs]);
            saveActivityLogToFirestore(log).catch(console.error);

            return updatedSchool;
          }

          if (removedIds.includes(school.id)) {
            const updatedSchool: School = {
              ...school,
              funderId: undefined,
              funderName: undefined,
              updatedAt: new Date().toISOString(),
            };
            updateSchoolFieldsInFirestore(school.id, {
              funderId: '' as any,
              funderName: '' as any,
              updatedAt: updatedSchool.updatedAt,
            }).catch(console.error);

            const log: ActivityEvent = {
              id: `log-${Date.now()}-${school.id}`,
              schoolId: school.id,
              actorId: userProfile?.uid || 'user-admin',
              actorName: userProfile?.displayName || userProfile?.email || 'PEF Administrator',
              actorRole: 'admin',
              eventType: 'note',
              message: `School unassigned from funding partner: ${target.name}.`,
              timestamp: new Date().toISOString(),
            };
            setActivityLogs((prevLogs) => [log, ...prevLogs]);
            saveActivityLogToFirestore(log).catch(console.error);

            return updatedSchool;
          }

          // If funder name changed, keep existing associated schools' funderName updated
          if (school.funderId === id && school.funderName !== effectiveName) {
            const updatedSchool: School = {
              ...school,
              funderName: effectiveName,
              updatedAt: new Date().toISOString(),
            };
            updateSchoolFieldsInFirestore(school.id, {
              funderName: effectiveName,
              updatedAt: updatedSchool.updatedAt,
            }).catch(console.error);
            return updatedSchool;
          }

          return school;
        })
      );
    } else if (updates.name && target && updates.name !== target.name) {
      // Just name updated, sync name to existing schools
      setSchools((prev) =>
        prev.map((school) => {
          if (school.funderId === id) {
            const updatedSchool = {
              ...school,
              funderName: effectiveName,
              updatedAt: new Date().toISOString(),
            };
            updateSchoolFieldsInFirestore(school.id, {
              funderName: effectiveName,
              updatedAt: updatedSchool.updatedAt,
            }).catch(console.error);
            return updatedSchool;
          }
          return school;
        })
      );
    }
  };

  // Handler: Assign Schools to Funder
  const handleAssignSchoolsToFunder = (funderId: string, schoolIdsToAssign: string[]) => {
    const targetFunder = funders.find((f) => f.id === funderId);
    if (!targetFunder || schoolIdsToAssign.length === 0) return;

    const updatedAssociated = Array.from(new Set([...(targetFunder.associatedSchoolIds || []), ...schoolIdsToAssign]));
    const updatedFunder: Funder = {
      ...targetFunder,
      associatedSchoolIds: updatedAssociated,
    };

    setFunders((prev) => prev.map((f) => (f.id === funderId ? updatedFunder : f)));
    saveFunderToFirestore(updatedFunder).catch(console.error);

    setSchools((prev) =>
      prev.map((school) => {
        if (schoolIdsToAssign.includes(school.id)) {
          const updatedSchool: School = {
            ...school,
            funderId,
            funderName: targetFunder.name,
            updatedAt: new Date().toISOString(),
          };
          updateSchoolFieldsInFirestore(school.id, {
            funderId,
            funderName: targetFunder.name,
            updatedAt: updatedSchool.updatedAt,
          }).catch(console.error);

          const log: ActivityEvent = {
            id: `log-${Date.now()}-${school.id}`,
            schoolId: school.id,
            actorId: userProfile?.uid || 'user-admin',
            actorName: userProfile?.displayName || userProfile?.email || 'PEF Administrator',
            actorRole: 'admin',
            eventType: 'note',
            message: `School assigned to funding partner: ${targetFunder.name}.`,
            timestamp: new Date().toISOString(),
          };
          setActivityLogs((prevLogs) => [log, ...prevLogs]);
          saveActivityLogToFirestore(log).catch(console.error);

          return updatedSchool;
        }
        return school;
      })
    );
  };

  // Handler: Unassign School from Funder
  const handleUnassignSchoolFromFunder = (funderId: string, schoolId: string) => {
    const targetFunder = funders.find((f) => f.id === funderId);
    if (!targetFunder) return;

    const updatedAssociated = (targetFunder.associatedSchoolIds || []).filter((id) => id !== schoolId);
    const updatedFunder: Funder = {
      ...targetFunder,
      associatedSchoolIds: updatedAssociated,
    };

    setFunders((prev) => prev.map((f) => (f.id === funderId ? updatedFunder : f)));
    saveFunderToFirestore(updatedFunder).catch(console.error);

    setSchools((prev) =>
      prev.map((school) => {
        if (school.id === schoolId) {
          const updatedSchool: School = {
            ...school,
            funderId: undefined,
            funderName: undefined,
            updatedAt: new Date().toISOString(),
          };
          updateSchoolFieldsInFirestore(school.id, {
            funderId: '' as any,
            funderName: '' as any,
            updatedAt: updatedSchool.updatedAt,
          }).catch(console.error);

          const log: ActivityEvent = {
            id: `log-${Date.now()}-${school.id}`,
            schoolId: school.id,
            actorId: userProfile?.uid || 'user-admin',
            actorName: userProfile?.displayName || userProfile?.email || 'PEF Administrator',
            actorRole: 'admin',
            eventType: 'note',
            message: `School unassigned from funding partner: ${targetFunder.name}.`,
            timestamp: new Date().toISOString(),
          };
          setActivityLogs((prevLogs) => [log, ...prevLogs]);
          saveActivityLogToFirestore(log).catch(console.error);

          return updatedSchool;
        }
        return school;
      })
    );
  };

  // Handler: Delete Funder
  const handleDeleteFunder = (id: string) => {
    const targetFunder = funders.find((f) => f.id === id);
    setFunders((prev) => prev.filter((f) => f.id !== id));
    deleteFunderFromFirestore(id).catch(console.error);

    // Unassign all schools associated with this funder
    setSchools((prev) =>
      prev.map((school) => {
        if (school.funderId === id) {
          const updatedSchool: School = {
            ...school,
            funderId: undefined,
            funderName: undefined,
            updatedAt: new Date().toISOString(),
          };
          updateSchoolFieldsInFirestore(school.id, {
            funderId: '' as any,
            funderName: '' as any,
            updatedAt: updatedSchool.updatedAt,
          }).catch(console.error);

          if (targetFunder) {
            const log: ActivityEvent = {
              id: `log-${Date.now()}-${school.id}`,
              schoolId: school.id,
              actorId: userProfile?.uid || 'user-admin',
              actorName: userProfile?.displayName || userProfile?.email || 'PEF Administrator',
              actorRole: 'admin',
              eventType: 'note',
              message: `School unassigned due to deletion of funder entity: ${targetFunder.name}.`,
              timestamp: new Date().toISOString(),
            };
            setActivityLogs((prevLogs) => [log, ...prevLogs]);
            saveActivityLogToFirestore(log).catch(console.error);
          }

          return updatedSchool;
        }
        return school;
      })
    );
  };

  // Handler: Create Admin User
  const handleCreateAdminUser = (admin: Partial<AdminUser>) => {
    const created = admin as AdminUser;
    setAdminUsers((prev) => [created, ...prev]);
    saveAdminUserToFirestore(created).catch(console.error);
  };

  // Handler: Update Admin User
  const handleUpdateAdminUser = (id: string, updates: Partial<AdminUser>) => {
    setAdminUsers((prev) =>
      prev.map((u) => {
        if (u.id === id) {
          const updated = { ...u, ...updates };
          saveAdminUserToFirestore(updated).catch(console.error);
          return updated;
        }
        return u;
      })
    );
  };

  // Handler: Delete Admin User
  const handleDeleteAdminUser = (id: string) => {
    setAdminUsers((prev) => prev.filter((u) => u.id !== id));
    deleteAdminUserFromFirestore(id).catch(console.error);
  };

  // Handlers for Managed Users (Admins, Principals, Authorized Contacts)
  const handleCreateManagedUser = (user: Partial<AppUser>) => {
    const cleanEmail = user.email?.trim().toLowerCase() || '';
    setManagedUsers((prev) => {
      const existingIndex = prev.findIndex(
        (u) => (cleanEmail && u.email?.trim().toLowerCase() === cleanEmail) || (user.id && u.id === user.id)
      );
      if (existingIndex >= 0) {
        const updated: AppUser = {
          ...prev[existingIndex],
          ...user,
          email: user.email?.trim() || prev[existingIndex].email,
          name: user.name?.trim() || prev[existingIndex].name,
          status: user.status || prev[existingIndex].status || 'active',
        };
        saveManagedUserToFirestore(updated).catch(console.error);
        const copy = [...prev];
        copy[existingIndex] = updated;
        return copy;
      }

      const created: AppUser = {
        id: user.id || `USR-${Date.now()}`,
        name: user.name || 'User',
        email: user.email || '',
        phone: user.phone,
        role: user.role || 'principal',
        schoolId: user.schoolId,
        schoolName: user.schoolName,
        jobTitle: user.jobTitle,
        status: user.status || 'active',
        createdAt: user.createdAt || new Date().toISOString(),
        mfaEnabled: user.mfaEnabled || false,
      };

      saveManagedUserToFirestore(created).catch(console.error);
      return [created, ...prev];
    });
  };

  const handleUpdateManagedUser = (id: string, updates: Partial<AppUser>) => {
    setManagedUsers((prev) => {
      const next = prev.map((u) => {
        if (u.id === id || (u.email && updates.email && u.email.toLowerCase() === updates.email.toLowerCase())) {
          const updated = { ...u, ...updates };
          saveManagedUserToFirestore(updated).catch(console.error);

          // Log MFA setup if mfaEnabled changed to true
          if (updates.mfaEnabled === true && !u.mfaEnabled) {
            const log: ActivityEvent = {
              id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
              actorId: userProfile?.uid || updated.id,
              actorName: userProfile?.displayName || updated.name || 'System',
              actorRole: userProfile?.role || updated.role,
              targetUserId: updated.id,
              targetUserEmail: updated.email,
              eventType: 'mfa_setup',
              message: `Multi-Factor Authentication (MFA) was successfully enabled for ${updated.email}.`,
              timestamp: new Date().toISOString(),
            };
            setActivityLogs((logs) => [log, ...logs]);
            saveActivityLogToFirestore(log).catch(console.error);
          } else if (updates.mfaEnabled === false && u.mfaEnabled) {
            const log: ActivityEvent = {
              id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
              actorId: userProfile?.uid || 'admin',
              actorName: userProfile?.displayName || 'PEF Administrator',
              actorRole: userProfile?.role || 'admin',
              targetUserId: updated.id,
              targetUserEmail: updated.email,
              eventType: 'mfa_reset',
              message: `Multi-Factor Authentication (MFA) was reset by administrator for ${updated.email}. User will be required to re-enable 2FA on next login.`,
              timestamp: new Date().toISOString(),
            };
            setActivityLogs((logs) => [log, ...logs]);
            saveActivityLogToFirestore(log).catch(console.error);
          }

          return updated;
        }
        return u;
      });
      setCachedCollection('managedUsers', next);
      return next;
    });
  };

  const handleRevokeManagedUser = (id: string) => {
    const target = managedUsers.find(
      (u) => u.id === id || (u.email && u.email.toLowerCase() === id.toLowerCase())
    );
    const targetEmail = target?.email?.toLowerCase() || (id.includes('@') ? id.toLowerCase() : '');
    const targetId = target?.id || id;

    setManagedUsers((prev) => {
      const exists = prev.some((u) => u.id === targetId || (targetEmail && u.email?.toLowerCase() === targetEmail));
      let next: AppUser[];
      if (exists) {
        next = prev.map((u) =>
          u.id === targetId || (targetEmail && u.email?.toLowerCase() === targetEmail)
            ? { ...u, status: 'revoked' as const }
            : u
        );
      } else {
        next = [
          ...prev,
          {
            id: targetId,
            name: target?.name || targetEmail || 'User',
            email: targetEmail || targetId,
            role: target?.role || 'unassigned',
            status: 'revoked' as const,
            createdAt: new Date().toISOString(),
            mfaEnabled: false,
          },
        ];
      }
      setCachedCollection('managedUsers', next);
      return next;
    });

    if (targetEmail) {
      const matchInv = pendingInvites.find(
        (inv) => inv.email.toLowerCase() === targetEmail.toLowerCase()
      );
      if (matchInv) {
        handleRevokePendingInvite(matchInv.id);
      }
    }
    revokeManagedUserInFirestore(targetId, targetEmail).catch(console.error);
  };

  const handleReactivateManagedUser = (id: string) => {
    const target = managedUsers.find(
      (u) => u.id === id || (u.email && u.email.toLowerCase() === id.toLowerCase())
    );
    const targetEmail = target?.email?.toLowerCase() || (id.includes('@') ? id.toLowerCase() : '');
    const targetId = target?.id || id;

    setManagedUsers((prev) => {
      const exists = prev.some((u) => u.id === targetId || (targetEmail && u.email?.toLowerCase() === targetEmail));
      let next: AppUser[];
      if (exists) {
        next = prev.map((u) =>
          u.id === targetId || (targetEmail && u.email?.toLowerCase() === targetEmail)
            ? { ...u, status: 'active' as const }
            : u
        );
      } else {
        next = [
          ...prev,
          {
            id: targetId,
            name: target?.name || targetEmail || 'User',
            email: targetEmail || targetId,
            role: target?.role || 'unassigned',
            status: 'active' as const,
            createdAt: new Date().toISOString(),
            mfaEnabled: false,
          },
        ];
      }
      setCachedCollection('managedUsers', next);
      return next;
    });
    reactivateManagedUserInFirestore(targetId, targetEmail).catch(console.error);
  };

  const handleDeleteManagedUser = (id: string) => {
    setManagedUsers((prev) => {
      const next = prev.filter((u) => u.id !== id && u.email?.toLowerCase() !== id.toLowerCase());
      setCachedCollection('managedUsers', next);
      return next;
    });
    deleteManagedUserFromFirestore(id).catch(console.error);
  };

  // Handlers for Pending Invites
  const handleCreatePendingInvite = (invite: Partial<PendingInvite>) => {
    const cleanEmail = (invite.email || '').trim();
    if (!cleanEmail) return;

    const created = {
      id: invite.id || `INV-${Date.now()}`,
      email: cleanEmail,
      name: (invite.name || '').replace(/\s*\(Pending\)\s*/gi, '').trim() || 'Principal',
      role: invite.role || 'principal',
      schoolId: invite.schoolId,
      schoolName: invite.schoolName,
      jobTitle: invite.jobTitle || 'Principal',
      invitedBy: invite.invitedBy || userProfile?.displayName || userProfile?.email || 'PEF Administrator',
      invitedAt: invite.invitedAt || new Date().toISOString(),
      expiresAt: invite.expiresAt || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      status: 'pending',
      inviteCode: invite.inviteCode || `INV-${Math.floor(1000 + Math.random() * 9000)}`,
      notes: invite.notes,
    } as PendingInvite;

    setPendingInvites((prev) => {
      const filtered = prev.filter((p) => p.email.toLowerCase() !== cleanEmail.toLowerCase());
      return [created, ...filtered];
    });
    savePendingInviteToFirestore(created).catch(console.error);

    // Also register or update in managedUsers as status: pending
    setManagedUsers((prev) => {
      const existingUser = prev.find((u) => u.email?.toLowerCase() === cleanEmail.toLowerCase());
      if (existingUser) {
        const updated: AppUser = {
          ...existingUser,
          role: created.role,
          schoolId: created.schoolId || existingUser.schoolId,
          schoolName: created.schoolName || existingUser.schoolName,
          jobTitle: created.jobTitle || existingUser.jobTitle,
          name: created.name || existingUser.name,
        };
        saveManagedUserToFirestore(updated).catch(console.error);
        return prev.map((u) => (u.id === existingUser.id ? updated : u));
      } else {
        const newAppUser: AppUser = {
          id: `USR-${Date.now()}`,
          name: created.name || 'Invited User',
          email: cleanEmail,
          role: created.role,
          schoolId: created.schoolId,
          schoolName: created.schoolName,
          jobTitle: created.jobTitle,
          status: 'pending',
          createdAt: new Date().toISOString(),
          mfaEnabled: false,
        };
        saveManagedUserToFirestore(newAppUser).catch(console.error);
        return [newAppUser, ...prev];
      }
    });

    // Dispatch via centralized SendGrid / Firebase Trigger Email service
    try {
      const rendered = renderInviteEmail(settings.emailTemplates || [], {
        recipient_name: created.name || created.email,
        school_name: created.schoolName || 'Partner School',
        amount: (10000).toLocaleString(),
        role: created.role,
        invite_link: `${window.location.origin}/setup-account?email=${encodeURIComponent(created.email)}`,
        custom_note: created.notes,
      });

      dispatchEmail(
        {
          to: created.email,
          recipientName: created.name || created.email,
          subject: rendered.subject,
          body: rendered.body,
          templateKey: 'invite_user',
          schoolId: created.schoolId,
          schoolName: created.schoolName,
          forceDispatch: true,
        },
        settings,
        userProfile?.email
      ).catch(console.error);
    } catch (err) {
      console.error('Failed to trigger invite email:', err);
    }

    const log: ActivityEvent = {
      id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      actorId: userProfile?.uid || 'system',
      actorName: userProfile?.displayName || userProfile?.email || 'System',
      actorRole: userProfile?.role || 'admin',
      targetUserEmail: created.email,
      eventType: 'user_invite_sent',
      message: `Invitation sent to ${created.email} for role ${created.role.replace('_', ' ')}`,
      timestamp: new Date().toISOString(),
    };
    setActivityLogs((prev) => [log, ...prev]);
    saveActivityLogToFirestore(log).catch(console.error);
  };

  const handleResendPendingInvite = (idOrEmail: string) => {
    const cleanKey = (idOrEmail || '').trim().toLowerCase();
    if (!cleanKey) return;

    // 1. Look for existing pending invite by ID or email
    const targetInvite = pendingInvites.find(
      (inv) => inv.id === idOrEmail || (inv.email && inv.email.toLowerCase() === cleanKey)
    );

    // 2. Look for managed user by ID or email
    const targetUser = managedUsers.find(
      (u) => u.id === idOrEmail || (u.email && u.email.toLowerCase() === cleanKey)
    );

    // 3. Look in schools for principal or contact if not found
    const matchedSchool = schools.find(
      (s) =>
        s.principalEmail?.toLowerCase() === cleanKey ||
        (s.additionalContacts || []).some((c) => c.email?.toLowerCase() === cleanKey)
    );

    const targetEmail =
      targetInvite?.email ||
      targetUser?.email ||
      (matchedSchool?.principalEmail?.toLowerCase() === cleanKey
        ? matchedSchool?.principalEmail
        : matchedSchool?.additionalContacts?.find((c) => c.email?.toLowerCase() === cleanKey)?.email) ||
      idOrEmail;

    const targetName =
      targetInvite?.name ||
      targetUser?.name ||
      (matchedSchool?.principalEmail?.toLowerCase() === cleanKey
        ? matchedSchool?.principalName
        : matchedSchool?.additionalContacts?.find((c) => c.email?.toLowerCase() === cleanKey)?.name) ||
      targetEmail;

    const isMatchedContact = Boolean(
      matchedSchool?.additionalContacts?.some((c) => c.email?.toLowerCase() === cleanKey)
    );
    const targetRole: UserRole =
      targetInvite?.role ||
      targetUser?.role ||
      (isMatchedContact ? 'additional_contact' : 'principal');
    const targetSchoolId = targetInvite?.schoolId || targetUser?.schoolId || matchedSchool?.id;
    const targetSchoolName =
      targetInvite?.schoolName || targetUser?.schoolName || matchedSchool?.name || 'Partner School';
    const targetJobTitle =
      targetInvite?.jobTitle ||
      targetUser?.jobTitle ||
      (targetRole === 'admin'
        ? 'PEF Administrator'
        : targetRole === 'additional_contact'
        ? 'Authorized Contact'
        : 'Principal');
    const targetNotes = targetInvite?.notes;

    const updatedInvite: PendingInvite = {
      id: targetInvite?.id || (idOrEmail.startsWith('INV-') ? idOrEmail : `INV-${Date.now()}`),
      email: targetEmail,
      name: targetName,
      role: targetRole,
      schoolId: targetSchoolId,
      schoolName: targetSchoolName,
      jobTitle: targetJobTitle,
      invitedBy: userProfile?.displayName || userProfile?.email || 'PEF Administrator',
      invitedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      status: 'pending',
      notes: targetNotes,
    };

    setPendingInvites((prev) => {
      const exists = prev.some(
        (inv) => inv.id === updatedInvite.id || inv.email?.toLowerCase() === targetEmail.toLowerCase()
      );
      if (exists) {
        return prev.map((inv) =>
          inv.id === updatedInvite.id || inv.email?.toLowerCase() === targetEmail.toLowerCase()
            ? updatedInvite
            : inv
        );
      } else {
        return [updatedInvite, ...prev];
      }
    });
    savePendingInviteToFirestore(updatedInvite).catch(console.error);

    // If managed user exists with pending status, update their createdAt
    if (targetUser && targetUser.status === 'pending') {
      const updatedUser: AppUser = {
        ...targetUser,
        createdAt: new Date().toISOString(),
      };
      setManagedUsers((prev) =>
        prev.map((u) => (u.id === targetUser.id ? updatedUser : u))
      );
      saveManagedUserToFirestore(updatedUser).catch(console.error);
    }

    // Render & dispatch invite email
    try {
      const rendered = renderInviteEmail(settings.emailTemplates || [], {
        recipient_name: targetName || targetEmail,
        school_name: targetSchoolName,
        amount: (10000).toLocaleString(),
        role: targetRole,
        invite_link: `${window.location.origin}/setup-account?email=${encodeURIComponent(targetEmail)}`,
        custom_note: targetNotes,
      });

      dispatchEmail(
        {
          to: targetEmail,
          recipientName: targetName || targetEmail,
          subject: rendered.subject,
          body: rendered.body,
          templateKey: 'invite_user',
          schoolId: targetSchoolId,
          schoolName: targetSchoolName,
          forceDispatch: true,
          isResend: true,
        },
        settings,
        userProfile?.email
      ).catch(console.error);
    } catch (err) {
      console.error('Failed to trigger resend invite email:', err);
    }

    const log: ActivityEvent = {
      id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      actorId: userProfile?.uid || 'system',
      actorName: userProfile?.displayName || userProfile?.email || 'System',
      actorRole: userProfile?.role || 'admin',
      targetUserEmail: targetEmail,
      eventType: 'user_invite_sent',
      message: `Invitation resent to ${targetEmail} (${targetRole.replace('_', ' ')})`,
      timestamp: new Date().toISOString(),
    };
    setActivityLogs((prev) => [log, ...prev]);
    saveActivityLogToFirestore(log).catch(console.error);
  };

  const handleRevokePendingInvite = (id: string) => {
    const invite = pendingInvites.find((inv) => inv.id === id);
    if (invite) {
      const log: ActivityEvent = {
        id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        actorId: userProfile?.uid || 'system',
        actorName: userProfile?.displayName || userProfile?.email || 'System',
        actorRole: userProfile?.role || 'admin',
        targetUserEmail: invite.email,
        eventType: 'note',
        message: `Invitation to ${invite.email} was revoked`,
        timestamp: new Date().toISOString(),
      };
      setActivityLogs((prev) => [log, ...prev]);
      saveActivityLogToFirestore(log).catch(console.error);
    }
    setPendingInvites((prev) => prev.filter((inv) => inv.id !== id));
    deletePendingInviteFromFirestore(id).catch(console.error);
  };

  const handleAcceptPendingInvite = (invite: PendingInvite) => {
    handleCreateManagedUser({
      name: invite.name,
      email: invite.email,
      role: invite.role,
      schoolId: invite.schoolId,
      schoolName: invite.schoolName,
      jobTitle: invite.jobTitle,
      status: 'active',
      invitedAt: invite.invitedAt,
      invitedBy: invite.invitedBy,
    });
    setPendingInvites((prev) => prev.filter((inv) => inv.id !== invite.id));
    deletePendingInviteFromFirestore(invite.id).catch(console.error);

    const log: ActivityEvent = {
      id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      actorId: invite.email, // using email as id before actual user creation is fully resolved
      actorName: invite.name || invite.email,
      actorRole: invite.role,
      targetUserEmail: invite.email,
      eventType: 'user_invite_claimed',
      message: `User ${invite.email} claimed their invitation and registered.`,
      timestamp: new Date().toISOString(),
    };
    setActivityLogs((prev) => [log, ...prev]);
    saveActivityLogToFirestore(log).catch(console.error);
  };

  // Hide sidebar on auth and public verification pages
  const isAuthPage =
    location.pathname === '/login' ||
    location.pathname === '/forgot-password' ||
    location.pathname.startsWith('/setup-account') ||
    location.pathname.startsWith('/finish-account') ||
    location.pathname.startsWith('/register') ||
    location.pathname.startsWith('/invite') ||
    location.pathname.startsWith('/verify-payout') ||
    location.pathname.startsWith('/payout-verify');

  return (
    <div className={`min-h-screen bg-[#F3F6FA] text-slate-900 font-sans selection:bg-[#0089B3] selection:text-white ${!isAuthPage ? 'flex flex-col md:flex-row' : ''}`}>
      {!isAuthPage && <Sidebar schools={schools} settings={settings} />}

      <main className="flex-1 min-w-0">
        {/* Firestore Free Tier Quota Alert Banner */}
        {quotaExceeded && !quotaDismissed && !isAuthPage && (
          <div
            id="firestore-quota-alert-banner"
            className="bg-amber-500/10 border-b border-amber-500/30 px-4 py-3 text-amber-900 flex items-center justify-between gap-4 text-xs shadow-xs"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-700 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="font-semibold text-amber-900 flex items-center gap-2">
                  <span>Firestore Daily Free Read Quota Reached</span>
                  <span className="px-1.5 py-0.5 rounded-full bg-amber-200 text-amber-800 text-[10px] font-bold uppercase tracking-wider">
                    Cached Mode Active
                  </span>
                </div>
                <p className="text-amber-800/90 text-[11px] mt-0.5 leading-normal">
                  The daily free tier read quota for Firebase project{' '}
                  <code className="bg-amber-100/80 px-1 py-0.5 rounded text-amber-900 font-mono text-[10px]">
                    small-moves-portal
                  </code>{' '}
                  is currently exhausted. All portal data (schools, requests, settings) is safely being loaded from local snapshot storage.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <a
                href={FIRESTORE_UPGRADE_URL}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-medium rounded-lg text-xs shadow-xs transition-colors"
              >
                <span>Upgrade / Open Firebase Console</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
              <button
                onClick={() => setQuotaDismissed(true)}
                className="p-1 text-amber-700 hover:text-amber-900 hover:bg-amber-500/10 rounded-lg transition-colors"
                title="Dismiss banner"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        <Routes>
          {/* Public Beneficiary Payout Verification (Unauthenticated) */}
          <Route
            path="/verify-payout"
            element={
              <BeneficiaryPayoutVerificationPage
                requests={requests}
                settings={settings}
                onConfirmPayout={(reqId, updatedDetails) => {
                  setRequests((prev) =>
                    prev.map((r) => {
                      if (r.id === reqId) {
                        return {
                          ...r,
                          payoutDetails: updatedDetails,
                          status: 'ready_to_pay',
                          statusNote: 'Beneficiary confirmed payout details online via secure link. Ready for disbursement.',
                          updatedAt: new Date().toISOString(),
                        };
                      }
                      return r;
                    })
                  );
                }}
                onRequestChanges={(reqId, notes) => {
                  setRequests((prev) =>
                    prev.map((r) => {
                      if (r.id === reqId) {
                        return {
                          ...r,
                          status: 'changes_requested',
                          taskContext: 'payout_change',
                          statusNote: notes
                            ? `Beneficiary requested edits to payment details: "${notes}"`
                            : 'Beneficiary indicated payment information needs edits and requested updates from the school principal.',
                          updatedAt: new Date().toISOString(),
                        };
                      }
                      return r;
                    })
                  );
                }}
              />
            }
          />
          <Route
            path="/verify-payout/:id"
            element={
              <BeneficiaryPayoutVerificationPage
                requests={requests}
                settings={settings}
                onConfirmPayout={(reqId, updatedDetails) => {
                  setRequests((prev) =>
                    prev.map((r) => {
                      if (r.id === reqId) {
                        return {
                          ...r,
                          payoutDetails: updatedDetails,
                          status: 'ready_to_pay',
                          statusNote: 'Beneficiary confirmed payout details online via secure link. Ready for disbursement.',
                          updatedAt: new Date().toISOString(),
                        };
                      }
                      return r;
                    })
                  );
                }}
                onRequestChanges={(reqId, notes) => {
                  setRequests((prev) =>
                    prev.map((r) => {
                      if (r.id === reqId) {
                        return {
                          ...r,
                          status: 'changes_requested',
                          taskContext: 'payout_change',
                          statusNote: notes
                            ? `Beneficiary requested edits to payment details: "${notes}"`
                            : 'Beneficiary indicated payment information needs edits and requested updates from the school principal.',
                          updatedAt: new Date().toISOString(),
                        };
                      }
                      return r;
                    })
                  );
                }}
              />
            }
          />
          <Route
            path="/payout-verify"
            element={
              <BeneficiaryPayoutVerificationPage
                requests={requests}
                settings={settings}
                onConfirmPayout={(reqId, updatedDetails) => {
                  setRequests((prev) =>
                    prev.map((r) => {
                      if (r.id === reqId) {
                        return {
                          ...r,
                          payoutDetails: updatedDetails,
                          status: 'ready_to_pay',
                          statusNote: 'Beneficiary confirmed payout details online via secure link. Ready for disbursement.',
                          updatedAt: new Date().toISOString(),
                        };
                      }
                      return r;
                    })
                  );
                }}
                onRequestChanges={(reqId, notes) => {
                  setRequests((prev) =>
                    prev.map((r) => {
                      if (r.id === reqId) {
                        return {
                          ...r,
                          status: 'changes_requested',
                          taskContext: 'payout_change',
                          statusNote: notes
                            ? `Beneficiary requested edits to payment details: "${notes}"`
                            : 'Beneficiary indicated payment information needs edits and requested updates from the school principal.',
                          updatedAt: new Date().toISOString(),
                        };
                      }
                      return r;
                    })
                  );
                }}
              />
            }
          />

          {/* Auth Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route
            path="/setup-account"
            element={
              <SetupAccount
                pendingInvites={pendingInvites}
                schools={schools}
                settings={settings}
                onUpdateSchool={handleUpdateSchool}
              />
            }
          />
          <Route
            path="/finish-account"
            element={
              <SetupAccount
                pendingInvites={pendingInvites}
                schools={schools}
                settings={settings}
                onUpdateSchool={handleUpdateSchool}
              />
            }
          />
          <Route
            path="/register"
            element={
              <SetupAccount
                pendingInvites={pendingInvites}
                schools={schools}
                settings={settings}
                onUpdateSchool={handleUpdateSchool}
              />
            }
          />
          <Route
            path="/invite/:id"
            element={
              <SetupAccount
                pendingInvites={pendingInvites}
                schools={schools}
                settings={settings}
                onUpdateSchool={handleUpdateSchool}
              />
            }
          />

          {/* Default Redirect */}
          <Route
            path="/"
            element={
              loading ? (
                <div className="min-h-screen bg-slate-900 flex items-center justify-center text-slate-400 text-xs font-medium">
                  Authenticating...
                </div>
              ) : !user || !userProfile ? (
                <Navigate to="/login" replace />
              ) : userProfile.role === 'admin' ? (
                <Navigate to="/admin" replace />
              ) : (
                <Navigate to="/dashboard" replace />
              )
            }
          />
          <Route path="/admin/dashboard" element={<Navigate to="/admin" replace />} />

          {/* School Portal Routes */}
          <Route
            path="/dashboard"
            element={
              <SchoolUserRoute>
                <SchoolDashboard
                  schools={schools}
                  requests={requests}
                  settings={settings}
                  onUpdateSchool={handleUpdateSchool}
                  onCreateInvite={handleCreatePendingInvite}
                  onSignMou={(schoolId, signedByName, mouVersionId, signedByTitle) =>
                    handleUpdateSchool(schoolId, {
                      currentMouSigned: true,
                      currentMouSignedBy: signedByName,
                      currentMouSignedByTitle: signedByTitle || 'Principal',
                      currentMouSignedAt: new Date().toISOString(),
                      currentMouVersionId: mouVersionId,
                      status: 'active',
                    })
                  }
                  onCancelRequest={handleCancelRequest}
                  maxPerRequestAmount={settings.maxPerRequestAmount}
                />
              </SchoolUserRoute>
            }
          />

          <Route
            path="/requests"
            element={
              <SchoolUserRoute>
                <RequestsList
                  schools={schools}
                  requests={requests}
                  settings={settings}
                  onCancelRequest={handleCancelRequest}
                  onEditRequest={(req) => handleUpdateRequest(req.id, {})}
                  onEditPayout={(req) => handleUpdateRequest(req.id, {})}
                />
              </SchoolUserRoute>
            }
          />

          <Route
            path="/requests/new"
            element={
              <SchoolUserRoute>
                <NewRequest
                  schools={schools}
                  requests={requests}
                  onCreateRequest={handleCreateRequest}
                  maxPerRequestAmount={settings.maxPerRequestAmount}
                  settings={settings}
                  onUpdateSchool={handleUpdateSchool}
                />
              </SchoolUserRoute>
            }
          />

          <Route
            path="/requests/:id"
            element={
              <SchoolUserRoute>
                <RequestDetail
                  requests={requests}
                  activityLogs={activityLogs}
                  settings={settings}
                  onUpdateRequest={handleUpdateRequest}
                  onCancelRequest={handleCancelRequest}
                  onAddActivityNote={handleAddActivityNote}
                  maxPerRequestAmount={settings.maxPerRequestAmount}
                />
              </SchoolUserRoute>
            }
          />

          <Route
            path="/requests/:id/payout"
            element={
              <SchoolUserRoute>
                <EnterPayoutDetails
                  requests={requests}
                  onSavePayout={handleSavePayoutDetails}
                  settings={settings}
                  schools={schools}
                />
              </SchoolUserRoute>
            }
          />

          <Route
            path="/help"
            element={
              <HelpCenter
                maxPerRequestAmount={settings.maxPerRequestAmount}
                settings={settings}
                onSaveSettings={(s) => {
                  const updated = { ...settings, ...s };
                  setSettings(updated);
                  saveSettingsToFirestore(updated).catch(console.error);
                }}
              />
            }
          />
          <Route
            path="/profile"
            element={
              <SchoolUserRoute>
                <UserProfilePage
                  schools={schools}
                  settings={settings}
                  maxPerRequestAmount={settings.maxPerRequestAmount}
                  users={managedUsers}
                  pendingInvites={pendingInvites}
                  activityLogs={activityLogs}
                  onUpdateSchool={handleUpdateSchool}
                  onUpdateUser={handleUpdateManagedUser}
                  onRevokeUser={handleRevokeManagedUser}
                  onReactivateUser={handleReactivateManagedUser}
                  onDeleteUser={handleDeleteManagedUser}
                  onResendInvite={handleResendPendingInvite}
                  onRevokeInvite={handleRevokePendingInvite}
                  onCreateInvite={handleCreatePendingInvite}
                />
              </SchoolUserRoute>
            }
          />

          {/* Admin Portal Routes (Restricted strictly to Admins) */}
          <Route
            path="/admin"
            element={
              <AdminOnlyRoute>
                <AdminDashboard
                  requests={requests}
                  schools={schools}
                  users={managedUsers}
                  pendingInvites={pendingInvites}
                  activityLogs={activityLogs}
                  onUpdateRequestStatus={handleUpdateRequestStatus}
                  onUpdateRequest={handleUpdateRequest}
                  onCancelRequest={handleCancelRequest}
                  maxPerRequestAmount={settings.maxPerRequestAmount}
                  settings={settings}
                  onFiscalYearReset={handleFiscalYearBudgetReset}
                />
              </AdminOnlyRoute>
            }
          />

          <Route
            path="/admin/requests"
            element={
              <AdminOnlyRoute>
                <AdminRequestsList
                  requests={requests}
                  onUpdateRequestStatus={handleUpdateRequestStatus}
                  onUpdateRequest={handleUpdateRequest}
                  onCancelRequest={handleCancelRequest}
                  maxPerRequestAmount={settings.maxPerRequestAmount}
                  settings={settings}
                />
              </AdminOnlyRoute>
            }
          />

          <Route
            path="/admin/requests/:id"
            element={
              <AdminOnlyRoute>
                <AdminRequestDetail
                  requests={requests}
                  activityLogs={activityLogs}
                  settings={settings}
                  onUpdateRequestStatus={handleUpdateRequestStatus}
                  onUpdateRequest={handleUpdateRequest}
                  onAddActivityNote={handleAddActivityNote}
                  onCancelRequest={handleCancelRequest}
                  maxPerRequestAmount={settings.maxPerRequestAmount}
                />
              </AdminOnlyRoute>
            }
          />

          <Route
            path="/admin/schools"
            element={
              <AdminOnlyRoute>
                <AdminSchoolsList
                  schools={schools}
                  requests={requests}
                  funders={funders}
                  managedUsers={managedUsers}
                  pendingInvites={pendingInvites}
                  activityLogs={activityLogs}
                  settings={settings}
                  currentAdminEmail={userProfile?.email || user?.email || undefined}
                  onCreateInvite={handleCreatePendingInvite}
                  onDeleteSchool={handleDeleteSchool}
                />
              </AdminOnlyRoute>
            }
          />

          <Route
            path="/admin/schools/new"
            element={
              <AdminOnlyRoute>
                <AdminNewSchool
                  funders={funders}
                  settings={settings}
                  onCreateSchool={handleCreateSchool}
                  onCreateInvite={handleCreatePendingInvite}
                  onCreateFunder={handleCreateFunder}
                />
              </AdminOnlyRoute>
            }
          />

          <Route
            path="/admin/schools/:id"
            element={
              <AdminOnlyRoute>
                <AdminSchoolDetail
                  schools={schools}
                  funders={funders}
                  requests={requests}
                  activityLogs={activityLogs}
                  budgetTransactions={budgetTransactions}
                  settings={settings}
                  managedUsers={managedUsers}
                  pendingInvites={pendingInvites}
                  onUpdateSchool={handleUpdateSchool}
                  onDeleteSchool={handleDeleteSchool}
                  onAddBudgetAdjustment={handleAddBudgetAdjustment}
                  onAddActivityNote={handleAddActivityNote}
                  onCancelRequest={handleCancelRequest}
                  onCreateInvite={handleCreatePendingInvite}
                />
              </AdminOnlyRoute>
            }
          />

          <Route
            path="/admin/funders"
            element={
              <AdminOnlyRoute>
                <AdminFundersList
                  funders={funders}
                  schools={schools}
                  onCreateFunder={handleCreateFunder}
                  onUpdateFunder={handleUpdateFunder}
                  onDeleteFunder={handleDeleteFunder}
                  onAssignSchoolsToFunder={handleAssignSchoolsToFunder}
                  onUnassignSchoolFromFunder={handleUnassignSchoolFromFunder}
                  onUpdateSchool={handleUpdateSchool}
                />
              </AdminOnlyRoute>
            }
          />

          <Route
            path="/admin/users"
            element={
              <AdminOnlyRoute>
                <AdminUserManagement
                  users={managedUsers}
                  pendingInvites={pendingInvites}
                  schools={schools}
                  settings={settings}
                  onCreateUser={handleCreateManagedUser}
                  onUpdateUser={handleUpdateManagedUser}
                  onRevokeUser={handleRevokeManagedUser}
                  onReactivateUser={handleReactivateManagedUser}
                  onDeleteUser={handleDeleteManagedUser}
                  onCreateInvite={handleCreatePendingInvite}
                  onResendInvite={handleResendPendingInvite}
                  onRevokeInvite={handleRevokePendingInvite}
                  onAcceptInvite={handleAcceptPendingInvite}
                />
              </AdminOnlyRoute>
            }
          />

          <Route
            path="/admin/reports"
            element={
              <AdminOnlyRoute>
                <AdminReportsList
                  requests={requests}
                  schools={schools}
                  funders={funders}
                  settings={settings}
                />
              </AdminOnlyRoute>
            }
          />

          <Route
            path="/admin/reports/:reportId"
            element={
              <AdminOnlyRoute>
                <AdminReportDetail
                  requests={requests}
                  schools={schools}
                  funders={funders}
                  budgetTransactions={budgetTransactions}
                  settings={settings}
                />
              </AdminOnlyRoute>
            }
          />

          <Route
            path="/admin/settings"
            element={
              <AdminOnlyRoute>
                <AdminSettings
                  settings={settings}
                  schools={schools}
                  stats={{
                    schoolsCount: schools.length,
                    requestsCount: requests.length,
                    principalsCount: managedUsers.filter((u) => u.role !== 'admin').length,
                    fundersCount: funders.length,
                    invitesCount: pendingInvites.length,
                    logsCount: activityLogs.length,
                  }}
                  currentAdminEmail={userProfile?.email || user?.email || undefined}
                  onFiscalYearReset={handleFiscalYearBudgetReset}
                  onWipeTestData={handleWipeProductionData}
                  onSaveSettings={(s) => {
                    const updated = { ...settings, ...s };
                    setSettings(updated);
                    saveSettingsToFirestore(updated).catch(console.error);
                  }}
                />
              </AdminOnlyRoute>
            }
          />

          <Route
            path="/admin/profile"
            element={
              <AdminOnlyRoute>
                <UserProfilePage
                  schools={schools}
                  settings={settings}
                  maxPerRequestAmount={settings.maxPerRequestAmount}
                  users={managedUsers}
                  pendingInvites={pendingInvites}
                  activityLogs={activityLogs}
                  onUpdateSchool={handleUpdateSchool}
                  onUpdateUser={handleUpdateManagedUser}
                  onRevokeUser={handleRevokeManagedUser}
                  onReactivateUser={handleReactivateManagedUser}
                  onDeleteUser={handleDeleteManagedUser}
                  onResendInvite={handleResendPendingInvite}
                  onRevokeInvite={handleRevokePendingInvite}
                  onCreateInvite={handleCreatePendingInvite}
                />
              </AdminOnlyRoute>
            }
          />

          {/* Legacy route redirects */}
          <Route path="/admin/team" element={<Navigate to="/admin/users" replace />} />
          <Route path="/admin/contacts" element={<Navigate to="/admin/users" replace />} />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <ImpersonationBanner />
      {user &&
        userProfile &&
        !userProfile.mfaEnabled &&
        !isImpersonating &&
        !['/setup-account', '/login', '/forgot-password'].includes(location.pathname) && (
        <MfaSetupModal
          isOpen={true}
          isMandatory={true}
          onClose={() => {}}
          onSuccess={() => {
            updateProfileData({ mfaEnabled: true });
            if (userProfile?.uid) {
              handleUpdateManagedUser(userProfile.uid, { mfaEnabled: true });
            }
          }}
        />
      )}
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppContent />
      </BrowserRouter>
    </AuthProvider>
  );
}
