import React, { useState } from 'react';
import { Calendar, ChevronLeft, ChevronRight, AlertTriangle, CheckCircle, Clock } from 'lucide-react';

export function DeadlinesPage() {
    const [view, setView] = useState<'timeline' | 'list'>('timeline');
    const [monthOffset, setMonthOffset] = useState(0);

    // NOTE: deadline data is still placeholder pending the /brain/deadlines engine.
    const deadlines = [
        { id: 1, client: 'Acme Corp', type: 'VAT Return', date: '2024-02-07', status: 'Upcoming', risk: 'safe' }, // Green
        { id: 2, client: 'Smith Ltd', type: 'PAYE', date: '2024-02-19', status: 'Due Soon', risk: 'approaching' }, // Orange
        { id: 3, client: 'Jones & Co', type: 'CT600', date: '2024-02-28', status: 'Urgent', risk: 'late' }, // Red
        { id: 4, client: 'TechStart Inc', type: 'Confirmation Stmt', date: '2024-03-05', status: 'Upcoming', risk: 'safe' },
        { id: 5, client: 'Global Trading', type: 'Accounts', date: '2024-03-31', status: 'On Track', risk: 'safe' },
    ];

    // Rolling 6-month window, navigable via the chevrons.
    const windowStart = new Date();
    windowStart.setDate(1);
    windowStart.setMonth(windowStart.getMonth() + monthOffset);
    const windowMonths = Array.from({ length: 6 }, (_, i) => {
        const d = new Date(windowStart);
        d.setMonth(windowStart.getMonth() + i);
        return d;
    });
    const rangeLabel = `${windowMonths[0].toLocaleString('default', { month: 'short', year: 'numeric' })} – ${windowMonths[5].toLocaleString('default', { month: 'short', year: 'numeric' })}`;

    return (
        <div className="space-y-6">
             <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Compliance Timeline</h1>
                    <p className="text-slate-500 mt-1">Track upcoming HMRC obligations and statutory deadlines.</p>
                </div>
                 <div className="flex bg-slate-100 p-1 rounded-lg">
                    <button 
                        onClick={() => setView('timeline')}
                        className={`px-3 py-1.5 rounded font-medium text-sm transition-all ${view === 'timeline' ? 'bg-white text-slate-800 shadow' : 'text-slate-500 hover:text-slate-800'}`}
                    >
                        Timeline
                    </button>
                    <button 
                         onClick={() => setView('list')}
                         className={`px-3 py-1.5 rounded font-medium text-sm transition-all ${view === 'list' ? 'bg-white text-slate-800 shadow' : 'text-slate-500 hover:text-slate-800'}`}
                    >
                        List
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 overflow-hidden">
                 {/* Timeline Header controls */}
                 <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-3">
                        <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                            <Calendar size={20} className="text-blue-500" />
                            {rangeLabel}
                        </h2>
                        <div className="flex items-center gap-1">
                            <button
                                onClick={() => setMonthOffset(o => o - 1)}
                                aria-label="Previous month"
                                className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-800 transition-colors"
                            >
                                <ChevronLeft size={16} />
                            </button>
                            <button
                                onClick={() => setMonthOffset(o => o + 1)}
                                aria-label="Next month"
                                className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-800 transition-colors"
                            >
                                <ChevronRight size={16} />
                            </button>
                            {monthOffset !== 0 && (
                                <button
                                    onClick={() => setMonthOffset(0)}
                                    className="ml-1 text-xs font-medium text-blue-600 hover:text-blue-800"
                                >
                                    Today
                                </button>
                            )}
                        </div>
                    </div>
                    <div className="flex items-center gap-4 text-sm font-medium">
                        <div className="flex items-center gap-2">
                             <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> Safe
                        </div>
                        <div className="flex items-center gap-2">
                             <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span> Approaching
                        </div>
                        <div className="flex items-center gap-2">
                             <span className="w-2.5 h-2.5 rounded-full bg-red-500"></span> Risk
                        </div>
                    </div>
                 </div>

                 {/* Horizontal Timeline Scroll Area */}
                 <div className="relative overflow-x-auto pb-12">
                     {/* Timeline Line */}
                     <div className="absolute top-8 left-0 w-[1000px] h-1 bg-slate-100 rounded-full"></div>

                     <div className="flex min-w-[1000px] justify-between relative z-10">
                        {windowMonths.map((monthDate) => {
                             const monthLabel = monthDate.toLocaleString('default', { month: 'short' });
                             // Match deadlines falling in this month + year
                             const monthDeadlines = deadlines.filter(d => {
                                 const dd = new Date(d.date);
                                 return dd.getMonth() === monthDate.getMonth() && dd.getFullYear() === monthDate.getFullYear();
                             });

                             return (
                                 <div key={`${monthLabel}-${monthDate.getFullYear()}`} className="flex flex-col items-center w-40 relative group">
                                     {/* Month Node */}
                                     <div className="w-4 h-4 rounded-full bg-slate-300 border-4 border-white shadow-sm mb-4 group-hover:scale-125 group-hover:bg-blue-500 transition-all"></div>
                                     <span className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-6 group-hover:text-blue-600 transition-colors">{monthLabel}</span>
                                     
                                     {/* Deadlines Stack */}
                                     <div className="flex flex-col gap-2 w-full px-2">
                                         {monthDeadlines.map((d, i) => (
                                             <div 
                                                key={i} 
                                                className={`p-3 rounded-lg border text-left cursor-pointer hover:shadow-md transition-all relative overflow-hidden group/card ${
                                                    d.risk === 'safe' ? 'bg-emerald-50 border-emerald-100 hover:border-emerald-300' :
                                                    d.risk === 'approaching' ? 'bg-amber-50 border-amber-100 hover:border-amber-300' :
                                                    'bg-red-50 border-red-100 hover:border-red-300'
                                                }`}
                                             >
                                                 {/* Status Indicator Bar */}
                                                 <div className={`absolute left-0 top-0 bottom-0 w-1 ${
                                                     d.risk === 'safe' ? 'bg-emerald-500' :
                                                     d.risk === 'approaching' ? 'bg-amber-500' :
                                                     'bg-red-500'
                                                 }`}></div>

                                                 <div className="pl-2">
                                                     <div className="flex justify-between items-start mb-1">
                                                         <span className={`text-[10px] font-bold uppercase tracking-wide ${
                                                             d.risk === 'safe' ? 'text-emerald-700' :
                                                             d.risk === 'approaching' ? 'text-amber-700' :
                                                             'text-red-700'
                                                         }`}>
                                                             {new Date(d.date).getDate()} {monthLabel}
                                                         </span>
                                                         {d.risk === 'late' && <AlertTriangle size={12} className="text-red-500" />}
                                                     </div>
                                                     <h4 className="font-semibold text-slate-900 text-xs truncate" title={d.client}>{d.client}</h4>
                                                     <p className="text-xs text-slate-500 truncate">{d.type}</p>
                                                 </div>
                                             </div>
                                         ))}
                                         {monthDeadlines.length === 0 && (
                                             <div className="h-16 flex items-center justify-center text-slate-300 text-xs border border-dashed border-slate-200 rounded-lg">
                                                 No Due Dates
                                             </div>
                                         )}
                                     </div>
                                 </div>
                             );
                        })}
                     </div>
                 </div>
            </div>
        </div>
    );
}
