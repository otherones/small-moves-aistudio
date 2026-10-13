import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  getDocs,
  onSnapshot,
  query,
  limit,
  serverTimestamp
} from 'firebase/firestore';
import {
  db,
  cleanForFirestore,
  saveActivityLogToFirestore,
  getAuthHeaders,
  isQuotaExceededError,
  notifyQuotaExceeded,
  getCachedCollection,
  setCachedCollection,
} from '../lib/firebase';
import { PortalSettings, FirebaseMailDocument, ActivityEvent } from '../types';
import { renderEmailTemplate, EmailRenderContext, sanitizePortalUrls, PRODUCTION_PORTAL_URL } from '../utils/emailUtils';

export interface SendEmailOptions {
  to: string | string[];
  cc?: string | string[];
  bcc?: string | string[];
  recipientName?: string;
  recipientRole?: string;
  subject: string;
  body: string; // Plaintext or Markdown-style text
  html?: string; // Optional custom HTML
  targetLanguage?: string; // ISO 639-1 GCP language code (e.g. 'es', 'ar', 'zh')
  targetLanguageName?: string;
  isBeneficiaryEmail?: boolean;
  triggerEvent?: string;
  templateId?: string;
  templateKey?: string;
  requestId?: string;
  schoolId?: string;
  schoolName?: string;
  isTest?: boolean;
  isResend?: boolean;
  forceDispatch?: boolean;
  actorEmail?: string;
  actorName?: string;
}

export interface EmailDispatchResult {
  success: boolean;
  docId: string;
  messageId?: string;
  method: 'firebase_extension' | 'sendgrid_api' | 'simulation' | 'sandbox';
  status: 'delivered' | 'queued' | 'simulated' | 'error';
  recipient: string;
  subject: string;
  timestamp: string;
  isTranslated?: boolean;
  targetLanguage?: string;
  targetLanguageName?: string;
  error?: string;
}

/**
 * Builds a clean, responsive HTML email template from plaintext body
 */
