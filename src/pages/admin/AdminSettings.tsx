import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { Settings, Save, CheckCircle2, Mail, CreditCard, DollarSign, Calendar, Eye, Plus, ToggleLeft, ToggleRight, Trash2, RefreshCw, HelpCircle, Edit2, ArrowUp, ArrowDown, UploadCloud, Image as ImageIcon, RotateCcw, FileText, Server, MessageSquare, Globe, ExternalLink, Check, Code } from 'lucide-react';
import { PortalSettings, PayoutMethodConfig, EmailTemplateConfig, EmailProviderConfig, SystemRequestStatus, School, FaqItem, LogoStyleSettings, BeneficiaryPayoutPageTemplate, MouVersion } from '../../types';
import { INITIAL_SETTINGS, DEFAULT_BENEFICIARY_PAGE_TEMPLATE, PARTICIPATION_AGREEMENT_MOU_CONTENT } from '../../data/defaultSettings';
import { renderEmailTemplate } from '../../utils/emailUtils';
import { FiscalYearResetModal, FiscalYearResetOptions } from '../../components/common/FiscalYearResetModal';
import { ProductionDataWipeModal } from '../../components/admin/ProductionDataWipeModal';
import { SmallMovesLogo } from '../../components/common/SmallMovesLogo';
import { EmailProviderSettingsTab } from '../../components/admin/EmailProviderSettingsTab';
import { SmsProviderSettingsTab } from '../../components/admin/SmsProviderSettingsTab';
import { WipeDataOptions, wipeProductionTestData } from '../../lib/firebase';

interface AdminSettingsProps {
  settings: PortalSettings;
  schools?: School[];
  stats?: {
    schoolsCount?: number;
    requestsCount?: number;
    principalsCount?: number;
    fundersCount?: number;
    invitesCount?: number;
    logsCount?: number;
  };
  currentAdminEmail?: string;
  onSaveSettings: (updates: Partial<PortalSettings>) => void;
  onFiscalYearReset?: (options: FiscalYearResetOptions) => void;
  onWipeTestData?: (options: WipeDataOptions) => Promise<{ deletedCounts: Record<string, number> }>;
}

