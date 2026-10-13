export type UserRole = 'principal' | 'additional_contact' | 'admin' | 'unassigned';
export type AdminRole = 'ops' | 'admin' | 'finance' | 'support';

export interface UserProfile {
  uid: string;
  email: string;
  firstName: string;
  lastName: string;
  displayName: string;
  phone: string;
  jobTitle?: string;
  role: UserRole;
  adminRole?: AdminRole;
  schoolIds: string[];
  mfaEnabled: boolean;
  mfaMethod?: 'totp' | 'sms';
  mfaSecretKey?: string;
  mfaRecoveryCodes?: string[];
  emailVerified: boolean;
  createdAt: string;
  photoURL?: string;
  authProvider?: 'google.com' | 'password';
  googleLinked?: boolean;
  statusSubscriptions?: SystemRequestStatus[];
}

export type SystemRequestStatus =
  | 'in_review'
  | 'waiting_on_principal'
  | 'waiting_on_beneficiary'
  | 'ready_to_pay'
  | 'changes_requested'
  | 'response_requested'
  | 'paid'
  | 'denied'
  | 'canceled';

export type TaskContext = 'payout_change' | 'request_change' | 'question_response' | null;

export interface RequestPayoutDetails {
  payeeType: 'beneficiary_direct' | 'third_party';
  thirdPartyPayeeName?: string;
  thirdPartyRelationship?: string;
  contactMethod: 'email' | 'text';
  contactValue: string;
  beneficiaryLanguage?: string; // ISO 639-1 GCP language code (e.g. 'en', 'es', 'ar', etc.)
  beneficiaryLanguageName?: string;
  fundUse?: string; // What will the funds be used for
  payoutMethodId: string;
  payoutMethodName: string;
  payoutData: Record<string, string>;
  submittedAt?: string;
  beneficiaryConfirmedAt?: string;
  beneficiaryConfirmedBy?: string;
  beneficiaryNotes?: string;
  paidAt?: string;
  paidBy?: string;
}

export interface EmailLogEntry {
  id: string;
  requestId: string;
  templateId?: string;
  templateName: string;
  triggerEvent: string;
  recipientEmail: string;
  recipientName: string;
  recipientRole: string;
  subject: string;
  body: string;
  status: 'dispatched' | 'delivered' | 'failed';
  dispatchedAt: string;
  language?: string;
  languageName?: string;
  isTranslated?: boolean;
  originalSubject?: string;
  originalBody?: string;
}

export interface SmsLogEntry {
  id: string;
  requestId?: string;
  schoolId?: string;
  schoolName?: string;
  direction: 'outbound' | 'inbound';
  to: string;
  from: string;
  recipientName?: string;
  recipientRole?: string;
  text: string;
  originalText?: string;
  status: 'delivered' | 'submitted' | 'queued' | 'failed' | 'received' | 'simulated';
  dispatchedAt: string;
  language?: string;
  languageName?: string;
  isTranslated?: boolean;
  templateId?: string;
  templateName?: string;
  triggerEvent?: string;
  messageUuid?: string;
  clientRef?: string;
  authMethod?: string;
  details?: string;
  error?: string;
}

export interface EmergencyRequest {
  id: string;
  schoolId: string;
  schoolName: string;
  submitterId: string;
  submitterName: string;
  submitterEmail: string;
  submitterRole: 'principal' | 'additional_contact';
  beneficiaryName: string;
  studentName?: string;
  beneficiaryLanguage?: string; // Preferred language code (e.g., 'en', 'es', 'zh', etc.)
  beneficiaryLanguageName?: string;
  amount: number;
  category: string;
  reason: string;
  additionalContext?: string;
  status: SystemRequestStatus;
  statusUpdatedAt?: string;
  previousStatus?: SystemRequestStatus;
  taskContext?: TaskContext;
  statusNote?: string;
  mouAcknowledged: boolean;
  payoutDetails?: RequestPayoutDetails;
  emailLogs?: EmailLogEntry[];
  smsLogs?: SmsLogEntry[];
  createdAt: string;
  updatedAt: string;
}

