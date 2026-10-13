import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import {
  User,
  Search,
  ChevronLeft,
  ChevronRight,
  Lock,
  ShieldCheck,
  CheckCircle2,
  Save,
  KeyRound,
  Smartphone,
  ArrowLeft,
  Sparkles,
  Shield,
  Clock,
  Send,
  Copy,
  Trash2,
  Ban,
  RotateCcw,
  AlertTriangle,
  Activity,
  Users,
  Plus,
  Mail,
  UserPlus,
  X,
} from 'lucide-react';
import { doc, getDoc, query, where, getDocs } from 'firebase/firestore';
import { db, appUsersCol } from '../../lib/firebase';
import { useAuth } from '../../context/AuthContext';
import { School, AppUser, UserRole, PendingInvite, ActivityEvent, AdditionalContact, SystemRequestStatus } from '../../types';
import { MouModal } from '../../components/common/MouModal';
import { MfaSetupModal } from '../../components/auth/MfaSetupModal';
import { PrincipalOnboardingWizard } from '../../components/school/PrincipalOnboardingWizard';

import { PortalSettings } from '../../types';

const WORKFLOW_STATUS_OPTIONS: {
  status: SystemRequestStatus;
  label: string;
  description: string;
  badgeClass: string;
}[] = [
  {
    status: 'in_review',
    label: 'In Review',
    description: 'When a new request is submitted or flagged for evaluation',
    badgeClass: 'bg-blue-50 text-blue-700 border-blue-200',
  },
  {
    status: 'waiting_on_principal',
    label: 'Waiting on Principal',
    description: 'When payout information is required from school submitter',
    badgeClass: 'bg-amber-50 text-amber-700 border-amber-200',
  },
  {
    status: 'waiting_on_beneficiary',
    label: 'Waiting on Beneficiary',
    description: 'When beneficiary payment method verification is pending',
    badgeClass: 'bg-purple-50 text-purple-700 border-purple-200',
  },
  {
    status: 'ready_to_pay',
    label: 'Ready to Pay',
    description: 'When payout details are verified and queued for disbursement',
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
  {
    status: 'paid',
    label: 'Paid / Disbursed',
    description: 'When emergency assistance payment is disbursed & recorded',
    badgeClass: 'bg-emerald-100 text-emerald-900 border-emerald-300',
  },
  {
    status: 'response_requested',
    label: 'Response Requested',
    description: 'When an admin asks a question or clarification to the submitter',
    badgeClass: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  },
  {
    status: 'changes_requested',
    label: 'Changes Requested',
    description: 'When revisions or modifications are requested on the grant',
    badgeClass: 'bg-orange-50 text-orange-700 border-orange-200',
  },
  {
    status: 'denied',
    label: 'Denied',
    description: 'When an emergency request is declined by administrators',
    badgeClass: 'bg-rose-50 text-rose-700 border-rose-200',
  },
  {
    status: 'canceled',
    label: 'Canceled',
    description: 'When a request is canceled or withdrawn',
    badgeClass: 'bg-slate-100 text-slate-700 border-slate-300',
  },
];

interface UserProfilePageProps {
  schools: School[];
  settings?: PortalSettings;
  maxPerRequestAmount?: number;
  users?: AppUser[];
  pendingInvites?: PendingInvite[];
  activityLogs?: ActivityEvent[];
  onUpdateSchool?: (schoolId: string, updates: Partial<School>) => void;
  onUpdateUser?: (id: string, updates: Partial<AppUser>) => void;
  onRevokeUser?: (id: string) => void;
  onReactivateUser?: (id: string) => void;
  onDeleteUser?: (id: string) => void;
  onResendInvite?: (id: string) => void;
  onRevokeInvite?: (id: string) => void;
  onCreateInvite?: (invite: Partial<PendingInvite>) => void;
}

export const UserProfilePage: React.FC<UserProfilePageProps> = ({
  schools,
  settings,
  maxPerRequestAmount = 2000,
  users = [],
  pendingInvites = [],
  activityLogs = [],
  onUpdateSchool,
  onUpdateUser,
  onRevokeUser,
  onReactivateUser,
  onDeleteUser,
  onResendInvite,
  onRevokeInvite,
  onCreateInvite,
}) => {
  const {
    userProfile,
    realAdminProfile,
    startImpersonation,
    activeSchoolId,
    updateProfileData,
  } = useAuth();

  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const targetUserId = searchParams.get('userId');

  // Direct Firestore lookup state to guarantee 100% fresh status
  const [fetchedTargetUser, setFetchedTargetUser] = useState<AppUser | null>(null);

  useEffect(() => {
    if (!targetUserId) {
      setFetchedTargetUser(null);
      return;
    }

    const localMatch = users.find(
      (u) => u.id === targetUserId || (u.email && u.email.toLowerCase() === targetUserId.toLowerCase())
    );
    if (localMatch) {
      setFetchedTargetUser(localMatch);
    }

    // Direct Firestore fetch to ensure fresh status (e.g. revoked)
    let isMounted = true;
    const fetchDirect = async () => {
      try {
        const snap = await getDoc(doc(db, 'appUsers', targetUserId));
        if (snap.exists() && isMounted) {
          const d = snap.data() as AppUser;
          setFetchedTargetUser({ ...d, id: snap.id || d.id });
          return;
        }
        if (targetUserId.includes('@')) {
          const q = query(appUsersCol, where('email', '==', targetUserId.toLowerCase()));
          const qSnap = await getDocs(q);
          if (!qSnap.empty && isMounted) {
            const docSnap = qSnap.docs[0];
            setFetchedTargetUser({ ...(docSnap.data() as AppUser), id: docSnap.id });
          }
        }
      } catch (err) {
        console.warn('Direct user fetch in profile page note:', err);
      }
    };
    fetchDirect();
    return () => {
      isMounted = false;
    };
  }, [targetUserId, users]);

  // Find registered user or pending invite
  const targetUser =
    fetchedTargetUser ||
    (targetUserId
      ? users.find((u) => u.id === targetUserId || u.email.toLowerCase() === targetUserId.toLowerCase())
      : null);

  const targetInvite = targetUserId && !targetUser
    ? pendingInvites.find((i) => i.id === targetUserId || i.email.toLowerCase() === targetUserId.toLowerCase())
    : null;

  const isTargetView = Boolean(targetUser || targetInvite);

  const activeEmail = (targetUser?.email || targetInvite?.email || userProfile?.email || '').toLowerCase();
  
  const activeIds = isTargetView 
    ? [targetUser?.id, activeEmail].filter(Boolean) as string[]
    : [userProfile?.uid, activeEmail].filter(Boolean) as string[];

  const userLogs = activityLogs.filter((log) => {
    return activeIds.includes(log.actorId) ||
      (log.targetUserId && activeIds.includes(log.targetUserId)) ||
      (log.targetUserEmail && activeIds.includes(log.targetUserEmail.toLowerCase()));
  }).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  // Log Pagination & Search
  const [logSearchQuery, setLogSearchQuery] = useState('');
  const [logPage, setLogPage] = useState(1);
  const logsPerPage = 5;

  const filteredLogs = userLogs.filter((log) => {
    if (!logSearchQuery) return true;
    const q = logSearchQuery.toLowerCase();
    return log.message.toLowerCase().includes(q) || log.eventType.toLowerCase().includes(q) || log.requestId?.toLowerCase().includes(q);
  });

  const totalLogPages = Math.ceil(filteredLogs.length / logsPerPage);
  const paginatedLogs = filteredLogs.slice((logPage - 1) * logsPerPage, logPage * logsPerPage);

  // Am I an Admin viewing this user/invite?
  const effectiveRole = realAdminProfile?.role || userProfile?.role;
  const isViewerAdmin = effectiveRole === 'admin';

  // State for profile form
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [role, setRole] = useState<UserRole>('principal');
  const [schoolId, setSchoolId] = useState('');
  const [status, setStatus] = useState<'active' | 'inactive' | 'revoked' | 'pending'>('active');
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Communication subscriptions (Admin-only)
  const [statusSubscriptions, setStatusSubscriptions] = useState<SystemRequestStatus[]>([]);
  const [subscriptionSavedToast, setSubscriptionSavedToast] = useState(false);

  // Security / Password
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  // 2FA & MOU & Admin Action Feedback & Onboarding Wizard
  const [mfaModalOpen, setMfaModalOpen] = useState(false);
  const [mouModalOpen, setMouModalOpen] = useState(false);
  const [onboardingWizardOpen, setOnboardingWizardOpen] = useState(false);
  const [adminToast, setAdminToast] = useState<string | null>(null);

  // Modal confirmation state
  const [confirmAction, setConfirmAction] = useState<'revoke' | 'reactivate' | 'delete' | 'revoke_invite' | 'reset_mfa' | null>(null);

  const showAdminToast = (msg: string) => {
    setAdminToast(msg);
    setTimeout(() => setAdminToast(null), 3500);
  };

  // Sync state whenever targetUser/targetInvite or userProfile changes
  useEffect(() => {
    if (targetUser) {
      const parts = targetUser.name.split(' ');
      setFirstName(parts[0] || '');
      setLastName(parts.slice(1).join(' ') || '');
      setEmail(targetUser.email || '');
      setPhone(targetUser.phone || '');
      setJobTitle(targetUser.jobTitle || '');
      setRole(targetUser.role);
      setSchoolId(targetUser.schoolId || '');
      setStatusSubscriptions(Array.isArray(targetUser.statusSubscriptions) ? targetUser.statusSubscriptions : []);
      const userStatusRaw = targetUser.status as string;
      const normalizedStatus =
        userStatusRaw === 'revoked'
          ? ('revoked' as const)
          : userStatusRaw === 'invited' || userStatusRaw === 'pending'
          ? ('pending' as const)
          : ('active' as const);
      setStatus(normalizedStatus);
    } else if (targetInvite) {
      const parts = targetInvite.name.split(' ');
      setFirstName(parts[0] || '');
      setLastName(parts.slice(1).join(' ') || '');
      setEmail(targetInvite.email || '');
      setPhone('');
      setJobTitle(targetInvite.jobTitle || '');
      setRole(targetInvite.role);
      setSchoolId(targetInvite.schoolId || '');
      setStatusSubscriptions([]);
      setStatus('pending');
    } else if (userProfile) {
      const initialFirst = userProfile.firstName || userProfile.displayName?.split(' ')[0] || '';
      const initialLast = userProfile.lastName || (userProfile.displayName ? userProfile.displayName.split(' ').slice(1).join(' ') : '') || '';
      setFirstName(initialFirst);
      setLastName(initialLast);
      setEmail(userProfile.email || '');
      setPhone(userProfile.phone || '');
      setJobTitle(userProfile.jobTitle || '');
      setRole(userProfile.role);
      setSchoolId(userProfile.schoolIds?.[0] || '');
      setStatusSubscriptions(Array.isArray(userProfile.statusSubscriptions) ? userProfile.statusSubscriptions : []);
      setStatus('active');
    }
  }, [targetUser, targetInvite, userProfile]);

  const handleToggleSubscription = (statusKey: SystemRequestStatus) => {
    setStatusSubscriptions((prev) =>
      prev.includes(statusKey)
        ? prev.filter((s) => s !== statusKey)
        : [...prev, statusKey]
    );
  };

  const handleSelectAllSubscriptions = () => {
    setStatusSubscriptions(WORKFLOW_STATUS_OPTIONS.map((o) => o.status));
  };

  const handleClearAllSubscriptions = () => {
    setStatusSubscriptions([]);
  };

  const handleSaveSubscriptions = () => {
    if (targetUser && onUpdateUser) {
      onUpdateUser(targetUser.id, {
        statusSubscriptions,
      });
      setSubscriptionSavedToast(true);
      setTimeout(() => setSubscriptionSavedToast(false), 3000);
    } else if (userProfile?.uid) {
      updateProfileData({
        statusSubscriptions,
      });
      if (onUpdateUser) {
        onUpdateUser(userProfile.uid, {
          statusSubscriptions,
        });
      }
      setSubscriptionSavedToast(true);
      setTimeout(() => setSubscriptionSavedToast(false), 3000);
    }
  };

  // Selected school record
  const targetSchoolId = isTargetView
    ? (targetUser?.schoolId || targetInvite?.schoolId || schoolId)
    : (activeSchoolId || userProfile?.schoolIds?.[0]);

  const school = schools.find((s) => s.id === targetSchoolId) || (isTargetView ? undefined : schools[0]);

  // Authorized Contact Management State (for School Principal profiles)
  const [showAddContactModal, setShowAddContactModal] = useState(false);
  const [newContactName, setNewContactName] = useState('');
  const [newContactEmail, setNewContactEmail] = useState('');
  const [newContactPhone, setNewContactPhone] = useState('');
  const [newContactJobTitle, setNewContactJobTitle] = useState('');
  const [invitedContactId, setInvitedContactId] = useState<string | null>(null);

  const handleAddAuthorizedContactSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContactName.trim() || !newContactEmail.trim() || !school) return;

    const contactEmailClean = newContactEmail.trim();
    const contactNameClean = newContactName.trim();
    const contactTitleClean = newContactJobTitle.trim() || 'Authorized Contact';

    const newContact: AdditionalContact = {
      id: `AC-${Date.now()}`,
      name: contactNameClean,
      email: contactEmailClean,
      phone: newContactPhone.trim() || undefined,
      jobTitle: contactTitleClean,
      role: 'additional_contact',
    };

    const updatedContacts = [...(school.additionalContacts || []), newContact];

    // 1. Update school roster
    if (onUpdateSchool) {
      onUpdateSchool(school.id, { additionalContacts: updatedContacts });
    }

    // 2. CRITICAL: Dispatch invitation to the NEW AUTHORIZED CONTACT'S EMAIL, NOT the principal's email!
    if (onCreateInvite) {
      onCreateInvite({
        email: contactEmailClean,
        name: contactNameClean,
        role: 'additional_contact',
        schoolId: school.id,
        schoolName: school.name,
        jobTitle: contactTitleClean,
        invitedBy: userProfile?.displayName || userProfile?.email || 'PEF Administrator',
        notes: `Authorized contact invitation generated from Principal Profile for ${school.name}`,
      });
    }

    setNewContactName('');
    setNewContactEmail('');
    setNewContactPhone('');
    setNewContactJobTitle('');
    setShowAddContactModal(false);
    showAdminToast(`Invitation successfully dispatched to ${contactEmailClean} as Authorized Contact!`);
  };

  const handleInviteAuthorizedContact = (c: AdditionalContact) => {
    if (!c.email || !school) return;
    const cleanEmail = c.email.trim();
    const cleanName = c.name.trim();
    const cleanTitle = c.jobTitle || 'Authorized Contact';

    if (onCreateInvite) {
      onCreateInvite({
        email: cleanEmail,
        name: cleanName,
        role: 'additional_contact',
        schoolId: school.id,
        schoolName: school.name,
        jobTitle: cleanTitle,
        invitedBy: userProfile?.displayName || userProfile?.email || 'PEF Administrator',
        notes: `Authorized contact invitation resent from Principal Profile for ${school.name}`,
      });
    } else if (onResendInvite) {
      onResendInvite(cleanEmail);
    }
    setInvitedContactId(c.id);
    showAdminToast(`Invitation dispatched to ${cleanEmail} as Authorized Contact!`);
    setTimeout(() => setInvitedContactId(null), 3000);
  };

  const handleRemoveAuthorizedContact = (contactId: string) => {
    if (!school) return;
    const updated = (school.additionalContacts || []).filter((c) => c.id !== contactId);
    if (onUpdateSchool) {
      onUpdateSchool(school.id, { additionalContacts: updated });
    }
    showAdminToast('Authorized contact removed from school roster.');
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (targetUser && onUpdateUser) {
      const selectedSchool = schools.find((s) => s.id === schoolId);
      onUpdateUser(targetUser.id, {
        name: `${firstName} ${lastName}`.trim(),
        email,
        phone: phone.trim() || undefined,
        jobTitle: jobTitle.trim() || undefined,
        role,
        schoolId: role === 'admin' ? undefined : schoolId,
        schoolName: role === 'admin' ? undefined : selectedSchool?.name,
        status: status === 'pending' ? 'active' : status,
        statusSubscriptions: role === 'admin' ? statusSubscriptions : [],
      });
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 2500);
    } else {
      updateProfileData({
        firstName,
        lastName,
        displayName: `${firstName} ${lastName}`.trim(),
        phone,
        jobTitle,
        statusSubscriptions: userProfile?.role === 'admin' ? statusSubscriptions : [],
      });
      if (userProfile?.uid && onUpdateUser) {
        onUpdateUser(userProfile.uid, {
          statusSubscriptions: userProfile?.role === 'admin' ? statusSubscriptions : [],
        });
      }
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 2500);
    }
  };

  const handleUpdatePassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword.trim()) return;
    setPasswordSuccess(true);
    setCurrentPassword('');
    setNewPassword('');
    setTimeout(() => setPasswordSuccess(false), 2500);
  };

  const displayNameText = targetUser
    ? targetUser.name
    : targetInvite
    ? targetInvite.name
    : userProfile?.displayName || 'User Profile';

  const userEmailText = targetUser
    ? targetUser.email
    : targetInvite
    ? targetInvite.email
    : userProfile?.email;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      {/* Top Navigation & Header */}
      <div className="space-y-3">
        {isTargetView && (
          <button
            onClick={() => navigate('/admin/users')}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 bg-white border border-slate-200 px-3 py-1.5 rounded-xl shadow-xs transition-all cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to User Directory
          </button>
        )}

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                {isTargetView ? `${displayNameText}'s Profile` : 'User Profile & Account Security'}
              </h1>
              {isTargetView && (
                <span
                  className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full border ${
                    role === 'admin'
                      ? 'bg-purple-100 text-purple-800 border-purple-200'
                      : role === 'principal'
                      ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                      : 'bg-blue-100 text-blue-800 border-blue-200'
                  }`}
                >
                  {role?.replace('_', ' ')}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {isTargetView
                ? `System record & administrative governance for ${userEmailText}`
                : 'Manage personal contact information, authentication settings, and compliance credentials'}
            </p>
          </div>
        </div>
      </div>

      {/* Admin Governance & Actions Panel */}
      {isTargetView && isViewerAdmin && (
        <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-md border border-slate-800 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-slate-800 text-emerald-400 rounded-xl border border-slate-700">
                <Shield className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-extrabold text-white flex items-center gap-2">
                  <span>Admin Governance Panel</span>
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Manage account status, portal permissions, impersonation, and invitation links
                </p>
              </div>
            </div>

            {/* Account Status Badge */}
            <span
              className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider shrink-0 border ${
                status === 'revoked' || targetUser?.status === 'revoked'
                  ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                  : targetInvite || status === 'pending' || (targetUser?.status as string) === 'invited' || targetUser?.status === 'pending'
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                  : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
              }`}
            >
              {status === 'revoked' || targetUser?.status === 'revoked'
                ? 'Revoked Account'
                : targetInvite || status === 'pending' || (targetUser?.status as string) === 'invited' || targetUser?.status === 'pending'
                ? 'Pending Invitation'
                : 'Active Account'}
            </span>
          </div>

          {/* Pending Invite Actions */}
          {targetInvite ? (
            <div className="space-y-4">
              <div className="p-3.5 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-200 text-xs flex items-start gap-3">
                <Clock className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <p className="font-bold">Active Pending Invitation</p>
                  <p className="text-[11px] text-amber-300/80">
                    Invited by <strong>{targetInvite.invitedBy}</strong> on{' '}
                    {new Date(targetInvite.invitedAt).toLocaleDateString()}.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    if (onResendInvite && targetInvite) {
                      onResendInvite(targetInvite.id);
                      showAdminToast(`Re-dispatched invitation email to ${targetInvite.email}`);
                    }
                  }}
                  className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs flex items-center gap-2 cursor-pointer shadow-sm transition-all"
                >
                  <Send className="w-4 h-4" />
                  Resend Invite Email
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const link = `${window.location.origin}/setup-account?token=${encodeURIComponent(targetInvite.id)}`;
                    navigator.clipboard.writeText(link);
                    showAdminToast('Account setup link copied to clipboard!');
                  }}
                  className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold rounded-xl text-xs flex items-center gap-2 cursor-pointer transition-all"
                >
                  <Copy className="w-4 h-4 text-slate-400" />
                  Copy Account Setup Link
                </button>

                <button
                  type="button"
                  onClick={() => setConfirmAction('revoke_invite')}
                  className="px-4 py-2.5 bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/40 font-bold rounded-xl text-xs flex items-center gap-2 cursor-pointer transition-all"
                >
                  <Trash2 className="w-4 h-4 text-rose-400" />
                  Cancel & Delete Invite
                </button>
              </div>
            </div>
          ) : (
            /* Registered User Actions (Buttons) */
            <div className="flex flex-wrap items-center gap-3 pt-1">
              {/* Impersonate User */}
              {targetUser && targetUser.role !== 'admin' && status === 'active' && targetUser.status !== 'revoked' && (
                <button
                  type="button"
                  onClick={() => {
                    startImpersonation(targetUser);
                    navigate('/dashboard');
                  }}
                  className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-xs shadow-md shadow-amber-500/20 flex items-center gap-2 cursor-pointer transition-all hover:scale-105"
                >
                  <Sparkles className="w-4 h-4" />
                  Impersonate User
                </button>
              )}

              {/* Reset MFA */}
              {targetUser && targetUser.mfaEnabled && targetUser.mfaMethod !== 'sms' && (
                <button
                  type="button"
                  onClick={() => setConfirmAction('reset_mfa')}
                  className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-medium rounded-xl text-xs flex items-center gap-1.5 cursor-pointer transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
                  Reset MFA
                </button>
              )}

              {/* Revoke / Reactivate Access */}
              {status === 'revoked' || targetUser?.status === 'revoked' ? (
                /* ONLY Reactivate Account is visible when revoked */
                <button
                  type="button"
                  onClick={() => setConfirmAction('reactivate')}
                  className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs flex items-center gap-2 cursor-pointer transition-all shadow-sm"
                >
                  <RotateCcw className="w-4 h-4" />
                  Reactivate Account
                </button>
              ) : (
                /* ONLY Revoke User is visible when active */
                <button
                  type="button"
                  onClick={() => setConfirmAction('revoke')}
                  className="px-4 py-2.5 bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/40 font-bold rounded-xl text-xs flex items-center gap-2 cursor-pointer transition-all"
                >
                  <Ban className="w-4 h-4 text-rose-400" />
                  Revoke User
                </button>
              )}

              {/* Delete Record */}
              {targetUser && (status === 'revoked' || targetUser.status === 'revoked') && (
                <button
                  type="button"
                  onClick={() => setConfirmAction('delete')}
                  className="px-4 py-2.5 bg-slate-800 hover:bg-rose-950 text-slate-400 hover:text-rose-300 border border-slate-700 hover:border-rose-800 font-bold rounded-xl text-xs flex items-center gap-2 cursor-pointer transition-all"
                >
                  <Trash2 className="w-4 h-4 text-rose-400" />
                  Delete User Record
                </button>
              )}
            </div>
          )}

          {adminToast && (
            <div className="p-3 bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-bold rounded-xl flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{adminToast}</span>
            </div>
          )}
        </div>
      )}

      {savedSuccess && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-bold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>Profile changes saved successfully!</span>
        </div>
      )}

      {/* Profile Form & Security Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Profile Info Form */}
        <form onSubmit={handleSaveProfile} className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4 text-xs">
          <h3 className="text-sm font-bold text-slate-900 border-b pb-2 flex items-center justify-between">
            <span className="flex items-center gap-2">
              <User className="w-4 h-4 text-emerald-600" />
              {isTargetView ? 'User Information & Governance' : 'Personal Details'}
            </span>
            {isTargetView && (
              <span className="text-[10px] text-slate-400 font-mono">
                ID: {targetUser?.id || targetInvite?.id}
              </span>
            )}
          </h3>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">First Name</label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
                className="w-full px-3 py-2 border rounded-xl"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Last Name</label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                required
                className="w-full px-3 py-2 border rounded-xl"
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Email Address</label>
            <input
              type="email"
              value={email}
              disabled={!isTargetView || !isViewerAdmin}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border rounded-xl disabled:bg-slate-50 text-slate-700 font-medium"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Direct Phone Number</label>
            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="(312) 555-0199"
              className="w-full px-3 py-2 border rounded-xl"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Job Title / Role</label>
            <input
              type="text"
              value={jobTitle}
              onChange={(e) => setJobTitle(e.target.value)}
              placeholder="e.g. Principal, Assistant Principal, Social Worker"
              className="w-full px-3 py-2 border rounded-xl"
            />
          </div>

          {isTargetView && isViewerAdmin ? (
            <>
              <div className="grid grid-cols-2 gap-3 pt-1 border-t border-slate-100">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Role Classification</label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as UserRole)}
                    className="w-full px-3 py-2 border rounded-xl bg-white font-semibold"
                  >
                    <option value="principal">School Principal</option>
                    <option value="additional_contact">Authorized Contact</option>
                    <option value="admin">Program Administrator</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Account Status</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as any)}
                    className="w-full px-3 py-2 border rounded-xl bg-white font-semibold"
                  >
                    <option value="active">Active</option>
                    <option value="pending">Pending Invite</option>
                    <option value="revoked">Revoked</option>
                  </select>
                </div>
              </div>

              {role !== 'admin' && (
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Assigned School Affiliation</label>
                  <select
                    value={schoolId}
                    onChange={(e) => setSchoolId(e.target.value)}
                    className="w-full px-3 py-2 border rounded-xl bg-white font-semibold"
                  >
                    {!schoolId && <option value="">Select a school...</option>}
                    {schoolId && !schools.some((s) => s.id === schoolId) && (
                      <option value={schoolId}>
                        {targetInvite?.schoolName || targetUser?.schoolName || `School (${schoolId})`}
                      </option>
                    )}
                    {schools.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.id})
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </>
          ) : (
            <div>
              <span className="block font-bold text-slate-700 mb-1">Portal Permission Tier</span>
              <span className="px-2.5 py-1 bg-slate-100 text-slate-800 rounded-lg font-bold uppercase tracking-wider text-[11px]">
                {role?.replace('_', ' ') || 'Unassigned'}
              </span>
            </div>
          )}

          {!targetInvite && (
            <div className="pt-2">
              <button
                type="submit"
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs shadow-md shadow-emerald-600/20 flex items-center gap-2 cursor-pointer"
              >
                <Save className="w-4 h-4" />
                {isTargetView ? 'Save User Updates' : 'Save Profile Details'}
              </button>
            </div>
          )}
        </form>

        {/* Security & MFA Side */}
        <div className="space-y-6">
          {/* Account Security Card */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4 text-xs">
            <h3 className="text-sm font-bold text-slate-900 border-b pb-2 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-emerald-600" />
                Security & Authentication
              </span>
            </h3>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Account Email</label>
              <div className="flex items-center gap-2">
                <input
                  type="email"
                  disabled
                  value={email}
                  className="w-full px-3 py-2 border rounded-xl bg-slate-50 text-slate-600 font-medium"
                />
                <span
                  className={`shrink-0 px-2.5 py-1 rounded-lg font-bold text-[10px] flex items-center gap-1 ${
                    targetInvite
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-emerald-100 text-emerald-800'
                  }`}
                >
                  <CheckCircle2 className="w-3 h-3" />
                  {targetInvite ? 'Unclaimed Invite' : 'Verified'}
                </span>
              </div>
            </div>

            {!isTargetView && (
              <>
                {userProfile?.authProvider === 'google.com' ? (
                  <div className="p-3.5 bg-indigo-50 border border-indigo-100 rounded-xl space-y-1.5 text-indigo-900 text-xs">
                    <div className="font-bold flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-indigo-600" />
                      <span>Managed by Google Security</span>
                    </div>
                    <p className="text-[11px] text-indigo-700 leading-relaxed">
                      Your account uses Google Single Sign-On. Password changes and security settings are managed via Google Workspace.
                    </p>
                  </div>
                ) : (
                  <form onSubmit={handleUpdatePassword} className="space-y-3 pt-2">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Current Password</label>
                      <input
                        type="password"
                        placeholder="••••••••"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        className="w-full px-3 py-2 border rounded-xl"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 mb-1">New Password</label>
                      <input
                        type="password"
                        placeholder="Min 8 characters"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="w-full px-3 py-2 border rounded-xl"
                      />
                    </div>

                    {passwordSuccess && (
                      <p className="text-emerald-600 font-bold text-xs">Password updated successfully!</p>
                    )}

                    <div className="pt-2 flex justify-end">
                      <button
                        type="submit"
                        disabled={!newPassword.trim()}
                        className="px-5 py-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white font-bold rounded-xl text-xs flex items-center gap-2 cursor-pointer"
                      >
                        <KeyRound className="w-4 h-4" />
                        Update Password
                      </button>
                    </div>
                  </form>
                )}
              </>
            )}
          </div>

          {/* 2FA Card */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-3 text-xs">
            <div className="flex items-center justify-between border-b pb-2">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-emerald-600" />
                Two-Factor Authentication (2FA)
              </h3>
              {(isTargetView ? targetUser?.mfaEnabled : userProfile?.mfaEnabled) && (
                <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-lg font-bold text-[10px] uppercase flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-emerald-600" />
                  2FA Active
                </span>
              )}
            </div>

            <div className="flex items-center justify-between gap-4">
              <div className="space-y-1">
                <p className="font-bold text-slate-800">Google Authenticator / TOTP</p>
                <p className="text-slate-500 text-[11px] leading-relaxed">
                  Requires 6-digit TOTP verification code on sign-in for additional account security.
                </p>
              </div>

              {!isTargetView ? (
                !userProfile?.mfaEnabled && (
                  <button
                    type="button"
                    onClick={() => setMfaModalOpen(true)}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs shrink-0 cursor-pointer shadow-sm shadow-emerald-600/20"
                  >
                    Enable 2FA
                  </button>
                )
              ) : (
                isViewerAdmin && targetUser?.mfaEnabled && targetUser?.mfaMethod !== 'sms' && (
                  <button
                    type="button"
                    onClick={() => setConfirmAction('reset_mfa')}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded-lg font-medium text-xs shrink-0 cursor-pointer transition-colors"
                  >
                    Reset MFA
                  </button>
                )
              )}
            </div>
          </div>

          {/* Communication Subscriptions (Admins Only) */}
          {(role === 'admin' || (isTargetView ? targetUser?.role === 'admin' : userProfile?.role === 'admin')) && (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4 text-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
                    <Mail className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Communication Subscriptions</h3>
                    <p className="text-[11px] text-slate-500 font-normal">
                      Email notifications for request workflow actions
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={handleSelectAllSubscriptions}
                    className="px-2.5 py-1 text-[11px] font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer border border-slate-200"
                  >
                    Select All
                  </button>
                  <button
                    type="button"
                    onClick={handleClearAllSubscriptions}
                    className="px-2.5 py-1 text-[11px] font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer border border-slate-200"
                  >
                    Clear All
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between px-0.5 text-[11px] text-slate-500">
                <span>Select the workflow statuses this administrator will receive emails for:</span>
                <span className="font-bold text-slate-700">
                  {statusSubscriptions.length} of {WORKFLOW_STATUS_OPTIONS.length} Selected
                </span>
              </div>

              <div className="space-y-2">
                {WORKFLOW_STATUS_OPTIONS.map((item) => {
                  const isChecked = statusSubscriptions.includes(item.status);
                  return (
                    <label
                      key={item.status}
                      className={`flex items-start gap-3 p-3 rounded-xl border transition-all cursor-pointer select-none ${
                        isChecked
                          ? 'bg-emerald-50/40 border-emerald-300 ring-1 ring-emerald-200'
                          : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/50'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => handleToggleSubscription(item.status)}
                        className="mt-0.5 h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-slate-800 text-xs">
                            {item.label}
                          </span>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${item.badgeClass}`}
                          >
                            {item.status}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed font-normal">
                          {item.description}
                        </p>
                      </div>
                    </label>
                  );
                })}
              </div>

              {subscriptionSavedToast && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-bold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Communication subscription preferences saved!</span>
                </div>
              )}

              <div className="pt-2 flex items-center justify-between border-t border-slate-100">
                <p className="text-[10px] text-slate-400">
                  Initial default is none selected (opt-in alerts only).
                </p>
                <button
                  type="button"
                  onClick={handleSaveSubscriptions}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-sm shadow-emerald-600/20 cursor-pointer transition-colors"
                >
                  <Save className="w-3.5 h-3.5" />
                  Save Subscriptions
                </button>
              </div>
            </div>
          )}

          {/* MOU Compliance Record */}
          {(role === 'principal' || role === 'additional_contact' || targetUser?.role === 'principal' || targetUser?.role === 'additional_contact' || targetInvite?.role === 'principal' || targetInvite?.role === 'additional_contact') && (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4 text-xs">
              <div className="flex justify-between items-center border-b pb-2">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  School Onboarding & MOU Compliance Audit
                </h3>
                {school && !school.currentMouSigned && (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-amber-100 text-amber-800 border border-amber-300">
                    Action Required
                  </span>
                )}
              </div>

              {/* Onboarding Audit Stepper Summary */}
              <div className="space-y-2 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
                <div className="flex items-center justify-between py-1 border-b border-slate-200/60">
                  <span className="font-semibold text-slate-700">1. Account Creation & Credentials</span>
                  <span className="text-emerald-700 font-bold flex items-center gap-1 text-[11px]">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Verified
                  </span>
                </div>
                <div className="flex items-center justify-between py-1 border-b border-slate-200/60">
                  <span className="font-semibold text-slate-700">2. Multi-Factor Authentication (MFA)</span>
                  {userProfile?.mfaEnabled ? (
                    <span className="text-emerald-700 font-bold flex items-center gap-1 text-[11px]">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Enrolled
                    </span>
                  ) : (
                    <span className="text-amber-700 font-bold text-[11px] bg-amber-100 px-2 py-0.5 rounded-md">
                      Pending Enrollment
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-between py-1 border-b border-slate-200/60">
                  <span className="font-semibold text-slate-700">3. School & Contact Profile</span>
                  <span className="text-emerald-700 font-bold flex items-center gap-1 text-[11px]">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Assigned ({school?.name || targetInvite?.schoolName || targetUser?.schoolName || 'School'})
                  </span>
                </div>
                <div className="flex items-center justify-between py-1">
                  <span className="font-semibold text-slate-700">4. MOU Legal Execution</span>
                  {school?.currentMouSigned ? (
                    <span className="text-emerald-700 font-bold flex items-center gap-1 text-[11px]">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Executed ({school.currentMouSignedBy || 'Signed'}{school.currentMouSignedByTitle ? `, ${school.currentMouSignedByTitle}` : ''})
                    </span>
                  ) : (
                    <span className="text-amber-700 font-bold text-[11px] bg-amber-100 px-2 py-0.5 rounded-md">
                      Pending Signature
                    </span>
                  )}
                </div>
              </div>

              <div className="pt-1 flex flex-wrap items-center gap-3">
                {!school?.currentMouSigned ? (
                  (role === 'principal' || targetUser?.role === 'principal' || targetInvite?.role === 'principal') ? (
                    <>
                      <button
                        type="button"
                        onClick={() => setOnboardingWizardOpen(true)}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs shadow-xs flex items-center gap-2"
                      >
                        <Sparkles className="w-4 h-4" />
                        Launch Principal Onboarding & MOU Execution Wizard
                      </button>
                      <button
                        type="button"
                        onClick={() => setMouModalOpen(true)}
                        className="text-xs font-bold text-slate-600 hover:text-slate-900 hover:underline"
                      >
                        View Legal Terms Document →
                      </button>
                    </>
                  ) : (
                    <p className="text-slate-500 font-medium italic">
                      The Memorandum of Understanding is pending execution by the school principal.
                    </p>
                  )
                ) : (
                  <button
                    type="button"
                    onClick={() => setMouModalOpen(true)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl text-xs shadow-xs"
                  >
                    View Executed MOU
                  </button>
                )}
              </div>
            </div>
          )}

          {/* School Authorized Contacts */}
          {school && (role === 'principal' || targetUser?.role === 'principal' || targetInvite?.role === 'principal' || role === 'additional_contact' || targetUser?.role === 'additional_contact') && (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4 text-xs">
              <div className="flex justify-between items-center border-b pb-2">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <Users className="w-4 h-4 text-[#0089B3]" />
                    Authorized School Contacts
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Authorized secondary contacts for {school.name} ({school.additionalContacts?.length || 0}/2)
                  </p>
                </div>
                {(school.additionalContacts?.length || 0) < 2 && (
                  <button
                    type="button"
                    onClick={() => setShowAddContactModal(true)}
                    className="px-3 py-1.5 bg-[#0089B3] hover:bg-[#006E8F] text-white font-bold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add Authorized Contact
                  </button>
                )}
              </div>

              {(!school.additionalContacts || school.additionalContacts.length === 0) ? (
                <div className="p-4 bg-slate-50 border border-dashed border-slate-200 rounded-xl text-center space-y-1">
                  <p className="text-slate-500 font-medium">No authorized contacts registered for {school.name}.</p>
                  <p className="text-[11px] text-slate-400">Add up to 2 secondary staff members permitted to submit emergency funding requests.</p>
                  <button
                    type="button"
                    onClick={() => setShowAddContactModal(true)}
                    className="text-xs font-bold text-[#0089B3] hover:underline mt-2 inline-flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add First Authorized Contact
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  {school.additionalContacts.map((c) => {
                    const isRegistered = users?.some(
                      (u) => u.email?.toLowerCase() === c.email?.toLowerCase() && u.status === 'active'
                    );
                    const isPending = pendingInvites?.some(
                      (inv) => inv.email?.toLowerCase() === c.email?.toLowerCase() && inv.status === 'pending'
                    );
                    const wasJustInvited = invitedContactId === c.id;

                    return (
                      <div
                        key={c.id}
                        className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between gap-3"
                      >
                        <div className="min-w-0 space-y-0.5">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-slate-900 text-xs">{c.name}</span>
                            <span className="text-[10px] font-semibold text-slate-600 bg-white border border-slate-200 px-1.5 py-0.2 rounded">
                              {c.jobTitle || 'Authorized Contact'}
                            </span>
                            {isRegistered ? (
                              <span className="text-[9px] font-bold text-emerald-700 bg-emerald-100/70 border border-emerald-200 px-1.5 py-0.2 rounded">
                                Active
                              </span>
                            ) : isPending ? (
                              <span className="text-[9px] font-bold text-amber-700 bg-amber-100/70 border border-amber-200 px-1.5 py-0.2 rounded">
                                Invite Pending
                              </span>
                            ) : (
                              <span className="text-[9px] font-bold text-slate-500 bg-slate-200/60 px-1.5 py-0.2 rounded">
                                Uninvited
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-600 truncate break-all">{c.email}</p>
                          {c.phone && <p className="text-[10px] text-slate-400">{c.phone}</p>}
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          {wasJustInvited ? (
                            <span className="text-[11px] font-bold text-sky-700 bg-sky-50 border border-sky-200 px-2 py-1 rounded-lg">
                              Sent!
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleInviteAuthorizedContact(c)}
                              className="px-2.5 py-1 bg-white hover:bg-sky-50 text-[#006E8F] border border-sky-200 font-bold rounded-lg text-xs flex items-center gap-1 transition-colors cursor-pointer shadow-2xs"
                              title={`Send portal invitation to ${c.email}`}
                            >
                              <Mail className="w-3 h-3 text-[#0089B3]" />
                              {isPending ? 'Resend' : 'Invite'}
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleRemoveAuthorizedContact(c.id)}
                            className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            title="Remove authorized contact"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Admin Only: User Activity Log */}
      {isViewerAdmin && isTargetView && (
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-indigo-50 rounded-xl">
                <Activity className="w-5 h-5 text-indigo-600" />
              </div>
              <div>
                <h2 className="text-base font-black text-slate-900">User Activity Log</h2>
                <p className="text-xs text-slate-500 font-medium">Complete history of platform actions, requests, and account events.</p>
              </div>
            </div>
            
            {userLogs.length > 0 && (
              <div className="relative w-full sm:w-64 shrink-0">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search logs..."
                  value={logSearchQuery}
                  onChange={(e) => {
                    setLogSearchQuery(e.target.value);
                    setLogPage(1);
                  }}
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-hidden focus:border-indigo-500"
                />
              </div>
            )}
          </div>

          <div className="space-y-4">
            {userLogs.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-6 bg-slate-50 rounded-2xl border border-slate-100">No activity logged for this user yet.</p>
            ) : filteredLogs.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-6 bg-slate-50 rounded-2xl border border-slate-100">No logs found matching your search.</p>
            ) : (
              <div className="space-y-4">
                {paginatedLogs.map((log) => (
                  <div key={log.id} className="flex gap-3 items-start p-3 bg-slate-50 rounded-2xl border border-slate-100 hover:bg-white hover:shadow-sm transition-all">
                    <div className="w-2 h-2 mt-1.5 rounded-full bg-indigo-500 shrink-0 shadow-sm shadow-indigo-500/20" />
                    <div className="flex-1 space-y-1">
                      <p className="text-xs font-medium text-slate-900">{log.message}</p>
                      <div className="flex flex-wrap gap-3 items-center text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-1">
                        <span>{new Date(log.timestamp).toLocaleString()}</span>
                        <span className="border-l border-slate-300 pl-3 text-indigo-600">{log.eventType.replace(/_/g, ' ')}</span>
                        {log.requestId && (
                          <Link 
                            to={isViewerAdmin ? `/admin/requests/${log.requestId}` : `/requests/${log.requestId}`}
                            className="border-l border-slate-300 pl-3 text-emerald-600 hover:text-emerald-700 hover:underline"
                          >
                            Req ID: {log.requestId.slice(-6)}
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            {totalLogPages > 1 && (
              <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                <p className="text-xs text-slate-500 font-medium">
                  Showing {(logPage - 1) * logsPerPage + 1} to {Math.min(logPage * logsPerPage, filteredLogs.length)} of {filteredLogs.length} entries
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setLogPage(p => Math.max(1, p - 1))}
                    disabled={logPage === 1}
                    className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setLogPage(p => Math.min(totalLogPages, p + 1))}
                    disabled={logPage === totalLogPages}
                    className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Confirmation Dialog Modal */}
      {confirmAction && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-200 space-y-4">
            <div className={`flex items-center gap-3 ${confirmAction === 'reset_mfa' ? 'text-amber-600' : 'text-rose-600'}`}>
              <div className={`p-3 rounded-2xl shrink-0 ${confirmAction === 'reset_mfa' ? 'bg-amber-100' : 'bg-rose-100'}`}>
                {confirmAction === 'reset_mfa' ? (
                  <RotateCcw className="w-6 h-6 text-amber-600" />
                ) : (
                  <AlertTriangle className="w-6 h-6" />
                )}
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-900">
                  {confirmAction === 'revoke'
                    ? 'Revoke User Access?'
                    : confirmAction === 'reactivate'
                    ? 'Reactivate Account Access?'
                    : confirmAction === 'revoke_invite'
                    ? 'Cancel Invitation?'
                    : confirmAction === 'reset_mfa'
                    ? 'Reset Multi-Factor Authentication (MFA)?'
                    : 'Delete User Record?'}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Action requested for {userEmailText}
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
              {confirmAction === 'revoke' &&
                'Revoking access will immediately prevent this user from signing into the portal. You can reactivate their access at any time.'}
              {confirmAction === 'reactivate' &&
                'Reactivating access will restore portal privileges for this account immediately.'}
              {confirmAction === 'revoke_invite' &&
                'Canceling this invitation will permanently delete the registration link and prevent redemption.'}
              {confirmAction === 'delete' &&
                'Permanently deleting this user record removes all account affiliations. This action cannot be undone.'}
              {confirmAction === 'reset_mfa' &&
                `Resetting MFA for ${userEmailText} will unenroll their 2FA factors. Next time this user logs into the portal, they will be required to set up and re-enable 2FA before accessing features.`}
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setConfirmAction(null)}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={() => {
                  if (confirmAction === 'revoke' && targetUser && onRevokeUser) {
                    onRevokeUser(targetUser.id);
                    setStatus('revoked');
                    setFetchedTargetUser((prev) => (prev ? { ...prev, status: 'revoked' } : null));
                    showAdminToast(`Revoked access for ${targetUser.email}`);
                  } else if (confirmAction === 'reactivate' && targetUser && onReactivateUser) {
                    onReactivateUser(targetUser.id);
                    setStatus('active');
                    setFetchedTargetUser((prev) => (prev ? { ...prev, status: 'active' } : null));
                    showAdminToast(`Reactivated access for ${targetUser.email}`);
                  } else if (confirmAction === 'delete' && targetUser && onDeleteUser) {
                    onDeleteUser(targetUser.id);
                    navigate('/admin/users');
                  } else if (confirmAction === 'revoke_invite' && targetInvite && onRevokeInvite) {
                    onRevokeInvite(targetInvite.id);
                    navigate('/admin/users');
                  } else if (confirmAction === 'reset_mfa' && targetUser && onUpdateUser) {
                    onUpdateUser(targetUser.id, {
                      mfaEnabled: false,
                      mfaSecretKey: undefined,
                      mfaRecoveryCodes: undefined,
                    });
                    showAdminToast(`MFA reset for ${targetUser.email}. User will be required to re-enable 2FA on next login.`);
                  }
                  setConfirmAction(null);
                }}
                className={`px-5 py-2.5 text-white font-bold rounded-xl text-xs cursor-pointer shadow-md ${
                  confirmAction === 'reactivate'
                    ? 'bg-emerald-600 hover:bg-emerald-700'
                    : confirmAction === 'reset_mfa'
                    ? 'bg-amber-600 hover:bg-amber-700'
                    : 'bg-rose-600 hover:bg-rose-700'
                }`}
              >
                {confirmAction === 'revoke'
                  ? 'Confirm Revocation'
                  : confirmAction === 'reactivate'
                  ? 'Confirm Reactivation'
                  : confirmAction === 'reset_mfa'
                  ? 'Confirm Reset'
                  : 'Confirm Action'}
              </button>
            </div>
          </div>
        </div>
      )}

      {school && (
        <MouModal
          school={school}
          isOpen={mouModalOpen}
          onClose={() => setMouModalOpen(false)}
          mouVersions={settings?.mouVersions}
          currentMouVersionId={settings?.currentMouVersionId}
          onSignMou={() => {}}
          readOnly
          maxPerRequestAmount={maxPerRequestAmount}
        />
      )}

      <MfaSetupModal
        isOpen={mfaModalOpen}
        onClose={() => setMfaModalOpen(false)}
        onSuccess={() => {
          setMfaModalOpen(false);
          updateProfileData({ mfaEnabled: true });
          if (onUpdateUser && userProfile?.uid) {
            onUpdateUser(userProfile.uid, { mfaEnabled: true });
          }
        }}
      />

      {onboardingWizardOpen && (
        <PrincipalOnboardingWizard
          school={school}
          userProfile={userProfile}
          mouVersion={settings?.mouVersions?.find(v => v.id === settings.currentMouVersionId) || settings?.mouVersions?.[0]}
          onClose={() => setOnboardingWizardOpen(false)}
          onCompleteOnboarding={(data) => {
            if (onUpdateSchool && school) {
              onUpdateSchool(school.id, {
                currentMouSigned: true,
                currentMouSignedBy: data.signedByName,
                currentMouSignedByTitle: data.signedByTitle || 'Principal',
                currentMouSignedAt: new Date().toISOString(),
                currentMouVersionId: data.mouVersionId,
                status: 'active',
              });
            }
            showAdminToast(`MOU Executed successfully for ${school?.name || 'School'}!`);
            setOnboardingWizardOpen(false);
          }}
        />
      )}

      {/* Modal: Add Authorized Contact to School */}
      {showAddContactModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 max-w-md w-full shadow-2xl text-xs space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-[#0089B3]" />
                <h3 className="text-sm font-bold text-slate-900">Add Authorized Contact</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAddContactModal(false)}
                className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-[11px] text-slate-600 leading-relaxed">
              Add an authorized staff member for <strong className="text-slate-900">{school?.name}</strong>. An email invitation will be dispatched immediately to their email address.
            </p>

            <form onSubmit={handleAddAuthorizedContactSubmit} className="space-y-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Maria Gonzalez"
                  value={newContactName}
                  onChange={(e) => setNewContactName(e.target.value)}
                  className="w-full px-3 py-2 border rounded-xl font-bold bg-white focus:border-[#0089B3] focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Email Address *</label>
                <input
                  type="email"
                  required
                  placeholder="e.g. mgonzalez@cps.edu"
                  value={newContactEmail}
                  onChange={(e) => setNewContactEmail(e.target.value)}
                  className="w-full px-3 py-2 border rounded-xl font-bold bg-white focus:border-[#0089B3] focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Job Title</label>
                  <input
                    type="text"
                    placeholder="e.g. Assistant Principal"
                    value={newContactJobTitle}
                    onChange={(e) => setNewContactJobTitle(e.target.value)}
                    className="w-full px-3 py-2 border rounded-xl bg-white focus:border-[#0089B3] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Phone (Optional)</label>
                  <input
                    type="text"
                    placeholder="(312) 555-0199"
                    value={newContactPhone}
                    onChange={(e) => setNewContactPhone(e.target.value)}
                    className="w-full px-3 py-2 border rounded-xl bg-white focus:border-[#0089B3] focus:outline-none"
                  />
                </div>
              </div>

              <div className="p-2.5 bg-sky-50 border border-sky-200/80 rounded-xl text-[11px] text-sky-900 flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 text-[#0089B3] shrink-0" />
                <span>The invitation email will be sent directly to <strong>{newContactEmail.trim() || 'the authorized contact'}</strong>.</span>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddContactModal(false)}
                  className="px-4 py-2 border rounded-xl text-slate-600 font-bold hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#0089B3] hover:bg-[#006E8F] text-white font-bold rounded-xl flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
                >
                  <Send className="w-3.5 h-3.5" />
                  Save & Send Invite
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
