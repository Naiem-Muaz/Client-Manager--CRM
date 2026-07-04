import React, { useEffect, useState } from 'react';
import { CalendarDays, AlertTriangle, Loader2 } from 'lucide-react';
import { listWorkerRoster, upsertRoster } from '../../hooks/useSponsorCompliance';
import { inputCls } from '../settings/SettingsTabs';
import { errMsg } from '../../lib/errMsg';
import { fmtDate, WEEKDAY_LABELS } from './format';
import { SectionCard, btnPrimary, btnGhost } from './ui';

/** every ISO date from → to inclusive */
function dateRange(fromIso: string, toIso: string): string[] {
  const out: string[] = [];
  const d = new Date(fromIso + 'T00:00:00Z'), end = new Date(toIso + 'T00:00:00Z');
  while (d <= end) { out.push(d.toISOString().slice(0, 10)); d.setUTCDate(d.getUTCDate() + 1); }
  return out;
}

export function SponsorRoster({ worker, onChanged }: { worker: any; onChanged: () => void }) {
  const variable = worker.rosterType === 'variable';

  if (!variable) {
    const cd: number[] = worker.contractedWeekdays || [];
    return (
      <SectionCard icon={CalendarDays} title="Fixed weekly pattern" subtitle="Set on the main record — switch Roster type to “variable” for a day-by-day roster.">
        <div className="flex flex-wrap gap-1.5">
          {WEEKDAY_LABELS.map(([d, n]) => (
            <span key={n} className={`px-3 py-1.5 rounded-lg text-xs font-medium border ${cd.includes(n) ? 'bg-blue-600 text-white border-blue-600' : 'bg-slate-50 text-slate-400 border-slate-200'}`}>{d}</span>
          ))}
        </div>
        <p className="text-xs text-slate-500 mt-4">Works bank holidays: <strong className="text-[#0F1E3A]">{worker.worksBankHolidays ? 'Yes' : 'No'}</strong></p>
      </SectionCard>
    );
  }
  return <VariableRoster worker={worker} onChanged={onChanged} />;
}

function VariableRoster({ worker, onChanged }: { worker: any; onChanged: () => void }) {
  const workerId = worker.id;
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => { setLoading(true); try { setRows(await listWorkerRoster(workerId) || []); } catch (e: any) { setError(errMsg(e, 'Could not load roster')); } finally { setLoading(false); } };
  useEffect(() => { load(); }, [workerId]);

  const apply = async (isRostered: boolean) => {
    if (!from || !to) { setError('Pick a date range'); return; }
    if (from > to) { setError('“From” must be on or before “To”'); return; }
    setBusy(true); setError(null);
    try {
      const days = dateRange(from, to).map(rosterDate => ({ rosterDate, isRostered }));
      await upsertRoster(workerId, days); await load(); onChanged();
    } catch (e: any) { setError(errMsg(e, 'Could not update roster')); }
    finally { setBusy(false); }
  };

  const rosteredCount = rows.filter(r => r.isRostered).length;

  return (
    <div className="space-y-4">
      {rows.length === 0 && !loading && (
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4 text-amber-800">
          <span className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center text-amber-600 flex-shrink-0"><AlertTriangle size={17} /></span>
          <p className="text-sm"><strong>Roster not entered.</strong> Absence tracking treats days with no roster entry as non-rostered — enter this worker’s rostered days so the consecutive-absence count is correct.</p>
        </div>
      )}

      <SectionCard icon={CalendarDays} title="Set rostered days for a range" subtitle={`Applies to every day in the range · ${rosteredCount} rostered day(s) recorded.`} bodyClass="p-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1"><label className="text-xs font-medium text-slate-500">From</label><input type="date" value={from} onChange={e => setFrom(e.target.value)} className={inputCls} /></div>
          <div className="space-y-1"><label className="text-xs font-medium text-slate-500">To</label><input type="date" value={to} onChange={e => setTo(e.target.value)} className={inputCls} /></div>
          <button onClick={() => apply(true)} disabled={busy} className={btnPrimary}>{busy ? <Loader2 size={14} className="animate-spin" /> : null} Mark rostered</button>
          <button onClick={() => apply(false)} disabled={busy} className={btnGhost}>Mark off</button>
        </div>
      </SectionCard>
      {error && <p className="text-sm text-rose-600">{error}</p>}

      {loading ? <div className="h-24 bg-slate-100 rounded-lg animate-pulse" /> : rows.length === 0 ? null : (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden max-h-80 overflow-y-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50/70 border-b border-slate-200 text-[11px] uppercase tracking-wider text-slate-400 font-semibold sticky top-0"><tr><th className="px-5 py-3">Date</th><th className="px-5 py-3">Rostered</th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((r: any) => (
                <tr key={r.id || r.rosterDate}><td className="px-5 py-2.5 text-slate-700 tabular-nums">{fmtDate(r.rosterDate)}</td>
                  <td className="px-5 py-2.5">{r.isRostered ? <span className="text-emerald-600 text-xs font-medium">Rostered</span> : <span className="text-slate-400 text-xs">Off</span>}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
