import React, { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { RightPanel } from './RightPanel';
import { ErrorBoundary } from '../ErrorBoundary';
import { PanelRightClose, PanelRightOpen } from 'lucide-react';

export function AppLayout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [rightPanelOpen, setRightPanelOpen] = useState(false);
  const location = useLocation();

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Left Sidebar */}
      <Sidebar collapsed={sidebarCollapsed} setCollapsed={setSidebarCollapsed} />

      {/* Main Content Wrapper */}
      <div 
        className={`flex-1 flex flex-col min-h-screen transition-all duration-300 ease-in-out ${
            sidebarCollapsed ? 'ml-20' : 'ml-sidebar'
        }`}
      >
        <TopBar />
        
        <main className="flex-1 p-8 overflow-x-hidden relative">
            <div className="max-w-[1600px] mx-auto">
                {/* Per-route boundary, keyed by path so it resets on navigation:
                    a render error in one page shows a contained fallback while the
                    sidebar/topbar stay intact — no whole-app white-screen. */}
                <ErrorBoundary key={location.pathname} label="this page">
                    <Outlet />
                </ErrorBoundary>
            </div>

             {/* Right Panel Toggle (Floating) */}
             <button
                onClick={() => setRightPanelOpen(true)}
                className={`fixed right-0 top-1/2 transform -translate-y-1/2 bg-white border border-slate-200 border-r-0 shadow-lg p-2 rounded-l-lg text-slate-500 hover:text-blue-600 transition-transform duration-300 z-30 ${rightPanelOpen ? 'translate-x-full' : 'translate-x-0'}`}
                title="Toggle Utility Panel"
            >
                <PanelRightOpen size={20} />
            </button>
        </main>
      </div>

      {/* Right Utility Panel */}
      <RightPanel isOpen={rightPanelOpen} onClose={() => setRightPanelOpen(false)} />
      
      {/* Overlay for small screens when RightPanel is open */}
      {rightPanelOpen && (
        <div 
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 lg:hidden"
            onClick={() => setRightPanelOpen(false)}
        />
      )}
    </div>
  );
}
