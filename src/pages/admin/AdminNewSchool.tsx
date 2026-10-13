import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Save, Building2, User, PlusCircle, Mail, Send, CheckCircle2, FileText, Eye } from 'lucide-react';
import { School, Funder, PendingInvite, PortalSettings, EmailTemplateConfig } from '../../types';
import { renderInviteEmail, PRODUCTION_PORTAL_URL } from '../../utils/emailUtils';

interface AdminNewSchoolProps {
  funders: Funder[];
  settings?: PortalSettings;
  emailTemplates?: EmailTemplateConfig[];
  onCreateSchool: (newSchool: Partial<School>) => void;
  onCreateInvite?: (invite: Partial<PendingInvite>) => void;
  onCreateFunder?: (funder: Partial<Funder>) => void;
}

export const AdminNewSchool: React.FC<AdminNewSchoolProps> = ({
  funders,
  settings,
  emailTemplates,
  onCreateSchool,
  onCreateInvite,
  onCreateFunder,
}) => {
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('IL');
  const [zip, setZip] = useState('');
  const [phone, setPhone] = useState('');
  const [studentCount, setStudentCount] = useState<number | ''>('');
  const [funderId, setFunderId] = useState<string>('');
  const [annualBudget, setAnnualBudget] = useState<number>(settings?.annualDefaultBudget || 10000);

  React.useEffect(() => {
    if (settings?.annualDefaultBudget) {
      setAnnualBudget(settings.annualDefaultBudget);
    }
  }, [settings?.annualDefaultBudget]);

  // Principal info
  const [principalName, setPrincipalName] = useState('');
  const [principalEmail, setPrincipalEmail] = useState('');
  const [principalPhone, setPrincipalPhone] = useState('');
  const [jobTitle, setJobTitle] = useState('Principal');

  // Invitation options
  const [sendInvite, setSendInvite] = useState(true);
  const [customInviteNote, setCustomInviteNote] = useState('');
  const [showEmailPreview, setShowEmailPreview] = useState(false);

  // Inline Funder dialog
  const [showFunderModal, setShowFunderModal] = useState(false);
  const [newFunderName, setNewFunderName] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const selectedFunder = funderId ? funders.find((f) => f.id === funderId) : undefined;
    const newSchoolId = `SCH-${Math.floor(100 + Math.random() * 900)}`;

    const newSchool: Partial<School> = {
      id: newSchoolId,
      name: name.trim(),
      address: address.trim(),
      city: city.trim(),
      state: state.trim(),
      zip: zip.trim(),
      phone: phone.trim(),
      studentCount: Number(studentCount) || 500,
      status: 'invited',
      funderId: selectedFunder?.id || undefined,
      funderName: selectedFunder?.name || undefined,
      annualBudget: Number(annualBudget),
      budgetReserved: 0,
      budgetPaid: 0,
      budgetAvailable: Number(annualBudget),
      principalName: principalName.trim() ? `${principalName.trim()} (Pending)` : undefined,
      principalEmail: principalEmail.trim() || undefined,
      principalPhone: principalPhone.trim() || undefined,
      additionalContacts: [],
      currentMouSigned: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    onCreateSchool(newSchool);

    // Also dispatch pending invite if principal email is provided and sendInvite is checked
    if (sendInvite && principalEmail.trim() && onCreateInvite) {
      const newInvite: Partial<PendingInvite> = {
        id: `INV-${Date.now()}`,
        email: principalEmail.trim(),
        name: principalName.trim() || 'Principal',
        role: 'principal',
        schoolId: newSchoolId,
        schoolName: name.trim(),
        jobTitle: jobTitle.trim() || 'Principal',
        invitedBy: 'PEF Administrator',
        invitedAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'pending',
        notes: customInviteNote.trim() || `Onboarding invitation for ${name.trim()}. Please review and sign MOU upon login.`,
      };
      onCreateInvite(newInvite);
    }

    navigate('/admin/schools');
  };

  const handleCreateFunder = () => {
    if (!newFunderName.trim()) return;
    if (onCreateFunder) {
      onCreateFunder({
        id: `FND-${Date.now()}`,
        name: newFunderName.trim(),
        type: 'Foundation',
        associatedSchoolIds: [],
        createdAt: new Date().toISOString(),
      });
    }
    setNewFunderName('');
    setShowFunderModal(false);
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      <div>
        <Link
          to="/admin/schools"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-800 mb-3"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Schools Directory
        </Link>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">Onboard New Partner School</h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Register school details, designate principal leadership, and assign annual funding allocations
        </p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 md:p-8 space-y-6 text-xs">
        {/* Section 1: School Details */}
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-slate-900 border-b pb-2 flex items-center gap-2">
            <Building2 className="w-4 h-4 text-emerald-600" />
            1. School Metadata
          </h3>

          <div>
            <label className="block font-bold text-slate-700 mb-1">School Name *</label>
            <input
              type="text"
              placeholder="e.g. Whitney Young Magnet High School"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full px-3 py-2 border border-slate-300 rounded-xl font-medium"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Street Address *</label>
            <input
              type="text"
              placeholder="e.g. 211 S Laflin St"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              required
              className="w-full px-3 py-2 border border-slate-300 rounded-xl font-medium"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <input
              type="text"
              placeholder="City"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              required
              className="px-3 py-2 border border-slate-300 rounded-xl"
            />
            <input
              type="text"
              placeholder="State"
              value={state}
              onChange={(e) => setState(e.target.value)}
              required
              className="px-3 py-2 border border-slate-300 rounded-xl"
            />
            <input
              type="text"
              placeholder="ZIP"
              value={zip}
              onChange={(e) => setZip(e.target.value)}
              required
              className="px-3 py-2 border border-slate-300 rounded-xl"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Main Phone *</label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="(312) 555-0100"
                required
                className="w-full px-3 py-2 border border-slate-300 rounded-xl"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Student Population *</label>
              <input
                type="number"
                value={studentCount}
                onChange={(e) => setStudentCount(e.target.value === '' ? '' : Number(e.target.value))}
                placeholder="e.g. 750"
                required
                className="w-full px-3 py-2 border border-slate-300 rounded-xl font-bold"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Funder & Budget */}
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-slate-900 border-b pb-2">2. Funding & Budget Allocation</h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block font-bold text-slate-700">Assigned Funder (Optional)</label>
                <button
                  type="button"
                  onClick={() => setShowFunderModal(true)}
                  className="text-xs font-bold text-emerald-600 hover:underline"
                >
                  + Add New Funder
                </button>
              </div>
              <select
                value={funderId}
                onChange={(e) => setFunderId(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl font-medium"
              >
                <option value="">Unassigned</option>
                {funders.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name} ({f.type})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Annual School-Year Budget ($) *</label>
              <input
                type="number"
                value={annualBudget}
                onChange={(e) => setAnnualBudget(Number(e.target.value))}
                required
                className="w-full px-3 py-2 border border-slate-300 rounded-xl font-bold text-slate-900 text-sm"
              />
            </div>
          </div>
        </div>

        {/* Section 3: Principal Leadership */}
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-slate-900 border-b pb-2 flex items-center gap-2">
            <User className="w-4 h-4 text-emerald-600" />
            3. Principal Leadership Info <span className="italic font-normal text-slate-500">(Optional)</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Principal Name</label>
              <input
                type="text"
                placeholder="Dr. Evelyn Wright"
                value={principalName}
                onChange={(e) => setPrincipalName(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl font-medium"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Principal Email</label>
              <input
                type="email"
                placeholder="ewright@school.org"
                value={principalEmail}
                onChange={(e) => setPrincipalEmail(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl font-medium"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Principal Direct Phone</label>
              <input
                type="text"
                placeholder="(312) 555-0199"
                value={principalPhone}
                onChange={(e) => setPrincipalPhone(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl font-medium"
              />
            </div>
          </div>
        </div>

        {/* Section 4: Invitation Dispatch & MOU Email Template */}
        {(principalName.trim() !== '' || principalEmail.trim() !== '') && (
          <div className="space-y-4 animate-fade-in">
            <h3 className="text-sm font-bold text-slate-900 border-b pb-2 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-emerald-600" />
                4. Invitation Dispatch & Email Template <span className="italic font-normal text-slate-500">(Optional)</span>
              </span>
              <button
                type="button"
                onClick={() => setShowEmailPreview(!showEmailPreview)}
                className="text-xs font-bold text-emerald-600 hover:underline flex items-center gap-1"
              >
                <Eye className="w-3.5 h-3.5" />
                {showEmailPreview ? 'Hide Template Preview' : 'Preview Email Template'}
              </button>
            </h3>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
            <label className="flex items-center gap-2.5 font-bold text-slate-800 cursor-pointer">
              <input
                type="checkbox"
                checked={sendInvite}
                onChange={(e) => setSendInvite(e.target.checked)}
                className="w-4 h-4 rounded text-emerald-600 border-slate-300 focus:ring-emerald-500"
              />
              <span>Dispatch Automated Email Invitation</span>
            </label>

            {sendInvite && (
              <div className="space-y-3 pt-2">
                <div className="grid grid-cols-1 gap-3 text-xs">
                  <div>
                    <span className="block text-slate-500 font-semibold mb-1">Invitation Role:</span>
                    <span className="font-bold text-slate-800 bg-white px-3 py-1.5 rounded-lg border border-slate-200 block">
                      School Principal & MOU Signatory
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Custom Invitation Note (Optional)</label>
                  <textarea
                    rows={2}
                    value={customInviteNote}
                    onChange={(e) => setCustomInviteNote(e.target.value)}
                    placeholder="e.g. Welcome Dr. Wright! Please review the annual MOU agreement during your initial portal sign-in."
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                  />
                </div>

                {/* Email Live Preview Box */}
                {showEmailPreview && (() => {
                  const rendered = renderInviteEmail(emailTemplates || settings?.emailTemplates || [], {
                    recipient_name: principalName || 'Principal',
                    school_name: name || 'Partner School',
                    amount: Number(annualBudget || 10000).toLocaleString(),
                    custom_note: customInviteNote,
                    invite_link: `${PRODUCTION_PORTAL_URL}/setup-account?email=${encodeURIComponent(principalEmail || 'principal@school.org')}`,
                  });
                  return (
                    <div className="bg-white border border-slate-300 rounded-2xl p-4 space-y-3 text-xs shadow-xs animate-fade-in">
                      <div className="flex flex-col sm:flex-row justify-between border-b pb-2 text-slate-500 text-[11px] font-mono gap-1">
                        <div><strong className="text-slate-700">Subject:</strong> {rendered.subject}</div>
                        <div className="text-emerald-600 font-bold shrink-0">Template: {rendered.template?.name || 'School Invitation'}</div>
                      </div>
                      <div className="font-mono text-slate-700 space-y-2 leading-relaxed whitespace-pre-wrap bg-slate-50/70 p-3 rounded-xl border border-slate-200">
                        {rendered.body}
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
        </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-3 border-t">
          <Link
            to="/admin/schools"
            className="px-5 py-2.5 border border-slate-300 rounded-xl font-semibold text-slate-700 hover:bg-slate-50"
          >
            Cancel
          </Link>
          <button
            type="submit"
            className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs shadow-md shadow-emerald-600/20 flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            Save and Continue
          </button>
        </div>
      </form>

      {/* Funder Modal */}
      {showFunderModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full space-y-4 text-xs shadow-2xl">
            <h3 className="text-sm font-bold text-slate-900">Add New Funder Entity</h3>
            <div>
              <label className="block font-bold mb-1">Funder Name</label>
              <input
                type="text"
                value={newFunderName}
                onChange={(e) => setNewFunderName(e.target.value)}
                placeholder="e.g. Chicago Civic Trust"
                className="w-full px-3 py-2 border rounded-xl"
              />
            </div>
            <div className="flex gap-2 justify-end pt-2">
              <button
                type="button"
                onClick={() => setShowFunderModal(false)}
                className="px-3 py-1.5 border rounded-xl font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCreateFunder}
                className="px-4 py-1.5 bg-emerald-600 text-white font-bold rounded-xl"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
