import {
  BeneficiaryPayoutPageTemplate,
  PortalSettings,
  School,
  EmergencyRequest,
  Funder,
  ActivityEvent,
  AdminUser,
  AppUser,
  PendingInvite,
  UserProfile,
} from '../types';

export const PARTICIPATION_AGREEMENT_MOU_CONTENT = `
# PRINCIPAL EMERGENCY FUND PARTICIPATION AGREEMENT

**1. General.** This Principal Emergency Fund Participation Agreement (as amended from time to time, the “Agreement”) sets forth the terms and conditions that apply to the participation of _______________________ (the “School”) in the Principal Emergency Fund program (the “PEF”) of **The Small Moves Foundation** (the “Foundation”). As principal of the School, continued participation is subject to your compliance with the terms and conditions set forth in this Agreement. The Foundation reserves the right to suspend or terminate your access to and participation in the PEF at any time and for any reason in its sole and absolute discretion. The Foundation may modify the terms of this Agreement or any of the guidelines governing the PEF at any time in its sole discretion. Your continued participation in the PEF indicates your full acceptance of this Agreement in its then-current form each time you submit a nomination or request to the PEF, and this Agreement will be renewed on an annual basis. This Agreement was last revised on August 31, 2024 and supersedes any previously accepted Agreement.

**2. Program Overview.** Through the PEF, the Foundation awards hardship grants to individuals who are financially needy or distressed as a result of sudden or overwhelming hardship situations beyond their control. These situations could include, but are not limited to, (i) unusual and uninsured losses caused by severe illness, violent crime, or serious accident, (ii) death in the immediate family, (iii) uninsured losses caused by fire, flood, earthquake, hurricane, tornado, violent crime, or any other natural or civil disaster, and (iv) unsupportable indebtedness occurring for reasons beyond their control, including through an individual being laid off from employment.

**3. Ineligible Recipients.** The following categories of individuals are ineligible recipients: (i) any trustee of, employee of, or substantial contributor to the Foundation, (ii) any member of the School’s leadership team that makes nominations to the PEF, (iii) any family member of any of the foregoing, or (iv) any person younger than 18 years of age.

**4. Ambassador Role; Nominations.** As principal of the School, you hereby agree to act as the Foundation’s ambassador with respect to the PEF at the School. You agree that you (or your designee) will nominate PEF recipients only after making a good faith determination that the nominated individual meets the PEF requirements, and specifically that they are experiencing financial need or distress due to sudden or overwhelming hardship. You further agree that all nominations will be made on an objective and nondiscriminatory basis without regard to race, religion, national origin, sexual orientation or gender. All nominations will be submitted via an application on the Foundation’s website.

**5. Selection.** You acknowledge that all final decisions regarding the selection of PEF recipients and the amounts of PEF grants are made by the Foundation in its sole discretion; you acknowledge that you have no authority to commit the Foundation to make a PEF grant to any individual or in any amount.

**6. Recipient Requirements.** Selected recipients must provide the Foundation with all necessary information to process the PEF grant, including but not limited to, legal name and address. Selected recipients will be required to certify their financial need in the face of hardship and that they will use the PEF grant in a manner consistent with the financial need described in your nomination. You agree to support the Foundation’s efforts to obtain this information.

**7. Confidentiality.** You agree and acknowledge that the source of funding for the PEF hardship grants is to remain confidential and that, except as required by law, you will not inform the recipients or any other person of the Foundation’s name or role in the PEF.

**8. Representations and Warranties.** To induce the Foundation to accept this Agreement and award PEF grants, you hereby represent and warrant to the Foundation as follows as of the date of the execution and delivery of this Agreement:

(a) You have the legal capacity and authority to execute, deliver, and perform your obligations under this Agreement. You also have the full power and authority to execute and deliver this Agreement on behalf of the School, and the School is authorized to execute, deliver, and perform its obligations under this Agreement.

(b) You acknowledge that you have reviewed this Agreement and confirm that you have carefully read and understand this Agreement. You acknowledge that you have had the opportunity to ask questions of, and receive answers from, the Foundation and persons acting on its behalf, concerning the terms and conditions of this Agreement, and all such questions have been answered to your full satisfaction.

**9. Termination.** Failure to comply with any term of this Agreement shall result in termination of the School’s participation in the PEF. The Foundation reserves the right to terminate this Agreement if, in its sole discretion, the Foundation determines that you or your designee has made any misrepresentations, has in any way misappropriated funds, or has failed to comply with the terms and conditions of this Agreement.

**10. Future Funding.** You acknowledge and agree that the Foundation has made no actual or implied promise of funding except in the amounts and under the terms and conditions stated herein.

**11. Entire Agreement; Amendment.** This Agreement constitutes the entire agreement among the parties with respect to the subject matter hereof and shall supersede and extinguish any prior drafts, agreements, undertakings, representations, warranties and arrangements of any nature whatsoever, whether or not in writing, between the parties in relation to the PEF. This Agreement may not be modified or amended unless such modification or amendment is effected by a written instrument expressly modifying or amending this Agreement or the rights of a party hereunder, which instrument is executed by an authorized representative of the School and of the Foundation.

**12. Governing Law; Miscellaneous.** The terms and conditions of this Agreement shall be governed by, and construed in accordance with, the laws of the State of Illinois, without giving effect to any choice or conflict of law provision or rule that would cause the application of the laws of any jurisdiction other than the State of Illinois. The confidentiality obligations under this Agreement shall be continuing and shall survive termination of any other agreement between you and the Foundation. If any provision in this Agreement is found to be unenforceable, such provision will be limited or deleted to the minimum extent necessary so that the remaining terms remain in full force and effect.
`.trim();

