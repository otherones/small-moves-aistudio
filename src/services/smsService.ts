import {
  collection,
  doc,
  setDoc,
  getDocs,
  onSnapshot,
  query,
  limit,
  orderBy,
} from 'firebase/firestore';
import { db, cleanForFirestore, saveActivityLogToFirestore, getAuthHeaders } from '../lib/firebase';
import { PortalSettings, SmsLogEntry, EmergencyRequest } from '../types';

export interface SendSmsOptions {
  to: string;
  text: string;
  recipientName?: string;
  recipientRole?: string;
  requestId?: string;
  schoolId?: string;
  schoolName?: string;
  targetLanguage?: string;
  targetLanguageName?: string;
  clientRef?: string;
  triggerEvent?: string;
  templateId?: string;
  actorEmail?: string;
  actorName?: string;
}

export interface SmsDispatchResult {
  success: boolean;
  messageUuid: string;
  status: 'delivered' | 'submitted' | 'simulated' | 'failed';
  from: string;
  to: string;
  text: string;
  timestamp: string;
  isTranslated?: boolean;
  targetLanguage?: string;
  targetLanguageName?: string;
  authMethod: 'vonage_jwt_application';
  details?: string;
  error?: string;
}

/**
 * Standardizes a phone number into E.164 format (e.g. 18887190317 or 13125550199)
 */
export function formatPhoneToE164(phone: string): string {
  if (!phone) return '';
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 10) return `1${digits}`;
  if (digits.length === 11 && digits.startsWith('1')) return digits;
  return digits;
}

/**
 * Formats a beneficiary SMS message with clean, friendly copy suitable for SMS constraints
 */
export function buildBeneficiarySms(
  request: EmergencyRequest,
  triggerEvent: string,
  customNote?: string
): string {
  const beneficiaryName = request.beneficiaryName || 'School Family';
  const amount = request.amount ? `$${request.amount.toLocaleString()}` : 'Emergency funds';
  const schoolName = request.schoolName || 'Your School';
  const payoutMethod = request.payoutDetails?.payoutMethodName || 'Direct Support';

  switch (triggerEvent) {
    case 'status_change_to_waiting_on_beneficiary':
    case 'beneficiary_verification':
      return `Small Moves PEF: Hello ${beneficiaryName}, an emergency relief grant of ${amount} (Ref: ${request.id}) has been approved via ${schoolName}. Please reply YES to this message to verify your ${payoutMethod} payout details.`;

    case 'status_change_to_paid':
      return `Small Moves PEF: Hello ${beneficiaryName}, your emergency support grant of ${amount} (Ref: ${request.id}) has been disbursed via ${payoutMethod}. Thank you!`;

    case 'payout_details_reminder':
      return `Small Moves PEF: Friendly reminder for ${beneficiaryName}. Emergency grant ${request.id} (${amount}) is approved and waiting for confirmation. Reply YES to confirm details.`;

    default:
      if (customNote) {
        return `Small Moves PEF (${request.id}): ${customNote}`;
      }
      return `Small Moves PEF Update for ${beneficiaryName} (Ref: ${request.id}): Status is currently ${request.status.replace(/_/g, ' ')}.`;
  }
}

/**
 * Dispatches an outbound SMS message via the server-side Vonage Messages API
 * (using JWT application authentication and linked toll-free 18887190317)
 */
