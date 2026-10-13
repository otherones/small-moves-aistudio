import { EmergencyRequest, EmailTemplateConfig, EmailLogEntry, PortalSettings } from '../types';
import { INITIAL_SETTINGS } from '../data/defaultSettings';
import { getLanguageByCode } from '../data/languages';
import { translateContent } from '../services/translationService';

export interface EmailRenderContext {
  request_id?: string;
  submitter_name?: string;
  submitter_email?: string;
  beneficiary_name?: string;
  student_name?: string;
  school_name?: string;
  amount?: string;
  category?: string;
  status_note?: string;
  denial_reason?: string;
  reason?: string;
  custom_note?: string;
  payout_method_name?: string;
  payee_type?: string;
  third_party_payee_name?: string;
  recipient_name?: string;
  recipient_email?: string;
  request_link?: string;
  request_url?: string;
  link?: string;
  open_request_link?: string;
  admin_request_link?: string;
  school_request_link?: string;
  verification_link?: string;
  payout_link?: string;
  confirm_link?: string;
  invite_link?: string;
  language?: string;
  [key: string]: string | undefined;
}

export const PRODUCTION_PORTAL_URL = 'https://smallmoves.org';

/**
 * Returns the canonical public portal domain for all outbound email communications and user links.
 */
export function getPublicPortalBaseUrl(): string {
  return PRODUCTION_PORTAL_URL;
}

/**
 * Replaces any temporary cloud preview URLs (e.g. ais-dev-*.run.app, run.app, or localhost) with the official https://smallmoves.org production domain.
 */
export function sanitizePortalUrls(text: string): string {
  if (!text) return '';
  return text
    .replace(/https?:\/\/[a-zA-Z0-9.-]+\.run\.app/gi, PRODUCTION_PORTAL_URL)
    .replace(/https?:\/\/ais-[a-zA-Z0-9.-]+/gi, PRODUCTION_PORTAL_URL)
    .replace(/https?:\/\/localhost(?::\d+)?/gi, PRODUCTION_PORTAL_URL)
    .replace(/https?:\/\/127\.0\.0\.1(?::\d+)?/gi, PRODUCTION_PORTAL_URL)
    .replace(/https?:\/\/0\.0\.0\.0(?::\d+)?/gi, PRODUCTION_PORTAL_URL)
    .replace(/https%3A%2F%2F[a-zA-Z0-9.-]+\.run\.app/gi, encodeURIComponent(PRODUCTION_PORTAL_URL))
    .replace(/https%3a%2f%2f[a-zA-Z0-9.-]+\.run\.app/gi, encodeURIComponent(PRODUCTION_PORTAL_URL));
}

/**
 * Returns the public beneficiary payout verification and confirmation URL
 */
export function generatePayoutVerificationLink(requestId: string): string {
  return `${PRODUCTION_PORTAL_URL}/verify-payout?id=${encodeURIComponent(requestId)}`;
}

/**
 * Returns the web portal URL to open a specific request.
 * When forAdmin is true, generates the administrative URL (/admin/requests/:id).
 * When forAdmin is false, generates the school portal URL (/requests/:id).
 */
export function generateRequestLink(requestId: string, forAdmin: boolean = false): string {
  return forAdmin
    ? `${PRODUCTION_PORTAL_URL}/admin/requests/${encodeURIComponent(requestId)}`
    : `${PRODUCTION_PORTAL_URL}/requests/${encodeURIComponent(requestId)}`;
}

/**
 * Replaces handlebars-style variables {{variable_name}} in subject and body template strings.
 */
export function renderEmailText(templateStr: string, context: EmailRenderContext): string {
  if (!templateStr) return '';
  
  return templateStr.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (match, key) => {
    const lowerKey = key.toLowerCase();
    const val = context[lowerKey] ?? context[key];
    if (val !== undefined && val !== null) {
      return String(val);
    }
    return match; // Return unchanged if variable not found
  });
}

/**
 * Renders both subject and body for an email template using request context.
 */
export function renderEmailTemplate(
  template: { subject: string; body: string },
  context: EmailRenderContext
): { subject: string; body: string } {
  return {
    subject: sanitizePortalUrls(renderEmailText(template.subject, context)),
    body: sanitizePortalUrls(renderEmailText(template.body, context)),
  };
}

/**
 * Maps a request status or trigger action to the matching system trigger event code.
 */
