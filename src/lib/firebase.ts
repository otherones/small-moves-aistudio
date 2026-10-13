import { initializeApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  writeBatch,
  deleteField,
} from 'firebase/firestore';
import {
  getAuth,
  initializeAuth,
  indexedDBLocalPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
  inMemoryPersistence,
  browserPopupRedirectResolver,
  setPersistence,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  onAuthStateChanged,
  updatePassword,
  linkWithCredential,
  EmailAuthProvider,
  updateProfile,
  signOut as firebaseSignOut,
  multiFactor,
  TotpMultiFactorGenerator,
  getMultiFactorResolver,
  MultiFactorResolver,
  MultiFactorInfo,
  TotpSecret,
  PhoneAuthProvider,
  PhoneMultiFactorGenerator,
  RecaptchaVerifier,
  ApplicationVerifier,
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';
import {
  EmergencyRequest,
  School,
  ActivityEvent,
  AdminUser,
  PortalSettings,
  PortalSecrets,
  OperationType,
  AppUser,
  PendingInvite,
  Funder,
  RequestHistoryEntry,
} from '../types';
import { INITIAL_SETTINGS } from '../data/defaultSettings';
import { IMPORTED_PARTNER_SCHOOLS } from '../data/importedSchools';

// Direct upgrade URL for quota limit reached
export const FIRESTORE_UPGRADE_URL = `https://console.firebase.google.com/project/${firebaseConfig.projectId}/firestore/databases/${firebaseConfig.firestoreDatabaseId || '(default)'}/data?openUpgradeDialog=true`;

/**
 * Checks if an error is due to Firestore Free Tier Quota / Resource limits
 */
export function isQuotaExceededError(err: any): boolean {
  if (!err) return false;
  const str = (err.message || err.code || String(err)).toLowerCase();
  return (
    str.includes('quota') ||
    str.includes('resource_exhausted') ||
    str.includes('free daily read units') ||
    str.includes('free tier database') ||
    str.includes('quota limit exceeded')
  );
}

// Global Quota Listener & State
type QuotaListener = (exceeded: boolean, message?: string) => void;
const quotaListeners = new Set<QuotaListener>();
let globalQuotaExceeded = false;
let globalQuotaErrorMessage = '';

export function notifyQuotaExceeded(errOrMsg?: any) {
  const msg = typeof errOrMsg === 'string' ? errOrMsg : errOrMsg?.message || String(errOrMsg || 'Quota limit exceeded');
  globalQuotaExceeded = true;
  globalQuotaErrorMessage = msg;
  quotaListeners.forEach((fn) => {
    try {
      fn(true, msg);
    } catch {}
  });
}

export function subscribeToQuotaStatus(listener: QuotaListener): () => void {
  quotaListeners.add(listener);
  if (globalQuotaExceeded) {
    listener(true, globalQuotaErrorMessage);
  }
  return () => {
    quotaListeners.delete(listener);
  };
}

export function getIsQuotaExceeded(): boolean {
  return globalQuotaExceeded;
}

/**
 * Client-side local snapshot caching helpers
 */
export function getCachedCollection<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(`pef_cache_${key}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed !== undefined && parsed !== null) {
        return parsed as T;
      }
    }
  } catch (err) {
    console.warn(`Error reading cached collection [${key}]:`, err);
  }
  return fallback;
}

export function setCachedCollection<T>(key: string, data: T): void {
  try {
    localStorage.setItem(`pef_cache_${key}`, JSON.stringify(data));
  } catch (err) {
    console.warn(`Error saving cached collection [${key}]:`, err);
  }
}

// Initialize Firebase App
const app = initializeApp(firebaseConfig);

// Initialize Auth with standard persistence and popup redirect resolver
let authInstance;
try {
  authInstance = initializeAuth(app, {
    persistence: [
      indexedDBLocalPersistence,
      browserLocalPersistence,
      browserSessionPersistence,
      inMemoryPersistence,
    ],
    popupRedirectResolver: browserPopupRedirectResolver,
  });
} catch {
  // If already initialized (e.g. fast refresh/hot reload)
  authInstance = getAuth(app);
}

export const auth = authInstance;
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account',
});

export async function loginWithGoogle() {
  try {
    const res = await signInWithPopup(auth, googleProvider, browserPopupRedirectResolver);
    return res.user;
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);
    if (err && typeof err === 'object' && 'code' in err) {
      const code = (err as { code: string }).code;
      if (code === 'auth/popup-blocked') {
        throw new Error('Sign-in popup was blocked by your browser. Please allow popups for this site or try again.');
      } else if (code === 'auth/popup-closed-by-user') {
        throw new Error('Google Sign-In popup was closed before completing authentication.');
      } else if (code === 'auth/cancelled-popup-request') {
        throw new Error('Sign-in request was cancelled. Please try again.');
      }
    }
    console.error('Google sign in error:', err);
    throw err;
  }
}

export async function loginWithEmail(email: string, pass: string) {
  try {
    const res = await signInWithEmailAndPassword(auth, email, pass);
    return res.user;
  } catch (err: unknown) {
    console.error('Email sign in error:', err);
    throw err;
  }
}

export async function signUpWithEmail(email: string, pass: string) {
  try {
    const res = await createUserWithEmailAndPassword(auth, email, pass);
    return res.user;
  } catch (err: unknown) {
    console.error('Email sign up error:', err);
    throw err;
  }
}

export async function resetPassword(email: string) {
  try {
    await sendPasswordResetEmail(auth, email);
  } catch (err) {
    console.error('Password reset error:', err);
    throw err;
  }
}

export async function updateUserPassword(pass: string) {
  if (!auth.currentUser) throw new Error('No user is currently signed in to update password.');
  try {
    await updatePassword(auth.currentUser, pass);
  } catch (err) {
    console.error('Update password error:', err);
    throw err;
  }
}

export async function linkEmailPasswordCredential(email: string, pass: string) {
  if (!auth.currentUser) throw new Error('No user is currently signed in.');
  const credential = EmailAuthProvider.credential(email, pass);
  return await linkWithCredential(auth.currentUser, credential);
}

export { updatePassword, linkWithCredential, EmailAuthProvider, updateProfile };

export async function logoutUser() {
  await firebaseSignOut(auth);
}

/**
 * Retrieves the current user's Firebase Auth ID token
 */
export async function getAuthBearerToken(): Promise<string | null> {
  try {
    if (auth.currentUser) {
      return await auth.currentUser.getIdToken();
    }
  } catch (err) {
    console.warn('Could not retrieve current user ID token:', err);
  }
  return null;
}

/**
 * Returns Authorization header with Firebase ID Token if user is signed in
 */
export async function getAuthHeaders(): Promise<Record<string, string>> {
  const token = await getAuthBearerToken();
  if (token) {
    return { Authorization: `Bearer ${token}` };
  }
  return {};
}

/**
 * MFA / Multi-Factor Authentication Helpers
 */
export { getMultiFactorResolver, TotpMultiFactorGenerator };
export type { MultiFactorResolver, MultiFactorInfo, TotpSecret };

export async function setupTotpMfa(): Promise<{ totpSecret: TotpSecret; secretKey: string; qrCodeUrl: string }> {
  if (!auth.currentUser) throw new Error('You must be signed in to configure 2FA Multi-Factor Authentication.');
  try {
    const multiFactorSession = await multiFactor(auth.currentUser).getSession();
    const totpSecret = await TotpMultiFactorGenerator.generateSecret(multiFactorSession);
    const accountName = auth.currentUser.email || 'user';
    const qrCodeUrl = totpSecret.generateQrCodeUrl(accountName, 'PEF Emergency Fund Portal');
    return {
      totpSecret,
      secretKey: totpSecret.secretKey,
      qrCodeUrl,
    };
  } catch (err: unknown) {
    console.warn('Firebase TOTP generator notice (MFA may require console setup or client fallback):', err);
    throw err;
  }
}

export async function verifyAndEnrollTotpMfa(totpSecret: TotpSecret, code: string, factorName = 'Google Authenticator'): Promise<void> {
  if (!auth.currentUser) throw new Error('No active user session');
  const assertion = TotpMultiFactorGenerator.assertionForEnrollment(totpSecret, code);
  await multiFactor(auth.currentUser).enroll(assertion, factorName);

  if (db && auth.currentUser.uid) {
    const userRef = doc(db, 'appUsers', auth.currentUser.uid);
    await setDoc(userRef, { mfaEnabled: true }, { merge: true });
  }
}

export async function unenrollMfa(): Promise<void> {
  if (!auth.currentUser) throw new Error('No active user session');
  const mfaUser = multiFactor(auth.currentUser);
  const enrolled = mfaUser.enrolledFactors;
  for (const factor of enrolled) {
    await mfaUser.unenroll(factor);
  }

  if (db && auth.currentUser.uid) {
    const userRef = doc(db, 'appUsers', auth.currentUser.uid);
    await setDoc(userRef, { mfaEnabled: false }, { merge: true });
  }
}

export async function getEnrolledMfaFactors(): Promise<MultiFactorInfo[]> {
  if (!auth.currentUser) return [];
  return multiFactor(auth.currentUser).enrolledFactors;
}

export async function sendMfaSms(resolver: MultiFactorResolver, hintIndex: number, recaptchaVerifier: ApplicationVerifier): Promise<string> {
  const hint = resolver.hints[hintIndex];
  if (!hint || hint.factorId !== PhoneMultiFactorGenerator.FACTOR_ID) {
    throw new Error('Selected hint is not a phone factor.');
  }
  const phoneAuthProvider = new PhoneAuthProvider(auth);
  const verificationId = await phoneAuthProvider.verifyPhoneNumber({
    multiFactorHint: hint,
    session: resolver.session
  }, recaptchaVerifier);
  return verificationId;
}

export async function resolveMfaSignIn(resolver: MultiFactorResolver, hintUid: string, code: string, verificationId?: string) {
  let assertion;
  if (verificationId) {
    const credential = PhoneAuthProvider.credential(verificationId, code);
    assertion = PhoneMultiFactorGenerator.assertion(credential);
  } else {
    assertion = TotpMultiFactorGenerator.assertionForSignIn(hintUid, code);
  }
  const userCredential = await resolver.resolveSignIn(assertion);
  return userCredential.user;
}

export async function testConnection() {
  try {
    const snap = await getDocs(requestsCol);
    console.log('Firestore connected successfully. Total requests in db:', snap.size);
    return true;
  } catch (err) {
    console.warn('Firestore connection test warning:', err);
    return false;
  }
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType | string,
  path?: string | null
) {
  console.error(`Firestore Error [${operationType}] at [${path}]:`, error);
  const msg = error instanceof Error ? error.message : String(error);
  throw new Error(`Firestore Error (${operationType}): ${msg}`);
}

// Initialize Firestore targeting the specific databaseId if provided
export const db = firebaseConfig.firestoreDatabaseId
  ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
  : getFirestore(app);

// Helper collection references
export const requestsCol = collection(db, 'requests');
export const schoolsCol = collection(db, 'schools');
export const activityLogsCol = collection(db, 'activityLogs');
export const adminUsersCol = collection(db, 'adminUsers');
export const settingsCol = collection(db, 'settings');
export const appUsersCol = collection(db, 'appUsers');
export const pendingInvitesCol = collection(db, 'pendingInvites');
export const fundersCol = collection(db, 'funders');
export const requestHistoryCol = collection(db, 'requestHistory');

export function cleanForFirestore<T>(obj: T): any {
  if (obj === null || obj === undefined) return null;
  if (Array.isArray(obj)) return obj.map((item) => cleanForFirestore(item));
  if (typeof obj === 'object') {
    const cleaned: Record<string, any> = {};
    for (const [key, value] of Object.entries(obj as Record<string, any>)) {
      if (value !== undefined) {
        cleaned[key] = cleanForFirestore(value);
      }
    }
    return cleaned;
  }
  return obj;
}

/**
 * Ensures system settings document exists in Firestore.
 * Does NOT seed mock data.
 */
export async function ensureDefaultSettingsExist(): Promise<void> {
  if (!auth.currentUser) {
    return;
  }
  try {
    const globalSettingsDocRef = doc(db, 'settings', 'global');
    const globalSettingsDocSnap = await getDoc(globalSettingsDocRef);

    // Only ensure initial settings document exists
    if (!globalSettingsDocSnap.exists()) {
      await setDoc(globalSettingsDocRef, cleanForFirestore(INITIAL_SETTINGS));
    }

    // Ensure canonical activity logs for REQ-2026-1444 exist in Firestore
    for (const log of CANONICAL_HISTORICAL_LOGS) {
      try {
        const logDocRef = doc(db, 'activityLogs', log.id);
        const logDocSnap = await getDoc(logDocRef);
        if (!logDocSnap.exists()) {
          await setDoc(logDocRef, cleanForFirestore(log));
        }
      } catch (err) {
        console.warn('Checking historical activity log notice:', err);
      }
    }
  } catch (err) {
    console.warn('Error during settings initialization check:', err);
  }
}

/**
 * Automatically purges any residual legacy mock data IDs from Firestore.
 */
export async function cleanupResidualMockData(): Promise<void> {
  if (!auth.currentUser) return;
  try {
    const mockRequestIds = ['REQ-2026-1001', 'REQ-2026-1002', 'REQ-2026-1003', 'REQ-2026-1004', 'REQ-2026-1005'];
    for (const reqId of mockRequestIds) {
      try {
        await deleteDoc(doc(db, 'requests', reqId));
      } catch {}
    }

    const mockSchoolIds = [
      'SCH-101', 'SCH-102', 'SCH-103', 'SCH-104', 'SCH-105',
      'sch-101', 'sch-102', 'sch-103', 'sch-104', 'sch-105',
      'lincoln-elem', 'oakridge-high', 'roosevelt-middle', 'southside-academy', 'washington-stem'
    ];
    for (const schId of mockSchoolIds) {
      try {
        await deleteDoc(doc(db, 'schools', schId));
      } catch {}
    }

    const mockUserIds = [
      'USR-PRINCIPAL-1', 'USR-PRINCIPAL-2', 'USR-PRINCIPAL-3', 'USR-PRINCIPAL-4',
      'AC-101', 'AC-102', 'usr-101', 'usr-102', 'usr-103', 'usr-104', 'usr-105',
    ];
    for (const uId of mockUserIds) {
      try {
        await deleteDoc(doc(db, 'appUsers', uId));
      } catch {}
    }

    const mockAdminIds = ['USR-ADMIN-1', 'USR-ADMIN-2', 'USR-ADMIN-3'];
    for (const aId of mockAdminIds) {
      try {
        await deleteDoc(doc(db, 'adminUsers', aId));
      } catch {}
    }

    const mockInviteIds = ['INV-101', 'INV-102', 'INV-103', 'INV-104'];
    for (const invId of mockInviteIds) {
      try {
        await deleteDoc(doc(db, 'pendingInvites', invId));
      } catch {}
    }

    const mockFunderIds = ['FND-01', 'FND-02', 'FND-03'];
    for (const fndId of mockFunderIds) {
      try {
        await deleteDoc(doc(db, 'funders', fndId));
      } catch {}
    }

    const mockLogIds = ['log-001', 'log-002', 'log-003', 'log-004', 'log-005', 'log-006', 'log-007', 'log-008', 'log-009'];
    for (const lId of mockLogIds) {
      try {
        await deleteDoc(doc(db, 'activityLogs', lId));
      } catch {}
    }
  } catch (err) {
    console.warn('Error during residual mock data cleanup:', err);
  }
}

// Deprecated alias for backwards compatibility
export const seedInitialDataIfEmpty = ensureDefaultSettingsExist;

export const CANONICAL_HISTORICAL_LOGS: ActivityEvent[] = [
  {
    id: 'log-1444-created',
    requestId: 'REQ-2026-1444',
    schoolId: 'SCH-044',
    actorId: 'klhampton2@cps.edu',
    actorName: 'Kamilah Hampton',
    actorRole: 'principal',
    eventType: 'request_created',
    message: 'Emergency request submitted by Kamilah Hampton for Lonnika Holder ($2,000 - Loss of Employment). Initial status: Pending Review.',
    timestamp: '2026-09-21T13:43:15.397Z',
  },
  {
    id: 'log-1444-approved',
    requestId: 'REQ-2026-1444',
    schoolId: 'SCH-044',
    actorId: 'admin',
    actorName: 'PEF Administrator',
    actorRole: 'admin',
    eventType: 'status_change',
    fromStatus: 'in_review',
    toStatus: 'waiting_on_principal',
    message: 'Request approved by admin. Awaiting payout details from principal.',
    timestamp: '2026-09-21T14:15:00.000Z',
  },
  {
    id: 'log-1444-payout',
    requestId: 'REQ-2026-1444',
    schoolId: 'SCH-044',
    actorId: 'klhampton2@cps.edu',
    actorName: 'Kamilah Hampton',
    actorRole: 'principal',
    eventType: 'status_change',
    fromStatus: 'waiting_on_principal',
    toStatus: 'waiting_on_beneficiary',
    message: 'Payout details provided via Zelle (7736568599). Pending beneficiary verification.',
    timestamp: '2026-09-21T15:07:42.615Z',
  },
  {
    id: 'log-1444-confirmed',
    requestId: 'REQ-2026-1444',
    schoolId: 'SCH-044',
    actorId: 'beneficiary-online',
    actorName: 'Beneficiary (Lonnika Holder)',
    actorRole: 'beneficiary',
    eventType: 'status_change',
    fromStatus: 'waiting_on_beneficiary',
    toStatus: 'ready_to_pay',
    message: 'Beneficiary confirmed payout details online (Zelle). Status set to Ready to Pay.',
    timestamp: '2026-09-21T16:09:34.435Z',
  },
  {
    id: 'log-1444-paid',
    requestId: 'REQ-2026-1444',
    schoolId: 'SCH-044',
    actorId: 'admin',
    actorName: 'PEF Administrator',
    actorRole: 'admin',
    eventType: 'status_change',
    fromStatus: 'ready_to_pay',
    toStatus: 'paid',
    message: 'Disbursement recorded as paid. $2,000 sent via Zelle to Lonnika Holder.',
    timestamp: '2026-09-21T16:30:00.000Z',
  },
];

/**
 * Real-time subscribers for app state with resilient client caching & quota fallback
 */
export function subscribeToRequests(
  callback: (requests: EmergencyRequest[]) => void,
  onError?: (err: Error) => void
) {
  // 1. Deliver cached data immediately
  const cached = getCachedCollection<EmergencyRequest[]>('requests', []);
  if (cached && cached.length > 0) {
    callback(cached);
  }

  if (!auth.currentUser) return () => {};

  return onSnapshot(
    requestsCol,
    (snapshot) => {
      const items: EmergencyRequest[] = [];
      snapshot.forEach((docSnap) => {
        items.push(docSnap.data() as EmergencyRequest);
      });

      // Sort newest created first
      items.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      setCachedCollection('requests', items);
      callback(items);
    },
    (err) => {
      console.warn('Note on requests listener:', err.message || err);
      if (isQuotaExceededError(err)) {
        notifyQuotaExceeded(err);
      }
      const fallbackData = getCachedCollection<EmergencyRequest[]>('requests', []);
      if (fallbackData) {
        callback(fallbackData);
      }
      if (onError) onError(err);
    }
  );
}

export function subscribeToSchools(
  callback: (schools: School[], fromFirestore?: boolean) => void,
  onError?: (err: Error) => void
) {
  // 1. Deliver cached schools or partner schools seed immediately
  const cached = getCachedCollection<School[]>('schools', IMPORTED_PARTNER_SCHOOLS);
  if (cached && cached.length > 0) {
    callback(cached, false);
  }

  if (!auth.currentUser) return () => {};

  return onSnapshot(
    schoolsCol,
    (snapshot) => {
      const items: School[] = [];
      snapshot.forEach((docSnap) => {
        items.push(docSnap.data() as School);
      });
      const sorted = (items.length > 0 ? items : IMPORTED_PARTNER_SCHOOLS).sort((a, b) =>
        a.name.localeCompare(b.name)
      );
      setCachedCollection('schools', sorted);
      callback(sorted, true);
    },
    (err) => {
      console.warn('Note on schools listener:', err.message || err);
      if (isQuotaExceededError(err)) {
        notifyQuotaExceeded(err);
      }
      const fallbackData = getCachedCollection<School[]>('schools', IMPORTED_PARTNER_SCHOOLS);
      callback(fallbackData, false);
      if (onError) onError(err);
    }
  );
}

export function subscribeToActivityLogs(
  callback: (logs: ActivityEvent[]) => void,
  onError?: (err: Error) => void
) {
  // 1. Deliver cached logs immediately
  const cached = getCachedCollection<ActivityEvent[]>('activityLogs', []);
  const initialMerged = [...(cached || [])];
  for (const canonLog of CANONICAL_HISTORICAL_LOGS) {
    if (!initialMerged.some((l) => l.id === canonLog.id || (l.requestId === canonLog.requestId && l.eventType === canonLog.eventType))) {
      initialMerged.push(canonLog);
    }
  }
  initialMerged.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  callback(initialMerged);

  if (!auth.currentUser) return () => {};

  return onSnapshot(
    activityLogsCol,
    (snapshot) => {
      const items: ActivityEvent[] = [];
      snapshot.forEach((docSnap) => {
        items.push(docSnap.data() as ActivityEvent);
      });
      for (const canonLog of CANONICAL_HISTORICAL_LOGS) {
        if (!items.some((l) => l.id === canonLog.id || (l.requestId === canonLog.requestId && l.eventType === canonLog.eventType))) {
          items.push(canonLog);
        }
      }
      const sorted = [...items].sort(
        (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
      setCachedCollection('activityLogs', sorted);
      callback(sorted);
    },
    (err) => {
      console.warn('Note on activity logs listener:', err.message || err);
      if (isQuotaExceededError(err)) {
        notifyQuotaExceeded(err);
      }
      const fallbackData = getCachedCollection<ActivityEvent[]>('activityLogs', []);
      if (fallbackData) {
        callback(fallbackData);
      }
      if (onError) onError(err);
    }
  );
}

export function subscribeToSettings(
  callback: (settings: PortalSettings) => void,
  onError?: (err: Error) => void
) {
  // 1. Deliver cached settings or INITIAL_SETTINGS immediately
  const cached = getCachedCollection<PortalSettings>('settings', INITIAL_SETTINGS);
  if (cached) {
    callback(cached);
  }

  if (!auth.currentUser) return () => {};

  return onSnapshot(
    doc(db, 'settings', 'global'),
    (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data() as PortalSettings;
        let merged = { ...data };

        // 1. Email Templates Migration
        const existingTplIds = new Set((merged.emailTemplates || []).map((t) => t.id));
        const missingEmails = INITIAL_SETTINGS.emailTemplates.filter((t) => !existingTplIds.has(t.id));
        let templates = [...(merged.emailTemplates || [])];
        if (missingEmails.length > 0) {
          templates = [...templates, ...missingEmails];
        }

        // Replace any remaining request_id tokens in template bodies with appropriate request links
        templates = templates.map((t) => {
          if (!t.body || !t.body.includes('request_id')) {
            return t;
          }
          const isBeneficiary =
            t.id === 'tpl-03' ||
            t.triggerEvent === 'status_change_to_waiting_on_beneficiary' ||
            t.recipientRole?.toLowerCase().includes('beneficiary');
          const appropriateLink = isBeneficiary ? '{{verification_link}}' : '{{request_link}}';

          let updatedBody = t.body
            .replace(/\(ID:\s*\{\{\s*request_id\s*\}\}\)/gi, `(${appropriateLink})`)
            .replace(/ID:\s*\{\{\s*request_id\s*\}\}/gi, appropriateLink)
            .replace(/Request\s+\{\{\s*request_id\s*\}\}/g, `Request (${appropriateLink})`)
            .replace(/request\s+\{\{\s*request_id\s*\}\}/g, `request (${appropriateLink})`)
            .replace(/\{\{\s*request_id\s*\}\}/gi, appropriateLink);

          return {
            ...t,
            body: updatedBody,
          };
        });

        merged.emailTemplates = templates;

        if (!merged.payoutMethods) {
          merged.payoutMethods = INITIAL_SETTINGS.payoutMethods;
        }

        if (!merged.mouVersions || merged.mouVersions.length === 0) {
          merged.mouVersions = INITIAL_SETTINGS.mouVersions;
          merged.currentMouVersionId = INITIAL_SETTINGS.currentMouVersionId;
        } else {
          const existingMouIds = new Set((merged.mouVersions || []).map((v: any) => v.id));
          const missingMouVersions = (INITIAL_SETTINGS.mouVersions || []).filter((v) => !existingMouIds.has(v.id));
          if (missingMouVersions.length > 0) {
            merged.mouVersions = [...merged.mouVersions, ...missingMouVersions];
          }
          if (!merged.currentMouVersionId) {
            merged.currentMouVersionId = INITIAL_SETTINGS.currentMouVersionId;
          }
        }

        if (!merged.emailProvider) {
          merged.emailProvider = INITIAL_SETTINGS.emailProvider;
        }

        setCachedCollection('settings', merged);
        callback(merged);
      } else {
        setCachedCollection('settings', INITIAL_SETTINGS);
        callback(INITIAL_SETTINGS);
      }
    },
    (err) => {
      console.warn('Note on settings listener:', err.message || err);
      if (isQuotaExceededError(err)) {
        notifyQuotaExceeded(err);
      }
      const fallbackData = getCachedCollection<PortalSettings>('settings', INITIAL_SETTINGS);
      callback(fallbackData);
      if (onError) onError(err);
    }
  );
}

export function subscribeToAdminUsers(
  callback: (admins: AdminUser[]) => void,
  onError?: (err: Error) => void
) {
  // 1. Deliver cached admin users immediately
  const cached = getCachedCollection<AdminUser[]>('adminUsers', []);
  if (cached && cached.length > 0) {
    callback(cached);
  }

  if (!auth.currentUser) return () => {};

  return onSnapshot(
    adminUsersCol,
    (snapshot) => {
      const items: AdminUser[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data() as AdminUser;
        items.push({ ...data, id: docSnap.id || data.id });
      });
      setCachedCollection('adminUsers', items);
      callback(items);
    },
    (err) => {
      console.warn('Note on admin users listener:', err.message || err);
      if (isQuotaExceededError(err)) {
        notifyQuotaExceeded(err);
      }
      const fallbackData = getCachedCollection<AdminUser[]>('adminUsers', []);
      if (fallbackData) {
        callback(fallbackData);
      }
      if (onError) onError(err);
    }
  );
}

export function subscribeToManagedUsers(
  callback: (users: AppUser[]) => void,
  onError?: (err: Error) => void
) {
  // 1. Deliver cached users immediately
  const cached = getCachedCollection<AppUser[]>('managedUsers', []);
  if (cached && cached.length > 0) {
    callback(cached);
  }

  // 2. Perform direct one-time getDocs to ensure fresh data from Firestore immediately
  getDocs(appUsersCol)
    .then((snap) => {
      if (!snap.empty) {
        const items: AppUser[] = [];
        snap.forEach((docSnap) => {
          const raw = docSnap.data() as AppUser;
          const rawStatus = (raw.status as string);
          const normalizedStatus =
            rawStatus === 'revoked'
              ? ('revoked' as const)
              : rawStatus === 'invited' || rawStatus === 'pending'
              ? ('pending' as const)
              : ('active' as const);
          items.push({ ...raw, id: docSnap.id || raw.id, status: normalizedStatus });
        });
        setCachedCollection('managedUsers', items);
        callback(items);
      }
    })
    .catch((err) => {
      console.warn('Initial getDocs for appUsers note:', err);
    });

  let unsubSnapshot: (() => void) | null = null;

  const startListener = () => {
    if (unsubSnapshot) return;
    try {
      unsubSnapshot = onSnapshot(
        appUsersCol,
        (snapshot) => {
          const items: AppUser[] = [];
          snapshot.forEach((docSnap) => {
            const raw = docSnap.data() as AppUser;
            const rawStatus = (raw.status as string);
            const normalizedStatus =
              rawStatus === 'revoked'
                ? ('revoked' as const)
                : rawStatus === 'invited' || rawStatus === 'pending'
                ? ('pending' as const)
                : ('active' as const);
            items.push({ ...raw, id: docSnap.id || raw.id, status: normalizedStatus });
          });
          setCachedCollection('managedUsers', items);
          callback(items);
        },
        (err) => {
          console.warn('Note on app users listener:', err.message || err);
          if (isQuotaExceededError(err)) {
            notifyQuotaExceeded(err);
          }
          const fallbackData = getCachedCollection<AppUser[]>('managedUsers', []);
          if (fallbackData) {
            callback(fallbackData);
          }
          if (onError) onError(err);
        }
      );
    } catch (e) {
      console.warn('Error starting onSnapshot for appUsers:', e);
    }
  };

  if (auth.currentUser) {
    startListener();
  }

  const authUnsub = onAuthStateChanged(auth, (u) => {
    if (u) {
      startListener();
      // Re-trigger fresh getDocs upon user auth state resolution
      getDocs(appUsersCol)
        .then((snap) => {
          if (!snap.empty) {
            const items: AppUser[] = [];
            snap.forEach((docSnap) => {
              const raw = docSnap.data() as AppUser;
              const rawStatus = (raw.status as string);
              const normalizedStatus =
                rawStatus === 'revoked'
                  ? ('revoked' as const)
                  : rawStatus === 'invited' || rawStatus === 'pending'
                  ? ('pending' as const)
                  : ('active' as const);
              items.push({ ...raw, id: docSnap.id || raw.id, status: normalizedStatus });
            });
            setCachedCollection('managedUsers', items);
            callback(items);
          }
        })
        .catch(console.warn);
    }
  });

  return () => {
    authUnsub();
    if (unsubSnapshot) {
      try {
        unsubSnapshot();
      } catch {}
    }
  };
}

export function subscribeToPendingInvites(
  callback: (invites: PendingInvite[]) => void,
  onError?: (err: Error) => void
) {
  // 1. Deliver cached invites immediately
  const cached = getCachedCollection<PendingInvite[]>('pendingInvites', []);
  if (cached && cached.length > 0) {
    callback(cached);
  }

  if (!auth.currentUser) return () => {};

  return onSnapshot(
    pendingInvitesCol,
    (snapshot) => {
      const items: PendingInvite[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data() as PendingInvite;
        items.push({ ...data, id: docSnap.id || data.id });
      });
      setCachedCollection('pendingInvites', items);
      callback(items);
    },
    (err) => {
      console.warn('Note on pending invites listener:', err.message || err);
      if (isQuotaExceededError(err)) {
        notifyQuotaExceeded(err);
      }
      const fallbackData = getCachedCollection<PendingInvite[]>('pendingInvites', []);
      if (fallbackData) {
        callback(fallbackData);
      }
      if (onError) onError(err);
    }
  );
}

export function subscribeToFunders(
  callback: (funders: Funder[]) => void,
  onError?: (err: Error) => void
) {
  // 1. Deliver cached funders immediately
  const cached = getCachedCollection<Funder[]>('funders', []);
  if (cached && cached.length > 0) {
    callback(cached);
  }

  if (!auth.currentUser) return () => {};

  return onSnapshot(
    fundersCol,
    (snapshot) => {
      const items: Funder[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data() as Funder;
        items.push({ ...data, id: docSnap.id || data.id });
      });
      const sorted = [...items].sort((a, b) => a.name.localeCompare(b.name));
      setCachedCollection('funders', sorted);
      callback(sorted);
    },
    (err) => {
      console.warn('Note on funders listener:', err.message || err);
      if (isQuotaExceededError(err)) {
        notifyQuotaExceeded(err);
      }
      const fallbackData = getCachedCollection<Funder[]>('funders', []);
      if (fallbackData) {
        callback(fallbackData);
      }
      if (onError) onError(err);
    }
  );
}

/**
 * Request History Tracking Helpers (Append-Only Audit Trail)
 */
export async function recordRequestHistoryInFirestore(
  previous: EmergencyRequest | null,
  current: EmergencyRequest,
  customActionType?: 'create' | 'field_update' | 'status_change' | 'payout_update',
  customActor?: { uid: string; email: string; displayName: string; role: string }
): Promise<void> {
  try {
    const isNew = !previous;
    const actionType: 'create' | 'field_update' | 'status_change' | 'payout_update' =
      customActionType ||
      (isNew
        ? 'create'
        : previous.status !== current.status
        ? 'status_change'
        : JSON.stringify(previous.payoutDetails) !== JSON.stringify(current.payoutDetails)
        ? 'payout_update'
        : 'field_update');

    const changes: Record<string, { before: any; after: any }> = {};

    if (isNew) {
      for (const [key, val] of Object.entries(current)) {
        if (val !== undefined && key !== 'createdAt' && key !== 'updatedAt') {
          changes[key] = { before: null, after: val };
        }
      }
    } else {
      const allKeys = new Set([...Object.keys(previous || {}), ...Object.keys(current || {})]);
      for (const key of allKeys) {
        if (key === 'updatedAt' || key === 'emailLogs' || key === 'smsLogs') continue;
        const prevVal = (previous as any)?.[key];
        const curVal = (current as any)?.[key];
        if (JSON.stringify(prevVal) !== JSON.stringify(curVal)) {
          changes[key] = { before: prevVal ?? null, after: curVal ?? null };
        }
      }
      // If only timestamps or logs changed, skip polluting the history table with empty diffs
      if (Object.keys(changes).length === 0 && !customActionType) {
        return;
      }
    }

    const historyId = `hist_${current.id}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const historyEntry: RequestHistoryEntry = {
      id: historyId,
      requestId: current.id,
      schoolId: current.schoolId || previous?.schoolId || '',
      timestamp: new Date().toISOString(),
      actor: {
        uid: customActor?.uid || auth.currentUser?.uid || 'system',
        email: customActor?.email || auth.currentUser?.email || (auth.currentUser ? '' : 'system@smallmoves.org'),
        displayName:
          customActor?.displayName ||
          auth.currentUser?.displayName ||
          (auth.currentUser?.email ? auth.currentUser.email.split('@')[0] : 'System / Portal'),
        role: customActor?.role || (auth.currentUser ? 'authenticated_user' : 'system'),
      },
      actionType,
      changes,
      previousSnapshot: previous || undefined,
      currentSnapshot: current,
    };

    const histDocRef = doc(db, 'requestHistory', historyId);
    await setDoc(histDocRef, cleanForFirestore(historyEntry));
  } catch (err) {
    console.warn('Silent note on request history tracking:', err);
  }
}

