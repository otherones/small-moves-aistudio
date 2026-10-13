import React, { useState, useMemo, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Building2,
  Briefcase,
  User,
  Users,
  ShieldCheck,
  DollarSign,
  PlusCircle,
  Plus,
  Mail,
  Send,
  Edit3,
  CheckCircle2,
  Clock,
  UserPlus,
  AlertCircle,
  History,
  MessageSquare,
  Search,
  FileCheck,
  CreditCard,
  Bell,
  HelpCircle,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  StickyNote,
  Filter,
  ArrowUpRight,
  RefreshCw,
  X,
  Trash2,
  Calendar,
  Copy,
  Check,
  Sparkles,
  FileText,
  FileCode,
  Eye,
  RotateCcw,
  ExternalLink,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { School, Funder, EmergencyRequest, ActivityEvent, BudgetTransaction, AdditionalContact, PortalSettings, PendingInvite, AppUser } from '../../types';
import { RequestsTable } from '../../components/requests/RequestsTable';
import { MouModal } from '../../components/common/MouModal';
import { getCurrentSchoolYear, getSchoolYearForDate } from '../../utils/schoolYear';
import { computeSchoolBudgetMetrics } from '../../utils/budgetUtils';
import { useAuth } from '../../context/AuthContext';
import { renderInviteEmail, PRODUCTION_PORTAL_URL } from '../../utils/emailUtils';
import { dispatchEmail } from '../../services/emailService';
import { INITIAL_SETTINGS } from '../../data/defaultSettings';

interface AdminSchoolDetailProps {
  schools: School[];
  funders?: Funder[];
  requests: EmergencyRequest[];
  activityLogs: ActivityEvent[];
  budgetTransactions: BudgetTransaction[];
  settings?: PortalSettings;
  managedUsers?: AppUser[];
  pendingInvites?: PendingInvite[];
  onUpdateSchool: (schoolId: string, updates: Partial<School>) => void;
  onDeleteSchool?: (schoolId: string) => Promise<void> | void;
  onAddBudgetAdjustment: (
    schoolId: string,
    amount: number,
    reason: string,
    actorName: string
  ) => void;
  onAddActivityNote?: (
    requestId: string,
    message: string,
    isInternalNote?: boolean,
    schoolId?: string
  ) => void;
  onCancelRequest?: (request: EmergencyRequest, reason?: string) => void;
  onCreateInvite?: (invite: Partial<PendingInvite>) => void;
}

export const AdminSchoolDetail: React.FC<AdminSchoolDetailProps> = ({
  schools,
  funders,
  requests,
  activityLogs,
  budgetTransactions,
  settings,
  managedUsers = [],
  pendingInvites = [],
  onUpdateSchool,
  onDeleteSchool,
  onAddBudgetAdjustment,
  onAddActivityNote,
  onCancelRequest,
  onCreateInvite,
}) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { userProfile } = useAuth();

  const school = schools.find((s) => s.id === id);
  const currentSY = getCurrentSchoolYear(settings);

  type StatusFilter = 'all' | 'open' | 'action_needed' | 'paid' | 'waiting_on_principal' | 'ready_to_pay';
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [budgetModalOpen, setBudgetModalOpen] = useState(false);
  const [adjustmentAmount, setAdjustmentAmount] = useState<number>(0);
  const [adjustmentReason, setAdjustmentReason] = useState('');
  const [inviteSent, setInviteSent] = useState(false);
  const [invitedContactId, setInvitedContactId] = useState<string | null>(null);
  const [actionToast, setActionToast] = useState<string | null>(null);
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [mouConfirmModalOpen, setMouConfirmModalOpen] = useState(false);

  // Funder Assignment Modal State
  const [funderModalOpen, setFunderModalOpen] = useState(false);
  const [selectedFunderId, setSelectedFunderId] = useState<string>(
    school?.funderId && funders?.some((f) => f.id === school.funderId) ? school.funderId : ''
  );

  useEffect(() => {
    if (school) {
      setSelectedFunderId(
        school.funderId && funders?.some((f) => f.id === school.funderId) ? school.funderId : ''
      );
    }
  }, [school, funders]);

  const handleSaveFunder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!school) return;

    const chosenFunder = funders?.find((f) => f.id === selectedFunderId);
    const newFunderId = chosenFunder ? chosenFunder.id : undefined;
    const newFunderName = chosenFunder ? chosenFunder.name : undefined;

    onUpdateSchool(school.id, {
      funderId: newFunderId,
      funderName: newFunderName,
    });

    if (onAddActivityNote) {
      onAddActivityNote(
        '',
        `Assigned funder updated to: ${newFunderName || 'Unassigned'}`,
        true,
        school.id
      );
    }

    setFunderModalOpen(false);
  };

  // Email Communication Modal State
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [emailRecipient, setEmailRecipient] = useState('');
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [emailSuccessBanner, setEmailSuccessBanner] = useState(false);

  // Leadership & Contacts Edit Modal State
  const [contactsModalOpen, setContactsModalOpen] = useState(false);
  const [editPrincipalName, setEditPrincipalName] = useState('');
  const [editPrincipalEmail, setEditPrincipalEmail] = useState('');
  const [editPrincipalPhone, setEditPrincipalPhone] = useState('');
  const [editAdditionalContacts, setEditAdditionalContacts] = useState<AdditionalContact[]>([]);

  // Custom School MOU Override State
  const [customMouModalOpen, setCustomMouModalOpen] = useState(false);
  const [previewMouModalOpen, setPreviewMouModalOpen] = useState(false);
  const [selectedMouVersionId, setSelectedMouVersionId] = useState<string>('');
  const [customMouReason, setCustomMouReason] = useState('');
  const [customMouResetSignature, setCustomMouResetSignature] = useState(false);
  const [customMouNotice, setCustomMouNotice] = useState<string | null>(null);

  // Activity Log State
  type LogCategoryFilter = 'all' | 'requests' | 'comms' | 'contacts_leadership' | 'notes' | 'budget_mou';
  const [logCategoryFilter, setLogCategoryFilter] = useState<LogCategoryFilter>('all');
  const [logSearchQuery, setLogSearchQuery] = useState('');
  const [logCurrentPage, setLogCurrentPage] = useState(1);
  const [logPageSize, setLogPageSize] = useState(10);
  const [newSchoolNoteText, setNewSchoolNoteText] = useState('');
  const [noteSuccess, setNoteSuccess] = useState(false);

  // Populate Contacts Edit form when opening modal
  useEffect(() => {
    if (school) {
      setEditPrincipalName(school.principalName || '');
      setEditPrincipalEmail(school.principalEmail || '');
      setEditPrincipalPhone(school.principalPhone || school.phone || '');
      setEditAdditionalContacts(school.additionalContacts ? [...school.additionalContacts] : []);
    }
  }, [school]);

  if (!school) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 text-center">
        <h2 className="text-xl font-bold text-slate-800">School Not Found</h2>
        <Link to="/admin/schools" className="text-xs text-emerald-600 font-bold hover:underline mt-2 inline-block">
          Return to Schools Directory
        </Link>
      </div>
    );
  }

  const schoolRequests = requests.filter((r) => r.schoolId === school.id);
  const schoolRequestIds = useMemo(() => new Set(schoolRequests.map((r) => r.id)), [schoolRequests]);

  const budgetMetrics = useMemo(
    () => computeSchoolBudgetMetrics(school, requests, currentSY),
    [school, requests, currentSY]
  );

  const filteredSchoolRequests = schoolRequests.filter((r) => {
    if (getSchoolYearForDate(r.createdAt) !== currentSY) {
      return false;
    }
    if (statusFilter === 'open') {
      return r.status !== 'paid' && r.status !== 'denied' && r.status !== 'canceled';
    } else if (statusFilter === 'action_needed') {
      return r.status === 'in_review' || r.status === 'ready_to_pay';
    } else if (statusFilter === 'paid') {
      return r.status === 'paid';
    } else if (statusFilter === 'waiting_on_principal') {
      return r.status === 'waiting_on_principal';
    } else if (statusFilter === 'ready_to_pay') {
      return r.status === 'ready_to_pay';
    }
    return true;
  });

  // Filter school activity logs
  const schoolLogs = useMemo(() => {
    return activityLogs
      .filter((l) => l.schoolId === school.id || (l.requestId && schoolRequestIds.has(l.requestId)))
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [activityLogs, school.id, schoolRequestIds]);

  const filteredSchoolLogs = useMemo(() => {
    return schoolLogs.filter((log) => {
      // Category filter
      if (logCategoryFilter === 'notes') {
        if (!log.isInternalNote && log.eventType !== 'note') return false;
      } else if (logCategoryFilter === 'requests') {
        if (!log.requestId && log.eventType !== 'status_change' && log.eventType !== 'payout_submitted') return false;
      } else if (logCategoryFilter === 'comms') {
        if (
          log.eventType !== 'email_sent' &&
          log.eventType !== 'reminder_sent' &&
          log.eventType !== 'question' &&
          log.eventType !== 'response'
        )
          return false;
      } else if (logCategoryFilter === 'contacts_leadership') {
        if (log.eventType !== 'contact_update' && log.eventType !== 'principal_update') return false;
      } else if (logCategoryFilter === 'budget_mou') {
        if (log.eventType !== 'mou_signed' && log.eventType !== 'budget_adjusted') return false;
      }

      // Search query
      if (logSearchQuery.trim()) {
        const q = logSearchQuery.toLowerCase();
        const msgMatch = log.message.toLowerCase().includes(q);
        const actorMatch = log.actorName.toLowerCase().includes(q);
        const reqMatch = log.requestId?.toLowerCase().includes(q);
        if (!msgMatch && !actorMatch && !reqMatch) return false;
      }

      return true;
    });
  }, [schoolLogs, logCategoryFilter, logSearchQuery]);

  useEffect(() => {
    setLogCurrentPage(1);
  }, [logCategoryFilter, logSearchQuery]);

  const totalLogPages = Math.ceil(filteredSchoolLogs.length / logPageSize) || 1;
  const safeLogCurrentPage = Math.min(Math.max(1, logCurrentPage), totalLogPages);
  const logStartIndex = (safeLogCurrentPage - 1) * logPageSize;
  const paginatedLogs = useMemo(() => {
    return filteredSchoolLogs.slice(logStartIndex, logStartIndex + logPageSize);
  }, [filteredSchoolLogs, logStartIndex, logPageSize]);

  const handleSendInvite = () => {
    setInviteSent(true);
    const principalEmail = school?.principalEmail?.trim();
    const principalName = school?.principalName?.replace(/\s*\(Pending\)\s*/gi, '').trim() || 'Principal';

    if (principalEmail && onCreateInvite) {
      onCreateInvite({
        email: principalEmail,
        name: principalName,
        role: 'principal',
        schoolId: school.id,
        schoolName: school.name,
        jobTitle: 'Principal',
        invitedBy: userProfile?.displayName || userProfile?.email || 'PEF Administrator',
        invitedAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'pending',
        notes: `Onboarding invitation for ${school.name}. Please review and sign MOU upon login.`,
      });
    }

    if (onAddActivityNote && school) {
      onAddActivityNote(
        '',
        `Sent portal access invitation email to ${school.principalName || 'Principal'} (${school.principalEmail || school.phone}).`,
        false,
        school.id
      );
    }
    setTimeout(() => setInviteSent(false), 3000);
  };

  const handleOpenEmailModal = () => {
    setEmailRecipient(school?.principalEmail || school?.phone || '');
    setEmailSubject(`[Emergency Fund Portal] Communication for ${school?.name || 'School'}`);
    setEmailBody('');
    setEmailModalOpen(true);
  };

  const handleSendCustomEmail = (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailSubject.trim() || !emailBody.trim()) return;

    if (emailRecipient.trim() && settings) {
      dispatchEmail(
        {
          to: emailRecipient.trim(),
          recipientName: school?.principalName || 'School Leadership',
          subject: emailSubject.trim(),
          body: emailBody.trim(),
          schoolId: school?.id,
          schoolName: school?.name,
        },
        settings,
        userProfile?.email
      ).catch(console.error);
    }

    if (onAddActivityNote && school) {
      onAddActivityNote(
        '',
        `Sent email communication to ${emailRecipient || 'Principal'}: "${emailSubject.trim()}" — ${emailBody.trim()}`,
        false,
        school.id
      );
    }

    setEmailModalOpen(false);
    setEmailSuccessBanner(true);
    setTimeout(() => setEmailSuccessBanner(false), 3500);
  };

  const handleConfirmBudgetAdjust = (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustmentAmount) return;

    onAddBudgetAdjustment(
      school.id,
      Number(adjustmentAmount),
      adjustmentReason.trim(),
      userProfile?.displayName || userProfile?.email || 'PEF Administrator'
    );

    setBudgetModalOpen(false);
  };

  const handlePostNoteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSchoolNoteText.trim()) return;

    if (onAddActivityNote) {
      onAddActivityNote('', newSchoolNoteText.trim(), true, school.id);
    }
    setNewSchoolNoteText('');
    setNoteSuccess(true);
    setTimeout(() => setNoteSuccess(false), 3000);
  };

  const handleInviteAuthorizedContact = (contact: AdditionalContact) => {
    if (!contact.email?.trim() || !onCreateInvite || !school) return;
    const cleanEmail = contact.email.trim();
    const cleanName = contact.name.trim();
    const cleanTitle = contact.jobTitle || 'Authorized Contact';

    onCreateInvite({
      email: cleanEmail,
      name: cleanName,
      role: 'additional_contact',
      schoolId: school.id,
      schoolName: school.name,
      jobTitle: cleanTitle,
      invitedBy: userProfile?.displayName || userProfile?.email || 'PEF Administrator',
      notes: `Authorized contact invitation dispatched from School Details for ${school.name}`,
    });

    setInvitedContactId(contact.id);
    setActionToast(`Invitation dispatched to ${cleanEmail} as Authorized Contact!`);
    setTimeout(() => {
      setInvitedContactId(null);
      setActionToast(null);
    }, 4000);
  };

  const handleSaveLeadershipAndContacts = (e: React.FormEvent) => {
    e.preventDefault();
    if (!school) return;
    const validContacts = editAdditionalContacts.filter((c) => c.name.trim() && c.email.trim());

    // Automatically dispatch portal invitation to any newly registered authorized contact
    const previousEmails = new Set(
      (school.additionalContacts || []).map((c) => c.email.toLowerCase().trim())
    );
    const newContacts = validContacts.filter(
      (c) => !previousEmails.has(c.email.toLowerCase().trim())
    );

    if (newContacts.length > 0 && onCreateInvite) {
      newContacts.forEach((contact) => {
        onCreateInvite({
          email: contact.email.trim(),
          name: contact.name.trim(),
          role: 'additional_contact',
          schoolId: school.id,
          schoolName: school.name,
          jobTitle: contact.jobTitle || 'Authorized Contact',
          invitedBy: userProfile?.displayName || userProfile?.email || 'PEF Administrator',
          notes: `Authorized contact invitation from School Details for ${school.name}`,
        });
      });
      setActionToast(
        `Dispatched portal invitation${newContacts.length > 1 ? 's' : ''} to ${newContacts.map((c) => c.email).join(', ')} as Authorized Contact!`
      );
      setTimeout(() => setActionToast(null), 4000);
    }

    onUpdateSchool(school.id, {
      principalName: editPrincipalName.trim(),
      principalEmail: editPrincipalEmail.trim(),
      principalPhone: editPrincipalPhone.trim(),
      additionalContacts: validContacts,
    });

    setContactsModalOpen(false);
  };

  const mouVersions = useMemo(() => {
    return settings?.mouVersions && settings.mouVersions.length > 0
      ? settings.mouVersions
      : INITIAL_SETTINGS.mouVersions || [];
  }, [settings?.mouVersions]);

  const defaultMouVersionId = settings?.currentMouVersionId || mouVersions[0]?.id || '';
  const defaultMouVersion = mouVersions.find((v) => v.id === defaultMouVersionId) || mouVersions[0];

  const effectiveSchoolMouVersion = useMemo(() => {
    if (!school) return defaultMouVersion;
    if (school.customMouVersionId) {
      const found = mouVersions.find((v) => v.id === school.customMouVersionId);
      if (found) return found;
    }
    if (school.hasCustomMou && school.currentMouVersionId) {
      const found = mouVersions.find((v) => v.id === school.currentMouVersionId);
      if (found) return found;
    }
    if (school.currentMouSigned && school.currentMouVersionId) {
      const found = mouVersions.find((v) => v.id === school.currentMouVersionId);
      if (found) return found;
    }
    return defaultMouVersion;
  }, [school, mouVersions, defaultMouVersion]);

  const handleOpenCustomMouModal = () => {
    if (!school) return;
    const initialVersionId =
      school.customMouVersionId ||
      (school.hasCustomMou && school.currentMouVersionId ? school.currentMouVersionId : '') ||
      defaultMouVersionId;

    setSelectedMouVersionId(initialVersionId);
    setCustomMouReason(school.customMouReason || '');
    setCustomMouResetSignature(false);
    setCustomMouNotice(null);
    setCustomMouModalOpen(true);
  };

  const handleSaveCustomMou = (e: React.FormEvent) => {
    e.preventDefault();
    if (!school) return;

    if (!selectedMouVersionId) {
      alert('Please select an MOU version.');
      return;
    }

    const selectedVersion = mouVersions.find((v) => v.id === selectedMouVersionId);
    if (!selectedVersion) {
      alert('Selected MOU version could not be found.');
      return;
    }

    const isSelectingDefault = selectedMouVersionId === defaultMouVersionId;

    if (isSelectingDefault) {
      // Revert / apply default
      const updates: Partial<School> = {
        hasCustomMou: false,
        customMouVersionId: undefined,
        customMouContent: undefined,
        currentMouVersionId: defaultMouVersionId,
        customMouReason: customMouReason.trim() || undefined,
        customMouUpdatedAt: new Date().toISOString(),
        customMouUpdatedBy: userProfile?.displayName || userProfile?.email || 'Administrator',
      };

      if (customMouResetSignature) {
        updates.currentMouSigned = false;
        updates.currentMouSignedAt = undefined;
        updates.currentMouSignedBy = undefined;
        updates.currentMouSignedByTitle = undefined;
      }

      onUpdateSchool(school.id, updates);

      if (onAddActivityNote) {
        onAddActivityNote(
          '',
          `Reset school MOU to system default version "${selectedVersion.name}".${customMouReason.trim() ? ` Note: ${customMouReason.trim()}` : ''}${customMouResetSignature ? ' MOU status set to Pending Signature.' : ''}`,
          true,
          school.id
        );
      }
    } else {
      // Non-default MOU version selected as an override!
      const updates: Partial<School> = {
        hasCustomMou: true,
        customMouVersionId: selectedMouVersionId,
        currentMouVersionId: selectedMouVersionId,
        customMouContent: selectedVersion.content,
        customMouReason: customMouReason.trim(),
        customMouUpdatedAt: new Date().toISOString(),
        customMouUpdatedBy: userProfile?.displayName || userProfile?.email || 'Administrator',
      };

      if (customMouResetSignature) {
        updates.currentMouSigned = false;
        updates.currentMouSignedAt = undefined;
        updates.currentMouSignedBy = undefined;
        updates.currentMouSignedByTitle = undefined;
      }

      onUpdateSchool(school.id, updates);

      if (onAddActivityNote) {
        onAddActivityNote(
          '',
          `Assigned non-default MOU override version "${selectedVersion.name}" to school.${customMouReason.trim() ? ` Reason: ${customMouReason.trim()}` : ''}${customMouResetSignature ? ' MOU status set to Pending Signature.' : ''}`,
          true,
          school.id
        );
      }
    }

    setCustomMouModalOpen(false);
  };

  const handleRevertToStandardMou = () => {
    if (!school) return;
    if (
      !window.confirm(
        `Are you sure you want to remove the MOU override? This school will revert to using the global standard MOU (${defaultMouVersion?.name || 'Standard'}).`
      )
    ) {
      return;
    }

    onUpdateSchool(school.id, {
      hasCustomMou: false,
      customMouVersionId: undefined,
      customMouContent: undefined,
      currentMouVersionId: defaultMouVersionId,
      customMouReason: undefined,
      customMouUpdatedAt: new Date().toISOString(),
      customMouUpdatedBy: userProfile?.displayName || userProfile?.email || 'Administrator',
    });

    if (onAddActivityNote) {
      onAddActivityNote(
        '',
        `Removed MOU override. Reverted to global standard MOU (${defaultMouVersion?.name || 'Standard'}).`,
        true,
        school.id
      );
    }

    setCustomMouModalOpen(false);
  };

  const handleConfirmToggleMou = () => {
    if (!school) return;
    const newSigned = !school.currentMouSigned;
    const actor = userProfile?.displayName || userProfile?.email || 'Administrator';

    onUpdateSchool(school.id, {
      currentMouSigned: newSigned,
      currentMouSignedAt: newSigned ? new Date().toISOString() : undefined,
      currentMouSignedBy: newSigned ? actor : undefined,
      currentMouSignedByTitle: newSigned ? 'Administrator (Manual Override)' : undefined,
      currentMouVersionId: newSigned
        ? (school.customMouVersionId || (school.hasCustomMou && school.currentMouVersionId) || defaultMouVersionId)
        : school.currentMouVersionId,
    });

    if (onAddActivityNote) {
      const msg = newSigned
        ? `Annual Memorandum of Understanding (MOU) manually marked as SIGNED & ACTIVE by administrator ${actor}.`
        : `Annual Memorandum of Understanding (MOU) status manually marked as PENDING / UNSIGNED by administrator ${actor}. School cannot submit new emergency requests until re-signed.`;
      onAddActivityNote(
        '',
        msg,
        false,
        school.id
      );
    }

    setMouConfirmModalOpen(false);
  };

  const renderLogIcon = (log: ActivityEvent) => {
    if (log.isInternalNote || log.eventType === 'note') {
      return <StickyNote className="w-4 h-4 text-amber-600" />;
    }
    if (log.eventType === 'mou_signed') {
      return <FileCheck className="w-4 h-4 text-[#0089B3]" />;
    }
    if (log.eventType === 'budget_adjusted') {
      return <DollarSign className="w-4 h-4 text-[#0089B3]" />;
    }
    if (log.eventType === 'payout_submitted') {
      return <CreditCard className="w-4 h-4 text-[#006E8F]" />;
    }
    if (log.eventType === 'email_sent') {
      return <Mail className="w-4 h-4 text-[#0089B3]" />;
    }
    if (log.eventType === 'contact_update') {
      return <Users className="w-4 h-4 text-slate-600" />;
    }
    if (log.eventType === 'principal_update') {
      return <User className="w-4 h-4 text-slate-600" />;
    }
    if (log.eventType === 'reminder_sent') {
      return <Bell className="w-4 h-4 text-amber-500" />;
    }
    if (log.eventType === 'question' || log.eventType === 'response') {
      return <HelpCircle className="w-4 h-4 text-[#0089B3]" />;
    }
    return <RefreshCw className="w-4 h-4 text-[#0089B3]" />;
  };

  const getLogBadgeLabel = (log: ActivityEvent) => {
    if (log.isInternalNote) return 'Internal Note';
    switch (log.eventType) {
      case 'mou_signed':
        return 'MOU Executed';
      case 'budget_adjusted':
        return 'Budget Adjusted';
      case 'email_sent':
        return 'Email Comms';
      case 'contact_update':
        return 'Contact Update';
      case 'principal_update':
        return 'Leadership Update';
      case 'payout_submitted':
        return 'Payout Details';
      case 'reminder_sent':
        return 'Invite / Reminder';
      case 'question':
      case 'response':
        return 'Inquiry / Comms';
      case 'status_change':
        return 'Status Change';
      case 'note':
        return 'Note';
      default:
        return 'Activity';
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <Link
        to="/admin/schools"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Partner Schools
      </Link>

      {actionToast && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-semibold flex items-center gap-2 animate-fade-in shadow-2xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{actionToast}</span>
        </div>
      )}

      {inviteSent && (
        <div className="p-3 bg-[#EDF7FC] border border-[#0089B3]/30 rounded-xl text-[#006E8F] text-xs font-semibold flex items-center gap-2 animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-[#0089B3]" />
          <span>Sent portal access invitation email to {school.principalEmail || 'Principal'} and logged event!</span>
        </div>
      )}

      {emailSuccessBanner && (
        <div className="p-3 bg-[#EDF7FC] border border-[#0089B3]/30 rounded-xl text-[#006E8F] text-xs font-semibold flex items-center gap-2 animate-fade-in">
          <Mail className="w-4 h-4 text-[#0089B3]" />
          <span>Email communication logged to school activity history!</span>
        </div>
      )}

      {(school.status === 'invited' || school.status === 'pending') && (
        <div className="p-3.5 bg-amber-50/70 border border-amber-200/80 rounded-xl text-amber-900 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs animate-fade-in">
          <div className="flex items-center gap-2.5">
            <Clock className="w-4 h-4 text-amber-600 shrink-0" />
            <div>
              <span className="font-semibold text-amber-950">Invitation Pending Acceptance</span>
              <span className="text-amber-800 text-[11px] ml-1.5">
                Onboarding invite sent to {school.principalName || 'Principal'} ({school.principalEmail || school.phone}).
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setInviteModalOpen(true)}
            className="px-3 py-1.5 bg-white hover:bg-amber-100/50 text-amber-900 border border-amber-300/80 rounded-lg text-xs font-semibold flex items-center gap-1.5 shrink-0 transition-colors cursor-pointer"
          >
            <Mail className="w-3.5 h-3.5 text-amber-700" />
            Invite Link & Details
          </button>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-[#0F172A] text-white p-6 rounded-2xl shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-2xl font-bold text-white tracking-tight" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
              {school.name.toUpperCase()}
            </h1>
            <span
              className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold tracking-wide uppercase ${
                school.status === 'active'
                  ? 'bg-[#0089B3]/20 text-[#A5E3F6] border border-[#0089B3]/30'
                  : school.status === 'pending' || school.status === 'invited'
                  ? 'bg-amber-400/15 text-amber-300 border border-amber-400/20'
                  : 'bg-slate-700/50 text-slate-300 border border-slate-600/30'
              }`}
            >
              {school.status === 'pending' || school.status === 'invited' ? 'Pending' : school.status}
            </span>
          </div>
          <p className="text-xs text-slate-400 font-normal">
            {school.address}, {school.city}, {school.state} {school.zip} <span className="text-slate-600">·</span> Phone: {school.phone}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {onDeleteSchool && (
            <button
              type="button"
              onClick={() => setDeleteModalOpen(true)}
              className="px-3.5 py-2 bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 hover:text-rose-200 font-medium rounded-xl text-xs flex items-center gap-1.5 transition-colors cursor-pointer border border-rose-800/50 shadow-2xs"
              title="Delete this partner school"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-400" />
              <span>Delete School</span>
            </button>
          )}
          <button
            type="button"
            onClick={handleOpenEmailModal}
            className="px-3.5 py-2 bg-slate-800/90 hover:bg-slate-700/90 text-slate-200 font-medium rounded-xl text-xs flex items-center gap-1.5 transition-colors cursor-pointer border border-slate-700/60 shadow-2xs"
          >
            <Mail className="w-3.5 h-3.5 text-slate-400" />
            Send Email
          </button>
          <button
            type="button"
            onClick={handleSendInvite}
            className="px-4 py-2 bg-[#0089B3] hover:bg-[#006E8F] text-white font-semibold rounded-xl text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
          >
            <Send className="w-3.5 h-3.5" />
            {school.status === 'invited' || school.status === 'pending' ? 'Send Invitation Email' : 'Resend Portal Access'}
          </button>
        </div>
      </div>

      {/* Grid: Budget & Leadership & Governance */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Card 1: School-Year Fund Card */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-[#EDF7FC] text-[#0089B3] flex items-center justify-center">
                  <DollarSign className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">School-Year Fund</h3>
                  <p className="text-xs font-bold text-slate-800">{currentSY}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setBudgetModalOpen(true)}
                className="text-xs font-semibold text-[#006E8F] hover:text-[#0089B3] bg-[#EDF7FC] hover:bg-[#EDF7FC]/80 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
              >
                Adjust Budget
              </button>
            </div>

            {/* Net Available Stat Block */}
            <div className="mb-4">
              <span className="text-[11px] font-medium text-slate-500 block">Net Available Funds</span>
              <div className="flex items-baseline justify-between mt-0.5">
                <span className="text-2xl font-bold text-slate-900 tracking-tight" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
                  ${budgetMetrics.budgetAvailable.toLocaleString()}
                </span>
                <span className="text-[11px] font-semibold text-slate-500">
                  of ${budgetMetrics.annualBudget.toLocaleString()} allocation
                </span>
              </div>
              {/* Subtle Funding Progress Bar */}
              <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden mt-2.5 flex">
                <div
                  className="bg-[#0089B3] h-full rounded-full transition-all duration-300"
                  style={{
                    width: `${budgetMetrics.availablePct}%`
                  }}
                  title={`Available: $${budgetMetrics.budgetAvailable.toLocaleString()}`}
                />
              </div>
            </div>

            {/* Financial Breakdown Rows */}
            <div className="space-y-2 pt-3 border-t border-slate-100 text-xs">
              <div className="flex justify-between items-center py-1">
                <span className="text-slate-500 font-medium">Annual Allocation</span>
                <span className="font-semibold text-slate-800">${budgetMetrics.annualBudget.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-slate-500 font-medium">Disbursed (Paid Out)</span>
                <span className="font-semibold text-slate-700">${budgetMetrics.budgetPaid.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-slate-500 font-medium">Reserved (Pending Requests)</span>
                <span className="font-semibold text-slate-700">${budgetMetrics.budgetReserved.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Card 2: Leadership & Authorized Contacts */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-sky-50 text-[#0089B3] flex items-center justify-center">
                  <Users className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">School Contacts</h3>
                  <p className="text-xs font-bold text-slate-800">Principal & Authorized Staff</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setContactsModalOpen(true)}
                className="text-xs font-semibold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200/70 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
              >
                Edit Info
              </button>
            </div>

            <div className="space-y-3 text-xs">
              {/* Principal Details */}
              <div className="bg-slate-50/70 border border-slate-100 rounded-xl p-3 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Designated Principal</span>
                  <span className="text-[10px] font-bold text-[#006E8F] bg-sky-50 px-1.5 py-0.2 rounded border border-sky-200/60">
                    Principal
                  </span>
                </div>
                <p className="font-bold text-slate-900 text-sm">
                  {school.principalName || <span className="text-slate-400 italic font-normal">Unassigned</span>}
                </p>
                <div className="text-[11px] text-slate-600 space-y-0.5 pt-0.5">
                  <p className="break-all"><span className="text-slate-400">Email:</span> {school.principalEmail || <span className="text-slate-400 italic font-normal">None</span>}</p>
                  <p><span className="text-slate-400">Direct Phone:</span> {school.principalPhone || school.phone || <span className="text-slate-400 italic font-normal">None</span>}</p>
                </div>
              </div>

              {/* Authorized Contacts */}
              <div className="pt-1">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    Authorized Contacts ({school.additionalContacts?.length || 0}/2)
                  </span>
                  {(school.additionalContacts?.length || 0) < 2 && (
                    <button
                      type="button"
                      onClick={() => setContactsModalOpen(true)}
                      className="text-[11px] font-bold text-[#006E8F] hover:underline cursor-pointer"
                    >
                      + Add
                    </button>
                  )}
                </div>

                {(!school.additionalContacts || school.additionalContacts.length === 0) ? (
                  <div className="p-2.5 bg-slate-50/50 border border-dashed border-slate-200 rounded-xl text-center">
                    <p className="text-[11px] text-slate-400 italic">No authorized contacts registered</p>
                    <button
                      type="button"
                      onClick={() => setContactsModalOpen(true)}
                      className="text-xs font-bold text-[#006E8F] hover:underline mt-0.5 inline-block cursor-pointer"
                    >
                      Add Authorized Contact
                    </button>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    {school.additionalContacts.map((ac) => {
                      const isPending = pendingInvites?.some(
                        (inv) => inv.email.toLowerCase() === ac.email.toLowerCase() && inv.status === 'pending'
                      );
                      const isRegistered = managedUsers?.some(
                        (u) => u.email.toLowerCase() === ac.email.toLowerCase() && u.status === 'active'
                      );
                      const wasJustInvited = invitedContactId === ac.id;

                      return (
                        <div
                          key={ac.id}
                          className="p-2.5 bg-slate-50 border border-slate-200/80 rounded-xl flex items-start justify-between gap-2"
                        >
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <p className="font-bold text-slate-900 text-xs truncate">{ac.name}</p>
                              <span className="text-[9px] font-semibold text-slate-500 bg-white px-1.5 py-0.2 rounded border border-slate-200">
                                {ac.jobTitle || 'Authorized Contact'}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-600 truncate break-all">{ac.email}</p>
                            {ac.phone && <p className="text-[10px] text-slate-400">{ac.phone}</p>}
                          </div>

                          <div className="shrink-0 flex items-center gap-1">
                            {isRegistered ? (
                              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">
                                Active
                              </span>
                            ) : wasJustInvited ? (
                              <span className="text-[10px] font-bold text-sky-700 bg-sky-50 border border-sky-200 px-1.5 py-0.5 rounded">
                                Sent!
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleInviteAuthorizedContact(ac)}
                                className="px-2 py-1 bg-white hover:bg-sky-50 text-[#006E8F] border border-sky-200 hover:border-sky-300 font-bold rounded-lg text-[10px] flex items-center gap-1 transition-colors cursor-pointer shadow-2xs"
                                title={`Send portal invite to ${ac.email}`}
                              >
                                <Mail className="w-3 h-3 text-[#0089B3]" />
                                {isPending ? 'Resend' : 'Invite'}
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Card 3: Funding & Compliance */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">Governance</h3>
                  <p className="text-xs font-bold text-slate-800">Funding & Compliance</p>
                </div>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              {/* Row 1: Assigned Funder */}
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-medium text-slate-400 block">Assigned Funder</span>
                  <p className="font-bold text-slate-900 mt-0.5 flex items-center gap-1.5">
                    <Briefcase className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>{school.funderName || 'Unassigned'}</span>
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedFunderId(
                      school.funderId && funders?.some((f) => f.id === school.funderId) ? school.funderId : ''
                    );
                    setFunderModalOpen(true);
                  }}
                  className="px-2.5 py-1 text-xs font-medium text-slate-700 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors cursor-pointer shadow-2xs"
                >
                  {school.funderId ? 'Change' : 'Assign'}
                </button>
              </div>

              {/* Row 2: MOU Agreement Status & Actions */}
              <div className="pt-2.5 border-t border-slate-100">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] font-medium text-slate-400">Annual MOU</span>
                    {school.hasCustomMou ? (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[10px] font-semibold bg-[#EDF7FC] text-[#006E8F] border border-[#0089B3]/30">
                        Override
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[10px] font-medium bg-slate-100 text-slate-600">
                        Default
                      </span>
                    )}
                  </div>
                  <span
                    className={`inline-flex items-center gap-1 text-xs font-semibold ${
                      school.currentMouSigned ? 'text-[#006E8F]' : 'text-amber-700'
                    }`}
                  >
                    {school.currentMouSigned ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5 text-[#0089B3]" /> Signed
                      </>
                    ) : (
                      <>
                        <Clock className="w-3.5 h-3.5 text-amber-600" /> Pending
                      </>
                    )}
                  </span>
                </div>

                {/* Assigned Version Title */}
                <div className="text-[11px] text-slate-600 font-medium truncate mb-1.5">
                  {school.hasCustomMou ? (
                    <span className="text-[#006E8F] flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-[#0089B3] shrink-0" />
                      <span className="truncate" title={effectiveSchoolMouVersion?.name}>
                        {effectiveSchoolMouVersion?.name || 'Custom Version Override'}
                      </span>
                    </span>
                  ) : (
                    <span className="text-slate-500 flex items-center gap-1">
                      <FileText className="w-3 h-3 text-slate-400 shrink-0" />
                      <span className="truncate" title={effectiveSchoolMouVersion?.name}>
                        {effectiveSchoolMouVersion?.name || 'Global Standard MOU'}
                      </span>
                    </span>
                  )}
                </div>

                {school.currentMouSigned && school.currentMouSignedBy && (
                  <p className="text-[11px] text-slate-500 mb-2">
                    Signed by <span className="font-semibold text-slate-700">{school.currentMouSignedBy}</span>
                    {school.currentMouSignedAt ? ` on ${new Date(school.currentMouSignedAt).toLocaleDateString()}` : ''}
                  </p>
                )}

                {school.hasCustomMou && school.customMouReason && (
                  <p className="text-[11px] text-slate-600 italic mb-2">
                    Note: {school.customMouReason}
                  </p>
                )}

                {/* Action Buttons in unified neutral group */}
                <div className="flex items-center gap-1.5 mt-2">
                  <button
                    type="button"
                    onClick={() => setPreviewMouModalOpen(true)}
                    className="flex-1 py-1 px-2 text-[11px] font-medium text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg flex items-center justify-center gap-1 transition-colors cursor-pointer shadow-2xs"
                  >
                    <Eye className="w-3 h-3 text-slate-400" />
                    Preview
                  </button>

                  <button
                    type="button"
                    onClick={handleOpenCustomMouModal}
                    className="flex-1 py-1 px-2 text-[11px] font-medium text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg flex items-center justify-center gap-1 transition-colors cursor-pointer shadow-2xs"
                  >
                    <Edit3 className="w-3 h-3 text-slate-400" />
                    {school.hasCustomMou ? 'Change MOU' : 'Override'}
                  </button>

                  <button
                    type="button"
                    onClick={() => setMouConfirmModalOpen(true)}
                    className="py-1 px-2.5 text-[11px] font-medium text-slate-600 hover:text-slate-800 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg transition-colors cursor-pointer shadow-2xs"
                    title={school.currentMouSigned ? 'Mark as unsigned' : 'Mark as signed'}
                  >
                    {school.currentMouSigned ? 'Mark Pending' : 'Mark Signed'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Requests Section */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs">
          <div>
            <h2 className="text-lg font-bold text-slate-900 tracking-tight" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
              EMERGENCY REQUESTS ({filteredSchoolRequests.length})
            </h2>
            <p className="text-xs text-slate-500">Filtered emergency grant requests for {school.name}</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center bg-slate-100 rounded-xl p-1 gap-1">
              <button
                type="button"
                onClick={() => setStatusFilter('all')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
                  statusFilter === 'all' ? 'bg-[#0F172A] text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                All
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('open')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
                  statusFilter === 'open' ? 'bg-[#0089B3] text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Open
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('action_needed')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
                  statusFilter === 'action_needed' ? 'bg-amber-600 text-white shadow-2xs' : 'text-amber-800 hover:text-amber-950'
                }`}
              >
                Action Needed
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('paid')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
                  statusFilter === 'paid' ? 'bg-[#006E8F] text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Paid
              </button>
            </div>
          </div>
        </div>
        <RequestsTable
          requests={filteredSchoolRequests}
          isAdminView
          onCancelRequest={onCancelRequest}
        />
      </div>

      {/* School Activity Log Section */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-6 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-[#0F172A] text-white rounded-xl shadow-2xs">
              <History className="w-5 h-5 text-[#A5E3F6]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-900 tracking-tight" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
                  SCHOOL ACTIVITY & AUDIT LOG
                </h2>
                <span className="px-2.5 py-0.5 rounded-full bg-slate-100 border border-slate-200 text-slate-700 font-semibold text-xs">
                  {schoolLogs.length} events
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Complete audit trail for {school.name}: contacts, principal updates, email comms, requests, status changes, internal notes & actions
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Category Filter Pills */}
            <div className="flex items-center bg-slate-100 rounded-xl p-1 gap-1 flex-wrap">
              <button
                type="button"
                onClick={() => setLogCategoryFilter('all')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
                  logCategoryFilter === 'all'
                    ? 'bg-[#0F172A] text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                All Events
              </button>
              <button
                type="button"
                onClick={() => setLogCategoryFilter('requests')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
                  logCategoryFilter === 'requests'
                    ? 'bg-[#0089B3] text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Requests
              </button>
              <button
                type="button"
                onClick={() => setLogCategoryFilter('comms')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
                  logCategoryFilter === 'comms'
                    ? 'bg-[#006E8F] text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Email Comms
              </button>
              <button
                type="button"
                onClick={() => setLogCategoryFilter('contacts_leadership')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
                  logCategoryFilter === 'contacts_leadership'
                    ? 'bg-slate-800 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Contacts
              </button>
              <button
                type="button"
                onClick={() => setLogCategoryFilter('budget_mou')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
                  logCategoryFilter === 'budget_mou'
                    ? 'bg-slate-700 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Budget & MOU
              </button>
              <button
                type="button"
                onClick={() => setLogCategoryFilter('notes')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
                  logCategoryFilter === 'notes'
                    ? 'bg-amber-600 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Internal Notes
              </button>
            </div>

            {/* Log Search */}
            <div className="relative min-w-[200px]">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search log history..."
                value={logSearchQuery}
                onChange={(e) => setLogSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:border-[#0089B3] focus:ring-1 focus:ring-[#0089B3]"
              />
            </div>
          </div>
        </div>

        {/* Add Internal School Note Form */}
        <form onSubmit={handlePostNoteSubmit} className="bg-slate-50 rounded-xl p-4 border border-slate-200/90 space-y-3 text-xs">
          <div className="flex items-center justify-between">
            <label className="font-semibold text-slate-800 flex items-center gap-1.5">
              <MessageSquare className="w-4 h-4 text-[#0089B3]" />
              Add Confidential Internal Note for {school.name}
            </label>
            {noteSuccess && (
              <span className="text-[#006E8F] font-semibold flex items-center gap-1 text-[11px] animate-fade-in">
                <CheckCircle2 className="w-3.5 h-3.5" /> Note saved to school activity log!
              </span>
            )}
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              value={newSchoolNoteText}
              onChange={(e) => setNewSchoolNoteText(e.target.value)}
              placeholder="e.g. Discussed 2026-2027 MOU terms with principal. Awaiting board signature."
              className="flex-1 px-3.5 py-2 bg-white border border-slate-300 rounded-xl font-medium focus:outline-none focus:border-[#0089B3] focus:ring-1 focus:ring-[#0089B3] text-xs shadow-2xs"
            />
            <button
              type="submit"
              disabled={!newSchoolNoteText.trim()}
              className="px-4 py-2 bg-[#0F172A] hover:bg-slate-800 disabled:opacity-50 text-white font-semibold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-2xs whitespace-nowrap"
            >
              <Send className="w-3.5 h-3.5" />
              Log Activity
            </button>
          </div>
        </form>

        {/* Log Entries List */}
        {filteredSchoolLogs.length === 0 ? (
          <div className="py-12 text-center border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
            <History className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-slate-600 font-semibold text-xs">No activity log entries found</p>
            <p className="text-slate-400 text-[11px] mt-1">
              {logSearchQuery || logCategoryFilter !== 'all'
                ? 'Try clearing your filters or search query.'
                : 'Activity events and status updates will appear here automatically.'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {paginatedLogs.map((log) => {
              const formattedDate = new Date(log.timestamp).toLocaleString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
                hour: 'numeric',
                minute: '2-digit',
                hour12: true,
              });

              return (
                <div
                  key={log.id}
                  className={`p-4 rounded-xl border transition-all text-xs flex flex-col sm:flex-row sm:items-start justify-between gap-3 ${
                    log.isInternalNote
                      ? 'bg-amber-50/60 border-amber-200/80'
                      : 'bg-white border-slate-200 hover:border-slate-300 shadow-2xs'
                  }`}
                >
                  <div className="flex items-start gap-3 flex-1">
                    <div
                      className={`p-2 rounded-xl shrink-0 mt-0.5 ${
                        log.isInternalNote
                          ? 'bg-amber-100/80 border border-amber-300'
                          : 'bg-slate-100 border border-slate-200'
                      }`}
                    >
                      {renderLogIcon(log)}
                    </div>

                    <div className="space-y-1.5 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-bold text-slate-900">{log.actorName}</span>
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[10px] font-bold uppercase border border-slate-200">
                          {log.actorRole}
                        </span>

                        <span className="px-2 py-0.5 rounded-md bg-slate-100 font-bold text-slate-700 text-[10px] uppercase border border-slate-200">
                          {getLogBadgeLabel(log)}
                        </span>

                        {log.requestId && (
                          <Link
                            to={`/admin/requests/${log.requestId}`}
                            className="inline-flex items-center gap-0.5 font-bold text-[#006E8F] hover:text-[#0089B3] hover:underline bg-[#EDF7FC] px-2 py-0.5 rounded-md border border-[#0089B3]/30 text-[11px]"
                          >
                            <span>{log.requestId}</span>
                            <ArrowUpRight className="w-3 h-3" />
                          </Link>
                        )}
                      </div>

                      <p className="text-slate-800 font-medium leading-relaxed">{log.message}</p>

                      {(log.fromStatus || log.toStatus) && (
                        <div className="flex items-center gap-1.5 text-[11px] text-slate-500 pt-0.5">
                          <span>Status transition:</span>
                          {log.fromStatus && (
                            <span className="font-semibold text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">
                              {log.fromStatus.replace(/_/g, ' ')}
                            </span>
                          )}
                          <span>→</span>
                          {log.toStatus && (
                            <span className="font-semibold text-[#006E8F] bg-[#EDF7FC] border border-[#0089B3]/30 px-1.5 py-0.5 rounded">
                              {log.toStatus.replace(/_/g, ' ')}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="shrink-0 text-right sm:self-start text-[11px] text-slate-400 font-medium">
                    {formattedDate}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Activity Log Pagination Footer */}
        {filteredSchoolLogs.length > 0 && (
          <div className="border-t border-slate-100 pt-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600">
            <div className="flex items-center gap-3">
              <span>
                Showing <span className="font-semibold text-slate-900">{logStartIndex + 1}</span> to{' '}
                <span className="font-semibold text-slate-900">
                  {Math.min(logStartIndex + logPageSize, filteredSchoolLogs.length)}
                </span>{' '}
                of <span className="font-semibold text-slate-900">{filteredSchoolLogs.length}</span> activity logs
              </span>

              <div className="flex items-center gap-1.5 pl-3 border-l border-slate-200">
                <span className="text-slate-500 font-medium">Per page:</span>
                <select
                  value={logPageSize}
                  onChange={(e) => {
                    setLogPageSize(Number(e.target.value));
                    setLogCurrentPage(1);
                  }}
                  className="bg-white border border-slate-300 rounded-lg px-2 py-1 text-xs font-semibold text-slate-800 shadow-2xs focus:border-[#0089B3] focus:ring-1 focus:ring-[#0089B3] focus:outline-none cursor-pointer"
                >
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setLogCurrentPage(1)}
                disabled={safeLogCurrentPage === 1}
                className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                title="First Page"
              >
                <ChevronsLeft className="w-4 h-4 text-slate-700" />
              </button>
              <button
                type="button"
                onClick={() => setLogCurrentPage((p) => Math.max(1, p - 1))}
                disabled={safeLogCurrentPage === 1}
                className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                title="Previous Page"
              >
                <ChevronLeft className="w-4 h-4 text-slate-700" />
              </button>

              <span className="px-3 text-xs font-bold text-slate-800">
                Page {safeLogCurrentPage} of {totalLogPages}
              </span>

              <button
                type="button"
                onClick={() => setLogCurrentPage((p) => Math.min(totalLogPages, p + 1))}
                disabled={safeLogCurrentPage === totalLogPages}
                className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                title="Next Page"
              >
                <ChevronRight className="w-4 h-4 text-slate-700" />
              </button>
              <button
                type="button"
                onClick={() => setLogCurrentPage(totalLogPages)}
                disabled={safeLogCurrentPage === totalLogPages}
                className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                title="Last Page"
              >
                <ChevronsRight className="w-4 h-4 text-slate-700" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Budget Adjustment Modal */}
      {budgetModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 max-w-md w-full space-y-4 shadow-2xl text-xs">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-sm font-bold text-slate-900">Adjust School Budget Allocation</h3>
              <button
                onClick={() => setBudgetModalOpen(false)}
                className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleConfirmBudgetAdjust} className="space-y-3">
              <div>
                <label className="block font-bold mb-1 text-slate-700">Adjustment Amount ($ positive or negative)</label>
                <input
                  type="number"
                  value={adjustmentAmount}
                  onChange={(e) => setAdjustmentAmount(Number(e.target.value))}
                  required
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-bold focus:border-[#0089B3] focus:ring-1 focus:ring-[#0089B3] focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold mb-1 text-slate-700">Ledger Justification / Reason *</label>
                <input
                  type="text"
                  value={adjustmentReason}
                  onChange={(e) => setAdjustmentReason(e.target.value)}
                  placeholder="e.g. Mid-year grant top-up allocation from Oak Foundation"
                  required
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-medium focus:border-[#0089B3] focus:ring-1 focus:ring-[#0089B3] focus:outline-none"
                />
              </div>

              <div className="flex gap-2 justify-end pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setBudgetModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 rounded-xl font-semibold cursor-pointer hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#0089B3] hover:bg-[#006E8F] text-white font-bold rounded-xl cursor-pointer shadow-xs"
                >
                  Confirm Adjustment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Send Custom Email Communication Modal */}
      {emailModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 max-w-lg w-full space-y-4 shadow-2xl text-xs">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-[#0089B3]" />
                <h3 className="text-sm font-bold text-slate-900">Send Email Communication to {school.name}</h3>
              </div>
              <button
                onClick={() => setEmailModalOpen(false)}
                className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSendCustomEmail} className="space-y-3">
              <div>
                <label className="block font-bold mb-1 text-slate-700">Recipient Email Address</label>
                <input
                  type="email"
                  value={emailRecipient}
                  onChange={(e) => setEmailRecipient(e.target.value)}
                  required
                  placeholder="e.g. sjenkins@lincolnhs.edu"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-medium focus:border-[#0089B3] focus:ring-1 focus:ring-[#0089B3] focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold mb-1 text-slate-700">Subject Line *</label>
                <input
                  type="text"
                  value={emailSubject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                  required
                  placeholder="e.g. Urgent: Updated Emergency Fund Disbursement Guidelines"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-bold focus:border-[#0089B3] focus:ring-1 focus:ring-[#0089B3] focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold mb-1 text-slate-700">Message Content *</label>
                <textarea
                  rows={4}
                  value={emailBody}
                  onChange={(e) => setEmailBody(e.target.value)}
                  required
                  placeholder="Type message body to be dispatched to school leadership and recorded to school activity audit log..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-medium focus:border-[#0089B3] focus:ring-1 focus:ring-[#0089B3] focus:outline-none"
                />
              </div>

              <div className="p-3 bg-[#EDF7FC] border border-[#0089B3]/30 rounded-xl text-[11px] text-[#006E8F]">
                <p className="font-semibold">
                  Sending will dispatch the email communication to the designated recipient and record a verified record in this school's activity log.
                </p>
              </div>

              <div className="flex gap-2 justify-end pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setEmailModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 rounded-xl font-semibold cursor-pointer hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#0089B3] hover:bg-[#006E8F] text-white font-bold rounded-xl cursor-pointer flex items-center gap-1.5 shadow-xs"
                >
                  <Send className="w-3.5 h-3.5" />
                  Dispatch Email Comms
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Leadership & Additional Contacts Modal */}
      {contactsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 max-w-lg w-full space-y-4 shadow-2xl text-xs max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-[#0089B3]" />
                <h3 className="text-sm font-bold text-slate-900">Manage Leadership & Contact Roster</h3>
              </div>
              <button
                onClick={() => setContactsModalOpen(false)}
                className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveLeadershipAndContacts} className="space-y-4">
              {/* Principal Info */}
              <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <h4 className="font-bold text-slate-900 flex items-center gap-1.5 text-xs">
                  <User className="w-3.5 h-3.5 text-[#0089B3]" />
                  Primary Principal Contact
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold mb-1 text-slate-700">Principal Name</label>
                    <input
                      type="text"
                      value={editPrincipalName}
                      onChange={(e) => setEditPrincipalName(e.target.value)}
                      required
                      className="w-full px-3 py-2 border rounded-xl font-bold bg-white focus:border-[#0089B3] focus:ring-1 focus:ring-[#0089B3] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-bold mb-1 text-slate-700">Principal Email</label>
                    <input
                      type="email"
                      value={editPrincipalEmail}
                      onChange={(e) => setEditPrincipalEmail(e.target.value)}
                      required
                      className="w-full px-3 py-2 border rounded-xl font-bold bg-white focus:border-[#0089B3] focus:ring-1 focus:ring-[#0089B3] focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold mb-1 text-slate-700">Direct Phone</label>
                  <input
                    type="text"
                    value={editPrincipalPhone}
                    onChange={(e) => setEditPrincipalPhone(e.target.value)}
                    className="w-full px-3 py-2 border rounded-xl font-medium bg-white focus:border-[#0089B3] focus:ring-1 focus:ring-[#0089B3] focus:outline-none"
                  />
                </div>
              </div>

              {/* Authorized Contacts */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-slate-900 flex items-center gap-1.5 text-xs">
                      <Users className="w-3.5 h-3.5 text-[#0089B3]" />
                      Authorized Contacts ({editAdditionalContacts.length}/2)
                    </h4>
                    <p className="text-[10px] text-slate-500">Staff permitted to submit emergency funding requests on behalf of this school</p>
                  </div>
                  {editAdditionalContacts.length < 2 && (
                    <button
                      type="button"
                      onClick={() =>
                        setEditAdditionalContacts([
                          ...editAdditionalContacts,
                          { id: `AC-${Date.now()}`, name: '', email: '', phone: '', jobTitle: '' },
                        ])
                      }
                      className="text-xs font-bold text-[#006E8F] hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Add Contact
                    </button>
                  )}
                </div>

                <div className="p-2.5 bg-sky-50/80 border border-sky-200/70 rounded-xl text-[11px] text-sky-900 flex items-center gap-2">
                  <Sparkles className="w-3.5 h-3.5 text-[#0089B3] shrink-0" />
                  <span>Newly added contacts will automatically receive a portal invitation email to complete their setup.</span>
                </div>

                {editAdditionalContacts.length === 0 ? (
                  <p className="text-slate-400 italic text-[11px]">No authorized contacts added yet. Click above to register assistant principals or staff.</p>
                ) : (
                  <div className="space-y-3">
                    {editAdditionalContacts.map((c, index) => (
                      <div key={c.id || index} className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2 relative">
                        <button
                          type="button"
                          onClick={() => setEditAdditionalContacts(editAdditionalContacts.filter((_, i) => i !== index))}
                          className="absolute top-2 right-2 p-1 text-slate-400 hover:text-red-600 cursor-pointer"
                          title="Remove Contact"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <input
                            type="text"
                            placeholder="Full Name"
                            value={c.name}
                            onChange={(e) => {
                              const updated = [...editAdditionalContacts];
                              updated[index].name = e.target.value;
                              setEditAdditionalContacts(updated);
                            }}
                            className="px-2.5 py-1.5 border rounded-lg bg-white font-bold focus:border-[#0089B3] focus:outline-none"
                          />
                          <input
                            type="email"
                            placeholder="Email Address"
                            value={c.email}
                            onChange={(e) => {
                              const updated = [...editAdditionalContacts];
                              updated[index].email = e.target.value;
                              setEditAdditionalContacts(updated);
                            }}
                            className="px-2.5 py-1.5 border rounded-lg bg-white font-bold focus:border-[#0089B3] focus:outline-none"
                          />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <input
                            type="text"
                            placeholder="Job Title (e.g. Vice Principal)"
                            value={c.jobTitle || ''}
                            onChange={(e) => {
                              const updated = [...editAdditionalContacts];
                              updated[index].jobTitle = e.target.value;
                              setEditAdditionalContacts(updated);
                            }}
                            className="px-2.5 py-1.5 border rounded-lg bg-white text-[11px] focus:border-[#0089B3] focus:outline-none"
                          />
                          <input
                            type="text"
                            placeholder="Phone (optional)"
                            value={c.phone || ''}
                            onChange={(e) => {
                              const updated = [...editAdditionalContacts];
                              updated[index].phone = e.target.value;
                              setEditAdditionalContacts(updated);
                            }}
                            className="px-2.5 py-1.5 border rounded-lg bg-white text-[11px] focus:border-[#0089B3] focus:outline-none"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex gap-2 justify-end pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setContactsModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 rounded-xl font-semibold cursor-pointer hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#0089B3] hover:bg-[#006E8F] text-white font-bold rounded-xl cursor-pointer shadow-xs"
                >
                  Save & Update Log
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Assign Funder Modal */}
      {funderModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <form
            onSubmit={handleSaveFunder}
            className="bg-white rounded-2xl p-6 max-w-md w-full space-y-4 shadow-2xl text-xs"
          >
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-[#0089B3]" />
                Assign Funder for {school.name}
              </h3>
              <button
                type="button"
                onClick={() => setFunderModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <label className="block font-bold mb-1.5 text-slate-700">Select Funding Entity</label>
              <select
                value={selectedFunderId}
                onChange={(e) => setSelectedFunderId(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl font-medium focus:border-[#0089B3] focus:ring-1 focus:ring-[#0089B3] text-xs bg-white focus:outline-none"
              >
                <option value="">Unassigned</option>
                {funders?.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name} ({f.type})
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-slate-500 mt-2 leading-relaxed">
                Assigning a funder associates this school with the funder's profile for tracking and reporting purposes.
              </p>
            </div>

            <div className="flex gap-2 justify-end pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setFunderModalOpen(false)}
                className="px-4 py-2 border rounded-xl font-semibold text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-[#0089B3] hover:bg-[#006E8F] text-white font-bold rounded-xl shadow-xs cursor-pointer"
              >
                Save Funder Assignment
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Invite Details Modal */}
      {inviteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-3xl p-6 md:p-8 max-w-lg w-full space-y-5 text-xs shadow-2xl border border-slate-200">
            <div className="flex justify-between items-start border-b pb-4">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 bg-amber-50 px-2.5 py-1 rounded-md border border-amber-200">
                  Onboarding Invitation Status
                </span>
                <h3 className="text-lg font-bold text-slate-900 mt-1.5" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
                  {school.name.toUpperCase()}
                </h3>
                <p className="text-slate-500">{school.address}, {school.city}</p>
              </div>
              <button
                onClick={() => setInviteModalOpen(false)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-200">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-500 font-semibold">Designated Principal:</span>
                <span className="font-bold text-slate-900">{school.principalName || 'David Miller'}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-500 font-semibold">Principal Email:</span>
                <span className="font-mono text-slate-800">{school.principalEmail || 'dmiller@southed.org'}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-500 font-semibold">MOU Compliance:</span>
                <span className="text-amber-700 font-bold bg-amber-100 px-2 py-0.5 rounded-md text-[10px]">
                  {school.currentMouSigned ? 'Signed & Active' : 'Pending Signature upon Sign-In'}
                </span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-500 font-semibold">Allocated Emergency Fund:</span>
                <span className="font-bold text-[#006E8F]">${(school.annualBudget || 10000).toLocaleString()}</span>
              </div>
            </div>

            <div className="bg-[#0F172A] text-slate-100 p-4 rounded-2xl space-y-2 font-mono text-xs">
              <div className="text-[11px] text-slate-400 font-sans">Principal Account Setup Direct Link:</div>
              <div className="p-2.5 bg-slate-800 rounded-xl text-[#A5E3F6] font-bold break-all flex items-center justify-between gap-2">
                <span>{`${PRODUCTION_PORTAL_URL}/setup-account?email=${encodeURIComponent(school.principalEmail || '')}`}</span>
                <button
                  type="button"
                  onClick={() => {
                    const setupUrl = `${PRODUCTION_PORTAL_URL}/setup-account?email=${encodeURIComponent(school.principalEmail || '')}`;
                    navigator.clipboard.writeText(setupUrl);
                    setCopiedLink(true);
                    setTimeout(() => setCopiedLink(false), 2000);
                  }}
                  className="px-3 py-1 bg-[#0089B3] hover:bg-[#006E8F] text-white rounded-lg font-sans text-[11px] font-bold shrink-0 flex items-center gap-1 cursor-pointer"
                >
                  {copiedLink ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  {copiedLink ? 'Copied' : 'Copy'}
                </button>
              </div>
            </div>

            {/* Email Template System Preview */}
            {(() => {
              const rendered = renderInviteEmail(settings?.emailTemplates || [], {
                recipient_name: school.principalName || 'Principal',
                school_name: school.name,
                amount: (school.annualBudget || 10000).toLocaleString(),
                invite_link: `${PRODUCTION_PORTAL_URL}/setup-account?email=${encodeURIComponent(school.principalEmail || '')}`,
              });
              return (
                <div className="space-y-1.5 border-t pt-3">
                  <div className="flex justify-between items-center text-[11px] font-bold text-slate-600">
                    <span>Configured Email Template Preview:</span>
                    <span className="text-[#006E8F] font-mono text-[10px]">{rendered.template?.name}</span>
                  </div>
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 font-mono text-[11px] text-slate-700 whitespace-pre-wrap leading-relaxed max-h-36 overflow-y-auto">
                    <div className="font-bold text-slate-900 border-b pb-1 mb-2">Subject: {rendered.subject}</div>
                    {rendered.body}
                  </div>
                </div>
              );
            })()}

            <div className="flex justify-between items-center pt-2">
              <button
                type="button"
                onClick={() => {
                  handleSendInvite();
                  setInviteModalOpen(false);
                }}
                className="px-4 py-2 bg-[#0F172A] hover:bg-slate-800 text-white font-bold rounded-xl text-xs flex items-center gap-2 cursor-pointer"
              >
                <Mail className="w-3.5 h-3.5 text-[#A5E3F6]" />
                Resend Email Invitation
              </button>
              <button
                type="button"
                onClick={() => setInviteModalOpen(false)}
                className="px-4 py-2 border border-slate-300 rounded-xl font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom MOU Override Modal */}
      {customMouModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-3xl p-6 md:p-8 max-w-4xl w-full space-y-5 text-xs shadow-2xl border border-slate-200 max-h-[92vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex justify-between items-start border-b pb-4 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#EDF7FC] border border-[#0089B3]/30 text-[#0089B3] flex items-center justify-center shrink-0">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-slate-900" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
                      MOU VERSION OVERRIDE
                    </h3>
                    {school.hasCustomMou ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#EDF7FC] text-[#006E8F] border border-[#0089B3]/30">
                        Override Active
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                        Global Default Active
                      </span>
                    )}
                  </div>
                  <p className="text-slate-500 text-[11px] mt-0.5">
                    Select an MOU version built in <strong>Admin Settings &rarr; MOU Versions</strong> to apply specifically to <strong>{school.name}</strong>.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setCustomMouModalOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Summary & Link to Settings */}
            <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-slate-50 border border-slate-200 rounded-2xl shrink-0">
              <div className="flex items-center gap-2 text-[11px] text-slate-600">
                <span className="font-semibold text-slate-800">Current Global Default:</span>
                <span className="px-2 py-0.5 bg-white border border-slate-200 rounded-md font-bold text-slate-700">
                  {defaultMouVersion?.name || 'Default MOU'}
                </span>
                <span className="text-slate-400 hidden sm:inline">(Used by schools without an override)</span>
              </div>

              <Link
                to="/admin/settings"
                target="_blank"
                rel="noreferrer"
                className="text-xs text-[#0089B3] hover:text-[#006E8F] font-bold flex items-center gap-1 hover:underline"
              >
                <span>Manage MOU Versions in Settings</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </Link>
            </div>

            {/* Form */}
            <form onSubmit={handleSaveCustomMou} className="flex-1 flex flex-col min-h-0 space-y-4">
              {/* Two-panel: Version selector on left, live preview on right */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4 flex-1 min-h-0">
                {/* Left: Version Selector list */}
                <div className="md:col-span-5 flex flex-col min-h-0 space-y-2">
                  <div className="flex items-center justify-between text-[11px] text-slate-600 shrink-0">
                    <span className="font-bold text-slate-800">Available Versions ({mouVersions.length})</span>
                    <span className="text-slate-400">Click to preview</span>
                  </div>

                  <div className="flex-1 overflow-y-auto space-y-2 pr-1 scrollbar-thin max-h-72 md:max-h-[340px]">
                    {mouVersions.map((v) => {
                      const isDefault = v.id === defaultMouVersionId;
                      const isSelected = selectedMouVersionId === v.id;
                      const isCurrentSchoolVersion =
                        (school.hasCustomMou && school.customMouVersionId === v.id) ||
                        (!school.hasCustomMou && isDefault);

                      return (
                        <div
                          key={v.id}
                          onClick={() => setSelectedMouVersionId(v.id)}
                          className={`p-3 rounded-2xl border transition-all cursor-pointer text-left relative ${
                            isSelected
                              ? 'border-[#0089B3] bg-[#EDF7FC]/70 ring-2 ring-[#0089B3]/40 shadow-xs'
                              : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/70'
                          }`}
                        >
                          <div className="flex items-start gap-2.5">
                            <div className="pt-0.5">
                              <input
                                type="radio"
                                name="mouVersionSelection"
                                checked={isSelected}
                                onChange={() => setSelectedMouVersionId(v.id)}
                                className="text-[#0089B3] focus:ring-[#0089B3] cursor-pointer"
                              />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap mb-1">
                                <h4 className="font-bold text-slate-900 text-xs leading-snug">
                                  {v.name}
                                </h4>
                              </div>

                              <div className="flex items-center gap-1.5 flex-wrap">
                                {isDefault ? (
                                  <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                                    Global Default
                                  </span>
                                ) : (
                                  <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-[#EDF7FC] text-[#006E8F] border border-[#0089B3]/30">
                                    Non-Default Version
                                  </span>
                                )}

                                {isCurrentSchoolVersion && (
                                  <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                    Active on School
                                  </span>
                                )}
                              </div>

                              <p className="text-[10px] text-slate-400 mt-1.5">
                                {v.createdAt ? `Created ${new Date(v.createdAt).toLocaleDateString()}` : 'Configured Version'} · {(v.content || '').length.toLocaleString()} characters
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Right: Document Preview */}
                <div className="md:col-span-7 flex flex-col min-h-0 space-y-1.5">
                  {(() => {
                    const previewVersion = mouVersions.find((v) => v.id === selectedMouVersionId) || defaultMouVersion;
                    const isPreviewDefault = previewVersion?.id === defaultMouVersionId;

                    return (
                      <>
                        <div className="flex justify-between items-center text-[11px] text-slate-600 shrink-0">
                          <span className="font-bold text-slate-800 truncate pr-2">
                            Preview: {previewVersion?.name}
                          </span>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold shrink-0 ${
                            isPreviewDefault
                              ? 'bg-slate-100 text-slate-600'
                              : 'bg-[#EDF7FC] text-[#006E8F] border border-[#0089B3]/30'
                          }`}>
                            {isPreviewDefault ? 'Standard Default Agreement' : 'Selected Override Version'}
                          </span>
                        </div>

                        <div className="w-full flex-1 p-4 border border-slate-200 bg-slate-50/60 rounded-2xl overflow-y-auto max-h-72 md:max-h-[340px] scrollbar-thin">
                          {previewVersion?.content ? (
                            <div className="prose prose-slate prose-xs max-w-none text-slate-800 leading-relaxed">
                              <ReactMarkdown>{previewVersion.content}</ReactMarkdown>
                            </div>
                          ) : (
                            <p className="text-slate-400 italic text-center py-8">
                              No agreement text available for this version.
                            </p>
                          )}
                        </div>
                      </>
                    );
                  })()}
                </div>
              </div>

              {/* Justification & Re-Signature Settings */}
              <div className="space-y-3 pt-2 border-t border-slate-200 shrink-0">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Override Justification / Reason (Optional audit log)
                  </label>
                  <input
                    type="text"
                    value={customMouReason}
                    onChange={(e) => setCustomMouReason(e.target.value)}
                    placeholder="e.g., Assigned non-default 2024 Participation Agreement per district counsel agreement"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:outline-none focus:border-[#0089B3] bg-white"
                  />
                </div>

                {school.currentMouSigned && (
                  <label className="flex items-start gap-2 p-2.5 bg-amber-50 border border-amber-200 rounded-xl cursor-pointer">
                    <input
                      type="checkbox"
                      checked={customMouResetSignature}
                      onChange={(e) => setCustomMouResetSignature(e.target.checked)}
                      className="rounded text-amber-600 focus:ring-amber-500 mt-0.5"
                    />
                    <div className="text-[11px] text-amber-900">
                      <strong className="block font-bold">Reset School MOU Status to "Pending Signature"</strong>
                      <span className="text-amber-700/90 text-[10px]">
                        The school currently has an executed MOU on file. Check this box to require the principal to review and electronically sign this newly assigned version during their next session.
                      </span>
                    </div>
                  </label>
                )}
              </div>

              {/* Modal Footer Actions */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-200 shrink-0">
                <div>
                  {school.hasCustomMou && (
                    <button
                      type="button"
                      onClick={handleRevertToStandardMou}
                      className="px-3.5 py-2 bg-white hover:bg-red-50 text-red-600 border border-red-200 rounded-xl font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-colors shadow-2xs"
                    >
                      <RotateCcw className="w-3.5 h-3.5 text-red-500" />
                      Revert to Global Default MOU
                    </button>
                  )}
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setCustomMouModalOpen(false)}
                    className="px-4 py-2 border border-slate-300 rounded-xl font-semibold text-slate-700 hover:bg-slate-100 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-[#0089B3] hover:bg-[#006E8F] text-white font-bold rounded-xl shadow-xs cursor-pointer flex items-center gap-1.5 transition-colors"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    {selectedMouVersionId === defaultMouVersionId
                      ? 'Apply Global Default MOU'
                      : `Save MOU Override for ${school.name}`}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MOU Preview Modal for Admin */}
      {previewMouModalOpen && (
        <MouModal
          isOpen={previewMouModalOpen}
          onClose={() => setPreviewMouModalOpen(false)}
          school={school}
          mouVersions={settings?.mouVersions}
          currentMouVersionId={settings?.currentMouVersionId}
          maxPerRequestAmount={settings?.maxPerRequestAmount || 2000}
          readOnly={true}
          onSignMou={() => {}}
        />
      )}

      {/* Delete School Confirmation Modal */}
      {deleteModalOpen && school && onDeleteSchool && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-3xl p-6 md:p-8 max-w-md w-full space-y-5 text-xs shadow-2xl border border-slate-200">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-600 rounded-2xl shrink-0">
                <Trash2 className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-slate-900">Delete Partner School</h3>
                <p className="text-slate-600 leading-relaxed text-xs">
                  Are you sure you want to permanently delete{' '}
                  <span className="font-semibold text-slate-900">{school.name}</span>?
                </p>
              </div>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-1.5 text-[11px] text-slate-600">
              <div className="flex justify-between">
                <span>Principal:</span>
                <span className="font-medium text-slate-900">{school.principalName || 'Unassigned'}</span>
              </div>
              <div className="flex justify-between">
                <span>Annual Allocation:</span>
                <span className="font-medium text-slate-900">${(school.annualBudget || 0).toLocaleString()}</span>
              </div>
            </div>

            <p className="text-[11px] text-rose-600 bg-rose-50/80 p-2.5 rounded-xl border border-rose-100">
              ⚠️ This action will permanently remove this school document from Firestore.
            </p>

            <div className="flex justify-end items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteModalOpen(false)}
                disabled={isDeleting}
                className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 font-medium rounded-xl text-xs cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  setIsDeleting(true);
                  try {
                    await onDeleteSchool(school.id);
                    navigate('/admin/schools');
                  } catch (err) {
                    console.error('Failed to delete school:', err);
                    setIsDeleting(false);
                  }
                }}
                disabled={isDeleting}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-medium rounded-xl text-xs flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors disabled:opacity-50"
              >
                {isDeleting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                <span>{isDeleting ? 'Deleting...' : 'Confirm Delete'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Admin MOU Status Toggle Confirmation Modal */}
      {mouConfirmModalOpen && school && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-3xl p-6 md:p-8 max-w-lg w-full space-y-5 text-xs shadow-2xl border border-slate-200">
            <div className="flex items-start gap-4">
              <div
                className={`p-3 rounded-2xl shrink-0 ${
                  school.currentMouSigned
                    ? 'bg-amber-50 border border-amber-200 text-amber-700'
                    : 'bg-[#EDF7FC] border border-[#0089B3]/20 text-[#0089B3]'
                }`}
              >
                {school.currentMouSigned ? (
                  <AlertCircle className="w-6 h-6" />
                ) : (
                  <FileCheck className="w-6 h-6" />
                )}
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-slate-900">
                  {school.currentMouSigned
                    ? 'Mark MOU as Pending Signature?'
                    : 'Manually Mark MOU as Signed & Active?'}
                </h3>
                <p className="text-slate-600 leading-relaxed text-xs">
                  {school.currentMouSigned ? (
                    <>
                      Are you sure you want to change the MOU status for{' '}
                      <strong className="text-slate-900">{school.name}</strong> to{' '}
                      <span className="font-semibold text-amber-700">Pending Signature</span>?
                    </>
                  ) : (
                    <>
                      Are you sure you want to manually mark the Annual MOU for{' '}
                      <strong className="text-slate-900">{school.name}</strong> as{' '}
                      <span className="font-semibold text-emerald-700">Signed & Active</span>?
                    </>
                  )}
                </p>
              </div>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-2 text-[11px] text-slate-600 leading-relaxed">
              <div className="flex justify-between border-b border-slate-200/60 pb-1.5">
                <span className="text-slate-500">School:</span>
                <span className="font-semibold text-slate-900">{school.name}</span>
              </div>
              <div className="flex justify-between border-b border-slate-200/60 pb-1.5">
                <span className="text-slate-500">Principal:</span>
                <span className="font-medium text-slate-800">{school.principalName || 'Unassigned'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Current MOU Status:</span>
                <span className={`font-semibold ${school.currentMouSigned ? 'text-emerald-700' : 'text-amber-700'}`}>
                  {school.currentMouSigned ? 'Signed & Active' : 'Pending Signature'}
                </span>
              </div>
            </div>

            {school.currentMouSigned ? (
              <p className="text-[11px] text-amber-800 bg-amber-50 p-3 rounded-xl border border-amber-200 leading-relaxed">
                ⚠️ <strong>Impact:</strong> This will revoke active MOU compliance for this school. The school dashboard and emergency request forms will be hard-locked, preventing school staff from submitting any new emergency requests until an MOU is signed.
              </p>
            ) : (
              <p className="text-[11px] text-[#006E8F] bg-[#EDF7FC] p-3 rounded-xl border border-[#0089B3]/20 leading-relaxed">
                ℹ️ <strong>Impact:</strong> This will authorize the school to submit emergency fund requests immediately. An administrative audit log will permanently record that you ({userProfile?.displayName || userProfile?.email || 'Administrator'}) executed this override.
              </p>
            )}

            <div className="flex justify-end items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setMouConfirmModalOpen(false)}
                className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 font-medium rounded-xl text-xs cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmToggleMou}
                className={`px-4 py-2 font-medium rounded-xl text-xs flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors text-white ${
                  school.currentMouSigned
                    ? 'bg-amber-600 hover:bg-amber-700'
                    : 'bg-[#0089B3] hover:bg-[#007399]'
                }`}
              >
                <Check className="w-3.5 h-3.5" />
                <span>
                  {school.currentMouSigned ? 'Yes, Mark as Pending' : 'Yes, Mark as Signed'}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
