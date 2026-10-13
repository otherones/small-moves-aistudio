import React, { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  BarChart3,
  Search,
  Filter,
  Download,
  Calendar,
  Building2,
  DollarSign,
  PieChart,
  TrendingUp,
  Clock,
  ChevronRight,
  FileSpreadsheet,
  ArrowUpRight,
  CheckCircle2,
  ShieldCheck,
  RefreshCw,
  MoreVertical,
} from 'lucide-react';
import { EmergencyRequest, School, Funder, PortalSettings, BudgetTransaction } from '../../types';
import { getCurrentSchoolYear, getAvailableSchoolYears, getSchoolYearForDate } from '../../utils/schoolYear';
import { exportToCSV } from '../../utils/csvExport';

export interface ReportMeta {
  id: string;
  title: string;
  category: 'School Year Archives' | 'Financial & Budget' | 'Impact & Need Analysis' | 'Operational Audit';
  description: string;
  icon: React.ElementType;
  recommendedRole: string;
  lastUpdated: string;
}

export const REPORTS_REGISTRY: ReportMeta[] = [
  {
    id: 'previous_school_years',
    title: 'Previous School Years Archive & Multi-Year Comparison',
    category: 'School Year Archives',
    description:
      'Multi-year historical comparison of annual budget allocations, total disbursements, request approval counts, and year-over-year growth across previous school years.',
    icon: Calendar,
    recommendedRole: 'Executive / Board / Finance',
    lastUpdated: 'Live Data',
  },
  {
    id: 'school_allocations_utilization',
    title: 'School Allocations & Budget Utilization Audit',
    category: 'Financial & Budget',
    description:
      'Detailed audit of every partner school showing annual grant allocation, reserved funds, total spent, remaining balance, and budget utilization percentage.',
    icon: Building2,
    recommendedRole: 'Program Ops & Finance',
    lastUpdated: 'Live Data',
  },
  {
    id: 'disbursements_ledger',
    title: 'Emergency Relief Grant Disbursements Ledger',
    category: 'Financial & Budget',
    description:
      'Complete itemized ledger of all paid emergency relief disbursements, including beneficiary category, payee details, payout method, and funder backing.',
    icon: DollarSign,
    recommendedRole: 'Finance & Bookkeeping',
    lastUpdated: 'Live Data',
  },
  {
    id: 'hardship_category_breakdown',
    title: 'Hardship & Emergency Category Needs Analysis',
    category: 'Impact & Need Analysis',
    description:
      'Distribution of emergency funding across hardship categories (Rent, Utilities, Food, Medical, Transportation, Supplies) with average grant sizes.',
    icon: PieChart,
    recommendedRole: 'Program Impact & Strategy',
    lastUpdated: 'Live Data',
  },
  {
    id: 'funder_impact_sponsorship',
    title: 'Funder Grant Pool & Impact Sponsorship Report',
    category: 'Impact & Need Analysis',
    description:
      'Audit per funding partner detailing sponsored partner schools, total grant pool commitments, disbursed funds to families, and unallocated reserves.',
    icon: TrendingUp,
    recommendedRole: 'Development / Funder Relations',
    lastUpdated: 'Live Data',
  },
  {
    id: 'operational_turnaround_audit',
    title: 'Request Turnaround & Operational Efficiency Audit',
    category: 'Operational Audit',
    description:
      'Operational performance metrics analyzing average review speeds, principal response delays, queue bottlenecks, and resolution turnaround times.',
    icon: Clock,
    recommendedRole: 'Program Ops Lead',
    lastUpdated: 'Live Data',
  },
];

interface AdminReportsListProps {
  requests: EmergencyRequest[];
  schools: School[];
  funders: Funder[];
  settings: PortalSettings;
}

