import { SystemRequestStatus, EmergencyRequest, ActivityEvent } from '../types';

export function formatStatusLabel(
  status?: SystemRequestStatus,
  customLabels?: Record<string, { adminLabel: string; principalLabel: string }>
): string {
  if (!status) return 'N/A';
  if (customLabels && customLabels[status]?.adminLabel) {
    return customLabels[status].adminLabel;
  }
  switch (status) {
    case 'in_review':
      return 'In Review';
    case 'waiting_on_principal':
      return 'Waiting on Submitter';
    case 'waiting_on_beneficiary':
      return 'Waiting on Beneficiary';
    case 'ready_to_pay':
      return 'Ready to Pay';
    case 'paid':
      return 'Disbursed / Paid';
    case 'denied':
      return 'Denied';
    case 'changes_requested':
      return 'Changes Requested';
    case 'canceled':
      return 'Canceled';
    default:
      return (status || '').replace(/_/g, ' ');
  }
}

/**
 * Resolves the ISO timestamp when an emergency request last changed into its current status.
 * Prevents non-status actions (notes, emails, SMS resends, etc.) from resetting the 7+ days timer.
 */
export function getLastStatusChangeDate(
  request: EmergencyRequest,
  activityLogs?: ActivityEvent[]
): string {
  // 1. Explicit statusUpdatedAt property if present
  if (request.statusUpdatedAt) {
    return request.statusUpdatedAt;
  }

  // 2. Status-specific authoritative timestamps
  if (request.status === 'waiting_on_beneficiary' && request.payoutDetails?.submittedAt) {
    return request.payoutDetails.submittedAt;
  }
  if (request.status === 'ready_to_pay' && request.payoutDetails?.beneficiaryConfirmedAt) {
    return request.payoutDetails.beneficiaryConfirmedAt;
  }
  if (request.status === 'paid' && request.payoutDetails?.paidAt) {
    return request.payoutDetails.paidAt;
  }

  // 3. Search activity logs for transitions into this request's current status
  if (activityLogs && activityLogs.length > 0) {
    const matchingLogs = activityLogs.filter(
      (l) =>
        l.requestId === request.id &&
        (l.toStatus === request.status ||
          (l.eventType === 'status_change' && (l.toStatus === request.status || !l.toStatus)))
    );

    if (matchingLogs.length > 0) {
      let latestTime = '';
      for (const log of matchingLogs) {
        if (log.timestamp && (!latestTime || log.timestamp > latestTime)) {
          latestTime = log.timestamp;
        }
      }
      if (latestTime) return latestTime;
    }
  }

  // 4. Check email logs for matching status change trigger events
  if (request.emailLogs && request.emailLogs.length > 0) {
    const expectedTrigger = `status_change_to_${request.status}`;
    const matchingEmails = request.emailLogs.filter(
      (el) => el.triggerEvent === expectedTrigger || (el.triggerEvent && el.triggerEvent.includes(request.status))
    );
    if (matchingEmails.length > 0) {
      let latestEmailTime = '';
      for (const el of matchingEmails) {
        const t = el.dispatchedAt;
        if (t && (!latestEmailTime || t > latestEmailTime)) {
          latestEmailTime = t;
        }
      }
      if (latestEmailTime) return latestEmailTime;
    }
  }

  // 5. Check SMS logs for matching status change trigger events
  if (request.smsLogs && request.smsLogs.length > 0) {
    const expectedTrigger = `status_change_to_${request.status}`;
    const matchingSms = request.smsLogs.filter(
      (sl) => sl.triggerEvent === expectedTrigger || (sl.triggerEvent && sl.triggerEvent.includes(request.status))
    );
    if (matchingSms.length > 0) {
      let latestSmsTime = '';
      for (const sl of matchingSms) {
        const t = sl.dispatchedAt;
        if (t && (!latestSmsTime || t > latestSmsTime)) {
          latestSmsTime = t;
        }
      }
      if (latestSmsTime) return latestSmsTime;
    }
  }

  // 6. For 'in_review' (the initial submitted status), createdAt is the exact status date
  if (request.status === 'in_review' && request.createdAt) {
    return request.createdAt;
  }

  // 7. Fallback to createdAt if available, otherwise updatedAt
  return request.createdAt || request.updatedAt || new Date().toISOString();
}

