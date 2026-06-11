import React, { useState, useMemo } from 'react';
import { ClientPageActions } from '../components/clients/ClientPageActions';
import { ClientFilters, ClientFilterState, DEFAULT_CLIENT_FILTERS } from '../components/clients/ClientFilters';
import { ClientTable } from '../components/clients/ClientTable';

import { useClients } from '../hooks/useClients';

function riskBand(score: number): 'low' | 'medium' | 'high' {
    if (score > 80) return 'high';
    if (score > 50) return 'medium';
    return 'low';
}

export function ClientListPage() {
    const { clients: rawData, isError: error, isLoading } = useClients();
    const [filters, setFilters] = useState<ClientFilterState>(DEFAULT_CLIENT_FILTERS);

    // The API might return { data: [...] } or just [...]
    const clients = Array.isArray(rawData) ? rawData : (rawData as any)?.data || [];

    const filteredClients = useMemo(() => {
        const term = filters.search.trim().toLowerCase();
        return clients.filter((c: any) => {
            if (term && !(c.legalName || '').toLowerCase().includes(term)) return false;
            if (filters.entityType !== 'all' && c.entityType !== filters.entityType) return false;
            if (filters.risk !== 'all' && riskBand(c.riskScore ?? 0) !== filters.risk) return false;
            return true;
        });
    }, [clients, filters]);

    return (
        <div className="space-y-6">
            {/* Header Row 1: Title & New Client */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Clients</h1>
                    <p className="text-slate-500 mt-1">Manage your client base, assigned staff, and risk levels.</p>
                </div>
                <ClientPageActions />
            </div>

            {/* Header Row 2: Search, Filters */}
            <ClientFilters value={filters} onChange={setFilters} />

            {/* Content */}
            {error ? (
                 <div className="p-8 bg-red-50 text-red-700 rounded-lg border border-red-200">
                    Failed to load clients. Is the Brain backend running on port 4000?
                 </div>
            ) : isLoading ? (
                <div className="space-y-4">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="h-24 bg-slate-100 rounded-xl animate-pulse" />
                    ))}
                </div>
            ) : filteredClients.length === 0 && clients.length > 0 ? (
                <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
                    <h3 className="text-lg font-medium text-slate-900">No clients match your filters</h3>
                    <p className="text-slate-500 mt-1 mb-4">Try adjusting or clearing the filters above.</p>
                    <button
                        onClick={() => setFilters(DEFAULT_CLIENT_FILTERS)}
                        className="inline-block px-4 py-2 bg-slate-800 text-white text-sm font-medium rounded-lg hover:bg-slate-700 transition-colors"
                    >
                        Clear filters
                    </button>
                </div>
            ) : (
                <ClientTable clients={filteredClients} />
            )}
        </div>
    );
}
