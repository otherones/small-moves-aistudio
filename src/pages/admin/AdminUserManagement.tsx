import React, { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Users,
  UserPlus,
  ShieldCheck,
  Building2,
  Mail,
  Search,
  CheckCircle2,
  Clock,
  ShieldAlert,
  XCircle,
  X,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Copy,
  ExternalLink,
  RotateCw,
  RotateCcw,
  Ban,
  AlertTriangle,
  MoreVertical,
} from "lucide-react";
import {
  AppUser,
  PendingInvite,
  UserRole,
  School,
  PortalSettings,
} from "../../types";
import { useAuth } from "../../context/AuthContext";
import { renderInviteEmail, PRODUCTION_PORTAL_URL } from "../../utils/emailUtils";
import { ImportPrincipalsModal } from "../../components/admin/ImportPrincipalsModal";

interface AdminUserManagementProps {
  users: AppUser[];
  pendingInvites: PendingInvite[];
  schools: School[];
  settings?: PortalSettings;
  onCreateUser: (user: Partial<AppUser>) => void;
  onUpdateUser: (id: string, updates: Partial<AppUser>) => void;
  onRevokeUser?: (id: string) => void;
  onReactivateUser?: (id: string) => void;
  onDeleteUser: (id: string) => void;
  onCreateInvite: (invite: Partial<PendingInvite>) => void;
  onResendInvite: (id: string) => void;
  onRevokeInvite: (id: string) => void;
  onAcceptInvite: (invite: PendingInvite) => void;
}

