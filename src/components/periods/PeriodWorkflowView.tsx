import React from 'react';
import { Check, ClipboardList, Calculator, FileText, Send, AlertTriangle } from 'lucide-react';

export function PeriodWorkflowView({ currentStage, onStageSelect }: { currentStage: string, onStageSelect: (id: string) => void }) {
    const stages = [
        { id: 'records', label: 'Records', icon: ClipboardList, status: 'done' },
        { id: 'accounts', label: 'Accounts', icon: FileText, status: 'done' },
        { id: 'approval', label: 'Approval', icon: Check, status: 'in-progress' },
        { id: 'tax', label: 'Tax', icon: Calculator, status: 'pending' },
        { id: 'review', label: 'Review', icon: AlertTriangle, status: 'blocked' }, // Mock blocked state
        { id: 'submitted', label: 'Submitted', icon: Send, status: 'pending' }
    ];

    // Helper to determine visual state based on selection & status
    const getVisualState = (stage: any, isSelected: boolean) => {
        if (isSelected) return 'selected';
        if (stage.status === 'blocked') return 'blocked';
        if (stage.status === 'done') return 'done';
        if (stage.status === 'in-progress') return 'in-progress';
        return 'pending';
    };

    return (
        <div className="w-full bg-slate-900 text-white rounded-xl p-4 shadow-lg mb-6">
            <div className="flex items-center justify-between relative px-8">
                 {/* Progress Line */}
                <div className="absolute top-1/2 left-0 w-full h-0.5 bg-slate-700 -z-10"></div>
                
                {stages.map((stage, index) => {
                    const isSelected = currentStage === stage.id;
                    const visualState = getVisualState(stage, isSelected);

                    let baseClasses = "w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-300 cursor-pointer z-10 hover:scale-110";
                    let colorClasses = "";
                    let Icon = stage.icon;

                    switch(visualState) {
                        case 'selected':
                            colorClasses = "bg-white border-white text-slate-900 shadow-xl shadow-white/20 scale-125";
                            break;
                        case 'done':
                            colorClasses = "bg-green-500 border-green-500 text-white";
                            Icon = Check;
                            break;
                        case 'in-progress':
                            colorClasses = "bg-amber-500 border-amber-500 text-white animate-pulse-slow";
                            break;
                        case 'blocked':
                            colorClasses = "bg-red-500 border-red-500 text-white";
                             Icon = AlertTriangle;
                            break;
                        default: // pending
                            colorClasses = "bg-slate-800 border-slate-600 text-slate-500 hover:border-slate-500";
                    }

                    return (
                        <div key={stage.id} className="flex flex-col items-center gap-2" onClick={() => onStageSelect(stage.id)}>
                            <div className={`${baseClasses} ${colorClasses}`}>
                                <Icon size={18} strokeWidth={2.5} />
                            </div>
                            <span className={`text-[10px] uppercase font-bold tracking-widest transition-colors ${
                                isSelected ? 'text-white' : 'text-slate-500'
                            }`}>
                                {stage.label}
                            </span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
