import React from 'react';
import { AlertTriangle, ChevronRight, CheckCircle2, Loader2, Clock } from 'lucide-react';
import { useSponsorWorkers } from '../../hooks/useSponsorCompliance';
import { fmtDate } from './format';
import { Avatar, ViewHeader } from './ui';

interface Row { workerId: string; workerName: string; kind: string; tier: 'warning' | 'escalate'; dueDate: string | null; daysUntil: number | null; message: string; }

// nulls (breaches — no date) first, then most overdue / most imminent.
const byUrgency = (a: Row, b: Row) => {
  const av = a.daysUntil == null ? -1e9 : a.daysUntil;
  const bv = b.daysUntil == null ? -1e9 : b.daysUntil;
  return av - bv;
};

function DueBadge({ r }: { r: Row }) {
  if (r.daysUntil == null) return <span className="text-[11px] font-semibold uppercase tracking-wide text-rose-600">Now</span>;
  if (r.daysUntil < 0) return <span className="text-[11px] font-semibold uppercase tracking-wide text-rose-600">{-r.daysUntil}d overdue</span>;
  if (r.daysUntil === 0) return <span className="text-[11px] font-semibold uppercase tracking-wide text-rose-600">Due today</span>;
  return <span className="text-xs text-slate-500 tabular-nums">in {r.daysUntil}d</span>;
}

function AlertRow({ r, onSelect }: { r: Row; onSelect: (id: string) => void }) {
  const rose = r.tier === 'escalate';
  return (
    <button onClick={() => onSelect(r.workerId)}
      className={`w-full text-left flex items-center gap-3 pl-3 pr-4 py-3 rounded-xl border transition-colors ${rose ? 'bg-rose-50 border-rose-200 hover:bg-rose-100/70' : 'bg-amber-50 border-amber-200 hover:bg-amber-100/70'}`}>
      <span className={`w-1 self-stretch rounded-full ${rose ? 'bg-rose-500' : 'bg-amber-400'}`} />
      <Avatar name={r.workerName} size={36} />
      <div className="min-w-0 flex-1">
        <div className="text-sm font-semibold text-[#0F1E3A] truncate">{r.workerName}</div>
        <div className={`text-sm truncate ${rose ? 'text-rose-800' : 'text-amber-800'}`}>{r.message}</div>
      </div>
      <div className="flex flex-col items-end gap-0.5 flex-shrink-0">
        <DueBadge r={r} />
        {r.dueDate && <span className="text-[11px] text-slate-400 tabular-nums whitespace-nowrap">{fmtDate(r.dueDate)}</span>}
      </div>
      <ChevronRight size={16} className="text-slate-300 flex-shrink-0" />
    </button>
  );
}

export function SponsorAlertDashboard({ onSelect }: { onSelect: (id: string) => void }) {
  const { workers, isLoading } = useSponsorWorkers();
  const all: Row[] = workers.flatMap(w => (w.computed?.alerts || []).map(a => ({ ...a, workerId: w.id, workerName: w.fullName })));
  const escalate = all.filter(a => a.tier === 'escalate').sort(byUrgency);
  const warning = all.filter(a => a.tier === 'warning').sort(byUrgency);

  if (isLoading) return <div className="p-8 text-center text-slate-400"><Loader2 className="animate-spin inline mr-2" size={18} /> Loading alerts…</div>;

  return (
    <div className="space-y-6">
      <ViewHeader title="What needs attention"
        subtitle="Current compliance alerts across all sponsored workers — most urgent first."
        action={
          <div className="flex gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-sm font-semibold tabular-nums"><AlertTriangle size={14} /> {escalate.length}</span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-700 text-sm font-semibold tabular-nums"><Clock size={14} /> {warning.length}</span>
          </div>
        } />

      {all.length === 0 ? (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-12 text-center">
          <CheckCircle2 size={32} className="text-emerald-500 mx-auto mb-2" />
          <p className="font-semibold text-emerald-800">All clear</p>
          <p className="text-sm text-emerald-700 mt-0.5">No visa/RTW/ECS/salary/absence/reporting alerts are active.</p>
        </div>
      ) : (
        <>
          {escalate.length > 0 && (
            <section className="space-y-2.5">
              <h4 className="text-xs font-bold text-rose-700 uppercase tracking-wider flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500" /> Needs action now
                <span className="bg-rose-100 text-rose-700 rounded-full px-2 py-0.5 text-[11px] tabular-nums">{escalate.length}</span>
              </h4>
              <div className="space-y-2">{escalate.map((r, i) => <AlertRow key={i} r={r} onSelect={onSelect} />)}</div>
            </section>
          )}
          {warning.length > 0 && (
            <section className="space-y-2.5">
              <h4 className="text-xs font-bold text-amber-700 uppercase tracking-wider flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400" /> Upcoming
                <span className="bg-amber-100 text-amber-700 rounded-full px-2 py-0.5 text-[11px] tabular-nums">{warning.length}</span>
              </h4>
              <div className="space-y-2">{warning.map((r, i) => <AlertRow key={i} r={r} onSelect={onSelect} />)}</div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