export interface ActivityEvent {
  id: string;
  requestId?: string;
  schoolId?: string;
  actorId: string;
  actorName: string;
  actorRole: string;
  eventType:
    | 'status_change'
    | 'payout_submitted'
    | 'payout_updated'
    | 'beneficiary_confirmed'
    | 'request_created'
    | 'request_edited'
    | 'note'
    | 'reminder_sent'
    | 'question'
    | 'response'
    | 'mou_signed'
    | 'budget_adjusted'
    | 'email_sent'
    | 'sms_sent'
    | 'sms_received'
    | 'sms_queued'
    | 'test_sms_dispatched'
    | 'contact_update'
    | 'principal_update'
    | 'user_invite_sent'
    | 'user_invite_claimed'
    | 'mfa_setup'
    | 'mfa_reset'
    | 'test_email_dispatched'
    | 'email_queued'
    | 'user_login';
  targetUserId?: string;
  targetUserEmail?: string;
  fromStatus?: SystemRequestStatus;
  toStatus?: SystemRequestStatus;
  message: string;
  isInternalNote?: boolean;
  timestamp: string;
}

export interface AdditionalContact {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role?: 'additional_contact';
  jobTitle?: string;
}

export interface RequestHistoryEntry {
  id: string;
  requestId: string;
  schoolId: string;
  timestamp: string;
  actor: {
    uid: string;
    email: string;
    displayName: string;
    role: string;
  };
  actionType: 'create' | 'field_update' | 'status_change' | 'payout_update';
  changes: Record<
    string,
    {
      before: any;
      after: any;
    }
  >;
  previousSnapshot?: EmergencyRequest;
  currentSnapshot?: EmergencyRequest;
}

