import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User, updateProfile, multiFactor } from 'firebase/auth';
import { doc, getDoc, getDocs, query, where, setDoc } from 'firebase/firestore';
import { verifyRecoveryCode } from '../utils/mfaUtils';
import {
  auth,
  db,
  appUsersCol,
  adminUsersCol,
  pendingInvitesCol,
  schoolsCol,
  loginWithGoogle,
  loginWithEmail,
  signUpWithEmail,
  resetPassword,
  updatePassword,
  linkWithCredential,
  EmailAuthProvider,
  logoutUser,
  testConnection,
  saveAdminUserToFirestore,
  saveManagedUserToFirestore,
  deleteManagedUserFromFirestore,
  deleteAdminUserFromFirestore,
  deletePendingInviteFromFirestore,
  getMultiFactorResolver,
  setupTotpMfa as setupTotpMfaHelper,
  verifyAndEnrollTotpMfa as verifyAndEnrollTotpMfaHelper,
  unenrollMfa as unenrollMfaHelper,
  resolveMfaSignIn,
  sendMfaSms,
  MultiFactorResolver,
  MultiFactorInfo,
  TotpSecret,
  saveActivityLogToFirestore,
  isQuotaExceededError,
  notifyQuotaExceeded,
  getCachedCollection,
} from '../lib/firebase';
import { IMPORTED_PARTNER_SCHOOLS } from '../data/importedSchools';
import { UserProfile, UserRole, AppUser, AdminUser, PendingInvite, ActivityEvent, School } from '../types';

export const isSystemAdminEmail = (email?: string | null): boolean => {
  if (!email) return false;
  const lower = email.trim().toLowerCase();
  return (
    lower === 'cshanecolley@gmail.com' ||
    lower === 'rgraham@lff.com' ||
    lower.endsWith('@smallmoves.org') ||
    lower.endsWith('@lff.com')
  );
};

interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  activeRole: UserRole;
  setActiveRole: (role: UserRole) => void;
  activeSchoolId: string;
  setActiveSchoolId: (schoolId: string) => void;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, pass: string) => Promise<void>;
  signUpWithEmail: (email: string, pass: string, displayName: string) => Promise<void>;
  sendPasswordReset: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
  updateProfileData: (updates: Partial<UserProfile>) => void;
  // User Impersonation Workflow
  isImpersonating: boolean;
  realAdminProfile: UserProfile | null;
  startImpersonation: (targetUser: AppUser | UserProfile) => void;
  exitImpersonation: () => void;
  // MFA Workflow
  mfaResolver: MultiFactorResolver | null;
  mfaRequired: boolean;
  mfaHint: MultiFactorInfo | null;
  clearMfaState: () => void;
  completeMfaSignIn: (code: string, verificationId?: string) => Promise<void>;
  sendSmsMfaCode: (hintIndex: number, recaptchaVerifier: any) => Promise<string>;
  setupTotpMfa: () => Promise<{ totpSecret: TotpSecret; secretKey: string; qrCodeUrl: string }>;
  verifyAndEnrollTotpMfa: (totpSecret: TotpSecret, code: string, factorName?: string) => Promise<void>;
  enableMfaWithCredentials: (secretKey: string, recoveryCodes: string[]) => Promise<void>;
  redeemRecoveryCode: (code: string) => Promise<boolean>;
  disableMfa: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  userProfile: null,
  loading: true,
  activeRole: 'principal',
  setActiveRole: () => {},
  activeSchoolId: '',
  setActiveSchoolId: () => {},
  signInWithGoogle: async () => {},
  signInWithEmail: async () => {},
  signUpWithEmail: async () => {},
  sendPasswordReset: async () => {},
  signOut: async () => {},
  updateProfileData: () => {},
  isImpersonating: false,
  realAdminProfile: null,
  startImpersonation: () => {},
  exitImpersonation: () => {},
  mfaResolver: null,
  mfaRequired: false,
  mfaHint: null,
  clearMfaState: () => {},
  completeMfaSignIn: async () => {},
  sendSmsMfaCode: async () => '',
  setupTotpMfa: async () => ({ totpSecret: null as any, secretKey: '', qrCodeUrl: '' }),
  verifyAndEnrollTotpMfa: async () => {},
  enableMfaWithCredentials: async () => {},
  redeemRecoveryCode: async () => false,
  disableMfa: async () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [activeRole, setActiveRoleState] = useState<UserRole>('principal');
  const [activeSchoolId, setActiveSchoolId] = useState<string>('');
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // MFA State
  const [mfaResolver, setMfaResolver] = useState<MultiFactorResolver | null>(null);
  const [mfaRequired, setMfaRequired] = useState<boolean>(false);
  const [mfaHint, setMfaHint] = useState<MultiFactorInfo | null>(null);

  // Impersonation State
  const [isImpersonating, setIsImpersonating] = useState<boolean>(false);
  const [realAdminProfile, setRealAdminProfile] = useState<UserProfile | null>(null);

  const startImpersonation = (targetUser: AppUser | UserProfile) => {
    // Guard against impersonating Admins
    if (targetUser.role === 'admin') {
      console.warn('Security policy: Admin accounts cannot be impersonated.');
      return;
    }

    // Save current admin profile before switching
    if (!isImpersonating && userProfile) {
      setRealAdminProfile(userProfile);
    }

    const appUser = 'name' in targetUser ? (targetUser as AppUser) : null;
    const profileUser = 'displayName' in targetUser ? (targetUser as UserProfile) : null;

    const name = appUser ? appUser.name : profileUser?.displayName || targetUser.email;
    const parts = name.split(' ');
    const firstName = profileUser?.firstName || parts[0] || '';
    const lastName = profileUser?.lastName || parts.slice(1).join(' ') || '';

    const schoolIds = profileUser?.schoolIds || (appUser?.schoolId ? [appUser.schoolId] : []);

    const impersonatedProfile: UserProfile = {
      uid: profileUser?.uid || appUser?.id || `imp_${Date.now()}`,
      email: targetUser.email,
      displayName: name,
      firstName,
      lastName,
      role: targetUser.role,
      schoolIds,
      phone: targetUser.phone || '',
      jobTitle: targetUser.jobTitle,
      mfaEnabled: targetUser.mfaEnabled || false,
      emailVerified: true,
      createdAt: new Date().toISOString(),
      authProvider: profileUser?.authProvider || 'password',
    };

    setUserProfile(impersonatedProfile);
    setActiveRoleState(targetUser.role);
    if (impersonatedProfile.schoolIds.length > 0) {
      setActiveSchoolId(impersonatedProfile.schoolIds[0]);
    }
    setIsImpersonating(true);
  };

  const exitImpersonation = () => {
    if (realAdminProfile) {
      setUserProfile(realAdminProfile);
      setActiveRoleState(realAdminProfile.role);
      if (realAdminProfile.schoolIds && realAdminProfile.schoolIds.length > 0) {
        setActiveSchoolId(realAdminProfile.schoolIds[0]);
      }
    }
    setIsImpersonating(false);
    setRealAdminProfile(null);
  };

  const clearMfaState = () => {
    const currentUid = auth.currentUser?.uid || user?.uid;
    if (currentUid) {
      sessionStorage.setItem(`mfa_verified_${currentUid}`, 'true');
    }
    setMfaResolver(null);
    setMfaRequired(false);
    setMfaHint(null);
  };

  const resetMfaChallenge = () => {
    setMfaResolver(null);
    setMfaRequired(false);
    setMfaHint(null);
  };

  useEffect(() => {
    testConnection();

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setLoading(true);
      if (firebaseUser) {
        setUser(firebaseUser);
        const emailLower = (firebaseUser.email || '').toLowerCase();
        const isGoogle = firebaseUser.providerData.some((p) => p.providerId === 'google.com');

        // 1. Look up existing managed user from Firestore appUsers (with cache fallback)
        let existingUser: AppUser | undefined = undefined;

        try {
          if (db && firebaseUser.uid) {
            const userDocRef = doc(db, 'appUsers', firebaseUser.uid);
            const userDocSnap = await getDoc(userDocRef);
            if (userDocSnap.exists()) {
              existingUser = userDocSnap.data() as AppUser;
            } else if (firebaseUser.email) {
              const q = query(appUsersCol, where('email', '==', firebaseUser.email));
              const qSnap = await getDocs(q);
              if (!qSnap.empty) {
                const docSnap = qSnap.docs[0];
                existingUser = { ...(docSnap.data() as AppUser), id: docSnap.id };
              }
            }
          }
        } catch (e) {
          console.warn('Querying appUsers doc note:', e);
          if (isQuotaExceededError(e)) {
            notifyQuotaExceeded(e);
          }
          // Fallback to cached managed users
          const cachedUsers = getCachedCollection<AppUser[]>('managedUsers', []);
          existingUser = cachedUsers.find(
            (u) => (u.id === firebaseUser.uid) || (u.email && u.email.toLowerCase() === emailLower)
          );
        }

        // 1b. Look up admin users collection (with cache fallback)
        let existingAdmin: AdminUser | undefined = undefined;
        try {
          if (db && firebaseUser.uid) {
            const adminDocRef = doc(db, 'adminUsers', firebaseUser.uid);
            const adminDocSnap = await getDoc(adminDocRef);
            if (adminDocSnap.exists()) {
              existingAdmin = adminDocSnap.data() as AdminUser;
            } else if (firebaseUser.email) {
              const aq = query(adminUsersCol, where('email', '==', firebaseUser.email));
              const aqSnap = await getDocs(aq);
              if (!aqSnap.empty) {
                const docSnap = aqSnap.docs[0];
                existingAdmin = { ...(docSnap.data() as AdminUser), id: docSnap.id };
              }
            }
          }
        } catch (e) {
          console.warn('Querying adminUsers doc note:', e);
        }
        if (!existingAdmin) {
          const cachedAdmins = getCachedCollection<AdminUser[]>('adminUsers', []);
          existingAdmin = cachedAdmins.find(
            (a) => a.id === firebaseUser.uid || (a.email && a.email.toLowerCase() === emailLower)
          );
        }

        // Revocation Check: If user status is explicitly revoked, terminate session
        if (existingUser?.status === 'revoked') {
          await logoutUser();
          setUser(null);
          setUserProfile(null as any);
          setLoading(false);
          alert('Your account access has been revoked by an administrator. Access is denied.');
          return;
        }

        // 2. Look up pending invites if not found in managed users
        let matchedInvite: PendingInvite | undefined;
        if (!existingUser && firebaseUser.email) {
          try {
            if (db) {
              const inviteQ = query(pendingInvitesCol);
              const inviteSnap = await getDocs(inviteQ);
              inviteSnap.forEach((docSnap) => {
                const invData = docSnap.data() as PendingInvite;
                if (invData.email?.toLowerCase() === emailLower && invData.status === 'pending') {
                  matchedInvite = { ...invData, id: docSnap.id };
                }
              });
            }
          } catch (e) {
            console.warn('Querying pending invites note:', e);
            if (isQuotaExceededError(e)) {
              notifyQuotaExceeded(e);
            }
            const cachedInvites = getCachedCollection<PendingInvite[]>('pendingInvites', []);
            matchedInvite = cachedInvites.find(
              (inv) => inv.email?.toLowerCase() === emailLower && inv.status === 'pending'
            );
          }
        }

        // 3. Look up school affiliations (Principal or Authorized Contact) from Firestore schools or cached schools
        let matchedSchool: School | undefined;
        let isSchoolPrincipal = false;
        let matchedContactTitle = '';
        let matchedContactPhone = '';

        if (!existingUser && !matchedInvite && firebaseUser.email) {
          let schoolsList: School[] = [];
          if (db) {
            try {
              const schSnap = await getDocs(schoolsCol);
              schoolsList = schSnap.docs.map((d) => ({ ...(d.data() as School), id: d.id }));
            } catch (e) {
              console.warn('Querying schools for auth affiliation note:', e);
              if (isQuotaExceededError(e)) {
                notifyQuotaExceeded(e);
              }
              schoolsList = getCachedCollection<School[]>('schools', IMPORTED_PARTNER_SCHOOLS);
            }
          } else {
            schoolsList = getCachedCollection<School[]>('schools', IMPORTED_PARTNER_SCHOOLS);
          }

          for (const s of schoolsList) {
            if (s.principalEmail?.toLowerCase() === emailLower) {
              matchedSchool = s;
              isSchoolPrincipal = true;
              matchedContactTitle = 'Principal';
              break;
            }
            const contact = (s.additionalContacts || []).find(
              (c) => c.email?.toLowerCase() === emailLower
            );
            if (contact) {
              matchedSchool = s;
              isSchoolPrincipal = false;
              matchedContactTitle = contact.jobTitle || 'Authorized Contact';
              matchedContactPhone = contact.phone || '';
              break;
            }
          }
        }

        // 4. Determine user role, school, and profile attributes
        const isSystemAdmin = isSystemAdminEmail(emailLower);
        const isAdmin =
          isSystemAdmin ||
          existingUser?.role === 'admin' ||
          !!existingAdmin ||
          matchedInvite?.role === 'admin';

        let finalRole: UserRole = 'unassigned';
        let finalSchoolId: string | undefined = undefined;
        let finalSchoolName: string | undefined = undefined;
        let finalJobTitle: string | undefined = isGoogle ? 'Applicant' : 'User';
        let finalPhone = firebaseUser.phoneNumber || '';

        if (isAdmin) {
          finalRole = 'admin';
          finalSchoolId = undefined;
          finalSchoolName = undefined;
          finalJobTitle =
            (existingUser?.jobTitle && existingUser.jobTitle !== 'Unassigned User' && existingUser.jobTitle !== 'User')
              ? existingUser.jobTitle
              : (existingAdmin?.jobTitle || (emailLower.endsWith('@lff.com') ? 'LFF Administrator' : 'PEF Administrator'));
          if (matchedInvite && matchedInvite.role === 'admin') {
            deletePendingInviteFromFirestore(matchedInvite.id).catch(console.error);
          }
        } else if (existingUser && existingUser.role !== 'unassigned') {
          finalRole = existingUser.role;
          if (existingUser.schoolId) finalSchoolId = existingUser.schoolId;
          if (existingUser.schoolName) finalSchoolName = existingUser.schoolName;
          if (existingUser.jobTitle) finalJobTitle = existingUser.jobTitle;
          if (existingUser.phone) finalPhone = existingUser.phone;
        } else if (matchedInvite) {
          finalRole = matchedInvite.role;
          if (matchedInvite.schoolId) finalSchoolId = matchedInvite.schoolId;
          if (matchedInvite.schoolName) finalSchoolName = matchedInvite.schoolName;
          if (matchedInvite.jobTitle) finalJobTitle = matchedInvite.jobTitle;

          // Consume / claim the pending invite
          deletePendingInviteFromFirestore(matchedInvite.id).catch(console.error);
        } else if (matchedSchool) {
          finalRole = isSchoolPrincipal ? 'principal' : 'additional_contact';
          finalSchoolId = matchedSchool.id;
          finalSchoolName = matchedSchool.name;
          finalJobTitle = matchedContactTitle || (isSchoolPrincipal ? 'Principal' : 'Authorized Contact');
          if (matchedContactPhone) finalPhone = matchedContactPhone;
        } else if (existingUser) {
          finalRole = existingUser.role;
          if (existingUser.schoolId) finalSchoolId = existingUser.schoolId;
          if (existingUser.schoolName) finalSchoolName = existingUser.schoolName;
          if (existingUser.jobTitle) finalJobTitle = existingUser.jobTitle;
          if (existingUser.phone) finalPhone = existingUser.phone;
        } else {
          finalRole = 'unassigned';
          finalSchoolId = undefined;
          finalSchoolName = undefined;
          finalJobTitle = 'Unassigned User';
        }

        setActiveRoleState(finalRole);
        setActiveSchoolId(finalSchoolId || '');

        const fullName =
          firebaseUser.displayName ||
          existingUser?.name ||
          matchedInvite?.name ||
          (emailLower ? emailLower.split('@')[0] : 'User');

        // Determine if MFA is enabled across Firebase Auth enrolled factors, Firestore state, and admin policy
        const enrolledFactors = multiFactor(firebaseUser).enrolledFactors || [];
        const isFirebaseMfaEnrolled = enrolledFactors.length > 0;
        const hasMfaSecret = !!existingUser?.mfaSecretKey;
        const isExplicitlyMfaEnabled = existingUser?.mfaEnabled === true;
        const isAdminAccount = finalRole === 'admin';

        // MFA is active if enrolled in Firebase Auth, explicitly true in user profile, TOTP secret exists, or is an admin account (unless explicitly false)
        const isMfaActive =
          isFirebaseMfaEnrolled ||
          isExplicitlyMfaEnabled ||
          hasMfaSecret ||
          (isAdminAccount && existingUser?.mfaEnabled !== false);

        const finalMfaMethod =
          existingUser?.mfaMethod ||
          (isFirebaseMfaEnrolled
            ? (enrolledFactors.some((f) => f.factorId === 'phone') ? 'sms' : 'totp')
            : (isMfaActive ? 'totp' : undefined));

        // Sync managed user document into Firestore
        const syncedUser: AppUser = {
          id: firebaseUser.uid,
          name: fullName,
          email: firebaseUser.email || '',
          phone: finalPhone,
          role: finalRole,
          schoolId: finalRole === 'admin' ? undefined : finalSchoolId,
          schoolName: finalRole === 'admin' ? undefined : finalSchoolName,
          jobTitle: finalJobTitle,
          status: finalRole === 'unassigned' ? 'invited' : 'active',
          createdAt: existingUser?.createdAt || new Date().toISOString(),
          lastLoginAt: new Date().toISOString(),
          mfaEnabled: isMfaActive,
          mfaMethod: finalMfaMethod,
          mfaSecretKey: existingUser?.mfaSecretKey || undefined,
          mfaRecoveryCodes: existingUser?.mfaRecoveryCodes || undefined,
        };

        // Clean up old mock/placeholder document if its ID differed from firebaseUser.uid
        if (existingUser && existingUser.id !== firebaseUser.uid) {
          deleteManagedUserFromFirestore(existingUser.id).catch(console.error);
          deleteAdminUserFromFirestore(existingUser.id).catch(console.error);
        }

        // Clean up any extra duplicate Firestore documents matching this email
        if (firebaseUser.email) {
          try {
            if (db) {
              const dupQuery = query(appUsersCol, where('email', '==', firebaseUser.email));
              getDocs(dupQuery).then((dupSnap) => {
                dupSnap.forEach((docSnap) => {
                  if (docSnap.id !== firebaseUser.uid) {
                    deleteManagedUserFromFirestore(docSnap.id).catch(console.error);
                  }
                });
              }).catch(console.warn);

              const adminDupQuery = query(adminUsersCol, where('email', '==', firebaseUser.email));
              getDocs(adminDupQuery).then((adminDupSnap) => {
                adminDupSnap.forEach((docSnap) => {
                  if (docSnap.id !== firebaseUser.uid) {
                    deleteAdminUserFromFirestore(docSnap.id).catch(console.error);
                  }
                });
              }).catch(console.warn);
            }
          } catch (e) {
            console.warn('Duplicate doc cleanup error:', e);
          }
        }

        saveManagedUserToFirestore(syncedUser).catch(console.error);

        if (finalRole === 'admin') {
          saveAdminUserToFirestore({
            id: firebaseUser.uid,
            name: fullName,
            email: firebaseUser.email || 'admin@smallmoves.org',
            role: 'admin',
            notificationPreference: existingAdmin?.notificationPreference || 'all',
            createdAt: existingAdmin?.createdAt || existingUser?.createdAt || new Date().toISOString(),
          }).catch(console.error);
        }

        const nameParts = fullName.split(' ');
        const fName = nameParts[0] || 'User';
        const lName = nameParts.slice(1).join(' ') || '';

        const profile: UserProfile = {
          uid: firebaseUser.uid,
          email: firebaseUser.email || '',
          firstName: fName,
          lastName: lName,
          displayName: fullName,
          phone: finalPhone,
          jobTitle: finalJobTitle,
          role: finalRole,
          adminRole: finalRole === 'admin' ? 'admin' : undefined,
          schoolIds: finalRole === 'admin' ? [] : (finalSchoolId ? [finalSchoolId] : []),
          mfaEnabled: isMfaActive,
          mfaMethod: finalMfaMethod,
          mfaSecretKey: existingUser?.mfaSecretKey || undefined,
          mfaRecoveryCodes: existingUser?.mfaRecoveryCodes || undefined,
          emailVerified: firebaseUser.emailVerified || isGoogle,
          createdAt: syncedUser.createdAt,
          photoURL: firebaseUser.photoURL || undefined,
          authProvider: isGoogle ? 'google.com' : 'password',
          googleLinked: isGoogle,
        };

        setUserProfile(profile);

        // Check 2FA session verification requirement
        if (profile.mfaEnabled) {
          const isVerified = sessionStorage.getItem(`mfa_verified_${firebaseUser.uid}`) === 'true';
          if (!isVerified) {
            setMfaRequired(true);
          } else {
            setMfaRequired(false);
          }
        } else {
          setMfaRequired(false);
        }
      } else {
        setUser(null);
        setUserProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const setActiveRole = (role: UserRole) => {
    setActiveRoleState(role);
    if (userProfile) {
      setUserProfile((prev) => (prev ? { ...prev, role } : null));
    }
  };

  const handleSignInGoogle = async () => {
    try {
      setLoading(true);
      resetMfaChallenge();
      const user = await loginWithGoogle();
      if (user) {
        const log: ActivityEvent = {
          id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          actorId: user.uid,
          actorName: user.displayName || user.email || 'User',
          actorRole: 'User',
          targetUserId: user.uid,
          targetUserEmail: user.email || '',
          eventType: 'user_login',
          message: `User logged in successfully via Google SSO.`,
          timestamp: new Date().toISOString(),
        };
        saveActivityLogToFirestore(log).catch(console.error);
      }
    } catch (err: unknown) {
      setLoading(false);
      if (err && typeof err === 'object' && (err as any).code === 'auth/multi-factor-auth-required') {
        const resolver = getMultiFactorResolver(auth, err as any);
        setMfaResolver(resolver);
        setMfaHint(resolver.hints[0] || null);
        setMfaRequired(true);
        console.log('MFA Challenge Required for Google user:', resolver.hints);
        return;
      }
      console.error('Google Sign-In error:', err);
      throw err;
    }
  };

  const handleSignInEmail = async (email: string, pass: string) => {
    try {
      setLoading(true);
      resetMfaChallenge();
      const user = await loginWithEmail(email, pass);
      if (user) {
        const log: ActivityEvent = {
          id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          actorId: user.uid,
          actorName: user.displayName || user.email || 'User',
          actorRole: 'User',
          targetUserId: user.uid,
          targetUserEmail: user.email || '',
          eventType: 'user_login',
          message: `User logged in successfully via Email/Password.`,
          timestamp: new Date().toISOString(),
        };
        saveActivityLogToFirestore(log).catch(console.error);
      }
    } catch (err: unknown) {
      setLoading(false);
      if (err && typeof err === 'object' && (err as any).code === 'auth/multi-factor-auth-required') {
        const resolver = getMultiFactorResolver(auth, err as any);
        setMfaResolver(resolver);
        setMfaHint(resolver.hints[0] || null);
        setMfaRequired(true);
        console.log('MFA Challenge Required for email user:', resolver.hints);
        return;
      }
      console.error('Email Sign-In error:', err);
      throw err;
    }
  };

  const completeMfaSignIn = async (code: string, verificationId?: string) => {
    if (!mfaResolver) throw new Error('No active multi-factor sign-in session.');
    try {
      setLoading(true);
      const hint = mfaResolver.hints[0];
      const user = await resolveMfaSignIn(mfaResolver, hint.uid, code, verificationId);
      if (user) {
        const log: ActivityEvent = {
          id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          actorId: user.uid,
          actorName: user.displayName || user.email || 'User',
          actorRole: 'User',
          targetUserId: user.uid,
          targetUserEmail: user.email || '',
          eventType: 'user_login',
          message: `User logged in successfully with MFA challenge.`,
          timestamp: new Date().toISOString(),
        };
        saveActivityLogToFirestore(log).catch(console.error);
      }
      clearMfaState();
    } catch (err: unknown) {
      console.error('Error verifying MFA sign-in code:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const handleSendSmsMfaCode = async (hintIndex: number, recaptchaVerifier: any) => {
    if (!mfaResolver) throw new Error('No active multi-factor sign-in session.');
    return await sendMfaSms(mfaResolver, hintIndex, recaptchaVerifier);
  };

  const handleSetupTotpMfa = async () => {
    return await setupTotpMfaHelper();
  };

  const handleVerifyAndEnrollTotpMfa = async (totpSecret: TotpSecret, code: string, factorName?: string) => {
    await verifyAndEnrollTotpMfaHelper(totpSecret, code, factorName);
    if (userProfile) {
      setUserProfile((prev) => (prev ? { ...prev, mfaEnabled: true, mfaMethod: 'totp' } : null));
    }
  };

  const handleEnableMfaWithCredentials = async (secretKey: string, recoveryCodes: string[]) => {
    const uid = user?.uid || userProfile?.uid;
    const updates = {
      mfaEnabled: true,
      mfaMethod: 'totp' as const,
      mfaSecretKey: secretKey,
      mfaRecoveryCodes: recoveryCodes,
    };

    if (db && uid) {
      try {
        const userRef = doc(db, 'appUsers', uid);
        await setDoc(userRef, updates, { merge: true });
      } catch (e) {
        console.warn('Saving MFA state to Firestore notice:', e);
      }
    }

    if (userProfile) {
      setUserProfile((prev) => (prev ? { ...prev, ...updates } : null));
    } else if (uid) {
      const nameParts = (user?.displayName || '').split(' ');
      setUserProfile({
        uid: uid,
        email: user?.email || '',
        firstName: nameParts[0] || 'Principal',
        lastName: nameParts.slice(1).join(' ') || '',
        displayName: user?.displayName || user?.email || 'Principal',
        phone: '',
        role: 'principal',
        schoolIds: [],
        emailVerified: false,
        createdAt: new Date().toISOString(),
        ...updates,
      });
    }
  };

  const handleRedeemRecoveryCode = async (code: string): Promise<boolean> => {
    if (!userProfile) return false;
    const { valid, remainingCodes } = verifyRecoveryCode(userProfile.mfaRecoveryCodes, code);
    if (!valid) return false;

    const uid = userProfile.uid;
    if (db && uid) {
      try {
        const userRef = doc(db, 'appUsers', uid);
        await setDoc(userRef, { mfaRecoveryCodes: remainingCodes }, { merge: true });
      } catch (e) {
        console.warn('Updating recovery codes in Firestore notice:', e);
      }
    }

    setUserProfile((prev) => (prev ? { ...prev, mfaRecoveryCodes: remainingCodes } : null));
    return true;
  };

  const handleDisableMfa = async () => {
    await unenrollMfaHelper();
    if (userProfile) {
      setUserProfile((prev) => (prev ? { ...prev, mfaEnabled: false } : null));
    }
  };

  const handleSignUpEmail = async (
    email: string,
    pass: string,
    displayName: string
  ) => {
    try {
      setLoading(true);

      const emailLower = email.trim().toLowerCase();

      // Check if admin email
      const isAdminEmail = isSystemAdminEmail(emailLower);

      // 1. Search for matching invite in Firestore
      let matchedInvite: PendingInvite | undefined = undefined;

      if (db) {
        try {
          const inviteQ = query(pendingInvitesCol);
          const inviteSnap = await getDocs(inviteQ);
          inviteSnap.forEach((docSnap) => {
            const invData = docSnap.data() as PendingInvite;
            if (invData.email?.toLowerCase() === emailLower && invData.status === 'pending') {
              matchedInvite = { ...invData, id: docSnap.id };
            }
          });
        } catch (err) {
          console.warn('Error querying pending invite in Firestore:', err);
        }
      }

      // 2. Search in existing managed users (appUsers)
      let existingManagedUser: AppUser | undefined = undefined;

      if (db) {
        try {
          const uSnap = await getDocs(appUsersCol);
          uSnap.forEach((docSnap) => {
            const u = docSnap.data() as AppUser;
            if (u.email?.toLowerCase() === emailLower) {
              existingManagedUser = { ...u, id: docSnap.id };
            }
          });
        } catch (err) {
          console.warn('Error querying appUsers in Firestore:', err);
        }
      }

      // 3. Search in schools (Principal or Authorized Contact)
      let matchedSchool: School | undefined = undefined;
      let isPrincipalAffiliation = false;
      let matchedTitle = 'Principal';
      let matchedPhone = '';

      if (db) {
        try {
          const schSnap = await getDocs(schoolsCol);
          for (const docSnap of schSnap.docs) {
            const s = docSnap.data() as School;
            if (s.principalEmail?.toLowerCase() === emailLower) {
              matchedSchool = { ...s, id: docSnap.id };
              isPrincipalAffiliation = true;
              matchedTitle = 'Principal';
              break;
            }
            const contact = (s.additionalContacts || []).find(
              (c) => c.email?.toLowerCase() === emailLower
            );
            if (contact) {
              matchedSchool = { ...s, id: docSnap.id };
              isPrincipalAffiliation = false;
              matchedTitle = contact.jobTitle || 'Authorized Contact';
              matchedPhone = contact.phone || '';
              break;
            }
          }
        } catch (err) {
          console.warn('Error querying schools in Firestore:', err);
        }
      }

      const isAuthorized = !!(matchedInvite || existingManagedUser || matchedSchool || isAdminEmail);

      if (!isAuthorized) {
        throw new Error('No pending invitation or pre-authorized profile found for this email address. Please contact your school principal or portal administrator to request access.');
      }

      let assignedRole: UserRole = 'unassigned';
      let assignedSchoolId: string | undefined = undefined;
      let assignedSchoolName: string | undefined = undefined;
      let assignedJobTitle: string = 'User';

      if (matchedInvite) {
        assignedRole = matchedInvite.role;
        assignedSchoolId = matchedInvite.schoolId;
        assignedSchoolName = matchedInvite.schoolName;
        assignedJobTitle = matchedInvite.jobTitle || (assignedRole === 'admin' ? 'PEF Administrator' : assignedRole === 'principal' ? 'Principal' : 'Authorized Contact');
      } else if (existingManagedUser) {
        assignedRole = existingManagedUser.role;
        assignedSchoolId = existingManagedUser.schoolId;
        assignedSchoolName = existingManagedUser.schoolName;
        assignedJobTitle = existingManagedUser.jobTitle || (assignedRole === 'admin' ? 'PEF Administrator' : assignedRole === 'principal' ? 'Principal' : 'Authorized Contact');
      } else if (matchedSchool) {
        assignedRole = isPrincipalAffiliation ? 'principal' : 'additional_contact';
        assignedSchoolId = matchedSchool.id;
        assignedSchoolName = matchedSchool.name;
        assignedJobTitle = matchedTitle || (isPrincipalAffiliation ? 'Principal' : 'Authorized Contact');
      } else if (isAdminEmail) {
        assignedRole = 'admin';
        assignedJobTitle = emailLower.endsWith('@lff.com') ? 'LFF Administrator' : 'PEF Administrator';
      }

      // Register or Authenticate Firebase Auth User
      let newFbUser: User | null = null;

      if (auth.currentUser && auth.currentUser.email?.toLowerCase() === emailLower) {
        newFbUser = auth.currentUser;
        try {
          await updatePassword(auth.currentUser, pass);
        } catch (pwErr) {
          console.warn('Updating current user password notice:', pwErr);
          try {
            const cred = EmailAuthProvider.credential(email, pass);
            await linkWithCredential(auth.currentUser, cred);
          } catch (linkErr) {
            console.warn('Linking credential notice:', linkErr);
          }
        }
      } else {
        try {
          newFbUser = await signUpWithEmail(email, pass);
        } catch (err: unknown) {
          const errMsg = err instanceof Error ? err.message : String(err);
          const errCode = (err as any)?.code;
          if (
            errCode === 'auth/email-already-in-use' ||
            errMsg.includes('email-already-in-use') ||
            errMsg.includes('already in use') ||
            errMsg.includes('already exists')
          ) {
            console.log('Account already exists in Firebase Auth for', email, '- attempting sign-in with provided password...');
            try {
              newFbUser = await loginWithEmail(email, pass);
            } catch (loginErr: unknown) {
              console.warn('Sign-in with provided password during setup failed:', loginErr);
              const customErr = new Error(
                'An account with this email already exists with a different password. Please sign in with your existing password, use Google Sign-In, or reset your password.'
              );
              (customErr as any).code = 'auth/email-already-in-use';
              throw customErr;
            }
          } else {
            throw err;
          }
        }
      }

      if (newFbUser) {
        try {
          await updateProfile(newFbUser, { displayName });
        } catch (pErr) {
          console.warn('Updating displayName note:', pErr);
        }

        const [fName, ...lNameParts] = displayName.trim().split(' ');
        const lName = lNameParts.join(' ');
        const schoolIds = assignedSchoolId ? [assignedSchoolId] : [];

        const profile: UserProfile = {
          uid: newFbUser.uid,
          email: email,
          firstName: fName || displayName,
          lastName: lName,
          displayName: displayName,
          phone: matchedPhone || existingManagedUser?.phone || '',
          role: assignedRole,
          jobTitle: assignedJobTitle,
          schoolIds: schoolIds,
          mfaEnabled: false,
          emailVerified: false,
          createdAt: new Date().toISOString(),
        };

        if (assignedRole === 'admin') {
          await saveAdminUserToFirestore({
            id: newFbUser.uid,
            name: displayName,
            email: email,
            role: 'admin',
            notificationPreference: 'all',
            createdAt: new Date().toISOString(),
          });
        } else {
          await saveManagedUserToFirestore({
            id: newFbUser.uid,
            name: displayName,
            email: email,
            role: assignedRole,
            schoolId: assignedSchoolId,
            schoolName: assignedSchoolName,
            jobTitle: assignedJobTitle,
            phone: matchedPhone || existingManagedUser?.phone || undefined,
            status: 'active',
            createdAt: new Date().toISOString(),
          });
        }

        // Clean up old managed user mock ID if it differed from new uid
        if (existingManagedUser && existingManagedUser.id !== newFbUser.uid) {
          deleteManagedUserFromFirestore(existingManagedUser.id).catch(console.error);
        }

        // Consume / delete the claimed pending invite if matched
        if (matchedInvite?.id) {
          deletePendingInviteFromFirestore(matchedInvite.id).catch(console.error);
        }

        setUser(newFbUser);
        setUserProfile(profile);
        setActiveRoleState(assignedRole);
        if (assignedSchoolId) {
          setActiveSchoolId(assignedSchoolId);
        }
      }
    } catch (err) {
      console.error('Email Sign-Up error:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const handleSendPasswordReset = async (email: string) => {
    try {
      await resetPassword(email);
    } catch (err) {
      console.error('Password reset request error:', err);
      throw err;
    }
  };

  const handleSignOut = async () => {
    try {
      setLoading(true);
      const currentUid = auth.currentUser?.uid || user?.uid;
      if (currentUid) {
        sessionStorage.removeItem(`mfa_verified_${currentUid}`);
      }
      setMfaResolver(null);
      setMfaRequired(false);
      setMfaHint(null);
      await logoutUser();
      setUser(null);
      setUserProfile(null);
      setActiveRoleState('principal');
    } catch (err) {
      console.error('Sign out error:', err);
    } finally {
      setLoading(false);
    }
  };

  const updateProfileData = (updates: Partial<UserProfile>) => {
    setUserProfile((prev) => (prev ? { ...prev, ...updates } : null));
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        userProfile,
        loading,
        activeRole,
        setActiveRole,
        activeSchoolId,
        setActiveSchoolId,
        signInWithGoogle: handleSignInGoogle,
        signInWithEmail: handleSignInEmail,
        signUpWithEmail: handleSignUpEmail,
        sendPasswordReset: handleSendPasswordReset,
        signOut: handleSignOut,
        updateProfileData,
        isImpersonating,
        realAdminProfile,
        startImpersonation,
        exitImpersonation,
        mfaResolver,
        mfaRequired,
        mfaHint,
        clearMfaState,
        completeMfaSignIn,
        sendSmsMfaCode: handleSendSmsMfaCode,
        setupTotpMfa: handleSetupTotpMfa,
        verifyAndEnrollTotpMfa: handleVerifyAndEnrollTotpMfa,
        enableMfaWithCredentials: handleEnableMfaWithCredentials,
        redeemRecoveryCode: handleRedeemRecoveryCode,
        disableMfa: handleDisableMfa,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
