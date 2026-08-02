# PEF Portal — Email Templates & Help Center Content

## Small Moves · Principal Emergency Fund

## Template Configuration Requirements

Authorized admins manage versioned email templates in `/admin/settings`. Each
notifiable system transition selects an enabled template and recipient rule for
the originating request submitter, Principal audience, admin audience, or an
approved combination. Additional Contact request notifications resolve to the
originating contact; they never grant access to another submitter's request. The system renders only
allow-listed variables, queues delivery, retries transient failures, deduplicates
by transition event and recipient, and records the template version and delivery
outcome.

Admins may edit subject/body, audience enablement, and approved variable
placement; preview with safe sample data; and send a test message. They may not
change immutable system transition names, recipient identities, required audit
fields, or authorization through template text. Admin-entered notes are
sanitized. Published changes apply prospectively and do not rewrite historical
messages. The delivery provider is selected in an implementation ADR.

The content below is the initial template and help-center version. Status labels
shown to admins and principals come from Portal Settings, while template mapping
continues to use immutable system transition names.

## Principal Invited → Pending Setup

Triggered by: Admin clicking "Invite principal" (from Schools list or School detail)

**To: Principal**

Subject: You've been invited to the Small Moves PEF Portal — \[School Name\]

Hi \[Principal Name\],

You've been invited to set up your account on the Small Moves Principal Emergency Fund (PEF) portal for \[School Name\].

What happens next: Once you accept the invite, you'll set up your account and then you’ll be able to log in and start submitting and tracking emergency fund requests for your school.

Note: This invite link will expire in 24 hours.

Accept invite:  
https://pef.smallmoves.org/register/  
—  
The Small Moves Team  
pef@smallmoves.org

## Additional Contact Invited → Pending Setup

Triggered by: Principal or authorized administrator adding an Additional Contact

**To: Additional Contact**

Subject: You've been invited to help manage PEF requests — \[School Name\]

Hi \[Contact Name\],

You've been invited as an Additional Contact for \[School Name\] in the Small
Moves Principal Emergency Fund portal.

After accepting the invitation, you can submit and manage requests that you
initiate for the school, including permitted payout updates. You will not be
able to view another person's requests, change school details, manage contacts
or roles, or sign the school's annual MOU.

Note: This invite link will expire in 24 hours.

Accept invite:  
https://pef.smallmoves.org/register/  
—  
The Small Moves Team  
pef@smallmoves.org

## Request Submitted → In Review

Triggered by: Principal or Additional Contact submitting a new request

**To: Request submitter**  
Subject: Request submitted for review — \[Request ID\]

Hi \[Requester Name\],

Your request for \[Beneficiary\] (\[Amount\]) has been submitted to the Small Moves team.

What happens next: An admin will review your request within 48 business hours. You'll receive an email as soon as the status changes.

Note: Organization-observed holidays are excluded from the configured business calendar and may extend the review timeline.

View your request:  
https://pef.smallmoves.org/requests/\[Request ID\]

—  
The Small Moves Team  
pef@smallmoves.org

**To: pef@smallmoves.org**  
Subject: New request submitted — \[Request ID\] · \[School Name\]

A new emergency fund request has been submitted and is ready for review.

Request ID:   \[Request ID\]  
School:       \[School Name\]  
Submitted by: \[Requester Name\]  
Beneficiary:  \[Beneficiary\]  
Amount:       \[Amount\]

Review this request:  
https://pef.smallmoves.org/admin/requests/\[Request ID\]

—  
Small Moves PEF System

## Requester Edited Request → Returned to In Review

Triggered by: authorized request submitter editing a previously approved request (resets status)

**To: Request submitter**  
Subject: Your request has been updated — \[Request ID\]

Hi \[Requester Name\],

We have received the notes or edits you made on this request. We will review and you'll hear back in 48 business hours.

View your request:  
https://pef.smallmoves.org/requests/\[Request ID\]

