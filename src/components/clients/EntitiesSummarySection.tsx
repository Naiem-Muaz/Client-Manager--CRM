import React from 'react';
import { Link } from 'react-router-dom';
import { Building2, User, ChevronRight, ArrowRightCircle } from 'lucide-react';

export function EntitiesSummarySection({ entities }: { entities: any[] }) {
    return (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                    <Building2 size={20} className="text-purple-500" />
                    Entities
                </h3>
                <span className="bg-slate-100 text-slate-600 text-xs font-bold px-2 py-1 rounded-full">{entities.length}</span>
            </div>

            <div className="space-y-3">
                {entities.length === 0 ? (
                    <div className="text-center py-6 text-slate-400 bg-slate-50 rounded-lg border border-dashed border-slate-200">
                        No entities linked.
                    </div>
                ) : (
                    entities.map(entity => (
                        <Link 
                            key={entity.id} 
                            to={`/entities/${entity.id}`}
                            className="flex items-center justify-between p-3 rounded-lg border border-slate-200 hover:border-purple-300 hover:bg-purple-50/30 transition-all group"
                        >
                            <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-lg ${entity.type === 'Company' ? 'bg-purple-100 text-purple-600' : 'bg-blue-100 text-blue-600'}`}>
                                    {entity.type === 'Company' ? <Building2 size={16} /> : <User size={16} />}
                                </div>
                                <div>
                                    <p className="font-medium text-slate-900 text-sm">{entity.name || entity.type}</p>
                                    <p className="text-xs text-slate-500">Ref: {entity.id}</p>
                                </div>
                            </div>
                            <ChevronRight size={16} className="text-slate-300 group-hover:text-purple-500" />
                        </Link>
                    ))
                )}
            </div>
            
            <button className="w-full mt-4 flex items-center justify-center gap-2 text-sm text-purple-600 hover:text-purple-700 font-medium p-2 hover:bg-purple-50 rounded-lg transition-colors border border-transparent hover:border-purple-100">
                <ArrowRightCircle size={16} /> View All Entities
            </button>
        </div>
    );
}
