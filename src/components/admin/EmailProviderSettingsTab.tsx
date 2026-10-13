import React, { useState, useEffect, useRef } from 'react';
import {
  Mail,
  Send,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  Copy,
  ExternalLink,
  RefreshCw,
  Clock,
  ShieldCheck,
  Zap,
  Sliders,
  Trash2,
  Check,
  RotateCw,
  Inbox,
  AlertTriangle,
  PauseCircle,
  PlayCircle,
  Save,
  FileCode,
  X,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Search,
  Filter,
  Info,
  Layers,
  Activity,
  Terminal,
  Server,
  Globe,
  Lock,
  Key,
} from 'lucide-react';
import { PortalSettings, EmailProviderConfig, FirebaseMailDocument } from '../../types';
import { useAuth } from '../../context/AuthContext';
import {
  sendTestEmailToCurrentUser,
  subscribeToMailLogs,
  fetchMailLogs,
  buildHtmlEmail,
  processPendingEmailQueue,
  deduplicatePendingMailQueue,
  sendSinglePendingMail,
  markMailAsDelivered,
  deleteMailDocument,
  clearAllMailDocuments,
  updateQueuedEmailUrls,
  fetchEmailProviderStatus,
  EmailProviderServerStatus,
} from '../../services/emailService';
import { renderEmailTemplate, PRODUCTION_PORTAL_URL } from '../../utils/emailUtils';

interface EmailProviderSettingsTabProps {
  settings: PortalSettings;
  emailProvider: EmailProviderConfig;
  onUpdateProviderConfig: (updates: Partial<EmailProviderConfig>) => void;
  onSaveSettings: () => void;
}