export function buildHtmlEmail(
  subject: string,
  bodyText: string,
  settings?: PortalSettings,
  context?: EmailRenderContext
): string {
  const cleanSubject = sanitizePortalUrls(subject);
  const cleanBodyText = sanitizePortalUrls(bodyText);

  // Convert newlines to paragraphs / breaks, turn links into styled buttons/anchors
  const paragraphs = cleanBodyText
    .split(/\n\n+/)
    .map((p) => {
      // Check if this paragraph contains a direct setup link or URL
      const linkMatch = p.match(/(https?:\/\/[^\s]+)/g);
      let formatted = p.replace(/\n/g, '<br />');

      if (linkMatch) {
        linkMatch.forEach((url) => {
          const sanitizedUrl = sanitizePortalUrls(url);
          if (p.toLowerCase().includes('direct setup link') || p.toLowerCase().includes('link:')) {
            formatted = formatted.replace(
              url,
              `<div style="margin: 20px 0;"><a href="${sanitizedUrl}" style="background-color: #059669; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block; font-size: 14px;">Access Portal Account &rarr;</a><div style="font-size: 11px; color: #64748b; margin-top: 8px; word-break: break-all;">Direct URL: <a href="${sanitizedUrl}" style="color: #059669;">${sanitizedUrl}</a></div></div>`
            );
          } else {
            formatted = formatted.replace(
              url,
              `<a href="${sanitizedUrl}" style="color: #059669; text-decoration: underline;">${sanitizedUrl}</a>`
            );
          }
        });
      }
      return `<p style="margin: 0 0 16px 0; line-height: 1.6; color: #334155; font-size: 15px;">${formatted}</p>`;
    })
    .join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${cleanSubject}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; padding: 32px 16px;">
    <tr>
      <td align="center">
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px; background-color: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
          <!-- Header Banner -->
          <tr>
            <td style="background-color: #064e3b; padding: 24px 32px; border-bottom: 3px solid #10b981;">
              <table width="100%" border="0" cellspacing="0" cellpadding="0">
                <tr>
                  <td>
                    <div style="font-size: 20px; font-weight: 800; color: #ffffff; letter-spacing: -0.5px;">
                      Small Moves
                    </div>
                    <div style="font-size: 12px; color: #a7f3d0; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; margin-top: 2px;">
                      Principal Emergency Fund Portal
                    </div>
                  </td>
                  <td align="right">
                    <span style="background-color: rgba(255, 255, 255, 0.15); color: #ecfdf5; font-size: 11px; font-weight: 700; padding: 4px 10px; border-radius: 20px;">
                      Official Notification
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td style="padding: 36px 32px 24px 32px;">
              <h1 style="margin: 0 0 20px 0; font-size: 18px; font-weight: 700; color: #0f172a; line-height: 1.4;">
                ${cleanSubject}
              </h1>
              <div style="color: #334155;">
                ${paragraphs}
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f1f5f9; padding: 24px 32px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #64748b; line-height: 1.5;">
              <div style="font-weight: 600; color: #475569; margin-bottom: 4px;">
                Small Moves Principal Emergency Fund
              </div>
              <div>
                This is an automated administrative notification dispatched via Twilio SendGrid / Firebase Trigger Email.
              </div>
              <div style="margin-top: 8px; font-size: 11px; color: #94a3b8;">
                If you have questions, please reach out to <a href="mailto:${settings?.emailProvider?.fromEmail || 'support@smallmoves.org'}" style="color: #059669; text-decoration: underline;">${settings?.emailProvider?.fromEmail || 'support@smallmoves.org'}</a>.
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// Deduplication cache to prevent duplicate email triggers in rapid succession
interface RecentDispatchRecord {
  docId: string;
  messageId: string;
  time: number;
}
const recentDispatchCache = new Map<string, RecentDispatchRecord>();

/**
 * Dispatches an email via the server-side SendGrid proxy endpoint and records it in Firestore
 */
export async function dispatchEmail(
  options: SendEmailOptions,
  settings: PortalSettings,
  currentUserEmail?: string,
  overrideProvider?: Partial<PortalSettings['emailProvider']>
): Promise<EmailDispatchResult> {
  const emailProvider = {
    enabled: true,
    provider: 'sendgrid' as const,
    fromEmail: 'support@smallmoves.org',
    fromName: 'Small Moves Principal Emergency Fund',
    mailCollection: 'mail',
    sandboxMode: false,
    pauseOutboundEmails: false,
    trackOpens: true,
    trackClicks: true,
    ...(settings.emailProvider || {}),
    ...(overrideProvider || {}),
  };

  const recipientList = Array.isArray(options.to) ? options.to : [options.to];
  const primaryRecipient = (recipientList[0] || 'recipient@example.com').trim().toLowerCase();
  const collectionName = emailProvider.mailCollection || 'mail';

  const isPaused = !!emailProvider.pauseOutboundEmails;
  const nowIso = new Date().toISOString();
  const mailDocId = `mail-${Date.now()}-${Math.floor(Math.random() * 10000)}`;

  // Automated Email Deduplication Guard:
  // Check if an identical email (same recipient + triggerEvent or same recipient + subject) was dispatched/queued recently
  const triggerKey = (options.triggerEvent || options.templateKey || 'transactional').toLowerCase().trim();
  const dedupKey = `${primaryRecipient}::${triggerKey}::${options.requestId || ''}::${options.subject.trim()}`;
  const nowTime = Date.now();
  const lastSent = recentDispatchCache.get(dedupKey);

  // Invite emails have a 15-minute dedup window; transactional/status changes have a 45-second window
  const isInvite = triggerKey.includes('invite') || triggerKey.includes('principal');
  const dedupWindowMs = isInvite ? 15 * 60 * 1000 : 45 * 1000;

  if (options.isResend || options.forceDispatch) {
    recentDispatchCache.delete(dedupKey);
  } else if (lastSent && nowTime - lastSent.time < dedupWindowMs && !options.isTest) {
    console.info(
      `[Email Deduplication] Suppressed redundant duplicate email to ${primaryRecipient} for trigger "${triggerKey}" (Existing dispatch ID: ${lastSent.docId})`
    );
    return {
      success: true,
      docId: lastSent.docId,
      messageId: lastSent.messageId,
      method: 'simulation',
      status: isPaused ? 'queued' : 'delivered',
      recipient: primaryRecipient,
      subject: options.subject,
      timestamp: nowIso,
      isTranslated: false,
      targetLanguage: options.targetLanguage,
      targetLanguageName: options.targetLanguageName,
    };
  }

  const renderedHtml = options.html || buildHtmlEmail(options.subject, options.body, settings);

  let method: 'sendgrid_api' | 'simulation' | 'sandbox' | 'firebase_extension' = 'sendgrid_api';
  let deliveryState: 'SUCCESS' | 'ERROR' | 'PENDING' | 'SIMULATED' | 'PROCESSING' | 'CANCELLED' = 'SUCCESS';
  let messageId = `msg-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  let dispatchError: string | undefined = undefined;
  let dispatchDetails: string = 'Dispatched successfully';
  let finalSubject = options.subject;
  let finalBody = options.body;
  let isTranslated = false;

  // If paused, we do NOT send via SendGrid immediately — we hold it in the Firestore queue as PENDING
  if (isPaused) {
    deliveryState = 'PENDING';
    method = 'sendgrid_api';
    messageId = `queued-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    dispatchDetails = 'Email communications are paused. Message placed in pending queue.';

    // Pre-translate if target language is non-English so queued payload is ready for recipient
    if (options.targetLanguage && options.targetLanguage.toLowerCase() !== 'en') {
      try {
        const authHeaders = await getAuthHeaders();
        const transRes = await fetch('/api/translate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...authHeaders,
          },
          body: JSON.stringify({
            subject: options.subject,
            body: options.body,
            targetLanguage: options.targetLanguage,
            targetLanguageName: options.targetLanguageName,
          }),
        });
        if (transRes.ok) {
          const transData = await transRes.json();
          if (transData.success) {
            finalSubject = transData.translatedSubject || finalSubject;
            finalBody = transData.translatedBody || finalBody;
            isTranslated = true;
          }
        }
      } catch (tErr) {
        console.warn('Pre-translation for queued email failed, retaining original text:', tErr);
      }
    }
  } else {
    // 1. Live Dispatch via server-side endpoint (/api/send-email)
    try {
      const authHeaders = await getAuthHeaders();
      const response = await fetch('/api/send-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders,
        },
        body: JSON.stringify({
          to: recipientList,
          cc: options.cc,
          bcc: options.bcc,
          fromEmail: emailProvider.fromEmail || 'support@smallmoves.org',
          fromName: emailProvider.fromName || 'Small Moves Principal Emergency Fund',
          replyTo: emailProvider.replyToEmail || emailProvider.fromEmail || 'support@smallmoves.org',
          subject: options.subject,
          text: options.body,
          html: renderedHtml,
          targetLanguage: options.targetLanguage,
          targetLanguageName: options.targetLanguageName,
          isBeneficiaryEmail: !!options.isBeneficiaryEmail,
          sandboxMode: !!emailProvider.sandboxMode,
          trackOpens: !!emailProvider.trackOpens,
          trackClicks: !!emailProvider.trackClicks,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          deliveryState = data.status === 'sandbox' ? 'SUCCESS' : 'SUCCESS';
          method = data.method || 'sendgrid_api';
          messageId = data.sendgridMessageId || data.messageId || messageId;
          dispatchDetails = data.details || (data.status === 'sandbox' ? 'SendGrid Sandbox mode validated' : 'Delivered via SendGrid API');
          if (data.finalSubject) finalSubject = data.finalSubject;
          if (data.finalText) finalBody = data.finalText;
          if (data.translation?.translated) isTranslated = true;
        } else if (data.status === 'simulated') {
          deliveryState = 'SIMULATED';
          method = 'simulation';
          messageId = data.messageId || messageId;
          dispatchError = data.error || 'SendGrid API key not configured. Simulated locally.';
          dispatchDetails = data.details || 'Local simulation (no live email sent to SendGrid)';
        } else {
          deliveryState = 'ERROR';
          dispatchError = data.error || 'Server reported email delivery failure';
          method = data.method || 'sendgrid_api';
        }
      } else {
        const errText = await response.text();
        deliveryState = 'ERROR';
        dispatchError = `Server endpoint error (${response.status}): ${errText}`;
      }
    } catch (err: any) {
      console.warn('Network call to /api/send-email failed:', err);
      deliveryState = 'ERROR';
      dispatchError = err?.message || 'Network request failed';
    }
  }

  // 2. Construct the standard Firebase Trigger Email / SendGrid component document
  const finalHtml = options.html || buildHtmlEmail(finalSubject, finalBody, settings);
  const mailPayload: FirebaseMailDocument = {
    id: mailDocId,
    to: recipientList,
    cc: options.cc ? (Array.isArray(options.cc) ? options.cc : [options.cc]) : undefined,
    bcc: options.bcc ? (Array.isArray(options.bcc) ? options.bcc : [options.bcc]) : undefined,
    from: `"${emailProvider.fromName || 'Small Moves PEF'}" <${emailProvider.fromEmail || 'support@smallmoves.org'}>`,
    replyTo: emailProvider.replyToEmail || emailProvider.fromEmail || 'support@smallmoves.org',
    message: {
      subject: finalSubject,
      text: finalBody,
      html: finalHtml,
    },
    sendgridOptions: {
      sandboxMode: !!emailProvider.sandboxMode,
      categories: [options.triggerEvent || 'transactional_notice', options.isTest ? 'test_email' : 'live_dispatch'],
      customArgs: {
        appletId: 'pef-portal',
        triggerEvent: options.triggerEvent || 'custom',
        requestId: options.requestId || '',
        schoolId: options.schoolId || '',
        targetLanguage: options.targetLanguage || 'en',
      },
    },
    metadata: {
      triggerEvent: options.triggerEvent || 'transactional',
      requestId: options.requestId,
      schoolId: options.schoolId,
      templateId: options.templateId,
      dispatchedBy: options.actorEmail || currentUserEmail || 'system',
      dispatchedAt: nowIso,
      isTest: !!options.isTest,
    },
    delivery: {
      state: deliveryState,
      method: method as any,
      startTime: nowIso,
      endTime: new Date().toISOString(),
      error: dispatchError,
      info: {
        messageId,
        sendgridMessageId: method === 'sendgrid_api' ? messageId : undefined,
        accepted: deliveryState === 'SUCCESS' ? recipientList : [],
        response: dispatchDetails,
        timestamp: nowIso,
        sender: emailProvider.fromEmail || 'support@smallmoves.org',
      },
    },
    createdAt: serverTimestamp(),
  };

  // 3. Update local cache for mailLogs immediately so it reflects instantly in UI
  try {
    const existingCache = getCachedCollection<FirebaseMailDocument[]>(`mailLogs_${collectionName}`, []);
    const localMailDoc: FirebaseMailDocument = {
      ...mailPayload,
      createdAt: { seconds: Math.floor(Date.now() / 1000), nanoseconds: 0 } as any,
    };
    setCachedCollection(`mailLogs_${collectionName}`, [
      localMailDoc,
      ...existingCache.filter((m) => m.id !== mailDocId),
    ]);
  } catch (cErr) {
    console.warn('Failed to update local mail log cache:', cErr);
  }

  // 4. Write document to Firestore 'mail' collection
  try {
    const mailDocRef = doc(db, collectionName, mailDocId);
    await setDoc(mailDocRef, cleanForFirestore(mailPayload));

    // 5. Log to activity logs
    const activityEvent: ActivityEvent = {
      id: `act-email-${Date.now()}`,
      requestId: options.requestId || 'EMAIL-DISPATCH',
      schoolId: options.schoolId || 'SYSTEM',
      actorId: options.actorEmail || currentUserEmail || 'system',
      actorName: options.actorName || currentUserEmail || 'System Dispatcher',
      actorRole: 'admin',
      eventType: isPaused ? 'email_queued' : (options.isTest ? 'test_email_dispatched' : 'email_sent'),
      message: isPaused
        ? `Email communications paused: Queued notice to ${primaryRecipient}: "${finalSubject}" (State: PENDING in /${collectionName})`
        : isTranslated
        ? `Dispatched translated email (${options.targetLanguageName || options.targetLanguage}) to ${primaryRecipient}: "${finalSubject}" (${deliveryState})`
        : `Dispatched email via Twilio SendGrid to ${primaryRecipient}: "${finalSubject}" (${deliveryState})`,
      timestamp: nowIso,
    };
    await saveActivityLogToFirestore(activityEvent).catch((err) =>
      console.warn('Error saving email activity log:', err)
    );

    // Save in deduplication cache to prevent re-triggering within dedup window
    recentDispatchCache.set(dedupKey, { docId: mailDocId, messageId, time: Date.now() });

    return {
      success: isPaused ? true : deliveryState === 'SUCCESS',
      docId: mailDocId,
      messageId: messageId,
      method: method,
      status: isPaused ? 'queued' : (deliveryState === 'SUCCESS' ? 'delivered' : 'error'),
      recipient: primaryRecipient,
      subject: finalSubject,
      timestamp: nowIso,
      isTranslated,
      targetLanguage: options.targetLanguage,
      targetLanguageName: options.targetLanguageName,
      error: dispatchError,
    };
  } catch (err: any) {
    console.error('Failed to write email document to Firestore:', err);
    return {
      success: deliveryState === 'SUCCESS',
      docId: mailDocId,
      messageId: messageId,
      method: method,
      status: deliveryState === 'SUCCESS' ? 'delivered' : 'error',
      recipient: primaryRecipient,
      subject: options.subject,
      timestamp: nowIso,
      error: err?.message,
    };
  }
}

