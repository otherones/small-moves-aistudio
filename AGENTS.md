# Agent & System Requirements

## Core Architecture & Email Guidelines

1. **Email Template System Directive**:
   - All email dispatches, invitations, status change notifications, reminders, and user onboarding communications MUST use the centralized Email Template System stored in `PortalSettings.emailTemplates`.
   - Hardcoded email copy, inline subjects, or static email bodies in UI components are strictly forbidden.
   - All component email previews and dispatch mechanisms must invoke `renderEmailTemplate` or `renderInviteEmail` with dynamic context objects (`{{school_name}}`, `{{recipient_name}}`, `{{invite_code}}`, `{{invite_link}}`, `{{amount}}`, `{{custom_note}}`, etc.).
   - Email templates are fully managed and editable by administrators in **Portal System Settings** (`/admin/settings` under Tab 3: Email Templates).

2. **Database & Data Persistence Rules**:
   - Primary data persistence is managed via Firestore.
   - When mutating objects in Firestore, always filter `undefined` values using `cleanForFirestore` to prevent Firestore write crashes.
   - Initial seed data must maintain strict schema consistency.

3. **Authentication & Security**:
   - Firebase Auth handles user sessions and profile synchronization.
   - Administrative and Principal access permissions must strictly adhere to `UserRole` classifications (`admin`, `principal`, `additional_contact`, `funder`, `ops`).

4. **UI & Accessibility Standards**:
   - Maintain desktop-first precision with full mobile responsive layouts.
   - Ensure WCAG AA compliance with high-contrast text and clear layout hierarchy.

5. **Work List Table Action Menus Directive**:
   - Work list tables that have an Action column should use 3-dot action menus for the rows. Do not use individual icons/buttons for actions. The available actions should reflect the actions relevant to the status of the record in the row.
   - The 3-dot action menu should be fully visible and not overflow or get cut off on the sides or bottom of the table.
