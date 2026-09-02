import React, { useState } from 'react';
import { Users, Clock, LogOut, Loader2, AlertTriangle } from 'lucide-react';
import { useTeamAttendance, useOpenAttendance, closeSegment, AttendanceSegment } from '../../hooks/useHr';
import { errMsg } from '../../lib/errMsg';
import { fmtMins, fmtTime, minsSince, staffName, staffSubtitle } from './format';
import { ViewHeader, EmptyState, TableCard, th, td, Avatar } from '../sponsor/ui';

const STALE_HOURS = 12; // open longer than this ⇒ likely a forgotten clock-out

interface Row { userId: string; name: string; email: string; segments: AttendanceSegment[]; firstIn: string; lastOut: string | null; minutes: number; isIn: boolean; }
function rollup(segs: AttendanceSegment[]): Row[] {
  const by = new Map<string, AttendanceSegment[]>();
  for (const s of segs) { const a = by.get(s.user_id) || []; a.push(s); by.set(s.user_id, a); }
  const rows: Row[] = [];
  for (const [userId, list] of by) {
    list.sort((a, b) => a.clock_in_at.localeCompare(b.clock_in_at));
    const open = list.find(s => !s.clock_out_at);
    const minutes = list.reduce((m, s) => m + (s.clock_out_at ? (s.worked_minutes || 0) : minsSince(s.clock_in_at)), 0);
    rows.push({ userId, name: staffName(list[0]), email: staffSubtitle(list[0]), segments: list, firstIn: list[0].clock_in_at, lastOut: open ? null : list[list.length - 1].clock_out_at, minutes, isIn: !!open });
  }
  return rows.sort((a, b) => Number(b.isIn) - Number(a.isIn) || a.name.localeCompare(b.name));
}

// default clock-out value for the admin control: local "now" as datetime-local string
const localNow = () => { const d = new Date(); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 16); };

export function TeamAttendance() {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const { segments, isLoading, mutate: mutateDay } = useTeamAttendance(date);
  const { open, mutate: mutateOpen } = useOpenAttendance();      // who's in NOW, any date
  const rows = rollup(segments);

  const [closeAt, setCloseAt] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const doClose = async (id: string) => {
    setBusyId(id); setError(null);
    try {
      const at = closeAt[id]; // datetime-local → ISO; blank ⇒ backend defaults NOW()
      await closeSegment(id, at ? new Date(at).toISOString() : undefined);
      await Promise.all([mutateOpen(), mutateDay()]);
    } catch (e: any) { setError(errMsg(e, 'Could not close segment')); }
    finally { setBusyId(null); }
  };

  return (
    <div className="space-y-5">
      <ViewHeader title="Team attendance" subtitle="Who's in now, and hours worked by day."
        action={<input type="date" value={date} onChange={e => setDate(e.target.value)}
          className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/30" />} />

      {/* CLOCKED IN NOW — open segments regardless of date */}
      <div className="bg-slate-50/70 border border-slate-200 rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-3">
          <span className="w-6 h-6 rounded-md bg-emerald-100 text-emerald-600 flex items-center justify-center"><Clock size={14} /></span>
          <h3 className="text-sm font-semibold text-[#0F1E3A]">Clocked in now</h3>
          <span className="text-xs text-slate-400 tabular-nums">({open.length})</span>
        </div>
        {error && <p className="text-sm text-rose-600 mb-2">{error}</p>}
        {open.length === 0 ? <p className="text-sm text-slate-400">Nobody is currently clocked in.</p> : (
          <div className="space-y-2">
            {open.map(s => {
              const stale = Number(s.open_hours) > STALE_HOURS;
              return (
                <div key={s.id} className={`flex items-center gap-3 flex-wrap rounded-xl border px-3 py-2.5 ${stale ? 'bg-amber-50 border-amber-200' : 'bg-white border-slate-200'}`}>
                  <Avatar name={staffName(s)} size={30} />
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-[#0F1E3A] truncate">{staffName(s)}</div>
                    {staffSubtitle(s) && <div className="text-xs text-slate-400 truncate">{staffSubtitle(s)}</div>}
                    <div className="text-xs text-slate-500 tabular-nums">since {fmtTime(s.clock_in_at)} · {fmtMins(minsSince(s.clock_in_at))} open</div>
                  </div>
                  {stale && <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-700 bg-amber-100 border border-amber-200 rounded-full px-2 py-0.5"><AlertTriangle size={11} /> open {s.open_hours}h — forgot to clock out?</span>}
                  <div className="flex items-center gap-1.5 ml-auto">
                    <input type="datetime-local" value={closeAt[s.id] ?? localNow()} onChange={e => setCloseAt(c => ({ ...c, [s.id]: e.target.value }))}
                      className="px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/30" />
                    <button onClick={() => doClose(s.id)} disabled={busyId === s.id}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 text-slate-700 text-xs font-medium rounded-lg hover:bg-slate-50 disabled:opacity-50">
                      {busyId === s.id ? <Loader2 size={13} className="animate-spin" /> : <LogOut size={13} />} Close
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* DAILY TABLE — hours worked on the chosen day */}
      {isLoading ? (
        <div className="h-32 bg-slate-100 rounded-xl animate-pulse" />
      ) : rows.length === 0 ? (
        <EmptyState icon={Users} title="No attendance for this day" hint="Pick another date, or staff haven't clocked in on this day." />
      ) : (
        <TableCard head={<tr><th className={th}>Staff</th><th className={th}>First in</th><th className={th}>Last out</th><th className={th}>Hours</th><th className={th}>Status</th></tr>}>
          {rows.map(r => (
            <tr key={r.userId} className="hover:bg-slate-50">
              <td className={td}><div className="flex items-center gap-3"><Avatar name={r.name} size={34} />
                <div className="min-w-0"><div className="text-sm font-medium text-[#0F1E3A] truncate">{r.name}</div>
                  {r.email && <div className="text-xs text-slate-400 truncate">{r.email}</div>}</div></div></td>
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
