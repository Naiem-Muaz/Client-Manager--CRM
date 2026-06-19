import { Link } from 'react-router-dom';
import { Building2, User, ChevronRight, AlertTriangle, Clock, ArrowRight, CheckCircle2, CircleDashed } from 'lucide-react';
import { useTasks } from '../../hooks/useTasks';
import { useClientDeadlines } from '../../hooks/useDeadlineEngine';
import { formatDateOnly, daysPill, COMPLETED_STATUSES, reasonMeta, reasonNavTab } from '../../lib/deadlines';

// --- Column 1: Entities ---

export function ClientEntitiesColumn({ entities }: { entities: any[] }) {
    return (
        <div className="flex flex-col h-full">
            <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                <Building2 size={16} /> Entities
            </h3>
            
            <div className="flex-1 space-y-3">
                {entities.length === 0 ? (
                    <div className="bg-slate-50 border border-dashed border-slate-200 rounded-xl p-6 text-center text-slate-400 text-sm">
                        No entities configured.
                    </div>
                ) : (
                    entities.map(entity => (
                        <div key={entity.id} className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 hover:shadow-md transition-shadow group relative">
                             <Link to={`/entities/${entity.id}`} className="absolute inset-0 z-10" />
                            <div className="flex items-start justify-between mb-2">
                                <div className="flex items-center gap-3">
                                    <div className={`p-2 rounded-lg ${entity.type === 'Company' ? 'bg-purple-100 text-purple-600' : 'bg-blue-100 text-blue-600'}`}>
                                        {entity.type === 'Company' ? <Building2 size={18} /> : <User size={18} />}
                                    </div>
                                    <div>
                                        <div className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors">{entity.name || entity.type}</div>
                                        <div className="text-xs text-slate-500 font-mono">{entity.type === 'Company' ? 'LTD' : 'IND'}</div>
                                    </div>
                                </div>
                                <ChevronRight size={16} className="text-slate-300 group-hover:text-blue-500 transition-colors" />
                            </div>
                            
                            <div className="mt-3 flex flex-wrap gap-2">
                                {entity.type === 'Company' ? (
                                    <>
                                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">CT</span>
                                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">VAT</span>
                                    </>
                                ) : (
                                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">SA</span>
                                )}
                            </div>
                            
                            <div className="mt-3 pt-3 border-t border-slate-100 flex items-center gap-2 text-xs text-slate-500">
                                <Clock size={12} />
                                <span>Last filed: <span className="font-medium text-slate-700">{entity.lastFiled || '—'}</span></span>
                            </div>
                        </div>
                    ))
                )}
                
                <button className="w-full py-2 border border-dashed border-slate-300 rounded-xl text-slate-500 hover:text-blue-600 hover:border-blue-400 hover:bg-blue-50 transition-all text-sm font-medium">
                    + Add Entity
                </button>
            </div>
        </div>
    );
}


// --- Column 2: Active Work ---

export function ClientActiveWorkColumn({ clientId }: { clientId?: string }) {
    const { tasks, isLoading } = useTasks(clientId);
    const openTasks = (Array.isArray(tasks) ? tasks : [])
        .filter((t: any) => (t.status || '').toLowerCase() !== 'complete')
        .slice(0, 2);

    return (
         <div className="flex flex-col h-full">
            <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                <CircleDashed size={16} /> Active Work
            </h3>

            <div className="flex-1 space-y-3">
                {isLoading ? (
                    <>
                        <div className="h-28 bg-slate-100 rounded-xl animate-pulse" />
                        <div className="h-28 bg-slate-100 rounded-xl animate-pulse" />
                    </>
                ) : openTasks.length === 0 ? (
                    <div className="bg-slate-50 border border-dashed border-slate-200 rounded-xl p-8 text-center">
                        <CircleDashed size={28} className="mx-auto text-slate-300 mb-3" />
                        <p className="text-sm font-medium text-slate-600 mb-1">No active work</p>
                        <p className="text-xs text-slate-400 mb-4">There are no open tasks for this client.</p>
                        <Link to="/tasks" className="text-blue-600 text-sm font-medium hover:underline">View all tasks →</Link>
                    </div>
                ) : (
                    openTasks.map((work: any) => (
                        <Link
                            to="/tasks"
                            key={work.id}
                            className="block bg-white rounded-xl border border-slate-200 shadow-sm p-4 hover:border-blue-300 transition-colors"
                        >
                            <div className="flex justify-between items-start mb-2">
                                <span className="text-xs font-semibold text-slate-500">{work.context || work.entityName || 'Task'}</span>
                                {work.status && (
                                    <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                                        {work.status}
                                    </span>
                                )}
                            </div>

                            <h4 className="font-bold text-slate-900 mb-3">{work.title || work.name || 'Untitled task'}</h4>

                            <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                                <div className="flex items-center gap-2 text-xs text-slate-600">
                                    {work.dueDate || work.due_date ? (
                                        <>
                                            <span className="text-slate-400">Due:</span>
                                            <span className="font-medium bg-slate-50 px-1.5 py-0.5 rounded border border-slate-200">
                                                {new Date(work.dueDate || work.due_date).toLocaleDateString('en-GB')}
                                            </span>
                                        </>
                                    ) : work.assignee ? (
                                        <span className="text-slate-400">{work.assignee}</span>
                                    ) : null}
                                </div>
                                <ArrowRight size={14} className="text-slate-300" />
                            </div>
                        </Link>
                    ))
                )}
            </div>
        </div>
    );
}

