import React from 'react';
import useSWR from 'swr';
import { ClientPageActions } from '../components/clients/ClientPageActions';
import { ClientFilters } from '../components/clients/ClientFilters';
import { ClientTable } from '../components/clients/ClientTable';

import { useClients } from '../hooks/useClients';

export function ClientListPage() {
    const { clients: rawData, isError: error, isLoading } = useClients();

    // The API might return { data: [...] } or just [...]
    const clients = Array.isArray(rawData) ? rawData : (rawData as any)?.data || [];

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

            {/* Header Row 2: Search, Filters, Bulk Actions */}
            <ClientFilters />

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
            ) : (
                <ClientTable clients={clients} />
            )}
        </div>
    );
}
