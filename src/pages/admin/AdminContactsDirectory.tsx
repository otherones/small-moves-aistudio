import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, User, Mail, Phone, Building2, Filter, ShieldCheck } from 'lucide-react';
import { School, AdditionalContact } from '../../types';

interface AdminContactsDirectoryProps {
  schools: School[];
}

export const AdminContactsDirectory: React.FC<AdminContactsDirectoryProps> = ({ schools }) => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'principal' | 'additional'>('all');

  // Aggregate all contacts
  const contactsList: {
    id: string;
    name: string;
    email: string;
    phone?: string;
    role: 'principal' | 'additional_contact';
    schoolName: string;
    schoolId: string;
    jobTitle?: string;
  }[] = [];

  schools.forEach((s) => {
    if (s.principalName && s.principalEmail) {
      contactsList.push({
        id: `p-${s.id}`,
        name: s.principalName,
        email: s.principalEmail,
        phone: s.principalPhone || s.phone,
        role: 'principal',
        schoolName: s.name,
        schoolId: s.id,
        jobTitle: 'School Principal',
      });
    }

    s.additionalContacts.forEach((ac) => {
      contactsList.push({
        id: ac.id,
        name: ac.name,
        email: ac.email,
        phone: ac.phone,
        role: 'additional_contact',
        schoolName: s.name,
        schoolId: s.id,
        jobTitle: ac.jobTitle || 'Additional Contact',
      });
    });
  });

  const filtered = contactsList.filter((c) => {
    if (roleFilter === 'principal' && c.role !== 'principal') return false;
    if (roleFilter === 'additional' && c.role !== 'additional_contact') return false;

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        c.name.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        c.schoolName.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">School Contacts Directory</h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Master registry of Principals and Additional Contacts across all partner schools
        </p>
      </div>

      {/* Controls */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-1">
          <button
            onClick={() => setRoleFilter('all')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold ${
              roleFilter === 'all' ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-600'
            }`}
          >
            All Contacts ({contactsList.length})
          </button>
          <button
            onClick={() => setRoleFilter('principal')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold ${
              roleFilter === 'principal' ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-600'
            }`}
          >
            Principals Only
          </button>
          <button
            onClick={() => setRoleFilter('additional')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold ${
              roleFilter === 'additional' ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-600'
            }`}
          >
            Additional Contacts
          </button>
        </div>

        <div className="relative min-w-[240px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search contact name, email, school..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-hidden focus:border-emerald-500"
          />
        </div>
      </div>

      {/* Directory Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
              <tr>
                <th className="py-3.5 px-4">Contact Person</th>
                <th className="py-3.5 px-4">Role / Title</th>
                <th className="py-3.5 px-4">School</th>
                <th className="py-3.5 px-4">Email Address</th>
                <th className="py-3.5 px-4">Phone Number</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {filtered.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50 transition-colors cursor-pointer" onClick={(e) => {
    if ((e.target as HTMLElement).closest('button') || (e.target as HTMLElement).closest('a')) {
      return;
    }
    navigate(`/admin/schools/${c.schoolId}`);
  }}>
                  <td className="py-3.5 px-4 font-bold text-slate-900 flex items-center gap-2">
                    <User className="w-4 h-4 text-slate-400" />
                    {c.name}
                  </td>
                  <td className="py-3.5 px-4">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        c.role === 'principal'
                          ? 'bg-purple-100 text-purple-800'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {c.role === 'principal' ? 'Principal' : 'Additional Contact'}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 font-semibold text-slate-800">{c.schoolName}</td>
                  <td className="py-3.5 px-4 text-slate-600">{c.email}</td>
                  <td className="py-3.5 px-4 text-slate-600">{c.phone || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
