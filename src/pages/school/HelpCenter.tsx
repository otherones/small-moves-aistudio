import React, { useState } from 'react';
import { Search, ChevronDown, ChevronUp, Mail, HelpCircle, Clock, Plus, Edit2, Trash2, ShieldCheck, Check } from 'lucide-react';
import { PortalSettings, FaqItem } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { INITIAL_SETTINGS } from '../../data/defaultSettings';

interface HelpCenterProps {
  maxPerRequestAmount?: number;
  settings?: PortalSettings;
  onSaveSettings?: (updates: Partial<PortalSettings>) => void;
}

export const HelpCenter: React.FC<HelpCenterProps> = ({
  settings,
  onSaveSettings,
}) => {
  const { userProfile } = useAuth();
  const isAdmin = userProfile?.role === 'admin';

  const [searchQuery, setSearchQuery] = useState('');
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  // FAQ Admin state
  const [isAddingFaq, setIsAddingFaq] = useState(false);
  const [editingFaqId, setEditingFaqId] = useState<string | null>(null);
  const [newQuestion, setNewQuestion] = useState('');
  const [newAnswer, setNewAnswer] = useState('');
  const [editQuestion, setEditQuestion] = useState('');
  const [editAnswer, setEditAnswer] = useState('');

  const currentFaqs: FaqItem[] = settings?.faqs && settings.faqs.length > 0
    ? settings.faqs
    : INITIAL_SETTINGS.faqs || [];

  const handleSaveFaqsToPortal = (updatedFaqs: FaqItem[]) => {
    if (onSaveSettings) {
      onSaveSettings({ faqs: updatedFaqs });
    }
  };

  const handleCreateFaq = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newQuestion.trim() || !newAnswer.trim()) return;
    const newItem: FaqItem = {
      id: `faq-${Date.now()}`,
      q: newQuestion.trim(),
      a: newAnswer.trim(),
    };
    const updated = [newItem, ...currentFaqs];
    handleSaveFaqsToPortal(updated);
    setNewQuestion('');
    setNewAnswer('');
    setIsAddingFaq(false);
  };

  const handleStartEditing = (faq: FaqItem) => {
    setEditingFaqId(faq.id);
    setEditQuestion(faq.q);
    setEditAnswer(faq.a);
  };

  const handleSaveEditFaq = (id: string) => {
    if (!editQuestion.trim() || !editAnswer.trim()) return;
    const updated = currentFaqs.map((f) =>
      f.id === id ? { ...f, q: editQuestion.trim(), a: editAnswer.trim() } : f
    );
    handleSaveFaqsToPortal(updated);
    setEditingFaqId(null);
  };

  const handleDeleteFaq = (id: string) => {
    if (window.confirm('Are you sure you want to remove this FAQ entry?')) {
      const updated = currentFaqs.filter((f) => f.id !== id);
      handleSaveFaqsToPortal(updated);
    }
  };

  const filteredFaqs = currentFaqs.filter(
    (f) =>
      f.q.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.a.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Search Banner */}
      <div className="bg-slate-900 text-white p-8 rounded-3xl shadow-xl text-center space-y-4">
        <h1 className="text-2xl font-black tracking-tight">Small Moves Help & Support Center</h1>
        <p className="text-xs text-slate-300 max-w-xl mx-auto">
          Find emergency fund policies, FAQ answers, and direct contact details.
        </p>

        <div className="max-w-md mx-auto relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search FAQs, policies..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 bg-slate-800 border border-slate-700 rounded-2xl text-xs text-white placeholder-slate-400 focus:outline-hidden focus:border-emerald-500"
          />
        </div>
      </div>

      {/* Admin Quick Help Banner */}
      {isAdmin && (
        <div className="bg-emerald-950 text-emerald-100 p-5 rounded-2xl border border-emerald-800/60 shadow-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-600/30 border border-emerald-500/40 rounded-xl text-emerald-300">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-xs text-white uppercase tracking-wider">Admin Privileges Active</span>
                <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 text-[10px] font-bold rounded-full border border-emerald-500/30">
                  Live Editing
                </span>
              </div>
              <p className="text-[11px] text-emerald-200 mt-0.5">
                As an administrator, you can add, edit, or delete FAQs directly on this page or under System Settings.
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsAddingFaq(true)}
            className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-xl text-xs flex items-center gap-1.5 transition-all shadow-md shrink-0 cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Add New FAQ
          </button>
        </div>
      )}

      {/* FAQ Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
            <HelpCircle className="w-4 h-4 text-emerald-600" />
            Frequently Asked Questions
          </h2>
          {isAdmin && !isAddingFaq && (
            <button
              onClick={() => setIsAddingFaq(true)}
              className="text-xs font-extrabold text-emerald-600 hover:text-emerald-700 flex items-center gap-1 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-xl border border-emerald-200 transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" /> Add FAQ
            </button>
          )}
        </div>

        {/* Modal / Card for Adding New FAQ */}
        {isAddingFaq && (
          <form
            onSubmit={handleCreateFaq}
            className="bg-emerald-50/80 border-2 border-emerald-300 rounded-2xl p-6 shadow-sm space-y-4 animate-fade-in"
          >
            <div className="flex items-center justify-between border-b border-emerald-200 pb-3">
              <h3 className="font-extrabold text-emerald-950 text-xs uppercase tracking-wider flex items-center gap-2">
                <Plus className="w-4 h-4 text-emerald-600" /> Add New Help Center FAQ
              </h3>
              <button
                type="button"
                onClick={() => setIsAddingFaq(false)}
                className="text-xs font-bold text-emerald-800 hover:text-emerald-950 cursor-pointer"
              >
                Cancel
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-emerald-950 mb-1">Question</label>
                <input
                  type="text"
                  placeholder="e.g. How do I request an exception for funds exceeding $2,000?"
                  value={newQuestion}
                  onChange={(e) => setNewQuestion(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white border border-emerald-300 rounded-xl font-bold text-xs text-slate-900 focus:outline-hidden focus:border-emerald-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-emerald-950 mb-1">Answer</label>
                <textarea
                  rows={3}
                  placeholder="Provide clear, direct policy or operational instructions for principals..."
                  value={newAnswer}
                  onChange={(e) => setNewAnswer(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white border border-emerald-300 rounded-xl font-medium text-xs text-slate-800 focus:outline-hidden focus:border-emerald-600 leading-relaxed"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsAddingFaq(false)}
                className="px-4 py-2 border border-emerald-300 text-emerald-900 font-bold rounded-xl text-xs hover:bg-emerald-100 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!newQuestion.trim() || !newAnswer.trim()}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold rounded-xl text-xs shadow-md shadow-emerald-600/20 flex items-center gap-1.5 cursor-pointer"
              >
                <Check className="w-4 h-4" /> Save FAQ Item
              </button>
            </div>
          </form>
        )}

        {/* Accordion List */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs divide-y divide-slate-100 overflow-hidden">
          {filteredFaqs.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500">
              No FAQs found matching &quot;{searchQuery}&quot;.
            </div>
          ) : (
            filteredFaqs.map((faq, idx) => {
              const isOpen = openFaqIndex === idx;
              const isEditing = editingFaqId === faq.id;

              return (
                <div key={faq.id || idx} className="p-4">
                  {isEditing ? (
                    <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-emerald-300">
                      <div className="flex items-center justify-between border-b pb-2">
                        <span className="text-xs font-extrabold text-emerald-900">Editing FAQ Entry</span>
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
                          value={editQuestion}
                          onChange={(e) => setEditQuestion(e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">Answer</label>
                        <textarea
                          rows={3}
                          value={editAnswer}
                          onChange={(e) => setEditAnswer(e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-medium text-slate-800 leading-relaxed"
                        />
                      </div>

                      <div className="flex justify-end gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => setEditingFaqId(null)}
                          className="px-3 py-1.5 border border-slate-300 text-slate-700 font-bold text-xs rounded-xl hover:bg-white cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSaveEditFaq(faq.id)}
                          className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer flex items-center gap-1.5"
                        >
                          <Check className="w-3.5 h-3.5" /> Save Changes
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div className="flex items-center justify-between gap-3">
                        <button
                          onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                          className="flex-1 flex items-center justify-between text-left font-bold text-xs text-slate-900 hover:text-emerald-600 transition-colors pr-2 cursor-pointer"
                        >
                          <span>{faq.q}</span>
                          {isOpen ? (
                            <ChevronUp className="w-4 h-4 text-slate-400 shrink-0" />
                          ) : (
                            <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
                          )}
                        </button>

                        {isAdmin && (
                          <div className="flex items-center gap-1 shrink-0 pl-2 border-l border-slate-200">
                            <button
                              type="button"
                              onClick={() => handleStartEditing(faq)}
                              title="Edit FAQ"
                              className="p-1.5 text-indigo-600 hover:text-indigo-800 rounded-lg hover:bg-indigo-50 cursor-pointer font-bold flex items-center gap-1 text-[11px]"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                              <span className="hidden sm:inline">Edit</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteFaq(faq.id)}
                              title="Delete FAQ"
                              className="p-1.5 text-rose-600 hover:text-rose-800 rounded-lg hover:bg-rose-50 cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </div>

                      {isOpen && (
                        <p className="mt-2 text-xs text-slate-600 leading-relaxed pl-1 pt-1 border-t border-slate-50">
                          {faq.a}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Contact Card */}
      <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-md">
            <Mail className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-emerald-950">Need Assistance from Small Moves?</h3>
            <p className="text-xs text-emerald-800 mt-0.5">
              Contact our Principal Emergency Fund team directly at <strong className="font-bold">pef@smallmoves.org</strong>
            </p>
          </div>
        </div>

        <div className="text-right text-xs text-emerald-900 font-semibold flex items-center gap-1.5 shrink-0">
          <Clock className="w-4 h-4 text-emerald-700" />
          <span>Standard Response Time: 48 Business Hours</span>
        </div>
      </div>
    </div>
  );
};
