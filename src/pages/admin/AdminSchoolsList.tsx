import React, { useState, useMemo, useEffect } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import {
  Building2,
  PlusCircle,
  Search,
  ShieldCheck,
  CheckCircle2,
  ArrowUpRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Clock,
  Mail,
  Copy,
  Check,
  X,
  Trash2,
  AlertTriangle,
  RefreshCw,
  Upload,
  Database,
  MoreVertical,
  ExternalLink,
  FileText,
  Send,
  Eye,
  CreditCard,
  UserPlus,
} from 'lucide-react';
import { School, PortalSettings, PendingInvite, EmergencyRequest, Funder, AppUser, ActivityEvent } from '../../types';
import { renderInviteEmail, PRODUCTION_PORTAL_URL } from '../../utils/emailUtils';
import { computeSchoolBudgetMetrics } from '../../utils/budgetUtils';
import { getCurrentSchoolYear } from '../../utils/schoolYear';
import { ImportPrincipalsModal } from '../../components/admin/ImportPrincipalsModal';

interface AdminSchoolsListProps {
  schools: School[];
  requests?: EmergencyRequest[];
  funders?: Funder[];
  managedUsers?: AppUser[];
  pendingInvites?: PendingInvite[];
  activityLogs?: ActivityEvent[];
  settings?: PortalSettings;
  defaultAnnualBudget?: number;
  currentAdminEmail?: string;
  onCreateInvite?: (invite: Partial<PendingInvite>) => void;
  onDeleteSchool?: (schoolId: string) => Promise<void> | void;
}

type SortField = 'name' | 'principalName' | 'funderName' | 'annualBudget' | 'budgetAvailable' | 'status' | 'currentMouSigned';
type SortDirection = 'asc' | 'desc';

