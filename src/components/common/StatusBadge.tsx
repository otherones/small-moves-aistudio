import React from 'react';
import { SystemRequestStatus } from '../../types';

interface StatusBadgeProps {
  status: SystemRequestStatus;
  adminLabel?: string;
  principalLabel?: string;
  isAdminView?: boolean;
  className?: string;
}

export const DEFAULT_STATUS_CONFIG: Record<
  SystemRequestStatus,
  { adminLabel: string; principalLabel: string; badgeStyle: string; dotStyle: string }
> = {
  in_review: {
    adminLabel: 'In Review',
    principalLabel: 'In Review',
    badgeStyle: 'bg-[#EDF7FC] text-[#006E8F]',
    dotStyle: 'bg-[#0089B3]',
  },
  waiting_on_principal: {
    adminLabel: 'Waiting on Principal',
    principalLabel: 'Payout Details Needed',
    badgeStyle: 'bg-amber-100 text-amber-900',
    dotStyle: 'bg-amber-500',
  },
  waiting_on_beneficiary: {
    adminLabel: 'Waiting on Beneficiary',
    principalLabel: 'Beneficiary Confirmation',
    badgeStyle: 'bg-[#F5EEFE] text-[#6A1CB8]',
    dotStyle: 'bg-[#8A2BE2]',
  },
  ready_to_pay: {
    adminLabel: 'Ready to Pay',
    principalLabel: 'Ready for Payment',
    badgeStyle: 'bg-[#F2FCE2] text-[#2D5F00]',
    dotStyle: 'bg-[#6EBF00]',
  },
  changes_requested: {
    adminLabel: 'Changes Requested',
    principalLabel: 'Changes Requested',
    badgeStyle: 'bg-amber-100 text-amber-900',
    dotStyle: 'bg-amber-500',
  },
  response_requested: {
    adminLabel: 'Response Requested',
    principalLabel: 'Response Requested',
    badgeStyle: 'bg-amber-100 text-amber-900',
    dotStyle: 'bg-amber-500',
  },
  paid: {
    adminLabel: 'Paid',
    principalLabel: 'Paid',
    badgeStyle: 'bg-slate-100 text-slate-700',
    dotStyle: 'bg-slate-500',
  },
  denied: {
    adminLabel: 'Denied',
    principalLabel: 'Denied',
    badgeStyle: 'bg-red-50 text-red-700',
    dotStyle: 'bg-red-500',
  },
  canceled: {
    adminLabel: 'Canceled',
    principalLabel: 'Canceled',
    badgeStyle: 'bg-slate-100 text-slate-700',
    dotStyle: 'bg-slate-500',
  },
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  adminLabel,
  principalLabel,
  isAdminView = false,
  className = '',
}) => {
  const config = DEFAULT_STATUS_CONFIG[status] || DEFAULT_STATUS_CONFIG.in_review;
  const label = isAdminView
    ? adminLabel || config.adminLabel
    : principalLabel || config.principalLabel;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${config.badgeStyle} ${className}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${config.dotStyle}`} />
      <span className="truncate">{label}</span>
    </span>
  );
};