—  
The Small Moves Team  
pef@smallmoves.org

**To: pef@smallmoves.org**  
Subject: Request resubmitted for review — \[Request ID\] · \[School Name\]

\[Requester Name\] updated and resubmitted request \[Request ID\] (\[Beneficiary\], \[Amount\]). The previous approval has been reset — this request needs re-review.

Review this request:  
https://pef.smallmoves.org/admin/requests/\[Request ID\]

—  
Small Moves PEF System

## Admin Approved → Waiting on Principal

Triggered by: Admin clicking Approve

**To: Request submitter**  
Subject: Action needed: Enter payout details — \[Request ID\]

Hi \[Requester Name\],

Great news — your request for \[Beneficiary\] (\[Amount\]) has been approved by the Small Moves team.

To move forward, please meet with the beneficiary to confirm how they would like to receive these funds. Once confirmed, please enter the payout information promptly so we can process the payment.

Enter payout details:  
https://pef.smallmoves.org/requests/\[Request ID\]/payout

Need help? Visit our Help page or email pef@smallmoves.org.

—  
The Small Moves Team  
pef@smallmoves.org

**To: pef@smallmoves.org**  
Subject: Request approved — \[Request ID\] · \[School Name\]

Request \[Request ID\] has been approved and is now waiting on payout details from the requester.

Request ID:   \[Request ID\]  
School:       \[School Name\]  
Requester:    \[Requester Name\]  
Beneficiary:  \[Beneficiary\]  
Amount:       \[Amount\]

View request:  
https://pef.smallmoves.org/admin/requests/\[Request ID\]

—  
Small Moves PEF System

## Admin Requested Changes → Changes Requested

Triggered by: Admin clicking Request Changes (with optional notes)

**To: Request submitter**  
Subject: Changes requested on your request — \[Request ID\]

Hi \[Requester Name\],

The Small Moves team has reviewed request \[Request ID\] for \[Beneficiary\] (\[Amount\]) and is requesting changes before it can be approved.

What needs to be updated:  
"\[Admin's note — included verbatim\]"

Please log in to make the requested changes and resubmit. Once updated, your request will go back to admin review.

Update your request:  
https://pef.smallmoves.org/requests/\[Request ID\]

Questions? Reply to this email or contact pef@smallmoves.org.

—  
The Small Moves Team  
pef@smallmoves.org

**To: pef@smallmoves.org**  
Subject: Changes requested — \[Request ID\] · \[School Name\]

Changes were requested on request \[Request ID\] (\[Beneficiary\], \[Amount\], \[School Name\]).

Note sent to requester: "\[Admin's note\]"

The request is now waiting on \[Requester Name\] to make updates. You'll be notified when it's resubmitted.

View request:  
https://pef.smallmoves.org/admin/requests/\[Request ID\]

—  
Small Moves PEF System

## Admin Requested Info → Response Requested

Triggered by: Admin requesting info (with optional notes)

**To: Request submitter**  
Subject: Action needed: Please respond to your request — \[Request ID\]

Hi \[Requester Name\],

We have a question regarding your request \[Request ID\] for \[Beneficiary\] (\[Amount\]).

Question:  
"\[Admin's note — included verbatim\]"

Please provide the information requested so we can move forward with your request.

Respond to request:  
https://pef.smallmoves.org/requests/\[Request ID\]

Questions? Reply to this email or contact pef@smallmoves.org.

—  
The Small Moves Team  
pef@smallmoves.org

**To: pef@smallmoves.org**  
Subject: Response requested — \[Request ID\] · \[School Name\]

We have requested additional information for request \[Request ID\] (\[Beneficiary\], \[Amount\], \[School Name\]).

Note sent to requester: "\[Admin's note\]"

The request is now waiting on \[Requester Name\] to respond. You'll be notified when they provide the information.

View request:  
https://pef.smallmoves.org/admin/requests/\[Request ID\]

