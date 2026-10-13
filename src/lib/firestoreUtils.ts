import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  onSnapshot,
  orderBy,
  limit,
} from 'firebase/firestore';
import { db, handleFirestoreError } from './firebase';
import {
  EmergencyRequest,
  School,
  ActivityEvent,
  UserProfile,
  Funder,
  OperationType,
} from '../types';

// USER PROFILES
export async function saveUserProfile(user: UserProfile) {
  const path = `users/${user.uid}`;
  try {
    await setDoc(doc(db, 'users', user.uid), user, { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const path = `users/${uid}`;
  try {
    const snap = await getDoc(doc(db, 'users', uid));
    if (snap.exists()) {
      return snap.data() as UserProfile;
    }
    return null;
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, path);
    return null;
  }
}

// EMERGENCY REQUESTS
export async function saveEmergencyRequest(request: EmergencyRequest) {
  const path = `emergencyRequests/${request.id}`;
  try {
    await setDoc(doc(db, 'emergencyRequests', request.id), request, { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function updateEmergencyRequest(requestId: string, updates: Partial<EmergencyRequest>) {
  const path = `emergencyRequests/${requestId}`;
  try {
    await updateDoc(doc(db, 'emergencyRequests', requestId), {
      ...updates,
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

export function subscribeSchoolRequests(
  schoolId: string,
  onUpdate: (requests: EmergencyRequest[]) => void,
  onError?: (err: unknown) => void
) {
  const path = 'emergencyRequests';
  const q = query(collection(db, 'emergencyRequests'), where('schoolId', '==', schoolId));
  return onSnapshot(
    q,
    (snapshot) => {
      const items: EmergencyRequest[] = [];
      snapshot.forEach((docSnap) => items.push(docSnap.data() as EmergencyRequest));
      onUpdate(items);
    },
    (err) => {
      handleFirestoreError(err, OperationType.GET, path);
      if (onError) onError(err);
    }
  );
}

export function subscribeAllRequests(
  onUpdate: (requests: EmergencyRequest[]) => void,
  onError?: (err: unknown) => void
) {
  const path = 'emergencyRequests';
  return onSnapshot(
    collection(db, 'emergencyRequests'),
    (snapshot) => {
      const items: EmergencyRequest[] = [];
      snapshot.forEach((docSnap) => items.push(docSnap.data() as EmergencyRequest));
      onUpdate(items);
    },
    (err) => {
      handleFirestoreError(err, OperationType.GET, path);
      if (onError) onError(err);
    }
  );
}

// SCHOOLS
export async function saveSchool(school: School) {
  const path = `schools/${school.id}`;
  try {
    await setDoc(doc(db, 'schools', school.id), school, { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function updateSchool(schoolId: string, updates: Partial<School>) {
  const path = `schools/${schoolId}`;
  try {
    await updateDoc(doc(db, 'schools', schoolId), {
      ...updates,
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

export function subscribeSchools(
  onUpdate: (schools: School[]) => void,
  onError?: (err: unknown) => void
) {
  const path = 'schools';
  return onSnapshot(
    collection(db, 'schools'),
    (snapshot) => {
      const items: School[] = [];
      snapshot.forEach((docSnap) => items.push(docSnap.data() as School));
      onUpdate(items);
    },
    (err) => {
      handleFirestoreError(err, OperationType.GET, path);
      if (onError) onError(err);
    }
  );
}

// ACTIVITY LOGS
export async function saveActivityEvent(event: ActivityEvent) {
  const path = `activityEvents/${event.id}`;
  try {
    await setDoc(doc(db, 'activityEvents', event.id), event);
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, path);
  }
}

export function subscribeActivityEvents(
  requestId: string,
  onUpdate: (events: ActivityEvent[]) => void,
  onError?: (err: unknown) => void
) {
  const path = 'activityEvents';
  const q = query(collection(db, 'activityEvents'), where('requestId', '==', requestId));
  return onSnapshot(
    q,
    (snapshot) => {
      const items: ActivityEvent[] = [];
      snapshot.forEach((docSnap) => items.push(docSnap.data() as ActivityEvent));
      onUpdate(items);
    },
    (err) => {
      handleFirestoreError(err, OperationType.GET, path);
      if (onError) onError(err);
    }
  );
}
