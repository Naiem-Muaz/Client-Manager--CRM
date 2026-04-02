import React from 'react';
import { Link } from 'react-router-dom';
import { Building2, User, ChevronRight, AlertTriangle, Clock, ArrowRight, CheckCircle2, CircleDashed } from 'lucide-react';

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
                                <span>Last filed: <span className="font-medium text-slate-700">2023</span></span>
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

export function ClientActiveWorkColumn() {
    // Mock Data
    const workItems = [
        { id: 1, title: '2024 Corporation Tax', entity: 'Acme Corp', progress: 70, status: 'In Progress', next: 'Accounts Approval', deadline: '14 days' },
        { id: 2, title: 'VAT Return Q1 2024', entity: 'Acme Corp', progress: 30, status: 'Waiting on Info', next: 'Upload Receipts', deadline: '2 days' },
    ];

    return (
         <div className="flex flex-col h-full">
            <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                <CircleDashed size={16} /> Active Work
            </h3>
            
            <div className="flex-1 space-y-3">
                 {workItems.map(work => (
                    <div key={work.id} className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 hover:border-blue-300 transition-colors cursor-pointer">
                        <div className="flex justify-between items-start mb-2">
                            <span className="text-xs font-semibold text-slate-500">{work.entity}</span>
                            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                                work.status === 'In Progress' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'
                            }`}>{work.status}</span>
                        </div>
                        
                        <h4 className="font-bold text-slate-900 mb-3">{work.title}</h4>
                        
                        <div className="space-y-2 mb-4">
                            <div className="flex justify-between text-xs text-slate-600">
                                <span>Progress</span>
                                <span className="font-bold">{work.progress}%</span>
                            </div>
                            <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                                <div className="bg-blue-600 h-full rounded-full" style={{ width: `${work.progress}%` }}></div>
                            </div>
                        </div>
                        
                        <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                            <div className="flex items-center gap-2 text-xs text-slate-600">
                                <span className="text-slate-400">Next:</span>
                                <span className="font-medium bg-slate-50 px-1.5 py-0.5 rounded border border-slate-200">{work.next}</span>
                            </div>
                            <ArrowRight size={14} className="text-slate-300" />
                        </div>
                    </div>
                ))}

                 <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 text-center">
                    <p className="text-sm text-slate-500 mb-2">Everything else is up to date.</p>
                    <button className="text-blue-600 text-sm font-medium hover:underline">View History</button>
                 </div>
            </div>
        </div>
    );
}

// --- Column 3: Alerts ---

export function ClientAlertsColumn() {
    return (
         <div className="flex flex-col h-full">
            <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                <AlertTriangle size={16} /> Alerts & Attention
            </h3>
            
            <div className="flex-1 space-y-3">
                <div className="bg-red-50 rounded-xl border border-red-100 p-4 flex items-start gap-3">
                    <AlertTriangle size={18} className="text-red-500 shrink-0 mt-0.5" />
                    <div>
                        <h4 className="font-bold text-red-700 text-sm mb-1">Missing Bank Statement</h4>
                        <p className="text-xs text-red-600 leading-relaxed">
                            December 2023 statement is missing for <span className="font-medium">Barclays 1234</span>. Client notified via app.
                        </p>
                        <button className="mt-2 text-xs font-bold text-red-700 hover:text-red-900 bg-white/50 px-2 py-1 rounded border border-red-200">
                            Resend Request
                        </button>
                    </div>
                </div>

                <div className="bg-amber-50 rounded-xl border border-amber-100 p-4 flex items-start gap-3">
                    <Clock size={18} className="text-amber-600 shrink-0 mt-0.5" />
                    <div>
                        <h4 className="font-bold text-amber-800 text-sm mb-1">CT Payment Due</h4>
                        <p className="text-xs text-amber-700 leading-relaxed">
                            Corporation Tax of <span className="font-mono font-bold">£4,250</span> is due in 14 days.
                        </p>
                    </div>
                </div>

                <div className="bg-blue-50 rounded-xl border border-blue-100 p-4 flex items-start gap-3 opacity-70 hover:opacity-100 transition-opacity">
                     <CheckCircle2 size={18} className="text-blue-600 shrink-0 mt-0.5" />
                     <div>
                        <h4 className="font-bold text-blue-800 text-sm mb-1">Onboarding Complete</h4>
                        <p className="text-xs text-blue-700">Client profile created 2 days ago.</p>
                     </div>
                </div>
            </div>
        </div>
    );
}