export function subscribeToRequestHistory(
  requestId: string | undefined,
  callback: (history: RequestHistoryEntry[]) => void,
  onError?: (err: Error) => void
) {
  if (!auth.currentUser) return () => {};

  const q = requestId
    ? query(requestHistoryCol, where('requestId', '==', requestId))
    : requestHistoryCol;

  return onSnapshot(
    q,
    (snapshot) => {
      const items: RequestHistoryEntry[] = [];
      snapshot.forEach((d) => items.push(d.data() as RequestHistoryEntry));
      items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      callback(items);
    },
    (err) => {
      console.warn('History subscription note:', err);
      if (onError) onError(err);
    }
  );
}

/**
 * Firestore Write / Mutation Helpers
 */
export async function saveRequestToFirestore(request: EmergencyRequest): Promise<void> {
  // Capture previous state from reactive local cache or prior to write
  const cachedRequests = getCachedCollection<EmergencyRequest[]>('requests', []);
  const prev = cachedRequests.find((r) => r.id === request.id) || null;

  const ref = doc(db, 'requests', request.id);
  await setDoc(ref, cleanForFirestore(request), { merge: true });

  // Background, non-blocking history logging
  recordRequestHistoryInFirestore(prev, request).catch((err) => {
    console.warn('Request history background logging notice:', err);
  });
}