export const MIAMI_DADE_PARTICIPATION_AGREEMENT_MOU_CONTENT = `
# PRINCIPAL EMERGENCY FUND PARTICIPATION AGREEMENT

### The Small Moves Foundation & The School Board of Miami-Dade County, Florida

**1. General.** This Principal Emergency Fund Participation Agreement (“Agreement”) sets forth the terms and conditions agreed to between **The Small Moves Foundation** (the “Foundation”), whose principal place of business is 600 West Chicago Avenue, Suite 510, Chicago, IL 60654 and **The School Board of Miami-Dade County, Florida**, a body corporate and politic, existing under the laws of the State of Florida (the “School Board” or the “Board”), regarding the School Board’s participation in the Foundation’s Principal Emergency Fund program (the “PEF”). Continued participation is subject to the Board’s compliance with the terms and conditions set forth in this Agreement. The Foundation reserves the right to suspend or terminate the Board’s access to and participation in the PEF at any time and for any reason in the Foundation’s sole and absolute discretion. The Board’s continued participation in the PEF indicates its full acceptance of this Agreement in its current form, and this Agreement may be renewed on an annual basis.

**2. Program Overview.** Through the PEF, the Foundation awards hardship grants to individuals who are financially needy or distressed as a result of sudden or overwhelming hardship situations beyond their control. These situations could include, but are not limited to, (i) unusual and uninsured losses caused by severe illness, violent crime, or serious accident, (ii) death in the immediate family, (iii) uninsured losses caused by fire, flood, earthquake, hurricane, tornado, violent crime, or any other natural or civil disaster, and (iv) unsupportable indebtedness occurring for reasons beyond their control, including through an individual being laid off from employment.

**3. Ineligible Recipients.** The following categories of individuals are ineligible recipients: (i) any trustee of, employee of, or substantial contributor to the Foundation, (ii) any employee of the School Board, (iii) any family member of any of the foregoing, or (iv) any person younger than 18 years of age.

**4. Ambassador Role; Nominations.** School Board agrees that principals of the participating schools (listed in attachment “A”) are to act on the Board’s behalf as the Foundation’s ambassadors with respect to the PEF at the respective school sites. The Board will authorize each participating principal (or their designee) to nominate PEF recipients, after making a good faith determination that the individual meets the PEF requirements, and specifically that they are experiencing financial need or distress due to sudden or overwhelming hardship. The Board further agrees that it will require that all nominations be made on an objective and nondiscriminatory basis without regard to race, religion, national origin, sexual orientation or gender. All nominations will be submitted via an application on the Foundation’s website.

**5. Selection.** The Foundation, in its sole discretion, will make all final decisions regarding the selection of PEF recipients and the amounts of PEF grants. Neither the School Board nor their employees have the authority to commit the Foundation to make a PEF grant to any individual or in any amount.

**6. Recipient Requirements.** Selected recipients must provide the Foundation with all necessary information to process the PEF grant, including but not limited to, legal name and address. Selected recipients will be required to certify their financial need in the face of hardship and that they will use the PEF grant in a manner consistent with the financial need described in your nomination. The Board agrees that the participating principals will support the Foundation’s efforts to obtain this information.

**7. Confidentiality.** You agree and acknowledge that the source of funding for the PEF hardship grants is to remain confidential and that, except as required by law, you will not inform the recipients or any other person of the Foundation’s name or role in the PEF.

**8. Representations and Warranties.** To induce the Foundation to accept this Agreement and award PEF grants, you hereby represent and warrant to the Foundation as follows as of the date of the execution and delivery of this Agreement:

* **(a)** You have the legal capacity and authority to execute, deliver, and perform your obligations under this Agreement. You also have the full power and authority to execute and deliver this Agreement on behalf of the School Board and the participating schools, and the School Board is authorized to execute, deliver, and perform its obligations under this Agreement and to cause the participating schools to do the same.
* **(b)** You acknowledge that you have reviewed this Agreement and confirm that you have carefully read and understand this Agreement. You acknowledge that you have had the opportunity to ask questions of, and receive answers from, the Foundation and persons acting on its behalf, concerning the terms and conditions of this Agreement, and all such questions have been answered to your full satisfaction.

**9. Termination.** Either party reserves the right to terminate this Agreement if, in its sole discretion, any misrepresentations have been made, funds have been misappropriated, or the terms and conditions of this Agreement have been breached. Further, either party reserves the right to terminate this Agreement at any time and for any reason, upon giving thirty (30) days prior written notice.

**10. Future Funding.** School Board acknowledges and agrees that the Foundation has made no actual or implied promise of funding except in the amounts and under the terms and conditions stated herein.

**11. Entire Agreement; Amendment.** This Agreement constitutes the entire agreement among the parties with respect to the subject matter hereof and shall supersede and extinguish any prior drafts, agreements, undertakings, representations, warranties and arrangements of any nature whatsoever, whether or not in writing, between the parties in relation to the PEF. This Agreement may not be modified or amended unless such modification or amendment is affected by a written instrument expressly modifying or amending this Agreement or the rights of a party hereunder, which instrument is executed by an authorized representative of the School and of the Foundation.

**12. Governing Law; Miscellaneous.** The terms and conditions of this Agreement shall be governed by, and construed in accordance with, the laws of the State of Illinois. The confidentiality obligations under this Agreement shall be continuing and shall survive termination of any other agreement between you and the Foundation. If any provision in this Agreement is found to be unenforceable, such provision will be limited or deleted to the minimum extent necessary so that the remaining terms remain in full force and effect.

**Access to Records.** Foundation understands the broad nature of these laws and agrees to comply with Florida’s Public Records Laws and laws relating to records retention. The Foundation shall keep and maintain public records required by the School Board to perform the service. The Foundation shall keep records to show its compliance with program requirements. Foundations and subs must make available, upon request of the School Board, a Federal grantor agency, the Comptroller General of the United States, or any of their duly authorized representatives, any books, documents, papers, and records of the Foundation which are directly pertinent to this specific Agreement for the purpose of making audit, examination, excerpts, and transcriptions. Upon request from the School Board’s custodian of public records, provide the School Board with a copy of the requested records or allow the records to be inspected or copied within a reasonable time at a cost that does not exceed the cost provided in this chapter or as otherwise provided by law. Foundation shall ensure that public records that are exempt or confidential and exempt from public records disclosure requirements are not disclosed except as authorized by law for the duration of the contract term and following completion of the contract if the Foundation does not transfer the records to the public agency. The Foundation shall retain all records for five (5) years after final payment is made or received and all pending matters are completed pursuant to Title 34, Sections 80.36(b)(1). Upon completion of the contract, transfer, at no cost, to the School Board all public records in possession of the Foundation or keep and maintain public records required by the School Board to perform the service. If the Foundation transfers all public records to the School Board upon completion of the contract, the Foundation shall destroy any duplicate public records that are exempt or confidential and exempt from public records disclosure requirements. If the Foundation keeps and maintains public records upon completion of the contract, the Foundation shall meet all applicable requirements for retaining public records. All records stored electronically must be provided to the School Board, upon request from the School Board’s custodian of public records, in a format that is compatible with the information technology systems of the School Board.

> **IF THE FOUNDATION HAS QUESTIONS REGARDING THE APPLICATION OF CHAPTER 119, FLORIDA STATUTES, TO THE PROVIDER’S DUTY TO PROVIDE PUBLIC RECORDS RELATING TO THIS CONTRACT, CONTACT THE CUSTODIAN OF PUBLIC RECORDS AT 305-995-1128, prr@dadeschools.net, AND 1450 NE 2 AVENUE, MIAMI, FLORIDA 33132.**

**13. Indemnification, Hold Harmless and Duty to Defend.** Subject to the limitations of Florida Statute 768.28, the School Board agrees to indemnify and hold harmless the Foundation from and against any and all claims, suits, actions, damages, or causes of action arising out of the negligent acts of the School Board arising out of or in connection with the provisions of this agreement.

The Foundation agrees to indemnify, hold harmless and defend the School Board from and against any and all claims, suits, actions, damages, or causes of action arising out of the negligent acts of the Foundation arising out of or in connection with the provisions of this agreement.

---

### EXECUTION & SIGNATURE BLOCKS

#### SUBMITTED BY:
* **Charge Location Administrator Signature & Date:** \`___________________________________\`
* **Regional Superintendent / Division Head Signature & Date (as applicable):** \`___________________________________\`
* **Office of Grants Administration Signature & Date (if applicable):** \`___________________________________\`  
*(NOTE: Signature of Assistant Superintendent for the Office of Intergovernmental Affairs and Grants Administration required ONLY for contracts financed from Contracted Programs Funds (Part IV).)*

#### THE SCHOOL BOARD OF MIAMI-DADE COUNTY, FLORIDA:
* **BY (Superintendent of Schools or Designee):** \`___________________________________\`
* **Name Typed:** \`___________________________________\`
* **Date:** \`___________________________________\`

#### APPROVED AS TO RISK AND BENEFITS (as to the School Board):
* **Risk Management Signature & Date:** \`___________________________________\`

#### APPROVED AS TO PROCUREMENT AUTHORITY (as to the School Board):
* **Procurement Management Signature & Date:** \`___________________________________\`

#### APPROVED AS TO FORM AND LEGAL SUFFICIENCY (as to the School Board):
* **School Board Attorney Signature & Date:** \`___________________________________\`

#### THE SMALL MOVES FOUNDATION:
* **Legal Name of Contracting Party:** Small Moves Foundation
* **BY:** *Andrew Heinlein* (Signature)
* **Name / Title:** Andrew Heinlein, CFO
* **Date:** September 10, 2026
* **Address:** 600 West Chicago Avenue, Suite 510, Chicago, IL 60654
* **F.E.I.N. (If organization):** 46-3551508
* **School Board Employee:** No
* **M-DCPS Employee No.:** N/A
`.trim();