export function mapStatusToTriggerEvent(status: string): string {
  if (status.startsWith('status_change_to_')) {
    return status;
  }
  switch (status) {
    case 'submitted':
    case 'request_submission':
      return 'request_submission';
    case 'waiting_on_principal':
      return 'status_change_to_waiting_on_principal';
    case 'changes_requested':
      return 'status_change_to_changes_requested';
    case 'waiting_on_beneficiary':
      return 'status_change_to_waiting_on_beneficiary';
    case 'ready_to_pay':
      return 'status_change_to_ready_to_pay';
    case 'paid':
      return 'status_change_to_paid';
    case 'denied':
      return 'status_change_to_denied';
    case 'response_requested':
      return 'status_change_to_response_requested';
    case 'reminder_scheduled':
      return 'reminder_scheduled';
    case 'annual_budget_reset':
      return 'annual_budget_reset';
    case 'admin_invitation':
    case 'admin_invite':
      return 'admin_invitation';
    case 'contact_invitation':
    case 'authorized_contact_invitation':
    case 'contact_invite':
      return 'contact_invitation';
    case 'principal_invitation':
    case 'principal_invite':
    case 'school_invitation':
    case 'invite':
      return 'principal_invitation';
    case 'admin_review_alert':
    case 'review_alert':
    case 'in_review':
      return 'admin_review_alert';
    default:
      return status.startsWith('tpl-') ? status : `status_change_to_${status}`;
  }
}

export interface InviteEmailContext {
  recipient_name?: string;
  recipient_email?: string;
  school_name?: string;
  invite_link?: string;
  amount?: string;
  custom_note?: string;
  role?: string;
  trigger_event?: string;
  job_title?: string;
  [key: string]: string | undefined;
}

/**
 * Renders an invite email (for admins, principals, or authorized contacts) using stored Email Templates.
 */
export function renderInviteEmail(
  emailTemplates: EmailTemplateConfig[],
  context: InviteEmailContext
): { template: EmailTemplateConfig | null; subject: string; body: string } {
  const targetRole = context.role || '';
  const trigger = context.trigger_event || '';

  let matchingTemplate: EmailTemplateConfig | undefined;

  if (targetRole === 'admin' || trigger === 'admin_invitation') {
    matchingTemplate = emailTemplates.find(
      (t) =>
        t.triggerEvent === 'admin_invitation' ||
        t.id === 'tpl-12' ||
        t.name.toLowerCase().includes('administrator') ||
        t.name.toLowerCase().includes('admin')
    );
  } else if (
    targetRole === 'additional_contact' ||
    targetRole === 'contact' ||
    trigger === 'contact_invitation'
  ) {
    matchingTemplate = emailTemplates.find(
      (t) =>
        t.triggerEvent === 'contact_invitation' ||
        t.id === 'tpl-11' ||
        t.name.toLowerCase().includes('contact') ||
        t.name.toLowerCase().includes('staff')
    );
  } else {
    matchingTemplate = emailTemplates.find(
      (t) =>
        t.triggerEvent === 'principal_invitation' ||
        t.triggerEvent === 'school_invitation' ||
        t.id === 'tpl-10' ||
        t.name.toLowerCase().includes('principal')
    );
  }

  // Fallback defaults if template is missing
  if (!matchingTemplate) {
    if (targetRole === 'admin') {
      matchingTemplate = {
        id: 'tpl-12',
        name: 'Program Administrator Invitation',
        triggerEvent: 'admin_invitation',
        recipientRole: 'Program Administrator',
        subject: 'Small Moves Program Administrator Access Invitation',
        body: 'Dear {{recipient_name}},\n\nYou have been invited to join the Small Moves Principal Emergency Fund team as a Program Administrator.\n\nTo complete your account setup, set your password, and configure Multi-Factor Authentication (MFA), please use the direct link below:\n\nDirect Setup Link: {{invite_link}}\n\n{{custom_note}}\n\nWarm regards,\nSmall Moves Leadership',
        enabled: true,
      };
    } else if (targetRole === 'additional_contact') {
      matchingTemplate = {
        id: 'tpl-11',
        name: 'Authorized Contact / Staff Invitation',
        triggerEvent: 'contact_invitation',
        recipientRole: 'Authorized Contact / Staff',
        subject: 'Authorized Contact Portal Invitation — {{school_name}}',
        body: 'Dear {{recipient_name}},\n\nYou have been invited as an Authorized Contact for {{school_name}} on the Principal Emergency Fund portal.\n\nTo finish creating your account, set your password, and configure Multi-Factor Authentication (MFA), please use the direct link below:\n\nDirect Setup Link: {{invite_link}}\n\n{{custom_note}}\n\nWarm regards,\nSmall Moves Administration',
        enabled: true,
      };
    } else {
      matchingTemplate = {
        id: 'tpl-10',
        name: 'Principal Invitation & School Onboarding',
        triggerEvent: 'principal_invitation',
        recipientRole: 'School Principal',
        subject: 'Principal Portal Invitation — {{school_name}}',
        body: 'Dear {{recipient_name}},\n\nYou have been invited as the Principal for {{school_name}} on the Principal Emergency Fund portal.\n\nYour school annual allocation is ${{amount}}.\n\nTo complete school onboarding, set your password, and configure Multi-Factor Authentication (MFA), please use the direct link below:\n\nDirect Setup Link: {{invite_link}}\n\n{{custom_note}}\n\nWarm regards,\nSmall Moves Administration',
        enabled: true,
      };
    }
  }

  // Derive direct link with security token or email parameter
  const defaultInviteLink =
    context.invite_link ||
    (context.invite_code
      ? `${PRODUCTION_PORTAL_URL}/setup-account?token=${encodeURIComponent(context.invite_code)}`
      : context.recipient_email
      ? `${PRODUCTION_PORTAL_URL}/setup-account?email=${encodeURIComponent(context.recipient_email)}`
      : `${PRODUCTION_PORTAL_URL}/setup-account`);

  // Sanitize template body to remove any legacy raw invite code references from stored database templates
  let cleanBody = matchingTemplate.body
    .replace(/(?:Invite Code|invite code|Invitation Code|Registration Code):\s*(?:\{\{\s*invite_code\s*\}\}|[A-Z0-9-]+)\n?/gi, '')
    .replace(/\{\{\s*invite_code\s*\}\}/gi, '');

  // If the body doesn't contain the invite_link variable, append it clearly
  if (!cleanBody.includes('invite_link') && !cleanBody.includes('Direct Setup Link')) {
    cleanBody += '\n\nDirect Setup Link: {{invite_link}}';
  }

  const rendered = renderEmailTemplate(
    { subject: matchingTemplate.subject, body: cleanBody },
    {
      ...context,
      recipient_name: context.recipient_name || 'Portal User',
      school_name: context.school_name || 'Partner School',
      amount: context.amount || '10,000',
      invite_link: defaultInviteLink,
      custom_note: context.custom_note ? `Note from Admin: "${context.custom_note}"` : '',
    }
  );

  return {
    template: matchingTemplate,
    subject: rendered.subject,
    body: rendered.body,
  };
}

