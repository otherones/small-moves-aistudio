import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import {
  ShieldCheck,
  Building2,
  Mail,
  User,
  Key,
  Lock,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Copy,
  Check,
  Download,
  Smartphone,
  ArrowRight,
  Shield,
  Search,
  Sparkles,
  FileText,
  FileCheck2,
  HelpCircle,
  ExternalLink,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { generateTotpSetupData, verifyTotpCode } from '../../utils/mfaUtils';
import { PendingInvite, School, PortalSettings, UserRole, MouVersion } from '../../types';
import ReactMarkdown from 'react-markdown';
import {
  db,
  pendingInvitesCol,
  schoolsCol,
  appUsersCol,
  updateSchoolFieldsInFirestore,
  cleanForFirestore,
} from '../../lib/firebase';
import { getDocs, query, where, doc, getDoc } from 'firebase/firestore';

interface SetupAccountProps {
  pendingInvites?: PendingInvite[];
  schools?: School[];
  settings?: PortalSettings;
  onUpdateSchool?: (id: string, updates: Partial<School>) => void;
}

export const SetupAccount: React.FC<SetupAccountProps> = ({
  pendingInvites = [],
  schools = [],
  settings,
  onUpdateSchool,
}) => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const {
    user,
    userProfile,
    signUpWithEmail,
    signInWithEmail,
    signInWithGoogle,
    sendPasswordReset,
    enableMfaWithCredentials,
    signOut,
  } = useAuth();

  // URL query params
  const tokenParam =
    searchParams.get('token') ||
    searchParams.get('id') ||
    searchParams.get('invite') ||
    '';
  const emailParam = searchParams.get('email') || '';

  // Wizard state: 1: Credentials, 2: Security/MFA, 3: Review & Sign MOU (if applicable), 4: Complete
  const [wizardStep, setWizardStep] = useState<1 | 2 | 3 | 4>(1);

  // Invite discovery state
  const [loadingInvite, setLoadingInvite] = useState(true);
  const [matchedInvite, setMatchedInvite] = useState<PendingInvite | null>(null);
  const [matchedSchool, setMatchedSchool] = useState<School | null>(null);
  const [manualEmail, setManualEmail] = useState(emailParam);
  const [lookupError, setLookupError] = useState<string | null>(null);

  // Auth Method: 'password' | 'google'
  const [authMethod, setAuthMethod] = useState<'password' | 'google'>('password');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [fullName, setFullName] = useState('');
  const [authSubmitting, setAuthSubmitting] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isExistingAccountMode, setIsExistingAccountMode] = useState(false);
  const [resetEmailSent, setResetEmailSent] = useState(false);
  const [resetEmailSending, setResetEmailSending] = useState(false);

  // MFA State
  const [mfaSecretKey, setMfaSecretKey] = useState('');
  const [mfaQrCodeUrl, setMfaQrCodeUrl] = useState('');
  const [mfaRecoveryCodes, setMfaRecoveryCodes] = useState<string[]>([]);
  const [mfaVerificationCode, setMfaVerificationCode] = useState('');
  const [mfaError, setMfaError] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState(false);
  const [copiedCodes, setCopiedCodes] = useState(false);
  const [mfaVerifying, setMfaVerifying] = useState(false);
  const [mfaConfigured, setMfaConfigured] = useState(false);

  // MOU Signing State
  const [mouSignerName, setMouSignerName] = useState('');
  const [mouSignerTitle, setMouSignerTitle] = useState('Principal');
  const [mouAgreed, setMouAgreed] = useState(false);
  const [mouSigning, setMouSigning] = useState(false);
  const [mouSignedSuccess, setMouSignedSuccess] = useState(false);
  const [mouError, setMouError] = useState<string | null>(null);

  // Search for the invite when token or email param changes
  useEffect(() => {
    findInvite(tokenParam, emailParam);
  }, [tokenParam, emailParam, pendingInvites]);

  const findInvite = async (token: string, emailQuery: string) => {
    setLoadingInvite(true);
    setLookupError(null);

    const tokenClean = token.trim();
    const emailClean = emailQuery.trim().toLowerCase();
    const targetEmail = emailClean || (tokenClean.includes('@') ? tokenClean.toLowerCase() : '');

    let found: PendingInvite | undefined;

    // 1. Search in local props pendingInvites
    if (tokenClean) {
      found = pendingInvites.find(
        (i) =>
          i.id.toLowerCase() === tokenClean.toLowerCase() ||
          i.inviteCode?.toLowerCase() === tokenClean.toLowerCase()
      );
    }
    if (!found && (emailClean || targetEmail)) {
      found = pendingInvites.find(
        (i) => i.email.toLowerCase() === (emailClean || targetEmail)
      );
    }

    // 2. Search in Firestore pendingInvites collection if not found locally
    if (!found && db) {
      try {
        if (tokenClean && !tokenClean.includes('@')) {
          const docRef = doc(db, 'pendingInvites', tokenClean);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            found = { ...(docSnap.data() as PendingInvite), id: docSnap.id };
          }
        }
        if (!found) {
          const qSnap = await getDocs(pendingInvitesCol);
          qSnap.forEach((d) => {
            const data = d.data() as PendingInvite;
            if (
              tokenClean &&
              (d.id.toLowerCase() === tokenClean.toLowerCase() ||
                data.inviteCode?.toLowerCase() === tokenClean.toLowerCase())
            ) {
              found = { ...data, id: d.id };
            } else if (targetEmail && data.email?.toLowerCase() === targetEmail) {
              found = { ...data, id: d.id };
            }
          });
        }
      } catch (err) {
        console.warn('Error querying Firestore pendingInvites:', err);
      }
    }

    // 3. Search in Firestore schools collection (Principal or Additional Contacts)
    if (!found && targetEmail && db) {
      try {
        const schSnap = await getDocs(schoolsCol);
        for (const docSnap of schSnap.docs) {
          const s = docSnap.data() as School;
          const sId = docSnap.id;
          if (s.principalEmail?.toLowerCase() === targetEmail) {
            found = {
              id: `INV-SCH-${sId}`,
              email: targetEmail,
              name: s.principalName?.replace(/\s*\(Pending\)\s*/gi, '').trim() || 'Principal',
              role: 'principal',
              schoolId: sId,
              schoolName: s.name,
              jobTitle: 'Principal',
              invitedBy: 'PEF Administration',
              invitedAt: s.createdAt || new Date().toISOString(),
              expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
              status: 'pending',
            };
            break;
          }
          const contact = s.additionalContacts?.find((c) => c.email?.toLowerCase() === targetEmail);
          if (contact) {
            found = {
              id: `INV-CNT-${contact.id || Date.now()}`,
              email: targetEmail,
              name: contact.name || 'Authorized Contact',
              role: 'additional_contact',
              schoolId: sId,
              schoolName: s.name,
              jobTitle: contact.jobTitle || 'Authorized Staff',
              invitedBy: 'PEF Administration',
              invitedAt: new Date().toISOString(),
              expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
              status: 'pending',
            };
            break;
          }
        }
      } catch (err) {
        console.warn('Error querying Firestore schools for invite:', err);
      }
    }

    // 4. Search in Firestore appUsers collection (e.g. pending users created by admin)
    if (!found && targetEmail && db) {
      try {
        const usersSnap = await getDocs(appUsersCol);
        for (const docSnap of usersSnap.docs) {
          const u = docSnap.data() as any;
          if (u.email?.toLowerCase() === targetEmail) {
            found = {
              id: `INV-USR-${docSnap.id}`,
              email: targetEmail,
              name: u.name || u.displayName || 'Authorized User',
              role: u.role || 'principal',
              schoolId: u.schoolId,
              schoolName: u.schoolName,
              jobTitle: u.jobTitle || (u.role === 'principal' ? 'Principal' : 'Authorized Staff'),
              invitedBy: 'PEF Administration',
              invitedAt: u.createdAt || new Date().toISOString(),
              expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
              status: 'pending',
            };
            break;
          }
        }
      } catch (err) {
        console.warn('Error querying Firestore appUsers for invite:', err);
      }
    }

    // 5. Search in local props schools array (Fallback for in-memory mock testing)
    if (!found && targetEmail) {
      const sch = schools.find(
        (s) =>
          s.principalEmail?.toLowerCase() === targetEmail ||
          s.additionalContacts?.some((c) => c.email.toLowerCase() === targetEmail)
      );
      if (sch) {
        const isPrincipal = sch.principalEmail?.toLowerCase() === targetEmail;
        const contact = sch.additionalContacts?.find((c) => c.email.toLowerCase() === targetEmail);
        found = {
          id: `INV-AUTO-${Date.now()}`,
          email: targetEmail,
          name: isPrincipal
            ? sch.principalName?.replace(/\s*\(Pending\)\s*/gi, '').trim() || 'Principal'
            : contact?.name || 'Authorized Contact',
          role: isPrincipal ? 'principal' : 'additional_contact',
          schoolId: sch.id,
          schoolName: sch.name,
          jobTitle: isPrincipal ? 'Principal' : contact?.jobTitle || 'Authorized Staff',
          invitedBy: 'PEF Administration',
          invitedAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          status: 'pending',
        };
      }
    }

    if (found) {
      setMatchedInvite(found);
      setFullName(found.name || '');
      setMouSignerName(found.name || '');
      setMouSignerTitle(found.jobTitle || (found.role === 'principal' ? 'Principal' : 'Authorized Contact'));
      setManualEmail(found.email);
      setLookupError(null);

      // Load school information from props or directly from Firestore
      let targetSchool = schools.find((s) => s.id === found?.schoolId);
      if (!targetSchool && found.schoolId && db) {
        try {
          const sDoc = await getDoc(doc(db, 'schools', found.schoolId));
          if (sDoc.exists()) {
            targetSchool = { ...(sDoc.data() as School), id: sDoc.id };
          }
        } catch (err) {
          console.warn('Error fetching school doc for invite:', err);
        }
      }

      if (targetSchool) {
        setMatchedSchool(targetSchool);
        if (targetSchool.currentMouSigned) {
          setMouSignedSuccess(true);
        }
      }

      // If user is already logged in with this exact email, advance to MFA step or MOU
      if (user && user.email?.toLowerCase() === found.email.toLowerCase()) {
        initMfaStep(found.email);
        setWizardStep(2);
      }
    } else if (tokenClean || emailClean || targetEmail) {
      setLookupError(
        'We could not find an active pending invitation for this link. Please verify your email address below or contact your administrator.'
      );
    }
    setLoadingInvite(false);
  };

  const handleManualEmailLookup = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualEmail.trim()) {
      setLookupError('Please enter the email address your invitation was sent to.');
      return;
    }
    findInvite('', manualEmail.trim());
  };

  // Initialize MFA generation
  const initMfaStep = (email: string) => {
    try {
      const setupData = generateTotpSetupData(email);
      setMfaSecretKey(setupData.secretKey);
      setMfaQrCodeUrl(setupData.qrCodeUrl);
      setMfaRecoveryCodes(setupData.recoveryCodes);
      setMfaError(null);
    } catch (err) {
      console.error('Error generating MFA data:', err);
    }
  };

  // Step 1: Send Password Reset Link
  const handleSendPasswordResetLink = async () => {
    if (!matchedInvite?.email) return;
    setResetEmailSending(true);
    setAuthError(null);
    try {
      await sendPasswordReset(matchedInvite.email);
      setResetEmailSent(true);
    } catch (err: unknown) {
      console.error('Password reset request error:', err);
      const errMsg = err instanceof Error ? err.message : 'Failed to send password reset email';
      setAuthError(errMsg);
    } finally {
      setResetEmailSending(false);
    }
  };

  // Step 1: Submit Password Creation
  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);

    if (!matchedInvite) return;

    if (!isExistingAccountMode && !fullName.trim()) {
      setAuthError('Please provide your full name.');
      return;
    }

    if (password.length < 6) {
      setAuthError('Password must be at least 6 characters in length.');
      return;
    }

    if (!isExistingAccountMode && password !== confirmPassword) {
      setAuthError('Passwords do not match. Please verify your password.');
      return;
    }

    setAuthSubmitting(true);
    try {
      // If signed in as a different user in the browser, sign out cleanly first
      if (user && user.email?.toLowerCase() !== matchedInvite.email.toLowerCase()) {
        await signOut();
      }

      if (isExistingAccountMode) {
        await signInWithEmail(matchedInvite.email, password);
      } else {
        await signUpWithEmail(matchedInvite.email, password, fullName.trim());
      }

      // Advance to Step 2: MFA setup
      initMfaStep(matchedInvite.email);
      setWizardStep(2);
    } catch (err: unknown) {
      console.error('Sign up error:', err);
      const errMsg = err instanceof Error ? err.message : String(err);
      if (
        errMsg.includes('email-already-in-use') ||
        errMsg.includes('already in use') ||
        errMsg.includes('already exists')
      ) {
        setAuthError(
          'An account with this email is already registered in Firebase. If you previously created an account or set a password, enter your existing password below, request a reset email, or use Google SSO.'
        );
        setIsExistingAccountMode(true);
      } else if (
        errMsg.includes('wrong-password') ||
        errMsg.includes('invalid-credential') ||
        errMsg.includes('invalid-login-credentials')
      ) {
        setAuthError('Incorrect password. Please verify your credentials or click "Send Password Reset Email" below.');
      } else {
        setAuthError(errMsg || 'Failed to create credentials. Please try again.');
      }
    } finally {
      setAuthSubmitting(false);
    }
  };

  // Step 1: Submit Google SSO
  const handleGoogleSubmit = async () => {
    setAuthError(null);
    setAuthSubmitting(true);
    try {
      // If signed in as a different user, sign out cleanly first
      if (user && user.email?.toLowerCase() !== matchedInvite?.email.toLowerCase()) {
        await signOut();
      }
      await signInWithGoogle();
      const currentEmail = user?.email || matchedInvite?.email || '';
      initMfaStep(currentEmail);
      setWizardStep(2);
    } catch (err: unknown) {
      console.error('Google Sign-In error:', err);
      const errMsg = err instanceof Error ? err.message : String(err);
      setAuthError(errMsg || 'Google authentication failed. Please try again.');
    } finally {
      setAuthSubmitting(false);
    }
  };

  // Step 2: Verify and Enroll TOTP MFA
  const handleVerifyMfa = async (e: React.FormEvent) => {
    e.preventDefault();
    setMfaError(null);

    if (mfaVerificationCode.length !== 6) {
      setMfaError('Please enter a 6-digit security code from your authenticator app.');
      return;
    }

    setMfaVerifying(true);
    try {
      const isValid = verifyTotpCode(mfaSecretKey, mfaVerificationCode);
      if (!isValid) {
        setMfaError('Invalid code. Ensure your device clock is synchronized and try again.');
        setMfaVerifying(false);
        return;
      }

      // Save MFA secret and recovery codes
      await enableMfaWithCredentials(mfaSecretKey, mfaRecoveryCodes);
      setMfaConfigured(true);
      
      // Check if MOU is needed for this user's school
      advanceFromMfa();
    } catch (err) {
      console.error('MFA verify error:', err);
      setMfaError('Failed to activate 2FA. Please try again.');
    } finally {
      setMfaVerifying(false);
    }
  };

  const handleSkipMfa = () => {
    setMfaConfigured(false);
    advanceFromMfa();
  };

  const advanceFromMfa = () => {
    // If school exists and user is Principal/authorized and MOU is not signed yet, show MOU step (3)
    const isPrincipal = matchedInvite?.role === 'principal' || userProfile?.role === 'principal';
    const isMouPending = matchedSchool && !matchedSchool.currentMouSigned;

    if (isPrincipal || isMouPending) {
      setWizardStep(3);
    } else {
      setWizardStep(4);
    }
  };

  // Step 3: Sign & Execute Annual Memorandum of Understanding (MOU)
  const handleSignMou = async (e: React.FormEvent) => {
    e.preventDefault();
    setMouError(null);

    if (!mouAgreed) {
      setMouError('Please check the box to certify authorization and accept the MOU agreement terms.');
      return;
    }

    if (!mouSignerName.trim()) {
      setMouError('Please enter your full name as the electronic signature.');
      return;
    }

    if (!mouSignerTitle.trim()) {
      setMouError('Please enter your official title (e.g. Principal).');
      return;
    }

    setMouSigning(true);
    try {
      const overrideVersion = matchedSchool?.customMouVersionId
        ? settings?.mouVersions?.find((v) => v.id === matchedSchool.customMouVersionId)
        : undefined;
      const activeMouVersionId =
        overrideVersion?.id ||
        matchedSchool?.customMouVersionId ||
        (matchedSchool?.hasCustomMou && matchedSchool?.currentMouVersionId) ||
        (settings?.currentMouVersionId || 'mou-v1-2026-2027');
      const timestamp = new Date().toISOString();
      const signer = mouSignerName.trim();
      const title = mouSignerTitle.trim();

      const schoolId = matchedSchool?.id || matchedInvite?.schoolId;
      if (schoolId) {
        const schoolUpdates: Partial<School> = {
          currentMouSigned: true,
          currentMouSignedAt: timestamp,
          currentMouSignedBy: signer,
          currentMouSignedByTitle: title,
          currentMouVersionId: activeMouVersionId,
          status: 'active',
        };

        if (onUpdateSchool) {
          onUpdateSchool(schoolId, schoolUpdates);
        }

        // Direct persistence to Firestore - ONLY update principal leadership and signed MOU status
        if (db) {
          await updateSchoolFieldsInFirestore(schoolId, {
            principalName: signer,
            principalEmail: matchedInvite?.email || user?.email || '',
            ...schoolUpdates,
          });
        }

        // Update local matched school state
        setMatchedSchool((prev) => (prev ? { ...prev, ...schoolUpdates } : null));
      }

      setMouSignedSuccess(true);
      // Advance to final complete step
      setWizardStep(4);
    } catch (err: unknown) {
      console.error('Error signing MOU during onboarding:', err);
      const errMsg = err instanceof Error ? err.message : 'Failed to record MOU signature. Please try again.';
      setMouError(errMsg);
    } finally {
      setMouSigning(false);
    }
  };

  const handleCopyKey = () => {
    if (!mfaSecretKey) return;
    navigator.clipboard.writeText(mfaSecretKey);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  const handleCopyRecoveryCodes = () => {
    if (mfaRecoveryCodes.length === 0) return;
    const text = `PEF PORTAL MFA RECOVERY CODES\nAccount: ${matchedInvite?.email || user?.email}\nGenerated: ${new Date().toLocaleString()}\n\n${mfaRecoveryCodes.join('\n')}\n\nKeep these backup codes in a secure location. Each code can be used once.`;
    navigator.clipboard.writeText(text);
    setCopiedCodes(true);
    setTimeout(() => setCopiedCodes(false), 2000);
  };

  const handleDownloadRecoveryCodes = () => {
    if (mfaRecoveryCodes.length === 0) return;
    const content = `PEF PORTAL MFA RECOVERY CODES\nAccount: ${matchedInvite?.email || user?.email}\nGenerated: ${new Date().toLocaleString()}\n\n${mfaRecoveryCodes.join('\n')}\n\nKeep these backup codes in a secure location. Each code can be used once to access your account.`;
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `pef-recovery-codes-${matchedInvite?.email || 'user'}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleFinishAndEnter = () => {
    const role = userProfile?.role || matchedInvite?.role || 'principal';
    if (role === 'admin') {
      navigate('/admin');
    } else {
      navigate('/dashboard');
    }
  };

  const getRoleBadge = (role?: UserRole) => {
    switch (role) {
      case 'admin':
        return { label: 'Program Administrator', color: 'bg-indigo-100 text-indigo-800 border-indigo-200' };
      case 'principal':
        return { label: 'School Principal', color: 'bg-emerald-100 text-emerald-800 border-emerald-200' };
      case 'additional_contact':
        return { label: 'Authorized Contact', color: 'bg-amber-100 text-amber-800 border-amber-200' };
      default:
        return { label: 'Portal Member', color: 'bg-slate-100 text-slate-800 border-slate-200' };
    }
  };

  // Determine whether this flow should include the MOU signing step
  const isPrincipalRole = matchedInvite?.role === 'principal' || userProfile?.role === 'principal';
  const showMouStepInFlow = isPrincipalRole || (matchedSchool && !matchedSchool.currentMouSigned);
  const overrideMouVersion = matchedSchool?.customMouVersionId
    ? settings?.mouVersions?.find((v) => v.id === matchedSchool.customMouVersionId)
    : undefined;
  const currentMouVersion =
    overrideMouVersion ||
    settings?.mouVersions?.find((v) => v.id === settings.currentMouVersionId) ||
    settings?.mouVersions?.[0];
  const hasSchoolCustomMou = Boolean(
    matchedSchool?.customMouVersionId ||
    matchedSchool?.hasCustomMou ||
    (matchedSchool?.hasCustomMou && matchedSchool?.customMouContent?.trim())
  );

  return (
    <div className="min-h-screen bg-[#F3F6FA] text-slate-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden selection:bg-[#0089B3] selection:text-white">
      {/* Background accents */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-96 bg-gradient-to-b from-[#0089B3]/5 via-[#6EBF00]/5 to-transparent blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="sm:mx-auto sm:w-full sm:max-w-xl text-center relative z-10">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[#EDF7FC] border border-[#0089B3]/20 text-[#0089B3] mb-4 shadow-md">
          <ShieldCheck className="w-8 h-8" />
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-[#0F172A]" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
          Account Onboarding
        </h1>
        <p className="mt-1.5 text-xs sm:text-sm text-slate-500 font-medium">
          Principal Emergency Fund (PEF) Portal
        </p>

        {/* Wizard Progress Stepper */}
        <div className="flex items-center justify-center gap-1.5 sm:gap-2 mt-6 flex-wrap">
          {/* Step 1: Credentials */}
          <div
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold border transition-colors ${
              wizardStep === 1
                ? 'bg-[#0089B3] text-white border-[#0089B3]'
                : 'bg-white text-slate-500 border-slate-200'
            }`}
          >
            <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-black ${
              wizardStep === 1 ? 'bg-white text-[#0089B3]' : 'bg-slate-100 text-slate-500'
            }`}>
              1
            </span>
            <span>Password</span>
          </div>

          <div className="w-3 sm:w-4 h-0.5 bg-slate-200" />

          {/* Step 2: 2FA */}
          <div
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold border transition-colors ${
              wizardStep === 2
                ? 'bg-[#0089B3] text-white border-[#0089B3]'
                : 'bg-white text-slate-500 border-slate-200'
            }`}
          >
            <span
              className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-black ${
                wizardStep === 2
                  ? 'bg-white text-[#0089B3]'
                  : 'bg-slate-100 text-slate-500'
              }`}
            >
              2
            </span>
            <span>2FA Security</span>
          </div>

          {/* Step 3: MOU (Conditional if Principal / Pending MOU) */}
          {showMouStepInFlow && (
            <>
              <div className="w-3 sm:w-4 h-0.5 bg-slate-200" />
              <div
                className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold border transition-colors ${
                  wizardStep === 3
                    ? 'bg-[#0089B3] text-white border-[#0089B3]'
                    : 'bg-white text-slate-500 border-slate-200'
                }`}
              >
                <span
                  className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-black ${
                    wizardStep === 3
                      ? 'bg-white text-[#0089B3]'
                      : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  3
                </span>
                <span>Sign MOU</span>
              </div>
            </>
          )}

          <div className="w-3 sm:w-4 h-0.5 bg-slate-200" />

          {/* Step 4 (or 3): Complete */}
          <div
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold border transition-colors ${
              wizardStep === 4 || (!showMouStepInFlow && wizardStep === 3)
                ? 'bg-[#0089B3] text-white border-[#0089B3]'
                : 'bg-white text-slate-500 border-slate-200'
            }`}
          >
            <span
              className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-black ${
                wizardStep === 4 || (!showMouStepInFlow && wizardStep === 3)
                  ? 'bg-white text-[#0089B3]'
                  : 'bg-slate-100 text-slate-500'
              }`}
            >
              {showMouStepInFlow ? 4 : 3}
            </span>
            <span>Enter Portal</span>
          </div>
        </div>
      </div>

      {/* Main Content Card */}
      <div className={`mt-6 sm:mx-auto sm:w-full ${wizardStep === 3 ? 'sm:max-w-2xl' : 'sm:max-w-lg'} relative z-10 px-4 sm:px-0`}>
        <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xl space-y-6">
          {/* Loading Invite State */}
          {loadingInvite && (
            <div className="py-12 flex flex-col items-center justify-center text-center space-y-3">
              <Loader2 className="w-8 h-8 text-[#0089B3] animate-spin" />
              <p className="text-sm font-semibold text-slate-700">
                Verifying your invitation link...
              </p>
            </div>
          )}

          {/* Missing / Unmatched Invite Screen */}
          {!loadingInvite && !matchedInvite && (
            <div className="space-y-5">
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="text-xs text-amber-900 leading-relaxed">
                  <p className="font-bold text-amber-950 mb-1">
                    Invitation Link Required
                  </p>
                  {lookupError ||
                    'Please open the exact invitation link sent to your email address, or enter your email address below to look up your pre-authorized profile.'}
                </div>
              </div>

              <form onSubmit={handleManualEmailLookup} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Your Invited Email Address
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                    <input
                      type="email"
                      required
                      placeholder="e.g. principal@school.org"
                      value={manualEmail}
                      onChange={(e) => setManualEmail(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 text-sm focus:outline-none focus:border-[#0089B3] focus:ring-1 focus:ring-[#0089B3] font-medium"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-3 bg-[#0089B3] hover:bg-[#007399] text-white font-bold rounded-xl text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md shadow-[#0089B3]/20 transition-all cursor-pointer"
                >
                  <Search className="w-4 h-4" />
                  Look Up My Invitation
                </button>
              </form>

              <div className="border-t border-slate-100 pt-4 text-center">
                <p className="text-xs text-slate-500">
                  Already completed your account setup?{' '}
                  <Link
                    to="/login"
                    className="text-[#0089B3] font-bold hover:underline"
                  >
                    Sign in to your account
                  </Link>
                </p>
              </div>
            </div>
          )}

          {/* STEP 1: Set New Password or Google SSO */}
          {!loadingInvite && matchedInvite && wizardStep === 1 && (
            <div className="space-y-6 animate-fade-in">
              {/* Active Admin Session Testing Notice */}
              {user && user.email?.toLowerCase() !== matchedInvite.email.toLowerCase() && (
                <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div className="flex-1 space-y-1">
                    <div className="font-bold flex items-center justify-between">
                      <span>Administrator Testing Notice</span>
                      <button
                        type="button"
                        onClick={() => signOut()}
                        className="text-[11px] font-bold text-amber-800 underline hover:text-amber-950 cursor-pointer"
                      >
                        Sign Out of Current Session
                      </button>
                    </div>
                    <p className="text-[11px] text-amber-800 leading-relaxed">
                      You are currently signed in as <span className="font-semibold text-slate-900">{user.email}</span> while viewing the onboarding setup for <span className="font-semibold text-slate-900">{matchedInvite.email}</span>. Creating a password or logging in with Google will transition your session to this user.
                    </p>
                  </div>
                </div>
              )}

              {/* Pre-provisioned Profile Overview */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between gap-2 border-b border-slate-200/80 pb-2.5">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-[#0089B3]" />
                    <span className="text-[11px] font-black uppercase tracking-wider text-slate-600">
                      Pre-Authorized School Invitation
                    </span>
                  </div>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                      getRoleBadge(matchedInvite.role).color
                    }`}
                  >
                    {getRoleBadge(matchedInvite.role).label}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-slate-500 block text-[10px] font-semibold">
                      Account Name
                    </span>
                    <span className="font-bold text-slate-900">
                      {matchedInvite.name}
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-500 block text-[10px] font-semibold">
                      Authorized Email
                    </span>
                    <span className="font-mono text-[#0089B3] font-bold">
                      {matchedInvite.email}
                    </span>
                  </div>

                  {matchedInvite.schoolName && (
                    <div className="sm:col-span-2">
                      <span className="text-slate-500 block text-[10px] font-semibold">
                        School Affiliation
                      </span>
                      <div className="flex items-center justify-between text-slate-800 font-medium">
                        <span className="flex items-center gap-1.5">
                          <Building2 className="w-3.5 h-3.5 text-slate-400" />
                          {matchedInvite.schoolName}
                        </span>
                        {matchedSchool?.annualBudget && (
                          <span className="text-[#0089B3] font-black text-[11px]">
                            ${matchedSchool.annualBudget.toLocaleString()} Relief Allocation
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {matchedInvite.notes && (
                    <div className="sm:col-span-2 bg-white p-2.5 rounded-xl text-[11px] text-slate-600 italic border border-slate-200">
                      "{matchedInvite.notes}"
                    </div>
                  )}
                </div>
              </div>

              {/* Auth Method Selector */}
              <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-2xl border border-slate-200">
                <button
                  type="button"
                  onClick={() => {
                    setAuthMethod('password');
                    setAuthError(null);
                  }}
                  className={`py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    authMethod === 'password'
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <Key className="w-3.5 h-3.5" />
                  Set Password
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAuthMethod('google');
                    setAuthError(null);
                  }}
                  className={`py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    authMethod === 'google'
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                  </svg>
                  Google Sign-In
                </button>
              </div>

              {resetEmailSent && (
                <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="block text-emerald-950">Password Reset Email Dispatched</strong>
                    <span>
                      We sent a reset link to <strong className="font-mono text-slate-900">{matchedInvite.email}</strong>.
                      Follow the link in your email to update your password, then return here or log in.
                    </span>
                  </div>
                </div>
              )}

              {authError && (
                <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 space-y-2.5">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    <span>{authError}</span>
                  </div>

                  {(authError.includes('already registered') ||
                    authError.includes('already exists') ||
                    authError.includes('Incorrect password') ||
                    isExistingAccountMode) && (
                    <div className="pt-2 border-t border-rose-200 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={handleSendPasswordResetLink}
                        disabled={resetEmailSending || resetEmailSent}
                        className="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-800 rounded-lg text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1.5 border border-slate-300 disabled:opacity-50"
                      >
                        {resetEmailSending ? (
                          <>
                            <Loader2 className="w-3 h-3 animate-spin" />
                            <span>Sending Reset Email...</span>
                          </>
                        ) : resetEmailSent ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-600" />
                            <span>Reset Link Sent</span>
                          </>
                        ) : (
                          <>
                            <Mail className="w-3 h-3 text-[#0089B3]" />
                            <span>Send Password Reset Email</span>
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setAuthMethod('google');
                          setAuthError(null);
                        }}
                        className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1.5"
                      >
                        <svg className="w-3 h-3 fill-current" viewBox="0 0 24 24">
                          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                        </svg>
                        <span>Sign In with Google SSO</span>
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* First-Time Password Creation Form */}
              {authMethod === 'password' && (
                <form onSubmit={handlePasswordSubmit} className="space-y-4">
                  {isExistingAccountMode ? (
                    <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-xl text-[11px] text-indigo-900 flex items-center justify-between">
                      <span>Enter existing password to activate your school role.</span>
                      <button
                        type="button"
                        onClick={() => {
                          setIsExistingAccountMode(false);
                          setAuthError(null);
                        }}
                        className="text-xs font-bold text-[#0089B3] hover:underline shrink-0 ml-2"
                      >
                        Create Password Mode
                      </button>
                    </div>
                  ) : null}

                  {!isExistingAccountMode && (
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Full Name
                      </label>
                      <div className="relative">
                        <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                        <input
                          type="text"
                          required
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 text-xs sm:text-sm focus:outline-none focus:border-[#0089B3] focus:ring-1 focus:ring-[#0089B3] font-medium"
                        />
                      </div>
                    </div>
                  )}

                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="block text-xs font-bold text-slate-700">
                        {isExistingAccountMode ? 'Enter Account Password' : 'Create Password'}
                      </label>
                      {isExistingAccountMode && (
                        <button
                          type="button"
                          onClick={handleSendPasswordResetLink}
                          disabled={resetEmailSending}
                          className="text-[11px] font-bold text-[#0089B3] hover:underline cursor-pointer"
                        >
                          Forgot password?
                        </button>
                      )}
                    </div>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        placeholder={isExistingAccountMode ? 'Enter your password' : 'Create a secure password (min 6 chars)'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 text-xs sm:text-sm focus:outline-none focus:border-[#0089B3] focus:ring-1 focus:ring-[#0089B3] font-medium"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 cursor-pointer"
                      >
                        {showPassword ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  {!isExistingAccountMode && (
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Confirm Password
                      </label>
                      <div className="relative">
                        <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                        <input
                          type={showConfirmPassword ? 'text' : 'password'}
                          required
                          placeholder="Re-enter your password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 text-xs sm:text-sm focus:outline-none focus:border-[#0089B3] focus:ring-1 focus:ring-[#0089B3] font-medium"
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 cursor-pointer"
                        >
                          {showConfirmPassword ? (
                            <EyeOff className="w-4 h-4" />
                          ) : (
                            <Eye className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={authSubmitting}
                    className="w-full py-3 bg-[#0089B3] hover:bg-[#007399] text-white font-bold rounded-xl text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md shadow-[#0089B3]/25 transition-all cursor-pointer disabled:opacity-50"
                  >
                    {authSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        {isExistingAccountMode ? 'Authenticating...' : 'Creating Credentials...'}
                      </>
                    ) : (
                      <>
                        <span>{isExistingAccountMode ? 'Sign In & Continue' : 'Continue to Security Setup'}</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </form>
              )}

              {/* Google SSO Option */}
              {authMethod === 'google' && (
                <div className="space-y-4 text-center">
                  <p className="text-xs text-slate-600">
                    Connect your account using Google Single Sign-On with{' '}
                    <strong className="text-[#0089B3] font-mono">
                      {matchedInvite.email}
                    </strong>
                    .
                  </p>

                  <button
                    type="button"
                    onClick={handleGoogleSubmit}
                    disabled={authSubmitting}
                    className="w-full py-3 bg-white hover:bg-slate-50 text-slate-800 font-bold rounded-xl text-xs sm:text-sm flex items-center justify-center gap-2.5 border border-slate-300 shadow-sm transition-all cursor-pointer disabled:opacity-50"
                  >
                    {authSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-slate-800" />
                        Connecting with Google...
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" viewBox="0 0 24 24">
                          <path
                            fill="#4285F4"
                            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                          />
                          <path
                            fill="#34A853"
                            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                          />
                          <path
                            fill="#FBBC05"
                            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                          />
                          <path
                            fill="#EA4335"
                            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                          />
                        </svg>
                        <span>Continue with Google</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* STEP 2: MFA Setup (TOTP Authenticator & Recovery Codes) */}
          {!loadingInvite && wizardStep === 2 && (
            <div className="space-y-6 animate-fade-in">
              <div className="text-center space-y-1">
                <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-[#EDF7FC] border border-[#0089B3]/20 text-[#0089B3] mb-1">
                  <Smartphone className="w-5 h-5" />
                </div>
                <h2 className="text-base font-bold text-slate-900">
                  Two-Factor Authentication (2FA)
                </h2>
                <p className="text-xs text-slate-500">
                  Protect student data and emergency relief funds with an authenticator app (Google Authenticator, Microsoft Authenticator, 1Password).
                </p>
              </div>

              {/* QR Code & Secret Key */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-4">
                <div className="flex flex-col sm:flex-row items-center gap-4">
                  <div className="p-2.5 bg-white rounded-xl shadow-md shrink-0 border border-slate-200">
                    {mfaQrCodeUrl ? (
                      <QRCodeSVG value={mfaQrCodeUrl} size={118} />
                    ) : (
                      <div className="w-[118px] h-[118px] bg-slate-200 animate-pulse rounded" />
                    )}
                  </div>

                  <div className="space-y-2 text-xs flex-1 min-w-0">
                    <p className="text-slate-800 font-semibold">
                      1. Scan the QR code with your authenticator app
                    </p>
                    <p className="text-[11px] text-slate-500">
                      Or manually enter this secret key:
                    </p>
                    <div className="flex items-center gap-2 bg-white p-2 rounded-xl border border-slate-200 font-mono text-[11px] text-[#0089B3] font-bold break-all">
                      <span className="truncate">{mfaSecretKey}</span>
                      <button
                        type="button"
                        onClick={handleCopyKey}
                        className="p-1 text-slate-400 hover:text-slate-700 shrink-0 cursor-pointer"
                        title="Copy Key"
                      >
                        {copiedKey ? (
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Verification Form */}
                <form onSubmit={handleVerifyMfa} className="space-y-3 border-t border-slate-200 pt-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      2. Enter the 6-digit code shown in your app
                    </label>
                    <input
                      type="text"
                      maxLength={6}
                      pattern="[0-9]*"
                      inputMode="numeric"
                      placeholder="000000"
                      value={mfaVerificationCode}
                      onChange={(e) =>
                        setMfaVerificationCode(
                          e.target.value.replace(/\D/g, '').slice(0, 6)
                        )
                      }
                      className="w-full py-2.5 px-4 bg-white border border-slate-300 rounded-xl text-center text-xl font-mono tracking-widest text-[#0089B3] font-bold focus:outline-none focus:border-[#0089B3] focus:ring-1 focus:ring-[#0089B3]"
                    />
                  </div>

                  {mfaError && (
                    <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                      <span>{mfaError}</span>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={mfaVerifying || mfaVerificationCode.length !== 6}
                    className="w-full py-2.5 bg-[#0089B3] hover:bg-[#007399] text-white font-bold rounded-xl text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer disabled:opacity-50"
                  >
                    {mfaVerifying ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Verifying Code...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        Verify & Continue
                      </>
                    )}
                  </button>
                </form>
              </div>

              {/* Emergency Backup Recovery Codes */}
              {mfaRecoveryCodes.length > 0 && (
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-700 text-[11px] flex items-center gap-1.5">
                      <Key className="w-3.5 h-3.5 text-amber-500" />
                      Emergency Recovery Codes
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={handleCopyRecoveryCodes}
                        className="px-2 py-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                      >
                        {copiedCodes ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                        {copiedCodes ? 'Copied' : 'Copy All'}
                      </button>
                      <button
                        type="button"
                        onClick={handleDownloadRecoveryCodes}
                        className="px-2 py-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <Download className="w-3 h-3" />
                        Download
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5 font-mono text-[10px] text-slate-700 bg-white p-2 rounded-xl border border-slate-200">
                    {mfaRecoveryCodes.slice(0, 4).map((c, i) => (
                      <div key={i} className="px-1 font-bold">{c}</div>
                    ))}
                    <div className="text-[9px] text-slate-400 italic col-span-2 text-center pt-0.5">
                      + 6 additional backup codes saved
                    </div>
                  </div>
                </div>
              )}

              {/* Optional Skip */}
              <div className="text-center pt-1">
                <button
                  type="button"
                  onClick={handleSkipMfa}
                  className="text-xs text-slate-500 hover:text-slate-800 underline cursor-pointer font-medium"
                >
                  I'll configure 2FA later in Profile Settings
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: Review & Sign Memorandum of Understanding (MOU) */}
          {!loadingInvite && wizardStep === 3 && (
            <div className="space-y-5 animate-fade-in">
              <div className="text-center space-y-1">
                <div className={`inline-flex items-center justify-center w-10 h-10 rounded-xl ${
                  hasSchoolCustomMou
                    ? 'bg-purple-50 border border-purple-200 text-purple-600'
                    : 'bg-[#EDF7FC] border border-[#0089B3]/20 text-[#0089B3]'
                } mb-1`}>
                  {hasSchoolCustomMou ? <Sparkles className="w-5 h-5" /> : <FileText className="w-5 h-5" />}
                </div>
                <div className="flex items-center justify-center gap-2">
                  <h2 className="text-base sm:text-lg font-bold text-slate-900">
                    Annual Memorandum of Understanding (MOU)
                  </h2>
                </div>
                <div className="flex items-center justify-center gap-2">
                  <p className="text-xs text-slate-500">
                    {matchedSchool?.name || matchedInvite.schoolName || 'School'} · Academic Year 2026–2027
                  </p>
                  {hasSchoolCustomMou && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#EDF7FC] text-[#006E8F] border border-[#0089B3]/30 flex items-center gap-1">
                      <Sparkles className="w-2.5 h-2.5 text-[#0089B3]" />
                      MOU Version Override
                    </span>
                  )}
                </div>
              </div>

              {/* Custom MOU Callout if customized for this school */}
              {hasSchoolCustomMou && (
                <div className="p-3 bg-[#EDF7FC] border border-[#0089B3]/30 rounded-2xl flex items-start gap-2.5 text-xs text-[#006E8F]">
                  <Sparkles className="w-4 h-4 text-[#0089B3] shrink-0 mt-0.5" />
                  <div className="space-y-0.5">
                    <strong className="block text-slate-900 font-bold">
                      Assigned Version: {currentMouVersion?.name || 'MOU Version Override'}
                    </strong>
                    <p className="text-[11px] text-slate-600 leading-relaxed">
                      This school has been assigned a specific Memorandum of Understanding version for <strong className="text-slate-900">{matchedSchool?.name}</strong>.
                    </p>
                    {matchedSchool?.customMouReason && (
                      <p className="text-[10px] text-slate-500 italic pt-0.5">
                        Note: "{matchedSchool.customMouReason}"
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* MOU Details & Highlights */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs bg-slate-50 border border-slate-200 rounded-2xl p-3.5">
                <div>
                  <span className="text-[10px] text-slate-500 block font-semibold">School Allocation</span>
                  <span className="font-black text-[#0089B3] text-sm">
                    ${(matchedSchool?.annualBudget || 10000).toLocaleString()}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block font-semibold">Max Per Request</span>
                  <span className="font-bold text-slate-900 text-sm">
                    ${(settings?.maxPerRequestAmount || 2000).toLocaleString()}
                  </span>
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <span className="text-[10px] text-slate-500 block font-semibold">Governance Status</span>
                  <span className="inline-flex items-center gap-1 font-bold text-amber-600 text-xs">
                    <AlertCircle className="w-3.5 h-3.5" /> Pending Signature
                  </span>
                </div>
              </div>

              {/* Scrollable Agreement Content */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 max-h-64 overflow-y-auto space-y-3.5 text-xs text-slate-700 leading-relaxed scrollbar-thin">
                {hasSchoolCustomMou && matchedSchool?.customMouContent ? (
                  <div className="prose prose-xs max-w-none text-slate-700 leading-relaxed space-y-2">
                    <ReactMarkdown>{matchedSchool.customMouContent}</ReactMarkdown>
                  </div>
                ) : currentMouVersion?.content ? (
                  <div className="prose prose-xs max-w-none text-slate-700 leading-relaxed space-y-2">
                    <ReactMarkdown>{currentMouVersion.content}</ReactMarkdown>
                  </div>
                ) : (
                  <>
                    <div className="space-y-1">
                      <h4 className="font-bold text-slate-900 text-xs">1. Program Overview & Emergency Purpose</h4>
                      <p className="text-slate-600 text-[11px]">
                        The Principal Emergency Fund (PEF) provided by Small Moves provides discretionary emergency financial
                        grants to support students and families experiencing immediate hardship affecting basic needs, housing, health, or school attendance.
                      </p>
                    </div>

                    <div className="space-y-1 border-t border-slate-200 pt-2.5">
                      <h4 className="font-bold text-slate-900 text-xs">2. Allocation & Spending Boundaries</h4>
                      <ul className="list-disc pl-4 space-y-1 text-slate-600 text-[11px]">
                        <li>Individual emergency grants may not exceed ${(settings?.maxPerRequestAmount || 2000).toLocaleString()} per request without prior Small Moves board authorization.</li>
                        <li>Grants must directly benefit students enrolled at {matchedSchool?.name || matchedInvite.schoolName || 'the designated school'} or their immediate household.</li>
                        <li>Funds shall not be used for school operational expenses, staff salaries, or religious activities.</li>
                      </ul>
                    </div>

                    <div className="space-y-1 border-t border-slate-200 pt-2.5">
                      <h4 className="font-bold text-slate-900 text-xs">3. Governance & Reporting Standards</h4>
                      <p className="text-slate-600 text-[11px]">
                        The Principal or designated contact agrees to record all payout disbursements accurately, verify student/beneficiary identity, and maintain confidential records in compliance with PEF reporting guidelines.
                      </p>
                    </div>

                    <div className="space-y-1 border-t border-slate-200 pt-2.5">
                      <h4 className="font-bold text-slate-900 text-xs">4. Audit Trails & Annual Reset</h4>
                      <p className="text-slate-600 text-[11px]">
                        All transactions and activities are recorded in the central audit ledger. Allocations refresh at the start of each fiscal academic year subject to an active annual MOU.
                      </p>
                    </div>
                  </>
                )}
              </div>

              {/* Electronic Signature Form */}
              <form onSubmit={handleSignMou} className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-4">
                <label className="flex items-start gap-3 p-3 bg-white border border-slate-200 rounded-xl cursor-pointer hover:border-slate-300 transition-colors">
                  <input
                    type="checkbox"
                    checked={mouAgreed}
                    onChange={(e) => setMouAgreed(e.target.checked)}
                    className="mt-0.5 rounded border-slate-300 text-[#0089B3] focus:ring-[#0089B3] w-4 h-4 cursor-pointer shrink-0"
                  />
                  <span className="text-xs text-slate-700 font-medium leading-relaxed">
                    I hereby confirm and certify that I am authorized to execute this agreement on behalf of <strong className="text-slate-900">{matchedSchool?.name || matchedInvite.schoolName || 'our school'}</strong> and accept all PEF governance conditions.
                  </span>
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Electronic Signature Full Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={mouSignerName}
                      onChange={(e) => setMouSignerName(e.target.value)}
                      placeholder="e.g. Principal Sarah Jenkins"
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#0089B3]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Official Title / Role *
                    </label>
                    <input
                      type="text"
                      required
                      value={mouSignerTitle}
                      onChange={(e) => setMouSignerTitle(e.target.value)}
                      placeholder="e.g. Principal"
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#0089B3]"
                    />
                  </div>
                </div>

                {mouError && (
                  <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>{mouError}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={mouSigning || !mouAgreed}
                  className="w-full py-3 bg-[#0089B3] hover:bg-[#007399] text-white font-bold rounded-xl text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md shadow-[#0089B3]/20 transition-all cursor-pointer disabled:opacity-50"
                >
                  {mouSigning ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Recording Signature...
                    </>
                  ) : (
                    <>
                      <FileCheck2 className="w-4 h-4" />
                      Sign & Execute MOU
                    </>
                  )}
                </button>
              </form>
            </div>
          )}

          {/* STEP 4: Complete / Success Screen */}
          {!loadingInvite && wizardStep === 4 && (
            <div className="space-y-6 text-center animate-fade-in py-2">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-3xl bg-emerald-50 border border-emerald-200 text-emerald-600 shadow-sm">
                <CheckCircle2 className="w-10 h-10" />
              </div>

              <div className="space-y-1.5">
                <h2 className="text-xl sm:text-2xl font-black text-slate-900">
                  Account Onboarding Complete!
                </h2>
                <p className="text-xs sm:text-sm text-slate-600 max-w-sm mx-auto">
                  Your credentials, security verification, and school authorization have been successfully established.
                </p>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-left space-y-2.5 text-xs">
                <div className="flex justify-between items-center text-slate-600">
                  <span>Account:</span>
                  <span className="font-bold text-slate-900">{fullName || user?.displayName || matchedInvite?.name}</span>
                </div>
                <div className="flex justify-between items-center text-slate-600">
                  <span>Role:</span>
                  <span className="font-bold text-[#0089B3] capitalize">
                    {(userProfile?.role || matchedInvite?.role || 'Principal').replace('_', ' ')}
                  </span>
                </div>
                {matchedSchool?.name && (
                  <div className="flex justify-between items-center text-slate-600">
                    <span>School:</span>
                    <span className="font-bold text-slate-900">{matchedSchool.name}</span>
                  </div>
                )}
                <div className="flex justify-between items-center text-slate-600">
                  <span>2FA Security:</span>
                  <span className={`font-bold ${mfaConfigured ? 'text-emerald-700' : 'text-amber-700'}`}>
                    {mfaConfigured ? 'Enabled (Authenticator App)' : 'Configurable in Settings'}
                  </span>
                </div>
                <div className="flex justify-between items-center text-slate-600">
                  <span>MOU Agreement:</span>
                  <span className="font-bold text-emerald-700 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Executed & Active (2026–2027)
                  </span>
                </div>
                {matchedSchool?.annualBudget && (
                  <div className="flex justify-between items-center text-slate-600 border-t border-slate-200 pt-2">
                    <span>Available Relief Funds:</span>
                    <span className="font-black text-[#0089B3] text-sm">
                      ${matchedSchool.annualBudget.toLocaleString()}
                    </span>
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={handleFinishAndEnter}
                className="w-full py-3.5 bg-[#0089B3] hover:bg-[#007399] text-white font-bold rounded-xl text-sm flex items-center justify-center gap-2 shadow-md shadow-[#0089B3]/25 transition-all cursor-pointer hover:scale-[1.01]"
              >
                <span>Enter Principal Portal</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
