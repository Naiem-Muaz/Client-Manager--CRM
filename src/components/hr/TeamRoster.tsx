import React, { useMemo, useState } from 'react';
import { CalendarDays, Loader2 } from 'lucide-react';
import { useRoster, upsertRoster } from '../../hooks/useHr';
import { useTeamMembers } from '../../hooks/useTeam';
import { errMsg } from '../../lib/errMsg';
import { fmtDate } from './format';
import { ViewHeader, SectionCard, EmptyState, btnPrimary, btnGhost } from '../sponsor/ui';

/** every ISO date from → to inclusive */
function dateRange(fromIso: string, toIso: string): string[] {
  const out: string[] = [];
  const d = new Date(fromIso + 'T00:00:00Z'), end = new Date(toIso + 'T00:00:00Z');
  while (d <= end) { out.push(d.toISOString().slice(0, 10)); d.setUTCDate(d.getUTCDate() + 1); }
  return out;
}

export function TeamRoster() {
  const { members, isLoading: loadingMembers } = useTeamMembers();
  const staff = useMemo(() => members.filter(m => m.status !== 'pending'), [members]);
  const [userId, setUserId] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { roster, isLoading, mutate } = useRoster(userId ? { userId } : undefined);
  const rosteredDays = roster.filter((r: any) => r.is_rostered);

  const apply = async (isRostered: boolean) => {
    if (!userId) { setError('Pick a staff member'); return; }
    if (!from || !to) { setError('Pick a date range'); return; }
    if (from > to) { setError('“From” must be on or before “To”'); return; }
    setBusy(true); setError(null);
    try {
      const days = dateRange(from, to).map(rosterDate => ({ userId, rosterDate, isRostered }));
      await upsertRoster(days); await mutate();
    } catch (e: any) { setError(errMsg(e, 'Could not update roster')); }
    finally { setBusy(false); }
  };

  return (
    <div className="space-y-5">
      <ViewHeader title="Roster" subtitle="Assign the days each staff member is scheduled to work." />

      <SectionCard icon={CalendarDays} title="Set rostered days" subtitle="Marks every day in the range for the chosen staff member." bodyClass="p-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1 min-w-[220px]">
            <label className="text-xs font-medium text-slate-500">Staff member</label>
            <select value={userId} onChange={e => setUserId(e.target.value)} disabled={loadingMembers}
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/30">
              <option value="">— select —</option>
              {staff.map(m => <option key={m.id} value={m.id}>{m.name} ({m.email})</option>)}
            </select>
          </div>
          <div className="space-y-1"><label className="text-xs font-medium text-slate-500">From</label><input type="date" value={from} onChange={e => setFrom(e.target.value)} className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30" /></div>
          <div className="space-y-1"><label className="text-xs font-medium text-slate-500">To</label><input type="date" value={to} onChange={e => setTo(e.target.value)} className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30" /></div>
          <button onClick={() => apply(true)} disabled={busy} className={btnPrimary}>{busy ? <Loader2 size={14} className="animate-spin" /> : null} Mark rostered</button>
          <button onClick={() => apply(false)} disabled={busy} className={btnGhost}>Mark off</button>
        </div>
        {error && <p className="text-sm text-rose-600 mt-2">{error}</p>}
      </SectionCard>

      {!userId ? (
        <EmptyState icon={CalendarDays} title="Pick a staff member" hint="Select someone above to see and edit their rostered days." />
      ) : isLoading ? (
        <div className="h-24 bg-slate-100 rounded-xl animate-pulse" />
      ) : rosteredDays.length === 0 ? (
        <EmptyState icon={CalendarDays} title="No rostered days yet" hint="Mark a date range above to schedule this person." />
      ) : (
        <SectionCard icon={CalendarDays} title={`Rostered days (${rosteredDays.length})`} bodyClass="p-4">
          <div className="flex flex-wrap gap-1.5">
            {rosteredDays.sort((a: any, b: any) => String(a.roster_date).localeCompare(String(b.roster_date))).map((r: any) => (
              <span key={r.id} className="px-2.5 py-1 rounded-lg text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100 tabular-nums">{fmtDate(String(r.roster_date).slice(0, 10))}</span>
            ))}
          </div>
        </SectionCard>
      )}
    </div>
  );
}
