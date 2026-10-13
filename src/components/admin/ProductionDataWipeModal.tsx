import React, { useState } from 'react';
import {
  Trash2,
  AlertTriangle,
  CheckCircle2,
  Building2,
  Users,
  FileSpreadsheet,
  HeartHandshake,
  History,
  ShieldAlert,
  Lock,
  RefreshCw,
  X,
  Check,
} from 'lucide-react';
import { WipeDataOptions } from '../../lib/firebase';

interface ProductionDataWipeModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentAdminEmail?: string;
  stats: {
    schoolsCount: number;
    requestsCount: number;
    principalsCount: number;
    fundersCount: number;
    invitesCount: number;
    logsCount: number;
  };
  onExecuteWipe: (options: WipeDataOptions) => Promise<{ deletedCounts: Record<string, number> }>;
}

export const ProductionDataWipeModal: React.FC<ProductionDataWipeModalProps> = ({
  isOpen,
  onClose,
  currentAdminEmail,
  stats,
  onExecuteWipe,
}) => {
  const [wipeRequests, setWipeRequests] = useState(true);
  const [wipeSchools, setWipeSchools] = useState(true);
  const [wipePrincipalsAndUsers, setWipePrincipalsAndUsers] = useState(true);
  const [wipeFunders, setWipeFunders] = useState(true);
  const [wipePendingInvites, setWipePendingInvites] = useState(true);
  const [wipeActivityLogs, setWipeActivityLogs] = useState(true);
  const [lockMockDataReseed, setLockMockDataReseed] = useState(true);

  const [confirmPhrase, setConfirmPhrase] = useState('');
  const [isWiping, setIsWiping] = useState(false);
  const [wipeResults, setWipeResults] = useState<Record<string, number> | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const REQUIRED_PHRASE = 'WIPE-TEST-DATA';
  const isPhraseMatching = confirmPhrase.trim() === REQUIRED_PHRASE;

  const handleSelectAll = (val: boolean) => {
    setWipeRequests(val);
    setWipeSchools(val);
    setWipePrincipalsAndUsers(val);
    setWipeFunders(val);
    setWipePendingInvites(val);
    setWipeActivityLogs(val);
  };

  const handleExecute = async () => {
    if (!isPhraseMatching || isWiping) return;
    setErrorMsg(null);
    setIsWiping(true);

    try {
      const res = await onExecuteWipe({
        wipeRequests,
        wipeSchools,
        wipePrincipalsAndUsers,
        wipeFunders,
        wipePendingInvites,
        wipeActivityLogs,
        lockMockDataReseed,
      });
      setWipeResults(res.deletedCounts);
    } catch (err: any) {
      console.error('Data wipe failure:', err);
      setErrorMsg(err.message || 'An error occurred while wiping data from Firestore.');
    } finally {
      setIsWiping(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
      <div
        className="relative bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-rose-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-5">
          <div className="flex items-center gap-3.5">
            <div className="p-3 bg-rose-100 text-rose-700 rounded-2xl ring-4 ring-rose-50">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
                  Production Go-Live Data Reset
                </h2>
                <span className="px-2 py-0.5 bg-rose-100 text-rose-800 text-[10px] font-extrabold uppercase rounded-md tracking-wider">
                  Irreversible
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Permanently clear test records and operational data from Firestore to prepare for live school onboarding.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isWiping}
            className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {wipeResults ? (
          /* Completion State */
          <div className="py-6 space-y-6">
            <div className="p-5 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-start gap-4">
              <div className="p-2 bg-emerald-600 text-white rounded-xl">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-extrabold text-emerald-950 text-base">
                  Test Data Cleared Successfully
                </h3>
                <p className="text-xs text-emerald-800 mt-1 leading-relaxed">
                  The selected test collections have been purged from Firestore. Your system settings, email templates, and admin accounts have been safely preserved.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-center">
                <span className="block text-[10px] font-bold uppercase text-slate-400">Requests Deleted</span>
                <span className="text-lg font-black text-slate-900">{wipeResults.requests ?? 0}</span>
              </div>
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-center">
                <span className="block text-[10px] font-bold uppercase text-slate-400">Schools Deleted</span>
                <span className="text-lg font-black text-slate-900">{wipeResults.schools ?? 0}</span>
              </div>
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-center">
                <span className="block text-[10px] font-bold uppercase text-slate-400">Principals Cleared</span>
                <span className="text-lg font-black text-slate-900">{wipeResults.appUsers ?? 0}</span>
              </div>
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-center">
                <span className="block text-[10px] font-bold uppercase text-slate-400">Funders Cleared</span>
                <span className="text-lg font-black text-slate-900">{wipeResults.funders ?? 0}</span>
              </div>
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-center">
                <span className="block text-[10px] font-bold uppercase text-slate-400">Invites Removed</span>
                <span className="text-lg font-black text-slate-900">{wipeResults.pendingInvites ?? 0}</span>
              </div>
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-center">
                <span className="block text-[10px] font-bold uppercase text-slate-400">Audit Logs Purged</span>
                <span className="text-lg font-black text-slate-900">{wipeResults.activityLogs ?? 0}</span>
              </div>
            </div>

            <div className="p-4 bg-slate-900 text-slate-200 rounded-2xl text-xs space-y-1">
              <div className="font-bold text-white flex items-center gap-2">
                <Lock className="w-4 h-4 text-emerald-400" />
                Production Go-Live Lock Active
              </div>
              <p className="text-[11px] text-slate-400">
                Automatic demo sample re-seeding has been disabled in Portal Settings. Newly added schools, requests, and principals will be your live production records.
              </p>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer transition-colors"
              >
                Close & Return to Dashboard
              </button>
            </div>
          </div>
        ) : (
          /* Configuration & Execution Form */
          <div className="py-5 space-y-5">
            {/* Warning Banner */}
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
              <div className="text-xs text-amber-900 space-y-1">
                <p className="font-bold">Important Data Safety Confirmation</p>
                <p className="text-[11px] leading-relaxed text-amber-800">
                  This action permanently removes documents from your live Firestore database.
                  Your Admin accounts (e.g. <strong>{currentAdminEmail || 'Admins'}</strong>) and custom Portal Settings (email templates, SendGrid credentials, and MOU drafts) will <strong>NOT</strong> be deleted.
                </p>
              </div>
            </div>

            {/* Checklist of Collections to Wipe */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">
                  Select Data Collections to Wipe
                </label>
                <div className="flex items-center gap-3 text-xs">
                  <button
                    type="button"
                    onClick={() => handleSelectAll(true)}
                    className="text-emerald-700 hover:text-emerald-800 font-bold hover:underline cursor-pointer"
                  >
                    Select All
                  </button>
                  <span className="text-slate-300">|</span>
                  <button
                    type="button"
                    onClick={() => handleSelectAll(false)}
                    className="text-slate-500 hover:text-slate-700 font-bold hover:underline cursor-pointer"
                  >
                    Deselect All
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {/* 1. Requests */}
                <label className={`p-3 border rounded-xl flex items-start gap-3 cursor-pointer transition-colors ${wipeRequests ? 'border-rose-300 bg-rose-50/50' : 'border-slate-200 bg-white hover:bg-slate-50'}`}>
                  <input
                    type="checkbox"
                    checked={wipeRequests}
                    onChange={(e) => setWipeRequests(e.target.checked)}
                    className="mt-0.5 w-4 h-4 text-rose-600 rounded border-slate-300 focus:ring-rose-500 cursor-pointer"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                        <FileSpreadsheet className="w-3.5 h-3.5 text-rose-600" />
                        Requests & Relief Grants
                      </span>
                      <span className="text-[10px] font-mono font-bold bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded">
                        {stats.requestsCount} docs
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-500 mt-0.5">Emergency relief cases, disbursement logs, and status history.</p>
                  </div>
                </label>

                {/* 2. Schools */}
                <label className={`p-3 border rounded-xl flex items-start gap-3 cursor-pointer transition-colors ${wipeSchools ? 'border-rose-300 bg-rose-50/50' : 'border-slate-200 bg-white hover:bg-slate-50'}`}>
                  <input
                    type="checkbox"
                    checked={wipeSchools}
                    onChange={(e) => setWipeSchools(e.target.checked)}
                    className="mt-0.5 w-4 h-4 text-rose-600 rounded border-slate-300 focus:ring-rose-500 cursor-pointer"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-rose-600" />
                        Schools Roster
                      </span>
                      <span className="text-[10px] font-mono font-bold bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded">
                        {stats.schoolsCount} docs
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-500 mt-0.5">Partner school profiles, initial allocations, and contact links.</p>
                  </div>
                </label>

                {/* 3. Principals & App Users */}
                <label className={`p-3 border rounded-xl flex items-start gap-3 cursor-pointer transition-colors ${wipePrincipalsAndUsers ? 'border-rose-300 bg-rose-50/50' : 'border-slate-200 bg-white hover:bg-slate-50'}`}>
                  <input
                    type="checkbox"
                    checked={wipePrincipalsAndUsers}
                    onChange={(e) => setWipePrincipalsAndUsers(e.target.checked)}
                    className="mt-0.5 w-4 h-4 text-rose-600 rounded border-slate-300 focus:ring-rose-500 cursor-pointer"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-rose-600" />
                        Principals & Staff Users
                      </span>
                      <span className="text-[10px] font-mono font-bold bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded">
                        {stats.principalsCount} docs
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-500 mt-0.5">Demo principal logins & contacts (Admin accounts are preserved).</p>
                  </div>
                </label>

                {/* 4. Funders */}
                <label className={`p-3 border rounded-xl flex items-start gap-3 cursor-pointer transition-colors ${wipeFunders ? 'border-rose-300 bg-rose-50/50' : 'border-slate-200 bg-white hover:bg-slate-50'}`}>
                  <input
                    type="checkbox"
                    checked={wipeFunders}
                    onChange={(e) => setWipeFunders(e.target.checked)}
                    className="mt-0.5 w-4 h-4 text-rose-600 rounded border-slate-300 focus:ring-rose-500 cursor-pointer"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                        <HeartHandshake className="w-3.5 h-3.5 text-rose-600" />
                        Funders & Donors
                      </span>
                      <span className="text-[10px] font-mono font-bold bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded">
                        {stats.fundersCount} docs
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-500 mt-0.5">Mock funding organizations and sample allocations.</p>
                  </div>
                </label>

                {/* 5. Pending Invites */}
                <label className={`p-3 border rounded-xl flex items-start gap-3 cursor-pointer transition-colors ${wipePendingInvites ? 'border-rose-300 bg-rose-50/50' : 'border-slate-200 bg-white hover:bg-slate-50'}`}>
                  <input
                    type="checkbox"
                    checked={wipePendingInvites}
                    onChange={(e) => setWipePendingInvites(e.target.checked)}
                    className="mt-0.5 w-4 h-4 text-rose-600 rounded border-slate-300 focus:ring-rose-500 cursor-pointer"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-rose-600" />
                        Pending Onboarding Invites
                      </span>
                      <span className="text-[10px] font-mono font-bold bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded">
                        {stats.invitesCount} docs
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-500 mt-0.5">Test invite tokens and outstanding signup links.</p>
                  </div>
                </label>

                {/* 6. Activity Logs */}
                <label className={`p-3 border rounded-xl flex items-start gap-3 cursor-pointer transition-colors ${wipeActivityLogs ? 'border-rose-300 bg-rose-50/50' : 'border-slate-200 bg-white hover:bg-slate-50'}`}>
                  <input
                    type="checkbox"
                    checked={wipeActivityLogs}
                    onChange={(e) => setWipeActivityLogs(e.target.checked)}
                    className="mt-0.5 w-4 h-4 text-rose-600 rounded border-slate-300 focus:ring-rose-500 cursor-pointer"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                        <History className="w-3.5 h-3.5 text-rose-600" />
                        Activity & Audit Logs
                      </span>
                      <span className="text-[10px] font-mono font-bold bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded">
                        {stats.logsCount} docs
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-500 mt-0.5">Test timeline events, payment audit events, and status updates.</p>
                  </div>
                </label>
              </div>
            </div>

            {/* Lock Mock Data Reseed Option */}
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
              <div className="space-y-0.5">
                <span className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-emerald-600" />
                  Enable Production Lock (Prevent Mock Data Re-seeding)
                </span>
                <p className="text-[10px] text-slate-500">
                  Sets <code className="font-mono bg-white px-1 py-0.5 rounded border border-slate-200">isProductionReady: true</code> so empty collections stay clean.
                </p>
              </div>
              <input
                type="checkbox"
                checked={lockMockDataReseed}
                onChange={(e) => setLockMockDataReseed(e.target.checked)}
                className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 cursor-pointer"
              />
            </div>

            {/* Confirmation Phrase Input */}
            <div className="space-y-2 pt-2 border-t border-slate-200">
              <label className="block text-xs font-bold text-slate-900">
                To proceed, type <span className="font-mono text-rose-600 font-extrabold select-all bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200">{REQUIRED_PHRASE}</span> below:
              </label>
              <input
                type="text"
                value={confirmPhrase}
                onChange={(e) => setConfirmPhrase(e.target.value)}
                placeholder={`Type "${REQUIRED_PHRASE}" to confirm`}
                className="w-full px-3.5 py-2.5 border-2 border-slate-300 rounded-xl text-sm font-mono tracking-wider focus:outline-hidden focus:border-rose-500 transition-colors uppercase placeholder:normal-case placeholder:font-sans placeholder:tracking-normal"
              />
            </div>

            {errorMsg && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs font-bold text-rose-800">
                {errorMsg}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={onClose}
                disabled={isWiping}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                id="btn-confirm-production-wipe"
                onClick={handleExecute}
                disabled={!isPhraseMatching || isWiping}
                className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 disabled:opacity-40 text-white font-extrabold text-xs rounded-xl shadow-xs cursor-pointer transition-all flex items-center gap-2"
              >
                {isWiping ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Wiping Test Data...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    Permanently Wipe Selected Test Data
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