/**
 * Deduplicates all pending emails in the Firestore mail collection.
 * Identifies duplicate invite or transactional emails to the same recipient and cancels the duplicates.
 */
export async function deduplicatePendingMailQueue(
  settings?: PortalSettings,
  collectionName: string = 'mail'
): Promise<{
  totalScanned: number;
  deduplicatedCount: number;
  cancelledIds: string[];
}> {
  const result = {
    totalScanned: 0,
    deduplicatedCount: 0,
    cancelledIds: [] as string[],
  };

  try {
    const snap = await getDocs(collection(db, collectionName));
    const pendingDocs: { id: string; data: FirebaseMailDocument }[] = [];
    snap.forEach((d) => {
      const data = d.data() as FirebaseMailDocument;
      const state = (data.delivery?.state || 'PENDING').toUpperCase();
      if (state === 'PENDING' || state === 'QUEUED' || !data.delivery?.state) {
        pendingDocs.push({ id: d.id, data: { ...data, id: d.id } });
      }
    });

    result.totalScanned = pendingDocs.length;
    if (pendingDocs.length <= 1) return result;

    // Group pending docs by normalized primary recipient
    const recipientGroups = new Map<string, { id: string; data: FirebaseMailDocument }[]>();
    for (const item of pendingDocs) {
      const recipients = Array.isArray(item.data.to) ? item.data.to : [item.data.to];
      const primary = (recipients[0] || '').toLowerCase().trim();
      if (!recipientGroups.has(primary)) {
        recipientGroups.set(primary, []);
      }
      recipientGroups.get(primary)!.push(item);
    }

    for (const [recipient, group] of recipientGroups.entries()) {
      if (group.length > 1) {
        // Sort: Prioritize specific invite/role triggers over generic transactional duplicates
        group.sort((a, b) => {
          const aTrigger = (a.data.metadata?.triggerEvent || a.data.template?.name || '').toLowerCase();
          const bTrigger = (b.data.metadata?.triggerEvent || b.data.template?.name || '').toLowerCase();
          const aIsInvite = aTrigger.includes('invite') || aTrigger.includes('principal');
          const bIsInvite = bTrigger.includes('invite') || bTrigger.includes('principal');
          if (aIsInvite && !bIsInvite) return -1;
          if (!aIsInvite && bIsInvite) return 1;
          return (b.data.delivery?.startTime || '').localeCompare(a.data.delivery?.startTime || '');
        });

        const primaryDoc = group[0];
        for (let j = 1; j < group.length; j++) {
          const dup = group[j];
          result.deduplicatedCount++;
          result.cancelledIds.push(dup.id);

          const dupTrigger = dup.data.metadata?.triggerEvent || 'transactional';
          const cancelReason = `Deduplicated against primary pending email (${primaryDoc.id}). Suppressed duplicate ${dupTrigger} email to prevent double-sending to ${recipient}.`;

          const updatedDoc: Partial<FirebaseMailDocument> = {
            ...dup.data,
            delivery: {
              state: 'CANCELLED',
              startTime: dup.data.delivery?.startTime || new Date().toISOString(),
              endTime: new Date().toISOString(),
              error: cancelReason,
              info: {
                messageId: `dedup-${dup.id}`,
                accepted: [recipient],
                response: 'Deduplicated: Redundant pending copy suppressed in queue',
              },
            },
          };

          await setDoc(doc(db, collectionName, dup.id), cleanForFirestore(updatedDoc)).catch((e) =>
            console.warn(`Error updating deduplicated mail doc ${dup.id}:`, e)
          );
        }
      }
    }
  } catch (err) {
    console.error('Error during deduplicatePendingMailQueue:', err);
  }

  return result;
}

