import React from 'react';
import { CheckCircle2, Circle, Clock, AlertCircle } from 'lucide-react';
import { SystemRequestStatus, EmergencyRequest } from '../../types';

interface StatusStepperProps {
  request: EmergencyRequest;
  isAdminView?: boolean;
}

export const StatusStepper: React.FC<StatusStepperProps> = ({ request, isAdminView = false }) => {
  const status = request.status;
  const steps = [
    { key: 'in_review', label: 'Admin Review', desc: 'Reviewed by Small Moves' },
    { key: 'waiting_on_principal', label: 'Payout Details', desc: 'School submits payout method' },
    { key: 'waiting_on_beneficiary', label: 'Beneficiary Confirmation', desc: 'Recipient confirms payment method' },
    { key: 'paid', label: 'Paid', desc: 'Disbursement completed' },
  ];

  const getStepState = (stepKey: string) => {
    if (status === 'denied' || status === 'canceled') {
      return 'terminated';
    }

    const order = ['in_review', 'waiting_on_principal', 'waiting_on_beneficiary', 'paid'];
    
    // Determine logical current index based on status
    let currentIndex = 0;
    if (status === 'in_review') currentIndex = 0;
    else if (status === 'changes_requested' || status === 'response_requested') currentIndex = 0; // Still in review phase effectively, or awaiting school response before continuing
    else if (status === 'waiting_on_principal') currentIndex = 1;
    else if (status === 'waiting_on_beneficiary') currentIndex = 2;
    else if (status === 'ready_to_pay') currentIndex = 3; // ready_to_pay skips to Paid step being next/active
    else if (status === 'paid') currentIndex = 4; // all done

    const stepIndex = order.indexOf(stepKey);

    if (stepIndex < currentIndex) return 'completed';
    if (stepIndex === currentIndex) return 'active';
    return 'upcoming';
  };

  const getStepTimestamp = (stepKey: string): string | undefined => {
    if (getStepState(stepKey) !== 'completed' && getStepState(stepKey) !== 'active' && stepKey !== 'paid') {
        if (stepKey === 'paid' && status === 'paid') {
           // handled below
        } else {
           return undefined;
        }
    }
    
    if (stepKey === 'in_review') {
       // We don't have a distinct admin approved timestamp, but we know when payout details were submitted, or we can just not show it if we don't have it.
       // The request createdAt is when it started. If completed, it means it was approved.
       // If payoutDetails.submittedAt exists, it was approved before that.
       // Let's just use request.updatedAt as a fallback if it's completed? 
       // Actually, there's no reliable exact admin-reviewed-at timestamp in EmergencyRequest.
       return undefined;
    }
    if (stepKey === 'waiting_on_principal') {
      return request.payoutDetails?.submittedAt;
    }
    if (stepKey === 'waiting_on_beneficiary') {
      return request.payoutDetails?.beneficiaryConfirmedAt;
    }
    if (stepKey === 'paid') {
      if (status === 'paid') {
         return request.payoutDetails?.paidAt || request.updatedAt;
      }
    }
    return undefined;
  };

  const formatDate = (isoString?: string) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    }).format(date);
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
      <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4">
        Request Progress Timeline
      </h4>

      {(status === 'denied' || status === 'canceled') && (
        <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-lg flex items-center gap-2 text-rose-800 text-xs font-medium">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>
            This request is in a terminal state: <strong className="capitalize">{status}</strong>.
          </span>
        </div>
      )}

      {(status === 'changes_requested' || status === 'response_requested') && (
        <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-center gap-2 text-amber-900 text-xs font-medium">
          <Clock className="w-4 h-4 text-amber-600 shrink-0" />
          <span>
            Action required: {status === 'changes_requested' ? 'Updates requested by admin' : 'Question from admin requires response'}
          </span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 relative">
        {steps.map((step, idx) => {
          const state = getStepState(step.key);
          const timestamp = getStepTimestamp(step.key);

          return (
            <div key={step.key} className="flex flex-col space-y-1.5 relative">
              <div className="flex items-center gap-2">
                {state === 'completed' && (
                  <div className="w-6 h-6 rounded-full bg-[#F2FCE2] border border-[#6EBF00]/40 text-[#2D5F00] flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#2D5F00]" />
                  </div>
                )}
                {state === 'active' && (
                  <div className="w-6 h-6 rounded-full bg-[#0089B3] text-white flex items-center justify-center font-semibold text-xs shrink-0 shadow-xs">
                    {idx + 1}
                  </div>
                )}
                {state === 'upcoming' && (
                  <div className="w-6 h-6 rounded-full bg-slate-100 border border-slate-300 text-slate-400 flex items-center justify-center text-xs shrink-0">
                    {idx + 1}
                  </div>
                )}
                {state === 'terminated' && (
                  <div className="w-6 h-6 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center text-xs shrink-0">
                    -
                  </div>
                )}

                <div className="flex flex-col">
                  <span
                    className={`text-xs font-semibold ${
                      state === 'active'
                        ? 'text-[#006E8F]'
                        : state === 'completed'
                        ? 'text-slate-800'
                        : 'text-slate-400'
                    }`}
                  >
                    {step.label}
                  </span>
                  {state === 'completed' && timestamp && (
                    <span className="text-[10px] text-slate-400 font-normal">
                      {formatDate(timestamp)}
                    </span>
                  )}
                </div>
              </div>

              <p className="text-[11px] text-slate-500 pl-8 leading-snug">{step.desc}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
};