const seedMouContent = `
#### MEMORANDUM OF UNDERSTANDING (MOU)
**PRINCIPAL EMERGENCY FUND • ACADEMIC YEAR 2026–2027**

**1. PURPOSE & ALLOCATION:** The Funder grants an annual allocation to the School Principal for the sole purpose of resolving immediate, unexpected student emergency hardship (e.g., housing instability, utility cutoff, winter outerwear, medical supplies).

**2. DIRECT STUDENT BENEFIT MANDATE:** 100% of approved emergency grants must directly benefit the designated student/family or be paid directly to verified third-party vendors (utility providers, landlords, healthcare clinics). Funds shall never be used for school operating costs, staff stipends, or general supplies.

**3. MAXIMUM CAP & DISBURSEMENT:** Individual submissions are capped at $2,000 per request. All requests require principal verification. Approved payments are processed within 48 business hours via direct ACH or digital disbursement.

**4. DOCUMENTATION & AUDIT:** The Principal agrees to retain proof of expenditure/receipts for 30 calendar days and make them available for annual audit review upon request.
`;

export const DEFAULT_BENEFICIARY_PAGE_TEMPLATE: BeneficiaryPayoutPageTemplate = {
  headerTitle: 'Small Moves Emergency Relief Fund — Payment Confirmation',
  headerSubtitle: 'Please verify your payment details below so we can disburse your emergency assistance grant of ${{amount}} without delay.',
  instructions: 'An emergency assistance grant in the amount of ${{amount}} has been approved on your behalf through {{school_name}}. Please review the payment method and destination details below to confirm they are accurate. If any information needs correction, please click "Needs Edits" to send the request back to your school principal.',
  confirmButtonText: 'Confirm Payment Information is Correct',
  correctButtonText: 'Information Needs Edits? Contact Principal',
  saveCorrectionButtonText: 'Submit Request for Edits to Principal',
  successTitle: 'Thank You! Payment Details Verified',
  successMessage: 'Your disbursement details have been successfully confirmed. Our finance team has received your verification and is processing your emergency funds.',
  changesRequestedTitle: 'Changes Requested — Contact Your Principal',
  changesRequestedMessage: 'Your request for changes has been submitted and sent back to your school principal. Please contact your principal directly to provide your corrected payment information.',
  footerNote: 'If you have any questions or need assistance, please contact your school coordinator, principal, or Small Moves at support@smallmoves.org.',
};

