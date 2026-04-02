import React from 'react';
import { Calendar, Clock } from 'lucide-react';

export function ActivePeriodsSection({ periods }: { periods: any[] }) {
    // Mock data if none provided
    const displayPeriods = periods?.length > 0 ? periods : [
        { id: '1', year: '2023-2024', type: 'SA', deadline: '2025-01-31', status: 'Open', progress: 45 },
        { id: '2', year: '2022-2023', type: 'SA', deadline: '2024-01-31', status: 'Review', progress: 90 }
    ];

    return (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                <Calendar size={20} className="text-green-500" />
                Active Accounting Periods
            </h3>

            <div className="space-y-4">
                {displayPeriods.map(period => (
                    <div key={period.id} className="border-l-2 border-green-500 pl-4 py-1">
                        <div className="flex justify-between items-start mb-1">
                            <h4 className="font-semibold text-slate-900 text-sm">{period.year} <span className="text-slate-500 font-normal">({period.type})</span></h4>
                            <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                                period.status === 'Review' ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'
                            }`}>
                                {period.status}
                            </span>
                        </div>
                        <div className="flex items-center gap-4 text-xs text-slate-500 mb-2">
                            <span className="flex items-center gap-1">
                                <Clock size={12} /> Deadline: {period.deadline}
                            </span>
                        </div>
                         {/* Progress Bar */}
                        <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                            <div 
                                className={`h-full rounded-full ${period.progress > 80 ? 'bg-green-500' : 'bg-blue-500'}`} 
                                style={{ width: `${period.progress}%` }}
                            ></div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
