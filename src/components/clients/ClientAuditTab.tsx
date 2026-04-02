import React, { useState } from 'react';
import { History, Shield, FileText, Mail, PenTool, AlertOctagon } from 'lucide-react';
import { AuditLogEntry, AuditEventType } from '../../types/AuditTypes';

const EVENT_ICONS: Record<AuditEventType, any> = {
    'ENGAGEMENT_SENT': Mail,
    'ENGAGEMENT_SIGNED': PenTool,
    'AUTHORITY_REQUESTED': Shield,
    'AUTHORITY_GRANTED': Shield,
    'DOCUMENT_UPLOADED': FileText,
    'EMAIL_SENT': Mail,
    'COMPLIANCE_CHECK_FAILED': AlertOctagon
};

const EVENT_COLORS: Record<AuditEventType, string> = {
    'ENGAGEMENT_SENT': 'bg-blue-100 text-blue-600',
    'ENGAGEMENT_SIGNED': 'bg-emerald-100 text-emerald-600',
    'AUTHORITY_REQUESTED': 'bg-amber-100 text-amber-600',
    'AUTHORITY_GRANTED': 'bg-emerald-100 text-emerald-600',
    'DOCUMENT_UPLOADED': 'bg-slate-100 text-slate-600',
    'EMAIL_SENT': 'bg-blue-50 text-blue-500',
    'COMPLIANCE_CHECK_FAILED': 'bg-red-100 text-red-600'
};

export function ClientAuditTab({ logs }: { logs: AuditLogEntry[] }) {
    const [filter, setFilter] = useState<'All' | AuditEventType>('All');

    const filteredLogs = filter === 'All' ? logs : logs.filter(l => l.type === filter);

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                     <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                        <History size={20} className="text-slate-400" />
                        Audit Trail
                    </h2>
                    <p className="text-sm text-slate-500">Immutable record of critical compliance actions.</p>
                </div>
                <div className="flex gap-2">
                    <select 
                        value={filter}
                        onChange={(e) => setFilter(e.target.value as any)}
                        className="text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-100"
                    >
                        <option value="All">All Events</option>
                        <option value="ENGAGEMENT_SIGNED">Engagement Signed</option>
                        <option value="AUTHORITY_GRANTED">Authority Granted</option>
                        <option value="DOCUMENT_UPLOADED">Documents</option>
                    </select>
                </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                {filteredLogs.length === 0 ? (
                    <div className="p-12 text-center text-slate-400">
                        <History size={48} className="mx-auto mb-4 opacity-50" />
                        <p className="font-medium">No audit events found.</p>
                    </div>
                ) : (
                    <div className="relative">
                        {/* Timeline Line */}
                        <div className="absolute left-8 top-0 bottom-0 w-px bg-slate-100"></div>

                        <div className="divide-y divide-slate-50">
                            {filteredLogs.map((log) => {
                                const Icon = EVENT_ICONS[log.type] || History;
                                const colorClass = EVENT_COLORS[log.type] || 'bg-slate-100 text-slate-600';

                                return (
                                    <div key={log.id} className="relative pl-20 pr-6 py-4 hover:bg-slate-50 transition-colors group">
                                        {/* Timestamp Bubble */}
                                        <div className="absolute left-4 top-4 w-8 h-8 rounded-full border-4 border-white z-10 flex items-center justify-center shadow-sm bg-white">
                                            <div className={`w-full h-full rounded-full flex items-center justify-center ${colorClass}`}>
                                                <Icon size={14} />
                                            </div>
                                        </div>

                                        <div className="flex justify-between items-start">
                                            <div>
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="font-bold text-slate-900 text-sm">{log.description}</span>
                                                    <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 border border-slate-200">
                                                        {log.type.replace(/_/g, ' ')}
                                                    </span>
                                                </div>
                                                <div className="text-xs text-slate-500">
                                                    Performed by <span className="font-medium text-slate-700">{log.actor}</span>
                                                </div>
                                            </div>
                                            <div className="text-xs font-mono text-slate-400 whitespace-nowrap">
                                                {new Date(log.timestamp).toLocaleString()}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
