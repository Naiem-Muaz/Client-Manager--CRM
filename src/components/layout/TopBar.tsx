import React from 'react';
import { Search, Bell, AlertTriangle, Sparkles, AlertCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { roleLabel, initials } from '../../lib/userDisplay';

export function TopBar() {
  const { user } = useAuth();
  return (
    <div className="h-16 bg-bg-surface border-b border-divider flex items-center justify-between px-6 sticky top-0 z-40 shadow-sm">
        {/* Left: Breadcrumbs */}
        <div className="flex items-center gap-2 text-sm text-slate-500">
            <span className="hover:text-slate-800 cursor-pointer transition-colors">Clients</span>
            <span className="text-slate-300">/</span>
            <span className="hover:text-slate-800 cursor-pointer transition-colors font-medium text-slate-900">Client Dashboard</span>
            <span className="text-slate-300">/</span>
            <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 text-xs font-medium border border-blue-100">MTD ITSA</span>
        </div>

        {/* Right: Actions & User */}
        <div className="flex items-center gap-4">
            
            {/* Global Search */}
            <div className="relative w-72">
                 <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input 
                    type="text" 
                    placeholder="Search Client, UTR, CRN..." 
                    className="w-full pl-9 pr-4 py-1.5 bg-bg-main border border-divider rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-secondary/20 focus:border-brand-secondary transition-all text-sm text-slate-700"
                />
            </div>

            <div className="h-6 w-px bg-divider mx-1"></div>

             {/* AI Insight Badge */}
             <div className="flex items-center gap-2 px-3 py-1.5 bg-purple-50 text-purple-700 rounded-full border border-purple-100 text-xs font-semibold cursor-pointer hover:bg-purple-100 transition-colors shadow-sm">
                <Sparkles size={14} className="text-purple-600" />
                <span>AI Insights</span>
                <span className="flex items-center justify-center bg-purple-600 text-white text-[10px] w-5 h-5 rounded-full ml-1">3</span>
             </div>

             {/* Alerts */}
             <button className="relative p-2 text-slate-500 hover:text-brand-primary hover:bg-bg-main rounded-lg transition-colors">
                <Bell size={20} />
                <span className="absolute top-2 right-2 w-2 h-2 bg-brand-risk rounded-full border border-white"></span>
             </button>

             <div className="h-6 w-px bg-divider mx-1"></div>

             {/* User Menu */}
             <div className="flex items-center gap-3 cursor-pointer hover:bg-slate-50 p-1.5 rounded-lg transition-colors border border-transparent hover:border-slate-200">
                {/* ⚠️ WAS HARDCODED "NG" / "NextGen Admin" / "Platform Admin" —
                    the same three strings for every member of the practice, on
                    every page. "Platform Admin" is not even a role this system
                    has; the eight real ones are in the user_profiles CHECK. */}
                <div className="w-8 h-8 rounded-full bg-brand-secondary flex items-center justify-center text-xs font-bold text-white shadow-sm ring-2 ring-white">
                    {initials(user?.name, user?.email)}
                </div>
                <div className="hidden md:block text-right">
                    <p className="text-xs font-bold text-slate-700 leading-tight">{user?.name || user?.email || 'Signed in'}</p>
                    <p className="text-[10px] text-slate-500 font-medium">{roleLabel(user?.role)}</p>
                </div>
             </div>
        </div>
    </div>
  );
}

function ClockIcon({ className }: { className?: string }) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
    )
}
