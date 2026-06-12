import React from 'react';
import { Filter, Search, X } from 'lucide-react';

export interface ClientFilterState {
    search: string;
    entityType: 'all' | 'limited_company' | 'individual' | 'sole_trader' | 'partnership';
    risk: 'all' | 'low' | 'medium' | 'high';
}

export const DEFAULT_CLIENT_FILTERS: ClientFilterState = {
    search: '',
    entityType: 'all',
    risk: 'all',
};

interface Props {
    value: ClientFilterState;
    onChange: (next: ClientFilterState) => void;
}

export function ClientFilters({ value, onChange }: Props) {
    const update = (patch: Partial<ClientFilterState>) => onChange({ ...value, ...patch });
    const isDirty = value.search !== '' || value.entityType !== 'all' || value.risk !== 'all';

    return (
        <div className="flex flex-wrap items-center gap-3 mb-6 p-2 bg-white rounded-xl border border-slate-200 shadow-sm">

            {/* Search Input */}
            <div className="relative flex-1 min-w-[200px] max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input
                    type="text"
                    value={value.search}
                    onChange={(e) => update({ search: e.target.value })}
                    placeholder="Search clients..."
                    className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                />
            </div>

            <div className="h-6 w-px bg-slate-200 mx-1"></div>

            {/* Filters */}
            <div className="flex items-center gap-2 overflow-x-auto">
                <div className="flex items-center gap-2 text-slate-500 mr-1">
                    <Filter size={16} />
                </div>

                {/* Entity Type Filter */}
                <select
                    value={value.entityType}
                    onChange={(e) => update({ entityType: e.target.value as ClientFilterState['entityType'] })}
                    className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 hover:bg-slate-50 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                >
                    <option value="all">All entity types</option>
                    <option value="limited_company">Limited Company</option>
                    <option value="individual">Individual</option>
                    <option value="sole_trader">Sole Trader</option>
                    <option value="partnership">Partnership</option>
                </select>

                {/* Risk Filter */}
                <select
                    value={value.risk}
                    onChange={(e) => update({ risk: e.target.value as ClientFilterState['risk'] })}
                    className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 hover:bg-slate-50 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                >
                    <option value="all">All risk levels</option>
                    <option value="low">Low risk</option>
                    <option value="medium">Medium risk</option>
                    <option value="high">High risk</option>
                </select>

                {isDirty && (
                    <button
                        onClick={() => onChange(DEFAULT_CLIENT_FILTERS)}
                        className="flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-800 ml-1 whitespace-nowrap"
                    >
                        <X size={14} /> Clear
                    </button>
                )}
            </div>
        </div>
    );
}