export const AdminReportsList: React.FC<AdminReportsListProps> = ({
  requests,
  schools,
  funders,
}) => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [selectedSchoolYear, setSelectedSchoolYear] = useState<string>('all');
  const [openMenuReportId, setOpenMenuReportId] = useState<string | null>(null);

  const availableSchoolYears = useMemo(() => getAvailableSchoolYears(requests), [requests]);

  // Filter reports
  const filteredReports = useMemo(() => {
    return REPORTS_REGISTRY.filter((report) => {
      if (categoryFilter !== 'all' && report.category !== categoryFilter) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = report.title.toLowerCase().includes(q);
        const matchesDesc = report.description.toLowerCase().includes(q);
        const matchesCat = report.category.toLowerCase().includes(q);
        if (!matchesTitle && !matchesDesc && !matchesCat) return false;
      }
      return true;
    });
  }, [categoryFilter, searchQuery]);

  // Summary Metrics for Header
  const totalSchools = schools.length;
  const totalPaidRequests = requests.filter((r) => r.status === 'paid');
  const totalDisbursed = totalPaidRequests.reduce((sum, r) => sum + r.amount, 0);

  // Quick Export Function for direct table row CSV click
  const handleQuickExportCSV = (reportId: string, e: React.MouseEvent) => {
    e.stopPropagation();

    if (reportId === 'previous_school_years') {
      const syList = availableSchoolYears;
      const exportData = syList.map((sy) => {
        const syReqs = requests.filter((r) => getSchoolYearForDate(r.createdAt) === sy);
        const syPaid = syReqs.filter((r) => r.status === 'paid');
        const syDisbursed = syPaid.reduce((acc, r) => acc + r.amount, 0);
        return {
          schoolYear: sy,
          totalRequests: syReqs.length,
          paidRequests: syPaid.length,
          totalDisbursed: syDisbursed,
          avgGrant: syPaid.length > 0 ? Math.round(syDisbursed / syPaid.length) : 0,
        };
      });
      exportToCSV(
        `PEF_Report_Previous_School_Years_${new Date().toISOString().slice(0, 10)}`,
        [
          { key: 'schoolYear', label: 'School Year' },
          { key: 'totalRequests', label: 'Total Requests' },
          { key: 'paidRequests', label: 'Paid Requests' },
          { key: 'totalDisbursed', label: 'Total Disbursed ($)' },
          { key: 'avgGrant', label: 'Average Grant ($)' },
        ],
        exportData
      );
    } else if (reportId === 'school_allocations_utilization') {
      const exportData = schools.map((s) => {
        const sPaid = requests
          .filter((r) => r.schoolId === s.id && r.status === 'paid')
          .reduce((acc, r) => acc + r.amount, 0);
        const utilPct = s.annualBudget > 0 ? Math.round((sPaid / s.annualBudget) * 100) : 0;
        return {
          schoolName: s.name,
          funderName: s.funderName || 'Unassigned',
          studentCount: s.studentCount,
          annualBudget: s.annualBudget,
          budgetPaid: sPaid,
          budgetAvailable: Math.max(0, s.annualBudget - sPaid),
          utilizationPercentage: `${utilPct}%`,
          status: s.status,
        };
      });
      exportToCSV(
        `PEF_Report_School_Allocations_${new Date().toISOString().slice(0, 10)}`,
        [
          { key: 'schoolName', label: 'School Name' },
          { key: 'funderName', label: 'Assigned Funder' },
          { key: 'studentCount', label: 'Students Enrolled' },
          { key: 'annualBudget', label: 'Annual Budget ($)' },
          { key: 'budgetPaid', label: 'Total Paid ($)' },
          { key: 'budgetAvailable', label: 'Available Balance ($)' },
          { key: 'utilizationPercentage', label: 'Budget Utilization' },
          { key: 'status', label: 'School Status' },
        ],
        exportData
      );
    } else if (reportId === 'disbursements_ledger') {
      const paidReqs = requests.filter((r) => r.status === 'paid');
      const exportData = paidReqs.map((r) => ({
        requestId: r.id,
        paidDate: r.payoutDetails?.paidAt ? r.payoutDetails.paidAt.slice(0, 10) : r.updatedAt.slice(0, 10),
        schoolName: r.schoolName,
        beneficiaryName: r.beneficiaryName,
        category: r.category,
        amount: r.amount,
        payeeType: r.payoutDetails?.payeeType === 'third_party' ? 'Third Party' : 'Direct Beneficiary',
        payoutMethod: r.payoutDetails?.payoutMethodName || 'Direct Payment',
        schoolYear: getSchoolYearForDate(r.createdAt),
      }));
      exportToCSV(
        `PEF_Report_Disbursements_Ledger_${new Date().toISOString().slice(0, 10)}`,
        [
          { key: 'requestId', label: 'Request ID' },
          { key: 'paidDate', label: 'Disbursement Date' },
          { key: 'schoolName', label: 'School Name' },
          { key: 'beneficiaryName', label: 'Beneficiary Name' },
          { key: 'category', label: 'Emergency Hardship Category' },
          { key: 'amount', label: 'Amount ($)' },
          { key: 'payeeType', label: 'Payee Type' },
          { key: 'payoutMethod', label: 'Payment Method' },
          { key: 'schoolYear', label: 'School Year' },
        ],
        exportData
      );
    } else if (reportId === 'hardship_category_breakdown') {
      const categoriesMap: Record<string, { count: number; totalAmount: number }> = {};
      requests.forEach((r) => {
        if (!categoriesMap[r.category]) {
          categoriesMap[r.category] = { count: 0, totalAmount: 0 };
        }
        categoriesMap[r.category].count += 1;
        if (r.status === 'paid') {
          categoriesMap[r.category].totalAmount += r.amount;
        }
      });
      const exportData = Object.entries(categoriesMap).map(([cat, val]) => ({
        category: cat,
        totalRequests: val.count,
        totalDisbursed: val.totalAmount,
        avgGrantSize: val.count > 0 ? Math.round(val.totalAmount / val.count) : 0,
      }));
      exportToCSV(
        `PEF_Report_Hardship_Categories_${new Date().toISOString().slice(0, 10)}`,
        [
          { key: 'category', label: 'Hardship Category' },
          { key: 'totalRequests', label: 'Total Requests' },
          { key: 'totalDisbursed', label: 'Total Disbursed ($)' },
          { key: 'avgGrantSize', label: 'Average Grant Size ($)' },
        ],
        exportData
      );
    } else if (reportId === 'funder_impact_sponsorship') {
      const exportData = funders.map((f) => {
        const sponsored = schools.filter((s) => s.funderId === f.id || f.associatedSchoolIds.includes(s.id));
        const sponsoredIds = new Set(sponsored.map((s) => s.id));
        const funderReqs = requests.filter((r) => sponsoredIds.has(r.schoolId));
        const funderPaid = funderReqs.filter((r) => r.status === 'paid');
        const totalPaidAmount = funderPaid.reduce((acc, r) => acc + r.amount, 0);
        return {
          funderName: f.name,
          funderType: f.type,
          sponsoredSchoolsCount: sponsored.length,
          totalRequests: funderReqs.length,
          paidRequestsCount: funderPaid.length,
          totalDisbursedAmount: totalPaidAmount,
        };
      });
      exportToCSV(
        `PEF_Report_Funder_Impact_${new Date().toISOString().slice(0, 10)}`,
        [
          { key: 'funderName', label: 'Funder Name' },
          { key: 'funderType', label: 'Funder Type' },
          { key: 'sponsoredSchoolsCount', label: 'Sponsored Partner Schools' },
          { key: 'totalRequests', label: 'Submitted Requests' },
          { key: 'paidRequestsCount', label: 'Paid Grants' },
          { key: 'totalDisbursedAmount', label: 'Total Disbursed ($)' },
        ],
        exportData
      );
    } else {
      // General report navigation fallback
      navigate(`/admin/reports/${reportId}`);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Page Title & Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-emerald-700 uppercase tracking-wider mb-1">
            <BarChart3 className="w-4 h-4 text-emerald-600" />
            <span>Administrator Portal & Reporting Suite</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">System Data Reports</h1>
          <p className="text-xs text-slate-500 mt-1 max-w-2xl">
            Access, analyze, and export comprehensive administrative reports including historical school year archives,
            annual budget allocations, emergency grant ledgers, and funder impact metrics.
          </p>
        </div>

        {/* Global Summary Badge Box */}
        <div className="flex items-center gap-4 bg-slate-50 border border-slate-200 p-3.5 rounded-xl shrink-0">
          <div>
            <div className="text-[10px] font-bold text-slate-500 uppercase">Partner Schools</div>
            <div className="text-base font-extrabold text-slate-900">{totalSchools}</div>
          </div>
          <div className="w-px h-8 bg-slate-200" />
          <div>
            <div className="text-[10px] font-bold text-slate-500 uppercase">Total Grants Paid</div>
            <div className="text-base font-extrabold text-emerald-700">${totalDisbursed.toLocaleString()}</div>
          </div>
          <div className="w-px h-8 bg-slate-200" />
          <div>
            <div className="text-[10px] font-bold text-slate-500 uppercase">Active School Years</div>
            <div className="text-base font-extrabold text-indigo-700">{availableSchoolYears.length} Years</div>
          </div>
        </div>
      </div>

      {/* Featured Highlight Banner: Previous School Year Reports */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-2xl p-6 text-white shadow-xl relative overflow-hidden border border-slate-800">
        <div className="absolute -right-10 -bottom-10 opacity-10 text-white pointer-events-none">
          <Calendar className="w-64 h-64" />
        </div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-[11px] font-extrabold uppercase border border-indigo-500/30">
              <Calendar className="w-3.5 h-3.5" />
              Featured Report
            </span>
            <h2 className="text-xl font-black text-white">Previous School Years Data Archives</h2>
            <p className="text-xs text-slate-300 leading-relaxed">
              Analyze historical school year performance, multi-year spending trends, allocation roll-overs, and
              historical grant disbursements for past academic years (e.g., 2025-2026, 2024-2025).
            </p>
          </div>
          <div className="shrink-0 flex items-center gap-3">
            <Link
              to="/admin/reports/previous_school_years"
              className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black rounded-xl text-xs flex items-center gap-2 shadow-lg shadow-emerald-500/20 transition-transform active:scale-95 cursor-pointer"
            >
              <span>View Past Years Report</span>
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>

      {/* Filter and Search Controls */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search reports by title, keyword, or category..."
            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500">
            <Filter className="w-3.5 h-3.5" />
            <span>Category:</span>
          </div>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
          >
            <option value="all">All Categories ({REPORTS_REGISTRY.length})</option>
            <option value="School Year Archives">School Year Archives</option>
            <option value="Financial & Budget">Financial & Budget</option>
            <option value="Impact & Need Analysis">Impact & Need Analysis</option>
            <option value="Operational Audit">Operational Audit</option>
          </select>
        </div>
      </div>

      {/* Reports Catalog Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <h3 className="text-xs font-extrabold uppercase text-slate-900 tracking-wider">
              Available Administrative Reports ({filteredReports.length})
            </h3>
          </div>
          <span className="text-[11px] text-slate-500 font-medium">Click any row to open report view</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">
                <th className="py-3 px-4">Report Name & Description</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Audience</th>
                <th className="py-3 px-4">Data Source</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredReports.map((report, index) => {
                const Icon = report.icon;
                const isNearBottom = filteredReports.length > 2 && index >= filteredReports.length - 2;
                return (
                  <tr
                    key={report.id}
                    onClick={(e) => {
    if ((e.target as HTMLElement).closest('button') || (e.target as HTMLElement).closest('a')) {
      return;
    }
    navigate(`/admin/reports/${report.id}`);
  }}
                    className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                  >
                    <td className="py-4 px-4 max-w-md">
                      <div className="flex items-start gap-3">
                        <div className="p-2.5 rounded-xl bg-slate-100 group-hover:bg-emerald-50 text-slate-700 group-hover:text-emerald-700 transition-colors shrink-0 mt-0.5">
                          <Icon className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="font-bold text-slate-900 group-hover:text-emerald-800 transition-colors flex items-center gap-1.5">
                            <span>{report.title}</span>
                            <ArrowUpRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity text-emerald-600" />
                          </div>
                          <p className="text-[11px] text-slate-500 mt-1 leading-snug">{report.description}</p>
                        </div>
                      </div>
                    </td>

                    <td className="py-4 px-4 whitespace-nowrap">
                      <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                        {report.category}
                      </span>
                    </td>

                    <td className="py-4 px-4 whitespace-nowrap text-slate-600 font-medium">
                      {report.recommendedRole}
                    </td>

                    <td className="py-4 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-1 text-[11px] font-bold text-emerald-700">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>{report.lastUpdated}</span>
                      </div>
                    </td>

                    <td className="py-4 px-4 whitespace-nowrap text-right">
                      <div className="relative inline-block text-left" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => setOpenMenuReportId(openMenuReportId === report.id ? null : report.id)}
                          className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
                          title="Actions menu"
                          aria-label={`Actions for ${report.title}`}
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>

                        {openMenuReportId === report.id && (
                          <>
                            {/* Backdrop overlay */}
                            <div
                              className="fixed inset-0 z-30"
                              onClick={() => setOpenMenuReportId(null)}
                            />

                            {/* 3-Dot Dropdown Menu */}
                            <div
                              onClick={(e) => e.stopPropagation()}
                              className={`absolute right-0 ${
                                isNearBottom ? 'bottom-full mb-1.5' : 'top-full mt-1.5'
                              } z-40 w-52 bg-white border border-slate-200 rounded-2xl shadow-xl py-1.5 text-left text-xs divide-y divide-slate-100 animate-fade-in`}
                            >
                              <div className="py-1">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setOpenMenuReportId(null);
                                    navigate(`/admin/reports/${report.id}`);
                                  }}
                                  className="w-full px-3.5 py-2 flex items-center gap-2 hover:bg-slate-50 text-slate-700 font-semibold cursor-pointer"
                                >
                                  <ChevronRight className="w-4 h-4 text-slate-400" />
                                  <span>View Detailed Report</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    setOpenMenuReportId(null);
                                    handleQuickExportCSV(report.id, e);
                                  }}
                                  className="w-full px-3.5 py-2 flex items-center gap-2 hover:bg-slate-50 text-slate-700 font-semibold cursor-pointer"
                                >
                                  <Download className="w-4 h-4 text-slate-500" />
                                  <span>Quick Export CSV</span>
                                </button>
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filteredReports.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-500">
                    <p className="font-bold text-sm">No reports match your current search or category filter.</p>
                    <button
                      onClick={() => {
                        setSearchQuery('');
                        setCategoryFilter('all');
                      }}
                      className="mt-2 text-xs text-emerald-600 font-bold hover:underline"
                    >
                      Clear filters
                    </button>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
