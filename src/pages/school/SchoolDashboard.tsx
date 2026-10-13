import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  PlusCircle,
  Building2,
  Users,
  ShieldCheck,
  DollarSign,
  AlertTriangle,
  Edit3,
  CheckCircle2,
  UserPlus,
  Info,
  X,
  CreditCard,
  MessageSquare,
  Sparkles,
  Lock,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { School, EmergencyRequest, AdditionalContact, PortalSettings, PendingInvite } from '../../types';
import { RequestsTable } from '../../components/requests/RequestsTable';
import { MouModal } from '../../components/common/MouModal';
import { getCurrentSchoolYear, getSchoolYearForDate } from '../../utils/schoolYear';
import { computeSchoolBudgetMetrics } from '../../utils/budgetUtils';

import { PendingAssignmentPage } from '../auth/PendingAssignmentPage';

interface SchoolDashboardProps {
  schools: School[];
  requests: EmergencyRequest[];
  settings?: PortalSettings;
  onUpdateSchool: (schoolId: string, updates: Partial<School>) => void;
  onCreateInvite?: (invite: Partial<PendingInvite>) => void;
  onSignMou: (schoolId: string, signedBy: string, mouVersionId?: string, signedByTitle?: string) => void;
  onCancelRequest: (request: EmergencyRequest, reason?: string) => void;
  maxPerRequestAmount?: number;
}

