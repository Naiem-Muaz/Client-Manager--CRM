import React from 'react';
import { CheckCircle2, Clock, Circle, ArrowRight } from 'lucide-react';

interface TimelineStep {
    id: string;
    label: string;
    status: 'completed' | 'current' | 'pending';
    date?: string;
}

const MOCK_STEPS: TimelineStep[] = [
    { id: '1', label: 'Client Onboarding', status: 'completed', date: '01 Feb 2026' },
    { id: '2', label: 'Engagement Letter Signed', status: 'completed', date: '02 Feb 2026' },
    { id: '3', label: 'HMRC Authority', status: 'completed', date: '04 Feb 2026' },
    { id: '4', label: 'KYC / AML Checks', status: 'current', date: 'Due Now' },
    { id: '5', label: 'First Return (VAT)', status: 'pending', date: '14 Feb 2026' },
];

export function ComplianceTimelineWidget() {
    return (
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
            <h3 className="font-bold text-slate-900 mb-6 flex items-center gap-2">
                <CheckCircle2 size={20} className="text-blue-600" />
                Compliance Lifecycle
            </h3>
            
            <div className="relative">
                {/* Connecting Line */}
                <div className="absolute left-[15px] top-4 bottom-4 w-0.5 bg-slate-100"></div>

                <div className="space-y-6">
                    {MOCK_STEPS.map((step, index) => {
                        const isCompleted = step.status === 'completed';
                        const isCurrent = step.status === 'current';

                        return (
                            <div key={step.id} className="relative pl-10 flex items-center justify-between group">
                                {/* Dot/Icon */}
                                <div className={`absolute left-0 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full border-2 flex items-center justify-center bg-white z-10 transition-colors ${
                                    isCompleted ? 'border-emerald-500 text-emerald-500 bg-emerald-50' :
                                    isCurrent ? 'border-blue-500 text-blue-500 animate-pulse' :
                                    'border-slate-200 text-slate-300'
                                }`}>
                                    {isCompleted && <CheckCircle2 size={16} />}
                                    {isCurrent && <Clock size={16} />}
                                    {step.status === 'pending' && <Circle size={12} />}
                                </div>

                                <div>
                                    <h4 className={`text-sm font-bold ${
                                        isCompleted ? 'text-slate-900 line-through opacity-60' : 
                                        isCurrent ? 'text-blue-700' : 'text-slate-500'
                                    }`}>
                                        {step.label}
                                    </h4>
                                    {step.date && (
                                        <p className="text-xs text-slate-400 font-medium">{step.date}</p>
                                    )}
                                </div>

                                {isCurrent && (
                                    <button className="text-xs font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded-full hover:bg-blue-100 transition-colors">
                                        Complete Now
                                    </button>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
            
             <div className="mt-8 pt-6 border-t border-slate-100">
                <div className="flex justify-between items-center text-xs text-slate-500">
                    <span>Overall Health Score</span>
                    <span className="font-bold text-emerald-600">92% Excellent</span>
                </div>
                <div className="mt-2 h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 w-[92%]"></div>
                </div>
            </div>
        </div>
    );
}