export async function dispatchSms(
  options: SendSmsOptions,
  settings?: PortalSettings,
  actorEmail?: string
): Promise<SmsDispatchResult> {
  const cleanPhone = formatPhoneToE164(options.to);
  const now = new Date().toISOString();

  if (!cleanPhone || cleanPhone.length < 10) {
    const errorMsg = `Invalid recipient mobile phone number: "${options.to}". Must be at least 10 digits.`;
    return {
      success: false,
      messageUuid: `err-${Date.now()}`,
      status: 'failed',
      from: '18887190317',
      to: options.to,
      text: options.text,
      timestamp: now,
      authMethod: 'vonage_jwt_application',
      error: errorMsg,
    };
  }

  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(await getAuthHeaders()),
    };

    const payload = {
      to: cleanPhone,
      text: options.text,
      recipientName: options.recipientName,
      recipientRole: options.recipientRole || 'beneficiary',
      requestId: options.requestId,
      schoolId: options.schoolId,
      schoolName: options.schoolName,
      targetLanguage: options.targetLanguage,
      targetLanguageName: options.targetLanguageName,
      clientRef: options.clientRef || options.requestId,
      triggerEvent: options.triggerEvent,
      templateId: options.templateId,
      actorEmail: actorEmail || options.actorEmail,
    };

    const response = await fetch('/api/send-sms', {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.error || `HTTP ${response.status}: Failed to send SMS via Vonage`);
    }

    const logId = data.logId || `sms-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const result: SmsDispatchResult = {
      success: true,
      messageUuid: data.messageUuid || logId,
      status: data.status || 'submitted',
      from: data.from || '18887190317',
      to: cleanPhone,
      text: data.finalText || options.text,
      timestamp: data.dispatchedAt || now,
      isTranslated: data.isTranslated,
      targetLanguage: data.targetLanguage,
      targetLanguageName: data.targetLanguageName,
      authMethod: 'vonage_jwt_application',
      details: data.details,
    };

    // Explicitly write log document to Firestore client collection using the exact same logId (idempotent setDoc)
    const smsLogEntry: SmsLogEntry = {
      id: logId,
      messageUuid: result.messageUuid,
      direction: 'outbound',
      to: cleanPhone,
      from: result.from,
      recipientName: options.recipientName,
      recipientRole: (options.recipientRole as any) || 'beneficiary',
      text: result.text,
      originalText: options.text,
      status: result.status,
      dispatchedAt: result.timestamp,
      language: result.targetLanguage || 'en',
      languageName: result.targetLanguageName || 'English',
      isTranslated: !!result.isTranslated,
      templateId: options.templateId,
      triggerEvent: options.triggerEvent,
      requestId: options.requestId,
      schoolId: options.schoolId,
      schoolName: options.schoolName,
      clientRef: options.clientRef || options.requestId,
      authMethod: 'vonage_jwt_application',
      details: result.details,
    };

    // Save with the exact same document ID so it never creates a secondary duplicate document
    setDoc(doc(db, 'sms_logs', logId), cleanForFirestore(smsLogEntry)).catch((err) => {
      console.warn('Could not save sms_log from client:', err);
    });

    // Save activity event log in Firestore
    if (options.requestId) {
      const activityMessage = `SMS dispatched via Vonage Messages API (From: ${result.from}, To: +${result.to}) to ${options.recipientName || 'Beneficiary'}${
        result.isTranslated ? ` [Translated to ${result.targetLanguageName}]` : ''
      }: "${result.text.slice(0, 100)}${result.text.length > 100 ? '...' : ''}"`;

      saveActivityLogToFirestore({
        id: `act-sms-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        requestId: options.requestId,
        schoolId: options.schoolId || 'all',
        eventType: 'sms_sent',
        actorId: actorEmail || options.actorName || 'system',
        actorName: options.actorName || 'Small Moves System',
        actorRole: 'system',
        message: activityMessage,
        timestamp: now,
        isInternalNote: false,
      }).catch((e) => console.warn('Could not save SMS activity log:', e));
    }

    return result;
  } catch (err: any) {
    console.error('Error in dispatchSms:', err);
    return {
      success: false,
      messageUuid: `err-${Date.now()}`,
      status: 'failed',
      from: '18887190317',
      to: cleanPhone,
      text: options.text,
      timestamp: now,
      authMethod: 'vonage_jwt_application',
      error: err.message || String(err),
    };
  }
}

/**
 * Checks server-side Vonage configuration status and webhook endpoints
 */
export async function fetchVonageConfigStatus(): Promise<{
  configured: boolean;
  applicationIdConfigured: boolean;
  privateKeyConfigured: boolean;
  fromNumber: string;
  authType: string;
  webhooks: {
    inbound: string;
    status: string;
  };
  error?: string;
}> {
  try {
    const res = await fetch('/api/sms/config');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return {
      configured: !!data.configured,
      applicationIdConfigured: !!data.applicationIdConfigured,
      privateKeyConfigured: !!data.privateKeyConfigured,
      fromNumber: data.fromNumber || '18887190317',
      authType: data.authType || 'JWT Application Authentication',
      webhooks: data.webhooks || {
        inbound: 'https://smallmoves.org/api/sms/inbound',
        status: 'https://smallmoves.org/api/sms/status',
      },
    };
  } catch (e: any) {
    return {
      configured: false,
      applicationIdConfigured: false,
      privateKeyConfigured: false,
      fromNumber: '18887190317',
      authType: 'JWT Application Authentication',
      webhooks: {
        inbound: 'https://smallmoves.org/api/sms/inbound',
        status: 'https://smallmoves.org/api/sms/status',
      },
      error: e.message || 'Unable to query /api/sms/config',
    };
  }
}

/**
 * Deduplicates SMS logs across in-memory buffers, server API payloads, and Firestore snapshots.
 * Consolidates duplicate log entries by ID, messageUuid, or matching (direction + to + from + text).
 */
