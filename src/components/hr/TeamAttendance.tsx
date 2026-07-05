import React, { useState } from 'react';
import { Users, Loader2, Clock } from 'lucide-react';
import { useTeamAttendance, AttendanceSegment } from '../../hooks/useHr';
import { fmtMins, fmtTime, minsSince } from './format';
import { ViewHeader, EmptyState, TableCard, th, td, Avatar } from '../sponsor/ui';

interface Row { userId: string; email: string; segments: AttendanceSegment[]; firstIn: string; lastOut: string | null; minutes: number; isIn: boolean; }

function rollup(segs: AttendanceSegment[]): Row[] {
  const by = new Map<string, AttendanceSegment[]>();
  for (const s of segs) { const a = by.get(s.user_id) || []; a.push(s); by.set(s.user_id, a); }
  const rows: Row[] = [];
  for (const [userId, list] of by) {
    list.sort((a, b) => a.clock_in_at.localeCompare(b.clock_in_at));
    const open = list.find(s => !s.clock_out_at);
    const minutes = list.reduce((m, s) => m + (s.clock_out_at ? (s.worked_minutes || 0) : minsSince(s.clock_in_at)), 0);
    rows.push({
      userId, email: list[0].email || userId.slice(0, 8), segments: list,
      firstIn: list[0].clock_in_at, lastOut: open ? null : list[list.length - 1].clock_out_at,
      minutes, isIn: !!open,
    });
  }
  return rows.sort((a, b) => Number(b.isIn) - Number(a.isIn) || a.email.localeCompare(b.email));
}

export function TeamAttendance() {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const { segments, isLoading } = useTeamAttendance(date);
  const rows = rollup(segments);
  const inNow = rows.filter(r => r.isIn);

  return (
    <div className="space-y-5">
      <ViewHeader title="Team attendance" subtitle="Who's in and hours worked, by day."
        action={<input type="date" value={date} onChange={e => setDate(e.target.value)}
          className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/30" />} />

      {/* currently in */}
      <div className="bg-slate-50/70 border border-slate-200 rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-3">
          <span className="w-6 h-6 rounded-md bg-emerald-100 text-emerald-600 flex items-center justify-center"><Clock size={14} /></span>
          <h3 className="text-sm font-semibold text-[#0F1E3A]">Clocked in now</h3>
          <span className="text-xs text-slate-400 tabular-nums">({inNow.length})</span>
        </div>
        {inNow.length === 0 ? <p className="text-sm text-slate-400">Nobody is currently clocked in.</p> : (
          <div className="flex flex-wrap gap-2">
            {inNow.map(r => (
              <span key={r.userId} className="inline-flex items-center gap-2 bg-white border border-emerald-200 rounded-full pl-1 pr-3 py-1">
                <Avatar name={r.email} size={24} />
                <span className="text-sm text-slate-700">{r.email}</span>
                <span className="text-xs text-emerald-700 tabular-nums font-medium">{fmtMins(r.minutes)}</span>
              </span>
            ))}
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="h-32 bg-slate-100 rounded-xl animate-pulse" />
      ) : rows.length === 0 ? (
        <EmptyState icon={Users} title="No attendance for this day" hint="Pick another date, or staff haven't clocked in yet." />
      ) : (
        <TableCard head={<tr><th className={th}>Staff</th><th className={th}>First in</th><th className={th}>Last out</th><th className={th}>Hours</th><th className={th}>Status</th></tr>}>
          {rows.map(r => (
            <tr key={r.userId} className="hover:bg-slate-50">
              <td className={td}>
                <div className="flex items-center gap-3">
                  <Avatar name={r.email} size={34} />
                  <span className="text-sm font-medium text-[#0F1E3A]">{r.email}</span>
                </div>
              </td>
              <td className={`${td} tabular-nums text-slate-700`}>{fmtTime(r.firstIn)}</td>
              <td className={`${td} tabular-nums text-slate-700`}>{r.lastOut ? fmtTime(r.lastOut) : '—'}</td>
              <td className={`${td} tabular-nums font-medium text-[#0F1E3A]`}>{fmtMins(r.minutes)}</td>
              <td className={td}>{r.isIn
                ? <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2 py-0.5">● In</span>
                : <span className="text-xs text-slate-400">Out</span>}</td>
            </tr>
          ))}
        </TableCard>
      )}
    </div>
  );
}