export const AdminSchoolsList: React.FC<AdminSchoolsListProps> = ({
  schools,
  requests = [],
  funders = [],
  managedUsers = [],
  pendingInvites = [],
  activityLogs = [],
  settings,
  currentAdminEmail,
  onCreateInvite,
  onDeleteSchool,
}) => {
  const navigate = useNavigate();
  const currentSY = getCurrentSchoolYear(settings);

  const schoolsWithComputedBudget = useMemo(() => {
    if (!requests || requests.length === 0) return schools;
    return schools.map((s) => {
      const metrics = computeSchoolBudgetMetrics(s, requests, currentSY);
      return {
        ...s,
        budgetPaid: metrics.budgetPaid,
        budgetReserved: metrics.budgetReserved,
        budgetAvailable: metrics.budgetAvailable,
      };
    });
  }, [schools, requests, currentSY]);

  const [searchParams] = useSearchParams();
  const initialFilter = searchParams.get('filter');
  const [mouFilter, setMouFilter] = useState<'all' | 'missing_mou'>(initialFilter === 'missing_mou' ? 'missing_mou' : 'all');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'pending' | 'inactive'>('all');
  const [funderFilter, setFunderFilter] = useState<'all' | 'unassigned' | 'assigned'>('all');

  // Sorting and Pagination State
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);

  // Invite modal state
  const [selectedInviteSchool, setSelectedInviteSchool] = useState<School | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  // Delete School Modal State
  const [schoolToDelete, setSchoolToDelete] = useState<School | null>(null);
  const [isDeletingSchool, setIsDeletingSchool] = useState(false);
  const [isImportPrincipalsModalOpen, setIsImportPrincipalsModalOpen] = useState(false);
  const [openMenuSchoolId, setOpenMenuSchoolId] = useState<string | null>(null);
  const [inviteCopiedToast, setInviteCopiedToast] = useState(false);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, funderFilter]);

  const unassignedCount = useMemo(() => {
    return schoolsWithComputedBudget.filter(
      (s) => !s.funderId || !s.funderName || s.funderName === 'Direct' || s.funderName === 'Unassigned'
    ).length;
  }, [schoolsWithComputedBudget]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection(field === 'annualBudget' || field === 'budgetAvailable' ? 'desc' : 'asc');
    }
    setCurrentPage(1);
  };

  const filtered = useMemo(() => {
    return schoolsWithComputedBudget.filter((s) => {
      if (mouFilter === 'missing_mou' && s.currentMouSigned) {
        return false;
      }
      if (statusFilter === 'active' && s.status !== 'active') return false;
      if (statusFilter === 'pending' && s.status !== 'pending' && s.status !== 'invited') return false;
      if (statusFilter === 'inactive' && s.status !== 'inactive') return false;

      const isAssigned = Boolean(
        s.funderId && s.funderName && s.funderName !== 'Direct' && s.funderName !== 'Unassigned'
      );
      if (funderFilter === 'unassigned' && isAssigned) return false;
      if (funderFilter === 'assigned' && !isAssigned) return false;

      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        s.name.toLowerCase().includes(q) ||
        (s.principalName && s.principalName.toLowerCase().includes(q)) ||
        (s.principalEmail && s.principalEmail.toLowerCase().includes(q)) ||
        (s.funderName && s.funderName.toLowerCase().includes(q)) ||
        (s.city && s.city.toLowerCase().includes(q))
      );
    });
  }, [schoolsWithComputedBudget, mouFilter, statusFilter, funderFilter, searchQuery]);

  const sortedSchools = useMemo(() => {
    return [...filtered].sort((a, b) => {
      let aVal: any;
      let bVal: any;

      switch (sortField) {
        case 'name':
          aVal = a.name.toLowerCase();
          bVal = b.name.toLowerCase();
          break;
        case 'principalName':
          aVal = (a.principalName || '').toLowerCase();
          bVal = (b.principalName || '').toLowerCase();
          break;
        case 'funderName':
          aVal = (a.funderName || '').toLowerCase();
          bVal = (b.funderName || '').toLowerCase();
          break;
        case 'annualBudget':
          aVal = a.annualBudget || 0;
          bVal = b.annualBudget || 0;
          break;
        case 'budgetAvailable':
          aVal = a.budgetAvailable || 0;
          bVal = b.budgetAvailable || 0;
          break;
        case 'status':
          aVal = a.status || '';
          bVal = b.status || '';
          break;
        case 'currentMouSigned':
          aVal = a.currentMouSigned ? 1 : 0;
          bVal = b.currentMouSigned ? 1 : 0;
          break;
        default:
          aVal = 0;
          bVal = 0;
      }

      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filtered, sortField, sortDirection]);

  const totalPages = Math.ceil(sortedSchools.length / pageSize) || 1;
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);

  const startIndex = (safeCurrentPage - 1) * pageSize;
  const paginatedSchools = useMemo(() => {
    return sortedSchools.slice(startIndex, startIndex + pageSize);
  }, [sortedSchools, startIndex, pageSize]);

  const confirmDeleteSchool = async () => {
    if (!schoolToDelete || !onDeleteSchool) return;
    setIsDeletingSchool(true);
    try {
      await onDeleteSchool(schoolToDelete.id);
      setSchoolToDelete(null);
    } catch (err) {
      console.error('Failed to delete school:', err);
    } finally {
      setIsDeletingSchool(false);
    }
  };

  const renderSortHeader = (label: string, field: SortField, alignRight = false) => {
    const isSorted = sortField === field;
    return (
      <th className={`py-3.5 px-4 select-none ${alignRight ? 'text-right' : ''}`}>
        <button
          type="button"
          onClick={() => handleSort(field)}
          className={`inline-flex items-center gap-1.5 hover:text-slate-900 transition-colors cursor-pointer group font-semibold uppercase tracking-wider text-xs ${
            alignRight ? 'justify-end w-full' : ''
          } ${isSorted ? 'text-slate-900' : 'text-slate-500'}`}
        >
          <span>{label}</span>
          <span className="text-slate-400 group-hover:text-slate-700">
            {isSorted ? (
              sortDirection === 'asc' ? (
                <ArrowUp className="w-3.5 h-3.5 text-[#0089B3] font-bold" />
              ) : (
                <ArrowDown className="w-3.5 h-3.5 text-[#0089B3] font-bold" />
              )
            ) : (
              <ArrowUpDown className="w-3 h-3 opacity-40 group-hover:opacity-100" />
            )}
          </span>
        </button>
      </th>
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
            PARTNER SCHOOLS DIRECTORY
          </h1>
          <p className="text-xs text-slate-500 mt-0.5 font-normal">
            Managing {schools.length} total partner schools and their emergency budget allocations
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setIsImportPrincipalsModalOpen(true)}
            className="px-4 py-2.5 bg-white hover:bg-slate-50 text-slate-700 font-medium rounded-xl text-xs border border-slate-300 shadow-2xs flex items-center gap-2 transition-colors cursor-pointer"
          >
            <Mail className="w-4 h-4 text-emerald-600" />
            Import Principals & Queue Invites
          </button>

          <Link
            to="/admin/schools/new"
            className="px-5 py-2.5 bg-[#0089B3] hover:bg-[#006E8F] text-white font-medium rounded-xl text-xs shadow-xs flex items-center gap-2 transition-colors cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            Add New School
          </Link>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1 overflow-x-auto">
            {[
              { id: 'all', label: 'All Schools', count: schools.length },
              { id: 'active', label: 'Active', count: schools.filter((s) => s.status === 'active').length },
              { id: 'pending', label: 'Pending', count: schools.filter((s) => s.status === 'pending' || s.status === 'invited').length },
              { id: 'inactive', label: 'Inactive', count: schools.filter((s) => s.status === 'inactive').length },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id as any)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-colors whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
                  statusFilter === tab.id
                    ? 'bg-[#0F172A] text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <span>{tab.label}</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${statusFilter === tab.id ? 'bg-[#0089B3] text-white font-bold' : 'bg-slate-200 text-slate-700'}`}>
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          <div className="h-5 w-px bg-slate-200 hidden lg:block" />

          {/* Funder Filter Dropdown */}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Funder:</span>
            <select
              value={funderFilter}
              onChange={(e) => setFunderFilter(e.target.value as any)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-hidden focus:border-[#0089B3] focus:ring-1 focus:ring-[#0089B3] cursor-pointer"
            >
              <option value="all">All Funder Assignments</option>
              <option value="unassigned">⚠️ Unassigned ({unassignedCount})</option>
              <option value="assigned">Assigned ({schools.length - unassignedCount})</option>
            </select>
          </div>
          <div className="flex items-center gap-1.5 ml-2">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">MOU:</span>
            <select
              value={mouFilter}
              onChange={(e) => setMouFilter(e.target.value as any)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-hidden focus:border-[#0089B3] focus:ring-1 focus:ring-[#0089B3] cursor-pointer"
            >
              <option value="all">All</option>
              <option value="missing_mou">Missing</option>
            </select>
          </div>
        </div>
        <div className="relative min-w-[220px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search school, principal, funder..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-normal focus:outline-hidden focus:border-[#0089B3] focus:ring-1 focus:ring-[#0089B3]"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs">
        <div className="overflow-x-auto min-h-[360px] pb-8">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                {renderSortHeader('School', 'name')}
                {renderSortHeader('Principal', 'principalName')}
                {renderSortHeader('Funder', 'funderName')}
                {renderSortHeader('Annual Budget', 'annualBudget', true)}
                {renderSortHeader('Available', 'budgetAvailable', true)}
                {renderSortHeader('Status', 'status')}
                {renderSortHeader('MOU', 'currentMouSigned')}
                <th className="py-3.5 px-4 text-right uppercase tracking-wider text-xs font-semibold text-slate-500">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedSchools.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <Building2 className="w-10 h-10 mx-auto mb-2 text-slate-300 opacity-60" />
                    <p className="text-sm font-medium text-slate-600">No partner schools found</p>
                    <p className="text-xs text-slate-400 mt-1">
                      {schools.length === 0
                        ? 'Database is clean. Click "+ Add New School" to add your real partner schools.'
                        : 'No schools match your search or filter settings.'}
                    </p>
                  </td>
                </tr>
              ) : (
                paginatedSchools.map((s, index) => {
                  const existingInvite = pendingInvites.find(
                    (inv) => inv.schoolId === s.id && inv.status === 'pending'
                  );
                  const schoolRequestsCount = requests.filter((r) => r.schoolId === s.id).length;
                  const isNearBottom = paginatedSchools.length > 2 && index >= paginatedSchools.length - 2;

                  return (
                    <tr
                      key={s.id}
                      className="hover:bg-slate-50/80 transition-colors group cursor-pointer"
                      onClick={(e) => {
                        if ((e.target as HTMLElement).closest('button') || (e.target as HTMLElement).closest('a')) {
                          return;
                        }
                        navigate(`/admin/schools/${s.id}`);
                      }}
                    >
                      <td className="py-3.5 px-4 font-medium text-slate-900">
                        <Link to={`/admin/schools/${s.id}`} className="hover:text-[#0089B3] hover:underline">
                          {s.name}
                        </Link>
                      </td>
                      <td className="py-3.5 px-4 font-normal text-slate-700">{s.principalName || 'Unassigned'}</td>
                      <td className="py-3.5 px-4 font-normal text-slate-700">
                        {s.funderName && s.funderName !== 'Direct' && s.funderName !== 'Unassigned' ? s.funderName : 'Unassigned'}
                      </td>
                      <td className="py-3.5 px-4 text-right font-normal text-slate-700">${(s.annualBudget || 0).toLocaleString()}</td>
                      <td className="py-3.5 px-4 text-right font-normal text-slate-700">${(s.budgetAvailable || 0).toLocaleString()}</td>
                      <td className="py-3.5 px-4 font-normal text-slate-700 capitalize">
                        {s.status === 'pending' || s.status === 'invited' ? 'Pending' : s.status}
                      </td>
                      <td className="py-3.5 px-4 font-normal text-slate-700">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className={s.currentMouSigned ? 'text-[#006E8F] font-semibold' : 'text-amber-700 font-medium'}>
                            {s.currentMouSigned ? 'Signed & Active' : 'Needs signature'}
                          </span>
                          {s.hasCustomMou && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-[#EDF7FC] text-[#006E8F] border border-[#0089B3]/30">
                              Custom
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="relative inline-block text-left" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            onClick={() => setOpenMenuSchoolId(openMenuSchoolId === s.id ? null : s.id)}
                            className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
                            title="Actions menu"
                            aria-label={`Actions for ${s.name}`}
                          >
                            <MoreVertical className="w-4 h-4" />
                          </button>

                          {openMenuSchoolId === s.id && (
                            <>
                              {/* Backdrop overlay to close when clicking outside */}
                              <div
                                className="fixed inset-0 z-30"
                                onClick={() => setOpenMenuSchoolId(null)}
                              />

                              {/* 3-Dot Dropdown Menu */}
                              <div
                                onClick={(e) => e.stopPropagation()}
                                className={`absolute right-0 ${
                                  isNearBottom ? 'bottom-full mb-1.5' : 'top-full mt-1.5'
                                } z-40 w-56 bg-white border border-slate-200 rounded-2xl shadow-xl py-1.5 text-left text-xs divide-y divide-slate-100 animate-fade-in`}
                              >
                                {/* 1. Details & Requests */}
                                <div className="py-1">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setOpenMenuSchoolId(null);
                                      navigate(`/admin/schools/${s.id}`);
                                    }}
                                    className="w-full flex items-center gap-2 px-3.5 py-1.5 hover:bg-slate-50 text-slate-700 font-medium transition-colors cursor-pointer"
                                  >
                                    <Eye className="w-3.5 h-3.5 text-slate-400" />
                                    <span>View School Details</span>
                                  </button>
                                  {schoolRequestsCount > 0 && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setOpenMenuSchoolId(null);
                                        navigate(`/admin/schools/${s.id}#requests`);
                                      }}
                                      className="w-full flex items-center justify-between px-3.5 py-1.5 hover:bg-slate-50 text-slate-700 font-medium transition-colors cursor-pointer"
                                    >
                                      <div className="flex items-center gap-2">
                                        <CreditCard className="w-3.5 h-3.5 text-slate-400" />
                                        <span>Emergency Requests</span>
                                      </div>
                                      <span className="px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-bold">
                                        {schoolRequestsCount}
                                      </span>
                                    </button>
                                  )}
                                </div>

                                {/* 2. MOU Status-Relevant Actions */}
                                <div className="py-1">
                                  {!s.currentMouSigned ? (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setOpenMenuSchoolId(null);
                                        navigate(`/admin/schools/${s.id}#mou`);
                                      }}
                                      className="w-full flex items-center gap-2 px-3.5 py-1.5 hover:bg-amber-50 text-amber-700 font-medium transition-colors cursor-pointer"
                                    >
                                      <FileText className="w-3.5 h-3.5 text-amber-600" />
                                      <span>Review / Execute MOU</span>
                                    </button>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setOpenMenuSchoolId(null);
                                        navigate(`/admin/schools/${s.id}#mou`);
                                      }}
                                      className="w-full flex items-center gap-2 px-3.5 py-1.5 hover:bg-emerald-50 text-emerald-700 font-medium transition-colors cursor-pointer"
                                    >
                                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                      <span>View Executed MOU</span>
                                    </button>
                                  )}
                                </div>

                                {/* 3. Onboarding & Invite Status-Relevant Actions */}
                                <div className="py-1">
                                  {existingInvite ? (
                                    <>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setOpenMenuSchoolId(null);
                                          setSelectedInviteSchool(s);
                                        }}
                                        className="w-full flex items-center gap-2 px-3.5 py-1.5 hover:bg-slate-50 text-[#006E8F] font-medium transition-colors cursor-pointer"
                                      >
                                        <Mail className="w-3.5 h-3.5 text-[#0089B3]" />
                                        <span>Resend Email Invitation</span>
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setOpenMenuSchoolId(null);
                                          const link = `${PRODUCTION_PORTAL_URL}/setup-account?email=${encodeURIComponent(existingInvite.email)}`;
                                          navigator.clipboard.writeText(link);
                                          setInviteCopiedToast(true);
                                          setTimeout(() => setInviteCopiedToast(false), 2500);
                                        }}
                                        className="w-full flex items-center gap-2 px-3.5 py-1.5 hover:bg-slate-50 text-slate-700 font-medium transition-colors cursor-pointer"
                                      >
                                        <Copy className="w-3.5 h-3.5 text-slate-400" />
                                        <span>Copy Setup Link</span>
                                      </button>
                                    </>
                                  ) : s.principalEmail ? (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setOpenMenuSchoolId(null);
                                        setSelectedInviteSchool(s);
                                      }}
                                      className="w-full flex items-center gap-2 px-3.5 py-1.5 hover:bg-slate-50 text-slate-700 font-medium transition-colors cursor-pointer"
                                    >
                                      <Send className="w-3.5 h-3.5 text-[#0089B3]" />
                                      <span>
                                        {s.status === 'active' ? 'Manage Principal Invitation' : 'Send Principal Invitation'}
                                      </span>
                                    </button>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setOpenMenuSchoolId(null);
                                        navigate(`/admin/schools/${s.id}`);
                                      }}
                                      className="w-full flex items-center gap-2 px-3.5 py-1.5 hover:bg-amber-50 text-amber-700 font-medium transition-colors cursor-pointer"
                                    >
                                      <UserPlus className="w-3.5 h-3.5 text-amber-600" />
                                      <span>Assign Principal Contact</span>
                                    </button>
                                  )}
                                </div>

                                {/* 4. Delete Action */}
                                {onDeleteSchool && (
                                  <div className="py-1">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setOpenMenuSchoolId(null);
                                        setSchoolToDelete(s);
                                      }}
                                      className="w-full flex items-center gap-2 px-3.5 py-1.5 hover:bg-rose-50 text-rose-600 font-medium transition-colors cursor-pointer"
                                    >
                                      <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                                      <span>Delete School</span>
                                    </button>
                                  </div>
                                )}
                              </div>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {sortedSchools.length > 0 && (
          <div className="bg-slate-50 border-t border-slate-200 px-4 py-3 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600">
            <div className="flex items-center gap-3">
              <span>
                Showing <span className="font-semibold text-slate-900">{startIndex + 1}</span> to{' '}
                <span className="font-semibold text-slate-900">
                  {Math.min(startIndex + pageSize, sortedSchools.length)}
                </span>{' '}
                of <span className="font-semibold text-slate-900">{sortedSchools.length}</span> schools
              </span>
              <div className="flex items-center gap-1.5 pl-3 border-l border-slate-300">
                <span className="text-slate-500 font-medium">Per page:</span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="bg-white border border-slate-300 rounded-lg px-2 py-1 text-xs font-semibold text-slate-800 shadow-2xs focus:ring-1 focus:ring-[#0089B3] focus:border-[#0089B3] focus:outline-hidden cursor-pointer"
                >
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setCurrentPage(1)}
                disabled={safeCurrentPage === 1}
                className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                title="First Page"
              >
                <ChevronsLeft className="w-4 h-4 text-slate-700" />
              </button>
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={safeCurrentPage === 1}
                className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                title="Previous Page"
              >
                <ChevronLeft className="w-4 h-4 text-slate-700" />
              </button>

              <span className="px-3 text-xs font-semibold text-slate-800">
                Page {safeCurrentPage} of {totalPages}
              </span>

              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={safeCurrentPage === totalPages}
                className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                title="Next Page"
              >
                <ChevronRight className="w-4 h-4 text-slate-700" />
              </button>
              <button
                type="button"
                onClick={() => setCurrentPage(totalPages)}
                disabled={safeCurrentPage === totalPages}
                className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                title="Last Page"
              >
                <ChevronsRight className="w-4 h-4 text-slate-700" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Delete School Confirmation Modal */}
      {schoolToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-3xl p-6 md:p-8 max-w-md w-full space-y-5 text-xs shadow-2xl border border-slate-200">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-600 rounded-2xl shrink-0">
                <Trash2 className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-slate-900">Delete Partner School</h3>
                <p className="text-slate-600 leading-relaxed text-xs">
                  Are you sure you want to permanently delete{' '}
                  <span className="font-semibold text-slate-900">{schoolToDelete.name}</span>?
                </p>
              </div>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-1.5 text-[11px] text-slate-600">
              <div className="flex justify-between">
                <span>Principal:</span>
                <span className="font-medium text-slate-900">{schoolToDelete.principalName || 'Unassigned'}</span>
              </div>
              <div className="flex justify-between">
                <span>Annual Allocation:</span>
                <span className="font-medium text-slate-900">${(schoolToDelete.annualBudget || 0).toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span>Location:</span>
                <span className="font-medium text-slate-900">{schoolToDelete.city || 'N/A'}</span>
              </div>
            </div>

            <p className="text-[11px] text-rose-600 bg-rose-50/80 p-2.5 rounded-xl border border-rose-100">
              ⚠️ This action will permanently remove this school document from Firestore.
            </p>

            <div className="flex justify-end items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setSchoolToDelete(null)}
                disabled={isDeletingSchool}
                className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 font-medium rounded-xl text-xs cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDeleteSchool}
                disabled={isDeletingSchool}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-medium rounded-xl text-xs flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors disabled:opacity-50"
              >
                {isDeletingSchool ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                <span>{isDeletingSchool ? 'Deleting...' : 'Confirm Delete'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Invite Details Modal */}
      {selectedInviteSchool && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-3xl p-6 md:p-8 max-w-lg w-full space-y-5 text-xs shadow-2xl border border-slate-200">
            <div className="flex justify-between items-start border-b pb-4">
              <div>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-amber-700 bg-amber-50 px-2.5 py-1 rounded-md border border-amber-200">
                  Onboarding Invitation Status
                </span>
                <h3 className="text-lg font-bold text-slate-900 mt-1.5" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
                  {selectedInviteSchool.name}
                </h3>
                <p className="text-slate-500 font-normal">{selectedInviteSchool.address}, {selectedInviteSchool.city}</p>
              </div>
              <button
                onClick={() => setSelectedInviteSchool(null)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-200">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-500 font-medium">Designated Principal:</span>
                <span className="font-semibold text-slate-900">{selectedInviteSchool.principalName || 'David Miller'}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-500 font-medium">Principal Email:</span>
                <span className="font-mono text-slate-800">{selectedInviteSchool.principalEmail || 'dmiller@southed.org'}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-500 font-medium">MOU Compliance:</span>
                <span className="text-amber-700 font-medium bg-amber-100 px-2 py-0.5 rounded-md text-[10px]">
                  Pending Signature upon Sign-In
                </span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-500 font-medium">Allocated Emergency Fund:</span>
                <span className="font-bold text-[#006E8F]">${(selectedInviteSchool.annualBudget || 10000).toLocaleString()}</span>
              </div>
            </div>

            <div className="bg-slate-900 text-slate-100 p-4 rounded-2xl space-y-2 font-mono text-xs">
              <div className="text-[11px] text-slate-400 font-sans">Principal Account Setup Direct Link:</div>
              <div className="p-2.5 bg-slate-800 rounded-xl text-[#0089B3] font-bold break-all flex items-center justify-between gap-2">
                <span>{`${PRODUCTION_PORTAL_URL}/setup-account?email=${encodeURIComponent(selectedInviteSchool.principalEmail || '')}`}</span>
                <button
                  type="button"
                  onClick={() => {
                    const setupUrl = `${PRODUCTION_PORTAL_URL}/setup-account?email=${encodeURIComponent(selectedInviteSchool.principalEmail || '')}`;
                    navigator.clipboard.writeText(setupUrl);
                    setCopiedLink(true);
                    setTimeout(() => setCopiedLink(false), 2000);
                  }}
                  className="px-3 py-1 bg-[#0089B3] hover:bg-[#006E8F] text-white rounded-lg font-sans text-[11px] font-semibold shrink-0 flex items-center gap-1 cursor-pointer"
                >
                  {copiedLink ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  {copiedLink ? 'Copied' : 'Copy'}
                </button>
              </div>
            </div>

            {/* Email Template System Preview */}
            {(() => {
              const rendered = renderInviteEmail(settings?.emailTemplates || [], {
                recipient_name: selectedInviteSchool.principalName || 'Principal',
                school_name: selectedInviteSchool.name,
                amount: (selectedInviteSchool.annualBudget || 10000).toLocaleString(),
                invite_link: `${PRODUCTION_PORTAL_URL}/setup-account?email=${encodeURIComponent(selectedInviteSchool.principalEmail || '')}`,
              });
              return (
                <div className="space-y-1.5 border-t pt-3">
                  <div className="flex justify-between items-center text-[11px] font-semibold text-slate-600">
                    <span>Configured Email Template Preview:</span>
                    <span className="text-[#006E8F] font-mono text-[10px]">{rendered.template?.name}</span>
                  </div>
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 font-mono text-[11px] text-slate-700 whitespace-pre-wrap leading-relaxed max-h-36 overflow-y-auto">
                    <div className="font-semibold text-slate-900 border-b pb-1 mb-2">Subject: {rendered.subject}</div>
                    {rendered.body}
                  </div>
                </div>
              );
            })()}

            <div className="flex justify-between items-center pt-2">
              <button
                type="button"
                onClick={() => {
                  if (selectedInviteSchool.principalEmail && onCreateInvite) {
                    onCreateInvite({
                      email: selectedInviteSchool.principalEmail.trim(),
                      name: selectedInviteSchool.principalName?.replace(/\s*\(Pending\)\s*/gi, '').trim() || 'Principal',
                      role: 'principal',
                      schoolId: selectedInviteSchool.id,
                      schoolName: selectedInviteSchool.name,
                      jobTitle: 'Principal',
                      invitedBy: 'PEF Administrator',
                      invitedAt: new Date().toISOString(),
                      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
                      status: 'pending',
                      notes: `Onboarding invitation for ${selectedInviteSchool.name}. Please review and sign MOU upon login.`,
                    });
                  }
                  setSelectedInviteSchool(null);
                }}
                className="px-4 py-2 bg-[#0089B3] hover:bg-[#006E8F] text-white font-medium rounded-xl text-xs flex items-center gap-2 cursor-pointer shadow-xs"
              >
                <Mail className="w-3.5 h-3.5 text-[#A5E3F6]" />
                Resend Email Invitation
              </button>
              <button
                type="button"
                onClick={() => setSelectedInviteSchool(null)}
                className="px-4 py-2 border border-slate-300 rounded-xl font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Principals Match & Invite Importer Modal */}
      <ImportPrincipalsModal
        isOpen={isImportPrincipalsModalOpen}
        onClose={() => setIsImportPrincipalsModalOpen(false)}
        existingSchools={schools}
        settings={settings}
      />

      {/* Copy Link Toast Notification */}
      {inviteCopiedToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-xl shadow-xl text-xs font-semibold flex items-center gap-2 animate-fade-in border border-slate-700">
          <Check className="w-4 h-4 text-emerald-400" />
          <span>Invitation setup link copied to clipboard!</span>
        </div>
      )}
    </div>
  );
};