—  
Small Moves PEF System

## Admin Denied → Denied

Triggered by: Admin clicking Deny

**To: Request submitter**  
Subject: Request not approved — \[Request ID\]

Hi \[Requester Name\],

After review, request \[Request ID\] for \[Beneficiary\] (\[Amount\]) has not been approved.

Reason: "\[Admin's note, if provided\]"

If you believe this decision was made in error or have questions, please contact us at pef@smallmoves.org.

—  
The Small Moves Team  
pef@smallmoves.org

**To: pef@smallmoves.org**  
Subject: Request denied — \[Request ID\] · \[School Name\]

Request \[Request ID\] has been denied.

Request ID:   \[Request ID\]  
School:       \[School Name\]  
Beneficiary:  \[Beneficiary\]  
Amount:       \[Amount\]  
Reason:       "\[Admin's note, if provided\]"

View request:  
https://pef.smallmoves.org/admin/requests/\[Request ID\]

—  
Small Moves PEF System

## Requester Canceled → Canceled

Triggered by: Principal or originating Additional Contact clicking Cancel Request

**To: Request submitter**  
Subject: Your request has been canceled — \[Request ID\]

Hi \[Requester Name\],

Request \[Request ID\] for \[Beneficiary\] (\[Amount\]) has been canceled as requested.

If this was a mistake or you'd like to submit a new request, please contact pef@smallmoves.org.

—  
The Small Moves Team  
pef@smallmoves.org

**To: pef@smallmoves.org**  
Subject: Request canceled — \[Request ID\] · \[School Name\]

A request has been canceled by an authorized school-side submitter.

Request ID:   \[Request ID\]  
School:       \[School Name\]  
Canceled by:  \[Requester Name\]  
Beneficiary:  \[Beneficiary\]  
Amount:       \[Amount\]

View request:  
https://pef.smallmoves.org/admin/requests/\[Request ID\]

—  
Small Moves PEF System

## Payout Info Submitted → Waiting on Beneficiary

Triggered by: Principal or originating Additional Contact submitting the Enter Payout Details form

**To: Request submitter**  
Subject: Payout information received — \[Request ID\]

Hi \[Requester Name\],

We've received the payout information for request \[Request ID\] (\[Beneficiary\], \[Amount\]).

What happens next: A Small Moves administrator will validate the details and contact \[Beneficiary\] outside the portal. After the administrator records beneficiary confirmation, the request will move to "Ready to Pay".

You'll receive an email when the status changes.

View request status:  
https://pef.smallmoves.org/requests/\[Request ID\]

—  
The Small Moves Team  
pef@smallmoves.org

**To: pef@smallmoves.org**  
Subject: Request is Ready for Payout— \[Request ID\] · \[School Name\]

Payout information has been submitted and is ready for admin validation and beneficiary contact.

Request ID:   \[Request ID\]  
School:       \[School Name\]  
Submitted by: \[Requester Name\]  
Beneficiary:  \[Beneficiary\]  
Amount:       \[Amount\]  
Status:       Waiting on beneficiary

View request:  
https://pef.smallmoves.org/admin/requests/\[Request ID\]

—  
Small Moves PEF System

## Admin Recorded Beneficiary Confirmation → Ready to Pay

Triggered by: Admin validating payout details, contacting the beneficiary outside
the portal, and clicking Record Beneficiary Confirmation

**To: Request submitter**  
Subject: Beneficiary confirmation recorded — \[Request ID\]

Hi \[Requester Name\],

A Small Moves administrator has recorded beneficiary confirmation for request
\[Request ID\] (\[Beneficiary\], \[Amount\]). The request is now ready for
manual payment processing by Small Moves.

You'll receive another email after an administrator records the payment as
completed.

View request status:  
https://pef.smallmoves.org/requests/\[Request ID\]

—  
The Small Moves Team  
pef@smallmoves.org

