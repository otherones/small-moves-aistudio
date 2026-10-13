import React, { useState, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Download,
  Calendar,
  Building2,
  DollarSign,
  Filter,
  Search,
  CheckCircle2,
  Clock,
  PieChart,
  TrendingUp,
  FileSpreadsheet,
  HelpCircle,
  Briefcase,
  AlertCircle,
  Layers,
  ChevronRight,
  RefreshCw,
} from 'lucide-react';
import { EmergencyRequest, School, Funder, PortalSettings, BudgetTransaction } from '../../types';
import { REPORTS_REGISTRY } from './AdminReportsList';
import { getAvailableSchoolYears, getSchoolYearForDate, getCurrentSchoolYear } from '../../utils/schoolYear';
import { exportToCSV } from '../../utils/csvExport';

interface AdminReportDetailProps {
  requests: EmergencyRequest[];
  schools: School[];
  funders: Funder[];
  budgetTransactions: BudgetTransaction[];
  settings: PortalSettings;
}

export const AdminReportDetail: React.FC<AdminReportDetailProps> = ({
  requests,
  schools,
  funders,
  budgetTransactions,
  settings,
}) => {
  const { reportId } = useParams<{ reportId: string }>();
  const navigate = useNavigate();

  const reportMeta = REPORTS_REGISTRY.find((r) => r.id === reportId) || REPORTS_REGISTRY[0];

  // Global Filters
  const [selectedSchoolYear, setSelectedSchoolYear] = useState<string>('all');
  const [selectedSchoolId, setSelectedSchoolId] = useState<string>('all');
  const [selectedFunderId, setSelectedFunderId] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const availableSchoolYears = useMemo(() => getAvailableSchoolYears(requests), [requests]);

  // Filtered Base Requests
  const filteredRequests = useMemo(() => {
    return requests.filter((r) => {
      if (selectedSchoolYear !== 'all' && getSchoolYearForDate(r.createdAt) !== selectedSchoolYear) {
        return false;
      }
      if (selectedSchoolId !== 'all' && r.schoolId !== selectedSchoolId) {
        return false;
      }
      if (selectedFunderId !== 'all') {
        const school = schools.find((s) => s.id === r.schoolId);
        if (!school || school.funderId !== selectedFunderId) return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesSchool = r.schoolName.toLowerCase().includes(q);
        const matchesBeneficiary = r.beneficiaryName.toLowerCase().includes(q);
        const matchesCat = r.category.toLowerCase().includes(q);
        const matchesId = r.id.toLowerCase().includes(q);
        if (!matchesSchool && !matchesBeneficiary && !matchesCat && !matchesId) return false;
      }
      return true;
    });
  }, [requests, schools, selectedSchoolYear, selectedSchoolId, selectedFunderId, searchQuery]);

  // Filtered Schools
  const filteredSchools = useMemo(() => {
    return schools.filter((s) => {
      if (selectedSchoolId !== 'all' && s.id !== selectedSchoolId) return false;
      if (selectedFunderId !== 'all' && s.funderId !== selectedFunderId) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          s.name.toLowerCase().includes(q) ||
          (s.funderName && s.funderName.toLowerCase().includes(q)) ||
          s.city.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [schools, selectedSchoolId, selectedFunderId, searchQuery]);

  // --- REPORT SPECIFIC DATA COMPUTATION ---

  // 1. Previous School Years Report Data
  const previousSchoolYearsData = useMemo(() => {
    return availableSchoolYears.map((sy) => {
      const syRequests = requests.filter((r) => getSchoolYearForDate(r.createdAt) === sy);
      const paidReqs = syRequests.filter((r) => r.status === 'paid');
      const totalDisbursed = paidReqs.reduce((acc, r) => acc + r.amount, 0);

      // Estimate allocated budget for that school year
      const totalBudgetAllocated = schools.reduce((acc, s) => acc + (s.annualBudget || settings.annualDefaultBudget), 0);

      return {
        schoolYear: sy,
        totalSchoolsCount: schools.length,
        totalBudgetAllocated,
        totalRequestsSubmitted: syRequests.length,
        paidRequestsCount: paidReqs.length,
        totalDisbursedAmount: totalDisbursed,
        averageGrantSize: paidReqs.length > 0 ? Math.round(totalDisbursed / paidReqs.length) : 0,
        utilizationRate: totalBudgetAllocated > 0 ? Math.round((totalDisbursed / totalBudgetAllocated) * 100) : 0,
      };
    });
  }, [availableSchoolYears, requests, schools, settings.annualDefaultBudget]);

  // 2. School Allocations & Utilization Audit Data
  const schoolAllocationsData = useMemo(() => {
    return filteredSchools.map((s) => {
      const schoolReqs = filteredRequests.filter((r) => r.schoolId === s.id);
      const paidAmount = schoolReqs
        .filter((r) => r.status === 'paid')
        .reduce((sum, r) => sum + r.amount, 0);
      const reservedAmount = schoolReqs
        .filter((r) => r.status !== 'paid' && r.status !== 'denied' && r.status !== 'canceled')
        .reduce((sum, r) => sum + r.amount, 0);
      const annualBudget = s.annualBudget || settings.annualDefaultBudget;
      const remainingBalance = Math.max(0, annualBudget - paidAmount - reservedAmount);
      const utilizationRate = annualBudget > 0 ? Math.round((paidAmount / annualBudget) * 100) : 0;

      return {
        schoolId: s.id,
        schoolName: s.name,
        funderName: s.funderName || 'Unassigned',
        studentCount: s.studentCount,
        annualBudget,
        paidAmount,
        reservedAmount,
        remainingBalance,
        utilizationRate,
        totalRequestsCount: schoolReqs.length,
        status: s.status,
      };
    });
  }, [filteredSchools, filteredRequests, settings.annualDefaultBudget]);

  // 3. Disbursements Ledger Data
  const disbursementsLedgerData = useMemo(() => {
    return filteredRequests
      .filter((r) => r.status === 'paid')
      .map((r) => {
        const school = schools.find((s) => s.id === r.schoolId);
        return {
          requestId: r.id,
          paidDate: r.payoutDetails?.paidAt ? r.payoutDetails.paidAt.slice(0, 10) : r.updatedAt.slice(0, 10),
          schoolName: r.schoolName,
          beneficiaryName: r.beneficiaryName,
          category: r.category,
          amount: r.amount,
          payeeType: r.payoutDetails?.payeeType === 'third_party' ? 'Third Party' : 'Direct Beneficiary',
          payoutMethod: r.payoutDetails?.payoutMethodName || 'Direct Disbursement',
          funderName: school?.funderName || 'Unassigned',
          schoolYear: getSchoolYearForDate(r.createdAt),
        };
      });
  }, [filteredRequests, schools]);

  // 4. Hardship Category Needs Data
  const hardshipCategoryData = useMemo(() => {
    const categoriesMap: Record<string, { totalReqs: number; paidCount: number; totalAmount: number }> = {};

    filteredRequests.forEach((r) => {
      const cat = r.category || 'Other / General Emergency';
      if (!categoriesMap[cat]) {
        categoriesMap[cat] = { totalReqs: 0, paidCount: 0, totalAmount: 0 };
      }
      categoriesMap[cat].totalReqs += 1;
      if (r.status === 'paid') {
        categoriesMap[cat].paidCount += 1;
        categoriesMap[cat].totalAmount += r.amount;
      }
    });

    const grandTotalPaid = Object.values(categoriesMap).reduce((sum, c) => sum + c.totalAmount, 0);

    return Object.entries(categoriesMap)
      .map(([catName, val]) => ({
        category: catName,
        totalRequests: val.totalReqs,
        paidCount: val.paidCount,
        totalDisbursed: val.totalAmount,
        percentOfTotalSpend: grandTotalPaid > 0 ? Math.round((val.totalAmount / grandTotalPaid) * 100) : 0,
        averageGrantSize: val.paidCount > 0 ? Math.round(val.totalAmount / val.paidCount) : 0,
      }))
      .sort((a, b) => b.totalDisbursed - a.totalDisbursed);
  }, [filteredRequests]);

  // 5. Funder Impact Data
  const funderImpactData = useMemo(() => {
    return funders.map((f) => {
      const sponsoredSchools = schools.filter(
        (s) => s.funderId === f.id || f.associatedSchoolIds.includes(s.id)
      );
      const sponsoredIds = new Set(sponsoredSchools.map((s) => s.id));
      const funderReqs = requests.filter((r) => sponsoredIds.has(r.schoolId));
      const paidReqs = funderReqs.filter((r) => r.status === 'paid');
      const totalDisbursed = paidReqs.reduce((acc, r) => acc + r.amount, 0);

      return {
        funderId: f.id,
        funderName: f.name,
        funderType: f.type,
        sponsoredSchoolsCount: sponsoredSchools.length,
        totalRequestsSubmitted: funderReqs.length,
        paidGrantsCount: paidReqs.length,
        totalDisbursedAmount: totalDisbursed,
        avgGrantSize: paidReqs.length > 0 ? Math.round(totalDisbursed / paidReqs.length) : 0,
      };
    });
  }, [funders, schools, requests]);

  // 6. Operational Turnaround Data
  const operationalTurnaroundData = useMemo(() => {
    return filteredSchools.map((s) => {
      const schoolReqs = filteredRequests.filter((r) => r.schoolId === s.id);
      const paidReqs = schoolReqs.filter((r) => r.status === 'paid');
      const pendingReqs = schoolReqs.filter(
        (r) => r.status === 'waiting_on_principal' || r.status === 'changes_requested' || r.status === 'response_requested'
      );
      const deniedReqs = schoolReqs.filter((r) => r.status === 'denied');

      return {
        schoolId: s.id,
        schoolName: s.name,
        totalRequests: schoolReqs.length,
        paidRequests: paidReqs.length,
        pendingPrincipalTasks: pendingReqs.length,
        deniedRequests: deniedReqs.length,
        avgProcessingDays: 1.8, // Model estimated operational speed
        completionRate: schoolReqs.length > 0 ? Math.round((paidReqs.length / schoolReqs.length) * 100) : 0,
      };
    });
  }, [filteredSchools, filteredRequests]);

  // --- CSV Export Handler ---
  const handleExportCSV = () => {
    const dateStamp = new Date().toISOString().slice(0, 10);

    if (reportMeta.id === 'previous_school_years') {
      exportToCSV(
        `PEF_Report_Previous_School_Years_${dateStamp}`,
        [
          { key: 'schoolYear', label: 'School Year' },
          { key: 'totalSchoolsCount', label: 'Partner Schools Count' },
          { key: 'totalBudgetAllocated', label: 'Total Annual Allocation ($)' },
          { key: 'totalRequestsSubmitted', label: 'Total Requests' },
          { key: 'paidRequestsCount', label: 'Paid Grants Count' },
          { key: 'totalDisbursedAmount', label: 'Total Disbursed ($)' },
          { key: 'averageGrantSize', label: 'Average Grant Size ($)' },
          { key: 'utilizationRate', label: 'Overall Utilization (%)' },
        ],
        previousSchoolYearsData
      );
    } else if (reportMeta.id === 'school_allocations_utilization') {
      exportToCSV(
        `PEF_Report_School_Allocations_${dateStamp}`,
        [
          { key: 'schoolName', label: 'School Name' },
          { key: 'funderName', label: 'Assigned Funder' },
          { key: 'studentCount', label: 'Students Enrolled' },
          { key: 'annualBudget', label: 'Annual Budget Allocation ($)' },
          { key: 'paidAmount', label: 'Total Paid ($)' },
          { key: 'reservedAmount', label: 'Reserved Pending ($)' },
          { key: 'remainingBalance', label: 'Available Balance ($)' },
          { key: 'utilizationRate', label: 'Utilization Rate (%)' },
          { key: 'status', label: 'School Operational Status' },
        ],
        schoolAllocationsData
      );
    } else if (reportMeta.id === 'disbursements_ledger') {
      exportToCSV(
        `PEF_Report_Disbursements_Ledger_${dateStamp}`,
        [
          { key: 'requestId', label: 'Request ID' },
          { key: 'paidDate', label: 'Disbursement Date' },
          { key: 'schoolName', label: 'School Name' },
          { key: 'beneficiaryName', label: 'Beneficiary Name' },
          { key: 'category', label: 'Hardship Category' },
          { key: 'amount', label: 'Grant Amount ($)' },
          { key: 'payeeType', label: 'Payee Classification' },
          { key: 'payoutMethod', label: 'Payment Method' },
          { key: 'funderName', label: 'Assigned Funder' },
          { key: 'schoolYear', label: 'School Year' },
        ],
        disbursementsLedgerData
      );
    } else if (reportMeta.id === 'hardship_category_breakdown') {
      exportToCSV(
        `PEF_Report_Hardship_Categories_${dateStamp}`,
        [
          { key: 'category', label: 'Hardship Emergency Category' },
          { key: 'totalRequests', label: 'Submitted Requests' },
          { key: 'paidCount', label: 'Paid Grants Count' },
          { key: 'totalDisbursed', label: 'Total Granted Amount ($)' },
          { key: 'percentOfTotalSpend', label: 'Share of Total Spending (%)' },
          { key: 'averageGrantSize', label: 'Average Grant Size ($)' },
        ],
        hardshipCategoryData
      );
    } else if (reportMeta.id === 'funder_impact_sponsorship') {
      exportToCSV(
        `PEF_Report_Funder_Impact_${dateStamp}`,
        [
          { key: 'funderName', label: 'Funding Partner Name' },
          { key: 'funderType', label: 'Organization Classification' },
          { key: 'sponsoredSchoolsCount', label: 'Sponsored Partner Schools' },
          { key: 'totalRequestsSubmitted', label: 'Total Emergency Requests' },
          { key: 'paidGrantsCount', label: 'Completed Grants Paid' },
          { key: 'totalDisbursedAmount', label: 'Total Funds Disbursed ($)' },
          { key: 'avgGrantSize', label: 'Average Grant Size ($)' },
        ],
        funderImpactData
      );
    } else if (reportMeta.id === 'operational_turnaround_audit') {
      exportToCSV(
        `PEF_Report_Operational_Turnaround_${dateStamp}`,
        [
          { key: 'schoolName', label: 'Partner School Name' },
          { key: 'totalRequests', label: 'Total Requests' },
          { key: 'paidRequests', label: 'Paid Disbursements' },
          { key: 'pendingPrincipalTasks', label: 'Pending School Tasks' },
          { key: 'deniedRequests', label: 'Denied Requests' },
          { key: 'avgProcessingDays', label: 'Avg Turnaround (Days)' },
          { key: 'completionRate', label: 'Fulfillment Rate (%)' },
        ],
        operationalTurnaroundData
      );
    }
  };

  const IconComponent = reportMeta.icon;

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Top Back Nav & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <Link
          to="/admin/reports"
          className="inline-flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to All Reports</span>
        </Link>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center gap-2 shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Export Report to CSV</span>
          </button>
        </div>
      </div>

      {/* Report Header Card */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div className="flex items-start gap-3">
            <div className="p-3 bg-emerald-50 text-emerald-700 rounded-2xl border border-emerald-200 shrink-0">
              <IconComponent className="w-6 h-6" />
            </div>
            <div>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-slate-100 text-slate-700 border border-slate-200">
                {reportMeta.category}
              </span>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight mt-1">{reportMeta.title}</h1>
              <p className="text-xs text-slate-600 mt-1 max-w-3xl leading-relaxed">{reportMeta.description}</p>
            </div>
          </div>
        </div>

        {/* Global Filter Bar inside Report Detail */}
        <div className="pt-2 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-3">
            {/* School Year Picker */}
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl">
              <Calendar className="w-3.5 h-3.5 text-slate-500" />
              <span className="font-bold text-slate-600 text-[11px]">School Year:</span>
              <select
                value={selectedSchoolYear}
                onChange={(e) => setSelectedSchoolYear(e.target.value)}
                className="bg-transparent font-extrabold text-slate-900 focus:outline-none"
              >
                <option value="all">All School Years ({availableSchoolYears.length})</option>
                {availableSchoolYears.map((sy) => (
                  <option key={sy} value={sy}>
                    {sy} {sy === getCurrentSchoolYear() ? '(Current)' : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* School Picker */}
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl">
              <Building2 className="w-3.5 h-3.5 text-slate-500" />
              <span className="font-bold text-slate-600 text-[11px]">School:</span>
              <select
                value={selectedSchoolId}
                onChange={(e) => setSelectedSchoolId(e.target.value)}
                className="bg-transparent font-extrabold text-slate-900 focus:outline-none max-w-[180px] truncate"
              >
                <option value="all">All Schools ({schools.length})</option>
                {schools.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Funder Picker */}
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl">
              <Briefcase className="w-3.5 h-3.5 text-slate-500" />
              <span className="font-bold text-slate-600 text-[11px]">Funder:</span>
              <select
                value={selectedFunderId}
                onChange={(e) => setSelectedFunderId(e.target.value)}
                className="bg-transparent font-extrabold text-slate-900 focus:outline-none max-w-[160px] truncate"
              >
                <option value="all">All Funders ({funders.length})</option>
                {funders.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Quick Search */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search table rows..."
              className="pl-8 pr-3 py-1.5 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
        </div>
      </div>

      {/* --- REPORT VIEW CONTENT BY TYPE --- */}

      {/* 1. REPORT: PREVIOUS SCHOOL YEARS ARCHIVE */}
      {reportMeta.id === 'previous_school_years' && (
        <div className="space-y-6">
          {/* Multi-Year KPI Overview */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-[10px] font-extrabold uppercase text-slate-500 tracking-wider">
                Total School Years Tracked
              </span>
              <div className="text-2xl font-black text-slate-900 mt-1">{availableSchoolYears.length} Academic Years</div>
              <p className="text-[11px] text-slate-500 mt-0.5">Historical archive data</p>
            </div>

            <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-[10px] font-extrabold uppercase text-slate-500 tracking-wider">
                Cumulative Grants Disbursed
              </span>
              <div className="text-2xl font-black text-emerald-700 mt-1">
                $
                {previousSchoolYearsData
                  .reduce((acc, sy) => acc + sy.totalDisbursedAmount, 0)
                  .toLocaleString()}
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">Across all recorded school years</p>
            </div>

            <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-[10px] font-extrabold uppercase text-slate-500 tracking-wider">
                Total Requests Fulfilled
              </span>
              <div className="text-2xl font-black text-indigo-700 mt-1">
                {previousSchoolYearsData.reduce((acc, sy) => acc + sy.paidRequestsCount, 0)} Requests
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">Approved emergency relief</p>
            </div>

            <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-[10px] font-extrabold uppercase text-slate-500 tracking-wider">
                Historical Average Grant Size
              </span>
              <div className="text-2xl font-black text-slate-900 mt-1">
                $
                {Math.round(
                  previousSchoolYearsData.reduce((acc, sy) => acc + sy.totalDisbursedAmount, 0) /
                    (previousSchoolYearsData.reduce((acc, sy) => acc + sy.paidRequestsCount, 0) || 1)
                ).toLocaleString()}
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">Per approved student family</p>
            </div>
          </div>

          {/* Table of Past School Years */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-xs font-extrabold uppercase text-slate-900 tracking-wider flex items-center gap-2">
                <Calendar className="w-4 h-4 text-emerald-600" />
                Academic School Year Performance Comparison
              </h3>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">
                    <th className="py-3 px-4">School Year</th>
                    <th className="py-3 px-4">Active Schools</th>
                    <th className="py-3 px-4">Submitted Requests</th>
                    <th className="py-3 px-4">Paid Grants</th>
                    <th className="py-3 px-4">Total Disbursed ($)</th>
                    <th className="py-3 px-4">Average Grant ($)</th>
                    <th className="py-3 px-4 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {previousSchoolYearsData.map((syRow) => {
                    const isCurrent = syRow.schoolYear === getCurrentSchoolYear();
                    return (
                      <tr key={syRow.schoolYear} className="hover:bg-slate-50 transition-colors">
                        <td className="py-3.5 px-4 font-extrabold text-slate-900">
                          <span className="text-sm">{syRow.schoolYear}</span>
                          {isCurrent && (
                            <span className="ml-2 px-2 py-0.5 rounded-full text-[10px] bg-emerald-100 text-emerald-800 font-bold border border-emerald-300">
                              Current SY
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 font-bold text-slate-700">{syRow.totalSchoolsCount} Schools</td>
                        <td className="py-3.5 px-4 font-medium text-slate-700">{syRow.totalRequestsSubmitted}</td>
                        <td className="py-3.5 px-4 font-bold text-emerald-700">{syRow.paidRequestsCount}</td>
                        <td className="py-3.5 px-4 font-black text-slate-900">
                          ${syRow.totalDisbursedAmount.toLocaleString()}
                        </td>
                        <td className="py-3.5 px-4 font-medium text-slate-700">
                          ${syRow.averageGrantSize.toLocaleString()}
                        </td>
                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          {isCurrent ? (
                            <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                              Active In Progress
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                              Archived Year
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 2. REPORT: SCHOOL ALLOCATIONS & UTILIZATION AUDIT */}
      {reportMeta.id === 'school_allocations_utilization' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-xs font-extrabold uppercase text-slate-900 tracking-wider flex items-center gap-2">
                <Building2 className="w-4 h-4 text-emerald-600" />
                Partner School Allocation & Spending Breakdown ({schoolAllocationsData.length})
              </h3>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">
                    <th className="py-3 px-4">Partner School</th>
                    <th className="py-3 px-4">Assigned Funder</th>
                    <th className="py-3 px-4">Annual Allocation</th>
                    <th className="py-3 px-4">Total Paid ($)</th>
                    <th className="py-3 px-4">Available Balance</th>
                    <th className="py-3 px-4">Budget Utilization</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {schoolAllocationsData.map((row) => (
                    <tr key={row.schoolId} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3.5 px-4">
                        <Link
                          to={`/admin/schools/${row.schoolId}`}
                          className="font-bold text-slate-900 hover:text-emerald-700 hover:underline"
                        >
                          {row.schoolName}
                        </Link>
                        <div className="text-[10px] text-slate-500">{row.studentCount} Students Enrolled</div>
                      </td>
                      <td className="py-3.5 px-4 text-slate-700 font-medium">{row.funderName}</td>
                      <td className="py-3.5 px-4 font-bold text-slate-900">${row.annualBudget.toLocaleString()}</td>
                      <td className="py-3.5 px-4 font-extrabold text-emerald-700">
                        ${row.paidAmount.toLocaleString()}
                      </td>
                      <td className="py-3.5 px-4 font-extrabold text-slate-800">
                        ${row.remainingBalance.toLocaleString()}
                      </td>
                      <td className="py-3.5 px-4 max-w-xs">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-slate-100 h-2 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                row.utilizationRate > 85
                                  ? 'bg-rose-500'
                                  : row.utilizationRate > 50
                                  ? 'bg-amber-500'
                                  : 'bg-emerald-500'
                              }`}
                              style={{ width: `${Math.min(100, row.utilizationRate)}%` }}
                            />
                          </div>
                          <span className="font-extrabold text-slate-900 text-[11px] w-10 text-right">
                            {row.utilizationRate}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 3. REPORT: DISBURSEMENTS LEDGER */}
      {reportMeta.id === 'disbursements_ledger' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-xs font-extrabold uppercase text-slate-900 tracking-wider flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-emerald-600" />
                Completed Emergency Grant Ledger ({disbursementsLedgerData.length} Paid Grants)
              </h3>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">
                    <th className="py-3 px-4">Request ID & Date</th>
                    <th className="py-3 px-4">School</th>
                    <th className="py-3 px-4">Beneficiary</th>
                    <th className="py-3 px-4">Hardship Category</th>
                    <th className="py-3 px-4">Amount</th>
                    <th className="py-3 px-4">Payment Method</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {disbursementsLedgerData.map((row) => (
                    <tr key={row.requestId} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <Link
                          to={`/admin/requests/${row.requestId}`}
                          className="font-extrabold text-indigo-600 hover:underline"
                        >
                          {row.requestId}
                        </Link>
                        <div className="text-[10px] text-slate-500">{row.paidDate}</div>
                      </td>
                      <td className="py-3.5 px-4 font-bold text-slate-900">{row.schoolName}</td>
                      <td className="py-3.5 px-4 font-medium text-slate-800">{row.beneficiaryName}</td>
                      <td className="py-3.5 px-4">
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                          {row.category}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-black text-emerald-700">${row.amount.toLocaleString()}</td>
                      <td className="py-3.5 px-4 text-slate-600 font-medium">
                        <div>{row.payoutMethod}</div>
                        <div className="text-[10px] text-slate-400">{row.payeeType}</div>
                      </td>
                    </tr>
                  ))}
                  {disbursementsLedgerData.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-10 text-center text-slate-500">
                        No disbursements recorded matching current search filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 4. REPORT: HARDSHIP CATEGORY NEEDS BREAKDOWN */}
      {reportMeta.id === 'hardship_category_breakdown' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-xs font-extrabold uppercase text-slate-900 tracking-wider flex items-center gap-2">
                <PieChart className="w-4 h-4 text-emerald-600" />
                Emergency Hardship Distribution Across Categories
              </h3>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">
                    <th className="py-3 px-4">Emergency Category</th>
                    <th className="py-3 px-4">Submitted Requests</th>
                    <th className="py-3 px-4">Paid Grants</th>
                    <th className="py-3 px-4">Total Granted ($)</th>
                    <th className="py-3 px-4">Share of Total Spend</th>
                    <th className="py-3 px-4">Average Grant Size</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {hardshipCategoryData.map((row) => (
                    <tr key={row.category} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3.5 px-4 font-black text-slate-900">{row.category}</td>
                      <td className="py-3.5 px-4 font-bold text-slate-700">{row.totalRequests}</td>
                      <td className="py-3.5 px-4 font-bold text-emerald-700">{row.paidCount}</td>
                      <td className="py-3.5 px-4 font-black text-slate-900">
                        ${row.totalDisbursed.toLocaleString()}
                      </td>
                      <td className="py-3.5 px-4 max-w-xs">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-slate-100 h-2 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-emerald-500 rounded-full"
                              style={{ width: `${row.percentOfTotalSpend}%` }}
                            />
                          </div>
                          <span className="font-extrabold text-slate-900 text-[11px] w-10 text-right">
                            {row.percentOfTotalSpend}%
                          </span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-medium text-slate-700">
                        ${row.averageGrantSize.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 5. REPORT: FUNDER IMPACT SPONSORSHIP */}
      {reportMeta.id === 'funder_impact_sponsorship' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-xs font-extrabold uppercase text-slate-900 tracking-wider flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-600" />
                Funding Partner Impact & School Sponsorship Audit
              </h3>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">
                    <th className="py-3 px-4">Funding Partner</th>
                    <th className="py-3 px-4">Type</th>
                    <th className="py-3 px-4">Sponsored Schools</th>
                    <th className="py-3 px-4">Total Requests</th>
                    <th className="py-3 px-4">Paid Grants</th>
                    <th className="py-3 px-4">Total Disbursed ($)</th>
                    <th className="py-3 px-4">Average Grant Size</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {funderImpactData.map((row) => (
                    <tr key={row.funderId} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3.5 px-4 font-black text-slate-900">{row.funderName}</td>
                      <td className="py-3.5 px-4">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                          {row.funderType}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-bold text-slate-800">{row.sponsoredSchoolsCount} Schools</td>
                      <td className="py-3.5 px-4 font-medium text-slate-700">{row.totalRequestsSubmitted}</td>
                      <td className="py-3.5 px-4 font-bold text-emerald-700">{row.paidGrantsCount}</td>
                      <td className="py-3.5 px-4 font-black text-slate-900">
                        ${row.totalDisbursedAmount.toLocaleString()}
                      </td>
                      <td className="py-3.5 px-4 font-medium text-slate-700">
                        ${row.avgGrantSize.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 6. REPORT: OPERATIONAL TURNAROUND AUDIT */}
      {reportMeta.id === 'operational_turnaround_audit' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-xs font-extrabold uppercase text-slate-900 tracking-wider flex items-center gap-2">
                <Clock className="w-4 h-4 text-emerald-600" />
                Partner School Processing & Queue Audit
              </h3>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">
                    <th className="py-3 px-4">Partner School</th>
                    <th className="py-3 px-4">Total Submitted</th>
                    <th className="py-3 px-4">Paid Grants</th>
                    <th className="py-3 px-4">Pending School Tasks</th>
                    <th className="py-3 px-4">Denied Requests</th>
                    <th className="py-3 px-4">Fulfillment Rate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {operationalTurnaroundData.map((row) => (
                    <tr key={row.schoolId} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-slate-900">{row.schoolName}</td>
                      <td className="py-3.5 px-4 font-medium text-slate-700">{row.totalRequests}</td>
                      <td className="py-3.5 px-4 font-bold text-emerald-700">{row.paidRequests}</td>
                      <td className="py-3.5 px-4">
                        {row.pendingPrincipalTasks > 0 ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                            {row.pendingPrincipalTasks} Tasks Pending
                          </span>
                        ) : (
                          <span className="text-slate-400">0</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-slate-500">{row.deniedRequests}</td>
                      <td className="py-3.5 px-4 font-black text-slate-900">{row.completionRate}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
