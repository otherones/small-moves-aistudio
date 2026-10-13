import React, { useState } from 'react';
import {
  User,
  PlusCircle,
  Mail,
  ShieldCheck,
  Search,
  Key,
  Trash2,
  Edit2,
  CheckCircle2,
  UserCheck,
  Building2,
  Bell,
} from 'lucide-react';
import { AdminUser, AdminRole, School } from '../../types';
import { useAuth } from '../../context/AuthContext';

interface AdminManagementProps {
  adminUsers: AdminUser[];
  schools?: School[];
  onCreateAdminUser: (admin: Partial<AdminUser>) => void;
  onUpdateAdminUser?: (id: string, updates: Partial<AdminUser>) => void;
  onDeleteAdminUser?: (id: string) => void;
}

export const AdminManagement: React.FC<AdminManagementProps> = ({
  adminUsers,
  schools = [],
  onCreateAdminUser,
  onUpdateAdminUser,
  onDeleteAdminUser,
}) => {
  const { user, userProfile } = useAuth();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingAdmin, setEditingAdmin] = useState<AdminUser | null>(null);
  const [deleteConfirmAdmin, setDeleteConfirmAdmin] = useState<AdminUser | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [filterRole, setFilterRole] = useState<string>('all');

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<AdminRole>('admin');
  const [notificationPref, setNotificationPref] = useState<'all' | 'ready_to_pay' | 'none'>('all');

  const handleOpenCreate = () => {
    setEditingAdmin(null);
    setName('');
    setEmail('');
    setRole('admin');
    setNotificationPref('all');
    setModalOpen(true);
  };

  const handleOpenEdit = (admin: AdminUser) => {
    setEditingAdmin(admin);
    setName(admin.name);
    setEmail(admin.email);
    setRole(admin.role || 'admin');
    setNotificationPref(admin.notificationPreference || 'all');
    setModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingAdmin && onUpdateAdminUser) {
      onUpdateAdminUser(editingAdmin.id, {
        name,
        email,
        role,
        notificationPreference: notificationPref,
      });
    } else {
      onCreateAdminUser({
        id: `usr-${Date.now()}`,
        name,
        email,
        role,
        notificationPreference: notificationPref,
        createdAt: new Date().toISOString(),
      });
    }
    setModalOpen(false);
  };

  const handleDelete = (id: string, adminName: string) => {
    if (confirm(`Are you sure you want to remove ${adminName} from Admin User Management?`)) {
      if (onDeleteAdminUser) {
        onDeleteAdminUser(id);
      }
    }
  };

  // Deduplicate adminUsers by email
  const uniqueAdminMap = new Map<string, AdminUser>();
  adminUsers.forEach((u) => {
    const key = u.email.trim().toLowerCase();
    if (!key) return;
    const existing = uniqueAdminMap.get(key);
    if (!existing) {
      uniqueAdminMap.set(key, u);
    } else {
      const isURealUid = !u.id.startsWith('USR-');
      const isExistingRealUid = !existing.id.startsWith('USR-');
      if (isURealUid && !isExistingRealUid) {
        uniqueAdminMap.set(key, u);
      }
    }
  });
  const uniqueAdminUsers = Array.from(uniqueAdminMap.values());

  const filteredUsers = uniqueAdminUsers.filter((u) => {
    const matchesSearch =
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = filterRole === 'all' || u.role === filterRole;
    return matchesSearch && matchesRole;
  });

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 border border-emerald-300 font-extrabold text-[10px] rounded-full uppercase tracking-wider flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Firebase Auth Active
            </span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight mt-1">
            Firebase User & Access Governance
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage authenticated administrators, ops teams, and school leadership permissions
          </p>
        </div>

        <button
          onClick={handleOpenCreate}
          className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs flex items-center gap-2 shadow-sm cursor-pointer self-start sm:self-auto"
        >
          <PlusCircle className="w-4 h-4" />
          Add Authorized User
        </button>
      </div>

      {/* Active User Security Status Bar */}
      <div className="bg-gradient-to-r from-slate-900 to-indigo-950 text-white p-5 rounded-2xl shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4 text-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-emerald-500/20 text-emerald-400 font-black flex items-center justify-center text-sm border border-emerald-500/30">
            {userProfile.displayName?.charAt(0) || 'U'}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm text-slate-100">{userProfile.displayName}</span>
              <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded text-[10px] font-extrabold uppercase">
                {userProfile.role}
              </span>
            </div>
            <p className="text-[11px] text-slate-300 mt-0.5 flex items-center gap-2">
              <Mail className="w-3 h-3 text-slate-400" /> {userProfile.email}
              {user?.uid && (
                <span className="text-[10px] text-slate-400 font-mono">UID: {user.uid.substring(0, 12)}...</span>
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 bg-white/5 border border-white/10 px-4 py-2 rounded-xl text-[11px]">
          <div>
            <span className="text-slate-400 block font-medium text-[10px]">AUTH PROVIDER</span>
            <span className="font-bold text-slate-200">{user ? 'Firebase Authentication' : 'Demo Mode'}</span>
          </div>
          <div className="border-l border-white/10 pl-4">
            <span className="text-slate-400 block font-medium text-[10px]">EMAIL VERIFIED</span>
            <span className="font-bold text-emerald-400">{user?.emailVerified ? 'Verified' : 'Active'}</span>
          </div>
        </div>
      </div>

      {/* Search & Filter Controls */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search users by name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl text-xs font-medium focus:outline-hidden focus:border-slate-900"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-xs font-bold text-slate-500 whitespace-nowrap">Filter Role:</span>
          <select
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value)}
            className="px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold bg-slate-50 focus:outline-hidden text-slate-700"
          >
            <option value="all">All Roles</option>
            <option value="admin">System Admin</option>
            <option value="ops">Operations Coordinator</option>
            <option value="finance">Finance Lead</option>
            <option value="support">Support Specialist</option>
          </select>
        </div>
      </div>

      {/* Users Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredUsers.map((admin) => {
          const isOwner = admin.email.toLowerCase() === 'cshanecolley@gmail.com';
          return (
            <div
              key={admin.id}
              className={`bg-white rounded-2xl border p-6 shadow-xs space-y-4 text-xs transition-all relative ${
                isOwner ? 'border-indigo-300 ring-2 ring-indigo-500/20' : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-full font-black flex items-center justify-center text-sm shadow-xs ${
                      isOwner
                        ? 'bg-indigo-900 text-indigo-300'
                        : 'bg-slate-900 text-emerald-400'
                    }`}
                  >
                    {admin.name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                      <span>{admin.name}</span>
                      {isOwner && (
                        <span className="bg-indigo-100 text-indigo-800 px-1.5 py-0.5 rounded text-[9px] font-black uppercase">
                          Root Admin
                        </span>
                      )}
                    </h3>
                    <p className="text-[11px] text-slate-500 font-medium">
                      {admin.role ? admin.role.toUpperCase() : 'ADMIN'} ACCESS
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleOpenEdit(admin)}
                    className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                    title="Edit User"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  {!isOwner && (
                    <button
                      onClick={() => setDeleteConfirmAdmin(admin)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                      title="Delete User"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              <div className="space-y-2 pt-3 border-t border-slate-100 text-slate-600">
                <div className="flex items-center gap-2">
                  <Mail className="w-3.5 h-3.5 text-slate-400" />
                  <span className="font-medium text-slate-800">{admin.email}</span>
                </div>

                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="font-bold text-emerald-700">Full Operational Permissions</span>
                </div>

                <div className="flex items-center gap-2 text-slate-500 text-[11px]">
                  <Bell className="w-3.5 h-3.5 text-slate-400" />
                  <span>Notifications: <strong className="text-slate-700 uppercase">{admin.notificationPreference || 'all'}</strong></span>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400">
                <span>Created: {new Date(admin.createdAt).toLocaleDateString()}</span>
                <span className="flex items-center gap-1 text-emerald-600 font-bold">
                  <UserCheck className="w-3 h-3" /> Active Profile
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add/Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <form
            onSubmit={handleSubmit}
            className="bg-white rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl text-xs"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900">
                {editingAdmin ? 'Edit User Permissions' : 'Add Authorized Admin User'}
              </h3>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 font-bold text-sm"
              >
                ✕
              </button>
            </div>

            <div>
              <label className="block font-bold mb-1 text-slate-700">Full Name *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder="e.g. Shane Colley"
                className="w-full px-3 py-2 border border-slate-300 rounded-xl font-medium focus:outline-hidden focus:border-slate-900"
              />
            </div>

            <div>
              <label className="block font-bold mb-1 text-slate-700">Email Address *</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="cshanecolley@gmail.com"
                className="w-full px-3 py-2 border border-slate-300 rounded-xl font-medium focus:outline-hidden focus:border-slate-900"
              />
            </div>

            <div>
              <label className="block font-bold mb-1 text-slate-700">Role Classification *</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as AdminRole)}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl font-medium focus:outline-hidden focus:border-slate-900 bg-white"
              >
                <option value="admin">System Administrator (Full Access)</option>
                <option value="ops">Operations Coordinator</option>
                <option value="finance">Finance Lead</option>
                <option value="support">Support Specialist</option>
              </select>
            </div>

            <div>
              <label className="block font-bold mb-1 text-slate-700">Notification Preference</label>
              <select
                value={notificationPref}
                onChange={(e) => setNotificationPref(e.target.value as 'all' | 'ready_to_pay' | 'none')}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl font-medium focus:outline-hidden focus:border-slate-900 bg-white"
              >
                <option value="all">All System Notifications & Email Triggers</option>
                <option value="ready_to_pay">Ready-To-Pay & Critical Alerts Only</option>
                <option value="none">No Automated Email Notifications</option>
              </select>
            </div>

            <div className="flex gap-2 justify-end pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="px-4 py-2 border border-slate-300 rounded-xl font-semibold hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl cursor-pointer"
              >
                {editingAdmin ? 'Save Changes' : 'Create User Profile'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL: Delete Admin Confirmation */}
      {deleteConfirmAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl text-xs">
            <div className="flex items-center gap-3 text-rose-600 pb-3 border-b border-slate-100">
              <div className="p-2.5 bg-rose-50 rounded-2xl border border-rose-100">
                <Trash2 className="w-6 h-6 text-rose-600" />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-900">Remove Admin Profile</h3>
                <p className="text-[11px] text-slate-500 font-medium">Revoke admin operational privileges.</p>
              </div>
            </div>

            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-1">
              <p className="font-bold text-slate-900 text-sm">{deleteConfirmAdmin.name}</p>
              <p className="text-slate-600 font-medium">{deleteConfirmAdmin.email}</p>
            </div>

            <p className="text-slate-600 text-xs">
              Are you sure you want to remove this admin user from Admin Management? They will no longer have access to system administration functions.
            </p>

            <div className="flex gap-2 justify-end pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setDeleteConfirmAdmin(null)}
                className="px-4 py-2 border border-slate-300 rounded-xl font-semibold hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (onDeleteAdminUser) {
                    onDeleteAdminUser(deleteConfirmAdmin.id);
                  }
                  setDeleteConfirmAdmin(null);
                }}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl shadow-md cursor-pointer flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5 text-white" /> Remove Admin
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