**To: pef@smallmoves.org**  
Subject: Ready for manual payment — \[Request ID\] · \[School Name\]

\[Admin Name\] recorded beneficiary confirmation for request \[Request ID\].
Complete the payment outside the portal, then use Mark as Paid to record it.

Request ID:    \[Request ID\]  
School:        \[School Name\]  
Beneficiary:   \[Beneficiary\]  
Amount:        \[Amount\]  
Payout method: \[Payout Method Label\]

View request:  
https://pef.smallmoves.org/admin/requests/\[Request ID\]

—  
Small Moves PEF System

## Admin Marked as Paid → Paid

Triggered by: Admin clicking Mark as Paid

**To: Request submitter**  
Subject: Payment sent — \[Request ID\]

Hi \[Requester Name\],

A Small Moves administrator recorded payment for request \[Request ID\] (\[Beneficiary\], \[Amount\]) as completed outside the portal.

This request is now complete and the amount has been converted from a budget reservation to recorded spend.

View completed request:  
https://pef.smallmoves.org/requests/\[Request ID\]

—  
The Small Moves Team  
pef@smallmoves.org

**To: pef@smallmoves.org**  
Subject: Request completed — \[Request ID\] · \[School Name\]

Request \[Request ID\] has been marked as paid and is now closed.

Request ID:   \[Request ID\]  
School:       \[School Name\]  
Beneficiary:  \[Beneficiary\]  
Amount:       \[Amount\]

View request:  
https://pef.smallmoves.org/admin/requests/\[Request ID\]

—  
Small Moves PEF System

# Help Center Content

## How It Works

### Submitting a request

1\. Click "+ New Request" from the Dashboard or Requests page.  
2\. Enter the beneficiary name (the person receiving the funds. If the student is 18 or older, they can be the beneficiary. If the student is under 18, the beneficiary must be their parent, legal guardian, or caregiver).  
3\. Fill in the amount, reason, and fund usage category.  
4\. Check the MOU compliance box and click "Submit for review."  
5\. You'll get a confirmation — Small Moves will review within 48 business hours.

### Entering payout information

1. When approved, a banner appears on your Dashboard — click "Open" to act on it.  
2. Meet with the family to let them know the funds are coming and find out how they want to receive the funds.  
3. On the Enter Payout Details page, select who receives the funds: the beneficiary directly, or a third-party payee (landlord, utility company, family member accepting funds on their behalf).  
4. If using a third-party payee, enter the payee name and their relationship to the beneficiary (e.g. a gas company to pay a bill).  
5. Select a delivery method (Email or Text) and enter the contact info to reach the payee.  
6. Choose one of the payout methods currently enabled by Small Moves in Portal Settings.  
7. Click Submit — a Small Moves administrator will validate the details, contact the beneficiary outside the portal, and record confirmation.

### The request process

Submit Request — You submit the request — this step is complete the moment you hit submit.  
Admin Review — The Small Moves team reviews your request for approval. Typically within 48 business hours. We will come back to you if we have any questions about the request before approving  
Meet with Beneficiary — meet with the beneficiary to let them find out how they want the funds to be received and inform them they will be contacted by Small Moves  
Payout Details —  Following approval, you must meet with the beneficiary to determine their preferred method for receiving funds and let them know that Small Moves will contact them. Afterward, submit the beneficiary payout details to allow the request to proceed.  
Beneficiary Confirmation — A Small Moves administrator validates the payout details, contacts the beneficiary outside the portal, and records confirmation.  
Payment — An administrator records that payment was completed outside the portal. The request is complete.

### Other request states

Changes Requested — The authorized requester must update the payout details.  
Response Requested — The Small Moves team may request additional details to clarify a certain part of the request before proceeding.  
Denied — An administrator did not approve the request.  
Canceled — An authorized school-side submitter withdrew the request; Canceled is separate from Denied.

### Editing, cancelling & resending

