import React, { useEffect, useState } from 'react';
import { Clock, LogIn, LogOut, Loader2, CalendarClock } from 'lucide-react';
import { useMyAttendance, clockIn, clockOut } from '../../hooks/useHr';
import { errMsg } from '../../lib/errMsg';
import { fmtMins, fmtTime, minsSince } from './format';
import { SectionCard, EmptyState } from '../sponsor/ui';

export function MyAttendance() {
  const today = new Date().toISOString().slice(0, 10);
  const { attendance, isLoading, isError, mutate } = useMyAttendance(today);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [, tick] = useState(0);

  // live counter for the open segment
  useEffect(() => { const t = setInterval(() => tick(n => n + 1), 30_000); return () => clearInterval(t); }, []);

  // The API interceptor rejects with the response BODY ({success,error}) and strips
  // the HTTP status, so key off the message too — and NEVER fall through to the
  // loading skeleton on error (that was the blank-card bug).
  if (isError) {
    const msg = isError?.error || isError?.response?.data?.error || isError?.message || '';
    const notEnrolled = isError?.response?.status === 403 || /enrolled|clocking staff/i.test(msg);
    return <EmptyState icon={CalendarClock}
      title={notEnrolled ? "Time tracking isn't set up for you" : 'Could not load your attendance'}
      hint={notEnrolled ? 'Ask a practice admin to enable clocking for your account (Practice Settings → Team Attendance).' : (msg || 'Please try again in a moment.')} />;
  }
  if (isLoading || !attendance) return <div className="h-40 bg-slate-100 rounded-2xl animate-pulse" />;

  const isIn = attendance.isClockedIn;
  const open = attendance.segments.find(s => !s.clock_out_at);
  const liveTotal = attendance.totalMinutes + (open ? 0 : 0); // server already counts open→now at load; live counter below

  const doClock = async () => {
    setBusy(true); setError(null);
    try { isIn ? await clockOut() : await clockIn(); await mutate(); }
    catch (e: any) { setError(errMsg(e, 'Could not update your clock')); }
    finally { setBusy(false); }
  };

  return (
    <div className="space-y-5">
      {/* hero status + action */}
      <div className={`rounded-2xl border p-6 ${isIn ? 'bg-emerald-50 border-emerald-200' : 'bg-white border-slate-200'}`}>
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            <span className={`w-14 h-14 rounded-2xl flex items-center justify-center ${isIn ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
              <Clock size={26} />
            </span>
            <div>
              <div className={`text-lg font-bold ${isIn ? 'text-emerald-800' : 'text-[#0F1E3A]'}`}>{isIn ? 'Clocked in' : 'Not clocked in'}</div>
              <div className="text-sm text-slate-500">
                {isIn && open
                  ? <>since <span className="font-medium tabular-nums">{fmtTime(open.clock_in_at)}</span> · <span className="tabular-nums">{fmtMins(minsSince(open.clock_in_at))}</span> this session</>
                  : 'Tap clock in to start your day'}
              </div>
            </div>
          </div>
          <button onClick={doClock} disabled={busy}
            className={`inline-flex items-center gap-2 px-6 py-3 rounded-xl text-white text-sm font-semibold shadow-sm disabled:opacity-50 ${isIn ? 'bg-rose-600 hover:bg-rose-700' : 'bg-emerald-600 hover:bg-emerald-700'}`}>
            {busy ? <Loader2 size={18} className="animate-spin" /> : isIn ? <LogOut size={18} /> : <LogIn size={18} />}
            {isIn ? 'Clock out' : 'Clock in'}
          </button>
        </div>
        {error && <p className="text-sm text-rose-600 mt-3">{error}</p>}
      </div>

      {/* today's total */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Today's hours</div>
          <div className="text-2xl font-bold text-[#0F1E3A] tabular-nums mt-1">{fmtMins(liveTotal)}</div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Segments today</div>
          <div className="text-2xl font-bold text-[#0F1E3A] tabular-nums mt-1">{attendance.segments.length}</div>
        </div>
      </div>

      {/* segments */}
      <SectionCard icon={CalendarClock} title="Today's segments" bodyClass="p-0">
        {attendance.segments.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-8">No segments yet today.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {attendance.segments.map(s => (
              <li key={s.id} className="flex items-center justify-between px-5 py-3">
                <span className="text-sm text-slate-700 tabular-nums">
                  {fmtTime(s.clock_in_at)} → {s.clock_out_at ? fmtTime(s.clock_out_at) : <span className="text-emerald-600 font-medium">in progress</span>}
                </span>
                <span className="text-sm font-medium text-[#0F1E3A] tabular-nums">
                  {s.clock_out_at ? fmtMins(s.worked_minutes) : fmtMins(minsSince(s.clock_in_at))}
                </span>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>
    </div>
  );
}