export const SchoolDashboard: React.FC<SchoolDashboardProps> = ({
  schools,
  requests,
  settings,
  onUpdateSchool,
  onCreateInvite,
  onSignMou,
  onCancelRequest,
  maxPerRequestAmount = 2000,
}) => {
  const { userProfile, activeSchoolId } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const currentSY = getCurrentSchoolYear(settings);
  const isPrincipal = userProfile?.role === 'principal';

  const school = schools.find(
    (s) => s.id === activeSchoolId || userProfile?.schoolIds?.includes(s.id)
  ) || (userProfile?.role === 'admin' ? schools[0] : undefined);

  if (!school || userProfile?.role === 'unassigned') {
    return <PendingAssignmentPage />;
  }

  // School inline edit
  const [editingHeader, setEditingHeader] = useState(false);
  const [address, setAddress] = useState(school?.address || '');
  const [city, setCity] = useState(school?.city || '');
  const [state, setState] = useState(school?.state || 'IL');
  const [zip, setZip] = useState(school?.zip || '');
  const [phone, setPhone] = useState(school?.phone || '');
  const [studentCount, setStudentCount] = useState(school?.studentCount || 0);

  // Contacts edit dialog
  const [contactsDialogOpen, setContactsDialogOpen] = useState(false);
  const [contacts, setContacts] = useState<AdditionalContact[]>(school?.additionalContacts || []);

  // MOU Modal
  const [mouModalOpen, setMouModalOpen] = useState(false);

  // Success dialog from query params
  const [showCreatedModal, setShowCreatedModal] = useState(location.search.includes('submitted=true'));

  type SchoolTableFilter = 'open' | 'action_needed' | 'paid' | 'reserved' | 'all';
  const [tableFilter, setTableFilter] = useState<SchoolTableFilter>('open');

  if (!school) {
    return <div className="p-8 text-center text-slate-500">Loading school details...</div>;
  }

  // Compute dynamic, real-time budget metrics and categorical request counts
  const budgetMetrics = computeSchoolBudgetMetrics(school, requests, currentSY);
  const totalPaid = budgetMetrics.budgetPaid;
  const totalReserved = budgetMetrics.budgetReserved;
  const totalAvailable = budgetMetrics.budgetAvailable;
  const totalAnnual = budgetMetrics.annualBudget;
  const paidPct = budgetMetrics.paidPct;
  const reservedPct = budgetMetrics.reservedPct;
  const availablePct = budgetMetrics.availablePct;

  const openCount = budgetMetrics.openCount;
  const paidCount = budgetMetrics.paidCount;
  const reservedCount = budgetMetrics.reservedCount;
  const actionNeededCount = budgetMetrics.actionNeededCount;
  const totalCount = budgetMetrics.totalCount;

  // Filter requests for active school and current school year
  const schoolRequests = requests.filter((r) => r.schoolId === school.id);
  const yearSchoolRequests = schoolRequests.filter((r) => {
    return getSchoolYearForDate(r.createdAt) === currentSY;
  });

  const actionNeededRequests = yearSchoolRequests.filter((r) => {
    return (
      r.status === 'waiting_on_principal' ||
      r.status === 'changes_requested' ||
      r.status === 'response_requested'
    );
  });

  const filteredRequests = yearSchoolRequests.filter((r) => {
    if (tableFilter === 'open') {
      return r.status !== 'paid' && r.status !== 'denied' && r.status !== 'canceled';
    } else if (tableFilter === 'action_needed') {
      return (
        r.status === 'waiting_on_principal' ||
        r.status === 'changes_requested' ||
        r.status === 'response_requested'
      );
    } else if (tableFilter === 'paid') {
      return r.status === 'paid';
    } else if (tableFilter === 'reserved') {
      return (
        r.status === 'in_review' ||
        r.status === 'ready_to_pay' ||
        r.status === 'waiting_on_principal' ||
        r.status === 'waiting_on_beneficiary' ||
        r.status === 'response_requested' ||
        r.status === 'changes_requested'
      );
    }
    return true; // 'all'
  });

  const handleSaveHeader = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateSchool(school.id, {
      name: school.name, // Preserved: school name is managed by PEF Administration
      address,
      city,
      state,
      zip,
      phone,
      studentCount: Number(studentCount),
    });
    setEditingHeader(false);
  };

  const handleAddContact = () => {
    if (contacts.length >= 2) return;
    setContacts([
      ...contacts,
      {
        id: `AC-${Date.now()}`,
        name: '',
        email: '',
        phone: '',
        jobTitle: '',
      },
    ]);
  };

  const handleSaveContacts = () => {
    const valid = contacts.filter((c) => c.name.trim() && c.email.trim());
    
    // Check for newly added contacts that aren't in the original array
    const originalIds = new Set(school.additionalContacts.map((c) => c.id));
    valid.forEach((contact) => {
      if (!originalIds.has(contact.id) && onCreateInvite) {
        // Create an invite for this contact so they can sign in
        onCreateInvite({
          email: contact.email,
          name: contact.name,
          role: 'additional_contact',
          schoolId: school.id,
          schoolName: school.name,
          jobTitle: contact.jobTitle || 'Authorized Contact',
          invitedBy: userProfile?.displayName || 'School Principal',
          notes: 'Automatically generated invitation from School Dashboard',
        });
      }
    });

    onUpdateSchool(school.id, { additionalContacts: valid });
    setContactsDialogOpen(false);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Top Banner & Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-3xl font-bold text-[#0F172A] tracking-tight" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>{school.name}</h1>
            <span
              className={`px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider ${
                school.status === 'active'
                  ? 'bg-[#EDF7FC] text-[#0089B3] border border-[#0089B3]/20'
                  : school.status === 'pending' || school.status === 'invited'
                  ? 'bg-amber-100 text-amber-900'
                  : 'bg-slate-100 text-slate-700'
              }`}
            >
              {school.status === 'pending' || school.status === 'invited' ? 'Pending' : school.status}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {!school.currentMouSigned ? (
            <div className="flex flex-col items-end">
              <button
                disabled
                className="px-5 py-2.5 bg-slate-200 text-slate-400 font-medium rounded-xl text-xs flex items-center gap-2 cursor-not-allowed"
              >
                <PlusCircle className="w-4 h-4" />
                Submit Emergency Request
              </button>
              <span className="text-[11px] text-amber-700 font-medium mt-1">MOU Signature Required</span>
            </div>
          ) : (
            <Link
              to="/requests/new"
              className="px-5 py-2.5 bg-[#0089B3] hover:bg-[#007399] text-white font-bold rounded-xl text-xs shadow-md shadow-[#0089B3]/20 flex items-center gap-2 transition-all hover:scale-[1.01]"
            >
              <PlusCircle className="w-4 h-4" />
              Submit Emergency Request
            </Link>
          )}
        </div>
      </div>

      {/* Action Needed Banner (if any) */}
      {actionNeededRequests.length > 0 && (
        <div className="bg-amber-50/80 border border-amber-200 rounded-2xl p-5 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-900 flex items-center justify-center font-bold shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-amber-950">
                Action Needed ({actionNeededRequests.length} Request{actionNeededRequests.length > 1 ? 's' : ''})
              </h3>
              <p className="text-xs text-amber-800/90 mt-0.5 font-normal">
                Payout details, change confirmations, or admin question responses are currently pending your action.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {actionNeededRequests.map((req) => (
              <button
                key={req.id}
                onClick={() => {
                  if (req.status === 'waiting_on_principal') navigate(`/requests/${req.id}/payout`);
                  else navigate(`/requests/${req.id}`);
                }}
                className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-medium flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                {req.status === 'waiting_on_principal' && <CreditCard className="w-3.5 h-3.5" />}
                {req.status === 'response_requested' && <MessageSquare className="w-3.5 h-3.5" />}
                <span>Open {req.id}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Grid of 3 Primary Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Card 1: School Header Info */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs flex flex-col justify-between relative">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center">
                  <Building2 className="w-4 h-4 text-slate-600" />
                </div>
                <h3 className="text-sm font-semibold text-slate-800">School Details</h3>
              </div>

              {isPrincipal && !editingHeader && (
                <button
                  onClick={() => {
                    setAddress(school.address);
                    setCity(school.city);
                    setState(school.state);
                    setZip(school.zip);
                    setPhone(school.phone);
                    setStudentCount(school.studentCount);
                    setEditingHeader(true);
                  }}
                  className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors flex items-center gap-1 text-xs font-medium cursor-pointer"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  Edit
                </button>
              )}
            </div>

            {!editingHeader ? (
              <div className="space-y-3 text-xs">
                <div>
                  <span className="text-slate-500 font-medium">Location</span>
                  <p className="font-semibold text-slate-800">
                    {school.address}, {school.city}, {school.state} {school.zip}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-slate-500 font-medium">Main Phone</span>
                    <p className="font-semibold text-slate-800">{school.phone}</p>
                  </div>
                  <div>
                    <span className="text-slate-500 font-medium">Student Population</span>
                    <p className="font-semibold text-slate-800">{school.studentCount.toLocaleString()} Students</p>
                  </div>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSaveHeader} className="space-y-3 text-xs">
                <div>
                  <div className="flex items-center justify-between mb-0.5">
                    <label className="block text-slate-600 font-medium">School Name</label>
                    <span className="text-[10px] font-semibold text-slate-400 flex items-center gap-1">
                      <Lock className="w-3 h-3 text-slate-400" />
                      Locked
                    </span>
                  </div>
                  <input
                    type="text"
                    value={school.name}
                    disabled
                    readOnly
                    className="w-full px-2.5 py-1.5 border border-slate-200 bg-slate-100 text-slate-500 rounded-lg font-medium cursor-not-allowed select-none"
                  />
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    Official school title is managed by PEF Administration. Contact administration to request changes.
                  </p>
                </div>
                <div>
                  <label className="block text-slate-600 font-medium mb-0.5">Street Address</label>
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    required
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg font-normal focus:border-[#0089B3] focus:ring-1 focus:ring-[#0089B3]"
                  />
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <input
                    type="text"
                    placeholder="City"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="px-2 py-1 border border-slate-300 rounded-lg font-normal"
                  />
                  <input
                    type="text"
                    placeholder="State"
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    className="px-2 py-1 border border-slate-300 rounded-lg font-normal"
                  />
                  <input
                    type="text"
                    placeholder="ZIP"
                    value={zip}
                    onChange={(e) => setZip(e.target.value)}
                    className="px-2 py-1 border border-slate-300 rounded-lg font-normal"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-slate-600 font-medium mb-0.5">Phone</label>
                    <input
                      type="text"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full px-2 py-1 border border-slate-300 rounded-lg font-normal"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 font-medium mb-0.5">Student Count</label>
                    <input
                      type="number"
                      value={studentCount}
                      onChange={(e) => setStudentCount(Number(e.target.value))}
                      className="w-full px-2 py-1 border border-slate-300 rounded-lg font-normal"
                    />
                  </div>
                </div>

                <div className="flex gap-2 justify-end pt-2">
                  <button
                    type="button"
                    onClick={() => setEditingHeader(false)}
                    className="px-3 py-1 border border-slate-300 rounded-lg font-medium text-slate-600 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-3 py-1 bg-[#0089B3] hover:bg-[#006E8F] text-white font-medium rounded-lg cursor-pointer"
                  >
                    Save
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>

        {/* Card 2: Contacts & Annual Compliance */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-[#6EBF00]/15 text-[#4D8500] flex items-center justify-center">
                  <ShieldCheck className="w-4 h-4 text-[#4D8500]" />
                </div>
                <h3 className="text-sm font-semibold text-slate-800">Contacts &amp; Compliance</h3>
              </div>

              {isPrincipal && (
                <button
                  onClick={() => setContactsDialogOpen(true)}
                  className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg text-xs font-medium flex items-center gap-1 cursor-pointer"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  Manage Contacts
                </button>
              )}
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <span className="text-slate-500 font-medium">Principal</span>
                <p className="font-semibold text-slate-800">
                  {school.principalName || 'Unassigned'}{' '}
                  <span className="text-slate-500 font-normal">({school.principalEmail || 'No email'})</span>
                </p>
              </div>

              <div>
                <span className="text-slate-500 font-medium">Additional Contacts ({school.additionalContacts.length}/2)</span>
                {school.additionalContacts.length === 0 ? (
                  <p className="text-slate-400 italic">No additional contacts registered</p>
                ) : (
                  <div className="space-y-1 mt-1">
                    {school.additionalContacts.map((ac) => (
                      <div key={ac.id} className="p-2 bg-slate-50 rounded-lg border border-slate-100">
                        <p className="font-semibold text-slate-800">{ac.name}</p>
                        <p className="text-[11px] text-slate-500">{ac.email} {ac.phone && `· ${ac.phone}`}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2
                className={`w-5 h-5 ${
                  school.currentMouSigned ? 'text-[#6EBF00]' : 'text-slate-300'
                }`}
              />
              <div>
                <div className="flex items-center gap-1.5">
                  <p className="text-xs font-semibold text-slate-800">Annual MOU Status</p>
                  {school.hasCustomMou && (
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-[#EDF7FC] text-[#0089B3] border border-[#0089B3]/20">
                      Custom Terms
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-500">
                  {school.currentMouSigned
                    ? 'Signed & Compliant'
                    : isPrincipal
                    ? 'MOU Pending Execution'
                    : 'MOU Pending Principal Signature'}
                </p>
              </div>
            </div>

            <button
              onClick={() => setMouModalOpen(true)}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-medium rounded-xl text-xs cursor-pointer"
            >
              {isPrincipal && !school.currentMouSigned ? 'Sign MOU' : 'View MOU'}
            </button>
          </div>
        </div>

        {/* Card 3: School Budget Card */}
        <div className="bg-[#0F172A] text-white rounded-2xl p-6 shadow-md flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-5">
            <DollarSign className="w-32 h-32 text-white" />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-[#6EBF00]">
                School-Year Fund 2026–2027
              </span>
              <span className="text-xs text-slate-400 font-normal">
                Total Budget: ${totalAnnual.toLocaleString()}
              </span>
            </div>

            <div className="my-3">
              <div className="text-3xl font-semibold text-white tracking-tight">
                ${totalAvailable.toLocaleString()}
              </div>
              <p className="text-xs text-slate-400 font-normal">Available for Emergency Requests</p>
            </div>

            {/* Stacked Progress Bar */}
            <div className="space-y-1.5 my-4">
              <div className="h-3 w-full bg-slate-800 rounded-full overflow-hidden flex">
                <div
                  style={{ width: `${paidPct}%` }}
                  className="bg-[#0089B3] h-full"
                  title={`Paid: $${totalPaid}`}
                />
                <div
                  style={{ width: `${reservedPct}%` }}
                  className="bg-[#F59E0B] h-full"
                  title={`Pending/Reserved: $${totalReserved}`}
                />
                <div
                  style={{ width: `${availablePct}%` }}
                  className="bg-[#6EBF00] h-full"
                  title={`Available: $${totalAvailable}`}
                />
              </div>

              <div className="grid grid-cols-3 text-[11px] font-medium text-slate-300 pt-1">
                <button
                  type="button"
                  onClick={() => setTableFilter('paid')}
                  className={`flex items-center gap-1.5 transition-colors cursor-pointer text-left ${
                    tableFilter === 'paid' ? 'text-[#38BDF8] font-semibold underline' : 'hover:text-white'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-[#0089B3] shrink-0" />
                  <span>Paid: ${totalPaid.toLocaleString()}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setTableFilter('reserved')}
                  className={`flex items-center gap-1.5 justify-center transition-colors cursor-pointer ${
                    tableFilter === 'reserved' ? 'text-amber-300 font-semibold underline' : 'hover:text-white'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-[#F59E0B] shrink-0" />
                  <span>Reserved: ${totalReserved.toLocaleString()}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setTableFilter('open')}
                  className={`flex items-center gap-1.5 justify-end transition-colors cursor-pointer ${
                    tableFilter === 'open' ? 'text-[#6EBF00] font-semibold underline' : 'hover:text-white'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-[#6EBF00] shrink-0" />
                  <span>Avail: ${totalAvailable.toLocaleString()}</span>
                </button>
              </div>
            </div>
          </div>

          <div className="text-[11px] text-slate-400 border-t border-slate-800 pt-3 flex items-center justify-between">
            <span>Per-request limit: ${maxPerRequestAmount.toLocaleString()} max</span>
            <span className="text-[#6EBF00] font-semibold">100% Direct Relief</span>
          </div>
        </div>
      </div>

      {/* Clickable Summary Metric Tiles Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <button
          type="button"
          onClick={() => setTableFilter('open')}
          className={`text-left p-4 rounded-2xl border shadow-xs transition-all hover:scale-[1.01] cursor-pointer ${
            tableFilter === 'open'
              ? 'border-[#0089B3] ring-2 ring-[#0089B3]/20 bg-[#EDF7FC]/50'
              : 'bg-white border-slate-200/80 hover:border-[#0089B3]/50'
          }`}
        >
          <div className="text-2xl font-semibold text-slate-900">{openCount}</div>
          <div className="text-xs font-medium text-slate-600">Open Requests</div>
        </button>

        <button
          type="button"
          onClick={() => setTableFilter('action_needed')}
          className={`text-left p-4 rounded-2xl border shadow-xs transition-all hover:scale-[1.01] cursor-pointer ${
            tableFilter === 'action_needed'
              ? 'bg-amber-100/80 border-amber-500 ring-2 ring-amber-500/20'
              : 'bg-amber-50/50 border-amber-200 hover:border-amber-300'
          }`}
        >
          <div className="text-2xl font-semibold text-amber-950">{actionNeededCount}</div>
          <div className="text-xs font-medium text-amber-900">Action Needed</div>
        </button>

        <button
          type="button"
          onClick={() => setTableFilter('paid')}
          className={`text-left p-4 rounded-2xl border shadow-xs transition-all hover:scale-[1.01] cursor-pointer ${
            tableFilter === 'paid'
              ? 'border-slate-800 ring-2 ring-slate-800/20 bg-slate-100'
              : 'bg-white border-slate-200/80 hover:border-slate-400'
          }`}
        >
          <div className="text-2xl font-semibold text-slate-900">{paidCount}</div>
          <div className="text-xs font-medium text-slate-600">Paid Out Grants</div>
        </button>

        <button
          type="button"
          onClick={() => setTableFilter('all')}
          className={`text-left p-4 rounded-2xl border shadow-xs transition-all hover:scale-[1.01] cursor-pointer ${
            tableFilter === 'all'
              ? 'border-slate-800 ring-2 ring-slate-800/20 bg-slate-100'
              : 'bg-white border-slate-200/80 hover:border-slate-400'
          }`}
        >
          <div className="text-2xl font-semibold text-slate-900">{totalCount}</div>
          <div className="text-xs font-medium text-slate-600">Total Submitted</div>
        </button>
      </div>

      {/* Emergency Requests Table Section */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <div>
            <h2 className="text-base font-semibold text-slate-800 tracking-tight">
              {tableFilter === 'open' && 'Open Requests'}
              {tableFilter === 'action_needed' && 'Action Needed Requests'}
              {tableFilter === 'paid' && 'Paid Out Grants'}
              {tableFilter === 'reserved' && 'Reserved / In Review Requests'}
              {tableFilter === 'all' && 'All Requests History'}
            </h2>
            <p className="text-xs text-slate-500 font-normal">
              Showing {filteredRequests.length} request{filteredRequests.length !== 1 ? 's' : ''}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center bg-slate-100 rounded-xl p-1 gap-1">
              <button
                type="button"
                onClick={() => setTableFilter('open')}
                className={`px-3 py-1 rounded-lg text-xs font-medium cursor-pointer transition-colors ${
                  tableFilter === 'open' ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Open ({openCount})
              </button>
              <button
                type="button"
                onClick={() => setTableFilter('action_needed')}
                className={`px-3 py-1 rounded-lg text-xs font-medium cursor-pointer transition-colors ${
                  tableFilter === 'action_needed' ? 'bg-amber-600 text-white shadow-xs' : 'text-amber-800 hover:text-amber-950'
                }`}
              >
                Action Needed ({actionNeededCount})
              </button>
              <button
                type="button"
                onClick={() => setTableFilter('paid')}
                className={`px-3 py-1 rounded-lg text-xs font-medium cursor-pointer transition-colors ${
                  tableFilter === 'paid' ? 'bg-slate-800 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Paid ({paidCount})
              </button>
              <button
                type="button"
                onClick={() => setTableFilter('reserved')}
                className={`px-3 py-1 rounded-lg text-xs font-medium cursor-pointer transition-colors ${
                  tableFilter === 'reserved' ? 'bg-amber-500 text-slate-950 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Reserved ({reservedCount})
              </button>
              <button
                type="button"
                onClick={() => setTableFilter('all')}
                className={`px-3 py-1 rounded-lg text-xs font-medium cursor-pointer transition-colors ${
                  tableFilter === 'all' ? 'bg-[#0089B3] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                All ({totalCount})
              </button>
            </div>

            <Link
              to="/requests"
              className="text-xs font-medium text-[#0089B3] hover:text-[#006E8F] hover:underline whitespace-nowrap ml-2"
            >
              View Full List &rarr;
            </Link>
          </div>
        </div>

        <RequestsTable
          requests={filteredRequests}
          isAdminView={false}
          onCancelRequest={onCancelRequest}
        />
      </div>

      {/* Contacts Dialog */}
      {contactsDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden p-6 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-sm font-bold text-slate-900">Manage Additional Contacts (Max 2)</h3>
              <button onClick={() => setContactsDialogOpen(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600">
              Additional contacts can submit emergency requests and manage their initiated requests.
            </p>

            <div className="space-y-3 max-h-60 overflow-y-auto">
              {contacts.map((contact, idx) => (
                <div key={contact.id} className="p-3 bg-slate-50 border rounded-xl space-y-2 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-slate-800">Contact #{idx + 1}</span>
                    <button
                      onClick={() => setContacts(contacts.filter((c) => c.id !== contact.id))}
                      className="text-rose-600 font-bold hover:underline"
                    >
                      Remove
                    </button>
                  </div>
                  <input
                    type="text"
                    placeholder="Full Name"
                    value={contact.name}
                    onChange={(e) =>
                      setContacts(
                        contacts.map((c) => (c.id === contact.id ? { ...c, name: e.target.value } : c))
                      )
                    }
                    className="w-full px-2.5 py-1.5 border rounded-lg bg-white"
                  />
                  <input
                    type="email"
                    placeholder="Email Address"
                    value={contact.email}
                    onChange={(e) =>
                      setContacts(
                        contacts.map((c) => (c.id === contact.id ? { ...c, email: e.target.value } : c))
                      )
                    }
                    className="w-full px-2.5 py-1.5 border rounded-lg bg-white"
                  />
                  <input
                    type="text"
                    placeholder="Job Title / Role"
                    value={contact.jobTitle || ''}
                    onChange={(e) =>
                      setContacts(
                        contacts.map((c) => (c.id === contact.id ? { ...c, jobTitle: e.target.value } : c))
                      )
                    }
                    className="w-full px-2.5 py-1.5 border rounded-lg bg-white"
                  />
                </div>
              ))}
            </div>

            {contacts.length < 2 && (
              <button
                onClick={handleAddContact}
                className="w-full py-2 border-2 border-dashed border-slate-300 text-slate-600 font-bold rounded-xl text-xs hover:border-emerald-500 hover:text-emerald-700"
              >
                + Add Additional Contact
              </button>
            )}

            <div className="flex gap-2 justify-end pt-3 border-t">
              <button
                onClick={() => setContactsDialogOpen(false)}
                className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-semibold hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveContacts}
                className="px-5 py-2 bg-[#0089B3] hover:bg-[#007399] text-white font-bold rounded-xl text-xs shadow-md shadow-[#0089B3]/20 transition-colors cursor-pointer"
              >
                Save Contacts
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MOU Modal */}
      <MouModal
        school={school}
        isOpen={mouModalOpen}
        onClose={() => setMouModalOpen(false)}
        mouVersions={settings?.mouVersions}
        currentMouVersionId={settings?.currentMouVersionId}
        onSignMou={(data) => onSignMou(school.id, data.signedByName, data.mouVersionId, data.signedByTitle)}
        readOnly={!isPrincipal}
        maxPerRequestAmount={maxPerRequestAmount}
      />

      {/* Request Submitted Modal Confirmation */}
      {showCreatedModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-6 text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-[#EDF7FC] text-[#0089B3] flex items-center justify-center mx-auto">
              <Sparkles className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-[#0F172A]" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>Emergency Request Submitted!</h3>
            <p className="text-xs text-slate-600">
              Your request has been successfully recorded with status <strong className="text-[#0089B3]">In Review</strong>. Small Moves administrators will review the submission within 48 business hours.
            </p>
            <button
              onClick={() => setShowCreatedModal(false)}
              className="w-full py-2.5 bg-[#0089B3] hover:bg-[#007399] text-white font-bold rounded-xl text-xs shadow-md shadow-[#0089B3]/20 transition-colors cursor-pointer"
            >
              Acknowledge & Continue
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
