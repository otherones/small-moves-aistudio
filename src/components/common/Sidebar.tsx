import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Building2,
  FileText,
  HelpCircle,
  Settings,
  Users,
  Briefcase,
  UserCheck,
  ChevronDown,
  LogOut,
  User,
  LayoutDashboard,
  BarChart3,
  Menu,
  X,
  ChevronRight,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { School, PortalSettings } from '../../types';
import { SmallMovesLogo } from './SmallMovesLogo';

interface SidebarProps {
  schools?: School[];
  settings?: PortalSettings;
}

export const Sidebar: React.FC<SidebarProps> = ({ schools = [], settings }) => {
  const { userProfile, activeRole, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const isAdminMode = userProfile?.role === 'admin' || activeRole === 'admin';

  // Close mobile drawer on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  const schoolNavItems = [
    { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { label: 'Requests', path: '/requests', icon: FileText },
    { label: 'Help Center', path: '/help', icon: HelpCircle },
  ];

  const adminNavItems = [
    { label: 'Dashboard', path: '/admin', icon: LayoutDashboard },
    { label: 'Schools', path: '/admin/schools', icon: Building2 },
    { label: 'Requests', path: '/admin/requests', icon: FileText },
    { label: 'Funders', path: '/admin/funders', icon: Briefcase },
    { label: 'User Management', path: '/admin/users', icon: Users },
    { label: 'Reports', path: '/admin/reports', icon: BarChart3 },
    { label: 'System Settings', path: '/admin/settings', icon: Settings },
    { label: 'Help Center', path: '/help', icon: HelpCircle },
  ];

  const navItems = isAdminMode ? adminNavItems : schoolNavItems;

  const logoStyle = settings?.logoStyle;
  const alignment = logoStyle?.alignment ?? 'left';
  const paddingY = logoStyle?.paddingY ?? 16;
  const paddingX = logoStyle?.paddingX ?? 16;
  const bgStyle = logoStyle?.bgStyle ?? 'transparent';
  const borderRadius = logoStyle?.borderRadius ?? 'medium';

  const getBgStyleClasses = () => {
    switch (bgStyle) {
      case 'dark_badge':
        return 'bg-slate-900 text-white border border-slate-800 shadow-xs';
      case 'light_badge':
        return 'bg-white text-slate-900 border border-[#C7DCF0]/80 shadow-xs';
      case 'glass':
        return 'bg-white/80 backdrop-blur-xs border border-[#C7DCF0]/80';
      case 'transparent':
      default:
        return 'bg-white';
    }
  };

  const getRadiusClass = () => {
    if (bgStyle === 'transparent') return 'rounded-2xl';
    switch (borderRadius) {
      case 'none':
        return 'rounded-none';
      case 'small':
        return 'rounded-md';
      case 'large':
        return 'rounded-2xl';
      case 'full':
        return 'rounded-full';
      case 'medium':
      default:
        return 'rounded-xl';
    }
  };

  const justifyClass =
    alignment === 'center'
      ? 'justify-center'
      : alignment === 'right'
      ? 'justify-end'
      : 'justify-start';

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-white text-slate-900 border-r border-[#C7DCF0]">
      {/* Brand Header */}
      <div className="border-b border-[#C7DCF0]/70 p-3">
        <div
          className={`transition-all ${getBgStyleClasses()} ${getRadiusClass()}`}
          style={{
            paddingTop: `${paddingY}px`,
            paddingBottom: `${paddingY}px`,
            paddingLeft: `${paddingX}px`,
            paddingRight: `${paddingX}px`,
          }}
        >
          <Link
            to={isAdminMode ? '/admin' : '/dashboard'}
            className={`flex items-center ${justifyClass} transition-opacity hover:opacity-90`}
          >
            <SmallMovesLogo
              isDarkBackground={false}
              customLogoUrl={settings?.customLogoUrl}
              logoStyle={settings?.logoStyle}
            />
          </Link>
        </div>
      </div>

      {/* Navigation Menu */}
      <div className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <div className="px-3.5 pb-2 text-[11px] font-medium tracking-wider text-slate-500 uppercase">
          {isAdminMode ? 'Admin Operations' : 'Principal Portal'}
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            location.pathname === item.path ||
            (item.path !== '/' &&
              item.path !== '/admin' &&
              location.pathname.startsWith(item.path + '/'));
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center justify-between transition-colors ${
                isActive
                  ? 'bg-[#EDF5FB] rounded-xl px-3.5 py-2.5 text-slate-900 font-semibold'
                  : 'rounded-xl px-3.5 py-2.5 text-slate-600 font-normal hover:bg-[#EDF5FB]/60 hover:text-slate-900'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <Icon
                  className="w-4 h-4 shrink-0 transition-colors"
                  style={{ color: isActive ? '#0089B3' : '#64748B' }}
                />
                <span className="truncate text-xs">{item.label}</span>
              </div>
              {isActive && (
                <ChevronRight className="w-3.5 h-3.5 text-[#0089B3] shrink-0" />
              )}
            </Link>
          );
        })}
      </div>

      {/* User Footer Account Controls */}
      <div className="p-3 border-t border-[#C7DCF0]/70 bg-white relative">
        <div className="relative">
          <button
            type="button"
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            className="w-full flex items-center gap-3 p-2 rounded-xl hover:bg-[#EDF5FB]/60 transition-colors border border-transparent hover:border-[#C7DCF0]/50 text-left cursor-pointer"
          >
            {userProfile?.photoURL ? (
              <img
                src={userProfile.photoURL}
                alt={userProfile.displayName}
                referrerPolicy="no-referrer"
                className="w-9 h-9 rounded-lg object-cover border border-[#C7DCF0] shadow-2xs shrink-0"
              />
            ) : (
              <div className="w-9 h-9 rounded-lg bg-[#EDF7FC] border border-[#C7DCF0] text-[#006E8F] flex items-center justify-center font-bold text-xs shadow-2xs shrink-0">
                {userProfile?.firstName?.[0] || userProfile?.displayName?.[0] || 'U'}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <div className="text-xs font-semibold text-slate-800 truncate">
                {userProfile?.displayName || 'User'}
              </div>
              <div className="text-[11px] text-slate-500 truncate">
                {isAdminMode ? 'Admin · Operations' : userProfile?.role === 'principal' ? 'Principal' : userProfile?.email || ''}
              </div>
            </div>
            <ChevronDown
              className={`w-4 h-4 text-slate-500 shrink-0 transition-transform ${
                userMenuOpen ? 'rotate-180' : ''
              }`}
            />
          </button>

          {/* User Popover Menu */}
          {userMenuOpen && (
            <div className="absolute bottom-full left-0 right-0 mb-2 bg-white border border-[#C7DCF0] rounded-2xl shadow-xl py-2 z-50 divide-y divide-slate-100">
              <div className="px-3.5 py-2 text-[11px] text-slate-500">
                Signed in as <strong className="text-slate-800 font-semibold">{userProfile?.displayName}</strong>
              </div>

              <div className="py-1">
                <Link
                  to={isAdminMode ? '/admin/profile' : '/profile'}
                  onClick={() => setUserMenuOpen(false)}
                  className="flex items-center gap-2.5 px-3.5 py-2 text-xs text-slate-700 hover:text-slate-900 hover:bg-[#EDF5FB] transition-colors"
                >
                  <User className="w-4 h-4 text-[#64748B]" />
                  <span>My Profile &amp; Security</span>
                </Link>
              </div>

              <div className="py-1">
                <button
                  type="button"
                  onClick={() => {
                    setUserMenuOpen(false);
                    signOut();
                    navigate('/login');
                  }}
                  className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs text-red-700 hover:bg-red-50 transition-colors cursor-pointer font-medium"
                >
                  <LogOut className="w-4 h-4 text-red-600" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile Sticky Top Navigation Header */}
      <div className="md:hidden sticky top-0 z-40 bg-white text-slate-900 border-b border-[#C7DCF0] px-4 h-16 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="p-2 text-slate-600 hover:text-slate-900 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer"
            aria-label="Open Side Panel Menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          <Link to={isAdminMode ? '/admin' : '/dashboard'} className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#C7DCF0] -rotate-6 flex items-center justify-center text-slate-900 font-bold text-xs shadow-2xs">
              SM
            </div>
            <span className="font-bold text-sm text-slate-900" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
              SMALL MOVES
            </span>
          </Link>
        </div>

        {/* User Avatar Mobile */}
        <Link
          to={isAdminMode ? '/admin/profile' : '/profile'}
          className="flex items-center gap-2"
        >
          {userProfile?.photoURL ? (
            <img
              src={userProfile.photoURL}
              alt={userProfile.displayName}
              className="w-8 h-8 rounded-lg object-cover border border-[#C7DCF0]"
            />
          ) : (
            <div className="w-8 h-8 rounded-lg bg-[#EDF7FC] border border-[#C7DCF0] text-[#006E8F] flex items-center justify-center font-bold text-xs">
              {userProfile?.firstName?.[0] || 'U'}
            </div>
          )}
        </Link>
      </div>

      {/* Mobile Slide-Over Drawer Overlay */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs transition-opacity"
            onClick={() => setMobileOpen(false)}
          />
          <div className="relative z-10 w-72 max-w-[80vw] h-full shadow-2xl flex flex-col bg-white">
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              className="absolute top-4 right-4 z-20 p-1.5 text-slate-500 hover:text-slate-900 bg-slate-100 rounded-xl border border-slate-200 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
            <SidebarContent />
          </div>
        </div>
      )}

      {/* Desktop Permanent Side Panel */}
      <aside className="hidden md:flex flex-col w-64 shrink-0 h-screen sticky top-0 z-30 bg-white">
        <SidebarContent />
      </aside>
    </>
  );
};
