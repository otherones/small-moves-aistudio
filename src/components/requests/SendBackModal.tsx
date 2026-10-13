import React, { useState } from 'react';
import { X, Send, HelpCircle, Edit3 } from 'lucide-react';
import { EmergencyRequest, SystemRequestStatus, TaskContext } from '../../types';

interface SendBackModalProps {
  request: EmergencyRequest;
  isOpen: boolean;
  onClose: () => void;
  onConfirmSendBack: (
    newStatus: 'changes_requested' | 'response_requested',
    taskContext: TaskContext,
    note: string
  ) => void;
}

export const SendBackModal: React.FC<SendBackModalProps> = ({
  request,
  isOpen,
  onClose,
  onConfirmSendBack,
}) => {
  const [backType, setBackType] = useState<'change' | 'question'>('change');
  const [taskContext, setTaskContext] = useState<TaskContext>('payout_change');
  const [note, setNote] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!note.trim()) return;

    if (backType === 'change') {
      onConfirmSendBack('changes_requested', taskContext, note.trim());
    } else {
      onConfirmSendBack('response_requested', 'question_response', note.trim());
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden">
        <div className="px-6 py-4 bg-[#0F172A] text-white flex items-center justify-between">
          <h3 className="text-base font-bold tracking-tight text-white" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>Send Back to Requester ({request.id})</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          <div>
            <label className="block font-bold text-slate-700 mb-2">Select Purpose *</label>
            <div className="grid grid-cols-2 gap-3">
              <label
                className={`p-3 rounded-xl border text-left cursor-pointer transition-all flex flex-col gap-1 ${
                  backType === 'change'
                    ? 'border-[#0089B3] bg-[#EDF7FC] text-[#0F172A] font-bold shadow-xs'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-1.5 font-bold">
                  <Edit3 className="w-4 h-4 text-[#0089B3]" />
                  <span>Ask for a Change</span>
                </div>
                <span className="text-[11px] font-normal text-slate-500">
                  Requester needs to modify request or payout fields.
                </span>
                <input
                  type="radio"
                  name="backType"
                  checked={backType === 'change'}
                  onChange={() => {
                    setBackType('change');
                    setTaskContext('payout_change');
                  }}
                  className="sr-only"
                />
              </label>

              <label
                className={`p-3 rounded-xl border text-left cursor-pointer transition-all flex flex-col gap-1 ${
                  backType === 'question'
                    ? 'border-amber-500 bg-amber-50 text-amber-950 font-bold shadow-xs'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-1.5 font-bold">
                  <HelpCircle className="w-4 h-4 text-amber-600" />
                  <span>Ask a Question</span>
                </div>
                <span className="text-[11px] font-normal text-slate-500">
                  Request clarification before approving payout.
                </span>
                <input
                  type="radio"
                  name="backType"
                  checked={backType === 'question'}
                  onChange={() => {
                    setBackType('question');
                    setTaskContext('question_response');
                  }}
                  className="sr-only"
                />
              </label>
            </div>
          </div>

          {backType === 'change' && (
            <div>
              <label className="block font-bold text-slate-700 mb-1">Specific Change Target</label>
              <select
                value={taskContext || 'payout_change'}
                onChange={(e) => setTaskContext(e.target.value as TaskContext)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg font-medium focus:ring-2 focus:ring-[#0089B3] focus:border-[#0089B3] focus:outline-hidden"
              >
                <option value="payout_change">Payout Details Change (e.g. invalid account / handle)</option>
                <option value="request_change">Request Details Change (e.g. category / amount update)</option>
              </select>
            </div>
          )}

          <div>
            <label className="block font-bold text-slate-700 mb-1">
              {backType === 'change' ? 'Change Instructions for Principal *' : 'Question for Principal *'}
            </label>
            <textarea
              rows={4}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={
                backType === 'change'
                  ? 'e.g. Please provide a verified Zelle phone number or active direct deposit details.'
                  : 'e.g. Please confirm whether the utility disconnect date is scheduled for this week.'
              }
              required
              className="w-full px-3 py-2 border border-slate-300 rounded-lg font-medium focus:outline-hidden focus:border-[#0089B3] focus:ring-2 focus:ring-[#0089B3]/20 text-slate-800"
            />
          </div>

          <div className="flex gap-2 justify-end pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-300 rounded-xl font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!note.trim()}
              className="px-5 py-2 bg-[#0089B3] hover:bg-[#007399] disabled:opacity-50 text-white rounded-xl font-bold shadow-md shadow-[#0089B3]/20 flex items-center gap-2 transition-colors cursor-pointer"
            >
              <Send className="w-4 h-4" />
              Send Back to Principal
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