1\. Open an active request you are authorized to manage from the Dashboard or Requests list. Principals can manage school requests; Additional Contacts can manage only requests they initiated.  
2\. Click the "Actions" button in the top right.  
3\. Choose "Edit request" to update beneficiary, amount, reason, or category. **Note**: These changes can only be made before the request is approved. You can edit payment information only during an allowed payout stage.  
4\. Choose "Cancel request" to withdraw an open request you are authorized to manage — this creates the Canceled terminal state and cannot be undone.  
5\. All edits and actions are timestamped and logged in the Activity section.

## Frequently Asked Questions

### Q: Who is eligible to receive funds through the PEF?

The Principal Emergency Fund supports members of your school community who are experiencing a financial crisis. Funds are intended for genuine emergencies that cannot be addressed through other available resources. Beneficiaries can be anyone in your school community over the age of 18 and can not be a member of the schools leadership team, PEF team or a relative of the principal or school leadership team. 

### Q: Who is the “beneficiary” on a request?

The beneficiary is the person receiving the funds. If the student is 18 or older, they can be the beneficiary. If the student is under 18, the beneficiary must be their parent, legal guardian, or caregiver.

### Q: What can an Additional Contact do?

An Additional Contact is designated school staff who can create an account from
an email invitation, submit requests for the school, and manage or update payout
information for requests they initiated. They cannot view or manage another
person's requests, change school details, manage contacts or permissions, sign
or renew the MOU, or change user roles. Contact-to-Principal changes require
Small Moves system-admin support.

### Q: How much can I request per submission?

Each individual request is capped at $2,000. Your school also has an annual budget allocation — you can see your remaining balance at the top of the Dashboard. Unused funds do not roll over to the following school year.

### Q: How long does the review process take?

Requests are typically reviewed within 48 business hours on the configured Small Moves business calendar. An administrator validates payout information, contacts the beneficiary, and records confirmation before executing payment outside the portal. If there are no issues or questions, the configured commitments default to digital payment within 48 business hours, check payment within five business days, and gift card payment within one month. Organization-observed holidays are excluded. 

### Q: What happens after a request is approved?

Once approved, the request enters the “Payout Details” phase. An action-needed banner will appear on your Dashboard. This is when you should meet with the family to let them know they will be receiving funds and confirm how they would like to receive the funds.

You will need to enter the beneficiary’s payout information — including who receives the funds, delivery method, and one of the payout methods currently enabled in Portal Settings. After submitting, the request moves to the “Beneficiary Confirmation” phase for an administrator to validate and record the manual confirmation.

### Q: Can I edit a request after submitting it?

Yes, for a request you are authorized to manage. Principals can manage school requests; Additional Contacts can manage only requests they initiated. Before approval, permitted users can edit the beneficiary, amount, reason, or category. During an allowed payout stage, they can add a payee or update payout information. All changes are logged in the Activity section with a timestamp.

### Q: Can I cancel a request?

Yes, if you are authorized to manage the request. A Principal can cancel an open school request, and an Additional Contact can cancel an open request they initiated. Cancellation creates the distinct Canceled terminal state and cannot be reopened. It is not an admin denial.

### Q: What is the MOU and why do I need to sign it?

The MOU is an annual Principal agreement for a specific school, school year, and version. Every Principal signs each year, including a Principal joining mid-year. Principals can view and complete their signature from Profile. Additional Contacts can view school compliance status but cannot sign or renew the MOU unless they also hold a Principal role.

### Q: What is two-factor authentication (2FA) and is it required?

2FA adds a second layer of security through Firebase Authentication with Identity Platform and a TOTP authenticator app. Enrollment, challenges, reauthentication, and unenrollment use Firebase capabilities; the portal does not create backup codes or an administrator bypass.

### Q: How do I update my school information or contact details?

Principals can edit permitted school information and manage Additional Contacts from the Dashboard. Additional Contacts see school and contact information read-only. Every user can update their own permitted profile and password information from Profile.  
