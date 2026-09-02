import React, { useMemo, useState } from 'react';
import { History, Download, Loader2, PencilLine, AlertTriangle } from 'lucide-react';
import { useAttendanceHistory, downloadAttendanceCsv, HistorySegment, Amendment } from '../../hooks/useHr';
import { useTeamMembers } from '../../hooks/useTeam';
import { errMsg } from '../../lib/errMsg';
import { fmtMins, fmtTime, fmtDate, practiceToday, closureLabel } from './format';
import { ViewHeader, EmptyState, TableCard, th, td, btnGhost, Avatar } from '../sponsor/ui';

/**
 * ⛔ A CLOSURE NOBODY RECORDED IS NOT A CLOCK-OUT.
 *
 * Every segment closed before migration 325 carries closed_source NULL, because
 * the system genuinely does not know who ended it — an admin closing a forgotten
 * shift used to leave source='self', so the record claimed the employee clocked
 * herself out at a time a manager typed in. Rendering NULL as "clocked out" here
 * would restore that claim in the one place people actually read it.
 */
function ClosureCell({ s }: { s: HistorySegment }) {
  // The WORDS come from closureLabel — one rule, shared with the CSV export, so
  // the screen and the download can never say different things about a closure.
  // Only the styling is decided here.
  const label = closureLabel(s);
  if (!s.clockOutAt) return <span className="text-emerald-700 text-xs font-medium">{label}</span>;
  if (s.closedSource === 'admin') return <span className="text-xs text-amber-800">{label}</span>;
  if (s.closedSource === 'self' || s.closedSource === 'system') return <span className="text-xs text-slate-600">{label}</span>;
  return (
    <span className="inline-flex items-center gap-1 text-xs text-slate-500 italic" title="Recorded before closure identity was captured. The system does not know who ended this segment, and does not guess.">
      <AlertTriangle size={11} className="text-slate-400" /> {label}
    </span>
  );
}

const arrow = (v: string | null, fallback: string) => (v ? v : fallback);

function AmendmentLine({ a }: { a: Amendment }) {
  // A date field reads as a date; a timestamp reads as a time. Rendering
  // "2026-07-05" through a time formatter would print a midnight that never was.
  const render = (v: string | null, fallback: string) => {
    if (!v) return fallback;
    return /^\d{4}-\d{2}-\d{2}$/.test(v) ? fmtDate(v) : `${fmtDate(v)} ${fmtTime(v)}`;
  };
  return (
    <div className="flex items-start gap-2 text-xs text-amber-900">
      <PencilLine size={12} className="mt-0.5 shrink-0 text-amber-600" />
      <span>
        <span className="font-medium">{a.field || 'record'}</span>{' '}
        changed from <span className="font-mono">{render(a.oldValue, 'open')}</span>{' '}
        to <span className="font-mono">{render(a.newValue, 'cleared')}</span>{' '}
        by <span className="font-medium">{arrow(a.by, 'a deleted user')}</span>{' '}
        <span className="text-amber-700">({a.source})</span> on {fmtDate(a.at)} {fmtTime(a.at)}
      </span>
    </div>
  );
}

const monthAgo = () => {
  const d = new Date(); d.setMonth(d.getMonth() - 1);
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/London', year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
};