export const AdminUserManagement: React.FC<AdminUserManagementProps> = ({
  users,
  pendingInvites,
  schools,
  settings,
  onCreateUser,
  onUpdateUser,
  onRevokeUser,
  onReactivateUser,
  onDeleteUser,
  onCreateInvite,
  onResendInvite,
  onRevokeInvite,
  onAcceptInvite,
}) => {
  const { userProfile } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialFilter = searchParams.get("filter");

  // Navigation tab state
  const [activeTab, setActiveTab] = useState<
    "all" | "admin" | "principal" | "additional_contact" | "pending" | "revoked"
  >(initialFilter === "pending" ? "pending" : "all");

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "active" | "pending" | "revoked"
  >(initialFilter === "pending" ? "pending" : initialFilter === "revoked" || initialFilter === "inactive" ? "revoked" : "all");

  // Dropdown 3-dot action menu tracking
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  // Modal for revoke / reactivate confirmation
  const [confirmModal, setConfirmModal] = useState<{
    type: "revoke" | "reactivate";
    userId: string;
    name: string;
    email: string;
  } | null>(null);

  // Sorting & Pagination
  type SortField = "name" | "role" | "school" | "status" | "date" | "lastLogin";
  type SortDir = "asc" | "desc";
  const [sortField, setSortField] = useState<SortField>("date");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  // Modal for new invite
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [importPrincipalsModalOpen, setImportPrincipalsModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Form states for Invite Modal
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [inviteRole, setInviteRole] = useState<UserRole>("principal");
  const [inviteSchoolId, setInviteSchoolId] = useState<string>("");
  const [inviteJobTitle, setInviteJobTitle] = useState("");
  const [inviteNotes, setInviteNotes] = useState("");

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Deduplicate and merge registered users and pending invites
  const combinedDirectoryMap = new Map<string, {
    id: string;
    name: string;
    email: string;
    phone?: string;
    role: UserRole;
    schoolId?: string;
    schoolName?: string;
    jobTitle?: string;
    status: "active" | "inactive" | "revoked" | "pending";
    date: string;
    lastLogin?: string;
    isInvite: boolean;
    mfaEnabled?: boolean;
  }>();

  // 1. Process managed registered & pending users
  users.forEach((u) => {
    const key = (u.email || u.id || "").trim().toLowerCase();
    if (!key) return;
    const rawStatus = (u.status || "active") as string;
    const normalizedStatus =
      rawStatus === "revoked"
        ? ("revoked" as const)
        : rawStatus === "invited" || rawStatus === "pending"
        ? ("pending" as const)
        : ("active" as const);

    const existing = combinedDirectoryMap.get(key);
    if (!existing) {
      combinedDirectoryMap.set(key, {
        id: u.id,
        name: u.name,
        email: u.email || "",
        phone: u.phone,
        role: u.role,
        schoolId: u.schoolId,
        schoolName: u.schoolName,
        jobTitle: u.jobTitle,
        status: normalizedStatus,
        date: u.createdAt,
        lastLogin: u.lastLoginAt,
        isInvite: normalizedStatus === "pending",
        mfaEnabled: u.mfaEnabled,
      });
    } else {
      const isURealUid = !u.id.startsWith("USR-");
      const isExistingRealUid = !existing.id.startsWith("USR-");
      const isAnyRevoked = normalizedStatus === "revoked" || existing.status === "revoked";
      const resolvedStatus = isAnyRevoked
        ? ("revoked" as const)
        : (normalizedStatus || existing.status || "active");

      if (isURealUid && !isExistingRealUid) {
        combinedDirectoryMap.set(key, {
          ...existing,
          id: u.id,
          name: u.name || existing.name,
          role: (u.role && u.role !== 'unassigned' ? u.role : existing.role) || u.role,
          schoolId: u.schoolId || existing.schoolId,
          schoolName: u.schoolName || existing.schoolName,
          status: resolvedStatus,
          date: u.createdAt || existing.date,
          lastLogin: u.lastLoginAt || existing.lastLogin,
          mfaEnabled: u.mfaEnabled ?? existing.mfaEnabled,
        });
      } else {
        combinedDirectoryMap.set(key, {
          ...existing,
          id: isURealUid ? u.id : existing.id,
          role: (existing.role && existing.role !== 'unassigned' ? existing.role : u.role) || existing.role,
          status: resolvedStatus,
          mfaEnabled: u.mfaEnabled ?? existing.mfaEnabled,
          lastLogin: u.lastLoginAt || existing.lastLogin,
          isInvite: false,
        });
      }
    }
  });

  // 2. Incorporate pending invites
  pendingInvites
    .filter((inv) => inv.status === "pending" || (inv.status as string) === "invited")
    .forEach((inv) => {
      const key = (inv.email || inv.id || "").trim().toLowerCase();
      if (!key) return;
      const existing = combinedDirectoryMap.get(key);
      if (!existing) {
        combinedDirectoryMap.set(key, {
          id: inv.id,
          name: inv.name,
          email: inv.email,
          phone: undefined,
          role: inv.role,
          schoolId: inv.schoolId,
          schoolName: inv.schoolName,
          jobTitle: inv.jobTitle,
          status: "pending" as const,
          date: inv.invitedAt,
          lastLogin: undefined,
          isInvite: true,
          mfaEnabled: false,
        });
      } else if (existing.status === "revoked") {
        // Explicitly revoked accounts must never be downgraded to pending invites
      } else if (existing.status === "pending") {
        combinedDirectoryMap.set(key, {
          ...existing,
          name: existing.name || inv.name,
          role: existing.role || inv.role,
          schoolId: existing.schoolId || inv.schoolId,
          schoolName: existing.schoolName || inv.schoolName,
          jobTitle: existing.jobTitle || inv.jobTitle,
          date: existing.date || inv.invitedAt,
          isInvite: true,
        });
      }
    });

  const allDirectoryItems = Array.from(combinedDirectoryMap.values());

  // Directory counts
  const totalUsersCount = allDirectoryItems.length;
  const adminsCount = allDirectoryItems.filter(
    (i) => i.role === "admin" && i.status !== "revoked",
  ).length;
  const principalsCount = allDirectoryItems.filter(
    (i) => i.role === "principal" && i.status !== "revoked",
  ).length;
  const contactsCount = allDirectoryItems.filter(
    (i) => i.role === "additional_contact" && i.status !== "revoked",
  ).length;
  const pendingInvitesCount = allDirectoryItems.filter(
    (i) => i.status === "pending",
  ).length;
  const revokedCount = allDirectoryItems.filter(
    (i) => i.status === "revoked" || (i.status as any) === "inactive",
  ).length;

  // Directory Filtering
  let filteredDirectory = allDirectoryItems.filter((item) => {
    // Status Filter Dropdown
    if (statusFilter === "active" && item.status !== "active") return false;
    if (statusFilter === "pending" && item.status !== "pending") return false;
    if (statusFilter === "revoked" && item.status !== "revoked" && (item.status as any) !== "inactive") return false;

    // Tab Filter
    if (statusFilter !== "revoked") {
      if (activeTab === "admin" && item.role !== "admin") return false;
      if (activeTab === "principal" && item.role !== "principal") return false;
      if (
        activeTab === "additional_contact" &&
        item.role !== "additional_contact"
      )
        return false;
      if (activeTab === "pending" && item.status !== "pending") return false;
      if (activeTab === "revoked" && item.status !== "revoked" && (item.status as any) !== "inactive") return false;
    }

    // Search Query
    const q = searchQuery.toLowerCase();
    if (!q) return true;
    return (
      item.name.toLowerCase().includes(q) ||
      item.email.toLowerCase().includes(q) ||
      item.schoolName?.toLowerCase().includes(q) ||
      item.jobTitle?.toLowerCase().includes(q)
    );
  });

  // Sorting
  filteredDirectory.sort((a, b) => {
    let comparison = 0;
    switch (sortField) {
      case "name":
        comparison = a.name.localeCompare(b.name);
        break;
      case "role":
        comparison = a.role.localeCompare(b.role);
        break;
      case "school":
        comparison = (a.schoolName || "").localeCompare(b.schoolName || "");
        break;
      case "status":
        comparison = a.status.localeCompare(b.status);
        break;
      case "date":
        comparison =
          new Date(a.date || 0).getTime() - new Date(b.date || 0).getTime();
        break;
      case "lastLogin":
        comparison =
          new Date(a.lastLogin || 0).getTime() -
          new Date(b.lastLogin || 0).getTime();
        break;
    }
    return sortDir === "asc" ? comparison : -comparison;
  });

  // Pagination
  const totalPages = Math.ceil(filteredDirectory.length / itemsPerPage);
  const paginatedDirectory = filteredDirectory.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage,
  );

  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, activeTab]);

  const handleOpenInviteModal = (defaultRole: UserRole = "principal") => {
    setInviteEmail("");
    setInviteName("");
    setInviteRole(defaultRole);
    setInviteSchoolId(schools[0]?.id || "");
    setInviteJobTitle(defaultRole === "admin" ? "PEF Administrator" : "");
    setInviteNotes("");
    setInviteModalOpen(true);
  };

  const handleSendInviteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const selectedSchool = schools.find((s) => s.id === inviteSchoolId);
    const newInvite: Partial<PendingInvite> = {
      id: `INV-${Date.now()}`,
      email: inviteEmail.trim(),
      name: inviteName.trim(),
      role: inviteRole,
      schoolId: inviteRole === "admin" ? undefined : inviteSchoolId,
      schoolName: inviteRole === "admin" ? undefined : selectedSchool?.name,
      jobTitle:
        inviteJobTitle.trim() ||
        (inviteRole === "admin" ? "PEF Administrator" : undefined),
      invitedBy: userProfile?.displayName || "PEF Administrator",
      invitedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      status: "pending",
      notes: inviteNotes.trim() || undefined,
    };

    onCreateInvite(newInvite);
    setInviteModalOpen(false);
    showToast(
      `Invitation dispatched successfully to ${inviteEmail} as ${inviteRole.replace("_", " ")}`,
    );
  };

  const getRoleBadge = (role: UserRole) => {
    switch (role) {
      case "admin":
        return "Admin";
      case "principal":
        return "Principal";
      case "additional_contact":
        return "Authorized Contact";
    }
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Toast Banner */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-2xl border border-slate-700 flex items-center gap-3 text-xs font-bold animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header Title Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 bg-indigo-100 text-indigo-800 border border-indigo-200 text-[10px] font-black rounded-full uppercase tracking-wider flex items-center gap-1">
              <ShieldCheck className="w-3 h-3 text-indigo-600" /> Admin Access
              Restricted
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight mt-1">
            User & Security Directory
          </h1>
          <p className="text-xs md:text-sm text-slate-500 mt-0.5">
            Unified access management for registered users and pending
            invitations.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 self-start md:self-auto">
          <button
            onClick={() => setImportPrincipalsModalOpen(true)}
            className="px-4 py-2.5 bg-white hover:bg-slate-50 text-slate-700 font-bold rounded-xl text-xs flex items-center gap-2 border border-slate-300 shadow-2xs transition-all cursor-pointer"
          >
            <Mail className="w-4 h-4 text-emerald-600" />
            Import Principals & Queue Invites
          </button>

          <button
            onClick={() => handleOpenInviteModal("principal")}
            className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs flex items-center gap-2 shadow-md hover:shadow-lg transition-all cursor-pointer"
          >
            <UserPlus className="w-4 h-4 text-emerald-400" />
            Invite User
          </button>
        </div>
      </div>

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        <button
          onClick={() => setActiveTab("all")}
          className={`text-left p-5 rounded-2xl border shadow-xs transition-colors cursor-pointer ${activeTab === "all" ? "bg-slate-50 border-slate-400 ring-1 ring-slate-400" : "bg-white border-slate-200 hover:border-slate-300"}`}
        >
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
              Total Directory
            </span>
            <Users className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl font-black text-slate-900">
            {totalUsersCount}
          </div>
          <span className="text-[10px] text-slate-400 font-medium">
            Registered & Invites
          </span>
        </button>
        <button
          onClick={() => setActiveTab("admin")}
          className={`text-left p-5 rounded-2xl border shadow-xs transition-colors cursor-pointer ${activeTab === "admin" ? "bg-indigo-50 border-indigo-400 ring-1 ring-indigo-400" : "bg-white border-indigo-100 hover:border-indigo-300"}`}
        >
          <div className="flex items-center justify-between text-indigo-500 mb-1">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-indigo-700">
              Admins
            </span>
            <ShieldCheck className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-2xl font-black text-indigo-950">
            {adminsCount}
          </div>
          <span className="text-[10px] text-indigo-600/80 font-medium">
            System Administrators
          </span>
        </button>
        <button
          onClick={() => setActiveTab("principal")}
          className={`text-left p-5 rounded-2xl border shadow-xs transition-colors cursor-pointer ${activeTab === "principal" ? "bg-emerald-50 border-emerald-400 ring-1 ring-emerald-400" : "bg-white border-emerald-100 hover:border-emerald-300"}`}
        >
          <div className="flex items-center justify-between text-emerald-600 mb-1">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-800">
              Principals
            </span>
            <Building2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-slate-900">
            {principalsCount}
          </div>
          <span className="text-[10px] text-slate-500 font-medium">
            School Leaders
          </span>
        </button>
        <button
          onClick={() => setActiveTab("additional_contact")}
          className={`text-left p-5 rounded-2xl border shadow-xs transition-colors cursor-pointer ${activeTab === "additional_contact" ? "bg-sky-50 border-sky-400 ring-1 ring-sky-400" : "bg-white border-sky-100 hover:border-sky-300"}`}
        >
          <div className="flex items-center justify-between text-sky-600 mb-1">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-sky-800">
              Contacts
            </span>
            <Users className="w-4 h-4 text-sky-600" />
          </div>
          <div className="text-2xl font-black text-slate-900">
            {contactsCount}
          </div>
          <span className="text-[10px] text-slate-500 font-medium">
            Authorized Contacts
          </span>
        </button>
        <button
          onClick={() => setActiveTab("pending")}
          className={`text-left col-span-2 sm:col-span-1 p-5 rounded-2xl border shadow-xs transition-colors cursor-pointer ${activeTab === "pending" ? "bg-gradient-to-br from-amber-100 to-orange-100 border-amber-400 ring-1 ring-amber-400" : "bg-gradient-to-br from-amber-500/10 to-orange-500/10 border-amber-200/80 hover:border-amber-400"}`}
        >
          <div className="flex items-center justify-between text-amber-700 mb-1">
            <span className="text-[11px] font-extrabold uppercase tracking-wider">
              Pending Invites
            </span>
            <Clock className="w-4 h-4 text-amber-600 animate-pulse" />
          </div>
          <div className="text-2xl font-black text-amber-950">
            {pendingInvitesCount}
          </div>
          <span className="text-[10px] text-amber-800 font-medium">
            Awaiting Registration
          </span>
        </button>
      </div>

      {/* Tabs & Filters Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        {/* Navigation Tabs */}
        <div className="flex flex-wrap items-center justify-between border-b border-slate-100 pb-3 gap-2">
          <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0 w-full md:w-auto">
            <button
              onClick={() => setActiveTab("all")}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                activeTab === "all"
                  ? "bg-slate-900 text-white shadow-xs"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              All Users & Invites ({totalUsersCount})
            </button>
            <button
              onClick={() => setActiveTab("admin")}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                activeTab === "admin"
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              Admins ({adminsCount})
            </button>
            <button
              onClick={() => setActiveTab("principal")}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                activeTab === "principal"
                  ? "bg-emerald-600 text-white shadow-xs"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              Principals ({principalsCount})
            </button>
            <button
              onClick={() => setActiveTab("additional_contact")}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                activeTab === "additional_contact"
                  ? "bg-sky-600 text-white shadow-xs"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              Authorized Contacts ({contactsCount})
            </button>
            <button
              onClick={() => setActiveTab("pending")}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                activeTab === "pending"
                  ? "bg-amber-600 text-white shadow-xs"
                  : "text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200"
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              Pending Invites ({pendingInvitesCount})
            </button>
            <button
              onClick={() => {
                setActiveTab("revoked");
                setStatusFilter("all");
              }}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                activeTab === "revoked"
                  ? "bg-rose-600 text-white shadow-xs"
                  : "text-rose-800 bg-rose-50 hover:bg-rose-100 border border-rose-200"
              }`}
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              Revoked ({revokedCount})
            </button>
          </div>
        </div>

        {/* Search & Status Filter Row */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search by name, email, or school..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl font-medium focus:outline-hidden focus:border-slate-900"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <span className="font-bold text-slate-500 whitespace-nowrap">
              Account Status:
            </span>
            <select
              value={statusFilter}
              onChange={(e) => {
                const val = e.target.value as any;
                setStatusFilter(val);
                if (val === "revoked" && (activeTab === "pending" || activeTab === "admin" || activeTab === "principal" || activeTab === "additional_contact")) {
                  setActiveTab("all");
                }
              }}
              className="px-3 py-2 border border-slate-200 rounded-xl font-bold bg-slate-50 text-slate-700 focus:outline-hidden"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active Only</option>
              <option value="pending">Pending Invites</option>
              <option value="revoked">Revoked</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Unified User Management Table */}
      <div className="space-y-4">
        {filteredDirectory.length === 0 ? (
          <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center text-slate-500 space-y-3">
            {statusFilter === "revoked" || activeTab === "revoked" ? (
              <>
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto border border-emerald-200">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <p className="font-bold text-slate-900 text-sm">
                  No Revoked Accounts
                </p>
                <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
                  All accounts in the portal are currently in good standing (Active or Pending).
                  To revoke access for any user, click the 3-dot action menu (⋮) on their row in the table and select <span className="font-semibold text-rose-600">"Revoke Access"</span>. Revoked accounts will appear here immediately and can be reactivated at any time.
                </p>
              </>
            ) : (
              <>
                <Users className="w-10 h-10 text-slate-300 mx-auto" />
                <p className="font-bold text-slate-700 text-sm">
                  No Users or Invites Found
                </p>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  No entries matched your current search or tab filters.
                </p>
              </>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-normal text-slate-700">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-normal text-xs">
                  <tr>
                    <th
                      className="py-3 px-4 font-normal cursor-pointer hover:bg-slate-100"
                      onClick={() => handleSort("name")}
                    >
                      User Details
                    </th>
                    <th
                      className="py-3 px-4 font-normal cursor-pointer hover:bg-slate-100"
                      onClick={() => handleSort("role")}
                    >
                      User Classification
                    </th>
                    <th
                      className="py-3 px-4 font-normal cursor-pointer hover:bg-slate-100"
                      onClick={() => handleSort("school")}
                    >
                      School Affiliation
                    </th>
                    <th
                      className="py-3 px-4 font-normal cursor-pointer hover:bg-slate-100"
                      onClick={() => handleSort("status")}
                    >
                      Status
                    </th>
                    <th
                      className="py-3 px-4 font-normal cursor-pointer hover:bg-slate-100"
                      onClick={() => handleSort("date")}
                    >
                      Created / Invited Date
                    </th>
                    <th
                      className="py-3 px-4 font-normal text-slate-600"
                    >
                      2FA Status
                    </th>
                    <th
                      className="py-3 px-4 font-normal cursor-pointer hover:bg-slate-100"
                      onClick={() => handleSort("lastLogin")}
                    >
                      Last Login
                    </th>
                    <th className="py-3 px-4 font-normal text-right">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-normal">
                  {paginatedDirectory.map((item) => {
                    const isOwner =
                      item.email.toLowerCase() === "cshanecolley@gmail.com";
                    return (
                      <tr
                        key={item.id}
                        onClick={(e) => {
                          if (
                            (e.target as HTMLElement).closest("button") ||
                            (e.target as HTMLElement).closest("a")
                          ) {
                            return;
                          }
                          navigate(`/profile?userId=${item.id}`);
                        }}
                        className="hover:bg-slate-50 transition-colors cursor-pointer"
                      >
                        <td className="py-3 px-4">
                          <div>
                            <div className="text-slate-900">
                              <span className="font-bold">{item.name}</span>
                              {isOwner && (
                                <span className="text-slate-500 font-normal">
                                  {" "}
                                  (Owner)
                                </span>
                              )}
                            </div>
                            <div className="text-slate-500 text-[11px] font-normal">
                              <span>{item.email}</span>
                              {item.phone && <span> · {item.phone}</span>}
                            </div>
                          </div>
                        </td>

                        <td className="py-3 px-4 font-normal">
                          <div>
                            <span>{getRoleBadge(item.role)}</span>
                            {item.jobTitle && (
                              <p className="text-[11px] text-slate-500 font-normal mt-0.5">
                                {item.jobTitle}
                              </p>
                            )}
                          </div>
                        </td>

                        <td className="py-3 px-4 font-normal text-slate-700">
                          {item.schoolName ||
                            (item.role === "admin"
                              ? "All Schools (Global)"
                              : "Unassigned")}
                        </td>

                        <td className="py-3 px-4 font-normal text-slate-700">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                              item.status === "pending"
                                ? "bg-amber-50 text-amber-800 border-amber-200"
                                : item.status === "active"
                                  ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                                  : "bg-rose-50 text-rose-800 border-rose-200"
                            }`}
                          >
                            {item.status === "pending"
                              ? "Pending Invite"
                              : item.status === "active"
                                ? "Active"
                                : "Revoked"}
                          </span>
                        </td>

                        <td className="py-3 px-4 font-normal text-slate-600">
                          {new Date(item.date).toLocaleDateString()}
                        </td>
                        <td className="py-3 px-4 font-normal text-slate-700">
                          {item.isInvite ? (
                            <span className="text-slate-400">N/A (Pending)</span>
                          ) : item.mfaEnabled ? (
                            <span className="text-emerald-700 font-semibold">Enabled</span>
                          ) : (
                            <span className="text-slate-500">Disabled</span>
                          )}
                        </td>
                        <td className="py-3 px-4 font-normal text-slate-600">
                          {item.lastLogin
                            ? new Date(item.lastLogin).toLocaleDateString()
                            : "Never"}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="relative inline-block text-left" onClick={(e) => e.stopPropagation()}>
                            <button
                              type="button"
                              onClick={() => setOpenMenuId(openMenuId === item.id ? null : item.id)}
                              className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
                              title="User actions"
                            >
                              <MoreVertical className="w-4 h-4" />
                            </button>

                            {openMenuId === item.id && (
                              <>
                                <div className="fixed inset-0 z-20" onClick={() => setOpenMenuId(null)} />
                                <div className="absolute right-0 top-full mt-1.5 w-44 bg-white rounded-2xl shadow-xl border border-slate-200 py-1.5 z-30 text-xs animate-fadeIn text-slate-700 divide-y divide-slate-100">
                                  <div className="py-1">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setOpenMenuId(null);
                                        navigate(`/profile?userId=${item.id}`);
                                      }}
                                      className="w-full text-left px-3.5 py-1.5 hover:bg-slate-50 flex items-center gap-2 font-medium cursor-pointer"
                                    >
                                      <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                                      View Profile
                                    </button>
                                  </div>

                                  {item.status === "pending" ? (
                                    <div className="py-1">
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setOpenMenuId(null);
                                          const setupUrl = `${window.location.origin}/setup-account?email=${encodeURIComponent(item.email)}`;
                                          navigator.clipboard.writeText(setupUrl);
                                          showToast(`Setup link copied for ${item.email}`);
                                        }}
                                        className="w-full text-left px-3.5 py-1.5 hover:bg-slate-50 flex items-center gap-2 font-medium cursor-pointer"
                                      >
                                        <Copy className="w-3.5 h-3.5 text-slate-400" />
                                        Copy Setup Link
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setOpenMenuId(null);
                                          onResendInvite(item.id);
                                          showToast(`Invitation resent to ${item.email}`);
                                        }}
                                        className="w-full text-left px-3.5 py-1.5 hover:bg-amber-50 text-amber-700 flex items-center gap-2 font-medium cursor-pointer"
                                      >
                                        <RotateCw className="w-3.5 h-3.5 text-amber-600" />
                                        Resend Invite
                                      </button>
                                    </div>
                                  ) : (
                                    <div className="py-1">
                                      {item.status === "revoked" || item.status === "inactive" ? (
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setOpenMenuId(null);
                                            setConfirmModal({
                                              type: "reactivate",
                                              userId: item.id,
                                              name: item.name,
                                              email: item.email,
                                            });
                                          }}
                                          className="w-full text-left px-3.5 py-1.5 hover:bg-emerald-50 text-emerald-700 font-bold flex items-center gap-2 cursor-pointer"
                                        >
                                          <RotateCcw className="w-3.5 h-3.5 text-emerald-600" />
                                          Reactivate Account
                                        </button>
                                      ) : (
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setOpenMenuId(null);
                                            setConfirmModal({
                                              type: "revoke",
                                              userId: item.id,
                                              name: item.name,
                                              email: item.email,
                                            });
                                          }}
                                          className="w-full text-left px-3.5 py-1.5 hover:bg-rose-50 text-rose-600 font-bold flex items-center gap-2 cursor-pointer"
                                        >
                                          <Ban className="w-3.5 h-3.5 text-rose-500" />
                                          Revoke Access
                                        </button>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="px-4 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
                <p className="text-xs text-slate-500 font-medium">
                  Showing{" "}
                  <span className="font-bold text-slate-900">
                    {(currentPage - 1) * itemsPerPage + 1}
                  </span>{" "}
                  to{" "}
                  <span className="font-bold text-slate-900">
                    {Math.min(
                      currentPage * itemsPerPage,
                      filteredDirectory.length,
                    )}
                  </span>{" "}
                  of{" "}
                  <span className="font-bold text-slate-900">
                    {filteredDirectory.length}
                  </span>{" "}
                  results
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() =>
                      setCurrentPage((p) => Math.min(totalPages, p + 1))
                    }
                    disabled={currentPage === totalPages}
                    className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 cursor-pointer"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Invite Modal */}
      {inviteModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-emerald-100 text-emerald-800 rounded-xl">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">
                    Send Portal Invitation
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Dispatch an email registration invite to a new school leader
                  </p>
                </div>
              </div>
              <button
                onClick={() => setInviteModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={handleSendInviteSubmit}
              className="space-y-3.5 text-xs"
            >
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Dr. Jane Smith"
                  value={inviteName}
                  onChange={(e) => setInviteName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl font-medium focus:outline-hidden focus:border-slate-900"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  placeholder="e.g. jsmith@cps.edu"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl font-medium focus:outline-hidden focus:border-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    User Classification
                  </label>
                  <select
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value as UserRole)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl font-bold bg-slate-50 text-slate-800"
                  >
                    <option value="principal">School Principal</option>
                    <option value="additional_contact">
                      Authorized Contact
                    </option>
                    <option value="admin">Program Admin</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Job Title
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Principal"
                    value={inviteJobTitle}
                    onChange={(e) => setInviteJobTitle(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl font-medium"
                  />
                </div>
              </div>

              {inviteRole !== "admin" && (
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    School Affiliation
                  </label>
                  <select
                    value={inviteSchoolId}
                    onChange={(e) => setInviteSchoolId(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl font-bold bg-slate-50 text-slate-800"
                  >
                    {schools.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.id})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Internal Invitation Notes (Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. New principal replacing outgoing admin for SY 2025-2026..."
                  value={inviteNotes}
                  onChange={(e) => setInviteNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl font-medium text-slate-700"
                />
              </div>

              {/* Template Rendered Live Preview */}
              {(() => {
                const selectedSch = schools.find(
                  (s) => s.id === inviteSchoolId,
                );
                const rendered = renderInviteEmail(
                  settings?.emailTemplates || [],
                  {
                    recipient_name: inviteName || "Portal User",
                    school_name:
                      inviteRole === "admin"
                        ? "Small Moves Organization"
                        : selectedSch?.name || "Partner School",
                    amount: (
                      selectedSch?.annualBudget || 10000
                    ).toLocaleString(),
                    custom_note: inviteNotes,
                    role: inviteRole,
                    invite_link: `${PRODUCTION_PORTAL_URL}/setup-account?email=${encodeURIComponent(inviteEmail || 'user@school.org')}`,
                  },
                );

                return (
                  <div className="space-y-1.5 border-t border-slate-100 pt-2.5">
                    <div className="flex justify-between items-center text-[10px] font-bold text-slate-500">
                      <span>
                        Email Template Preview ({rendered.template?.name}):
                      </span>
                      <span className="text-indigo-600 font-mono">
                        System Template System Active
                      </span>
                    </div>
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-mono text-[10px] text-slate-700 whitespace-pre-wrap leading-relaxed max-h-28 overflow-y-auto">
                      <div className="font-bold text-slate-900 border-b pb-1 mb-1">
                        Subject: {rendered.subject}
                      </div>
                      {rendered.body}
                    </div>
                  </div>
                );
              })()}

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setInviteModalOpen(false)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs flex items-center gap-2 shadow-md cursor-pointer"
                >
                  <UserPlus className="w-4 h-4 text-emerald-400" />
                  Dispatch Invite
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Revoke / Reactivate Confirmation Modal */}
      {confirmModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-200 space-y-4">
            <div className={`flex items-center gap-3 ${confirmModal.type === 'reactivate' ? 'text-emerald-600' : 'text-rose-600'}`}>
              <div className={`p-3 rounded-2xl shrink-0 ${confirmModal.type === 'reactivate' ? 'bg-emerald-100' : 'bg-rose-100'}`}>
                {confirmModal.type === 'reactivate' ? (
                  <RotateCcw className="w-6 h-6 text-emerald-600" />
                ) : (
                  <AlertTriangle className="w-6 h-6 text-rose-600" />
                )}
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-900">
                  {confirmModal.type === 'reactivate'
                    ? 'Reactivate Account Access?'
                    : 'Revoke User Access?'}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Action requested for {confirmModal.email}
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
              {confirmModal.type === 'reactivate'
                ? 'Reactivating access will restore portal privileges for this account immediately.'
                : 'Revoking access will immediately prevent this user from signing into the portal. You can reactivate their access at any time.'}
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setConfirmModal(null)}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={() => {
                  if (confirmModal.type === 'reactivate' && onReactivateUser) {
                    onReactivateUser(confirmModal.userId);
                    showToast(`Reactivated access for ${confirmModal.email}`);
                  } else if (confirmModal.type === 'revoke' && onRevokeUser) {
                    onRevokeUser(confirmModal.userId);
                    showToast(`Revoked access for ${confirmModal.email}`);
                  }
                  setConfirmModal(null);
                }}
                className={`px-5 py-2.5 text-white font-bold rounded-xl text-xs cursor-pointer shadow-md ${
                  confirmModal.type === 'reactivate'
                    ? 'bg-emerald-600 hover:bg-emerald-700'
                    : 'bg-rose-600 hover:bg-rose-700'
                }`}
              >
                {confirmModal.type === 'reactivate' ? 'Confirm Reactivation' : 'Confirm Revocation'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Principals Import Modal */}
      <ImportPrincipalsModal
        isOpen={importPrincipalsModalOpen}
        onClose={() => setImportPrincipalsModalOpen(false)}
        existingSchools={schools}
        settings={settings}
      />
    </div>
  );
};
