import React, { useState } from 'react';
import { Clock, CalendarCheck } from 'lucide-react';
import { TeamAttendance } from './TeamAttendance';
import { TeamLeave } from './TeamLeave';

// Super_admin "Team Attendance" tab: one tab, two sub-sections (Attendance | Leave).
type View = 'attendance' | 'leave';
const NAV: { id: View; label: string; icon: any }[] = [
  { id: 'attendance', label: 'Attendance', icon: Clock },
  { id: 'leave', label: 'Leave', icon: CalendarCheck },
];

export function TeamTime() {
  const [view, setView] = useState<View>('attendance');
  return (
    <div className="space-y-6">
      <div className="flex gap-1 border-b border-slate-200">
        {NAV.map(n => (
          <button key={n.id} onClick={() => setView(n.id)}
            className={`inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${view === n.id ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>
            <n.icon size={16} /> {n.label}
          </button>
        ))}
      </div>
      {view === 'attendance' ? <TeamAttendance /> : <TeamLeave />}
    </div>
  );
}
