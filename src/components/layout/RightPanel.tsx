import React from 'react';
import { CheckSquare, X } from 'lucide-react';

interface RightPanelProps {
    isOpen: boolean;
    onClose: () => void;
}

export function RightPanel({ isOpen, onClose }: RightPanelProps) {
  return (
    <aside 
        className={`fixed right-0 top-0 h-screen bg-white shadow-2xl z-50 w-80 border-l border-slate-200 transform transition-transform duration-300 ease-in-out ${
            isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
    >
        {/* Header */}
        <div className="h-16 flex items-center justify-between px-6 border-b border-slate-200">
            <h2 className="font-semibold text-slate-800 flex items-center gap-2">
                <CheckSquare size={18} className="text-blue-500" />
                Quick Tasks
            </h2>
            <button 
                onClick={onClose}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            >
                <X size={18} />
            </button>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto h-[calc(100vh-64px)] space-y-4">
             <div className="bg-slate-50 rounded-lg p-4 border border-slate-100">
                <p className="text-xs font-medium text-slate-500 uppercase mb-2">Today</p>
                <div className="space-y-3">
                    <div className="flex items-start gap-3">
                        <input type="checkbox" className="mt-1 w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500" />
                        <div>
                             <p className="text-sm font-medium text-slate-700">Review VAT for Smith Ltd</p>
                             <p className="text-xs text-slate-500">Active Task</p>
                        </div>
                    </div>
                     <div className="flex items-start gap-3">
                        <input type="checkbox" className="mt-1 w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500" />
                        <div>
                             <p className="text-sm font-medium text-slate-700">Call John Doe re: SA</p>
                             <p className="text-xs text-slate-500">Overdue</p>
                        </div>
                    </div>
                </div>
             </div>

             <div className="bg-orange-50 rounded-lg p-4 border border-orange-100">
                <p className="text-xs font-medium text-orange-600 uppercase mb-2">Priority Alerts</p>
                 <div className="space-y-3">
                    <div className="text-sm text-orange-800">
                        <p className="font-medium">HMRC Gateway Maintenance</p>
                        <p className="text-xs mt-1 opacity-80">Scheduled for tonight 22:00 - 04:00.</p>
                    </div>
                 </div>
             </div>
        </div>
    </aside>
  );
}