/**
 * Processes all pending emails in the Firestore mail collection and updates their delivery state to SUCCESS/ERROR.
 * Automatically performs pre-dispatch deduplication to prevent double-sending to recipients.
 */
export async function processPendingEmailQueue(
  settings: PortalSettings,
  collectionName: string = 'mail'
): Promise<{
  totalProcessed: number;
  successCount: number;
  errorCount: number;
  deduplicatedCount: number;
  errors: string[];
}> {
  const result = {
    totalProcessed: 0,
    successCount: 0,
    errorCount: 0,
    deduplicatedCount: 0,
    errors: [] as string[],
  };

  try {
    const mailColRef = collection(db, collectionName);
    const snap = await getDocs(mailColRef);

    const pendingDocs: { id: string; data: FirebaseMailDocument }[] = [];
    snap.forEach((d) => {
      const data = d.data() as FirebaseMailDocument;
      const state = (data.delivery?.state || 'PENDING').toUpperCase();
      if (state === 'PENDING' || state === 'QUEUED' || !data.delivery?.state) {
        pendingDocs.push({ id: d.id, data: { ...data, id: d.id } });
      }
    });

    if (pendingDocs.length === 0) {
      return result;
    }

    // Deduplication Phase: Group pending emails by recipient to eliminate redundant transactional/invite duplicates
    const recipientGroups = new Map<string, { id: string; data: FirebaseMailDocument }[]>();
    for (const item of pendingDocs) {
      const recipients = Array.isArray(item.data.to) ? item.data.to : [item.data.to];
      const primary = (recipients[0] || '').toLowerCase().trim();
      if (!recipientGroups.has(primary)) {
        recipientGroups.set(primary, []);
      }
      recipientGroups.get(primary)!.push(item);
    }

    const docsToDispatch: { id: string; data: FirebaseMailDocument }[] = [];
    for (const [recipient, group] of recipientGroups.entries()) {
      if (group.length === 1) {
        docsToDispatch.push(group[0]);
      } else {
        // Multiple pending emails for this recipient: Sort to prioritize primary invitation
        group.sort((a, b) => {
          const aTrigger = (a.data.metadata?.triggerEvent || a.data.template?.name || '').toLowerCase();
          const bTrigger = (b.data.metadata?.triggerEvent || b.data.template?.name || '').toLowerCase();
          const aIsInvite = aTrigger.includes('invite') || aTrigger.includes('principal');
          const bIsInvite = bTrigger.includes('invite') || bTrigger.includes('principal');
          if (aIsInvite && !bIsInvite) return -1;
          if (!aIsInvite && bIsInvite) return 1;
          return (b.data.delivery?.startTime || '').localeCompare(a.data.delivery?.startTime || '');
        });

        // The primary email to send
        const primaryDoc = group[0];
        docsToDispatch.push(primaryDoc);

        // Cancel the remaining duplicate entries in Firestore
        for (let j = 1; j < group.length; j++) {
          const dup = group[j];
          result.deduplicatedCount++;
          result.totalProcessed++;

          const dupTrigger = dup.data.metadata?.triggerEvent || 'transactional';
          const cancelMsg = `Deduplicated against pending email (${primaryDoc.id}). Suppressed duplicate ${dupTrigger} email to prevent double-sending to ${recipient}.`;

          const updatedDoc: Partial<FirebaseMailDocument> = {
            ...dup.data,
            delivery: {
              state: 'CANCELLED',
              startTime: dup.data.delivery?.startTime || new Date().toISOString(),
              endTime: new Date().toISOString(),
              error: cancelMsg,
              info: {
                messageId: `dedup-${dup.id}`,
                accepted: [recipient],
                response: 'Deduplicated: Duplicate transactional copy suppressed in queue',
              },
            },
          };

          await setDoc(doc(db, collectionName, dup.id), cleanForFirestore(updatedDoc)).catch((e) =>
            console.warn(`Error updating deduplicated mail doc ${dup.id}:`, e)
          );
        }
      }
    }

    const emailProvider = settings.emailProvider || {
      enabled: true,
      provider: 'sendgrid',
      fromEmail: 'support@smallmoves.org',
      fromName: 'Small Moves Principal Emergency Fund',
      mailCollection: collectionName,
      sandboxMode: false,
      trackOpens: true,
      trackClicks: true,
    };

    for (let i = 0; i < docsToDispatch.length; i++) {
      const item = docsToDispatch[i];
      result.totalProcessed++;
      const mail = item.data;
      const recipients = Array.isArray(mail.to) ? mail.to : [mail.to];
      const rawSubject = mail.message?.subject || 'Notification';
      const rawText = mail.message?.text || '';
      const rawHtml = mail.message?.html || `<p>${rawText.replace(/\n/g, '<br/>')}</p>`;

      // Check if email is legacy/expired from older platform versions
      const isLegacyEmail =
        rawSubject.toLowerCase() === 'invitation received' ||
        rawHtml.includes('staging.smallmoves.org') ||
        rawText.includes('staging.smallmoves.org') ||
        rawHtml.includes('2021 Small Moves Foundation');

      if (isLegacyEmail) {
        // Suppress legacy email to avoid sending stale credentials or expired URLs
        const archiveMsg =
          'Legacy queue item archived. Suppressed to prevent dispatching expired credentials or legacy staging URLs.';
        const updatedDoc: Partial<FirebaseMailDocument> = {
          ...mail,
          delivery: {
            state: 'CANCELLED',
            startTime: mail.delivery?.startTime || new Date().toISOString(),
            endTime: new Date().toISOString(),
            error: archiveMsg,
            info: {
              messageId: `archive-${item.id}`,
              accepted: recipients,
              response: 'Archived: Legacy email suppressed',
              sender: emailProvider.fromEmail || 'support@smallmoves.org',
            },
          },
        };
        await setDoc(doc(db, collectionName, item.id), cleanForFirestore(updatedDoc)).catch((e) =>
          console.warn(`Error updating archived legacy mail doc ${item.id}:`, e)
        );
        result.deduplicatedCount++;
        continue;
      }

      // Ensure all URLs point to the production smallmoves.org domain
      const subject = sanitizePortalUrls(rawSubject);
      const text = sanitizePortalUrls(rawText);
      const html = sanitizePortalUrls(rawHtml);

      let state: 'SUCCESS' | 'ERROR' = 'SUCCESS';
      let errMessage: string | undefined = undefined;
      let msgId = `msg-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
      let method = 'sendgrid_api';
      let infoResponse = 'Processed from queue via SendGrid pipeline';
      let isRateLimitError = false;

      try {
        const authHeaders = await getAuthHeaders();
        const response = await fetch('/api/send-email', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...authHeaders,
          },
          body: JSON.stringify({
            to: recipients,
            cc: mail.cc,
            bcc: mail.bcc,
            fromEmail: emailProvider.fromEmail || 'support@smallmoves.org',
            fromName: emailProvider.fromName || 'Small Moves Principal Emergency Fund',
            replyTo: mail.replyTo || emailProvider.fromEmail || 'support@smallmoves.org',
            subject: subject,
            text: text,
            html: html,
            sandboxMode: !!emailProvider.sandboxMode,
            trackOpens: !!emailProvider.trackOpens,
            trackClicks: !!emailProvider.trackClicks,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            state = 'SUCCESS';
            msgId = data.sendgridMessageId || data.messageId || msgId;
            method = data.method || 'sendgrid_api';
            infoResponse = data.details || 'Delivered successfully via SendGrid';
          } else if (data.status === 'simulated') {
            state = 'ERROR';
            errMessage = data.error || 'SendGrid API key not configured. Real email was not dispatched.';
            result.errors.push(`${subject}: ${errMessage}`);
            method = 'simulation';
          } else {
            state = 'ERROR';
            errMessage = data.error || 'Delivery failed';
            result.errors.push(`${subject}: ${errMessage}`);
            if (errMessage?.toLowerCase().includes('rate exceeded') || errMessage?.includes('429')) {
              isRateLimitError = true;
            }
          }
        } else if (response.status === 429) {
          state = 'ERROR';
          errMessage = 'SendGrid API rate limit reached (Rate exceeded). Please pause for a moment before retrying.';
          result.errors.push(`${subject}: ${errMessage}`);
          isRateLimitError = true;
        } else {
          state = 'ERROR';
          errMessage = `Server error ${response.status}`;
          result.errors.push(`${subject}: ${errMessage}`);
        }
      } catch (err: any) {
        state = 'ERROR';
        errMessage = `Network error during dispatch: ${err?.message || 'Failed to connect to server'}`;
        result.errors.push(`${subject}: ${errMessage}`);
      }

      if (state === 'SUCCESS') {
        result.successCount++;
      } else {
        result.errorCount++;
      }

      // Update document in Firestore
      const updatedDoc: Partial<FirebaseMailDocument> = {
        ...mail,
        delivery: {
          state: state,
          method: method as any,
          startTime: mail.delivery?.startTime || new Date().toISOString(),
          endTime: new Date().toISOString(),
          error: errMessage,
          info: {
            messageId: msgId,
            sendgridMessageId: method === 'sendgrid_api' ? msgId : undefined,
            accepted: state === 'SUCCESS' ? recipients : [],
            response: infoResponse,
            sender: emailProvider.fromEmail || 'support@smallmoves.org',
          },
        },
      };

      await setDoc(doc(db, collectionName, item.id), cleanForFirestore(updatedDoc)).catch((e) =>
        console.warn(`Error updating mail doc ${item.id}:`, e)
      );

      // If rate limited by provider, halt the remaining batch immediately to avoid cascaded 429 errors
      if (isRateLimitError) {
        console.warn('SendGrid rate limit reached during batch queue processing. Pausing queue.');
        result.errors.push('Batch queue processing paused to prevent additional rate limit warnings.');
        break;
      }

      // Add a polite 400ms throttle between messages
      if (i < docsToDispatch.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 400));
      }
    }
  } catch (err: any) {
    console.error('Error processing pending email queue:', err);
    result.errors.push(err?.message || 'Failed to process email queue');
  }

  return result;
}

/**
 * Dispatches a single pending email from the queue via SendGrid API
 */
export async function sendSinglePendingMail(
  mailId: string,
  mailData: FirebaseMailDocument,
  settings: PortalSettings,
  collectionName: string = 'mail'
): Promise<{ success: boolean; error?: string; messageId?: string }> {
  try {
    const emailProvider = settings.emailProvider || {
      enabled: true,
      provider: 'sendgrid',
      fromEmail: 'support@smallmoves.org',
      fromName: 'Small Moves Principal Emergency Fund',
      mailCollection: collectionName,
      sandboxMode: false,
      trackOpens: true,
      trackClicks: true,
    };

    const recipients = Array.isArray(mailData.to) ? mailData.to : [mailData.to];
    const rawSubject = mailData.message?.subject || 'Notification';
    const rawText = mailData.message?.text || '';
    const rawHtml = mailData.message?.html || `<p>${rawText.replace(/\n/g, '<br/>')}</p>`;

    // Ensure all URLs point to the production smallmoves.org domain
    const subject = sanitizePortalUrls(rawSubject);
    const text = sanitizePortalUrls(rawText);
    const html = sanitizePortalUrls(rawHtml);

    let state: 'SUCCESS' | 'ERROR' = 'SUCCESS';
    let errMessage: string | undefined = undefined;
    let msgId = `msg-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
    let method = 'sendgrid_api';
    let infoResponse = 'Dispatched from queue via SendGrid API';

    const authHeaders = await getAuthHeaders();
    const response = await fetch('/api/send-email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders,
      },
      body: JSON.stringify({
        to: recipients,
        cc: mailData.cc,
        bcc: mailData.bcc,
        fromEmail: emailProvider.fromEmail || 'support@smallmoves.org',
        fromName: emailProvider.fromName || 'Small Moves Principal Emergency Fund',
        replyTo: mailData.replyTo || emailProvider.fromEmail || 'support@smallmoves.org',
        subject: subject,
        text: text,
        html: html,
        sandboxMode: !!emailProvider.sandboxMode,
        trackOpens: !!emailProvider.trackOpens,
        trackClicks: !!emailProvider.trackClicks,
      }),
    });

    if (response.ok) {
      const data = await response.json();
      if (data.success) {
        state = 'SUCCESS';
        msgId = data.sendgridMessageId || data.messageId || msgId;
        method = data.method || 'sendgrid_api';
        infoResponse = data.details || 'Delivered successfully via SendGrid';
      } else if (data.status === 'simulated') {
        state = 'ERROR';
        errMessage = data.error || 'SendGrid API key not configured. Real email was not dispatched.';
        method = 'simulation';
      } else {
        state = 'ERROR';
        errMessage = data.error || 'Delivery failed';
      }
    } else {
      state = 'ERROR';
      errMessage = `Server error ${response.status}`;
    }

    const updatedDoc: FirebaseMailDocument = {
      ...mailData,
      delivery: {
        state: state,
        method: method as any,
        startTime: mailData.delivery?.startTime || new Date().toISOString(),
        endTime: new Date().toISOString(),
        error: errMessage,
        info: {
          messageId: msgId,
          sendgridMessageId: method === 'sendgrid_api' ? msgId : undefined,
          accepted: state === 'SUCCESS' ? recipients : [],
          response: infoResponse,
          sender: emailProvider.fromEmail || 'support@smallmoves.org',
        },
      },
    };

    await setDoc(doc(db, collectionName, mailId), cleanForFirestore(updatedDoc));

    if (state === 'SUCCESS') {
      const activityEvent: ActivityEvent = {
        id: `act-email-sent-${Date.now()}`,
        requestId: mailData.metadata?.requestId || 'EMAIL-DISPATCH',
        schoolId: mailData.metadata?.schoolId || 'SYSTEM',
        actorId: 'admin',
        actorName: 'Administrator',
        actorRole: 'admin',
        eventType: 'email_sent',
        message: `Dispatched queued email to ${recipients[0]}: "${subject}" (SUCCESS)`,
        timestamp: new Date().toISOString(),
      };
      await saveActivityLogToFirestore(activityEvent).catch((e) =>
        console.warn('Error saving queue email activity log:', e)
      );
    }

    return {
      success: state === 'SUCCESS',
      error: errMessage,
      messageId: msgId,
    };
  } catch (err: any) {
    console.error('Error sending single pending mail:', err);
    return {
      success: false,
      error: err?.message || 'Failed to dispatch queued email',
    };
  }
}

