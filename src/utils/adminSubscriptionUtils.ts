import {
  EmergencyRequest,
  SystemRequestStatus,
  PortalSettings,
  AppUser,
} from '../types';
import { INITIAL_SETTINGS } from '../data/defaultSettings';
import { renderEmailTemplate, EmailRenderContext } from './emailUtils';
import { dispatchEmail } from '../services/emailService';
import { formatStatusLabel } from './statusUtils';

export interface NotifySubscribedAdminsOptions {
  request: EmergencyRequest;
  actionStatus: SystemRequestStatus;
  actionTaken: string;
  actorName?: string;
  actorEmail?: string;
  customNote?: string;
  settings: PortalSettings;
  users: AppUser[];
  currentOrigin?: string;
}

/**
 * Dispatches targeted notification emails to administrators who subscribed to notifications
 * for the given workflow status.
 */
export async function notifySubscribedAdmins(
  options: NotifySubscribedAdminsOptions
): Promise<number> {
  const {
    request,
    actionStatus,
    actionTaken,
    actorName = 'System',
    actorEmail,
    customNote,
    settings,
    users,
    currentOrigin,
  } = options;

  if (!users || users.length === 0) return 0;

  // 1. Identify all active admins subscribed to this specific action status
  const subscribedAdmins = users.filter((u) => {
    if (u.role !== 'admin') return false;
    if (u.status !== 'active') return false;
    if (!u.email || !u.email.includes('@')) return false;
    if (!Array.isArray(u.statusSubscriptions)) return false;
    return u.statusSubscriptions.includes(actionStatus);
  });

  if (subscribedAdmins.length === 0) return 0;

  // 2. Resolve email template
  const templates = settings?.emailTemplates?.length
    ? settings.emailTemplates
    : INITIAL_SETTINGS.emailTemplates;

  const template =
    templates.find(
      (t) =>
        t.id === 'tpl-admin-status-subscription' ||
        t.triggerEvent === 'admin_status_subscription'
    ) || {
      id: 'tpl-admin-status-subscription',
      name: 'Admin Request Status Notification',
      triggerEvent: 'admin_status_subscription',
      recipientRole: 'Subscribed Administrator',
      subject: '[PEF Alert] {{school_name}}: {{request_id}} moved to {{status_label}}',
      body: 'Hello {{recipient_name}},\n\nAn action has been taken on emergency relief request {{request_id}} for {{school_name}}.\n\nStatus: {{status_label}}\nAction Taken: {{action_taken}}\nUpdated By: {{actor_name}}\nStudent / Beneficiary: {{student_name}} (Beneficiary: {{beneficiary_name}})\nRequested Amount: ${{amount}}\n{{status_note}}\n\nView Request in Admin Portal:\n{{admin_request_link}}\n\nThank you,\nSmall Moves Emergency Fund Operations',
      enabled: true,
    };

  if (template.enabled === false) {
    return 0;
  }

  const baseOrigin =
    currentOrigin ||
    (typeof window !== 'undefined' && window.location.origin
      ? window.location.origin
      : 'https://smallmoves.org');

  const adminRequestLink = `${baseOrigin}/admin/requests/${request.id}`;
  const schoolRequestLink = `${baseOrigin}/requests/${request.id}`;
  const statusLabel = formatStatusLabel(actionStatus, settings?.statusDisplayLabels);

  let sentCount = 0;

  // 3. Dispatch alert to each subscribed admin
  for (const admin of subscribedAdmins) {
    try {
      const recipientName = admin.name?.trim() || 'Administrator';
      const context: EmailRenderContext = {
        request_id: request.id,
        request_link: adminRequestLink,
        request_url: adminRequestLink,
        link: adminRequestLink,
        open_request_link: adminRequestLink,
        admin_request_link: adminRequestLink,
        school_request_link: schoolRequestLink,
        school_name: request.schoolName,
        student_name: request.studentName || 'N/A',
        beneficiary_name: request.beneficiaryName,
        amount: request.amount ? request.amount.toLocaleString() : '0',
        category: request.category || '',
        status_label: statusLabel,
        action_taken: actionTaken,
        actor_name: actorName,
        status_note: customNote
          ? `Note: ${customNote}`
          : request.statusNote
          ? `Note: ${request.statusNote}`
          : '',
        custom_note: customNote || request.statusNote || '',
        recipient_name: recipientName,
        recipient_email: admin.email,
        payout_method_name:
          request.payoutDetails?.payoutMethodName || 'Not specified yet',
      };

      const rendered = renderEmailTemplate(
        { subject: template.subject, body: template.body },
        context
      );

      await dispatchEmail(
        {
          to: admin.email,
          recipientName,
          recipientRole: 'Subscribed Administrator',
          subject: rendered.subject,
          body: rendered.body,
          templateId: template.id,
          triggerEvent: 'admin_status_subscription',
          requestId: request.id,
          schoolId: request.schoolId,
          schoolName: request.schoolName,
        },
        settings,
        actorEmail
      );

      sentCount++;
    } catch (err) {
      console.warn(
        `Failed to dispatch status subscription email to ${admin.email}:`,
        err
      );
    }
  }

  return sentCount;
}
