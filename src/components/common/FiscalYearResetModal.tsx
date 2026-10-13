import React, { useState } from 'react';
import { RefreshCw, ShieldAlert, CheckCircle2, DollarSign, Calendar, AlertTriangle, Building2, Check, X, FileText } from 'lucide-react';
import { School } from '../../types';
import { getCurrentSchoolYear, getUpcomingSchoolYears } from '../../utils/schoolYear';

export interface FiscalYearResetOptions {
  targetSchoolYear: string;
  baseAnnualBudget: number;
  rolloverUnspent: boolean;
  resetCounters: boolean;
  resetMouToPending: boolean;
  mouVersionId?: string;
  selectedSchoolIds: string[]; // empty array means ALL active schools
}

interface FiscalYearResetModalProps {
  isOpen: boolean;
  onClose: () => void;
  schools: School[];
  defaultAnnualBudget: number;
  mouVersions?: { id: string; name: string }[];
  onExecuteReset: (options: FiscalYearResetOptions) => void;
}

export const FiscalYearResetModal: React.FC<FiscalYearResetModalProps> = ({
  isOpen,
  onClose,
  schools,
  defaultAnnualBudget,
  mouVersions = [],
  onExecuteReset,
}) => {
  const currentSY = getCurrentSchoolYear();
  const upcomingYears = getUpcomingSchoolYears();
  const availableSchoolYears = [currentSY, ...upcomingYears.filter(y => y !== currentSY)];

  const [targetSchoolYear, setTargetSchoolYear] = useState<string>(availableSchoolYears[1] || '2026-2027');
  const [baseAnnualBudget, setBaseAnnualBudget] = useState<number>(defaultAnnualBudget || 10000);
  const [rolloverUnspent, setRolloverUnspent] = useState<boolean>(false);
  const [resetCounters, setResetCounters] = useState<boolean>(true);
  const [resetMouToPending, setResetMouToPending] = useState<boolean>(true);
  const [mouVersionId, setMouVersionId] = useState<string>(mouVersions.length > 0 ? mouVersions[0].id : '');
  const [targetScope, setTargetScope] = useState<'all' | 'custom'>('all');
  const [selectedSchoolIds, setSelectedSchoolIds] = useState<string[]>([]);
  const [confirmedSafetyCheck, setConfirmedSafetyCheck] = useState<boolean>(false);
  const [isExecuting, setIsExecuting] = useState<boolean>(false);
  const [executedSuccess, setExecutedSuccess] = useState<boolean>(false);

  if (!isOpen) return null;

  const activeSchools = schools.filter((s) => s.status === 'active' || s.status === 'invited');
  const targetSchools = targetScope === 'all' 
    ? activeSchools 
    : activeSchools.filter((s) => selectedSchoolIds.includes(s.id));

  // Impact Calculations
  const totalCurrentAvailable = targetSchools.reduce((sum, s) => sum + (s.budgetAvailable || 0), 0);
  const totalNewAllocation = targetSchools.reduce((sum, s) => {
    const unspent = rolloverUnspent ? Math.max(s.budgetAvailable || 0, 0) : 0;
    return sum + baseAnnualBudget + unspent;
  }, 0);

  const toggleSelectSchool = (schoolId: string) => {
    setSelectedSchoolIds((prev) =>
      prev.includes(schoolId) ? prev.filter((id) => id !== schoolId) : [...prev, schoolId]
    );
  };

  const handleSelectAllSchools = () => {
    if (selectedSchoolIds.length === activeSchools.length) {
      setSelectedSchoolIds([]);
    } else {
      setSelectedSchoolIds(activeSchools.map((s) => s.id));
    }
  };

  const handleConfirmExecute = (e: React.FormEvent) => {
    e.preventDefault();
    if (targetSchools.length === 0) return;

    setIsExecuting(true);
    setTimeout(() => {
      onExecuteReset({
        targetSchoolYear,
        baseAnnualBudget: Number(baseAnnualBudget),
        rolloverUnspent,
        resetCounters,
        resetMouToPending,
        mouVersionId: resetMouToPending ? mouVersionId : undefined,
        selectedSchoolIds: targetScope === 'all' ? [] : selectedSchoolIds,
      });

      setIsExecuting(false);
      setExecutedSuccess(true);
      setTimeout(() => {
        setExecutedSuccess(false);
        onClose();
      }, 2000);
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-fade-in">
      <div className="bg-white rounded-2xl border border-slate-200 p-6 max-w-2xl w-full space-y-5 shadow-2xl text-xs max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3.5">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-amber-100 rounded-xl text-amber-800">
              <RefreshCw className="w-5 h-5 text-amber-700" />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900 tracking-tight">
                Fiscal Year End Budget Reset & Annual Rollover
              </h2>
              <p className="text-[11px] font-medium text-slate-500">
                Official admin function to close out school budgets, allocate new annual funding, and trigger MOU re-signings.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {executedSuccess ? (
          <div className="py-12 text-center space-y-3">
            <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">Fiscal Year Reset Executed!</h3>
            <p className="text-xs text-slate-600 max-w-md mx-auto">
              Successfully reset budget allocations for {targetSchools.length} partner schools for SY {targetSchoolYear}. All audit transactions and activity logs have been recorded to Firestore.
            </p>
          </div>
        ) : (
          <form onSubmit={handleConfirmExecute} className="space-y-4">
            {/* 1. Target Fiscal / School Year */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div>
                <label className="block font-medium text-slate-800 mb-1 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-[#0089B3]" />
                  Target School / Fiscal Year *
                </label>
                <select
                  value={targetSchoolYear}
                  onChange={(e) => setTargetSchoolYear(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-medium text-slate-900 focus:border-[#0089B3] focus:ring-1 focus:ring-[#0089B3]"
                >
                  {availableSchoolYears.map((sy) => (
                    <option key={sy} value={sy}>
                      School Year {sy}
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-slate-400 mt-1 font-normal">
                  Budget transactions will be tagged under SY {targetSchoolYear}.
                </p>
              </div>

              <div>
                <label className="block font-medium text-slate-800 mb-1 flex items-center gap-1.5">
                  <DollarSign className="w-3.5 h-3.5 text-[#0089B3]" />
                  Base Annual Budget Allocation ($) *
                </label>
                <input
                  type="number"
                  min={100}
                  step={100}
                  value={baseAnnualBudget}
                  onChange={(e) => setBaseAnnualBudget(Number(e.target.value))}
                  required
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-semibold text-slate-900 text-sm focus:border-[#0089B3] focus:ring-1 focus:ring-[#0089B3]"
                />
                <p className="text-[10px] text-slate-400 mt-1 font-normal">
                  Standard baseline budget assigned to each participating school.
                </p>
              </div>
            </div>

            {/* 2. Rollover & Policy Rules */}
            <div className="space-y-3">
              <h3 className="font-semibold text-xs uppercase tracking-wider text-slate-500">
                2. Fiscal Rollover Policies
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Unspent Funds Policy */}
                <div
                  onClick={() => setRolloverUnspent(false)}
                  className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                    !rolloverUnspent
                      ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                      : 'bg-slate-50 text-slate-800 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-xs">Option A: Fresh Baseline Reset</span>
                    {!rolloverUnspent && <Check className="w-4 h-4 text-[#A3E635]" />}
                  </div>
                  <p className={`text-[11px] font-normal ${!rolloverUnspent ? 'text-slate-300' : 'text-slate-500'}`}>
                    Unspent balances expire. Each school starts clean with exactly ${baseAnnualBudget.toLocaleString()}.
                  </p>
                </div>

                <div
                  onClick={() => setRolloverUnspent(true)}
                  className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                    rolloverUnspent
                      ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                      : 'bg-slate-50 text-slate-800 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-xs">Option B: Rollover Unspent Funds</span>
                    {rolloverUnspent && <Check className="w-4 h-4 text-[#A3E635]" />}
                  </div>
                  <p className={`text-[11px] font-normal ${rolloverUnspent ? 'text-slate-300' : 'text-slate-500'}`}>
                    Adds remaining unspent balance from prior year on top of the ${baseAnnualBudget.toLocaleString()} baseline.
                  </p>
                </div>
              </div>

              {/* Checkbox Policies */}
              <div className="space-y-2 pt-1">
                <label className="flex items-start gap-2.5 p-3 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={resetCounters}
                    onChange={(e) => setResetCounters(e.target.checked)}
                    className="mt-0.5 rounded text-[#0089B3] focus:ring-[#0089B3] w-4 h-4"
                  />
                  <div>
                    <span className="font-semibold text-slate-900 block">
                      Reset Expense Counters ('Paid' and 'Reserved') to $0
                    </span>
                    <span className="text-[11px] text-slate-500 font-normal">
                      Recommended. Clears prior year disbursement subtotals so school dashboards accurately reflect new fiscal year spending.
                    </span>
                  </div>
                </label>

                <label className="flex items-start gap-2.5 p-3 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={resetMouToPending}
                    onChange={(e) => setResetMouToPending(e.target.checked)}
                    className="mt-0.5 rounded text-[#0089B3] focus:ring-[#0089B3] w-4 h-4"
                  />
                  <div>
                    <span className="font-semibold text-slate-900 block">
                      Reset Annual MOU Status to 'Pending Signature'
                    </span>
                    <span className="text-[11px] text-slate-500 font-normal">
                      Prompts principals to execute their new annual Memorandum of Understanding upon logging in for SY {targetSchoolYear}.
                    </span>
                  </div>
                </label>
                
                {resetMouToPending && (
                  <div className="pl-9 pr-3">
                    <label className="block text-xs font-medium text-slate-700 mb-1">Select MOU Version to sign:</label>
                    <select
                      value={mouVersionId}
                      onChange={(e) => setMouVersionId(e.target.value)}
                      className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:border-[#0089B3] focus:ring-1 focus:ring-[#0089B3]"
                    >
                      {mouVersions.length === 0 ? (
                        <option value="">-- No MOU Versions Available --</option>
                      ) : (
                        mouVersions.map(v => (
                          <option key={v.id} value={v.id}>{v.name}</option>
                        ))
                      )}
                    </select>
                  </div>
                )}
              </div>
            </div>

            {/* 3. Target Scope */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-xs uppercase tracking-wider text-slate-500">
                  3. Target Partner Schools
                </h3>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setTargetScope('all')}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-medium cursor-pointer transition-colors ${
                      targetScope === 'all'
                        ? 'bg-[#0089B3] text-white'
                        : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                    }`}
                  >
                    All Active ({activeSchools.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setTargetScope('custom');
                      if (selectedSchoolIds.length === 0) {
                        setSelectedSchoolIds(activeSchools.map((s) => s.id));
                      }
                    }}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-medium cursor-pointer transition-colors ${
                      targetScope === 'custom'
                        ? 'bg-[#0089B3] text-white'
                        : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                    }`}
                  >
                    Select Specific Schools
                  </button>
                </div>
              </div>

              {targetScope === 'custom' && (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2 max-h-36 overflow-y-auto">
                  <div className="flex items-center justify-between pb-1.5 border-b border-slate-200">
                    <span className="font-medium text-[11px] text-slate-700">Select schools to include:</span>
                    <button
                      type="button"
                      onClick={handleSelectAllSchools}
                      className="text-[11px] text-[#0089B3] font-medium hover:underline cursor-pointer"
                    >
                      {selectedSchoolIds.length === activeSchools.length ? 'Deselect All' : 'Select All'}
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                    {activeSchools.map((s) => (
                      <label key={s.id} className="flex items-center gap-2 text-[11px] cursor-pointer hover:bg-white p-1 rounded">
                        <input
                          type="checkbox"
                          checked={selectedSchoolIds.includes(s.id)}
                          onChange={() => toggleSelectSchool(s.id)}
                          className="rounded text-[#0089B3] focus:ring-[#0089B3]"
                        />
                        <span className="font-medium text-slate-900 truncate">{s.name}</span>
                        <span className="text-slate-400 font-mono text-[10px]">(${s.budgetAvailable.toLocaleString()})</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* 4. Projected Impact Summary */}
            <div className="p-4 bg-slate-900 text-slate-100 rounded-2xl border border-slate-800 space-y-2 shadow-inner">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="font-medium text-xs text-amber-400 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5" />
                  Execution Projection
                </span>
                <span className="text-[10px] text-slate-400 font-mono">
                  SY {targetSchoolYear} Rollover
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="p-2 bg-slate-800 rounded-xl border border-slate-700">
                  <span className="text-[10px] text-slate-400 uppercase font-medium block">Schools Updated</span>
                  <span className="text-sm font-semibold text-white">{targetSchools.length}</span>
                </div>
                <div className="p-2 bg-slate-800 rounded-xl border border-slate-700">
                  <span className="text-[10px] text-slate-400 uppercase font-medium block">Current Unspent</span>
                  <span className="text-sm font-semibold text-amber-300">${totalCurrentAvailable.toLocaleString()}</span>
                </div>
                <div className="p-2 bg-slate-800 rounded-xl border border-slate-700">
                  <span className="text-[10px] text-slate-400 uppercase font-medium block">New SY Allocation</span>
                  <span className="text-sm font-semibold text-[#A3E635]">${totalNewAllocation.toLocaleString()}</span>
                </div>
              </div>

              <p className="text-[10px] text-slate-400 italic pt-1 font-normal">
                Executing will append a <code className="text-amber-300 font-mono">fiscal_year_reset</code> transaction to each school's audit ledger and record activity logs in Firestore.
              </p>
            </div>

            {/* Safety Confirmation Checkbox */}
            <label className="flex items-start gap-2.5 p-3 rounded-xl border border-amber-300 bg-amber-50 text-amber-900 cursor-pointer">
              <input
                type="checkbox"
                checked={confirmedSafetyCheck}
                onChange={(e) => setConfirmedSafetyCheck(e.target.checked)}
                className="mt-0.5 rounded text-amber-600 focus:ring-amber-500 w-4 h-4"
              />
              <div className="text-[11px]">
                <span className="font-semibold block text-amber-950">
                  I confirm I am executing the Fiscal Year End Budget Reset for SY {targetSchoolYear}.
                </span>
                <span className="font-normal">This action modifies active school budgets and cannot be automatically undone.</span>
              </div>
            </label>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={onClose}
                disabled={isExecuting}
                className="px-4 py-2 border border-slate-300 rounded-xl font-medium text-slate-700 hover:bg-slate-50 cursor-pointer text-xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!confirmedSafetyCheck || targetSchools.length === 0 || isExecuting}
                className={`px-5 py-2 rounded-xl font-medium text-white flex items-center gap-2 shadow-xs transition-all text-xs ${
                  confirmedSafetyCheck && targetSchools.length > 0 && !isExecuting
                    ? 'bg-[#0089B3] hover:bg-[#006E8F] cursor-pointer'
                    : 'bg-slate-300 text-slate-500 cursor-not-allowed'
                }`}
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isExecuting ? 'animate-spin' : ''}`} />
                {isExecuting ? 'Executing Reset...' : `Execute SY ${targetSchoolYear} Reset (${targetSchools.length} Schools)`}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