/**
 * Manually marks a pending email as DELIVERED/SUCCESS
 */
export async function markMailAsDelivered(
  mailId: string,
  mailData: FirebaseMailDocument,
  collectionName: string = 'mail'
): Promise<boolean> {
  try {
    const recipients = Array.isArray(mailData.to) ? mailData.to : [mailData.to];
    const updated: FirebaseMailDocument = {
      ...mailData,
      delivery: {
        state: 'SUCCESS',
        startTime: mailData.delivery?.startTime || new Date().toISOString(),
        endTime: new Date().toISOString(),
        info: {
          messageId: `manual-${Date.now()}`,
          accepted: recipients,
          response: 'Manually verified and marked as delivered by Administrator',
        },
      },
    };
    await setDoc(doc(db, collectionName, mailId), cleanForFirestore(updated));
    return true;
  } catch (err) {
    console.error('Error marking mail as delivered:', err);
    return false;
  }
}

/**
 * Deletes a mail record from the Firestore collection
 */
export async function deleteMailDocument(
  mailId: string,
  collectionName: string = 'mail'
): Promise<boolean> {
  try {
    await deleteDoc(doc(db, collectionName, mailId));
    return true;
  } catch (err) {
    console.error('Error deleting mail document:', err);
    return false;
  }
}

