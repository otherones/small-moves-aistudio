import React, { useState } from 'react';
import { X, PhoneCall, CheckCircle2, MessageSquare, Edit3, CreditCard, Mail, UserCheck } from 'lucide-react';
import { EmergencyRequest, SystemRequestStatus } from '../../types';
import { StatusBadge } from '../common/StatusBadge';

interface ResolvePrincipalTaskModalProps {
  request: EmergencyRequest | null;
  isOpen: boolean;
  onClose: () => void;
  onResolveTask: (
    requestId: string,
    nextStatus: SystemRequestStatus,
    resolutionNote: string,
    channel: 'phone' | 'email' | 'in_person'
  ) => void;
  onOpenEditPayout?: (request: EmergencyRequest) => void;
  onOpenEditRequest?: (request: EmergencyRequest) => void;
}

export const ResolvePrincipalTaskModal: React.FC<ResolvePrincipalTaskModalProps> = ({
  request,
  isOpen,
  onClose,
  onResolveTask,
  onOpenEditPayout,
  onOpenEditRequest,
}) => {
  const [channel, setChannel] = useState<'phone' | 'email' | 'in_person'>('phone');
  const [responseNotes, setResponseNotes] = useState('');
  const [nextStatus, setNextStatus] = useState<SystemRequestStatus>('in_review');

  if (!isOpen || !request) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!responseNotes.trim()) return;

    const channelLabel =
      channel === 'phone'
        ? 'Phone Call'
        : channel === 'email'
        ? 'Direct Email / Offline Note'
        : 'Direct Admin Verification';

    const fullNote = `[Resolved on Behalf of School via ${channelLabel}] ${responseNotes.trim()}`;

    onResolveTask(request.id, nextStatus, fullNote, channel);
    setResponseNotes('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 bg-[#0F172A] text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-[#0089B3] rounded-lg text-white">
              <PhoneCall className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold tracking-tight text-white" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>Resolve Task on Behalf of School</h3>
              <p className="text-[11px] text-slate-300">Record phone / verbal response & update request status</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          {/* Request Header Banner */}
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-extrabold text-slate-900 text-xs">{request.id}</span>
              <StatusBadge status={request.status} isAdminView />
            </div>
            <div className="text-[11px] text-slate-600">
              School: <strong className="text-slate-900">{request.schoolName}</strong> · Beneficiary:{' '}
              <strong className="text-slate-900">{request.beneficiaryName}</strong> (${request.amount.toLocaleString()})
            </div>
          </div>

          {/* Pending Context Banner */}
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-950 space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-[11px] text-amber-900">
              <MessageSquare className="w-3.5 h-3.5 text-amber-600" />
              <span>Current Pending Task / Question for School</span>
            </div>
            <p className="text-xs font-medium text-amber-900 italic">
              "{request.statusNote || 'Waiting for principal or school contact to provide updates or payout details.'}"
            </p>
          </div>

          {/* Communication Channel */}
          <div>
            <label className="block font-bold text-slate-700 mb-1.5">Communication Channel *</label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setChannel('phone')}
                className={`py-2 px-2.5 rounded-xl border text-center font-bold text-[11px] flex items-center justify-center gap-1.5 cursor-pointer transition-all ${
                  channel === 'phone'
                    ? 'border-[#0089B3] bg-[#EDF7FC] text-[#0F172A] shadow-xs'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <PhoneCall className="w-3.5 h-3.5 text-[#0089B3]" />
                <span>Phone Call</span>
              </button>

              <button
                type="button"
                onClick={() => setChannel('email')}
                className={`py-2 px-2.5 rounded-xl border text-center font-bold text-[11px] flex items-center justify-center gap-1.5 cursor-pointer transition-all ${
                  channel === 'email'
                    ? 'border-[#0089B3] bg-[#EDF7FC] text-[#0F172A] shadow-xs'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Mail className="w-3.5 h-3.5 text-[#0089B3]" />
                <span>Direct Email</span>
              </button>

              <button
                type="button"
                onClick={() => setChannel('in_person')}
                className={`py-2 px-2.5 rounded-xl border text-center font-bold text-[11px] flex items-center justify-center gap-1.5 cursor-pointer transition-all ${
                  channel === 'in_person'
                    ? 'border-[#0089B3] bg-[#EDF7FC] text-[#0F172A] shadow-xs'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <UserCheck className="w-3.5 h-3.5 text-[#0089B3]" />
                <span>Direct Verify</span>
              </button>
            </div>
          </div>

          {/* Information / Response Received */}
          <div>
            <label className="block font-bold text-slate-700 mb-1">
              Response / Information Received from School *
            </label>
            <textarea
              rows={3}
              required
              value={responseNotes}
              onChange={(e) => setResponseNotes(e.target.value)}
              placeholder="e.g. Spoke with Principal over the phone at 10:15 AM. Verified beneficiary emergency need details and confirmed mailing address for check."
              className="w-full px-3 py-2 border border-slate-300 rounded-xl font-medium text-slate-900 focus:ring-2 focus:ring-[#0089B3] focus:border-[#0089B3] focus:outline-hidden"
            />
          </div>

          {/* Next Target Status */}
          <div>
            <label className="block font-bold text-slate-700 mb-1.5">Target Next Request Status *</label>
            <div className="space-y-2">
              <label
                className={`p-2.5 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                  nextStatus === 'in_review'
                    ? 'border-[#0089B3] bg-[#EDF7FC] text-[#0F172A] font-bold shadow-xs'
                    : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="nextStatus"
                    value="in_review"
                    checked={nextStatus === 'in_review'}
                    onChange={() => setNextStatus('in_review')}
                    className="accent-[#0089B3]"
                  />
                  <div>
                    <span className="block font-bold">In Review</span>
                    <span className="text-[10px] text-slate-500 font-normal">
                      Return to admin active review queue for standard evaluation
                    </span>
                  </div>
                </div>
              </label>

              <label
                className={`p-2.5 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                  nextStatus === 'waiting_on_beneficiary'
                    ? 'border-[#0089B3] bg-[#EDF7FC] text-[#0F172A] font-bold shadow-xs'
                    : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="nextStatus"
                    value="waiting_on_beneficiary"
                    checked={nextStatus === 'waiting_on_beneficiary'}
                    onChange={() => setNextStatus('waiting_on_beneficiary')}
                    className="accent-[#0089B3]"
                  />
                  <div>
                    <span className="block font-bold">Waiting on Beneficiary</span>
                    <span className="text-[10px] text-slate-500 font-normal">
                      Payout info collected; awaiting beneficiary verification confirmation
                    </span>
                  </div>
                </div>
              </label>

              <label
                className={`p-2.5 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                  nextStatus === 'ready_to_pay'
                    ? 'border-[#6EBF00] bg-[#6EBF00]/10 text-slate-900 font-bold shadow-xs'
                    : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="nextStatus"
                    value="ready_to_pay"
                    checked={nextStatus === 'ready_to_pay'}
                    onChange={() => setNextStatus('ready_to_pay')}
                    className="accent-[#6EBF00]"
                  />
                  <div>
                    <span className="block font-bold">Ready to Pay</span>
                    <span className="text-[10px] text-slate-500 font-normal">
                      Beneficiary verified & payout details complete; ready for disbursement
                    </span>
                  </div>
                </div>
              </label>

              <label
                className={`p-2.5 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                  nextStatus === 'paid'
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-950 font-bold shadow-xs'
                    : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="nextStatus"
                    value="paid"
                    checked={nextStatus === 'paid'}
                    onChange={() => setNextStatus('paid')}
                    className="accent-emerald-600"
                  />
                  <div>
                    <span className="block font-bold">Paid</span>
                    <span className="text-[10px] text-slate-500 font-normal">
                      Disbursement handled directly; mark request as completed/paid
                    </span>
                  </div>
                </div>
              </label>
            </div>
          </div>

          {/* Direct Edit Shortcuts if needed */}
          {(onOpenEditPayout || onOpenEditRequest) && (
            <div className="pt-1 border-t border-slate-100 flex items-center justify-between gap-2 text-[11px]">
              <span className="text-slate-500 font-medium">Need to modify data fields?</span>
              <div className="flex items-center gap-2">
                {onOpenEditRequest && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenEditRequest(request);
                    }}
                    className="text-[#0089B3] hover:underline font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <Edit3 className="w-3 h-3" />
                    Edit Request
                  </button>
                )}
                {onOpenEditPayout && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenEditPayout(request);
                    }}
                    className="text-[#0089B3] hover:underline font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <CreditCard className="w-3 h-3" />
                    Edit Payout
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Action Footer */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-300 rounded-xl font-bold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!responseNotes.trim()}
              className="px-5 py-2 bg-[#0089B3] hover:bg-[#007399] disabled:opacity-50 text-white font-bold rounded-xl text-xs shadow-md shadow-[#0089B3]/20 flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Resolve Task & Update Status</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
