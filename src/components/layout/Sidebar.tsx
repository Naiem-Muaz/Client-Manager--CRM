import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  ShieldAlert,
  FileSignature,
  CheckSquare,
  Settings,
  ChevronLeft,
  ChevronRight,
  Briefcase,
  FileText,
  Clock,
  Bell,
  History,
  FileBarChart,
  CloudUpload,
  Building2,
  Inbox as InboxIcon,
  FileCheck,
  Zap,
  ExternalLink,
  LogOut,
  User as UserIcon,
  UserPlus
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface SidebarProps {
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
}

const roleLabel = (r?: string) => (r ? r.replace(/[_-]/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) : 'Signed in');

export function Sidebar({ collapsed, setCollapsed }: SidebarProps) {
  const { user, logout } = useAuth();
  const navItems = [
    { icon: LayoutDashboard, label: 'Dashboard', to: '/' },
    { icon: Clock, label: 'My Time', to: '/my-time' },
    { icon: ShieldAlert, label: 'Compliance', to: '/compliance' },
    { icon: Zap, label: 'MTD', to: '/mtd' },
    { icon: Users, label: 'Clients', to: '/clients' },
    // Accountant/staff feature — the backend role-gates it; hide from client-portal users.
    ...(user?.role !== 'client' ? [
      { icon: UserPlus, label: 'Signups', to: '/signups' },
      { icon: InboxIcon, label: 'Inbox', to: '/inbox' },
      { icon: FileCheck, label: 'Requests', to: '/requests' },
      { icon: FileSignature, label: 'Proposals', to: '/proposals' },
      { icon: Building2, label: 'Incorporations', to: '/incorporations' },
    ] : []),
    { icon: FileText, label: 'Documents', to: '/documents' },
    { icon: CheckSquare, label: 'Tasks', to: '/work' },
    { icon: Clock, label: 'Deadlines', to: '/deadlines' },
    { icon: Bell, label: 'Reminders', to: '/reminders' },
    { icon: CloudUpload, label: 'Submissions', to: '/submissions' },
    { icon: FileBarChart, label: 'Reports', to: '/reports' },
  ];

  const bottomItems = [
     { icon: Settings, label: 'Settings', to: '/setup' },
  ];

  return (
    <aside
      className={`bg-white text-slate-600 flex flex-col h-screen fixed left-0 top-0 border-r border-slate-200 shadow-sm z-50 transition-all duration-300 ${
        collapsed ? 'w-20' : 'w-sidebar'
      }`}
    >
      {/* Logo Area */}
      <div className="h-16 flex items-center px-5 bg-white relative border-b border-slate-200">
        <div className="flex items-center gap-3 overflow-hidden">
          {/* NextGen brand mark (self-contained green tile — sits on the white sidebar) */}
          <img src="/nextgen-icon.svg" alt="NextGen" width={32} height={32}
            className="w-8 h-8 rounded shadow-sm flex-shrink-0" />
          {/* Wordmark: brand dark-green on white. */}
          <span style={{ color: '#12352A' }} className={`font-bold text-lg tracking-wide whitespace-nowrap overflow-hidden transition-all duration-300 ${collapsed ? 'w-0 opacity-0' : 'w-auto opacity-100'}`}>
            NextGen
          </span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-6 px-3 space-y-1 overflow-y-auto scrollbar-hide">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex items-center px-3 py-2.5 rounded-lg transition-all duration-200 group relative mb-1 ${
                isActive
                  ? 'bg-emerald-50 text-emerald-700 font-medium'
                  : 'hover:bg-slate-100 hover:text-slate-900 text-slate-600'
              } ${collapsed ? 'justify-center' : ''}`
            }
          >
            {({ isActive }) => (
              <>
                 {/* Left Accent Bar for Active State */}
                 {isActive && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-brand-accent rounded-r-md"></div>
                 )}

                <item.icon
                  size={20}
                  className={`transition-colors flex-shrink-0 ${
                    isActive ? 'text-emerald-600' : 'text-slate-500 group-hover:text-slate-900'
                  }`}
                />
                <span className={`whitespace-nowrap overflow-hidden text-sm transition-all duration-300 ${collapsed ? 'w-0 opacity-0' : 'w-auto opacity-100 ml-3'}`}>
                  {item.label}
                </span>
                
                {/* Tooltip for collapsed state */}
                {collapsed && (
                  <div className="absolute left-full ml-3 px-2 py-1 bg-slate-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 shadow-xl border border-slate-700">
                    {item.label}
                  </div>
                )}
              </>
            )}
          </NavLink>
        ))}
        
        {/* Divider */}
        <div className="my-4 border-t border-slate-200 mx-2"></div>

        {/* Bottom Items (Settings) */}
        {bottomItems.map((item) => (
             <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex items-center px-3 py-2.5 rounded-lg transition-all duration-200 group relative mb-1 ${
                isActive
                  ? 'bg-emerald-50 text-emerald-700 font-medium'
                  : 'hover:bg-slate-100 hover:text-slate-900 text-slate-600'
              } ${collapsed ? 'justify-center' : ''}`
            }
          >
             {({ isActive }) => (
              <>
                {isActive && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-brand-accent rounded-r-md"></div>
                 )}
                <item.icon
                  size={20}
                  className={`transition-colors flex-shrink-0 ${
                    isActive ? 'text-emerald-600' : 'text-slate-500 group-hover:text-slate-900'
                  }`}
                />
                <span className={`whitespace-nowrap overflow-hidden text-sm transition-all duration-300 ${collapsed ? 'w-0 opacity-0' : 'w-auto opacity-100 ml-3'}`}>
                  {item.label}
                </span>
                {collapsed && (
                  <div className="absolute left-full ml-3 px-2 py-1 bg-slate-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 shadow-xl border border-slate-700">
                    {item.label}
                  </div>
                )}
              </>
             )}
          </NavLink>
        ))}

        {/* Cross-product link → MTD Workspace (shared auth, same tab) */}
        <a
          href="https://app.taxxdigital.co.uk"
          className={`flex items-center px-3 py-2.5 rounded-lg transition-all duration-200 group relative mb-1 hover:bg-slate-100 hover:text-slate-900 text-slate-600 ${collapsed ? 'justify-center' : ''}`}
        >
          <ExternalLink size={20} className="transition-colors flex-shrink-0 text-slate-500 group-hover:text-slate-900" />
          <span className={`whitespace-nowrap overflow-hidden text-sm transition-all duration-300 ${collapsed ? 'w-0 opacity-0' : 'w-auto opacity-100 ml-3'}`}>
            MTD Workspace →
          </span>
          {collapsed && (
            <div className="absolute left-full ml-3 px-2 py-1 bg-slate-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 shadow-xl border border-slate-700">
              MTD Workspace →
            </div>
          )}
        </a>

      </nav>

      {/* Signed-in user + sign out + collapse */}
      <div className="p-3 border-t border-slate-200 bg-white space-y-1">
        {!collapsed && (
          <div className="flex items-center gap-2.5 px-2 py-2">
            <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 flex-shrink-0"><UserIcon size={16} /></div>
            <div className="min-w-0">
              <div className="text-sm text-slate-900 font-medium truncate">{user?.name || user?.email || roleLabel(user?.role)}</div>
              {(user?.name || user?.email) && <div className="text-[11px] text-slate-500">{roleLabel(user?.role)}</div>}
            </div>
          </div>
        )}
        <button
          onClick={logout}
          title="Sign out"
          className={`w-full flex items-center ${collapsed ? 'justify-center' : 'gap-2'} p-2 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors`}
        >
          <LogOut size={16} />{!collapsed && <span className="text-sm font-medium">Sign out</span>}
        </button>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="w-full flex items-center justify-center p-2 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-slate-900 transition-colors"
        >
          {collapsed ? <ChevronRight size={16} /> : <div className="flex items-center gap-2"><ChevronLeft size={16} /> <span className="text-xs font-medium uppercase tracking-wider">Collapse</span></div>}
        </button>
      </div>
    </aside>
  );
}