export const EmailProviderSettingsTab: React.FC<EmailProviderSettingsTabProps> = ({
  settings,
  emailProvider,
  onUpdateProviderConfig,
  onSaveSettings,
}) => {
  const { user, userProfile } = useAuth();
  const currentAdminEmail = user?.email || userProfile?.email || 'cshanecolley@gmail.com';
  const currentAdminName = userProfile?.displayName || user?.displayName || 'Shane Colley';

  // Server Secrets Store Status
  const [serverStatus, setServerStatus] = useState<EmailProviderServerStatus>({
    configured: false,
    isEnvSecret: false,
    keyFormatValid: false,
    maskedKey: '',
    provider: 'sendgrid',
  });
  const [isCheckingServerStatus, setIsCheckingServerStatus] = useState(false);

  // Check server secret status
  const checkSecretStatus = async () => {
    setIsCheckingServerStatus(true);
    try {
      const status = await fetchEmailProviderStatus();
      setServerStatus(status);
    } catch (err) {
      console.warn('Failed to check secret status:', err);
    } finally {
      setIsCheckingServerStatus(false);
    }
  };

  useEffect(() => {
    checkSecretStatus();
  }, []);

  // Settings Save State
  const [isSaving, setIsSaving] = useState(false);
  const [saveFeedback, setSaveFeedback] = useState<string | null>(null);

  // Test Email State
  const [testRecipient, setTestRecipient] = useState(currentAdminEmail);
  const [testTemplateId, setTestTemplateId] = useState<string>('test_ping');
  const [testCustomNote, setTestCustomNote] = useState('');
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [testFeedback, setTestFeedback] = useState<{
    status: 'success' | 'error' | 'idle';
    message: string;
    details?: string;
    docId?: string;
    timestamp?: string;
  }>({ status: 'idle', message: '' });

  // Preview Modal State
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewMode, setPreviewMode] = useState<'html' | 'plaintext'>('html');

  // Selected Log Detail Modal
  const [selectedMailLog, setSelectedMailLog] = useState<FirebaseMailDocument | null>(null);
  const [copiedMsgId, setCopiedMsgId] = useState(false);
  const [copiedDocId, setCopiedDocId] = useState(false);
  const [copiedJson, setCopiedJson] = useState(false);
  const [logBodyMode, setLogBodyMode] = useState<'preview' | 'html' | 'plaintext'>('preview');

  // Real-time Dispatched Mails Feed
  const [mailLogs, setMailLogs] = useState<FirebaseMailDocument[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(true);

  // Pagination & Filtering State
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'delivered' | 'error'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Queue Processing State
  const [isProcessingQueue, setIsProcessingQueue] = useState(false);
  const [isFixingUrls, setIsFixingUrls] = useState(false);
  const [queueFeedback, setQueueFeedback] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
  } | null>(null);
  const [showPurgeModal, setShowPurgeModal] = useState(false);
  const [showProcessModal, setShowProcessModal] = useState(false);

  // Manual Refresh Handler
  const handleManualRefresh = async () => {
    setLoadingLogs(true);
    try {
      const logs = await fetchMailLogs(emailProvider.mailCollection || 'mail', 250);
      setMailLogs(logs);
      setQueueFeedback({
        type: 'info',
        message: `Refreshed email logs. Found ${logs.length} records.`,
      });
      setTimeout(() => setQueueFeedback(null), 3000);
    } catch (err: any) {
      console.warn('Error refreshing mail logs:', err);
    } finally {
      setLoadingLogs(false);
    }
  };

  // Auto-sync recipient if current user loads
  useEffect(() => {
    if (currentAdminEmail && (!testRecipient || testRecipient === 'cshanecolley@gmail.com')) {
      setTestRecipient(currentAdminEmail);
    }
  }, [currentAdminEmail]);

  // Subscribe to real-time /mail collection (increased limit to 250 for full pagination support)
  useEffect(() => {
    setLoadingLogs(true);
    const collectionName = emailProvider.mailCollection || 'mail';
    const unsubscribe = subscribeToMailLogs(
      (logs) => {
        setMailLogs(logs);
        setLoadingLogs(false);
      },
      collectionName,
      250
    );
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [emailProvider.mailCollection]);

  // Reset page when filter, search or page size changes
  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, searchQuery, pageSize]);

  // Filter and pagination calculations
  const filteredLogs = mailLogs.filter((mail) => {
    const rawState = (mail.delivery?.state || 'PENDING').toUpperCase();
    const isPending =
      rawState === 'PENDING' ||
      rawState === 'QUEUED' ||
      !mail.delivery?.state;
    const isDelivered = rawState === 'SUCCESS' || rawState === 'DELIVERED';
    const isError = rawState === 'ERROR';

    if (statusFilter === 'pending' && !isPending) return false;
    if (statusFilter === 'delivered' && !isDelivered) return false;
    if (statusFilter === 'error' && !isError) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const recipient = (Array.isArray(mail.to) ? mail.to.join(' ') : mail.to || '').toLowerCase();
      const subject = (mail.message?.subject || '').toLowerCase();
      const event = (mail.metadata?.triggerEvent || '').toLowerCase();
      const errorMsg = (mail.delivery?.error || '').toLowerCase();
      if (!recipient.includes(q) && !subject.includes(q) && !event.includes(q) && !errorMsg.includes(q)) {
        return false;
      }
    }
    return true;
  });

  // Metric counts
  const pendingMails = mailLogs.filter(
    (m) =>
      !m.delivery?.state ||
      m.delivery?.state === 'PENDING' ||
      (m.delivery?.state as string) === 'QUEUED'
  );
  const pendingCount = pendingMails.length;

  const deliveredCount = mailLogs.filter((m) => {
    const s = (m.delivery?.state || '').toUpperCase();
    return s === 'SUCCESS' || s === 'DELIVERED';
  }).length;

  const errorCount = mailLogs.filter(
    (m) => (m.delivery?.state || '').toUpperCase() === 'ERROR'
  ).length;

  // Pagination metrics
  const totalItems = filteredLogs.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);
  const startIndex = (safeCurrentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalItems);
  const paginatedLogs = filteredLogs.slice(startIndex, endIndex);

  // Manual Process Queue Handler
  const handleProcessAllPending = async () => {
    setIsProcessingQueue(true);
    setQueueFeedback(null);
    try {
      const result = await processPendingEmailQueue(
        { ...settings, emailProvider },
        emailProvider.mailCollection || 'mail'
      );
      if (result.totalProcessed === 0) {
        setQueueFeedback({
          type: 'info',
          message: 'No pending messages found in queue to process.',
        });
      } else {
        const parts = [];
        parts.push(`${result.successCount} delivered`);
        if (result.deduplicatedCount > 0) {
          parts.push(`${result.deduplicatedCount} duplicate(s) deduplicated`);
        }
        if (result.errorCount > 0) {
          parts.push(`${result.errorCount} error(s)`);
        }
        setQueueFeedback({
          type: result.errorCount === 0 ? 'success' : 'error',
          message: `Processed ${result.totalProcessed} message(s): ${parts.join(', ')}.`,
        });
      }
    } catch (err: any) {
      setQueueFeedback({
        type: 'error',
        message: err?.message || 'Failed to process pending queue.',
      });
    } finally {
      setIsProcessingQueue(false);
      setTimeout(() => setQueueFeedback(null), 6000);
    }
  };

  // Automated Deduplicate Queue Handler
  const handleDeduplicateQueue = async () => {
    setIsProcessingQueue(true);
    setQueueFeedback(null);
    try {
      const result = await deduplicatePendingMailQueue(
        { ...settings, emailProvider },
        emailProvider.mailCollection || 'mail'
      );
      if (result.deduplicatedCount === 0) {
        setQueueFeedback({
          type: 'info',
          message: `Scanned ${result.totalScanned} pending messages. No redundant duplicates found.`,
        });
      } else {
        setQueueFeedback({
          type: 'success',
          message: `Automated deduplication complete: Suppressed ${result.deduplicatedCount} redundant duplicate email(s) in pending queue.`,
        });
      }
    } catch (err: any) {
      setQueueFeedback({
        type: 'error',
        message: err?.message || 'Failed to deduplicate pending queue.',
      });
    } finally {
      setIsProcessingQueue(false);
      setTimeout(() => setQueueFeedback(null), 5000);
    }
  };

  // Dispatch single pending email immediately
  const handleSendSinglePending = async (mail: FirebaseMailDocument) => {
    if (!mail.id) return;
    setIsProcessingQueue(true);
    try {
      const res = await sendSinglePendingMail(
        mail.id,
        mail,
        { ...settings, emailProvider },
        emailProvider.mailCollection || 'mail'
      );
      if (res.success) {
        setQueueFeedback({
          type: 'success',
          message: `Dispatched queued email to ${Array.isArray(mail.to) ? mail.to[0] : mail.to} successfully.`,
        });
      } else {
        setQueueFeedback({
          type: 'error',
          message: res.error || 'Failed to dispatch queued email.',
        });
      }
    } catch (err: any) {
      setQueueFeedback({
        type: 'error',
        message: err?.message || 'Failed to dispatch queued email.',
      });
    } finally {
      setIsProcessingQueue(false);
      setTimeout(() => setQueueFeedback(null), 5000);
    }
  };

  // Save Settings to Firestore
  const handleSaveConfig = () => {
    setIsSaving(true);
    onSaveSettings();
    setSaveFeedback('Email settings saved successfully to Firestore!');
    setTimeout(() => {
      setIsSaving(false);
      setSaveFeedback(null);
    }, 3000);
  };

  // Mark single mail as delivered
  const handleMarkAsDelivered = async (mail: FirebaseMailDocument) => {
    if (!mail.id) return;
    const ok = await markMailAsDelivered(mail.id, mail, emailProvider.mailCollection || 'mail');
    if (ok) {
      setQueueFeedback({
        type: 'success',
        message: `Message to ${Array.isArray(mail.to) ? mail.to[0] : mail.to} marked as delivered.`,
      });
      setTimeout(() => setQueueFeedback(null), 4000);
    }
  };

  // Delete single mail from queue
  const handleDeleteMail = async (mailId: string) => {
    if (!mailId) return;
    const ok = await deleteMailDocument(mailId, emailProvider.mailCollection || 'mail');
    if (ok) {
      setQueueFeedback({
        type: 'info',
        message: 'Message removed from queue.',
      });
      setTimeout(() => setQueueFeedback(null), 3000);
    }
  };

  // Purge all logs
  const handlePurgeAllLogs = async () => {
    const ids = mailLogs.map((m) => m.id).filter(Boolean) as string[];
    setShowPurgeModal(false);
    if (ids.length === 0) return;
    setIsProcessingQueue(true);
    try {
      const count = await clearAllMailDocuments(ids, emailProvider.mailCollection || 'mail');
      setQueueFeedback({
        type: 'success',
        message: `Purged ${count} message log(s) from Firestore.`,
      });
    } catch (err: any) {
      setQueueFeedback({
        type: 'error',
        message: err?.message || 'Failed to purge logs.',
      });
    } finally {
      setIsProcessingQueue(false);
      setTimeout(() => setQueueFeedback(null), 4000);
    }
  };

  // Fix / standardise queued email URLs to smallmoves.org
  const handleFixQueuedUrls = async () => {
    setIsFixingUrls(true);
    try {
      const res = await updateQueuedEmailUrls(emailProvider.mailCollection || 'mail');
      if (res.updatedCount > 0) {
        setQueueFeedback({
          type: 'success',
          message: `Successfully updated ${res.updatedCount} queued email(s) to use ${PRODUCTION_PORTAL_URL} (scanned ${res.totalScanned}).`,
        });
      } else {
        setQueueFeedback({
          type: 'info',
          message: `All ${res.totalScanned} queued emails already use ${PRODUCTION_PORTAL_URL}. No URL updates needed.`,
        });
      }
    } catch (err: any) {
      setQueueFeedback({
        type: 'error',
        message: err?.message || 'Failed to update queued email URLs.',
      });
    } finally {
      setIsFixingUrls(false);
      setTimeout(() => setQueueFeedback(null), 6000);
    }
  };

  const isKeyFormatValid = serverStatus.configured;

  const handleSendTestEmail = async () => {
    if (!testRecipient || !testRecipient.includes('@')) {
      setTestFeedback({
        status: 'error',
        message: 'Please provide a valid recipient email address.',
      });
      return;
    }

    setIsSendingTest(true);
    setTestFeedback({ status: 'idle', message: '' });

    try {
      const result = await sendTestEmailToCurrentUser(
        testRecipient.trim(),
        currentAdminName,
        testTemplateId,
        settings,
        testCustomNote.trim(),
        emailProvider
      );

      if (result.success) {
        setTestFeedback({
          status: 'success',
          message: `Test email successfully dispatched and recorded in /${emailProvider.mailCollection || 'mail'}!`,
          details: `Target: ${result.recipient} | Method: ${result.method.toUpperCase()} | Message ID: ${result.messageId || 'N/A'}`,
          docId: result.docId,
          timestamp: new Date().toLocaleTimeString(),
        });

        onUpdateProviderConfig({
          lastTestedAt: new Date().toISOString(),
          lastTestStatus: 'success',
          lastTestRecipient: testRecipient,
          lastTestMessageId: result.messageId,
          lastTestError: undefined,
        });
      } else {
        setTestFeedback({
          status: 'error',
          message: result.error || 'Failed to dispatch test email.',
          details: result.docId ? `Document reference: ${result.docId}` : undefined,
          docId: result.docId,
          timestamp: new Date().toLocaleTimeString(),
        });

        onUpdateProviderConfig({
          lastTestedAt: new Date().toISOString(),
          lastTestStatus: 'failed',
          lastTestRecipient: testRecipient,
          lastTestError: result.error,
        });
      }
    } catch (err: any) {
      setTestFeedback({
        status: 'error',
        message: err?.message || 'Unexpected error during email dispatch.',
        timestamp: new Date().toLocaleTimeString(),
      });
    } finally {
      setIsSendingTest(false);
    }
  };

  // Compute live rendered preview for test template
  const getRenderedPreview = () => {
    const templates = settings.emailTemplates || [];
    let subject = 'Twilio SendGrid & Firebase Email Integration Test';
    let body = `Hello ${currentAdminName},\n\nThis is a live test email verifying that your Twilio SendGrid email provider and Firebase Trigger Email component are properly connected and operational.\n\nConfiguration Details:\n- Provider: Twilio SendGrid\n- Component: Firebase Trigger Email (/mail collection)\n- Verified Sender: ${emailProvider.fromEmail || 'support@smallmoves.org'}\n- Dispatched At: ${new Date().toLocaleString()}\n\nIf you received this message, your email dispatch pipeline is fully operational.\n\nWarm regards,\nSmall Moves Administration`;

    if (testTemplateId && testTemplateId !== 'test_ping') {
      const selectedTemplate = templates.find((t) => t.id === testTemplateId);
      if (selectedTemplate) {
        const origin = typeof window !== 'undefined' && window.location?.origin ? window.location.origin : 'https://smallmoves.org';
        const isAdminTemplate =
          selectedTemplate.recipientRole.toLowerCase().includes('admin') ||
          selectedTemplate.recipientRole.toLowerCase().includes('finance') ||
          selectedTemplate.recipientRole.toLowerCase().includes('ops') ||
          selectedTemplate.recipientRole.toLowerCase().includes('leadership') ||
          selectedTemplate.triggerEvent.includes('admin') ||
          selectedTemplate.triggerEvent.includes('finance') ||
          selectedTemplate.triggerEvent.includes('ready_to_pay');

        const isBeneficiaryTemplate =
          selectedTemplate.recipientRole.toLowerCase().includes('beneficiary') ||
          selectedTemplate.triggerEvent.includes('waiting_on_beneficiary') ||
          selectedTemplate.id === 'tpl-03';

        const testAdminLink = `${origin}/admin/requests/REQ-2026-TEST-999`;
        const testSchoolLink = `${origin}/requests/REQ-2026-TEST-999`;
        const testVerificationLink = `${origin}/verify-payout?id=REQ-2026-TEST-999`;

        const contextualTestLink = isAdminTemplate
          ? testAdminLink
          : isBeneficiaryTemplate
          ? testVerificationLink
          : testSchoolLink;

        const rendered = renderEmailTemplate(
          { subject: selectedTemplate.subject, body: selectedTemplate.body },
          {
            request_id: 'REQ-2026-TEST-999',
            request_link: contextualTestLink,
            request_url: contextualTestLink,
            link: contextualTestLink,
            open_request_link: contextualTestLink,
            admin_request_link: testAdminLink,
            school_request_link: testSchoolLink,
            verification_link: testVerificationLink,
            payout_link: testVerificationLink,
            confirm_link: testVerificationLink,
            submitter_name: currentAdminName,
            submitter_email: testRecipient,
            beneficiary_name: 'Jordan Miller (Family Support)',
            student_name: 'Jordan Miller',
            school_name: 'Lincoln Elementary School',
            amount: '1,250',
            category: 'Housing / Eviction Prevention',
            status_note: testCustomNote || 'SendGrid test dispatch verification note.',
            payout_method_name: 'Direct Electronic Transfer / Zelle',
            recipient_name: currentAdminName,
            recipient_email: testRecipient,
            invite_link: `${origin}/setup-account?token=sample-invite-token-abc123`,
            custom_note: testCustomNote ? `Test note: "${testCustomNote}"` : '',
          }
        );
        subject = `[TEST] ${rendered.subject}`;
        body = rendered.body;
      }
    }

    const html = buildHtmlEmail(subject, body, settings);
    return { subject, body, html };
  };

  const previewContent = getRenderedPreview();

  return (
    <div className="space-y-6 text-xs text-slate-800">
      {/* Streamlined Header Banner */}
      <div className="bg-slate-900 rounded-2xl p-5 text-white border border-slate-800 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h3 className="text-base font-black tracking-tight text-white">
                Twilio SendGrid Email Provider
              </h3>
              <span
                className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                  emailProvider.enabled
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : 'bg-slate-800 text-slate-400 border border-slate-700'
                }`}
              >
                {emailProvider.enabled ? 'Active Pipeline' : 'Disabled'}
              </span>
              {emailProvider.pauseOutboundEmails ? (
                <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1">
                  <PauseCircle className="w-3 h-3" /> Communications Paused
                </span>
              ) : (
                <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                  <PlayCircle className="w-3 h-3" /> Live Dispatch Active
                </span>
              )}
              {pendingCount > 0 && (
                <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
                  {pendingCount} Queued
                </span>
              )}
            </div>
            <p className="text-slate-300 text-xs leading-relaxed max-w-2xl">
              Dispatches transactional notices, principal invitations, and grant approvals through Twilio SendGrid with real-time queue synchronization in Firestore.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <label className="flex items-center gap-2 cursor-pointer bg-slate-800 hover:bg-slate-700/80 border border-slate-700 px-3 py-2 rounded-xl transition-all">
              <input
                type="checkbox"
                checked={emailProvider.enabled}
                onChange={(e) => onUpdateProviderConfig({ enabled: e.target.checked })}
                className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500 accent-emerald-500 cursor-pointer"
              />
              <span className="font-bold text-xs text-white">Enable Email Delivery</span>
            </label>
          </div>
        </div>
      </div>

      {/* Prominent Banner when Email Communications are Paused */}
      {emailProvider.pauseOutboundEmails && (
        <div className="p-4 bg-amber-50 border-2 border-amber-300 rounded-2xl text-amber-950 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xs">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-amber-500 text-white rounded-xl shrink-0 mt-0.5">
              <PauseCircle className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="font-extrabold text-sm text-amber-950">
                  Outbound Email Communications Are Paused
                </h4>
                <span className="bg-amber-200 text-amber-900 text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider border border-amber-300">
                  Queueing Only
                </span>
              </div>
              <p className="text-xs text-amber-800 mt-1 leading-relaxed">
                All outgoing notifications and invitations are queued in Firestore with a <strong>PENDING</strong> status and are <strong>not sent</strong> until released.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              disabled={isProcessingQueue}
              onClick={handleProcessAllPending}
              className="px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white font-extrabold rounded-xl text-xs transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              {isProcessingQueue ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <RotateCw className="w-3.5 h-3.5" />
              )}
              <span>Process All Pending ({pendingCount})</span>
            </button>
            <button
              type="button"
              onClick={() => {
                onUpdateProviderConfig({ pauseOutboundEmails: false });
                handleSaveConfig();
              }}
              className="px-3 py-2 bg-white hover:bg-amber-100 text-amber-900 border border-amber-300 font-bold rounded-xl text-xs transition-colors cursor-pointer"
            >
              Resume Live Sending
            </button>
          </div>
        </div>
      )}

      {/* Main Grid: SendGrid Configuration & Test Dispatcher */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: SendGrid Credentials & Delivery Options (7 cols) */}
        <div className="lg:col-span-7 space-y-5">
          {/* SendGrid Credentials & Secrets Status Card */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <h4 className="font-extrabold text-slate-900 text-sm">Twilio SendGrid API Credentials</h4>
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={checkSecretStatus}
                  disabled={isCheckingServerStatus}
                  className="text-[11px] font-bold text-slate-600 hover:text-slate-900 flex items-center gap-1 cursor-pointer"
                  title="Verify secrets status with backend"
                >
                  <RefreshCw className={`w-3 h-3 ${isCheckingServerStatus ? 'animate-spin' : ''}`} />
                  <span>{isCheckingServerStatus ? 'Checking...' : 'Refresh Status'}</span>
                </button>
                <a
                  href="https://app.sendgrid.com/settings/api_keys"
                  target="_blank"
                  rel="noreferrer"
                  className="text-[11px] font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
                >
                  SendGrid Dashboard <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>

            {/* Secret Store Configuration Status */}
            <div className="p-4 rounded-xl border transition-all bg-slate-50 border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Lock className="w-4 h-4 text-slate-700" />
                  <span className="font-bold text-xs text-slate-900">Environment Secret Store</span>
                  <code className="text-[11px] font-mono font-bold bg-slate-200/80 text-slate-800 px-1.5 py-0.5 rounded">
                    SENDGRID_API_KEY
                  </code>
                </div>
                {serverStatus.configured ? (
                  <span className="flex items-center gap-1 text-[11px] font-extrabold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    Active &amp; Ready
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-[11px] font-extrabold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                    Awaiting Secret
                  </span>
                )}
              </div>

              <div className="text-xs text-slate-600 space-y-1">
                <p className="leading-relaxed">
                  SendGrid API credentials are now strictly managed through the secure server environment secret store (<code className="font-mono text-[11px] text-emerald-800 font-bold">SENDGRID_API_KEY</code>) and are never exposed to or stored in client-side code.
                </p>
                {serverStatus.configured ? (
                  <div className="pt-2 flex items-center gap-2 text-[11px] font-mono text-emerald-900 bg-emerald-50 p-2.5 rounded-lg border border-emerald-200">
                    <Key className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>Key Signature: <strong>{serverStatus.maskedKey || 'SG.••••••••••••'}</strong></span>
                    <span className="text-[10px] text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded ml-auto">Valid SG format</span>
                  </div>
                ) : (
                  <div className="pt-2 text-[11px] text-amber-800 bg-amber-50 p-2.5 rounded-lg border border-amber-200 flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <span>Secret not yet detected on server. Configure <strong>SENDGRID_API_KEY</strong> in the project secrets / environment.</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Sender Email & Name */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Verified Sender Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  value={emailProvider.fromEmail || ''}
                  onChange={(e) => onUpdateProviderConfig({ fromEmail: e.target.value.trim() })}
                  placeholder="support@smallmoves.org"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-900 focus:bg-white focus:outline-hidden focus:border-emerald-500"
                />
                <p className="text-[10px] text-slate-400 mt-0.5">Must be single sender verified or domain-authenticated in SendGrid</p>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Sender Display Name
                </label>
                <input
                  type="text"
                  value={emailProvider.fromName || ''}
                  onChange={(e) => onUpdateProviderConfig({ fromName: e.target.value })}
                  placeholder="Small Moves PEF Team"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-900 focus:bg-white focus:outline-hidden focus:border-emerald-500"
                />
                <p className="text-[10px] text-slate-400 mt-0.5">Visible display name in recipient inbox</p>
              </div>
            </div>

            {/* Reply-To Email */}
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Reply-To Email Address
              </label>
              <input
                type="email"
                value={emailProvider.replyToEmail || ''}
                onChange={(e) => onUpdateProviderConfig({ replyToEmail: e.target.value.trim() })}
                placeholder="support@smallmoves.org"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-900 focus:bg-white focus:outline-hidden focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Delivery & Pause Options Card */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <Sliders className="w-4 h-4 text-emerald-600" />
              <h4 className="font-extrabold text-slate-900 text-sm">Delivery & Queue Options</h4>
            </div>

            <div className="space-y-3">
              {/* Pause Toggle */}
              <label className="flex items-start gap-3 cursor-pointer p-3 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-100/50 transition-colors">
                <input
                  type="checkbox"
                  checked={!!emailProvider.pauseOutboundEmails}
                  onChange={(e) => onUpdateProviderConfig({ pauseOutboundEmails: e.target.checked })}
                  className="w-4 h-4 text-amber-600 rounded focus:ring-amber-500 accent-amber-500 cursor-pointer mt-0.5"
                />
                <div>
                  <span className="font-bold text-slate-900 block text-xs">
                    Pause Outbound Communications
                  </span>
                  <span className="text-[11px] text-slate-500 block mt-0.5 leading-relaxed">
                    Queue outgoing emails in Firestore without sending immediately.
                  </span>
                </div>
              </label>

              {/* Sandbox Mode Toggle */}
              <label className="flex items-start gap-3 cursor-pointer p-3 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-100/50 transition-colors">
                <input
                  type="checkbox"
                  checked={!!emailProvider.sandboxMode}
                  onChange={(e) => onUpdateProviderConfig({ sandboxMode: e.target.checked })}
                  className="w-4 h-4 text-amber-600 rounded focus:ring-amber-500 accent-amber-500 cursor-pointer mt-0.5"
                />
                <div>
                  <span className="font-bold text-slate-900 block text-xs">
                    SendGrid Sandbox Mode
                  </span>
                  <span className="text-[11px] text-slate-500 block mt-0.5 leading-relaxed">
                    Validates payload format with SendGrid without sending live emails to inboxes.
                  </span>
                </div>
              </label>
            </div>

            {/* Save Settings Action */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-3">
              <div>
                {saveFeedback && (
                  <span className="text-[11px] text-emerald-700 font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> {saveFeedback}
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={handleSaveConfig}
                disabled={isSaving}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-xl text-xs transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs shrink-0"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{isSaving ? 'Saving...' : 'Save Email Settings'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Live Test Email Dispatcher (5 cols) */}
        <div className="lg:col-span-5 space-y-5">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-emerald-100 text-emerald-700 rounded-lg">
                  <Send className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-extrabold text-slate-900 text-sm">Send Test Email</h4>
                  <p className="text-[10px] text-slate-500">Dispatch live test to verify configuration</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowPreviewModal(!showPreviewModal)}
                className="text-[11px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
              >
                <Eye className="w-3 h-3" /> Preview
              </button>
            </div>

            {/* Recipient Input */}
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Recipient Email Address
              </label>
              <div className="relative">
                <input
                  type="email"
                  value={testRecipient}
                  onChange={(e) => setTestRecipient(e.target.value)}
                  placeholder="admin@smallmoves.org"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-900 focus:bg-white focus:outline-hidden focus:border-emerald-500"
                />
                {testRecipient === currentAdminEmail && (
                  <span className="absolute right-2.5 top-2 text-[9px] font-extrabold bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded">
                    YOU
                  </span>
                )}
              </div>
              <p className="text-[10px] text-slate-400 mt-0.5">
                Defaults to your administrator account ({currentAdminEmail})
              </p>
            </div>

            {/* Template Selection */}
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Select Notification Template
              </label>
              <select
                value={testTemplateId}
                onChange={(e) => setTestTemplateId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-900 focus:bg-white focus:outline-hidden focus:border-emerald-500"
              >
                <option value="test_ping">⚡ SendGrid Integration Test Ping</option>
                <optgroup label="System Email Templates">
                  {(settings.emailTemplates || []).map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.recipientRole})
                    </option>
                  ))}
                </optgroup>
              </select>
            </div>

            {/* Custom Note input for test */}
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Custom Context / Note (Optional)
              </label>
              <input
                type="text"
                value={testCustomNote}
                onChange={(e) => setTestCustomNote(e.target.value)}
                placeholder="e.g. Verifying SendGrid delivery..."
                className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-xs focus:bg-white focus:outline-hidden"
              />
            </div>

            {/* Dispatch Action Button */}
            <div className="pt-2">
              <button
                type="button"
                disabled={isSendingTest || !testRecipient}
                onClick={handleSendTestEmail}
                className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white font-extrabold rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                {isSendingTest ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Dispatching via SendGrid...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Dispatch Test Email</span>
                  </>
                )}
              </button>
            </div>

            {/* Feedback Alert Card */}
            {testFeedback.status !== 'idle' && (
              <div
                className={`p-3.5 rounded-xl border space-y-1.5 animate-fadeIn ${
                  testFeedback.status === 'success'
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                    : 'bg-red-50 border-red-200 text-red-900'
                }`}
              >
                <div className="flex items-center gap-2 font-bold text-xs">
                  {testFeedback.status === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                  )}
                  <span>{testFeedback.message}</span>
                </div>
                {testFeedback.details && (
                  <p className="text-[11px] font-mono opacity-80 pl-6 break-all">
                    {testFeedback.details}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Dispatched Mail Activity Feed (Firestore /mail Collection Real-Time Monitor) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {/* Header with Queue Controls */}
        <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-slate-50/70">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-100 text-emerald-700 rounded-xl">
              <Inbox className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="font-extrabold text-slate-900 text-sm">
                  Email Queue & Dispatch Activity
                </h4>
                <span className="text-[10px] font-bold text-slate-500 bg-white border border-slate-200 px-2 py-0.5 rounded-md">
                  {mailLogs.length} Total Logs
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Real-time monitor of transactional notifications, principal invitations, and delivery status
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Fix / Sanitize URLs Button */}
            <button
              type="button"
              disabled={isFixingUrls || isProcessingQueue}
              onClick={handleFixQueuedUrls}
              className="px-3 py-1.5 bg-white hover:bg-sky-50 text-sky-700 border border-sky-200 rounded-xl font-bold text-[11px] transition-colors flex items-center gap-1.5 shadow-2xs cursor-pointer"
              title="Ensure all queued email links point to https://smallmoves.org"
            >
              {isFixingUrls ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-sky-600" />
                  <span>Updating URLs...</span>
                </>
              ) : (
                <>
                  <ExternalLink className="w-3.5 h-3.5 text-sky-600" />
                  <span>Sanitize URLs to smallmoves.org</span>
                </>
              )}
            </button>

            {/* Refresh Logs Button */}
            <button
              type="button"
              disabled={loadingLogs}
              onClick={handleManualRefresh}
              className="px-2.5 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl font-bold text-[11px] transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
              title="Refresh logs from Firestore"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${loadingLogs ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>

            {/* Deduplicate Queue Button */}
            {pendingCount > 1 && (
              <button
                type="button"
                disabled={isProcessingQueue}
                onClick={handleDeduplicateQueue}
                className="px-3 py-1.5 bg-white hover:bg-amber-50 text-amber-700 border border-amber-200 rounded-xl font-bold text-[11px] transition-colors flex items-center gap-1.5 shadow-2xs cursor-pointer"
                title="Identify and suppress redundant duplicate emails in the pending queue"
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-amber-600" />
                <span>Deduplicate Queue</span>
              </button>
            )}

            {/* Process Pending Button */}
            <button
              type="button"
              disabled={isProcessingQueue || pendingCount === 0}
              onClick={() => setShowProcessModal(true)}
              className={`px-3 py-1.5 rounded-xl font-extrabold text-[11px] flex items-center gap-1.5 shadow-xs transition-all cursor-pointer ${
                pendingCount > 0
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                  : 'bg-white text-slate-400 border border-slate-200 opacity-60 cursor-not-allowed'
              }`}
            >
              {isProcessingQueue ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <RotateCw className="w-3.5 h-3.5" />
                  <span>Process Pending ({pendingCount})</span>
                </>
              )}
            </button>

            {/* Purge / Clear Logs */}
            {mailLogs.length > 0 && (
              <button
                type="button"
                disabled={isProcessingQueue}
                onClick={() => setShowPurgeModal(true)}
                className="px-2.5 py-1.5 bg-white hover:bg-red-50 text-red-600 border border-slate-200 hover:border-red-200 rounded-xl font-bold text-[11px] transition-colors flex items-center gap-1 cursor-pointer"
                title="Clear all logs"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear Logs</span>
              </button>
            )}
          </div>
        </div>

        {/* Feedback Alert for Queue Operations */}
        {queueFeedback && (
          <div
            className={`px-4 py-2.5 text-xs font-bold flex items-center justify-between border-b ${
              queueFeedback.type === 'success'
                ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
                : queueFeedback.type === 'error'
                ? 'bg-red-50 text-red-900 border-red-200'
                : 'bg-blue-50 text-blue-900 border-blue-200'
            }`}
          >
            <div className="flex items-center gap-2">
              {queueFeedback.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : queueFeedback.type === 'error' ? (
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              ) : (
                <Zap className="w-4 h-4 text-blue-600 shrink-0" />
              )}
              <span>{queueFeedback.message}</span>
            </div>
            <button
              type="button"
              onClick={() => setQueueFeedback(null)}
              className="text-slate-400 hover:text-slate-700 text-sm font-bold"
            >
              &times;
            </button>
          </div>
        )}

        {/* Filter and Search Bar */}
        {mailLogs.length > 0 && (
          <div className="p-3 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            {/* Filter Tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
              <button
                type="button"
                onClick={() => setStatusFilter('all')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors shrink-0 flex items-center gap-1.5 cursor-pointer ${
                  statusFilter === 'all'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200 hover:bg-slate-100'
                }`}
              >
                <span>All</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                    statusFilter === 'all' ? 'bg-slate-800 text-slate-200' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {mailLogs.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setStatusFilter('delivered')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors shrink-0 flex items-center gap-1.5 cursor-pointer ${
                  statusFilter === 'delivered'
                    ? 'bg-emerald-700 text-white shadow-xs'
                    : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200 hover:bg-emerald-50'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                <span>Delivered</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                    statusFilter === 'delivered' ? 'bg-emerald-800 text-emerald-100' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {deliveredCount}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setStatusFilter('pending')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors shrink-0 flex items-center gap-1.5 cursor-pointer ${
                  statusFilter === 'pending'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200 hover:bg-amber-50'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                <span>Pending</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                    statusFilter === 'pending' ? 'bg-amber-700 text-amber-100' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {pendingCount}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setStatusFilter('error')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors shrink-0 flex items-center gap-1.5 cursor-pointer ${
                  statusFilter === 'error'
                    ? 'bg-red-600 text-white shadow-xs'
                    : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200 hover:bg-red-50'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-red-500"></span>
                <span>Errors</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                    statusFilter === 'error' ? 'bg-red-700 text-red-100' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {errorCount}
                </span>
              </button>
            </div>

            {/* Search Input */}
            <div className="relative min-w-[200px] sm:w-64">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search recipient, subject..."
                className="w-full pl-8.5 pr-7 py-1.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 focus:outline-hidden focus:border-emerald-500 shadow-2xs"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Pending Messages Warning Banner */}
        {pendingCount > 0 && (
          <div className="p-3.5 bg-amber-50 border-b border-amber-200 text-amber-900 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <div>
                <span className="font-extrabold">{pendingCount} email(s) waiting in queue.</span>
                <span className="text-amber-700 ml-1">
                  {emailProvider.pauseOutboundEmails
                    ? 'Outbound email communications are paused. Click "Process All Pending" to flush the queue when ready.'
                    : 'Click "Process Pending" or "Send Now" on individual messages.'}
                </span>
              </div>
            </div>
            <button
              type="button"
              disabled={isProcessingQueue}
              onClick={() => setShowProcessModal(true)}
              className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-extrabold rounded-lg text-xs transition-colors shrink-0 flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Zap className="w-3.5 h-3.5" /> Process Pending Now ({pendingCount})
            </button>
          </div>
        )}

        {loadingLogs ? (
          <div className="p-8 text-center text-slate-400 flex items-center justify-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin" />
            <span>Loading email records...</span>
          </div>
        ) : mailLogs.length === 0 ? (
          <div className="p-8 text-center text-slate-400 space-y-2">
            <Inbox className="w-8 h-8 mx-auto text-slate-300" />
            <p className="font-bold text-slate-600 text-xs">No emails dispatched yet</p>
            <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
              Use the "Send Test Email" card above or trigger a portal notification to verify the dispatch pipeline.
            </p>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="p-8 text-center text-slate-400 space-y-3">
            <Inbox className="w-8 h-8 mx-auto text-slate-300" />
            <p className="font-bold text-slate-700 text-xs">No emails match your filter</p>
            <p className="text-[11px] text-slate-500">
              No results found for &ldquo;{searchQuery || statusFilter}&rdquo;
            </p>
            <button
              type="button"
              onClick={() => {
                setStatusFilter('all');
                setSearchQuery('');
              }}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-colors cursor-pointer"
            >
              Clear Filters
            </button>
          </div>
        ) : (
          <div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-[11px]">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/80 text-slate-500 font-bold uppercase tracking-wider text-[9px]">
                    <th className="py-2.5 px-4">Recipient</th>
                    <th className="py-2.5 px-4">Subject</th>
                    <th className="py-2.5 px-4">Trigger Event</th>
                    <th className="py-2.5 px-4">Timestamp</th>
                    <th className="py-2.5 px-4 text-center">Delivery Status</th>
                    <th className="py-2.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginatedLogs.map((mail) => {
                    const recipients = Array.isArray(mail.to) ? mail.to.join(', ') : mail.to;
                    const timeDisplay = mail.metadata?.dispatchedAt
                      ? new Date(mail.metadata.dispatchedAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })
                      : mail.createdAt
                      ? new Date(mail.createdAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })
                      : 'Just now';

                    const rawState = (mail.delivery?.state || 'PENDING').toUpperCase();
                    const msgId = mail.delivery?.info?.sendgridMessageId || mail.delivery?.info?.messageId || '';
                    const method = mail.delivery?.method || (msgId.startsWith('sim-') ? 'simulation' : (msgId.startsWith('manual-') ? 'manual' : (mail.sendgridOptions?.sandboxMode ? 'sandbox' : 'sendgrid_api')));
                    const isSimulated = rawState === 'SIMULATED' || method === 'simulation' || msgId.startsWith('sim-');
                    const isSandbox = method === 'sandbox' || !!mail.sendgridOptions?.sandboxMode;
                    const isPending =
                      rawState === 'PENDING' ||
                      rawState === 'QUEUED' ||
                      !mail.delivery?.state;
                    const isSuccess =
                      (rawState === 'SUCCESS' || rawState === 'DELIVERED') && !isSimulated && !isSandbox;
                    const isError = rawState === 'ERROR';

                    return (
                      <tr key={mail.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-2.5 px-4 font-bold text-slate-900 max-w-[180px] truncate">
                          <div className="flex items-center gap-1.5">
                            <Mail className="w-3 h-3 text-slate-400 shrink-0" />
                            <span className="truncate">{recipients}</span>
                          </div>
                        </td>
                        <td className="py-2.5 px-4 text-slate-700 font-medium max-w-[240px] truncate">
                          {mail.message?.subject || '(No Subject)'}
                        </td>
                        <td className="py-2.5 px-4">
                          <span className="bg-slate-100 text-slate-700 font-mono text-[10px] px-1.5 py-0.5 rounded">
                            {mail.metadata?.triggerEvent || 'transactional'}
                          </span>
                          {mail.metadata?.isTest && (
                            <span className="ml-1 bg-amber-100 text-amber-800 text-[9px] font-bold px-1 rounded">
                              TEST
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-4 text-slate-500 whitespace-nowrap">
                          {timeDisplay}
                        </td>
                        <td className="py-2.5 px-4 text-center whitespace-nowrap">
                          {isSuccess ? (
                            <span
                              className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 inline-flex items-center gap-1"
                              title={msgId ? `SendGrid Message ID: ${msgId}` : 'Dispatched via SendGrid'}
                            >
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" /> DELIVERED
                            </span>
                          ) : isSandbox ? (
                            <span
                              className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200 inline-flex items-center gap-1 cursor-help"
                              title="SendGrid Sandbox Mode was active — message was validated by SendGrid but not sent to real mailbox"
                            >
                              <AlertTriangle className="w-3 h-3 text-amber-600" /> SANDBOX
                            </span>
                          ) : isSimulated ? (
                            <span
                              className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-800 border border-purple-200 inline-flex items-center gap-1 cursor-help"
                              title="Simulated locally — SendGrid API key was not configured"
                            >
                              <Sliders className="w-3 h-3 text-purple-600" /> SIMULATED
                            </span>
                          ) : isError ? (
                            <span
                              className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-red-100 text-red-800 border border-red-200 inline-flex items-center gap-1 cursor-help"
                              title={mail.delivery?.error || 'Delivery failed'}
                            >
                              <AlertCircle className="w-3 h-3 text-red-600" /> ERROR
                            </span>
                          ) : (
                            <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200 inline-flex items-center gap-1">
                              <Clock className="w-3 h-3 text-amber-600" /> PENDING
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            {isPending && (
                              <>
                                <button
                                  type="button"
                                  disabled={isProcessingQueue}
                                  onClick={() => handleSendSinglePending(mail)}
                                  className="text-[10px] font-bold text-amber-800 hover:text-amber-900 bg-amber-50 hover:bg-amber-100 border border-amber-300 px-2 py-1 rounded transition-colors flex items-center gap-1 cursor-pointer"
                                  title="Send this email now via SendGrid"
                                >
                                  <Send className="w-3 h-3 text-amber-700" /> Send Now
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleMarkAsDelivered(mail)}
                                  className="text-[10px] font-bold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-2 py-1 rounded transition-colors flex items-center gap-1 cursor-pointer"
                                  title="Mark as delivered without sending"
                                >
                                  <Check className="w-3 h-3" /> Mark Delivered
                                </button>
                              </>
                            )}
                            <button
                              type="button"
                              onClick={() => setSelectedMailLog(mail)}
                              className="text-[10px] font-bold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-2.5 py-1 rounded-lg transition-colors cursor-pointer inline-flex items-center gap-1 shadow-2xs"
                              title="View full dispatch debug details & SendGrid Message ID"
                            >
                              <Eye className="w-3 h-3 text-slate-500" /> View
                            </button>
                            <button
                              type="button"
                              onClick={() => mail.id && handleDeleteMail(mail.id)}
                              className="text-[10px] p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors cursor-pointer"
                              title="Delete log"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls Footer */}
            <div className="p-3.5 border-t border-slate-100 bg-slate-50/70 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
              {/* Range & Total Count */}
              <div className="text-slate-600 text-[11px] font-medium text-center sm:text-left">
                Showing <strong className="text-slate-900 font-bold">{totalItems > 0 ? startIndex + 1 : 0}</strong> to{' '}
                <strong className="text-slate-900 font-bold">{endIndex}</strong> of{' '}
                <strong className="text-slate-900 font-bold">{totalItems}</strong> records
                {filteredLogs.length !== mailLogs.length && (
                  <span className="text-slate-400 ml-1">(filtered from {mailLogs.length} total)</span>
                )}
              </div>

              {/* Rows Per Page Selector & Page Buttons */}
              <div className="flex flex-wrap items-center justify-center sm:justify-end gap-3">
                {/* Page Size Selector */}
                <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-medium">
                  <span>Rows:</span>
                  <select
                    value={pageSize}
                    onChange={(e) => setPageSize(Number(e.target.value))}
                    className="px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-800 focus:outline-hidden focus:border-emerald-500 cursor-pointer shadow-2xs"
                  >
                    <option value={5}>5</option>
                    <option value={10}>10</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                </div>

                {/* Page Navigation Buttons */}
                <div className="flex items-center gap-1">
                  {/* First Page */}
                  <button
                    type="button"
                    disabled={safeCurrentPage <= 1}
                    onClick={() => setCurrentPage(1)}
                    className="p-1.5 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-white text-slate-700 border border-slate-200 rounded-lg transition-colors cursor-pointer disabled:cursor-not-allowed shadow-2xs"
                    title="First Page"
                  >
                    <ChevronsLeft className="w-3.5 h-3.5" />
                  </button>

                  {/* Previous Page */}
                  <button
                    type="button"
                    disabled={safeCurrentPage <= 1}
                    onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                    className="p-1.5 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-white text-slate-700 border border-slate-200 rounded-lg transition-colors cursor-pointer disabled:cursor-not-allowed shadow-2xs"
                    title="Previous Page"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>

                  {/* Dynamic Page Numbers */}
                  <div className="flex items-center gap-1 px-1">
                    {(() => {
                      const pages: (number | string)[] = [];
                      if (totalPages <= 5) {
                        for (let i = 1; i <= totalPages; i++) pages.push(i);
                      } else {
                        if (safeCurrentPage <= 3) {
                          pages.push(1, 2, 3, '...', totalPages);
                        } else if (safeCurrentPage >= totalPages - 2) {
                          pages.push(1, '...', totalPages - 2, totalPages - 1, totalPages);
                        } else {
                          pages.push(1, '...', safeCurrentPage, '...', totalPages);
                        }
                      }
                      return pages.map((page, idx) => {
                        if (typeof page === 'string') {
                          return (
                            <span key={`ellipsis-${idx}`} className="px-1 text-slate-400 font-bold text-xs">
                              ...
                            </span>
                          );
                        }
                        const isCurrent = page === safeCurrentPage;
                        return (
                          <button
                            key={`page-${page}`}
                            type="button"
                            onClick={() => setCurrentPage(page)}
                            className={`min-w-[28px] h-7 px-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                              isCurrent
                                ? 'bg-emerald-600 text-white shadow-xs'
                                : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 shadow-2xs'
                            }`}
                          >
                            {page}
                          </button>
                        );
                      });
                    })()}
                  </div>

                  {/* Next Page */}
                  <button
                    type="button"
                    disabled={safeCurrentPage >= totalPages}
                    onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                    className="p-1.5 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-white text-slate-700 border border-slate-200 rounded-lg transition-colors cursor-pointer disabled:cursor-not-allowed shadow-2xs"
                    title="Next Page"
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>

                  {/* Last Page */}
                  <button
                    type="button"
                    disabled={safeCurrentPage >= totalPages}
                    onClick={() => setCurrentPage(totalPages)}
                    className="p-1.5 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-white text-slate-700 border border-slate-200 rounded-lg transition-colors cursor-pointer disabled:cursor-not-allowed shadow-2xs"
                    title="Last Page"
                  >
                    <ChevronsRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Confirmation Modal to Purge Logs */}
      {showPurgeModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl border border-slate-200 space-y-4 animate-scaleIn">
            <div className="flex items-center gap-3 text-red-600">
              <div className="p-2 bg-red-100 rounded-xl">
                <Trash2 className="w-5 h-5" />
              </div>
              <h3 className="font-extrabold text-slate-900 text-sm">
                Purge All Email Logs?
              </h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              This will permanently delete all <strong className="text-slate-900">{mailLogs.length}</strong> email log(s) from Firestore. This action cannot be undone.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowPurgeModal(false)}
                className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handlePurgeAllLogs}
                className="px-3.5 py-1.5 bg-red-600 hover:bg-red-700 text-white font-extrabold rounded-xl text-xs transition-colors cursor-pointer"
              >
                Yes, Purge Logs
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal to Process Pending Queue */}
      {showProcessModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-5 shadow-2xl border border-slate-200 space-y-4 animate-scaleIn">
            <div className="flex items-center gap-3 text-emerald-600">
              <div className="p-2 bg-emerald-100 rounded-xl">
                <Send className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-slate-900 text-sm">
                  Confirm Dispatch for {pendingCount} Queued Email(s)
                </h3>
                <p className="text-[11px] text-slate-500">
                  Review queued recipients before initiating live delivery
                </p>
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 max-h-56 overflow-y-auto space-y-2">
              {mailLogs
                .filter((mail) => {
                  const state = (mail.delivery?.state || 'PENDING').toUpperCase();
                  return state === 'PENDING' || state === 'QUEUED' || !mail.delivery?.state;
                })
                .map((m, idx) => {
                  const recipient = Array.isArray(m.to) ? m.to.join(', ') : m.to || 'No recipient';
                  const subject = m.message?.subject || '(No subject)';
                  const isLegacy =
                    subject.toLowerCase() === 'invitation received' ||
                    m.message?.html?.includes('staging.smallmoves.org') ||
                    m.message?.text?.includes('staging.smallmoves.org');

                  return (
                    <div
                      key={m.id || idx}
                      className="p-2.5 bg-white rounded-lg border border-slate-200 text-xs flex items-start justify-between gap-2"
                    >
                      <div className="min-w-0">
                        <div className="font-bold text-slate-900 truncate">{recipient}</div>
                        <div className="text-[11px] text-slate-500 truncate">{subject}</div>
                        {isLegacy && (
                          <span className="inline-block mt-1 text-[9px] font-bold px-1.5 py-0.5 bg-amber-100 text-amber-800 rounded">
                            Legacy / Expired (Will be safely archived & skipped)
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] font-mono text-slate-400 shrink-0">
                        {m.id?.substring(0, 8)}...
                      </span>
                    </div>
                  );
                })}
            </div>

            <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-[11px] text-amber-900 space-y-1">
              <div className="font-bold flex items-center gap-1.5 text-amber-950">
                <AlertCircle className="w-3.5 h-3.5 text-amber-700" />
                Dispatch Safety Guard:
              </div>
              <p className="leading-relaxed">
                Deduplication will automatically run to prevent duplicate transactional emails to the same recipient. Expired staging invitations will be archived without resending.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowProcessModal(false)}
                className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowProcessModal(false);
                  handleProcessAllPending();
                }}
                className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-xl text-xs transition-colors cursor-pointer shadow-xs flex items-center gap-1.5"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Confirm & Send ({pendingCount})</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Live Email Preview Modal */}
      {showPreviewModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl border border-slate-200 animate-scaleIn overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-emerald-100 text-emerald-700 rounded-lg">
                  <Eye className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-sm">
                    Email Dispatch Live Preview
                  </h3>
                  <p className="text-[10px] text-slate-500">
                    Template: <span className="font-bold">{testTemplateId === 'test_ping' ? 'Integration Test Ping' : testTemplateId}</span>
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex bg-slate-200/80 p-0.5 rounded-lg text-[10px] font-bold">
                  <button
                    type="button"
                    onClick={() => setPreviewMode('html')}
                    className={`px-2 py-1 rounded-md transition-colors ${
                      previewMode === 'html' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    HTML Rendered
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewMode('plaintext')}
                    className={`px-2 py-1 rounded-md transition-colors ${
                      previewMode === 'plaintext' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Plaintext
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => setShowPreviewModal(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/60 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="p-4 bg-slate-50/50 border-b border-slate-200 text-xs space-y-1.5 font-mono">
              <div className="flex items-center gap-2">
                <span className="text-slate-400 font-sans font-bold w-16 shrink-0">From:</span>
                <span className="text-slate-800 font-bold">
                  {emailProvider.fromName || 'Small Moves PEF Team'} &lt;{emailProvider.fromEmail || 'support@smallmoves.org'}&gt;
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-slate-400 font-sans font-bold w-16 shrink-0">To:</span>
                <span className="text-slate-800 font-bold">{testRecipient || currentAdminEmail}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-slate-400 font-sans font-bold w-16 shrink-0">Subject:</span>
                <span className="text-slate-900 font-bold font-sans">{previewContent.subject}</span>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 bg-slate-100/50">
              {previewMode === 'html' ? (
                <div
                  className="bg-white rounded-xl shadow-xs border border-slate-200 p-2 overflow-hidden"
                  dangerouslySetInnerHTML={{ __html: previewContent.html }}
                />
              ) : (
                <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-4 font-mono text-xs text-slate-800 whitespace-pre-wrap leading-relaxed">
                  {previewContent.body}
                </div>
              )}
            </div>

            <div className="p-3 border-t border-slate-200 bg-white flex items-center justify-between">
              <span className="text-[10px] text-slate-500">
                Variables like school names and recipient info are substituted dynamically at dispatch time.
              </span>
              <button
                type="button"
                onClick={() => setShowPreviewModal(false)}
                className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs transition-colors cursor-pointer"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Log Detail Modal */}
      {selectedMailLog && (() => {
        const rawState = (selectedMailLog.delivery?.state || 'PENDING').toUpperCase();
        const msgId =
          selectedMailLog.delivery?.info?.sendgridMessageId ||
          selectedMailLog.delivery?.info?.messageId ||
          '';
        const method =
          selectedMailLog.delivery?.method ||
          (msgId.startsWith('sim-')
            ? 'simulation'
            : msgId.startsWith('manual-')
            ? 'manual'
            : selectedMailLog.sendgridOptions?.sandboxMode
            ? 'sandbox'
            : 'sendgrid_api');
        const isSimulated = rawState === 'SIMULATED' || method === 'simulation' || msgId.startsWith('sim-');
        const isSandbox = method === 'sandbox' || !!selectedMailLog.sendgridOptions?.sandboxMode;
        const isSuccess = (rawState === 'SUCCESS' || rawState === 'DELIVERED') && !isSimulated && !isSandbox;
        const isError = rawState === 'ERROR';
        const isRealSendGrid = method === 'sendgrid_api' && !isSimulated && !isSandbox;

        const recipientDisplay = Array.isArray(selectedMailLog.to)
          ? selectedMailLog.to.join(', ')
          : selectedMailLog.to || '';

        const fromAddress =
          selectedMailLog.delivery?.info?.sender ||
          selectedMailLog.from ||
          `"${emailProvider.fromName || 'Small Moves PEF'}" <${emailProvider.fromEmail || 'support@smallmoves.org'}>`;

        const replyToAddress =
          selectedMailLog.replyTo ||
          emailProvider.replyToEmail ||
          emailProvider.fromEmail ||
          'support@smallmoves.org';

        const dispatchedAtTime =
          selectedMailLog.metadata?.dispatchedAt ||
          selectedMailLog.delivery?.startTime ||
          (selectedMailLog.createdAt ? new Date(selectedMailLog.createdAt).toISOString() : '');

        const responseDetails =
          selectedMailLog.delivery?.info?.response ||
          (isSuccess ? 'Accepted by SendGrid v3 Mail Send pipeline' : selectedMailLog.delivery?.error || 'No detailed response recorded');

        const httpStatus = selectedMailLog.delivery?.statusCode || selectedMailLog.delivery?.info?.httpStatus;

        return (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
            <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 animate-scaleIn overflow-hidden">
              {/* Header */}
              <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="p-2 bg-emerald-100 text-emerald-800 rounded-xl shrink-0">
                    <Activity className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-extrabold text-slate-900 text-sm">
                        Dispatch & SendGrid Diagnostics
                      </h3>
                      {isSuccess ? (
                        <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 inline-flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" /> DELIVERED
                        </span>
                      ) : isSandbox ? (
                        <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200 inline-flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3 text-amber-600" /> SANDBOX MODE
                        </span>
                      ) : isSimulated ? (
                        <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 border border-purple-200 inline-flex items-center gap-1">
                          <Sliders className="w-3 h-3 text-purple-600" /> SIMULATED (NO KEY)
                        </span>
                      ) : isError ? (
                        <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-red-100 text-red-800 border border-red-200 inline-flex items-center gap-1">
                          <AlertCircle className="w-3 h-3 text-red-600" /> ERROR
                        </span>
                      ) : (
                        <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200 inline-flex items-center gap-1">
                          <Clock className="w-3 h-3 text-amber-600" /> PENDING
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-slate-500 font-mono mt-0.5">
                      <span>Doc ID: {selectedMailLog.id}</span>
                      <button
                        type="button"
                        onClick={() => {
                          if (selectedMailLog.id) {
                            navigator.clipboard.writeText(selectedMailLog.id);
                            setCopiedDocId(true);
                            setTimeout(() => setCopiedDocId(false), 2000);
                          }
                        }}
                        className="text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                        title="Copy Document ID"
                      >
                        {copiedDocId ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                      </button>
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedMailLog(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/60 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Body */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
                {/* SendGrid Debug Card */}
                <div className="p-4 bg-slate-900 text-white rounded-2xl shadow-sm border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Terminal className="w-4 h-4 text-emerald-400" />
                      <span className="font-extrabold text-xs text-white uppercase tracking-wider">
                        SendGrid Message ID & Tracking Info
                      </span>
                    </div>
                    <span
                      className={`text-[9px] font-extrabold px-2 py-0.5 rounded-md border ${
                        isRealSendGrid
                          ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                          : isSandbox
                          ? 'bg-amber-950 text-amber-300 border-amber-800'
                          : isSimulated
                          ? 'bg-purple-950 text-purple-300 border-purple-800'
                          : 'bg-slate-800 text-slate-300 border-slate-700'
                      }`}
                    >
                      {isRealSendGrid
                        ? 'LIVE SENDGRID API'
                        : isSandbox
                        ? 'SANDBOX (NOT DELIVERED)'
                        : isSimulated
                        ? 'OFFLINE / SIMULATION'
                        : 'DIRECT QUEUE'}
                    </span>
                  </div>

                  {/* Message ID Field */}
                  <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="text-[10px] uppercase font-bold text-slate-400">
                        SendGrid Header Message ID (<code className="text-emerald-400">X-Message-Id</code>):
                      </div>
                      <div className="font-mono text-xs font-bold text-emerald-300 break-all select-all mt-0.5">
                        {msgId || '(No Message ID recorded - pending dispatch)'}
                      </div>
                    </div>
                    {msgId && (
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(msgId);
                            setCopiedMsgId(true);
                            setTimeout(() => setCopiedMsgId(false), 2000);
                          }}
                          className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
                        >
                          {copiedMsgId ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                              <span className="text-emerald-400">Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" />
                              <span>Copy ID</span>
                            </>
                          )}
                        </button>
                        <a
                          href="https://app.sendgrid.com/email_activity"
                          target="_blank"
                          rel="noreferrer"
                          className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 shadow-xs"
                          title="Search in SendGrid Activity Feed"
                        >
                          <span>SendGrid Log</span>
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    )}
                  </div>

                  {/* Provider & Server Response Metadata */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                    <div className="p-2.5 bg-slate-950/70 rounded-xl border border-slate-800/80">
                      <div className="text-[9px] font-bold text-slate-400 uppercase">Provider Status</div>
                      <div className="font-mono text-[11px] text-slate-200 mt-0.5 truncate">
                        {httpStatus ? `HTTP ${httpStatus} Accepted` : isRealSendGrid ? 'HTTP 202 Accepted' : method.toUpperCase()}
                      </div>
                    </div>
                    <div className="p-2.5 bg-slate-950/70 rounded-xl border border-slate-800/80">
                      <div className="text-[9px] font-bold text-slate-400 uppercase">Pipeline Mode</div>
                      <div className="font-mono text-[11px] text-slate-200 mt-0.5 truncate">
                        {isSandbox ? 'Sandbox Mode' : isSimulated ? 'Local Simulation' : 'SendGrid API v3'}
                      </div>
                    </div>
                    <div className="p-2.5 bg-slate-950/70 rounded-xl border border-slate-800/80">
                      <div className="text-[9px] font-bold text-slate-400 uppercase">Dispatched At</div>
                      <div className="font-mono text-[11px] text-slate-200 mt-0.5 truncate">
                        {dispatchedAtTime ? new Date(dispatchedAtTime).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : 'Pending'}
                      </div>
                    </div>
                  </div>

                  <div className="text-[11px] text-slate-300 bg-slate-950/40 p-2.5 rounded-xl border border-slate-800/60 font-mono flex items-start gap-2">
                    <Info className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                    <span className="break-all leading-relaxed">
                      <strong className="text-slate-200">Response Detail:</strong> {responseDetails}
                    </span>
                  </div>
                </div>

                {/* Error Banner if Error State */}
                {selectedMailLog.delivery?.error && (
                  <div className="p-3.5 bg-red-50 rounded-xl border border-red-200 text-red-900 text-xs space-y-1">
                    <div className="font-bold flex items-center gap-1.5 text-red-800">
                      <AlertCircle className="w-4 h-4 text-red-600" />
                      Dispatch Error Logged:
                    </div>
                    <div className="font-mono text-[11px] bg-white/80 p-2 rounded-lg border border-red-200/80 whitespace-pre-wrap">
                      {selectedMailLog.delivery.error}
                    </div>
                  </div>
                )}

                {/* Email Metadata Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <div className="text-slate-400 font-bold text-[10px] uppercase">Recipient(s)</div>
                    <div className="font-bold text-slate-900 mt-0.5 truncate select-all">
                      {recipientDisplay}
                    </div>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <div className="text-slate-400 font-bold text-[10px] uppercase">Sender & Reply-To</div>
                    <div className="font-bold text-slate-900 mt-0.5 truncate select-all">
                      {fromAddress}
                    </div>
                    <div className="text-[10px] text-slate-500 font-mono truncate mt-0.5">
                      Reply-To: {replyToAddress}
                    </div>
                  </div>
                </div>

                {/* Subject */}
                <div>
                  <div className="text-slate-500 font-bold text-[11px] mb-1">Subject</div>
                  <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 font-bold text-slate-900 text-xs">
                    {selectedMailLog.message?.subject || '(No Subject)'}
                  </div>
                </div>

                {/* Message Body Inspector with View Tabs */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <div className="text-slate-500 font-bold text-[11px]">Message Content</div>
                    <div className="flex bg-slate-200/80 p-0.5 rounded-lg text-[10px] font-bold">
                      <button
                        type="button"
                        onClick={() => setLogBodyMode('preview')}
                        className={`px-2 py-1 rounded-md transition-colors cursor-pointer ${
                          logBodyMode === 'preview' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        Rendered HTML
                      </button>
                      <button
                        type="button"
                        onClick={() => setLogBodyMode('plaintext')}
                        className={`px-2 py-1 rounded-md transition-colors cursor-pointer ${
                          logBodyMode === 'plaintext' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        Plaintext
                      </button>
                    </div>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 max-h-52 overflow-y-auto">
                    {logBodyMode === 'preview' && selectedMailLog.message?.html ? (
                      <div
                        className="bg-white p-3 rounded-lg border border-slate-200 text-xs"
                        dangerouslySetInnerHTML={{ __html: selectedMailLog.message.html }}
                      />
                    ) : (
                      <div className="font-mono text-xs text-slate-800 whitespace-pre-wrap leading-relaxed">
                        {selectedMailLog.message?.text || selectedMailLog.message?.html || '(No body content)'}
                      </div>
                    )}
                  </div>
                </div>

                {/* Raw Document Payload */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <div className="text-slate-500 font-bold text-[11px]">Raw Firestore Document Payload</div>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(JSON.stringify(selectedMailLog, null, 2));
                        setCopiedJson(true);
                        setTimeout(() => setCopiedJson(false), 2000);
                      }}
                      className="text-[10px] font-bold text-slate-600 hover:text-slate-900 flex items-center gap-1 cursor-pointer"
                    >
                      {copiedJson ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-600" />
                          <span className="text-emerald-600">Copied JSON</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>Copy JSON</span>
                        </>
                      )}
                    </button>
                  </div>
                  <pre className="p-3 bg-slate-950 text-emerald-400 rounded-xl font-mono text-[10px] overflow-x-auto max-h-44 border border-slate-800">
                    {JSON.stringify(selectedMailLog, null, 2)}
                  </pre>
                </div>
              </div>

              {/* Footer */}
              <div className="p-3 border-t border-slate-200 bg-white flex items-center justify-between">
                <span className="text-[10px] text-slate-500">
                  Real-time synchronization active with Firebase collection <code className="font-mono font-bold">/{emailProvider.mailCollection || 'mail'}</code>
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedMailLog(null)}
                  className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs transition-colors cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};
