import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { UserCheck, LogOut, ShieldAlert, Building2 } from 'lucide-react';

export const ImpersonationBanner: React.FC = () => {
  const { isImpersonating, userProfile, realAdminProfile, exitImpersonation } = useAuth();

  if (!isImpersonating || !userProfile) {
    return null;
  }

  const roleTitle =
    userProfile.role === 'principal'
      ? 'School Principal'
      : userProfile.role === 'additional_contact'
      ? 'Authorized Contact'
      : userProfile.role;

  return (
    <div className="fixed bottom-4 inset-x-4 max-w-3xl mx-auto z-50 animate-in slide-in-from-bottom-4 duration-200">
      <div className="bg-amber-950/95 backdrop-blur-md text-amber-50 border border-amber-500/60 shadow-2xl rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center gap-3">
          <div className="p-2 bg-amber-500/20 border border-amber-500/40 rounded-xl text-amber-400 shrink-0 mt-0.5 sm:mt-0">
            <ShieldAlert className="w-5 h-5 animate-pulse" />
          </div>

          <div className="space-y-0.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-black uppercase tracking-wider text-amber-300 bg-amber-900/80 px-2 py-0.5 rounded-md border border-amber-600/50">
                Impersonation Active
              </span>
              <span className="text-xs font-bold text-white flex items-center gap-1">
                <UserCheck className="w-3.5 h-3.5 text-amber-400" />
                {userProfile.displayName || userProfile.email}
              </span>
            </div>

            <p className="text-[11px] text-amber-200/90 leading-tight">
              Viewing portal as <strong>{roleTitle}</strong>
            </p>

            {realAdminProfile && (
              <p className="text-[10px] text-amber-300/70 font-mono">
                Admin Session: {realAdminProfile.displayName || realAdminProfile.email}
              </p>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={exitImpersonation}
          className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold rounded-xl text-xs shadow-md shadow-amber-500/20 transition-all cursor-pointer flex items-center justify-center gap-2 shrink-0 hover:scale-105 active:scale-95"
        >
          <LogOut className="w-4 h-4" />
          <span>Exit Impersonation</span>
        </button>
      </div>
    </div>
  );
};
