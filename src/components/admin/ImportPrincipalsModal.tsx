import React, { useState, useMemo } from 'react';
import {
  School,
  PortalSettings,
  PendingInvite,
  AppUser,
  FirebaseMailDocument,
} from '../../types';
import {
  RAW_PRINCIPAL_ROWS,
  RawPrincipalRecord,
  matchPrincipalsToSchools,
  MatchedPrincipalImportItem,
  executeBatchPrincipalImport,
} from '../../data/importedPrincipals';
import { renderInviteEmail } from '../../utils/emailUtils';
import {
  CheckCircle,
  X,
  Upload,
  Search,
  Mail,
  AlertTriangle,
  Building,
  User,
  Phone,
  FileText,
  Clock,
  Eye,
  RefreshCw,
  Sparkles,
  ShieldAlert,
  ArrowRight,
  Filter,
} from 'lucide-react';

interface ImportPrincipalsModalProps {
  isOpen: boolean;
  onClose: () => void;
  schools?: School[];
  existingSchools?: School[];
  settings?: PortalSettings;
  currentUserEmail?: string;
  onImportComplete?: (result: {
    updatedSchools: School[];
    createdInvites: PendingInvite[];
    createdUsers: AppUser[];
    queuedEmails: FirebaseMailDocument[];
    count: number;
  }) => void;
}