export const AdminSettings: React.FC<AdminSettingsProps> = ({
  settings,
  schools = [],
  stats,
  currentAdminEmail,
  onSaveSettings,
  onFiscalYearReset,
  onWipeTestData,
}) => {
  const [activeTab, setActiveTab] = useState<'statuses' | 'payouts' | 'emails' | 'payoutPage' | 'emailProvider' | 'smsProvider' | 'budget' | 'business' | 'faqs' | 'branding' | 'dropdowns' | 'mou'>('statuses');
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [wipeModalOpen, setWipeModalOpen] = useState(false);

  // Custom Logo state
  const [customLogoUrl, setCustomLogoUrl] = useState<string>(settings.customLogoUrl || '');
  const [logoStyle, setLogoStyle] = useState<LogoStyleSettings>({
    alignment: settings.logoStyle?.alignment || 'left',
    height: settings.logoStyle?.height || 44,
    paddingY: settings.logoStyle?.paddingY ?? 16,
    paddingX: settings.logoStyle?.paddingX ?? 16,
    bgStyle: settings.logoStyle?.bgStyle || 'transparent',
    borderRadius: settings.logoStyle?.borderRadius || 'medium',
  });

  // Status Labels state (Record<SystemRequestStatus, { adminLabel: string; principalLabel: string }>)
  const [statusLabels, setStatusLabels] = useState<Record<string, { adminLabel: string; principalLabel: string; description?: string }>>(
    settings.statusDisplayLabels as any
  );

  // Payout Methods state
  const [payoutMethods, setPayoutMethods] = useState<PayoutMethodConfig[]>(
    settings.payoutMethods || []
  );

  // Email Provider (Twilio SendGrid & Firebase Trigger Email) state
  const [emailProvider, setEmailProvider] = useState<EmailProviderConfig>(
    settings.emailProvider || INITIAL_SETTINGS.emailProvider || {
      enabled: true,
      provider: 'sendgrid',
      sendgridApiKey: '',
      fromEmail: 'support@smallmoves.org',
      fromName: 'Small Moves Principal Emergency Fund',
      replyToEmail: 'support@smallmoves.org',
      mailCollection: 'mail',
      sandboxMode: false,
      trackOpens: true,
      trackClicks: true,
    }
  );

  // Default Budget & Request Limits
  const [defaultBudget, setDefaultBudget] = useState(settings.annualDefaultBudget || 10000);
  const [maxPerRequest, setMaxPerRequest] = useState(settings.maxPerRequestAmount || 2000);

  // Business calendar
  const [timezone, setTimezone] = useState(settings.businessCalendar?.timezone || 'America/Chicago');
  const [businessHours, setBusinessHours] = useState(settings.businessCalendar?.businessHours || 'Monday–Friday, 9:00 a.m.–5:00 p.m. CST');
  const [holidaysText, setHolidaysText] = useState(settings.businessCalendar?.holidaysText || 'Excludes federal holidays.');
  const [commitmentWording, setCommitmentWording] = useState(settings.businessCalendar?.commitmentWording || 'Standard review within 48 business hours.');

  // Email template state
  const [emailTemplates, setEmailTemplates] = useState<EmailTemplateConfig[]>(
    settings.emailTemplates || []
  );
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(
    settings.emailTemplates?.[0]?.id || 'tpl-10'
  );

  // Beneficiary Payout Confirmation Page Template state
  const [payoutPageTemplate, setPayoutPageTemplate] = useState<BeneficiaryPayoutPageTemplate>(
    settings.payoutPageTemplate || DEFAULT_BENEFICIARY_PAGE_TEMPLATE
  );

  // FAQs state
  const [faqs, setFaqs] = useState<FaqItem[]>(settings.faqs || []);

  // New FAQ form state
  const [newFaqQuestion, setNewFaqQuestion] = useState('');
  const [newFaqAnswer, setNewFaqAnswer] = useState('');
  const [showAddFaqForm, setShowAddFaqForm] = useState(false);
  const [editingFaqId, setEditingFaqId] = useState<string | null>(null);

  // Dropdowns state
  const [requestReasons, setRequestReasons] = useState<string[]>(settings.requestReasons || []);
  const [fundUses, setFundUses] = useState<string[]>(settings.fundUses || []);
  const [requestReasonsText, setRequestReasonsText] = useState(
    (settings.requestReasons || []).join('\n')
  );
  const [fundUsesText, setFundUsesText] = useState(
    (settings.fundUses || []).join('\n')
  );

  // MOU Versions state
  const [mouVersions, setMouVersions] = useState<MouVersion[]>(
    settings.mouVersions?.length ? settings.mouVersions : INITIAL_SETTINGS.mouVersions || []
  );
  const [currentMouVersionId, setCurrentMouVersionId] = useState<string>(
    settings.currentMouVersionId || INITIAL_SETTINGS.currentMouVersionId || ''
  );
  const [isCreatingMou, setIsCreatingMou] = useState(false);
  const [editingMouId, setEditingMouId] = useState<string | null>(() => {
    const list = settings.mouVersions?.length ? settings.mouVersions : INITIAL_SETTINGS.mouVersions || [];
    const active = list.find((v) => v.id === (settings.currentMouVersionId || INITIAL_SETTINGS.currentMouVersionId)) || list[0];
    return active ? active.id : null;
  });
  const [mouFormName, setMouFormName] = useState(() => {
    const list = settings.mouVersions?.length ? settings.mouVersions : INITIAL_SETTINGS.mouVersions || [];
    const active = list.find((v) => v.id === (settings.currentMouVersionId || INITIAL_SETTINGS.currentMouVersionId)) || list[0];
    return active ? active.name : '';
  });
  const [mouFormContent, setMouFormContent] = useState(() => {
    const list = settings.mouVersions?.length ? settings.mouVersions : INITIAL_SETTINGS.mouVersions || [];
    const active = list.find((v) => v.id === (settings.currentMouVersionId || INITIAL_SETTINGS.currentMouVersionId)) || list[0];
    return active ? active.content : '';
  });
  const [mouPreviewMode, setMouPreviewMode] = useState(false);

  // Sync state when settings prop updates (e.g. from Firestore load)
  useEffect(() => {
    if (settings.emailTemplates && settings.emailTemplates.length > 0) {
      setEmailTemplates(settings.emailTemplates);
      if (!selectedTemplateId || !settings.emailTemplates.some((t) => t.id === selectedTemplateId)) {
        const principalTpl = settings.emailTemplates.find(
          (t) => t.id === 'tpl-10' || t.triggerEvent === 'principal_invitation'
        );
        setSelectedTemplateId(principalTpl ? principalTpl.id : settings.emailTemplates[0].id);
      }
    }
    if (settings.statusDisplayLabels) {
      setStatusLabels(settings.statusDisplayLabels as any);
    }
    if (settings.payoutMethods) {
      setPayoutMethods(settings.payoutMethods);
    }
    if (settings.mouVersions && settings.mouVersions.length > 0) {
      setMouVersions(settings.mouVersions);
      if (!editingMouId && !isCreatingMou) {
        const active = settings.mouVersions.find((v) => v.id === (settings.currentMouVersionId || currentMouVersionId)) || settings.mouVersions[0];
        if (active) {
          setEditingMouId(active.id);
          setMouFormName(active.name);
          setMouFormContent(active.content);
        }
      }
    }
    if (settings.currentMouVersionId) {
      setCurrentMouVersionId(settings.currentMouVersionId);
    }
    if (settings.annualDefaultBudget) {
      setDefaultBudget(settings.annualDefaultBudget);
    }
    if (settings.maxPerRequestAmount) {
      setMaxPerRequest(settings.maxPerRequestAmount);
    }
    if (settings.faqs) {
      setFaqs(settings.faqs);
    }
    if (settings.customLogoUrl !== undefined) {
      setCustomLogoUrl(settings.customLogoUrl || '');
    }
    if (settings.logoStyle) {
      setLogoStyle({
        alignment: settings.logoStyle.alignment || 'left',
        height: settings.logoStyle.height || 44,
        paddingY: settings.logoStyle.paddingY ?? 16,
        paddingX: settings.logoStyle.paddingX ?? 16,
        bgStyle: settings.logoStyle.bgStyle || 'transparent',
        borderRadius: settings.logoStyle.borderRadius || 'medium',
      });
    }
    if (settings.requestReasons) {
      setRequestReasons(settings.requestReasons);
      setRequestReasonsText(settings.requestReasons.join('\n'));
    }
    if (settings.fundUses) {
      setFundUses(settings.fundUses);
      setFundUsesText(settings.fundUses.join('\n'));
    }
    if (settings.mouVersions) {
      setMouVersions(settings.mouVersions);
    }
    if (settings.currentMouVersionId) {
      setCurrentMouVersionId(settings.currentMouVersionId);
    }
    if (settings.payoutPageTemplate) {
      setPayoutPageTemplate(settings.payoutPageTemplate);
    }
    if (settings.emailProvider) {
      setEmailProvider(settings.emailProvider);
    }
    if (settings.businessCalendar) {
      setTimezone(settings.businessCalendar.timezone || 'America/Chicago');
      setBusinessHours(settings.businessCalendar.businessHours || 'Monday–Friday, 9:00 a.m.–5:00 p.m. CST');
      setHolidaysText(settings.businessCalendar.holidaysText || 'Excludes federal holidays.');
      setCommitmentWording(settings.businessCalendar.commitmentWording || 'Standard review within 48 business hours.');
    }
  }, [settings]);

  const selectedTemplate = emailTemplates.find((t) => t.id === selectedTemplateId) || emailTemplates[0];

  const handleTogglePayoutMethod = (id: string) => {
    setPayoutMethods((prev) =>
      prev.map((pm) => (pm.id === id ? { ...pm, active: !pm.active } : pm))
    );
  };

  const handleUpdatePayoutMethod = (id: string, updates: Partial<PayoutMethodConfig>) => {
    setPayoutMethods((prev) =>
      prev.map((pm) => (pm.id === id ? { ...pm, ...updates } : pm))
    );
  };

  const handleAddPayoutMethod = () => {
    const newId = `pm-${Date.now()}`;
    setPayoutMethods((prev) => [
      ...prev,
      {
        id: newId,
        name: 'New Payment Method',
        active: true,
        description: 'Description of the payment method.',
        fields: [],
      }
    ]);
  };

  const handleDeletePayoutMethod = (id: string) => {
    setPayoutMethods((prev) => prev.filter((pm) => pm.id !== id));
  };

  const handleToggleTemplate = (id: string) => {
    setEmailTemplates((prev) =>
      prev.map((t) => (t.id === id ? { ...t, enabled: !t.enabled } : t))
    );
  };

  const handleUpdateTemplate = (id: string, updates: Partial<EmailTemplateConfig>) => {
    setEmailTemplates((prev) =>
      prev.map((t) => (t.id === id ? { ...t, ...updates } : t))
    );
  };

  // MOU action handlers
  const handleStartNewMouVersion = () => {
    setIsCreatingMou(true);
    setEditingMouId(null);
    setMouFormName('Principal Emergency Fund Participation Agreement (Rev. August 31, 2024)');
    setMouFormContent(PARTICIPATION_AGREEMENT_MOU_CONTENT);
    setMouPreviewMode(false);
  };

  const handleSelectMouVersion = (v: MouVersion) => {
    setIsCreatingMou(false);
    setEditingMouId(v.id);
    setMouFormName(v.name);
    setMouFormContent(v.content);
    setMouPreviewMode(false);
  };

  const handleCancelNewMou = () => {
    setIsCreatingMou(false);
    const fallback = mouVersions.find((v) => v.id === currentMouVersionId) || mouVersions[0];
    if (fallback) {
      setEditingMouId(fallback.id);
      setMouFormName(fallback.name);
      setMouFormContent(fallback.content);
    } else {
      setEditingMouId(null);
      setMouFormName('');
      setMouFormContent('');
    }
  };

  const handleSaveMouVersion = () => {
    if (!mouFormName.trim() || !mouFormContent.trim()) return;

    if (isCreatingMou || !editingMouId) {
      const newId = `mou-${Date.now()}`;
      const newVersion: MouVersion = {
        id: newId,
        name: mouFormName.trim(),
        content: mouFormContent.trim(),
        createdAt: new Date().toISOString(),
        createdBy: 'admin',
      };
      const updated = [newVersion, ...mouVersions];
      setMouVersions(updated);
      setEditingMouId(newId);
      setIsCreatingMou(false);
      onSaveSettings({
        mouVersions: updated,
        currentMouVersionId: currentMouVersionId || newId,
      });
    } else {
      const updated = mouVersions.map((v) =>
        v.id === editingMouId
          ? { ...v, name: mouFormName.trim(), content: mouFormContent.trim() }
          : v
      );
      setMouVersions(updated);
      onSaveSettings({
        mouVersions: updated,
        currentMouVersionId,
      });
    }
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  const handleDeleteMouVersion = (idToDelete: string) => {
    if (idToDelete === currentMouVersionId) {
      alert('Cannot delete the currently active default MOU version. Please switch the default to another version first.');
      return;
    }
    if (!window.confirm('Are you sure you want to remove this MOU version?')) return;
    const updated = mouVersions.filter((v) => v.id !== idToDelete);
    setMouVersions(updated);
    if (editingMouId === idToDelete) {
      const nextVer = updated[0];
      if (nextVer) {
        setEditingMouId(nextVer.id);
        setMouFormName(nextVer.name);
        setMouFormContent(nextVer.content);
      } else {
        setEditingMouId(null);
        setMouFormName('');
        setMouFormContent('');
      }
    }
    onSaveSettings({
      mouVersions: updated,
    });
  };

  const handleSetDefaultMouVersion = (versionId: string) => {
    setCurrentMouVersionId(versionId);
    onSaveSettings({
      currentMouVersionId: versionId,
      mouVersions,
    });
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2000);
  };

  const handleSaveAll = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveSettings({
      customLogoUrl,
      logoStyle,
      mouVersions,
      currentMouVersionId,
      requestReasons: requestReasonsText.split('\n').map(s => s.trim()).filter(Boolean),
      fundUses: fundUsesText.split('\n').map(s => s.trim()).filter(Boolean),
      statusDisplayLabels: statusLabels,
      payoutMethods,
      emailTemplates,
      payoutPageTemplate,
      emailProvider,
      faqs,
      annualDefaultBudget: Number(defaultBudget),
      maxPerRequestAmount: Number(maxPerRequest),
      businessCalendar: {
        timezone,
        businessHours,
        holidaysText,
        commitmentWording,
      },
    });
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  const handleAddFaq = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFaqQuestion.trim() || !newFaqAnswer.trim()) return;
    const item: FaqItem = {
      id: `faq-${Date.now()}`,
      q: newFaqQuestion.trim(),
      a: newFaqAnswer.trim(),
    };
    setFaqs((prev) => [...prev, item]);
    setNewFaqQuestion('');
    setNewFaqAnswer('');
    setShowAddFaqForm(false);
  };

  const handleUpdateFaq = (id: string, updates: Partial<FaqItem>) => {
    setFaqs((prev) => prev.map((f) => (f.id === id ? { ...f, ...updates } : f)));
  };

  const handleDeleteFaq = (id: string) => {
    setFaqs((prev) => prev.filter((f) => f.id !== id));
  };

  const handleMoveFaq = (index: number, direction: 'up' | 'down') => {
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= faqs.length) return;
    const updated = [...faqs];
    const [moved] = updated.splice(index, 1);
    updated.splice(targetIdx, 0, moved);
    setFaqs(updated);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-[#0F172A] tracking-tight" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>System Settings</h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Configure status display wording, Payment Methods, notification templates, Twilio SendGrid provider, FAQs, and business SLAs
        </p>
      </div>

      {savedSuccess && (
        <div className="p-3 bg-[#EDF7FC] border border-[#0089B3]/30 rounded-xl text-slate-900 text-xs font-bold flex items-center gap-2 shadow-xs">
          <CheckCircle2 className="w-4 h-4 text-[#0089B3]" />
          <span>System settings updated successfully!</span>
        </div>
      )}

      {/* Navigation Tabs Layout */}
      <div className="flex flex-col md:flex-row gap-6 items-start">
        <div className="w-full md:w-64 shrink-0 flex flex-col gap-1.5 text-xs font-bold bg-slate-50/50 p-2 rounded-2xl border border-slate-200/80">
          {[
            { id: 'statuses', label: '1. Request Statuses', icon: Settings },
            { id: 'payouts', label: '2. Payout Methods', icon: CreditCard },
            { id: 'emails', label: '3. Email Templates', icon: Mail },
            { id: 'payoutPage', label: '4. Beneficiary Web Page', icon: Globe },
            { id: 'emailProvider', label: '5. Email Provider (SendGrid)', icon: Server },
            { id: 'smsProvider', label: '6. SMS Provider (Vonage)', icon: MessageSquare },
            { id: 'budget', label: '7. Default Budget', icon: DollarSign },
            { id: 'business', label: '8. Business SLA & Hours', icon: Calendar },
            { id: 'faqs', label: '9. Help Center FAQs', icon: HelpCircle },
            { id: 'branding', label: '10. Logo & Branding', icon: ImageIcon },
            { id: 'dropdowns', label: '11. Form Dropdowns', icon: Edit2 },
            { id: 'mou', label: '12. MOU Versions', icon: FileText },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-3.5 py-3 rounded-xl transition-all flex items-center gap-3 text-left border cursor-pointer ${
                  isActive
                    ? 'bg-[#0089B3] text-white shadow-sm border-[#0089B3] font-extrabold'
                    : 'bg-white text-slate-700 hover:bg-slate-100/80 border-slate-200/70 hover:border-slate-300 font-semibold'
                }`}
              >
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-500'}`} />
                <span className="truncate">{tab.label}</span>
              </button>
            );
          })}
        </div>

        <div className="flex-1 w-full min-w-0">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 md:p-8 space-y-6 text-xs">
        {/* Tab 1: Status Labels */}
        {activeTab === 'statuses' && (
          <div className="space-y-4">
            <div className="border-b pb-2">
              <h3 className="text-sm font-bold text-slate-900">Status Display Label Mapping</h3>
              <p className="text-[11px] text-slate-500">
                Customize exact display labels shown to internal Admins versus School Principals for each request status.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.entries(statusLabels).map(([statusCode, val]) => {
                const labelObj = val as { adminLabel: string; principalLabel: string };
                return (
                  <div key={statusCode} className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                      <span className="font-extrabold text-slate-900 text-xs uppercase tracking-wider">
                        System Code
                      </span>
                      <code className="text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded font-mono text-[11px]">
                        {statusCode}
                      </code>
                    </div>

                    <div className="space-y-2">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">
                          Admin Portal Label
                        </label>
                        <input
                          type="text"
                          value={labelObj?.adminLabel || ''}
                          onChange={(e) =>
                            setStatusLabels({
                              ...statusLabels,
                              [statusCode as SystemRequestStatus]: {
                                ...labelObj,
                                adminLabel: e.target.value,
                              },
                            })
                          }
                          className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-xl font-bold text-slate-900 focus:outline-hidden focus:border-emerald-500"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">
                          Principal / School Portal Label
                        </label>
                        <input
                          type="text"
                          value={labelObj?.principalLabel || ''}
                          onChange={(e) =>
                            setStatusLabels({
                              ...statusLabels,
                              [statusCode as SystemRequestStatus]: {
                                ...labelObj,
                                principalLabel: e.target.value,
                              },
                            })
                          }
                          className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-xl font-bold text-slate-900 focus:outline-hidden focus:border-emerald-500"
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Tab 2: Payout Methods */}
        {activeTab === 'payouts' && (
          <div className="space-y-4">
            <div className="border-b pb-2 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Enabled Payment Methods</h3>
                <p className="text-[11px] text-slate-500">
                  Control available payment options for principals and edit user instructions.
                </p>
              </div>
              <button
                type="button"
                onClick={handleAddPayoutMethod}
                className="px-3 py-1.5 bg-emerald-100 text-emerald-800 hover:bg-emerald-200 font-bold rounded-xl text-xs flex items-center gap-1 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add Method
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {payoutMethods.map((pm) => (
                <div key={pm.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                    <input
                      type="text"
                      value={pm.name}
                      onChange={(e) => handleUpdatePayoutMethod(pm.id, { name: e.target.value })}
                      className="font-bold text-slate-900 bg-white border border-slate-300 px-2.5 py-1 rounded-xl text-xs focus:outline-hidden"
                    />
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleTogglePayoutMethod(pm.id)}
                        className={`px-3 py-1 rounded-xl font-bold text-[11px] transition-colors flex items-center gap-1.5 ${
                          pm.active
                            ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                            : 'bg-slate-200 text-slate-600 border border-slate-300'
                        }`}
                      >
                        {pm.active ? (
                          <>
                            <ToggleRight className="w-4 h-4 text-emerald-600" /> Enabled
                          </>
                        ) : (
                          <>
                            <ToggleLeft className="w-4 h-4 text-slate-400" /> Disabled
                          </>
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeletePayoutMethod(pm.id)}
                        className="p-1 rounded-xl bg-red-50 text-red-600 hover:bg-red-100 transition-colors border border-red-100"
                        title="Delete Method"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Instructions / Description for Users
                    </label>
                    <textarea
                      rows={2}
                      value={pm.description}
                      onChange={(e) => handleUpdatePayoutMethod(pm.id, { description: e.target.value })}
                      className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-xl font-medium text-slate-800"
                    />
                  </div>

                  <div className="pt-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                      Configured Account Fields ({pm.fields?.length || 0})
                    </span>
                    <div className="flex flex-col gap-2">
                      {pm.fields?.map((f, i) => (
                        <div key={f.key} className="flex gap-2 items-center">
                          <input
                            type="text"
                            value={f.key}
                            onChange={(e) => {
                              const newFields = [...(pm.fields || [])];
                              newFields[i].key = e.target.value;
                              handleUpdatePayoutMethod(pm.id, { fields: newFields });
                            }}
                            placeholder="key (e.g. email)"
                            className="w-1/3 px-2 py-1 bg-white border border-slate-200 rounded text-[10px] font-mono text-slate-600"
                          />
                          <input
                            type="text"
                            value={f.label}
                            onChange={(e) => {
                              const newFields = [...(pm.fields || [])];
                              newFields[i].label = e.target.value;
                              handleUpdatePayoutMethod(pm.id, { fields: newFields });
                            }}
                            placeholder="Label (e.g. Email Address)"
                            className="flex-1 px-2 py-1 bg-white border border-slate-200 rounded text-[10px] font-semibold text-slate-600"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const newFields = [...(pm.fields || [])];
                              newFields.splice(i, 1);
                              handleUpdatePayoutMethod(pm.id, { fields: newFields });
                            }}
                            className="p-1 text-slate-400 hover:text-red-500"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={() => {
                          const newFields = [...(pm.fields || [])];
                          newFields.push({ key: `field_${Date.now()}`, label: 'New Field', placeholder: '', required: true });
                          handleUpdatePayoutMethod(pm.id, { fields: newFields });
                        }}
                        className="text-[10px] text-emerald-600 hover:text-emerald-700 font-bold self-start mt-1 flex items-center gap-1"
                      >
                        <Plus className="w-3 h-3" /> Add Field
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 3: Email Templates */}
        {activeTab === 'emails' && (
          <div className="space-y-4">
            <div className="border-b pb-2">
              <h3 className="text-sm font-bold text-slate-900">Automated Notification Email Templates</h3>
              <p className="text-[11px] text-slate-500">
                Manage email notifications automatically dispatched upon request status changes.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Template Selector List */}
              <div className="space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  System Email Events
                </span>
                {emailTemplates.map((tpl) => (
                  <button
                    key={tpl.id}
                    type="button"
                    onClick={() => setSelectedTemplateId(tpl.id)}
                    className={`w-full text-left p-3 rounded-2xl border font-bold transition-all flex flex-col gap-1 ${
                      selectedTemplateId === tpl.id
                        ? 'bg-slate-900 text-white border-slate-900 shadow-md'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <span className="text-xs truncate">{tpl.name}</span>
                    <span className="text-[10px] font-normal opacity-80 truncate">
                      To: {tpl.recipientRole}
                    </span>
                  </button>
                ))}
              </div>

              {/* Template Editor Pane */}
              {selectedTemplate && (
                <div className="md:col-span-2 space-y-4 bg-slate-50 p-5 rounded-2xl border border-slate-200">
                  <div className="border-b pb-2">
                    <h4 className="font-extrabold text-slate-900 text-sm">{selectedTemplate.name}</h4>
                    <p className="text-[11px] text-slate-500">Trigger: {selectedTemplate.triggerEvent}</p>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Target Recipient Group</label>
                    <input
                      type="text"
                      value={selectedTemplate.recipientRole}
                      onChange={(e) => handleUpdateTemplate(selectedTemplate.id, { recipientRole: e.target.value })}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-bold"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Email Subject Line</label>
                    <input
                      type="text"
                      value={selectedTemplate.subject}
                      onChange={(e) => handleUpdateTemplate(selectedTemplate.id, { subject: e.target.value })}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-bold text-slate-900"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block font-bold text-slate-700">Email Body Template</label>
                      <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded">
                        Variable Engine Active
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-1.5 mb-2 p-2 bg-slate-100 rounded-xl border border-slate-200 text-[10px]">
                      <span className="font-bold text-slate-500 uppercase tracking-wider text-[9px] mr-1">Available Tags:</span>
                      {[
                        'request_id',
                        'request_link',
                        'admin_request_link',
                        'school_request_link',
                        'verification_link',
                        'payout_link',
                        'invite_link',
                        'recipient_name',
                        'school_name',
                        'amount',
                        'custom_note',
                        'submitter_name',
                        'beneficiary_name',
                        'student_name',
                        'status_note',
                        'denial_reason',
                        'payout_method_name',
                      ].map((tag) => (
                        <code
                          key={tag}
                          onClick={() => {
                            handleUpdateTemplate(selectedTemplate.id, {
                              body: `${selectedTemplate.body} {{${tag}}}`,
                            });
                          }}
                          className={`px-1.5 py-0.5 rounded font-mono cursor-pointer transition-colors shadow-2xs border ${
                            tag === 'request_link' || tag === 'admin_request_link' || tag === 'school_request_link'
                              ? 'bg-indigo-50 border-indigo-300 text-indigo-700 font-bold hover:bg-indigo-100'
                              : 'bg-white border-slate-300 hover:border-indigo-400 hover:text-indigo-600 text-slate-700'
                          }`}
                          title={`Click to insert {{${tag}}}`}
                        >
                          {`{{${tag}}}`}
                        </code>
                      ))}
                    </div>
                    <p className="text-[10px] text-slate-500 mb-2 italic">
                      💡 Tip: <code className="font-mono font-bold text-indigo-700">{'{{request_link}}'}</code> automatically evaluates to an Admin Portal URL (<code className="font-mono text-slate-600">/admin/requests/:id</code>) for administrator comms and a School Portal URL (<code className="font-mono text-slate-600">/requests/:id</code>) for principals and submitters.
                    </p>

                    <textarea
                      rows={6}
                      value={selectedTemplate.body}
                      onChange={(e) => handleUpdateTemplate(selectedTemplate.id, { body: e.target.value })}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-mono text-[11px] leading-relaxed focus:outline-hidden focus:border-indigo-500"
                    />
                  </div>

                  {/* Live Rendered Email Preview */}
                  <div className="p-4 bg-slate-900 text-slate-100 rounded-2xl space-y-2 border border-slate-800 shadow-inner">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-400">
                        <Eye className="w-3.5 h-3.5" />
                        <span>Live Rendered Email Preview</span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono">Sample Data Evaluated</span>
                    </div>

                    {(() => {
                      const origin = typeof window !== 'undefined' && window.location?.origin ? window.location.origin : 'https://smallmoves.org';
                      const isAdminTemplate =
                        selectedTemplate.recipientRole.toLowerCase().includes('admin') ||
                        selectedTemplate.recipientRole.toLowerCase().includes('finance') ||
                        selectedTemplate.recipientRole.toLowerCase().includes('ops') ||
                        selectedTemplate.recipientRole.toLowerCase().includes('leadership') ||
                        selectedTemplate.triggerEvent.includes('admin') ||
                        selectedTemplate.triggerEvent.includes('finance') ||
                        selectedTemplate.triggerEvent.includes('ready_to_pay');

                      const isBeneficiaryTemplate =
                        selectedTemplate.recipientRole.toLowerCase().includes('beneficiary') ||
                        selectedTemplate.triggerEvent.includes('waiting_on_beneficiary') ||
                        selectedTemplate.id === 'tpl-03';

                      const sampleAdminLink = `${origin}/admin/requests/REQ-2026-1001`;
                      const sampleSchoolLink = `${origin}/requests/REQ-2026-1001`;
                      const sampleVerificationLink = `${origin}/verify-payout?id=REQ-2026-1001`;

                      const contextualLink = isAdminTemplate
                        ? sampleAdminLink
                        : isBeneficiaryTemplate
                        ? sampleVerificationLink
                        : sampleSchoolLink;

                      const sampleContext = {
                        request_id: 'REQ-2026-1001',
                        request_link: contextualLink,
                        request_url: contextualLink,
                        link: contextualLink,
                        open_request_link: contextualLink,
                        admin_request_link: sampleAdminLink,
                        school_request_link: sampleSchoolLink,
                        submitter_name: 'Sarah Jenkins',
                        submitter_email: 'sjenkins@oakridgehs.org',
                        beneficiary_name: 'Maria Rodriguez',
                        student_name: 'Mateo Rodriguez (Grade 11)',
                        school_name: 'Oakridge High School',
                        amount: '$750',
                        category: 'Housing & Utilities',
                        verification_link: sampleVerificationLink,
                        payout_link: sampleVerificationLink,
                        confirm_link: sampleVerificationLink,
                        confirmation_link: sampleVerificationLink,
                        payout_confirmation_link: sampleVerificationLink,
                        beneficiary_confirmation_link: sampleVerificationLink,
                        beneficiary_payout_confirmation_link: sampleVerificationLink,
                        invite_link: `${origin}/setup-account?token=sample-token-123`,
                        status_note: 'Approved by admin. Principal must enter payout details.',
                        denial_reason: 'Ineligible expense category under current PEF grant guidelines.',
                        payout_method_name: 'Direct Deposit / ACH',
                        payee_type: 'Beneficiary Direct',
                      };
                      const rendered = renderEmailTemplate(
                        { subject: selectedTemplate.subject, body: selectedTemplate.body },
                        sampleContext
                      );
                      return (
                        <div className="space-y-2 text-xs">
                          <div>
                            <span className="text-[10px] text-slate-400 uppercase font-sans font-bold block mb-0.5">
                              Subject Line:
                            </span>
                            <div className="font-extrabold text-white font-sans bg-slate-800/80 px-2.5 py-1 rounded-lg border border-slate-700">
                              {rendered.subject || '(Empty Subject)'}
                            </div>
                          </div>

                          <div>
                            <span className="text-[10px] text-slate-400 uppercase font-sans font-bold block mb-0.5">
                              Body Content:
                            </span>
                            <div className="font-mono text-[11px] text-slate-200 whitespace-pre-wrap bg-slate-950 p-3 rounded-xl border border-slate-800 leading-relaxed max-h-48 overflow-y-auto">
                              {rendered.body || '(Empty Body)'}
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 4: Beneficiary Payout Confirmation Web Page Template */}
        {activeTab === 'payoutPage' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Globe className="w-5 h-5 text-[#0089B3]" />
                  Beneficiary Payout Confirmation Web Page Template
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Configure copy, button labels, and messages for the public confirmation web page accessed by relief beneficiaries via link in email or SMS.
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full">
                  Auto Multi-Language Active
                </span>
                <a
                  href="/verify-payout?id=REQ-2026-1001"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] font-bold text-[#0089B3] hover:text-[#007399] bg-[#EDF7FC] hover:bg-[#E0F2FA] border border-[#0089B3]/30 px-3 py-1 rounded-xl flex items-center gap-1 transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Test Live Page
                </a>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Form Controls */}
              <div className="lg:col-span-7 bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-4 text-xs">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-700 block border-b border-slate-200 pb-2">
                  Web Page Copy & Button Labels
                </span>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Header Main Title</label>
                    <input
                      type="text"
                      value={payoutPageTemplate.headerTitle}
                      onChange={(e) =>
                        setPayoutPageTemplate((prev) => ({ ...prev, headerTitle: e.target.value }))
                      }
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-slate-900 font-semibold focus:outline-hidden focus:border-[#0089B3]"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Header Subtitle</label>
                    <input
                      type="text"
                      value={payoutPageTemplate.headerSubtitle}
                      onChange={(e) =>
                        setPayoutPageTemplate((prev) => ({ ...prev, headerSubtitle: e.target.value }))
                      }
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-slate-900 text-xs focus:outline-hidden focus:border-[#0089B3]"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="font-bold text-slate-700 block mb-1">Instructions Paragraph</label>
                    <textarea
                      rows={3}
                      value={payoutPageTemplate.instructions}
                      onChange={(e) =>
                        setPayoutPageTemplate((prev) => ({ ...prev, instructions: e.target.value }))
                      }
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-slate-900 text-xs leading-relaxed focus:outline-hidden focus:border-[#0089B3]"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">1-Click Confirm Button Text</label>
                    <input
                      type="text"
                      value={payoutPageTemplate.confirmButtonText}
                      onChange={(e) =>
                        setPayoutPageTemplate((prev) => ({ ...prev, confirmButtonText: e.target.value }))
                      }
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-slate-900 font-bold focus:outline-hidden focus:border-[#0089B3]"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Needs Edits / Contact Principal Button Text</label>
                    <input
                      type="text"
                      value={payoutPageTemplate.correctButtonText}
                      onChange={(e) =>
                        setPayoutPageTemplate((prev) => ({ ...prev, correctButtonText: e.target.value }))
                      }
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-slate-900 font-bold focus:outline-hidden focus:border-[#0089B3]"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Success Screen Title</label>
                    <input
                      type="text"
                      value={payoutPageTemplate.successTitle}
                      onChange={(e) =>
                        setPayoutPageTemplate((prev) => ({ ...prev, successTitle: e.target.value }))
                      }
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-slate-900 font-bold focus:outline-hidden focus:border-[#0089B3]"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Changes Requested Screen Title</label>
                    <input
                      type="text"
                      value={payoutPageTemplate.changesRequestedTitle || 'Changes Requested — Contact Your Principal'}
                      onChange={(e) =>
                        setPayoutPageTemplate((prev) => ({ ...prev, changesRequestedTitle: e.target.value }))
                      }
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-slate-900 font-bold focus:outline-hidden focus:border-[#0089B3]"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="font-bold text-slate-700 block mb-1">Success Screen Message</label>
                    <textarea
                      rows={2}
                      value={payoutPageTemplate.successMessage}
                      onChange={(e) =>
                        setPayoutPageTemplate((prev) => ({ ...prev, successMessage: e.target.value }))
                      }
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-slate-900 text-xs leading-relaxed focus:outline-hidden focus:border-[#0089B3]"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="font-bold text-slate-700 block mb-1">Changes Requested Screen Message</label>
                    <textarea
                      rows={2}
                      value={payoutPageTemplate.changesRequestedMessage || 'Your request for changes has been submitted and sent back to your school principal. Please contact your principal directly to provide your corrected payment information.'}
                      onChange={(e) =>
                        setPayoutPageTemplate((prev) => ({ ...prev, changesRequestedMessage: e.target.value }))
                      }
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-slate-900 text-xs leading-relaxed focus:outline-hidden focus:border-[#0089B3]"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="font-bold text-slate-700 block mb-1">Footer Support Note</label>
                    <input
                      type="text"
                      value={payoutPageTemplate.footerNote}
                      onChange={(e) =>
                        setPayoutPageTemplate((prev) => ({ ...prev, footerNote: e.target.value }))
                      }
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-slate-900 text-xs focus:outline-hidden focus:border-[#0089B3]"
                    />
                  </div>
                </div>
              </div>

              {/* Interactive Visual Simulation Card */}
              <div className="lg:col-span-5 space-y-4">
                <div className="bg-slate-900 text-slate-100 p-5 rounded-2xl border border-slate-800 shadow-lg space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <div className="flex items-center gap-2 text-xs font-bold text-[#6EBF00]">
                      <Eye className="w-4 h-4" />
                      <span>Live Beneficiary View Simulation</span>
                    </div>
                    <span className="text-[10px] text-slate-400 bg-slate-800 px-2 py-0.5 rounded font-mono">
                      Public Web Page
                    </span>
                  </div>

                  <div className="bg-white text-slate-900 p-4 rounded-xl shadow-xs space-y-3">
                    <div className="text-center space-y-1 pb-2 border-b border-slate-100">
                      <h4 className="font-extrabold text-sm text-slate-900">
                        {payoutPageTemplate.headerTitle || 'Confirm Your Emergency Fund Details'}
                      </h4>
                      <p className="text-[11px] text-slate-500">
                        {payoutPageTemplate.headerSubtitle || 'Oakridge High School Assistance Grant'}
                      </p>
                    </div>

                    <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-center">
                      <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-700 block">Approved Relief Amount</span>
                      <span className="text-xl font-black text-emerald-900 font-mono">$750.00</span>
                    </div>

                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5 text-[11px]">
                      <div className="flex justify-between">
                        <span className="text-slate-500 font-semibold">Recipient:</span>
                        <span className="font-bold text-slate-800">Maria Rodriguez</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500 font-semibold">Selected Method:</span>
                        <span className="font-bold text-slate-800">Zelle: (555) 392-1049</span>
                      </div>
                    </div>

                    <p className="text-[11px] text-slate-600 leading-relaxed italic bg-slate-50/70 p-2.5 rounded-lg border border-slate-100">
                      "{payoutPageTemplate.instructions || 'Please review your approved grant details and confirm that your disbursement information is accurate.'}"
                    </p>

                    <div className="flex gap-2 pt-1">
                      <button
                        type="button"
                        className="flex-1 py-2 bg-[#6EBF00] text-slate-950 font-extrabold text-xs rounded-xl shadow-xs text-center"
                      >
                        {payoutPageTemplate.confirmButtonText || 'Confirm Details & Receive Payout'}
                      </button>
                      <button
                        type="button"
                        className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl border border-slate-200"
                      >
                        {payoutPageTemplate.correctButtonText || 'Information Needs Edits? Contact Principal'}
                      </button>
                    </div>

                    <div className="pt-2 text-center text-[10px] text-slate-400">
                      {payoutPageTemplate.footerNote || 'Questions or need help? Contact your school principal or Small Moves support.'}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 5: Email Provider (Twilio SendGrid & Firebase Trigger Email) */}
        {activeTab === 'emailProvider' && (
          <EmailProviderSettingsTab
            settings={settings}
            emailProvider={emailProvider}
            onUpdateProviderConfig={(updates) =>
              setEmailProvider((prev) => ({ ...prev, ...updates }))
            }
            onSaveSettings={() => {
              onSaveSettings({ emailProvider });
              setSavedSuccess(true);
              setTimeout(() => setSavedSuccess(false), 2500);
            }}
          />
        )}

        {/* Tab 6: SMS Provider (Vonage Messages API) */}
        {activeTab === 'smsProvider' && (
          <SmsProviderSettingsTab settings={settings} />
        )}

        {/* Tab 7: Default Budget & Limits */}
        {activeTab === 'budget' && (
          <div className="space-y-6 max-w-xl">
            <div className="border-b pb-2">
              <h3 className="text-sm font-bold text-slate-900">Default School Budget & Limits</h3>
              <p className="text-[11px] text-slate-500">
                Default starting budget assigned to new school profiles and maximum per-request funding limits.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Standard Initial School Allocation ($)</label>
                <div className="relative">
                  <DollarSign className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="number"
                    value={defaultBudget}
                    onChange={(e) => setDefaultBudget(Number(e.target.value))}
                    className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-xl font-extrabold text-slate-900 text-sm focus:outline-hidden focus:border-emerald-500"
                  />
                </div>
                <p className="text-[10px] text-slate-400 mt-1">
                  Default annual budget allocated when onboarding a new school.
                </p>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Max Per-Request Limit ($)</label>
                <div className="relative">
                  <DollarSign className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="number"
                    value={maxPerRequest}
                    onChange={(e) => setMaxPerRequest(Number(e.target.value))}
                    min={1}
                    className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-xl font-extrabold text-slate-900 text-sm focus:outline-hidden focus:border-emerald-500"
                  />
                </div>
                <p className="text-[10px] text-slate-400 mt-1">
                  Upper limit permitted for a single emergency request submission across all schools.
                </p>
              </div>
            </div>

            {/* Fiscal Year End Budget Reset Admin Function Box */}
            <div className="p-5 bg-gradient-to-br from-amber-50 to-orange-50/50 border border-amber-200 rounded-2xl space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-amber-600 text-white rounded-xl shadow-xs">
                    <RefreshCw className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-slate-900 text-sm">Fiscal Year End Budget Reset & Rollover</h4>
                    <p className="text-[11px] text-slate-600">
                      Perform annual rollover for school budgets, reset expenditure counters, and trigger annual MOU re-signatures.
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-3 bg-white/80 rounded-xl border border-amber-100 text-[11px] text-slate-700 space-y-1">
                <div className="flex justify-between">
                  <span className="font-medium text-slate-500">Active Partner Schools:</span>
                  <span className="font-bold text-slate-900">{schools.length} schools</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium text-slate-500">Current Default Baseline:</span>
                  <span className="font-bold text-emerald-700">${Number(defaultBudget).toLocaleString()} / school</span>
                </div>
              </div>

              <div className="pt-1 flex justify-end">
                <button
                  type="button"
                  onClick={() => setResetModalOpen(true)}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Run Fiscal Year End Reset
                </button>
              </div>
            </div>

            {/* Go-Live Production Data Wipe Box */}
            <div className="p-5 bg-gradient-to-br from-rose-50 to-red-50/40 border border-rose-200 rounded-2xl space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-rose-600 text-white rounded-xl shadow-xs">
                    <Trash2 className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-extrabold text-slate-900 text-sm">Production Go-Live: Clear Test & Mock Data</h4>
                      {settings.isProductionReady && (
                        <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 border border-emerald-200 font-extrabold text-[10px] uppercase rounded-md tracking-wider">
                          Live Mode Active
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-600">
                      Purge demo schools, test emergency requests, mock principals, and donor records from Firestore before onboarding live schools.
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-3 bg-white/80 rounded-xl border border-rose-100 text-[11px] text-slate-700 grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                <div className="p-2 bg-slate-50 rounded-lg">
                  <span className="block text-[10px] text-slate-400 font-bold uppercase">Requests</span>
                  <span className="text-xs font-black text-slate-900">{stats?.requestsCount ?? 0}</span>
                </div>
                <div className="p-2 bg-slate-50 rounded-lg">
                  <span className="block text-[10px] text-slate-400 font-bold uppercase">Schools</span>
                  <span className="text-xs font-black text-slate-900">{stats?.schoolsCount ?? schools.length}</span>
                </div>
                <div className="p-2 bg-slate-50 rounded-lg">
                  <span className="block text-[10px] text-slate-400 font-bold uppercase">Principals/Users</span>
                  <span className="text-xs font-black text-slate-900">{stats?.principalsCount ?? 0}</span>
                </div>
                <div className="p-2 bg-slate-50 rounded-lg">
                  <span className="block text-[10px] text-slate-400 font-bold uppercase">Funders</span>
                  <span className="text-xs font-black text-slate-900">{stats?.fundersCount ?? 0}</span>
                </div>
              </div>

              <div className="pt-1 flex justify-end">
                <button
                  type="button"
                  id="btn-open-production-wipe-modal"
                  onClick={() => setWipeModalOpen(true)}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Open Go-Live Data Reset Tool
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Tab 8: Business SLA & Hours */}
        {activeTab === 'business' && (
          <div className="space-y-4 max-w-lg">
            <div className="border-b pb-2">
              <h3 className="text-sm font-bold text-slate-900">Business Hours & Commitment SLA</h3>
              <p className="text-[11px] text-slate-500">Set organization operational windows and user-facing turnaround commitments.</p>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Time Zone</label>
              <input
                type="text"
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl font-medium"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Business Hours</label>
              <input
                type="text"
                value={businessHours}
                onChange={(e) => setBusinessHours(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl font-medium"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Holidays Schedule Note</label>
              <input
                type="text"
                value={holidaysText}
                onChange={(e) => setHolidaysText(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl font-medium"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Public SLA Commitment Statement</label>
              <textarea
                rows={3}
                value={commitmentWording}
                onChange={(e) => setCommitmentWording(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl font-medium text-xs"
              />
            </div>
          </div>
        )}

        {/* Tab 9: Help Center FAQs */}
        {activeTab === 'faqs' && (
          <div className="space-y-6">
            <div className="border-b pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <HelpCircle className="w-4 h-4 text-emerald-600" />
                  Help Center FAQs ({faqs.length})
                </h3>
                <p className="text-[11px] text-slate-500">
                  Manage the frequently asked questions displayed to principals, contacts, and administrators on the Help & Support Center.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddFaqForm(true)}
                className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer shrink-0"
              >
                <Plus className="w-4 h-4 text-emerald-400" />
                Add New FAQ Item
              </button>
            </div>

            {/* Inline Add FAQ Modal / Form */}
            {showAddFaqForm && (
              <div className="p-5 bg-emerald-50/70 border-2 border-emerald-300 rounded-2xl space-y-4 animate-fade-in shadow-xs">
                <div className="flex justify-between items-center border-b border-emerald-200 pb-2">
                  <h4 className="font-extrabold text-emerald-950 text-xs uppercase tracking-wider flex items-center gap-1.5">
                    <Plus className="w-4 h-4 text-emerald-600" /> Add New FAQ
                  </h4>
                  <button
                    type="button"
                    onClick={() => setShowAddFaqForm(false)}
                    className="text-emerald-700 hover:text-emerald-950 text-xs font-bold cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block text-[11px] font-bold text-emerald-950 mb-1">Question</label>
                    <input
                      type="text"
                      placeholder="e.g. How do I request an exception for amounts exceeding $2,000?"
                      value={newFaqQuestion}
                      onChange={(e) => setNewFaqQuestion(e.target.value)}
                      className="w-full px-3.5 py-2 bg-white border border-emerald-300 rounded-xl font-bold text-slate-900 text-xs focus:outline-hidden focus:border-emerald-600"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-emerald-950 mb-1">Detailed Answer</label>
                    <textarea
                      rows={3}
                      placeholder="Provide clear, concise instructions or policy guidance..."
                      value={newFaqAnswer}
                      onChange={(e) => setNewFaqAnswer(e.target.value)}
                      className="w-full px-3.5 py-2 bg-white border border-emerald-300 rounded-xl font-medium text-slate-800 text-xs focus:outline-hidden focus:border-emerald-600 leading-relaxed"
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setShowAddFaqForm(false)}
                      className="px-3 py-1.5 border border-emerald-300 text-emerald-900 font-bold rounded-xl text-xs hover:bg-emerald-100 cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleAddFaq}
                      disabled={!newFaqQuestion.trim() || !newFaqAnswer.trim()}
                      className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold rounded-xl text-xs shadow-xs cursor-pointer flex items-center gap-1.5"
                    >
                      <Plus className="w-3.5 h-3.5" /> Save New FAQ
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* List of Existing FAQs */}
            <div className="space-y-3">
              {faqs.length === 0 ? (
                <div className="p-8 text-center bg-slate-50 border border-slate-200 rounded-2xl text-slate-500 text-xs">
                  No FAQs added yet. Click &quot;Add New FAQ Item&quot; to create your first question.
                </div>
              ) : (
                faqs.map((faq, idx) => {
                  const isEditing = editingFaqId === faq.id;
                  return (
                    <div
                      key={faq.id}
                      className="p-4 bg-slate-50 hover:bg-white rounded-2xl border border-slate-200 transition-all shadow-2xs space-y-3"
                    >
                      {isEditing ? (
                        <div className="space-y-3 bg-white p-4 rounded-xl border border-indigo-200">
                          <div className="flex justify-between items-center border-b pb-2">
                            <span className="font-bold text-indigo-900 text-xs">Editing FAQ Item #{idx + 1}</span>
                            <button
                              type="button"
                              onClick={() => setEditingFaqId(null)}
                              className="text-xs font-bold text-slate-400 hover:text-slate-600 cursor-pointer"
                            >
                              Cancel
                            </button>
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">Question</label>
                            <input
                              type="text"
                              value={faq.q}
                              onChange={(e) => handleUpdateFaq(faq.id, { q: e.target.value })}
                              className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-xl font-bold text-slate-900 text-xs"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">Answer</label>
                            <textarea
                              rows={3}
                              value={faq.a}
                              onChange={(e) => handleUpdateFaq(faq.id, { a: e.target.value })}
                              className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-xl font-medium text-slate-800 text-xs leading-relaxed"
                            />
                          </div>
                          <div className="flex justify-end">
                            <button
                              type="button"
                              onClick={() => setEditingFaqId(null)}
                              className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs cursor-pointer shadow-xs"
                            >
                              Done Editing
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div>
                          <div className="flex items-start justify-between gap-3">
                            <div className="space-y-1">
                              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                                FAQ #{idx + 1}
                              </span>
                              <h4 className="font-extrabold text-slate-900 text-xs leading-snug">{faq.q}</h4>
                            </div>

                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                type="button"
                                title="Move Up"
                                disabled={idx === 0}
                                onClick={() => handleMoveFaq(idx, 'up')}
                                className="p-1.5 text-slate-400 hover:text-slate-700 disabled:opacity-30 rounded-lg hover:bg-slate-200 cursor-pointer"
                              >
                                <ArrowUp className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                title="Move Down"
                                disabled={idx === faqs.length - 1}
                                onClick={() => handleMoveFaq(idx, 'down')}
                                className="p-1.5 text-slate-400 hover:text-slate-700 disabled:opacity-30 rounded-lg hover:bg-slate-200 cursor-pointer"
                              >
                                <ArrowDown className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                title="Edit Question & Answer"
                                onClick={() => setEditingFaqId(faq.id)}
                                className="p-1.5 text-indigo-600 hover:text-indigo-800 rounded-lg hover:bg-indigo-50 cursor-pointer font-bold flex items-center gap-1 text-[11px] ml-1"
                              >
                                <Edit2 className="w-3.5 h-3.5" /> Edit
                              </button>
                              <button
                                type="button"
                                title="Delete FAQ"
                                onClick={() => {
                                  if (confirm('Are you sure you want to delete this FAQ?')) {
                                    handleDeleteFaq(faq.id);
                                  }
                                }}
                                className="p-1.5 text-rose-600 hover:text-rose-800 rounded-lg hover:bg-rose-50 cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          <p className="text-xs text-slate-600 leading-relaxed mt-2 pl-2 border-l-2 border-slate-200">
                            {faq.a}
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* Tab 10: Organization Logo & Branding */}
        {activeTab === 'branding' && (
          <div className="space-y-6 max-w-3xl">
            <div className="border-b pb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-emerald-600" />
                Organization Logo & Sidebar Branding
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Upload a custom logo image and customize logo layout styling (justification, size, padding, background badges) displayed across the sidebar.
              </p>
            </div>

            {/* Live Sidebar Header Interactive Preview */}
            <div className="p-5 bg-slate-900 text-white rounded-2xl border border-slate-800 space-y-3 shadow-md">
              <div className="flex items-center justify-between text-[11px] text-slate-400 font-bold border-b border-slate-800 pb-2">
                <span>Sidebar Brand Header Live Preview</span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${customLogoUrl ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-slate-800 text-slate-400'}`}>
                  {customLogoUrl ? 'Custom Upload Active' : 'Default Brand Active'}
                </span>
              </div>

              {/* Exact simulated sidebar header container */}
              <div className="p-3 bg-slate-950/90 rounded-xl border border-slate-800/80">
                <div
                  className={`transition-all ${
                    logoStyle.bgStyle === 'dark_badge'
                      ? 'bg-slate-950/80 border border-slate-800/80 shadow-inner'
                      : logoStyle.bgStyle === 'light_badge'
                      ? 'bg-white text-slate-900 border border-slate-200/20 shadow-xs'
                      : logoStyle.bgStyle === 'glass'
                      ? 'bg-slate-800/50 backdrop-blur-xs border border-slate-700/60'
                      : ''
                  } ${
                    logoStyle.bgStyle !== 'transparent'
                      ? logoStyle.borderRadius === 'none'
                        ? 'rounded-none'
                        : logoStyle.borderRadius === 'small'
                        ? 'rounded-md'
                        : logoStyle.borderRadius === 'large'
                        ? 'rounded-2xl'
                        : logoStyle.borderRadius === 'full'
                        ? 'rounded-full'
                        : 'rounded-xl'
                      : ''
                  }`}
                  style={{
                    paddingTop: `${logoStyle.paddingY ?? 16}px`,
                    paddingBottom: `${logoStyle.paddingY ?? 16}px`,
                    paddingLeft: `${logoStyle.paddingX ?? 16}px`,
                    paddingRight: `${logoStyle.paddingX ?? 16}px`,
                  }}
                >
                  <div
                    className={`flex items-center ${
                      logoStyle.alignment === 'center'
                        ? 'justify-center'
                        : logoStyle.alignment === 'right'
                        ? 'justify-end'
                        : 'justify-start'
                    }`}
                  >
                    <SmallMovesLogo
                      isDarkBackground={logoStyle.bgStyle !== 'light_badge'}
                      customLogoUrl={customLogoUrl}
                      logoStyle={logoStyle}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* File Upload Control */}
            <div className="space-y-3 pt-1">
              <label className="block text-xs font-bold text-slate-800">
                1. Upload Custom Logo File
              </label>

              <div className="border-2 border-dashed border-slate-300 hover:border-emerald-500 transition-colors bg-slate-50/50 hover:bg-emerald-50/20 rounded-2xl p-5 text-center space-y-3">
                <div className="mx-auto w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center shadow-2xs">
                  <UploadCloud className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-800">
                    Click below or drag and drop a logo image file
                  </p>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Supports PNG, SVG, JPG, WebP (Transparent PNG or vector SVG recommended)
                  </p>
                </div>

                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      if (file.size > 3 * 1024 * 1024) {
                        alert('Selected file is too large. Please select an image under 3MB.');
                        return;
                      }
                      const reader = new FileReader();
                      reader.onloadend = () => {
                        if (typeof reader.result === 'string') {
                          setCustomLogoUrl(reader.result);
                        }
                      };
                      reader.readAsDataURL(file);
                    }
                  }}
                  className="hidden"
                  id="custom-logo-upload-input"
                />

                <div className="pt-1 flex flex-wrap items-center justify-center gap-3">
                  <label
                    htmlFor="custom-logo-upload-input"
                    className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs shadow-xs cursor-pointer inline-flex items-center gap-2 transition-all"
                  >
                    <UploadCloud className="w-4 h-4 text-emerald-400" />
                    Choose Logo File
                  </label>

                  {customLogoUrl && (
                    <button
                      type="button"
                      onClick={() => setCustomLogoUrl('')}
                      className="px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold rounded-xl text-xs transition-colors cursor-pointer inline-flex items-center gap-1.5"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      Reset to Default Logo
                    </button>
                  )}
                </div>
              </div>

              {customLogoUrl && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-[11px] text-emerald-800 flex items-center justify-between">
                  <span>Custom logo image loaded. Click <strong>"Save System Settings"</strong> to persist.</span>
                </div>
              )}
            </div>

            {/* Logo Alignment / Justification */}
            <div className="space-y-3 border-t border-slate-100 pt-4">
              <label className="block text-xs font-bold text-slate-800">
                2. Logo Justification & Alignment
              </label>

              <div className="grid grid-cols-3 gap-3">
                {[
                  { id: 'left', label: 'Left Aligned' },
                  { id: 'center', label: 'Centered' },
                  { id: 'right', label: 'Right Aligned' },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setLogoStyle((prev) => ({ ...prev, alignment: item.id as any }))}
                    className={`px-4 py-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer text-center ${
                      logoStyle.alignment === item.id
                        ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Logo Height / Size Control */}
            <div className="space-y-3 border-t border-slate-100 pt-4">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-800">
                  3. Logo Height
                </label>
                <span className="text-xs font-mono font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-md border border-emerald-200">
                  {logoStyle.height ?? 44}px
                </span>
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min={24}
                  max={80}
                  step={2}
                  value={logoStyle.height ?? 44}
                  onChange={(e) => setLogoStyle((prev) => ({ ...prev, height: Number(e.target.value) }))}
                  className="flex-1 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-emerald-600"
                />
              </div>

              <div className="flex items-center gap-2">
                {[
                  { label: 'Compact (32px)', val: 32 },
                  { label: 'Standard (44px)', val: 44 },
                  { label: 'Large (56px)', val: 56 },
                  { label: 'Hero (68px)', val: 68 },
                ].map((preset) => (
                  <button
                    key={preset.val}
                    type="button"
                    onClick={() => setLogoStyle((prev) => ({ ...prev, height: preset.val }))}
                    className={`px-3 py-1 rounded-lg text-[11px] font-bold border transition-colors cursor-pointer ${
                      logoStyle.height === preset.val
                        ? 'bg-emerald-600 text-white border-emerald-600'
                        : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Container Padding Y (Vertical) */}
            <div className="space-y-3 border-t border-slate-100 pt-4">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-800">
                  4. Top & Bottom Padding (Vertical Padding Y)
                </label>
                <span className="text-xs font-mono font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-md border border-emerald-200">
                  {logoStyle.paddingY ?? 16}px
                </span>
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min={0}
                  max={32}
                  step={2}
                  value={logoStyle.paddingY ?? 16}
                  onChange={(e) => setLogoStyle((prev) => ({ ...prev, paddingY: Number(e.target.value) }))}
                  className="flex-1 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-emerald-600"
                />
              </div>

              <div className="flex items-center gap-2">
                {[
                  { label: 'Flush (0px)', val: 0 },
                  { label: 'Tight (8px)', val: 8 },
                  { label: 'Standard (16px)', val: 16 },
                  { label: 'Spacious (24px)', val: 24 },
                ].map((preset) => (
                  <button
                    key={preset.val}
                    type="button"
                    onClick={() => setLogoStyle((prev) => ({ ...prev, paddingY: preset.val }))}
                    className={`px-3 py-1 rounded-lg text-[11px] font-bold border transition-colors cursor-pointer ${
                      logoStyle.paddingY === preset.val
                        ? 'bg-emerald-600 text-white border-emerald-600'
                        : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Container Padding X (Horizontal) */}
            <div className="space-y-3 border-t border-slate-100 pt-4">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-800">
                  5. Left & Right Padding (Horizontal Padding X)
                </label>
                <span className="text-xs font-mono font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-md border border-emerald-200">
                  {logoStyle.paddingX ?? 16}px
                </span>
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min={0}
                  max={32}
                  step={2}
                  value={logoStyle.paddingX ?? 16}
                  onChange={(e) => setLogoStyle((prev) => ({ ...prev, paddingX: Number(e.target.value) }))}
                  className="flex-1 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-emerald-600"
                />
              </div>

              <div className="flex items-center gap-2">
                {[
                  { label: 'Flush (0px)', val: 0 },
                  { label: 'Compact (8px)', val: 8 },
                  { label: 'Standard (16px)', val: 16 },
                  { label: 'Spacious (24px)', val: 24 },
                ].map((preset) => (
                  <button
                    key={preset.val}
                    type="button"
                    onClick={() => setLogoStyle((prev) => ({ ...prev, paddingX: preset.val }))}
                    className={`px-3 py-1 rounded-lg text-[11px] font-bold border transition-colors cursor-pointer ${
                      logoStyle.paddingX === preset.val
                        ? 'bg-emerald-600 text-white border-emerald-600'
                        : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Container Background Style */}
            <div className="space-y-3 border-t border-slate-100 pt-4">
              <label className="block text-xs font-bold text-slate-800">
                6. Logo Background Container Style
              </label>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { id: 'transparent', label: 'Transparent', desc: 'Direct on sidebar' },
                  { id: 'dark_badge', label: 'Dark Badge', desc: 'Charcoal container' },
                  { id: 'light_badge', label: 'Light Badge', desc: 'White container' },
                  { id: 'glass', label: 'Glass Card', desc: 'Frosted glass' },
                ].map((bg) => (
                  <button
                    key={bg.id}
                    type="button"
                    onClick={() => setLogoStyle((prev) => ({ ...prev, bgStyle: bg.id as any }))}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      logoStyle.bgStyle === bg.id
                        ? 'bg-emerald-50/60 border-emerald-500 ring-2 ring-emerald-500/20'
                        : 'bg-white border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <div className="text-xs font-bold text-slate-900">{bg.label}</div>
                    <div className="text-[10px] text-slate-500 mt-0.5">{bg.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Container Corner Radius (if bgStyle !== transparent) */}
            {logoStyle.bgStyle !== 'transparent' && (
              <div className="space-y-3 border-t border-slate-100 pt-4">
                <label className="block text-xs font-bold text-slate-800">
                  7. Container Corner Radius
                </label>

                <div className="flex flex-wrap gap-2">
                  {[
                    { id: 'none', label: 'Sharp (0px)' },
                    { id: 'small', label: 'Small (6px)' },
                    { id: 'medium', label: 'Medium (12px)' },
                    { id: 'large', label: 'Large (16px)' },
                    { id: 'full', label: 'Full Pill' },
                  ].map((rad) => (
                    <button
                      key={rad.id}
                      type="button"
                      onClick={() => setLogoStyle((prev) => ({ ...prev, borderRadius: rad.id as any }))}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
                        logoStyle.borderRadius === rad.id
                          ? 'bg-slate-900 text-white border-slate-900'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      {rad.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab 11: Form Dropdowns */}
        {activeTab === 'dropdowns' && (
          <div className="space-y-6 max-w-2xl">
            <div className="border-b pb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-emerald-600" />
                Form Dropdown Options
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Configure the options available in dropdown menus across the portal.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  "Reason for Request" Options (one per line)
                </label>
                <textarea
                  value={requestReasonsText}
                  onChange={(e) => setRequestReasonsText(e.target.value)}
                  className="w-full h-48 px-3 py-2 border border-slate-300 rounded-xl font-medium text-xs focus:outline-hidden focus:border-emerald-500 font-mono"
                  placeholder="Enter options, one per line..."
                />
                <p className="text-[10px] text-slate-500 mt-1">
                  Note: The option "Other" will always dynamically reveal a free-text field on the request form if selected.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  "What will the funds be used for" Options (one per line)
                </label>
                <textarea
                  value={fundUsesText}
                  onChange={(e) => setFundUsesText(e.target.value)}
                  className="w-full h-48 px-3 py-2 border border-slate-300 rounded-xl font-medium text-xs focus:outline-hidden focus:border-emerald-500 font-mono"
                  placeholder="Enter options, one per line..."
                />
                <p className="text-[10px] text-slate-500 mt-1">
                  Note: The option "Other" will always dynamically reveal a free-text field on the request form if selected.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Tab 12: MOU Versions */}
        {activeTab === 'mou' && (
          <div className="space-y-6 max-w-4xl">
            <div className="border-b pb-3 flex justify-between items-center">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-emerald-600" />
                  MOU Versions & Terms
                </h3>
                <p className="text-[11px] text-slate-500 mt-1">
                  Manage the Principal Emergency Fund Participation Agreement and Memorandum of Understanding version history.
                </p>
              </div>
              <button
                type="button"
                id="btn-mou-new-version"
                onClick={handleStartNewMouVersion}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                New Version
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Version History Sidebar */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-800">Version History</h4>
                  <span className="text-[10px] text-slate-500 font-medium">{mouVersions.length} versions</span>
                </div>
                <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
                  {mouVersions.length === 0 && (
                    <p className="text-xs text-slate-500 italic p-3 bg-slate-50 rounded-xl border border-slate-200">
                      No MOU versions found.
                    </p>
                  )}
                  {mouVersions.map((v) => {
                    const isSelected = !isCreatingMou && editingMouId === v.id;
                    const isDefault = currentMouVersionId === v.id;
                    return (
                      <div
                        key={v.id}
                        onClick={() => handleSelectMouVersion(v)}
                        className={`p-3 border rounded-xl cursor-pointer transition-all ${
                          isSelected
                            ? 'border-emerald-500 bg-emerald-50/70 shadow-xs ring-1 ring-emerald-500'
                            : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex justify-between items-start mb-1 gap-2">
                          <span className="font-bold text-slate-900 text-xs line-clamp-2 leading-tight">
                            {v.name}
                          </span>
                          {isDefault && (
                            <span className="shrink-0 px-1.5 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded flex items-center gap-0.5">
                              <Check className="w-2.5 h-2.5" /> Default
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-500 flex items-center justify-between mt-2 pt-1.5 border-t border-slate-100">
                          <span>{new Date(v.createdAt).toLocaleDateString()}</span>
                          <span className="text-slate-400 font-mono text-[9px]">ID: {v.id.slice(0, 14)}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Version Editor / Preview Pane */}
              <div className="md:col-span-2 space-y-4">
                {isCreatingMou || editingMouId !== null || mouFormName || mouFormContent || mouVersions.length === 0 ? (
                  <div className="bg-slate-50 p-5 border border-slate-200 rounded-xl space-y-4 shadow-xs">
                    <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                      <div className="flex items-center gap-2">
                        {isCreatingMou ? (
                          <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[11px] font-bold rounded-md">
                            Creating New Version
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 bg-slate-200 text-slate-700 text-[11px] font-bold rounded-md">
                            Editing Version
                          </span>
                        )}
                        {!isCreatingMou && editingMouId && currentMouVersionId === editingMouId && (
                          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                            Active Default
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        {/* Editor / Preview Toggle */}
                        <div className="flex items-center bg-white border border-slate-200 rounded-lg p-0.5">
                          <button
                            type="button"
                            onClick={() => setMouPreviewMode(false)}
                            className={`px-2.5 py-1 text-[11px] font-bold rounded-md flex items-center gap-1 cursor-pointer transition-colors ${
                              !mouPreviewMode
                                ? 'bg-slate-800 text-white'
                                : 'text-slate-600 hover:text-slate-900'
                            }`}
                          >
                            <Code className="w-3 h-3" />
                            Edit Markdown
                          </button>
                          <button
                            type="button"
                            onClick={() => setMouPreviewMode(true)}
                            className={`px-2.5 py-1 text-[11px] font-bold rounded-md flex items-center gap-1 cursor-pointer transition-colors ${
                              mouPreviewMode
                                ? 'bg-slate-800 text-white'
                                : 'text-slate-600 hover:text-slate-900'
                            }`}
                          >
                            <Eye className="w-3 h-3" />
                            Preview Document
                          </button>
                        </div>

                        {!isCreatingMou && editingMouId && editingMouId !== currentMouVersionId && (
                          <button
                            type="button"
                            title="Delete this version"
                            onClick={() => handleDeleteMouVersion(editingMouId)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <label className="block text-xs font-bold text-slate-800">
                          Version Name / Title
                        </label>
                        <button
                          type="button"
                          onClick={() => {
                            setMouFormName('Principal Emergency Fund Participation Agreement (Rev. August 31, 2024)');
                            setMouFormContent(PARTICIPATION_AGREEMENT_MOU_CONTENT);
                          }}
                          className="text-[10px] text-emerald-700 hover:text-emerald-800 font-bold hover:underline cursor-pointer flex items-center gap-1"
                        >
                          <RotateCcw className="w-3 h-3" />
                          Load Participation Agreement Template
                        </button>
                      </div>
                      <input
                        type="text"
                        value={mouFormName}
                        onChange={(e) => setMouFormName(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                        placeholder="e.g. Principal Emergency Fund Participation Agreement (Rev. August 31, 2024)"
                      />
                    </div>

                    {mouPreviewMode ? (
                      <div className="space-y-1.5">
                        <label className="block text-xs font-bold text-slate-800">Document Formatted Preview</label>
                        <div className="w-full h-96 p-5 border border-slate-300 rounded-lg bg-white overflow-y-auto prose prose-sm max-w-none text-slate-800 text-xs leading-relaxed">
                          <ReactMarkdown>{mouFormContent || '*No content entered*'}</ReactMarkdown>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <label className="block text-xs font-bold text-slate-800 mb-1">
                          Agreement Terms (Markdown Format)
                        </label>
                        <textarea
                          value={mouFormContent}
                          onChange={(e) => setMouFormContent(e.target.value)}
                          className="w-full h-96 px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden leading-relaxed"
                          placeholder="Enter agreement terms in markdown format..."
                        />
                      </div>
                    )}

                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pt-2 border-t border-slate-200">
                      <div className="flex items-center gap-2">
                        {!isCreatingMou && editingMouId ? (
                          <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-700 select-none">
                            <input
                              type="checkbox"
                              checked={currentMouVersionId === editingMouId}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  handleSetDefaultMouVersion(editingMouId);
                                }
                              }}
                              className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 cursor-pointer"
                            />
                            <span>Make this the current default MOU for all schools</span>
                          </label>
                        ) : (
                          <span className="text-[11px] text-slate-500 italic">
                            Saving will add this version to the version history.
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-auto">
                        {isCreatingMou && (
                          <button
                            type="button"
                            onClick={handleCancelNewMou}
                            className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold rounded-lg cursor-pointer transition-colors"
                          >
                            Cancel
                          </button>
                        )}
                        <button
                          type="button"
                          id="btn-save-mou-version"
                          onClick={handleSaveMouVersion}
                          disabled={!mouFormName.trim() || !mouFormContent.trim()}
                          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold rounded-lg cursor-pointer transition-colors shadow-xs flex items-center gap-1.5"
                        >
                          <Save className="w-3.5 h-3.5" />
                          {isCreatingMou || !editingMouId ? 'Save New Version' : 'Update Version'}
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="h-96 flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50 p-6 text-center">
                    <FileText className="w-10 h-10 text-slate-300 mb-2" />
                    <p className="text-slate-600 text-xs font-bold">No MOU version selected</p>
                    <p className="text-slate-400 text-[11px] mt-1 max-w-xs">
                      Select a version from the left history list to view or click "New Version" to draft a new agreement.
                    </p>
                    <button
                      type="button"
                      onClick={handleStartNewMouVersion}
                      className="mt-4 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg cursor-pointer transition-colors"
                    >
                      + New Version
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-end pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={handleSaveAll}
            className="px-6 py-2.5 bg-[#0089B3] hover:bg-[#007399] text-white font-bold rounded-xl text-xs shadow-md shadow-[#0089B3]/20 flex items-center gap-2 cursor-pointer transition-colors"
          >
            <Save className="w-4 h-4" />
            Save System Settings
          </button>
        </div>
      </div>
      </div>
      </div>

      {/* Fiscal Year End Reset Modal */}
      {resetModalOpen && (
        <FiscalYearResetModal
          isOpen={resetModalOpen}
          onClose={() => setResetModalOpen(false)}
          schools={schools}
          defaultAnnualBudget={defaultBudget}
          mouVersions={settings.mouVersions || []}
          onExecuteReset={(options) => {
            if (onFiscalYearReset) {
              onFiscalYearReset(options);
            }
          }}
        />
      )}

      {/* Production Go-Live Data Reset Modal */}
      {wipeModalOpen && (
        <ProductionDataWipeModal
          isOpen={wipeModalOpen}
          onClose={() => setWipeModalOpen(false)}
          currentAdminEmail={currentAdminEmail}
          stats={{
            schoolsCount: stats?.schoolsCount ?? schools.length,
            requestsCount: stats?.requestsCount ?? 0,
            principalsCount: stats?.principalsCount ?? 0,
            fundersCount: stats?.fundersCount ?? 0,
            invitesCount: stats?.invitesCount ?? 0,
            logsCount: stats?.logsCount ?? 0,
          }}
          onExecuteWipe={async (options) => {
            if (onWipeTestData) {
              return await onWipeTestData(options);
            }
            const res = await wipeProductionTestData(options, currentAdminEmail);
            // Also notify local settings that isProductionReady is set
            onSaveSettings({ isProductionReady: true });
            return res;
          }}
        />
      )}
    </div>
  );
};

