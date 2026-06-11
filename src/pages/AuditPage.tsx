import React, { useState, useMemo } from 'react';
import { History, Search, Filter, Shield, FileText, Loader2, Check } from 'lucide-react';
import { useAuditLogs } from '../hooks/useAudit';

function toCsv(rows: any[]): string {
    const headers = ['Timestamp', 'User', 'Action', 'Target', 'Evidence'];
    const escape = (v: any) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const lines = rows.map(r => [r.timestamp, r.user, r.action, r.target, r.evidence].map(escape).join(','));
    return [headers.join(','), ...lines].join('\n');
}

export function AuditPage() {
    const [searchTerm, setSearchTerm] = useState('');
    const [actionFilter, setActionFilter] = useState<string>('all');
    const [filterOpen, setFilterOpen] = useState(false);
    const { logs: rawLogs, isLoading } = useAuditLogs();
    const auditLogs = Array.isArray(rawLogs) ? rawLogs : [];

    const actionOptions = useMemo(
        () => Array.from(new Set(auditLogs.map((l: any) => l.action).filter(Boolean))) as string[],
        [auditLogs]
    );

    const filteredLogs = useMemo(() => {
        const term = searchTerm.trim().toLowerCase();
        return auditLogs.filter((log: any) => {
            if (actionFilter !== 'all' && log.action !== actionFilter) return false;
            if (!term) return true;
            return [log.user, log.action, log.target]
                .filter(Boolean)
                .some((f: string) => f.toLowerCase().includes(term));
        });
    }, [auditLogs, searchTerm, actionFilter]);

    const filterActive = actionFilter !== 'all';

    const handleExport = () => {
        const csv = toCsv(filteredLogs);
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `audit-log-${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
                        <History size={28} className="text-slate-400" />
                        Audit Log
                    </h1>
                    <p className="text-slate-500 mt-1">Immutable record of all system activities and data changes.</p>
                </div>
                 <div className="flex items-center gap-3">
                    <div className="relative">
                        <button
                            onClick={() => setFilterOpen(o => !o)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors font-medium text-sm shadow-sm border ${
                                filterActive || filterOpen
                                    ? 'bg-blue-50 border-blue-300 text-blue-700 ring-2 ring-blue-100'
                                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                            }`}
                        >
                            <Filter size={16} /> Filter{filterActive ? ` (1)` : ''}
                        </button>
                        {filterOpen && (
                            <div className="absolute right-0 mt-2 w-56 bg-white border border-slate-200 rounded-lg shadow-lg z-20 py-1 max-h-72 overflow-y-auto">
                                <button
                                    onClick={() => { setActionFilter('all'); setFilterOpen(false); }}
                                    className="w-full flex items-center justify-between px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                                >
                                    All actions {actionFilter === 'all' && <Check size={14} className="text-blue-600" />}
                                </button>
                                {actionOptions.map(opt => (
                                    <button
                                        key={opt}
                                        onClick={() => { setActionFilter(opt); setFilterOpen(false); }}
                                        className="w-full flex items-center justify-between px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                                    >
                                        <span className="truncate">{opt}</span>
                                        {actionFilter === opt && <Check size={14} className="text-blue-600 shrink-0" />}
                                    </button>
                                ))}
                                {actionOptions.length === 0 && (
                                    <div className="px-3 py-2 text-xs text-slate-400">No actions to filter</div>
                                )}
                            </div>
                        )}
                    </div>
                    <button
                        onClick={handleExport}
                        disabled={filteredLogs.length === 0}
                        className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-slate-700 hover:bg-slate-50 transition-colors font-medium text-sm shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <Shield size={16} /> Export Report
                    </button>
                </div>
            </div>

            {/* Search */}
             <div className="relative max-w-lg">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                    type="text"
                    placeholder="Search by user, client, or action..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400"
                />
            </div>

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                            <th className="px-6 py-4">Timestamp</th>
                            <th className="px-6 py-4">User</th>
                            <th className="px-6 py-4">Action</th>
                            <th className="px-6 py-4">Target</th>
                            <th className="px-6 py-4">Evidence</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {isLoading && (
                            <tr>
                                <td colSpan={5} className="py-8 text-center text-slate-400">
                                    <Loader2 className="animate-spin inline mr-2 h-5 w-5" /> Syncing audit ledger...
                                </td>
                            </tr>
                        )}
                        {!isLoading && filteredLogs.length === 0 && (
                            <tr>
                                <td colSpan={5} className="py-12 text-center text-slate-400">
                                    <History size={40} className="mx-auto mb-3 opacity-40" />
                                    <p className="font-medium text-slate-600">
                                        {auditLogs.length === 0 ? 'No audit events recorded yet' : 'No events match your search'}
                                    </p>
                                </td>
                            </tr>
                        )}
                        {filteredLogs.map((log: any) => (
                            <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                                <td className="px-6 py-4 text-sm text-slate-500 font-mono">
                                    {log.timestamp}
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-2">
                                        <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-600">
                                            {(log.user || '?').charAt(0)}
                                        </div>
                                        <span className="text-sm font-medium text-slate-700">{log.user}</span>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <span className="text-sm font-medium text-slate-900">{log.action}</span>
                                    {log.reason && <p className="text-xs text-slate-500 mt-0.5">Reason: {log.reason}</p>}
                                </td>
                                <td className="px-6 py-4 text-sm text-slate-600">
                                    {log.target}
                                </td>
                                <td className="px-6 py-4">
                                    {log.evidence ? (
                                        <button className="flex items-center gap-1.5 text-xs font-medium text-blue-600 hover:text-blue-800 bg-blue-50 px-2.5 py-1 rounded-full w-fit transition-colors">
                                            <FileText size={12} /> {log.evidence}
                                        </button>
                                    ) : (
                                        <span className="text-xs text-slate-400">-</span>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
