import { School, EmergencyRequest, PortalSettings } from '../types';
import { getCurrentSchoolYear, getSchoolYearForDate } from './schoolYear';

export interface SchoolBudgetMetrics {
  annualBudget: number;
  budgetPaid: number;
  budgetReserved: number;
  budgetAvailable: number;
  paidPct: number;
  reservedPct: number;
  availablePct: number;
  paidCount: number;
  reservedCount: number;
  openCount: number;
  actionNeededCount: number;
  totalCount: number;
}

/**
 * Dynamically computes accurate, real-time budget metrics for a school
 * by summing all actual requests for the target academic school year.
 */
export function computeSchoolBudgetMetrics(
  school: School,
  requests: EmergencyRequest[],
  targetSchoolYear?: string
): SchoolBudgetMetrics {
  const annualBudget = Number(school.annualBudget) || 0;
  const schoolRequests = requests.filter((r) => r.schoolId === school.id);

  const syRequests = targetSchoolYear
    ? schoolRequests.filter((r) => getSchoolYearForDate(r.createdAt) === targetSchoolYear)
    : schoolRequests;

  // Paid grants
  const paidRequests = syRequests.filter((r) => r.status === 'paid');
  const budgetPaid = paidRequests.reduce((sum, r) => sum + (Number(r.amount) || 0), 0);

  // Reserved / Pending grants
  const reservedRequests = syRequests.filter((r) =>
    [
      'in_review',
      'waiting_on_principal',
      'waiting_on_beneficiary',
      'ready_to_pay',
      'response_requested',
      'changes_requested',
    ].includes(r.status)
  );
  const budgetReserved = reservedRequests.reduce((sum, r) => sum + (Number(r.amount) || 0), 0);

  // Available budget
  const budgetAvailable = Math.max(0, annualBudget - budgetPaid - budgetReserved);

  // Percentages for stacked progress bars
  const paidPct = annualBudget > 0 ? Math.min(100, Math.round((budgetPaid / annualBudget) * 100)) : 0;
  const reservedPct =
    annualBudget > 0 ? Math.min(100 - paidPct, Math.round((budgetReserved / annualBudget) * 100)) : 0;
  const availablePct = Math.max(0, 100 - paidPct - reservedPct);

  // Categorical counts
  const openRequests = syRequests.filter((r) => !['paid', 'denied', 'canceled'].includes(r.status));
  const actionNeededRequests = schoolRequests.filter((r) =>
    ['waiting_on_principal', 'changes_requested', 'response_requested'].includes(r.status)
  );

  return {
    annualBudget,
    budgetPaid,
    budgetReserved,
    budgetAvailable,
    paidPct,
    reservedPct,
    availablePct,
    paidCount: paidRequests.length,
    reservedCount: reservedRequests.length,
    openCount: openRequests.length,
    actionNeededCount: actionNeededRequests.length,
    totalCount: syRequests.length,
  };
}

/**
 * Helper to get live available budget for a school
 */
export function getSchoolAvailableBudget(
  school: School,
  requests: EmergencyRequest[],
  targetSchoolYear?: string
): number {
  return computeSchoolBudgetMetrics(school, requests, targetSchoolYear).budgetAvailable;
}
