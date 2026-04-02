import React from 'react';
import { Calendar, ChevronRight } from 'lucide-react';

export function EntityPeriodsTab({ periods }: { periods: any[] }) {
    // Mock Periods
    const mockPeriods = [
        { id: '1', start: '2023-04-01', end: '2024-03-31', status: 'Draft', type: 'CT', taxDue: 0 },
        { id: '2', start: '2022-04-01', end: '2023-03-31', status: 'Submitted', type: 'CT', taxDue: 12500 }
    ];

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-slate-900">Accounting Periods</h3>
                <button className="text-sm text-blue-600 font-medium hover:underline">+ New Period</button>
            </div>
            
            <div className="space-y-4">
                {mockPeriods.map(period => (
                    <div key={period.id} className="flex items-center justify-between bg-white p-4 border border-slate-200 rounded-xl shadow-sm hover:border-blue-300 transition-colors cursor-pointer group">
                        <div className="flex items-center gap-4">
                            <div className={`p-3 rounded-lg ${period.status === 'Submitted' ? 'bg-green-100 text-green-600' : 'bg-blue-100 text-blue-600'}`}>
                                <Calendar size={20} />
                            </div>
                            <div>
                                <p className="font-semibold text-slate-900 flex items-center gap-2">
                                    {period.start} - {period.end}
                                    <span className={`text-xs px-2 py-0.5 rounded-full ${period.status === 'Submitted' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                                        {period.status}
                                    </span>
                                </p>
                                <p className="text-sm text-slate-500">{period.type} Return</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-6">
                             <div className="text-right">
                                <p className="text-xs text-slate-500 uppercase font-medium">Tax Liability</p>
                                <p className="font-mono font-medium text-slate-900">£{period.taxDue.toLocaleString()}</p>
                            </div>
                            <ChevronRight size={20} className="text-slate-300 group-hover:text-blue-500" />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