/**
 * Generates a full EmailLogEntry with all template variables rendered.
 */
export function generateEmailLogEntry(
  request: EmergencyRequest,
  triggerEventOrStatus: string,
  emailTemplates?: EmailTemplateConfig[],
  customNote?: string,
  overrideRecipientEmail?: string,
  overrideRecipientName?: string
): EmailLogEntry | null {
  const templates = (emailTemplates && emailTemplates.length > 0) ? emailTemplates : INITIAL_SETTINGS.emailTemplates;
  const triggerEvent = mapStatusToTriggerEvent(triggerEventOrStatus);
  const matchingTemplate = templates.find(
    (t) =>
      t.triggerEvent === triggerEvent ||
      t.triggerEvent === triggerEventOrStatus ||
      t.id === triggerEventOrStatus ||
      t.id === triggerEvent
  );

  if (!matchingTemplate || !matchingTemplate.enabled) {
    return null;
  }

  const isBeneficiaryRole =
    matchingTemplate.recipientRole.toLowerCase().includes('beneficiary') ||
    matchingTemplate.triggerEvent.includes('waiting_on_beneficiary') ||
    matchingTemplate.triggerEvent.includes('beneficiary_verification') ||
    matchingTemplate.id === 'tpl-03';
  const isAdminComms =
    matchingTemplate.recipientRole.toLowerCase().includes('admin') ||
    matchingTemplate.recipientRole.toLowerCase().includes('administrator') ||
    matchingTemplate.recipientRole.toLowerCase().includes('finance') ||
    matchingTemplate.recipientRole.toLowerCase().includes('ops') ||
    matchingTemplate.recipientRole.toLowerCase().includes('operations') ||
    matchingTemplate.recipientRole.toLowerCase().includes('review') ||
    matchingTemplate.recipientRole.toLowerCase().includes('leadership') ||
    matchingTemplate.triggerEvent.includes('admin') ||
    matchingTemplate.triggerEvent.includes('finance') ||
    matchingTemplate.triggerEvent.includes('ready_to_pay');

  // Determine recipient details
  let recipientEmail = overrideRecipientEmail;
  let recipientName = overrideRecipientName || request.submitterName;

  if (isBeneficiaryRole) {
    recipientName = request.beneficiaryName || 'Beneficiary';
    if (overrideRecipientEmail && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(overrideRecipientEmail.trim())) {
      recipientEmail = overrideRecipientEmail.trim();
    } else {
      const contactMethod = request.payoutDetails?.contactMethod;
      const rawContact = request.payoutDetails?.contactValue?.trim();
      const isEmail = rawContact && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(rawContact);

      // Critical: Beneficiary confirmation emails must ONLY go to the beneficiary.
      // If contactMethod is text/SMS or contactValue is not an email, do NOT generate an email.
      // Under no circumstances should this notification fall back to the submitter/principal.
      if (contactMethod === 'text' || !isEmail) {
        return null;
      }
      recipientEmail = rawContact;
    }
  } else if (!recipientEmail) {
    if (matchingTemplate.recipientRole.toLowerCase().includes('finance')) {
      recipientName = 'Small Moves Finance Operations';
      recipientEmail = 'finance@smallmoves.org';
    } else if (isAdminComms) {
      recipientName = 'Small Moves Program Administration';
      recipientEmail = 'admin@smallmoves.org';
    } else {
      recipientEmail = request.submitterEmail || 'user@smallmoves.org';
    }
  }

  if (!recipientEmail) {
    if (isBeneficiaryRole) {
      return null;
    }
    recipientEmail = request.submitterEmail || 'user@smallmoves.org';
  }

  const langCode = isBeneficiaryRole
    ? (request.beneficiaryLanguage || request.payoutDetails?.beneficiaryLanguage || 'en')
    : 'en';
  const langObj = getLanguageByCode(langCode);

  const resolvedNote = customNote || request.statusNote || 'No additional note provided.';
  const resolvedDenialReason = customNote || request.statusNote || 'No specific denial reason provided.';

  // Build specific URLs
  const adminRequestLink = generateRequestLink(request.id, true);
  const schoolRequestLink = generateRequestLink(request.id, false);
  const verificationLink = generatePayoutVerificationLink(request.id);

  // Determine the primary contextual link:
  // - Admin comms receive direct admin portal link (/admin/requests/:id)
  // - Beneficiaries receive the payout verification link (/verify-payout?id=:id)
  // - Principals, submitters, and school contacts receive the school portal request link (/requests/:id)
  const contextualRequestLink = isAdminComms
    ? adminRequestLink
    : (isBeneficiaryRole ? verificationLink : schoolRequestLink);

  const context: EmailRenderContext = {
    request_id: request.id,
    request_link: contextualRequestLink,
    request_url: contextualRequestLink,
    link: contextualRequestLink,
    open_request_link: contextualRequestLink,
    admin_request_link: adminRequestLink,
    school_request_link: schoolRequestLink,
    submitter_name: request.submitterName,
    submitter_email: request.submitterEmail,
    beneficiary_name: request.beneficiaryName,
    student_name: request.studentName || 'N/A',
    school_name: request.schoolName,
    amount: request.amount.toLocaleString(),
    category: request.category,
    status_note: resolvedNote,
    denial_reason: resolvedDenialReason,
    reason: resolvedDenialReason,
    custom_note: customNote || request.statusNote || '',
    payout_method_name: request.payoutDetails?.payoutMethodName || 'Not specified yet',
    payee_type:
      request.payoutDetails?.payeeType === 'third_party'
        ? 'Third-Party Payee'
        : 'Beneficiary Direct',
    third_party_payee_name: request.payoutDetails?.thirdPartyPayeeName || 'N/A',
    recipient_name: recipientName,
    recipient_email: recipientEmail,
    verification_link: verificationLink,
    payout_link: verificationLink,
    confirm_link: verificationLink,
    confirmation_link: verificationLink,
    payout_confirmation_link: verificationLink,
    beneficiary_confirmation_link: verificationLink,
    beneficiary_payout_confirmation_link: verificationLink,
    payout_verification_link: verificationLink,
  };

  const rendered = renderEmailTemplate(
    { subject: matchingTemplate.subject, body: matchingTemplate.body },
    context
  );

  const isNonEnglish = isBeneficiaryRole && langObj.code.toLowerCase() !== 'en';

  return {
    id: `email-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    requestId: request.id,
    templateId: matchingTemplate.id,
    templateName: matchingTemplate.name,
    triggerEvent: matchingTemplate.triggerEvent,
    recipientEmail: recipientEmail.trim(),
    recipientName,
    recipientRole: matchingTemplate.recipientRole,
    subject: isNonEnglish ? `[${langObj.name}] ${rendered.subject}` : rendered.subject,
    body: rendered.body,
    status: 'delivered',
    dispatchedAt: new Date().toISOString(),
    language: langObj.code,
    languageName: langObj.name,
    isTranslated: isNonEnglish,
    originalSubject: rendered.subject,
    originalBody: rendered.body,
  };
}

/**
 * Asynchronously generates and translates the EmailLogEntry using GCP translation
 */
export async function generateAndTranslateEmailLogEntry(
  request: EmergencyRequest,
  triggerEventOrStatus: string,
  emailTemplates?: EmailTemplateConfig[],
  customNote?: string,
  overrideRecipientEmail?: string,
  overrideRecipientName?: string
): Promise<EmailLogEntry | null> {
  const baseLog = generateEmailLogEntry(
    request,
    triggerEventOrStatus,
    emailTemplates,
    customNote,
    overrideRecipientEmail,
    overrideRecipientName
  );

  if (!baseLog) return null;

  if (baseLog.language && baseLog.language.toLowerCase() !== 'en') {
    try {
      const transResult = await translateContent(
        baseLog.originalSubject || baseLog.subject,
        baseLog.originalBody || baseLog.body,
        baseLog.language,
        baseLog.languageName
      );
      if (transResult.success) {
        baseLog.subject = transResult.translatedSubject;
        baseLog.body = transResult.translatedBody;
        baseLog.isTranslated = true;
      }
    } catch (err) {
      console.warn('Error during translation in generateAndTranslateEmailLogEntry:', err);
    }
  }

  return baseLog;
}

/**
 * Generates and translates an SmsLogEntry for beneficiary SMS communications
 */
export async function generateAndTranslateSmsLogEntry(
  request: EmergencyRequest,
  triggerEventOrStatus: string,
  customNote?: string,
  overridePhone?: string,
  overrideRecipientName?: string
): Promise<import('../types').SmsLogEntry | null> {
  const triggerEvent = mapStatusToTriggerEvent(triggerEventOrStatus);
  const rawPhone = overridePhone || request.payoutDetails?.contactValue || '';
  const digits = rawPhone.replace(/\D/g, '');

  if (!digits || digits.length < 10) {
    return null;
  }

  const recipientName = overrideRecipientName || request.beneficiaryName || 'Beneficiary';
  const langCode = request.beneficiaryLanguage || request.payoutDetails?.beneficiaryLanguage || 'en';
  const langObj = getLanguageByCode(langCode);

  const amount = request.amount ? `$${request.amount.toLocaleString()}` : '';
  const schoolName = request.schoolName || 'Partner School';
  const payoutMethod = request.payoutDetails?.payoutMethodName || 'Direct Support';

  let rawText = '';
  switch (triggerEvent) {
    case 'status_change_to_waiting_on_beneficiary':
    case 'beneficiary_verification':
      rawText = `Small Moves PEF: Hello ${recipientName}, an emergency grant of ${amount} (ID: ${request.id}) has been approved via ${schoolName}. Please review & confirm your payment details here: ${generatePayoutVerificationLink(request.id)}`;
      break;
    case 'status_change_to_paid':
      rawText = `Small Moves PEF: Hello ${recipientName}, your emergency relief funds of ${amount} (ID: ${request.id}) have been disbursed via ${payoutMethod}. Thank you!`;
      break;
    default:
      if (customNote) {
        rawText = `Small Moves PEF (${request.id}): ${customNote}`;
      } else {
        rawText = `Small Moves PEF Update for ${recipientName} (ID: ${request.id}): Status updated to ${request.status.replace(/_/g, ' ')}.`;
      }
      break;
  }

  const isNonEnglish = langObj.code.toLowerCase() !== 'en';
  let finalText = rawText;
  let isTranslated = false;

  if (isNonEnglish) {
    try {
      const transResult = await translateContent('', rawText, langObj.code, langObj.name);
      if (transResult.success && transResult.translatedBody) {
        finalText = transResult.translatedBody.trim();
        isTranslated = true;
      }
    } catch (e) {
      console.warn('SMS translation error:', e);
    }
  }

  const cleanTo = digits.length === 10 ? `1${digits}` : digits;

  return {
    id: `sms-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    requestId: request.id,
    schoolId: request.schoolId,
    direction: 'outbound',
    to: cleanTo,
    from: '18887190317',
    recipientName,
    recipientRole: 'beneficiary',
    text: finalText,
    originalText: rawText,
    status: 'submitted',
    dispatchedAt: new Date().toISOString(),
    language: langObj.code,
    languageName: langObj.name,
    isTranslated,
    triggerEvent,
  };
}


