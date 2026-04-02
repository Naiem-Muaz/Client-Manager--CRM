import React, { useState } from 'react';
import { History, Search, Filter, Shield, User, FileText, ArrowRight, Loader2 } from 'lucide-react';
import { useAuditLogs } from '../hooks/useAudit';

export function AuditPage() {
    const [searchTerm, setSearchTerm] = useState('');
    const { logs: rawLogs, isLoading } = useAuditLogs();
    const auditLogs = Array.isArray(rawLogs) ? rawLogs : [];

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
                    <button className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-slate-700 hover:bg-slate-50 transition-colors font-medium text-sm shadow-sm">
                        <Filter size={16} /> Filter
                    </button>
                    <button className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-slate-700 hover:bg-slate-50 transition-colors font-medium text-sm shadow-sm">
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
                        {auditLogs.map((log: any) => (
                            <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                                <td className="px-6 py-4 text-sm text-slate-500 font-mono">
                                    {log.timestamp}
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-2">
                                        <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-600">
                                            {log.user.charAt(0)}
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