export const ImportPrincipalsModal: React.FC<ImportPrincipalsModalProps> = ({
  isOpen,
  onClose,
  schools = [],
  existingSchools = [],
  settings,
  currentUserEmail,
  onImportComplete,
}) => {
  const activeSchools = schools.length > 0 ? schools : existingSchools;
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'matched' | 'unmatched' | 'inactive'>('all');
  const [isProcessing, setIsProcessing] = useState(false);
  const [previewTemplateItem, setPreviewTemplateItem] = useState<MatchedPrincipalImportItem | null>(null);
  const [successResult, setSuccessResult] = useState<{
    count: number;
    queuedCount: number;
  } | null>(null);

  // Parse and match principals against live schools
  const matchedItems = useMemo(() => {
    return matchPrincipalsToSchools(RAW_PRINCIPAL_ROWS, activeSchools);
  }, [activeSchools]);

  // Filtered display items
  const filteredItems = useMemo(() => {
    return matchedItems.filter((item) => {
      // Status filter
      if (statusFilter !== 'all' && item.matchStatus !== statusFilter) {
        return false;
      }
      // Search term
      if (!searchTerm) return true;
      const term = searchTerm.toLowerCase();
      return (
        item.principalName.toLowerCase().includes(term) ||
        item.email.toLowerCase().includes(term) ||
        item.rawSchoolName.toLowerCase().includes(term) ||
        (item.matchedSchoolName && item.matchedSchoolName.toLowerCase().includes(term))
      );
    });
  }, [matchedItems, statusFilter, searchTerm]);

  // Statistics
  const stats = useMemo(() => {
    const total = matchedItems.length;
    const matched = matchedItems.filter((i) => i.isMatched).length;
    const unmatched = matchedItems.filter((i) => i.matchStatus === 'unmatched').length;
    const inactive = matchedItems.filter((i) => i.matchStatus === 'inactive').length;
    return { total, matched, unmatched, inactive };
  }, [matchedItems]);

  if (!isOpen) return null;

  const handleExecuteImport = async () => {
    try {
      setIsProcessing(true);
      const result = await executeBatchPrincipalImport(
        matchedItems,
        activeSchools,
        settings,
        currentUserEmail || 'admin'
      );

      setSuccessResult({
        count: result.count,
        queuedCount: result.queuedEmails.length,
      });

      if (onImportComplete) {
        onImportComplete(result);
      }
    } catch (err) {
      console.error('Import principals error:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div
        id="import-principals-modal"
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200"
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold shadow-sm">
              <User className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xl font-bold text-slate-900">
                  Import Principals & Queue Onboarding Invites
                </h3>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                  {stats.matched} Matched to Partner Schools
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Matches principal contact data by school name, assigns primary roles, and stages invitation emails in the pending queue.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-2 rounded-lg hover:bg-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Email Paused Status Banner */}
        <div className="bg-amber-50 border-b border-amber-200 px-6 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5 text-amber-900 text-xs sm:text-sm">
            <ShieldAlert className="w-4 h-4 text-amber-600 flex-shrink-0" />
            <span>
              <strong>Outbound Email Queue Mode:</strong> Email comms are currently{' '}
              <span className="font-semibold text-amber-800 underline">paused</span>. Generated invitation emails will be staged in Firestore{' '}
              <code className="bg-amber-100 px-1.5 py-0.5 rounded text-amber-900 font-mono text-xs">mail</code> collection with state{' '}
              <code className="bg-amber-100 px-1.5 py-0.5 rounded text-amber-900 font-mono text-xs">PENDING</code> and won't dispatch externally until resumed.
            </span>
          </div>
          <div className="hidden sm:flex items-center gap-1.5 text-xs text-amber-800 font-medium whitespace-nowrap bg-amber-100/80 px-2.5 py-1 rounded-md border border-amber-300/60">
            <Clock className="w-3.5 h-3.5" />
            Safety Active
          </div>
        </div>

        {/* Success View */}
        {successResult ? (
          <div className="p-8 text-center flex flex-col items-center justify-center space-y-4 my-auto">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center animate-bounce">
              <CheckCircle className="w-8 h-8" />
            </div>
            <h4 className="text-2xl font-bold text-slate-900">
              Successfully Imported {successResult.count} Principals!
            </h4>
            <p className="text-slate-600 max-w-md text-sm leading-relaxed">
              All matched partner schools have been updated with their active principal contacts. {successResult.queuedCount} invitation emails have been rendered and safely added to the pending email queue.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3 pt-4">
              <button
                onClick={onClose}
                className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-medium text-sm transition-all shadow-sm"
              >
                Close & View Schools
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Control Bar */}
            <div className="p-4 border-b border-slate-200 bg-white flex flex-col sm:flex-row gap-3 items-center justify-between">
              {/* Search */}
              <div className="relative w-full sm:w-80">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search principal, school, or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              {/* Filters */}
              <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
                <button
                  onClick={() => setStatusFilter('all')}
                  className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                    statusFilter === 'all'
                      ? 'bg-slate-900 text-white shadow-sm'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  All ({stats.total})
                </button>
                <button
                  onClick={() => setStatusFilter('matched')}
                  className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                    statusFilter === 'matched'
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                  }`}
                >
                  Matched Schools ({stats.matched})
                </button>
                <button
                  onClick={() => setStatusFilter('unmatched')}
                  className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                    statusFilter === 'unmatched'
                      ? 'bg-slate-600 text-white shadow-sm'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Additional Staff ({stats.unmatched})
                </button>
              </div>
            </div>

            {/* Principal Table Preview */}
            <div className="flex-1 overflow-y-auto min-h-[320px] bg-slate-50/50">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-100/75 text-[11px] font-bold text-slate-500 uppercase tracking-wider sticky top-0 z-10">
                    <th className="py-3 px-4">Principal Name & Contact</th>
                    <th className="py-3 px-4">School in CSV</th>
                    <th className="py-3 px-4">Matched Partner School</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-right">Invite Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-sm">
                  {filteredItems.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-slate-400">
                        No principals match your search filter.
                      </td>
                    </tr>
                  ) : (
                    filteredItems.map((item) => (
                      <tr
                        key={item.id}
                        className={`hover:bg-white transition-colors ${
                          !item.isMatched ? 'opacity-70 bg-slate-50/70' : ''
                        }`}
                      >
                        {/* Principal Info */}
                        <td className="py-3 px-4">
                          <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                            {item.principalName}
                          </div>
                          <div className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                            <span className="text-blue-600">{item.email}</span>
                            {item.phone && (
                              <span className="text-slate-400 font-mono text-[11px]">
                                {item.phone}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Raw School */}
                        <td className="py-3 px-4 text-xs text-slate-700">
                          {item.rawSchoolName ? (
                            <span className="font-medium text-slate-800">
                              {item.rawSchoolName}
                            </span>
                          ) : (
                            <span className="text-slate-400 italic">None specified</span>
                          )}
                        </td>

                        {/* Matched School */}
                        <td className="py-3 px-4">
                          {item.matchedSchoolName ? (
                            <div className="flex items-center gap-2">
                              <Building className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                              <div>
                                <div className="text-xs font-semibold text-slate-900">
                                  {item.matchedSchoolName}
                                </div>
                                <div className="text-[10px] font-mono text-emerald-700">
                                  {item.matchedSchoolId}
                                </div>
                              </div>
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400 italic">
                              No matching partner school found
                            </span>
                          )}
                        </td>

                        {/* Match Status Badge */}
                        <td className="py-3 px-4 text-center">
                          {item.isMatched ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Ready to Assign
                            </span>
                          ) : item.matchStatus === 'inactive' ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-200 text-slate-700">
                              Inactive
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-600">
                              General Contact
                            </span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="py-3 px-4 text-right">
                          {item.isMatched && (
                            <button
                              onClick={() => setPreviewTemplateItem(item)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors border border-blue-200/60"
                              title="Preview rendered invitation email"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              Preview Email
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Footer Summary & Action */}
            <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-xs text-slate-600">
                <span>
                  Ready to link <strong>{stats.matched} principals</strong> to their respective schools and stage their personalized invitations.
                </span>
              </div>
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full sm:w-auto px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleExecuteImport}
                  disabled={isProcessing || stats.matched === 0}
                  className="w-full sm:w-auto px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-sm font-semibold rounded-xl transition-all shadow-sm flex items-center justify-center gap-2"
                >
                  {isProcessing ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Syncing & Queuing Invites...
                    </>
                  ) : (
                    <>
                      <Mail className="w-4 h-4" />
                      Import {stats.matched} Principals & Queue Invites
                    </>
                  )}
                </button>
              </div>
            </div>
          </>
        )}

        {/* Email Preview Modal */}
        {previewTemplateItem && (
          <div className="fixed inset-0 z-60 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-2xl overflow-hidden animate-in fade-in">
              <div className="px-5 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-blue-600" />
                  <h4 className="font-bold text-slate-900 text-sm">
                    Generated Invite Email Preview for {previewTemplateItem.principalName}
                  </h4>
                </div>
                <button
                  onClick={() => setPreviewTemplateItem(null)}
                  className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-200"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="p-5 space-y-3 max-h-[70vh] overflow-y-auto text-sm">
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs space-y-1">
                  <div>
                    <strong>To:</strong> {previewTemplateItem.email}
                  </div>
                  <div>
                    <strong>Recipient:</strong> {previewTemplateItem.principalName}
                  </div>
                  <div>
                    <strong>School:</strong> {previewTemplateItem.matchedSchoolName} (
                    {previewTemplateItem.matchedSchoolId})
                  </div>
                  <div>
                    <strong>Template:</strong> Principal Invitation & School Onboarding (tpl-10)
                  </div>
                  <div>
                    <strong>Queue Status:</strong> Held in Pending Mail Queue
                  </div>
                </div>

                {(() => {
                  const rendered = renderInviteEmail(settings.emailTemplates || [], {
                    recipient_name: previewTemplateItem.principalName,
                    recipient_email: previewTemplateItem.email,
                    school_name: previewTemplateItem.matchedSchoolName || 'Partner School',
                    amount: (10000).toLocaleString(),
                    role: 'principal',
                    invite_link: `https://smallmoves.org/setup-account?email=${encodeURIComponent(
                      previewTemplateItem.email
                    )}`,
                    custom_note: `Welcome to the Small Moves Principal Emergency Fund for ${previewTemplateItem.matchedSchoolName}. Please complete account setup and review your annual allocation.`,
                  });

                  return (
                    <div className="border border-slate-200 rounded-xl p-4 bg-white shadow-inner space-y-3">
                      <div className="text-xs text-slate-500 font-semibold border-b border-slate-100 pb-2">
                        Subject: <span className="text-slate-900 font-bold">{rendered.subject}</span>
                      </div>
                      <div className="whitespace-pre-wrap font-sans text-xs text-slate-700 leading-relaxed">
                        {rendered.body}
                      </div>
                    </div>
                  );
                })()}
              </div>
              <div className="px-5 py-3 border-t border-slate-200 bg-slate-50 flex justify-end">
                <button
                  onClick={() => setPreviewTemplateItem(null)}
                  className="px-4 py-1.5 bg-slate-900 text-white rounded-lg text-xs font-semibold hover:bg-slate-800"
                >
                  Close Preview
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