export const INITIAL_SETTINGS: PortalSettings = {
  currentSchoolYear: '2026-2027',
  currentMouVersionId: 'mou-pef-agreement-2024',
  mouVersions: [
    {
      id: 'mou-pef-agreement-2024',
      name: 'Principal Emergency Fund Participation Agreement (Rev. August 31, 2024)',
      content: PARTICIPATION_AGREEMENT_MOU_CONTENT,
      createdAt: '2024-08-31T00:00:00Z',
      createdBy: 'admin',
    },
    {
      id: 'mou-v1-2026-2027',
      name: '2026-2027 Standard MOU (Short Form)',
      content: seedMouContent.trim(),
      createdAt: '2026-07-01T00:00:00Z',
      createdBy: 'admin',
    },
    {
      id: 'mou-miami-dade-participation-agreement-2026',
      name: '[Miami Dade] PEF Participation Agreement (M-DCPS School Board)',
      content: MIAMI_DADE_PARTICIPATION_AGREEMENT_MOU_CONTENT,
      createdAt: '2026-09-10T00:00:00Z',
      createdBy: 'admin',
    },
  ],
  customLogoUrl: '',
  logoStyle: {
    alignment: 'left',
    height: 44,
    paddingY: 16,
    paddingX: 16,
    bgStyle: 'transparent',
    borderRadius: 'medium',
  },
  requestReasons: [
    'Loss of Employment',
    'Housing Insecurity',
    'Death in Family',
    'Crime',
    'Severe illness or accident',
    'Fire, flood, or other natural disaster',
    'Other'
  ],
  fundUses: [
    'Groceries and other household items',
    'Rental payment',
    'Mortgage payment',
    'Utility bills and other household expenses',
    'Funeral expenses',
    'Recovery after a crime',
    'Recovery after an illness',
    'Recovery after an accident',
    'Other'
  ],
  statusDisplayLabels: {
    in_review: { adminLabel: 'In Review', principalLabel: 'In Review' },
    waiting_on_principal: { adminLabel: 'Waiting on Principal', principalLabel: 'Payout Details Needed' },
    waiting_on_beneficiary: { adminLabel: 'Waiting on Beneficiary', principalLabel: 'Beneficiary Confirmation' },
    ready_to_pay: { adminLabel: 'Ready to Pay', principalLabel: 'Ready for Payment' },
    changes_requested: { adminLabel: 'Changes Requested', principalLabel: 'Changes Requested' },
    response_requested: { adminLabel: 'Response Requested', principalLabel: 'Response Requested' },
    paid: { adminLabel: 'Paid', principalLabel: 'Paid' },
    denied: { adminLabel: 'Denied', principalLabel: 'Denied' },
    canceled: { adminLabel: 'Canceled', principalLabel: 'Canceled' },
  },
  payoutMethods: [
    {
      id: 'zelle',
      name: 'Zelle',
      active: true,
      description: 'Instant transfer via Zelle.',
      fields: [
        { key: 'handle', label: 'Zelle Email or Phone', placeholder: 'user@example.com or phone', required: true },
      ],
    },
    {
      id: 'venmo',
      name: 'Venmo',
      active: true,
      description: 'Instant transfer via Venmo.',
      fields: [
        { key: 'handle', label: 'Venmo Handle', placeholder: '@username', required: true },
      ],
    },
    {
      id: 'paypal',
      name: 'PayPal',
      active: true,
      description: 'Transfer via PayPal.',
      fields: [
        { key: 'email', label: 'PayPal email address', placeholder: 'user@example.com', required: true },
      ],
    },
    {
      id: 'check',
      name: 'Paper Check',
      active: true,
      description: 'Mailed physical check to beneficiary or third-party payee.',
      fields: [
        { key: 'mailingAddress', label: 'Mailing Address', placeholder: 'Street, City, State, ZIP', required: true },
        { key: 'memo', label: 'Check Memo / Reference (Optional)', placeholder: 'e.g. Utility Account # or Relief Memo', required: false },
      ],
    },
    {
      id: 'gift_card',
      name: 'Gift Card / Grocery Voucher',
      active: true,
      description: 'Digital or physical grocery or store gift card.',
      fields: [
        { key: 'deliveryDetails', label: 'Delivery Email / Address', placeholder: 'email@example.com', required: true },
      ],
    },
  ],
  emailTemplates: [
    {
      id: 'tpl-00',
      name: 'Request Submitted Confirmation',
      triggerEvent: 'request_submission',
      recipientRole: 'Principal & Submitter',
      subject: 'PEF Request Confirmation: {{request_id}} for {{beneficiary_name}}',
      body: 'Hello {{submitter_name}},\n\nThank you for submitting an emergency fund request ({{request_link}}) for {{beneficiary_name}} (Amount: ${{amount}}).\n\nOur team is reviewing your request according to standard business hours. You can view your request and track status updates directly in the Principal Emergency Fund Portal:\n\nView Request: {{request_link}}\n\nThank you,\nSmall Moves Team',
      enabled: true,
    },
    {
      id: 'tpl-01',
      name: 'Request Approved - Enter Payout Info',
      triggerEvent: 'status_change_to_waiting_on_principal',
      recipientRole: 'Principal & Submitter',
      subject: 'Action Needed: Enter Payout Details for {{beneficiary_name}} ({{request_id}})',
      body: 'Hello {{submitter_name}},\n\nYour emergency fund request ({{request_link}}) for {{beneficiary_name}} has been approved by Small Moves.\n\nPlease log in to the portal and enter the beneficiary payout details to proceed:\n\nEnter Payout Details: {{request_link}}\n\nThank you,\nSmall Moves Team',
      enabled: true,
    },
    {
      id: 'tpl-02',
      name: 'Changes Requested',
      triggerEvent: 'status_change_to_changes_requested',
      recipientRole: 'Principal & Submitter',
      subject: 'Changes Requested for PEF Request {{request_id}}',
      body: 'Hello {{submitter_name}},\n\nSmall Moves administrators have requested a change regarding your request ({{request_link}}):\n\nNote: {{status_note}}\n\nPlease log in to make the requested updates:\n\nUpdate Request: {{request_link}}\n\nThank you,\nSmall Moves Team',
      enabled: true,
    },
    {
      id: 'tpl-03',
      name: 'Beneficiary Verification Required',
      triggerEvent: 'status_change_to_waiting_on_beneficiary',
      recipientRole: 'Beneficiary / Contact',
      subject: 'Action Needed: Confirm Emergency Relief Payment Details for {{beneficiary_name}}',
      body: 'Hello {{beneficiary_name}},\n\nAn emergency assistance grant ({{verification_link}}) in the amount of ${{amount}} has been approved on your behalf through {{school_name}}.\n\nTo ensure your funds are disbursed without delay, please review and confirm your payment method on the Beneficiary Payout Confirmation Web Page:\n\nBeneficiary Payout Confirmation Web Page: {{verification_link}}\n\nIf any payment details need to be updated, please click "Needs Edits" on the page to send the request back to your school principal.\n\nThank you,\nSmall Moves Emergency Fund Operations',
      enabled: true,
    },
    {
      id: 'tpl-04',
      name: 'Ready for Payment (Finance Notification)',
      triggerEvent: 'status_change_to_ready_to_pay',
      recipientRole: 'Small Moves Finance Team',
      subject: 'Ready for Disbursement: Request {{request_id}} (${{amount}})',
      body: 'Finance Alert:\n\nRequest {{request_link}} for {{beneficiary_name}} (${{amount}}) at {{school_name}} has verified payout details and is queued for disbursement.\n\nPayment Method: {{payout_method_name}}\n\nOpen Request in Admin Portal:\n{{request_link}}\n\nPlease process payment in banking system and record payment confirmation.',
      enabled: true,
    },
    {
      id: 'tpl-05',
      name: 'Payment Dispatched / Request Fulfilled',
      triggerEvent: 'status_change_to_paid',
      recipientRole: 'Principal & Submitter',
      subject: 'Disbursement Completed: PEF Request {{request_id}} (${{amount}})',
      body: 'Hello {{submitter_name}},\n\nWe are pleased to inform you that emergency funds in the amount of ${{amount}} for {{beneficiary_name}} (Request: {{request_link}}) have been successfully disbursed via {{payout_method_name}}.\n\nView Request in Portal: {{request_link}}\n\nYour school budget balance has been updated in the portal.\n\nThank you for supporting your school community,\nSmall Moves Team',
      enabled: true,
    },
    {
      id: 'tpl-06',
      name: 'Request Denied / Unfulfilled Notice',
      triggerEvent: 'status_change_to_denied',
      recipientRole: 'Principal & Submitter',
      subject: 'Update on PEF Request {{request_id}} — Not Approved',
      body: 'Hello {{submitter_name}},\n\nRegarding emergency request ({{request_link}}) submitted for {{beneficiary_name}} (${{amount}}):\n\nAfter review, this request could not be approved for funding under current guidelines.\n\nReason for Denial:\n{{denial_reason}}\n\nView Request Details: {{request_link}}\n\nIf you have questions or additional context, please contact your Small Moves program liaison.\n\nSincerely,\nSmall Moves Review Board',
      enabled: true,
    },
    {
      id: 'tpl-07',
      name: 'Information / Response Requested',
      triggerEvent: 'status_change_to_response_requested',
      recipientRole: 'Principal & Submitter',
      subject: 'Clarification Requested for PEF Request {{request_id}}',
      body: 'Hello {{submitter_name}},\n\nOur review team requires a quick clarification regarding request ({{request_link}}) for {{beneficiary_name}}:\n\nQuestion/Note: {{status_note}}\n\nPlease reply in the portal at your earliest convenience:\n\nView & Respond to Request: {{request_link}}\n\nThank you,\nSmall Moves Team',
      enabled: true,
    },
    {
      id: 'tpl-08',
      name: 'Pending Payout Reminder',
      triggerEvent: 'reminder_scheduled',
      recipientRole: 'Principal & Submitter',
      subject: 'Reminder: Action Required for Request {{request_id}} (Payout Details Pending)',
      body: 'Hello {{submitter_name}},\n\nThis is a friendly reminder that payout details are still needed for approved request ({{request_link}}) for {{beneficiary_name}} (${{amount}}).\n\nPlease log in to enter payment details so we can dispatch support promptly:\n\nEnter Payout Details: {{request_link}}\n\nThank you,\nSmall Moves Team',
      enabled: true,
    },
    {
      id: 'tpl-09',
      name: 'Annual Budget Allocation Reset',
      triggerEvent: 'annual_budget_reset',
      recipientRole: 'School Principal & Contacts',
      subject: 'Annual Principal Emergency Fund Allocation Update - {{school_name}}',
      body: 'Hello {{submitter_name}},\n\nYour annual Principal Emergency Fund allocation for {{school_name}} has been configured/reset in the portal.\n\nAnnual Allocation: ${{amount}}\n\nYou may submit emergency requests anytime during the school year via the portal.\n\nWarm regards,\nSmall Moves Team',
      enabled: true,
    },
    {
      id: 'tpl-10',
      name: 'Principal Invitation & School Onboarding',
      triggerEvent: 'principal_invitation',
      recipientRole: 'School Principal',
      subject: 'Principal Portal Invitation — {{school_name}}',
      body: 'Dear {{recipient_name}},\n\nYou have been invited as the Principal for {{school_name}} on the Principal Emergency Fund (PEF) portal.\n\nYour school has been assigned an annual emergency relief grant allocation of ${{amount}} for the school year.\n\nTo complete school onboarding, set your password, and configure Multi-Factor Authentication (MFA), please use the direct link below:\n\nDirect Setup Link: {{invite_link}}\n\n{{custom_note}}\n\nWarm regards,\nSmall Moves Administration',
      enabled: true,
    },
    {
      id: 'tpl-11',
      name: 'Authorized Contact / Staff Invitation',
      triggerEvent: 'contact_invitation',
      recipientRole: 'Authorized Contact / Staff',
      subject: 'Authorized Contact Portal Invitation — {{school_name}}',
      body: 'Dear {{recipient_name}},\n\nYou have been invited as an Authorized Contact for {{school_name}} on the Principal Emergency Fund (PEF) portal.\n\nAs an authorized staff contact, you will be able to initiate emergency funding requests and assist students and families at {{school_name}}.\n\nTo complete your account creation, set your password, and configure Multi-Factor Authentication (MFA), please use the direct link below:\n\nDirect Setup Link: {{invite_link}}\n\n{{custom_note}}\n\nWarm regards,\nSmall Moves Administration',
      enabled: true,
    },
    {
      id: 'tpl-12',
      name: 'Program Administrator Invitation',
      triggerEvent: 'admin_invitation',
      recipientRole: 'Program Administrator',
      subject: 'Small Moves Program Administrator Access Invitation',
      body: 'Dear {{recipient_name}},\n\nYou have been invited to join the Small Moves Principal Emergency Fund (PEF) management team as a Program Administrator.\n\nAs a program administrator, you will oversee school annual allocations, review emergency funding requests, manage disbursements, and configure system settings.\n\nTo complete your account creation, set your password, and configure Multi-Factor Authentication (MFA), please use the direct link below:\n\nDirect Setup Link: {{invite_link}}\n\n{{custom_note}}\n\nWarm regards,\nSmall Moves Leadership',
      enabled: true,
    },
    {
      id: 'tpl-13',
      name: 'Admin Request Review Alert',
      triggerEvent: 'admin_review_alert',
      recipientRole: 'Program Administrator / Review Team',
      subject: 'PEF Review Alert: Request {{request_id}} ({{school_name}} - ${{amount}})',
      body: 'Admin Notification:\n\nEmergency fund request ({{request_link}}) for {{beneficiary_name}} (${{amount}}) at {{school_name}} requires administrative review or action.\n\nStatus Note: {{status_note}}\n\nOpen Request in Admin Portal:\n{{request_link}}\n\nSmall Moves Emergency Fund Management',
      enabled: true,
    },
    {
      id: 'tpl-admin-status-subscription',
      name: 'Admin Request Status Notification',
      triggerEvent: 'admin_status_subscription',
      recipientRole: 'Subscribed Administrator',
      subject: '[PEF Alert] {{school_name}}: {{request_id}} moved to {{status_label}}',
      body: 'Hello {{recipient_name}},\n\nAn action has been taken on emergency relief request {{request_id}} for {{school_name}}.\n\nStatus: {{status_label}}\nAction Taken: {{action_taken}}\nUpdated By: {{actor_name}}\nStudent / Beneficiary: {{student_name}} (Beneficiary: {{beneficiary_name}})\nRequested Amount: ${{amount}}\n{{status_note}}\n\nView Request in Admin Portal:\n{{admin_request_link}}\n\nThank you,\nSmall Moves Emergency Fund Operations',
      enabled: true,
    },
  ],
  faqs: [
    {
      id: 'faq-1',
      q: 'Who is eligible to receive emergency funds from the PEF?',
      a: 'Students enrolled at active PEF partner schools and their immediate household family members experiencing acute, unexpected financial crises (such as housing eviction notices, utility shutoffs, medical emergencies, or disaster displacement).',
    },
    {
      id: 'faq-2',
      q: 'What is the maximum dollar limit per emergency request?',
      a: 'The standard maximum cap per request is $2,000. Requests cannot exceed either $2,000 or the school’s current available budget balance.',
    },
    {
      id: 'faq-3',
      q: 'What is the difference between a Principal and an Additional Contact?',
      a: 'Principals have full governance authority for their assigned school, including executing the annual Memorandum of Understanding (MOU), editing school metadata, managing additional contacts, and submitting requests. Additional Contacts can submit requests and manage requests they initiated.',
    },
    {
      id: 'faq-4',
      q: 'How quickly are emergency funds disbursed after approval?',
      a: 'Digital transfers (Direct Deposit and Zelle) are typically processed within 48 business hours after beneficiary confirmation. Mailed paper checks are dispatched within 5 business days.',
    },
    {
      id: 'faq-5',
      q: 'What happens if administrators request a change or ask a question?',
      a: 'The request status will update to "Changes Requested" or "Response Requested". You will see an Action Needed banner on your dashboard where you can complete the updates or reply to the question.',
    },
    {
      id: 'faq-6',
      q: 'Is an executed MOU required before submitting requests?',
      a: 'Yes. Principals must sign the annual MOU agreement for the active academic year to unlock request submissions.',
    },
  ],
  annualDefaultBudget: 10000,
  maxPerRequestAmount: 2000,
  payoutPageTemplate: DEFAULT_BENEFICIARY_PAGE_TEMPLATE,
  emailProvider: {
    enabled: true,
    provider: 'sendgrid',
    sendgridApiKey: '',
    fromEmail: 'support@smallmoves.org',
    fromName: 'Small Moves Principal Emergency Fund',
    replyToEmail: 'support@smallmoves.org',
    mailCollection: 'mail',
    sandboxMode: false,
    pauseOutboundEmails: false,
    trackOpens: true,
    trackClicks: true,
    lastTestedAt: undefined,
    lastTestStatus: 'idle',
  },
  businessCalendar: {
    timezone: 'America/Chicago',
    businessHours: 'Monday–Friday, 9:00 a.m.–5:00 p.m. CST',
    holidaysText: 'Excludes federal and organization-observed holidays.',
    commitmentWording:
      'Standard request review completed within 48 business hours. Digital payout within 48 business hours after confirmation; checks within 5 business days.',
  },
};

// All mock collections are explicitly empty — no mock data features
export const INITIAL_SCHOOLS: School[] = [];
export const INITIAL_REQUESTS: EmergencyRequest[] = [];
export const INITIAL_FUNDERS: Funder[] = [];
export const INITIAL_ACTIVITY_LOGS: ActivityEvent[] = [];
export const INITIAL_ADMIN_USERS: AdminUser[] = [];
export const INITIAL_MANAGED_USERS: AppUser[] = [];
export const INITIAL_PENDING_INVITES: PendingInvite[] = [];
export const DEMO_PROFILES: Record<string, UserProfile> = {};