export function deduplicateSmsLogs(logs: SmsLogEntry[]): SmsLogEntry[] {
  const result: SmsLogEntry[] = [];

  for (const log of logs) {
    if (!log) continue;

    const existingIndex = result.findIndex((item) => {
      if (item.id && log.id && item.id === log.id) return true;
      if (log.messageUuid && item.messageUuid && log.messageUuid === item.messageUuid) return true;
      // If same direction, same destination/sender phone, same message content, and timestamps within 10 seconds
      if (
        item.direction === log.direction &&
        item.to === log.to &&
        item.from === log.from &&
        item.text === log.text &&
        item.dispatchedAt &&
        log.dispatchedAt &&
        Math.abs(new Date(item.dispatchedAt).getTime() - new Date(log.dispatchedAt).getTime()) < 10000
      ) {
        return true;
      }
      return false;
    });

    if (existingIndex >= 0) {
      const existing = result[existingIndex];
      result[existingIndex] = {
        ...existing,
        ...log,
        id: existing.id || log.id,
        messageUuid: existing.messageUuid || log.messageUuid,
        status: existing.status === 'delivered' ? 'delivered' : log.status || existing.status,
        recipientName: existing.recipientName || log.recipientName,
        recipientRole: existing.recipientRole || log.recipientRole,
        requestId: existing.requestId || log.requestId,
        schoolId: existing.schoolId || log.schoolId,
        schoolName: existing.schoolName || log.schoolName,
        details:
          existing.details && existing.details.length > (log.details?.length || 0)
            ? existing.details
            : log.details || existing.details,
      };
    } else {
      result.push(log);
    }
  }

  result.sort((a, b) => new Date(b.dispatchedAt || 0).getTime() - new Date(a.dispatchedAt || 0).getTime());
  return result;
}

/**
 * Fetches SMS logs from both server API endpoint and Firestore client with automated deduplication
 */
export async function fetchSmsLogs(maxLimit: number = 100): Promise<SmsLogEntry[]> {
  const rawLogs: SmsLogEntry[] = [];

  // 1. Fetch from server API
  try {
    const res = await fetch('/api/sms/logs');
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.logs)) {
        for (const log of data.logs) {
          if (log && (log.id || log.messageUuid)) {
            rawLogs.push(log);
          }
        }
      }
    }
  } catch (err) {
    console.warn('Could not fetch from /api/sms/logs:', err);
  }

  // 2. Fetch from Firestore client SDK
  try {
    const logsCol = collection(db, 'sms_logs');
    const q = query(logsCol, limit(maxLimit));
    const snap = await getDocs(q);
    snap.forEach((docSnap) => {
      const logData = { id: docSnap.id, ...(docSnap.data() as any) };
      rawLogs.push(logData);
    });
  } catch (err) {
    console.debug('Firestore client fetch sms_logs note:', err);
  }

  return deduplicateSmsLogs(rawLogs);
}

/**
 * Subscribes to real-time SMS logs with instant fetch, live Firestore updates, and periodic polling sync
 */
export function subscribeToSmsLogs(
  callback: (logs: SmsLogEntry[]) => void,
  maxLimit: number = 100
): () => void {
  let isUnsubscribed = false;
  let currentLogs: SmsLogEntry[] = [];

  const emit = () => {
    const deduped = deduplicateSmsLogs(currentLogs);
    currentLogs = deduped;
    callback(deduped);
  };

  // Initial fetch from server & Firestore
  fetchSmsLogs(maxLimit).then((initialLogs) => {
    if (isUnsubscribed) return;
    currentLogs = initialLogs;
    emit();
  });

  // Listen to Firestore real-time snapshots
  let unsubscribeFirestore = () => {};
  try {
    const logsCol = collection(db, 'sms_logs');
    const q = query(logsCol, limit(maxLimit));
    unsubscribeFirestore = onSnapshot(
      q,
      (snapshot) => {
        if (isUnsubscribed) return;
        const newFromSnapshot: SmsLogEntry[] = [];
        snapshot.forEach((docSnap) => {
          newFromSnapshot.push({
            id: docSnap.id,
            ...(docSnap.data() as any),
          });
        });
        currentLogs = [...newFromSnapshot, ...currentLogs];
        emit();
      },
      (error) => {
        console.debug('Firestore onSnapshot sms_logs note:', error);
      }
    );
  } catch (err) {
    console.debug('Error setting up onSnapshot for sms_logs:', err);
  }

  // Poll server every 5 seconds as a backup for webhooks received server-side
  const intervalId = setInterval(async () => {
    if (isUnsubscribed) return;
    try {
      const res = await fetch('/api/sms/logs');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.logs)) {
          currentLogs = [...data.logs, ...currentLogs];
          emit();
        }
      }
    } catch {
      // Ignore background poll errors
    }
  }, 5000);

  return () => {
    isUnsubscribed = true;
    clearInterval(intervalId);
    unsubscribeFirestore();
  };
}