/**
 * Purges multiple or all mail documents
 */
export async function clearAllMailDocuments(
  mailIds: string[],
  collectionName: string = 'mail'
): Promise<number> {
  let count = 0;
  for (const id of mailIds) {
    try {
      await deleteDoc(doc(db, collectionName, id));
      count++;
    } catch (err) {
      console.warn(`Could not delete mail ${id}:`, err);
    }
  }
  return count;
}

/**
 * Fetches mail logs directly via getDocs with local caching and quota fallback
 */
export async function fetchMailLogs(
  collectionName: string = 'mail',
  maxCount: number = 250
): Promise<FirebaseMailDocument[]> {
  const colName = collectionName || 'mail';
  const cached = getCachedCollection<FirebaseMailDocument[]>(`mailLogs_${colName}`, []);

  try {
    const mailCol = collection(db, colName);
    const snap = await getDocs(query(mailCol, limit(maxCount)));
    const mails: FirebaseMailDocument[] = [];
    snap.forEach((docSnap) => {
      const data = docSnap.data() as FirebaseMailDocument;
      mails.push({ ...data, id: docSnap.id });
    });
    mails.sort((a, b) => {
      const timeA =
        a.metadata?.dispatchedAt ||
        (a.createdAt ? (typeof a.createdAt === 'string' ? a.createdAt : (a.createdAt as any)?.toDate?.()?.toISOString?.() || '') : '') ||
        '';
      const timeB =
        b.metadata?.dispatchedAt ||
        (b.createdAt ? (typeof b.createdAt === 'string' ? b.createdAt : (b.createdAt as any)?.toDate?.()?.toISOString?.() || '') : '') ||
        '';
      return timeB.localeCompare(timeA);
    });

    if (mails.length > 0) {
      setCachedCollection(`mailLogs_${colName}`, mails);
    }
    return mails.length > 0 ? mails : cached;
  } catch (err) {
    if (isQuotaExceededError(err)) {
      notifyQuotaExceeded();
      console.warn('Firestore quota exceeded while fetching mail logs; serving cached logs.');
    } else {
      console.warn('Error fetching mail logs, falling back to cache:', err);
    }
    return cached;
  }
}