export interface School {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  phone: string;
  studentCount: number;
  status: 'active' | 'invited' | 'pending' | 'inactive';
  funderId?: string;
  funderName?: string;
  annualBudget: number;
  budgetReserved: number;
  budgetPaid: number;
  budgetAvailable: number;
  principalId?: string;
  principalName?: string;
  principalEmail?: string;
  principalPhone?: string;
  additionalContacts: AdditionalContact[];
  currentMouSigned: boolean;
  currentMouSignedAt?: string;
  currentMouSignedBy?: string;
  currentMouSignedByTitle?: string;
  currentMouVersionId?: string;
  hasCustomMou?: boolean;
  customMouVersionId?: string;
  customMouContent?: string;
  customMouUpdatedAt?: string;
  customMouUpdatedBy?: string;
  customMouReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface MouSignatureRecord {
  id: string;
  principalId: string;
  principalName: string;
  principalTitle?: string;
  schoolId: string;
  schoolName: string;
  schoolYear: string;
  mouVersion: string;
  signedAt: string;
  ipAddress?: string;
}

export interface Funder {
  id: string;
  name: string;
  type: 'Foundation' | 'Government' | 'Corporate' | 'Nonprofit' | 'Individual' | 'Other';
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  notes?: string;
  associatedSchoolIds: string[];
  createdAt: string;
}

export interface BudgetTransaction {
  id: string;
  schoolId: string;
  type: 'annual_allocation' | 'manual_adjustment' | 'request_reservation' | 'request_paid' | 'request_released' | 'fiscal_year_reset';
  amount: number;
  requestId?: string;
  reason: string;
  actorName: string;
  timestamp: string;
}

export interface PayoutMethodConfig {
  id: string;
  name: string;
  active: boolean;
  description: string;
  fields: Array<{ key: string; label: string; placeholder: string; required: boolean }>;
}

export interface EmailTemplateConfig {
  id: string;
  name: string;
  triggerEvent: string;
  recipientRole: string;
  subject: string;
  body: string;
  enabled: boolean;
}

export interface FaqItem {
  id: string;
  q: string;
  a: string;
  category?: string;
}

export interface LogoStyleSettings {
  alignment?: 'left' | 'center' | 'right';
  height?: number; // height in px (e.g. 24 to 80)
  paddingY?: number; // padding top/bottom in px
  paddingX?: number; // padding left/right in px
  bgStyle?: 'transparent' | 'dark_badge' | 'light_badge' | 'glass';
  borderRadius?: 'none' | 'small' | 'medium' | 'large' | 'full';
}

export interface MouVersion {
  id: string;
  name: string; // e.g., "2024-2025 Standard MOU"
  content: string; // The markdown or HTML content
  createdAt: string;
  createdBy: string;
}

export interface EmailProviderConfig {
  enabled: boolean;
  provider: 'sendgrid' | 'firebase_trigger_email' | 'custom_smtp' | 'simulation';
  sendgridApiKey?: string;
  hasSendgridKey?: boolean; // Boolean indicator so non-admin UI knows key is configured without exposing secret
  fromEmail: string;
  fromName: string;
  replyToEmail?: string;
  mailCollection: string; // Defaults to 'mail' (Standard for Firebase Trigger Email Extension)
  sandboxMode?: boolean;
  pauseOutboundEmails?: boolean; // When enabled, outgoing emails only queue in Firestore and are not sent
  trackOpens?: boolean;
  trackClicks?: boolean;
  lastTestedAt?: string;
  lastTestStatus?: 'success' | 'failed' | 'idle';
  lastTestRecipient?: string;
  lastTestError?: string;
  lastTestMessageId?: string;
}

export interface PortalSecrets {
  sendgridApiKey?: string;
  updatedAt?: string;
  updatedBy?: string;
}

export interface FirebaseMailDocument {
  id?: string;
  to: string[] | string;
  cc?: string[] | string;
  bcc?: string[] | string;
  from?: string;
  replyTo?: string;
  message: {
    subject: string;
    text?: string;
    html?: string;
  };
  template?: {
    name?: string;
    data?: Record<string, any>;
  };
  sendgridOptions?: {
    sandboxMode?: boolean;
    categories?: string[];
    customArgs?: Record<string, string>;
  };
  metadata?: {
    triggerEvent?: string;
    requestId?: string;
    schoolId?: string;
    templateId?: string;
    dispatchedBy?: string;
    dispatchedAt?: string;
    isTest?: boolean;
  };
  delivery?: {
    state?: 'PENDING' | 'PROCESSING' | 'SUCCESS' | 'ERROR' | 'CANCELLED' | 'SIMULATED';
    method?: 'sendgrid_api' | 'simulation' | 'sandbox' | 'firebase_extension';
    statusCode?: number;
    startTime?: any;
    endTime?: any;
    error?: string;
    info?: {
      messageId?: string;
      sendgridMessageId?: string;
      accepted?: string[];
      rejected?: string[];
      response?: string;
      httpStatus?: number;
      timestamp?: string;
      sender?: string;
    };
  };
  createdAt?: any;
}

export interface BeneficiaryPayoutPageTemplate {
  headerTitle: string;
  headerSubtitle: string;
  instructions: string;
  confirmButtonText: string;
  correctButtonText: string;
  saveCorrectionButtonText?: string;
  successTitle: string;
  successMessage: string;
  changesRequestedTitle?: string;
  changesRequestedMessage?: string;
  footerNote: string;
}

export interface PortalSettings {
  currentSchoolYear?: string;
  currentMouVersionId?: string;
  mouVersions?: MouVersion[];
  customLogoUrl?: string;
  logoStyle?: LogoStyleSettings;
  requestReasons?: string[];
  fundUses?: string[];
  statusDisplayLabels: Record<SystemRequestStatus, { adminLabel: string; principalLabel: string }>;
  payoutMethods: PayoutMethodConfig[];
  emailTemplates: EmailTemplateConfig[];
  payoutPageTemplate?: BeneficiaryPayoutPageTemplate;
  emailProvider?: EmailProviderConfig;
  faqs?: FaqItem[];
  annualDefaultBudget: number;
  maxPerRequestAmount: number;
  businessCalendar: {
    timezone: string;
    businessHours: string;
    holidaysText: string;
    commitmentWording: string;
  };
  isProductionReady?: boolean;
}

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: AdminRole;
  jobTitle?: string;
  notificationPreference: 'all' | 'ready_to_pay' | 'none';
  createdAt: string;
}

export interface AppUser {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: UserRole; // 'admin' | 'principal' | 'additional_contact'
  schoolId?: string;
  schoolName?: string;
  jobTitle?: string;
  status: 'active' | 'invited' | 'inactive' | 'revoked' | 'pending';
  invitedAt?: string;
  invitedBy?: string;
  createdAt: string;
  lastLoginAt?: string;
  mfaEnabled?: boolean;
  mfaMethod?: 'totp' | 'sms';
  mfaSecretKey?: string;
  mfaRecoveryCodes?: string[];
  statusSubscriptions?: SystemRequestStatus[];
}

export interface PendingInvite {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  schoolId?: string;
  schoolName?: string;
  jobTitle?: string;
  invitedBy: string;
  invitedAt: string;
  expiresAt: string;
  status: 'pending' | 'accepted' | 'revoked';
  inviteCode?: string;
  notes?: string;
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}