export function AttendanceHistory() {
  const [from, setFrom] = useState(monthAgo());
  const [to, setTo] = useState(practiceToday());
  const [userId, setUserId] = useState<string>('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const { members } = useTeamMembers();
  const staff = useMemo(() => members.filter(m => m.status !== 'pending'), [members]);
  const { history, loaded, isLoading, error: loadError } = useAttendanceHistory(from, to, userId || null);

  const onExport = async () => {
    setBusy(true); setError('');
    try { await downloadAttendanceCsv(from, to, userId || null); }
    catch (e) { setError(errMsg(e, 'Could not produce the export.')); }
    finally { setBusy(false); }
  };

  const segments = history?.segments ?? [];
  const totals = history?.totals;

  return (
    <div className="space-y-5">
      <ViewHeader
        title="Attendance history"
        subtitle="Worked hours with every correction shown. This is the record an audit, an enquiry or a tribunal asks for."
        action={
          <button onClick={onExport} disabled={busy || !loaded} className={btnGhost}>
            {busy ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />} Export CSV
          </button>
        }
      />

      <div className="flex flex-wrap items-end gap-3 bg-slate-50/70 border border-slate-200 rounded-2xl p-4">
        <label className="text-xs text-slate-500">From
          <input type="date" value={from} max={to} onChange={e => setFrom(e.target.value)}
            className="block mt-1 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900" />
        </label>
        <label className="text-xs text-slate-500">To
          <input type="date" value={to} min={from} onChange={e => setTo(e.target.value)}
            className="block mt-1 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900" />
        </label>
        <label className="text-xs text-slate-500">Staff member
          <select value={userId} onChange={e => setUserId(e.target.value)}
            className="block mt-1 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 min-w-[200px]">
            <option value="">Whole team</option>
            {staff.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
        </label>
        {totals && (
          <div className="ml-auto text-xs text-slate-500 tabular-nums text-right">
            <div><span className="font-medium text-slate-700">{totals.segments}</span> segment{totals.segments === 1 ? '' : 's'} · {fmtMins(totals.minutes)}</div>
            {totals.amended > 0 && <div className="text-amber-700">{totals.amended} amended</div>}
            {totals.closureNotRecorded > 0 && <div className="text-slate-500">{totals.closureNotRecorded} with no recorded closure</div>}
          </div>
        )}
      </div>

      {error && <p className="text-sm text-rose-600">{error}</p>}

      {loadError ? (
        <div className="bg-amber-50 border border-amber-200 text-amber-900 rounded-xl px-4 py-3 text-sm">
          <div className="font-medium">Could not load the history.</div>
          <div className="mt-0.5">{errMsg(loadError, 'The request failed.')}</div>
          <div className="text-xs text-amber-700 mt-1.5">This is not a report that there are no hours — it is a failure to find out.</div>
        </div>
      ) : isLoading ? (
        <div className="h-40 bg-slate-100 rounded-xl animate-pulse" />
      ) : segments.length === 0 ? (
        <EmptyState icon={History} title="No attendance in this range" hint="Widen the dates, or pick a different staff member." />
      ) : (
        <TableCard head={
          <tr>
            <th className={th}>Staff</th><th className={th}>Date</th>
            <th className={th}>Start</th><th className={th}>End</th><th className={th}>Duration</th>
            <th className={th}>Entered</th><th className={th}>Closure</th>
          </tr>
        }>
          {segments.map(s => (
            <React.Fragment key={s.id}>
              <tr className={s.amendments.length ? 'bg-amber-50/40' : 'hover:bg-slate-50'}>
                <td className={td}>
                  <div className="flex items-center gap-3">
                    <Avatar name={s.staffName} size={30} />
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-[#0F1E3A] truncate">{s.staffName}</div>
                      {s.staffEmail && <div className="text-xs text-slate-400 truncate">{s.staffEmail}</div>}
                    </div>
                  </div>
                </td>
                <td className={`${td} text-slate-700 tabular-nums`}>{fmtDate(s.workDate)}</td>
                <td className={`${td} text-slate-700 tabular-nums`}>{fmtTime(s.clockInAt)}</td>
                <td className={`${td} text-slate-700 tabular-nums`}>{s.clockOutAt ? fmtTime(s.clockOutAt) : '—'}</td>
                <td className={`${td} font-medium text-[#0F1E3A] tabular-nums`}>{s.workedMinutes === null ? '—' : fmtMins(s.workedMinutes)}</td>
                <td className={`${td} text-xs text-slate-600`}>{s.source === 'admin' ? 'Entered by an admin' : 'Clocked in'}</td>
                <td className={td}><ClosureCell s={s} /></td>
              </tr>
              {s.amendments.length > 0 && (
                <tr className="bg-amber-50/70">
                  <td className="px-5 pb-3 pt-0" colSpan={7}>
                    <div className="space-y-1 pl-1 border-l-2 border-amber-300 ml-2">
                      {s.amendments.map((a, i) => <AmendmentLine key={i} a={a} />)}
                    </div>
                  </td>
                </tr>
              )}
            </React.Fragment>
          ))}
        </TableCard>
      )}
    </div>
  );
}
