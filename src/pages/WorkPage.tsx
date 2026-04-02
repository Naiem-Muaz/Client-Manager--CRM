import React from 'react';
import { Link } from 'react-router-dom';
import { Calendar, AlertCircle, Loader2 } from 'lucide-react';
import { useWorkflows } from '../hooks/useWorkflows';

export function WorkPage() {
    const { items: rawItems, isLoading } = useWorkflows();
    const items = Array.isArray(rawItems) ? rawItems : [];

    const stages = [
        { id: 'records', label: 'Financial Records', count: items.filter((i: any) => i.stage === 'records').length, color: 'bg-slate-50 border-slate-200' },
        { id: 'accounts', label: 'Draft Accounts', count: items.filter((i: any) => i.stage === 'accounts').length, color: 'bg-blue-50 border-blue-200' },
        { id: 'tax', label: 'Tax Calculation', count: items.filter((i: any) => i.stage === 'tax').length, color: 'bg-purple-50 border-purple-200' },
        { id: 'filing', label: 'Filing & Review', count: items.filter((i: any) => i.stage === 'filing').length, color: 'bg-green-50 border-green-200' }
    ];

    return (
        <div className="h-[calc(100vh-8rem)] flex flex-col">
            <div className="flex items-center justify-between mb-6">
                <div>
                     <h1 className="text-2xl font-bold text-slate-900">Work Pipeline</h1>
                     <p className="text-slate-500 mt-1">High-level view of all active accounting periods.</p>
                </div>
                <div className="flex bg-slate-100 p-1 rounded-lg">
                    <button className="px-3 py-1.5 bg-white text-slate-800 shadow rounded font-medium text-sm">Kanban</button>
                    <button className="px-3 py-1.5 text-slate-500 hover:text-slate-800 font-medium text-sm">List</button>
                </div>
            </div>

            <div className="flex-1 flex gap-6 overflow-x-auto pb-4">
                {stages.map(stage => (
                    <div key={stage.id} className="flex-1 min-w-[300px] flex flex-col bg-slate-50/50 rounded-xl border border-slate-200/60">
                         {/* Column Header */}
                        <div className={`p-4 border-b ${stage.color} rounded-t-xl bg-opacity-50 flex justify-between items-center`}>
                            <h3 className="font-semibold text-slate-800">{stage.label}</h3>
                            <span className="bg-white px-2 py-0.5 rounded text-xs font-bold text-slate-600 shadow-sm">{stage.count}</span>
                        </div>

                        {/* Column Content */}
                        <div className="p-3 flex-1 overflow-y-auto space-y-3">
                            {isLoading && stage.id === 'records' && (
                                <div className="text-center py-4 text-slate-400">
                                   <Loader2 className="animate-spin inline h-5 w-5 mr-2" />
                                </div>
                            )}
                            {items.filter((i: any) => i.stage === stage.id).map((item: any) => (
                                <Link to={`/entities/1/periods/1`} key={item.id} className="block bg-white p-4 rounded-lg border border-slate-200 shadow-sm hover:shadow-md hover:border-blue-300 transition-all cursor-pointer group">
                                    <div className="flex justify-between items-start mb-2">
                                        <h4 className="font-semibold text-slate-900 group-hover:text-blue-600 transition-colors">{item.client}</h4>
                                        {item.due === 'Today' && <AlertCircle size={14} className="text-red-500" />}
                                    </div>
                                    <p className="text-sm text-slate-600 mb-3">{item.task}</p>
                                    <div className="flex items-center gap-2 text-xs text-slate-400 bg-slate-50 px-2 py-1 rounded w-fit">
                                        <Calendar size={12} /> Due: {item.due}
                                    </div>
                                </Link>
                            ))}
                            <button className="w-full py-2 border border-dashed border-slate-300 rounded-lg text-slate-400 hover:text-slate-600 hover:border-slate-400 hover:bg-slate-50 transition-colors text-sm font-medium">
                                + Add Period
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
