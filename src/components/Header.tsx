import React from 'react';
import { Flame, CheckCircle2, Target, Calendar, Users, LogIn, LogOut, Plus, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface HeaderProps {
  activeTab: 'moves' | 'goals' | 'log' | 'community';
  setActiveTab: (tab: 'moves' | 'goals' | 'log' | 'community') => void;
  onOpenAddMove: () => void;
  totalStreak: number;
  todayCompletionsCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  onOpenAddMove,
  totalStreak,
  todayCompletionsCount,
}) => {
  const { user, userProfile, signInWithGoogle, signOut } = useAuth();

  return (
    <header className="sticky top-0 z-30 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 text-slate-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Tagline */}
          <div className="flex items-center space-x-3">
            <div className="h-10 w-10 rounded-xl bg-[#0089B3]/20 border border-[#0089B3]/40 flex items-center justify-center text-[#0089B3] shadow-xs">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <span className="font-bold text-lg tracking-tight text-white flex items-center gap-1.5">
                Small Moves
                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-[#0089B3]/20 text-[#A5E3F6] border border-[#0089B3]/40">
                  Micro-Habits
                </span>
              </span>
              <p className="text-xs text-slate-400 font-normal hidden sm:block">Building momentum through small actions</p>
            </div>
          </div>

          {/* Nav Tabs */}
          <nav className="hidden md:flex items-center space-x-1 bg-slate-950/60 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setActiveTab('moves')}
              className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeTab === 'moves'
                  ? 'bg-[#0089B3] text-white font-semibold shadow-xs'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <CheckCircle2 className="h-4 w-4" />
              <span>My Moves</span>
            </button>

            <button
              onClick={() => setActiveTab('goals')}
              className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeTab === 'goals'
                  ? 'bg-[#0089B3] text-white font-semibold shadow-xs'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <Target className="h-4 w-4" />
              <span>Focus Goals</span>
            </button>

            <button
              onClick={() => setActiveTab('log')}
              className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeTab === 'log'
                  ? 'bg-[#0089B3] text-white font-semibold shadow-xs'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <Calendar className="h-4 w-4" />
              <span>Progress &amp; Log</span>
            </button>

            <button
              onClick={() => setActiveTab('community')}
              className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeTab === 'community'
                  ? 'bg-[#0089B3] text-white font-semibold shadow-xs'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <Users className="h-4 w-4" />
              <span>Community</span>
            </button>
          </nav>

          {/* Actions & User Profile */}
          <div className="flex items-center space-x-3">
            {/* Today Streak pill */}
            <div className="hidden lg:flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-medium">
              <Flame className="h-4 w-4 text-amber-500 fill-amber-500/30" />
              <span>{totalStreak} Day Streak</span>
            </div>

            {/* Quick Add Move */}
            <button
              onClick={onOpenAddMove}
              className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg bg-[#0089B3] hover:bg-[#006E8F] text-white text-xs font-medium transition-all shadow-xs active:scale-95 cursor-pointer"
            >
              <Plus className="h-4 w-4 stroke-[2.5]" />
              <span className="hidden sm:inline">New Move</span>
            </button>

            {/* Auth / Profile */}
            {user ? (
              <div className="flex items-center space-x-2 pl-2 border-l border-slate-800">
                {user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt={user.displayName || 'User'}
                    className="h-8 w-8 rounded-full border border-[#0089B3]/50 object-cover"
                  />
                ) : (
                  <div className="h-8 w-8 rounded-full bg-[#0089B3]/20 border border-[#0089B3]/40 text-[#0089B3] font-semibold text-xs flex items-center justify-center">
                    {userProfile?.displayName?.[0]?.toUpperCase() || 'U'}
                  </div>
                )}
                <button
                  onClick={signOut}
                  title="Sign Out"
                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <button
                  onClick={signInWithGoogle}
                  className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition-colors"
                >
                  <LogIn className="h-3.5 w-3.5 text-[#0089B3]" />
                  <span>Google Sign-In</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Mobile Nav Tabs */}
        <div className="flex md:hidden overflow-x-auto py-2 space-x-2 border-t border-slate-800/80 scrollbar-none">
          <button
            onClick={() => setActiveTab('moves')}
            className={`flex items-center space-x-1.5 px-3 py-1 rounded-lg text-xs font-medium whitespace-nowrap ${
              activeTab === 'moves' ? 'bg-[#0089B3] text-white font-semibold' : 'text-slate-400 bg-slate-800/40'
            }`}
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span>My Moves</span>
          </button>
          <button
            onClick={() => setActiveTab('goals')}
            className={`flex items-center space-x-1.5 px-3 py-1 rounded-lg text-xs font-medium whitespace-nowrap ${
              activeTab === 'goals' ? 'bg-[#0089B3] text-white font-semibold' : 'text-slate-400 bg-slate-800/40'
            }`}
          >
            <Target className="h-3.5 w-3.5" />
            <span>Focus Goals</span>
          </button>
          <button
            onClick={() => setActiveTab('log')}
            className={`flex items-center space-x-1.5 px-3 py-1 rounded-lg text-xs font-medium whitespace-nowrap ${
              activeTab === 'log' ? 'bg-[#0089B3] text-white font-semibold' : 'text-slate-400 bg-slate-800/40'
            }`}
          >
            <Calendar className="h-3.5 w-3.5" />
            <span>Log</span>
          </button>
          <button
            onClick={() => setActiveTab('community')}
            className={`flex items-center space-x-1.5 px-3 py-1 rounded-lg text-xs font-medium whitespace-nowrap ${
              activeTab === 'community' ? 'bg-[#0089B3] text-white font-semibold' : 'text-slate-400 bg-slate-800/40'
            }`}
          >
            <Users className="h-3.5 w-3.5" />
            <span>Community</span>
          </button>
        </div>
      </div>
    </header>
  );
};
