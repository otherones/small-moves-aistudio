import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { PlusCircle, Search, Calendar } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { EmergencyRequest, School, PortalSettings } from '../../types';
import { RequestsTable } from '../../components/requests/RequestsTable';
import { getCurrentSchoolYear, getSchoolYearForDate } from '../../utils/schoolYear';
import { PendingAssignmentPage } from '../auth/PendingAssignmentPage';

interface RequestsListProps {
  schools: School[];
  requests: EmergencyRequest[];
  onCancelRequest: (request: EmergencyRequest, reason?: string) => void;
  onEditRequest: (request: EmergencyRequest) => void;
  onEditPayout: (request: EmergencyRequest) => void;
  settings?: PortalSettings;
}

export const RequestsList: React.FC<RequestsListProps> = ({
  schools,
  requests,
  onCancelRequest,
  onEditRequest,
  onEditPayout,
  settings,
}) => {
  const { userProfile, activeSchoolId } = useAuth();
  const currentSY = getCurrentSchoolYear(settings);
  const [activeTab, setActiveTab] = useState<'open' | 'paid' | 'denied' | 'canceled'>('open');
  const [searchQuery, setSearchQuery] = useState('');

  const school = schools.find(
    (s) => s.id === activeSchoolId || userProfile?.schoolIds?.includes(s.id)
  ) || (userProfile?.role === 'admin' ? schools[0] : undefined);

  if (!school || userProfile?.role === 'unassigned') {
    return <PendingAssignmentPage />;
  }

  const schoolRequests = requests.filter((r) => r.schoolId === school.id);

  // Filter strictly by current school year
  const yearRequests = schoolRequests.filter((r) => {
    return getSchoolYearForDate(r.createdAt) === currentSY;
  });

  // Filter by tab
  const tabRequests = yearRequests.filter((r) => {
    if (activeTab === 'open') {
      return r.status !== 'paid' && r.status !== 'denied' && r.status !== 'canceled';
    }
    return r.status === activeTab;
  });

  // Search filter
  const filteredRequests = tabRequests.filter((r) => {
    const q = searchQuery.toLowerCase();
    return (
      r.id.toLowerCase().includes(q) ||
      r.beneficiaryName.toLowerCase().includes(q) ||
      (r.studentName && r.studentName.toLowerCase().includes(q)) ||
      r.category.toLowerCase().includes(q) ||
      r.reason.toLowerCase().includes(q)
    );
  });

  const openCount = yearRequests.filter(
    (r) => r.status !== 'paid' && r.status !== 'denied' && r.status !== 'canceled'
  ).length;
  const paidCount = yearRequests.filter((r) => r.status === 'paid').length;
  const deniedCount = yearRequests.filter((r) => r.status === 'denied').length;
  const canceledCount = yearRequests.filter((r) => r.status === 'canceled').length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-[#0F172A] tracking-tight" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>Emergency Requests</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Managing requests for <strong className="text-slate-800">{school?.name || 'School'}</strong>
          </p>
        </div>

        {!school?.currentMouSigned ? (
          <div className="flex flex-col items-end self-start sm:self-auto">
            <button
              disabled
              className="px-5 py-2.5 bg-slate-200 text-slate-400 font-medium rounded-xl text-xs flex items-center gap-2 cursor-not-allowed"
              title="Annual MOU signature required before creating emergency requests"
            >
              <PlusCircle className="w-4 h-4" />
              New Request
            </button>
            <span className="text-[11px] text-amber-700 font-medium mt-1">MOU Signature Required</span>
          </div>
        ) : (
          <Link
            to="/requests/new"
            className="px-5 py-2.5 bg-[#0089B3] hover:bg-[#007399] text-white font-bold rounded-xl text-xs shadow-md shadow-[#0089B3]/20 flex items-center gap-2 self-start sm:self-auto transition-all"
          >
            <PlusCircle className="w-4 h-4" />
            New Request
          </Link>
        )}
      </div>

      {/* Tabs & Search Controls */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 bg-white p-3 rounded-2xl border border-slate-200 shadow-xs">
        {/* Status Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 md:pb-0">
          {[
            { id: 'open', label: 'Open Requests', count: openCount },
            { id: 'paid', label: 'Paid Out', count: paidCount },
            { id: 'denied', label: 'Denied', count: deniedCount },
            { id: 'canceled', label: 'Canceled', count: canceledCount },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-colors whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
                activeTab === tab.id
                  ? 'bg-[#0F172A] text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                  activeTab === tab.id ? 'bg-[#6EBF00] text-slate-950 font-black' : 'bg-slate-200 text-slate-700'
                }`}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Right controls: Search Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <div className="relative min-w-[220px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search by ID, beneficiary..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-hidden focus:border-[#0089B3] focus:ring-1 focus:ring-[#0089B3]"
            />
          </div>
        </div>
      </div>

      {/* Requests Table */}
      <RequestsTable
        requests={filteredRequests}
        isAdminView={false}
        onCancelRequest={onCancelRequest}
        onEditRequest={onEditRequest}
        onEditPayout={onEditPayout}
      />
    </div>
  );
};
