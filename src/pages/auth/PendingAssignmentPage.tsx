import React from 'react';
import { Navigate } from 'react-router-dom';
import { ShieldAlert, RefreshCw, LogOut, Mail, Building2, Clock, CheckCircle2 } from 'lucide-react';
import { useAuth, isSystemAdminEmail } from '../../context/AuthContext';
import { auth } from '../../lib/firebase';

export const PendingAssignmentPage: React.FC = () => {
  const { userProfile, signOut, loading } = useAuth();

  if (userProfile?.role === 'admin' || isSystemAdminEmail(userProfile?.email)) {
    return <Navigate to="/admin" replace />;
  }

  const handleRefresh = async () => {
    try {
      if (auth.currentUser) {
        await auth.currentUser.getIdToken(true);
      }
    } catch (e) {
      console.warn('Refreshing token:', e);
    }
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-[#F3F6FA] flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl p-8 max-w-lg w-full shadow-xl border border-slate-200 space-y-6 text-xs animate-fade-in">
        {/* Top Header */}
        <div className="text-center space-y-3">
          <div className="w-14 h-14 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center mx-auto border border-amber-200">
            <Clock className="w-7 h-7" />
          </div>
          <div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 text-amber-800 rounded-full font-bold text-[11px] border border-amber-200 mb-2">
              <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />
              Account Pending School Association
            </span>
            <h1 className="text-2xl font-bold text-[#0F172A] tracking-tight" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
              Welcome to Small Moves PEF Portal
            </h1>
            <p className="text-slate-500 text-xs mt-1">
              Logged in as <strong className="text-slate-800 font-semibold">{userProfile?.email}</strong>
            </p>
          </div>
        </div>

        {/* Informational Message */}
        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3 text-slate-700 leading-relaxed">
          <div className="flex items-start gap-2.5">
            <Building2 className="w-5 h-5 text-slate-400 shrink-0 mt-0.5" />
            <div>
              <h3 className="font-bold text-slate-900 text-xs">No Partner School Currently Assigned</h3>
              <p className="text-[11px] text-slate-600 mt-0.5">
                To protect partner school budgets and beneficiary privacy, access to emergency funding and request submission is restricted to verified school leadership and invited authorized staff.
              </p>
            </div>
          </div>

          <div className="border-t border-slate-200 pt-3 space-y-2">
            <h4 className="font-bold text-xs text-slate-900">What happens next?</h4>
            <ul className="space-y-2 text-[11px] text-slate-600">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#0089B3] shrink-0 mt-0.5" />
                <span>A Small Moves Administrator will review your account registration and associate your profile with your designated school.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#0089B3] shrink-0 mt-0.5" />
                <span>If you received an invitation email from your school principal, please ensure you signed in with the exact email address invited.</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-2.5 pt-2">
          <button
            onClick={handleRefresh}
            disabled={loading}
            className="w-full py-3 bg-[#0089B3] hover:bg-[#007399] text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md shadow-[#0089B3]/20"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Check Status / Refresh Profile
          </button>

          <a
            href="mailto:support@smallmoves.org?subject=PEF Portal School Assignment Request"
            className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <Mail className="w-4 h-4 text-slate-500" />
            Contact Support (support@smallmoves.org)
          </a>

          <button
            onClick={() => signOut()}
            className="w-full py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-500 hover:text-slate-800 font-semibold rounded-xl text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
};