export async function deleteRequestFromFirestore(id: string): Promise<void> {
  const ref = doc(db, 'requests', id);
  await deleteDoc(ref);
}

export async function saveSchoolToFirestore(school: School): Promise<void> {
  const ref = doc(db, 'schools', school.id);
  await setDoc(ref, cleanForFirestore(school), { merge: true });
}

/**
 * Updates only the targeted fields of a school in Firestore.
 * Critical: Never overwrites fields not explicitly included in updates (e.g. annualBudget is preserved).
 */
export async function updateSchoolFieldsInFirestore(
  schoolId: string,
  updates: Partial<School>
): Promise<void> {
  const ref = doc(db, 'schools', schoolId);
  const payload: Record<string, any> = {};
  for (const [key, val] of Object.entries(updates)) {
    if (val === undefined || (val === '' && (key === 'funderId' || key === 'funderName'))) {
      payload[key] = deleteField();
    } else {
      payload[key] = cleanForFirestore(val);
    }
  }
  await setDoc(ref, payload, { merge: true });
}

export async function batchSaveSchoolsToFirestore(
  schools: School[],
  options?: { defaultBudget?: number; merge?: boolean; actorEmail?: string }
): Promise<{ count: number }> {
  if (!schools || schools.length === 0) return { count: 0 };

  const chunkSize = 250;
  let savedCount = 0;

  for (let i = 0; i < schools.length; i += chunkSize) {
    const chunk = schools.slice(i, i + chunkSize);
    const batch = writeBatch(db);

    for (const school of chunk) {
      const ref = doc(db, 'schools', school.id);
      batch.set(ref, cleanForFirestore(school), { merge: options?.merge ?? true });
      savedCount++;
    }

    await batch.commit();
  }

  // Log activity event if actor email provided
  if (options?.actorEmail) {
    const logId = `LOG-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const logEvent: ActivityEvent = {
      id: logId,
      actorId: auth.currentUser?.uid || 'admin',
      actorName: options.actorEmail,
      actorRole: 'Admin',
      eventType: 'budget_adjusted',
      message: `Batch imported ${savedCount} partner schools into directory`,
      timestamp: new Date().toISOString(),
    };
    try {
      await setDoc(doc(db, 'activityLogs', logId), cleanForFirestore(logEvent));
    } catch (e) {
      console.warn('Could not log batch import activity:', e);
    }
  }

  return { count: savedCount };
}

export async function deleteSchoolFromFirestore(id: string): Promise<void> {
  const ref = doc(db, 'schools', id);
  await deleteDoc(ref);
}

export async function saveActivityLogToFirestore(log: ActivityEvent): Promise<void> {
  const ref = doc(db, 'activityLogs', log.id);
  await setDoc(ref, cleanForFirestore(log));
}

export function subscribeToSecrets(
  callback: (secrets: PortalSecrets) => void,
  onError?: (err: Error) => void
) {
  if (!auth.currentUser) return () => {};
  return onSnapshot(
    doc(db, 'settings', 'secrets'),
    (docSnap) => {
      if (docSnap.exists()) {
        callback(docSnap.data() as PortalSecrets);
      } else {
        callback({});
      }
    },
    (err) => {
      console.warn('Note on secrets listener:', err.message || err);
      if (onError) onError(err);
    }
  );
}

export async function getSecretsFromFirestore(): Promise<PortalSecrets> {
  if (!auth.currentUser) return {};
  try {
    const snap = await getDoc(doc(db, 'settings', 'secrets'));
    if (snap.exists()) {
      return snap.data() as PortalSecrets;
    }
  } catch (err) {
    console.warn('Could not load portal secrets:', err);
  }
  return {};
}

export async function saveSecretsToFirestore(secrets: PortalSecrets): Promise<void> {
  const ref = doc(db, 'settings', 'secrets');
  await setDoc(ref, cleanForFirestore(secrets), { merge: true });
}

export async function saveSettingsToFirestore(settings: PortalSettings): Promise<void> {
  // 1. If SendGrid API key is provided, store it securely in /settings/secrets (Admin Only)
  if (settings.emailProvider?.sendgridApiKey !== undefined) {
    const key = settings.emailProvider.sendgridApiKey.trim();
    await saveSecretsToFirestore({
      sendgridApiKey: key,
      updatedAt: new Date().toISOString(),
      updatedBy: auth.currentUser?.email || 'admin',
    });
  }

  // 2. Strip plaintext sendgridApiKey from public /settings/global, replacing with safe hasSendgridKey boolean flag
  const sanitized = { ...settings };
  if (sanitized.emailProvider) {
    const hasKey = !!(
      (sanitized.emailProvider.sendgridApiKey && sanitized.emailProvider.sendgridApiKey.trim().length > 0) ||
      sanitized.emailProvider.hasSendgridKey
    );
    sanitized.emailProvider = {
      ...sanitized.emailProvider,
      sendgridApiKey: '', // Stripped from global document so non-admins never receive it
      hasSendgridKey: hasKey,
    };
  }

  const ref = doc(db, 'settings', 'global');
  await setDoc(ref, cleanForFirestore(sanitized), { merge: true });
}

export async function saveAdminUserToFirestore(admin: AdminUser): Promise<void> {
  const ref = doc(db, 'adminUsers', admin.id);
  await setDoc(ref, cleanForFirestore(admin), { merge: true });
}

export async function deleteAdminUserFromFirestore(id: string): Promise<void> {
  const ref = doc(db, 'adminUsers', id);
  await deleteDoc(ref);
}

export async function saveManagedUserToFirestore(user: AppUser): Promise<void> {
  const ref = doc(db, 'appUsers', user.id);
  await setDoc(ref, cleanForFirestore(user), { merge: true });
}

export async function revokeManagedUserInFirestore(id: string, email?: string): Promise<void> {
  const ref = doc(db, 'appUsers', id);
  await setDoc(ref, { status: 'revoked', updatedAt: new Date().toISOString() }, { merge: true });
  if (email && email.includes('@')) {
    try {
      const q = query(appUsersCol, where('email', '==', email.toLowerCase()));
      const snap = await getDocs(q);
      snap.forEach(async (d) => {
        if (d.id !== id) {
          await setDoc(doc(db, 'appUsers', d.id), { status: 'revoked', updatedAt: new Date().toISOString() }, { merge: true });
        }
      });
    } catch (e) {
      console.warn('Note updating secondary user records by email:', e);
    }
  }
}

export async function reactivateManagedUserInFirestore(id: string, email?: string): Promise<void> {
  const ref = doc(db, 'appUsers', id);
  await setDoc(ref, { status: 'active', updatedAt: new Date().toISOString() }, { merge: true });
  if (email && email.includes('@')) {
    try {
      const q = query(appUsersCol, where('email', '==', email.toLowerCase()));
      const snap = await getDocs(q);
      snap.forEach(async (d) => {
        if (d.id !== id) {
          await setDoc(doc(db, 'appUsers', d.id), { status: 'active', updatedAt: new Date().toISOString() }, { merge: true });
        }
      });
    } catch (e) {
      console.warn('Note updating secondary user records by email:', e);
    }
  }
}

export async function deleteManagedUserFromFirestore(id: string): Promise<void> {
  const ref = doc(db, 'appUsers', id);
  await deleteDoc(ref);
}

export async function savePendingInviteToFirestore(invite: PendingInvite): Promise<void> {
  const ref = doc(db, 'pendingInvites', invite.id);
  await setDoc(ref, cleanForFirestore(invite), { merge: true });
}

export async function deletePendingInviteFromFirestore(id: string): Promise<void> {
  const ref = doc(db, 'pendingInvites', id);
  await deleteDoc(ref);
}

export async function saveFunderToFirestore(funder: Funder): Promise<void> {
  const ref = doc(db, 'funders', funder.id);
  await setDoc(ref, cleanForFirestore(funder), { merge: true });
}

export async function deleteFunderFromFirestore(id: string): Promise<void> {
  const ref = doc(db, 'funders', id);
  await deleteDoc(ref);
}

export interface WipeDataOptions {
  wipeRequests: boolean;
  wipeSchools: boolean;
  wipePrincipalsAndUsers: boolean;
  wipeFunders: boolean;
  wipeActivityLogs: boolean;
  wipePendingInvites: boolean;
  lockMockDataReseed: boolean;
}

/**
 * Production Go-Live Data Wipe Tool:
 * Selectively deletes demo/test documents from Firestore while strictly preserving Admin accounts & System settings.
 */
export async function wipeProductionTestData(
  options: WipeDataOptions,
  currentAdminEmail?: string
): Promise<{ deletedCounts: Record<string, number> }> {
  if (!auth.currentUser) {
    throw new Error('You must be signed in as an administrator to run the go-live reset.');
  }

  // 1. Immediately flag global settings as production ready to prevent any re-seed listener triggers
  if (options.lockMockDataReseed) {
    const settingsDoc = doc(db, 'settings', 'global');
    await setDoc(settingsDoc, cleanForFirestore({ isProductionReady: true }), { merge: true });
  }

  const counts: Record<string, number> = {
    requests: 0,
    schools: 0,
    appUsers: 0,
    pendingInvites: 0,
    funders: 0,
    activityLogs: 0,
  };

  const currentEmailLower = (currentAdminEmail || auth.currentUser.email || '').toLowerCase().trim();
  const currentUid = auth.currentUser.uid;

  // 2. Requests
  if (options.wipeRequests) {
    try {
      const snap = await getDocs(requestsCol);
      for (const d of snap.docs) {
        try {
          await deleteDoc(d.ref);
          counts.requests++;
        } catch (e) {
          console.warn('Error deleting request doc:', d.id, e);
        }
      }
    } catch (e) {
      console.warn('Error querying requests for wipe:', e);
    }
    const mockRequestIds = ['REQ-2026-1001', 'REQ-2026-1002', 'REQ-2026-1003', 'REQ-2026-1004', 'REQ-2026-1005'];
    for (const reqId of mockRequestIds) {
      try {
        await deleteDoc(doc(db, 'requests', reqId));
      } catch {}
    }
  }

  // 3. Schools
  if (options.wipeSchools) {
    try {
      const snap = await getDocs(schoolsCol);
      for (const d of snap.docs) {
        try {
          await deleteDoc(d.ref);
          counts.schools++;
        } catch (e) {
          console.warn('Error deleting school doc:', d.id, e);
        }
      }
    } catch (e) {
      console.warn('Error querying schools for wipe:', e);
    }
    const mockSchoolIds = [
      'SCH-101', 'SCH-102', 'SCH-103', 'SCH-104', 'SCH-105',
      'sch-101', 'sch-102', 'sch-103', 'sch-104', 'sch-105',
      'lincoln-elem', 'oakridge-high', 'roosevelt-middle', 'southside-academy', 'washington-stem'
    ];
    for (const schId of mockSchoolIds) {
      try {
        await deleteDoc(doc(db, 'schools', schId));
      } catch {}
    }
  }

  // 4. Principals & App Users (Preserves Admin accounts)
  if (options.wipePrincipalsAndUsers) {
    try {
      const snap = await getDocs(appUsersCol);
      for (const d of snap.docs) {
        const data = d.data() as AppUser;
        const userEmail = (data.email || '').toLowerCase().trim();
        const isCurrentAdmin =
          (currentEmailLower && userEmail === currentEmailLower) ||
          userEmail === 'cshanecolley@gmail.com' ||
          userEmail === 'rgraham@lff.com' ||
          userEmail.endsWith('@lff.com') ||
          userEmail.endsWith('@smallmoves.org') ||
          d.id === currentUid;
        
        // Preserve admin accounts
        if (data.role === 'admin' || isCurrentAdmin) {
          continue;
        }
        try {
          await deleteDoc(d.ref);
          counts.appUsers++;
        } catch (e) {
          console.warn('Error deleting user doc:', d.id, e);
        }
      }
    } catch (e) {
      console.warn('Error querying users for wipe:', e);
    }

    // Explicitly delete known mock users
    const mockUserIds = [
      'USR-PRINCIPAL-1', 'USR-PRINCIPAL-2', 'USR-PRINCIPAL-3', 'USR-PRINCIPAL-4',
      'AC-101', 'AC-102', 'usr-101', 'usr-102', 'usr-103', 'usr-104', 'usr-105',
    ];
    for (const uId of mockUserIds) {
      try {
        await deleteDoc(doc(db, 'appUsers', uId));
      } catch {}
    }

    // Clean up mock admin placeholders from adminUsers collection
    try {
      const adminSnap = await getDocs(adminUsersCol);
      for (const d of adminSnap.docs) {
        const data = d.data() as AdminUser;
        const adminEmail = (data.email || '').toLowerCase().trim();
        const isCurrentAdmin =
          (currentEmailLower && adminEmail === currentEmailLower) ||
          adminEmail === 'cshanecolley@gmail.com' ||
          d.id === currentUid;
        if (!isCurrentAdmin && (adminEmail.endsWith('@smallmoves.org') || d.id.startsWith('USR-ADMIN-'))) {
          await deleteDoc(d.ref);
        }
      }
    } catch {}
  }

  // 5. Pending Invites
  if (options.wipePendingInvites) {
    try {
      const snap = await getDocs(pendingInvitesCol);
      for (const d of snap.docs) {
        try {
          await deleteDoc(d.ref);
          counts.pendingInvites++;
        } catch (e) {
          console.warn('Error deleting pending invite doc:', d.id, e);
        }
      }
    } catch (e) {
      console.warn('Error querying pending invites for wipe:', e);
    }
    const mockInviteIds = ['INV-101', 'INV-102', 'INV-103', 'INV-104'];
    for (const invId of mockInviteIds) {
      try {
        await deleteDoc(doc(db, 'pendingInvites', invId));
      } catch {}
    }
  }

  // 6. Funders
  if (options.wipeFunders) {
    try {
      const snap = await getDocs(fundersCol);
      for (const d of snap.docs) {
        try {
          await deleteDoc(d.ref);
          counts.funders++;
        } catch (e) {
          console.warn('Error deleting funder doc:', d.id, e);
        }
      }
    } catch (e) {
      console.warn('Error querying funders for wipe:', e);
    }
    const mockFunderIds = ['FND-01', 'FND-02', 'FND-03'];
    for (const fndId of mockFunderIds) {
      try {
        await deleteDoc(doc(db, 'funders', fndId));
      } catch {}
    }
  }

  // 7. Activity Logs
  if (options.wipeActivityLogs) {
    try {
      const snap = await getDocs(activityLogsCol);
      for (const d of snap.docs) {
        try {
          await deleteDoc(d.ref);
          counts.activityLogs++;
        } catch (e) {
          console.warn('Error deleting activity log doc:', d.id, e);
        }
      }
    } catch (e) {
      console.warn('Error querying activity logs for wipe:', e);
    }
  }

  return { deletedCounts: counts };
}

