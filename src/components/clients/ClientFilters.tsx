import React from 'react';
import { Filter, ChevronDown } from 'lucide-react';

export function ClientFilters() {
    return (
        <div className="flex flex-wrap items-center gap-3 mb-6 p-2 bg-white rounded-xl border border-slate-200 shadow-sm">
            
            {/* Search Input */}
            <div className="relative flex-1 min-w-[200px] max-w-sm">
                 {/* Re-using Search icon from lucide-react if needed, or simple input */}
                 <input 
                    type="text" 
                    placeholder="Search clients..." 
                    className="w-full pl-3 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                 />
            </div>

            <div className="h-6 w-px bg-slate-200 mx-1"></div>

            {/* Filters */}
            <div className="flex items-center gap-2 overflow-x-auto">
                <div className="flex items-center gap-2 text-slate-500 mr-2">
                    <Filter size={16} />
                </div>

                {/* Entity Type Filter */}
                <div className="relative group">
                    <button className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 hover:bg-slate-50 transition-colors">
                        Entity Type
                        <ChevronDown size={14} className="text-slate-400" />
                    </button>
                    {/* Dropdown would go here */}
                </div>

                {/* Deadline Filter */}
                 <div className="relative group">
                    <button className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 hover:bg-slate-50 transition-colors">
                        Next 30 Days
                        <ChevronDown size={14} className="text-slate-400" />
                    </button>
                </div>

                {/* Risk Filter */}
                 <div className="relative group">
                    <button className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 hover:bg-slate-50 transition-colors">
                        Risk Level
                        <ChevronDown size={14} className="text-slate-400" />
                    </button>
                </div>

                {/* Staff Filter */}
                 <div className="relative group">
                    <button className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 hover:bg-slate-50 transition-colors">
                        My Clients
                        <ChevronDown size={14} className="text-slate-400" />
                    </button>
                </div>
                
                 <button className="text-xs font-medium text-blue-600 hover:text-blue-800 ml-2 whitespace-nowrap">
                    Clear
                </button>
            </div>
            
            <div className="flex-1"></div>
            
             <div className="h-6 w-px bg-slate-200 mx-1"></div>

            {/* Bulk Actions */}
             <button className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-700 hover:bg-slate-50 transition-colors font-medium text-sm">
                Bulk Actions
            </button>
        </div>
    );
}