/**
 * Subscribes to the real-time Firebase 'mail' collection to view recent email dispatches
 */
export function subscribeToMailLogs(
  callback: (mails: FirebaseMailDocument[]) => void,
  collectionName: string = 'mail',
  maxCount: number = 250
) {
  const colName = collectionName || 'mail';
  const cached = getCachedCollection<FirebaseMailDocument[]>(`mailLogs_${colName}`, []);
  if (cached.length > 0) {
    callback(cached);
  }

  try {
    const mailCol = collection(db, colName);
    const q = query(mailCol, limit(maxCount));

    return onSnapshot(
      q,
      (snapshot) => {
        const mails: FirebaseMailDocument[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data() as FirebaseMailDocument;
          mails.push({ ...data, id: docSnap.id });
        });
        // Sort newest first
        mails.sort((a, b) => {
          const timeA =
            a.metadata?.dispatchedAt ||
            (a.createdAt ? (typeof a.createdAt === 'string' ? a.createdAt : (a.createdAt as any)?.toDate?.()?.toISOString?.() || '') : '') ||
            '';
          const timeB =
            b.metadata?.dispatchedAt ||
            (b.createdAt ? (typeof b.createdAt === 'string' ? b.createdAt : (b.createdAt as any)?.toDate?.()?.toISOString?.() || '') : '') ||
            '';
          return timeB.localeCompare(timeA);
        });

        if (mails.length > 0) {
          setCachedCollection(`mailLogs_${colName}`, mails);
        }
        callback(mails);
      },
      async (err) => {
        if (isQuotaExceededError(err)) {
          notifyQuotaExceeded();
          console.warn(`Quota exceeded for /${colName} listener, serving cached mail logs.`);
        } else {
          console.warn(`Notice listening to /${colName} collection:`, err);
        }
        const fallback = getCachedCollection<FirebaseMailDocument[]>(`mailLogs_${colName}`, []);
        callback(fallback);
      }
    );
  } catch (err) {
    if (isQuotaExceededError(err)) {
      notifyQuotaExceeded();
    }
    console.warn('Could not subscribe to mail collection:', err);
    callback(cached);
    return () => {};
  }
}

