import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  PlusCircle,
  Search,
  Building2,
  Edit3,
  School as SchoolIcon,
  Check,
  Mail,
  Phone,
  User,
  Trash2,
  AlertCircle,
  X,
  Sparkles,
  Link2,
  DollarSign,
  Users,
  CheckCircle2,
  Layers,
  ArrowRight,
  Filter,
  Plus,
  HelpCircle,
  Info,
  MoreVertical,
} from 'lucide-react';
import { Funder, School } from '../../types';

interface AdminFundersListProps {
  funders: Funder[];
  schools: School[];
  onCreateFunder: (funder: Partial<Funder>, initialSchoolIds?: string[]) => void;
  onUpdateFunder: (id: string, updates: Partial<Funder>, updatedSchoolIds?: string[]) => void;
  onDeleteFunder?: (id: string) => void;
  onAssignSchoolsToFunder?: (funderId: string, schoolIds: string[]) => void;
  onUnassignSchoolFromFunder?: (funderId: string, schoolId: string) => void;
  onUpdateSchool?: (id: string, updates: Partial<School>) => void;
}

export const AdminFundersList: React.FC<AdminFundersListProps> = ({
  funders,
  schools,
  onCreateFunder,
  onUpdateFunder,
  onDeleteFunder,
  onAssignSchoolsToFunder,
  onUnassignSchoolFromFunder,
  onUpdateSchool,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'with_schools' | 'no_schools'>('all');
  const [openMenuFunderId, setOpenMenuFunderId] = useState<string | null>(null);

  // Main Edit / Create Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingFunder, setEditingFunder] = useState<Funder | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [type, setType] = useState<Funder['type']>('Foundation');
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [notes, setNotes] = useState('');
  // Assigned school IDs in modal
  const [modalAssignedSchoolIds, setModalAssignedSchoolIds] = useState<string[]>([]);
  // School search query inside modal
  const [modalSchoolSearch, setModalSchoolSearch] = useState('');
  const [showOnlyUnfundedInModal, setShowOnlyUnfundedInModal] = useState(true);

  // Dedicated "Assign Schools to Funder" Quick Modal State
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [targetFunderForAssignment, setTargetFunderForAssignment] = useState<Funder | null>(null);
  const [selectedSchoolIdsToAssign, setSelectedSchoolIdsToAssign] = useState<string[]>([]);
  const [assignModalSchoolSearch, setAssignModalSchoolSearch] = useState('');

  // Unassign Confirmation State
  const [unassignConfirmState, setUnassignConfirmState] = useState<{
    funderId: string;
    funderName: string;
    schoolId: string;
    schoolName: string;
  } | null>(null);

  // Delete Funder Confirmation State
  const [deleteConfirmFunder, setDeleteConfirmFunder] = useState<Funder | null>(null);

  // Success notification toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  // Helper to identify unfunded schools
  const isSchoolUnfunded = (s: School) => {
    return (
      !s.funderId ||
      s.funderId === '' ||
      s.funderId === 'unfunded' ||
      !s.funderName ||
      s.funderName === 'Direct PEF Funding' ||
      s.funderName === 'Direct' ||
      s.funderName === 'Unassigned'
    );
  };

  // List of all unfunded schools
  const unfundedSchools = useMemo(() => {
    return schools.filter(isSchoolUnfunded);
  }, [schools]);

  // Overall Statistics
  const totalFunders = funders.length;
  const totalFundedSchoolsCount = useMemo(() => {
    const fundedSet = new Set<string>();
    schools.forEach((s) => {
      if (s.funderId) fundedSet.add(s.id);
    });
    funders.forEach((f) => {
      (f.associatedSchoolIds || []).forEach((id) => fundedSet.add(id));
    });
    return fundedSet.size;
  }, [schools, funders]);

  const totalAssignedBudget = useMemo(() => {
    return schools
      .filter((s) => !isSchoolUnfunded(s))
      .reduce((sum, s) => sum + (s.annualBudget || 0), 0);
  }, [schools]);

  // Filtered Funders List for Table
  const filteredFunders = useMemo(() => {
    return funders.filter((f) => {
      // Search matching
      const q = searchQuery.toLowerCase().trim();
      const assignedSchoolNames = schools
        .filter((s) => s.funderId === f.id || f.associatedSchoolIds?.includes(s.id))
        .map((s) => s.name.toLowerCase())
        .join(' ');

      const matchesSearch =
        !q ||
        f.name.toLowerCase().includes(q) ||
        f.type.toLowerCase().includes(q) ||
        (f.contactName && f.contactName.toLowerCase().includes(q)) ||
        (f.contactEmail && f.contactEmail.toLowerCase().includes(q)) ||
        (f.notes && f.notes.toLowerCase().includes(q)) ||
        assignedSchoolNames.includes(q);

      if (!matchesSearch) return false;

      // Type filter
      if (typeFilter !== 'all' && f.type.toLowerCase() !== typeFilter.toLowerCase()) {
        return false;
      }

      // Status filter
      const assignedCount = schools.filter(
        (s) => s.funderId === f.id || f.associatedSchoolIds?.includes(s.id)
      ).length;

      if (statusFilter === 'with_schools' && assignedCount === 0) return false;
      if (statusFilter === 'no_schools' && assignedCount > 0) return false;

      return true;
    });
  }, [funders, schools, searchQuery, typeFilter, statusFilter]);

  // Open "Add Funder" Modal
  const handleOpenAdd = () => {
    setEditingFunder(null);
    setName('');
    setType('Foundation');
    setContactName('');
    setContactEmail('');
    setContactPhone('');
    setNotes('');
    setModalAssignedSchoolIds([]);
    setModalSchoolSearch('');
    setShowOnlyUnfundedInModal(true);
    setModalOpen(true);
  };

  // Open "Edit Funder" Modal
  const handleOpenEdit = (f: Funder) => {
    setEditingFunder(f);
    setName(f.name);
    setType(f.type);
    setContactName(f.contactName || '');
    setContactEmail(f.contactEmail || '');
    setContactPhone(f.contactPhone || '');
    setNotes(f.notes || '');

    // Collect all schools currently associated
    const currentSchoolIds = Array.from(
      new Set([
        ...(f.associatedSchoolIds || []),
        ...schools.filter((s) => s.funderId === f.id).map((s) => s.id),
      ])
    );
    setModalAssignedSchoolIds(currentSchoolIds);
    setModalSchoolSearch('');
    setShowOnlyUnfundedInModal(true);
    setModalOpen(true);
  };

  // Open "Assign Schools" Modal for a specific funder
  const handleOpenAssignModal = (f: Funder) => {
    setTargetFunderForAssignment(f);
    setSelectedSchoolIdsToAssign([]);
    setAssignModalSchoolSearch('');
    setAssignModalOpen(true);
  };

  // Submit Main Modal Form (Add or Edit Funder)
  const handleSubmitMainModal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const funderName = name.trim();
    const funderData: Partial<Funder> = {
      name: funderName,
      type,
      contactName: contactName.trim() || undefined,
      contactEmail: contactEmail.trim() || undefined,
      contactPhone: contactPhone.trim() || undefined,
      notes: notes.trim() || undefined,
      associatedSchoolIds: modalAssignedSchoolIds,
    };

    if (editingFunder) {
      onUpdateFunder(editingFunder.id, funderData, modalAssignedSchoolIds);
      showToast(`Updated funding entity "${funderName}" and synced associated school grants.`);
    } else {
      const newId = `FND-${Date.now()}`;
      onCreateFunder(
        {
          ...funderData,
          id: newId,
          createdAt: new Date().toISOString(),
        },
        modalAssignedSchoolIds
      );
      showToast(`Created new funder "${funderName}" with ${modalAssignedSchoolIds.length} assigned school(s).`);
    }

    setModalOpen(false);
  };

  // Submit Dedicated "Assign Schools" Quick Modal
  const handleSubmitAssignModal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetFunderForAssignment || selectedSchoolIdsToAssign.length === 0) return;

    if (onAssignSchoolsToFunder) {
      onAssignSchoolsToFunder(targetFunderForAssignment.id, selectedSchoolIdsToAssign);
    } else {
      // Fallback through onUpdateFunder & onUpdateSchool
      const newAssociated = Array.from(
        new Set([
          ...(targetFunderForAssignment.associatedSchoolIds || []),
          ...selectedSchoolIdsToAssign,
        ])
      );
      onUpdateFunder(targetFunderForAssignment.id, { associatedSchoolIds: newAssociated }, newAssociated);
    }

    showToast(
      `Successfully assigned ${selectedSchoolIdsToAssign.length} school(s) to ${targetFunderForAssignment.name}!`
    );
    setAssignModalOpen(false);
    setSelectedSchoolIdsToAssign([]);
  };

  // Execute School Unassignment
  const handleExecuteUnassign = () => {
    if (!unassignConfirmState) return;
    const { funderId, funderName, schoolId, schoolName } = unassignConfirmState;

    if (onUnassignSchoolFromFunder) {
      onUnassignSchoolFromFunder(funderId, schoolId);
    } else if (onUpdateSchool) {
      onUpdateSchool(schoolId, {
        funderId: undefined,
        funderName: undefined,
      });
      const targetF = funders.find((f) => f.id === funderId);
      if (targetF) {
        const remaining = (targetF.associatedSchoolIds || []).filter((id) => id !== schoolId);
        onUpdateFunder(funderId, { associatedSchoolIds: remaining }, remaining);
      }
    }

    showToast(`Unassigned ${schoolName} from ${funderName}. School is now unfunded.`);
    setUnassignConfirmState(null);
  };

  // Execute Delete Funder
  const handleExecuteDeleteFunder = () => {
    if (!deleteConfirmFunder) return;
    if (onDeleteFunder) {
      onDeleteFunder(deleteConfirmFunder.id);
    }
    showToast(`Deleted funding entity "${deleteConfirmFunder.name}". Associated schools were unassigned.`);
    setDeleteConfirmFunder(null);
  };

  // Toggle school selection in Main Modal
  const handleToggleSchoolInModal = (schoolId: string) => {
    setModalAssignedSchoolIds((prev) =>
      prev.includes(schoolId) ? prev.filter((id) => id !== schoolId) : [...prev, schoolId]
    );
  };

  // Toggle school selection in Quick Assign Modal
  const handleToggleSchoolInAssignModal = (schoolId: string) => {
    setSelectedSchoolIdsToAssign((prev) =>
      prev.includes(schoolId) ? prev.filter((id) => id !== schoolId) : [...prev, schoolId]
    );
  };

  // Filtered schools for modal picker
  const modalAvailableSchools = useMemo(() => {
    return schools.filter((s) => {
      const isCurrentlyAssignedToThis = modalAssignedSchoolIds.includes(s.id);
      if (isCurrentlyAssignedToThis) return false; // Already in assigned list

      if (showOnlyUnfundedInModal && !isSchoolUnfunded(s)) {
        return false;
      }

      if (modalSchoolSearch.trim()) {
        const q = modalSchoolSearch.toLowerCase().trim();
        return (
          s.name.toLowerCase().includes(q) ||
          (s.city && s.city.toLowerCase().includes(q)) ||
          (s.principalName && s.principalName.toLowerCase().includes(q)) ||
          (s.id && s.id.toLowerCase().includes(q))
        );
      }

      return true;
    });
  }, [schools, modalAssignedSchoolIds, showOnlyUnfundedInModal, modalSchoolSearch]);

  // Filtered schools for dedicated assign modal
  const assignModalFilteredSchools = useMemo(() => {
    return schools.filter((s) => {
      // Must not already be assigned to this target funder
      if (targetFunderForAssignment && (s.funderId === targetFunderForAssignment.id || targetFunderForAssignment.associatedSchoolIds?.includes(s.id))) {
        return false;
      }

      // Prioritize unfunded schools
      if (assignModalSchoolSearch.trim()) {
        const q = assignModalSchoolSearch.toLowerCase().trim();
        return (
          s.name.toLowerCase().includes(q) ||
          (s.city && s.city.toLowerCase().includes(q)) ||
          (s.principalName && s.principalName.toLowerCase().includes(q)) ||
          (s.funderName && s.funderName.toLowerCase().includes(q)) ||
          (s.id && s.id.toLowerCase().includes(q))
        );
      }

      return true;
    });
  }, [schools, targetFunderForAssignment, assignModalSchoolSearch]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Toast Notification Banner */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-4 py-3 rounded-2xl shadow-xl border border-slate-700 flex items-center gap-3 text-xs font-semibold animate-in fade-in slide-in-from-bottom-3 duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
          <button
            onClick={() => setToastMessage(null)}
            className="ml-2 text-slate-400 hover:text-white cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#0089B3]/10 border border-[#0089B3]/20 flex items-center justify-center text-[#0089B3]">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
                FUNDING ENTITIES DIRECTORY
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Manage philanthropic partners, corporate sponsors, and assign grant allocations to partner schools
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          {unfundedSchools.length > 0 && funders.length > 0 && (
            <button
              onClick={() => {
                setTargetFunderForAssignment(funders[0]);
                setSelectedSchoolIdsToAssign([]);
                setAssignModalSchoolSearch('');
                setAssignModalOpen(true);
              }}
              className="px-4 py-2.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 font-bold rounded-xl text-xs flex items-center gap-2 shadow-xs transition-colors cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-amber-600" />
              <span>Assign Unfunded Schools ({unfundedSchools.length})</span>
            </button>
          )}

          <button
            onClick={handleOpenAdd}
            className="px-5 py-2.5 bg-[#0089B3] hover:bg-[#006E8F] text-white font-bold rounded-xl text-xs shadow-md shadow-[#0089B3]/20 flex items-center gap-2 transition-all cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Add Funder Entity</span>
          </button>
        </div>
      </div>

      {/* Metric Cards Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Funders</div>
            <div className="text-2xl font-black text-slate-900 mt-1">{totalFunders}</div>
            <div className="text-[11px] text-slate-500 mt-0.5">Active grant organizations</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-[#EDF7FC] text-[#0089B3] flex items-center justify-center">
            <Building2 className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Funded Schools</div>
            <div className="text-2xl font-black text-slate-900 mt-1">
              {totalFundedSchoolsCount} <span className="text-xs text-slate-400 font-medium">/ {schools.length}</span>
            </div>
            <div className="text-[11px] text-[#2D5F00] font-semibold mt-0.5">
              {schools.length > 0 ? `${Math.round((totalFundedSchoolsCount / schools.length) * 100)}% coverage` : '0%'}
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-[#F2FCE2] text-[#2D5F00] flex items-center justify-center">
            <SchoolIcon className="w-5 h-5" />
          </div>
        </div>

        <div
          className={`p-4 rounded-2xl border shadow-xs flex items-center justify-between cursor-pointer transition-all ${
            unfundedSchools.length > 0
              ? 'bg-amber-50/70 border-amber-200 hover:border-amber-300'
              : 'bg-white border-slate-200'
          }`}
          onClick={() => {
            if (unfundedSchools.length > 0 && funders.length > 0) {
              setTargetFunderForAssignment(funders[0]);
              setSelectedSchoolIdsToAssign([]);
              setAssignModalSchoolSearch('');
              setAssignModalOpen(true);
            }
          }}
        >
          <div>
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Unfunded Schools</div>
            <div className="flex items-baseline gap-2 mt-1">
              <span className={`text-2xl font-black ${unfundedSchools.length > 0 ? 'text-amber-700' : 'text-slate-900'}`}>
                {unfundedSchools.length}
              </span>
              {unfundedSchools.length > 0 && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-200 text-amber-800">
                  Needs Funder
                </span>
              )}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              {unfundedSchools.length > 0 ? 'Click to assign to a funder →' : 'All schools assigned'}
            </div>
          </div>
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${unfundedSchools.length > 0 ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'}`}>
            <AlertCircle className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Funded Allocations</div>
            <div className="text-2xl font-black text-slate-900 mt-1">
              ${totalAssignedBudget.toLocaleString()}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">Annual sponsor commitments</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-[#EDF7FC] text-[#0089B3] flex items-center justify-center">
            <DollarSign className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Unfunded Schools Callout Banner (If any exist) */}
      {unfundedSchools.length > 0 && (
        <div className="bg-amber-50/90 border border-amber-200/90 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-xl bg-amber-100 text-amber-800 shrink-0 mt-0.5">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <div className="font-bold text-amber-900 text-xs">
                {unfundedSchools.length} Partner School{unfundedSchools.length > 1 ? 's' : ''} currently awaiting funding assignment
              </div>
              <div className="text-[11px] text-amber-800/80 mt-0.5 flex flex-wrap gap-1.5 items-center">
                <span>Schools:</span>
                {unfundedSchools.map((s) => (
                  <span
                    key={s.id}
                    className="inline-flex items-center px-2 py-0.5 rounded-md bg-amber-200/80 text-amber-900 font-semibold text-[10px]"
                  >
                    {s.name} ({s.city || 'IL'})
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {funders.length > 0 ? (
              <button
                onClick={() => {
                  setTargetFunderForAssignment(funders[0]);
                  setSelectedSchoolIdsToAssign(unfundedSchools.map((s) => s.id));
                  setAssignModalSchoolSearch('');
                  setAssignModalOpen(true);
                }}
                className="px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl text-xs shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Link2 className="w-3.5 h-3.5" />
                <span>Assign All to Funder</span>
              </button>
            ) : (
              <button
                onClick={handleOpenAdd}
                className="px-3.5 py-2 bg-[#0089B3] hover:bg-[#006E8F] text-white font-bold rounded-xl text-xs transition-colors cursor-pointer"
              >
                + Create First Funder
              </button>
            )}
          </div>
        </div>
      )}

      {/* Search & Filter Toolbar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
        <div className="relative flex-1 min-w-[260px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search funder entity name, category, contact, or assigned schools..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:border-[#0089B3]"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-[11px] font-semibold text-slate-600 shrink-0">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                statusFilter === 'all' ? 'bg-[#0F172A] text-white shadow-xs font-bold' : 'hover:text-slate-900'
              }`}
            >
              All ({funders.length})
            </button>
            <button
              onClick={() => setStatusFilter('with_schools')}
              className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                statusFilter === 'with_schools' ? 'bg-[#0F172A] text-white shadow-xs font-bold' : 'hover:text-slate-900'
              }`}
            >
              With Schools
            </button>
            <button
              onClick={() => setStatusFilter('no_schools')}
              className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                statusFilter === 'no_schools' ? 'bg-[#0F172A] text-white shadow-xs font-bold' : 'hover:text-slate-900'
              }`}
            >
              No Schools
            </button>
          </div>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:border-[#0089B3] shrink-0"
          >
            <option value="all">All Types / Categories</option>
            <option value="Foundation">Philanthropic Foundation</option>
            <option value="Corporate">Corporate Partner</option>
            <option value="Government">Government Grant</option>
            <option value="Nonprofit">Nonprofit</option>
            <option value="Individual">Individual Donor</option>
            <option value="Other">Other</option>
          </select>
        </div>
      </div>

      {/* Funders Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="py-3.5 px-4 font-bold uppercase tracking-wider text-slate-500">Funder Organization</th>
                <th className="py-3.5 px-4 font-bold uppercase tracking-wider text-slate-500">Category</th>
                <th className="py-3.5 px-4 font-bold uppercase tracking-wider text-slate-500">Primary Contact</th>
                <th className="py-3.5 px-4 font-bold uppercase tracking-wider text-slate-500">
                  <div className="flex items-center gap-1.5">
                    <span>Allocated Schools</span>
                    <span className="text-[10px] font-normal text-slate-400 lowercase">(and quick assign)</span>
                  </div>
                </th>
                <th className="py-3.5 px-4 font-bold uppercase tracking-wider text-slate-500 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {filteredFunders.map((f, index) => {
                const assignedSchools = schools.filter(
                  (s) => s.funderId === f.id || f.associatedSchoolIds?.includes(s.id)
                );
                const totalSchoolBudget = assignedSchools.reduce((sum, s) => sum + (s.annualBudget || 0), 0);
                const isNearBottom = filteredFunders.length > 2 && index >= filteredFunders.length - 2;

                return (
                  <tr
                    key={f.id}
                    className="hover:bg-slate-50/80 transition-colors group cursor-pointer"
                    onClick={(e) => {
                      if (
                        (e.target as HTMLElement).closest('button') ||
                        (e.target as HTMLElement).closest('a')
                      ) {
                        return;
                      }
                      handleOpenEdit(f);
                    }}
                  >
                    {/* Funder Name */}
                    <td className="py-3.5 px-4 align-top">
                      <div className="flex items-start gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-[#EDF7FC] text-[#0089B3] flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                          {f.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-bold text-slate-900 text-sm hover:text-[#0089B3] transition-colors">
                            {f.name}
                          </div>
                          {f.notes && (
                            <div className="text-[11px] text-slate-500 mt-0.5 line-clamp-2 max-w-[280px]">
                              {f.notes}
                            </div>
                          )}
                          <div className="text-[10px] text-slate-400 mt-1 font-mono">{f.id}</div>
                        </div>
                      </div>
                    </td>

                    {/* Category Type */}
                    <td className="py-3.5 px-4 align-top">
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase bg-[#EDF7FC] text-[#006E8F] inline-block">
                        {f.type}
                      </span>
                    </td>

                    {/* Primary Contact */}
                    <td className="py-3.5 px-4 align-top">
                      {f.contactName ? (
                        <div className="space-y-0.5">
                          <div className="font-semibold text-slate-800 flex items-center gap-1.5">
                            <User className="w-3 h-3 text-slate-400" />
                            <span>{f.contactName}</span>
                          </div>
                          {f.contactEmail && (
                            <div className="text-slate-500 text-[11px] flex items-center gap-1.5">
                              <Mail className="w-3 h-3 text-slate-400" />
                              <a
                                href={`mailto:${f.contactEmail}`}
                                onClick={(e) => e.stopPropagation()}
                                className="hover:underline hover:text-[#0089B3]"
                              >
                                {f.contactEmail}
                              </a>
                            </div>
                          )}
                          {f.contactPhone && (
                            <div className="text-slate-500 text-[11px] flex items-center gap-1.5">
                              <Phone className="w-3 h-3 text-slate-400" />
                              <span>{f.contactPhone}</span>
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-400 italic text-[11px]">No contact info</span>
                      )}
                    </td>

                    {/* Allocated Schools */}
                    <td className="py-3.5 px-4 align-top">
                      <div className="space-y-2">
                        {/* School Chips with direct Unassign action */}
                        <div className="flex flex-wrap items-center gap-1.5">
                          {assignedSchools.map((s) => (
                            <div
                              key={s.id}
                              className="group/chip inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 hover:bg-slate-200/90 border border-slate-200 rounded-lg text-[11px] font-semibold text-slate-700 transition-colors"
                            >
                              <SchoolIcon className="w-3 h-3 text-slate-500 shrink-0" />
                              <Link
                                to={`/admin/schools/${s.id}`}
                                onClick={(e) => e.stopPropagation()}
                                className="hover:text-[#0089B3] hover:underline truncate max-w-[140px]"
                                title={`${s.name} ($${(s.annualBudget || 0).toLocaleString()})`}
                              >
                                {s.name}
                              </Link>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setUnassignConfirmState({
                                    funderId: f.id,
                                    funderName: f.name,
                                    schoolId: s.id,
                                    schoolName: s.name,
                                  });
                                }}
                                className="w-4 h-4 rounded-full flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-rose-100 transition-colors ml-0.5 cursor-pointer"
                                title={`Unassign ${s.name} from ${f.name}`}
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          ))}

                          {/* Quick Add School Button directly in the cell! */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenAssignModal(f);
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#F2FCE2] hover:bg-[#E2F7C2] text-[#2D5F00] border border-[#6EBF00]/50 rounded-lg text-[11px] font-bold transition-colors cursor-pointer"
                            title={`Assign partner schools to ${f.name}`}
                          >
                            <Plus className="w-3 h-3" />
                            <span>Add School</span>
                          </button>
                        </div>

                        {/* Summary caption */}
                        {assignedSchools.length > 0 && (
                          <div className="text-[10px] text-slate-500 font-medium">
                            {assignedSchools.length} school{assignedSchools.length > 1 ? 's' : ''} funded •{' '}
                            <span className="font-bold text-slate-700">${totalSchoolBudget.toLocaleString()}</span> annual budget
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Row Actions */}
                    <td className="py-3.5 px-4 align-top text-right">
                      <div className="relative inline-block text-left" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => setOpenMenuFunderId(openMenuFunderId === f.id ? null : f.id)}
                          className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
                          title="Actions menu"
                          aria-label={`Actions for ${f.name}`}
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>

                        {openMenuFunderId === f.id && (
                          <>
                            {/* Backdrop overlay to close when clicking outside */}
                            <div
                              className="fixed inset-0 z-30"
                              onClick={() => setOpenMenuFunderId(null)}
                            />

                            {/* 3-Dot Dropdown Menu */}
                            <div
                              onClick={(e) => e.stopPropagation()}
                              className={`absolute right-0 ${
                                isNearBottom ? 'bottom-full mb-1.5' : 'top-full mt-1.5'
                              } z-40 w-56 bg-white border border-slate-200 rounded-2xl shadow-xl py-1.5 text-left text-xs divide-y divide-slate-100 animate-fade-in`}
                            >
                              <div className="py-1">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setOpenMenuFunderId(null);
                                    handleOpenAssignModal(f);
                                  }}
                                  className="w-full px-3.5 py-2 flex items-center gap-2 hover:bg-slate-50 text-slate-700 font-semibold cursor-pointer"
                                >
                                  <Link2 className="w-4 h-4 text-[#0089B3]" />
                                  <span>Assign / Manage Schools</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setOpenMenuFunderId(null);
                                    handleOpenEdit(f);
                                  }}
                                  className="w-full px-3.5 py-2 flex items-center gap-2 hover:bg-slate-50 text-slate-700 font-semibold cursor-pointer"
                                >
                                  <Edit3 className="w-4 h-4 text-slate-500" />
                                  <span>Edit Funder Profile</span>
                                </button>
                              </div>
                              <div className="py-1">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setOpenMenuFunderId(null);
                                    setDeleteConfirmFunder(f);
                                  }}
                                  className="w-full px-3.5 py-2 flex items-center gap-2 hover:bg-rose-50 text-rose-600 font-semibold cursor-pointer"
                                >
                                  <Trash2 className="w-4 h-4" />
                                  <span>Delete Funder</span>
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

              {filteredFunders.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-500">
                    <div className="max-w-md mx-auto space-y-2">
                      <Building2 className="w-8 h-8 text-slate-300 mx-auto" />
                      <div className="font-bold text-slate-700 text-sm">No funding entities found</div>
                      <div className="text-xs text-slate-400">
                        {searchQuery ? `No funders matched your query "${searchQuery}".` : 'Get started by registering your first funding partner.'}
                      </div>
                      {searchQuery && (
                        <button
                          onClick={() => {
                            setSearchQuery('');
                            setTypeFilter('all');
                            setStatusFilter('all');
                          }}
                          className="text-xs font-bold text-[#0089B3] hover:underline pt-2 cursor-pointer"
                        >
                          Clear all filters
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 1. Main Modal: Add / Edit Funder with Full School Assignment Selector     */}
      {/* ========================================================================= */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <form
            onSubmit={handleSubmitMainModal}
            className="bg-white rounded-2xl p-6 max-w-2xl w-full space-y-5 shadow-2xl text-xs my-8"
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b pb-3.5">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#EDF7FC] text-[#0089B3] flex items-center justify-center">
                  <Building2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900">
                    {editingFunder ? `Edit Funder: ${editingFunder.name}` : 'Add New Funding Entity'}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Configure funder contact info and manage assigned school grants
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Entity Information Fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="sm:col-span-2">
                <label className="block font-bold mb-1 text-slate-700">Funder Entity Name *</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Horizon Education Foundation"
                  required
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl font-medium focus:outline-none focus:border-[#0089B3]"
                />
              </div>

              <div>
                <label className="block font-bold mb-1 text-slate-700">Category / Type *</label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value as Funder['type'])}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl font-medium focus:outline-none focus:border-[#0089B3]"
                >
                  <option value="Foundation">Philanthropic Foundation</option>
                  <option value="Corporate">Corporate Partner</option>
                  <option value="Individual">Individual Donor</option>
                  <option value="Government">Government Grant</option>
                  <option value="Nonprofit">Nonprofit</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="block font-bold mb-1 text-slate-700">Contact Person Name</label>
                <input
                  type="text"
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  placeholder="Primary grant representative"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                />
              </div>

              <div>
                <label className="block font-bold mb-1 text-slate-700">Contact Email</label>
                <input
                  type="email"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  placeholder="grants@foundation.org"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                />
              </div>

              <div>
                <label className="block font-bold mb-1 text-slate-700">Contact Phone</label>
                <input
                  type="text"
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  placeholder="(312) 555-0100"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block font-bold mb-1 text-slate-700">Grant Terms / Internal Notes</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  placeholder="Optional grant parameters, reporting timelines, or funding focus areas..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs"
                />
              </div>
            </div>

            {/* ================================================================= */}
            {/* SCHOOL ASSIGNMENTS & FUNDING ALLOCATION SECTION                   */}
            {/* ================================================================= */}
            <div className="pt-3 border-t border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                    <SchoolIcon className="w-3.5 h-3.5 text-[#2D5F00]" />
                    <span>Associated Partner Schools ({modalAssignedSchoolIds.length})</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Select schools funded by this entity. You can assign unfunded schools directly below.
                  </p>
                </div>

                <div className="text-right">
                  <span className="text-[11px] font-bold text-slate-700">
                    Total: $
                    {schools
                      .filter((s) => modalAssignedSchoolIds.includes(s.id))
                      .reduce((sum, s) => sum + (s.annualBudget || 0), 0)
                      .toLocaleString()}
                  </span>
                </div>
              </div>

              {/* 1. Currently Selected / Assigned Schools List */}
              {modalAssignedSchoolIds.length > 0 ? (
                <div className="space-y-1.5 max-h-36 overflow-y-auto p-2 bg-slate-50 rounded-xl border border-slate-200">
                  {schools
                    .filter((s) => modalAssignedSchoolIds.includes(s.id))
                    .map((school) => (
                      <div
                        key={school.id}
                        className="flex items-center justify-between p-2 bg-white rounded-lg border border-slate-200 text-xs font-semibold text-slate-800 hover:border-slate-300 transition-colors"
                      >
                        <div className="flex items-center gap-2 min-w-0 truncate">
                          <SchoolIcon className="w-3.5 h-3.5 text-[#2D5F00] shrink-0" />
                          <span className="truncate">{school.name}</span>
                          <span className="text-[10px] text-slate-400 font-normal shrink-0">
                            ({school.city || 'IL'} • {school.studentCount || 0} students)
                          </span>
                        </div>

                        <div className="flex items-center gap-2 shrink-0 ml-2">
                          <span className="text-[11px] font-bold text-[#2D5F00]">
                            ${(school.annualBudget || 0).toLocaleString()}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleToggleSchoolInModal(school.id)}
                            className="px-2 py-0.5 text-[10px] font-bold rounded text-rose-600 hover:bg-rose-50 border border-rose-200 cursor-pointer"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    ))}
                </div>
              ) : (
                <div className="p-3 bg-slate-50 rounded-xl border border-dashed border-slate-200 text-center text-slate-500 text-xs">
                  No partner schools currently assigned to this funder entity.
                </div>
              )}

              {/* 2. Add / Assign More Schools (Unfunded Schools Selector) */}
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-2.5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                    <PlusCircle className="w-3.5 h-3.5 text-[#0089B3]" />
                    <span>Select Schools to Add:</span>
                  </div>

                  {/* Toggle filter */}
                  <label className="flex items-center gap-1.5 text-[11px] text-slate-600 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={showOnlyUnfundedInModal}
                      onChange={(e) => setShowOnlyUnfundedInModal(e.target.checked)}
                      className="rounded border-slate-300 text-[#0089B3] focus:ring-[#0089B3]"
                    />
                    <span>Show only unfunded schools</span>
                  </label>
                </div>

                {/* Search in modal */}
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
                  <input
                    type="text"
                    placeholder="Filter schools by name or city..."
                    value={modalSchoolSearch}
                    onChange={(e) => setModalSchoolSearch(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium focus:outline-none focus:border-[#0089B3]"
                  />
                </div>

                {/* Available schools list with checkboxes */}
                <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1">
                  {modalAvailableSchools.map((s) => {
                    const isUnfunded = isSchoolUnfunded(s);
                    return (
                      <div
                        key={s.id}
                        onClick={() => handleToggleSchoolInModal(s.id)}
                        className="flex items-center justify-between p-2 bg-white hover:bg-[#EDF7FC]/50 rounded-lg border border-slate-200 hover:border-[#0089B3]/40 transition-all cursor-pointer select-none text-xs"
                      >
                        <div className="flex items-center gap-2 min-w-0 truncate">
                          <div className="w-4 h-4 rounded border border-slate-300 flex items-center justify-center bg-white shrink-0">
                            {modalAssignedSchoolIds.includes(s.id) && <Check className="w-3 h-3 text-[#0089B3]" />}
                          </div>
                          <div className="truncate">
                            <div className="font-semibold text-slate-900 truncate">{s.name}</div>
                            <div className="text-[10px] text-slate-500">
                              {s.city || 'IL'} • {s.studentCount || 0} students • Annual: ${(s.annualBudget || 0).toLocaleString()}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0 ml-2">
                          {isUnfunded ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                              Unfunded
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-600">
                              {s.funderName || 'Funded'}
                            </span>
                          )}
                          <span className="text-[#0089B3] font-bold text-xs hover:underline flex items-center gap-0.5">
                            + Add
                          </span>
                        </div>
                      </div>
                    );
                  })}

                  {modalAvailableSchools.length === 0 && (
                    <div className="text-center py-4 text-slate-400 italic text-[11px]">
                      {modalSchoolSearch
                        ? 'No schools matching search query.'
                        : showOnlyUnfundedInModal
                        ? 'All partner schools are currently assigned to a funder.'
                        : 'No additional schools available.'}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex gap-2 justify-end pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="px-4 py-2 border border-slate-200 rounded-xl font-semibold text-slate-700 hover:bg-slate-100 cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-[#0089B3] hover:bg-[#006E8F] text-white font-bold rounded-xl shadow-md shadow-[#0089B3]/20 cursor-pointer transition-all flex items-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                <span>{editingFunder ? 'Save Funder & Schools' : 'Create Funder Entity'}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. Dedicated "Assign Schools to Funder" Quick Modal                        */}
      {/* ========================================================================= */}
      {assignModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <form
            onSubmit={handleSubmitAssignModal}
            className="bg-white rounded-2xl p-6 max-w-xl w-full space-y-4 shadow-2xl text-xs my-8"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b pb-3.5">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#EDF7FC] text-[#0089B3] flex items-center justify-center">
                  <Link2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900">
                    Assign Schools to {targetFunderForAssignment?.name || 'Funder'}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Select unfunded schools to allocate under this funding partner
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setAssignModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Target Funder Switcher */}
            <div>
              <label className="block font-bold mb-1 text-slate-700">Select Target Funding Entity *</label>
              <select
                value={targetFunderForAssignment?.id || ''}
                onChange={(e) => {
                  const chosen = funders.find((f) => f.id === e.target.value);
                  if (chosen) setTargetFunderForAssignment(chosen);
                }}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl font-semibold text-slate-800 focus:outline-none focus:border-[#0089B3]"
              >
                {funders.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name} ({f.type})
                  </option>
                ))}
              </select>
            </div>

            {/* School Search & Selection */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="font-bold text-slate-800">
                  Select Schools to Assign ({selectedSchoolIdsToAssign.length} selected)
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const allUnfundedIds = assignModalFilteredSchools
                        .filter(isSchoolUnfunded)
                        .map((s) => s.id);
                      setSelectedSchoolIdsToAssign(allUnfundedIds);
                    }}
                    className="text-[10px] font-bold text-[#0089B3] hover:underline cursor-pointer"
                  >
                    Select All Unfunded
                  </button>
                  <span className="text-slate-300">•</span>
                  <button
                    type="button"
                    onClick={() => setSelectedSchoolIdsToAssign([])}
                    className="text-[10px] font-semibold text-slate-500 hover:underline cursor-pointer"
                  >
                    Clear
                  </button>
                </div>
              </div>

              {/* Search input */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
                <input
                  type="text"
                  placeholder="Search by school name, city, principal..."
                  value={assignModalSchoolSearch}
                  onChange={(e) => setAssignModalSchoolSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:border-[#0089B3]"
                />
              </div>

              {/* List of Schools */}
              <div className="max-h-60 overflow-y-auto space-y-1.5 p-1 bg-slate-50 rounded-xl border border-slate-200">
                {assignModalFilteredSchools.map((s) => {
                  const isSelected = selectedSchoolIdsToAssign.includes(s.id);
                  const isUnfunded = isSchoolUnfunded(s);

                  return (
                    <div
                      key={s.id}
                      onClick={() => handleToggleSchoolInAssignModal(s.id)}
                      className={`flex items-center justify-between p-2.5 rounded-xl border transition-all cursor-pointer select-none ${
                        isSelected
                          ? 'bg-[#EDF7FC] border-[#0089B3]/40 text-slate-900 shadow-xs'
                          : 'bg-white border-slate-200 hover:border-slate-300 text-slate-800'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0 truncate">
                        <div
                          className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
                            isSelected
                              ? 'bg-[#0089B3] border-[#0089B3] text-white'
                              : 'bg-white border-slate-300'
                          }`}
                        >
                          {isSelected && <Check className="w-3 h-3" />}
                        </div>
                        <div className="truncate">
                          <div className="font-bold truncate">{s.name}</div>
                          <div className="text-[10px] text-slate-500 mt-0.5">
                            {s.city || 'IL'} • {s.studentCount || 0} students • Principal: {s.principalName || 'N/A'}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 ml-2">
                        {isUnfunded ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                            Unfunded
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-600">
                            Currently: {s.funderName}
                          </span>
                        )}
                        <span className="text-[11px] font-bold text-slate-900">
                          ${(s.annualBudget || 0).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  );
                })}

                {assignModalFilteredSchools.length === 0 && (
                  <div className="text-center py-6 text-slate-400 italic text-xs">
                    No schools available matching search filter.
                  </div>
                )}
              </div>
            </div>

            {/* Selected Summary Strip */}
            {selectedSchoolIdsToAssign.length > 0 && (
              <div className="p-3 bg-[#EDF7FC] border border-[#0089B3]/30 rounded-xl flex items-center justify-between text-xs font-semibold text-[#006E8F]">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#0089B3]" />
                  <span>
                    {selectedSchoolIdsToAssign.length} school{selectedSchoolIdsToAssign.length > 1 ? 's' : ''} ready to assign
                  </span>
                </div>
                <div className="font-bold">
                  Total Budget: $
                  {schools
                    .filter((s) => selectedSchoolIdsToAssign.includes(s.id))
                    .reduce((sum, s) => sum + (s.annualBudget || 0), 0)
                    .toLocaleString()}
                </div>
              </div>
            )}

            {/* Modal Buttons */}
            <div className="flex gap-2 justify-end pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setAssignModalOpen(false)}
                className="px-4 py-2 border border-slate-200 rounded-xl font-semibold text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={selectedSchoolIdsToAssign.length === 0}
                className={`px-5 py-2 font-bold rounded-xl shadow-md flex items-center gap-1.5 transition-all ${
                  selectedSchoolIdsToAssign.length > 0
                    ? 'bg-[#0089B3] hover:bg-[#006E8F] text-white shadow-[#0089B3]/20 cursor-pointer'
                    : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                }`}
              >
                <Check className="w-4 h-4" />
                <span>Assign {selectedSchoolIdsToAssign.length > 0 ? `(${selectedSchoolIdsToAssign.length}) Schools` : 'Schools'}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. Unassign Confirmation Dialog                                           */}
      {/* ========================================================================= */}
      {unassignConfirmState && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full space-y-4 shadow-2xl text-xs">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Unassign School from Funder?</h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Confirm unlinking school grant assignment
                </p>
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5 text-slate-700">
              <div>
                <span className="text-slate-500">School:</span>{' '}
                <span className="font-bold text-slate-900">{unassignConfirmState.schoolName}</span>
              </div>
              <div>
                <span className="text-slate-500">Current Funder:</span>{' '}
                <span className="font-bold text-slate-900">{unassignConfirmState.funderName}</span>
              </div>
              <p className="text-[11px] text-slate-500 pt-1">
                The school will become <strong>Unfunded (Direct PEF Funding)</strong> until reassigned to another partner entity.
              </p>
            </div>

            <div className="flex gap-2 justify-end pt-2">
              <button
                type="button"
                onClick={() => setUnassignConfirmState(null)}
                className="px-4 py-2 border border-slate-200 rounded-xl font-semibold text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExecuteUnassign}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl shadow-md shadow-rose-600/20 cursor-pointer"
              >
                Confirm Unassign
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. Delete Funder Confirmation Dialog                                      */}
      {/* ========================================================================= */}
      {deleteConfirmFunder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full space-y-4 shadow-2xl text-xs">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Delete Funder Entity?</h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  This action removes the funder record
                </p>
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1 text-slate-700">
              <div>
                <span className="text-slate-500">Entity:</span>{' '}
                <span className="font-bold text-slate-900">{deleteConfirmFunder.name}</span>
              </div>
              <p className="text-[11px] text-slate-500 pt-1">
                Any associated partner schools will be unassigned and returned to unfunded status.
              </p>
            </div>

            <div className="flex gap-2 justify-end pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmFunder(null)}
                className="px-4 py-2 border border-slate-200 rounded-xl font-semibold text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExecuteDeleteFunder}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl shadow-md shadow-rose-600/20 cursor-pointer"
              >
                Delete Funder
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