// --- Column 3: Alerts ---

export function ClientAlertsColumn({ clientId, onNavigate }: { clientId?: string; onNavigate?: (tab: string) => void }) {
    const { deadlines, coverage } = useClientDeadlines(clientId);
    const overdue = deadlines.filter((d) => d.overdue);
    const dueSoon = deadlines.filter(
        (d) => !d.overdue && d.days_remaining >= 0 && d.days_remaining <= 14 && !COMPLETED_STATUSES.includes(d.status),
    );
    const coverageAlert = coverage && coverage.status !== 'ok' && coverage.reason_codes.length > 0;
    const hasAny = coverageAlert || overdue.length > 0 || dueSoon.length > 0;

    return (
         <div className="flex flex-col h-full">
            <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                <AlertTriangle size={16} /> Alerts & Attention
            </h3>

            <div className="flex-1 space-y-3">
                {/* 1. Coverage — the honesty signal, at the point of work */}
                {coverageAlert && coverage!.reason_codes.map((code) => {
                    const m = reasonMeta(code);
                    const red = coverage!.status === 'unmonitored';
                    const navTab = reasonNavTab(code);
                    return (
                        <div key={code} className={`rounded-xl border p-3 ${red ? 'bg-red-50 border-red-200' : 'bg-amber-50 border-amber-200'}`}>
                            <div className="flex items-start gap-2">
                                <AlertTriangle size={15} className={`mt-0.5 shrink-0 ${red ? 'text-red-500' : 'text-amber-500'}`} />
                                <div className="text-sm text-slate-700">
                                    {m.message}
                                    {navTab && onNavigate && (
                                        <button onClick={() => onNavigate(navTab)} className="block mt-1 text-blue-600 font-semibold hover:underline inline-flex items-center gap-1">
                                            {m.action} <ArrowRight size={12} />
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}

                {/* 2. Overdue (red) */}
                {overdue.map((d) => (
                    <div key={d.id} className="rounded-xl border border-red-200 bg-red-50 p-3 flex items-center justify-between gap-2">
                        <div className="text-sm">
                            <div className="font-semibold text-slate-900">{d.deadline_type.name}</div>
                            <div className="text-xs text-slate-500">{formatDateOnly(d.statutory_due_date)}</div>
                        </div>
                        <span className={`shrink-0 px-2 py-0.5 rounded-full text-[11px] font-bold ${daysPill(d).className}`}>{daysPill(d).text}</span>
                    </div>
                ))}

                {/* 3. Due soon (amber) */}
                {dueSoon.map((d) => (
                    <div key={d.id} className="rounded-xl border border-amber-200 bg-amber-50 p-3 flex items-center justify-between gap-2">
                        <div className="text-sm">
                            <div className="font-semibold text-slate-900">{d.deadline_type.name}</div>
                            <div className="text-xs text-slate-500">{formatDateOnly(d.statutory_due_date)}</div>
                        </div>
                        <span className={`shrink-0 px-2 py-0.5 rounded-full text-[11px] font-bold ${daysPill(d).className}`}>{daysPill(d).text}</span>
                    </div>
                ))}

                {!hasAny && (
                    <div className="bg-slate-50 border border-dashed border-slate-200 rounded-xl p-8 text-center h-full flex flex-col items-center justify-center">
                        <CheckCircle2 size={28} className="text-emerald-400 mb-3" />
                        <p className="text-sm font-medium text-slate-600 mb-1">No active alerts</p>
                        <p className="text-xs text-slate-400">Outstanding items for this client will appear here.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
