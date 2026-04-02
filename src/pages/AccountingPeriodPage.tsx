import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Calendar, FileText, Lock, Unlock } from 'lucide-react';
import { PeriodWorkflowView } from '../components/periods/PeriodWorkflowView';

export function AccountingPeriodPage() {
    const { entityId, periodId } = useParams<{ entityId: string, periodId: string }>();
    const [currentStage, setCurrentStage] = useState('accounts'); // Mock state

    return (
        <div className="min-h-screen bg-slate-50">
            {/* Top Status Bar (Persistent Context) */}
            <div className="bg-white border-b border-slate-200 sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-6">
                        <Link to={`/entities/${entityId}`} className="text-slate-400 hover:text-slate-800 transition-colors">
                            <ArrowLeft size={20} />
                        </Link>
                        <div className="h-8 w-px bg-slate-200"></div>
                        <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900 text-lg">Acme Corp Ltd</span>
                            <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-xs font-mono">2024 CT</span>
                        </div>
                    </div>

                    <div className="flex items-center gap-6">
                         <div className="flex items-center gap-2 text-sm">
                            <span className="text-slate-500">Due Date:</span>
                            <span className="font-bold text-slate-900 bg-red-50 text-red-700 px-2 py-0.5 rounded border border-red-100">31 Dec 2025</span>
                         </div>
                         <button className="text-slate-400 hover:text-slate-600">
                             <Lock size={18} />
                         </button>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto py-6 px-6">
                
                {/* Workflow Navigator */}
                <PeriodWorkflowView currentStage={currentStage} onStageSelect={setCurrentStage} />

                {/* Module Content Area (Context Preserved) */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm min-h-[500px] p-8 animate-fadeIn">
                    <div className="flex items-center gap-3 mb-6 pb-6 border-b border-slate-100">
                        <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
                            {currentStage === 'accounts' ? <FileText size={24} /> : 
                             currentStage === 'records' ? <FileText size={24} /> :
                             <Calendar size={24} />}
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-slate-900 capitalize">{currentStage} Module</h2>
                            <p className="text-slate-500">Manage {currentStage} for this period.</p>
                        </div>
                    </div>
                    
                    {/* Placeholder Content for Modules */}
                    <div className="flex flex-col items-center justify-center py-20 text-slate-400 border border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                        <span className="mb-2 font-medium">Module: {currentStage}</span>
                        <span className="text-sm">Specific functionality for this stage would load here.</span>
                    </div>

                    {/* Stage Actions */}
                    <div className="mt-8 flex justify-end">
                        <button className="px-6 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 shadow-md shadow-blue-500/20 transition-all">
                            Complete & Next Stage
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