/**
 * Dispatches a live test email directly to the currently logged in user
 */
export async function sendTestEmailToCurrentUser(
  userEmail: string,
  userName: string,
  templateId: string,
  settings: PortalSettings,
  customNote?: string,
  overrideProvider?: Partial<PortalSettings['emailProvider']>
): Promise<EmailDispatchResult> {
  const effectiveProvider = {
    ...(settings.emailProvider || {}),
    ...(overrideProvider || {}),
  };
  const templates = settings.emailTemplates || [];
  let subject = 'Twilio SendGrid & Firebase Email Integration Test';
  let body = `Hello ${userName},\n\nThis is a live test email verifying that your Twilio SendGrid email provider and Firebase Trigger Email component are properly connected and operational.\n\nConfiguration Details:\n- Provider: Twilio SendGrid\n- Component: Firebase Trigger Email (/${effectiveProvider.mailCollection || 'mail'} collection)\n- Verified Sender: ${effectiveProvider.fromEmail || 'support@smallmoves.org'}\n- Dispatched At: ${new Date().toLocaleString()}\n\nIf you received this message, your email dispatch pipeline is fully operational.\n\nWarm regards,\nSmall Moves Administration`;

  if (templateId && templateId !== 'test_ping') {
    const selectedTemplate = templates.find((t) => t.id === templateId);
    if (selectedTemplate) {
      const origin = PRODUCTION_PORTAL_URL;
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
          submitter_name: userName,
          submitter_email: userEmail,
          beneficiary_name: 'Test Beneficiary (Family Support)',
          student_name: 'Jordan Miller',
          school_name: 'Lincoln Elementary School',
          amount: '1,250',
          category: 'Housing / Eviction Prevention',
          status_note: customNote || 'SendGrid test dispatch verification note.',
          payout_method_name: 'Direct Electronic Transfer / Zelle',
          recipient_name: userName,
          recipient_email: userEmail,
          invite_link: `${origin}/setup-account?token=test-invite-token-12345`,
          custom_note: customNote ? `Test note: "${customNote}"` : '',
        }
      );
      subject = `[TEST] ${rendered.subject}`;
      body = rendered.body;
    }
  }

  return await dispatchEmail(
    {
      to: userEmail,
      subject,
      body,
      triggerEvent: 'admin_test_email',
      templateId,
      isTest: true,
      actorEmail: userEmail,
      actorName: userName,
    },
    settings,
    userEmail,
    overrideProvider
  );
}

/**
 * Scans all emails in the Firestore 'mail' collection (or other collections)
 * and patches any URLs pointing to cloud preview domains or localhost with https://smallmoves.org.
 */
export async function updateQueuedEmailUrls(
  collectionName: string = 'mail'
): Promise<{ totalScanned: number; updatedCount: number; errors: string[] }> {
  const result = {
    totalScanned: 0,
    updatedCount: 0,
    errors: [] as string[],
  };

  try {
    const mailColRef = collection(db, collectionName);
    const snap = await getDocs(mailColRef);

    for (const docSnap of snap.docs) {
      result.totalScanned++;
      const data = docSnap.data() as FirebaseMailDocument;
      const originalSubject = data.message?.subject || '';
      const originalText = data.message?.text || '';
      const originalHtml = data.message?.html || '';

      const needsFix =
        originalSubject.includes('.run.app') ||
        originalSubject.includes('localhost') ||
        originalSubject.includes('127.0.0.1') ||
        originalSubject.includes('ais-dev') ||
        originalText.includes('.run.app') ||
        originalText.includes('localhost') ||
        originalText.includes('127.0.0.1') ||
        originalText.includes('ais-dev') ||
        originalHtml.includes('.run.app') ||
        originalHtml.includes('localhost') ||
        originalHtml.includes('127.0.0.1') ||
        originalHtml.includes('ais-dev');

      if (needsFix) {
        const fixedSubject = sanitizePortalUrls(originalSubject);
        const fixedText = sanitizePortalUrls(originalText);
        const fixedHtml = sanitizePortalUrls(originalHtml);

        const updatedDoc: FirebaseMailDocument = {
          ...data,
          message: {
            subject: fixedSubject,
            text: fixedText,
            html: fixedHtml,
          },
        };

        await setDoc(doc(db, collectionName, docSnap.id), cleanForFirestore(updatedDoc));
        result.updatedCount++;
      }
    }
  } catch (err: any) {
    console.error('Error updating queued email URLs in Firestore:', err);
    result.errors.push(err?.message || 'Failed to update email URLs');
  }

  return result;
}

export interface EmailProviderServerStatus {
  configured: boolean;
  isEnvSecret: boolean;
  keyFormatValid: boolean;
  maskedKey: string;
  provider: string;
}

/**
 * Checks with the backend whether the SendGrid API Key secret is configured in the environment/secrets store.
 */
export async function fetchEmailProviderStatus(): Promise<EmailProviderServerStatus> {
  try {
    const authHeaders = await getAuthHeaders();
    const response = await fetch('/api/email-provider-status', {
      headers: {
        ...authHeaders,
      },
    });
    if (response.ok) {
      const data = await response.json();
      return {
        configured: !!data.configured,
        isEnvSecret: !!data.isEnvSecret,
        keyFormatValid: !!data.keyFormatValid,
        maskedKey: data.maskedKey || '',
        provider: data.provider || 'sendgrid',
      };
    }
  } catch (err) {
    console.warn('Failed to fetch email provider status from server:', err);
  }
  return {
    configured: false,
    isEnvSecret: false,
    keyFormatValid: false,
    maskedKey: '',
    provider: 'sendgrid',
  };
}

